import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import type { Dispatch, SetStateAction } from 'react';
import {
  Alert,
  Animated,
  FlatList,
  Image,
  Keyboard,
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
  TextInputContentSizeChangeEventData,
} from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import {
  useNavigation,
  useRoute,
  useScrollToTop,
  type EventArg,
  type NavigationAction,
  type ParamListBase,
  type NavigationProp,
  type RouteProp,
} from '@react-navigation/native';
import type { TabParamList } from '../navigation/types';


import { buttonSize, colors, interactionOpacity, layers, motion, radius, spacing, typography } from '../theme';
import { navigateToHome, parsePositiveIntParam } from '../navigation/navigateToHome';
import { useConsumeRouteParam } from '../hooks/useConsumeRouteParam';
import { useUnsavedChangesGuard } from '../hooks/useUnsavedChangesGuard';
import { BookFlipLoadingScreen } from '../components/common/BookFlipLoadingScreen';
import { DefaultProfileAvatar } from '../components/common/DefaultProfileAvatar';
import { FeedbackPressable as Pressable } from '../components/common/FeedbackPressable';
import { FloatingActionButton } from '../components/common/FloatingActionButton';
import { ScreenLayout } from '../components/common/ScreenLayout';
import { ActionMenu, type ActionMenuItem } from '../components/common/ActionMenu';
import {
  BottomSheetActionMenu,
  type BottomSheetActionMenuItem,
} from '../components/common/BottomSheetActionMenu';
import { DateTimeField } from '../components/common/DateTimeField';
import { DialogOverlay } from '../components/common/DialogOverlay';
import { FormTextInput } from '../components/common/FormTextInput';
import { ReportMemberModal, type ReportMemberModalState } from '../components/common/ReportMemberModal';
import { ToastHost } from '../components/common/ToastHost';
import { MeetingListCard } from '../components/feature/groups/MeetingListCard';
import { MeetingListCardSkeleton } from '../components/feature/groups/MeetingListCardSkeleton';
import { MyGroupsDropdownCard } from '../components/feature/groups/MyGroupsDropdownCard';
import { MyGroupsDropdownCardSkeleton } from '../components/feature/groups/MyGroupsDropdownCardSkeleton';
import { useAuthGate } from '../contexts/AuthGateContext';
import { useLanguage } from '../contexts/LanguageContext';
import {
  ApiError,
  PROFILE_INCOMPLETE_MESSAGE,
  isProfileIncompleteApiError,
} from '../services/api/http';
import { issueImageUploadUrl } from '../services/api/authApi';
import { useMeetingDiscover } from './meeting/useMeetingDiscover';
import { fetchClubWorkspaceData } from './meeting/workspaceLoader';
import {
  checkClubNameDuplicate,
  createClub,
  fetchClubHome,
  fetchClubMyMembership,
  fetchClubParticipants,
  joinClub,
  type ClubCategoryCode,
  type ClubMembershipStatus,
  type ClubParticipant,
  type ClubParticipantTypeCode,
  type ClubSearchOutputFilter,
} from '../services/api/clubApi';
import { CATEGORY_LABEL_TO_CODE } from '../constants/domain/category';
import { PARTICIPANT_LABEL_TO_CODE } from '../constants/domain/participant';
import { fetchMyProfile, setFollowingMember } from '../services/api/memberApi';
import { triggerSelectionHaptic } from '../utils/haptics';
import { showToast } from '../utils/toast';
import { pickAndUploadImage as pickAndUploadImageUtil } from '../utils/imageUpload';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { INPUT_LIMITS } from '../constants/inputLimits';
import { CLUB_DEFAULT_IMAGE } from '../constants/defaultAssets';
import { CHAT_ICON_URI } from '../constants/iconMap';
import {
  buildCalendarDays,
  formatCalendarMonthLabel,
  formatDotDate,
  dateToDotDateTime,
  dotDateTimeToDate,
  formatDotDateValue,
  formatDotDateTime,
  formatGenerationLabel,
  formatRegularGroupLabel,
  parseDotDate,
  parseGenerationNumber,
  sanitizeGenerationInput,
  toApiDateTime,
  toGroupTargets,
  toOpenableContactLink,
  toTeamLabel,
} from './meeting/formatters';

const ChatIcon = CHAT_ICON_URI;

type PendingGroupNotificationTarget = {
  type: 'meeting' | 'notice';
  id: number;
};

import {
  formatContactLabel,
  mapClubStatusToApplication,
  normalizeClubContacts,
} from './meeting/mappers';
import { styles } from './meeting/meetingStyles';
import { SkeletonBox } from '../components/common/SkeletonBox';
import { GroupNoticeView } from './meeting/GroupNoticeView';
import { GroupBookshelfView } from './meeting/GroupBookshelfView';
import { GroupManagementOverlay } from './meeting/GroupManagementOverlay';
import { useNoticeState } from './meeting/useNoticeState';
import {
  getTeamManageContentDropZoneId,
  getTeamManageQuickDropZoneId,
  useBookshelfState,
} from './meeting/useBookshelfState';
import { useManagementState } from './meeting/useManagementState';
import { MeetingChatOverlay } from './meeting/MeetingChatOverlay';
import { useMeetingChatState } from './meeting/useMeetingChatState';
import type {
  Group,
  CreateStep,
  NoticeTag,
  NoticeBookshelfAttachment,
  NoticeItem,
  NoticeComment,
  CursorPageState,
  BookshelfItem,
  BookshelfDetailTab,
  BookshelfViewMode,
  BookshelfPostItem,
  NoticeCommentMenuState,
  BookshelfPostMenuState,
  RegularGroupPostItem,
  RegularGroupMemberItem,
  RegularMeetingGroupItem,
  RegularMeetingInfo,
  TeamManageMemberItem,
  TeamManageTeamItem,
  GroupManagementScreen,
  GroupJoinRequestItem,
  GroupMemberRole,
  GroupMemberItem,
  GroupEditDraft,
  BookshelfCreateDraft,
  ClubProfileMode,
  NoticePollOption,
  NoticePoll,
  NoticeDraft,
  MeetingInputFilter,
} from './meeting/types';
import { inputFilters } from './meeting/types';
import {
  buildBookshelfCreateDraft,
  buildNoticeDraft,
  resolveRegularMeetingId,
  toNoticeBookshelfAttachment,
  mapClubStatusToRole,
  logMeetingAction,
  mapBookshelfDetailToItem,
  mapBookshelfTopicToPostItem,
  mapBookshelfReviewToPostItem,
  sortBookshelfPostsByLatest,
  areRegularGroupPostsEqual,
  getStarIconName,
  formatRatingLabel,
  normalizeAverageRating,
  formatAverageRating,
  getClubHomeTagTone,
  toNoticeTags,
  toEditDraft,
  mergeNoticeDetail,
  mapNoticeCommentToUi,
  mapMeetingToRegularMeetingInfo,
  ensureRegularMeetingInfo,
  outputFilterOptions,
  MEETING_SEARCH_KEYWORD_MAX_LENGTH,
} from './meeting/helpers';



type LinkItem = { text: string; url: string };

function normalizeStringListForCompare(items: string[]) {
  return [...items].map((item) => item.trim()).sort();
}

function normalizeContactLinksForCompare(items: GroupEditDraft['links']) {
  return items
    .map((item) => ({
      label: item.label?.trim() ?? '',
      link: item.link.trim(),
    }))
    .filter((item) => item.link.length > 0);
}

function normalizeBookSourceForCompare(source: BookshelfCreateDraft['sourceBook']) {
  if (!source) return null;
  return {
    isbn: source.isbn.trim(),
    title: source.title.trim(),
    author: source.author.trim(),
    coverImage: source.coverImage ?? '',
    publisher: source.publisher ?? '',
  };
}

function areGroupEditDraftsEqual(left: GroupEditDraft, right: GroupEditDraft) {
  return (
    left.name.trim() === right.name.trim() &&
    left.description.trim() === right.description.trim() &&
    left.region.trim() === right.region.trim() &&
    left.isPrivate === right.isPrivate &&
    (left.imageUrl ?? '') === (right.imageUrl ?? '') &&
    JSON.stringify(normalizeContactLinksForCompare(left.links)) ===
      JSON.stringify(normalizeContactLinksForCompare(right.links)) &&
    JSON.stringify(normalizeStringListForCompare(left.categories)) ===
      JSON.stringify(normalizeStringListForCompare(right.categories)) &&
    JSON.stringify(normalizeStringListForCompare(left.targets)) ===
      JSON.stringify(normalizeStringListForCompare(right.targets))
  );
}

function areBookshelfCreateDraftsEqual(
  left: BookshelfCreateDraft,
  right: BookshelfCreateDraft,
) {
  return (
    JSON.stringify(normalizeBookSourceForCompare(left.sourceBook)) ===
      JSON.stringify(normalizeBookSourceForCompare(right.sourceBook)) &&
    left.session.trim() === right.session.trim() &&
    left.regularMeetingName.trim() === right.regularMeetingName.trim() &&
    left.meetingLocation.trim() === right.meetingLocation.trim() &&
    left.meetingDate.trim() === right.meetingDate.trim() &&
    JSON.stringify(normalizeStringListForCompare(left.categories)) ===
      JSON.stringify(normalizeStringListForCompare(right.categories))
  );
}

const BOOKSHELF_MEETING_TITLE_MAX_LENGTH = 12;
const BOOKSHELF_MEETING_LOCATION_MAX_LENGTH = 12;
const ISBN13_REGEX = /^\d{13}$/;
const MAX_REGULAR_GROUP_COUNT = 10;
const MEETING_TAB_DOUBLE_TAP_WINDOW_MS = 450;
const GROUP_TITLE_FOCUS_TOP_OFFSET = spacing.xs;
const GROUP_TITLE_FOCUS_SCROLL_SAFETY = spacing.md;
const BOOKSHELF_DETAIL_FOCUS_TOP_OFFSET = spacing.sm;
const APPLY_INPUT_KEYBOARD_GAP = spacing.md;
const APPLY_KEYBOARD_SCROLL_EXTRA_SPACE = spacing.xxl * 4;
const APPLY_KEYBOARD_MEASURE_DELAY_MS = 80;
const NOTICE_TITLE_INPUT_MIN_HEIGHT = 96;
const NOTICE_TITLE_INPUT_MAX_HEIGHT = 152;
const NOTICE_CONTENT_INPUT_MIN_HEIGHT = 280;
const NOTICE_CONTENT_INPUT_MAX_HEIGHT = 360;
const NOTICE_INPUT_HEIGHT_SAFETY = spacing.sm;
const NOTICE_CONTENT_SCROLL_CHAR_THRESHOLD = 220;
const NOTICE_CONTENT_SCROLL_LINE_THRESHOLD = 8;
const CLUB_PARTICIPANTS_PRIVATE_MESSAGE = '모임 회원은 가입 후에 조회 가능합니다';
const CLUB_PARTICIPANT_GRID_BREAKPOINT = 640;


const MIN_BOOK_FLIP_LOADING_MS = 1000;
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


function pickAndUploadImage(type: 'CLUB' | 'NOTICE'): Promise<string | null> {
  return pickAndUploadImageUtil(
    (fileName, contentType) => issueImageUploadUrl(type, fileName, contentType),
    type.toLowerCase(),
  );
}

function isMissingClubMembershipError(error: ApiError) {
  return (
    error.code === 'CLUB_MEMBER_404' ||
    (error.status === 404 && error.message.includes('해당 클럽 회원'))
  );
}

function getNoticeInputHeight(contentHeight: number, minHeight: number, maxHeight: number) {
  const measuredHeight = Math.ceil(contentHeight + NOTICE_INPUT_HEIGHT_SAFETY);
  return Math.min(Math.max(measuredHeight, minHeight), maxHeight);
}

function getStableNoticeInputHeight(
  text: string,
  contentHeight: number,
  minHeight: number,
  maxHeight: number,
) {
  if (text.length === 0) return minHeight;
  return getNoticeInputHeight(contentHeight, minHeight, maxHeight);
}

function shouldUpdateNoticeInputHeight(currentHeight: number, nextHeight: number) {
  return Math.abs(currentHeight - nextHeight) > 1;
}

function shouldEnableNoticeContentInputScroll(text: string) {
  if (text.length >= NOTICE_CONTENT_SCROLL_CHAR_THRESHOLD) return true;
  return text.split(/\r?\n/).length >= NOTICE_CONTENT_SCROLL_LINE_THRESHOLD;
}

function getInitialNoticeContentInputHeight(text: string) {
  if (!text.trim()) return NOTICE_CONTENT_INPUT_MIN_HEIGHT;
  return shouldEnableNoticeContentInputScroll(text)
    ? NOTICE_CONTENT_INPUT_MAX_HEIGHT
    : NOTICE_CONTENT_INPUT_MIN_HEIGHT;
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

function getClubParticipantRoleLabel(status: ClubParticipant['clubMemberStatus']) {
  if (status === 'OWNER') return '개설자';
  if (status === 'STAFF') return '운영진';
  return '회원';
}

function isJoinedClubStatus(status?: ClubMembershipStatus) {
  return status === 'MEMBER' || status === 'STAFF' || status === 'OWNER';
}

function getJoinFallbackStatus(group: Group): ClubMembershipStatus {
  return group.isPrivate ? 'PENDING' : 'MEMBER';
}

function applyGroupMembershipStatus(group: Group, status: ClubMembershipStatus): Group {
  return {
    ...group,
    membershipStatus: status,
    applicationStatus: mapClubStatusToApplication(status),
  };
}

function mergeUpdatedClubGroup(current: Group, updated: Group): Group {
  const nextApplicationStatus =
    updated.applicationStatus ??
    (updated.membershipStatus !== undefined
      ? mapClubStatusToApplication(updated.membershipStatus)
      : current.applicationStatus);

  return {
    ...current,
    ...updated,
    id: current.id,
    clubId: current.clubId ?? updated.clubId,
    membershipStatus: updated.membershipStatus ?? current.membershipStatus,
    applicationStatus: nextApplicationStatus,
  };
}

function upsertGroupByClubId(groups: Group[], nextGroup: Group): Group[] {
  const clubId = nextGroup.clubId;
  if (typeof clubId !== 'number') return groups;
  if (!groups.some((group) => group.clubId === clubId)) {
    return [nextGroup, ...groups];
  }
  return groups.map((group) =>
    group.clubId === clubId ? mergeUpdatedClubGroup(group, nextGroup) : group,
  );
}



export function MeetingScreen() {
  const meetingScrollRef = useRef<ScrollView>(null);
  const meetingScrollYRef = useRef(0);
  const applyInputRefByIdRef = useRef<Record<string, TextInput | null>>({});
  const keyboardTopYRef = useRef<number | null>(null);
  const applyKeyboardScrollTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  useScrollToTop(meetingScrollRef);
  const navigation = useNavigation<NavigationProp<TabParamList, 'Meeting'>>();
  const route = useRoute<RouteProp<TabParamList, 'Meeting'>>();
  const { requireAuth, isLoggedIn } = useAuthGate();
  const { l } = useLanguage();
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
  const [applyKeyboardInset, setApplyKeyboardInset] = useState(0);
  const [pendingOpenClubId, setPendingOpenClubId] = useState<number | null>(null);
  const [pendingOpenMeetingId, setPendingOpenMeetingId] = useState<number | null>(null);
  const [pendingOpenNoticeId, setPendingOpenNoticeId] = useState<number | null>(null);
  const [openingClubLoading, setOpeningClubLoading] = useState(false);

  const [search, setSearch] = useState('');
  const [activeInputFilter, setActiveInputFilter] = useState<MeetingInputFilter | null>(null);
  const [selectedOutputFilter, setSelectedOutputFilter] =
    useState<ClubSearchOutputFilter>('ALL');
  const [outputFilterOpen, setOutputFilterOpen] = useState(false);
  const [refreshing, setRefreshing] = useState(false);

  const {
    myGroups,
    setMyGroups,
    discoverGroups,
    setDiscoverGroups,
    myGroupsLoading,
    discoverLoading,
    loadMyGroups,
    loadDiscoverGroups,
  } = useMeetingDiscover({ search, activeInputFilter, selectedOutputFilter, isLoggedIn });

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

  const refreshMeetingLists = useCallback(async () => {
    await Promise.all([
      loadMyGroups(),
      loadDiscoverGroups(),
    ]);
  }, [loadDiscoverGroups, loadMyGroups]);

  useEffect(() => {
    const unsubscribe = navigation.addListener('focus', () => {
      if (showCreate || activeGroup) return;
      void refreshMeetingLists();
    });

    return unsubscribe;
  }, [activeGroup, navigation, refreshMeetingLists, showCreate]);

  useEffect(() => {
    setAppliedById((prev) => {
      let changed = false;
      const next = { ...prev };

      discoverGroups.forEach((group) => {
        if (!next[group.id]) return;

        const serverApplicationStatus =
          mapClubStatusToApplication(group.membershipStatus) ?? group.applicationStatus;

        if (serverApplicationStatus) {
          if (next[group.id] !== serverApplicationStatus) {
            next[group.id] = serverApplicationStatus;
            changed = true;
          }
          return;
        }

        delete next[group.id];
        changed = true;
      });

      return changed ? next : prev;
    });
  }, [discoverGroups]);

  const patchClubInMeetingLists = useCallback(
    (clubId: number, updater: (group: Group) => Group) => {
      setMyGroups((prev) =>
        prev.map((group) => (group.clubId === clubId ? updater(group) : group)),
      );
      setDiscoverGroups((prev) =>
        prev.map((group) => (group.clubId === clubId ? updater(group) : group)),
      );
      setActiveGroup((prev) => (prev?.clubId === clubId ? updater(prev) : prev));
    },
    [setDiscoverGroups, setMyGroups],
  );

  const handleClubUpdated = useCallback(
    (updatedGroup: Group) => {
      const clubId = updatedGroup.clubId;
      if (typeof clubId !== 'number') return;

      patchClubInMeetingLists(clubId, (group) => mergeUpdatedClubGroup(group, updatedGroup));
      void refreshMeetingLists();
    },
    [patchClubInMeetingLists, refreshMeetingLists],
  );

  const handleClubDeleted = useCallback(
    (clubId: number) => {
      setActiveGroup((prev) => (prev?.clubId === clubId ? null : prev));
      setMyGroups((prev) => prev.filter((group) => group.clubId !== clubId));
      setDiscoverGroups((prev) => prev.filter((group) => group.clubId !== clubId));
      setAppliedById((prev) => {
        const next = { ...prev };
        delete next[`club-${clubId}`];
        return next;
      });
      if (lastVisitedClubIdRef.current === clubId) {
        lastVisitedClubIdRef.current = null;
      }
      void refreshMeetingLists();
    },
    [refreshMeetingLists, setDiscoverGroups, setMyGroups],
  );

  const handleClubCreated = useCallback(async () => {
    await refreshMeetingLists();
  }, [refreshMeetingLists]);

  const scrollMeetingSearchToTop = useCallback((animated = false) => {
    requestAnimationFrame(() => {
      meetingScrollRef.current?.scrollTo({ y: 0, animated });
    });
  }, []);

  const keepApplyInputAboveKeyboard = useCallback((groupId: string, animated = true) => {
    const applyInputRef = applyInputRefByIdRef.current[groupId];
    const keyboardTopY = keyboardTopYRef.current;
    if (!applyInputRef || typeof keyboardTopY !== 'number') return;

    requestAnimationFrame(() => {
      applyInputRef.measureInWindow((
        _x: number,
        inputY: number,
        _width: number,
        inputHeight: number,
      ) => {
        const inputBottomY = inputY + inputHeight;
        const maxInputBottomY = keyboardTopY - APPLY_INPUT_KEYBOARD_GAP;
        const overlapY = inputBottomY - maxInputBottomY;
        if (overlapY <= 0) return;

        meetingScrollRef.current?.scrollTo({
          y: Math.max(0, meetingScrollYRef.current + overlapY),
          animated,
        });
      });
    });
  }, []);

  const scheduleKeepApplyInputAboveKeyboard = useCallback(
    (groupId: string, delayMs = 0) => {
      if (applyKeyboardScrollTimerRef.current) {
        clearTimeout(applyKeyboardScrollTimerRef.current);
      }

      applyKeyboardScrollTimerRef.current = setTimeout(() => {
        applyKeyboardScrollTimerRef.current = null;
        keepApplyInputAboveKeyboard(groupId, false);
      }, delayMs);
    },
    [keepApplyInputAboveKeyboard],
  );

  const focusApplyCard = useCallback((groupId: string) => {
    if (keyboardTopYRef.current === null) return;
    scheduleKeepApplyInputAboveKeyboard(groupId);
  }, [scheduleKeepApplyInputAboveKeyboard]);

  useEffect(() => {
    const showSubscription = Keyboard.addListener('keyboardDidShow', (event) => {
      keyboardTopYRef.current = event.endCoordinates.screenY;
      setApplyKeyboardInset(event.endCoordinates.height);
      if (applyOpenId) {
        scheduleKeepApplyInputAboveKeyboard(applyOpenId, APPLY_KEYBOARD_MEASURE_DELAY_MS);
      }
    });
    const hideSubscription = Keyboard.addListener('keyboardDidHide', () => {
      keyboardTopYRef.current = null;
      setApplyKeyboardInset(0);
    });

    return () => {
      showSubscription.remove();
      hideSubscription.remove();
    };
  }, [applyOpenId, scheduleKeepApplyInputAboveKeyboard]);

  useEffect(() => {
    return () => {
      if (applyKeyboardScrollTimerRef.current) {
        clearTimeout(applyKeyboardScrollTimerRef.current);
      }
    };
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

  const selectedOutputFilterLabel = l(
    outputFilterOptions.find((option) => option.value === selectedOutputFilter)?.label ?? '전체',
  );

  useConsumeRouteParam(
    route.params?.openClubId,
    parsePositiveIntParam,
    setPendingOpenClubId,
    navigation,
    'openClubId',
  );
  useConsumeRouteParam(
    route.params?.openMeetingId,
    parsePositiveIntParam,
    (meetingId) => {
      setPendingOpenMeetingId(meetingId);
      setPendingOpenNoticeId(null);
    },
    navigation,
    'openMeetingId',
  );
  useConsumeRouteParam(
    route.params?.openNoticeId,
    parsePositiveIntParam,
    (noticeId) => {
      setPendingOpenNoticeId(noticeId);
      setPendingOpenMeetingId(null);
    },
    navigation,
    'openNoticeId',
  );

  useEffect(() => {
    if (activeGroup) return;
    meetingTabRetapAtRef.current = 0;
    meetingTabRetapSourceRef.current = null;
    meetingTabRetapClosingRef.current = false;
  }, [activeGroup]);

  useEffect(() => {
    const tabNavigation =
      (navigation.getState().routeNames.includes('Meeting')
        ? (navigation as NavigationProp<TabParamList>)
        : navigation.getParent()) as
        | (NavigationProp<TabParamList> & {
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
                  isProfileIncompleteApiError(error)
                    ? PROFILE_INCOMPLETE_MESSAGE
                    : error.status === 404
                    ? l('이전에 방문한 모임을 찾을 수 없습니다.')
                    : l('이전에 방문한 모임에 접근할 수 없습니다.'),
                );
                scrollMeetingSearchToTop(false);
                return;
              }
              showToast(l('이전에 방문한 모임을 불러오지 못했습니다.'));
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
      | (NavigationProp<TabParamList> & {
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

  const openGroupHomeDirect = useCallback(async (group: Group) => {
    if (typeof group.clubId === 'number' && group.clubId > 0) {
      lastVisitedClubIdRef.current = group.clubId;
    }
    const loadingStartedAt = Date.now();
    setOpeningClubLoading(true);
    setActiveGroup(group);
    await waitForMinimumLoading(loadingStartedAt);
    setOpeningClubLoading(false);
  }, []);

  const openGroupHome = useCallback(
    (group: Group) => {
      if (isLoggedIn) {
        void openGroupHomeDirect(group);
        return;
      }

      setPendingOpenClubId(null);
      setPendingOpenMeetingId(null);
      setPendingOpenNoticeId(null);
      setActiveGroup(null);
      setOpeningClubLoading(false);
      scrollMeetingSearchToTop(false);
      requireAuth(() => {
        void openGroupHomeDirect(group);
      });
    },
    [isLoggedIn, openGroupHomeDirect, requireAuth, scrollMeetingSearchToTop],
  );

  useEffect(() => {
    if (pendingOpenClubId === null) return;
    const targetGroup =
      myGroups.find((group) => group.clubId === pendingOpenClubId) ??
      discoverGroups.find((group) => group.clubId === pendingOpenClubId);
    openGroupHome(targetGroup ?? createPendingClubGroup(pendingOpenClubId));
    setPendingOpenClubId(null);
  }, [discoverGroups, myGroups, openGroupHome, pendingOpenClubId]);

  const pendingNotificationTarget = useMemo<PendingGroupNotificationTarget | null>(() => {
    if (pendingOpenNoticeId !== null) {
      return { type: 'notice', id: pendingOpenNoticeId };
    }
    if (pendingOpenMeetingId !== null) {
      return { type: 'meeting', id: pendingOpenMeetingId };
    }
    return null;
  }, [pendingOpenMeetingId, pendingOpenNoticeId]);

  const clearPendingNotificationTarget = useCallback(() => {
    setPendingOpenMeetingId(null);
    setPendingOpenNoticeId(null);
  }, []);

  const handleOpenApply = (groupId: string) => {
    requireAuth(() => {
      const willOpen = applyOpenId !== groupId;
      setApplyOpenId(willOpen ? groupId : null);
    });
  };

  const handleCloseApply = () => {
    setApplyOpenId(null);
  };

  const handleApplyInputLayout = useCallback(
    (groupId: string) => {
      if (applyOpenId === groupId) {
        focusApplyCard(groupId);
      }
    },
    [applyOpenId, focusApplyCard],
  );

  const handleChangeApplyReason = (groupId: string, value: string) => {
    setApplyReasonById((prev) => ({ ...prev, [groupId]: value }));
  };

  const handleSubmitApply = (group: Group) => {
    requireAuth(() => {
      Keyboard.dismiss();
      const reason = (applyReasonById[group.id] ?? '').trim();
      if (!reason) {
        showToast(l('신청 사유를 입력해야 합니다.'));
        return;
      }
      if (reason.length > INPUT_LIMITS.APPLY_REASON) {
        showToast(l('신청 사유는 {limit}자 이하여야 합니다.', {
          limit: INPUT_LIMITS.APPLY_REASON,
        }));
        return;
      }
      if (typeof group.clubId !== 'number') {
        showToast(l('모임 정보를 찾을 수 없습니다.'));
        return;
      }
      const clubId = group.clubId;

      const submit = async () => {
        try {
          await joinClub(clubId, reason);
          const membership = await fetchClubMyMembership(clubId, {
            suppressErrorToast: true,
          }).catch(() => null);
          const nextStatus = membership?.myStatus ?? getJoinFallbackStatus(group);
          const nextApplicationStatus =
            mapClubStatusToApplication(nextStatus) ??
            (isJoinedClubStatus(nextStatus)
              ? l('가입 완료되었습니다')
              : l('신청 완료되었습니다'));
          const nextGroup = applyGroupMembershipStatus(group, nextStatus);

          patchClubInMeetingLists(clubId, (item) => applyGroupMembershipStatus(item, nextStatus));
          if (isJoinedClubStatus(nextStatus)) {
            setMyGroups((prev) => upsertGroupByClubId(prev, nextGroup));
          }
          setAppliedById((prev) => ({ ...prev, [group.id]: nextApplicationStatus }));
          setApplyOpenId(null);
          setApplyReasonById((prev) => ({ ...prev, [group.id]: '' }));
          showToast(
            isJoinedClubStatus(nextStatus)
              ? l('모임에 가입되었습니다.')
              : l('가입 신청이 완료되었습니다.'),
          );
          void refreshMeetingLists();
        } catch (error) {
          if (!(error instanceof ApiError)) {
            showToast(l('가입 신청에 실패했습니다.'));
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
      <ScreenLayout title={l('모임')} onPressLogo={handlePressHeaderLogo}>
        <MeetingCreateFlow
          onClose={closeCreateFlow}
          onCreated={handleClubCreated}
          onDirtyChange={setCreateDraftDirty}
        />
      </ScreenLayout>
    );
  }

  if (activeGroup) {
    return (
      <ScreenLayout title={l('모임')} onPressLogo={handlePressHeaderLogo}>
        <View style={styles.screenWrap}>
          <GroupHomeView
            key={activeGroup.clubId ?? activeGroup.id}
            group={activeGroup}
            onBack={() => {
              void closeActiveGroupWithLoading();
            }}
            onClubUpdated={handleClubUpdated}
            onClubDeleted={handleClubDeleted}
            pendingNotificationTarget={pendingNotificationTarget}
            onPendingNotificationTargetHandled={clearPendingNotificationTarget}
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
    <ScreenLayout title={l('모임')} onPressLogo={handlePressHeaderLogo}>
      <KeyboardAvoidingView
        style={styles.container}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <ScrollView
          ref={meetingScrollRef}
          style={styles.container}
          contentContainerStyle={[
            styles.content,
            applyKeyboardInset > 0
              ? { paddingBottom: applyKeyboardInset + APPLY_KEYBOARD_SCROLL_EXTRA_SPACE }
              : null,
          ]}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
          scrollEventThrottle={16}
          onScroll={(event) => {
            meetingScrollYRef.current = event.nativeEvent.contentOffset.y;
          }}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={handleRefresh}
            />
          }
        >
      <Text style={styles.sectionTitle}>{l('독서모임')}</Text>
      <Pressable
        style={({ pressed }) => [styles.createButton, pressed && styles.pressed]}
        onPress={() =>
          requireAuth(() => {
            setCreateDraftDirty(false);
            setShowCreate(true);
          })
        }
      >
        <Text style={styles.createButtonText}>{l('+ 모임 생성하기')}</Text>
      </Pressable>

      {isLoggedIn && myGroups.length > 0 ? (
        <>
          <Text style={styles.sectionTitle}>{l('내 독서 모임 바로가기')}</Text>
          <MyGroupsDropdownCard
            groups={myGroups}
            onPressGroup={openGroupHome}
          />
        </>
      ) : null}
      {myGroupsLoading ? <MyGroupsDropdownCardSkeleton /> : null}
      {!myGroupsLoading && isLoggedIn && myGroups.length === 0 ? (
        <Text style={styles.helperText}>{l('가입한 모임이 없습니다.')}</Text>
      ) : null}
      {!isLoggedIn ? (
        <Text style={styles.helperText}>{l('로그인 후 내 모임을 확인할 수 있습니다.')}</Text>
      ) : null}

      <Text style={styles.sectionTitle}>{l('모임 검색하기')}</Text>
      <View style={styles.searchRow}>
        <FormTextInput
          value={search}
          onChangeText={setSearch}
          placeholder={l('모임명, 지역별로 원하는 모임을 검색해보세요!')}
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
                      {l(option.label)}
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
                {l(filter)}
              </Text>
            </Pressable>
          );
        })}
      </View>

      {search.trim().length === 0 &&
      activeInputFilter === null &&
      selectedOutputFilter === 'ALL' ? (
        <Text style={styles.sectionTitle}>{l('독서 모임 추천')}</Text>
      ) : null}

      <View
        style={styles.groupList}
      >
        {visibleDiscoverGroups.map((group) => (
          <View key={group.id}>
            <MeetingListCard
              name={group.name}
              tags={group.tags}
              topic={group.topic}
              region={group.region}
              profileImageUrl={group.profileImageUrl}
              isPrivate={group.isPrivate}
              applicationStatus={group.applicationStatus}
              applyOpen={applyOpenId === group.id}
              applyReason={applyReasonById[group.id] ?? ''}
              onApplyInputRef={(ref) => {
                applyInputRefByIdRef.current[group.id] = ref;
              }}
              onPressApply={() => handleOpenApply(group.id)}
              onChangeApplyReason={(value) => handleChangeApplyReason(group.id, value)}
              onApplyInputFocus={() => focusApplyCard(group.id)}
              onApplyInputLayout={() => handleApplyInputLayout(group.id)}
              onSubmitApply={() => handleSubmitApply(group)}
              onCloseApply={handleCloseApply}
              onPressVisit={() => openGroupHome(group)}
            />
          </View>
        ))}
        {discoverLoading && visibleDiscoverGroups.length === 0 ? (
          <>
            <MeetingListCardSkeleton />
            <MeetingListCardSkeleton />
            <MeetingListCardSkeleton />
          </>
        ) : null}
        {!discoverLoading && visibleDiscoverGroups.length === 0 ? (
          <View style={styles.emptySearchBox}>
            <Text style={styles.emptySearchText}>{l('검색 결과가 없습니다.')}</Text>
          </View>
        ) : null}
      </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </ScreenLayout>
  );
}




function GroupHomeView({
  group,
  onBack,
  onClubUpdated,
  onClubDeleted,
  pendingNotificationTarget,
  onPendingNotificationTargetHandled,
}: {
  group: Group;
  onBack: () => void;
  onClubUpdated: (group: Group) => void;
  onClubDeleted: (clubId: number) => void;
  pendingNotificationTarget: PendingGroupNotificationTarget | null;
  onPendingNotificationTargetHandled: () => void;
}) {
  const navigation = useNavigation<NavigationProp<ParamListBase>>();
  const insets = useSafeAreaInsets();
  const { width: screenWidth, height: screenHeight } = useWindowDimensions();
  const { requireAuth, isLoggedIn, logout } = useAuthGate();
  const { l } = useLanguage();
  const isManagedClub = typeof group.clubId === 'number';
  const [managedGroup, setManagedGroup] = useState<Group>(group);
  const [canManageClub, setCanManageClub] = useState(false);
  const isMember =
    (managedGroup.membershipStatus === 'MEMBER' ||
      managedGroup.membershipStatus === 'STAFF' ||
      managedGroup.membershipStatus === 'OWNER') ||
    canManageClub;
  const [activeTab, setActiveTab] = useState<'home' | 'notice' | 'bookshelf'>('home');
  const [currentMemberNickname, setCurrentMemberNickname] = useState('');
  const groupHomeScrollRef = useRef<ScrollView>(null);
  const groupTitleFocusOffsetRef = useRef(0);
  const hasFocusedGroupTitleRef = useRef(false);
  const pendingGroupTitleFocusRef = useRef(false);
  const pendingGroupTitleFocusAnimatedRef = useRef(false);
  const pendingBookshelfDetailFocusYRef = useRef<number | null>(null);
  const bookshelfDetailFocusRetryRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [groupHomeViewportHeight, setGroupHomeViewportHeight] = useState(0);
  const [groupTitleFocusOffset, setGroupTitleFocusOffset] = useState(0);
  // 책장 탭 진입 시: GRID 콘텐츠가 레이아웃된 뒤 스크롤하기 위한 플래그 (클램프 방지)
  const bookshelfTabScrollRef = useRef(false);
  const [groupHomeRefreshing, setGroupHomeRefreshing] = useState(false);
  const [latestNoticeId, setLatestNoticeId] = useState<number | null>(null);
  const [noticeTitleInputHeight, setNoticeTitleInputHeight] = useState(
    NOTICE_TITLE_INPUT_MIN_HEIGHT,
  );
  const [noticeContentInputHeight, setNoticeContentInputHeight] = useState(
    NOTICE_CONTENT_INPUT_MIN_HEIGHT,
  );
  const [noticeContentInputFocused, setNoticeContentInputFocused] = useState(false);
  const clubWorkspaceRequestIdRef = useRef(0);
  const [workspaceLoaded, setWorkspaceLoaded] = useState(!isManagedClub);
  const clubParticipantsRequestIdRef = useRef(0);
  const [clubParticipants, setClubParticipants] = useState<ClubParticipant[]>([]);
  const [clubParticipantsTotalCount, setClubParticipantsTotalCount] = useState<number | null>(null);
  const [clubParticipantsLoading, setClubParticipantsLoading] = useState(false);
  const [clubParticipantsErrorMessage, setClubParticipantsErrorMessage] = useState('');
  const [clubParticipantsPageState, setClubParticipantsPageState] = useState<CursorPageState>({
    hasNext: false,
    nextCursor: null,
    loadingMore: false,
  });
  const [togglingParticipantNickname, setTogglingParticipantNickname] = useState<string | null>(null);

  const handleNoticeTitleContentSizeChange = useCallback(
    (event: NativeSyntheticEvent<TextInputContentSizeChangeEventData>, text: string) => {
      const nextHeight = getStableNoticeInputHeight(
        text,
        event.nativeEvent.contentSize.height,
        NOTICE_TITLE_INPUT_MIN_HEIGHT,
        NOTICE_TITLE_INPUT_MAX_HEIGHT,
      );
      setNoticeTitleInputHeight((currentHeight) =>
        shouldUpdateNoticeInputHeight(currentHeight, nextHeight) ? nextHeight : currentHeight,
      );
    },
    [],
  );

  const handleNoticeContentSizeChange = useCallback(
    (event: NativeSyntheticEvent<TextInputContentSizeChangeEventData>, text: string) => {
      const nextHeight = getStableNoticeInputHeight(
        text,
        event.nativeEvent.contentSize.height,
        NOTICE_CONTENT_INPUT_MIN_HEIGHT,
        NOTICE_CONTENT_INPUT_MAX_HEIGHT,
      );
      setNoticeContentInputHeight((currentHeight) =>
        shouldUpdateNoticeInputHeight(currentHeight, nextHeight) ? nextHeight : currentHeight,
      );
    },
    [],
  );

  const setReportModalRef = useRef<Dispatch<SetStateAction<ReportMemberModalState | null>>>(() => {});
  const setActiveManagementScreenRef = useRef<(s: GroupManagementScreen | null) => void>(() => {});
  const handleOpenNoticeComposerRef = useRef<() => void>(() => {});
  const showNoticeListAfterSubmitRef = useRef<() => void>(() => {});
  const setReportModalProxy = useCallback<Dispatch<SetStateAction<ReportMemberModalState | null>>>(
    (m) => setReportModalRef.current(m),
    [],
  );
  const setActiveManagementScreenProxy = useCallback(
    (s: GroupManagementScreen | null) => setActiveManagementScreenRef.current(s),
    [],
  );
  const handleOpenNoticeComposerProxy = useCallback(() => handleOpenNoticeComposerRef.current(), []);
  const showNoticeListAfterSubmitProxy = useCallback(() => showNoticeListAfterSubmitRef.current(), []);

  const bookshelfState = useBookshelfState({
    group,
    isManagedClub,
    canManageClub,
    currentMemberNickname,
    isLoggedIn,
    requireAuth,
    setReportModal: setReportModalProxy,
    setActiveTab,
    setActiveManagementScreen: setActiveManagementScreenProxy,
  });

  const noticeState = useNoticeState({
    group,
    isManagedClub,
    canManageClub,
    currentMemberNickname,
    requireAuth,
    navigation,
    bookshelfItems: bookshelfState.bookshelfItems,
    setManagedGroup,
    setLatestNoticeId,
    setReportModal: setReportModalProxy,
    openBookshelfTopicByMeetingId: bookshelfState.openBookshelfTopicByMeetingId,
    onNoticeSubmitSuccess: showNoticeListAfterSubmitProxy,
  });

  const mgmtState = useManagementState({
    group,
    managedGroup,
    canManageClub,
    currentMemberNickname,
    navigation,
    requireAuth,
    onClubUpdated,
    onClubDeleted,
    bookshelfSessions: bookshelfState.bookshelfSessions,
    bookshelfBookSelectorVisible: bookshelfState.bookshelfBookSelectorVisible,
    setManagedGroup,
    closeBookshelfBookSelector: bookshelfState.closeBookshelfBookSelector,
    closeBookshelfCalendar: bookshelfState.closeBookshelfCalendar,
    setBookshelfCreateDraft: bookshelfState.setBookshelfCreateDraft,
    setEditingBookshelfMeetingId: bookshelfState.setEditingBookshelfMeetingId,
    handleOpenNoticeComposer: handleOpenNoticeComposerProxy,
    pickAndUploadImage,
  });

  setReportModalRef.current = mgmtState.setReportModal;
  setActiveManagementScreenRef.current = mgmtState.setActiveManagementScreen;
  handleOpenNoticeComposerRef.current = noticeState.handleOpenNoticeComposer;

  const {
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
    openBookshelfDetailByMeetingId,
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
  } = bookshelfState;

  const meetingChatState = useMeetingChatState({
    clubId: group.clubId,
    meetingId: selectedRegularMeetingId,
    regularMeetingInfo,
    canManageClub,
    currentMemberNickname,
  });

  useEffect(() => {
    if (
      activeTab === 'bookshelf' &&
      bookshelfViewMode === 'REGULAR_GROUP' &&
      selectedRegularGroup
    ) {
      return;
    }
    meetingChatState.closeChat();
  }, [
    activeTab,
    bookshelfViewMode,
    meetingChatState.closeChat,
    selectedRegularGroup,
  ]);

  const {
    noticePage, setNoticePage,
    selectedNoticeId, setSelectedNoticeId,
    noticeCommentInput, setNoticeCommentInput,
    editingNoticeCommentId, setEditingNoticeCommentId,
    submittingNotice,
    submittingNoticeComment,
    noticeItems, setNoticeItems,
    noticeCommentsById, setNoticeCommentsById,
    noticeCommentPageStateByNoticeId, setNoticeCommentPageStateByNoticeId,
    shouldOpenTopNotice, setShouldOpenTopNotice,
    noticeComposerVisible, setNoticeComposerVisible,
    noticeBookSelectorVisible, setNoticeBookSelectorVisible,
    editingNoticeId, setEditingNoticeId,
    noticeMenuVisible, setNoticeMenuVisible,
    noticeDraft, setNoticeDraft,
    selectedVoteOptionIdsByNotice, setSelectedVoteOptionIdsByNotice,
    submittedVoteOptionIdsByNotice, setSubmittedVoteOptionIdsByNotice,
    voteEditEnabledByNotice, setVoteEditEnabledByNotice,
    noticePollOptionsById, setNoticePollOptionsById,
    noticeCommentMenu, setNoticeCommentMenu,
    voteVotersModal, setVoteVotersModal,
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
  } = noticeState;

  useEffect(() => {
    if (!pendingNotificationTarget || !workspaceLoaded) return;

    let cancelled = false;
    const openTarget = async () => {
      try {
        if (!isMember) {
          showToast(l('모임 가입 후 확인할 수 있습니다.'));
          return;
        }

        if (pendingNotificationTarget.type === 'notice') {
          setActiveTab('notice');
          await handleOpenNoticeDetailByRemoteId(pendingNotificationTarget.id, {
            fallbackToFirst: false,
            missingMessage: '삭제되었거나 접근할 수 없는 공지입니다.',
          });
          return;
        }

        const opened = await openBookshelfDetailByMeetingId(
          pendingNotificationTarget.id,
          'REGULAR',
        );
        if (!opened) {
          showToast(l('삭제되었거나 접근할 수 없는 정기모임입니다.'));
        }
      } catch {
        showToast(
          l(
            pendingNotificationTarget.type === 'notice'
              ? '공지 상세를 불러오지 못했습니다.'
              : '정기모임 정보를 불러오지 못했습니다.',
          ),
        );
      } finally {
        if (!cancelled) {
          onPendingNotificationTargetHandled();
        }
      }
    };

    void openTarget();

    return () => {
      cancelled = true;
    };
  }, [
    handleOpenNoticeDetailByRemoteId,
    isMember,
    l,
    onPendingNotificationTargetHandled,
    openBookshelfDetailByMeetingId,
    pendingNotificationTarget,
    workspaceLoaded,
  ]);

  const handleChangeNoticeTitle = useCallback(
    (text: string) => {
      setNoticeDraft((prev) => ({ ...prev, title: text }));
      if (text.length === 0) {
        setNoticeTitleInputHeight(NOTICE_TITLE_INPUT_MIN_HEIGHT);
      }
    },
    [setNoticeDraft],
  );

  const handleChangeNoticeContent = useCallback(
    (text: string) => {
      setNoticeDraft((prev) => ({ ...prev, content: text }));
      setNoticeContentInputHeight(NOTICE_CONTENT_INPUT_MIN_HEIGHT);
    },
    [setNoticeDraft],
  );

  const noticeContentInputScrollEnabled = shouldEnableNoticeContentInputScroll(
    noticeDraft.content,
  );

  const {
    managementMenuVisible, openManagementMenu,
    managementSheetY,
    managementHandlePanResponder,
    activeManagementScreen, setActiveManagementScreen,
    joinRequests, setJoinRequests,
    members, setMembers,
    selectedJoinRequestActionId, setSelectedJoinRequestActionId,
    selectedJoinRequestMessage, setSelectedJoinRequestMessage,
    submittingJoinRequestAction,
    refreshingJoinRequests,
    selectedMemberActionId, setSelectedMemberActionId,
    submittingMemberAction,
    refreshingMembers,
    reportModal, setReportModal,
    contactModalVisible,
    submittingReport,
    uploadingClubImage,
    editDraft, setEditDraft,
    checkedEditName,
    checkingEditName,
    selectedJoinRequestAction,
    selectedMemberAction,
    closeManagementMenu,
    closeManagementMenuImmediately,
    closeContactModal,
    runAfterClosingManagementMenu,
    handleOpenManagementScreen,
    handleCloseManagementScreen,
    handleCloseManagementLayer,
    handleRefreshJoinRequests,
    handleRefreshMembers,
    handleProcessJoinRequest,
    handleChangeMemberRole,
    handleRemoveMember,
    handleChangeEditName,
    handleCheckEditName,
    handleSaveGroupEdit,
    handleOpenJoinRequestProfile,
    handlePickClubImage,
    handleDeleteManagedClub,
    handleCloseReportModal,
    handlePressReportTarget,
    handleSubmitReport,
    handlePressContactButton,
    handleOpenContactLink,
    handleOpenNoticeComposerFromManagement,
  } = mgmtState;

  const [bookshelfCreateBaselineDraft, setBookshelfCreateBaselineDraft] =
    useState<BookshelfCreateDraft | null>(null);
  const bookshelfComposerTypeRef = useRef<typeof bookshelfComposerType>(bookshelfComposerType);
  const bookshelfComposerInputRef = useRef(bookshelfComposerInput);
  const bookshelfComposerRatingRef = useRef(bookshelfComposerRating);
  const editingBookshelfPostRef = useRef(editingBookshelfPost);

  useEffect(() => {
    bookshelfComposerTypeRef.current = bookshelfComposerType;
    bookshelfComposerInputRef.current = bookshelfComposerInput;
    bookshelfComposerRatingRef.current = bookshelfComposerRating;
    editingBookshelfPostRef.current = editingBookshelfPost;
  }, [
    bookshelfComposerInput,
    bookshelfComposerRating,
    bookshelfComposerType,
    editingBookshelfPost,
  ]);

  const handleChangeBookshelfComposerInput = useCallback(
    (text: string) => {
      bookshelfComposerInputRef.current = text;
      setBookshelfComposerInput(text);
    },
    [setBookshelfComposerInput],
  );
  const handleChangeBookshelfComposerRating = useCallback(
    (rating: number) => {
      bookshelfComposerRatingRef.current = rating;
      setBookshelfComposerRating(rating);
    },
    [setBookshelfComposerRating],
  );

  useEffect(() => {
    if (activeManagementScreen !== 'BOOKSHELF_CREATE') {
      if (bookshelfCreateBaselineDraft) setBookshelfCreateBaselineDraft(null);
      return;
    }
    if (!bookshelfCreateBaselineDraft) {
      setBookshelfCreateBaselineDraft(bookshelfCreateDraft);
    }
  }, [activeManagementScreen, bookshelfCreateBaselineDraft, bookshelfCreateDraft]);

  const bookshelfComposerDirty = useMemo(() => {
    if (!bookshelfComposerType) return false;
    if (editingBookshelfPost?.type === bookshelfComposerType) {
      const originalRating =
        bookshelfComposerType === 'REVIEW' ? (editingBookshelfPost.rating ?? 0) : 0;
      return (
        bookshelfComposerInput !== editingBookshelfPost.content ||
        bookshelfComposerRating !== originalRating
      );
    }
    return (
      bookshelfComposerInput.trim().length > 0 ||
      (bookshelfComposerType === 'REVIEW' && bookshelfComposerRating > 0)
    );
  }, [
    bookshelfComposerInput,
    bookshelfComposerRating,
    bookshelfComposerType,
    editingBookshelfPost,
  ]);

  useUnsavedChangesGuard({
    enabled: Boolean(bookshelfComposerType),
    isDirty: bookshelfComposerDirty,
    onConfirmLeave: closeBookshelfComposer,
  });

  const isBookshelfComposerDirtyNow = useCallback(() => {
    const currentType = bookshelfComposerTypeRef.current;
    if (!currentType) return false;

    const currentPost = editingBookshelfPostRef.current;
    if (currentPost?.type === currentType) {
      const originalRating = currentType === 'REVIEW' ? (currentPost.rating ?? 0) : 0;
      return (
        bookshelfComposerInputRef.current !== currentPost.content ||
        bookshelfComposerRatingRef.current !== originalRating
      );
    }

    return (
      bookshelfComposerInputRef.current.trim().length > 0 ||
      (currentType === 'REVIEW' && bookshelfComposerRatingRef.current > 0)
    );
  }, []);

  const requestCloseBookshelfComposerNow = useCallback(() => {
    if (!isBookshelfComposerDirtyNow()) {
      closeBookshelfComposer();
      return;
    }

    Alert.alert('알림', '현재 페이지는 저장되지 않습니다.', [
      { text: '취소', style: 'cancel' },
      { text: '닫기', style: 'destructive', onPress: closeBookshelfComposer },
    ]);
  }, [closeBookshelfComposer, isBookshelfComposerDirtyNow]);

  const groupEditDirty = useMemo(() => {
    if (activeManagementScreen !== 'EDIT') return false;
    return !areGroupEditDraftsEqual(editDraft, toEditDraft(managedGroup));
  }, [activeManagementScreen, editDraft, managedGroup]);

  const bookshelfCreateDirty = useMemo(() => {
    if (activeManagementScreen !== 'BOOKSHELF_CREATE' || !bookshelfCreateBaselineDraft) {
      return false;
    }
    return !areBookshelfCreateDraftsEqual(bookshelfCreateDraft, bookshelfCreateBaselineDraft);
  }, [activeManagementScreen, bookshelfCreateBaselineDraft, bookshelfCreateDraft]);

  const managementEditDirty = groupEditDirty || bookshelfCreateDirty;
  const managementEditGuardEnabled =
    activeManagementScreen === 'EDIT' || activeManagementScreen === 'BOOKSHELF_CREATE';

  const { requestClose: requestCloseManagementScreen } = useUnsavedChangesGuard({
    enabled: managementEditGuardEnabled,
    isDirty: managementEditDirty,
    onConfirmLeave: handleCloseManagementScreen,
  });

  const handleCloseManagementLayerWithGuard = useCallback(() => {
    if (bookshelfBookSelectorVisible) {
      closeBookshelfBookSelector();
      return;
    }
    if (activeManagementScreen) {
      requestCloseManagementScreen();
      return;
    }
    handleCloseManagementLayer();
  }, [
    activeManagementScreen,
    bookshelfBookSelectorVisible,
    closeBookshelfBookSelector,
    handleCloseManagementLayer,
    requestCloseManagementScreen,
  ]);

  useEffect(() => {
    if (!noticeComposerVisible) {
      setNoticeTitleInputHeight(NOTICE_TITLE_INPUT_MIN_HEIGHT);
      setNoticeContentInputHeight(NOTICE_CONTENT_INPUT_MIN_HEIGHT);
      setNoticeContentInputFocused(false);
      return;
    }

    setNoticeContentInputHeight(getInitialNoticeContentInputHeight(noticeDraft.content));
  }, [editingNoticeId, noticeComposerVisible]);

  const contactLinks = useMemo(
    () => normalizeClubContacts(managedGroup.links),
    [managedGroup.links],
  );
  const groupHomeContentMinHeight = useMemo(() => {
    if (groupHomeViewportHeight <= 0) return undefined;
    return groupHomeViewportHeight + groupTitleFocusOffset + GROUP_TITLE_FOCUS_SCROLL_SAFETY;
  }, [groupHomeViewportHeight, groupTitleFocusOffset]);
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
    clubParticipantsRequestIdRef.current += 1;
    setManagedGroup(group);
    setWorkspaceLoaded(!isManagedClub);
    setCanManageClub(false);
    setClubParticipants([]);
    setClubParticipantsTotalCount(null);
    setClubParticipantsLoading(false);
    setClubParticipantsErrorMessage('');
    setClubParticipantsPageState({
      hasNext: false,
      nextCursor: null,
      loadingMore: false,
    });
    setTogglingParticipantNickname(null);
    resetBookshelfOnGroupChange();
    resetNoticeOnGroupChange();
  }, [group, isManagedClub, resetBookshelfOnGroupChange, resetNoticeOnGroupChange]);

  const loadClubParticipants = useCallback(
    async (options?: {
      cursorId?: number;
      append?: boolean;
      suppressErrorToast?: boolean;
      isCancelled?: () => boolean;
    }) => {
      if (!isManagedClub || typeof group.clubId !== 'number') return;

      if (!isLoggedIn) {
        setClubParticipants([]);
        setClubParticipantsTotalCount(null);
        setClubParticipantsLoading(false);
        setClubParticipantsErrorMessage('로그인 후 조회 가능합니다.');
        setClubParticipantsPageState({
          hasNext: false,
          nextCursor: null,
          loadingMore: false,
        });
        return;
      }

      const append = Boolean(options?.append);
      const requestId = clubParticipantsRequestIdRef.current + 1;
      clubParticipantsRequestIdRef.current = requestId;
      const isStale = () =>
        Boolean(options?.isCancelled?.()) ||
        requestId !== clubParticipantsRequestIdRef.current;

      if (append) {
        setClubParticipantsPageState((prev) => ({ ...prev, loadingMore: true }));
      } else {
        setClubParticipantsLoading(true);
        setClubParticipantsErrorMessage('');
      }

      try {
        const response = await fetchClubParticipants(group.clubId, options?.cursorId);
        if (isStale()) return;

        setClubParticipantsErrorMessage('');
        setClubParticipantsTotalCount(response.totalCount);
        setClubParticipants((prev) => {
          if (!append) return response.items;
          const merged = new Map<number, ClubParticipant>();
          prev.forEach((item) => merged.set(item.clubMemberId, item));
          response.items.forEach((item) => merged.set(item.clubMemberId, item));
          return Array.from(merged.values());
        });
        setClubParticipantsPageState({
          hasNext: response.hasNext,
          nextCursor: response.nextCursor,
          loadingMore: false,
        });
      } catch (error) {
        if (isStale()) return;

        if (error instanceof ApiError && error.status === 401) {
          handleAuthExpired({ suppressToast: options?.suppressErrorToast });
          return;
        }

        const message =
          error instanceof ApiError && error.status === 403
            ? error.message?.trim() || CLUB_PARTICIPANTS_PRIVATE_MESSAGE
            : error instanceof ApiError
              ? error.message?.trim() || '모임 회원을 불러오지 못했습니다.'
              : '모임 회원을 불러오지 못했습니다.';

        if (!append) {
          setClubParticipants([]);
          setClubParticipantsTotalCount(null);
        }
        setClubParticipantsErrorMessage(message);
        setClubParticipantsPageState((prev) => ({
          ...prev,
          loadingMore: false,
          hasNext: append ? prev.hasNext : false,
          nextCursor: append ? prev.nextCursor : null,
        }));

        if (!(error instanceof ApiError && error.status === 403) && !options?.suppressErrorToast) {
          showToast(message);
        }
      } finally {
        if (!isStale()) {
          if (append) {
            setClubParticipantsPageState((prev) => ({ ...prev, loadingMore: false }));
          } else {
            setClubParticipantsLoading(false);
          }
        }
      }
    },
    [group.clubId, handleAuthExpired, isLoggedIn, isManagedClub],
  );

  useEffect(() => {
    if (!isManagedClub) return;
    let cancelled = false;

    void loadClubParticipants({
      isCancelled: () => cancelled,
      suppressErrorToast: true,
    });

    return () => {
      cancelled = true;
    };
  }, [isManagedClub, loadClubParticipants]);

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
  const reloadClubWorkspace = useCallback(
    async (options?: { suppressErrorToast?: boolean; isCancelled?: () => boolean }) => {
      if (!isManagedClub || typeof group.clubId !== 'number') return;
      const requestId = clubWorkspaceRequestIdRef.current + 1;
      clubWorkspaceRequestIdRef.current = requestId;
      const isCancelled = options?.isCancelled ?? (() => false);
      const isStale = () =>
        isCancelled() || requestId !== clubWorkspaceRequestIdRef.current;

      try {
        const snapshot = await fetchClubWorkspaceData(group.clubId, group, isLoggedIn);
        if (isStale()) return;

        setLatestNoticeId(snapshot.latestNoticeId);
        setCanManageClub(snapshot.canManageClub);
        setManagedGroup(snapshot.managedGroup);
        setEditDraft((prev) => ({ ...prev, ...snapshot.editDraftPatch }));
        setBookshelfItems(snapshot.bookshelfItems);
        setNoticeItems(snapshot.noticeItems);
        setSelectedNoticeId((prev) =>
          prev && snapshot.noticeItems.some((n) => n.id === prev) ? prev : null,
        );
        setNoticeCommentsById({});
        setNoticePollOptionsById({});
        setSelectedVoteOptionIdsByNotice({});
        setSubmittedVoteOptionIdsByNotice({});
        setVoteEditEnabledByNotice({});
        setJoinRequests(snapshot.joinRequests);
        setMembers(snapshot.members);
        setWorkspaceLoaded(true);
      } catch (error) {
        if (isStale()) return;
        setWorkspaceLoaded(true);
        if (error instanceof ApiError) {
          if (error.status === 401) {
            handleAuthExpired({ suppressToast: options?.suppressErrorToast });
          } else if (isMissingClubMembershipError(error)) {
            // 가입 직후에는 클럽 멤버 row가 없을 수 있어 배경 로드 실패를 조용히 흡수합니다.
            return;
          } else if (isProfileIncompleteApiError(error) && !options?.suppressErrorToast) {
            showToast(PROFILE_INCOMPLETE_MESSAGE);
          } else if (error.status === 403 && !options?.suppressErrorToast) {
            showToast('공지사항 및 책장 정보는 모임 회원만 조회 가능합니다. 모임 가입 신청을 완료해주세요.');
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
    [group, group.clubId, handleAuthExpired, isManagedClub, isLoggedIn, setWorkspaceLoaded],
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

  const handleGroupHomeScroll = useCallback(
    (event: NativeSyntheticEvent<NativeScrollEvent>) => {
      const { layoutMeasurement, contentOffset, contentSize } = event.nativeEvent;
      const distanceFromBottom = contentSize.height - (layoutMeasurement.height + contentOffset.y);
      if (distanceFromBottom > 180) return;

      if (
        activeTab === 'home' &&
        clubParticipantsPageState.hasNext &&
        !clubParticipantsPageState.loadingMore &&
        !clubParticipantsErrorMessage &&
        typeof clubParticipantsPageState.nextCursor === 'number'
      ) {
        void loadClubParticipants({
          cursorId: clubParticipantsPageState.nextCursor,
          append: true,
          suppressErrorToast: false,
        });
      }

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
      clubParticipantsErrorMessage,
      clubParticipantsPageState.hasNext,
      clubParticipantsPageState.loadingMore,
      clubParticipantsPageState.nextCursor,
      loadClubParticipants,
      loadMoreBookshelfTopics,
      loadMoreNoticeComments,
      selectedBookshelfBook?.remoteMeetingId,
      selectedNotice,
    ],
  );

  useEffect(() => {
    hasFocusedGroupTitleRef.current = false;
    pendingGroupTitleFocusRef.current = false;
    pendingBookshelfDetailFocusYRef.current = null;
    if (bookshelfDetailFocusRetryRef.current) {
      clearTimeout(bookshelfDetailFocusRetryRef.current);
      bookshelfDetailFocusRetryRef.current = null;
    }
    groupTitleFocusOffsetRef.current = 0;
    setGroupTitleFocusOffset(0);
  }, [group.id]);

  const flushPendingGroupTitleFocus = useCallback(() => {
    if (!pendingGroupTitleFocusRef.current) return;

    pendingGroupTitleFocusRef.current = false;
    const animated = pendingGroupTitleFocusAnimatedRef.current;

    requestAnimationFrame(() => {
      groupHomeScrollRef.current?.scrollTo({
        y: groupTitleFocusOffsetRef.current,
        animated,
      });
    });
  }, []);

  const focusGroupTitle = useCallback(
    (animated: boolean) => {
      pendingGroupTitleFocusRef.current = true;
      pendingGroupTitleFocusAnimatedRef.current = animated;
      requestAnimationFrame(() => {
        requestAnimationFrame(flushPendingGroupTitleFocus);
      });
    },
    [flushPendingGroupTitleFocus],
  );

  const showNoticeListAfterSubmit = useCallback(() => {
    setActiveTab('notice');
    focusGroupTitle(true);
  }, [focusGroupTitle]);
  showNoticeListAfterSubmitRef.current = showNoticeListAfterSubmit;

  const flushPendingBookshelfDetailFocus = useCallback(() => {
    const targetY = pendingBookshelfDetailFocusYRef.current;
    if (targetY === null) return;
    groupHomeScrollRef.current?.scrollTo({ y: targetY, animated: true });
  }, []);

  const focusBookshelfDetail = useCallback((sectionY: number) => {
    pendingGroupTitleFocusRef.current = false;
    const targetY = Math.max(0, sectionY - BOOKSHELF_DETAIL_FOCUS_TOP_OFFSET);
    pendingBookshelfDetailFocusYRef.current = targetY;
    if (bookshelfDetailFocusRetryRef.current) {
      clearTimeout(bookshelfDetailFocusRetryRef.current);
      bookshelfDetailFocusRetryRef.current = null;
    }
    requestAnimationFrame(() => {
      requestAnimationFrame(() => {
        flushPendingBookshelfDetailFocus();
      });
    });
    bookshelfDetailFocusRetryRef.current = setTimeout(() => {
      flushPendingBookshelfDetailFocus();
      pendingBookshelfDetailFocusYRef.current = null;
      bookshelfDetailFocusRetryRef.current = null;
    }, 250);
  }, [flushPendingBookshelfDetailFocus]);

  const handleGroupHomeContentSizeChange = useCallback(() => {
    flushPendingGroupTitleFocus();
    flushPendingBookshelfDetailFocus();
  }, [flushPendingBookshelfDetailFocus, flushPendingGroupTitleFocus]);

  useEffect(() => {
    requestAnimationFrame(flushPendingGroupTitleFocus);
  }, [activeTab, flushPendingGroupTitleFocus, groupHomeContentMinHeight]);

  const handleGroupHomeLayout = useCallback((event: LayoutChangeEvent) => {
    const nextHeight = event.nativeEvent.layout.height;
    setGroupHomeViewportHeight((prev) =>
      Math.abs(prev - nextHeight) < 1 ? prev : nextHeight,
    );
  }, []);

  const handleGroupTitleLayout = useCallback((event: LayoutChangeEvent) => {
    const nextOffset = Math.max(0, event.nativeEvent.layout.y - GROUP_TITLE_FOCUS_TOP_OFFSET);
    groupTitleFocusOffsetRef.current = nextOffset;
    setGroupTitleFocusOffset((prev) =>
      Math.abs(prev - nextOffset) < 1 ? prev : nextOffset,
    );
    if (hasFocusedGroupTitleRef.current) return;

    focusGroupTitle(false);
    hasFocusedGroupTitleRef.current = true;
  }, [focusGroupTitle]);

  const handlePressTopNotice = useCallback(() => {
    if (!managedGroup.notice?.trim()) return;
    setShouldOpenTopNotice(true);
    setActiveTab('notice');
  }, [managedGroup.notice]);

  useEffect(() => {
    if (!shouldOpenTopNotice || activeTab !== 'notice') return;

    setShouldOpenTopNotice(false);
    void handleOpenNoticeDetailByRemoteId(latestNoticeId);
  }, [activeTab, handleOpenNoticeDetailByRemoteId, latestNoticeId, shouldOpenTopNotice]);

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
        if (nextTab === 'bookshelf') {
          // 책장은 GRID 콘텐츠가 레이아웃된 뒤 스크롤 (GroupBookshelfView onLayout에서)
          bookshelfTabScrollRef.current = true;
        }
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

  const handleSelectNoticeId = useCallback(
    (id: string | null) => {
      setSelectedNoticeId(id);
    },
    [setSelectedNoticeId],
  );

  useEffect(() => {
    if (selectedNoticeId !== null) {
      focusGroupTitle(true);
    }
  }, [selectedNoticeId, focusGroupTitle]);

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

  const noticeMenuItems = useMemo<BottomSheetActionMenuItem[]>(() => {
    if (!selectedNotice) return [];
    if (canManageClub) {
      return [
        {
          key: 'edit',
          label: '수정하기',
          icon: 'edit',
          onPress: () => handleOpenNoticeComposer(selectedNotice),
        },
        {
          key: 'delete',
          label: '삭제하기',
          icon: 'delete-outline',
          destructive: true,
          onPress: handleDeleteNotice,
        },
      ];
    }
    return [
      {
        key: 'report',
        label: '신고하기',
        icon: 'flag',
        onPress: handleReportNotice,
      },
    ];
  }, [
    canManageClub,
    handleDeleteNotice,
    handleOpenNoticeComposer,
    handleReportNotice,
    selectedNotice,
  ]);

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
      requestCloseManagementScreen();
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
    handleCloseNoticeComposer,
    managementMenuVisible,
    closeManagementMenu,
    noticeBookSelectorVisible,
    noticeComposerVisible,
    noticeMenuVisible,
    onBack,
    requestCloseManagementScreen,
    selectedJoinRequestActionId,
    selectedJoinRequestMessage,
    selectedMemberActionId,
  ]);

  const handleRefreshGroupHome = useCallback(() => {
    if (groupHomeRefreshing) return;

    const refresh = async () => {
      setGroupHomeRefreshing(true);
      try {
        await Promise.all([
          reloadClubWorkspace({ suppressErrorToast: true }),
          loadClubParticipants({ suppressErrorToast: true }),
        ]);
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
    loadClubParticipants,
    reloadBookshelfMeetingDetail,
    reloadClubWorkspace,
    selectedBookshelfBook,
  ]);

  const clubParticipantColumns = screenWidth >= CLUB_PARTICIPANT_GRID_BREAKPOINT ? 2 : 1;
  const clubParticipantCardWidth =
    clubParticipantColumns === 2
      ? Math.max(0, (screenWidth - spacing.md * 2 - spacing.sm) / 2)
      : '100%';
  const clubParticipantsTotalText =
    clubParticipantsTotalCount === null
      ? l('참여 인원을 확인하고 있습니다.')
      : l('총 {count}명', { count: clubParticipantsTotalCount });

  const handlePressClubParticipantProfile = useCallback(
    (nickname: string) => {
      const memberNickname = nickname.trim();
      if (!memberNickname) return;
      navigation.navigate('UserProfile', { memberNickname, fromScreen: 'Meeting' });
    },
    [navigation],
  );

  const handleToggleClubParticipantFollow = useCallback(
    (participant: ClubParticipant) => {
      const nickname = participant.nickname.trim();
      if (!nickname || nickname === currentMemberNickname || togglingParticipantNickname === nickname) {
        return;
      }

      requireAuth(() => {
        const nextFollowing = !participant.following;
        const previousParticipants = clubParticipants;
        triggerSelectionHaptic();
        setTogglingParticipantNickname(nickname);
        setClubParticipants((prev) =>
          prev.map((item) =>
            item.nickname === nickname ? { ...item, following: nextFollowing } : item,
          ),
        );

        const submit = async () => {
          try {
            await setFollowingMember(nickname, nextFollowing);
            showToast(nextFollowing ? l('구독했습니다.') : l('구독을 취소했습니다.'));
          } catch (error) {
            setClubParticipants(previousParticipants);
            if (!(error instanceof ApiError)) {
              showToast(l('구독 상태를 변경하지 못했습니다.'));
            }
          } finally {
            setTogglingParticipantNickname((prev) => (prev === nickname ? null : prev));
          }
        };

        void submit();
      });
    },
    [clubParticipants, currentMemberNickname, requireAuth, togglingParticipantNickname],
  );

  return (
    <View style={styles.screenWrap}>
      <ScrollView
        ref={groupHomeScrollRef}
        style={styles.container}
        contentContainerStyle={[
          styles.content,
          {
            minHeight: groupHomeContentMinHeight,
            paddingBottom: spacing.xl * 2,
          },
        ]}
        onLayout={handleGroupHomeLayout}
        onContentSizeChange={handleGroupHomeContentSizeChange}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
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
          <Text style={styles.breadcrumbText}>{l('모임 목록')}</Text>
        </Pressable>
        {canManageClub ? (
          <Pressable
            style={({ pressed }) => [styles.detailTitleManageLink, pressed && styles.pressed]}
            onPress={openManagementMenu}
          >
            <Text style={styles.detailTitleManageLinkText}>{l('모임 관리하기')}</Text>
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
              <Text style={[styles.pillNavText, active && styles.pillNavTextActive]}>{l(tab.label)}</Text>
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
              <Text style={styles.noticeText} numberOfLines={1} ellipsizeMode="tail">
                {managedGroup.notice}
              </Text>
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
                    <Text style={styles.tagText}>{l(tag)}</Text>
                    </View>
                  );
                })}
              </View>
              <View style={styles.metaBlock}>
                <Text style={styles.metaLabel}>{l('모임 대상')}</Text>
                <Text style={styles.metaValue}>
                  {l(managedGroup.topic.replace(/^모임 대상 · /, ''))}
                </Text>
              </View>
              <View style={styles.metaBlock}>
                <Text style={styles.metaLabel}>{l('활동 지역')}</Text>
                <Text style={styles.metaValue}>
                  {l(managedGroup.region.replace(/^활동 지역 · /, ''))}
                </Text>
              </View>
              <View style={styles.metaBlock}>
                <Text style={styles.metaLabel}>{l('모임 취지')}</Text>
                <Text style={styles.metaValue}>
                  {managedGroup.isPrivate ? l('비공개, 토론') : l('공개, 토론')}
                </Text>
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
                {openingNextMeeting ? l('불러오는 중...') : managedGroup.nextSession ?? l('이번 모임 바로가기')}
              </Text>
            </Pressable>
            <Pressable
              style={({ pressed }) => [styles.outlineButton, styles.detailButton, pressed && styles.pressed]}
              onPress={handlePressContactButton}
            >
              <Text style={styles.outlineButtonText}>{l('문의하기')}</Text>
            </Pressable>
          </View>

          <View style={styles.clubParticipantsSection}>
            <View style={styles.clubParticipantsHeader}>
              <View style={styles.clubParticipantsTitleBlock}>
                <Text style={styles.clubParticipantsTitle}>{l('모임 회원')}</Text>
                <Text style={styles.clubParticipantsCount}>{clubParticipantsTotalText}</Text>
              </View>
            </View>

            {clubParticipantsLoading ? (
              <View style={styles.clubParticipantsStateBox}>
                <Text style={styles.clubParticipantsStateText}>{l('모임 회원 불러오는 중...')}</Text>
              </View>
            ) : clubParticipantsErrorMessage ? (
              <View style={styles.clubParticipantsStateBox}>
                <Text style={styles.clubParticipantsStateText}>{l(clubParticipantsErrorMessage)}</Text>
              </View>
            ) : clubParticipants.length === 0 ? (
              <View style={styles.clubParticipantsStateBox}>
                <Text style={styles.clubParticipantsStateText}>{l('아직 참여 중인 회원이 없습니다.')}</Text>
              </View>
            ) : (
              <View style={styles.clubParticipantsGrid}>
                {clubParticipants.map((participant) => {
                  const isMe = currentMemberNickname === participant.nickname;
                  const isToggling = togglingParticipantNickname === participant.nickname;
                  const roleLabel = getClubParticipantRoleLabel(participant.clubMemberStatus);

                  return (
                    <View
                      key={`club-participant-${participant.clubMemberId}`}
                      style={[
                        styles.clubParticipantCard,
                        { width: clubParticipantCardWidth },
                      ]}
                    >
                      <Pressable
                        style={({ pressed }) => [
                          styles.clubParticipantIdentity,
                          pressed && styles.pressed,
                        ]}
                        onPress={() => handlePressClubParticipantProfile(participant.nickname)}
                      >
                        <View style={styles.clubParticipantAvatar}>
                          {participant.profileImageUrl ? (
                            <Image
                              source={{ uri: participant.profileImageUrl }}
                              style={styles.clubParticipantAvatarImage}
                            />
                          ) : (
                            <DefaultProfileAvatar size={44} />
                          )}
                        </View>
                        <View style={styles.clubParticipantTextBlock}>
                          <View style={styles.clubParticipantNameRow}>
                            <Text
                              style={styles.clubParticipantNickname}
                              numberOfLines={1}
                              ellipsizeMode="tail"
                            >
                              {participant.nickname}
                            </Text>
                            {participant.staff ? (
                              <View style={styles.clubParticipantStaffBadge}>
                                <MaterialIcons
                                  name="admin-panel-settings"
                                  size={13}
                                  color={colors.primary3}
                                />
                                <Text style={styles.clubParticipantStaffBadgeText}>{l('운영진')}</Text>
                              </View>
                            ) : null}
                          </View>
                          <Text style={styles.clubParticipantRole}>{l(roleLabel)}</Text>
                        </View>
                      </Pressable>

                      {!isMe ? (
                        <Pressable
                          style={({ pressed }) => [
                            styles.clubParticipantFollowButton,
                            participant.following && styles.clubParticipantFollowButtonActive,
                            isToggling && styles.clubParticipantFollowButtonDisabled,
                            pressed && !isToggling && styles.pressed,
                          ]}
                          onPress={() => handleToggleClubParticipantFollow(participant)}
                          disabled={isToggling}
                        >
                          <Text
                            style={[
                              styles.clubParticipantFollowText,
                              participant.following
                                ? styles.clubParticipantFollowTextActive
                                : styles.clubParticipantFollowTextInactive,
                            ]}
                          >
                            {isToggling ? l('처리 중') : participant.following ? l('구독중') : l('구독')}
                          </Text>
                        </Pressable>
                      ) : null}
                    </View>
                  );
                })}
              </View>
            )}

            {clubParticipantsPageState.loadingMore && !clubParticipantsErrorMessage ? (
              <Text style={styles.infiniteScrollLoadingText}>{l('불러오는 중...')}</Text>
            ) : null}
          </View>
        </View>
      ) : null}

      {activeTab === 'notice' ? (
        <GroupNoticeView
          isMember={isMember}
          isInitialLoading={!workspaceLoaded}
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
          setSelectedNoticeId={handleSelectNoticeId}
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
          isInitialLoading={!workspaceLoaded}
          canManageClub={canManageClub}
          group={managedGroup}
          shouldScrollToBookshelfDetailRef={shouldScrollToBookshelfDetailRef}
          bookshelfTabScrollRef={bookshelfTabScrollRef}
          onScrollToPillNav={() => focusGroupTitle(true)}
          onScrollToBookshelfDetail={focusBookshelfDetail}
          bookshelfDetailMinHeight={groupHomeViewportHeight || undefined}
          bookshelfViewMode={bookshelfViewMode}
          bookshelfSessions={bookshelfSessions}
          selectedBookshelfSession={selectedBookshelfSession}
          visibleBookshelfItems={visibleBookshelfItems}
          selectedBookshelfBook={selectedBookshelfBook}
          canManageRegularGroups={typeof selectedRegularMeetingId === 'number'}
          bookshelfDetailTab={bookshelfDetailTab}
          bookshelfTopicItems={bookshelfTopicItems}
          bookshelfReviewItems={bookshelfReviewItems}
          currentBookshelfTopicPageState={currentBookshelfTopicPageState}
          loadingBookshelfDetail={loadingBookshelfDetail}
          regularMeetingInfo={regularMeetingInfo}
          selectedRegularGroupId={selectedRegularGroupId}
          selectedRegularGroup={selectedRegularGroup}
          regularGroupPendingPostKeys={regularGroupPendingPostKeys}
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
          handleDeleteSelectedBookshelf={handleDeleteSelectedBookshelf}
          handlePressManageRegularGroups={handlePressManageRegularGroups}
        />
      ) : null}
      </ScrollView>
      {activeTab === 'bookshelf' &&
      bookshelfViewMode === 'REGULAR_GROUP' &&
      selectedRegularGroup &&
      isMember &&
      !meetingChatState.pickerVisible &&
      !meetingChatState.activeGroup ? (
        <FloatingActionButton
          onPress={meetingChatState.openPicker}
          accessibilityLabel={l('채팅 조 선택')}
        >
          <ChatIcon width={24} height={24} />
        </FloatingActionButton>
      ) : null}
      <MeetingChatOverlay
        state={meetingChatState}
        currentMemberNickname={currentMemberNickname}
      />
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
            <Text style={styles.managementScreenTitle}>{l('조 관리하기')}</Text>
            <View style={styles.managementHeaderSpacer} />
          </View>

          {teamManageLoading ? (
            <View style={styles.teamManageLoadingWrap}>
              {[0, 1, 2, 3].map((i) => (
                <View key={i} style={styles.teamManageSkeletonRow}>
                  <SkeletonBox style={styles.teamManageSkeletonAvatar} />
                  <SkeletonBox style={styles.teamManageSkeletonName} />
                </View>
              ))}
            </View>
          ) : (
            <>
              <View style={styles.teamManageTopBar}>
                <Text style={styles.teamManageBookTitle}>
                  {selectedBookshelfBook?.title ?? l('정기모임')}
                </Text>
                <Text style={styles.teamManageHint}>
                  {l('멤버를 끌어 조에 놓거나, 멤버를 탭한 뒤 조를 눌러 이동할 수 있습니다.')}
                </Text>
              </View>

              <View style={styles.teamManageDropBar}>
                <View
                  ref={(node) => {
                    teamManageQuickDropRefs.current[getTeamManageQuickDropZoneId(null)] = node;
                  }}
                  onLayout={refreshTeamManageQuickDropLayouts}
                >
                  <Pressable
                    style={({ pressed }) => [
                      styles.teamManageDropChip,
                      teamManageSelectedMemberId !== null && styles.teamManageDropChipActive,
                      teamManageActiveDropZoneId === getTeamManageQuickDropZoneId(null) &&
                        styles.teamManageDropChipDragActive,
                      pressed && styles.pressed,
                    ]}
                    onPress={() => handlePressTeamManageTarget(null)}
                  >
                    <Text style={styles.teamManageDropChipText}>
                      {l('미배정 {count}', { count: teamManageUnassignedMembers.length })}
                    </Text>
                  </Pressable>
                </View>
                {teamManageTeams.map((team) => (
                  <View
                    key={`team-manage-target-${team.teamNumber}`}
                    ref={(node) => {
                      teamManageQuickDropRefs.current[
                        getTeamManageQuickDropZoneId(team.teamNumber)
                      ] = node;
                    }}
                    onLayout={refreshTeamManageQuickDropLayouts}
                  >
                    <Pressable
                      style={({ pressed }) => [
                        styles.teamManageDropChip,
                        teamManageSelectedMemberId !== null && styles.teamManageDropChipActive,
                        teamManageActiveDropZoneId ===
                          getTeamManageQuickDropZoneId(team.teamNumber) &&
                          styles.teamManageDropChipDragActive,
                        pressed && styles.pressed,
                      ]}
                      onPress={() => handlePressTeamManageTarget(team.teamNumber)}
                    >
                      <Text style={styles.teamManageDropChipText}>
                        {l(formatRegularGroupLabel(team.teamNumber))} {team.memberIds.length}
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
                onLayout={handleTeamManageScrollViewportLayout}
              >
              <ScrollView
                ref={teamManageScrollRef}
                style={styles.managementScreenScroll}
                contentContainerStyle={styles.teamManageContent}
                scrollEnabled={draggingTeamMemberId === null}
                showsVerticalScrollIndicator={false}
                scrollEventThrottle={16}
                onContentSizeChange={handleTeamManageScrollContentSizeChange}
                onScroll={handleTeamManageScroll}
              >
                {teamManageTeams.map((team) => (
                  <View
                    key={`team-manage-card-${team.teamNumber}`}
                    onLayout={(event) =>
                      handleTeamManageContentDropLayout(
                        getTeamManageContentDropZoneId(team.teamNumber),
                        event,
                      )
                    }
                    style={[
                      styles.teamManageCard,
                      teamManageActiveDropZoneId ===
                        getTeamManageContentDropZoneId(team.teamNumber) &&
                        styles.teamManageCardDragActive,
                    ]}
                  >
                    <View style={styles.teamManageCardHeader}>
                      <Text style={styles.teamManageCardTitle}>
                        {l(formatRegularGroupLabel(team.teamNumber))}
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
                            onResponderTerminationRequest={() => false}
                            onResponderTerminate={cancelTeamManageDrag}
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
                          <Text style={styles.teamManageEmptySlotText}>{l('여기로 드래그해서 추가')}</Text>
                        </View>
                      ) : null}
                    </View>
                  </View>
                ))}

                <View
                  onLayout={(event) =>
                    handleTeamManageContentDropLayout(
                      getTeamManageContentDropZoneId(null),
                      event,
                    )
                  }
                  style={[
                    styles.teamManageCard,
                    teamManageActiveDropZoneId === getTeamManageContentDropZoneId(null) &&
                      styles.teamManageCardDragActive,
                  ]}
                >
                  <View style={styles.teamManageCardHeader}>
                    <Text style={styles.teamManageCardTitle}>{l('미배정 참여자')}</Text>
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
                          onResponderTerminationRequest={() => false}
                          onResponderTerminate={cancelTeamManageDrag}
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
                        <Text style={styles.teamManageEmptySlotText}>{l('미배정 참여자가 없습니다.')}</Text>
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
                  {l('조 편성을 저장하면 정기모임 화면으로 돌아갑니다.')}
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
                    {teamManageSaving ? l('저장 중...') : l('조 편성 저장하기')}
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
                {teamManageMemberById[draggingTeamMemberId]?.nickname ?? l('멤버')}
              </Text>
            </View>
          ) : null}
        </View>
      </Modal>
      <DialogOverlay
        visible={Boolean(bookshelfComposerType)}
        onClose={requestCloseBookshelfComposerNow}
        overlayStyle={styles.bookshelfComposerOverlay}
        cardStyle={styles.bookshelfComposerCard}
        withKeyboard
      >
	              <View style={styles.bookshelfComposerHeader}>
	                <Text style={styles.bookshelfComposerTitle}>
	                  {bookshelfComposerType === 'TOPIC'
	                    ? editingBookshelfPost
	                      ? l('발제 수정하기')
	                      : l('발제 추가하기')
	                    : editingBookshelfPost
	                      ? l('한줄평 수정하기')
	                      : l('한줄평 추가하기')}
	                </Text>
	                <Pressable onPress={requestCloseBookshelfComposerNow} hitSlop={8}>
	                  <MaterialIcons name="close" size={22} color={colors.gray5} />
	                </Pressable>
	              </View>

              {bookshelfComposerType === 'REVIEW' ? (
                <View style={styles.formGroup}>
                  <Text style={styles.bookshelfComposerLabel}>{l('평점')}</Text>
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
                          onPress={() => handleChangeBookshelfComposerRating(value - 0.5)}
                        />
                        <Pressable
                          style={({ pressed }) => [
                            styles.bookshelfComposerRatingButton,
                            styles.bookshelfComposerRatingButtonRight,
                            pressed && styles.pressed,
                          ]}
                          onPress={() => handleChangeBookshelfComposerRating(value)}
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
                  {bookshelfComposerType === 'TOPIC' ? l('발제 내용') : l('한줄평 내용')}
                </Text>
                <FormTextInput
                  value={bookshelfComposerInput}
                  onChangeText={handleChangeBookshelfComposerInput}
                  placeholder={
                    bookshelfComposerType === 'TOPIC'
                      ? l('발제 내용을 입력해주세요. (최대 {limit}자)', {
                          limit: INPUT_LIMITS.BOOKSHELF_COMPOSER,
                        })
                      : l('한줄평을 입력해주세요. (최대 {limit}자)', {
                          limit: INPUT_LIMITS.BOOKSHELF_COMPOSER,
                        })
                  }
                  placeholderTextColor={colors.gray3}
                  style={[styles.input, styles.textArea, styles.bookshelfComposerInput]}
                  multiline
                  scrollEnabled
                  textAlignVertical="top"
                  maxLength={INPUT_LIMITS.BOOKSHELF_COMPOSER}
                  overLimitMessage={l('내용은 {limit}자 이하여야 합니다.', {
                    limit: INPUT_LIMITS.BOOKSHELF_COMPOSER,
                  })}
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
                  onPress={requestCloseBookshelfComposerNow}
                  disabled={submittingBookshelfComposer}
                >
                  <Text style={styles.secondaryText}>{l('취소')}</Text>
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
	                        ? l('수정 중...')
	                        : l('등록 중...')
	                      : editingBookshelfPost
	                        ? l('수정하기')
	                        : l('등록하기')}
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
        refreshingJoinRequests={refreshingJoinRequests}
        selectedMemberAction={selectedMemberAction}
        submittingMemberAction={submittingMemberAction}
        refreshingMembers={refreshingMembers}
        editDraft={editDraft}
        checkedEditName={checkedEditName}
        checkingEditName={checkingEditName}
        uploadingClubImage={uploadingClubImage}
        managementSheetY={managementSheetY}
        managementHandlePanResponder={managementHandlePanResponder}
        handleCloseManagementLayer={handleCloseManagementLayerWithGuard}
        handleCloseManagementScreen={requestCloseManagementScreen}
        closeManagementMenu={closeManagementMenu}
        closeManagementMenuImmediately={closeManagementMenuImmediately}
        setSelectedJoinRequestMessage={setSelectedJoinRequestMessage}
        setSelectedJoinRequestActionId={setSelectedJoinRequestActionId}
        handleOpenJoinRequestProfile={handleOpenJoinRequestProfile}
        setSelectedMemberActionId={setSelectedMemberActionId}
        setEditDraft={setEditDraft}
        handleChangeEditName={handleChangeEditName}
        handleCheckEditName={handleCheckEditName}
        handlePickClubImage={handlePickClubImage}
        handleSaveGroupEdit={handleSaveGroupEdit}
        handleRefreshJoinRequests={handleRefreshJoinRequests}
        handleRefreshMembers={handleRefreshMembers}
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
        bookshelfBookSearchTotal={bookshelfBookSearchTotal}
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
        resetBookshelfBookSearch={resetBookshelfBookSearch}
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
          <View
            style={[
              styles.managementScreenHeader,
              {
                paddingTop:
                  Platform.OS === 'android'
                    ? spacing.lg
                    : Math.max(insets.top, spacing.lg) + spacing.sm,
              },
            ]}
          >
            <Pressable onPress={handleCloseNoticeComposer} hitSlop={8}>
              <MaterialIcons name="chevron-left" size={24} color={colors.gray6} />
            </Pressable>
            <Text style={styles.managementScreenTitle}>
              {editingNoticeId ? l('공지 수정하기') : l('공지 작성하기')}
            </Text>
            <Pressable onPress={handleCloseNoticeComposer} hitSlop={8}>
              <MaterialIcons name="close" size={22} color={colors.gray6} />
            </Pressable>
          </View>

          <ScrollView
            style={styles.managementScreenScroll}
            contentContainerStyle={styles.managementScreenContent}
            showsVerticalScrollIndicator={false}
            scrollEnabled={
              !noticeContentInputFocused ||
              !noticeContentInputScrollEnabled
            }
            keyboardShouldPersistTaps="always"
            keyboardDismissMode={Platform.OS === 'ios' ? 'interactive' : 'none'}
          >
            <View style={styles.noticeComposerCard}>
              <View style={styles.noticeComposerFieldHeader}>
                <Text style={styles.noticeComposerLabel}>{l('제목')}</Text>
                <Text style={styles.noticeComposerCounter}>
                  {noticeDraft.title.length}/{INPUT_LIMITS.NOTICE_TITLE}
                </Text>
              </View>
              <FormTextInput
                value={noticeDraft.title}
                onChangeText={handleChangeNoticeTitle}
                placeholder={l('제목을 입력해야 합니다. (최대 {limit}자)', {
                  limit: INPUT_LIMITS.NOTICE_TITLE,
                })}
                placeholderTextColor={colors.gray3}
                style={[
                  styles.input,
                  styles.noticeComposerTitleInput,
                  { height: noticeTitleInputHeight },
                ]}
                multiline
                textAlignVertical="top"
                numberOfLines={4}
                maxLength={INPUT_LIMITS.NOTICE_TITLE}
                overLimitMessage={l('공지 제목은 {limit}자 이하여야 합니다.', {
                  limit: INPUT_LIMITS.NOTICE_TITLE,
                })}
                scrollEnabled
                onContentSizeChange={(event) =>
                  handleNoticeTitleContentSizeChange(event, noticeDraft.title)
                }
              />

              <View style={styles.noticeComposerFieldHeader}>
                <Text style={styles.noticeComposerLabel}>{l('내용')}</Text>
                <Text style={styles.noticeComposerCounter}>
                  {noticeDraft.content.length}/{INPUT_LIMITS.NOTICE_CONTENT}
                </Text>
              </View>
              <FormTextInput
                value={noticeDraft.content}
                onChangeText={handleChangeNoticeContent}
                placeholder={l('내용을 입력해야 합니다. (최대 {limit}자)', {
                  limit: INPUT_LIMITS.NOTICE_CONTENT,
                })}
                placeholderTextColor={colors.gray3}
                style={[
                  styles.input,
                  styles.noticeComposerTextArea,
                  {
                    height: noticeContentInputHeight,
                    maxHeight: NOTICE_CONTENT_INPUT_MAX_HEIGHT,
                  },
                ]}
                multiline
                textAlignVertical="top"
                maxLength={INPUT_LIMITS.NOTICE_CONTENT}
                overLimitMessage={l('공지 내용은 {limit}자 이하여야 합니다.', {
                  limit: INPUT_LIMITS.NOTICE_CONTENT,
                })}
                scrollEnabled
                onFocus={() => setNoticeContentInputFocused(true)}
                onBlur={() => setNoticeContentInputFocused(false)}
                onContentSizeChange={(event) =>
                  handleNoticeContentSizeChange(event, noticeDraft.content)
                }
              />

              <View style={styles.noticeComposerPinRow}>
                <Text style={styles.noticeAttachmentTitle}>{l('상단 고정')}</Text>
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
                    {noticeDraft.isPinned ? l('고정 해제하기') : l('고정하기')}
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
                    {l('책장')}
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
                    {l('투표')}
                  </Text>
                </Pressable>
                <Pressable
                  style={({ pressed }) => [
                    styles.noticeComposerToggle,
                    noticeDraft.photos.length > 0 && styles.noticeComposerToggleActive,
                    pressed && styles.pressed,
                  ]}
                  onPress={() => { void handleAddNoticePhoto(pickAndUploadImage); }}
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
                    {uploadingNoticePhoto ? l('업로드 중') : l('사진')}
                  </Text>
                </Pressable>
              </View>

              {noticeDraft.bookshelfEnabled ? (
                <View style={styles.noticeComposerSection}>
                  <View style={styles.noticeComposerSectionHeader}>
                    <Text style={styles.noticeAttachmentTitle}>{l('책장')}</Text>
                    <Pressable
                      style={({ pressed }) => [styles.noticeComposerLinkButton, pressed && styles.pressed]}
                      onPress={() => setNoticeBookSelectorVisible(true)}
                    >
                      <Text style={styles.noticeComposerLinkButtonText}>
                        {noticeDraft.bookshelfId ? l('책장 변경') : l('책장 연결')}
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
                                <Text style={styles.bookshelfBadgeText}>{l(attachedBook.category)}</Text>
                              </View>
                            </View>
                          </View>
                        </View>
                      ) : null;
                    })()
                  ) : (
                    <Text style={styles.helperText}>{l('연결할 책장을 선택해야 합니다.')}</Text>
                  )}
                </View>
              ) : null}

              {noticeDraft.pollEnabled ? (
                <View style={styles.noticeComposerSection}>
                  <View style={styles.noticeComposerPollHeader}>
                    <Text style={styles.noticeAttachmentTitle}>{l('투표')}</Text>
                    <Text style={styles.noticeComposerPollEditNote}>
                      {l('투표가 있는 공지사항은 수정이 불가합니다')}
                    </Text>
                  </View>
                  <View style={styles.noticeComposerPollOptionList}>
                    {noticeDraft.pollOptions.map((option, index) => {
                      const removable = index >= 2;

                      return (
                        <View
                          key={`notice-poll-option-${index}`}
                          style={styles.noticeComposerPollOptionRow}
                        >
                          <FormTextInput
                            value={option}
                            onChangeText={(text) => handleUpdateNoticePollOption(index, text)}
                            placeholder={l('투표 항목 {number}', { number: index + 1 })}
                            placeholderTextColor={colors.gray3}
                            style={styles.noticeComposerPollOptionInput}
                            maxLength={INPUT_LIMITS.NOTICE_POLL_OPTION}
                            overLimitMessage={l('투표 항목은 {limit}자 이하여야 합니다.', {
                              limit: INPUT_LIMITS.NOTICE_POLL_OPTION,
                            })}
                          />
                          {removable ? (
                            <Pressable
                              style={({ pressed }) => [
                                styles.noticeComposerPollOptionRemove,
                                pressed && styles.pressed,
                              ]}
                              onPress={() => handleRemoveNoticePollOption(index)}
                              hitSlop={8}
                              accessibilityRole="button"
                              accessibilityLabel={l('투표 항목 {number} 삭제', { number: index + 1 })}
                            >
                              <MaterialIcons name="close" size={18} color={colors.gray4} />
                            </Pressable>
                          ) : null}
                        </View>
                      );
                    })}
                    {noticeDraft.pollOptions.length < INPUT_LIMITS.NOTICE_POLL_OPTION_MAX ? (
                      <Pressable
                        style={({ pressed }) => [styles.noticeComposerAddOptionButton, pressed && styles.pressed]}
                        onPress={handleAddNoticePollOption}
                      >
                        <MaterialIcons name="add" size={18} color={colors.gray5} />
                        <Text style={styles.noticeComposerAddOptionText}>{l('항목 추가')}</Text>
                      </Pressable>
                    ) : null}
                  </View>
                  <View style={styles.noticeComposerChoiceRow}>
                    <Pressable
                      style={({ pressed }) => [
                        styles.noticeComposerChoiceChip,
                        noticeDraft.pollAnonymous && styles.noticeComposerChoiceChipActive,
                        pressed && styles.pressed,
                      ]}
                      onPress={() => {
                        Keyboard.dismiss();
                        setNoticeDraft((prev) => ({ ...prev, pollAnonymous: true }));
                      }}
                      hitSlop={6}
                      accessibilityRole="button"
                      accessibilityState={{ selected: noticeDraft.pollAnonymous }}
                    >
                      <Text
                        style={[
                          styles.noticeComposerChoiceChipText,
                          noticeDraft.pollAnonymous && styles.noticeComposerChoiceChipTextActive,
                        ]}
                      >
                        {l('익명')}
                      </Text>
                    </Pressable>
                    <Pressable
                      style={({ pressed }) => [
                        styles.noticeComposerChoiceChip,
                        !noticeDraft.pollAnonymous && styles.noticeComposerChoiceChipActive,
                        pressed && styles.pressed,
                      ]}
                      onPress={() => {
                        Keyboard.dismiss();
                        setNoticeDraft((prev) => ({ ...prev, pollAnonymous: false }));
                      }}
                      hitSlop={6}
                      accessibilityRole="button"
                      accessibilityState={{ selected: !noticeDraft.pollAnonymous }}
                    >
                      <Text
                        style={[
                          styles.noticeComposerChoiceChipText,
                          !noticeDraft.pollAnonymous && styles.noticeComposerChoiceChipTextActive,
                        ]}
                      >
                        {l('실명')}
                      </Text>
                    </Pressable>
                    <Pressable
                      style={({ pressed }) => [
                        styles.noticeComposerChoiceChip,
                        noticeDraft.pollAllowDuplicate && styles.noticeComposerChoiceChipActive,
                        pressed && styles.pressed,
                      ]}
                      onPress={() => {
                        Keyboard.dismiss();
                        setNoticeDraft((prev) => ({
                          ...prev,
                          pollAllowDuplicate: !prev.pollAllowDuplicate,
                        }));
                      }}
                      hitSlop={6}
                      accessibilityRole="button"
                      accessibilityState={{ selected: noticeDraft.pollAllowDuplicate }}
                    >
                      <Text
                        style={[
                          styles.noticeComposerChoiceChipText,
                          noticeDraft.pollAllowDuplicate &&
                            styles.noticeComposerChoiceChipTextActive,
                        ]}
                      >
                        {l('중복 가능')}
                      </Text>
                    </Pressable>
                  </View>
                  <View style={styles.noticeComposerDateRow}>
                    <DateTimeField
                      value={dotDateTimeToDate(noticeDraft.pollStartsAt)}
                      onChange={(date) =>
                        setNoticeDraft((prev) => ({
                          ...prev,
                          pollStartsAt: dateToDotDateTime(date),
                        }))
                      }
                      placeholder={l('시작 시간')}
                      minimumDate={new Date()}
                      style={styles.noticeComposerDateInput}
                    />
                    <DateTimeField
                      value={dotDateTimeToDate(noticeDraft.pollEndsAt)}
                      onChange={(date) =>
                        setNoticeDraft((prev) => ({
                          ...prev,
                          pollEndsAt: dateToDotDateTime(date),
                        }))
                      }
                      placeholder={l('종료 시간')}
                      minimumDate={dotDateTimeToDate(noticeDraft.pollStartsAt) ?? new Date()}
                      style={styles.noticeComposerDateInput}
                    />
                  </View>
                </View>
              ) : null}

              {noticeDraft.photos.length > 0 ? (
                <View style={styles.noticeComposerSection}>
                  <View style={styles.noticeComposerSectionHeader}>
                    <Text style={styles.noticeAttachmentTitle}>{l('사진')}</Text>
                    <Text style={styles.noticeComposerCounter}>
                      {noticeDraft.photos.length}/{INPUT_LIMITS.NOTICE_IMAGE_COUNT}
                    </Text>
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
              style={({ pressed }) => [
                styles.outlineButton,
                styles.noticeComposerFooterButton,
                submittingNotice && styles.noticeComposerFooterButtonDisabled,
                pressed && !submittingNotice && styles.pressed,
              ]}
              onPress={handleCloseNoticeComposer}
              disabled={submittingNotice}
            >
              <Text style={styles.outlineButtonText}>{l('취소')}</Text>
            </Pressable>
            <Pressable
              style={({ pressed }) => [
                styles.primaryButton,
                styles.noticeComposerFooterButton,
                submittingNotice && styles.primaryButtonDisabled,
                pressed && !submittingNotice && styles.pressed,
              ]}
              onPress={handleSubmitNotice}
              disabled={submittingNotice}
            >
              <Text style={styles.primaryButtonText}>
                {submittingNotice
                  ? editingNoticeId
                    ? l('수정 중')
                    : l('등록 중')
                  : editingNoticeId
                    ? l('수정하기')
                    : l('등록하기')}
              </Text>
            </Pressable>
          </View>

          {noticeBookSelectorVisible ? (
            <View style={styles.noticeBookSelectorInlineOverlay}>
              <Pressable
                style={StyleSheet.absoluteFill}
                onPress={() => setNoticeBookSelectorVisible(false)}
                disableFeedback
              />
              <View style={styles.noticeBookSelectorCard}>
                <View style={styles.managementModalHeader}>
                  <Text style={styles.managementModalTitle}>{l('책장 선택')}</Text>
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
                      <Image
                        source={{ uri: book.coverImage }}
                        style={styles.noticeBookSelectorCover}
                      />
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
                      <Text style={styles.managementEmptyText}>{l('연결할 책장이 없습니다.')}</Text>
                    </View>
                  ) : null}
                </ScrollView>
              </View>
            </View>
          ) : null}
        </KeyboardAvoidingView>
        <ToastHost />
      </Modal>
      <BottomSheetActionMenu
        visible={noticeMenuVisible}
        title={l('공지 메뉴')}
        actions={noticeMenuItems}
        onClose={() => setNoticeMenuVisible(false)}
      />
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
                <Text style={styles.contactModalEmptyText}>{l('문의하기 링크가 없습니다.')}</Text>
              </View>
            )}
      </DialogOverlay>
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
                <Text style={styles.voteVotersEmptyText}>{l('아직 투표자가 없습니다.')}</Text>
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
  onCreated,
  onDirtyChange,
}: {
  onClose: () => void;
  onCreated?: () => Promise<void> | void;
  onDirtyChange?: (dirty: boolean) => void;
}) {
  const { l } = useLanguage();
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
    () => Object.keys(CATEGORY_LABEL_TO_CODE),
    [],
  );
  const targetOptions = useMemo(() => Object.keys(PARTICIPANT_LABEL_TO_CODE), []);

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

    Alert.alert(l('알림'), l('현재 페이지는 저장되지 않습니다.'), [
      { text: l('취소'), style: 'cancel' },
      { text: l('닫기'), style: 'destructive', onPress: onClose },
    ]);
  }, [isDirty, l, onClose]);

  const handleCheckName = async () => {
    Keyboard.dismiss();
    const normalized = name.trim();
    if (!normalized) {
      showToast(l('모임 이름을 입력해야 합니다.'));
      return;
    }

    setCheckingName(true);
    try {
      const duplicate = await checkClubNameDuplicate(normalized);
      setCheckedName({ value: normalized, duplicate });
      showToast(duplicate ? l('이미 사용 중인 모임 이름입니다.') : l('사용 가능한 모임 이름입니다.'));
    } catch (error) {
      if (!(error instanceof ApiError)) {
        showToast(l('모임 이름 중복 확인에 실패했습니다.'));
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
        showToast(l('모임 이미지를 적용했습니다.'));
      } catch (error) {
        if (!(error instanceof ApiError)) {
          showToast(l('이미지 업로드에 실패했습니다.'));
        }
      } finally {
        setUploadingClubImage(false);
      }
    };

    void pick();
  }, [l, uploadingClubImage]);

  const handleUseDefaultClubImage = useCallback(() => {
    setClubImageMode('default');
    setClubImageUrl('');
  }, []);

  const handleCreateClub = async () => {
    if (creating) return;

    const categoryCodes = categories
      .map((label) => CATEGORY_LABEL_TO_CODE[label])
      .filter((code): code is ClubCategoryCode => Boolean(code));

    const participantCodes = targets
      .map((label) => PARTICIPANT_LABEL_TO_CODE[label])
      .filter((code): code is ClubParticipantTypeCode => Boolean(code));

    if (categoryCodes.length === 0 || participantCodes.length === 0) {
      showToast(l('카테고리와 모임 대상을 확인해야 합니다.'));
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
      try {
        await onCreated?.();
      } catch (refreshError) {
        if (!(refreshError instanceof ApiError)) {
          showToast(l('모임 목록을 새로고침하지 못했습니다.'));
        }
      }
      showToast(l('모임이 생성되었습니다.'));
      onClose();
    } catch (error) {
      if (!(error instanceof ApiError)) {
        showToast(l('모임 생성에 실패했습니다.'));
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
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
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
            <Text style={styles.breadcrumbText}>{l('모임')}</Text>
            <MaterialIcons name="chevron-right" size={16} color={colors.gray4} />
            <Text style={[styles.breadcrumbText, styles.breadcrumbActive]}>{l('새 모임 생성')}</Text>
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
              <Text style={styles.sectionTitle}>{l('독서 모임 이름을 입력해주세요!')}</Text>
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
                  placeholder={l('독서 모임 이름을 입력해주세요')}
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
                    Keyboard.dismiss();
                    void handleCheckName();
                  }}
                  disabled={checkingName}
                >
                  <Text style={styles.dupCheckText}>
                    {checkingName ? l('확인 중...') : l('중복확인')}
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
                    ? l('이미 사용 중인 모임 이름입니다.')
                    : l('사용 가능한 모임 이름입니다.')}
                </Text>
              ) : null}
              <Text style={styles.helperText}>
                {l('다른 이름을 입력하거나, 기수 또는 지역명을 추가해 구분해주세요. 예) 독서처럼 2기, 독서처럼 서울, 북적북적 인문학팀')}
              </Text>

              <Text style={[styles.sectionTitle, { marginTop: spacing.lg }]}>
                {l('모임의 소개글을 입력해주세요!')}
              </Text>
              <FormTextInput
                value={desc}
                onChangeText={setDesc}
                placeholder={l('자유롭게 입력해주세요! (500자 제한)')}
                placeholderTextColor={colors.gray3}
                style={[styles.input, styles.textArea]}
                multiline
                scrollEnabled
                textAlignVertical="top"
                maxLength={INPUT_LIMITS.CLUB_DESCRIPTION}
                overLimitMessage={l('모임 소개글은 {limit}자 이하여야 합니다.', {
                  limit: INPUT_LIMITS.CLUB_DESCRIPTION,
                })}
              />
              <Text style={styles.bookshelfComposerCounter}>
                {desc.length}/{INPUT_LIMITS.CLUB_DESCRIPTION}
              </Text>
            </View>
          )}

          {step === 2 && (
            <View style={styles.sectionBox}>
              <Text style={styles.sectionTitle}>{l('모임의 프로필 사진을 업로드 해주세요!')}</Text>
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
                      <Text style={styles.createProfileEmptyTitle}>{l('사진 업로드')}</Text>
                      <Text style={styles.createProfileEmptyDescription}>
                        {l('탭하여 앨범에서 사진을 선택하세요')}
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
                      {l('기본 이미지')}
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
                      {uploadingClubImage ? l('업로드 중...') : l('사진 업로드')}
                    </Text>
                  </Pressable>
                </View>

                <Text style={styles.createProfileHint}>
                  {l('프로필 이미지는 나중에 모임 관리 화면에서 다시 변경할 수 있습니다.')}
                </Text>
              </View>

              <Text style={[styles.sectionTitle, { marginTop: spacing.lg }]}>
                {l('모임의 공개여부를 알려주세요!')}
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
                    onPress={() => {
                      Keyboard.dismiss();
                      setIsPublic(value);
                    }}
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
                          {l(option.label)}
                        </Text>
                        <Text
                          style={[
                            styles.createVisibilityDescription,
                            active && styles.createVisibilityDescriptionActive,
                          ]}
                        >
                          {l(option.description)}
                        </Text>
                      </View>
                    </Pressable>
                  );
                })}
              </View>

              <Text style={[styles.createProfileHint, { marginTop: spacing.sm }]}>
                {l('공개여부는 나중에 모임 관리 화면에서 다시 변경할 수 있습니다.')}
              </Text>
            </View>
          )}

          {step === 3 && (
            <View style={styles.sectionBox}>
              <Text style={styles.sectionTitle}>{l('선호하는 독서 카테고리를 선택해주세요!')}</Text>
              <View style={styles.chipGrid}>
                {categoryOptions.map((c) => {
                  const active = categories.includes(c);
                  return (
                    <Pressable
                      key={c}
                      onPress={() => {
                        Keyboard.dismiss();
                        toggleItem(c, categories, setCategories);
                      }}
                      style={({ pressed }) => [
                        styles.chip,
                        active ? styles.chipActive : null,
                        pressed && styles.pressed,
                      ]}
                    >
                      <Text style={[styles.chipText, active ? styles.chipTextActive : null]}>{l(c)}</Text>
                    </Pressable>
                  );
                })}
              </View>

              <Text style={[styles.sectionTitle, { marginTop: spacing.md }]}>
                {l('활동 지역을 입력해주세요! (40자 제한)')}
              </Text>
              <FormTextInput
                value={region}
                onChangeText={setRegion}
                placeholder={l('활동 지역을 입력해주세요 (40자 제한)')}
                placeholderTextColor={colors.gray3}
                style={styles.input}
                maxLength={INPUT_LIMITS.CLUB_REGION}
              />

              <Text style={[styles.sectionTitle, { marginTop: spacing.md }]}>
                {l('모임의 대상을 선택해주세요!')}
              </Text>
              <View style={styles.chipGrid}>
                {targetOptions.map((t) => {
                  const active = targets.includes(t);
                  return (
                    <Pressable
                      key={t}
                      onPress={() => {
                        Keyboard.dismiss();
                        toggleItem(t, targets, setTargets);
                      }}
                      style={({ pressed }) => [
                        styles.chip,
                        active ? styles.chipActive : null,
                        pressed && styles.pressed,
                      ]}
                    >
                      <Text style={[styles.chipText, active ? styles.chipTextActive : null]}>{l(t)}</Text>
                    </Pressable>
                  );
                })}
              </View>
            </View>
          )}

          {step === 4 && (
            <View style={styles.sectionBox}>
              <Text style={styles.sectionTitle}>{l('SNS나 링크 연동이 있다면 해주세요! (선택)')}</Text>
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
                    placeholder={l('링크 대체 텍스트 입력(최대 20자)')}
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
                    placeholder={l('링크 입력(최대 100자)')}
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
                  onPress={() => {
                    Keyboard.dismiss();
                    setLinks((prev: LinkItem[]) => [...prev, { text: '', url: '' }]);
                  }}
                >
                  <Text style={styles.addLinkText}>+</Text>
                </Pressable>
              ) : (
                <Text style={styles.helperText}>{l('링크는 최대 4개까지 추가할 수 있습니다.')}</Text>
              )}
            </View>
          )}

          <View style={[styles.navRow, step === 1 ? styles.navRowSingle : null]}>
            {step > 1 ? (
              <Pressable
                style={({ pressed }) => [styles.secondaryButton, pressed && styles.pressed, styles.buttonGrow]}
                onPress={() => {
                  Keyboard.dismiss();
                  goPrev();
                }}
              >
                <Text style={styles.secondaryText}>{l('이전')}</Text>
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
                Keyboard.dismiss();
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
                {step === 4 ? (creating ? l('완료 중...') : l('완료')) : l('다음')}
              </Text>
            </Pressable>
          </View>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}
