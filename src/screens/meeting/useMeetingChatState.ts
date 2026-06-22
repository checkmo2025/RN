import { useCallback, useEffect, useMemo, useRef, useState } from 'react';

import {
  fetchClubMeetingTeamChatMessages,
  type ClubMeetingChatMessage,
} from '../../services/api/clubApi';
import { ApiError } from '../../services/api/http';
import {
  createReport,
  type ReportReason,
} from '../../services/api/memberApi';
import { useMeetingChatStomp } from '../../services/websocket/useMeetingChatStomp';
import { triggerSelectionHaptic } from '../../utils/haptics';
import { showToast } from '../../utils/toast';
import type { RegularMeetingGroupItem, RegularMeetingInfo } from './types';

function isSameNickname(left: string, right: string): boolean {
  return left.trim().localeCompare(right.trim(), 'ko', { sensitivity: 'accent' }) === 0;
}

function sortAndDedupeMessages(
  messages: ClubMeetingChatMessage[],
): ClubMeetingChatMessage[] {
  const byId = new Map<number, ClubMeetingChatMessage>();
  messages.forEach((message) => byId.set(message.messageId, message));
  return Array.from(byId.values()).sort((left, right) => {
    const leftTime = left.sendAt ? Date.parse(left.sendAt) : NaN;
    const rightTime = right.sendAt ? Date.parse(right.sendAt) : NaN;
    if (Number.isFinite(leftTime) && Number.isFinite(rightTime) && leftTime !== rightTime) {
      return leftTime - rightTime;
    }
    return left.messageId - right.messageId;
  });
}

type Params = {
  clubId: number | undefined;
  meetingId: number | undefined;
  regularMeetingInfo: RegularMeetingInfo | null;
  canManageClub: boolean;
  currentMemberNickname: string;
};

export type MeetingChatReportTarget = {
  targetType: 'CHAT' | 'MEMBER';
  message: ClubMeetingChatMessage;
};

export function useMeetingChatState({
  clubId,
  meetingId,
  regularMeetingInfo,
  canManageClub,
  currentMemberNickname,
}: Params) {
  const [pickerVisible, setPickerVisible] = useState(false);
  const [activeGroup, setActiveGroup] = useState<RegularMeetingGroupItem | null>(null);
  const [messages, setMessages] = useState<ClubMeetingChatMessage[]>([]);
  const [input, setInput] = useState('');
  const [initialLoading, setInitialLoading] = useState(false);
  const [loadingOlder, setLoadingOlder] = useState(false);
  const [historyError, setHistoryError] = useState<string | null>(null);
  const [hasNext, setHasNext] = useState(false);
  const [reportTarget, setReportTarget] = useState<MeetingChatReportTarget | null>(null);
  const [submittingReport, setSubmittingReport] = useState(false);

  const activeGroupRef = useRef<RegularMeetingGroupItem | null>(null);
  const roomVersionRef = useRef(0);
  const hasNextRef = useRef(false);
  const nextCursorRef = useRef<number | null>(null);
  const visitedCursorsRef = useRef(new Set<number>());

  const accessibleGroups = useMemo(() => {
    const groups = regularMeetingInfo?.groups.filter((group) => group.teamId != null) ?? [];
    if (canManageClub) return groups;
    if (!currentMemberNickname.trim()) return [];
    return groups.filter((group) =>
      group.members.some((member) => isSameNickname(member.nickname, currentMemberNickname)),
    );
  }, [canManageClub, currentMemberNickname, regularMeetingInfo?.groups]);

  const updatePagination = useCallback((nextHasNext: boolean, cursor: number | null) => {
    hasNextRef.current = nextHasNext;
    nextCursorRef.current = cursor;
    setHasNext(nextHasNext);
  }, []);

  const fetchLatest = useCallback(
    async (group: RegularMeetingGroupItem, roomVersion: number, showLoading: boolean) => {
      if (clubId == null || meetingId == null || group.teamId == null) return;
      if (showLoading) {
        setInitialLoading(true);
        setHistoryError(null);
      }
      try {
        const history = await fetchClubMeetingTeamChatMessages(
          clubId,
          meetingId,
          group.teamId,
          undefined,
          { suppressErrorToast: true },
        );
        if (roomVersionRef.current !== roomVersion || activeGroupRef.current?.id !== group.id) return;
        setMessages((current) => sortAndDedupeMessages([...current, ...history.chats]));
        if (showLoading) updatePagination(history.hasNext, history.nextCursor);
        setHistoryError(null);
      } catch (error) {
        if (roomVersionRef.current !== roomVersion || activeGroupRef.current?.id !== group.id) return;
        if (showLoading) {
          setHistoryError(
            error instanceof ApiError ? error.message : '채팅 내역을 불러오지 못했습니다.',
          );
        }
      } finally {
        if (showLoading && roomVersionRef.current === roomVersion) {
          setInitialLoading(false);
        }
      }
    },
    [clubId, meetingId, updatePagination],
  );

  const handleStompMessage = useCallback(
    (message: ClubMeetingChatMessage, sourceTeamId: number) => {
      if (activeGroupRef.current?.teamId !== sourceTeamId) return;
      setMessages((current) => sortAndDedupeMessages([...current, message]));
    },
    [],
  );

  const handleStompConnected = useCallback(
    (sourceTeamId: number) => {
      const group = activeGroupRef.current;
      if (!group || group.teamId !== sourceTeamId) return;
      void fetchLatest(group, roomVersionRef.current, false);
    },
    [fetchLatest],
  );

  const { isConnected, publish } = useMeetingChatStomp({
    clubId,
    meetingId,
    teamId: activeGroup?.teamId,
    enabled: Boolean(activeGroup),
    onMessage: handleStompMessage,
    onConnected: handleStompConnected,
  });

  const resetRoom = useCallback(() => {
    roomVersionRef.current += 1;
    activeGroupRef.current = null;
    setActiveGroup(null);
    setMessages([]);
    setInput('');
    setInitialLoading(false);
    setLoadingOlder(false);
    setHistoryError(null);
    visitedCursorsRef.current = new Set();
    updatePagination(false, null);
  }, [updatePagination]);

  const openPicker = useCallback(() => {
    triggerSelectionHaptic();
    resetRoom();
    setPickerVisible(true);
  }, [resetRoom]);

  const closeChat = useCallback(() => {
    setPickerVisible(false);
    setReportTarget(null);
    resetRoom();
  }, [resetRoom]);

  const backToPicker = useCallback(() => {
    setReportTarget(null);
    resetRoom();
    setPickerVisible(true);
  }, [resetRoom]);

  const selectGroup = useCallback(
    (groupId: string) => {
      const group = accessibleGroups.find((item) => item.id === groupId);
      if (!group || group.teamId == null) {
        showToast('이용할 수 있는 채팅 조가 아닙니다.');
        return;
      }
      triggerSelectionHaptic();
      const roomVersion = roomVersionRef.current + 1;
      roomVersionRef.current = roomVersion;
      activeGroupRef.current = group;
      setActiveGroup(group);
      setPickerVisible(false);
      setMessages([]);
      setInput('');
      setHistoryError(null);
      visitedCursorsRef.current = new Set();
      updatePagination(false, null);
      void fetchLatest(group, roomVersion, true);
    },
    [accessibleGroups, fetchLatest, updatePagination],
  );

  const retryHistory = useCallback(() => {
    const group = activeGroupRef.current;
    if (!group) return;
    void fetchLatest(group, roomVersionRef.current, true);
  }, [fetchLatest]);

  const loadOlder = useCallback(async () => {
    const group = activeGroupRef.current;
    const cursor = nextCursorRef.current;
    if (
      loadingOlder ||
      !hasNextRef.current ||
      cursor == null ||
      visitedCursorsRef.current.has(cursor) ||
      clubId == null ||
      meetingId == null ||
      group?.teamId == null
    ) {
      return;
    }

    const roomVersion = roomVersionRef.current;
    visitedCursorsRef.current.add(cursor);
    setLoadingOlder(true);
    try {
      const history = await fetchClubMeetingTeamChatMessages(
        clubId,
        meetingId,
        group.teamId,
        cursor,
        { suppressErrorToast: true },
      );
      if (roomVersionRef.current !== roomVersion || activeGroupRef.current?.id !== group.id) return;
      setMessages((current) => sortAndDedupeMessages([...history.chats, ...current]));
      updatePagination(history.hasNext, history.nextCursor);
    } catch (error) {
      visitedCursorsRef.current.delete(cursor);
      if (roomVersionRef.current === roomVersion) {
        showToast(error instanceof ApiError ? error.message : '이전 채팅을 불러오지 못했습니다.');
      }
    } finally {
      if (roomVersionRef.current === roomVersion) setLoadingOlder(false);
    }
  }, [clubId, loadingOlder, meetingId, updatePagination]);

  const submitMessage = useCallback(() => {
    const content = input.trim();
    if (!content) return;
    try {
      publish(content);
      triggerSelectionHaptic();
      setInput('');
    } catch (error) {
      showToast(error instanceof Error ? error.message : '채팅 전송에 실패했습니다.');
    }
  }, [input, publish]);

  const openMessageReport = useCallback(
    (message: ClubMeetingChatMessage) => {
      if (isSameNickname(message.senderNickname, currentMemberNickname)) return;
      setReportTarget({ targetType: 'CHAT', message });
    },
    [currentMemberNickname],
  );

  const openMemberReport = useCallback(
    (message: ClubMeetingChatMessage) => {
      if (isSameNickname(message.senderNickname, currentMemberNickname)) return;
      setReportTarget({ targetType: 'MEMBER', message });
    },
    [currentMemberNickname],
  );

  const submitReport = useCallback(
    async (payload: { reason: ReportReason; content?: string }) => {
      if (
        !reportTarget ||
        isSameNickname(reportTarget.message.senderNickname, currentMemberNickname)
      ) {
        return;
      }
      setSubmittingReport(true);
      try {
        await createReport({
          targetType: reportTarget.targetType,
          targetId:
            reportTarget.targetType === 'CHAT'
              ? String(reportTarget.message.messageId)
              : reportTarget.message.senderNickname,
          reason: payload.reason,
          content: payload.content,
        });
        setReportTarget(null);
        showToast('신고가 접수되었습니다.');
      } catch (error) {
        if (!(error instanceof ApiError)) showToast('신고 접수에 실패했습니다.');
      } finally {
        setSubmittingReport(false);
      }
    },
    [currentMemberNickname, reportTarget],
  );

  useEffect(() => {
    closeChat();
  }, [clubId, closeChat, meetingId]);

  return {
    accessibleGroups,
    pickerVisible,
    activeGroup,
    messages,
    input,
    setInput,
    initialLoading,
    loadingOlder,
    historyError,
    hasNext,
    isConnected,
    reportTarget,
    submittingReport,
    setReportTarget,
    openPicker,
    closeChat,
    backToPicker,
    selectGroup,
    retryHistory,
    loadOlder,
    submitMessage,
    openMessageReport,
    openMemberReport,
    submitReport,
  };
}
