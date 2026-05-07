import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import type { Dispatch, SetStateAction } from 'react';
import {
  Alert,
  Animated,
  FlatList,
  Image,
  Linking,
  Modal,
  ScrollView,
  RefreshControl,
  StyleSheet,
  Text,
  TextInput,
  View,
  KeyboardAvoidingView,
  PanResponder,
  Platform,
  useWindowDimensions,
} from 'react-native';
import type {
  GestureResponderEvent,
  LayoutChangeEvent,
  NativeScrollEvent,
  NativeSyntheticEvent,
} from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import {
  useNavigation,
  useRoute,
  useScrollToTop,
  type EventArg,
  type NavigationAction,
  type NavigationProp,
  type ParamListBase,
  type RouteProp,
} from '@react-navigation/native';
import * as ImagePicker from 'expo-image-picker';
import { SvgUri } from 'react-native-svg';

import { buttonSize, colors, interactionOpacity, layers, motion, radius, spacing, typography } from '../theme';
import { useMeetingChatStomp } from '../hooks/useMeetingChatStomp';
import { navigateToHome } from '../navigation/navigateToHome';
import { BookFlipLoadingScreen } from '../components/common/BookFlipLoadingScreen';
import { DefaultProfileAvatar } from '../components/common/DefaultProfileAvatar';
import { FeedbackPressable as Pressable } from '../components/common/FeedbackPressable';
import { FloatingActionButton } from '../components/common/FloatingActionButton';
import { ScreenLayout } from '../components/common/ScreenLayout';
import { ActionMenu, type ActionMenuItem } from '../components/common/ActionMenu';
import { DialogOverlay } from '../components/common/DialogOverlay';
import { FormTextInput } from '../components/common/FormTextInput';
import { ReportMemberModal, type ReportMemberModalState } from '../components/common/ReportMemberModal';
import { MeetingListCard } from '../components/feature/groups/MeetingListCard';
import { MyGroupsDropdownCard } from '../components/feature/groups/MyGroupsDropdownCard';
import { useAuthGate } from '../contexts/AuthGateContext';
import { ApiError } from '../services/api/http';
import { issueImageUploadUrl } from '../services/api/authApi';
import {
  checkClubNameDuplicate,
  createClub,
  createClubBookshelf,
  createClubBookshelfReview,
  createClubBookshelfTopic,
  createClubNotice,
  createClubNoticeComment,
  deleteClub,
  deleteClubBookshelf,
  deleteClubBookshelfReview,
  deleteClubBookshelfTopic,
  deleteClubNoticeComment,
  deleteClubNotice,
  type ClubBookshelfDetail,
  type ClubBookshelfItem,
  type ClubBookshelfReview,
  type ClubBookshelfTopic,
  fetchClubBookshelfDetail,
  fetchClubBookshelfEditInfo,
  fetchClubBookshelfReviews,
  fetchClubBookshelfTopics,
  fetchClubBookshelves,
  fetchClubDetail,
  fetchRecommendedClubs,
  fetchClubHome,
  fetchClubLatestNotice,
  fetchClubMeeting,
  fetchClubMeetingMembers,
  fetchClubMeetingTeamChatMessages,
  fetchClubMyMembership,
  fetchClubNextMeetingRedirect,
  fetchClubMeetingTeamTopics,
  fetchClubMembers,
  fetchClubNoticeComments,
  fetchClubNoticeDetail,
  fetchClubNotices,
  fetchMyClubs,
  joinClub,
  manageClubMeetingTeams,
  searchClubs,
  submitClubNoticeVote,
  updateClub,
  updateClubBookshelf,
  updateClubBookshelfReview,
  updateClubBookshelfTopic,
  updateClubMemberStatus,
  updateClubNoticeComment,
  updateClubNotice,
  type ClubDetailResult,
  type ClubCategoryCode,
  type ClubContact,
  type ClubManagedMember,
  type ClubMeetingChatHistory,
  type ClubMeetingChatMessage,
  type ClubMeetingInfo,
  type ClubMeetingMemberList,
  type ClubMeetingTeamTopics,
  type ClubMembershipStatus,
  type ClubNoticeComment,
  type ClubNoticeDetail,
  type ClubNoticePreview,
  type ClubParticipantTypeCode,
  type ClubSearchInputFilter,
  type ClubSearchItem,
  type ClubSearchOutputFilter,
} from '../services/api/clubApi';
import { searchBooks, type BookItem } from '../services/api/bookApi';
import { fetchMyProfile, reportMember, type MemberReportType } from '../services/api/memberApi';
import {
  getCurrentKstApiDateTime,
  getCurrentKstDateLabel,
  getCurrentKstYearMonth,
  parseApiDateMillis,
} from '../utils/date';
import { triggerSelectionHaptic } from '../utils/haptics';
import { normalizeRemoteImageUrl } from '../utils/image';
import { showToast } from '../utils/toast';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { INPUT_LIMITS } from '../constants/inputLimits';
import {
  buildCalendarDays,
  formatCalendarMonthLabel,
  formatDotDate,
  formatDotDateValue,
  formatDotDateTime,
  formatGenerationLabel,
  formatRegularGroupLabel,
  getTeamManageTargetKey,
  inferMimeType,
  parseDotDate,
  parseGenerationNumber,
  sanitizeGenerationInput,
  toApiDateTime,
  toGroupTargets,
  toOpenableContactLink,
  toTeamLabel,
} from './meeting/formatters';
import {
  formatContactLabel,
  mapClubStatusToApplication,
  normalizeClubContacts,
  resolveMeetingSearchErrorMessage,
  resolveBookshelfActionErrorMessage,
  toLabelList,
} from './meeting/mappers';
import { styles } from './meeting/meetingStyles';
import { GroupNoticeView } from './meeting/GroupNoticeView';
import { GroupBookshelfView } from './meeting/GroupBookshelfView';
import { GroupManagementOverlay } from './meeting/GroupManagementOverlay';

type Group = {
  id: string;
  clubId?: number;
  name: string;
  profileImageUrl?: string;
  links?: ClubContact[];
  tags: string[];
  topic: string;
  region: string;
  applicationStatus?: string;
  description?: string;
  notice?: string;
  nextSession?: string;
  isPrivate?: boolean;
};

type MeetingRouteParams = {
  openClubId?: number | string;
};

type LinkItem = { text: string; url: string };

const inputFilters = ['모임별', '지역별'] as const;
type MeetingInputFilter = (typeof inputFilters)[number];
const outputFilterOptions: Array<{ label: string; value: ClubSearchOutputFilter }> = [
  { label: '전체', value: 'ALL' },
  { label: '대학생', value: 'STUDENT' },
  { label: '직장인', value: 'WORKER' },
  { label: '온라인', value: 'ONLINE' },
  { label: '동아리', value: 'CLUB' },
  { label: '모임', value: 'MEETING' },
  { label: '대면', value: 'OFFLINE' },
];
const MEETING_SEARCH_KEYWORD_MAX_LENGTH = INPUT_LIMITS.CLUB_NAME;
const BOOKSHELF_MEETING_TITLE_MAX_LENGTH = 12;
const BOOKSHELF_MEETING_LOCATION_MAX_LENGTH = 12;
const BOOKSHELF_CURSOR_LOOP_LIMIT = 100;
const ISBN13_REGEX = /^\d{13}$/;
const MAX_REGULAR_GROUP_COUNT = 10;
const MEETING_TAB_DOUBLE_TAP_WINDOW_MS = 450;

const categoryLabelByCode: Record<string, string> = {
  FICTION_POETRY_DRAMA: '소설/시/희곡',
  ESSAY: '에세이',
  HUMANITIES: '인문학',
  SOCIAL_SCIENCE: '사회과학',
  POLITICS_DIPLOMACY_DEFENSE: '정치/외교/국방',
  ECONOMY_MANAGEMENT: '경제/경영',
  SELF_DEVELOPMENT: '자기계발',
  HISTORY_CULTURE: '역사/문화',
  SCIENCE: '과학',
  COMPUTER_IT: '컴퓨터/IT',
  ART_POP_CULTURE: '예술/대중문화',
  TRAVEL: '여행',
  FOREIGN_LANGUAGE: '외국어',
  CHILDREN_BOOKS: '어린이/청소년',
  RELIGION_PHILOSOPHY: '종교/철학',
};

const clubHomeTagToneByLabel: Record<string, 'amber' | 'coral' | 'sky' | 'violet'> = {
  여행: 'amber',
  외국어: 'amber',
  '어린이/청소년': 'amber',
  '종교/철학': 'amber',
  '소설/시/희곡': 'coral',
  에세이: 'coral',
  인문학: 'coral',
  과학: 'sky',
  '컴퓨터/IT': 'sky',
  '경제/경영': 'sky',
  자기계발: 'sky',
  사회과학: 'violet',
  '정치/외교/국방': 'violet',
  '역사/문화': 'violet',
  '예술/대중문화': 'violet',
};

const participantLabelByCode: Record<string, string> = {
  STUDENT: '대학생',
  WORKER: '직장인',
  ONLINE: '온라인',
  CLUB: '동아리',
  MEETING: '모임',
  OFFLINE: '오프라인',
};

const MIN_BOOK_FLIP_LOADING_MS = 1000;
const chatIconUri = Image.resolveAssetSource(
  require('../../assets/icons/Chat.svg'),
).uri;
const CLUB_DEFAULT_IMAGE = Image.resolveAssetSource(require('../../assets/images/club-default.png')).uri;
const BOOK_DEFAULT_IMAGE = Image.resolveAssetSource(require('../../assets/images/book-default.png')).uri;
function ClubDefaultProfileArtwork({
  variant = 'detail',
}: {
  variant?: 'detail' | 'preview' | 'large';
}) {
  return (
    <Image
      source={{ uri: CLUB_DEFAULT_IMAGE }}
      style={[
        variant === 'preview'
          ? styles.clubDefaultProfileArtworkPreview
          : variant === 'large'
          ? styles.clubDefaultProfileArtworkLarge
          : styles.clubDefaultProfileArtworkDetail,
      ]}
      resizeMode="cover"
    />
  );
}

async function waitForMinimumLoading(startedAt: number, minimumMs = MIN_BOOK_FLIP_LOADING_MS) {
  const elapsed = Date.now() - startedAt;
  const remaining = minimumMs - elapsed;
  if (remaining <= 0) return;
  await new Promise<void>((resolve) => {
    setTimeout(resolve, remaining);
  });
}


async function pickAndUploadImage(type: 'CLUB' | 'NOTICE'): Promise<string | null> {
  const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
  if (!permission.granted) {
    showToast('사진 접근 권한이 필요합니다.');
    return null;
  }

  const result = await ImagePicker.launchImageLibraryAsync({
    mediaTypes: ['images'],
    allowsEditing: true,
    quality: 0.9,
  });

  if (result.canceled || !result.assets?.length) return null;
  const asset = result.assets[0];
  const fileName = asset.fileName ?? `${type.toLowerCase()}_${Date.now()}.jpg`;
  const contentType = inferMimeType(fileName, asset.mimeType);
  const uploadMeta = await issueImageUploadUrl(type, fileName, contentType);
  if (!uploadMeta?.presignedUrl || !uploadMeta.imageUrl) {
    showToast('이미지 업로드 준비에 실패했습니다.');
    return null;
  }

  const fileResponse = await fetch(asset.uri);
  const blob = await fileResponse.blob();
  const uploadResponse = await fetch(uploadMeta.presignedUrl, {
    method: 'PUT',
    headers: {
      'Content-Type': contentType,
    },
    body: blob,
  });

  if (!uploadResponse.ok) {
    showToast('이미지 업로드에 실패했습니다.');
    return null;
  }

  return uploadMeta.imageUrl;
}


function mapMyClubToGroup(club: { clubId: number; clubName: string }): Group {
  return {
    id: `club-${club.clubId}`,
    clubId: club.clubId,
    name: club.clubName,
    tags: [],
    topic: '모임 대상 · 정보 없음',
    region: '활동 지역 · 정보 없음',
    applicationStatus: '가입 완료되었습니다',
  };
}


function mapSearchClubToGroup(item: ClubSearchItem): Group {
  const rawItem = item as unknown as Record<string, unknown>;
  const clubCandidate =
    rawItem.club && typeof rawItem.club === 'object' ? rawItem.club : rawItem;
  const club = (clubCandidate as ClubDetailResult) ?? {};
  const clubId = typeof club.clubId === 'number' ? club.clubId : undefined;
  const tags = toLabelList(club.category, categoryLabelByCode).slice(0, 6);
  const participants = toLabelList(club.participantTypes, participantLabelByCode);
  const regionText = typeof club.region === 'string' && club.region.trim().length > 0
    ? club.region.trim()
    : '정보 없음';

  return {
    id: clubId ? `club-${clubId}` : `club-${club.name ?? Math.random().toString()}`,
    clubId,
    name: typeof club.name === 'string' && club.name.length > 0 ? club.name : '이름 없는 모임',
    profileImageUrl: normalizeRemoteImageUrl(club.profileImageUrl ?? undefined),
    links: normalizeClubContacts(club.links),
    tags,
    topic: participants.length > 0 ? `모임 대상 · ${participants.join(', ')}` : '모임 대상 · 정보 없음',
    region: `활동 지역 · ${regionText}`,
    applicationStatus: mapClubStatusToApplication(item.myStatus),
    description: typeof club.description === 'string' ? club.description : undefined,
    isPrivate: typeof club.open === 'boolean' ? !club.open : undefined,
  };
}

function mapClubHomeDetailToGroup(detail: ClubDetailResult, prev: Group): Group {
  const tags = toLabelList(detail.category, categoryLabelByCode).slice(0, 6);
  const participants = toLabelList(detail.participantTypes, participantLabelByCode);
  const links = normalizeClubContacts(detail.links);
  const region = typeof detail.region === 'string' && detail.region.trim().length > 0
    ? detail.region.trim()
    : '정보 없음';

  return {
    ...prev,
    clubId: typeof detail.clubId === 'number' ? detail.clubId : prev.clubId,
    name: typeof detail.name === 'string' && detail.name.length > 0 ? detail.name : prev.name,
    profileImageUrl:
      normalizeRemoteImageUrl(detail.profileImageUrl ?? undefined) ?? prev.profileImageUrl,
    links: Array.isArray(detail.links) ? links : prev.links,
    tags: tags.length > 0 ? tags : prev.tags,
    topic: participants.length > 0 ? `모임 대상 · ${participants.join(', ')}` : prev.topic,
    region: `활동 지역 · ${region}`,
    description: typeof detail.description === 'string' ? detail.description : prev.description,
    isPrivate: typeof detail.open === 'boolean' ? !detail.open : prev.isPrivate,
  };
}

function createPendingClubGroup(clubId: number): Group {
  return {
    id: `club-${clubId}`,
    clubId,
    name: '모임',
    tags: [],
    topic: '모임 대상 · 정보 없음',
    region: '활동 지역 · 정보 없음',
  };
}


async function fetchAllClubBookshelvesWithCursor(clubId: number): Promise<{
  items: ClubBookshelfItem[];
  isStaff: boolean;
}> {
  const mergedItems: ClubBookshelfItem[] = [];
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
      mergedItems.push(item);
    });

    if (!response.hasNext || typeof response.nextCursor !== 'number') break;
    if (visitedCursors.has(response.nextCursor)) break;

    visitedCursors.add(response.nextCursor);
    cursorId = response.nextCursor;
  }

  return { items: mergedItems, isStaff };
}

export function MeetingScreen() {
  const meetingScrollRef = useRef<ScrollView>(null);
  useScrollToTop(meetingScrollRef);
  const navigation = useNavigation<NavigationProp<ParamListBase>>();
  const route = useRoute<RouteProp<{ Meeting: MeetingRouteParams }, 'Meeting'>>();
  const { requireAuth, isLoggedIn } = useAuthGate();
  const [showCreate, setShowCreate] = useState(false);
  const [createDraftDirty, setCreateDraftDirty] = useState(false);
  const [activeGroup, setActiveGroup] = useState<Group | null>(null);
  const meetingTabRetapAtRef = useRef(0);
  const meetingTabRetapSourceRef = useRef<'outside' | 'focused' | null>(null);
  const meetingTabRetapClosingRef = useRef(false);
  const lastVisitedClubIdRef = useRef<number | null>(null);
  const [applyOpenId, setApplyOpenId] = useState<string | null>(null);
  const [applyReasonById, setApplyReasonById] = useState<Record<string, string>>({});
  const [appliedById, setAppliedById] = useState<Record<string, string>>({});
  const [myGroups, setMyGroups] = useState<Group[]>([]);
  const [discoverGroups, setDiscoverGroups] = useState<Group[]>([]);
  const [myGroupsLoading, setMyGroupsLoading] = useState(false);
  const [discoverLoading, setDiscoverLoading] = useState(false);
  const [pendingOpenClubId, setPendingOpenClubId] = useState<number | null>(null);
  const [openingClubLoading, setOpeningClubLoading] = useState(false);

  const [search, setSearch] = useState('');
  const [activeInputFilter, setActiveInputFilter] = useState<MeetingInputFilter | null>(null);
  const [selectedOutputFilter, setSelectedOutputFilter] =
    useState<ClubSearchOutputFilter>('ALL');
  const [outputFilterOpen, setOutputFilterOpen] = useState(false);
  const [refreshing, setRefreshing] = useState(false);

  const showLeaveDraftAlert = useCallback((onClose: () => void) => {
    if (!(showCreate && createDraftDirty)) {
      onClose();
      return;
    }

    Alert.alert('알림', '현재 페이지는 저장되지 않습니다.', [
      { text: '취소', style: 'cancel' },
      { text: '닫기', style: 'destructive', onPress: onClose },
    ]);
  }, [createDraftDirty, showCreate]);

  const closeCreateFlow = useCallback(() => {
    setShowCreate(false);
    setCreateDraftDirty(false);
  }, []);

  const closeActiveGroupWithLoading = useCallback(async () => {
    if (!activeGroup) {
      setOpeningClubLoading(false);
      return;
    }

    const loadingStartedAt = Date.now();
    setOpeningClubLoading(true);
    await waitForMinimumLoading(loadingStartedAt);
    setActiveGroup(null);
    setOpeningClubLoading(false);
  }, [activeGroup]);

  const scrollMeetingSearchToTop = useCallback((animated = false) => {
    requestAnimationFrame(() => {
      meetingScrollRef.current?.scrollTo({ y: 0, animated });
    });
  }, []);

  const handlePressHeaderLogo = useCallback(() => {
    showLeaveDraftAlert(() => {
      closeCreateFlow();

      if (activeGroup) {
        const closeAndMoveHome = async () => {
          await closeActiveGroupWithLoading();
          navigateToHome(navigation);
        };
        void closeAndMoveHome();
        return;
      }

      setOpeningClubLoading(false);
      navigateToHome(navigation);
    });
  }, [activeGroup, closeActiveGroupWithLoading, closeCreateFlow, navigation, showLeaveDraftAlert]);

  const selectedOutputFilterLabel =
    outputFilterOptions.find((option) => option.value === selectedOutputFilter)?.label ?? '전체';

  const loadMyGroups = useCallback(async () => {
    if (!isLoggedIn) {
      setMyGroups([]);
      return;
    }

    setMyGroupsLoading(true);
    try {
      const result = await fetchMyClubs(undefined, { suppressErrorToast: true });
      const mapped = result.items.map(mapMyClubToGroup);
      setMyGroups(mapped);
    } catch (error) {
      if (error instanceof ApiError && error.status === 401) {
        setMyGroups([]);
        return;
      }
      if (!(error instanceof ApiError)) {
        showToast('내 모임 목록을 불러오지 못했습니다.');
      }
      setMyGroups([]);
    } finally {
      setMyGroupsLoading(false);
    }
  }, [isLoggedIn]);

  const loadDiscoverGroups = useCallback(async () => {
    const keyword = search.trim();
    if (keyword.length > MEETING_SEARCH_KEYWORD_MAX_LENGTH) {
      setDiscoverGroups([]);
      showToast(`검색어는 ${MEETING_SEARCH_KEYWORD_MAX_LENGTH}자 이하여야 합니다.`);
      return;
    }

    const shouldLoadRecommendations =
      isLoggedIn &&
      keyword.length === 0 &&
      activeInputFilter === null &&
      selectedOutputFilter === 'ALL';

    const inputFilter: ClubSearchInputFilter | undefined =
      activeInputFilter === '모임별'
        ? 'NAME'
        : activeInputFilter === '지역별'
          ? 'REGION'
          : undefined;

    setDiscoverLoading(true);
    try {
      if (shouldLoadRecommendations) {
        const result = await fetchRecommendedClubs({ suppressErrorToast: true });
        setDiscoverGroups(result.items.map(mapSearchClubToGroup));
      } else {
        const mergedItems: ClubSearchItem[] = [];
        const seenClubIds = new Set<number>();
        const visitedCursors = new Set<number>();
        let cursorId: number | undefined;

        for (let page = 0; page < 100; page += 1) {
          const response = await searchClubs({
            keyword: keyword.length > 0 ? keyword : undefined,
            inputFilter,
            outputFilter: selectedOutputFilter,
            cursorId,
          });

          response.items.forEach((item) => {
            const clubId = item.club?.clubId;
            if (typeof clubId === 'number') {
              if (seenClubIds.has(clubId)) return;
              seenClubIds.add(clubId);
            }
            mergedItems.push(item);
          });

          if (!response.hasNext || typeof response.nextCursor !== 'number') break;
          if (visitedCursors.has(response.nextCursor)) break;

          visitedCursors.add(response.nextCursor);
          cursorId = response.nextCursor;
        }

        setDiscoverGroups(mergedItems.map(mapSearchClubToGroup));
      }
    } catch (error) {
      setDiscoverGroups([]);
      showToast(
        resolveMeetingSearchErrorMessage(error, { recommendation: shouldLoadRecommendations }),
      );
    } finally {
      setDiscoverLoading(false);
    }
  }, [activeInputFilter, isLoggedIn, search, selectedOutputFilter]);

  useEffect(() => {
    void loadMyGroups();
  }, [loadMyGroups]);

  useEffect(() => {
    const timer = setTimeout(() => {
      void loadDiscoverGroups();
    }, 300);

    return () => clearTimeout(timer);
  }, [loadDiscoverGroups]);

  useEffect(() => {
    const value = route.params?.openClubId;
    const clubId =
      typeof value === 'number'
        ? value
        : typeof value === 'string'
          ? Number(value)
          : NaN;
    if (!Number.isInteger(clubId) || clubId <= 0) return;
    setPendingOpenClubId(clubId);
    navigation.setParams({ openClubId: undefined });
  }, [navigation, route.params?.openClubId]);

  useEffect(() => {
    if (activeGroup) return;
    meetingTabRetapAtRef.current = 0;
    meetingTabRetapSourceRef.current = null;
    meetingTabRetapClosingRef.current = false;
  }, [activeGroup]);

  useEffect(() => {
    const tabNavigation =
      (navigation.getState().routeNames.includes('Meeting')
        ? (navigation as NavigationProp<ParamListBase>)
        : navigation.getParent()) as
        | (NavigationProp<ParamListBase> & {
            addListener: (
              eventName: 'tabPress',
              listener: (event: EventArg<'tabPress', true, undefined>) => void,
            ) => () => void;
          })
        | undefined;
    if (!tabNavigation) return undefined;

    const unsubscribe = tabNavigation.addListener(
      'tabPress',
      (event: EventArg<'tabPress', true, undefined>) => {
        const targetKey = event.target;
        const tabState = tabNavigation.getState();
        const targetRoute = tabState.routes.find(
          (routeItem: { key: string; name: string }) => routeItem.key === targetKey,
        );
        const focusedRoute = tabState.routes[tabState.index];
        const isMeetingTabTarget = targetRoute?.name === 'Meeting';
        const isMeetingTabFocused = focusedRoute?.key === targetKey;

        const resetRetap = () => {
          meetingTabRetapAtRef.current = 0;
          meetingTabRetapSourceRef.current = null;
        };

        const closeToSearchTop = async () => {
          if (meetingTabRetapClosingRef.current) return;
          meetingTabRetapClosingRef.current = true;
          try {
            if (activeGroup) {
              await closeActiveGroupWithLoading();
            } else {
              scrollMeetingSearchToTop(false);
            }
          } finally {
            resetRetap();
            meetingTabRetapClosingRef.current = false;
          }
        };

        if (!isMeetingTabTarget) {
          resetRetap();
          return;
        }

        const now = Date.now();
        const withinWindow = now - meetingTabRetapAtRef.current <= MEETING_TAB_DOUBLE_TAP_WINDOW_MS;
        const wasOutsideTap = meetingTabRetapSourceRef.current === 'outside' && withinWindow;
        const wasFocusedTap = meetingTabRetapSourceRef.current === 'focused' && withinWindow;

        if (!isMeetingTabFocused) {
          meetingTabRetapAtRef.current = now;
          meetingTabRetapSourceRef.current = 'outside';
          return;
        }

        if (showCreate) {
          meetingTabRetapAtRef.current = now;
          meetingTabRetapSourceRef.current = 'focused';
          return;
        }

        if (wasOutsideTap) {
          void closeToSearchTop();
          return;
        }

        if (!wasFocusedTap) {
          meetingTabRetapAtRef.current = now;
          meetingTabRetapSourceRef.current = 'focused';
          return;
        }

        if (activeGroup) {
          void closeToSearchTop();
          return;
        }

        if (meetingTabRetapClosingRef.current) return;
        meetingTabRetapClosingRef.current = true;
        const openLastVisitedGroup = async () => {
          const lastVisitedClubId = lastVisitedClubIdRef.current;
          const lastVisitedClubIdNumber =
            typeof lastVisitedClubId === 'number' && Number.isInteger(lastVisitedClubId)
              ? lastVisitedClubId
              : null;
          try {
            if (!lastVisitedClubIdNumber || lastVisitedClubIdNumber <= 0) {
              scrollMeetingSearchToTop(false);
              return;
            }

            try {
              await fetchClubHome(lastVisitedClubIdNumber);
            } catch (error) {
              if (error instanceof ApiError && error.status === 401) {
                requireAuth();
                return;
              }
              if (error instanceof ApiError && (error.status === 403 || error.status === 404)) {
                lastVisitedClubIdRef.current = null;
                showToast(
                  error.status === 404
                    ? '이전에 방문한 모임을 찾을 수 없습니다.'
                    : '이전에 방문한 모임에 접근할 수 없습니다.',
                );
                scrollMeetingSearchToTop(false);
                return;
              }
              showToast('이전에 방문한 모임을 불러오지 못했습니다.');
              scrollMeetingSearchToTop(false);
              return;
            }

            setPendingOpenClubId(lastVisitedClubIdNumber);
          } finally {
            resetRetap();
            meetingTabRetapClosingRef.current = false;
          }
        };
        void openLastVisitedGroup();
      },
    );

    return unsubscribe;
  }, [
    activeGroup,
    closeActiveGroupWithLoading,
    navigation,
    requireAuth,
    scrollMeetingSearchToTop,
    showCreate,
  ]);

  useEffect(() => {
    const parent = navigation.getParent() as
      | (NavigationProp<ParamListBase> & {
          addListener: (
            eventName: 'tabPress',
            listener: (event: EventArg<'tabPress', true, undefined>) => void,
          ) => () => void;
        })
      | undefined;
    if (!parent) return undefined;

    const unsubscribe = parent.addListener(
      'tabPress',
      (event: EventArg<'tabPress', true, undefined>) => {
        if (!(showCreate && createDraftDirty)) return;

        const targetKey = event.target;
        const parentState = parent.getState();
        const targetRoute = parentState.routes.find(
          (routeItem: { key: string; name: string }) => routeItem.key === targetKey,
        );
        if (!targetRoute || targetRoute.name === 'Meeting') return;

        event.preventDefault();
        Alert.alert('알림', '현재 페이지는 저장되지 않습니다.', [
          { text: '취소', style: 'cancel' },
          {
            text: '닫기',
            style: 'destructive',
            onPress: () => {
              closeCreateFlow();
              parent.navigate(targetRoute.name);
            },
          },
        ]);
      },
    );

    return unsubscribe;
  }, [closeCreateFlow, createDraftDirty, navigation, showCreate]);

  useEffect(() => {
    const unsubscribe = navigation.addListener(
      'beforeRemove',
      (event: EventArg<'beforeRemove', true, { action: NavigationAction }>) => {
        if (!(showCreate && createDraftDirty)) return;

        event.preventDefault();
        Alert.alert('알림', '현재 페이지는 저장되지 않습니다.', [
          { text: '취소', style: 'cancel' },
          {
            text: '닫기',
            style: 'destructive',
            onPress: () => {
              closeCreateFlow();
              navigation.dispatch(event.data.action);
            },
          },
        ]);
      },
    );

    return unsubscribe;
  }, [closeCreateFlow, createDraftDirty, navigation, showCreate]);

  const visibleDiscoverGroups = useMemo(
    () =>
      discoverGroups.map((group) => ({
        ...group,
        applicationStatus: appliedById[group.id] ?? group.applicationStatus,
      })),
    [appliedById, discoverGroups],
  );

  const openGroupHome = useCallback(async (group: Group) => {
    if (typeof group.clubId === 'number' && group.clubId > 0) {
      lastVisitedClubIdRef.current = group.clubId;
    }
    const loadingStartedAt = Date.now();
    setOpeningClubLoading(true);
    setActiveGroup(group);
    await waitForMinimumLoading(loadingStartedAt);
    setOpeningClubLoading(false);
  }, []);

  useEffect(() => {
    if (pendingOpenClubId === null) return;
    const targetGroup =
      myGroups.find((group) => group.clubId === pendingOpenClubId) ??
      discoverGroups.find((group) => group.clubId === pendingOpenClubId);
    void openGroupHome(targetGroup ?? createPendingClubGroup(pendingOpenClubId));
    setPendingOpenClubId(null);
  }, [discoverGroups, myGroups, openGroupHome, pendingOpenClubId]);

  const handleOpenApply = (groupId: string) => {
    requireAuth(() => {
      setApplyOpenId((prev) => (prev === groupId ? null : groupId));
    });
  };

  const handleChangeApplyReason = (groupId: string, value: string) => {
    setApplyReasonById((prev) => ({ ...prev, [groupId]: value }));
  };

  const handleSubmitApply = (group: Group) => {
    requireAuth(() => {
      const reason = (applyReasonById[group.id] ?? '').trim();
      if (!reason) {
        showToast('신청 사유를 입력해야 합니다.');
        return;
      }
      if (typeof group.clubId !== 'number') {
        showToast('모임 정보를 찾을 수 없습니다.');
        return;
      }
      const clubId = group.clubId;

      const submit = async () => {
        try {
          await joinClub(clubId, reason);
          setAppliedById((prev) => ({ ...prev, [group.id]: '신청 완료되었습니다' }));
          setApplyOpenId(null);
          setApplyReasonById((prev) => ({ ...prev, [group.id]: '' }));
          showToast('가입 신청이 완료되었습니다.');
        } catch (error) {
          if (!(error instanceof ApiError)) {
            showToast('가입 신청에 실패했습니다.');
          }
        }
      };

      void submit();
    });
  };

  const handleRefresh = () => {
    setRefreshing(true);
    const refresh = async () => {
      setSearch('');
      setActiveInputFilter(null);
      setSelectedOutputFilter('ALL');
      setOutputFilterOpen(false);
      setApplyOpenId(null);
      await loadMyGroups();
      setRefreshing(false);
    };

    void refresh();
  };

  if (showCreate) {
    return (
      <ScreenLayout title="모임" onPressLogo={handlePressHeaderLogo}>
        <MeetingCreateFlow
          onClose={closeCreateFlow}
          onDirtyChange={setCreateDraftDirty}
        />
      </ScreenLayout>
    );
  }

  if (activeGroup) {
    return (
      <ScreenLayout title="모임" onPressLogo={handlePressHeaderLogo}>
        <View style={styles.screenWrap}>
          <GroupHomeView
            group={activeGroup}
            onBack={() => {
              void closeActiveGroupWithLoading();
            }}
          />
          {openingClubLoading ? (
            <View style={styles.loadingOverlay}>
              <BookFlipLoadingScreen />
            </View>
          ) : null}
        </View>
      </ScreenLayout>
    );
  }

  return (
    <ScreenLayout title="모임" onPressLogo={handlePressHeaderLogo}>
      <ScrollView
        ref={meetingScrollRef}
        style={styles.container}
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={handleRefresh}
          />
        }
      >
      <Text style={styles.sectionTitle}>독서모임</Text>
      <Pressable
        style={({ pressed }) => [styles.createButton, pressed && styles.pressed]}
        onPress={() =>
          requireAuth(() => {
            setCreateDraftDirty(false);
            setShowCreate(true);
          })
        }
      >
        <Text style={styles.createButtonText}>+ 모임 생성하기</Text>
      </Pressable>

      {isLoggedIn && myGroups.length > 0 ? (
        <>
          <Text style={styles.sectionTitle}>내 독서 모임 바로가기</Text>
          <MyGroupsDropdownCard
            groups={myGroups}
            onPressGroup={openGroupHome}
          />
        </>
      ) : null}
      {myGroupsLoading ? <Text style={styles.helperText}>내 모임 목록을 불러오는 중...</Text> : null}
      {!myGroupsLoading && isLoggedIn && myGroups.length === 0 ? (
        <Text style={styles.helperText}>가입한 모임이 없습니다.</Text>
      ) : null}
      {!isLoggedIn ? (
        <Text style={styles.helperText}>로그인 후 내 모임을 확인할 수 있습니다.</Text>
      ) : null}

      <Text style={styles.sectionTitle}>모임 검색하기</Text>
      <View style={styles.searchRow}>
        <FormTextInput
          value={search}
          onChangeText={setSearch}
          placeholder="모임명, 지역별로 원하는 모임을 검색해보세요!"
          placeholderTextColor={colors.gray3}
          style={styles.searchInput}
          fieldType="search"
          maxLength={MEETING_SEARCH_KEYWORD_MAX_LENGTH}
        />
        <MaterialIcons name="search" size={22} color={colors.gray5} />
      </View>

      <View style={styles.filterRow}>
        <View style={styles.outputFilterWrap}>
          <Pressable
            style={({ pressed }) => [
              styles.outputFilterButton,
              pressed && styles.pressed,
            ]}
            onPress={() => setOutputFilterOpen((prev) => !prev)}
          >
            <Text style={styles.outputFilterText}>{selectedOutputFilterLabel}</Text>
            <MaterialIcons
              name={outputFilterOpen ? 'expand-less' : 'expand-more'}
              size={18}
              color={colors.gray6}
            />
          </Pressable>
          {outputFilterOpen ? (
            <View style={styles.outputFilterMenu}>
              {outputFilterOptions.map((option) => {
                const selected = option.value === selectedOutputFilter;
                return (
                  <Pressable
                    key={option.value}
                    style={({ pressed }) => [
                      styles.outputFilterItem,
                      selected ? styles.outputFilterItemSelected : null,
                      pressed && styles.pressed,
                    ]}
                    onPress={() => {
                      setSelectedOutputFilter(option.value);
                      setOutputFilterOpen(false);
                    }}
                  >
                    <Text
                      style={[
                        styles.outputFilterItemText,
                        selected ? styles.outputFilterItemTextSelected : null,
                      ]}
                    >
                      {option.label}
                    </Text>
                  </Pressable>
                );
              })}
            </View>
          ) : null}
        </View>

        {inputFilters.map((filter) => {
          const active = filter === activeInputFilter;
          return (
            <Pressable
              key={filter}
              style={styles.filterChip}
              onPress={() =>
                setActiveInputFilter((prev) => (prev === filter ? null : filter))
              }
              android_ripple={{ color: colors.gray1 }}
            >
              <MaterialIcons
                name={active ? 'radio-button-checked' : 'radio-button-unchecked'}
                size={18}
                color={active ? colors.primary1 : colors.gray4}
              />
              <Text
                style={[
                  styles.filterText,
                  active ? styles.filterTextActive : styles.filterTextInactive,
                ]}
              >
                {filter}
              </Text>
            </Pressable>
          );
        })}
      </View>

      {search.trim().length === 0 &&
      activeInputFilter === null &&
      selectedOutputFilter === 'ALL' ? (
        <Text style={styles.sectionTitle}>독서 모임 추천</Text>
      ) : null}

      <View style={styles.groupList}>
        {visibleDiscoverGroups.map((group) => (
          <MeetingListCard
            key={group.id}
            name={group.name}
            tags={group.tags}
            topic={group.topic}
            region={group.region}
            profileImageUrl={group.profileImageUrl}
            isPrivate={group.isPrivate}
            applicationStatus={group.applicationStatus}
            applyOpen={applyOpenId === group.id}
            applyReason={applyReasonById[group.id] ?? ''}
            onPressApply={() => handleOpenApply(group.id)}
            onChangeApplyReason={(value) => handleChangeApplyReason(group.id, value)}
            onSubmitApply={() => handleSubmitApply(group)}
            onPressVisit={() => openGroupHome(group)}
          />
        ))}
        {discoverLoading ? <Text style={styles.helperText}>모임 목록을 불러오는 중...</Text> : null}
        {!discoverLoading && visibleDiscoverGroups.length === 0 ? (
          <View style={styles.emptySearchBox}>
            <Text style={styles.emptySearchText}>검색 결과가 없습니다.</Text>
          </View>
        ) : null}
      </View>
      </ScrollView>
    </ScreenLayout>
  );
}


type CreateStep = 1 | 2 | 3 | 4;

const categoryCodeByLabel: Record<string, ClubCategoryCode> = {
  '소설/시/희곡': 'FICTION_POETRY_DRAMA',
  '에세이': 'ESSAY',
  '인문학': 'HUMANITIES',
  '사회과학': 'SOCIAL_SCIENCE',
  '정치/외교/국방': 'POLITICS_DIPLOMACY_DEFENSE',
  '경제/경영': 'ECONOMY_MANAGEMENT',
  '자기계발': 'SELF_DEVELOPMENT',
  '역사/문화': 'HISTORY_CULTURE',
  '과학': 'SCIENCE',
  '컴퓨터/IT': 'COMPUTER_IT',
  '예술/대중문화': 'ART_POP_CULTURE',
  '여행': 'TRAVEL',
  '외국어': 'FOREIGN_LANGUAGE',
  '어린이/청소년': 'CHILDREN_BOOKS',
  '종교/철학': 'RELIGION_PHILOSOPHY',
};

const participantCodeByLabel: Record<string, ClubParticipantTypeCode> = {
  '대학생': 'STUDENT',
  '직장인': 'WORKER',
  '온라인': 'ONLINE',
  '동아리': 'CLUB',
  '모임': 'MEETING',
  '오프라인': 'OFFLINE',
};


type NoticeTag = 'PIN' | 'VOTE' | 'MEETING';

type NoticeBookshelfAttachment = {
  id: string;
  remoteMeetingId?: number;
  session: string;
  title: string;
  author: string;
  category: string;
  coverImage: string;
  rating: number;
};

type NoticeItem = {
  id: string;
  remoteId?: number;
  title: string;
  date: string;
  tags: NoticeTag[];
  category: '일반' | '모임' | '투표';
  content: string;
  authorNickname?: string;
  authorProfileImageUrl?: string;
  bookshelf?: NoticeBookshelfAttachment;
  poll?: NoticePoll;
  photos?: string[];
  isPinned?: boolean;
};

type NoticeComment = {
  id: string;
  remoteId?: number;
  author: string;
  authorProfileImageUrl?: string;
  date: string;
  content: string;
  mine?: boolean;
  isAuthor?: boolean;
};

type CursorPageState = {
  hasNext: boolean;
  nextCursor: number | null;
  loadingMore: boolean;
};

type BookshelfItem = {
  id: string;
  remoteMeetingId?: number;
  regularMeetingId?: number;
  bookId?: string;
  generation?: number;
  session: string;
  title: string;
  author: string;
  category: string;
  coverImage: string;
  rating: number;
  regularMeetingName?: string;
  meetingLocation?: string;
  meetingDate?: string;
};

type BookshelfDetailTab = 'TOPIC' | 'REVIEW' | 'REGULAR';
type BookshelfViewMode = 'GRID' | 'DETAIL' | 'REGULAR_GROUP';

type BookshelfPostItem = {
  id: string;
  remoteId: number;
  type: 'TOPIC' | 'REVIEW';
  author: string;
  content: string;
  rating?: number;
  createdAt?: string;
  authorProfileImageUrl?: string;
  isAuthor?: boolean;
};

type NoticeCommentMenuState = {
  comment: NoticeComment;
  pageX: number;
  pageY: number;
};

type BookshelfPostMenuState = {
  post: BookshelfPostItem;
  pageX: number;
  pageY: number;
};

type RegularGroupPostItem = {
  id: string;
  remoteTopicId?: number;
  author: string;
  authorProfileImageUrl?: string;
  content: string;
  completed: boolean;
};

type RegularGroupMemberItem = {
  id: string;
  nickname: string;
  profileImageUrl?: string;
};

type RegularGroupChatMessage = {
  id: string;
  author: string;
  content: string;
  time: string;
  mine?: boolean;
};

type RegularMeetingGroupItem = {
  id: string;
  teamId?: number;
  label: string;
  memberCount: number;
  members: RegularGroupMemberItem[];
  posts: RegularGroupPostItem[];
  chatMessages: RegularGroupChatMessage[];
};

type RegularMeetingInfo = {
  id: string;
  name: string;
  date: string;
  location: string;
  groups: RegularMeetingGroupItem[];
};

type TeamManageMemberItem = {
  clubMemberId: number;
  nickname: string;
  profileImageUrl?: string;
};

type TeamManageTeamItem = {
  teamNumber: number;
  memberIds: number[];
};

type GroupManagementScreen = 'JOIN_REQUESTS' | 'MEMBERS' | 'EDIT' | 'BOOKSHELF_CREATE';

type GroupJoinRequestItem = {
  id: string;
  clubMemberId?: number;
  nickname: string;
  profileImageUrl?: string;
  name: string;
  email: string;
  appliedAt: string;
  message: string;
};

type GroupMemberRole = '개설자' | '운영진' | '회원';

type GroupMemberItem = {
  id: string;
  clubMemberId?: number;
  nickname: string;
  profileImageUrl?: string;
  name: string;
  email: string;
  joinedAt: string;
  role: GroupMemberRole;
};

type GroupEditDraft = {
  name: string;
  description: string;
  region: string;
  categories: string[];
  targets: string[];
  isPrivate: boolean;
  imageUrl: string;
};

type BookshelfCreateDraft = {
  sourceBook: {
    isbn: string;
    title: string;
    author: string;
    coverImage?: string;
    publisher?: string;
    description?: string;
  } | null;
  session: string;
  categories: string[];
  regularMeetingName: string;
  meetingLocation: string;
  meetingDate: string;
};

type ClubProfileMode = 'empty' | 'default' | 'uploaded';

function buildBookshelfCreateDraft(defaultSession = '7'): BookshelfCreateDraft {
  return {
    sourceBook: null,
    session: defaultSession,
    categories: [],
    regularMeetingName: '',
    meetingLocation: '',
    meetingDate: '',
  };
}


type NoticePollOption = {
  id: string;
  label: string;
  voters: string[];
};

type NoticePoll = {
  startsAt: string;
  endsAt: string;
  endsAtMillis: number | null;
  allowDuplicate: boolean;
  anonymous: boolean;
  closed?: boolean;
  options: NoticePollOption[];
};

type NoticeDraft = {
  title: string;
  content: string;
  isPinned: boolean;
  bookshelfEnabled: boolean;
  bookshelfId: string | null;
  pollEnabled: boolean;
  pollAnonymous: boolean;
  pollAllowDuplicate: boolean;
  pollStartsAt: string;
  pollEndsAt: string;
  pollOptions: string[];
  photos: string[];
};

function toNoticeBookshelfAttachment(book: BookshelfItem): NoticeBookshelfAttachment {
  return {
    id: book.id,
    remoteMeetingId: book.remoteMeetingId,
    session: book.session,
    title: book.title,
    author: book.author,
    category: book.category,
    coverImage: book.coverImage,
    rating: book.rating,
  };
}

function resolveRegularMeetingId(
  book: Pick<BookshelfItem, 'remoteMeetingId' | 'regularMeetingId'> | null | undefined,
): number | undefined {
  if (!book) return undefined;
  if (typeof book.regularMeetingId === 'number') return book.regularMeetingId;
  if (typeof book.remoteMeetingId === 'number') return book.remoteMeetingId;
  return undefined;
}

function buildNoticeDraft(): NoticeDraft {
  return {
    title: '',
    content: '',
    isPinned: false,
    bookshelfEnabled: false,
    bookshelfId: null,
    pollEnabled: false,
    pollAnonymous: true,
    pollAllowDuplicate: false,
    pollStartsAt: '2026.03.01 10:00',
    pollEndsAt: '2026.03.08 22:00',
    pollOptions: ['', '', ''],
    photos: [],
  };
}


function sortNoticeItems(items: NoticeItem[]): NoticeItem[] {
  return [...items].sort((left, right) => Number(Boolean(right.isPinned)) - Number(Boolean(left.isPinned)));
}

function mapClubStatusToRole(status?: ClubMembershipStatus): GroupMemberRole {
  if (status === 'OWNER') return '개설자';
  if (status === 'STAFF') return '운영진';
  return '회원';
}


function toEditDraft(group: Group): GroupEditDraft {
  return {
    name: group.name,
    description: group.description ?? '',
    region: group.region.replace(/^활동 지역 · /, ''),
    categories: group.tags,
    targets: toGroupTargets(group.topic),
    isPrivate: group.isPrivate ?? false,
    imageUrl: group.profileImageUrl ?? '',
  };
}

function logMeetingAction(key: string, payload?: Record<string, unknown>) {
  if (!__DEV__) return;
  if (payload) {
    console.info(`[meeting] ${key}`, payload);
    return;
  }
  console.info(`[meeting] ${key}`);
}

function mapManagedClubDetailToGroup(detail: ClubDetailResult, prev: Group): Group {
  const tags = toLabelList(detail.category, categoryLabelByCode).slice(0, 6);
  const participants = toLabelList(detail.participantTypes, participantLabelByCode);
  const links = normalizeClubContacts(detail.links);
  const region = typeof detail.region === 'string' && detail.region.trim().length > 0
    ? detail.region.trim()
    : prev.region.replace(/^활동 지역 · /, '');

  return {
    ...prev,
    name: typeof detail.name === 'string' && detail.name.length > 0 ? detail.name : prev.name,
    profileImageUrl:
      normalizeRemoteImageUrl(detail.profileImageUrl ?? undefined) ?? prev.profileImageUrl,
    links: Array.isArray(detail.links) ? links : prev.links,
    description: typeof detail.description === 'string' ? detail.description : prev.description,
    tags: tags.length > 0 ? tags : prev.tags,
    topic: participants.length > 0 ? `모임 대상 · ${participants.join(', ')}` : prev.topic,
    region: `활동 지역 · ${region}`,
    isPrivate: typeof detail.open === 'boolean' ? !detail.open : prev.isPrivate,
  };
}

function mapClubManagedMemberToJoinRequest(item: ClubManagedMember): GroupJoinRequestItem {
  return {
    id: `club-member-pending-${item.clubMemberId}`,
    clubMemberId: item.clubMemberId,
    nickname: item.nickname,
    profileImageUrl: item.profileImageUrl,
    name: item.name ?? item.nickname,
    email: item.email ?? '',
    appliedAt: formatDotDate(item.appliedAt),
    message: item.joinMessage?.trim() || '가입 메시지가 없습니다.',
  };
}

function mapClubManagedMemberToGroupMember(item: ClubManagedMember): GroupMemberItem {
  return {
    id: `club-member-${item.clubMemberId}`,
    clubMemberId: item.clubMemberId,
    nickname: item.nickname,
    profileImageUrl: item.profileImageUrl,
    name: item.name ?? item.nickname,
    email: item.email ?? '',
    joinedAt: formatDotDate(item.joinedAt),
    role: mapClubStatusToRole(item.clubMemberStatus),
  };
}

function mapApiBookshelfToItem(book: {
  meetingId: number;
  generation?: number;
  tag?: string;
  averageRate?: number;
  bookId?: string;
  title?: string;
  author?: string;
  imgUrl?: string;
}): BookshelfItem {
  return {
    id: `bookshelf-${book.meetingId}`,
    remoteMeetingId: book.meetingId,
    bookId: book.bookId,
    generation: book.generation,
    session: formatGenerationLabel(book.generation),
    title: book.title ?? '책 제목',
    author: book.author ?? '작가 미상',
    category: book.tag?.trim() || '기본 태그',
    coverImage: book.imgUrl ?? BOOK_DEFAULT_IMAGE,
    rating: normalizeAverageRating(book.averageRate),
  };
}

function mapBookshelfDetailToItem(
  detail: ClubBookshelfDetail,
  bookshelfMeetingId?: number,
): BookshelfItem {
  const normalizedBookshelfMeetingId =
    typeof bookshelfMeetingId === 'number' ? bookshelfMeetingId : detail.meetingId;
  return {
    id: `bookshelf-${normalizedBookshelfMeetingId}`,
    remoteMeetingId: normalizedBookshelfMeetingId,
    regularMeetingId: detail.meetingId,
    bookId: detail.book.bookId,
    generation: detail.generation,
    session: formatGenerationLabel(detail.generation),
    title: detail.book.title ?? detail.title ?? '책 제목',
    author: detail.book.author ?? '작가 미상',
    category: detail.tag?.trim() || '기본 태그',
    coverImage: detail.book.imgUrl ?? BOOK_DEFAULT_IMAGE,
    rating: normalizeAverageRating(detail.averageRate),
    regularMeetingName: detail.title,
    meetingLocation: detail.location,
    meetingDate: formatDotDate(detail.meetingTime),
  };
}

function mapBookshelfTopicToPostItem(item: ClubBookshelfTopic): BookshelfPostItem {
  return {
    id: `bookshelf-topic-${item.topicId}`,
    remoteId: item.topicId,
    type: 'TOPIC',
    author: item.authorNickname,
    content: item.content,
    createdAt: item.createdAt,
    authorProfileImageUrl: item.authorProfileImageUrl,
    isAuthor: item.isAuthor,
  };
}

function mapBookshelfReviewToPostItem(item: ClubBookshelfReview): BookshelfPostItem {
  return {
    id: `bookshelf-review-${item.bookReviewId}`,
    remoteId: item.bookReviewId,
    type: 'REVIEW',
    author: item.authorNickname,
    content: item.description,
    rating: item.rate,
    createdAt: item.createdAt,
    authorProfileImageUrl: item.authorProfileImageUrl,
    isAuthor: item.isAuthor,
  };
}

function sortBookshelfPostsByLatest(items: BookshelfPostItem[]): BookshelfPostItem[] {
  return [...items].sort((left, right) => {
    const rightTime = right.createdAt ? Date.parse(right.createdAt) : NaN;
    const leftTime = left.createdAt ? Date.parse(left.createdAt) : NaN;

    if (Number.isFinite(rightTime) && Number.isFinite(leftTime) && rightTime !== leftTime) {
      return rightTime - leftTime;
    }

    if (right.remoteId !== left.remoteId) {
      return right.remoteId - left.remoteId;
    }

    return right.id.localeCompare(left.id, 'ko', { numeric: true });
  });
}

function areRegularGroupPostsEqual(
  left: RegularGroupPostItem[],
  right: RegularGroupPostItem[],
) {
  if (left.length !== right.length) return false;

  for (let index = 0; index < left.length; index += 1) {
    const leftItem = left[index];
    const rightItem = right[index];

    if (
      leftItem.id !== rightItem.id ||
      leftItem.remoteTopicId !== rightItem.remoteTopicId ||
      leftItem.author !== rightItem.author ||
      leftItem.authorProfileImageUrl !== rightItem.authorProfileImageUrl ||
      leftItem.content !== rightItem.content ||
      leftItem.completed !== rightItem.completed
    ) {
      return false;
    }
  }

  return true;
}

function areRegularGroupChatMessagesEqual(
  left: RegularGroupChatMessage[],
  right: RegularGroupChatMessage[],
) {
  if (left.length !== right.length) return false;

  for (let index = 0; index < left.length; index += 1) {
    const leftItem = left[index];
    const rightItem = right[index];

    if (
      leftItem.id !== rightItem.id ||
      leftItem.author !== rightItem.author ||
      leftItem.content !== rightItem.content ||
      leftItem.time !== rightItem.time ||
      leftItem.mine !== rightItem.mine
    ) {
      return false;
    }
  }

  return true;
}

function getStarIconName(rating: number, index: number): keyof typeof MaterialIcons.glyphMap {
  const nearestHalfRating = Math.max(0, Math.min(5, Math.round(rating * 2) / 2));
  const fillAmount = nearestHalfRating - index;
  if (fillAmount >= 1) return 'star';
  if (fillAmount >= 0.5) return 'star-half';
  return 'star-border';
}

function formatRatingLabel(rating: number) {
  return Number.isInteger(rating) ? `${rating}점` : `${rating.toFixed(1)}점`;
}

function normalizeAverageRating(rating?: number) {
  return Math.max(0, Math.min(5, rating ?? 0));
}

function formatAverageRating(rating: number) {
  return normalizeAverageRating(rating).toFixed(2);
}

function getClubHomeTagTone(tag: string): 'amber' | 'coral' | 'sky' | 'violet' {
  return clubHomeTagToneByLabel[tag] ?? 'amber';
}

function toNoticeTags(options: {
  tagCode?: string;
  hasPoll?: boolean;
  hasMeeting?: boolean;
}): NoticeTag[] {
  const tags: NoticeTag[] = [];
  const hasVoteTag = options.hasPoll ?? options.tagCode === 'VOTE';
  const hasMeetingTag = options.hasMeeting ?? options.tagCode === 'MEETING';
  if (hasVoteTag) tags.push('VOTE');
  if (hasMeetingTag) tags.push('MEETING');
  return tags;
}

function mapNoticePreviewToNoticeItem(item: ClubNoticePreview): NoticeItem {
  const tags = toNoticeTags({ tagCode: item.tagCode });
  return {
    id: `notice-${item.id}`,
    remoteId: item.id,
    title: item.title,
    date: formatDotDate(item.createdAt),
    tags,
    category: item.tagCode === 'VOTE' ? '투표' : item.tagCode === 'MEETING' ? '모임' : '일반',
    content: '',
    authorNickname: item.authorNickname,
    authorProfileImageUrl: item.authorProfileImageUrl,
    isPinned: item.isPinned,
  };
}

function mergeNoticeDetail(
  baseNotice: NoticeItem | null,
  detail: ClubNoticeDetail,
): NoticeItem {
  const bookshelfAttachment =
    detail.meetingDetail?.meetingId && detail.meetingDetail.bookInfo
      ? {
          id: `bookshelf-${detail.meetingDetail.meetingId}`,
          remoteMeetingId: detail.meetingDetail.meetingId,
          session: formatGenerationLabel(detail.meetingDetail.generation),
          title: detail.meetingDetail.bookInfo.title ?? detail.meetingDetail.title ?? '책 제목',
          author: detail.meetingDetail.bookInfo.author ?? '작가 미상',
          category: detail.meetingDetail.tag?.trim() || '기본 태그',
          coverImage: detail.meetingDetail.bookInfo.imgUrl ?? BOOK_DEFAULT_IMAGE,
          rating: 0,
        }
      : undefined;

  return {
    id: `notice-${detail.id}`,
    remoteId: detail.id,
    title: detail.title,
    date: formatDotDate(detail.createdAt),
    tags: toNoticeTags({
      tagCode: detail.tagCode,
      hasPoll: Boolean(detail.voteDetail),
      hasMeeting: Boolean(detail.meetingDetail),
    }),
    category: detail.voteDetail ? '투표' : detail.meetingDetail ? '모임' : '일반',
    content: detail.content,
    authorNickname: detail.authorNickname ?? baseNotice?.authorNickname,
    authorProfileImageUrl:
      detail.authorProfileImageUrl ?? baseNotice?.authorProfileImageUrl,
    bookshelf: bookshelfAttachment,
    poll: detail.voteDetail
      ? {
          startsAt: formatDotDateTime(detail.voteDetail.startTime),
          endsAt: formatDotDateTime(detail.voteDetail.deadline),
          endsAtMillis: parseApiDateMillis(detail.voteDetail.deadline) ?? null,
          allowDuplicate: detail.voteDetail.duplication,
          anonymous: detail.voteDetail.anonymity,
          options: detail.voteDetail.items.map((option) => ({
            id: `notice-${detail.id}-vote-${option.itemNumber}`,
            label: option.item,
            voters: option.votedMembers.map((member) => member.nickname),
          })),
        }
      : undefined,
    photos: detail.imageUrls,
    isPinned: detail.isPinned,
  };
}

function mapNoticeCommentToUi(item: ClubNoticeComment, currentNickname?: string): NoticeComment {
  const normalizedCurrentNickname = currentNickname?.trim();
  const normalizedAuthor = item.nickname.trim();

  return {
    id: `notice-comment-${item.commentId}`,
    remoteId: item.commentId,
    author: item.nickname,
    authorProfileImageUrl: item.profileImageUrl,
    date: formatDotDate(item.updatedAt ?? item.createdAt),
    content: item.content,
    mine:
      Boolean(normalizedCurrentNickname) &&
      normalizedAuthor.localeCompare(normalizedCurrentNickname ?? '', 'ko', {
        sensitivity: 'accent',
      }) === 0,
  };
}

function mapMeetingChatMessageToUi(
  item: ClubMeetingChatMessage,
  currentNickname?: string,
): RegularGroupChatMessage {
  const normalizedCurrentNickname = currentNickname?.trim();
  const normalizedAuthor = item.senderNickname.trim();

  return {
    id: `meeting-chat-${item.messageId}`,
    author: item.senderNickname,
    content: item.content,
    time: formatDotDateTime(item.sendAt),
    mine:
      Boolean(normalizedCurrentNickname) &&
      normalizedAuthor.localeCompare(normalizedCurrentNickname ?? '', 'ko', {
        sensitivity: 'accent',
      }) === 0,
  };
}

function mapMeetingToRegularMeetingInfo(
  book: BookshelfItem | null,
  meeting: ClubMeetingInfo,
  topicsByTeamId: Record<number, ClubMeetingTeamTopics>,
  chatsByTeamId: Record<number, ClubMeetingChatHistory>,
  currentNickname?: string,
): RegularMeetingInfo | null {
  if (!book) return null;

  const fallbackTeamsFromMembers = Array.from(
    new Set(
      meeting.members
        .map((member) => member.teamNumber)
        .filter((teamNumber): teamNumber is number => typeof teamNumber === 'number' && teamNumber > 0),
    ),
  )
    .sort((left, right) => left - right)
    .map((teamNumber) => ({ teamNumber }));

  const normalizedTeams: Array<{ teamId?: number; teamNumber: number }> =
    meeting.teams.length > 0
      ? meeting.teams
          .filter((team) => typeof team.teamNumber === 'number' && team.teamNumber > 0)
          .map((team) => ({ teamId: team.teamId, teamNumber: team.teamNumber }))
      : fallbackTeamsFromMembers;

  const groups: RegularMeetingGroupItem[] = normalizedTeams.map((team) => {
    const teamMembers = meeting.members.filter((member) => {
      if (typeof team.teamId === 'number' && typeof member.teamId === 'number') {
        return member.teamId === team.teamId;
      }
      return member.teamNumber === team.teamNumber;
    });
    const teamTopics =
      typeof team.teamId === 'number' ? topicsByTeamId[team.teamId]?.topics ?? [] : [];
    const teamChats =
      typeof team.teamId === 'number' ? chatsByTeamId[team.teamId]?.chats ?? [] : [];
    const label = toTeamLabel(team.teamNumber);
    const groupId =
      typeof team.teamId === 'number'
        ? `${book.id}-regular-group-${team.teamId}`
        : `${book.id}-regular-group-team-number-${team.teamNumber}`;
    const members = teamMembers.map((member) => ({
      id: `${groupId}-member-${member.clubMemberId}`,
      nickname: member.nickname,
      profileImageUrl: member.profileImageUrl,
    }));

    return {
      id: groupId,
      teamId: typeof team.teamId === 'number' ? team.teamId : undefined,
      label,
      memberCount: members.length,
      members,
      posts: teamTopics.map((topic) => ({
        id: `${groupId}-topic-${topic.topicId}`,
        remoteTopicId: topic.topicId,
        author: topic.authorNickname,
        authorProfileImageUrl: topic.authorProfileImageUrl,
        content: topic.content,
        completed: topic.isSelected,
      })),
      chatMessages: teamChats.map((chat) => mapMeetingChatMessageToUi(chat, currentNickname)),
    };
  });

  return {
    id: `${book.id}-regular`,
    name: meeting.title?.trim() || `${book.title} 정기모임`,
    date: formatDotDate(meeting.meetingTime),
    location: meeting.location?.trim() || '장소 미정',
    groups,
  };
}

function ensureRegularMeetingInfo(
  info: RegularMeetingInfo | null,
  book: BookshelfItem,
  detail?: ClubBookshelfDetail | null,
): RegularMeetingInfo {
  const preferredName = book.regularMeetingName?.trim() || detail?.title?.trim();
  const preferredDate = book.meetingDate?.trim() || formatDotDate(detail?.meetingTime);
  const preferredLocation = book.meetingLocation?.trim() || detail?.location?.trim();

  if (!info) {
    return {
      id: `${book.id}-regular`,
      name: preferredName || `${book.title} 정기모임`,
      date: preferredDate || '날짜 미정',
      location: preferredLocation || '장소 미정',
      groups: [],
    };
  }

  return {
    ...info,
    // Bookshelf edit values should win over meeting fallback values.
    name: preferredName || info.name?.trim() || `${book.title} 정기모임`,
    date: preferredDate || info.date?.trim() || '날짜 미정',
    location: preferredLocation || info.location?.trim() || '장소 미정',
  };
}

function GroupHomeView({ group, onBack }: { group: Group; onBack: () => void }) {
  const navigation = useNavigation<NavigationProp<ParamListBase>>();
  const insets = useSafeAreaInsets();
  const { width: screenWidth, height: screenHeight } = useWindowDimensions();
  const { requireAuth, isLoggedIn, logout } = useAuthGate();
  const isManagedClub = typeof group.clubId === 'number';
  const [managedGroup, setManagedGroup] = useState<Group>(group);
  const [canManageClub, setCanManageClub] = useState(false);
  const isMember = managedGroup.applicationStatus === '가입 완료되었습니다' || canManageClub;
  const [activeTab, setActiveTab] = useState<'home' | 'notice' | 'bookshelf'>('home');
  const [noticePage, setNoticePage] = useState(1);
  const [selectedNoticeId, setSelectedNoticeId] = useState<string | null>(null);
  const [noticeCommentInput, setNoticeCommentInput] = useState('');
  const [editingNoticeCommentId, setEditingNoticeCommentId] = useState<string | null>(null);
  const [submittingNoticeComment, setSubmittingNoticeComment] = useState(false);
  const [currentMemberNickname, setCurrentMemberNickname] = useState('');
  const [selectedBookshelfSession, setSelectedBookshelfSession] = useState('');
  const [bookshelfViewMode, setBookshelfViewMode] = useState<BookshelfViewMode>('GRID');
  const [bookshelfDetailTab, setBookshelfDetailTab] = useState<BookshelfDetailTab>('TOPIC');
  const [selectedBookshelfBookId, setSelectedBookshelfBookId] = useState<string | null>(null);
  const [bookshelfItems, setBookshelfItems] = useState<BookshelfItem[]>([]);
  const [selectedRegularGroupId, setSelectedRegularGroupId] = useState<string | null>(null);
  const [regularGroupPostsById, setRegularGroupPostsById] = useState<
    Record<string, RegularGroupPostItem[]>
  >({});
  const [regularGroupChatMessagesById, setRegularGroupChatMessagesById] = useState<
    Record<string, RegularGroupChatMessage[]>
  >({});
  const [regularGroupMembersVisible, setRegularGroupMembersVisible] = useState(false);
  const [regularChatPickerVisible, setRegularChatPickerVisible] = useState(false);
  const [activeRegularChatGroupId, setActiveRegularChatGroupId] = useState<string | null>(null);
  const [regularChatInput, setRegularChatInput] = useState('');
  const [submittingRegularChat, setSubmittingRegularChat] = useState(false);
  const chatScrollRef = useRef<ScrollView>(null);
  const groupHomeScrollRef = useRef<ScrollView>(null);
  const groupTitleAnchorYRef = useRef(0);
  const hasFocusedGroupTitleRef = useRef(false);
  const shouldScrollToBookshelfDetailRef = useRef(false);
  const [managementMenuVisible, setManagementMenuVisible] = useState(false);
  const managementSheetY = useRef(new Animated.Value(0)).current;
  const MGMT_SHEET_DRAG_START = 6;
  const MGMT_SHEET_DISMISS_DISTANCE = 100;
  const MGMT_SHEET_DISMISS_VELOCITY = 0.5;
  const managementHandlePanResponder = useRef(
    PanResponder.create({
      onMoveShouldSetPanResponder: (_evt, gestureState) =>
        gestureState.dy > MGMT_SHEET_DRAG_START && Math.abs(gestureState.dy) > Math.abs(gestureState.dx),
      onPanResponderMove: (_evt, gestureState) => {
        if (gestureState.dy > 0) managementSheetY.setValue(gestureState.dy);
      },
      onPanResponderRelease: (_evt, gestureState) => {
        if (gestureState.dy > MGMT_SHEET_DISMISS_DISTANCE || gestureState.vy > MGMT_SHEET_DISMISS_VELOCITY) {
          Animated.timing(managementSheetY, {
            toValue: 600,
            duration: motion.duration.sheet,
            useNativeDriver: true,
          }).start(() => setManagementMenuVisible(false));
        } else {
          Animated.spring(managementSheetY, {
            toValue: 0,
            useNativeDriver: true,
            bounciness: 6,
          }).start();
        }
      },
    }),
  ).current;
  const [activeManagementScreen, setActiveManagementScreen] = useState<GroupManagementScreen | null>(null);
  const [joinRequests, setJoinRequests] = useState<GroupJoinRequestItem[]>([]);
  const [members, setMembers] = useState<GroupMemberItem[]>([]);
  const [selectedJoinRequestActionId, setSelectedJoinRequestActionId] = useState<string | null>(null);
  const [selectedJoinRequestMessage, setSelectedJoinRequestMessage] = useState<GroupJoinRequestItem | null>(null);
  const [submittingJoinRequestAction, setSubmittingJoinRequestAction] = useState(false);
  const [selectedMemberActionId, setSelectedMemberActionId] = useState<string | null>(null);
  const [submittingMemberAction, setSubmittingMemberAction] = useState(false);
  const [reportModal, setReportModal] = useState<ReportMemberModalState | null>(null);
  const [contactModalVisible, setContactModalVisible] = useState(false);
  const [submittingReport, setSubmittingReport] = useState(false);
  const [uploadingClubImage, setUploadingClubImage] = useState(false);
  const [uploadingNoticePhoto, setUploadingNoticePhoto] = useState(false);
  const [creatingBookshelf, setCreatingBookshelf] = useState(false);
  const [updatingBookshelf, setUpdatingBookshelf] = useState(false);
  const [deletingBookshelf, setDeletingBookshelf] = useState(false);
  const [editingBookshelfMeetingId, setEditingBookshelfMeetingId] = useState<number | null>(null);
  const [openingNextMeeting, setOpeningNextMeeting] = useState(false);
  const [groupHomeRefreshing, setGroupHomeRefreshing] = useState(false);
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
  const [teamManageDropLayouts, setTeamManageDropLayouts] = useState<
    Record<string, { x: number; y: number; width: number; height: number }>
  >({});
  const [draggingTeamMemberId, setDraggingTeamMemberId] = useState<number | null>(null);
  const [draggingTeamMemberPosition, setDraggingTeamMemberPosition] = useState<{ x: number; y: number } | null>(null);
  const [editDraft, setEditDraft] = useState<GroupEditDraft>(() => toEditDraft(group));
  const [noticeItems, setNoticeItems] = useState<NoticeItem[]>([]);
  const [latestNoticeId, setLatestNoticeId] = useState<number | null>(null);
  const [shouldOpenTopNotice, setShouldOpenTopNotice] = useState(false);
  const [noticeComposerVisible, setNoticeComposerVisible] = useState(false);
  const [noticeBookSelectorVisible, setNoticeBookSelectorVisible] = useState(false);
  const [bookshelfBookSelectorVisible, setBookshelfBookSelectorVisible] = useState(false);
  const [bookshelfBookSearchQuery, setBookshelfBookSearchQuery] = useState('');
  const [bookshelfBookSearchKeyword, setBookshelfBookSearchKeyword] = useState('');
  const [bookshelfBookSearchResults, setBookshelfBookSearchResults] = useState<BookItem[]>([]);
  const [bookshelfBookSearchLoading, setBookshelfBookSearchLoading] = useState(false);
  const [bookshelfBookSearchSearched, setBookshelfBookSearchSearched] = useState(false);
  const [bookshelfCalendarVisible, setBookshelfCalendarVisible] = useState(false);
  const [bookshelfCalendarMonth, setBookshelfCalendarMonth] = useState(() => {
    const { year, month } = getCurrentKstYearMonth();
    return new Date(year, month - 1, 1);
  });
  const [editingNoticeId, setEditingNoticeId] = useState<string | null>(null);
  const [noticeMenuVisible, setNoticeMenuVisible] = useState(false);
  const [noticeDraft, setNoticeDraft] = useState<NoticeDraft>(() => buildNoticeDraft());
  const [bookshelfCreateDraft, setBookshelfCreateDraft] = useState<BookshelfCreateDraft>(() =>
    buildBookshelfCreateDraft(),
  );
  const [noticeCommentsById, setNoticeCommentsById] = useState<Record<string, NoticeComment[]>>({});
  const [selectedVoteOptionIdsByNotice, setSelectedVoteOptionIdsByNotice] = useState<Record<string, string[]>>({});
  const [submittedVoteOptionIdsByNotice, setSubmittedVoteOptionIdsByNotice] = useState<Record<string, string[]>>({});
  const [voteEditEnabledByNotice, setVoteEditEnabledByNotice] = useState<Record<string, boolean>>({});
  const [noticePollOptionsById, setNoticePollOptionsById] = useState<Record<string, NoticePollOption[]>>({});
  const [noticeCommentMenu, setNoticeCommentMenu] = useState<NoticeCommentMenuState | null>(null);
  const [bookshelfPostMenu, setBookshelfPostMenu] = useState<BookshelfPostMenuState | null>(null);
  const [voteVotersModal, setVoteVotersModal] = useState<{
    optionLabel: string;
    voters: string[];
  } | null>(null);
  const teamManageDropRefs = useRef<Record<string, View | null>>({});
  const clubWorkspaceRequestIdRef = useRef(0);
  const bookshelfMeetingDetailRequestIdRef = useRef<Record<number, number>>({});
  const dragStartRef = useRef<{
    memberId: number;
    pageX: number;
    pageY: number;
    moved: boolean;
  } | null>(null);
  const teamManageScrollRef = useRef<ScrollView>(null);
  const teamManageScrollViewRef = useRef<View>(null);
  const teamManageScrollOffsetRef = useRef(0);
  const teamManageScrollBoundsRef = useRef<{ top: number; bottom: number } | null>(null);
  const dragAutoScrollFrameRef = useRef<number | null>(null);
  const dragCurrentPageYRef = useRef(0);
  const contactLinks = useMemo(
    () => normalizeClubContacts(managedGroup.links),
    [managedGroup.links],
  );
  const mapNoticeCommentItemToUi = useCallback(
    (item: ClubNoticeComment) => mapNoticeCommentToUi(item, currentMemberNickname),
    [currentMemberNickname],
  );
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
    () =>
      teamManageMembers.filter((member) => !teamManageAssignedMemberIds.has(member.clubMemberId)),
    [teamManageAssignedMemberIds, teamManageMembers],
  );
  const closeBookshelfBookSelector = useCallback(() => {
    setBookshelfBookSelectorVisible(false);
    setBookshelfBookSearchQuery('');
    setBookshelfBookSearchKeyword('');
    setBookshelfBookSearchResults([]);
    setBookshelfBookSearchLoading(false);
    setBookshelfBookSearchSearched(false);
  }, []);
  const closeManagementMenu = useCallback(() => {
    setManagementMenuVisible(false);
  }, []);
  useEffect(() => {
    if (managementMenuVisible) managementSheetY.setValue(0);
  }, [managementMenuVisible, managementSheetY]);
  const closeContactModal = useCallback(() => {
    setContactModalVisible(false);
  }, []);
  const closeBookshelfCalendar = useCallback(() => {
    setBookshelfCalendarVisible(false);
  }, []);
  const openBookshelfCalendar = useCallback(() => {
    const { year, month } = getCurrentKstYearMonth();
    const selectedDate = parseDotDate(bookshelfCreateDraft.meetingDate) ?? new Date(year, month - 1, 1);
    setBookshelfCalendarMonth(
      new Date(selectedDate.getFullYear(), selectedDate.getMonth(), 1),
    );
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
  const [noticeCommentPageStateByNoticeId, setNoticeCommentPageStateByNoticeId] = useState<
    Record<string, CursorPageState>
  >({});
  const noticePageSize = 8;
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

  const handleAuthExpired = useCallback(
    (options?: { suppressToast?: boolean }) => {
      setCanManageClub(false);
      setJoinRequests([]);
      setMembers([]);
      setNoticeItems([]);
      setSelectedNoticeId(null);
      setNoticeCommentsById({});
      setNoticePollOptionsById({});
      setSelectedVoteOptionIdsByNotice({});
      setSubmittedVoteOptionIdsByNotice({});
      setVoteEditEnabledByNotice({});
      setBookshelfItems([]);
      setBookshelfTopicsByMeetingId({});
      setBookshelfTopicPageStateByMeetingId({});
      setBookshelfReviewsByMeetingId({});
      setRegularMeetingInfoByMeetingId({});
      setSelectedBookshelfBookId(null);
      setSelectedRegularGroupId(null);
      setBookshelfViewMode('GRID');
      setBookshelfDetailTab('TOPIC');
      setActiveTab('home');
      if (!options?.suppressToast) {
        showToast('로그인이 만료되었습니다. 다시 로그인해 주십시오.');
      }
      logout();
      requireAuth();
    },
    [logout, requireAuth],
  );

  useEffect(() => {
    clubWorkspaceRequestIdRef.current += 1;
    bookshelfMeetingDetailRequestIdRef.current = {};
    setManagedGroup(group);
    setCanManageClub(false);
    setJoinRequests([]);
    setMembers([]);
    setContactModalVisible(false);
    setBookshelfItems([]);
    setBookshelfTopicsByMeetingId({});
    setBookshelfTopicPageStateByMeetingId({});
    setBookshelfReviewsByMeetingId({});
    setRegularMeetingInfoByMeetingId({});
    setRegularGroupPostsById({});
    setRegularGroupChatMessagesById({});
    setSubmittingRegularChat(false);
    setManagementMenuVisible(false);
    setActiveManagementScreen(null);
    setSelectedJoinRequestActionId(null);
    setSelectedJoinRequestMessage(null);
    setSelectedMemberActionId(null);
    setEditDraft(toEditDraft(group));
    setNoticeItems([]);
    setNoticeCommentPageStateByNoticeId({});
    setNoticeComposerVisible(false);
    setNoticeBookSelectorVisible(false);
    closeBookshelfBookSelector();
    closeBookshelfCalendar();
    setEditingNoticeId(null);
    setNoticeMenuVisible(false);
    setNoticeDraft(buildNoticeDraft());
    setBookshelfCreateDraft(
      buildBookshelfCreateDraft(),
    );
    setEditingBookshelfMeetingId(null);
    setUpdatingBookshelf(false);
    setDeletingBookshelf(false);
    setEditingNoticeCommentId(null);
    setSubmittingNoticeComment(false);
  }, [closeBookshelfBookSelector, closeBookshelfCalendar, group]);

  useEffect(() => {
    if (!isLoggedIn) {
      setCurrentMemberNickname('');
      return;
    }

    let cancelled = false;

    const loadMyProfile = async () => {
      try {
        const profile = await fetchMyProfile({ suppressErrorToast: true });
        if (cancelled) return;
        setCurrentMemberNickname(profile?.nickname?.trim() ?? '');
      } catch (error) {
        if (cancelled) return;
        if (error instanceof ApiError) return;
        setCurrentMemberNickname('');
      }
    };

    void loadMyProfile();

    return () => {
      cancelled = true;
    };
  }, [isLoggedIn]);

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

  useEffect(() => {
    setRegularGroupChatMessagesById((prev) =>
      Object.fromEntries(
        Object.entries(prev).map(([groupId, messages]) => [
          groupId,
          messages.map((message) => ({
            ...message,
            mine:
              Boolean(currentMemberNickname) &&
              message.author.trim().localeCompare(currentMemberNickname.trim(), 'ko', {
                sensitivity: 'accent',
              }) === 0,
          })),
        ]),
      ),
    );
  }, [currentMemberNickname]);

  const reloadClubWorkspace = useCallback(
    async (options?: { suppressErrorToast?: boolean; isCancelled?: () => boolean }) => {
      if (!isManagedClub || typeof group.clubId !== 'number') return;
      const requestId = clubWorkspaceRequestIdRef.current + 1;
      clubWorkspaceRequestIdRef.current = requestId;
      const isCancelled = options?.isCancelled ?? (() => false);
      const isStale = () =>
        isCancelled() || requestId !== clubWorkspaceRequestIdRef.current;

      try {
        const [homeDetail, bookshelfList, noticeList, latestNotice, myMembership] = await Promise.all([
          fetchClubHome(group.clubId),
          fetchAllClubBookshelvesWithCursor(group.clubId),
          (async () => {
            const clubIdNum = group.clubId as number;
            const first = await fetchClubNotices(clubIdNum, 1);
            if (!first.hasNext) return first;
            const allNormal = [...first.normalNotices];
            for (let p = 2; p <= Math.min(first.totalPages, 20); p++) {
              const more = await fetchClubNotices(clubIdNum, p);
              allNormal.push(...more.normalNotices);
              if (!more.hasNext) break;
            }
            return { ...first, normalNotices: allNormal };
          })(),
          fetchClubLatestNotice(group.clubId, { suppressErrorToast: true }),
          isLoggedIn
            ? fetchClubMyMembership(group.clubId, { suppressErrorToast: true }).catch((e: unknown) => {
                if (e instanceof ApiError && (e.status === 404 || e.status === 403)) return null;
                throw e;
              })
            : Promise.resolve(null),
        ]);

        if (isStale()) return;
        setLatestNoticeId(typeof latestNotice?.id === 'number' ? latestNotice.id : null);

        const nextCanManageClub =
          myMembership?.myStatus === 'STAFF' ||
          myMembership?.myStatus === 'OWNER' ||
          myMembership?.staff === true ||
          Boolean(bookshelfList.isStaff);
        setCanManageClub(nextCanManageClub);

        if (homeDetail) {
          const nextGroup = mapManagedClubDetailToGroup(homeDetail, group);
          setManagedGroup({
            ...nextGroup,
            notice: latestNotice?.title,
            applicationStatus:
              mapClubStatusToApplication(myMembership?.myStatus) ?? nextGroup.applicationStatus,
          });
          setEditDraft((prev) => ({ ...prev, ...toEditDraft(nextGroup) }));
        }

        const nextBookshelves = bookshelfList.items.map(mapApiBookshelfToItem);
        if (nextBookshelves.length > 0) {
          setBookshelfItems(nextBookshelves);
        } else {
          setBookshelfItems([]);
        }

        const nextNotices = [
          ...noticeList.pinnedNotices.map(mapNoticePreviewToNoticeItem),
          ...noticeList.normalNotices.map(mapNoticePreviewToNoticeItem),
        ];
        setNoticeItems(sortNoticeItems(nextNotices));
        setSelectedNoticeId(prev =>
          prev && nextNotices.some(n => n.id === prev) ? prev : null,
        );
        setNoticeCommentsById({});
        setNoticePollOptionsById({});
        setSelectedVoteOptionIdsByNotice({});
        setSubmittedVoteOptionIdsByNotice({});
        setVoteEditEnabledByNotice({});

        if (!nextCanManageClub) {
          setJoinRequests([]);
          setMembers([]);
          return;
        }

        const [detail, pendingMembers, activeMembers] = await Promise.all([
          fetchClubDetail(group.clubId),
          fetchClubMembers(group.clubId, 'PENDING'),
          fetchClubMembers(group.clubId, 'ACTIVE'),
        ]);

        if (isStale()) return;

        if (detail) {
          const nextGroup = mapManagedClubDetailToGroup(detail, group);
          setManagedGroup({
            ...nextGroup,
            notice: latestNotice?.title,
            applicationStatus:
              mapClubStatusToApplication(myMembership?.myStatus) ?? nextGroup.applicationStatus,
          });
          setEditDraft((prev) => ({ ...prev, ...toEditDraft(nextGroup) }));
        }

        setJoinRequests(pendingMembers.items.map(mapClubManagedMemberToJoinRequest));
        setMembers(activeMembers.items.map(mapClubManagedMemberToGroupMember));
      } catch (error) {
        if (isStale()) return;
        if (error instanceof ApiError) {
          if (error.status === 401) {
            handleAuthExpired({ suppressToast: options?.suppressErrorToast });
          } else if (error.status === 403 && !options?.suppressErrorToast) {
            showToast('모임 멤버만 열람할 수 있습니다.');
          } else if (error.status !== 401 && !options?.suppressErrorToast) {
            showToast(error.message || '모임 데이터를 불러오지 못했습니다.');
          }
          return;
        }
        if (!options?.suppressErrorToast) {
          showToast('모임 데이터를 불러오지 못했습니다.');
        }
      }
    },
    [group, group.clubId, handleAuthExpired, isManagedClub, isLoggedIn],
  );

  useEffect(() => {
    if (!isManagedClub) return;
    let cancelled = false;

    void reloadClubWorkspace({
      isCancelled: () => cancelled,
    });

    return () => {
      cancelled = true;
    };
  }, [isManagedClub, reloadClubWorkspace]);

  useEffect(() => {
    if (bookshelfSessions.length === 0) return;
    if (bookshelfSessions.includes(selectedBookshelfSession)) return;
    setSelectedBookshelfSession(bookshelfSessions[0]);
  }, [bookshelfSessions, selectedBookshelfSession]);

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
          if (error.status === 403) {
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

  const visibleBookshelfItems = useMemo(
    () => bookshelfItems.filter((item) => item.session === selectedBookshelfSession),
    [bookshelfItems, selectedBookshelfSession],
  );

  const selectedBookshelfBook = useMemo(() => {
    const fallbackBook = visibleBookshelfItems[0] ?? bookshelfItems[0] ?? null;
    if (!fallbackBook) return null;
    if (!selectedBookshelfBookId) return fallbackBook;
    return (
      bookshelfItems.find((item) => item.id === selectedBookshelfBookId) ??
      fallbackBook
    );
  }, [bookshelfItems, selectedBookshelfBookId, visibleBookshelfItems]);

  const selectedRegularMeetingId = useMemo(
    () => resolveRegularMeetingId(selectedBookshelfBook),
    [selectedBookshelfBook],
  );

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

        if (!response.hasNext || typeof response.nextCursor !== 'number') {
          break;
        }
        if (visitedCursors.has(response.nextCursor)) {
          break;
        }

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

        if (!response.hasNext || typeof response.nextCursor !== 'number') {
          break;
        }
        if (visitedCursors.has(response.nextCursor)) {
          break;
        }

        visitedCursors.add(response.nextCursor);
        cursorId = response.nextCursor;
      }

      if (!latestMeta) {
        return {
          existingTeams: [],
          requestedTeam: undefined,
          topics: [],
          hasNext: false,
          nextCursor: null,
        };
      }

      return {
        existingTeams: latestMeta.existingTeams,
        requestedTeam: latestMeta.requestedTeam,
        topics: mergedTopics,
        hasNext: false,
        nextCursor: null,
      };
    },
    [],
  );

  const fetchAllMeetingTeamChats = useCallback(
    async (
      clubId: number,
      meetingId: number,
      teamId: number,
      options?: { suppressErrorToast?: boolean },
    ): Promise<ClubMeetingChatHistory> => {
      const mergedChats: ClubMeetingChatMessage[] = [];
      const seenMessageIds = new Set<number>();
      const visitedCursors = new Set<number>();
      let cursorId: number | undefined;
      let latestMeta: ClubMeetingChatHistory | null = null;

      for (let page = 0; page < BOOKSHELF_CURSOR_LOOP_LIMIT; page += 1) {
        const response = await fetchClubMeetingTeamChatMessages(clubId, meetingId, teamId, cursorId, {
          suppressErrorToast: options?.suppressErrorToast,
        });
        latestMeta = response;

        response.chats.forEach((item) => {
          if (seenMessageIds.has(item.messageId)) return;
          seenMessageIds.add(item.messageId);
          mergedChats.push(item);
        });

        if (!response.hasNext || typeof response.nextCursor !== 'number') {
          break;
        }
        if (visitedCursors.has(response.nextCursor)) {
          break;
        }

        visitedCursors.add(response.nextCursor);
        cursorId = response.nextCursor;
      }

      const sortedChats = [...mergedChats].sort((left, right) => {
        const leftTime = left.sendAt ? Date.parse(left.sendAt) : NaN;
        const rightTime = right.sendAt ? Date.parse(right.sendAt) : NaN;

        if (Number.isFinite(leftTime) && Number.isFinite(rightTime) && leftTime !== rightTime) {
          return leftTime - rightTime;
        }

        return left.messageId - right.messageId;
      });

      if (!latestMeta) {
        return {
          chats: sortedChats,
          hasNext: false,
          nextCursor: null,
        };
      }

      return {
        chats: sortedChats,
        hasNext: false,
        nextCursor: null,
      };
    },
    [],
  );

  const reloadBookshelfMeetingDetail = useCallback(
    async (book: BookshelfItem, options?: { suppressErrorToast?: boolean }) => {
      const clubId = group.clubId;
      const meetingId = book.remoteMeetingId;
      if (typeof clubId !== 'number' || typeof meetingId !== 'number') return;
      const requestId = (bookshelfMeetingDetailRequestIdRef.current[meetingId] ?? 0) + 1;
      bookshelfMeetingDetailRequestIdRef.current[meetingId] = requestId;
      const isStale = () =>
        bookshelfMeetingDetailRequestIdRef.current[meetingId] !== requestId;

      try {
        // Phase 1: topics/reviews/detail을 병렬로 먼저 요청
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

        // editDetail (staff-only endpoint) has title/meetingTime/location; regular detail does not.
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

        // Phase 1 완료: richDetail로 제목/날짜/장소 즉시 렌더링 (groups는 빈 배열)
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
          setRegularMeetingInfoByMeetingId((prev) => ({
            ...prev,
            [meetingId]: summaryInfo,
          }));
        }

        if (isStale()) return;

        // Phase 2: 올바른 정기모임 ID로 meeting 요청
        let meeting: ClubMeetingInfo | null = null;
        let meetingFetchSucceeded = false;

        try {
          meeting = await fetchClubMeeting(clubId, regularMeetingId, {
            suppressErrorToast: options?.suppressErrorToast,
          });
          meetingFetchSucceeded = true;
        } catch (error) {
          if (error instanceof ApiError && error.status === 401) throw error;
          if (!(error instanceof ApiError) && !options?.suppressErrorToast) {
            showToast('정기모임 정보를 불러오지 못했습니다.');
          }
        }

        let regularInfo: RegularMeetingInfo | null = null;
        let meetingMembersFallback: ClubMeetingMemberList | null = null;

        if (meeting) {
          if (meeting.teams.length === 0 || meeting.members.length === 0) {
            try {
              meetingMembersFallback = await fetchClubMeetingMembers(clubId, regularMeetingId, {
                suppressErrorToast: true,
              });
            } catch (fallbackError) {
              if (fallbackError instanceof ApiError && fallbackError.status === 401) {
                throw fallbackError;
              }
            }
          }

          const effectiveMeeting: ClubMeetingInfo =
            meetingMembersFallback &&
            (meeting.teams.length === 0 || meeting.members.length === 0)
              ? {
                  ...meeting,
                  teams: meeting.teams.length > 0 ? meeting.teams : meetingMembersFallback.teams,
                  members:
                    meeting.members.length > 0 ? meeting.members : meetingMembersFallback.members,
                }
              : meeting;

          const [topicSettled, chatSettled] = await Promise.all([
            Promise.allSettled(
              effectiveMeeting.teams.map(async (team) => [
                team.teamId,
                await fetchAllMeetingTeamTopics(clubId, regularMeetingId, team.teamId, {
                  suppressErrorToast: options?.suppressErrorToast,
                }),
              ] as const),
            ),
            Promise.allSettled(
              effectiveMeeting.teams.map(async (team) => [
                team.teamId,
                await fetchAllMeetingTeamChats(clubId, regularMeetingId, team.teamId, {
                  suppressErrorToast: options?.suppressErrorToast,
                }),
              ] as const),
            ),
          ]);

          if (isStale()) return;
          const topicEntries: Array<[number, ClubMeetingTeamTopics]> = effectiveMeeting.teams.map(
            (team, index) => {
              const settled = topicSettled[index];
              if (settled?.status === 'fulfilled') {
                return settled.value as [number, ClubMeetingTeamTopics];
              }
              return [
                team.teamId,
                {
                  existingTeams: effectiveMeeting.teams,
                  requestedTeam: team,
                  topics: [],
                  hasNext: false,
                  nextCursor: null,
                },
              ];
            },
          );

          const chatEntries: Array<[number, ClubMeetingChatHistory]> = effectiveMeeting.teams.map(
            (team, index) => {
              const settled = chatSettled[index];
              if (settled?.status === 'fulfilled') {
                return settled.value as [number, ClubMeetingChatHistory];
              }
              return [
                team.teamId,
                { chats: [], hasNext: false, nextCursor: null },
              ];
            },
          );

          const topicsByTeamId = Object.fromEntries(topicEntries);
          const chatsByTeamId = Object.fromEntries(chatEntries);
          regularInfo = mapMeetingToRegularMeetingInfo(
            book,
            effectiveMeeting,
            topicsByTeamId,
            chatsByTeamId,
            currentMemberNickname,
          );
        }

        if (!regularInfo || regularInfo.groups.length === 0) {
          try {
            const meetingMembersResponse =
              meetingMembersFallback ??
              (await fetchClubMeetingMembers(clubId, regularMeetingId, {
                suppressErrorToast: true,
              }));
            const fallbackMeeting: ClubMeetingInfo = {
              meetingId: regularMeetingId,
              title:
                meeting?.title ?? richDetail?.title ?? book.regularMeetingName ?? `${book.title} 정기모임`,
              meetingTime: meeting?.meetingTime ?? richDetail?.meetingTime,
              location: meeting?.location ?? richDetail?.location,
              teams:
                meetingMembersResponse.teams.length > 0
                  ? meetingMembersResponse.teams
                  : meeting?.teams ?? [],
              members:
                meetingMembersResponse.members.length > 0
                  ? meetingMembersResponse.members
                  : meeting?.members ?? [],
              isStaff: meeting?.isStaff ?? canManageClub,
            };
            const fallbackRegularInfo = mapMeetingToRegularMeetingInfo(
              book,
              fallbackMeeting,
              {},
              {},
              currentMemberNickname,
            );
            if (fallbackRegularInfo?.groups.length) {
              regularInfo = fallbackRegularInfo;
            }
          } catch (fallbackError) {
            if (fallbackError instanceof ApiError && fallbackError.status === 401) {
              throw fallbackError;
            }
          }
        }

        const nextRegularInfo = ensureRegularMeetingInfo(regularInfo, book, richDetail);
        setRegularMeetingInfoByMeetingId((prev) => ({
          ...prev,
          [meetingId]: nextRegularInfo,
        }));

        if (!meeting && meetingFetchSucceeded && nextRegularInfo.groups.length === 0) {
          logMeetingAction('regularMeetingFallbackSummaryOnly', {
            clubId,
            meetingId: regularMeetingId,
          });
        }
      } catch (error) {
        if (isStale()) return;
        if (error instanceof ApiError) {
          if (error.status === 401) {
            handleAuthExpired({ suppressToast: options?.suppressErrorToast });
          }
          return;
        }
        if (!options?.suppressErrorToast) {
          showToast('책장 상세를 불러오지 못했습니다.');
        }
      }
    },
    [
      canManageClub,
      fetchClubMeetingMembers,
      fetchAllBookshelfReviewsForMeeting,
      fetchAllMeetingTeamChats,
      fetchAllMeetingTeamTopics,
      currentMemberNickname,
      group.clubId,
      handleAuthExpired,
    ],
  );

  useEffect(() => {
    if (activeTab !== 'bookshelf' || bookshelfViewMode === 'GRID') return;
    if (!selectedBookshelfBook || typeof selectedBookshelfBook.remoteMeetingId !== 'number') return;
    const selectedBook = selectedBookshelfBook;
    let cancelled = false;

    const loadBookshelfDetailData = async () => {
      setLoadingBookshelfDetail(true);
      try {
        await reloadBookshelfMeetingDetail(selectedBook, {
          suppressErrorToast: true,
        });
      } finally {
        if (!cancelled) setLoadingBookshelfDetail(false);
      }
    };

    void loadBookshelfDetailData();

    return () => {
      cancelled = true;
    };
  }, [
    activeTab,
    bookshelfViewMode,
    reloadBookshelfMeetingDetail,
    selectedBookshelfBook?.id,
    selectedBookshelfBook?.remoteMeetingId,
  ]);

  const bookshelfTopicItems = useMemo<BookshelfPostItem[]>(
    () => {
      const remoteMeetingId = selectedBookshelfBook?.remoteMeetingId;
      if (remoteMeetingId && bookshelfTopicsByMeetingId[remoteMeetingId]) {
        return sortBookshelfPostsByLatest(bookshelfTopicsByMeetingId[remoteMeetingId]);
      }
      return [];
    },
    [bookshelfTopicsByMeetingId, selectedBookshelfBook?.remoteMeetingId],
  );

  const bookshelfReviewItems = useMemo<BookshelfPostItem[]>(
    () => {
      const remoteMeetingId = selectedBookshelfBook?.remoteMeetingId;
      if (remoteMeetingId && bookshelfReviewsByMeetingId[remoteMeetingId]) {
        return sortBookshelfPostsByLatest(bookshelfReviewsByMeetingId[remoteMeetingId]);
      }
      return [];
    },
    [bookshelfReviewsByMeetingId, selectedBookshelfBook?.remoteMeetingId],
  );

  const currentBookshelfTopicPageState = useMemo<CursorPageState | null>(() => {
    const remoteMeetingId = selectedBookshelfBook?.remoteMeetingId;
    if (typeof remoteMeetingId !== 'number') return null;
    return bookshelfTopicPageStateByMeetingId[remoteMeetingId] ?? null;
  }, [bookshelfTopicPageStateByMeetingId, selectedBookshelfBook?.remoteMeetingId]);

  const canSubmitBookshelfComposer =
    bookshelfComposerInput.trim().length > 0 &&
    (bookshelfComposerType !== 'REVIEW' || bookshelfComposerRating >= 0.5);

  const baseRegularMeetingInfo = useMemo<RegularMeetingInfo | null>(
    () => {
      const remoteMeetingId = selectedBookshelfBook?.remoteMeetingId;
      if (remoteMeetingId && regularMeetingInfoByMeetingId[remoteMeetingId]) {
        return regularMeetingInfoByMeetingId[remoteMeetingId];
      }
      return null;
    },
    [regularMeetingInfoByMeetingId, selectedBookshelfBook?.remoteMeetingId],
  );

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

    setRegularGroupChatMessagesById((prev) => {
      const next = { ...prev };
      let changed = false;

      baseRegularMeetingInfo.groups.forEach((groupItem) => {
        const currentMessages = next[groupItem.id];
        if (!currentMessages) {
          next[groupItem.id] = groupItem.chatMessages;
          changed = true;
          return;
        }

        if (!areRegularGroupChatMessagesEqual(currentMessages, groupItem.chatMessages)) {
          next[groupItem.id] = groupItem.chatMessages;
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
        chatMessages: regularGroupChatMessagesById[groupItem.id] ?? groupItem.chatMessages,
      })),
    };
  }, [baseRegularMeetingInfo, regularGroupChatMessagesById, regularGroupPostsById]);

  const selectedRegularGroup = useMemo(() => {
    if (!regularMeetingInfo || !selectedRegularGroupId) return null;
    return (
      regularMeetingInfo.groups.find((groupItem) => groupItem.id === selectedRegularGroupId) ?? null
    );
  }, [regularMeetingInfo, selectedRegularGroupId]);

  const activeRegularChatGroup = useMemo(() => {
    if (!regularMeetingInfo || !activeRegularChatGroupId) return null;
    return (
      regularMeetingInfo.groups.find((groupItem) => groupItem.id === activeRegularChatGroupId) ?? null
    );
  }, [activeRegularChatGroupId, regularMeetingInfo]);

  const activeRegularChatGroupIdRef = useRef(activeRegularChatGroupId);
  useEffect(() => {
    activeRegularChatGroupIdRef.current = activeRegularChatGroupId;
  });
  const currentMemberNicknameRef = useRef(currentMemberNickname);
  useEffect(() => {
    currentMemberNicknameRef.current = currentMemberNickname;
  });

  const { isConnected: isChatConnected, publish: publishChatToStomp } = useMeetingChatStomp({
    clubId: group.clubId,
    meetingId: selectedRegularMeetingId,
    teamId: activeRegularChatGroup?.teamId,
    enabled: Boolean(activeRegularChatGroup),
    onMessage: (event) => {
      const groupId = activeRegularChatGroupIdRef.current;
      if (!groupId) return;
      const message = mapMeetingChatMessageToUi(
        {
          messageId: event.messageId,
          content: event.content,
          sendAt: event.sendAt,
          senderNickname: event.senderNickname,
          senderProfileImageUrl: event.senderProfileImageUrl ?? undefined,
        },
        currentMemberNicknameRef.current,
      );
      setRegularGroupChatMessagesById((prev) => {
        const currentMessages = prev[groupId] ?? [];
        if (currentMessages.some((item) => item.id === message.id)) {
          return prev;
        }
        return {
          ...prev,
          [groupId]: [...currentMessages, message],
        };
      });
    },
  });

  const selectedNotice = useMemo(
    () => noticeItems.find((item) => item.id === selectedNoticeId) ?? null,
    [noticeItems, selectedNoticeId],
  );

  const currentNoticeComments = useMemo(() => {
    if (!selectedNotice) return [];
    return noticeCommentsById[selectedNotice.id] ?? [];
  }, [noticeCommentsById, selectedNotice]);

  const currentNoticePollOptions = useMemo(() => {
    if (!selectedNotice?.poll) return [];
    return noticePollOptionsById[selectedNotice.id] ?? selectedNotice.poll.options;
  }, [noticePollOptionsById, selectedNotice]);

  const hasSubmittedVoteInNotice = useMemo(() => {
    if (!selectedNotice) return false;
    return (submittedVoteOptionIdsByNotice[selectedNotice.id] ?? []).length > 0;
  }, [selectedNotice, submittedVoteOptionIdsByNotice]);
  const voteEditEnabled = useMemo(() => {
    if (!selectedNotice) return false;
    return Boolean(voteEditEnabledByNotice[selectedNotice.id]);
  }, [selectedNotice, voteEditEnabledByNotice]);

  const loadMoreBookshelfTopics = useCallback(
    async (meetingId: number) => {
      const clubId = group.clubId;
      if (typeof clubId !== 'number') return;

      const pageState = bookshelfTopicPageStateByMeetingId[meetingId];
      if (
        !pageState ||
        pageState.loadingMore ||
        !pageState.hasNext ||
        typeof pageState.nextCursor !== 'number'
      ) {
        return;
      }

      setBookshelfTopicPageStateByMeetingId((prev) => ({
        ...prev,
        [meetingId]: {
          ...pageState,
          loadingMore: true,
        },
      }));

      try {
        const response = await fetchClubBookshelfTopics(clubId, meetingId, pageState.nextCursor, {
          suppressErrorToast: true,
        });

        setBookshelfTopicsByMeetingId((prev) => {
          const currentItems = prev[meetingId] ?? [];
          const appended = response.items.map(mapBookshelfTopicToPostItem);
          const seen = new Set(currentItems.map((item) => item.id));
          const merged = [
            ...currentItems,
            ...appended.filter((item) => !seen.has(item.id)),
          ];

          return {
            ...prev,
            [meetingId]: merged,
          };
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
          [meetingId]: {
            ...pageState,
            loadingMore: false,
          },
        }));
        if (!(error instanceof ApiError)) {
          showToast('발제를 추가로 불러오지 못했습니다.');
        }
      }
    },
    [bookshelfTopicPageStateByMeetingId, group.clubId],
  );

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
        [noticeKey]: {
          ...pageState,
          loadingMore: true,
        },
      }));

      try {
        const comments = await fetchClubNoticeComments(clubId, noticeId, pageState.nextCursor);
        const mappedItems = comments.items.map(mapNoticeCommentItemToUi);

        setNoticeCommentsById((prev) => {
          const currentItems = prev[noticeKey] ?? [];
          const seen = new Set(currentItems.map((item) => item.id));
          const merged = [
            ...currentItems,
            ...mappedItems.filter((item) => !seen.has(item.id)),
          ];

          return {
            ...prev,
            [noticeKey]: merged,
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
          [noticeKey]: {
            ...pageState,
            loadingMore: false,
          },
        }));
        if (error instanceof ApiError) {
          if (error.status === 403) {
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

  const handleGroupHomeScroll = useCallback(
    (event: NativeSyntheticEvent<NativeScrollEvent>) => {
      const { layoutMeasurement, contentOffset, contentSize } = event.nativeEvent;
      const distanceFromBottom = contentSize.height - (layoutMeasurement.height + contentOffset.y);
      if (distanceFromBottom > 180) return;

      if (
        activeTab === 'bookshelf' &&
        bookshelfViewMode === 'DETAIL' &&
        bookshelfDetailTab === 'TOPIC' &&
        typeof selectedBookshelfBook?.remoteMeetingId === 'number'
      ) {
        void loadMoreBookshelfTopics(selectedBookshelfBook.remoteMeetingId);
      }

      if (activeTab === 'notice' && selectedNotice) {
        void loadMoreNoticeComments(selectedNotice);
      }
    },
    [
      activeTab,
      bookshelfDetailTab,
      bookshelfViewMode,
      loadMoreBookshelfTopics,
      loadMoreNoticeComments,
      selectedBookshelfBook?.remoteMeetingId,
      selectedNotice,
    ],
  );

  useEffect(() => {
    hasFocusedGroupTitleRef.current = false;
  }, [group.id]);

  const focusGroupTitle = useCallback((animated: boolean) => {
    const targetY = Math.max(0, groupTitleAnchorYRef.current - spacing.xs);
    requestAnimationFrame(() => {
      groupHomeScrollRef.current?.scrollTo({ y: targetY, animated });
    });
  }, []);

  const handleGroupTitleLayout = useCallback((event: LayoutChangeEvent) => {
    groupTitleAnchorYRef.current = event.nativeEvent.layout.y;
    if (hasFocusedGroupTitleRef.current) return;

    focusGroupTitle(false);
    hasFocusedGroupTitleRef.current = true;
  }, [focusGroupTitle]);

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

  const handlePressTopNotice = useCallback(() => {
    if (!managedGroup.notice?.trim()) return;
    setShouldOpenTopNotice(true);
    setActiveTab('notice');
  }, [managedGroup.notice]);

  useEffect(() => {
    setNoticePage(1);
    setSelectedNoticeId(null);
    setNoticeCommentInput('');
    setVoteVotersModal(null);
    setSelectedBookshelfSession('');
    setBookshelfViewMode('GRID');
    setBookshelfDetailTab('TOPIC');
    setSelectedBookshelfBookId(null);
    setSelectedRegularGroupId(null);
    setRegularChatPickerVisible(false);
    setActiveRegularChatGroupId(null);
    setRegularChatInput('');
  }, [group.id]);

  useEffect(() => {
    if (!shouldOpenTopNotice || activeTab !== 'notice') return;

    setShouldOpenTopNotice(false);
    void handleOpenNoticeDetailByRemoteId(latestNoticeId);
  }, [activeTab, handleOpenNoticeDetailByRemoteId, latestNoticeId, shouldOpenTopNotice]);

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
      regularMeetingInfo.groups.some((groupItem) => groupItem.id === selectedRegularGroupId)
    ) {
      return;
    }

    setSelectedRegularGroupId(regularMeetingInfo.groups[0]?.id ?? null);
  }, [regularMeetingInfo, selectedRegularGroupId]);

  useEffect(() => {
    setRegularGroupMembersVisible(false);
  }, [bookshelfViewMode, selectedRegularGroupId]);

  const tabItems: Array<{
    key: 'home' | 'notice' | 'bookshelf';
    label: string;
    icon: keyof typeof MaterialIcons.glyphMap;
  }> = [
    { key: 'home', label: '모임 홈', icon: 'home' },
    { key: 'notice', label: '공지사항', icon: 'notifications-none' },
    { key: 'bookshelf', label: '책장', icon: 'collections-bookmark' },
  ];

  const handlePressGroupTab = useCallback(
    (nextTab: 'home' | 'notice' | 'bookshelf') => {
      triggerSelectionHaptic();

      if (nextTab === 'home') {
        setActiveTab('home');
        focusGroupTitle(true);
        return;
      }

      const open = () => {
        setActiveTab(nextTab);
        focusGroupTitle(true);
      };

      if (!isLoggedIn) {
        requireAuth(open);
        return;
      }

      open();
    },
    [focusGroupTitle, isLoggedIn, requireAuth],
  );

  const renderNoticeTag = (tag: NoticeTag, key: string) => {
    if (tag === 'PIN') {
      return (
        <View key={key} style={[styles.noticeTag, styles.noticeTagPin]}>
          <MaterialIcons name="push-pin" size={12} color={colors.white} />
        </View>
      );
    }

    if (tag === 'VOTE') {
      return (
        <View key={key} style={[styles.noticeTag, styles.noticeTagVote]}>
          <Text style={styles.noticeTagText}>투표</Text>
        </View>
      );
    }

    return (
      <View key={key} style={[styles.noticeTag, styles.noticeTagMeeting]}>
        <Text style={styles.noticeTagText}>모임</Text>
      </View>
    );
  };

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

  const handlePressCommentMenu = useCallback((comment: NoticeComment, event: GestureResponderEvent) => {
    setNoticeCommentMenu({
      comment,
      pageX: event.nativeEvent.pageX,
      pageY: event.nativeEvent.pageY,
    });
  }, []);

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
          initialType: 'CLUB_MEETING',
          allowedTypes: ['CLUB_MEETING'],
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
    ],
  );

  const noticeCommentMenuItems = useMemo<ActionMenuItem[]>(() => {
    if (!noticeCommentMenu) return [];
    if (noticeCommentMenu.comment.mine) {
      return [
        {
          key: 'edit',
          label: '수정하기',
          onPress: () => handleSelectNoticeCommentMenuAction('edit'),
        },
        {
          key: 'delete',
          label: '삭제하기',
          destructive: true,
          onPress: () => handleSelectNoticeCommentMenuAction('delete'),
        },
      ];
    }
    return [
      {
        key: 'report',
        label: '신고하기',
        onPress: () => handleSelectNoticeCommentMenuAction('report'),
      },
    ];
  }, [handleSelectNoticeCommentMenuAction, noticeCommentMenu]);

  const handleCloseReportModal = useCallback(() => {
    if (submittingReport) return;
    setReportModal(null);
  }, [submittingReport]);

  const handlePressReportTarget = useCallback(
    (nickname: string) => {
      const targetNickname = nickname.trim();
      if (!targetNickname || submittingReport) return;
      setReportModal(null);
      navigation.navigate('UserProfile', { memberNickname: targetNickname, fromScreen: 'Meeting' });
    },
    [navigation, submittingReport],
  );

  const handleSubmitReport = useCallback(
    (payload: { reportType: MemberReportType; content?: string }) => {
      if (!reportModal?.nickname) return;
      requireAuth(() => {
        const submit = async () => {
          setSubmittingReport(true);
          try {
            await reportMember({
              reportedMemberNickname: reportModal.nickname,
              reportType: payload.reportType,
              content: payload.content,
            });
            setReportModal(null);
            showToast('신고가 접수되었습니다.');
          } catch (error) {
            if (!(error instanceof ApiError)) {
              showToast('신고 접수에 실패했습니다.');
            }
          } finally {
            setSubmittingReport(false);
          }
        };
        void submit();
      });
    },
    [reportModal, requireAuth],
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
          initialType: 'CLUB_MEETING',
          allowedTypes: ['CLUB_MEETING'],
        });
      };

      void openReportModal();
    });
  }, [group.clubId, requireAuth, selectedNotice]);

  const handleToggleVoteOption = useCallback(
    (optionId: string) => {
      if (!selectedNotice?.poll || selectedNotice.poll.closed) return;
      if (
        selectedNotice.poll.endsAtMillis != null &&
        Date.now() > selectedNotice.poll.endsAtMillis
      ) return;
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

      setVoteVotersModal({
        optionLabel: option.label,
        voters: option.voters,
      });
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
      setVoteEditEnabledByNotice((prev) => ({
        ...prev,
        [noticeKey]: true,
      }));
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
          sortNoticeItems(
            prev.map((item) => (item.id === selectedNotice.id ? merged : item)),
          ),
        );
        setNoticePollOptionsById((prev) => ({
          ...prev,
          [selectedNotice.id]: merged.poll?.options ?? [],
        }));
        setSubmittedVoteOptionIdsByNotice((prev) => ({
          ...prev,
          [noticeKey]: selectedIds,
        }));
        setVoteEditEnabledByNotice((prev) => ({
          ...prev,
          [noticeKey]: false,
        }));
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

  const getBookshelfCategoryBadgeStyle = useCallback((category: string) => {
    switch (category) {
      case '자기계발':
        return styles.bookshelfCategoryBlue;
      case '정치/외교/국방':
        return styles.bookshelfCategoryPurple;
      case '어린이/청소년':
        return styles.bookshelfCategoryOrange;
      case '사회과학':
        return styles.bookshelfCategoryTeal;
      default:
        return styles.bookshelfCategoryPink;
    }
  }, []);

  const openBookshelfDetail = useCallback(
    (book: BookshelfItem, tab: BookshelfDetailTab) => {
      const open = () => {
        shouldScrollToBookshelfDetailRef.current = true;
        setSelectedBookshelfBookId(book.id);
        setBookshelfDetailTab(tab);
        setSelectedRegularGroupId(null);
        setBookshelfViewMode('DETAIL');
      };

      if (tab === 'REGULAR' && !isLoggedIn) {
        requireAuth(open);
        return;
      }

      open();
    },
    [isLoggedIn, requireAuth],
  );

  const openBookshelfTopicByMeetingId = useCallback(
    async (meetingId: number) => {
      const clubId = group.clubId;
      if (typeof clubId !== 'number') {
        return false;
      }

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

      if (!targetBook) {
        return false;
      }

      setActiveTab('bookshelf');
      setSelectedBookshelfSession(targetBook.session);
      openBookshelfDetail(targetBook, 'TOPIC');
      return true;
    },
    [bookshelfItems, group.clubId, openBookshelfDetail],
  );

  const handleOpenNextMeeting = useCallback(() => {
    const clubId = group.clubId;
    if (typeof clubId !== 'number' || openingNextMeeting) return;

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
        if (!opened) {
          showToast('이번 모임 정보를 찾을 수 없습니다.');
        }
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
  }, [group.clubId, openBookshelfTopicByMeetingId, openingNextMeeting]);

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
        setBookshelfComposerRating(type === 'REVIEW' ? post?.rating ?? 0 : 0);
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
            await updateClubBookshelfTopic(clubId, meetingId, editingBookshelfPost.remoteId, {
              description,
            });
          } else {
            await createClubBookshelfTopic(clubId, meetingId, { description });
          }

          await refreshBookshelfPostsByType(clubId, meetingId, 'TOPIC');
          if (selectedBookshelfBook) {
            await reloadBookshelfMeetingDetail(selectedBookshelfBook, {
              suppressErrorToast: true,
            });
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

        logMeetingAction('bookshelf_post_submit_success', {
          clubId,
          meetingId,
          postType: bookshelfComposerType,
          mode: isEditing ? 'edit' : 'create',
        });

        setEditingBookshelfPost(null);
        setBookshelfComposerType(null);
        setBookshelfComposerInput('');
        setBookshelfComposerRating(0);
      } catch (error) {
        logMeetingAction('bookshelf_post_submit_failure', {
          clubId,
          meetingId,
          postType: bookshelfComposerType,
          mode: editingBookshelfPost ? 'edit' : 'create',
          message: error instanceof Error ? error.message : String(error),
        });
        showToast(
          resolveBookshelfActionErrorMessage(
            error,
            bookshelfComposerType === 'TOPIC'
              ? editingBookshelfPost
                ? '발제 수정에 실패했습니다.'
                : '발제 등록에 실패했습니다.'
              : editingBookshelfPost
                ? '한줄평 수정에 실패했습니다.'
                : '한줄평 등록에 실패했습니다.',
          ),
        );
      } finally {
        setSubmittingBookshelfComposer(false);
      }
    };

    void submit();
  }, [
    editingBookshelfPost,
    bookshelfComposerInput,
    bookshelfComposerRating,
    bookshelfComposerType,
    group.clubId,
    reloadBookshelfMeetingDetail,
    refreshBookshelfPostsByType,
    selectedBookshelfBook,
    selectedBookshelfBook?.remoteMeetingId,
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
        setReportModal({
          nickname: post.author,
          initialType: 'CLUB_MEETING',
          allowedTypes: ['CLUB_MEETING'],
        });
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
      ) {
        return;
      }

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
              setSubmittingBookshelfComposer(true);

              try {
                if (post.type === 'TOPIC') {
                  await deleteClubBookshelfTopic(clubId, meetingId, post.remoteId);
                } else {
                  await deleteClubBookshelfReview(clubId, meetingId, post.remoteId);
                }

                await refreshBookshelfPostsByType(clubId, meetingId, post.type);

                if (editingBookshelfPost?.id === post.id) {
                  setEditingBookshelfPost(null);
                  setBookshelfComposerType(null);
                  setBookshelfComposerInput('');
                  setBookshelfComposerRating(0);
                }

                showToast(`${postLabel}가 삭제되었습니다.`);
              } catch (error) {
                showToast(resolveBookshelfActionErrorMessage(error, `${postLabel} 삭제에 실패했습니다.`));
              } finally {
                setSubmittingBookshelfComposer(false);
              }
            };

            void remove();
          },
        },
      ]);
    },
    [
      bookshelfPostMenu,
      editingBookshelfPost?.id,
      group.clubId,
      handleOpenBookshelfComposer,
      refreshBookshelfPostsByType,
      selectedBookshelfBook?.remoteMeetingId,
    ],
  );

  const bookshelfPostMenuItems = useMemo<ActionMenuItem[]>(() => {
    const post = bookshelfPostMenu?.post;
    if (!post) return [];
    if (!post.isAuthor) {
      return [
        {
          key: 'report',
          label: '신고하기',
          onPress: () => handleSelectBookshelfPostMenuAction('report'),
        },
      ];
    }
    return [
      {
        key: 'edit',
        label: '수정하기',
        onPress: () => handleSelectBookshelfPostMenuAction('edit'),
      },
      {
        key: 'delete',
        label: '삭제하기',
        destructive: true,
        onPress: () => handleSelectBookshelfPostMenuAction('delete'),
      },
    ];
  }, [bookshelfPostMenu, handleSelectBookshelfPostMenuAction]);

  const closeTeamManage = useCallback(() => {
    if (teamManageSaving) return;
    setTeamManageVisible(false);
    setTeamManageSelectedMemberId(null);
    setDraggingTeamMemberId(null);
    setDraggingTeamMemberPosition(null);
    setTeamManageDropLayouts({});
    dragStartRef.current = null;
    if (dragAutoScrollFrameRef.current !== null) {
      cancelAnimationFrame(dragAutoScrollFrameRef.current);
      dragAutoScrollFrameRef.current = null;
    }
    teamManageScrollBoundsRef.current = null;
    teamManageScrollOffsetRef.current = 0;
  }, [teamManageSaving]);

  const refreshTeamManageDropLayouts = useCallback(() => {
    if (!teamManageVisible) return;
    const entries = Object.entries(teamManageDropRefs.current).filter(([, node]) => Boolean(node));
    if (entries.length === 0) {
      setTeamManageDropLayouts({});
      return;
    }

    requestAnimationFrame(() => {
      const nextLayouts: Record<string, { x: number; y: number; width: number; height: number }> = {};
      let measuredCount = 0;

      entries.forEach(([key, node]) => {
        node?.measureInWindow((x, y, width, height) => {
          nextLayouts[key] = { x, y, width, height };
          measuredCount += 1;
          if (measuredCount === entries.length) {
            setTeamManageDropLayouts(nextLayouts);
          }
        });
      });
    });
  }, [teamManageVisible]);

  const moveTeamManageMemberToTarget = useCallback(
    (memberId: number, targetTeamNumber: number | null) => {
      setTeamManageTeams((prev) => {
        const removed = prev.map((team) => ({
          ...team,
          memberIds: team.memberIds.filter((id) => id !== memberId),
        }));

        if (targetTeamNumber === null) {
          return removed;
        }

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

  const findTeamManageDropTarget = useCallback(
    (pageX: number, pageY: number) => {
      const matchedEntry = Object.entries(teamManageDropLayouts).find(([, layout]) => {
        return (
          pageX >= layout.x &&
          pageX <= layout.x + layout.width &&
          pageY >= layout.y &&
          pageY <= layout.y + layout.height
        );
      });

      if (!matchedEntry) return undefined;

      const [key] = matchedEntry;
      if (key === getTeamManageTargetKey(null)) {
        return null;
      }

      const teamNumber = Number(key.replace('team-', ''));
      return Number.isFinite(teamNumber) ? teamNumber : undefined;
    },
    [teamManageDropLayouts],
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
        const meetingMembers = meetingMembersResponse.members;

        meetingMembers.forEach((member) => {
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
            ...meetingMembers
              .map((member) => member.teamNumber)
              .filter((teamNumber): teamNumber is number => typeof teamNumber === 'number'),
          ]),
        )
          .filter((teamNumber) => teamNumber >= 1 && teamNumber <= MAX_REGULAR_GROUP_COUNT)
          .sort((a, b) => a - b);

        const nextTeams = teamNumbers.map((teamNumber) => ({
          teamNumber,
          memberIds: meetingMembers
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
        setTimeout(refreshTeamManageDropLayouts, 0);
      }
    };

    void open();
  }, [canManageClub, group.clubId, refreshTeamManageDropLayouts, selectedRegularMeetingId]);

  const handleAddTeamManageTeam = useCallback(() => {
    setTeamManageTeams((prev) => {
      if (prev.length >= MAX_REGULAR_GROUP_COUNT) {
        showToast('조는 최대 10개까지 만들 수 있습니다.');
        return prev;
      }

      const usedNumbers = new Set(prev.map((team) => team.teamNumber));
      const nextTeamNumber = Array.from({ length: MAX_REGULAR_GROUP_COUNT }, (_, index) => index + 1).find(
        (teamNumber) => !usedNumbers.has(teamNumber),
      );

      if (!nextTeamNumber) return prev;

      return [...prev, { teamNumber: nextTeamNumber, memberIds: [] }].sort(
        (a, b) => a.teamNumber - b.teamNumber,
      );
    });
    setTimeout(refreshTeamManageDropLayouts, 0);
  }, [refreshTeamManageDropLayouts]);

  const handleRemoveTeamManageTeam = useCallback((teamNumber: number) => {
    setTeamManageTeams((prev) => {
      if (prev.length <= 1) {
        showToast('최소 한 개의 조는 필요합니다.');
        return prev;
      }

      return prev.filter((team) => team.teamNumber !== teamNumber);
    });
    setTimeout(refreshTeamManageDropLayouts, 0);
  }, [refreshTeamManageDropLayouts]);

  const handlePressTeamManageTarget = useCallback(
    (teamNumber: number | null) => {
      if (teamManageSelectedMemberId === null) return;
      moveTeamManageMemberToTarget(teamManageSelectedMemberId, teamNumber);
    },
    [moveTeamManageMemberToTarget, teamManageSelectedMemberId],
  );

  const stopDragAutoScroll = useCallback(() => {
    if (dragAutoScrollFrameRef.current !== null) {
      cancelAnimationFrame(dragAutoScrollFrameRef.current);
      dragAutoScrollFrameRef.current = null;
    }
  }, []);

  const startDragAutoScroll = useCallback(() => {
    if (dragAutoScrollFrameRef.current !== null) return;
    const ZONE = 80;
    const MAX_SPEED = 10;
    const tick = () => {
      const bounds = teamManageScrollBoundsRef.current;
      const scrollRef = teamManageScrollRef.current;
      if (!bounds || !scrollRef) {
        dragAutoScrollFrameRef.current = null;
        return;
      }
      const pageY = dragCurrentPageYRef.current;
      if (pageY < bounds.top + ZONE) {
        const ratio = Math.max(0, 1 - (pageY - bounds.top) / ZONE);
        teamManageScrollOffsetRef.current = Math.max(0, teamManageScrollOffsetRef.current - MAX_SPEED * ratio);
        scrollRef.scrollTo({ y: teamManageScrollOffsetRef.current, animated: false });
        dragAutoScrollFrameRef.current = requestAnimationFrame(tick);
      } else if (pageY > bounds.bottom - ZONE) {
        const ratio = Math.max(0, (pageY - (bounds.bottom - ZONE)) / ZONE);
        teamManageScrollOffsetRef.current += MAX_SPEED * ratio;
        scrollRef.scrollTo({ y: teamManageScrollOffsetRef.current, animated: false });
        dragAutoScrollFrameRef.current = requestAnimationFrame(tick);
      } else {
        dragAutoScrollFrameRef.current = null;
      }
    };
    dragAutoScrollFrameRef.current = requestAnimationFrame(tick);
  }, []);

  const finishTeamManageDrag = useCallback(
    (pageX: number, pageY: number) => {
      const dragState = dragStartRef.current;
      if (!dragState) return;

      const targetTeamNumber = findTeamManageDropTarget(pageX, pageY);
      if (dragState.moved) {
        if (typeof targetTeamNumber !== 'undefined') {
          moveTeamManageMemberToTarget(dragState.memberId, targetTeamNumber);
        }
      } else {
        setTeamManageSelectedMemberId((prev) =>
          prev === dragState.memberId ? null : dragState.memberId,
        );
      }

      stopDragAutoScroll();
      dragStartRef.current = null;
      setDraggingTeamMemberId(null);
      setDraggingTeamMemberPosition(null);
    },
    [findTeamManageDropTarget, moveTeamManageMemberToTarget, stopDragAutoScroll],
  );

  const handleTeamManageMemberGrant = useCallback(
    (memberId: number, event: GestureResponderEvent) => {
      dragStartRef.current = {
        memberId,
        pageX: event.nativeEvent.pageX,
        pageY: event.nativeEvent.pageY,
        moved: false,
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
      if (dx > 6 || dy > 6) {
        dragState.moved = true;
      }

      const { pageX, pageY } = event.nativeEvent;
      dragCurrentPageYRef.current = pageY;
      setDraggingTeamMemberPosition({ x: pageX, y: pageY });

      if (dragState.moved) {
        const bounds = teamManageScrollBoundsRef.current;
        if (bounds && (pageY < bounds.top + 80 || pageY > bounds.bottom - 80)) {
          startDragAutoScroll();
        } else {
          stopDragAutoScroll();
        }
      }
    },
    [startDragAutoScroll, stopDragAutoScroll],
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

    if (
      typeof clubId !== 'number' ||
      typeof meetingId !== 'number' ||
      !selectedBook
    ) {
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
        await reloadBookshelfMeetingDetail(selectedBook, {
          suppressErrorToast: true,
        });

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

  useEffect(() => {
    if (!teamManageVisible) return;
    refreshTeamManageDropLayouts();
  }, [refreshTeamManageDropLayouts, teamManageTeams, teamManageVisible]);

  const handleBackToBookshelfGrid = useCallback(() => {
    setBookshelfViewMode('GRID');
    setSelectedRegularGroupId(null);
  }, []);

  const handleChangeBookshelfTab = useCallback(
    (tab: BookshelfDetailTab) => {
      triggerSelectionHaptic();

      const change = () => {
        setBookshelfDetailTab(tab);
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
    [isLoggedIn, requireAuth],
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
    setRegularGroupPostsById((prev) => {
      const current = prev[groupId];
      if (!current) return prev;

      return {
        ...prev,
        [groupId]: current.map((post) =>
          post.id === postId ? { ...post, completed: !post.completed } : post,
        ),
      };
    });
  }, []);

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

  const refreshRegularChatGroupMessages = useCallback(
    async (
      groupItem: RegularMeetingGroupItem,
      options?: { suppressErrorToast?: boolean },
    ) => {
      const clubId = group.clubId;
      const meetingId = selectedRegularMeetingId;
      const teamId = groupItem.teamId;

      if (
        typeof clubId !== 'number' ||
        typeof meetingId !== 'number' ||
        typeof teamId !== 'number'
      ) {
        return;
      }

      const history = await fetchAllMeetingTeamChats(clubId, meetingId, teamId, {
        suppressErrorToast: options?.suppressErrorToast,
      });
      const nextMessages = history.chats.map((item) =>
        mapMeetingChatMessageToUi(item, currentMemberNickname),
      );

      setRegularGroupChatMessagesById((prev) => {
        const currentMessages = prev[groupItem.id] ?? [];
        if (areRegularGroupChatMessagesEqual(currentMessages, nextMessages)) {
          return prev;
        }
        return {
          ...prev,
          [groupItem.id]: nextMessages,
        };
      });
    },
    [
      currentMemberNickname,
      fetchAllMeetingTeamChats,
      group.clubId,
      selectedRegularMeetingId,
    ],
  );

  const handleOpenRegularChatPicker = useCallback(() => {
    setRegularChatPickerVisible(true);
    setActiveRegularChatGroupId(null);
    setRegularChatInput('');
  }, []);

  const handleSelectRegularChatGroup = useCallback((groupId: string) => {
    const groupItem = regularMeetingInfo?.groups.find((item) => item.id === groupId);
    triggerSelectionHaptic();
    setActiveRegularChatGroupId(groupId);
    setRegularChatPickerVisible(false);
    setRegularChatInput('');
    if (groupItem) {
      void refreshRegularChatGroupMessages(groupItem, { suppressErrorToast: true });
    }
  }, [refreshRegularChatGroupMessages, regularMeetingInfo]);

  const handleBackToRegularChatPicker = useCallback(() => {
    setActiveRegularChatGroupId(null);
    setRegularChatPickerVisible(true);
    setRegularChatInput('');
  }, []);

  const handleCloseRegularChat = useCallback(() => {
    setRegularChatPickerVisible(false);
    setActiveRegularChatGroupId(null);
    setRegularChatInput('');
  }, []);

  const handleCloseRegularChatRef = useRef(handleCloseRegularChat);
  useEffect(() => { handleCloseRegularChatRef.current = handleCloseRegularChat; });

  const CHAT_SWIPE_START_X = 30;
  const CHAT_SWIPE_START_DX = 8;
  const CHAT_SWIPE_DISMISS_DISTANCE = 60;
  const CHAT_SWIPE_DISMISS_VELOCITY = 0.5;
  const chatSwipePanResponder = useRef(
    PanResponder.create({
      onMoveShouldSetPanResponder: (evt, gestureState) => {
        return evt.nativeEvent.pageX < CHAT_SWIPE_START_X && gestureState.dx > CHAT_SWIPE_START_DX && Math.abs(gestureState.dy) < Math.abs(gestureState.dx);
      },
      onPanResponderRelease: (_evt, gestureState) => {
        if (gestureState.dx > CHAT_SWIPE_DISMISS_DISTANCE || gestureState.vx > CHAT_SWIPE_DISMISS_VELOCITY) {
          handleCloseRegularChatRef.current();
        }
      },
    }),
  ).current;

  useEffect(() => {
    if (activeRegularChatGroupId) {
      setTimeout(() => chatScrollRef.current?.scrollToEnd({ animated: false }), 50);
    }
  }, [activeRegularChatGroupId, activeRegularChatGroup?.chatMessages]);

  const handleSubmitRegularChat = useCallback(() => {
    const content = regularChatInput.trim();
    if (!activeRegularChatGroup || !content || submittingRegularChat) return;

    if (!isChatConnected) {
      showToast('채팅 서버에 연결 중입니다. 잠시 후 다시 시도해 주십시오.');
      return;
    }

    triggerSelectionHaptic();
    setSubmittingRegularChat(true);
    try {
      publishChatToStomp(content);
      setRegularChatInput('');
    } catch {
      showToast('채팅 전송에 실패했습니다.');
    } finally {
      setSubmittingRegularChat(false);
    }
  }, [
    activeRegularChatGroup,
    isChatConnected,
    publishChatToStomp,
    regularChatInput,
    submittingRegularChat,
  ]);

  const runAfterClosingManagementMenu = useCallback(
    (callback: () => void) => {
      closeManagementMenu();
      callback();
    },
    [closeManagementMenu],
  );

  const handleOpenManagementScreen = useCallback((screen: GroupManagementScreen) => {
    runAfterClosingManagementMenu(() => {
      setActiveManagementScreen(screen);
      setSelectedJoinRequestActionId(null);
      setSelectedJoinRequestMessage(null);
      setSelectedMemberActionId(null);
      if (screen === 'BOOKSHELF_CREATE') {
        setEditingBookshelfMeetingId(null);
        setBookshelfCreateDraft(
          buildBookshelfCreateDraft(String(parseGenerationNumber(bookshelfSessions[0]) ?? 1)),
        );
        closeBookshelfBookSelector();
        closeBookshelfCalendar();
      }
    });
  }, [bookshelfSessions, closeBookshelfBookSelector, closeBookshelfCalendar, runAfterClosingManagementMenu]);

  const handleCloseManagementScreen = useCallback(() => {
    setActiveManagementScreen(null);
    setSelectedJoinRequestActionId(null);
    setSelectedJoinRequestMessage(null);
    setSelectedMemberActionId(null);
    setEditingBookshelfMeetingId(null);
    closeBookshelfBookSelector();
    closeBookshelfCalendar();
  }, [closeBookshelfBookSelector, closeBookshelfCalendar]);
  const handleCloseManagementLayer = useCallback(() => {
    if (bookshelfBookSelectorVisible) {
      closeBookshelfBookSelector();
      return;
    }
    if (activeManagementScreen) {
      handleCloseManagementScreen();
      return;
    }
    closeManagementMenu();
  }, [
    activeManagementScreen,
    bookshelfBookSelectorVisible,
    closeBookshelfBookSelector,
    closeManagementMenu,
    handleCloseManagementScreen,
  ]);

  const handleOpenBookshelfEdit = useCallback(() => {
    const clubId = group.clubId;
    const meetingId = selectedBookshelfBook?.remoteMeetingId;
    const fallbackBook = selectedBookshelfBook;

    if (!canManageClub || typeof clubId !== 'number' || typeof meetingId !== 'number' || !fallbackBook) {
      showToast('수정할 책장 정보를 찾을 수 없습니다.');
      return;
    }

    const open = async () => {
      try {
        const detail = await fetchClubBookshelfEditInfo(clubId, meetingId);
        if (!detail) {
          showToast('수정할 책장 정보를 찾을 수 없습니다.');
          setActiveManagementScreen(null);
          setEditingBookshelfMeetingId(null);
          return;
        }

        setActiveManagementScreen('BOOKSHELF_CREATE');
        setSelectedJoinRequestActionId(null);
        setSelectedJoinRequestMessage(null);
        setSelectedMemberActionId(null);
        setEditingBookshelfMeetingId(meetingId);
        closeBookshelfBookSelector();
        closeBookshelfCalendar();
        setBookshelfCreateDraft({
          sourceBook: {
            isbn: (detail.book.bookId ?? fallbackBook.bookId ?? '').trim(),
            title: detail.book.title ?? fallbackBook.title,
            author: detail.book.author ?? fallbackBook.author,
            coverImage: detail.book.imgUrl ?? fallbackBook.coverImage,
            publisher: detail.book.publisher,
            description: detail.book.description,
          },
          session: String(
            detail.generation ??
              parseGenerationNumber(fallbackBook.session) ??
              1,
          ),
          categories: detail.tag?.trim() ? [detail.tag.trim()] : [],
          regularMeetingName:
            detail.title?.trim() ??
            fallbackBook.regularMeetingName ??
            '',
          meetingLocation:
            detail.location?.trim() ??
            fallbackBook.meetingLocation ??
            '',
          meetingDate: formatDotDate(detail.meetingTime),
        });
      } catch (error) {
        showToast(resolveBookshelfActionErrorMessage(error, '책장 수정 정보를 불러오지 못했습니다.'));
        setActiveManagementScreen(null);
        setEditingBookshelfMeetingId(null);
      }
    };

    void open();
  }, [
    canManageClub,
    closeBookshelfBookSelector,
    closeBookshelfCalendar,
    group.clubId,
    selectedBookshelfBook,
  ]);

  const handleDeleteManagedClub = useCallback(() => {
    if (!canManageClub || typeof group.clubId !== 'number') {
      showToast('모임 삭제 기능을 잠시 사용할 수 없습니다. 잠시 후 다시 시도해 주십시오.');
      return;
    }

    const clubId = group.clubId;
    const clubName = managedGroup.name || '모임';

    runAfterClosingManagementMenu(() => {
      Alert.alert('모임 삭제', `'${clubName}' 모임을 삭제하시겠습니까?`, [
        { text: '취소', style: 'cancel' },
        {
          text: '삭제',
          style: 'destructive',
          onPress: () => {
            const submit = async () => {
              try {
                await deleteClub(clubId);
                showToast('모임이 삭제되었습니다.');
                onBack();
              } catch (error) {
                if (!(error instanceof ApiError)) {
                  showToast('모임 삭제에 실패했습니다.');
                }
              }
            };
            void submit();
          },
        },
      ]);
    });
  }, [canManageClub, group.clubId, managedGroup.name, onBack, runAfterClosingManagementMenu]);

  const handleProcessJoinRequest = useCallback((request: GroupJoinRequestItem, action: 'APPROVE' | 'REJECT') => {
    const clubId = group.clubId;
    const clubMemberId = request.clubMemberId;
    if (submittingJoinRequestAction) return;
    if (!canManageClub || typeof clubId !== 'number' || typeof clubMemberId !== 'number') {
      showToast('가입 신청 처리 기능을 잠시 사용할 수 없습니다. 잠시 후 다시 시도해 주십시오.');
      return;
    }

    const process = async () => {
      setSubmittingJoinRequestAction(true);
      try {
        await updateClubMemberStatus(clubId, clubMemberId, {
          command: action === 'APPROVE' ? 'APPROVE' : 'REJECT',
        });
        const [pendingMembers, activeMembers] = await Promise.all([
          fetchClubMembers(clubId, 'PENDING'),
          fetchClubMembers(clubId, 'ACTIVE'),
        ]);
        setJoinRequests(pendingMembers.items.map(mapClubManagedMemberToJoinRequest));
        setMembers(activeMembers.items.map(mapClubManagedMemberToGroupMember));
        setSelectedJoinRequestActionId(null);
        showToast(action === 'APPROVE' ? '가입 신청을 승인했습니다.' : '가입 신청을 삭제했습니다.');
      } catch (error) {
        if (!(error instanceof ApiError)) {
          showToast('가입 신청 처리에 실패했습니다.');
        }
      } finally {
        setSubmittingJoinRequestAction(false);
      }
    };

    void process();
  }, [canManageClub, group.clubId, submittingJoinRequestAction]);

  const handleChangeMemberRole = useCallback((memberId: string, role: GroupMemberRole) => {
    const targetMember = members.find((member) => member.id === memberId);
    const clubId = group.clubId;
    const clubMemberId = targetMember?.clubMemberId;
    if (submittingMemberAction) return;
    if (!canManageClub || typeof clubId !== 'number' || typeof clubMemberId !== 'number') {
      showToast('회원 역할 수정 기능을 잠시 사용할 수 없습니다. 잠시 후 다시 시도해 주십시오.');
      return;
    }
    if (!targetMember || targetMember.role === role) {
      setSelectedMemberActionId(null);
      return;
    }

    const submit = async () => {
      setSubmittingMemberAction(true);
      try {
        if (role === '개설자') {
          await updateClubMemberStatus(clubId, clubMemberId, {
            command: 'TRANSFER_OWNER',
          });
        } else {
          await updateClubMemberStatus(clubId, clubMemberId, {
            command: 'CHANGE_ROLE',
            status: role === '운영진' ? 'STAFF' : 'MEMBER',
          });
        }

        const activeMembers = await fetchClubMembers(clubId, 'ACTIVE');
        setMembers(activeMembers.items.map(mapClubManagedMemberToGroupMember));
        setSelectedMemberActionId(null);
        showToast(`${role} 역할로 변경했습니다.`);
      } catch (error) {
        if (!(error instanceof ApiError)) {
          showToast('회원 역할 수정에 실패했습니다.');
        }
      } finally {
        setSubmittingMemberAction(false);
      }
    };

    if (role === '개설자') {
      Alert.alert(
        '개설자 역할 위임',
        `'${targetMember.nickname}'님에게 개설자 역할을 위임하시겠습니까?`,
        [
          { text: '취소', style: 'cancel' },
          {
            text: '위임하기',
            onPress: () => {
              void submit();
            },
          },
        ],
      );
      return;
    }

    void submit();
  }, [canManageClub, group.clubId, members, submittingMemberAction]);

  const handleRemoveMember = useCallback((memberId: string) => {
    const targetMember = members.find((member) => member.id === memberId);
    const clubId = group.clubId;
    const clubMemberId = targetMember?.clubMemberId;
    if (submittingMemberAction) return;
    if (!canManageClub || typeof clubId !== 'number' || typeof clubMemberId !== 'number') {
      showToast('회원 제외 기능을 잠시 사용할 수 없습니다. 잠시 후 다시 시도해 주십시오.');
      return;
    }
    if (!targetMember || targetMember.role === '개설자') {
      setSelectedMemberActionId(null);
      return;
    }

    Alert.alert('회원 탈퇴', `'${targetMember.nickname}'님을 모임에서 제외하시겠습니까?`, [
      { text: '취소', style: 'cancel' },
      {
        text: '탈퇴 처리',
        style: 'destructive',
        onPress: () => {
          const removeMember = async () => {
            setSubmittingMemberAction(true);
            try {
              await updateClubMemberStatus(clubId, clubMemberId, {
                command: 'KICK',
              });
              const activeMembers = await fetchClubMembers(clubId, 'ACTIVE');
              setMembers(activeMembers.items.map(mapClubManagedMemberToGroupMember));
              setSelectedMemberActionId(null);
              showToast('회원이 모임에서 제외되었습니다.');
            } catch (error) {
              if (!(error instanceof ApiError)) {
                showToast('회원 제외에 실패했습니다.');
              }
            } finally {
              setSubmittingMemberAction(false);
            }
          };

          void removeMember();
        },
      },
    ]);
  }, [canManageClub, group.clubId, members, submittingMemberAction]);

  const handleSaveGroupEdit = useCallback(() => {
    const name = editDraft.name.trim();
    const region = editDraft.region.trim();
    const description = editDraft.description.trim();
    const tags = editDraft.categories;
    const targets = editDraft.targets;

    if (!name || !region || !description || tags.length === 0 || targets.length === 0) {
      showToast('모임 이름, 소개글, 지역, 카테고리, 대상을 입력해야 합니다.');
      return;
    }
    if (!canManageClub) {
      showToast('모임 수정 기능을 잠시 사용할 수 없습니다. 잠시 후 다시 시도해 주십시오.');
      return;
    }

    const save = async () => {
      try {
        await updateClub(group.clubId as number, {
          name,
          description,
          region,
          category: tags
            .map((tag) => categoryCodeByLabel[tag])
            .filter((tag): tag is ClubCategoryCode => Boolean(tag)),
          participantTypes: targets
            .map((target) => participantCodeByLabel[target])
            .filter((target): target is ClubParticipantTypeCode => Boolean(target)),
          open: !editDraft.isPrivate,
          profileImageUrl: editDraft.imageUrl || undefined,
        });
        const detail = await fetchClubDetail(group.clubId as number);
        if (detail) {
          const nextGroup = mapManagedClubDetailToGroup(detail, managedGroup);
          setManagedGroup(nextGroup);
        } else {
          setManagedGroup((prev) => ({
            ...prev,
            name,
            topic: `모임 대상 · ${targets.join(', ')}`,
            region: `활동 지역 · ${region}`,
            description,
            tags,
            isPrivate: editDraft.isPrivate,
            profileImageUrl: editDraft.imageUrl || undefined,
          }));
        }
        setActiveManagementScreen(null);
        showToast('모임 정보가 수정되었습니다.');
      } catch (error) {
        if (!(error instanceof ApiError)) {
          showToast('모임 정보 수정에 실패했습니다.');
        }
      }
    };

    void save();
  }, [canManageClub, editDraft, group.clubId, managedGroup]);

  const handleOpenJoinRequestProfile = useCallback(
    (nickname: string) => {
      const memberNickname = nickname.trim();
      if (!memberNickname) return;

      setSelectedJoinRequestActionId(null);
      setSelectedJoinRequestMessage(null);
      setActiveManagementScreen(null);
      navigation.navigate('UserProfile', { memberNickname, fromScreen: 'Meeting' });
    },
    [navigation],
  );

  const handlePickClubImage = useCallback(() => {
    if (uploadingClubImage) return;

    const pick = async () => {
      setUploadingClubImage(true);
      try {
        const imageUrl = await pickAndUploadImage('CLUB');
        if (!imageUrl) return;
        setEditDraft((prev) => ({ ...prev, imageUrl }));
        showToast('모임 이미지를 적용했습니다.');
      } catch (error) {
        if (!(error instanceof ApiError)) {
          showToast('이미지 업로드에 실패했습니다.');
        }
      } finally {
        setUploadingClubImage(false);
      }
    };

    void pick();
  }, [uploadingClubImage]);

  const runBookshelfBookSearch = useCallback(async (keyword: string) => {
    const trimmed = keyword.trim();
    if (!trimmed) {
      setBookshelfBookSearchSearched(false);
      setBookshelfBookSearchKeyword('');
      setBookshelfBookSearchResults([]);
      return;
    }

    setBookshelfBookSearchLoading(true);
    setBookshelfBookSearchSearched(true);
    setBookshelfBookSearchKeyword(trimmed);
    setBookshelfBookSearchResults([]);
    try {
      const response = await searchBooks(trimmed, 1);
      setBookshelfBookSearchResults(response.items);
    } catch (error) {
      showToast(resolveBookshelfActionErrorMessage(error, '책 검색에 실패했습니다.'));
      setBookshelfBookSearchResults([]);
    } finally {
      setBookshelfBookSearchLoading(false);
    }
  }, []);

  const handleSubmitBookshelfBookSearch = useCallback(() => {
    void runBookshelfBookSearch(bookshelfBookSearchQuery);
  }, [bookshelfBookSearchQuery, runBookshelfBookSearch]);

  const handleSelectBookshelfSourceBook = useCallback((book: BookItem) => {
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
  }, [closeBookshelfBookSelector]);

  const handleSubmitBookshelfCreate = useCallback(() => {
    if (creatingBookshelf || updatingBookshelf || deletingBookshelf) {
      return;
    }
    const editingMeetingId = editingBookshelfMeetingId;
    const isEditMode = typeof editingMeetingId === 'number';

    if (!isEditMode && !bookshelfCreateDraft.sourceBook) {
      showToast('책을 선택해야 합니다.');
      return;
    }
    const clubId = group.clubId;
    if (!canManageClub || typeof clubId !== 'number') {
      showToast(
        isEditMode
          ? '책장 수정 기능을 잠시 사용할 수 없습니다. 잠시 후 다시 시도해 주십시오.'
          : '책장 생성 기능을 잠시 사용할 수 없습니다. 잠시 후 다시 시도해 주십시오.',
      );
      return;
    }

    const generation = parseGenerationNumber(bookshelfCreateDraft.session);
    if (!generation) {
      showToast('기수를 숫자로 입력해야 합니다.');
      return;
    }

    const regularMeetingName = bookshelfCreateDraft.regularMeetingName.trim();
    const meetingLocation = bookshelfCreateDraft.meetingLocation.trim();
    const meetingDate = bookshelfCreateDraft.meetingDate.trim();
    if (regularMeetingName.length > BOOKSHELF_MEETING_TITLE_MAX_LENGTH) {
      showToast(`정기모임 이름은 ${BOOKSHELF_MEETING_TITLE_MAX_LENGTH}자 이하여야 합니다.`);
      return;
    }
    if (meetingLocation.length > BOOKSHELF_MEETING_LOCATION_MAX_LENGTH) {
      showToast(`모임 장소는 ${BOOKSHELF_MEETING_LOCATION_MAX_LENGTH}자 이하여야 합니다.`);
      return;
    }

    const sourceBook = bookshelfCreateDraft.sourceBook;
    if (isEditMode && !sourceBook) {
      showToast('수정할 책장 정보를 다시 불러와주세요.');
      return;
    }
    const sourceBookIsbn = sourceBook?.isbn.trim() ?? '';
    if (!isEditMode && !ISBN13_REGEX.test(sourceBookIsbn)) {
      showToast('책 정보 형식이 올바르지 않습니다.');
      return;
    }
    const primaryCategory = bookshelfCreateDraft.categories[0];
    const submit = async () => {
      if (isEditMode) {
        setUpdatingBookshelf(true);
      } else {
        setCreatingBookshelf(true);
      }
      try {
        const meetingTime = meetingDate ? toApiDateTime(meetingDate) : undefined;
        if (meetingDate && !meetingTime) {
          showToast('올바른 모임 날짜를 선택해야 합니다.');
          return;
        }

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
        const nextItems = bookshelfList.items.map(mapApiBookshelfToItem);
        const nextItemsWithMeetingDraft =
          isEditMode && typeof editingMeetingId === 'number'
            ? nextItems.map((item) =>
                item.remoteMeetingId === editingMeetingId
                  ? {
                      ...item,
                      regularMeetingName: regularMeetingName || undefined,
                      meetingLocation: meetingLocation || undefined,
                      meetingDate: meetingDate || undefined,
                    }
                  : item,
              )
            : nextItems;
        setBookshelfItems(nextItemsWithMeetingDraft);
        setActiveTab('bookshelf');

        if (isEditMode && typeof editingMeetingId === 'number') {
          const updatedItem =
            nextItemsWithMeetingDraft.find((item) => item.remoteMeetingId === editingMeetingId) ?? null;

          if (updatedItem) {
            setSelectedBookshelfBookId(updatedItem.id);
            await reloadBookshelfMeetingDetail(updatedItem, {
              suppressErrorToast: true,
            });
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
      } catch (error) {
        showToast(
          resolveBookshelfActionErrorMessage(
            error,
            isEditMode ? '책장 수정에 실패했습니다.' : '책장 생성에 실패했습니다.',
          ),
        );
      } finally {
        if (isEditMode) {
          setUpdatingBookshelf(false);
        } else {
          setCreatingBookshelf(false);
        }
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
    updatingBookshelf,
  ]);

  const handleDeleteEditingBookshelf = useCallback(() => {
    const clubId = group.clubId;
    const meetingId = editingBookshelfMeetingId;

    if (
      deletingBookshelf ||
      !canManageClub ||
      typeof clubId !== 'number' ||
      typeof meetingId !== 'number'
    ) {
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
              const nextItems = bookshelfList.items.map(mapApiBookshelfToItem);
              setBookshelfItems(nextItems);
              setSelectedBookshelfBookId(nextItems[0]?.id ?? null);
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
  }, [canManageClub, deletingBookshelf, editingBookshelfMeetingId, group.clubId]);

  const handleOpenNoticeComposer = useCallback((notice?: NoticeItem) => {
    if (notice) {
      setEditingNoticeId(notice.id);
      setNoticeDraft({
        title: notice.title,
        content: notice.content,
        isPinned: Boolean(notice.isPinned),
        bookshelfEnabled: Boolean(notice.bookshelf),
        bookshelfId: notice.bookshelf?.id ?? null,
        pollEnabled: Boolean(notice.poll),
        pollAnonymous: notice.poll?.anonymous ?? true,
        pollAllowDuplicate: notice.poll?.allowDuplicate ?? false,
        pollStartsAt: notice.poll?.startsAt ?? '2026.03.01 10:00',
        pollEndsAt: notice.poll?.endsAt ?? '2026.03.08 22:00',
        pollOptions:
          notice.poll?.options.map((option) => option.label) ?? ['', '', ''],
        photos: notice.photos ?? [],
      });
    } else {
      setEditingNoticeId(null);
      setNoticeDraft(buildNoticeDraft());
    }

    setNoticeMenuVisible(false);
    setNoticeBookSelectorVisible(false);
    setNoticeComposerVisible(true);
  }, []);

  const handleOpenNoticeComposerFromManagement = useCallback(() => {
    runAfterClosingManagementMenu(() => {
      handleOpenNoticeComposer();
    });
  }, [handleOpenNoticeComposer, runAfterClosingManagementMenu]);

  const handleCloseNoticeComposer = useCallback(() => {
    setNoticeComposerVisible(false);
    setNoticeBookSelectorVisible(false);
    setEditingNoticeId(null);
    setNoticeDraft(buildNoticeDraft());
  }, []);

  const handleAddNoticePhoto = useCallback(() => {
    if (uploadingNoticePhoto) return;

    const pick = async () => {
      if (noticeDraft.photos.length >= 10) {
        showToast('사진은 최대 10개까지 추가할 수 있습니다.');
        return;
      }

      setUploadingNoticePhoto(true);
      try {
        const imageUrl = await pickAndUploadImage('NOTICE');
        if (!imageUrl) return;
        setNoticeDraft((prev) => ({
          ...prev,
          photos: [...prev.photos, imageUrl].slice(0, 10),
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
  }, [noticeDraft.photos.length, uploadingNoticePhoto]);

  const handleRemoveNoticePhoto = useCallback((index: number) => {
    setNoticeDraft((prev) => ({
      ...prev,
      photos: prev.photos.filter((_, currentIndex) => currentIndex !== index),
    }));
  }, []);

  const handleUpdateNoticePollOption = useCallback((index: number, value: string) => {
    setNoticeDraft((prev) => ({
      ...prev,
      pollOptions: prev.pollOptions.map((item, currentIndex) =>
        currentIndex === index ? value : item,
      ),
    }));
  }, []);

  const handleAddNoticePollOption = useCallback(() => {
    setNoticeDraft((prev) => ({
      ...prev,
      pollOptions: [...prev.pollOptions, ''],
    }));
  }, []);

  const handleSelectNoticeBookshelf = useCallback((bookId: string) => {
    setNoticeDraft((prev) => ({
      ...prev,
      bookshelfEnabled: true,
      bookshelfId: bookId,
    }));
    setNoticeBookSelectorVisible(false);
  }, []);

  const handleSubmitNotice = useCallback(() => {
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

    const bookshelfAttachment =
      noticeDraft.bookshelfEnabled && noticeDraft.bookshelfId
        ? bookshelfItems.find((book) => book.id === noticeDraft.bookshelfId)
        : null;
    const pollOptions = noticeDraft.pollOptions
      .map((option) => option.trim())
      .filter((option) => option.length > 0);

    if (noticeDraft.pollEnabled && pollOptions.length < 2) {
      showToast('투표 항목은 2개 이상 필요합니다.');
      return;
    }

    const submit = async () => {
      try {
        if (editingNoticeId) {
          const editingNotice = noticeItems.find((item) => item.id === editingNoticeId);
          if (!editingNotice?.remoteId) {
            showToast('수정할 공지 정보를 찾을 수 없습니다.');
            return;
          }

          await updateClubNotice(group.clubId as number, editingNotice.remoteId, {
            title,
            content,
            meetingId: bookshelfAttachment?.remoteMeetingId,
            imageUrls: noticeDraft.photos.length > 0 ? noticeDraft.photos : undefined,
            vote: noticeDraft.pollEnabled
              ? {
                  deadline:
                    toApiDateTime(noticeDraft.pollEndsAt.trim()) ?? getCurrentKstApiDateTime(),
                }
              : undefined,
            isPinned: noticeDraft.isPinned,
          });
        } else {
          await createClubNotice(group.clubId as number, {
            title,
            content,
            meetingId: bookshelfAttachment?.remoteMeetingId,
            imageUrls: noticeDraft.photos.length > 0 ? noticeDraft.photos : undefined,
            vote: noticeDraft.pollEnabled
              ? {
                  title,
                  content,
                  item1: pollOptions[0] ?? '',
                  item2: pollOptions[1] ?? '',
                  item3: pollOptions[2],
                  item4: pollOptions[3],
                  item5: pollOptions[4],
                  item6: pollOptions[5],
                  anonymity: noticeDraft.pollAnonymous,
                  duplication: noticeDraft.pollAllowDuplicate,
                  startTime:
                    toApiDateTime(noticeDraft.pollStartsAt.trim()) ?? getCurrentKstApiDateTime(),
                  deadline:
                    toApiDateTime(noticeDraft.pollEndsAt.trim()) ?? getCurrentKstApiDateTime(),
                }
              : undefined,
            isPinned: noticeDraft.isPinned,
          });
        }

        const [refreshed, latestNotice] = await Promise.all([
          fetchClubNotices(group.clubId as number, 1),
          fetchClubLatestNotice(group.clubId as number, { suppressErrorToast: true }),
        ]);
        const mapped = sortNoticeItems([
          ...refreshed.pinnedNotices.map(mapNoticePreviewToNoticeItem),
          ...refreshed.normalNotices.map(mapNoticePreviewToNoticeItem),
        ]);
        setNoticeItems(mapped);
        setLatestNoticeId(typeof latestNotice?.id === 'number' ? latestNotice.id : null);
        setManagedGroup((prev) => ({ ...prev, notice: latestNotice?.title }));
        setSelectedNoticeId(mapped[0]?.id ?? null);
        setNoticeComposerVisible(false);
        setEditingNoticeId(null);
        setNoticeDraft(buildNoticeDraft());
        showToast(editingNoticeId ? '공지가 수정되었습니다.' : '공지가 등록되었습니다.');
        logMeetingAction('notice_submit_success', {
          clubId: group.clubId,
          mode: editingNoticeId ? 'edit' : 'create',
          hasVote: noticeDraft.pollEnabled,
          hasBookshelfAttachment: Boolean(bookshelfAttachment?.remoteMeetingId),
        });
      } catch (error) {
        logMeetingAction('notice_submit_failure', {
          clubId: group.clubId,
          mode: editingNoticeId ? 'edit' : 'create',
          message: error instanceof Error ? error.message : String(error),
        });
        if (!(error instanceof ApiError)) {
          showToast(editingNoticeId ? '공지 수정에 실패했습니다.' : '공지 등록에 실패했습니다.');
        }
      }
    };

    void submit();
  }, [bookshelfItems, canManageClub, editingNoticeId, group.clubId, noticeDraft, noticeItems]);

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
        const [refreshed, latestNotice] = await Promise.all([
          fetchClubNotices(clubId, 1),
          fetchClubLatestNotice(clubId, { suppressErrorToast: true }),
        ]);
        setNoticeItems(sortNoticeItems([
          ...refreshed.pinnedNotices.map(mapNoticePreviewToNoticeItem),
          ...refreshed.normalNotices.map(mapNoticePreviewToNoticeItem),
        ]));
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

    void remove();
  }, [canManageClub, group.clubId, selectedNotice]);

  const selectedJoinRequestAction = useMemo(
    () => joinRequests.find((item) => item.id === selectedJoinRequestActionId) ?? null,
    [joinRequests, selectedJoinRequestActionId],
  );

  const selectedMemberAction = useMemo(
    () => members.find((item) => item.id === selectedMemberActionId) ?? null,
    [members, selectedMemberActionId],
  );

  const handleBackFromGroupHome = useCallback(() => {
    if (contactModalVisible) {
      closeContactModal();
      return;
    }

    if (selectedMemberActionId) {
      setSelectedMemberActionId(null);
      return;
    }

    if (selectedJoinRequestActionId) {
      setSelectedJoinRequestActionId(null);
      return;
    }

    if (selectedJoinRequestMessage) {
      setSelectedJoinRequestMessage(null);
      return;
    }

    if (bookshelfBookSelectorVisible) {
      closeBookshelfBookSelector();
      return;
    }

    if (bookshelfCalendarVisible) {
      closeBookshelfCalendar();
      return;
    }

    if (noticeBookSelectorVisible) {
      setNoticeBookSelectorVisible(false);
      return;
    }

    if (noticeMenuVisible) {
      setNoticeMenuVisible(false);
      return;
    }

    if (noticeComposerVisible) {
      handleCloseNoticeComposer();
      return;
    }

    if (activeManagementScreen) {
      handleCloseManagementScreen();
      return;
    }

    if (managementMenuVisible) {
      closeManagementMenu();
      return;
    }

    onBack();
  }, [
    activeManagementScreen,
    bookshelfBookSelectorVisible,
    bookshelfCalendarVisible,
    closeContactModal,
    closeBookshelfBookSelector,
    closeBookshelfCalendar,
    contactModalVisible,
    handleCloseManagementScreen,
    handleCloseNoticeComposer,
    managementMenuVisible,
    closeManagementMenu,
    noticeBookSelectorVisible,
    noticeComposerVisible,
    noticeMenuVisible,
    onBack,
    selectedJoinRequestActionId,
    selectedJoinRequestMessage,
    selectedMemberActionId,
  ]);

  const handlePressContactButton = useCallback(() => {
    setContactModalVisible(true);
  }, []);

  const handleOpenContactLink = useCallback(async (link: string) => {
    const target = toOpenableContactLink(link);
    if (!target) {
      showToast('문의하기 링크를 열 수 없습니다.');
      return;
    }

    try {
      await Linking.openURL(target);
      closeContactModal();
    } catch {
      showToast('문의하기 링크를 열 수 없습니다.');
    }
  }, [closeContactModal]);

  const handleRefreshGroupHome = useCallback(() => {
    if (groupHomeRefreshing) return;

    const refresh = async () => {
      setGroupHomeRefreshing(true);
      try {
        await reloadClubWorkspace({ suppressErrorToast: true });
        if (
          activeTab === 'bookshelf' &&
          bookshelfViewMode !== 'GRID' &&
          selectedBookshelfBook
        ) {
          await reloadBookshelfMeetingDetail(selectedBookshelfBook, {
            suppressErrorToast: true,
          });
        }
      } finally {
        setGroupHomeRefreshing(false);
      }
    };

    void refresh();
  }, [
    activeTab,
    bookshelfViewMode,
    groupHomeRefreshing,
    reloadBookshelfMeetingDetail,
    reloadClubWorkspace,
    selectedBookshelfBook,
  ]);

  return (
    <View style={styles.screenWrap}>
      <ScrollView
        ref={groupHomeScrollRef}
        style={styles.container}
        contentContainerStyle={[styles.content, { paddingBottom: spacing.xl * 2 }]}
        showsVerticalScrollIndicator={false}
        onScroll={handleGroupHomeScroll}
        scrollEventThrottle={16}
        refreshControl={
          <RefreshControl
            refreshing={groupHomeRefreshing}
            onRefresh={handleRefreshGroupHome}
          />
        }
      >
      <View style={styles.groupHomeHeaderRow}>
        <Pressable
          style={({ pressed }) => [styles.breadcrumbRow, pressed && styles.pressed]}
          onPress={handleBackFromGroupHome}
        >
          <MaterialIcons name="chevron-left" size={18} color={colors.gray5} />
          <Text style={styles.breadcrumbText}>모임 목록</Text>
        </Pressable>
        {canManageClub ? (
          <Pressable
            style={({ pressed }) => [styles.detailTitleManageLink, pressed && styles.pressed]}
            onPress={() => setManagementMenuVisible(true)}
          >
            <Text style={styles.detailTitleManageLinkText}>모임 관리하기</Text>
          </Pressable>
        ) : null}
      </View>
      <Text
        style={[styles.sectionTitle, styles.detailTitle, styles.groupHomeTitle]}
        onLayout={handleGroupTitleLayout}
      >
        {managedGroup.name}
      </Text>

      <View style={styles.pillNav}>
        {tabItems.map((tab) => {
          const active = activeTab === tab.key;
          return (
            <Pressable
              key={tab.key}
              style={({ pressed }) => [
                styles.pillNavItem,
                active && styles.pillNavItemActive,
                pressed && styles.pressed,
              ]}
              onPress={() => handlePressGroupTab(tab.key)}
            >
              <MaterialIcons
                name={tab.icon}
                size={16}
                color={active ? colors.white : colors.gray4}
              />
              <Text style={[styles.pillNavText, active && styles.pillNavTextActive]}>{tab.label}</Text>
            </Pressable>
          );
        })}
      </View>

      {activeTab === 'home' ? (
        <View style={styles.detailCard}>
          {managedGroup.notice ? (
            <Pressable
              style={({ pressed }) => [styles.noticeBox, pressed && styles.pressed]}
              onPress={handlePressTopNotice}
            >
              <MaterialIcons name="campaign" size={18} color={colors.primary1} />
              <Text style={styles.noticeText}>{managedGroup.notice}</Text>
            </Pressable>
          ) : null}

	          <View style={styles.detailMain}>
	            <View style={styles.detailImage}>
	              {managedGroup.profileImageUrl ? (
	                <Image
	                  source={{ uri: managedGroup.profileImageUrl }}
	                  style={styles.detailImagePreview}
	                  resizeMode="cover"
	                />
	              ) : (
	                <ClubDefaultProfileArtwork />
	              )}
	            </View>
            <View style={styles.detailInfo}>
              <View style={styles.tagRow}>
                {managedGroup.tags.map((tag) => {
                  const tone = getClubHomeTagTone(tag);
                  const toneStyle =
                    tone === 'coral'
                      ? styles.tagCoral
                      : tone === 'sky'
                        ? styles.tagSky
                        : tone === 'violet'
                          ? styles.tagViolet
                          : styles.tagAmber;

                  return (
                    <View key={tag} style={[styles.tag, toneStyle]}>
                    <Text style={styles.tagText}>{tag}</Text>
                    </View>
                  );
                })}
              </View>
              <View style={styles.metaBlock}>
                <Text style={styles.metaLabel}>모임 대상</Text>
                <Text style={styles.metaValue}>
                  {managedGroup.topic.replace(/^모임 대상 · /, '')}
                </Text>
              </View>
              <View style={styles.metaBlock}>
                <Text style={styles.metaLabel}>활동 지역</Text>
                <Text style={styles.metaValue}>
                  {managedGroup.region.replace(/^활동 지역 · /, '')}
                </Text>
              </View>
              <View style={styles.metaBlock}>
                <Text style={styles.metaLabel}>모임 취지</Text>
                <Text style={styles.metaValue}>{managedGroup.isPrivate ? '비공개, 토론' : '공개, 토론'}</Text>
              </View>
              {managedGroup.description ? (
                <Text style={styles.detailBody}>{managedGroup.description}</Text>
              ) : null}
            </View>
          </View>

          <View style={styles.detailButtons}>
            <Pressable
              style={({ pressed }) => [
                styles.primaryButton,
                styles.detailButton,
                openingNextMeeting && styles.primaryButtonDisabled,
                pressed && styles.pressed,
              ]}
              onPress={handleOpenNextMeeting}
              disabled={openingNextMeeting}
            >
              <Text style={styles.primaryButtonText}>
                {openingNextMeeting ? '불러오는 중...' : managedGroup.nextSession ?? '이번 모임 바로가기'}
              </Text>
            </Pressable>
            <Pressable
              style={({ pressed }) => [styles.outlineButton, styles.detailButton, pressed && styles.pressed]}
              onPress={handlePressContactButton}
            >
              <Text style={styles.outlineButtonText}>문의하기</Text>
            </Pressable>
          </View>
        </View>
      ) : null}

      {activeTab === 'notice' ? (
        <GroupNoticeView
          isMember={isMember}
          navigation={navigation}
          noticeItems={noticeItems}
          noticePage={noticePage}
          selectedNoticeId={selectedNoticeId}
          noticeCommentInput={noticeCommentInput}
          submittingNoticeComment={submittingNoticeComment}
          editingNoticeCommentId={editingNoticeCommentId}
          noticeCommentsById={noticeCommentsById}
          noticeCommentPageStateByNoticeId={noticeCommentPageStateByNoticeId}
          noticePollOptionsById={noticePollOptionsById}
          selectedVoteOptionIdsByNotice={selectedVoteOptionIdsByNotice}
          submittedVoteOptionIdsByNotice={submittedVoteOptionIdsByNotice}
          voteEditEnabledByNotice={voteEditEnabledByNotice}
          setSelectedNoticeId={setSelectedNoticeId}
          setNoticeCommentInput={setNoticeCommentInput}
          setEditingNoticeCommentId={setEditingNoticeCommentId}
          setNoticeMenuVisible={setNoticeMenuVisible}
          setNoticePage={setNoticePage}
          setPhotoViewer={setPhotoViewer}
          handleOpenNoticeBookshelf={handleOpenNoticeBookshelf}
          handleToggleVoteOption={handleToggleVoteOption}
          handleOpenVoteVoters={handleOpenVoteVoters}
          handleSubmitVote={handleSubmitVote}
          handleSubmitNoticeComment={handleSubmitNoticeComment}
          handlePressCommentMenu={handlePressCommentMenu}
        />
      ) : null}

      {activeTab === 'bookshelf' ? (
        <GroupBookshelfView
          isMember={isMember}
          canManageClub={canManageClub}
          group={managedGroup}
          groupHomeScrollRef={groupHomeScrollRef}
          shouldScrollToBookshelfDetailRef={shouldScrollToBookshelfDetailRef}
          bookshelfViewMode={bookshelfViewMode}
          bookshelfSessions={bookshelfSessions}
          selectedBookshelfSession={selectedBookshelfSession}
          visibleBookshelfItems={visibleBookshelfItems}
          selectedBookshelfBook={selectedBookshelfBook}
          bookshelfDetailTab={bookshelfDetailTab}
          bookshelfTopicItems={bookshelfTopicItems}
          bookshelfReviewItems={bookshelfReviewItems}
          currentBookshelfTopicPageState={currentBookshelfTopicPageState}
          loadingBookshelfDetail={loadingBookshelfDetail}
          regularMeetingInfo={regularMeetingInfo}
          selectedRegularGroupId={selectedRegularGroupId}
          selectedRegularGroup={selectedRegularGroup}
          regularGroupMembersVisible={regularGroupMembersVisible}
          setSelectedBookshelfSession={setSelectedBookshelfSession}
          openBookshelfDetail={openBookshelfDetail}
          handleBackToBookshelfGrid={handleBackToBookshelfGrid}
          handleChangeBookshelfTab={handleChangeBookshelfTab}
          handleOpenBookshelfComposer={handleOpenBookshelfComposer}
          handlePressBookshelfPostMenu={handlePressBookshelfPostMenu}
          handleSelectRegularGroup={handleSelectRegularGroup}
          handleToggleRegularGroupMembers={handleToggleRegularGroupMembers}
          handleToggleRegularGroupPost={handleToggleRegularGroupPost}
          handleSortRegularGroupPosts={handleSortRegularGroupPosts}
          handleEnterRegularGroup={handleEnterRegularGroup}
          handleOpenBookshelfEdit={handleOpenBookshelfEdit}
          handlePressManageRegularGroups={handlePressManageRegularGroups}
        />
      ) : null}
      </ScrollView>
      <Modal
        visible={teamManageVisible}
        animationType="slide"
        onRequestClose={closeTeamManage}
      >
        <View style={styles.managementScreen}>
          <View
            style={[
              styles.managementScreenHeader,
              { paddingTop: Math.max(insets.top, spacing.lg) + spacing.sm },
            ]}
          >
            <Pressable onPress={closeTeamManage} hitSlop={8}>
              <MaterialIcons name="chevron-left" size={24} color={colors.gray6} />
            </Pressable>
            <Text style={styles.managementScreenTitle}>조 관리하기</Text>
            <View style={styles.managementHeaderSpacer} />
          </View>

          {teamManageLoading ? (
            <View style={styles.teamManageLoadingWrap}>
              <Text style={styles.managementEmptyText}>조 편성 정보를 불러오는 중입니다.</Text>
            </View>
          ) : (
            <>
              <View style={styles.teamManageTopBar}>
                <Text style={styles.teamManageBookTitle}>
                  {selectedBookshelfBook?.title ?? '정기모임'}
                </Text>
                <Text style={styles.teamManageHint}>
                  멤버를 끌어 조에 놓거나, 멤버를 탭한 뒤 조를 눌러 이동할 수 있습니다.
                </Text>
              </View>

              <View style={styles.teamManageDropBar}>
                <View
                  ref={(node) => {
                    teamManageDropRefs.current[getTeamManageTargetKey(null)] = node;
                  }}
                  onLayout={refreshTeamManageDropLayouts}
                >
                  <Pressable
                    style={({ pressed }) => [
                      styles.teamManageDropChip,
                      teamManageSelectedMemberId !== null && styles.teamManageDropChipActive,
                      pressed && styles.pressed,
                    ]}
                    onPress={() => handlePressTeamManageTarget(null)}
                  >
                    <Text style={styles.teamManageDropChipText}>
                      미배정 {teamManageUnassignedMembers.length}
                    </Text>
                  </Pressable>
                </View>
                {teamManageTeams.map((team) => (
                  <View
                    key={`team-manage-target-${team.teamNumber}`}
                    ref={(node) => {
                      teamManageDropRefs.current[getTeamManageTargetKey(team.teamNumber)] = node;
                    }}
                    onLayout={refreshTeamManageDropLayouts}
                  >
                    <Pressable
                      style={({ pressed }) => [
                        styles.teamManageDropChip,
                        teamManageSelectedMemberId !== null && styles.teamManageDropChipActive,
                        pressed && styles.pressed,
                      ]}
                      onPress={() => handlePressTeamManageTarget(team.teamNumber)}
                    >
                      <Text style={styles.teamManageDropChipText}>
                        {formatRegularGroupLabel(team.teamNumber)} {team.memberIds.length}
                      </Text>
                    </Pressable>
                  </View>
                ))}
                <Pressable
                  style={({ pressed }) => [
                    styles.teamManageAddButton,
                    teamManageTeams.length >= MAX_REGULAR_GROUP_COUNT &&
                      styles.primaryButtonDisabled,
                    pressed && teamManageTeams.length < MAX_REGULAR_GROUP_COUNT && styles.pressed,
                  ]}
                  onPress={handleAddTeamManageTeam}
                  disabled={teamManageTeams.length >= MAX_REGULAR_GROUP_COUNT}
                >
                  <MaterialIcons name="add" size={20} color={colors.primary1} />
                </Pressable>
              </View>

              <View
                ref={teamManageScrollViewRef}
                style={styles.managementScreenScroll}
                onLayout={() => {
                  teamManageScrollViewRef.current?.measureInWindow((_x, y, _w, height) => {
                    teamManageScrollBoundsRef.current = { top: y, bottom: y + height };
                  });
                }}
              >
              <ScrollView
                ref={teamManageScrollRef}
                style={styles.managementScreenScroll}
                contentContainerStyle={styles.teamManageContent}
                scrollEnabled={draggingTeamMemberId === null}
                showsVerticalScrollIndicator={false}
                scrollEventThrottle={16}
                onScroll={(e) => {
                  teamManageScrollOffsetRef.current = e.nativeEvent.contentOffset.y;
                }}
              >
                {teamManageTeams.map((team) => (
                  <View
                    key={`team-manage-card-${team.teamNumber}`}
                    ref={(node) => {
                      teamManageDropRefs.current[getTeamManageTargetKey(team.teamNumber)] = node;
                    }}
                    onLayout={refreshTeamManageDropLayouts}
                    style={styles.teamManageCard}
                  >
                    <View style={styles.teamManageCardHeader}>
                      <Text style={styles.teamManageCardTitle}>
                        {formatRegularGroupLabel(team.teamNumber)}
                      </Text>
                      <Pressable
                        style={({ pressed }) => [
                          styles.teamManageRemoveButton,
                          pressed && styles.pressed,
                        ]}
                        onPress={() => handleRemoveTeamManageTeam(team.teamNumber)}
                      >
                        <MaterialIcons name="close" size={18} color={colors.gray5} />
                      </Pressable>
                    </View>

                    <View style={styles.teamManageMemberList}>
                      {team.memberIds.map((memberId) => {
                        const member = teamManageMemberById[memberId];
                        if (!member) return null;
                        const selected = teamManageSelectedMemberId === member.clubMemberId;
                        const dragging = draggingTeamMemberId === member.clubMemberId;

                        return (
                          <View
                            key={`team-manage-member-${team.teamNumber}-${member.clubMemberId}`}
                            style={[
                              styles.teamManageMemberChip,
                              selected && styles.teamManageMemberChipSelected,
                              dragging && styles.teamManageMemberChipDragging,
                            ]}
                            onStartShouldSetResponder={() => true}
                            onMoveShouldSetResponder={() => true}
                            onResponderGrant={(event) =>
                              handleTeamManageMemberGrant(member.clubMemberId, event)
                            }
                            onResponderMove={handleTeamManageMemberMove}
                            onResponderRelease={handleTeamManageMemberRelease}
                            onResponderTerminate={handleTeamManageMemberRelease}
                          >
                            <View style={styles.teamManageMemberAvatar}>
                              {member.profileImageUrl ? (
                                <Image
                                  source={{ uri: member.profileImageUrl }}
                                  style={styles.teamManageMemberAvatarImage}
                                  resizeMode="cover"
                                />
                              ) : (
                                <DefaultProfileAvatar size={18} />
                              )}
                            </View>
                            <Text style={styles.teamManageMemberName}>{member.nickname}</Text>
                          </View>
                        );
                      })}
                      {team.memberIds.length === 0 ? (
                        <View style={styles.teamManageEmptySlot}>
                          <Text style={styles.teamManageEmptySlotText}>여기로 드래그해서 추가</Text>
                        </View>
                      ) : null}
                    </View>
                  </View>
                ))}

                <View
                  ref={(node) => {
                    teamManageDropRefs.current[getTeamManageTargetKey(null)] = node;
                  }}
                  onLayout={refreshTeamManageDropLayouts}
                  style={styles.teamManageCard}
                >
                  <View style={styles.teamManageCardHeader}>
                    <Text style={styles.teamManageCardTitle}>미배정 참여자</Text>
                  </View>
                  <View style={styles.teamManageMemberList}>
                    {teamManageUnassignedMembers.map((member) => {
                      const selected = teamManageSelectedMemberId === member.clubMemberId;
                      const dragging = draggingTeamMemberId === member.clubMemberId;

                      return (
                        <View
                          key={`team-manage-unassigned-${member.clubMemberId}`}
                          style={[
                            styles.teamManageMemberChip,
                            selected && styles.teamManageMemberChipSelected,
                            dragging && styles.teamManageMemberChipDragging,
                          ]}
                          onStartShouldSetResponder={() => true}
                          onMoveShouldSetResponder={() => true}
                          onResponderGrant={(event) =>
                            handleTeamManageMemberGrant(member.clubMemberId, event)
                          }
                          onResponderMove={handleTeamManageMemberMove}
                          onResponderRelease={handleTeamManageMemberRelease}
                          onResponderTerminate={handleTeamManageMemberRelease}
                        >
                          <View style={styles.teamManageMemberAvatar}>
                            {member.profileImageUrl ? (
                              <Image
                                source={{ uri: member.profileImageUrl }}
                                style={styles.teamManageMemberAvatarImage}
                                resizeMode="cover"
                              />
                            ) : (
                              <DefaultProfileAvatar size={18} />
                            )}
                          </View>
                          <Text style={styles.teamManageMemberName}>{member.nickname}</Text>
                        </View>
                      );
                    })}
                    {teamManageUnassignedMembers.length === 0 ? (
                      <View style={styles.teamManageEmptySlot}>
                        <Text style={styles.teamManageEmptySlotText}>미배정 참여자가 없습니다.</Text>
                      </View>
                    ) : null}
                  </View>
                </View>
              </ScrollView>
              </View>

              <View
                style={[
                  styles.teamManageFooter,
                  { paddingBottom: Math.max(insets.bottom, spacing.md) + spacing.sm },
                ]}
              >
                <Text style={styles.teamManageFooterHint}>
                  조 편성을 저장하면 정기모임 화면으로 돌아갑니다.
                </Text>
                <Pressable
                  style={({ pressed }) => [
                    styles.teamManageSaveButton,
                    teamManageSaving
                      ? styles.teamManageSaveButtonDisabled
                      : styles.teamManageSaveButtonActive,
                    pressed && !teamManageSaving && styles.pressed,
                  ]}
                  onPress={handleSaveTeamManage}
                  disabled={teamManageSaving}
                >
                  <Text
                    style={[
                      styles.teamManageSaveButtonText,
                      teamManageSaving && styles.teamManageSaveButtonTextDisabled,
                    ]}
                  >
                    {teamManageSaving ? '저장 중...' : '조 편성 저장하기'}
                  </Text>
                </Pressable>
              </View>
            </>
          )}

          {draggingTeamMemberId && draggingTeamMemberPosition ? (
            <View
              pointerEvents="none"
              style={[
                styles.teamManageDraggingGhost,
                {
                  left: draggingTeamMemberPosition.x - 56,
                  top: draggingTeamMemberPosition.y - 24,
                },
              ]}
            >
              <Text style={styles.teamManageDraggingGhostText}>
                {teamManageMemberById[draggingTeamMemberId]?.nickname ?? '멤버'}
              </Text>
            </View>
          ) : null}
        </View>
      </Modal>
      <DialogOverlay
        visible={Boolean(bookshelfComposerType)}
        onClose={closeBookshelfComposer}
        overlayStyle={styles.bookshelfComposerOverlay}
        cardStyle={styles.bookshelfComposerCard}
        withKeyboard
      >
	              <View style={styles.bookshelfComposerHeader}>
	                <Text style={styles.bookshelfComposerTitle}>
	                  {bookshelfComposerType === 'TOPIC'
	                    ? editingBookshelfPost
	                      ? '발제 수정하기'
	                      : '발제 추가하기'
	                    : editingBookshelfPost
	                      ? '한줄평 수정하기'
	                      : '한줄평 추가하기'}
	                </Text>
	                <Pressable onPress={closeBookshelfComposer} hitSlop={8}>
	                  <MaterialIcons name="close" size={22} color={colors.gray5} />
	                </Pressable>
	              </View>

              {bookshelfComposerType === 'REVIEW' ? (
                <View style={styles.formGroup}>
                  <Text style={styles.bookshelfComposerLabel}>평점</Text>
                  <View style={styles.bookshelfComposerRatingRow}>
                    {[1, 2, 3, 4, 5].map((value) => (
                      <View
                        key={`bookshelf-review-rating-${value}`}
                        style={styles.bookshelfComposerRatingStarShell}
                      >
                        <MaterialIcons
                          name={getStarIconName(bookshelfComposerRating, value - 1)}
                          size={28}
                          color={
                            getStarIconName(bookshelfComposerRating, value - 1) === 'star-border'
                              ? colors.gray2
                              : colors.secondary2
                          }
                        />
                        <Pressable
                          style={({ pressed }) => [
                            styles.bookshelfComposerRatingButton,
                            styles.bookshelfComposerRatingButtonLeft,
                            pressed && styles.pressed,
                          ]}
                          onPress={() => setBookshelfComposerRating(value - 0.5)}
                        />
                        <Pressable
                          style={({ pressed }) => [
                            styles.bookshelfComposerRatingButton,
                            styles.bookshelfComposerRatingButtonRight,
                            pressed && styles.pressed,
                          ]}
                          onPress={() => setBookshelfComposerRating(value)}
                        />
                      </View>
                    ))}
                    <Text style={styles.bookshelfComposerRatingValue}>
                      {formatRatingLabel(bookshelfComposerRating)}
                    </Text>
                  </View>
                </View>
              ) : null}

              <View style={styles.formGroup}>
                <Text style={styles.bookshelfComposerLabel}>
                  {bookshelfComposerType === 'TOPIC' ? '발제 내용' : '한줄평 내용'}
                </Text>
                <FormTextInput
                  value={bookshelfComposerInput}
                  onChangeText={setBookshelfComposerInput}
                  placeholder={
                    bookshelfComposerType === 'TOPIC'
                      ? '발제 내용을 입력해주세요'
                      : '한줄평을 입력해주세요'
                  }
                  placeholderTextColor={colors.gray3}
                  style={[styles.input, styles.textArea, styles.bookshelfComposerInput]}
                  multiline
                  textAlignVertical="top"
                  maxLength={INPUT_LIMITS.BOOKSHELF_COMPOSER}
                />
                <Text style={styles.bookshelfComposerCounter}>
                  {bookshelfComposerInput.length}/{INPUT_LIMITS.BOOKSHELF_COMPOSER}
                </Text>
              </View>

              <View style={styles.bookshelfComposerFooter}>
                <Pressable
                  style={({ pressed }) => [
                    styles.secondaryButton,
                    styles.buttonFlex,
                    submittingBookshelfComposer && styles.primaryButtonDisabled,
                    pressed && !submittingBookshelfComposer && styles.pressed,
                  ]}
                  onPress={closeBookshelfComposer}
                  disabled={submittingBookshelfComposer}
                >
                  <Text style={styles.secondaryText}>취소</Text>
                </Pressable>
                <Pressable
                  style={({ pressed }) => [
                    styles.primaryButton,
                    styles.buttonFlex,
                    (!canSubmitBookshelfComposer || submittingBookshelfComposer) &&
                      styles.primaryButtonDisabled,
                    pressed &&
                      canSubmitBookshelfComposer &&
                      !submittingBookshelfComposer &&
                      styles.pressed,
                  ]}
                  onPress={handleSubmitBookshelfComposer}
                  disabled={!canSubmitBookshelfComposer || submittingBookshelfComposer}
	                >
	                  <Text style={styles.primaryButtonText}>
	                    {submittingBookshelfComposer
	                      ? editingBookshelfPost
	                        ? '수정 중...'
	                        : '등록 중...'
	                      : editingBookshelfPost
	                        ? '수정하기'
	                        : '등록하기'}
	                  </Text>
	                </Pressable>
	              </View>
      </DialogOverlay>
      <GroupManagementOverlay
        managementMenuVisible={managementMenuVisible}
        activeManagementScreen={activeManagementScreen}
        bookshelfBookSelectorVisible={bookshelfBookSelectorVisible}
        joinRequests={joinRequests}
        members={members}
        selectedJoinRequestMessage={selectedJoinRequestMessage}
        selectedJoinRequestAction={selectedJoinRequestAction}
        submittingJoinRequestAction={submittingJoinRequestAction}
        selectedMemberAction={selectedMemberAction}
        submittingMemberAction={submittingMemberAction}
        editDraft={editDraft}
        uploadingClubImage={uploadingClubImage}
        managementSheetY={managementSheetY}
        managementHandlePanResponder={managementHandlePanResponder}
        handleCloseManagementLayer={handleCloseManagementLayer}
        handleCloseManagementScreen={handleCloseManagementScreen}
        closeManagementMenu={closeManagementMenu}
        setSelectedJoinRequestMessage={setSelectedJoinRequestMessage}
        setSelectedJoinRequestActionId={setSelectedJoinRequestActionId}
        handleOpenJoinRequestProfile={handleOpenJoinRequestProfile}
        setSelectedMemberActionId={setSelectedMemberActionId}
        setEditDraft={setEditDraft}
        handlePickClubImage={handlePickClubImage}
        handleSaveGroupEdit={handleSaveGroupEdit}
        handleProcessJoinRequest={handleProcessJoinRequest}
        handleChangeMemberRole={handleChangeMemberRole}
        handleRemoveMember={handleRemoveMember}
        handleOpenManagementScreen={handleOpenManagementScreen}
        handleOpenNoticeComposerFromManagement={handleOpenNoticeComposerFromManagement}
        handleDeleteManagedClub={handleDeleteManagedClub}
        bookshelfBookSearchQuery={bookshelfBookSearchQuery}
        bookshelfBookSearchSearched={bookshelfBookSearchSearched}
        bookshelfBookSearchLoading={bookshelfBookSearchLoading}
        bookshelfBookSearchKeyword={bookshelfBookSearchKeyword}
        bookshelfBookSearchResults={bookshelfBookSearchResults}
        bookshelfCreateDraft={bookshelfCreateDraft}
        editingBookshelfMeetingId={editingBookshelfMeetingId}
        bookshelfCalendarVisible={bookshelfCalendarVisible}
        bookshelfCalendarMonth={bookshelfCalendarMonth}
        bookshelfCalendarDays={bookshelfCalendarDays}
        updatingBookshelf={updatingBookshelf}
        deletingBookshelf={deletingBookshelf}
        creatingBookshelf={creatingBookshelf}
        closeBookshelfBookSelector={closeBookshelfBookSelector}
        setBookshelfBookSearchQuery={setBookshelfBookSearchQuery}
        setBookshelfBookSearchKeyword={setBookshelfBookSearchKeyword}
        setBookshelfBookSearchResults={setBookshelfBookSearchResults}
        setBookshelfBookSearchSearched={setBookshelfBookSearchSearched}
        handleSubmitBookshelfBookSearch={handleSubmitBookshelfBookSearch}
        handleSelectBookshelfSourceBook={handleSelectBookshelfSourceBook}
        setBookshelfBookSelectorVisible={setBookshelfBookSelectorVisible}
        setBookshelfCreateDraft={setBookshelfCreateDraft}
        openBookshelfCalendar={openBookshelfCalendar}
        closeBookshelfCalendar={closeBookshelfCalendar}
        setBookshelfCalendarMonth={setBookshelfCalendarMonth}
        handleSelectBookshelfMeetingDate={handleSelectBookshelfMeetingDate}
        handlePickTodayBookshelfMeetingDate={handlePickTodayBookshelfMeetingDate}
        handleDeleteEditingBookshelf={handleDeleteEditingBookshelf}
        handleSubmitBookshelfCreate={handleSubmitBookshelfCreate}
      />
      <ActionMenu
        visible={Boolean(noticeCommentMenu)}
        anchor={
          noticeCommentMenu
            ? {
                pageX: noticeCommentMenu.pageX,
                pageY: noticeCommentMenu.pageY,
              }
            : null
        }
        items={noticeCommentMenuItems}
        onClose={() => setNoticeCommentMenu(null)}
        screenWidth={screenWidth}
        screenHeight={screenHeight}
        menuWidth={132}
      />
      <ActionMenu
        visible={Boolean(bookshelfPostMenu)}
        anchor={
          bookshelfPostMenu
            ? {
                pageX: bookshelfPostMenu.pageX,
                pageY: bookshelfPostMenu.pageY,
              }
            : null
        }
        items={bookshelfPostMenuItems}
        onClose={() => setBookshelfPostMenu(null)}
        screenWidth={screenWidth}
        screenHeight={screenHeight}
        menuWidth={132}
      />
      <ReportMemberModal
        visible={Boolean(reportModal)}
        target={reportModal}
        submitting={submittingReport}
        onPressTarget={handlePressReportTarget}
        onClose={handleCloseReportModal}
        onSubmit={handleSubmitReport}
      />
      <Modal
        visible={noticeComposerVisible}
        animationType="slide"
        onRequestClose={handleCloseNoticeComposer}
      >
        <KeyboardAvoidingView
          style={styles.managementScreen}
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        >
          <View style={[styles.managementScreenHeader, { paddingTop: Math.max(insets.top, spacing.lg) + spacing.sm }]}>
            <Pressable onPress={handleCloseNoticeComposer} hitSlop={8}>
              <MaterialIcons name="chevron-left" size={24} color={colors.gray6} />
            </Pressable>
            <Text style={styles.managementScreenTitle}>
              {editingNoticeId ? '공지 수정하기' : '공지 작성하기'}
            </Text>
            <Pressable onPress={handleCloseNoticeComposer} hitSlop={8}>
              <MaterialIcons name="close" size={22} color={colors.gray6} />
            </Pressable>
          </View>

          <ScrollView
            style={styles.managementScreenScroll}
            contentContainerStyle={styles.managementScreenContent}
            showsVerticalScrollIndicator={false}
          >
            <View style={styles.noticeComposerCard}>
              <Text style={styles.noticeComposerLabel}>제목</Text>
              <TextInput
                value={noticeDraft.title}
                onChangeText={(text) => setNoticeDraft((prev) => ({ ...prev, title: text }))}
                placeholder="제목을 입력해야 합니다."
                placeholderTextColor={colors.gray3}
                style={styles.input}
              />

              <Text style={styles.noticeComposerLabel}>내용</Text>
              <TextInput
                value={noticeDraft.content}
                onChangeText={(text) => setNoticeDraft((prev) => ({ ...prev, content: text }))}
                placeholder="내용을 입력해야 합니다."
                placeholderTextColor={colors.gray3}
                style={[styles.input, styles.noticeComposerTextArea]}
                multiline
              />

              <View style={styles.noticeComposerPinRow}>
                <Text style={styles.noticeAttachmentTitle}>상단 고정</Text>
                <Pressable
                  style={({ pressed }) => [
                    styles.noticeComposerPinButton,
                    noticeDraft.isPinned && styles.noticeComposerPinButtonActive,
                    pressed && styles.pressed,
                  ]}
                  onPress={() =>
                    setNoticeDraft((prev) => ({
                      ...prev,
                      isPinned: !prev.isPinned,
                    }))
                  }
                >
                  <MaterialIcons
                    name="push-pin"
                    size={16}
                    color={noticeDraft.isPinned ? colors.primary1 : colors.gray4}
                  />
                  <Text
                    style={[
                      styles.noticeComposerPinButtonText,
                      noticeDraft.isPinned && styles.noticeComposerPinButtonTextActive,
                    ]}
                  >
                    {noticeDraft.isPinned ? '고정 해제하기' : '고정하기'}
                  </Text>
                </Pressable>
              </View>

              <View style={styles.noticeComposerActionRow}>
                <Pressable
                  style={({ pressed }) => [
                    styles.noticeComposerToggle,
                    noticeDraft.bookshelfEnabled && styles.noticeComposerToggleActive,
                    pressed && styles.pressed,
                  ]}
                  onPress={() =>
                    setNoticeDraft((prev) => ({
                      ...prev,
                      bookshelfEnabled: !prev.bookshelfEnabled,
                      bookshelfId: !prev.bookshelfEnabled ? prev.bookshelfId : null,
                    }))
                  }
                >
                  <MaterialIcons
                    name="collections-bookmark"
                    size={18}
                    color={noticeDraft.bookshelfEnabled ? colors.primary1 : colors.gray4}
                  />
                  <Text
                    style={[
                      styles.noticeComposerToggleText,
                      noticeDraft.bookshelfEnabled && styles.noticeComposerToggleTextActive,
                    ]}
                  >
                    책장
                  </Text>
                </Pressable>
                <Pressable
                  style={({ pressed }) => [
                    styles.noticeComposerToggle,
                    noticeDraft.pollEnabled && styles.noticeComposerToggleActive,
                    pressed && styles.pressed,
                  ]}
                  onPress={() =>
                    setNoticeDraft((prev) => ({
                      ...prev,
                      pollEnabled: !prev.pollEnabled,
                    }))
                  }
                >
                  <MaterialIcons
                    name="poll"
                    size={18}
                    color={noticeDraft.pollEnabled ? colors.primary1 : colors.gray4}
                  />
                  <Text
                    style={[
                      styles.noticeComposerToggleText,
                      noticeDraft.pollEnabled && styles.noticeComposerToggleTextActive,
                    ]}
                  >
                    투표
                  </Text>
                </Pressable>
                <Pressable
                  style={({ pressed }) => [
                    styles.noticeComposerToggle,
                    noticeDraft.photos.length > 0 && styles.noticeComposerToggleActive,
                    pressed && styles.pressed,
                  ]}
                  onPress={handleAddNoticePhoto}
                >
                  <MaterialIcons
                    name="image"
                    size={18}
                    color={noticeDraft.photos.length > 0 ? colors.primary1 : colors.gray4}
                  />
                  <Text
                    style={[
                      styles.noticeComposerToggleText,
                      noticeDraft.photos.length > 0 && styles.noticeComposerToggleTextActive,
                    ]}
                  >
                    {uploadingNoticePhoto ? '업로드 중' : '사진'}
                  </Text>
                </Pressable>
              </View>

              {noticeDraft.bookshelfEnabled ? (
                <View style={styles.noticeComposerSection}>
                  <View style={styles.noticeComposerSectionHeader}>
                    <Text style={styles.noticeAttachmentTitle}>책장</Text>
                    <Pressable
                      style={({ pressed }) => [styles.noticeComposerLinkButton, pressed && styles.pressed]}
                      onPress={() => setNoticeBookSelectorVisible(true)}
                    >
                      <Text style={styles.noticeComposerLinkButtonText}>
                        {noticeDraft.bookshelfId ? '책장 변경' : '책장 연결'}
                      </Text>
                    </Pressable>
                  </View>
                  {noticeDraft.bookshelfId ? (
                    (() => {
                      const attachedBook = bookshelfItems.find(
                        (book) => book.id === noticeDraft.bookshelfId,
                      );
                      return attachedBook ? (
                        <View style={styles.noticeBookshelfCard}>
                          <Image
                            source={{ uri: attachedBook.coverImage }}
                            style={styles.noticeBookshelfCover}
                            resizeMode="cover"
                          />
                          <View style={styles.noticeBookshelfInfo}>
                            <Text style={styles.noticeBookshelfTitle}>{attachedBook.title}</Text>
                            <Text style={styles.noticeBookshelfAuthor}>{attachedBook.author}</Text>
                            <View style={styles.bookshelfBadgeRow}>
                              <View style={styles.bookshelfSessionBadge}>
                                <Text style={styles.bookshelfBadgeText}>{attachedBook.session}</Text>
                              </View>
                              <View
                                style={[
                                  styles.bookshelfCategoryBadge,
                                  getBookshelfCategoryBadgeStyle(attachedBook.category),
                                ]}
                              >
                                <Text style={styles.bookshelfBadgeText}>{attachedBook.category}</Text>
                              </View>
                            </View>
                          </View>
                        </View>
                      ) : null;
                    })()
                  ) : (
                    <Text style={styles.helperText}>연결할 책장을 선택해야 합니다.</Text>
                  )}
                </View>
              ) : null}

              {noticeDraft.pollEnabled ? (
                <View style={styles.noticeComposerSection}>
                  <Text style={styles.noticeAttachmentTitle}>투표</Text>
                  <View style={styles.noticeComposerPollOptionList}>
                    {noticeDraft.pollOptions.map((option, index) => (
                      <TextInput
                        key={`notice-poll-option-${index}`}
                        value={option}
                        onChangeText={(text) => handleUpdateNoticePollOption(index, text)}
                        placeholder={`투표 항목 ${index + 1}`}
                        placeholderTextColor={colors.gray3}
                        style={styles.input}
                      />
                    ))}
                    <Pressable
                      style={({ pressed }) => [styles.noticeComposerAddOptionButton, pressed && styles.pressed]}
                      onPress={handleAddNoticePollOption}
                    >
                      <MaterialIcons name="add" size={18} color={colors.gray5} />
                      <Text style={styles.noticeComposerAddOptionText}>항목 추가</Text>
                    </Pressable>
                  </View>
                  <View style={styles.noticeComposerChoiceRow}>
                    <Pressable
                      style={({ pressed }) => [
                        styles.noticeComposerChoiceChip,
                        noticeDraft.pollAnonymous && styles.noticeComposerChoiceChipActive,
                        pressed && styles.pressed,
                      ]}
                      onPress={() => setNoticeDraft((prev) => ({ ...prev, pollAnonymous: true }))}
                    >
                      <Text
                        style={[
                          styles.noticeComposerChoiceChipText,
                          noticeDraft.pollAnonymous && styles.noticeComposerChoiceChipTextActive,
                        ]}
                      >
                        익명
                      </Text>
                    </Pressable>
                    <Pressable
                      style={({ pressed }) => [
                        styles.noticeComposerChoiceChip,
                        !noticeDraft.pollAnonymous && styles.noticeComposerChoiceChipActive,
                        pressed && styles.pressed,
                      ]}
                      onPress={() => setNoticeDraft((prev) => ({ ...prev, pollAnonymous: false }))}
                    >
                      <Text
                        style={[
                          styles.noticeComposerChoiceChipText,
                          !noticeDraft.pollAnonymous && styles.noticeComposerChoiceChipTextActive,
                        ]}
                      >
                        실명
                      </Text>
                    </Pressable>
                    <Pressable
                      style={({ pressed }) => [
                        styles.noticeComposerChoiceChip,
                        noticeDraft.pollAllowDuplicate && styles.noticeComposerChoiceChipActive,
                        pressed && styles.pressed,
                      ]}
                      onPress={() =>
                        setNoticeDraft((prev) => ({
                          ...prev,
                          pollAllowDuplicate: !prev.pollAllowDuplicate,
                        }))
                      }
                    >
                      <Text
                        style={[
                          styles.noticeComposerChoiceChipText,
                          noticeDraft.pollAllowDuplicate &&
                            styles.noticeComposerChoiceChipTextActive,
                        ]}
                      >
                        중복 가능
                      </Text>
                    </Pressable>
                  </View>
                  <View style={styles.noticeComposerDateRow}>
                    <TextInput
                      value={noticeDraft.pollStartsAt}
                      onChangeText={(text) =>
                        setNoticeDraft((prev) => ({ ...prev, pollStartsAt: text }))
                      }
                      placeholder="시작 시간"
                      placeholderTextColor={colors.gray3}
                      style={[styles.input, styles.noticeComposerDateInput]}
                    />
                    <TextInput
                      value={noticeDraft.pollEndsAt}
                      onChangeText={(text) =>
                        setNoticeDraft((prev) => ({ ...prev, pollEndsAt: text }))
                      }
                      placeholder="종료 시간"
                      placeholderTextColor={colors.gray3}
                      style={[styles.input, styles.noticeComposerDateInput]}
                    />
                  </View>
                </View>
              ) : null}

              {noticeDraft.photos.length > 0 ? (
                <View style={styles.noticeComposerSection}>
                  <View style={styles.noticeComposerSectionHeader}>
                    <Text style={styles.noticeAttachmentTitle}>사진</Text>
                    <Text style={styles.noticeComposerCounter}>{noticeDraft.photos.length}/10</Text>
                  </View>
                  <View style={styles.noticeComposerPhotoGrid}>
                    {noticeDraft.photos.map((photo, index) => (
                      <View key={`composer-photo-${photo}-${index}`} style={styles.noticeComposerPhotoItem}>
                        <Image
                          source={{ uri: photo }}
                          style={styles.noticeComposerPhotoImage}
                          resizeMode="cover"
                        />
                        <Pressable
                          style={styles.noticeComposerPhotoRemove}
                          onPress={() => handleRemoveNoticePhoto(index)}
                        >
                          <MaterialIcons name="close" size={14} color={colors.gray4} />
                        </Pressable>
                      </View>
                    ))}
                  </View>
                </View>
              ) : null}
            </View>
          </ScrollView>

          <View style={styles.noticeComposerFooter}>
            <Pressable
              style={({ pressed }) => [styles.outlineButton, styles.noticeComposerFooterButton, pressed && styles.pressed]}
              onPress={handleCloseNoticeComposer}
            >
              <Text style={styles.outlineButtonText}>취소</Text>
            </Pressable>
            <Pressable
              style={({ pressed }) => [styles.primaryButton, styles.noticeComposerFooterButton, pressed && styles.pressed]}
              onPress={handleSubmitNotice}
            >
              <Text style={styles.primaryButtonText}>{editingNoticeId ? '수정하기' : '등록하기'}</Text>
            </Pressable>
          </View>
        </KeyboardAvoidingView>
      </Modal>
      <DialogOverlay
        visible={noticeBookSelectorVisible}
        onClose={() => setNoticeBookSelectorVisible(false)}
        overlayStyle={styles.managementOverlay}
        cardStyle={styles.noticeBookSelectorCard}
      >
            <View style={styles.managementModalHeader}>
              <Text style={styles.managementModalTitle}>책장 선택</Text>
              <Pressable onPress={() => setNoticeBookSelectorVisible(false)} hitSlop={8}>
                <MaterialIcons name="close" size={20} color={colors.gray6} />
              </Pressable>
            </View>
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.noticeBookSelectorList}
            >
              {bookshelfItems.map((book) => (
                <Pressable
                  key={`notice-book-${book.id}`}
                  style={({ pressed }) => [
                    styles.noticeBookSelectorItem,
                    noticeDraft.bookshelfId === book.id && styles.noticeBookSelectorItemActive,
                    pressed && styles.pressed,
                  ]}
                  onPress={() => handleSelectNoticeBookshelf(book.id)}
                >
                  <Image source={{ uri: book.coverImage }} style={styles.noticeBookSelectorCover} />
                  <Text style={styles.noticeBookSelectorTitle} numberOfLines={1}>
                    {book.title}
                  </Text>
                  <Text style={styles.noticeBookSelectorMeta} numberOfLines={1}>
                    {book.author}
                  </Text>
                </Pressable>
              ))}
              {bookshelfItems.length === 0 ? (
                <View style={styles.managementEmptyCard}>
                  <Text style={styles.managementEmptyText}>연결할 책장이 없습니다.</Text>
                </View>
              ) : null}
            </ScrollView>
      </DialogOverlay>
      <Modal
        visible={noticeMenuVisible}
        transparent
        animationType="fade"
        onRequestClose={() => setNoticeMenuVisible(false)}
      >
        <Pressable
          style={styles.managementOverlayBottom}
          onPress={() => setNoticeMenuVisible(false)}
          disableFeedback
        >
          {selectedNotice ? (
            <Pressable
              style={styles.managementBottomSheet}
              onPress={(event) => event.stopPropagation()}
              disableFeedback
            >
              <Text style={styles.managementBottomSheetTitle}>공지 메뉴</Text>
              {canManageClub ? (
                <>
                  <Pressable
                    style={({ pressed }) => [
                      styles.managementBottomSheetItem,
                      pressed && styles.pressed,
                    ]}
                    onPress={() => handleOpenNoticeComposer(selectedNotice)}
                  >
                    <MaterialIcons name="edit" size={20} color={colors.gray5} />
                    <Text style={styles.managementBottomSheetItemText}>수정하기</Text>
                  </Pressable>
                  <Pressable
                    style={({ pressed }) => [
                      styles.managementBottomSheetItem,
                      pressed && styles.pressed,
                    ]}
                    onPress={handleDeleteNotice}
                  >
                    <MaterialIcons name="delete-outline" size={20} color={colors.likeRed} />
                    <Text style={styles.managementBottomSheetItemText}>삭제하기</Text>
                  </Pressable>
                </>
              ) : (
                <Pressable
                  style={({ pressed }) => [
                    styles.managementBottomSheetItem,
                    pressed && styles.pressed,
                  ]}
                  onPress={handleReportNotice}
                >
                  <MaterialIcons name="flag" size={20} color={colors.gray5} />
                  <Text style={styles.managementBottomSheetItemText}>신고하기</Text>
                </Pressable>
              )}
            </Pressable>
          ) : null}
        </Pressable>
      </Modal>
      {activeTab === 'bookshelf' &&
      bookshelfViewMode === 'REGULAR_GROUP' &&
      selectedRegularGroup ? (
        <FloatingActionButton onPress={handleOpenRegularChatPicker} accessibilityLabel="채팅 조 선택">
          <SvgUri uri={chatIconUri} width={24} height={24} />
        </FloatingActionButton>
      ) : null}
      <DialogOverlay
        visible={contactModalVisible}
        onClose={closeContactModal}
        overlayStyle={styles.contactModalOverlay}
        cardStyle={styles.contactModalCard}
      >
            <View style={styles.contactModalHeader}>
              <Text style={styles.contactModalTitle}>Contact Us</Text>
              <Pressable onPress={closeContactModal} hitSlop={8}>
                <MaterialIcons name="close" size={30} color={colors.gray6} />
              </Pressable>
            </View>
            {contactLinks.length > 0 ? (
              <View style={styles.contactModalLinkList}>
                {contactLinks.map((contact, index) => (
                  <Pressable
                    key={`contact-link-${contact.link}-${index}`}
                    style={({ pressed }) => [
                      styles.contactModalLinkRow,
                      pressed && styles.pressed,
                    ]}
                    onPress={() => {
                      void handleOpenContactLink(contact.link);
                    }}
                  >
                    <MaterialIcons name="link" size={30} color={colors.gray5} />
                    <View style={styles.contactModalLinkTextWrap}>
                      <Text style={styles.contactModalLinkLabel}>
                        {formatContactLabel(contact)}
                      </Text>
                      <Text style={styles.contactModalLinkUrl} numberOfLines={1}>
                        {contact.link}
                      </Text>
                    </View>
                  </Pressable>
                ))}
              </View>
            ) : (
              <View style={styles.contactModalEmptyWrap}>
                <Text style={styles.contactModalEmptyText}>문의하기 링크가 없습니다.</Text>
              </View>
            )}
      </DialogOverlay>
      <DialogOverlay
        visible={regularChatPickerVisible}
        onClose={handleCloseRegularChat}
        overlayStyle={styles.regularChatModalOverlay}
        cardStyle={styles.regularChatPickerCard}
      >
            <View style={styles.regularChatHeader}>
              <Text style={styles.regularChatTitle}>채팅 조 선택</Text>
              <Pressable onPress={handleCloseRegularChat} hitSlop={8}>
                <MaterialIcons name="close" size={20} color={colors.gray6} />
              </Pressable>
            </View>
            <View style={styles.regularChatGroupList}>
              {(regularMeetingInfo?.groups ?? []).map((groupItem) => (
                <Pressable
                  key={`chat-picker-${groupItem.id}`}
                  style={({ pressed }) => [
                    styles.regularChatGroupItem,
                    pressed && styles.pressed,
                  ]}
                  onPress={() => handleSelectRegularChatGroup(groupItem.id)}
                >
                  <Text style={styles.regularChatGroupItemText}>{groupItem.label}</Text>
                  <MaterialIcons name="chevron-right" size={20} color={colors.gray5} />
                </Pressable>
              ))}
            </View>
      </DialogOverlay>
      <Modal
        visible={Boolean(activeRegularChatGroup)}
        animationType="slide"
        onRequestClose={handleCloseRegularChat}
      >
        <KeyboardAvoidingView
          style={styles.regularChatScreen}
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
          {...chatSwipePanResponder.panHandlers}
        >
          {activeRegularChatGroup ? (
            <>
              <View style={[styles.regularChatHeader, { paddingTop: Math.max(insets.top, spacing.lg) + spacing.sm }]}>
                <View style={styles.regularChatHeaderLeft}>
                  <Pressable onPress={handleBackToRegularChatPicker} hitSlop={8}>
                    <MaterialIcons name="chevron-left" size={20} color={colors.gray6} />
                  </Pressable>
                  <Text style={styles.regularChatTitle}>{activeRegularChatGroup.label}</Text>
                  <View style={[styles.regularChatConnDot, isChatConnected ? styles.regularChatConnDotOn : styles.regularChatConnDotOff]} />
                </View>
                <Pressable onPress={handleCloseRegularChat} hitSlop={8}>
                  <MaterialIcons name="close" size={20} color={colors.gray6} />
                </Pressable>
              </View>
              <ScrollView
                ref={chatScrollRef}
                style={styles.regularChatMessages}
                contentContainerStyle={styles.regularChatMessagesContent}
                showsVerticalScrollIndicator={false}
                keyboardShouldPersistTaps="handled"
              >
                {activeRegularChatGroup.chatMessages.map((message) => (
                  <View
                    key={message.id}
                    style={[
                      styles.regularChatMessageRow,
                      message.mine && styles.regularChatMessageRowMine,
                    ]}
                  >
                    {!message.mine ? (
                      <View style={styles.regularChatMessageMeta}>
                        <View style={styles.bookshelfPostAvatar}>
                          <DefaultProfileAvatar size={16} />
                        </View>
                        <Text style={styles.regularChatAuthor}>{message.author}</Text>
                      </View>
                    ) : null}
                    <View
                      style={[
                        styles.regularChatBubble,
                        message.mine ? styles.regularChatBubbleMine : styles.regularChatBubbleOther,
                      ]}
                    >
                      <Text style={styles.regularChatBubbleText}>{message.content}</Text>
                    </View>
                    <Text style={styles.regularChatTime}>{message.time}</Text>
                  </View>
                ))}
                {activeRegularChatGroup.chatMessages.length === 0 ? (
                  <View style={styles.managementEmptyCard}>
                    <Text style={styles.managementEmptyText}>표시할 채팅 내역이 없습니다.</Text>
                  </View>
                ) : null}
              </ScrollView>
              <View style={[styles.regularChatInputRow, { paddingBottom: Math.max(insets.bottom, spacing.sm) }]}>
                <TextInput
                  style={styles.regularChatInput}
                  placeholder="채팅 입력"
                  placeholderTextColor={colors.gray3}
                  value={regularChatInput}
                  onChangeText={setRegularChatInput}
                  editable={!submittingRegularChat}
                  onSubmitEditing={handleSubmitRegularChat}
                  returnKeyType="send"
                />
                <Pressable
                  style={({ pressed }) => [
                    styles.regularChatSendButton,
                    (submittingRegularChat || regularChatInput.trim().length === 0) &&
                      styles.regularChatSendButtonDisabled,
                    pressed &&
                      !(submittingRegularChat || regularChatInput.trim().length === 0) &&
                      styles.pressed,
                  ]}
                  onPress={handleSubmitRegularChat}
                  disabled={submittingRegularChat || regularChatInput.trim().length === 0}
                >
                  <MaterialIcons
                    name="send"
                    size={18}
                    color={
                      submittingRegularChat || regularChatInput.trim().length === 0
                        ? colors.gray3
                        : colors.gray4
                    }
                  />
                </Pressable>
              </View>
            </>
          ) : null}
        </KeyboardAvoidingView>
      </Modal>
      <DialogOverlay
        visible={Boolean(voteVotersModal)}
        onClose={() => setVoteVotersModal(null)}
        overlayStyle={styles.voteVotersModalOverlay}
        cardStyle={styles.voteVotersModalCard}
      >
        {voteVotersModal ? (
          <>
            <Text style={styles.voteVotersModalTitle}>{voteVotersModal.optionLabel}</Text>
            <View style={styles.voteVotersList}>
              {voteVotersModal.voters.map((nickname, index) => (
                <View key={`${nickname}-${index}`} style={styles.voteVotersRow}>
                  <View style={styles.voteVotersAvatar}>
                    <DefaultProfileAvatar size={16} />
                  </View>
                  <Text style={styles.voteVotersName}>{nickname}</Text>
                </View>
              ))}
              {voteVotersModal.voters.length === 0 ? (
                <Text style={styles.voteVotersEmptyText}>아직 투표자가 없습니다.</Text>
              ) : null}
            </View>
          </>
        ) : null}
      </DialogOverlay>
      <Modal
        visible={Boolean(photoViewer)}
        transparent
        animationType="fade"
        onRequestClose={() => setPhotoViewer(null)}
      >
        {photoViewer ? (
          <View style={styles.photoViewerOverlay}>
            <View style={[styles.photoViewerHeader, { paddingTop: insets.top + spacing.sm }]}>
              <Text style={styles.photoViewerCounter}>
                {photoViewer.index + 1} / {photoViewer.photos.length}
              </Text>
              <Pressable
                style={({ pressed }) => [styles.photoViewerClose, pressed && styles.pressed]}
                onPress={() => setPhotoViewer(null)}
              >
                <MaterialIcons name="close" size={26} color={colors.white} />
              </Pressable>
            </View>
            <FlatList
              data={photoViewer.photos}
              horizontal
              pagingEnabled
              initialScrollIndex={photoViewer.index}
              getItemLayout={(_, index) => ({
                length: screenWidth,
                offset: screenWidth * index,
                index,
              })}
              showsHorizontalScrollIndicator={false}
              onMomentumScrollEnd={(event) => {
                const newIndex = Math.round(
                  event.nativeEvent.contentOffset.x / screenWidth,
                );
                setPhotoViewer((prev) => (prev ? { ...prev, index: newIndex } : null));
              }}
              renderItem={({ item }) => (
                <View style={[styles.photoViewerItem, { width: screenWidth, height: screenHeight }]}>
                  <Image
                    source={{ uri: item }}
                    style={{ width: screenWidth, height: screenHeight * 0.8 }}
                    resizeMode="contain"
                  />
                </View>
              )}
              keyExtractor={(item, i) => `photo-viewer-${i}-${item}`}
            />
          </View>
        ) : null}
      </Modal>
    </View>
  );
}

function MeetingCreateFlow({
  onClose,
  onDirtyChange,
}: {
  onClose: () => void;
  onDirtyChange?: (dirty: boolean) => void;
}) {
  const [step, setStep] = useState<CreateStep>(1);
  const [maxStep, setMaxStep] = useState<CreateStep>(1);
  const [name, setName] = useState('');
  const [desc, setDesc] = useState('');
  const [isPublic, setIsPublic] = useState<boolean | null>(null);
  const [categories, setCategories] = useState<string[]>([]);
  const [region, setRegion] = useState('');
  const [targets, setTargets] = useState<string[]>([]);
  const [links, setLinks] = useState<LinkItem[]>([{ text: '', url: '' }]);
  const [checkingName, setCheckingName] = useState(false);
  const [checkedName, setCheckedName] = useState<{
    value: string;
    duplicate: boolean;
  } | null>(null);
  const [clubImageMode, setClubImageMode] = useState<ClubProfileMode>('empty');
  const [clubImageUrl, setClubImageUrl] = useState('');
  const [uploadingClubImage, setUploadingClubImage] = useState(false);
  const [creating, setCreating] = useState(false);

  const categoryOptions = useMemo(
    () => Object.keys(categoryCodeByLabel),
    [],
  );
  const targetOptions = useMemo(() => Object.keys(participantCodeByLabel), []);

  const canNext =
    step === 1
      ? name.trim().length > 0 &&
        desc.trim().length > 0 &&
        checkedName?.value === name.trim() &&
        !checkedName.duplicate
      : step === 2
        ? isPublic !== null
        : step === 3
          ? categories.length > 0 && region.trim().length > 0 && targets.length > 0
          : true;

  const isDirty = useMemo(() => {
    if (step !== 1) return true;
    if (name.trim().length > 0) return true;
    if (desc.trim().length > 0) return true;
    if (isPublic !== null) return true;
    if (categories.length > 0) return true;
    if (region.trim().length > 0) return true;
    if (targets.length > 0) return true;
    if (checkedName !== null) return true;
    return links.some((item) => item.text.trim().length > 0 || item.url.trim().length > 0);
  }, [categories.length, checkedName, desc, isPublic, links, name, region, step, targets.length]);

  useEffect(() => {
    onDirtyChange?.(isDirty);
    return () => {
      onDirtyChange?.(false);
    };
  }, [isDirty, onDirtyChange]);

  const handleRequestClose = useCallback(() => {
    if (!isDirty) {
      onClose();
      return;
    }

    Alert.alert('알림', '현재 페이지는 저장되지 않습니다.', [
      { text: '취소', style: 'cancel' },
      { text: '닫기', style: 'destructive', onPress: onClose },
    ]);
  }, [isDirty, onClose]);

  const handleCheckName = async () => {
    const normalized = name.trim();
    if (!normalized) {
      showToast('모임 이름을 입력해야 합니다.');
      return;
    }

    setCheckingName(true);
    try {
      const duplicate = await checkClubNameDuplicate(normalized);
      setCheckedName({ value: normalized, duplicate });
      showToast(duplicate ? '이미 사용 중인 모임 이름입니다.' : '사용 가능한 모임 이름입니다.');
    } catch (error) {
      if (!(error instanceof ApiError)) {
        showToast('모임 이름 중복 확인에 실패했습니다.');
      }
    } finally {
      setCheckingName(false);
    }
  };

  const handlePickClubImage = useCallback(() => {
    if (uploadingClubImage) return;

    const pick = async () => {
      setUploadingClubImage(true);
      try {
        const imageUrl = await pickAndUploadImage('CLUB');
        if (!imageUrl) return;
        setClubImageMode('uploaded');
        setClubImageUrl(imageUrl);
        showToast('모임 이미지를 적용했습니다.');
      } catch (error) {
        if (!(error instanceof ApiError)) {
          showToast('이미지 업로드에 실패했습니다.');
        }
      } finally {
        setUploadingClubImage(false);
      }
    };

    void pick();
  }, [uploadingClubImage]);

  const handleUseDefaultClubImage = useCallback(() => {
    setClubImageMode('default');
    setClubImageUrl('');
  }, []);

  const handleCreateClub = async () => {
    if (creating) return;

    const categoryCodes = categories
      .map((label) => categoryCodeByLabel[label])
      .filter((code): code is ClubCategoryCode => Boolean(code));

    const participantCodes = targets
      .map((label) => participantCodeByLabel[label])
      .filter((code): code is ClubParticipantTypeCode => Boolean(code));

    if (categoryCodes.length === 0 || participantCodes.length === 0) {
      showToast('카테고리와 모임 대상을 확인해야 합니다.');
      return;
    }

    const normalizedLinks = links
      .map((item) => ({
        label: item.text.trim(),
        link: item.url.trim(),
      }))
      .filter((item) => item.link.length > 0)
      .slice(0, 4);

    setCreating(true);
    try {
      await createClub({
        name: name.trim(),
        description: desc.trim(),
        region: region.trim(),
        category: categoryCodes,
        participantTypes: participantCodes,
        links: normalizedLinks,
        open: isPublic ?? true,
        profileImageUrl: clubImageMode === 'uploaded' ? clubImageUrl || undefined : undefined,
      });
      showToast('모임이 생성되었습니다.');
      onClose();
    } catch (error) {
      if (!(error instanceof ApiError)) {
        showToast('모임 생성에 실패했습니다.');
      }
    } finally {
      setCreating(false);
    }
  };

  const goNext = () => {
    if (step < 4) {
      const next = (step + 1) as CreateStep;
      setStep(next);
      if (next > maxStep) setMaxStep(next);
    }
  };
  const goPrev = () => {
    if (step > 1) setStep((prev) => (prev - 1) as CreateStep);
  };

  const toggleItem = (
    item: string,
    list: string[],
    setter: Dispatch<SetStateAction<string[]>>,
    max = 6,
  ) => {
    setter((prev) => {
      if (prev.includes(item)) return prev.filter((x) => x !== item);
      if (prev.length >= max) return prev;
      return [...prev, item];
    });
  };

  return (
    <KeyboardAvoidingView
      style={styles.createContainer}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <ScrollView
        style={styles.createContainer}
        contentContainerStyle={styles.createContent}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.createBreadcrumbWrap}>
          <Pressable
            style={({ pressed }) => [styles.breadcrumbPress, pressed && styles.pressed]}
            onPress={handleRequestClose}
          >
            <Text style={styles.breadcrumbText}>모임</Text>
            <MaterialIcons name="chevron-right" size={16} color={colors.gray4} />
            <Text style={[styles.breadcrumbText, styles.breadcrumbActive]}>새 모임 생성</Text>
          </Pressable>
        </View>
        <View style={styles.createBody}>
          <View style={styles.stepRow}>
            {[1, 2, 3, 4].map((i) => {
              const active = i === step;
              const visited = i !== step && i <= maxStep;
              const future = i > maxStep;
              return (
                <Pressable
                  key={i}
                  style={[
                    styles.stepDot,
                    active ? styles.stepDotActive : visited ? styles.stepDotDone : styles.stepDotFuture,
                  ]}
                  onPress={() => setStep(i as CreateStep)}
                  disabled={!visited}
                >
                  <Text
                    style={[
                      styles.stepText,
                      active || visited ? styles.stepTextActive : styles.stepTextFuture,
                    ]}
                  >
                    {i}
                  </Text>
                </Pressable>
              );
            })}
          </View>

          {step === 1 && (
            <View style={styles.sectionBox}>
              <Text style={styles.sectionTitle}>독서 모임 이름을 입력해주세요!</Text>
              <View style={styles.inlineRow}>
                <FormTextInput
                  value={name}
                  onChangeText={(value) => {
                    setName(value);
                    const normalized = value.trim();
                    if (checkedName && checkedName.value !== normalized) {
                      setCheckedName(null);
                    }
                  }}
                  placeholder="독서 모임 이름을 입력해주세요"
                  placeholderTextColor={colors.gray3}
                  style={[styles.input, styles.inlineInput]}
                  maxLength={INPUT_LIMITS.CLUB_NAME}
                />
                <Pressable
                  style={({ pressed }) => [
                    styles.dupCheckButton,
                    checkingName && styles.dupCheckButtonDisabled,
                    pressed && styles.pressed,
                  ]}
                  onPress={() => {
                    void handleCheckName();
                  }}
                  disabled={checkingName}
                >
                  <Text style={styles.dupCheckText}>
                    {checkingName ? '확인 중...' : '중복확인'}
                  </Text>
                </Pressable>
              </View>
              {checkedName && checkedName.value === name.trim() ? (
                <Text
                  style={[
                    styles.nameCheckText,
                    checkedName.duplicate ? styles.nameCheckErrorText : styles.nameCheckSuccessText,
                  ]}
                >
                  {checkedName.duplicate
                    ? '이미 사용 중인 모임 이름입니다.'
                    : '사용 가능한 모임 이름입니다.'}
                </Text>
              ) : null}
              <Text style={styles.helperText}>
                다른 이름을 입력하거나, 기수 또는 지역명을 추가해 구분해주세요. 예) 독서처럼 2기, 독서처럼 서울, 북적북적 인문학팀
              </Text>

              <Text style={[styles.sectionTitle, { marginTop: spacing.lg }]}>
                모임의 소개글을 입력해주세요!
              </Text>
              <FormTextInput
                value={desc}
                onChangeText={setDesc}
                placeholder="자유롭게 입력해주세요! (500자 제한)"
                placeholderTextColor={colors.gray3}
                style={[styles.input, styles.textArea]}
                multiline
                maxLength={INPUT_LIMITS.CLUB_DESCRIPTION}
              />
              <Text style={styles.bookshelfComposerCounter}>
                {desc.length}/{INPUT_LIMITS.CLUB_DESCRIPTION}
              </Text>
            </View>
          )}

          {step === 2 && (
            <View style={styles.sectionBox}>
              <Text style={styles.sectionTitle}>모임의 프로필 사진을 업로드 해주세요!</Text>
              <View style={styles.createProfileCard}>
                <Pressable
                  style={({ pressed }) => [
                    styles.createProfilePreviewLarge,
                    clubImageMode === 'empty' && styles.createProfilePreviewEmpty,
                    pressed && styles.pressed,
                  ]}
                  onPress={handlePickClubImage}
                >
                  {clubImageMode === 'uploaded' && clubImageUrl ? (
                    <Image
                      source={{ uri: clubImageUrl }}
                      style={styles.createProfilePreviewLargeImage}
                      resizeMode="cover"
                    />
                  ) : clubImageMode === 'default' ? (
                    <ClubDefaultProfileArtwork variant="large" />
                  ) : (
                    <View style={styles.createProfileEmptyState}>
                      <View style={styles.createProfileCameraBadge}>
                        <MaterialIcons name="photo-camera" size={26} color={colors.primary1} />
                      </View>
                      <Text style={styles.createProfileEmptyTitle}>사진 업로드</Text>
                      <Text style={styles.createProfileEmptyDescription}>
                        탭하여 앨범에서 사진을 선택하세요
                      </Text>
                    </View>
                  )}
                </Pressable>

                <View style={styles.createProfileButtonRow}>
                  <Pressable
                    style={({ pressed }) => [
                      styles.createProfileBtn,
                      clubImageMode === 'default' && styles.createProfileBtnSelected,
                      pressed && styles.pressed,
                    ]}
                    onPress={handleUseDefaultClubImage}
                  >
                    <MaterialIcons
                      name="auto-awesome"
                      size={15}
                      color={clubImageMode === 'default' ? colors.white : colors.primary1}
                    />
                    <Text
                      style={[
                        styles.createProfileBtnText,
                        clubImageMode === 'default' && styles.createProfileBtnTextSelected,
                      ]}
                    >
                      기본 이미지
                    </Text>
                  </Pressable>

                  <Pressable
                    style={({ pressed }) => [
                      styles.createProfileBtn,
                      styles.createProfileBtnPrimary,
                      uploadingClubImage && styles.createProfileActionButtonDisabled,
                      pressed && !uploadingClubImage && styles.pressed,
                    ]}
                    onPress={handlePickClubImage}
                    disabled={uploadingClubImage}
                  >
                    <MaterialIcons name="photo-camera" size={15} color={colors.primary1} />
                    <Text style={styles.createProfileBtnTextPrimary}>
                      {uploadingClubImage ? '업로드 중...' : '사진 업로드'}
                    </Text>
                  </Pressable>
                </View>

                <Text style={styles.createProfileHint}>
                  프로필 이미지는 나중에 모임 관리 화면에서 다시 변경할 수 있습니다.
                </Text>
              </View>

              <Text style={[styles.sectionTitle, { marginTop: spacing.lg }]}>
                모임의 공개여부를 알려주세요!
              </Text>
              <View style={styles.createVisibilityRow}>
                {[
                  {
                    label: '공개',
                    description: '검색과 탐색에서 모임을 찾을 수 있어요.',
                    value: true,
                    icon: 'public' as const,
                  },
                  {
                    label: '비공개',
                    description: '승인된 사람 중심으로 조용히 운영할 수 있어요.',
                    value: false,
                    icon: 'lock-outline' as const,
                  },
                ].map((option) => {
                  const value = option.value;
                  const active = isPublic === value;
                  return (
                    <Pressable
                      key={option.label}
                      style={({ pressed }) => [
                        styles.createVisibilityCard,
                        active && styles.createVisibilityCardActive,
                        pressed && styles.pressed,
                      ]}
                      onPress={() => setIsPublic(value)}
                    >
                      <View
                        style={[
                          styles.createVisibilityIconWrap,
                          active && styles.createVisibilityIconWrapActive,
                        ]}
                      >
                        <MaterialIcons
                          name={option.icon}
                          size={18}
                          color={active ? colors.white : colors.primary1}
                        />
                      </View>
                      <View style={styles.createVisibilityTextWrap}>
                        <Text
                          style={[
                            styles.createVisibilityTitle,
                            active && styles.createVisibilityTitleActive,
                          ]}
                        >
                          {option.label}
                        </Text>
                        <Text
                          style={[
                            styles.createVisibilityDescription,
                            active && styles.createVisibilityDescriptionActive,
                          ]}
                        >
                          {option.description}
                        </Text>
                      </View>
                    </Pressable>
                  );
                })}
              </View>
            </View>
          )}

          {step === 3 && (
            <View style={styles.sectionBox}>
              <Text style={styles.sectionTitle}>선호하는 독서 카테고리를 선택해주세요!</Text>
              <View style={styles.chipGrid}>
                {categoryOptions.map((c) => {
                  const active = categories.includes(c);
                  return (
                    <Pressable
                      key={c}
                      onPress={() => toggleItem(c, categories, setCategories)}
                      style={({ pressed }) => [
                        styles.chip,
                        active ? styles.chipActive : null,
                        pressed && styles.pressed,
                      ]}
                    >
                      <Text style={[styles.chipText, active ? styles.chipTextActive : null]}>{c}</Text>
                    </Pressable>
                  );
                })}
              </View>

              <Text style={[styles.sectionTitle, { marginTop: spacing.md }]}>
                활동 지역을 입력해주세요! (40자 제한)
              </Text>
              <FormTextInput
                value={region}
                onChangeText={setRegion}
                placeholder="활동 지역을 입력해주세요 (40자 제한)"
                placeholderTextColor={colors.gray3}
                style={styles.input}
                maxLength={INPUT_LIMITS.CLUB_REGION}
              />

              <Text style={[styles.sectionTitle, { marginTop: spacing.md }]}>
                모임의 대상을 선택해주세요!
              </Text>
              <View style={styles.chipGrid}>
                {targetOptions.map((t) => {
                  const active = targets.includes(t);
                  return (
                    <Pressable
                      key={t}
                      onPress={() => toggleItem(t, targets, setTargets)}
                      style={({ pressed }) => [
                        styles.chip,
                        active ? styles.chipActive : null,
                        pressed && styles.pressed,
                      ]}
                    >
                      <Text style={[styles.chipText, active ? styles.chipTextActive : null]}>{t}</Text>
                    </Pressable>
                  );
                })}
              </View>
            </View>
          )}

          {step === 4 && (
            <View style={styles.sectionBox}>
              <Text style={styles.sectionTitle}>SNS나 링크 연동이 있다면 해주세요! (선택)</Text>
              {links.map((link, idx) => (
                <View key={idx} style={styles.formGroup}>
                  <FormTextInput
                    value={link.text}
                    onChangeText={(v) => {
                      setLinks((prev: LinkItem[]) => {
                        const copy = [...prev];
                        copy[idx] = { ...copy[idx], text: v };
                        return copy;
                      });
                    }}
                    placeholder="링크 대체 텍스트 입력(최대 20자)"
                    placeholderTextColor={colors.gray3}
                    style={styles.input}
                    maxLength={INPUT_LIMITS.CLUB_LINK_LABEL}
                  />
                  <FormTextInput
                    value={link.url}
                    onChangeText={(v) => {
                      setLinks((prev: LinkItem[]) => {
                        const copy = [...prev];
                        copy[idx] = { ...copy[idx], url: v };
                        return copy;
                      });
                    }}
                    placeholder="링크 입력(최대 100자)"
                    placeholderTextColor={colors.gray3}
                    style={styles.input}
                    fieldType="url"
                    maxLength={INPUT_LIMITS.CLUB_LINK_URL}
                  />
                </View>
              ))}
              {links.length < 4 ? (
                <Pressable
                  style={({ pressed }) => [styles.addLinkButton, pressed && styles.pressed]}
                  onPress={() => setLinks((prev: LinkItem[]) => [...prev, { text: '', url: '' }])}
                >
                  <Text style={styles.addLinkText}>+</Text>
                </Pressable>
              ) : (
                <Text style={styles.helperText}>링크는 최대 4개까지 추가할 수 있습니다.</Text>
              )}
            </View>
          )}

          <View style={[styles.navRow, step === 1 ? styles.navRowSingle : null]}>
            {step > 1 ? (
              <Pressable
                style={({ pressed }) => [styles.secondaryButton, pressed && styles.pressed, styles.buttonGrow]}
                onPress={goPrev}
              >
                <Text style={styles.secondaryText}>이전</Text>
              </Pressable>
            ) : null}
            <Pressable
              style={({ pressed }) => [
                styles.primaryButton,
                (!canNext || (step === 4 && creating)) && styles.primaryButtonDisabled,
                pressed && styles.pressed,
                step === 1 ? styles.buttonSingle : styles.buttonGrow,
              ]}
              disabled={!canNext || (step === 4 && creating)}
              onPress={() => {
                if (step === 4) {
                  void handleCreateClub();
                  return;
                }
                goNext();
              }}
            >
              <Text
                style={[
                  styles.primaryText,
                  (!canNext || (step === 4 && creating)) && styles.disabledText,
                ]}
              >
                {step === 4 ? (creating ? '완료 중...' : '완료') : '다음'}
              </Text>
            </Pressable>
          </View>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}
