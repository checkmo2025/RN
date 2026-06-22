import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Alert, PanResponder, View } from 'react-native';
import type {
  GestureResponderEvent,
  LayoutChangeEvent,
  NativeScrollEvent,
  NativeSyntheticEvent,
} from 'react-native';
import type { ReportMemberModalState } from '../../components/common/ReportMemberModal';
import { ApiError } from '../../services/api/http';
import {
  createClubBookshelf,
  createClubBookshelfReview,
  createClubBookshelfTopic,
  deleteClubBookshelf,
  deleteClubBookshelfReview,
  deleteClubBookshelfTopic,
  fetchClubBookshelfDetail,
  fetchClubBookshelfEditInfo,
  fetchClubBookshelfReviews,
  fetchClubBookshelfTopics,
  fetchClubBookshelves,
  fetchClubMeeting,
  fetchClubMeetingMembers,
  fetchClubMeetingTeamTopics,
  fetchClubNextMeetingRedirect,
  manageClubMeetingTeams,
  updateClubBookshelf,
  updateClubBookshelfReview,
  updateClubBookshelfTopic,
} from '../../services/api/clubApi';
import type {
  ClubBookshelfReview,
  ClubMeetingTeamTopics,
} from '../../services/api/clubApi';
import { type BookItem } from '../../services/api/bookApi';
import { useBookSearch } from '../../hooks/useBookSearch';
import { getCurrentKstDateLabel, getCurrentKstYearMonth } from '../../utils/date';
import { showToast } from '../../utils/toast';
import { triggerSelectionHaptic } from '../../utils/haptics';
import type {
  BookshelfCreateDraft,
  BookshelfDetailTab,
  BookshelfItem,
  BookshelfPostItem,
  BookshelfPostMenuState,
  BookshelfViewMode,
  CursorPageState,
  Group,
  GroupManagementScreen,
  RegularMeetingGroupItem,
  RegularMeetingInfo,
  TeamManageMemberItem,
  TeamManageTeamItem,
} from './types';
import {
  areRegularGroupPostsEqual,
  buildBookshelfCreateDraft,
  ensureRegularMeetingInfo,
  logMeetingAction,
  mapApiBookshelfToItem,
  mapBookshelfDetailToItem,
  mapBookshelfReviewToPostItem,
  mapBookshelfTopicToPostItem,
  mapMeetingToRegularMeetingInfo,
  normalizeAverageRating,
  resolveRegularMeetingId,
  sortBookshelfPostsByLatest,
} from './helpers';
import {
  buildCalendarDays,
  formatDotDate,
  formatGenerationLabel,
  getTeamManageTargetKey,
  parseGenerationNumber,
  parseDotDate,
  sanitizeGenerationInput,
  toApiLocalDateTime,
} from './formatters';
import { resolveBookshelfActionErrorMessage } from './mappers';
import { useRegularGroupStomp } from '../../services/websocket/useRegularGroupStomp';
import type { TopicUpdatePayload } from '../../services/websocket/useRegularGroupStomp';

const BOOKSHELF_CURSOR_LOOP_LIMIT = 100;
const MAX_REGULAR_GROUP_COUNT = 10;
const BOOKSHELF_MEETING_TITLE_MAX_LENGTH = 12;
const BOOKSHELF_MEETING_LOCATION_MAX_LENGTH = 12;
const ISBN13_REGEX = /^\d{13}$/;
const TEAM_MANAGE_DRAG_THRESHOLD = 6;
const TEAM_MANAGE_AUTO_SCROLL_ZONE = 112;
const TEAM_MANAGE_AUTO_SCROLL_MIN_SPEED = 180;
const TEAM_MANAGE_AUTO_SCROLL_MAX_SPEED = 900;
const TEAM_MANAGE_AUTO_SCROLL_MAX_DELTA_SECONDS = 0.05;

type TeamManageDropLayout = {
  x: number;
  y: number;
  width: number;
  height: number;
};

type TeamManageScrollMetrics = {
  left: number;
  top: number;
  width: number;
  height: number;
  contentHeight: number;
  offset: number;
};

type TeamManageDropMatch = {
  zoneId: string;
  teamNumber: number | null;
};

export const getTeamManageQuickDropZoneId = (teamNumber: number | null) =>
  `quick:${getTeamManageTargetKey(teamNumber)}`;

export const getTeamManageContentDropZoneId = (teamNumber: number | null) =>
  `content:${getTeamManageTargetKey(teamNumber)}`;

const makeRegularGroupPendingKey = (groupId: string, postId: string) =>
  `${groupId}:${postId}`;

function normalizeIsbn13(value?: string | null): string {
  const digits = value?.replace(/\D/g, '') ?? '';
  if (digits.length < 13) return '';
  return digits.slice(-13);
}

export type BookshelfStateParams = {
  group: Group;
  isManagedClub: boolean;
  canManageClub: boolean;
  currentMemberNickname: string;
  isLoggedIn: boolean;
  requireAuth: (callback?: () => void) => void;
  setReportModal: (modal: ReportMemberModalState | null) => void;
  setActiveTab: (tab: 'home' | 'notice' | 'bookshelf') => void;
  setActiveManagementScreen: (screen: GroupManagementScreen | null) => void;
};

export async function fetchAllClubBookshelvesWithCursor(clubId: number): Promise<{
  items: ReturnType<typeof mapApiBookshelfToItem>[];
  isStaff: boolean;
}> {
  const raw: Array<{
    meetingId: number;
    generation?: number;
    tag?: string;
    averageRate?: number;
    bookId?: string;
    title?: string;
    author?: string;
    imgUrl?: string;
  }> = [];
  const seenMeetingIds = new Set<number>();
  const visitedCursors = new Set<number>();
  let cursorId: number | undefined;
  let isStaff = false;

  for (let page = 0; page < BOOKSHELF_CURSOR_LOOP_LIMIT; page += 1) {
    const response = await fetchClubBookshelves(clubId, cursorId);
    if (response.isStaff) isStaff = true;

    response.items.forEach((item) => {
      if (seenMeetingIds.has(item.meetingId)) return;
      seenMeetingIds.add(item.meetingId);
      raw.push(item);
    });

    if (!response.hasNext || typeof response.nextCursor !== 'number') break;
    if (visitedCursors.has(response.nextCursor)) break;

    visitedCursors.add(response.nextCursor);
    cursorId = response.nextCursor;
  }

  return { items: raw.map(mapApiBookshelfToItem), isStaff };
}

export function useBookshelfState({
  group,
  isManagedClub,
  canManageClub,
  currentMemberNickname,
  isLoggedIn,
  requireAuth,
  setReportModal,
  setActiveTab,
  setActiveManagementScreen,
}: BookshelfStateParams) {
  const [selectedBookshelfSession, setSelectedBookshelfSession] = useState('');
  const [bookshelfViewMode, setBookshelfViewMode] = useState<BookshelfViewMode>('GRID');
  const [bookshelfDetailTab, setBookshelfDetailTab] = useState<BookshelfDetailTab>('TOPIC');
  const [selectedBookshelfBookId, setSelectedBookshelfBookId] = useState<string | null>(null);
  const [bookshelfItems, setBookshelfItems] = useState<BookshelfItem[]>([]);
  const [selectedRegularGroupId, setSelectedRegularGroupId] = useState<string | null>(null);
  const [regularGroupPostsById, setRegularGroupPostsById] = useState<
    Record<string, Array<{ id: string; remoteTopicId?: number; author: string; authorProfileImageUrl?: string; content: string; completed: boolean }>>
  >({});
  const [regularGroupPendingPostKeys, setRegularGroupPendingPostKeys] = useState<Set<string>>(
    () => new Set(),
  );
  const [regularGroupMembersVisible, setRegularGroupMembersVisible] = useState(false);
  const [creatingBookshelf, setCreatingBookshelf] = useState(false);
  const [updatingBookshelf, setUpdatingBookshelf] = useState(false);
  const [deletingBookshelf, setDeletingBookshelf] = useState(false);
  const [editingBookshelfMeetingId, setEditingBookshelfMeetingId] = useState<number | null>(null);
  const openingBookshelfEditRef = useRef(false);
  const [openingNextMeeting, setOpeningNextMeeting] = useState(false);
  const [loadingBookshelfDetail, setLoadingBookshelfDetail] = useState(false);
  const [photoViewer, setPhotoViewer] = useState<{ photos: string[]; index: number } | null>(null);
  const [bookshelfComposerType, setBookshelfComposerType] = useState<'TOPIC' | 'REVIEW' | null>(null);
  const [editingBookshelfPost, setEditingBookshelfPost] = useState<BookshelfPostItem | null>(null);
  const [bookshelfComposerInput, setBookshelfComposerInput] = useState('');
  const [bookshelfComposerRating, setBookshelfComposerRating] = useState(0);
  const [submittingBookshelfComposer, setSubmittingBookshelfComposer] = useState(false);
  const [teamManageVisible, setTeamManageVisible] = useState(false);
  const [teamManageLoading, setTeamManageLoading] = useState(false);
  const [teamManageSaving, setTeamManageSaving] = useState(false);
  const [teamManageTeams, setTeamManageTeams] = useState<TeamManageTeamItem[]>([]);
  const [teamManageMembers, setTeamManageMembers] = useState<TeamManageMemberItem[]>([]);
  const [teamManageSelectedMemberId, setTeamManageSelectedMemberId] = useState<number | null>(null);
  const [teamManageActiveDropZoneId, setTeamManageActiveDropZoneId] = useState<string | null>(null);
  const [draggingTeamMemberId, setDraggingTeamMemberId] = useState<number | null>(null);
  const [draggingTeamMemberPosition, setDraggingTeamMemberPosition] = useState<{
    x: number;
    y: number;
  } | null>(null);
  const [bookshelfCreateDraft, setBookshelfCreateDraft] = useState<BookshelfCreateDraft>(() =>
    buildBookshelfCreateDraft(),
  );
  const [bookshelfTopicsByMeetingId, setBookshelfTopicsByMeetingId] = useState<
    Record<number, BookshelfPostItem[]>
  >({});
  const [bookshelfTopicPageStateByMeetingId, setBookshelfTopicPageStateByMeetingId] = useState<
    Record<number, CursorPageState>
  >({});
  const [bookshelfReviewsByMeetingId, setBookshelfReviewsByMeetingId] = useState<
    Record<number, BookshelfPostItem[]>
  >({});
  const [regularMeetingInfoByMeetingId, setRegularMeetingInfoByMeetingId] = useState<
    Record<number, RegularMeetingInfo>
  >({});
  const [bookshelfPostMenu, setBookshelfPostMenu] = useState<BookshelfPostMenuState | null>(null);
  const [bookshelfBookSelectorVisible, setBookshelfBookSelectorVisible] = useState(false);
  const {
    query: bookshelfBookSearchQuery,
    setQuery: setBookshelfBookSearchQuery,
    searchedKeyword: bookshelfBookSearchKeyword,
    results: bookshelfBookSearchResults,
    loading: bookshelfBookSearchLoading,
    searched: bookshelfBookSearchSearched,
    totalResults: bookshelfBookSearchTotal,
    search: runBookshelfBookSearch,
    reset: resetBookshelfBookSearch,
  } = useBookSearch();
  const [bookshelfCalendarVisible, setBookshelfCalendarVisible] = useState(false);
  const [bookshelfCalendarMonth, setBookshelfCalendarMonth] = useState(() => {
    const { year, month } = getCurrentKstYearMonth();
    return new Date(year, month - 1, 1);
  });

  const shouldScrollToBookshelfDetailRef = useRef(false);
  const bookshelfMeetingDetailRequestIdRef = useRef<Record<number, number>>({});
  const bookshelfDetailLoadingCountByMeetingIdRef = useRef<Record<number, number>>({});
  const teamManageQuickDropRefs = useRef<Record<string, View | null>>({});
  const teamManageQuickDropLayoutsRef = useRef<Record<string, TeamManageDropLayout>>({});
  const teamManageContentDropLayoutsRef = useRef<Record<string, TeamManageDropLayout>>({});
  const dragStartRef = useRef<{
    memberId: number;
    pageX: number;
    pageY: number;
    moved: boolean;
  } | null>(null);
  const teamManageScrollRef = useRef<import('react-native').ScrollView>(null);
  const teamManageScrollViewRef = useRef<View>(null);
  const teamManageScrollMetricsRef = useRef<TeamManageScrollMetrics>({
    left: 0,
    top: 0,
    width: 0,
    height: 0,
    contentHeight: 0,
    offset: 0,
  });
  const dragAutoScrollFrameRef = useRef<number | null>(null);
  const dragAutoScrollLastTimestampRef = useRef<number | null>(null);
  const dragCurrentPagePositionRef = useRef({ x: 0, y: 0 });
  const currentMemberNicknameRef = useRef(currentMemberNickname);
  const teamToGroupIdRef = useRef<Record<number, string>>({});
  const regularGroupPostsByIdRef = useRef(regularGroupPostsById);
  const regularGroupPendingPostKeysRef = useRef(regularGroupPendingPostKeys);

  useEffect(() => {
    currentMemberNicknameRef.current = currentMemberNickname;
  });

  useEffect(() => {
    regularGroupPostsByIdRef.current = regularGroupPostsById;
  });

  useEffect(() => {
    regularGroupPendingPostKeysRef.current = regularGroupPendingPostKeys;
  });

  const addRegularGroupPendingPost = useCallback((pendingKey: string) => {
    if (regularGroupPendingPostKeysRef.current.has(pendingKey)) return false;
    const next = new Set(regularGroupPendingPostKeysRef.current);
    next.add(pendingKey);
    regularGroupPendingPostKeysRef.current = next;
    setRegularGroupPendingPostKeys(next);
    return true;
  }, []);

  const removeRegularGroupPendingPost = useCallback((pendingKey: string) => {
    if (!regularGroupPendingPostKeysRef.current.has(pendingKey)) return;
    const next = new Set(regularGroupPendingPostKeysRef.current);
    next.delete(pendingKey);
    regularGroupPendingPostKeysRef.current = next;
    setRegularGroupPendingPostKeys(next);
  }, []);

  const bookshelfSessions = useMemo(() => {
    const sessions = Array.from(
      new Set(bookshelfItems.map((item) => item.session).filter((item) => item.length > 0)),
    );
    return sessions.sort((left, right) => {
      const leftNumber = parseGenerationNumber(left) ?? 0;
      const rightNumber = parseGenerationNumber(right) ?? 0;
      return rightNumber - leftNumber;
    });
  }, [bookshelfItems]);

  const bookshelfCalendarDays = useMemo(
    () => buildCalendarDays(bookshelfCalendarMonth),
    [bookshelfCalendarMonth],
  );

  const visibleBookshelfItems = useMemo(
    () => bookshelfItems.filter((item) => item.session === selectedBookshelfSession),
    [bookshelfItems, selectedBookshelfSession],
  );

  const selectedBookshelfBook = useMemo(() => {
    const fallbackBook = visibleBookshelfItems[0] ?? bookshelfItems[0] ?? null;
    if (!fallbackBook) return null;
    if (!selectedBookshelfBookId) return fallbackBook;
    return bookshelfItems.find((item) => item.id === selectedBookshelfBookId) ?? fallbackBook;
  }, [bookshelfItems, selectedBookshelfBookId, visibleBookshelfItems]);

  const selectedRegularMeetingId = useMemo(
    () => resolveRegularMeetingId(selectedBookshelfBook),
    [selectedBookshelfBook],
  );

  const bookshelfTopicItems = useMemo<BookshelfPostItem[]>(() => {
    const remoteMeetingId = selectedBookshelfBook?.remoteMeetingId;
    if (remoteMeetingId && bookshelfTopicsByMeetingId[remoteMeetingId]) {
      return sortBookshelfPostsByLatest(bookshelfTopicsByMeetingId[remoteMeetingId]);
    }
    return [];
  }, [bookshelfTopicsByMeetingId, selectedBookshelfBook?.remoteMeetingId]);

  const bookshelfReviewItems = useMemo<BookshelfPostItem[]>(() => {
    const remoteMeetingId = selectedBookshelfBook?.remoteMeetingId;
    if (remoteMeetingId && bookshelfReviewsByMeetingId[remoteMeetingId]) {
      return sortBookshelfPostsByLatest(bookshelfReviewsByMeetingId[remoteMeetingId]);
    }
    return [];
  }, [bookshelfReviewsByMeetingId, selectedBookshelfBook?.remoteMeetingId]);

  const currentBookshelfTopicPageState = useMemo<CursorPageState | null>(() => {
    const remoteMeetingId = selectedBookshelfBook?.remoteMeetingId;
    if (typeof remoteMeetingId !== 'number') return null;
    return bookshelfTopicPageStateByMeetingId[remoteMeetingId] ?? null;
  }, [bookshelfTopicPageStateByMeetingId, selectedBookshelfBook?.remoteMeetingId]);

  const canSubmitBookshelfComposer =
    bookshelfComposerInput.trim().length > 0 &&
    (bookshelfComposerType !== 'REVIEW' || bookshelfComposerRating >= 0.5);

  const baseRegularMeetingInfo = useMemo<RegularMeetingInfo | null>(() => {
    const remoteMeetingId = selectedBookshelfBook?.remoteMeetingId;
    if (remoteMeetingId && regularMeetingInfoByMeetingId[remoteMeetingId]) {
      return regularMeetingInfoByMeetingId[remoteMeetingId];
    }
    return null;
  }, [regularMeetingInfoByMeetingId, selectedBookshelfBook?.remoteMeetingId]);

  useEffect(() => {
    if (!baseRegularMeetingInfo) return;

    setRegularGroupPostsById((prev) => {
      const next = { ...prev };
      let changed = false;
      baseRegularMeetingInfo.groups.forEach((groupItem) => {
        const currentPosts = next[groupItem.id];
        if (!currentPosts) {
          next[groupItem.id] = groupItem.posts;
          changed = true;
          return;
        }
        const currentCompletedByPostId = new Map(
          currentPosts.map((post) => [post.id, post.completed] as const),
        );
        const mergedPosts = groupItem.posts.map((post) => ({
          ...post,
          completed: currentCompletedByPostId.get(post.id) ?? post.completed,
        }));
        if (!areRegularGroupPostsEqual(currentPosts, mergedPosts)) {
          next[groupItem.id] = mergedPosts;
          changed = true;
        }
      });
      return changed ? next : prev;
    });

  }, [baseRegularMeetingInfo]);

  const regularMeetingInfo = useMemo<RegularMeetingInfo | null>(() => {
    if (!baseRegularMeetingInfo) return null;
    return {
      ...baseRegularMeetingInfo,
      groups: baseRegularMeetingInfo.groups.map((groupItem) => ({
        ...groupItem,
        posts: regularGroupPostsById[groupItem.id] ?? groupItem.posts,
      })),
    };
  }, [baseRegularMeetingInfo, regularGroupPostsById]);

  const selectedRegularGroup = useMemo(() => {
    if (!regularMeetingInfo || !selectedRegularGroupId) return null;
    return regularMeetingInfo.groups.find((g) => g.id === selectedRegularGroupId) ?? null;
  }, [regularMeetingInfo, selectedRegularGroupId]);

  useEffect(() => {
    if (!baseRegularMeetingInfo) return;
    const mapping: Record<number, string> = {};
    baseRegularMeetingInfo.groups.forEach((g) => {
      if (g.teamId != null) mapping[g.teamId] = g.id;
    });
    teamToGroupIdRef.current = mapping;
  }, [baseRegularMeetingInfo]);

  const handleStompTopicUpdate = useCallback((payload: TopicUpdatePayload) => {
    const groupId = teamToGroupIdRef.current[payload.teamId];
    if (!groupId) return;
    const pendingPost = regularGroupPostsByIdRef.current[groupId]?.find(
      (post) => post.remoteTopicId === payload.topicId,
    );
    if (pendingPost) {
      const pendingKey = makeRegularGroupPendingKey(groupId, pendingPost.id);
      removeRegularGroupPendingPost(pendingKey);
    }
    setRegularGroupPostsById((prev) => {
      const current = prev[groupId];
      if (!current) return prev;
      const hasChange = current.some(
        (post) => post.remoteTopicId === payload.topicId && post.completed !== payload.isSelected,
      );
      if (!hasChange) return prev;
      return {
        ...prev,
        [groupId]: current.map((post) =>
          post.remoteTopicId === payload.topicId ? { ...post, completed: payload.isSelected } : post,
        ),
      };
    });
  }, [removeRegularGroupPendingPost]);

  const { publishToggle: stompPublishToggle, isConnected: isRegularGroupStompConnected } = useRegularGroupStomp({
    clubId: group.clubId,
    meetingId: selectedBookshelfBook?.remoteMeetingId,
    teamId: selectedRegularGroup?.teamId,
    enabled: isLoggedIn && bookshelfViewMode === 'REGULAR_GROUP',
    onTopicUpdate: handleStompTopicUpdate,
  });

  const stompPublishToggleRef = useRef(stompPublishToggle);
  stompPublishToggleRef.current = stompPublishToggle;

  useEffect(() => {
    if (isRegularGroupStompConnected) return;
    if (regularGroupPendingPostKeysRef.current.size === 0) return;
    regularGroupPendingPostKeysRef.current = new Set();
    setRegularGroupPendingPostKeys(new Set());
  }, [isRegularGroupStompConnected]);

  const teamManageMemberById = useMemo(
    () =>
      Object.fromEntries(
        teamManageMembers.map((member) => [member.clubMemberId, member]),
      ) as Record<number, TeamManageMemberItem>,
    [teamManageMembers],
  );
  const teamManageAssignedMemberIds = useMemo(
    () => new Set(teamManageTeams.flatMap((team) => team.memberIds)),
    [teamManageTeams],
  );
  const teamManageUnassignedMembers = useMemo(
    () => teamManageMembers.filter((member) => !teamManageAssignedMemberIds.has(member.clubMemberId)),
    [teamManageAssignedMemberIds, teamManageMembers],
  );

  useEffect(() => {
    if (bookshelfSessions.length === 0) return;
    if (bookshelfSessions.includes(selectedBookshelfSession)) return;
    setSelectedBookshelfSession(bookshelfSessions[0]);
  }, [bookshelfSessions, selectedBookshelfSession]);

  useEffect(() => {
    if (bookshelfViewMode === 'GRID') return;
    if (!selectedBookshelfBook) {
      setBookshelfViewMode('GRID');
      setSelectedRegularGroupId(null);
      return;
    }
    if (!selectedBookshelfBookId) {
      setSelectedBookshelfBookId(selectedBookshelfBook.id);
    }
  }, [bookshelfViewMode, selectedBookshelfBook, selectedBookshelfBookId]);

  useEffect(() => {
    if (!regularMeetingInfo) {
      setSelectedRegularGroupId(null);
      return;
    }
    if (
      selectedRegularGroupId &&
      regularMeetingInfo.groups.some((g) => g.id === selectedRegularGroupId)
    ) {
      return;
    }
    setSelectedRegularGroupId(regularMeetingInfo.groups[0]?.id ?? null);
  }, [regularMeetingInfo, selectedRegularGroupId]);

  useEffect(() => {
    setRegularGroupMembersVisible(false);
  }, [bookshelfViewMode, selectedRegularGroupId]);

  useEffect(() => {
    if (!teamManageVisible) return;
    refreshTeamManageQuickDropLayouts();
  }, [teamManageTeams, teamManageVisible]); // eslint-disable-line react-hooks/exhaustive-deps

  const fetchAllBookshelfReviewsForMeeting = useCallback(
    async (
      clubId: number,
      meetingId: number,
      options?: { suppressErrorToast?: boolean },
    ): Promise<ClubBookshelfReview[]> => {
      const merged: ClubBookshelfReview[] = [];
      const seenReviewIds = new Set<number>();
      const visitedCursors = new Set<number>();
      let cursorId: number | undefined;

      for (let page = 0; page < BOOKSHELF_CURSOR_LOOP_LIMIT; page += 1) {
        const response = await fetchClubBookshelfReviews(clubId, meetingId, cursorId, {
          suppressErrorToast: options?.suppressErrorToast,
        });
        response.items.forEach((item) => {
          if (seenReviewIds.has(item.bookReviewId)) return;
          seenReviewIds.add(item.bookReviewId);
          merged.push(item);
        });
        if (!response.hasNext || typeof response.nextCursor !== 'number') break;
        if (visitedCursors.has(response.nextCursor)) break;
        visitedCursors.add(response.nextCursor);
        cursorId = response.nextCursor;
      }
      return merged;
    },
    [],
  );

  const fetchAllMeetingTeamTopics = useCallback(
    async (
      clubId: number,
      meetingId: number,
      teamId: number,
      options?: { suppressErrorToast?: boolean },
    ): Promise<ClubMeetingTeamTopics> => {
      const mergedTopics: ClubMeetingTeamTopics['topics'] = [];
      const seenTopicIds = new Set<number>();
      const visitedCursors = new Set<number>();
      let cursorId: number | undefined;
      let latestMeta: ClubMeetingTeamTopics | null = null;

      for (let page = 0; page < BOOKSHELF_CURSOR_LOOP_LIMIT; page += 1) {
        const response = await fetchClubMeetingTeamTopics(clubId, meetingId, teamId, cursorId, {
          suppressErrorToast: options?.suppressErrorToast,
        });
        latestMeta = response;
        response.topics.forEach((item) => {
          if (seenTopicIds.has(item.topicId)) return;
          seenTopicIds.add(item.topicId);
          mergedTopics.push(item);
        });
        if (!response.hasNext || typeof response.nextCursor !== 'number') break;
        if (visitedCursors.has(response.nextCursor)) break;
        visitedCursors.add(response.nextCursor);
        cursorId = response.nextCursor;
      }

      if (!latestMeta) {
        return { existingTeams: [], requestedTeam: undefined, topics: [], hasNext: false, nextCursor: null };
      }
      return { existingTeams: latestMeta.existingTeams, requestedTeam: latestMeta.requestedTeam, topics: mergedTopics, hasNext: false, nextCursor: null };
    },
    [],
  );

  const setBookshelfDetailLoadingForMeeting = useCallback((meetingId: number, loading: boolean) => {
    const next = { ...bookshelfDetailLoadingCountByMeetingIdRef.current };

    if (loading) {
      next[meetingId] = (next[meetingId] ?? 0) + 1;
    } else {
      const current = next[meetingId] ?? 0;
      if (current <= 1) {
        delete next[meetingId];
      } else {
        next[meetingId] = current - 1;
      }
    }

    bookshelfDetailLoadingCountByMeetingIdRef.current = next;
    setLoadingBookshelfDetail(Object.keys(next).length > 0);
  }, []);

  const reloadBookshelfMeetingDetail = useCallback(
    async (book: BookshelfItem, options?: { suppressErrorToast?: boolean }) => {
      const clubId = group.clubId;
      const meetingId = book.remoteMeetingId;
      if (typeof clubId !== 'number' || typeof meetingId !== 'number') return;
      const requestId = (bookshelfMeetingDetailRequestIdRef.current[meetingId] ?? 0) + 1;
      bookshelfMeetingDetailRequestIdRef.current[meetingId] = requestId;
      const isStale = () => bookshelfMeetingDetailRequestIdRef.current[meetingId] !== requestId;

      setBookshelfDetailLoadingForMeeting(meetingId, true);
      try {
        const [topicPage, reviews, detail, editDetail] = await Promise.all([
          fetchClubBookshelfTopics(clubId, meetingId, undefined, {
            suppressErrorToast: options?.suppressErrorToast,
          }),
          fetchAllBookshelfReviewsForMeeting(clubId, meetingId, {
            suppressErrorToast: options?.suppressErrorToast,
          }),
          fetchClubBookshelfDetail(clubId, meetingId, {
            suppressErrorToast: options?.suppressErrorToast,
          }),
          canManageClub
            ? fetchClubBookshelfEditInfo(clubId, meetingId, { suppressErrorToast: true }).catch(
                () => null,
              )
            : Promise.resolve(null),
        ]);

        const richDetail = editDetail ?? detail;
        const regularMeetingId = detail?.meetingId ?? book.regularMeetingId ?? meetingId;

        if (isStale()) return;
        setBookshelfTopicsByMeetingId((prev) => ({
          ...prev,
          [meetingId]: topicPage.items.map(mapBookshelfTopicToPostItem),
        }));
        setBookshelfTopicPageStateByMeetingId((prev) => ({
          ...prev,
          [meetingId]: {
            hasNext: Boolean(topicPage.hasNext),
            nextCursor: topicPage.nextCursor,
            loadingMore: false,
          },
        }));
        setBookshelfReviewsByMeetingId((prev) => ({
          ...prev,
          [meetingId]: reviews.map(mapBookshelfReviewToPostItem),
        }));

        if (detail) {
          setBookshelfItems((prev) =>
            prev.map((item) => {
              if (item.remoteMeetingId !== meetingId) return item;
              const nextGeneration = detail.generation ?? item.generation;
              const nextSession = formatGenerationLabel(nextGeneration);
              const nextCategory = detail.tag?.trim() || item.category;
              const nextRegularMeetingName = richDetail?.title ?? item.regularMeetingName;
              const nextMeetingLocation = richDetail?.location ?? item.meetingLocation;
              const nextMeetingDate =
                typeof richDetail?.meetingTime === 'string'
                  ? formatDotDate(richDetail.meetingTime)
                  : item.meetingDate;

              if (
                item.generation === nextGeneration &&
                item.session === nextSession &&
                item.category === nextCategory &&
                item.regularMeetingId === regularMeetingId &&
                item.regularMeetingName === nextRegularMeetingName &&
                item.meetingLocation === nextMeetingLocation &&
                item.meetingDate === nextMeetingDate
              ) {
                return item;
              }
              return {
                ...item,
                generation: nextGeneration,
                session: nextSession,
                category: nextCategory,
                regularMeetingId,
                regularMeetingName: nextRegularMeetingName,
                meetingLocation: nextMeetingLocation,
                meetingDate: nextMeetingDate,
              };
            }),
          );
        }

        if (richDetail) {
          const summaryInfo = ensureRegularMeetingInfo(
            {
              id: `${book.id}-regular`,
              name: richDetail.title?.trim() || `${book.title} 정기모임`,
              date: formatDotDate(richDetail.meetingTime),
              location: richDetail.location?.trim() || '장소 미정',
              groups: [],
            },
            book,
            richDetail,
          );
          setRegularMeetingInfoByMeetingId((prev) => ({ ...prev, [meetingId]: summaryInfo }));
        }

        if (isStale()) return;

        let meeting: import('../../services/api/clubApi').ClubMeetingInfo | null = null;

        try {
          meeting = await fetchClubMeeting(clubId, regularMeetingId, {
            suppressErrorToast: options?.suppressErrorToast,
          });
        } catch (error) {
          if (error instanceof ApiError && error.status === 401) throw error;
          if (!(error instanceof ApiError) && !options?.suppressErrorToast) {
            showToast('정기모임 정보를 불러오지 못했습니다.');
          }
        }

        let regularInfo: RegularMeetingInfo | null = null;
        let meetingMembersFallback: import('../../services/api/clubApi').ClubMeetingMemberList | null = null;

        if (meeting) {
          if (meeting.teams.length === 0 || meeting.members.length === 0) {
            try {
              meetingMembersFallback = await fetchClubMeetingMembers(clubId, regularMeetingId, { suppressErrorToast: true });
            } catch (fallbackError) {
              if (fallbackError instanceof ApiError && fallbackError.status === 401) throw fallbackError;
            }
          }

          const effectiveMeeting =
            meetingMembersFallback && (meeting.teams.length === 0 || meeting.members.length === 0)
              ? {
                  ...meeting,
                  teams: meeting.teams.length > 0 ? meeting.teams : meetingMembersFallback.teams,
                  members: meeting.members.length > 0 ? meeting.members : meetingMembersFallback.members,
                }
              : meeting;

          const topicSettled = await Promise.allSettled(
            effectiveMeeting.teams.map(async (team) => [
              team.teamId,
              await fetchAllMeetingTeamTopics(clubId, regularMeetingId, team.teamId, {
                suppressErrorToast: options?.suppressErrorToast,
              }),
            ] as const),
          );

          if (isStale()) return;

          const topicEntries = effectiveMeeting.teams.map((team, index) => {
            const settled = topicSettled[index];
            if (settled?.status === 'fulfilled') return settled.value as [number, ClubMeetingTeamTopics];
            return [team.teamId, { existingTeams: effectiveMeeting.teams, requestedTeam: team, topics: [], hasNext: false, nextCursor: null }] as [number, ClubMeetingTeamTopics];
          });

          const topicsByTeamId = Object.fromEntries(topicEntries);
          regularInfo = mapMeetingToRegularMeetingInfo(
            book, effectiveMeeting, topicsByTeamId, currentMemberNicknameRef.current,
          );
        }

        if (!regularInfo || regularInfo.groups.length === 0) {
          try {
            const meetingMembersResponse =
              meetingMembersFallback ??
              (await fetchClubMeetingMembers(clubId, regularMeetingId, { suppressErrorToast: true }));
            const fallbackMeeting = {
              meetingId: regularMeetingId,
              title: meeting?.title ?? richDetail?.title ?? book.regularMeetingName ?? `${book.title} 정기모임`,
              meetingTime: meeting?.meetingTime ?? richDetail?.meetingTime,
              location: meeting?.location ?? richDetail?.location,
              teams: meetingMembersResponse.teams.length > 0 ? meetingMembersResponse.teams : meeting?.teams ?? [],
              members: meetingMembersResponse.members.length > 0 ? meetingMembersResponse.members : meeting?.members ?? [],
              isStaff: meeting?.isStaff ?? canManageClub,
            };
            const fallbackInfo = mapMeetingToRegularMeetingInfo(book, fallbackMeeting, {}, currentMemberNicknameRef.current);
            if (fallbackInfo && fallbackInfo.groups.length > 0) {
              regularInfo = fallbackInfo;
            }
          } catch (fallbackError) {
            if (fallbackError instanceof ApiError && fallbackError.status === 401) throw fallbackError;
          }
        }

        if (isStale()) return;

        const finalInfo = ensureRegularMeetingInfo(regularInfo, book, richDetail);
        setRegularMeetingInfoByMeetingId((prev) => ({ ...prev, [meetingId]: finalInfo }));
      } catch (error) {
        if (isStale()) return;
        if (error instanceof ApiError && error.status === 401) {
          if (!options?.suppressErrorToast) showToast('로그인이 만료되었습니다.');
          return;
        }
        if (!options?.suppressErrorToast) {
          showToast(resolveBookshelfActionErrorMessage(error, '책장 상세를 불러오지 못했습니다.'));
        }
      } finally {
        setBookshelfDetailLoadingForMeeting(meetingId, false);
      }
    },
    [
      canManageClub,
      fetchAllBookshelfReviewsForMeeting,
      fetchAllMeetingTeamTopics,
      group.clubId,
      setBookshelfDetailLoadingForMeeting,
    ],
  );

  const hasBookshelfMeetingDetailCache = useCallback(
    (book: BookshelfItem) => {
      const meetingId = book.remoteMeetingId;
      if (typeof meetingId !== 'number') return true;
      return (
        Object.prototype.hasOwnProperty.call(bookshelfTopicPageStateByMeetingId, meetingId) &&
        Object.prototype.hasOwnProperty.call(bookshelfReviewsByMeetingId, meetingId) &&
        Object.prototype.hasOwnProperty.call(regularMeetingInfoByMeetingId, meetingId)
      );
    },
    [
      bookshelfReviewsByMeetingId,
      bookshelfTopicPageStateByMeetingId,
      regularMeetingInfoByMeetingId,
    ],
  );

  const ensureBookshelfMeetingDetailLoaded = useCallback(
    (book: BookshelfItem) => {
      const meetingId = book.remoteMeetingId;
      if (typeof meetingId !== 'number') return;
      if (hasBookshelfMeetingDetailCache(book)) return;
      if ((bookshelfDetailLoadingCountByMeetingIdRef.current[meetingId] ?? 0) > 0) return;

      void reloadBookshelfMeetingDetail(book);
    },
    [hasBookshelfMeetingDetailCache, reloadBookshelfMeetingDetail],
  );

  const closeBookshelfBookSelector = useCallback(() => {
    setBookshelfBookSelectorVisible(false);
    resetBookshelfBookSearch();
  }, [resetBookshelfBookSearch]);

  const closeBookshelfCalendar = useCallback(() => {
    setBookshelfCalendarVisible(false);
  }, []);

  const openBookshelfCalendar = useCallback(() => {
    const { year, month } = getCurrentKstYearMonth();
    const selectedDate = parseDotDate(bookshelfCreateDraft.meetingDate) ?? new Date(year, month - 1, 1);
    setBookshelfCalendarMonth(new Date(selectedDate.getFullYear(), selectedDate.getMonth(), 1));
    setBookshelfCalendarVisible(true);
  }, [bookshelfCreateDraft.meetingDate]);

  const handleSelectBookshelfMeetingDate = useCallback(
    (value: string) => {
      setBookshelfCreateDraft((prev) => ({ ...prev, meetingDate: value }));
      closeBookshelfCalendar();
    },
    [closeBookshelfCalendar],
  );

  const handlePickTodayBookshelfMeetingDate = useCallback(() => {
    const { year, month } = getCurrentKstYearMonth();
    setBookshelfCalendarMonth(new Date(year, month - 1, 1));
    handleSelectBookshelfMeetingDate(getCurrentKstDateLabel());
  }, [handleSelectBookshelfMeetingDate]);

  const loadMoreBookshelfTopics = useCallback(
    async (meetingId: number) => {
      const clubId = group.clubId;
      if (typeof clubId !== 'number') return;
      const pageState = bookshelfTopicPageStateByMeetingId[meetingId];
      if (
        !pageState || pageState.loadingMore || !pageState.hasNext ||
        typeof pageState.nextCursor !== 'number'
      ) return;

      setBookshelfTopicPageStateByMeetingId((prev) => ({
        ...prev,
        [meetingId]: { ...pageState, loadingMore: true },
      }));

      try {
        const response = await fetchClubBookshelfTopics(clubId, meetingId, pageState.nextCursor, {
          suppressErrorToast: true,
        });
        setBookshelfTopicsByMeetingId((prev) => {
          const currentItems = prev[meetingId] ?? [];
          const appended = response.items.map(mapBookshelfTopicToPostItem);
          const seen = new Set(currentItems.map((item) => item.id));
          return { ...prev, [meetingId]: [...currentItems, ...appended.filter((item) => !seen.has(item.id))] };
        });
        setBookshelfTopicPageStateByMeetingId((prev) => ({
          ...prev,
          [meetingId]: {
            hasNext: Boolean(response.hasNext),
            nextCursor: response.nextCursor,
            loadingMore: false,
          },
        }));
      } catch (error) {
        setBookshelfTopicPageStateByMeetingId((prev) => ({
          ...prev,
          [meetingId]: { ...pageState, loadingMore: false },
        }));
        if (!(error instanceof ApiError)) {
          showToast('발제를 추가로 불러오지 못했습니다.');
        }
      }
    },
    [bookshelfTopicPageStateByMeetingId, group.clubId],
  );

  const openBookshelfDetail = useCallback(
    (book: BookshelfItem, tab: BookshelfDetailTab) => {
      const open = () => {
        shouldScrollToBookshelfDetailRef.current = true;
        setSelectedBookshelfBookId(book.id);
        setBookshelfDetailTab(tab);
        setSelectedRegularGroupId(null);
        setBookshelfViewMode('DETAIL');
        ensureBookshelfMeetingDetailLoaded(book);
      };

      if (tab === 'REGULAR' && !isLoggedIn) {
        requireAuth(open);
        return;
      }
      open();
    },
    [ensureBookshelfMeetingDetailLoaded, isLoggedIn, requireAuth],
  );

  const openBookshelfTopicByMeetingId = useCallback(
    async (meetingId: number) => {
      const clubId = group.clubId;
      if (typeof clubId !== 'number') return false;

      let targetBook =
        bookshelfItems.find(
          (item) =>
            item.remoteMeetingId === meetingId || item.regularMeetingId === meetingId,
        ) ?? null;

      if (!targetBook) {
        const detail = await fetchClubBookshelfDetail(clubId, meetingId);
        if (detail) {
          targetBook = mapBookshelfDetailToItem(detail, meetingId);
          setBookshelfItems((prev) =>
            prev.some(
              (item) =>
                item.remoteMeetingId === targetBook!.remoteMeetingId ||
                (typeof targetBook!.regularMeetingId === 'number' &&
                  item.regularMeetingId === targetBook!.regularMeetingId),
            )
              ? prev
              : [targetBook!, ...prev],
          );
        }
      }

      if (!targetBook) return false;

      setActiveTab('bookshelf');
      setSelectedBookshelfSession(targetBook.session);
      openBookshelfDetail(targetBook, 'TOPIC');
      return true;
    },
    [bookshelfItems, group.clubId, openBookshelfDetail, setActiveTab],
  );

  const refreshBookshelfPostsByType = useCallback(
    async (clubId: number, meetingId: number, type: 'TOPIC' | 'REVIEW') => {
      if (type === 'TOPIC') {
        const topics = await fetchClubBookshelfTopics(clubId, meetingId);
        setBookshelfTopicsByMeetingId((prev) => ({
          ...prev,
          [meetingId]: topics.items.map(mapBookshelfTopicToPostItem),
        }));
        setBookshelfTopicPageStateByMeetingId((prev) => ({
          ...prev,
          [meetingId]: {
            hasNext: Boolean(topics.hasNext),
            nextCursor: topics.nextCursor,
            loadingMore: false,
          },
        }));
        return;
      }
      const reviews = await fetchAllBookshelfReviewsForMeeting(clubId, meetingId);
      setBookshelfReviewsByMeetingId((prev) => ({
        ...prev,
        [meetingId]: reviews.map(mapBookshelfReviewToPostItem),
      }));
    },
    [fetchAllBookshelfReviewsForMeeting],
  );

  const closeBookshelfComposer = useCallback(() => {
    if (submittingBookshelfComposer) return;
    setEditingBookshelfPost(null);
    setBookshelfComposerType(null);
    setBookshelfComposerInput('');
    setBookshelfComposerRating(0);
  }, [submittingBookshelfComposer]);

  const handleOpenBookshelfComposer = useCallback(
    (type: 'TOPIC' | 'REVIEW', post?: BookshelfPostItem) => {
      const open = () => {
        if (typeof selectedBookshelfBook?.remoteMeetingId !== 'number') {
          showToast('책장 정보를 찾을 수 없습니다.');
          return;
        }
        setEditingBookshelfPost(post ?? null);
        setBookshelfComposerType(type);
        setBookshelfComposerInput(post?.content ?? '');
        setBookshelfComposerRating(type === 'REVIEW' ? (post?.rating ?? 0) : 0);
      };
      if (!isLoggedIn) {
        requireAuth(open);
        return;
      }
      open();
    },
    [isLoggedIn, requireAuth, selectedBookshelfBook?.remoteMeetingId],
  );

  const handleSubmitBookshelfComposer = useCallback(() => {
    const clubId = group.clubId;
    const meetingId = selectedBookshelfBook?.remoteMeetingId;
    const description = bookshelfComposerInput.trim();

    if (typeof clubId !== 'number' || typeof meetingId !== 'number' || !bookshelfComposerType) {
      showToast('책장 정보를 찾을 수 없습니다.');
      return;
    }
    if (!description) {
      showToast(bookshelfComposerType === 'TOPIC' ? '발제 내용을 입력해야 합니다.' : '한줄평을 입력해야 합니다.');
      return;
    }
    if (bookshelfComposerType === 'REVIEW' && bookshelfComposerRating < 0.5) {
      showToast('평점을 선택해야 합니다.');
      return;
    }

    const submit = async () => {
      setSubmittingBookshelfComposer(true);
      try {
        const isEditing = editingBookshelfPost?.type === bookshelfComposerType;
        if (bookshelfComposerType === 'TOPIC') {
          if (isEditing && typeof editingBookshelfPost?.remoteId === 'number') {
            await updateClubBookshelfTopic(clubId, meetingId, editingBookshelfPost.remoteId, { description });
          } else {
            await createClubBookshelfTopic(clubId, meetingId, { description });
          }
          await refreshBookshelfPostsByType(clubId, meetingId, 'TOPIC');
          if (selectedBookshelfBook) {
            await reloadBookshelfMeetingDetail(selectedBookshelfBook, { suppressErrorToast: true });
          }
          showToast(isEditing ? '발제가 수정되었습니다.' : '발제가 등록되었습니다.');
        } else {
          if (isEditing && typeof editingBookshelfPost?.remoteId === 'number') {
            await updateClubBookshelfReview(clubId, meetingId, editingBookshelfPost.remoteId, {
              description,
              rate: bookshelfComposerRating,
            });
          } else {
            await createClubBookshelfReview(clubId, meetingId, {
              description,
              rate: bookshelfComposerRating,
            });
          }
          await refreshBookshelfPostsByType(clubId, meetingId, 'REVIEW');
          showToast(isEditing ? '한줄평이 수정되었습니다.' : '한줄평이 등록되었습니다.');
        }
        setEditingBookshelfPost(null);
        setBookshelfComposerType(null);
        setBookshelfComposerInput('');
        setBookshelfComposerRating(0);
      } catch (error) {
        showToast(
          resolveBookshelfActionErrorMessage(
            error,
            bookshelfComposerType === 'TOPIC'
              ? (editingBookshelfPost ? '발제 수정에 실패했습니다.' : '발제 등록에 실패했습니다.')
              : (editingBookshelfPost ? '한줄평 수정에 실패했습니다.' : '한줄평 등록에 실패했습니다.'),
          ),
        );
      } finally {
        setSubmittingBookshelfComposer(false);
      }
    };
    void submit();
  }, [
    bookshelfComposerInput,
    bookshelfComposerRating,
    bookshelfComposerType,
    editingBookshelfPost,
    group.clubId,
    reloadBookshelfMeetingDetail,
    refreshBookshelfPostsByType,
    selectedBookshelfBook,
  ]);

  const handlePressBookshelfPostMenu = useCallback(
    (post: BookshelfPostItem, event: GestureResponderEvent) => {
      setBookshelfPostMenu({
        post,
        pageX: event.nativeEvent.pageX,
        pageY: event.nativeEvent.pageY,
      });
    },
    [],
  );

  const handleSelectBookshelfPostMenuAction = useCallback(
    (action: 'edit' | 'delete' | 'report') => {
      const post = bookshelfPostMenu?.post;
      if (!post) return;
      setBookshelfPostMenu(null);

      if (action === 'report') {
        setReportModal({ nickname: post.author });
        return;
      }

      const clubId = group.clubId;
      const meetingId = selectedBookshelfBook?.remoteMeetingId;
      const postLabel = post.type === 'TOPIC' ? '발제' : '한줄평';

      if (
        !post.isAuthor ||
        typeof clubId !== 'number' ||
        typeof meetingId !== 'number' ||
        typeof post.remoteId !== 'number'
      ) return;

      if (action === 'edit') {
        handleOpenBookshelfComposer(post.type, post);
        return;
      }

      Alert.alert(`${postLabel} 삭제`, `이 ${postLabel}를 삭제하시겠습니까?`, [
        { text: '취소', style: 'cancel' },
        {
          text: '삭제',
          style: 'destructive',
          onPress: () => {
            const remove = async () => {
              try {
                if (post.type === 'TOPIC') {
                  await deleteClubBookshelfTopic(clubId, meetingId, post.remoteId);
                } else {
                  await deleteClubBookshelfReview(clubId, meetingId, post.remoteId);
                }
                await refreshBookshelfPostsByType(clubId, meetingId, post.type);
                showToast(`${postLabel}를 삭제했습니다.`);
              } catch (error) {
                showToast(resolveBookshelfActionErrorMessage(error, `${postLabel} 삭제에 실패했습니다.`));
              }
            };
            void remove();
          },
        },
      ]);
    },
    [
      bookshelfPostMenu,
      group.clubId,
      handleOpenBookshelfComposer,
      refreshBookshelfPostsByType,
      selectedBookshelfBook?.remoteMeetingId,
      setReportModal,
    ],
  );

  const handleOpenNextMeeting = useCallback(() => {
    const clubId = group.clubId;
    if (typeof clubId !== 'number' || openingNextMeeting) return;

    requireAuth(() => {
      const open = async () => {
        setOpeningNextMeeting(true);
        try {
          const nextMeeting = await fetchClubNextMeetingRedirect(clubId);
          const meetingId = nextMeeting?.meetingId;
          if (typeof meetingId !== 'number') {
            showToast('예정된 정기모임이 없습니다.');
            return;
          }
          const opened = await openBookshelfTopicByMeetingId(meetingId);
          if (!opened) showToast('이번 모임 정보를 찾을 수 없습니다.');
        } catch (error) {
          if (error instanceof ApiError) {
            if (error.status === 404) {
              showToast('예정된 정기모임이 없습니다.');
              return;
            }
            showToast(error.message);
            return;
          }
          showToast('이번 모임을 열지 못했습니다.');
        } finally {
          setOpeningNextMeeting(false);
        }
      };
      void open();
    });
  }, [group.clubId, openBookshelfTopicByMeetingId, openingNextMeeting, requireAuth]);

  const handleBackToBookshelfGrid = useCallback(() => {
    setBookshelfViewMode('GRID');
    setSelectedRegularGroupId(null);
  }, []);

  const handleChangeBookshelfTab = useCallback(
    (tab: BookshelfDetailTab) => {
      triggerSelectionHaptic();
      const change = () => {
        setBookshelfDetailTab(tab);
        if (selectedBookshelfBook) {
          ensureBookshelfMeetingDetailLoaded(selectedBookshelfBook);
        }
        if (tab !== 'REGULAR') {
          setSelectedRegularGroupId(null);
          setBookshelfViewMode('DETAIL');
          return;
        }
        setBookshelfViewMode('DETAIL');
      };
      if (tab === 'REGULAR' && !isLoggedIn) {
        requireAuth(change);
        return;
      }
      change();
    },
    [ensureBookshelfMeetingDetailLoaded, isLoggedIn, requireAuth, selectedBookshelfBook],
  );

  const handleSelectRegularGroup = useCallback((groupId: string) => {
    setSelectedRegularGroupId(groupId);
  }, []);

  const handleEnterRegularGroup = useCallback((groupId: string) => {
    setSelectedRegularGroupId(groupId);
    setBookshelfDetailTab('REGULAR');
    setBookshelfViewMode('REGULAR_GROUP');
  }, []);

  const handleToggleRegularGroupMembers = useCallback(() => {
    setRegularGroupMembersVisible((prev) => !prev);
  }, []);

  const handleToggleRegularGroupPost = useCallback((groupId: string, postId: string) => {
    const posts = regularGroupPostsByIdRef.current[groupId];
    const post = posts?.find((p) => p.id === postId);
    if (post?.remoteTopicId == null) {
      showToast('발제 정보를 찾을 수 없습니다.');
      return;
    }

    const targetGroup = regularMeetingInfo?.groups.find((groupItem) => groupItem.id === groupId);
    const normalizedCurrentNickname = currentMemberNicknameRef.current.trim();
    const isCurrentMemberGroup =
      Boolean(normalizedCurrentNickname) &&
      Boolean(
        targetGroup?.members.some(
          (member) =>
            member.nickname.trim().localeCompare(normalizedCurrentNickname, 'ko', {
              sensitivity: 'accent',
            }) === 0,
        ),
      );

    if (!canManageClub && !isCurrentMemberGroup) {
      showToast('현재 조의 발제만 선택할 수 있습니다.');
      return;
    }

    if (!isRegularGroupStompConnected) {
      showToast('실시간 연결이 아직 되지 않았습니다.');
      return;
    }

    const pendingKey = makeRegularGroupPendingKey(groupId, postId);
    if (regularGroupPendingPostKeysRef.current.has(pendingKey)) return;

    if (!addRegularGroupPendingPost(pendingKey)) return;

    try {
      stompPublishToggleRef.current(post.remoteTopicId, !post.completed);
    } catch (error) {
      removeRegularGroupPendingPost(pendingKey);
      showToast(error instanceof Error ? error.message : '발제 선택을 반영하지 못했습니다.');
    }
  }, [
    addRegularGroupPendingPost,
    canManageClub,
    isRegularGroupStompConnected,
    regularMeetingInfo?.groups,
    removeRegularGroupPendingPost,
  ]);

  const handleSortRegularGroupPosts = useCallback((groupId: string) => {
    setRegularGroupPostsById((prev) => {
      const current = prev[groupId];
      if (!current) return prev;
      return {
        ...prev,
        [groupId]: [
          ...current.filter((post) => post.completed),
          ...current.filter((post) => !post.completed),
        ],
      };
    });
  }, []);

  // Team management
  const stopDragAutoScroll = useCallback(() => {
    if (dragAutoScrollFrameRef.current !== null) {
      cancelAnimationFrame(dragAutoScrollFrameRef.current);
      dragAutoScrollFrameRef.current = null;
    }
    dragAutoScrollLastTimestampRef.current = null;
  }, []);

  const closeTeamManage = useCallback(() => {
    if (teamManageSaving) return;
    setTeamManageVisible(false);
    setTeamManageSelectedMemberId(null);
    setDraggingTeamMemberId(null);
    setDraggingTeamMemberPosition(null);
    setTeamManageActiveDropZoneId(null);
    dragStartRef.current = null;
    stopDragAutoScroll();
    dragCurrentPagePositionRef.current = { x: 0, y: 0 };
    teamManageQuickDropRefs.current = {};
    teamManageQuickDropLayoutsRef.current = {};
    teamManageContentDropLayoutsRef.current = {};
    teamManageScrollMetricsRef.current = {
      left: 0,
      top: 0,
      width: 0,
      height: 0,
      contentHeight: 0,
      offset: 0,
    };
  }, [stopDragAutoScroll, teamManageSaving]);

  const refreshTeamManageQuickDropLayouts = useCallback(() => {
    if (!teamManageVisible) return;
    const entries = Object.entries(teamManageQuickDropRefs.current).filter(([, node]) =>
      Boolean(node),
    );
    if (entries.length === 0) {
      teamManageQuickDropLayoutsRef.current = {};
      return;
    }
    requestAnimationFrame(() => {
      const nextLayouts: Record<string, TeamManageDropLayout> = {};
      let measuredCount = 0;
      entries.forEach(([key, node]) => {
        node?.measureInWindow((x, y, width, height) => {
          nextLayouts[key] = { x, y, width, height };
          measuredCount += 1;
          if (measuredCount === entries.length) {
            teamManageQuickDropLayoutsRef.current = nextLayouts;
          }
        });
      });
    });
  }, [teamManageVisible]);

  const handleTeamManageContentDropLayout = useCallback(
    (zoneId: string, event: LayoutChangeEvent) => {
      const { x, y, width, height } = event.nativeEvent.layout;
      teamManageContentDropLayoutsRef.current[zoneId] = { x, y, width, height };
    },
    [],
  );

  const handleTeamManageScrollViewportLayout = useCallback(() => {
    teamManageScrollViewRef.current?.measureInWindow((left, top, width, height) => {
      const maxOffset = Math.max(
        0,
        teamManageScrollMetricsRef.current.contentHeight - height,
      );
      const offset = Math.min(teamManageScrollMetricsRef.current.offset, maxOffset);
      teamManageScrollMetricsRef.current = {
        ...teamManageScrollMetricsRef.current,
        left,
        top,
        width,
        height,
        offset,
      };
      teamManageScrollRef.current?.scrollTo({ y: offset, animated: false });
    });
  }, []);

  const handleTeamManageScrollContentSizeChange = useCallback(
    (_width: number, contentHeight: number) => {
      teamManageScrollMetricsRef.current.contentHeight = contentHeight;
      const maxOffset = Math.max(
        0,
        contentHeight - teamManageScrollMetricsRef.current.height,
      );
      teamManageScrollMetricsRef.current.offset = Math.min(
        teamManageScrollMetricsRef.current.offset,
        maxOffset,
      );
      teamManageScrollRef.current?.scrollTo({
        y: teamManageScrollMetricsRef.current.offset,
        animated: false,
      });
    },
    [],
  );

  const handleTeamManageScroll = useCallback(
    (event: NativeSyntheticEvent<NativeScrollEvent>) => {
      teamManageScrollMetricsRef.current.offset = event.nativeEvent.contentOffset.y;
    },
    [],
  );

  const moveTeamManageMemberToTarget = useCallback(
    (memberId: number, targetTeamNumber: number | null) => {
      setTeamManageTeams((prev) => {
        const removed = prev.map((team) => ({
          ...team,
          memberIds: team.memberIds.filter((id) => id !== memberId),
        }));
        if (targetTeamNumber === null) return removed;
        return removed.map((team) =>
          team.teamNumber === targetTeamNumber
            ? {
                ...team,
                memberIds: team.memberIds.includes(memberId)
                  ? team.memberIds
                  : [...team.memberIds, memberId],
              }
            : team,
        );
      });
      setTeamManageSelectedMemberId(null);
    },
    [],
  );

  const findTeamManageDropMatch = useCallback(
    (pageX: number, pageY: number): TeamManageDropMatch | undefined => {
      const resolveZone = (zoneId: string): TeamManageDropMatch | undefined => {
        const key = zoneId.slice(zoneId.indexOf(':') + 1);
        if (key === getTeamManageTargetKey(null)) return { zoneId, teamNumber: null };
        const teamNumber = Number(key.replace('team-', ''));
        if (!Number.isFinite(teamNumber)) return undefined;
        return teamManageTeams.some((team) => team.teamNumber === teamNumber)
          ? { zoneId, teamNumber }
          : undefined;
      };
      const quickMatch = Object.entries(teamManageQuickDropLayoutsRef.current).find(
        ([, layout]) =>
          pageX >= layout.x &&
          pageX <= layout.x + layout.width &&
          pageY >= layout.y &&
          pageY <= layout.y + layout.height,
      );
      if (quickMatch) return resolveZone(quickMatch[0]);

      const metrics = teamManageScrollMetricsRef.current;
      const contentX = pageX - metrics.left;
      const contentY = pageY - metrics.top + metrics.offset;
      const insideViewport =
        pageX >= metrics.left &&
        pageX <= metrics.left + metrics.width &&
        pageY >= metrics.top &&
        pageY <= metrics.top + metrics.height;
      const contentMatch = insideViewport
        ? Object.entries(teamManageContentDropLayoutsRef.current).find(
            ([, layout]) =>
              contentX >= layout.x &&
              contentX <= layout.x + layout.width &&
              contentY >= layout.y &&
              contentY <= layout.y + layout.height,
          )
        : undefined;
      if (!contentMatch) return undefined;
      return resolveZone(contentMatch[0]);
    },
    [teamManageTeams],
  );

  const updateTeamManageActiveDropTarget = useCallback(
    (pageX: number, pageY: number) => {
      const nextZoneId = findTeamManageDropMatch(pageX, pageY)?.zoneId ?? null;
      setTeamManageActiveDropZoneId((current) =>
        current === nextZoneId ? current : nextZoneId,
      );
    },
    [findTeamManageDropMatch],
  );

  const handlePressManageRegularGroups = useCallback(() => {
    const clubId = group.clubId;
    const meetingId = selectedRegularMeetingId;
    if (!canManageClub || typeof clubId !== 'number' || typeof meetingId !== 'number') {
      showToast('정기모임 정보를 찾을 수 없습니다.');
      return;
    }

    const open = async () => {
      setTeamManageVisible(true);
      setTeamManageLoading(true);
      setTeamManageSelectedMemberId(null);
      setDraggingTeamMemberId(null);
      setDraggingTeamMemberPosition(null);

      try {
        const [meeting, meetingMembersResponse] = await Promise.all([
          fetchClubMeeting(clubId, meetingId),
          fetchClubMeetingMembers(clubId, meetingId),
        ]);
        if (!meeting) {
          showToast('정기모임 정보를 찾을 수 없습니다.');
          setTeamManageVisible(false);
          return;
        }

        const memberMap = new Map<number, TeamManageMemberItem>();
        meetingMembersResponse.members.forEach((member) => {
          memberMap.set(member.clubMemberId, {
            clubMemberId: member.clubMemberId,
            nickname: member.nickname,
            profileImageUrl: member.profileImageUrl,
          });
        });

        const teamNumbers = Array.from(
          new Set([
            1,
            ...meeting.teams.map((team) => team.teamNumber),
            ...meetingMembersResponse.members
              .map((member) => member.teamNumber)
              .filter((tn): tn is number => typeof tn === 'number'),
          ]),
        )
          .filter((tn) => tn >= 1 && tn <= MAX_REGULAR_GROUP_COUNT)
          .sort((a, b) => a - b);

        const nextTeams = teamNumbers.map((teamNumber) => ({
          teamNumber,
          memberIds: meetingMembersResponse.members
            .filter((member) => member.teamNumber === teamNumber)
            .map((member) => member.clubMemberId),
        }));

        setTeamManageMembers(
          Array.from(memberMap.values()).sort((a, b) =>
            a.nickname.localeCompare(b.nickname, 'ko', { sensitivity: 'base' }),
          ),
        );
        setTeamManageTeams(nextTeams.length > 0 ? nextTeams : [{ teamNumber: 1, memberIds: [] }]);
      } catch (error) {
        showToast(resolveBookshelfActionErrorMessage(error, '조 편성 화면을 불러오지 못했습니다.'));
        setTeamManageVisible(false);
      } finally {
        setTeamManageLoading(false);
        setTimeout(refreshTeamManageQuickDropLayouts, 0);
      }
    };
    void open();
  }, [
    canManageClub,
    group.clubId,
    refreshTeamManageQuickDropLayouts,
    selectedRegularMeetingId,
  ]);

  const handleAddTeamManageTeam = useCallback(() => {
    setTeamManageTeams((prev) => {
      if (prev.length >= MAX_REGULAR_GROUP_COUNT) {
        showToast('조는 최대 10개까지 만들 수 있습니다.');
        return prev;
      }
      const usedNumbers = new Set(prev.map((team) => team.teamNumber));
      const nextTeamNumber = Array.from(
        { length: MAX_REGULAR_GROUP_COUNT },
        (_, index) => index + 1,
      ).find((tn) => !usedNumbers.has(tn));
      if (!nextTeamNumber) return prev;
      return [...prev, { teamNumber: nextTeamNumber, memberIds: [] }].sort(
        (a, b) => a.teamNumber - b.teamNumber,
      );
    });
    setTimeout(refreshTeamManageQuickDropLayouts, 0);
  }, [refreshTeamManageQuickDropLayouts]);

  const handleRemoveTeamManageTeam = useCallback(
    (teamNumber: number) => {
      setTeamManageTeams((prev) => {
        if (prev.length <= 1) {
          showToast('최소 한 개의 조는 필요합니다.');
          return prev;
        }
        return prev.filter((team) => team.teamNumber !== teamNumber);
      });
      setTimeout(refreshTeamManageQuickDropLayouts, 0);
    },
    [refreshTeamManageQuickDropLayouts],
  );

  const handlePressTeamManageTarget = useCallback(
    (teamNumber: number | null) => {
      if (teamManageSelectedMemberId === null) return;
      moveTeamManageMemberToTarget(teamManageSelectedMemberId, teamNumber);
    },
    [moveTeamManageMemberToTarget, teamManageSelectedMemberId],
  );

  const startDragAutoScroll = useCallback(() => {
    if (dragAutoScrollFrameRef.current !== null) return;
    dragAutoScrollLastTimestampRef.current = null;
    const tick = (timestamp: number) => {
      const dragState = dragStartRef.current;
      const metrics = teamManageScrollMetricsRef.current;
      const scrollRef = teamManageScrollRef.current;
      if (!dragState?.moved || !scrollRef || metrics.height <= 0) {
        dragAutoScrollFrameRef.current = null;
        dragAutoScrollLastTimestampRef.current = null;
        return;
      }
      const { x: pageX, y: pageY } = dragCurrentPagePositionRef.current;
      const bottom = metrics.top + metrics.height;
      const topIntensity = Math.max(
        0,
        Math.min(1, (metrics.top + TEAM_MANAGE_AUTO_SCROLL_ZONE - pageY) / TEAM_MANAGE_AUTO_SCROLL_ZONE),
      );
      const bottomIntensity = Math.max(
        0,
        Math.min(1, (pageY - (bottom - TEAM_MANAGE_AUTO_SCROLL_ZONE)) / TEAM_MANAGE_AUTO_SCROLL_ZONE),
      );
      const direction = topIntensity > 0 ? -1 : bottomIntensity > 0 ? 1 : 0;
      const intensity = direction < 0 ? topIntensity : bottomIntensity;
      if (direction === 0) {
        dragAutoScrollFrameRef.current = null;
        dragAutoScrollLastTimestampRef.current = null;
        return;
      }

      const previousTimestamp = dragAutoScrollLastTimestampRef.current;
      const deltaSeconds =
        previousTimestamp === null
          ? 1 / 60
          : Math.min(
              TEAM_MANAGE_AUTO_SCROLL_MAX_DELTA_SECONDS,
              Math.max(0, (timestamp - previousTimestamp) / 1000),
            );
      dragAutoScrollLastTimestampRef.current = timestamp;
      const speed =
        TEAM_MANAGE_AUTO_SCROLL_MIN_SPEED +
        (TEAM_MANAGE_AUTO_SCROLL_MAX_SPEED - TEAM_MANAGE_AUTO_SCROLL_MIN_SPEED) * intensity;
      const maxOffset = Math.max(0, metrics.contentHeight - metrics.height);
      const nextOffset = Math.max(
        0,
        Math.min(maxOffset, metrics.offset + direction * speed * deltaSeconds),
      );
      if (Math.abs(nextOffset - metrics.offset) < 0.5) {
        dragAutoScrollFrameRef.current = null;
        dragAutoScrollLastTimestampRef.current = null;
        return;
      }

      metrics.offset = nextOffset;
      scrollRef.scrollTo({ y: nextOffset, animated: false });
      updateTeamManageActiveDropTarget(pageX, pageY);
      dragAutoScrollFrameRef.current = requestAnimationFrame(tick);
    };
    dragAutoScrollFrameRef.current = requestAnimationFrame(tick);
  }, [updateTeamManageActiveDropTarget]);

  const finishTeamManageDrag = useCallback(
    (pageX: number, pageY: number) => {
      const dragState = dragStartRef.current;
      if (!dragState) return;
      const target = findTeamManageDropMatch(pageX, pageY);
      if (dragState.moved) {
        if (target) moveTeamManageMemberToTarget(dragState.memberId, target.teamNumber);
      } else {
        setTeamManageSelectedMemberId((prev) =>
          prev === dragState.memberId ? null : dragState.memberId,
        );
      }
      stopDragAutoScroll();
      dragStartRef.current = null;
      dragCurrentPagePositionRef.current = { x: 0, y: 0 };
      setTeamManageActiveDropZoneId(null);
      setDraggingTeamMemberId(null);
      setDraggingTeamMemberPosition(null);
    },
    [findTeamManageDropMatch, moveTeamManageMemberToTarget, stopDragAutoScroll],
  );

  const cancelTeamManageDrag = useCallback(() => {
    stopDragAutoScroll();
    dragStartRef.current = null;
    dragCurrentPagePositionRef.current = { x: 0, y: 0 };
    setTeamManageActiveDropZoneId(null);
    setDraggingTeamMemberId(null);
    setDraggingTeamMemberPosition(null);
  }, [stopDragAutoScroll]);

  const handleTeamManageMemberGrant = useCallback(
    (memberId: number, event: GestureResponderEvent) => {
      dragStartRef.current = {
        memberId,
        pageX: event.nativeEvent.pageX,
        pageY: event.nativeEvent.pageY,
        moved: false,
      };
      dragCurrentPagePositionRef.current = {
        x: event.nativeEvent.pageX,
        y: event.nativeEvent.pageY,
      };
      setDraggingTeamMemberId(memberId);
      setDraggingTeamMemberPosition({
        x: event.nativeEvent.pageX,
        y: event.nativeEvent.pageY,
      });
    },
    [],
  );

  const handleTeamManageMemberMove = useCallback(
    (event: GestureResponderEvent) => {
      const dragState = dragStartRef.current;
      if (!dragState) return;
      const dx = Math.abs(event.nativeEvent.pageX - dragState.pageX);
      const dy = Math.abs(event.nativeEvent.pageY - dragState.pageY);
      if (dx > TEAM_MANAGE_DRAG_THRESHOLD || dy > TEAM_MANAGE_DRAG_THRESHOLD) {
        dragState.moved = true;
      }
      const { pageX, pageY } = event.nativeEvent;
      dragCurrentPagePositionRef.current = { x: pageX, y: pageY };
      setDraggingTeamMemberPosition({ x: pageX, y: pageY });
      if (dragState.moved) {
        updateTeamManageActiveDropTarget(pageX, pageY);
        const metrics = teamManageScrollMetricsRef.current;
        const bottom = metrics.top + metrics.height;
        if (
          metrics.height > 0 &&
          (pageY < metrics.top + TEAM_MANAGE_AUTO_SCROLL_ZONE ||
            pageY > bottom - TEAM_MANAGE_AUTO_SCROLL_ZONE)
        ) {
          startDragAutoScroll();
        } else {
          stopDragAutoScroll();
        }
      }
    },
    [startDragAutoScroll, stopDragAutoScroll, updateTeamManageActiveDropTarget],
  );

  const handleTeamManageMemberRelease = useCallback(
    (event: GestureResponderEvent) => {
      finishTeamManageDrag(event.nativeEvent.pageX, event.nativeEvent.pageY);
    },
    [finishTeamManageDrag],
  );

  const handleSaveTeamManage = useCallback(() => {
    const clubId = group.clubId;
    const meetingId = selectedRegularMeetingId;
    const selectedBook = selectedBookshelfBook;
    if (typeof clubId !== 'number' || typeof meetingId !== 'number' || !selectedBook) {
      showToast('정기모임 정보를 찾을 수 없습니다.');
      return;
    }
    if (teamManageTeams.some((team) => team.memberIds.length === 0)) {
      showToast('빈 조를 삭제하거나 참여자를 배정해야 합니다.');
      return;
    }

    const submit = async () => {
      setTeamManageSaving(true);
      try {
        await manageClubMeetingTeams(clubId, meetingId, {
          teamMemberList: teamManageTeams.map((team) => ({
            teamNumber: team.teamNumber,
            clubMemberIds: team.memberIds,
          })),
        });
        await reloadBookshelfMeetingDetail(selectedBook, { suppressErrorToast: true });
        logMeetingAction('team_manage_save_success', {
          clubId,
          meetingId,
          teamCount: teamManageTeams.length,
        });
        showToast('조 편성이 저장되었습니다.');
        setBookshelfDetailTab('REGULAR');
        setBookshelfViewMode('DETAIL');
        setSelectedRegularGroupId(null);
        closeTeamManage();
      } catch (error) {
        logMeetingAction('team_manage_save_failure', {
          clubId,
          meetingId,
          teamCount: teamManageTeams.length,
          message: error instanceof Error ? error.message : String(error),
        });
        showToast(resolveBookshelfActionErrorMessage(error, '조 편성 저장에 실패했습니다.'));
      } finally {
        setTeamManageSaving(false);
      }
    };
    void submit();
  }, [
    closeTeamManage,
    group.clubId,
    reloadBookshelfMeetingDetail,
    selectedBookshelfBook,
    selectedRegularMeetingId,
    teamManageTeams,
  ]);

  const handleOpenBookshelfEdit = useCallback(() => {
    if (openingBookshelfEditRef.current) return;

    const clubId = group.clubId;
    const meetingId = selectedBookshelfBook?.remoteMeetingId;
    const fallbackBook = selectedBookshelfBook;

    if (!canManageClub || typeof clubId !== 'number' || typeof meetingId !== 'number' || !fallbackBook) {
      showToast('수정할 책장 정보를 찾을 수 없습니다.');
      return;
    }

    const open = async () => {
      openingBookshelfEditRef.current = true;
      let scheduledManagementOpen = false;
      try {
        const detail = await fetchClubBookshelfEditInfo(clubId, meetingId);
        if (!detail) {
          showToast('수정할 책장 정보를 찾을 수 없습니다.');
          setActiveManagementScreen(null);
          setEditingBookshelfMeetingId(null);
          return;
        }
        closeBookshelfBookSelector();
        closeBookshelfCalendar();
        setEditingBookshelfMeetingId(meetingId);
        setBookshelfCreateDraft({
          sourceBook: {
            isbn: (detail.book.bookId ?? fallbackBook.bookId ?? '').trim(),
            title: detail.book.title ?? fallbackBook.title,
            author: detail.book.author ?? fallbackBook.author,
            coverImage: detail.book.imgUrl ?? fallbackBook.coverImage,
            publisher: detail.book.publisher,
            description: detail.book.description,
          },
          session: String(detail.generation ?? parseGenerationNumber(fallbackBook.session) ?? 1),
          categories: detail.tag?.trim() ? [detail.tag.trim()] : [],
          regularMeetingName: detail.title?.trim() ?? fallbackBook.regularMeetingName ?? '',
          meetingLocation: detail.location?.trim() ?? fallbackBook.meetingLocation ?? '',
          meetingDate: formatDotDate(detail.meetingTime),
        });
        scheduledManagementOpen = true;
        requestAnimationFrame(() => {
          setActiveManagementScreen('BOOKSHELF_CREATE');
          openingBookshelfEditRef.current = false;
        });
      } catch (error) {
        showToast(resolveBookshelfActionErrorMessage(error, '책장 수정 정보를 불러오지 못했습니다.'));
        setActiveManagementScreen(null);
        setEditingBookshelfMeetingId(null);
      } finally {
        if (!scheduledManagementOpen) {
          openingBookshelfEditRef.current = false;
        }
      }
    };
    void open();
  }, [
    canManageClub,
    closeBookshelfBookSelector,
    closeBookshelfCalendar,
    group.clubId,
    selectedBookshelfBook,
    setActiveManagementScreen,
  ]);

  const handleSubmitBookshelfBookSearch = useCallback(() => {
    void runBookshelfBookSearch(bookshelfBookSearchQuery);
  }, [bookshelfBookSearchQuery, runBookshelfBookSearch]);

  const handleSelectBookshelfSourceBook = useCallback(
    (book: BookItem) => {
      setBookshelfCreateDraft((prev) => ({
        ...prev,
        sourceBook: {
          isbn: book.isbn,
          title: book.title,
          author: book.author,
          coverImage: book.imgUrl,
          publisher: book.publisher,
          description: book.description,
        },
      }));
      closeBookshelfBookSelector();
    },
    [closeBookshelfBookSelector],
  );

  const handleSubmitBookshelfCreate = useCallback(() => {
    const editingMeetingId = editingBookshelfMeetingId;
    const isEditMode = typeof editingMeetingId === 'number';
    const mode = isEditMode ? 'edit' : 'create';
    const clubId = group.clubId;
    const sourceBook = bookshelfCreateDraft.sourceBook;
    const sourceBookIsbn = normalizeIsbn13(sourceBook?.isbn);

    if (creatingBookshelf || updatingBookshelf || deletingBookshelf) {
      logMeetingAction('bookshelf_submit_ignored_busy', {
        mode,
        clubId,
        editingMeetingId,
      });
      return;
    }

    logMeetingAction('bookshelf_submit_press', {
      mode,
      clubId,
      editingMeetingId,
      hasSourceBook: Boolean(sourceBook),
      sourceBookIsbnLength: sourceBookIsbn.length,
      session: bookshelfCreateDraft.session,
      categoryCount: bookshelfCreateDraft.categories.length,
      hasMeetingDate: Boolean(bookshelfCreateDraft.meetingDate.trim()),
    });

    if (!isEditMode && !sourceBook) {
      logMeetingAction('bookshelf_submit_validation_failed', {
        mode,
        clubId,
        reason: 'missing_source_book',
      });
      showToast('책을 선택해야 합니다.');
      return;
    }
    if (!canManageClub || typeof clubId !== 'number') {
      logMeetingAction('bookshelf_submit_validation_failed', {
        mode,
        clubId,
        reason: 'unavailable_permission_or_club',
        canManageClub,
      });
      showToast(
        isEditMode
          ? '책장 수정 기능을 잠시 사용할 수 없습니다. 잠시 후 다시 시도해 주십시오.'
          : '책장 생성 기능을 잠시 사용할 수 없습니다. 잠시 후 다시 시도해 주십시오.',
      );
      return;
    }

    const generation = parseGenerationNumber(bookshelfCreateDraft.session);
    if (!generation) {
      logMeetingAction('bookshelf_submit_validation_failed', {
        mode,
        clubId,
        reason: 'invalid_generation',
        session: bookshelfCreateDraft.session,
      });
      showToast('기수를 숫자로 입력해야 합니다.');
      return;
    }

    const regularMeetingName = bookshelfCreateDraft.regularMeetingName.trim();
    const meetingLocation = bookshelfCreateDraft.meetingLocation.trim();
    const meetingDate = bookshelfCreateDraft.meetingDate.trim();
    if (regularMeetingName.length > BOOKSHELF_MEETING_TITLE_MAX_LENGTH) {
      logMeetingAction('bookshelf_submit_validation_failed', {
        mode,
        clubId,
        reason: 'meeting_title_too_long',
        length: regularMeetingName.length,
      });
      showToast(`정기모임 이름은 ${BOOKSHELF_MEETING_TITLE_MAX_LENGTH}자 이하여야 합니다.`);
      return;
    }
    if (meetingLocation.length > BOOKSHELF_MEETING_LOCATION_MAX_LENGTH) {
      logMeetingAction('bookshelf_submit_validation_failed', {
        mode,
        clubId,
        reason: 'meeting_location_too_long',
        length: meetingLocation.length,
      });
      showToast(`모임 장소는 ${BOOKSHELF_MEETING_LOCATION_MAX_LENGTH}자 이하여야 합니다.`);
      return;
    }
    if (isEditMode && !sourceBook) {
      logMeetingAction('bookshelf_submit_validation_failed', {
        mode,
        clubId,
        reason: 'missing_edit_source_book',
        editingMeetingId,
      });
      showToast('수정할 책장 정보를 다시 불러와주세요.');
      return;
    }
    if (!isEditMode && !ISBN13_REGEX.test(sourceBookIsbn)) {
      logMeetingAction('bookshelf_submit_validation_failed', {
        mode,
        clubId,
        reason: 'invalid_isbn13',
        rawIsbn: sourceBook?.isbn ?? null,
        normalizedIsbnLength: sourceBookIsbn.length,
      });
      showToast('책 정보 형식이 올바르지 않습니다.');
      return;
    }
    const primaryCategory = bookshelfCreateDraft.categories[0];

    const submit = async () => {
      if (isEditMode) setUpdatingBookshelf(true);
      else setCreatingBookshelf(true);

      try {
        const meetingTime = meetingDate ? toApiLocalDateTime(meetingDate) : undefined;
        if (meetingDate && !meetingTime) {
          logMeetingAction('bookshelf_submit_validation_failed', {
            mode,
            clubId,
            reason: 'invalid_meeting_date',
            meetingDate,
          });
          showToast('올바른 모임 날짜를 선택해야 합니다.');
          return;
        }

        logMeetingAction('bookshelf_submit_start', {
          mode,
          clubId,
          editingMeetingId,
          generation,
          hasMeetingTime: Boolean(meetingTime),
          hasCategory: Boolean(primaryCategory),
        });

        if (isEditMode && typeof editingMeetingId === 'number') {
          await updateClubBookshelf(clubId, editingMeetingId, {
            title: regularMeetingName || undefined,
            location: meetingLocation || undefined,
            meetingTime,
            generation,
            tag: primaryCategory,
          });
        } else {
          await createClubBookshelf(clubId, {
            isbn: sourceBookIsbn,
            title: regularMeetingName || undefined,
            location: meetingLocation || undefined,
            meetingTime,
            generation,
            tag: primaryCategory,
          });
        }

        const bookshelfList = await fetchAllClubBookshelvesWithCursor(clubId);
        const nextItemsWithMeetingDraft =
          isEditMode && typeof editingMeetingId === 'number'
            ? bookshelfList.items.map((item) =>
                item.remoteMeetingId === editingMeetingId
                  ? {
                      ...item,
                      regularMeetingName: regularMeetingName || undefined,
                      meetingLocation: meetingLocation || undefined,
                      meetingDate: meetingDate || undefined,
                    }
                  : item,
              )
            : bookshelfList.items;

        setBookshelfItems(nextItemsWithMeetingDraft);
        setActiveTab('bookshelf');

        if (isEditMode && typeof editingMeetingId === 'number') {
          const updatedItem =
            nextItemsWithMeetingDraft.find((item) => item.remoteMeetingId === editingMeetingId) ?? null;
          if (updatedItem) {
            setSelectedBookshelfBookId(updatedItem.id);
            await reloadBookshelfMeetingDetail(updatedItem, { suppressErrorToast: true });
            setBookshelfViewMode('DETAIL');
            setBookshelfDetailTab('REGULAR');
          } else {
            setBookshelfViewMode('GRID');
          }
          setActiveManagementScreen(null);
          setEditingBookshelfMeetingId(null);
          showToast('책장이 수정되었습니다.');
        } else {
          const createdSession = formatGenerationLabel(generation);
          setSelectedBookshelfSession(createdSession);
          setBookshelfViewMode('GRID');
          setActiveManagementScreen(null);
          setBookshelfCreateDraft(buildBookshelfCreateDraft(String(generation)));
          showToast('책장이 생성되었습니다.');
        }
        logMeetingAction('bookshelf_submit_success', {
          mode,
          clubId,
          editingMeetingId,
          generation,
        });
      } catch (error) {
        logMeetingAction('bookshelf_submit_failure', {
          mode,
          clubId,
          editingMeetingId,
          message: error instanceof Error ? error.message : String(error),
          status: error instanceof ApiError ? error.status : undefined,
        });
        showToast(
          resolveBookshelfActionErrorMessage(
            error,
            isEditMode ? '책장 수정에 실패했습니다.' : '책장 생성에 실패했습니다.',
          ),
        );
      } finally {
        if (isEditMode) setUpdatingBookshelf(false);
        else setCreatingBookshelf(false);
        logMeetingAction('bookshelf_submit_finished', {
          mode,
          clubId,
          editingMeetingId,
        });
      }
    };
    void submit();
  }, [
    bookshelfCreateDraft,
    canManageClub,
    creatingBookshelf,
    deletingBookshelf,
    editingBookshelfMeetingId,
    group.clubId,
    reloadBookshelfMeetingDetail,
    setActiveManagementScreen,
    setActiveTab,
    updatingBookshelf,
  ]);

  const handleDeleteEditingBookshelf = useCallback(() => {
    const clubId = group.clubId;
    const meetingId = editingBookshelfMeetingId;
    if (deletingBookshelf || !canManageClub || typeof clubId !== 'number' || typeof meetingId !== 'number') {
      showToast('책장 삭제 기능을 잠시 사용할 수 없습니다. 잠시 후 다시 시도해 주십시오.');
      return;
    }

    Alert.alert('책장 삭제', '이 책장을 삭제하시겠습니까?', [
      { text: '취소', style: 'cancel' },
      {
        text: '삭제',
        style: 'destructive',
        onPress: () => {
          const submit = async () => {
            setDeletingBookshelf(true);
            try {
              await deleteClubBookshelf(clubId, meetingId);
              const bookshelfList = await fetchAllClubBookshelvesWithCursor(clubId);
              setBookshelfItems(bookshelfList.items);
              setSelectedBookshelfBookId(bookshelfList.items[0]?.id ?? null);
              setBookshelfViewMode('GRID');
              setActiveManagementScreen(null);
              setEditingBookshelfMeetingId(null);
              showToast('책장이 삭제되었습니다.');
            } catch (error) {
              showToast(resolveBookshelfActionErrorMessage(error, '책장 삭제에 실패했습니다.'));
            } finally {
              setDeletingBookshelf(false);
            }
          };
          void submit();
        },
      },
    ]);
  }, [canManageClub, deletingBookshelf, editingBookshelfMeetingId, group.clubId, setActiveManagementScreen]);

  const handleDeleteSelectedBookshelf = useCallback(() => {
    const clubId = group.clubId;
    const meetingId = selectedBookshelfBook?.remoteMeetingId;
    if (deletingBookshelf || !canManageClub || typeof clubId !== 'number' || typeof meetingId !== 'number') {
      showToast('책장 삭제 기능을 잠시 사용할 수 없습니다. 잠시 후 다시 시도해 주십시오.');
      return;
    }

    Alert.alert('책장 삭제', '이 책장을 삭제하시겠습니까?', [
      { text: '취소', style: 'cancel' },
      {
        text: '삭제',
        style: 'destructive',
        onPress: () => {
          const submit = async () => {
            setDeletingBookshelf(true);
            try {
              await deleteClubBookshelf(clubId, meetingId);
              const bookshelfList = await fetchAllClubBookshelvesWithCursor(clubId);
              setBookshelfItems(bookshelfList.items);
              setSelectedBookshelfBookId(bookshelfList.items[0]?.id ?? null);
              setBookshelfViewMode('GRID');
              setSelectedRegularGroupId(null);
              setActiveManagementScreen(null);
              setEditingBookshelfMeetingId(null);
              showToast('책장이 삭제되었습니다.');
            } catch (error) {
              showToast(resolveBookshelfActionErrorMessage(error, '책장 삭제에 실패했습니다.'));
            } finally {
              setDeletingBookshelf(false);
            }
          };
          void submit();
        },
      },
    ]);
  }, [
    canManageClub,
    deletingBookshelf,
    group.clubId,
    selectedBookshelfBook?.remoteMeetingId,
    setActiveManagementScreen,
  ]);

  const resetBookshelfOnGroupChange = useCallback(() => {
    setSelectedBookshelfSession('');
    setBookshelfViewMode('GRID');
    setBookshelfDetailTab('TOPIC');
    setSelectedBookshelfBookId(null);
    setSelectedRegularGroupId(null);
  }, []);

  return {
    selectedBookshelfSession, setSelectedBookshelfSession,
    bookshelfViewMode, setBookshelfViewMode,
    bookshelfDetailTab, setBookshelfDetailTab,
    selectedBookshelfBookId, setSelectedBookshelfBookId,
    bookshelfItems, setBookshelfItems,
    selectedRegularGroupId, setSelectedRegularGroupId,
    regularGroupPostsById, setRegularGroupPostsById,
    regularGroupPendingPostKeys,
    regularGroupMembersVisible,
    creatingBookshelf,
    updatingBookshelf,
    deletingBookshelf,
    editingBookshelfMeetingId, setEditingBookshelfMeetingId,
    openingNextMeeting,
    loadingBookshelfDetail, setLoadingBookshelfDetail,
    photoViewer, setPhotoViewer,
    bookshelfComposerType,
    editingBookshelfPost,
    bookshelfComposerInput, setBookshelfComposerInput,
    bookshelfComposerRating, setBookshelfComposerRating,
    submittingBookshelfComposer,
    teamManageVisible,
    teamManageLoading,
    teamManageSaving,
    teamManageTeams,
    teamManageMembers,
    teamManageSelectedMemberId,
    teamManageActiveDropZoneId,
    draggingTeamMemberId,
    draggingTeamMemberPosition,
    bookshelfCreateDraft, setBookshelfCreateDraft,
    bookshelfTopicsByMeetingId, setBookshelfTopicsByMeetingId,
    bookshelfTopicPageStateByMeetingId, setBookshelfTopicPageStateByMeetingId,
    bookshelfReviewsByMeetingId, setBookshelfReviewsByMeetingId,
    regularMeetingInfoByMeetingId, setRegularMeetingInfoByMeetingId,
    bookshelfPostMenu, setBookshelfPostMenu,
    bookshelfBookSelectorVisible, setBookshelfBookSelectorVisible,
    bookshelfBookSearchQuery, setBookshelfBookSearchQuery,
    bookshelfBookSearchKeyword,
    bookshelfBookSearchResults,
    bookshelfBookSearchLoading,
    bookshelfBookSearchSearched,
    bookshelfBookSearchTotal,
    resetBookshelfBookSearch,
    bookshelfCalendarVisible,
    bookshelfCalendarMonth, setBookshelfCalendarMonth,
    bookshelfSessions,
    bookshelfCalendarDays,
    visibleBookshelfItems,
    selectedBookshelfBook,
    selectedRegularMeetingId,
    bookshelfTopicItems,
    bookshelfReviewItems,
    currentBookshelfTopicPageState,
    canSubmitBookshelfComposer,
    regularMeetingInfo,
    selectedRegularGroup,
    teamManageMemberById,
    teamManageAssignedMemberIds,
    teamManageUnassignedMembers,
    shouldScrollToBookshelfDetailRef,
    bookshelfMeetingDetailRequestIdRef,
    teamManageQuickDropRefs,
    teamManageScrollRef,
    teamManageScrollViewRef,
    reloadBookshelfMeetingDetail,
    loadMoreBookshelfTopics,
    closeBookshelfBookSelector,
    closeBookshelfCalendar,
    openBookshelfCalendar,
    handleSelectBookshelfMeetingDate,
    handlePickTodayBookshelfMeetingDate,
    openBookshelfDetail,
    openBookshelfTopicByMeetingId,
    refreshBookshelfPostsByType,
    closeBookshelfComposer,
    handleOpenBookshelfComposer,
    handleSubmitBookshelfComposer,
    handlePressBookshelfPostMenu,
    handleSelectBookshelfPostMenuAction,
    handleOpenNextMeeting,
    handleBackToBookshelfGrid,
    handleChangeBookshelfTab,
    handleSelectRegularGroup,
    handleEnterRegularGroup,
    handleToggleRegularGroupMembers,
    handleToggleRegularGroupPost,
    handleSortRegularGroupPosts,
    closeTeamManage,
    refreshTeamManageQuickDropLayouts,
    handleTeamManageContentDropLayout,
    handleTeamManageScrollViewportLayout,
    handleTeamManageScrollContentSizeChange,
    handleTeamManageScroll,
    handlePressManageRegularGroups,
    handleAddTeamManageTeam,
    handleRemoveTeamManageTeam,
    handlePressTeamManageTarget,
    handleTeamManageMemberGrant,
    handleTeamManageMemberMove,
    handleTeamManageMemberRelease,
    cancelTeamManageDrag,
    handleSaveTeamManage,
    handleOpenBookshelfEdit,
    runBookshelfBookSearch,
    handleSubmitBookshelfBookSearch,
    handleSelectBookshelfSourceBook,
    handleSubmitBookshelfCreate,
    handleDeleteEditingBookshelf,
    handleDeleteSelectedBookshelf,
    resetBookshelfOnGroupChange,
  };
}
