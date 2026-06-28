import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import type { Dispatch, SetStateAction } from 'react';
import { Alert } from 'react-native';
import type { GestureResponderEvent } from 'react-native';
import type { NavigationProp, ParamListBase } from '@react-navigation/native';
import type { ReportMemberModalState } from '../../components/common/ReportMemberModal';
import {
  ApiError,
  PROFILE_INCOMPLETE_MESSAGE,
  isProfileIncompleteApiError,
} from '../../services/api/http';
import { INPUT_LIMITS } from '../../constants/inputLimits';
import {
  createClubNoticeComment,
  deleteClubNoticeComment,
  deleteClubNotice,
  fetchClubLatestNotice,
  fetchClubNoticeComments,
  fetchClubNoticeDetail,
  fetchClubNotices,
  submitClubNoticeVote,
  updateClubNoticeComment,
  updateClubNotice,
  createClubNotice,
  type ClubNoticeList,
} from '../../services/api/clubApi';
import { showToast } from '../../utils/toast';
import { useUnsavedChangesGuard } from '../../hooks/useUnsavedChangesGuard';
import type {
  BookshelfItem,
  CursorPageState,
  Group,
  NoticeDraft,
  NoticeComment,
  NoticeCommentMenuState,
  NoticeItem,
  NoticePollOption,
} from './types';
import {
  buildDefaultNoticePollDateRange,
  buildNoticeDraft,
  logMeetingAction,
  mapNoticeCommentToUi,
  mapNoticePreviewToNoticeItem,
  mergeNoticeDetail,
  sortNoticeItems,
} from './helpers';
import { toApiLocalDateTime } from './formatters';

const NOTICE_PAGE_SIZE = 8;
const NOTICE_LIST_PAGE_FETCH_LIMIT = 20;

function mapClubNoticeListToItems(
  noticeList: Pick<ClubNoticeList, 'pinnedNotices' | 'normalNotices'>,
) {
  return sortNoticeItems([
    ...noticeList.pinnedNotices.map(mapNoticePreviewToNoticeItem),
    ...noticeList.normalNotices.map(mapNoticePreviewToNoticeItem),
  ]);
}

async function fetchClubNoticeBoardItems(clubId: number) {
  const first = await fetchClubNotices(clubId, 1);
  const normalNotices = [...first.normalNotices];

  for (let page = 2; page <= Math.min(first.totalPages, NOTICE_LIST_PAGE_FETCH_LIMIT); page += 1) {
    const more = await fetchClubNotices(clubId, page);
    normalNotices.push(...more.normalNotices);
    if (!more.hasNext) break;
  }

  return mapClubNoticeListToItems({
    pinnedNotices: first.pinnedNotices,
    normalNotices,
  });
}

function buildNoticeDraftFromNotice(notice: NoticeItem): NoticeDraft {
  const defaultPollRange = buildDefaultNoticePollDateRange();

  return {
    title: notice.title,
    content: notice.content,
    isPinned: Boolean(notice.isPinned),
    bookshelfEnabled: Boolean(notice.bookshelf),
    bookshelfId: notice.bookshelf?.id ?? null,
    pollEnabled: Boolean(notice.poll),
    pollAnonymous: notice.poll?.anonymous ?? true,
    pollAllowDuplicate: notice.poll?.allowDuplicate ?? false,
    pollStartsAt: notice.poll?.startsAt ?? defaultPollRange.startsAt,
    pollEndsAt: notice.poll?.endsAt ?? defaultPollRange.endsAt,
    pollOptions: notice.poll?.options.map((option) => option.label) ?? ['', '', ''],
    photos: notice.photos ?? [],
  };
}

function normalizeNoticeDraftForCompare(draft: NoticeDraft) {
  return {
    title: draft.title,
    content: draft.content,
    isPinned: draft.isPinned,
    bookshelfEnabled: draft.bookshelfEnabled,
    bookshelfId: draft.bookshelfId,
    pollEnabled: draft.pollEnabled,
    pollAnonymous: draft.pollAnonymous,
    pollAllowDuplicate: draft.pollAllowDuplicate,
    pollStartsAt: draft.pollStartsAt,
    pollEndsAt: draft.pollEndsAt,
    pollOptions: draft.pollOptions,
    photos: draft.photos,
  };
}

function areNoticeDraftsEqual(left: NoticeDraft, right: NoticeDraft) {
  return (
    JSON.stringify(normalizeNoticeDraftForCompare(left)) ===
    JSON.stringify(normalizeNoticeDraftForCompare(right))
  );
}

function getMeetingIdFromBookshelfId(bookshelfId?: string | null): number | undefined {
  const matched = bookshelfId?.match(/^bookshelf-(\d+)$/);
  if (!matched) return undefined;

  const meetingId = Number(matched[1]);
  return Number.isFinite(meetingId) ? meetingId : undefined;
}

function resolveNoticeBookshelfMeetingId(
  draft: NoticeDraft,
  bookshelfItems: BookshelfItem[],
  editingNotice?: NoticeItem | null,
): number | undefined {
  if (!draft.bookshelfEnabled) return undefined;

  const selectedBook = draft.bookshelfId
    ? bookshelfItems.find((book) => book.id === draft.bookshelfId)
    : null;

  return (
    selectedBook?.remoteMeetingId ??
    selectedBook?.regularMeetingId ??
    getMeetingIdFromBookshelfId(draft.bookshelfId) ??
    editingNotice?.bookshelf?.remoteMeetingId
  );
}

export type NoticeStateParams = {
  group: Group;
  isManagedClub: boolean;
  canManageClub: boolean;
  currentMemberNickname: string;
  requireAuth: (callback?: () => void) => void;
  navigation: NavigationProp<ParamListBase>;
  bookshelfItems: BookshelfItem[];
  setManagedGroup: Dispatch<SetStateAction<Group>>;
  setLatestNoticeId: Dispatch<SetStateAction<number | null>>;
  setReportModal: Dispatch<SetStateAction<ReportMemberModalState | null>>;
  openBookshelfTopicByMeetingId: (meetingId: number) => Promise<boolean>;
  onNoticeSubmitSuccess?: () => void;
};

export function useNoticeState({
  group,
  isManagedClub,
  canManageClub,
  currentMemberNickname,
  requireAuth,
  navigation,
  bookshelfItems,
  setManagedGroup,
  setLatestNoticeId,
  setReportModal,
  openBookshelfTopicByMeetingId,
  onNoticeSubmitSuccess,
}: NoticeStateParams) {
  const [noticePage, setNoticePage] = useState(1);
  const [selectedNoticeId, setSelectedNoticeId] = useState<string | null>(null);
  const [noticeCommentInput, setNoticeCommentInput] = useState('');
  const [editingNoticeCommentId, setEditingNoticeCommentId] = useState<string | null>(null);
  const [submittingNotice, setSubmittingNotice] = useState(false);
  const [submittingNoticeComment, setSubmittingNoticeComment] = useState(false);
  const [noticeItems, setNoticeItems] = useState<NoticeItem[]>([]);
  const [noticeCommentsById, setNoticeCommentsById] = useState<Record<string, NoticeComment[]>>({});
  const [noticeCommentPageStateByNoticeId, setNoticeCommentPageStateByNoticeId] = useState<
    Record<string, CursorPageState>
  >({});
  const [shouldOpenTopNotice, setShouldOpenTopNotice] = useState(false);
  const [noticeComposerVisible, setNoticeComposerVisible] = useState(false);
  const [noticeBookSelectorVisible, setNoticeBookSelectorVisible] = useState(false);
  const [editingNoticeId, setEditingNoticeId] = useState<string | null>(null);
  const [noticeMenuVisible, setNoticeMenuVisible] = useState(false);
  const [noticeDraft, setNoticeDraft] = useState<NoticeDraft>(() => buildNoticeDraft());
  const [noticeComposerInitialDraft, setNoticeComposerInitialDraft] = useState<NoticeDraft>(() =>
    buildNoticeDraft(),
  );
  const [selectedVoteOptionIdsByNotice, setSelectedVoteOptionIdsByNotice] = useState<
    Record<string, string[]>
  >({});
  const [submittedVoteOptionIdsByNotice, setSubmittedVoteOptionIdsByNotice] = useState<
    Record<string, string[]>
  >({});
  const [voteEditEnabledByNotice, setVoteEditEnabledByNotice] = useState<Record<string, boolean>>(
    {},
  );
  const [noticePollOptionsById, setNoticePollOptionsById] = useState<
    Record<string, NoticePollOption[]>
  >({});
  const [noticeCommentMenu, setNoticeCommentMenu] = useState<NoticeCommentMenuState | null>(null);
  const [voteVotersModal, setVoteVotersModal] = useState<{
    optionLabel: string;
    voters: string[];
  } | null>(null);
  const [uploadingNoticePhoto, setUploadingNoticePhoto] = useState(false);
  const enrichingNoticeDetailKeysRef = useRef<Set<string>>(new Set());
  const enrichedNoticeDetailKeysRef = useRef<Set<string>>(new Set());
  const noticePageSize = NOTICE_PAGE_SIZE;

  const mapNoticeCommentItemToUi = useCallback(
    (item: Parameters<typeof mapNoticeCommentToUi>[0]) =>
      mapNoticeCommentToUi(item, currentMemberNickname),
    [currentMemberNickname],
  );

  useEffect(() => {
    setNoticeCommentsById((prev) =>
      Object.fromEntries(
        Object.entries(prev).map(([noticeKey, comments]) => [
          noticeKey,
          comments.map((comment) => ({
            ...comment,
            mine:
              Boolean(currentMemberNickname) &&
              comment.author.trim().localeCompare(currentMemberNickname.trim(), 'ko', {
                sensitivity: 'accent',
              }) === 0,
          })),
        ]),
      ),
    );
  }, [currentMemberNickname]);

  const selectedNotice = useMemo(
    () => noticeItems.find((item) => item.id === selectedNoticeId) ?? null,
    [noticeItems, selectedNoticeId],
  );

  const currentNoticeComments = useMemo(
    () => (selectedNotice ? (noticeCommentsById[selectedNotice.id] ?? []) : []),
    [noticeCommentsById, selectedNotice],
  );

  const currentNoticeCommentPageState = useMemo(
    () =>
      selectedNotice
        ? (noticeCommentPageStateByNoticeId[selectedNotice.id] ?? null)
        : null,
    [noticeCommentPageStateByNoticeId, selectedNotice],
  );

  const currentNoticePollOptions = useMemo(
    () => (selectedNotice ? (noticePollOptionsById[selectedNotice.id] ?? []) : []),
    [noticePollOptionsById, selectedNotice],
  );

  const currentSelectedVoteOptionIds = useMemo(
    () => (selectedNotice ? (selectedVoteOptionIdsByNotice[selectedNotice.id] ?? []) : []),
    [selectedNotice, selectedVoteOptionIdsByNotice],
  );

  const hasSubmittedVoteInNotice = useMemo(
    () =>
      Boolean(
        selectedNotice &&
          (submittedVoteOptionIdsByNotice[selectedNotice.id] ?? []).length > 0,
      ),
    [selectedNotice, submittedVoteOptionIdsByNotice],
  );

  const voteEditEnabled = useMemo(
    () => Boolean(selectedNotice && voteEditEnabledByNotice[selectedNotice.id]),
    [selectedNotice, voteEditEnabledByNotice],
  );

  const visibleNotices = useMemo(
    () => noticeItems.slice((noticePage - 1) * noticePageSize, noticePage * noticePageSize),
    [noticePage, noticeItems, noticePageSize],
  );

  const visiblePageNumbers = useMemo(() => {
    const total = Math.max(1, Math.ceil(noticeItems.length / noticePageSize));
    return Array.from({ length: total }, (_, index) => index + 1);
  }, [noticeItems.length, noticePageSize]);

  const refreshNoticeComments = useCallback(
    async (clubId: number, noticeId: number, noticeKey: string) => {
      const comments = await fetchClubNoticeComments(clubId, noticeId);
      setNoticeCommentsById((prev) => ({
        ...prev,
        [noticeKey]: comments.items.map(mapNoticeCommentItemToUi),
      }));
      setNoticeCommentPageStateByNoticeId((prev) => ({
        ...prev,
        [noticeKey]: {
          hasNext: Boolean(comments.hasNext),
          nextCursor: comments.nextCursor,
          loadingMore: false,
        },
      }));
    },
    [mapNoticeCommentItemToUi],
  );

  useEffect(() => {
    enrichingNoticeDetailKeysRef.current.clear();
    enrichedNoticeDetailKeysRef.current.clear();
  }, [group.clubId]);

  useEffect(() => {
    const clubId = group.clubId;
    if (typeof clubId !== 'number') return;

    const candidates = visibleNotices.filter((notice) => {
      if (typeof notice.remoteId !== 'number') return false;
      if (notice.content.trim().length > 0) return false;

      const key = `${clubId}:${notice.remoteId}`;
      return (
        !enrichingNoticeDetailKeysRef.current.has(key) &&
        !enrichedNoticeDetailKeysRef.current.has(key)
      );
    });
    if (candidates.length === 0) return;

    let cancelled = false;

    const enrichVisibleNoticeDetails = async () => {
      const results = await Promise.all(
        candidates.map(async (notice) => {
          const remoteId = notice.remoteId;
          if (typeof remoteId !== 'number') return null;

          const key = `${clubId}:${remoteId}`;
          enrichingNoticeDetailKeysRef.current.add(key);

          try {
            const detail = await fetchClubNoticeDetail(clubId, remoteId);
            return detail ? { key, noticeId: notice.id, detail } : null;
          } catch (error) {
            logMeetingAction('notice_detail_enrich_failure', {
              clubId,
              noticeId: remoteId,
              message: error instanceof Error ? error.message : String(error),
            });
            return null;
          } finally {
            enrichingNoticeDetailKeysRef.current.delete(key);
          }
        }),
      );

      if (cancelled) return;

      const detailByNoticeId = new Map(
        results
          .filter((result): result is NonNullable<typeof result> => Boolean(result))
          .map((result) => [result.noticeId, result.detail]),
      );

      if (detailByNoticeId.size === 0) return;

      results.forEach((result) => {
        if (result) enrichedNoticeDetailKeysRef.current.add(result.key);
      });

      setNoticeItems((prev) =>
        sortNoticeItems(
          prev.map((item) => {
            const detail = detailByNoticeId.get(item.id);
            return detail ? mergeNoticeDetail(item, detail) : item;
          }),
        ),
      );
    };

    void enrichVisibleNoticeDetails();

    return () => {
      cancelled = true;
    };
  }, [group.clubId, visibleNotices]);

  useEffect(() => {
    if (typeof group.clubId !== 'number' || !selectedNoticeId) return;
    const notice = noticeItems.find((item) => item.id === selectedNoticeId);
    if (!notice?.remoteId) return;
    if (notice.content.trim().length > 0 && noticeCommentsById[notice.id]) return;
    let cancelled = false;

    const loadNoticeDetail = async () => {
      try {
        const [detail, comments] = await Promise.all([
          fetchClubNoticeDetail(group.clubId as number, notice.remoteId as number),
          fetchClubNoticeComments(group.clubId as number, notice.remoteId as number),
        ]);
        if (cancelled || !detail) return;

        const merged = mergeNoticeDetail(notice, detail);
        setNoticeItems((prev) =>
          sortNoticeItems(prev.map((item) => (item.id === notice.id ? merged : item))),
        );
        setNoticeCommentsById((prev) => ({
          ...prev,
          [merged.id]: comments.items.map(mapNoticeCommentItemToUi),
        }));
        setNoticeCommentPageStateByNoticeId((prev) => ({
          ...prev,
          [merged.id]: {
            hasNext: Boolean(comments.hasNext),
            nextCursor: comments.nextCursor,
            loadingMore: false,
          },
        }));
        if (merged.poll) {
          setNoticePollOptionsById((prev) => ({
            ...prev,
            [merged.id]: merged.poll?.options ?? [],
          }));
          const selectedOptionIds = detail.voteDetail
            ? detail.voteDetail.items
                .filter((item) => item.isSelected)
                .map((item) => `notice-${detail.id}-vote-${item.itemNumber}`)
            : [];
          setSelectedVoteOptionIdsByNotice((prev) => ({
            ...prev,
            [merged.id]: selectedOptionIds,
          }));
          setSubmittedVoteOptionIdsByNotice((prev) => ({
            ...prev,
            [merged.id]: selectedOptionIds,
          }));
          setVoteEditEnabledByNotice((prev) => ({
            ...prev,
            [merged.id]: false,
          }));
        }
      } catch (error) {
        if (cancelled) return;
        if (error instanceof ApiError) {
          if (isProfileIncompleteApiError(error)) {
            showToast(PROFILE_INCOMPLETE_MESSAGE);
          } else if (error.status === 403) {
            showToast('공지 열람 권한이 없습니다.');
          } else if (error.status !== 401) {
            showToast(error.message || '공지 상세를 불러오지 못했습니다.');
          }
          return;
        }
        showToast('공지 상세를 불러오지 못했습니다.');
      }
    };

    void loadNoticeDetail();

    return () => {
      cancelled = true;
    };
  }, [group.clubId, mapNoticeCommentItemToUi, noticeCommentsById, noticeItems, selectedNoticeId]);

  const loadMoreNoticeComments = useCallback(
    async (notice: NoticeItem) => {
      const clubId = group.clubId;
      const noticeId = notice.remoteId;
      const noticeKey = notice.id;
      const pageState = noticeCommentPageStateByNoticeId[noticeKey];

      if (
        typeof clubId !== 'number' ||
        typeof noticeId !== 'number' ||
        !pageState ||
        pageState.loadingMore ||
        !pageState.hasNext ||
        typeof pageState.nextCursor !== 'number'
      ) {
        return;
      }

      setNoticeCommentPageStateByNoticeId((prev) => ({
        ...prev,
        [noticeKey]: { ...pageState, loadingMore: true },
      }));

      try {
        const comments = await fetchClubNoticeComments(clubId, noticeId, pageState.nextCursor);
        const mappedItems = comments.items.map(mapNoticeCommentItemToUi);

        setNoticeCommentsById((prev) => {
          const currentItems = prev[noticeKey] ?? [];
          const seen = new Set(currentItems.map((item) => item.id));
          return {
            ...prev,
            [noticeKey]: [...currentItems, ...mappedItems.filter((item) => !seen.has(item.id))],
          };
        });
        setNoticeCommentPageStateByNoticeId((prev) => ({
          ...prev,
          [noticeKey]: {
            hasNext: Boolean(comments.hasNext),
            nextCursor: comments.nextCursor,
            loadingMore: false,
          },
        }));
      } catch (error) {
        setNoticeCommentPageStateByNoticeId((prev) => ({
          ...prev,
          [noticeKey]: { ...pageState, loadingMore: false },
        }));
        if (error instanceof ApiError) {
          if (isProfileIncompleteApiError(error)) {
            showToast(PROFILE_INCOMPLETE_MESSAGE);
          } else if (error.status === 403) {
            showToast('댓글 열람 권한이 없습니다.');
          } else if (error.status !== 401) {
            showToast(error.message || '댓글을 추가로 불러오지 못했습니다.');
          }
        } else {
          showToast('댓글을 추가로 불러오지 못했습니다.');
        }
      }
    },
    [group.clubId, mapNoticeCommentItemToUi, noticeCommentPageStateByNoticeId],
  );

  const handleOpenNoticeDetailByRemoteId = useCallback(
    async (remoteNoticeId: number | null) => {
      const existingByRemoteId =
        typeof remoteNoticeId === 'number'
          ? noticeItems.find((item) => item.remoteId === remoteNoticeId) ?? null
          : null;

      if (existingByRemoteId) {
        const targetIndex = noticeItems.findIndex((item) => item.id === existingByRemoteId.id);
        if (targetIndex >= 0) {
          setNoticePage(Math.floor(targetIndex / noticePageSize) + 1);
        }
        setSelectedNoticeId(existingByRemoteId.id);
        return;
      }

      if (typeof remoteNoticeId === 'number' && typeof group.clubId === 'number') {
        try {
          const detail = await fetchClubNoticeDetail(group.clubId, remoteNoticeId);
          if (detail) {
            const merged = mergeNoticeDetail(null, detail);
            const nextItems = sortNoticeItems([
              merged,
              ...noticeItems.filter((item) => item.id !== merged.id),
            ]);
            setNoticeItems(nextItems);
            const targetIndex = nextItems.findIndex((item) => item.id === merged.id);
            if (targetIndex >= 0) {
              setNoticePage(Math.floor(targetIndex / noticePageSize) + 1);
            }
            setSelectedNoticeId(merged.id);
            return;
          }
        } catch (error) {
          if (!(error instanceof ApiError)) {
            showToast('공지 상세를 불러오지 못했습니다.');
          }
        }
      }

      if (noticeItems.length > 0) {
        setNoticePage(1);
        setSelectedNoticeId(noticeItems[0].id);
        return;
      }

      showToast('등록된 공지가 없습니다.');
    },
    [group.clubId, noticeItems, noticePageSize],
  );

  const handleSubmitNoticeComment = useCallback(() => {
    if (!selectedNotice) return;
    const content = noticeCommentInput.trim();
    if (!content) {
      showToast('댓글 내용을 입력해야 합니다.');
      return;
    }
    const clubId = group.clubId;
    const noticeId = selectedNotice.remoteId;
    if (!isManagedClub || typeof clubId !== 'number' || typeof noticeId !== 'number') {
      showToast('공지 댓글 기능을 잠시 사용할 수 없습니다. 잠시 후 다시 시도해 주십시오.');
      return;
    }

    const submit = async () => {
      setSubmittingNoticeComment(true);
      try {
        const editingComment = currentNoticeComments.find(
          (comment) => comment.id === editingNoticeCommentId,
        );
        const commentId = editingComment?.remoteId;

        if (typeof commentId === 'number') {
          await updateClubNoticeComment(clubId, noticeId, commentId, { content });
        } else {
          await createClubNoticeComment(clubId, noticeId, { content });
        }

        await refreshNoticeComments(clubId, noticeId, selectedNotice.id);
        setNoticeCommentInput('');
        setEditingNoticeCommentId(null);
      } catch (error) {
        if (!(error instanceof ApiError)) {
          showToast(
            editingNoticeCommentId ? '댓글 수정에 실패했습니다.' : '댓글 등록에 실패했습니다.',
          );
        }
      } finally {
        setSubmittingNoticeComment(false);
      }
    };

    void submit();
  }, [
    currentNoticeComments,
    editingNoticeCommentId,
    group.clubId,
    isManagedClub,
    noticeCommentInput,
    refreshNoticeComments,
    selectedNotice,
  ]);

  const handlePressCommentMenu = useCallback(
    (comment: NoticeComment, event: GestureResponderEvent) => {
      setNoticeCommentMenu({
        comment,
        pageX: event.nativeEvent.pageX,
        pageY: event.nativeEvent.pageY,
      });
    },
    [],
  );

  const handleSelectNoticeCommentMenuAction = useCallback(
    (action: 'edit' | 'delete' | 'report') => {
      const comment = noticeCommentMenu?.comment;
      if (!selectedNotice || !comment) return;
      setNoticeCommentMenu(null);

      if (action === 'edit') {
        setNoticeCommentInput(comment.content);
        setEditingNoticeCommentId(comment.id);
        return;
      }

      if (action === 'report') {
        setReportModal({
          nickname: comment.author,
          profileImageUrl: comment.authorProfileImageUrl,
        });
        return;
      }

      const clubId = group.clubId;
      const noticeId = selectedNotice.remoteId;
      const commentId = comment.remoteId;

      if (
        !isManagedClub ||
        typeof clubId !== 'number' ||
        typeof noticeId !== 'number' ||
        typeof commentId !== 'number'
      ) {
        showToast('공지 댓글 기능을 잠시 사용할 수 없습니다. 잠시 후 다시 시도해 주십시오.');
        return;
      }

      Alert.alert('댓글 삭제', '이 댓글을 삭제하시겠습니까?', [
        { text: '취소', style: 'cancel' },
        {
          text: '삭제',
          style: 'destructive',
          onPress: () => {
            const remove = async () => {
              setSubmittingNoticeComment(true);
              try {
                await deleteClubNoticeComment(clubId, noticeId, commentId);
                await refreshNoticeComments(clubId, noticeId, selectedNotice.id);
                if (editingNoticeCommentId === comment.id) {
                  setNoticeCommentInput('');
                  setEditingNoticeCommentId(null);
                }
              } catch (error) {
                if (!(error instanceof ApiError)) {
                  showToast('댓글 삭제에 실패했습니다.');
                }
              } finally {
                setSubmittingNoticeComment(false);
              }
            };
            void remove();
          },
        },
      ]);
    },
    [
      editingNoticeCommentId,
      group.clubId,
      isManagedClub,
      noticeCommentMenu,
      refreshNoticeComments,
      selectedNotice,
      setReportModal,
    ],
  );

  const handleReportNotice = useCallback(() => {
    setNoticeMenuVisible(false);
    requireAuth(() => {
      const openReportModal = async () => {
        if (!selectedNotice) return;

        let targetNickname = selectedNotice.authorNickname?.trim();
        let targetProfileImageUrl = selectedNotice.authorProfileImageUrl;

        if (
          !targetNickname &&
          typeof group.clubId === 'number' &&
          typeof selectedNotice.remoteId === 'number'
        ) {
          try {
            const detail = await fetchClubNoticeDetail(group.clubId, selectedNotice.remoteId);
            if (detail) {
              const merged = mergeNoticeDetail(selectedNotice, detail);
              setNoticeItems((prev) =>
                sortNoticeItems(
                  prev.map((item) => (item.id === selectedNotice.id ? merged : item)),
                ),
              );
              targetNickname = merged.authorNickname?.trim();
              targetProfileImageUrl = merged.authorProfileImageUrl;
            }
          } catch (error) {
            if (!(error instanceof ApiError)) {
              showToast('공지 작성자 정보를 확인하지 못했습니다.');
            }
          }
        }

        if (!targetNickname) {
          showToast('공지 작성자 정보를 찾을 수 없습니다.');
          return;
        }

        setReportModal({
          nickname: targetNickname,
          profileImageUrl: targetProfileImageUrl,
        });
      };

      void openReportModal();
    });
  }, [group.clubId, requireAuth, selectedNotice, setReportModal]);

  const handleToggleVoteOption = useCallback(
    (optionId: string) => {
      if (!selectedNotice?.poll || selectedNotice.poll.closed) return;
      if (
        selectedNotice.poll.endsAtMillis != null &&
        Date.now() > selectedNotice.poll.endsAtMillis
      )
        return;
      if (hasSubmittedVoteInNotice && !voteEditEnabled) return;
      const noticeId = selectedNotice.id;

      setSelectedVoteOptionIdsByNotice((prev) => {
        const current = prev[noticeId] ?? [];
        if (selectedNotice.poll?.allowDuplicate) {
          const next = current.includes(optionId)
            ? current.filter((id) => id !== optionId)
            : [...current, optionId];
          return { ...prev, [noticeId]: next };
        }
        return { ...prev, [noticeId]: current.includes(optionId) ? [] : [optionId] };
      });
    },
    [hasSubmittedVoteInNotice, selectedNotice, voteEditEnabled],
  );

  const handleOpenVoteVoters = useCallback(
    (optionId: string) => {
      if (!selectedNotice?.poll) return;
      const option = currentNoticePollOptions.find((item) => item.id === optionId);
      if (!option) return;

      if (selectedNotice.poll.anonymous) {
        showToast('익명 투표는 투표자 목록을 볼 수 없습니다.');
        return;
      }

      if (option.voters.length === 0) {
        showToast('해당 항목에 투표자가 없습니다');
        return;
      }

      setVoteVotersModal({ optionLabel: option.label, voters: option.voters });
    },
    [currentNoticePollOptions, selectedNotice],
  );

  const handleSubmitVote = useCallback(() => {
    if (!selectedNotice?.poll) return;
    if (
      selectedNotice.poll.closed ||
      (selectedNotice.poll.endsAtMillis != null && Date.now() > selectedNotice.poll.endsAtMillis)
    ) {
      showToast('투표가 종료되었습니다.');
      return;
    }

    const noticeKey = selectedNotice.id;
    if (hasSubmittedVoteInNotice && !voteEditEnabled) {
      setVoteEditEnabledByNotice((prev) => ({ ...prev, [noticeKey]: true }));
      return;
    }
    const selectedIds = selectedVoteOptionIdsByNotice[noticeKey] ?? [];
    if (selectedIds.length === 0) {
      showToast('투표 항목을 선택해야 합니다.');
      return;
    }
    const clubId = group.clubId;
    const noticeId = selectedNotice.remoteId;
    if (!isManagedClub || typeof clubId !== 'number' || typeof noticeId !== 'number') {
      showToast('공지 투표 기능을 잠시 사용할 수 없습니다. 잠시 후 다시 시도해 주십시오.');
      return;
    }

    const submit = async () => {
      const detail = await fetchClubNoticeDetail(clubId, noticeId);
      if (!detail?.voteDetail) {
        showToast('투표 정보를 찾을 수 없습니다.');
        return;
      }

      const selectedItemNumbers = selectedIds
        .map((id) => {
          const match = id.match(/vote-(\d+)$/);
          return match ? Number(match[1]) : null;
        })
        .filter((value): value is number => Boolean(value));

      try {
        await submitClubNoticeVote(clubId, noticeId, detail.voteDetail.id, {
          selectedItemNumbers,
        });
        const refreshedDetail = await fetchClubNoticeDetail(clubId, noticeId);
        if (!refreshedDetail) return;
        const merged = mergeNoticeDetail(selectedNotice, refreshedDetail);
        setNoticeItems((prev) =>
          sortNoticeItems(prev.map((item) => (item.id === selectedNotice.id ? merged : item))),
        );
        setNoticePollOptionsById((prev) => ({
          ...prev,
          [selectedNotice.id]: merged.poll?.options ?? [],
        }));
        setSubmittedVoteOptionIdsByNotice((prev) => ({ ...prev, [noticeKey]: selectedIds }));
        setVoteEditEnabledByNotice((prev) => ({ ...prev, [noticeKey]: false }));
        showToast('투표가 완료되었습니다.');
      } catch (error) {
        if (!(error instanceof ApiError)) {
          showToast('투표에 실패했습니다.');
        }
      }
    };

    void submit();
  }, [
    group.clubId,
    hasSubmittedVoteInNotice,
    isManagedClub,
    selectedNotice,
    selectedVoteOptionIdsByNotice,
    voteEditEnabled,
  ]);

  const closeNoticeComposerImmediately = useCallback(() => {
    setNoticeComposerVisible(false);
    setNoticeBookSelectorVisible(false);
    setEditingNoticeId(null);
    const emptyDraft = buildNoticeDraft();
    setNoticeDraft(emptyDraft);
    setNoticeComposerInitialDraft(emptyDraft);
  }, []);

  const noticeComposerDirty = useMemo(
    () => !areNoticeDraftsEqual(noticeDraft, noticeComposerInitialDraft),
    [noticeComposerInitialDraft, noticeDraft],
  );

  const { requestClose: handleCloseNoticeComposer } = useUnsavedChangesGuard({
    enabled: noticeComposerVisible,
    isDirty: noticeComposerDirty,
    onConfirmLeave: closeNoticeComposerImmediately,
  });

  const handleOpenNoticeComposer = useCallback((notice?: NoticeItem) => {
    setNoticeMenuVisible(false);
    setNoticeBookSelectorVisible(false);

    if (notice) {
      const clubId = group.clubId;
      const noticeId = notice.remoteId;

      const open = async () => {
        let editableNotice = notice;

        if (typeof clubId === 'number' && typeof noticeId === 'number') {
          try {
            const detail = await fetchClubNoticeDetail(clubId, noticeId);
            if (detail) {
              const merged = mergeNoticeDetail(notice, detail);
              const detailKey = `${clubId}:${noticeId}`;
              enrichedNoticeDetailKeysRef.current.add(detailKey);
              editableNotice = merged;
            } else if (notice.content.trim().length === 0) {
              showToast('공지 상세 정보를 불러오지 못했습니다. 잠시 후 다시 시도해 주십시오.');
              return;
            }
          } catch (error) {
            logMeetingAction('notice_edit_detail_load_failure', {
              clubId,
              noticeId,
              message: error instanceof Error ? error.message : String(error),
            });
            if (notice.content.trim().length === 0) {
              showToast('공지 상세 정보를 불러오지 못했습니다. 잠시 후 다시 시도해 주십시오.');
              return;
            }
          }
        }

        setEditingNoticeId(editableNotice.id);
        const nextDraft = buildNoticeDraftFromNotice(editableNotice);
        setNoticeDraft(nextDraft);
        setNoticeComposerInitialDraft(nextDraft);
        setNoticeComposerVisible(true);
      };

      void open();
      return;
    }

    setEditingNoticeId(null);
    const emptyDraft = buildNoticeDraft();
    setNoticeDraft(emptyDraft);
    setNoticeComposerInitialDraft(emptyDraft);
    setNoticeComposerVisible(true);
  }, [group.clubId]);

  const handleAddNoticePhoto = useCallback(
    (pickAndUploadImage: (type: 'NOTICE') => Promise<string | null>) => {
      if (uploadingNoticePhoto) return;

      const pick = async () => {
        if (noticeDraft.photos.length >= INPUT_LIMITS.NOTICE_IMAGE_COUNT) {
          showToast(`사진은 최대 ${INPUT_LIMITS.NOTICE_IMAGE_COUNT}개까지 추가할 수 있습니다.`);
          return;
        }
        setUploadingNoticePhoto(true);
        try {
          const imageUrl = await pickAndUploadImage('NOTICE');
          if (!imageUrl) return;
          setNoticeDraft((prev) => ({
            ...prev,
            photos: [...prev.photos, imageUrl].slice(0, INPUT_LIMITS.NOTICE_IMAGE_COUNT),
          }));
        } catch (error) {
          if (!(error instanceof ApiError)) {
            showToast('이미지 업로드에 실패했습니다.');
          }
        } finally {
          setUploadingNoticePhoto(false);
        }
      };

      void pick();
    },
    [noticeDraft.photos.length, uploadingNoticePhoto],
  );

  const handleRemoveNoticePhoto = useCallback((index: number) => {
    setNoticeDraft((prev) => ({
      ...prev,
      photos: prev.photos.filter((_, currentIndex) => currentIndex !== index),
    }));
  }, []);

  const handleUpdateNoticePollOption = useCallback((index: number, value: string) => {
    const nextValue =
      value.length > INPUT_LIMITS.NOTICE_POLL_OPTION
        ? value.slice(0, INPUT_LIMITS.NOTICE_POLL_OPTION)
        : value;
    if (nextValue.length < value.length) {
      showToast(`투표 항목은 ${INPUT_LIMITS.NOTICE_POLL_OPTION}자 이하여야 합니다.`);
    }
    setNoticeDraft((prev) => ({
      ...prev,
      pollOptions: prev.pollOptions.map((item, currentIndex) =>
        currentIndex === index ? nextValue : item,
      ),
    }));
  }, []);

  const handleAddNoticePollOption = useCallback(() => {
    setNoticeDraft((prev) => {
      if (prev.pollOptions.length >= INPUT_LIMITS.NOTICE_POLL_OPTION_MAX) {
        showToast(`투표 항목은 최대 ${INPUT_LIMITS.NOTICE_POLL_OPTION_MAX}개까지 추가할 수 있습니다.`);
        return prev;
      }
      return { ...prev, pollOptions: [...prev.pollOptions, ''] };
    });
  }, []);

  const handleRemoveNoticePollOption = useCallback((index: number) => {
    if (index < 2) return;

    setNoticeDraft((prev) => {
      if (prev.pollOptions.length <= 2 || index >= prev.pollOptions.length) return prev;
      return {
        ...prev,
        pollOptions: prev.pollOptions.filter((_, currentIndex) => currentIndex !== index),
      };
    });
  }, []);

  const handleSelectNoticeBookshelf = useCallback((bookId: string) => {
    setNoticeDraft((prev) => ({ ...prev, bookshelfEnabled: true, bookshelfId: bookId }));
    setNoticeBookSelectorVisible(false);
  }, []);

  const handleSubmitNotice = useCallback(() => {
    if (submittingNotice) return;

    const title = noticeDraft.title.trim();
    const content = noticeDraft.content.trim();
    if (!title || !content) {
      showToast('제목과 내용을 입력해야 합니다.');
      return;
    }
    if (!canManageClub) {
      showToast('공지 기능을 잠시 사용할 수 없습니다. 잠시 후 다시 시도해 주십시오.');
      return;
    }
    if (title.length > INPUT_LIMITS.NOTICE_TITLE) {
      showToast(`공지 제목은 ${INPUT_LIMITS.NOTICE_TITLE}자 이하여야 합니다.`);
      return;
    }
    if (content.length > INPUT_LIMITS.NOTICE_CONTENT) {
      showToast(`공지 내용은 ${INPUT_LIMITS.NOTICE_CONTENT}자 이하여야 합니다.`);
      return;
    }

    const currentEditingNoticeId = editingNoticeId;
    const isEditingNotice = currentEditingNoticeId !== null;
    const editingNotice = currentEditingNoticeId
      ? noticeItems.find((item) => item.id === currentEditingNoticeId)
      : null;
    const bookshelfMeetingId = resolveNoticeBookshelfMeetingId(
      noticeDraft,
      bookshelfItems,
      editingNotice,
    );
    const pollOptions = noticeDraft.pollOptions
      .map((option) => option.trim())
      .filter((option) => option.length > 0);
    const pollStartTime = noticeDraft.pollEnabled
      ? toApiLocalDateTime(noticeDraft.pollStartsAt.trim())
      : undefined;
    const pollDeadline = noticeDraft.pollEnabled
      ? toApiLocalDateTime(noticeDraft.pollEndsAt.trim())
      : undefined;

    logMeetingAction('notice_submit_press', {
      clubId: group.clubId,
      mode: isEditingNotice ? 'edit' : 'create',
      hasVote: noticeDraft.pollEnabled,
      pollOptionCount: pollOptions.length,
      hasBookshelfAttachment: typeof bookshelfMeetingId === 'number',
      titleLength: title.length,
      contentLength: content.length,
    });

    if (noticeDraft.bookshelfEnabled && typeof bookshelfMeetingId !== 'number') {
      logMeetingAction('notice_submit_validation_failed', {
        reason: 'missing_bookshelf',
        clubId: group.clubId,
      });
      showToast('연결할 책장을 선택해야 합니다.');
      setNoticeBookSelectorVisible(true);
      return;
    }

    if (noticeDraft.pollEnabled && pollOptions.length < 2) {
      logMeetingAction('notice_submit_validation_failed', {
        reason: 'not_enough_poll_options',
        clubId: group.clubId,
        pollOptionCount: pollOptions.length,
      });
      showToast('투표 항목은 2개 이상 필요합니다.');
      return;
    }

    if (noticeDraft.pollEnabled && pollOptions.some((option) => option.length > INPUT_LIMITS.NOTICE_POLL_OPTION)) {
      logMeetingAction('notice_submit_validation_failed', {
        reason: 'poll_option_too_long',
        clubId: group.clubId,
      });
      showToast(`투표 항목은 ${INPUT_LIMITS.NOTICE_POLL_OPTION}자 이하여야 합니다.`);
      return;
    }

    if (noticeDraft.pollEnabled && (!pollStartTime || !pollDeadline)) {
      logMeetingAction('notice_submit_validation_failed', {
        reason: 'invalid_poll_date',
        clubId: group.clubId,
        pollStartsAt: noticeDraft.pollStartsAt,
        pollEndsAt: noticeDraft.pollEndsAt,
      });
      showToast('투표 기간을 올바르게 입력해야 합니다.');
      return;
    }

    if (
      noticeDraft.pollEnabled &&
      pollStartTime &&
      pollDeadline &&
      Date.parse(pollDeadline) <= Date.parse(pollStartTime)
    ) {
      logMeetingAction('notice_submit_validation_failed', {
        reason: 'poll_deadline_not_after_start',
        clubId: group.clubId,
        pollStartTime,
        pollDeadline,
      });
      showToast('투표 종료일은 시작일 이후여야 합니다.');
      return;
    }

    const submit = async () => {
      setSubmittingNotice(true);
      try {
        if (isEditingNotice) {
          if (!editingNotice?.remoteId) {
            showToast('수정할 공지 정보를 찾을 수 없습니다.');
            return;
          }
          await updateClubNotice(group.clubId as number, editingNotice.remoteId, {
            title,
            content,
            meetingId: bookshelfMeetingId,
            imageUrls: noticeDraft.photos.length > 0 ? noticeDraft.photos : undefined,
            vote: noticeDraft.pollEnabled
              ? { deadline: pollDeadline! }
              : undefined,
            isPinned: noticeDraft.isPinned,
          });
        } else {
          await createClubNotice(group.clubId as number, {
            title,
            content,
            meetingId: bookshelfMeetingId,
            imageUrls: noticeDraft.photos.length > 0 ? noticeDraft.photos : undefined,
            vote: noticeDraft.pollEnabled
              ? {
                  title,
                  item1: pollOptions[0] ?? '',
                  item2: pollOptions[1] ?? '',
                  item3: pollOptions[2],
                  item4: pollOptions[3],
                  item5: pollOptions[4],
                  item6: pollOptions[5],
                  anonymity: noticeDraft.pollAnonymous,
                  duplication: noticeDraft.pollAllowDuplicate,
                  startTime: pollStartTime!,
                  deadline: pollDeadline!,
                }
              : undefined,
            isPinned: noticeDraft.isPinned,
          });
        }

        const [mapped, latestNotice] = await Promise.all([
          fetchClubNoticeBoardItems(group.clubId as number),
          fetchClubLatestNotice(group.clubId as number, { suppressErrorToast: true }),
        ]);
        setNoticeItems(mapped);
        if (isEditingNotice && currentEditingNoticeId) {
          const editedNoticeExists = mapped.some((item) => item.id === currentEditingNoticeId);
          setSelectedNoticeId(editedNoticeExists ? currentEditingNoticeId : null);
        } else {
          setNoticePage(1);
          setSelectedNoticeId(null);
        }
        setNoticeCommentInput('');
        setEditingNoticeCommentId(null);
        setNoticeMenuVisible(false);
        setLatestNoticeId(typeof latestNotice?.id === 'number' ? latestNotice.id : null);
        setManagedGroup((prev) => ({ ...prev, notice: latestNotice?.title }));
        onNoticeSubmitSuccess?.();
        setNoticeComposerVisible(false);
        setEditingNoticeId(null);
        const emptyDraft = buildNoticeDraft();
        setNoticeDraft(emptyDraft);
        setNoticeComposerInitialDraft(emptyDraft);
        showToast(isEditingNotice ? '공지가 수정되었습니다.' : '공지가 등록되었습니다.');
        logMeetingAction('notice_submit_success', {
          clubId: group.clubId,
          mode: isEditingNotice ? 'edit' : 'create',
          hasVote: noticeDraft.pollEnabled,
          hasBookshelfAttachment: typeof bookshelfMeetingId === 'number',
        });
      } catch (error) {
        logMeetingAction('notice_submit_failure', {
          clubId: group.clubId,
          mode: isEditingNotice ? 'edit' : 'create',
          message: error instanceof Error ? error.message : String(error),
        });
        if (!(error instanceof ApiError)) {
          showToast(isEditingNotice ? '공지 수정에 실패했습니다.' : '공지 등록에 실패했습니다.');
        }
      } finally {
        setSubmittingNotice(false);
      }
    };

    void submit();
  }, [
    bookshelfItems,
    canManageClub,
    editingNoticeId,
    group.clubId,
    noticeDraft,
    noticeItems,
    onNoticeSubmitSuccess,
    setLatestNoticeId,
    setManagedGroup,
    submittingNotice,
  ]);

  const handleDeleteNotice = useCallback(() => {
    if (!selectedNotice) return;
    const clubId = group.clubId;
    const noticeId = selectedNotice.remoteId;
    if (!canManageClub || typeof clubId !== 'number' || typeof noticeId !== 'number') {
      showToast('공지 삭제 기능을 잠시 사용할 수 없습니다. 잠시 후 다시 시도해 주십시오.');
      return;
    }

    const remove = async () => {
      try {
        await deleteClubNotice(clubId, noticeId);
        const [mapped, latestNotice] = await Promise.all([
          fetchClubNoticeBoardItems(clubId),
          fetchClubLatestNotice(clubId, { suppressErrorToast: true }),
        ]);
        setNoticeItems(mapped);
        setNoticePage(1);
        setSelectedNoticeId(null);
        setLatestNoticeId(typeof latestNotice?.id === 'number' ? latestNotice.id : null);
        setManagedGroup((prev) => ({ ...prev, notice: latestNotice?.title }));
        setNoticeCommentsById((prev) => {
          const next = { ...prev };
          delete next[selectedNotice.id];
          return next;
        });
        setNoticeCommentPageStateByNoticeId((prev) => {
          const next = { ...prev };
          delete next[selectedNotice.id];
          return next;
        });
        setNoticePollOptionsById((prev) => {
          const next = { ...prev };
          delete next[selectedNotice.id];
          return next;
        });
        setSelectedVoteOptionIdsByNotice((prev) => {
          const next = { ...prev };
          delete next[selectedNotice.id];
          return next;
        });
        setSubmittedVoteOptionIdsByNotice((prev) => {
          const next = { ...prev };
          delete next[selectedNotice.id];
          return next;
        });
        setNoticeMenuVisible(false);
        setSelectedNoticeId(null);
        setNoticeCommentInput('');
        showToast('공지를 삭제했습니다.');
      } catch (error) {
        if (!(error instanceof ApiError)) {
          showToast('공지 삭제에 실패했습니다.');
        }
      }
    };

    Alert.alert('공지 삭제', '이 공지를 삭제하시겠습니까?', [
      { text: '취소', style: 'cancel' },
      {
        text: '삭제',
        style: 'destructive',
        onPress: () => {
          void remove();
        },
      },
    ]);
  }, [canManageClub, group.clubId, selectedNotice, setLatestNoticeId, setManagedGroup]);

  const handleOpenNoticeBookshelf = useCallback(() => {
    const meetingId = selectedNotice?.bookshelf?.remoteMeetingId;
    if (typeof meetingId !== 'number') {
      showToast('연결된 책장 정보를 찾을 수 없습니다.');
      return;
    }

    const open = async () => {
      try {
        const opened = await openBookshelfTopicByMeetingId(meetingId);
        if (!opened) {
          showToast('연결된 책장 정보를 찾을 수 없습니다.');
        }
      } catch (error) {
        if (error instanceof ApiError) {
          showToast(error.message);
          return;
        }
        showToast('책장을 열지 못했습니다.');
      }
    };

    void open();
  }, [openBookshelfTopicByMeetingId, selectedNotice]);

  const resetNoticeOnGroupChange = useCallback(() => {
    setNoticePage(1);
    setSelectedNoticeId(null);
    setNoticeCommentInput('');
    setVoteVotersModal(null);
  }, []);

  return {
    noticePage,
    setNoticePage,
    selectedNoticeId,
    setSelectedNoticeId,
    noticeCommentInput,
    setNoticeCommentInput,
    editingNoticeCommentId,
    setEditingNoticeCommentId,
    submittingNotice,
    submittingNoticeComment,
    noticeItems,
    setNoticeItems,
    noticeCommentsById,
    setNoticeCommentsById,
    noticeCommentPageStateByNoticeId,
    setNoticeCommentPageStateByNoticeId,
    shouldOpenTopNotice,
    setShouldOpenTopNotice,
    noticeComposerVisible,
    setNoticeComposerVisible,
    noticeBookSelectorVisible,
    setNoticeBookSelectorVisible,
    editingNoticeId,
    setEditingNoticeId,
    noticeMenuVisible,
    setNoticeMenuVisible,
    noticeDraft,
    setNoticeDraft,
    selectedVoteOptionIdsByNotice,
    setSelectedVoteOptionIdsByNotice,
    submittedVoteOptionIdsByNotice,
    setSubmittedVoteOptionIdsByNotice,
    voteEditEnabledByNotice,
    setVoteEditEnabledByNotice,
    noticePollOptionsById,
    setNoticePollOptionsById,
    noticeCommentMenu,
    setNoticeCommentMenu,
    voteVotersModal,
    setVoteVotersModal,
    uploadingNoticePhoto,
    noticePageSize,
    selectedNotice,
    currentNoticeComments,
    currentNoticeCommentPageState,
    currentNoticePollOptions,
    currentSelectedVoteOptionIds,
    hasSubmittedVoteInNotice,
    voteEditEnabled,
    visibleNotices,
    visiblePageNumbers,
    refreshNoticeComments,
    loadMoreNoticeComments,
    handleOpenNoticeDetailByRemoteId,
    handleSubmitNoticeComment,
    handlePressCommentMenu,
    handleSelectNoticeCommentMenuAction,
    handleReportNotice,
    handleToggleVoteOption,
    handleOpenVoteVoters,
    handleSubmitVote,
    handleOpenNoticeComposer,
    handleCloseNoticeComposer,
    handleAddNoticePhoto,
    handleRemoveNoticePhoto,
    handleUpdateNoticePollOption,
    handleAddNoticePollOption,
    handleRemoveNoticePollOption,
    handleSelectNoticeBookshelf,
    handleSubmitNotice,
    handleDeleteNotice,
    handleOpenNoticeBookshelf,
    resetNoticeOnGroupChange,
  };
}
