import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import type { Dispatch, SetStateAction } from 'react';
import {
  Alert,
  Image,
  Linking,
  Modal,
  Pressable,
  ScrollView,
  RefreshControl,
  StyleSheet,
  Text,
  TextInput,
  View,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import type {
  GestureResponderEvent,
  NativeScrollEvent,
  NativeSyntheticEvent,
} from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { useNavigation, useRoute } from '@react-navigation/native';
import * as ImagePicker from 'expo-image-picker';
import { SvgUri } from 'react-native-svg';

import { colors, radius, spacing, typography } from '../theme';
import { navigateToHome } from '../navigation/navigateToHome';
import { BookFlipLoadingScreen } from '../components/common/BookFlipLoadingScreen';
import { FloatingActionButton } from '../components/common/FloatingActionButton';
import { ScreenLayout } from '../components/common/ScreenLayout';
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
  sendClubMeetingTeamChatMessage,
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
  formatKstDateLabel,
  formatKstDateTimeLabel,
  getCurrentKstApiDateTime,
  getCurrentKstDateLabel,
  getCurrentKstYearMonth,
  toKstApiDateTime,
} from '../utils/date';
import { normalizeRemoteImageUrl } from '../utils/image';
import { showToast } from '../utils/toast';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

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
const BOOKSHELF_MEETING_TITLE_MAX_LENGTH = 12;
const BOOKSHELF_MEETING_LOCATION_MAX_LENGTH = 12;
const ISBN13_REGEX = /^\d{13}$/;
const MAX_REGULAR_GROUP_COUNT = 10;

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
const clubDefaultImageUri = Image.resolveAssetSource(
  require('../../assets/icons/logo_primary.svg'),
).uri;
const clubDefaultProfileLogoUri = Image.resolveAssetSource(
  require('../../assets/mobile-header-logo.svg'),
).uri;
const calendarWeekdayLabels = ['일', '월', '화', '수', '목', '금', '토'] as const;

function ClubDefaultProfileArtwork({
  variant = 'detail',
}: {
  variant?: 'detail' | 'preview';
}) {
  const preview = variant === 'preview';

  return (
    <View
      style={[
        styles.clubDefaultProfileArtwork,
        preview ? styles.clubDefaultProfileArtworkPreview : styles.clubDefaultProfileArtworkDetail,
      ]}
    >
      <SvgUri
        uri={clubDefaultProfileLogoUri}
        width={preview ? 72 : 96}
        height={preview ? 44 : 58}
      />
    </View>
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

function formatDotDateValue(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}.${month}.${day}`;
}

function formatDotDate(value?: string): string {
  return formatKstDateLabel(value);
}

function formatDotDateTime(value?: string): string {
  return formatKstDateTimeLabel(value);
}

function toApiDateTime(value: string): string | undefined {
  return toKstApiDateTime(value);
}

function toTeamLabel(teamNumber?: number): string {
  if (!teamNumber || teamNumber < 1) return '미배정';
  const alphabetIndex = teamNumber - 1;
  if (alphabetIndex >= 0 && alphabetIndex < 26) {
    return `${String.fromCharCode(65 + alphabetIndex)}조`;
  }
  return `${teamNumber}조`;
}

function parseGenerationNumber(value?: string): number | null {
  if (!value) return null;
  const digits = value.replace(/[^0-9]/g, '');
  if (!digits) return null;
  const parsed = Number(digits);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : null;
}

function formatGenerationLabel(value?: string | number | null): string {
  if (typeof value === 'number' && Number.isFinite(value) && value > 0) {
    return `${value}기`;
  }
  if (typeof value === 'string') {
    const parsed = parseGenerationNumber(value);
    return parsed ? `${parsed}기` : value;
  }
  return '';
}

function sanitizeGenerationInput(value: string): string {
  return value.replace(/[^0-9]/g, '').slice(0, 2);
}

function inferMimeType(fileName?: string, fallback?: string): string {
  if (typeof fallback === 'string' && fallback.startsWith('image/')) return fallback;
  const extension = fileName?.split('.').pop()?.toLowerCase();
  switch (extension) {
    case 'png':
      return 'image/png';
    case 'webp':
      return 'image/webp';
    case 'heic':
    case 'heif':
      return 'image/heic';
    case 'gif':
      return 'image/gif';
    default:
      return 'image/jpeg';
  }
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
    showToast('이미지 업로드 URL 발급에 실패했습니다.');
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

function parseDotDate(value?: string): Date | null {
  if (!value) return null;
  const match = value.trim().match(/^(\d{4})\.(\d{2})\.(\d{2})$/);
  if (!match) return null;
  const [, yearText, monthText, dayText] = match;
  const year = Number(yearText);
  const month = Number(monthText);
  const day = Number(dayText);
  const parsed = new Date(year, month - 1, day);
  if (
    parsed.getFullYear() !== year ||
    parsed.getMonth() !== month - 1 ||
    parsed.getDate() !== day
  ) {
    return null;
  }
  return parsed;
}

function formatCalendarMonthLabel(date: Date): string {
  return `${date.getFullYear()}년 ${date.getMonth() + 1}월`;
}

function buildCalendarDays(monthDate: Date): Array<{
  key: string;
  label: string;
  value: string;
  inCurrentMonth: boolean;
  isToday: boolean;
}> {
  const year = monthDate.getFullYear();
  const month = monthDate.getMonth();
  const monthStart = new Date(year, month, 1);
  const calendarStart = new Date(year, month, 1 - monthStart.getDay());
  const todayValue = getCurrentKstDateLabel();

  return Array.from({ length: 42 }).map((_, index) => {
    const current = new Date(calendarStart.getFullYear(), calendarStart.getMonth(), calendarStart.getDate() + index);
    const value = formatDotDateValue(current);
    return {
      key: `${value}-${index}`,
      label: String(current.getDate()),
      value,
      inCurrentMonth: current.getMonth() === month,
      isToday: value === todayValue,
    };
  });
}

function toLabelList(
  values: unknown,
  codeToLabel: Record<string, string>,
): string[] {
  if (!Array.isArray(values)) return [];

  return values
    .map((value) => {
      if (typeof value === 'string') {
        return codeToLabel[value] ?? value;
      }

      if (typeof value === 'object' && value !== null) {
        const candidate = value as { code?: unknown; description?: unknown };
        if (typeof candidate.description === 'string' && candidate.description.length > 0) {
          return candidate.description;
        }
        if (typeof candidate.code === 'string') {
          return codeToLabel[candidate.code] ?? candidate.code;
        }
      }

      return null;
    })
    .filter((value): value is string => typeof value === 'string' && value.length > 0);
}

function normalizeClubContacts(value: unknown): ClubContact[] {
  if (!Array.isArray(value)) return [];

  return value
    .map((item) => {
      if (typeof item === 'string') {
        const link = item.trim();
        if (!link) return null;
        return { link };
      }

      if (typeof item !== 'object' || item === null) return null;
      const record = item as Record<string, unknown>;
      const linkCandidate = [record.link, record.url, record.href, record.originalLink].find(
        (candidate) => candidate !== null && typeof candidate !== 'undefined',
      );
      const labelCandidate = [record.label, record.text, record.name, record.title].find(
        (candidate) => candidate !== null && typeof candidate !== 'undefined',
      );
      const link = typeof linkCandidate === 'string' ? linkCandidate.trim() : '';
      if (!link) return null;

      return {
        label: typeof labelCandidate === 'string' ? labelCandidate.trim() || undefined : undefined,
        link,
      };
    })
    .filter((item): item is ClubContact => Boolean(item));
}

function formatContactLabel(contact: ClubContact): string {
  const label = contact.label?.trim();
  if (label) return label;

  return (
    contact.link
      .trim()
      .replace(/^[a-z][a-z0-9+.-]*:\/\//i, '')
      .replace(/^www\./i, '')
      .replace(/\/$/, '') || '문의 링크'
  );
}

function toOpenableContactLink(link: string): string {
  const trimmed = link.trim();
  if (!trimmed) return trimmed;
  if (/^[a-z][a-z0-9+.-]*:/i.test(trimmed)) return trimmed;
  return `https://${trimmed}`;
}

function mapMyClubToGroup(club: { clubId: number; clubName: string }): Group {
  return {
    id: `club-${club.clubId}`,
    clubId: club.clubId,
    name: club.clubName,
    tags: [],
    topic: '모임 대상 · 정보 없음',
    region: '활동 지역 · 정보 없음',
    applicationStatus: '가입 완료',
  };
}

function mapClubStatusToApplication(status?: string): string | undefined {
  switch (status) {
    case 'PENDING':
      return '신청 완료 됨';
    case 'MEMBER':
    case 'STAFF':
    case 'OWNER':
      return '가입 완료';
    default:
      return undefined;
  }
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

export function MeetingScreen() {
  const navigation = useNavigation<any>();
  const route = useRoute<any>();
  const { requireAuth, isLoggedIn } = useAuthGate();
  const [showCreate, setShowCreate] = useState(false);
  const [createDraftDirty, setCreateDraftDirty] = useState(false);
  const [activeGroup, setActiveGroup] = useState<Group | null>(null);
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

    Alert.alert('알림', '현재 페이지는 저장 되지 않습니다.', [
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
    const shouldLoadRecommendations =
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
      const result = shouldLoadRecommendations
        ? await fetchRecommendedClubs({ suppressErrorToast: true })
        : await searchClubs({
            keyword: keyword.length > 0 ? keyword : undefined,
            inputFilter,
            outputFilter: selectedOutputFilter,
          });
      setDiscoverGroups(result.items.map(mapSearchClubToGroup));
    } catch (error) {
      setDiscoverGroups([]);
      if (error instanceof ApiError) {
        return;
      }
      if (!(error instanceof ApiError)) {
        showToast(
          shouldLoadRecommendations
            ? '추천 모임을 불러오지 못했습니다.'
            : '모임 검색에 실패했습니다.',
        );
      }
    } finally {
      setDiscoverLoading(false);
    }
  }, [activeInputFilter, search, selectedOutputFilter]);

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
    const parent = navigation.getParent();
    if (!parent) return undefined;

    const unsubscribe = parent.addListener('tabPress', (event: any) => {
      if (!(showCreate && createDraftDirty)) return;

      const targetKey = event?.target;
      const parentState = parent.getState();
      const targetRoute = parentState.routes.find(
        (routeItem: { key: string; name: string }) => routeItem.key === targetKey,
      );
      if (!targetRoute || targetRoute.name === 'Meeting') return;

      event.preventDefault();
      Alert.alert('알림', '현재 페이지는 저장 되지 않습니다.', [
        { text: '취소', style: 'cancel' },
        {
          text: '닫기',
          style: 'destructive',
          onPress: () => {
            closeCreateFlow();
            parent.navigate(targetRoute.name as never);
          },
        },
      ]);
    });

    return unsubscribe;
  }, [closeCreateFlow, createDraftDirty, navigation, showCreate]);

  useEffect(() => {
    const unsubscribe = navigation.addListener('beforeRemove', (event: any) => {
      if (!(showCreate && createDraftDirty)) return;

      event.preventDefault();
      Alert.alert('알림', '현재 페이지는 저장 되지 않습니다.', [
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
    });

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

  const openGroupHome = useCallback((group: Group) => {
    setActiveGroup(group);
    if (typeof group.clubId !== 'number') return;
    const clubId = group.clubId;
    const loadingStartedAt = Date.now();
    setOpeningClubLoading(true);

    const loadHome = async () => {
      try {
        const detail = await fetchClubHome(clubId);
        if (!detail) return;
        setActiveGroup((prev) => {
          if (!prev || prev.id !== group.id) return prev;
          return mapClubHomeDetailToGroup(detail, prev);
        });
      } catch (error) {
        if (!(error instanceof ApiError)) {
          showToast('모임 상세를 불러오지 못했습니다.');
        }
      } finally {
        await waitForMinimumLoading(loadingStartedAt);
        setOpeningClubLoading(false);
      }
    };

    void loadHome();
  }, []);

  useEffect(() => {
    if (pendingOpenClubId === null) return;
    const targetGroup =
      myGroups.find((group) => group.clubId === pendingOpenClubId) ??
      discoverGroups.find((group) => group.clubId === pendingOpenClubId);
    openGroupHome(targetGroup ?? createPendingClubGroup(pendingOpenClubId));
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
        showToast('신청 사유를 입력해주세요.');
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
          setAppliedById((prev) => ({ ...prev, [group.id]: '신청 완료 됨' }));
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
        style={styles.container}
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={handleRefresh}
            tintColor={colors.primary1}
            colors={[colors.primary1]}
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
        <MyGroupsDropdownCard
          groups={myGroups}
          onPressGroup={openGroupHome}
        />
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
        <TextInput
          value={search}
          onChangeText={setSearch}
          placeholder="검색하기 (모임명, 지역별)"
          placeholderTextColor={colors.gray3}
          style={styles.searchInput}
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

const styles = StyleSheet.create({
  screenWrap: {
    flex: 1,
  },
  loadingOverlay: {
    ...StyleSheet.absoluteFillObject,
    zIndex: 20,
    elevation: 20,
  },
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  content: {
    padding: spacing.md,
    gap: spacing.md,
    paddingBottom: spacing.xl * 2,
  },
  createContainer: {
    flex: 1,
    backgroundColor: colors.background,
  },
  createContent: {
    paddingBottom: spacing.xl * 2,
  },
  createBreadcrumbWrap: {
    borderBottomWidth: 1,
    borderBottomColor: colors.gray2,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
  },
  createBody: {
    paddingHorizontal: spacing.md,
    paddingTop: spacing.md,
    gap: spacing.md,
  },
  sectionTitle: {
    ...typography.body1_2,
    color: colors.gray6,
  },
  createButton: {
    backgroundColor: colors.primary1,
    borderRadius: radius.md,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: spacing.sm,
  },
  createButtonText: {
    ...typography.body1_2,
    color: colors.white,
  },
  searchRow: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: colors.gray2,
    borderRadius: radius.md,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
    backgroundColor: colors.white,
    gap: spacing.sm,
  },
  searchInput: {
    flex: 1,
    ...typography.body1_3,
    color: colors.gray6,
  },
  filterRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    zIndex: 30,
  },
  outputFilterWrap: {
    position: 'relative',
    zIndex: 40,
  },
  outputFilterButton: {
    minWidth: 84,
    height: 28,
    paddingHorizontal: spacing.xs,
    borderRadius: radius.sm,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs / 2,
    backgroundColor: colors.background,
  },
  outputFilterText: {
    ...typography.body1_3,
    color: colors.gray6,
  },
  outputFilterMenu: {
    position: 'absolute',
    top: 32,
    left: 0,
    minWidth: 104,
    borderWidth: 1,
    borderColor: colors.gray2,
    borderRadius: radius.sm,
    backgroundColor: colors.white,
    overflow: 'hidden',
  },
  outputFilterItem: {
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
    borderBottomWidth: 1,
    borderBottomColor: colors.gray1,
  },
  outputFilterItemSelected: {
    backgroundColor: colors.subbrown4,
  },
  outputFilterItemText: {
    ...typography.body2_2,
    color: colors.gray6,
  },
  outputFilterItemTextSelected: {
    color: colors.primary1,
  },
  filterChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs / 2,
  },
  filterText: {
    ...typography.body1_3,
  },
  filterTextActive: {
    color: colors.primary1,
  },
  filterTextInactive: {
    color: colors.gray5,
  },
  groupList: {
    gap: spacing.sm,
  },
  emptySearchBox: {
    backgroundColor: colors.white,
    borderWidth: 1,
    borderColor: colors.subbrown4,
    borderRadius: radius.md,
    paddingVertical: spacing.lg,
    alignItems: 'center',
  },
  emptySearchText: {
    ...typography.body1_3,
    color: colors.gray4,
  },
  groupCard: {
    backgroundColor: colors.white,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.subbrown4,
    padding: spacing.md,
    gap: spacing.xs,
  },
  groupHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  groupName: {
    ...typography.body1_2,
    color: colors.gray6,
  },
  privateBadge: {
    ...typography.body2_3,
    color: colors.gray4,
  },
  tagRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.xs / 2,
  },
  tag: {
    borderRadius: radius.md,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs - 2,
  },
  tagAmber: {
    backgroundColor: '#EFB56D',
  },
  tagCoral: {
    backgroundColor: '#E98F83',
  },
  tagSky: {
    backgroundColor: '#77C4E7',
  },
  tagViolet: {
    backgroundColor: '#8C77E8',
  },
  tagText: {
    ...typography.body1_3,
    color: colors.white,
  },
  groupMeta: {
    ...typography.body2_3,
    color: colors.gray5,
  },
  groupActions: {
    flexDirection: 'row',
    gap: spacing.sm,
    marginTop: spacing.xs,
  },
  groupButton: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: spacing.sm,
    borderRadius: radius.md,
  },
  outlineButton: {
    borderWidth: 1,
    borderColor: colors.gray2,
    backgroundColor: colors.white,
  },
  outlineButtonText: {
    ...typography.body1_2,
    color: colors.gray6,
  },
  primaryButton: {
    backgroundColor: colors.primary1,
  },
  primaryButtonDisabled: {
    backgroundColor: colors.gray2,
  },
  primaryButtonText: {
    ...typography.body1_2,
    color: colors.white,
  },
  pressed: {
    opacity: 0.7,
  },
  stepRow: {
    flexDirection: 'row',
    gap: spacing.xs + 2,
  },
  stepDot: {
    width: 26,
    height: 26,
    borderRadius: 13,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
  },
  stepDotActive: {
    borderColor: colors.primary1,
    backgroundColor: colors.primary1,
  },
  stepDotInactive: {
    borderColor: colors.gray2,
    backgroundColor: colors.white,
  },
  stepText: {
    ...typography.body2_2,
    color: colors.gray5,
  },
  stepTextActive: {
    color: colors.white,
  },
  sectionBox: {
    paddingTop: spacing.xs,
    gap: spacing.sm,
  },
  inlineRow: {
    flexDirection: 'row',
    gap: spacing.sm,
    alignItems: 'center',
  },
  inlineInput: {
    flex: 1,
  },
  helperText: {
    ...typography.body2_3,
    color: colors.gray4,
    lineHeight: 20,
  },
  textArea: {
    height: 124,
    textAlignVertical: 'top',
  },
  logoRow: {
    flexDirection: 'row',
    gap: spacing.sm,
    alignItems: 'stretch',
  },
  logoPlaceholder: {
    width: 120,
    height: 120,
    borderRadius: radius.md,
    backgroundColor: colors.gray1,
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: colors.subbrown4,
  },
  createProfileCard: {
    gap: spacing.sm,
    padding: spacing.md,
    borderRadius: radius.lg,
    backgroundColor: colors.subbrown4,
    borderWidth: 1,
    borderColor: colors.subbrown3,
  },
  createProfilePreview: {
    width: 132,
    minHeight: 132,
    borderRadius: radius.lg,
    overflow: 'hidden',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.white,
    borderWidth: 1,
    borderColor: colors.subbrown3,
  },
  createProfilePreviewEmpty: {
    borderStyle: 'dashed',
    backgroundColor: '#FCF9F7',
  },
  createProfileEmptyState: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: spacing.sm,
    gap: spacing.xs,
  },
  createProfileCameraBadge: {
    width: 46,
    height: 46,
    borderRadius: 23,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.subbrown4,
    borderWidth: 1,
    borderColor: colors.subbrown3,
  },
  createProfileEmptyTitle: {
    ...typography.body1_2,
    color: colors.gray6,
  },
  createProfileEmptyDescription: {
    ...typography.body2_3,
    color: colors.gray4,
    lineHeight: 18,
    textAlign: 'center',
  },
  createProfileActionColumn: {
    flex: 1,
    gap: spacing.xs,
  },
  createProfileActionButton: {
    flex: 1,
    minHeight: 62,
    borderRadius: radius.md,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    backgroundColor: colors.white,
    borderWidth: 1,
    borderColor: colors.subbrown3,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  createProfileActionButtonSelected: {
    backgroundColor: colors.primary1,
    borderColor: colors.primary1,
  },
  createProfileActionButtonPrimary: {
    backgroundColor: colors.white,
    borderColor: colors.primary1,
  },
  createProfileActionButtonDisabled: {
    opacity: 0.6,
  },
  createProfileActionIcon: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.subbrown4,
  },
  createProfileActionIconSelected: {
    backgroundColor: 'rgba(255,255,255,0.18)',
  },
  createProfileActionIconPrimary: {
    backgroundColor: colors.primary1,
  },
  createProfileActionTextWrap: {
    flex: 1,
    gap: 2,
  },
  createProfileActionTitle: {
    ...typography.body1_2,
    color: colors.gray6,
  },
  createProfileActionTitleSelected: {
    color: colors.white,
  },
  createProfileActionTitlePrimary: {
    color: colors.primary1,
  },
  createProfileActionDescription: {
    ...typography.body2_3,
    color: colors.gray4,
    lineHeight: 18,
  },
  createProfileActionDescriptionSelected: {
    color: 'rgba(255,255,255,0.86)',
  },
  createProfileActionDescriptionPrimary: {
    color: colors.gray5,
  },
  createProfileHint: {
    ...typography.body2_3,
    color: colors.gray5,
    lineHeight: 18,
  },
  checkboxRow: {
    flexDirection: 'row',
    gap: spacing.sm,
    alignItems: 'center',
  },
  checkbox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
  },
  checkBoxSquare: {
    width: 20,
    height: 20,
    borderRadius: 4,
    borderWidth: 1,
    borderColor: colors.gray3,
  },
  checkBoxSquareActive: {
    backgroundColor: colors.primary1,
    borderColor: colors.primary1,
  },
  checkboxLabel: {
    ...typography.body1_3,
    color: colors.gray6,
  },
  createVisibilityRow: {
    gap: spacing.sm,
  },
  createVisibilityCard: {
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.subbrown3,
    backgroundColor: colors.white,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  createVisibilityCardActive: {
    backgroundColor: colors.subbrown4,
    borderColor: colors.primary1,
  },
  createVisibilityIconWrap: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#F3EAE4',
  },
  createVisibilityIconWrapActive: {
    backgroundColor: colors.primary1,
  },
  createVisibilityTextWrap: {
    flex: 1,
    gap: 2,
  },
  createVisibilityTitle: {
    ...typography.body1_2,
    color: colors.gray6,
  },
  createVisibilityTitleActive: {
    color: colors.primary1,
  },
  createVisibilityDescription: {
    ...typography.body2_3,
    color: colors.gray4,
    lineHeight: 18,
  },
  createVisibilityDescriptionActive: {
    color: colors.gray5,
  },
  addLinkButton: {
    borderWidth: 1,
    borderColor: colors.gray2,
    borderRadius: radius.md,
    paddingVertical: spacing.md,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.white,
  },
  addLinkText: {
    ...typography.subhead3,
    color: colors.gray5,
  },
  navRow: {
    flexDirection: 'row',
    gap: spacing.sm,
    marginTop: spacing.lg,
  },
  navRowSingle: {
    justifyContent: 'flex-end',
  },
  breadcrumbRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
  },
  breadcrumbPress: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    alignSelf: 'flex-start',
  },
  breadcrumbText: {
    ...typography.body2_2,
    color: colors.gray4,
  },
  breadcrumbActive: {
    color: colors.gray6,
  },
  input: {
    backgroundColor: colors.white,
    borderWidth: 1,
    borderColor: colors.gray2,
    borderRadius: radius.md,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    ...typography.body1_3,
    color: colors.gray6,
  },
  chipGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
  },
  chip: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.gray2,
    backgroundColor: colors.white,
  },
  chipActive: {
    borderColor: colors.primary1,
    backgroundColor: colors.subbrown4,
  },
  chipText: {
    ...typography.body1_3,
    color: colors.gray5,
  },
  chipTextActive: {
    color: colors.primary1,
  },
  formGroup: {
    gap: spacing.xs,
  },
  dupCheckButton: {
    minWidth: 92,
    height: 48,
    borderRadius: radius.sm,
    borderWidth: 1,
    borderColor: colors.subbrown4,
    backgroundColor: colors.subbrown4,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: spacing.sm,
  },
  dupCheckButtonDisabled: {
    opacity: 0.6,
  },
  dupCheckText: {
    ...typography.body2_2,
    color: colors.gray6,
  },
  nameCheckText: {
    ...typography.body2_3,
    marginTop: spacing.xs / 2,
  },
  nameCheckSuccessText: {
    color: '#2FA66A',
  },
  nameCheckErrorText: {
    color: colors.likeRed,
  },
  secondaryButton: {
    borderWidth: 1,
    borderColor: colors.gray2,
    backgroundColor: colors.white,
    borderRadius: radius.md,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: spacing.sm,
  },
  secondaryText: {
    ...typography.body1_2,
    color: colors.gray6,
  },
  primaryText: {
    ...typography.body1_2,
    color: colors.white,
  },
  buttonFlex: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: radius.md,
  },
  buttonGrow: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: radius.md,
    paddingVertical: spacing.sm,
  },
  buttonSingle: {
    minWidth: 112,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: radius.md,
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.lg,
  },
  disabledText: {
    color: colors.gray4,
  },
  detailTitle: {
    ...typography.subhead4_1,
    color: colors.gray6,
  },
  groupHomeHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: spacing.sm,
  },
  groupHomeTitle: {
    marginTop: spacing.xs,
  },
  pillNav: {
    flexDirection: 'row',
    gap: spacing.xs,
    marginTop: spacing.sm,
  },
  pillNavItem: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.xs,
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.md,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.gray2,
    backgroundColor: colors.white,
  },
  pillNavItemActive: {
    borderColor: colors.primary1,
    backgroundColor: colors.subbrown4,
  },
  pillNavText: {
    ...typography.body1_3,
    color: colors.gray5,
  },
  pillNavTextActive: {
    color: colors.primary1,
  },
  detailCard: {
    backgroundColor: colors.white,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.subbrown4,
    padding: spacing.md,
    gap: spacing.md,
  },
  detailTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: spacing.sm,
  },
  detailTitleActionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
  },
  detailTitleManageLink: {
    paddingVertical: spacing.xs / 2,
  },
  detailTitleManageLinkText: {
    ...typography.body1_2,
    color: colors.primary1,
    textDecorationLine: 'underline',
  },
  noticeBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    backgroundColor: colors.subbrown4,
    borderRadius: radius.md,
    padding: spacing.sm,
  },
  noticeText: {
    ...typography.body1_3,
    color: colors.gray6,
  },
  detailMain: {
    gap: spacing.md,
  },
  detailImage: {
    width: '100%',
    aspectRatio: 1.25,
    borderRadius: radius.md,
    backgroundColor: colors.gray1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.xs,
  },
  detailImagePreview: {
    width: '100%',
    height: '100%',
    borderRadius: radius.md,
  },
  detailImageUploaded: {
    backgroundColor: colors.subbrown4,
    borderWidth: 1,
    borderColor: colors.subbrown3,
  },
  detailImageLabel: {
    ...typography.body1_3,
    color: colors.gray5,
  },
  clubDefaultProfileArtwork: {
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.primary1,
    borderWidth: 1,
    borderColor: colors.subbrown2,
    shadowColor: colors.primary1,
    shadowOpacity: 0.14,
    shadowOffset: { width: 0, height: 6 },
    shadowRadius: 16,
    elevation: 4,
  },
  clubDefaultProfileArtworkPreview: {
    width: '100%',
    height: '100%',
    borderRadius: radius.lg,
  },
  clubDefaultProfileArtworkDetail: {
    width: 148,
    height: 148,
    borderRadius: radius.lg,
  },
  detailInfo: {
    gap: spacing.xs,
  },
  metaBlock: {
    gap: spacing.xs / 2,
  },
  metaLabel: {
    ...typography.body2_3,
    color: colors.gray5,
  },
  metaValue: {
    ...typography.body1_3,
    color: colors.gray6,
  },
  detailBody: {
    ...typography.body1_3,
    color: colors.gray6,
    lineHeight: 22,
  },
  detailButtons: {
    flexDirection: 'row',
    gap: spacing.sm,
  },
  detailButton: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: spacing.sm,
    borderRadius: radius.md,
  },
  managementOverlay: {
    flex: 1,
    backgroundColor: colors.overlay30,
    justifyContent: 'flex-end',
    padding: spacing.md,
  },
  managementOverlayBottom: {
    flex: 1,
    backgroundColor: colors.overlay30,
    justifyContent: 'flex-end',
    padding: spacing.md,
  },
  managementCenteredOverlay: {
    flex: 1,
    backgroundColor: colors.overlay30,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: spacing.md,
  },
  managementInlineOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: colors.overlay30,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: spacing.md,
  },
  managementMenuSheet: {
    borderRadius: radius.lg,
    backgroundColor: colors.white,
    paddingHorizontal: spacing.md,
    paddingTop: spacing.sm,
    paddingBottom: spacing.lg,
    gap: spacing.sm,
  },
  managementHandle: {
    width: 44,
    height: 4,
    borderRadius: 999,
    backgroundColor: colors.gray2,
    alignSelf: 'center',
    marginBottom: spacing.xs,
  },
  managementMenuTitle: {
    ...typography.subhead3,
    color: colors.gray6,
  },
  managementMenuCaption: {
    ...typography.body2_3,
    color: colors.gray4,
  },
  managementMenuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    borderWidth: 1,
    borderColor: colors.gray1,
    borderRadius: radius.md,
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.sm,
    backgroundColor: colors.white,
  },
  managementMenuIcon: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: colors.subbrown4,
    alignItems: 'center',
    justifyContent: 'center',
  },
  managementMenuTextWrap: {
    flex: 1,
    gap: 2,
  },
  managementMenuItemTitle: {
    ...typography.body1_2,
    color: colors.gray6,
  },
  managementMenuItemDescription: {
    ...typography.body2_3,
    color: colors.gray4,
  },
  managementScreen: {
    flex: 1,
    backgroundColor: colors.background,
  },
  managementScreenHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.md,
    paddingTop: spacing.lg,
    paddingBottom: spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: colors.gray1,
    backgroundColor: colors.white,
  },
  managementScreenTitle: {
    ...typography.subhead3,
    color: colors.gray6,
  },
  managementHeaderSpacer: {
    width: 24,
    height: 24,
  },
  managementScreenScroll: {
    flex: 1,
  },
  managementScreenContent: {
    padding: spacing.md,
    gap: spacing.md,
    paddingBottom: spacing.xl * 2,
  },
  managementSummaryCard: {
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.subbrown4,
    backgroundColor: colors.white,
    padding: spacing.md,
    gap: spacing.xs,
  },
  managementSummaryTitle: {
    ...typography.subhead3,
    color: colors.gray6,
  },
  managementSummaryDescription: {
    ...typography.body2_3,
    color: colors.gray4,
    lineHeight: 20,
  },
  teamManageLoadingWrap: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: spacing.lg,
  },
  teamManageTopBar: {
    paddingHorizontal: spacing.md,
    paddingTop: spacing.md,
    gap: spacing.xs,
  },
  teamManageBookTitle: {
    ...typography.subhead2,
    color: colors.gray6,
  },
  teamManageHint: {
    ...typography.body2_3,
    color: colors.gray4,
    lineHeight: 20,
  },
  teamManageDropBar: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.xs,
    paddingHorizontal: spacing.md,
    paddingTop: spacing.md,
    paddingBottom: spacing.sm,
  },
  teamManageDropChip: {
    minHeight: 36,
    borderWidth: 1,
    borderColor: colors.gray2,
    borderRadius: radius.lg,
    backgroundColor: colors.white,
    paddingHorizontal: spacing.md,
    alignItems: 'center',
    justifyContent: 'center',
  },
  teamManageDropChipActive: {
    borderColor: colors.primary1,
    backgroundColor: colors.subbrown4,
  },
  teamManageDropChipText: {
    ...typography.body2_2,
    color: colors.gray6,
  },
  teamManageAddButton: {
    width: 36,
    height: 36,
    borderWidth: 1,
    borderColor: colors.subbrown3,
    borderRadius: 18,
    backgroundColor: colors.subbrown4,
    alignItems: 'center',
    justifyContent: 'center',
  },
  teamManageContent: {
    padding: spacing.md,
    gap: spacing.md,
    paddingBottom: spacing.xl * 2,
  },
  teamManageCard: {
    borderWidth: 1,
    borderColor: colors.gray2,
    borderRadius: radius.lg,
    backgroundColor: colors.white,
    padding: spacing.md,
    gap: spacing.md,
  },
  teamManageCardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: spacing.sm,
  },
  teamManageCardTitle: {
    ...typography.subhead3,
    color: colors.gray6,
  },
  teamManageRemoveButton: {
    width: 28,
    height: 28,
    alignItems: 'center',
    justifyContent: 'center',
  },
  teamManageMemberList: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
  },
  teamManageMemberChip: {
    minWidth: 112,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    borderWidth: 1,
    borderColor: colors.gray2,
    borderRadius: radius.md,
    backgroundColor: colors.background,
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.sm,
  },
  teamManageMemberChipSelected: {
    borderColor: colors.primary1,
    backgroundColor: colors.subbrown4,
  },
  teamManageMemberChipDragging: {
    opacity: 0.35,
  },
  teamManageMemberAvatar: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: colors.white,
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  teamManageMemberAvatarImage: {
    width: '100%',
    height: '100%',
  },
  teamManageMemberName: {
    ...typography.body1_3,
    color: colors.gray6,
  },
  teamManageEmptySlot: {
    width: '100%',
    minHeight: 84,
    borderWidth: 1,
    borderStyle: 'dashed',
    borderColor: colors.gray2,
    borderRadius: radius.md,
    alignItems: 'flex-start',
    justifyContent: 'center',
    paddingHorizontal: spacing.md,
    backgroundColor: colors.background,
  },
  teamManageEmptySlotText: {
    ...typography.body2_3,
    color: colors.gray4,
  },
  teamManageFooter: {
    paddingHorizontal: spacing.md,
    paddingTop: spacing.md,
    paddingBottom: spacing.md,
    borderTopWidth: 1,
    borderTopColor: colors.gray1,
    backgroundColor: colors.background,
    gap: spacing.xs,
  },
  teamManageFooterHint: {
    ...typography.body2_3,
    color: colors.gray4,
    textAlign: 'center',
  },
  teamManageSaveButton: {
    minHeight: 56,
    borderRadius: radius.lg,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: spacing.lg,
    borderWidth: 1,
  },
  teamManageSaveButtonActive: {
    backgroundColor: colors.primary1,
    borderColor: colors.primary1,
    shadowColor: colors.primary1,
    shadowOpacity: 0.18,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 6 },
    elevation: 4,
  },
  teamManageSaveButtonDisabled: {
    backgroundColor: colors.gray1,
    borderColor: colors.gray2,
  },
  teamManageSaveButtonText: {
    ...typography.body1_2,
    color: colors.white,
  },
  teamManageSaveButtonTextDisabled: {
    color: colors.gray4,
  },
  teamManageDraggingGhost: {
    position: 'absolute',
    minWidth: 112,
    borderWidth: 1,
    borderColor: colors.primary1,
    borderRadius: radius.md,
    backgroundColor: colors.white,
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.sm,
    shadowColor: '#000',
    shadowOpacity: 0.12,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 4 },
    elevation: 6,
  },
  teamManageDraggingGhostText: {
    ...typography.body1_3,
    color: colors.gray6,
  },
  managementCountBadge: {
    alignSelf: 'flex-start',
    borderRadius: radius.lg,
    backgroundColor: colors.subbrown4,
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs / 2,
  },
  managementCountBadgeText: {
    ...typography.body2_2,
    color: colors.primary1,
  },
  managementCardList: {
    gap: spacing.sm,
  },
  managementListCard: {
    borderWidth: 1,
    borderColor: colors.gray1,
    borderRadius: radius.md,
    backgroundColor: colors.white,
    padding: spacing.md,
    gap: spacing.xs,
  },
  managementListCardTop: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: spacing.sm,
  },
  managementIdentityRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    flex: 1,
  },
  managementAvatar: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: colors.gray1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  managementAvatarImage: {
    width: '100%',
    height: '100%',
    borderRadius: 16,
  },
  managementIdentityText: {
    gap: 2,
    flex: 1,
  },
  managementPrimaryText: {
    ...typography.body1_2,
    color: colors.gray6,
  },
  managementSecondaryText: {
    ...typography.body2_3,
    color: colors.gray5,
  },
  managementMetaText: {
    ...typography.body2_3,
    color: colors.gray4,
  },
  managementActionRow: {
    flexDirection: 'row',
    gap: spacing.xs,
    marginTop: spacing.xs,
  },
  managementGhostButton: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: colors.gray2,
    borderRadius: radius.sm,
    paddingVertical: spacing.sm,
    backgroundColor: colors.white,
  },
  managementGhostButtonText: {
    ...typography.body2_2,
    color: colors.gray6,
  },
  managementPrimarySmallButton: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: radius.sm,
    paddingVertical: spacing.sm,
    backgroundColor: colors.primary1,
  },
  managementPrimarySmallButtonText: {
    ...typography.body2_2,
    color: colors.white,
  },
  managementEmptyCard: {
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.gray1,
    paddingVertical: spacing.xl,
    backgroundColor: colors.white,
    alignItems: 'center',
    justifyContent: 'center',
  },
  managementEmptyText: {
    ...typography.body1_3,
    color: colors.gray4,
  },
  managementRoleBadge: {
    borderRadius: radius.lg,
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs / 2,
  },
  managementRoleBadgeOwner: {
    backgroundColor: '#FFF1D8',
  },
  managementRoleBadgeStaff: {
    backgroundColor: '#E2F0FF',
  },
  managementRoleBadgeMember: {
    backgroundColor: colors.subbrown4,
  },
  managementRoleBadgeText: {
    ...typography.body2_3,
    color: colors.gray6,
  },
  managementWideButton: {
    marginTop: spacing.xs,
    borderRadius: radius.sm,
    backgroundColor: colors.subbrown4,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: spacing.sm,
  },
  managementWideButtonText: {
    ...typography.body2_2,
    color: colors.primary1,
  },
  managementEditSection: {
    gap: spacing.md,
  },
  managementEditImageUploaded: {
    backgroundColor: colors.subbrown4,
    borderWidth: 1,
    borderColor: colors.subbrown3,
  },
  managementEditImageLabel: {
    ...typography.body2_3,
    color: colors.gray5,
    textAlign: 'center',
  },
  managementEditImagePreview: {
    width: '100%',
    height: '100%',
    borderRadius: radius.md,
  },
  managementToggleRow: {
    flexDirection: 'row',
    gap: spacing.xs,
  },
  managementToggleChip: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: colors.gray2,
    borderRadius: radius.md,
    backgroundColor: colors.white,
    paddingVertical: spacing.sm,
  },
  managementToggleChipActive: {
    borderColor: colors.primary1,
    backgroundColor: colors.subbrown4,
  },
  managementToggleChipText: {
    ...typography.body1_3,
    color: colors.gray5,
  },
  managementToggleChipTextActive: {
    color: colors.primary1,
  },
  managementFooter: {
    paddingHorizontal: spacing.md,
    paddingTop: spacing.sm,
    paddingBottom: spacing.lg,
    borderTopWidth: 1,
    borderTopColor: colors.gray1,
    backgroundColor: colors.white,
  },
  managementFooterButton: {
    flex: 1,
    borderRadius: radius.md,
    paddingVertical: spacing.sm,
    alignItems: 'center',
    justifyContent: 'center',
  },
  managementFooterButtonRow: {
    flexDirection: 'row',
    gap: spacing.sm,
  },
  managementFooterDangerButton: {
    borderColor: colors.likeRed,
    backgroundColor: colors.white,
  },
  managementFooterDangerButtonDisabled: {
    borderColor: colors.gray2,
  },
  managementFooterDangerButtonText: {
    ...typography.body1_2,
    color: colors.likeRed,
  },
  managementMessageCard: {
    width: '100%',
    maxWidth: 528,
    borderRadius: radius.lg,
    backgroundColor: colors.white,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.xl,
    gap: spacing.md,
  },
  managementMessageTitle: {
    ...typography.subhead2,
    color: colors.primary2,
  },
  managementMessageBody: {
    ...typography.body1_2,
    color: colors.gray5,
    lineHeight: 30,
  },
  managementMessageScroll: {
    maxHeight: 360,
  },
  managementModalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  managementModalTitle: {
    ...typography.subhead3,
    color: colors.gray6,
  },
  managementBottomSheet: {
    borderTopLeftRadius: radius.lg,
    borderTopRightRadius: radius.lg,
    backgroundColor: colors.white,
    paddingHorizontal: spacing.md,
    paddingTop: spacing.md,
    paddingBottom: spacing.xl,
    gap: spacing.xs,
  },
  managementBottomSheetTitle: {
    ...typography.subhead3,
    color: colors.gray6,
    marginBottom: spacing.xs,
  },
  managementBottomSheetItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    paddingVertical: spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: colors.gray1,
  },
  managementBottomSheetItemText: {
    ...typography.body1_3,
    color: colors.gray6,
  },
  managementJoinActionCard: {
    width: '100%',
    maxWidth: 260,
    borderRadius: radius.lg,
    backgroundColor: colors.white,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.lg,
    gap: spacing.xs,
  },
  managementJoinActionTitle: {
    ...typography.subhead2,
    color: colors.primary2,
  },
  managementJoinActionItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    paddingVertical: spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: colors.gray1,
  },
  managementJoinActionItemDisabled: {
    opacity: 0.45,
  },
  managementJoinActionItemLast: {
    borderBottomWidth: 0,
  },
  managementJoinActionItemText: {
    ...typography.body1_2,
    color: colors.gray5,
  },
  managementJoinActionItemTextDisabled: {
    color: colors.gray3,
  },
  managementRoleMenuOverlay: {
    flex: 1,
    backgroundColor: colors.overlay30,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: spacing.lg,
  },
  managementRoleMenuCard: {
    width: '100%',
    maxWidth: 292,
    borderRadius: radius.lg,
    backgroundColor: colors.white,
    paddingVertical: spacing.lg,
    paddingHorizontal: spacing.md,
    gap: spacing.xs,
  },
  managementRoleMenuTitle: {
    ...typography.subhead2,
    color: colors.primary2,
  },
  managementRoleMenuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    paddingVertical: spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: colors.gray1,
  },
  managementRoleMenuItemDisabled: {
    opacity: 0.45,
  },
  managementRoleMenuItemLast: {
    borderBottomWidth: 0,
  },
  managementRoleMenuItemText: {
    ...typography.body1_2,
    color: colors.gray5,
  },
  managementRoleMenuItemTextDisabled: {
    color: colors.gray3,
  },
  noticeBoardCard: {
    backgroundColor: colors.white,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.subbrown4,
    padding: spacing.md,
    gap: spacing.md,
  },
  noticeBoardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: spacing.sm,
  },
  noticeBoardTitle: {
    ...typography.subhead3,
    color: colors.gray6,
  },
  noticeBoardDescription: {
    ...typography.body2_3,
    color: colors.gray4,
  },
  noticeList: {
    gap: spacing.sm,
  },
  noticeItemRow: {
    borderWidth: 1,
    borderColor: colors.subbrown4,
    borderRadius: radius.sm,
    backgroundColor: colors.white,
    minHeight: 58,
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.sm,
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: spacing.xs,
  },
  noticeItemContent: {
    flex: 1,
    gap: spacing.xs / 2,
  },
  noticeTagRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs / 2,
    flexShrink: 0,
  },
  noticeTag: {
    height: 28,
    minWidth: 42,
    borderRadius: radius.sm,
    paddingHorizontal: spacing.sm,
    alignItems: 'center',
    justifyContent: 'center',
  },
  noticeTagPin: {
    backgroundColor: colors.primary1,
    minWidth: 36,
    paddingHorizontal: spacing.xs,
  },
  noticeTagVote: {
    backgroundColor: colors.secondary3,
  },
  noticeTagMeeting: {
    backgroundColor: colors.secondary2,
  },
  noticeTagText: {
    ...typography.body2_2,
    color: colors.white,
  },
  noticeItemTitle: {
    ...typography.body2_2,
    color: colors.gray6,
    flex: 1,
  },
  noticeItemMetaRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.xs,
  },
  noticeItemMetaBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    borderRadius: radius.sm,
    backgroundColor: colors.gray1,
    paddingHorizontal: spacing.xs,
    paddingVertical: 2,
  },
  noticeItemMetaText: {
    ...typography.body2_3,
    color: colors.gray4,
  },
  noticePagination: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.xs / 2,
  },
  noticePageArrow: {
    width: 30,
    height: 30,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: radius.sm,
    borderWidth: 1,
    borderColor: colors.gray2,
    backgroundColor: colors.white,
  },
  noticePageArrowDisabled: {
    opacity: 0.35,
  },
  noticePageButton: {
    width: 30,
    height: 30,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: radius.sm,
  },
  noticePageButtonActive: {
    backgroundColor: colors.subbrown4,
  },
  noticePageText: {
    ...typography.body2_2,
    color: colors.gray4,
  },
  noticePageTextActive: {
    color: colors.primary1,
  },
  noticeDetailCard: {
    backgroundColor: colors.white,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.subbrown4,
    padding: spacing.md,
    gap: spacing.md,
  },
  noticeDetailTopRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: spacing.sm,
  },
  noticeDetailCategoryRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  noticeDetailMenuButton: {
    width: 28,
    height: 28,
    alignItems: 'center',
    justifyContent: 'center',
  },
  noticeDetailDate: {
    ...typography.body2_3,
    color: colors.gray4,
  },
  noticeDetailTitle: {
    ...typography.subhead3,
    color: colors.gray6,
  },
  noticeDetailBody: {
    ...typography.body1_3,
    color: colors.gray6,
    lineHeight: 22,
  },
  noticePollSection: {
    gap: spacing.sm,
    borderWidth: 1,
    borderColor: colors.gray2,
    borderRadius: radius.md,
    backgroundColor: colors.white,
    padding: spacing.md,
  },
  noticeAttachmentCard: {
    borderWidth: 1,
    borderColor: colors.gray2,
    borderRadius: radius.md,
    backgroundColor: colors.white,
    padding: spacing.md,
    gap: spacing.sm,
  },
  noticeAttachmentTitle: {
    ...typography.body1_2,
    color: colors.gray6,
  },
  noticeBookshelfCard: {
    flexDirection: 'row',
    gap: spacing.sm,
  },
  noticeBookshelfCover: {
    width: 72,
    height: 104,
    borderRadius: radius.sm,
    backgroundColor: colors.gray1,
  },
  noticeBookshelfInfo: {
    flex: 1,
    gap: spacing.xs / 2,
  },
  noticeBookshelfTitle: {
    ...typography.body1_2,
    color: colors.gray6,
  },
  noticeBookshelfAuthor: {
    ...typography.body2_3,
    color: colors.gray5,
  },
  noticePollMetaRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    gap: spacing.sm,
  },
  noticePollSchedule: {
    flex: 1,
    gap: 2,
  },
  noticePollEndText: {
    ...typography.body2_3,
    color: colors.gray4,
  },
  noticePollMetaRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  noticePollMetaPrivacy: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs / 2,
  },
  noticePollMetaText: {
    ...typography.body2_3,
    color: colors.gray4,
  },
  noticePhotoGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
  },
  noticePhotoItem: {
    width: '30%',
    minWidth: 88,
    aspectRatio: 1,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.gray2,
    backgroundColor: colors.gray1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.xs / 2,
  },
  noticePhotoImage: {
    width: '100%',
    height: '100%',
    borderRadius: radius.md,
  },
  noticePhotoLabel: {
    ...typography.body2_3,
    color: colors.gray5,
  },
  noticePollOptionList: {
    gap: spacing.xs,
  },
  noticePollOptionRow: {
    borderWidth: 1,
    borderColor: colors.gray2,
    borderRadius: radius.sm,
    backgroundColor: colors.white,
    minHeight: 42,
    paddingHorizontal: spacing.sm,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: spacing.sm,
  },
  noticePollOptionRowSelected: {
    borderColor: colors.primary1,
    backgroundColor: colors.subbrown4,
  },
  noticePollOptionRowDisabled: {
    opacity: 0.55,
  },
  noticePollOptionLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    flex: 1,
  },
  noticePollOptionText: {
    ...typography.body2_2,
    color: colors.gray6,
    flex: 1,
  },
  noticePollOptionCount: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs / 2,
    paddingHorizontal: spacing.xs,
    paddingVertical: spacing.xs / 2,
  },
  noticePollOptionCountText: {
    ...typography.body2_3,
    color: colors.gray5,
  },
  noticePollSubmitButton: {
    marginTop: spacing.xs,
    alignSelf: 'flex-end',
    minWidth: 96,
    borderRadius: radius.md,
    backgroundColor: colors.primary1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.md,
  },
  noticePollSubmitButtonDisabled: {
    backgroundColor: colors.gray2,
  },
  noticePollSubmitText: {
    ...typography.body1_2,
    color: colors.white,
  },
  noticeDetailImageStrip: {
    height: 180,
    borderRadius: radius.md,
    backgroundColor: colors.gray1,
  },
  noticeDetailDivider: {
    height: 1,
    backgroundColor: colors.gray2,
  },
  noticeCommentSection: {
    gap: spacing.sm,
  },
  noticeCommentHeader: {
    ...typography.body1_2,
    color: colors.gray6,
  },
  noticeCommentInputRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  noticeCommentInput: {
    flex: 1,
    borderWidth: 1,
    borderColor: colors.gray2,
    borderRadius: radius.md,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    ...typography.body1_3,
    color: colors.gray6,
    backgroundColor: colors.white,
  },
  noticeCommentSubmit: {
    borderRadius: radius.md,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    minWidth: 74,
    alignItems: 'center',
    justifyContent: 'center',
  },
  noticeCommentSubmitText: {
    ...typography.body1_2,
    color: colors.white,
  },
  noticeCommentList: {
    gap: spacing.sm,
  },
  noticeCommentItem: {
    flexDirection: 'row',
    gap: spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: colors.gray2,
    paddingBottom: spacing.sm,
  },
  noticeCommentAvatar: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: colors.gray1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  noticeCommentAvatarImage: {
    width: '100%',
    height: '100%',
    borderRadius: 14,
  },
  noticeCommentBody: {
    flex: 1,
    gap: spacing.xs / 2,
  },
  noticeCommentMetaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: spacing.xs,
  },
  noticeCommentAuthorRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
  },
  noticeCommentAuthor: {
    ...typography.body1_2,
    color: colors.gray6,
  },
  noticeCommentAuthorBadge: {
    borderWidth: 1,
    borderColor: colors.subbrown3,
    borderRadius: radius.lg,
    paddingHorizontal: spacing.xs,
    paddingVertical: 2,
    backgroundColor: colors.subbrown4,
  },
  noticeCommentAuthorBadgeText: {
    ...typography.body2_3,
    color: colors.gray5,
  },
  noticeCommentDate: {
    ...typography.body2_3,
    color: colors.gray4,
  },
  noticeCommentMenuButton: {
    width: 20,
    height: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  noticeCommentText: {
    ...typography.body1_3,
    color: colors.gray6,
  },
  noticeComposerCard: {
    borderWidth: 1,
    borderColor: colors.subbrown4,
    borderRadius: radius.md,
    backgroundColor: colors.white,
    padding: spacing.md,
    gap: spacing.md,
  },
  noticeComposerLabel: {
    ...typography.body1_2,
    color: colors.gray6,
  },
  noticeComposerTextArea: {
    minHeight: 180,
    textAlignVertical: 'top',
  },
  noticeComposerActionRow: {
    flexDirection: 'row',
    gap: spacing.xs,
  },
  noticeComposerPinRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: spacing.sm,
  },
  noticeComposerToggle: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.xs / 2,
    borderWidth: 1,
    borderColor: colors.gray2,
    borderRadius: radius.md,
    backgroundColor: colors.white,
    paddingVertical: spacing.sm,
  },
  noticeComposerToggleActive: {
    borderColor: colors.primary1,
    backgroundColor: colors.subbrown4,
  },
  noticeComposerToggleText: {
    ...typography.body2_2,
    color: colors.gray5,
  },
  noticeComposerToggleTextActive: {
    color: colors.primary1,
  },
  noticeComposerPinButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.xs / 2,
    borderWidth: 1,
    borderColor: colors.gray2,
    borderRadius: radius.md,
    backgroundColor: colors.white,
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.sm,
  },
  noticeComposerPinButtonActive: {
    borderColor: colors.primary1,
    backgroundColor: colors.subbrown4,
  },
  noticeComposerPinButtonText: {
    ...typography.body2_2,
    color: colors.gray5,
  },
  noticeComposerPinButtonTextActive: {
    color: colors.primary1,
  },
  noticeComposerSection: {
    gap: spacing.sm,
  },
  noticeComposerSectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: spacing.sm,
  },
  noticeComposerLinkButton: {
    borderWidth: 1,
    borderColor: colors.gray2,
    borderRadius: radius.sm,
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
    backgroundColor: colors.white,
  },
  noticeComposerLinkButtonText: {
    ...typography.body2_2,
    color: colors.gray6,
  },
  noticeComposerPollOptionList: {
    gap: spacing.xs,
  },
  noticeComposerAddOptionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.xs / 2,
    borderWidth: 1,
    borderColor: colors.gray2,
    borderRadius: radius.md,
    paddingVertical: spacing.sm,
    backgroundColor: colors.white,
  },
  noticeComposerAddOptionText: {
    ...typography.body2_2,
    color: colors.gray5,
  },
  noticeComposerChoiceRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.xs,
  },
  noticeComposerChoiceChip: {
    borderWidth: 1,
    borderColor: colors.gray2,
    borderRadius: radius.lg,
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
    backgroundColor: colors.white,
  },
  noticeComposerChoiceChipActive: {
    borderColor: colors.primary1,
    backgroundColor: colors.subbrown4,
  },
  noticeComposerChoiceChipText: {
    ...typography.body2_2,
    color: colors.gray5,
  },
  noticeComposerChoiceChipTextActive: {
    color: colors.primary1,
  },
  noticeComposerDateRow: {
    flexDirection: 'row',
    gap: spacing.xs,
  },
  noticeComposerDateInput: {
    flex: 1,
  },
  noticeComposerPhotoGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
  },
  noticeComposerPhotoItem: {
    width: '30%',
    minWidth: 88,
    aspectRatio: 1,
    borderWidth: 1,
    borderColor: colors.gray2,
    borderRadius: radius.md,
    backgroundColor: colors.gray1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.xs / 2,
    position: 'relative',
  },
  noticeComposerPhotoImage: {
    width: '100%',
    height: '100%',
    borderRadius: radius.md,
  },
  noticeComposerPhotoRemove: {
    position: 'absolute',
    top: 6,
    right: 6,
    width: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: colors.white,
    alignItems: 'center',
    justifyContent: 'center',
  },
  noticeComposerCounter: {
    ...typography.body2_3,
    color: colors.gray4,
  },
  noticeComposerFooter: {
    flexDirection: 'row',
    gap: spacing.sm,
    paddingHorizontal: spacing.md,
    paddingTop: spacing.sm,
    paddingBottom: spacing.lg,
    borderTopWidth: 1,
    borderTopColor: colors.gray1,
    backgroundColor: colors.white,
  },
  noticeComposerFooterButton: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: radius.md,
    paddingVertical: spacing.sm,
  },
  noticeBookSelectorCard: {
    borderRadius: radius.lg,
    backgroundColor: colors.white,
    padding: spacing.md,
    gap: spacing.md,
    maxHeight: '70%',
  },
  noticeBookSelectorList: {
    gap: spacing.sm,
  },
  noticeBookSelectorItem: {
    width: 112,
    borderWidth: 1,
    borderColor: colors.gray2,
    borderRadius: radius.md,
    backgroundColor: colors.white,
    padding: spacing.sm,
    gap: spacing.xs,
  },
  noticeBookSelectorItemActive: {
    borderColor: colors.primary1,
    backgroundColor: colors.subbrown4,
  },
  noticeBookSelectorCover: {
    width: '100%',
    aspectRatio: 0.72,
    borderRadius: radius.sm,
    backgroundColor: colors.gray1,
  },
  noticeBookSelectorTitle: {
    ...typography.body2_2,
    color: colors.gray6,
  },
  noticeBookSelectorMeta: {
    ...typography.body2_3,
    color: colors.gray4,
  },
  bookshelfBookSearchInputRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    borderWidth: 1,
    borderColor: colors.gray2,
    borderRadius: radius.md,
    backgroundColor: colors.white,
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.sm,
  },
  bookshelfBookSearchInput: {
    flex: 1,
    ...typography.body1_3,
    color: colors.gray6,
    paddingVertical: 0,
  },
  bookshelfBookSearchGuide: {
    ...typography.body2_3,
    color: colors.gray4,
  },
  bookshelfBookSearchScreen: {
    flex: 1,
  },
  bookshelfBookSearchScroll: {
    flex: 1,
  },
  bookshelfBookSearchList: {
    gap: spacing.sm,
    paddingBottom: spacing.xl,
  },
  bookshelfBookSearchItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    borderWidth: 1,
    borderColor: colors.gray2,
    borderRadius: radius.md,
    backgroundColor: colors.white,
    padding: spacing.sm,
  },
  bookshelfBookSearchItemActive: {
    borderColor: colors.primary1,
    backgroundColor: colors.subbrown4,
  },
  bookshelfBookSearchCover: {
    width: 56,
    height: 80,
    borderRadius: radius.sm,
    backgroundColor: colors.gray1,
  },
  bookshelfBookSearchInfo: {
    flex: 1,
    gap: spacing.xs / 2,
  },
  bookshelfBookSearchTitle: {
    ...typography.body2_2,
    color: colors.gray6,
  },
  bookshelfBookSearchMeta: {
    ...typography.body2_3,
    color: colors.gray4,
  },
  bookshelfBookSearchEmpty: {
    ...typography.body1_3,
    color: colors.gray4,
    textAlign: 'center',
    paddingVertical: spacing.xl,
  },
  bookshelfCreateSelector: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  bookshelfCreateSelectorDisabled: {
    backgroundColor: colors.gray1,
  },
  bookshelfCreateSelectorText: {
    ...typography.body1_3,
    color: colors.gray6,
  },
  bookshelfCreateSelectorPlaceholder: {
    color: colors.gray4,
  },
  bookshelfDatePickerButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  bookshelfDatePickerValueRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    flex: 1,
  },
  bookshelfDatePickerIconWrap: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: colors.subbrown4,
    alignItems: 'center',
    justifyContent: 'center',
  },
  bookshelfDatePickerText: {
    ...typography.body1_3,
    color: colors.gray6,
  },
  bookshelfDatePickerPlaceholder: {
    color: colors.gray4,
  },
  bookshelfCalendarCard: {
    width: '100%',
    maxWidth: 360,
    borderRadius: radius.lg,
    backgroundColor: colors.white,
    padding: spacing.md,
    gap: spacing.md,
  },
  bookshelfCalendarMonthRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: spacing.sm,
  },
  bookshelfCalendarMonthButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: colors.subbrown4,
    alignItems: 'center',
    justifyContent: 'center',
  },
  bookshelfCalendarMonthText: {
    ...typography.subhead3,
    color: colors.gray6,
  },
  bookshelfCalendarWeekRow: {
    flexDirection: 'row',
  },
  bookshelfCalendarWeekLabel: {
    flex: 1,
    textAlign: 'center',
    ...typography.body2_3,
    color: colors.gray4,
  },
  bookshelfCalendarGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    rowGap: spacing.xs,
  },
  bookshelfCalendarDay: {
    width: '14.2857%',
    aspectRatio: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  bookshelfCalendarDayInner: {
    width: 38,
    height: 38,
    borderRadius: 19,
    alignItems: 'center',
    justifyContent: 'center',
  },
  bookshelfCalendarDayCurrentMonth: {
    backgroundColor: colors.white,
  },
  bookshelfCalendarDayOutside: {
    opacity: 0.35,
  },
  bookshelfCalendarDayToday: {
    borderWidth: 1,
    borderColor: colors.primary1,
    backgroundColor: colors.subbrown4,
  },
  bookshelfCalendarDaySelected: {
    backgroundColor: colors.primary1,
  },
  bookshelfCalendarDayLabel: {
    ...typography.body2_2,
    color: colors.gray6,
  },
  bookshelfCalendarDayLabelOutside: {
    color: colors.gray3,
  },
  bookshelfCalendarDayLabelSelected: {
    color: colors.white,
  },
  bookshelfCalendarFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: spacing.sm,
    paddingTop: spacing.xs,
  },
  bookshelfCalendarFooterHint: {
    ...typography.body2_3,
    color: colors.gray4,
    flex: 1,
  },
  bookshelfCalendarTodayButton: {
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.primary1,
    backgroundColor: colors.subbrown4,
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
  },
  bookshelfCalendarTodayButtonText: {
    ...typography.body2_2,
    color: colors.primary1,
  },
  voteVotersModalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.28)',
    alignItems: 'flex-end',
    justifyContent: 'center',
    paddingHorizontal: spacing.md,
  },
  voteVotersModalCard: {
    width: 180,
    maxHeight: 320,
    backgroundColor: colors.white,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.gray2,
    padding: spacing.sm,
    gap: spacing.sm,
  },
  voteVotersModalTitle: {
    ...typography.body2_2,
    color: colors.gray6,
  },
  voteVotersList: {
    gap: spacing.xs,
  },
  voteVotersRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    paddingVertical: spacing.xs / 2,
    borderBottomWidth: 1,
    borderBottomColor: colors.gray1,
  },
  voteVotersAvatar: {
    width: 22,
    height: 22,
    borderRadius: 11,
    backgroundColor: colors.gray1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  voteVotersName: {
    ...typography.body2_3,
    color: colors.gray6,
  },
  voteVotersEmptyText: {
    ...typography.body2_3,
    color: colors.gray4,
    textAlign: 'center',
    paddingVertical: spacing.sm,
  },
  contactModalOverlay: {
    flex: 1,
    backgroundColor: colors.overlay30,
    alignItems: 'center',
    justifyContent: 'center',
    padding: spacing.lg,
  },
  contactModalCard: {
    width: '100%',
    maxWidth: 420,
    minHeight: 220,
    borderRadius: radius.lg,
    backgroundColor: colors.white,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.lg,
    gap: spacing.lg,
  },
  contactModalHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    gap: spacing.md,
  },
  contactModalTitle: {
    ...typography.subhead1,
    color: colors.gray6,
    flex: 1,
  },
  contactModalLinkList: {
    gap: spacing.md,
  },
  contactModalLinkRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    paddingVertical: spacing.xs,
  },
  contactModalLinkTextWrap: {
    flex: 1,
    gap: spacing.xs / 2,
  },
  contactModalLinkLabel: {
    ...typography.subhead4_1,
    color: colors.gray6,
  },
  contactModalLinkUrl: {
    ...typography.body2_3,
    color: colors.gray4,
  },
  contactModalEmptyWrap: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 96,
  },
  contactModalEmptyText: {
    ...typography.body1_3,
    color: colors.gray5,
    textAlign: 'center',
  },
  bookshelfSection: {
    gap: spacing.md,
  },
  bookshelfSessionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    paddingHorizontal: spacing.xs / 2,
  },
  bookshelfSessionChip: {
    borderWidth: 1,
    borderColor: colors.gray2,
    borderRadius: radius.lg,
    backgroundColor: colors.white,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
  },
  bookshelfSessionChipActive: {
    borderColor: colors.primary1,
    backgroundColor: colors.subbrown4,
  },
  bookshelfSessionText: {
    ...typography.body2_2,
    color: colors.gray5,
  },
  bookshelfSessionTextActive: {
    color: colors.primary1,
  },
  bookshelfGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
  },
  bookshelfCard: {
    width: '48%',
    borderWidth: 1,
    borderColor: colors.subbrown4,
    borderRadius: radius.md,
    backgroundColor: colors.white,
    padding: spacing.sm,
    gap: spacing.xs,
  },
  bookshelfCover: {
    width: '100%',
    aspectRatio: 0.72,
    borderRadius: radius.sm,
    backgroundColor: colors.gray1,
  },
  bookshelfTitle: {
    ...typography.body1_2,
    color: colors.gray6,
  },
  bookshelfAuthor: {
    ...typography.body2_3,
    color: colors.gray5,
  },
  bookshelfBadgeRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.xs / 2,
  },
  bookshelfSessionBadge: {
    borderRadius: radius.sm,
    backgroundColor: colors.subbrown1,
    paddingHorizontal: spacing.xs + 2,
    paddingVertical: 2,
  },
  bookshelfCategoryBadge: {
    borderRadius: radius.sm,
    paddingHorizontal: spacing.xs + 2,
    paddingVertical: 2,
  },
  bookshelfCategoryPink: {
    backgroundColor: '#EAA8A0',
  },
  bookshelfCategoryBlue: {
    backgroundColor: colors.secondary3,
  },
  bookshelfCategoryPurple: {
    backgroundColor: colors.secondary4,
  },
  bookshelfCategoryOrange: {
    backgroundColor: colors.secondary2,
  },
  bookshelfCategoryTeal: {
    backgroundColor: '#79CFC1',
  },
  bookshelfBadgeText: {
    ...typography.body2_3,
    color: colors.white,
  },
  bookshelfLinkRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 2,
  },
  bookshelfLinkLabel: {
    ...typography.body2_3,
    color: colors.gray6,
  },
  bookshelfRatingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 2,
    paddingTop: spacing.xs / 2,
  },
  bookshelfRatingText: {
    ...typography.body2_3,
    color: colors.gray5,
    marginLeft: spacing.xs / 2,
  },
  bookshelfDetailSection: {
    gap: spacing.md,
  },
  bookshelfDetailBookCard: {
    flexDirection: 'row',
    gap: spacing.md,
  },
  bookshelfDetailBookCover: {
    width: 128,
    height: 192,
    borderRadius: radius.md,
    backgroundColor: colors.gray1,
  },
  bookshelfDetailBookInfo: {
    flex: 1,
    gap: spacing.xs,
  },
  bookshelfDetailBookTitle: {
    ...typography.subhead2,
    color: colors.gray6,
  },
  bookshelfDetailBookAuthor: {
    ...typography.body1_3,
    color: colors.gray5,
  },
  bookshelfDetailBookDescription: {
    ...typography.body2_3,
    color: colors.gray5,
    lineHeight: 21,
  },
  bookshelfDetailTabRow: {
    flexDirection: 'row',
    borderBottomWidth: 1,
    borderBottomColor: colors.gray2,
  },
  bookshelfDetailTabButton: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: spacing.sm,
    borderBottomWidth: 2,
    borderBottomColor: 'transparent',
  },
  bookshelfDetailTabButtonActive: {
    borderBottomColor: colors.primary1,
  },
  bookshelfDetailTabLabel: {
    ...typography.body1_3,
    color: colors.gray4,
  },
  bookshelfDetailTabLabelActive: {
    color: colors.primary1,
  },
  bookshelfPanel: {
    gap: spacing.sm,
  },
  bookshelfPanelHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  bookshelfPanelTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
  },
  bookshelfPanelTitle: {
    ...typography.subhead3,
    color: colors.gray6,
  },
  bookshelfPanelAddButton: {
    width: 32,
    height: 32,
    borderWidth: 1,
    borderColor: colors.subbrown3,
    borderRadius: 16,
    backgroundColor: colors.subbrown4,
    alignItems: 'center',
    justifyContent: 'center',
  },
  bookshelfComposerKeyboard: {
    flex: 1,
  },
  bookshelfComposerOverlay: {
    flex: 1,
    backgroundColor: colors.overlay30,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: spacing.md,
  },
  bookshelfComposerCard: {
    width: '100%',
    maxWidth: 420,
    borderRadius: radius.lg,
    backgroundColor: colors.white,
    padding: spacing.md,
    gap: spacing.md,
  },
  bookshelfComposerHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: spacing.sm,
  },
  bookshelfComposerTitle: {
    ...typography.subhead2,
    color: colors.gray6,
  },
  bookshelfComposerLabel: {
    ...typography.body1_2,
    color: colors.gray6,
  },
  bookshelfComposerInput: {
    height: 140,
  },
  bookshelfComposerCounter: {
    ...typography.body2_3,
    color: colors.gray4,
    textAlign: 'right',
  },
  bookshelfComposerRatingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs / 2,
  },
  bookshelfComposerRatingStarShell: {
    position: 'relative',
    width: 28,
    height: 28,
    alignItems: 'center',
    justifyContent: 'center',
  },
  bookshelfComposerRatingButton: {
    position: 'absolute',
    top: 0,
    bottom: 0,
    width: '50%',
  },
  bookshelfComposerRatingButtonLeft: {
    left: 0,
  },
  bookshelfComposerRatingButtonRight: {
    right: 0,
  },
  bookshelfComposerRatingValue: {
    ...typography.body2_2,
    color: colors.gray5,
    marginLeft: spacing.xs,
  },
  bookshelfComposerFooter: {
    flexDirection: 'row',
    gap: spacing.sm,
  },
  bookshelfPostList: {
    gap: spacing.sm,
  },
  bookshelfPostCard: {
    borderWidth: 1,
    borderColor: colors.gray2,
    borderRadius: radius.md,
    backgroundColor: colors.white,
    padding: spacing.sm,
    gap: spacing.xs,
  },
  bookshelfPostTop: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  bookshelfPostAuthorRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
  },
  bookshelfPostMenuButton: {
    width: 28,
    height: 28,
    alignItems: 'center',
    justifyContent: 'center',
  },
  bookshelfPostAvatar: {
    width: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: colors.gray1,
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  bookshelfPostAvatarImage: {
    width: '100%',
    height: '100%',
  },
  bookshelfPostAuthor: {
    ...typography.body1_2,
    color: colors.gray6,
  },
  bookshelfPostRatingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 2,
  },
  bookshelfPostContent: {
    ...typography.body1_3,
    color: colors.gray5,
    lineHeight: 22,
  },
  bookshelfRegularSummaryCard: {
    borderWidth: 1,
    borderColor: colors.gray2,
    borderRadius: radius.md,
    backgroundColor: colors.subbrown4,
    padding: spacing.md,
    gap: spacing.xs,
  },
  bookshelfRegularSummaryTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
  },
  bookshelfRegularSummaryTitle: {
    ...typography.subhead3,
    color: colors.gray6,
  },
  bookshelfRegularSummaryMetaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
  },
  bookshelfRegularSummaryMetaText: {
    ...typography.body1_3,
    color: colors.gray5,
  },
  bookshelfGroupChipRow: {
    flexDirection: 'row',
    gap: spacing.xs,
    paddingVertical: spacing.xs / 2,
  },
  bookshelfGroupChip: {
    minWidth: 68,
    borderWidth: 1,
    borderColor: colors.gray2,
    borderRadius: radius.sm,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
    alignItems: 'center',
    backgroundColor: colors.white,
  },
  bookshelfGroupChipActive: {
    borderColor: colors.primary1,
    backgroundColor: colors.subbrown4,
  },
  bookshelfGroupChipText: {
    ...typography.body2_2,
    color: colors.gray6,
  },
  bookshelfGroupChipTextActive: {
    color: colors.primary1,
  },
  bookshelfGroupSection: {
    gap: spacing.sm,
  },
  bookshelfRegularGroupPreviewCard: {
    borderWidth: 1,
    borderColor: colors.gray2,
    borderRadius: radius.md,
    backgroundColor: colors.white,
    padding: spacing.md,
    gap: spacing.sm,
  },
  bookshelfRegularGroupPreviewHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  bookshelfRegularGroupPreviewLabel: {
    ...typography.body2_2,
    color: colors.gray4,
  },
  bookshelfRegularGroupMemberList: {
    gap: spacing.xs,
  },
  bookshelfRegularGroupMemberRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
  },
  bookshelfRegularGroupMemberName: {
    ...typography.body1_3,
    color: colors.gray6,
  },
  bookshelfRegularGroupHint: {
    ...typography.body2_3,
    color: colors.gray4,
  },
  bookshelfGroupHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  bookshelfGroupHeaderLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
  },
  bookshelfGroupTitle: {
    ...typography.subhead3,
    color: colors.gray6,
  },
  bookshelfGroupMemberWrap: {
    position: 'relative',
    zIndex: 2,
  },
  bookshelfGroupMemberButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs / 2,
    paddingVertical: spacing.xs / 2,
  },
  bookshelfGroupMemberCount: {
    ...typography.body1_3,
    color: colors.gray4,
  },
  bookshelfGroupMemberDropdown: {
    position: 'absolute',
    top: '100%',
    left: 0,
    minWidth: 164,
    borderWidth: 1,
    borderColor: colors.gray2,
    borderRadius: radius.md,
    backgroundColor: colors.white,
    padding: spacing.sm,
    gap: spacing.xs,
    shadowColor: '#000000',
    shadowOpacity: 0.08,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 4 },
    elevation: 6,
  },
  bookshelfGroupMemberDropdownTitle: {
    ...typography.body2_2,
    color: colors.gray5,
  },
  bookshelfGroupActionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
  },
  bookshelfGroupActionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs / 2,
    paddingVertical: spacing.xs / 2,
    paddingHorizontal: spacing.xs,
  },
  bookshelfGroupSortText: {
    ...typography.body1_3,
    color: colors.gray4,
  },
  bookshelfGroupPostList: {
    gap: spacing.sm,
  },
  bookshelfGroupPostCard: {
    borderWidth: 1,
    borderColor: colors.gray2,
    borderRadius: radius.md,
    backgroundColor: colors.white,
    padding: spacing.md,
    gap: spacing.xs,
  },
  bookshelfGroupPostCardCompleted: {
    backgroundColor: '#E7F2E6',
    borderColor: '#D2E7CF',
  },
  regularChatModalOverlay: {
    flex: 1,
    backgroundColor: colors.overlay30,
    alignItems: 'center',
    justifyContent: 'center',
    padding: spacing.lg,
  },
  regularChatPickerCard: {
    width: '100%',
    maxWidth: 360,
    minHeight: 360,
    borderRadius: radius.md,
    backgroundColor: colors.white,
    padding: spacing.md,
    gap: spacing.sm,
  },
  regularChatRoomCard: {
    width: '100%',
    maxWidth: 360,
    height: '78%',
    borderRadius: radius.md,
    backgroundColor: colors.white,
    padding: spacing.md,
    gap: spacing.sm,
  },
  regularChatHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingBottom: spacing.xs,
    borderBottomWidth: 1,
    borderBottomColor: colors.gray2,
  },
  regularChatHeaderLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
  },
  regularChatTitle: {
    ...typography.subhead3,
    color: colors.gray6,
  },
  regularChatGroupList: {
    gap: spacing.sm,
  },
  regularChatGroupItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderRadius: radius.sm,
    backgroundColor: colors.subbrown4,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
  },
  regularChatGroupItemText: {
    ...typography.body1_3,
    color: colors.gray6,
  },
  regularChatMessages: {
    flex: 1,
  },
  regularChatMessagesContent: {
    gap: spacing.sm,
    paddingVertical: spacing.xs,
  },
  regularChatMessageRow: {
    alignSelf: 'flex-start',
    gap: spacing.xs / 2,
    maxWidth: '88%',
  },
  regularChatMessageRowMine: {
    alignSelf: 'flex-end',
    alignItems: 'flex-end',
  },
  regularChatMessageMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
  },
  regularChatAuthor: {
    ...typography.body2_3,
    color: colors.gray5,
  },
  regularChatBubble: {
    borderRadius: radius.md,
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.sm,
  },
  regularChatBubbleOther: {
    borderWidth: 1,
    borderColor: colors.gray2,
    backgroundColor: colors.white,
  },
  regularChatBubbleMine: {
    backgroundColor: colors.subbrown4,
  },
  regularChatBubbleText: {
    ...typography.body2_3,
    color: colors.gray6,
    lineHeight: 20,
  },
  regularChatTime: {
    ...typography.body2_3,
    color: colors.gray4,
  },
  regularChatInputRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    paddingTop: spacing.xs,
    borderTopWidth: 1,
    borderTopColor: colors.gray2,
  },
  regularChatInput: {
    flex: 1,
    borderWidth: 1,
    borderColor: colors.gray2,
    borderRadius: radius.sm,
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.sm,
    ...typography.body2_3,
    color: colors.gray6,
    backgroundColor: colors.white,
  },
  regularChatSendButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.subbrown4,
  },
  regularChatSendButtonDisabled: {
    backgroundColor: colors.gray1,
  },
});

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

function formatRegularGroupLabel(teamNumber: number) {
  return `${String.fromCharCode(64 + teamNumber)}조`;
}

function getTeamManageTargetKey(teamNumber: number | null) {
  return teamNumber === null ? 'unassigned' : `team-${teamNumber}`;
}

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

function toGroupTargets(topic: string): string[] {
  const stripped = topic.replace(/^모임 대상 · /, '').trim();
  if (!stripped || stripped === '정보 없음') return [];
  return stripped
    .split(',')
    .map((item) => item.trim())
    .filter((item) => item.length > 0);
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
    coverImage: book.imgUrl ?? clubDefaultImageUri,
    rating: normalizeAverageRating(book.averageRate),
  };
}

function mapBookshelfDetailToItem(detail: ClubBookshelfDetail): BookshelfItem {
  return {
    id: `bookshelf-${detail.meetingId}`,
    remoteMeetingId: detail.meetingId,
    bookId: detail.book.bookId,
    generation: detail.generation,
    session: formatGenerationLabel(detail.generation),
    title: detail.book.title ?? detail.title ?? '책 제목',
    author: detail.book.author ?? '작가 미상',
    category: detail.tag?.trim() || '기본 태그',
    coverImage: detail.book.imgUrl ?? clubDefaultImageUri,
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
          coverImage: detail.meetingDetail.bookInfo.imgUrl ?? clubDefaultImageUri,
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
    bookshelf: bookshelfAttachment,
    poll: detail.voteDetail
      ? {
          startsAt: formatDotDateTime(detail.voteDetail.startTime),
          endsAt: formatDotDateTime(detail.voteDetail.deadline),
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

  const groups: RegularMeetingGroupItem[] = meeting.teams.map((team) => {
    const teamMembers = meeting.members.filter((member) => member.teamId === team.teamId);
    const teamTopics = topicsByTeamId[team.teamId]?.topics ?? [];
    const teamChats = chatsByTeamId[team.teamId]?.chats ?? [];
    const label = toTeamLabel(team.teamNumber);
    const groupId = `${book.id}-regular-group-${team.teamId}`;
    const members = teamMembers.map((member) => ({
      id: `${groupId}-member-${member.clubMemberId}`,
      nickname: member.nickname,
      profileImageUrl: member.profileImageUrl,
    }));

    return {
      id: groupId,
      teamId: team.teamId,
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

function GroupHomeView({ group, onBack }: { group: Group; onBack: () => void }) {
  const navigation = useNavigation<any>();
  const insets = useSafeAreaInsets();
  const { requireAuth, isLoggedIn } = useAuthGate();
  const isManagedClub = typeof group.clubId === 'number';
  const [managedGroup, setManagedGroup] = useState<Group>(group);
  const [canManageClub, setCanManageClub] = useState(false);
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
  const [managementMenuVisible, setManagementMenuVisible] = useState(false);
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
          fetchClubBookshelves(group.clubId),
          fetchClubNotices(group.clubId, 1),
          fetchClubLatestNotice(group.clubId, { suppressErrorToast: true }),
          fetchClubMyMembership(group.clubId, { suppressErrorToast: true }),
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
        setSelectedNoticeId(null);
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
        if (error instanceof ApiError) return;
        if (!options?.suppressErrorToast) {
          showToast('모임 데이터를 불러오지 못했습니다.');
        }
      }
    },
    [group, group.clubId, isManagedClub],
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
        if (error instanceof ApiError) return;
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

      for (let page = 0; page < 20; page += 1) {
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

      for (let page = 0; page < 20; page += 1) {
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

      for (let page = 0; page < 20; page += 1) {
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
        const [topicPage, reviews, detail] = await Promise.all([
          fetchClubBookshelfTopics(clubId, meetingId, undefined, {
            suppressErrorToast: options?.suppressErrorToast,
          }),
          fetchAllBookshelfReviewsForMeeting(clubId, meetingId, {
            suppressErrorToast: options?.suppressErrorToast,
          }),
          fetchClubBookshelfDetail(clubId, meetingId, {
            suppressErrorToast: options?.suppressErrorToast,
          }),
        ]);

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
            prev.map((item) =>
              item.remoteMeetingId === meetingId
                ? {
                    ...item,
                    generation: detail.generation ?? item.generation,
                    session: formatGenerationLabel(detail.generation ?? item.generation),
                    category: detail.tag?.trim() || item.category,
                    regularMeetingName: detail.title ?? item.regularMeetingName,
                    meetingLocation: detail.location ?? item.meetingLocation,
                    meetingDate: formatDotDate(detail.meetingTime) || item.meetingDate,
                  }
                : item,
            ),
          );
        }

        const regularMeetingId = detail?.meetingId ?? meetingId;
        let meeting: ClubMeetingInfo | null = null;
        let meetingFetchSucceeded = false;

        try {
          meeting = await fetchClubMeeting(clubId, regularMeetingId, {
            suppressErrorToast: options?.suppressErrorToast,
          });
          meetingFetchSucceeded = true;
        } catch (error) {
          if (!(error instanceof ApiError) && !options?.suppressErrorToast) {
            showToast('정기모임 정보를 불러오지 못했습니다.');
          }
        }

        if (meeting) {
          const [topicSettled, chatSettled] = await Promise.all([
            Promise.allSettled(
              meeting.teams.map(async (team) => [
                team.teamId,
                await fetchAllMeetingTeamTopics(clubId, regularMeetingId, team.teamId, {
                  suppressErrorToast: options?.suppressErrorToast,
                }),
              ] as const),
            ),
            Promise.allSettled(
              meeting.teams.map(async (team) => [
                team.teamId,
                await fetchAllMeetingTeamChats(clubId, regularMeetingId, team.teamId, {
                  suppressErrorToast: options?.suppressErrorToast,
                }),
              ] as const),
            ),
          ]);

          if (isStale()) return;
          const topicEntries: Array<[number, ClubMeetingTeamTopics]> = meeting.teams.map(
            (team, index) => {
              const settled = topicSettled[index];
              if (settled?.status === 'fulfilled') {
                return settled.value as [number, ClubMeetingTeamTopics];
              }

              return [
                team.teamId,
                {
                  existingTeams: meeting.teams,
                  requestedTeam: team,
                  topics: [],
                  hasNext: false,
                  nextCursor: null,
                },
              ];
            },
          );

          const chatEntries: Array<[number, ClubMeetingChatHistory]> = meeting.teams.map(
            (team, index) => {
              const settled = chatSettled[index];
              if (settled?.status === 'fulfilled') {
                return settled.value as [number, ClubMeetingChatHistory];
              }

              return [
                team.teamId,
                {
                  chats: [],
                  hasNext: false,
                  nextCursor: null,
                },
              ];
            },
          );

          const topicsByTeamId = Object.fromEntries(topicEntries);
          const chatsByTeamId = Object.fromEntries(chatEntries);
          const regularInfo = mapMeetingToRegularMeetingInfo(
            book,
            meeting,
            topicsByTeamId,
            chatsByTeamId,
            currentMemberNickname,
          );
          if (regularInfo) {
            setRegularMeetingInfoByMeetingId((prev) => ({
              ...prev,
              [meetingId]: regularInfo,
            }));
          }
        } else if (meetingFetchSucceeded) {
          setRegularMeetingInfoByMeetingId((prev) => {
            const next = { ...prev };
            delete next[meetingId];
            return next;
          });
        }
      } catch (error) {
        if (isStale()) return;
        if (error instanceof ApiError) return;
        if (!options?.suppressErrorToast) {
          showToast('책장 상세를 불러오지 못했습니다.');
        }
      }
    },
    [
      fetchAllBookshelfReviewsForMeeting,
      fetchAllMeetingTeamChats,
      fetchAllMeetingTeamTopics,
      currentMemberNickname,
      group.clubId,
    ],
  );

  useEffect(() => {
    if (activeTab !== 'bookshelf' || bookshelfViewMode === 'GRID') return;
    if (!selectedBookshelfBook || typeof selectedBookshelfBook.remoteMeetingId !== 'number') return;
    const selectedBook = selectedBookshelfBook;
    let cancelled = false;

    const loadBookshelfDetailData = async () => {
      await reloadBookshelfMeetingDetail(selectedBook, {
        suppressErrorToast: true,
      });
      if (cancelled) return;
    };

    void loadBookshelfDetailData();

    return () => {
      cancelled = true;
    };
  }, [activeTab, bookshelfViewMode, reloadBookshelfMeetingDetail, selectedBookshelfBook]);

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

  const selectedNotice = useMemo(
    () => noticeItems.find((item) => item.id === selectedNoticeId) ?? null,
    [noticeItems, selectedNoticeId],
  );

  const currentNoticeComments = useMemo(() => {
    if (!selectedNotice) return [];
    return noticeCommentsById[selectedNotice.id] ?? [];
  }, [noticeCommentsById, selectedNotice]);

  const currentNoticeCommentPageState = useMemo<CursorPageState | null>(() => {
    if (!selectedNotice) return null;
    return noticeCommentPageStateByNoticeId[selectedNotice.id] ?? null;
  }, [noticeCommentPageStateByNoticeId, selectedNotice]);

  const currentNoticePollOptions = useMemo(() => {
    if (!selectedNotice?.poll) return [];
    return noticePollOptionsById[selectedNotice.id] ?? selectedNotice.poll.options;
  }, [noticePollOptionsById, selectedNotice]);

  const currentSelectedVoteOptionIds = useMemo(() => {
    if (!selectedNotice) return [];
    return selectedVoteOptionIdsByNotice[selectedNotice.id] ?? [];
  }, [selectedNotice, selectedVoteOptionIdsByNotice]);

  const hasSubmittedVoteInNotice = useMemo(() => {
    if (!selectedNotice) return false;
    return (submittedVoteOptionIdsByNotice[selectedNotice.id] ?? []).length > 0;
  }, [selectedNotice, submittedVoteOptionIdsByNotice]);
  const voteEditEnabled = useMemo(() => {
    if (!selectedNotice) return false;
    return Boolean(voteEditEnabledByNotice[selectedNotice.id]);
  }, [selectedNotice, voteEditEnabledByNotice]);

  const totalNoticePages = Math.max(1, Math.ceil(noticeItems.length / noticePageSize));
  const currentNoticePage = Math.min(noticePage, totalNoticePages);

  const visibleNotices = useMemo(() => {
    const start = (currentNoticePage - 1) * noticePageSize;
    const end = start + noticePageSize;
    return noticeItems.slice(start, end);
  }, [currentNoticePage, noticeItems]);

  const visiblePageNumbers = useMemo(() => {
    const pageWindow = 5;
    const half = Math.floor(pageWindow / 2);
    let start = Math.max(1, currentNoticePage - half);
    let end = Math.min(totalNoticePages, start + pageWindow - 1);
    start = Math.max(1, end - pageWindow + 1);
    return Array.from({ length: end - start + 1 }).map((_, idx) => start + idx);
  }, [currentNoticePage, totalNoticePages]);

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
        if (!(error instanceof ApiError)) {
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
      showToast('댓글 내용을 입력해주세요.');
      return;
    }
    const clubId = group.clubId;
    const noticeId = selectedNotice.remoteId;
    if (!isManagedClub || typeof clubId !== 'number' || typeof noticeId !== 'number') {
      showToast('공지 댓글 API를 사용할 수 없습니다.');
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
    (comment: NoticeComment) => {
      if (!selectedNotice) return;

      if (comment.mine) {
        Alert.alert('댓글 메뉴', '원하는 작업을 선택해주세요.', [
          { text: '취소', style: 'cancel' },
          {
            text: '수정',
            onPress: () => {
              setNoticeCommentInput(comment.content);
              setEditingNoticeCommentId(comment.id);
            },
          },
          {
            text: '삭제',
            style: 'destructive',
            onPress: () => {
              const clubId = group.clubId;
              const noticeId = selectedNotice.remoteId;
              const commentId = comment.remoteId;

              if (
                !isManagedClub ||
                typeof clubId !== 'number' ||
                typeof noticeId !== 'number' ||
                typeof commentId !== 'number'
              ) {
                showToast('공지 댓글 API를 사용할 수 없습니다.');
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
          },
        ]);
        return;
      }

      Alert.alert('댓글 메뉴', '원하는 작업을 선택해주세요.', [
        { text: '취소', style: 'cancel' },
        {
          text: '신고하기',
          onPress: () =>
            setReportModal({
              nickname: comment.author,
              profileImageUrl: comment.authorProfileImageUrl,
              initialType: 'CLUB_MEETING',
            }),
        },
      ]);
    },
    [
      editingNoticeCommentId,
      group.clubId,
      isManagedClub,
      refreshNoticeComments,
      selectedNotice,
    ],
  );

  const handleCloseReportModal = useCallback(() => {
    if (submittingReport) return;
    setReportModal(null);
  }, [submittingReport]);

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
      showToast('공지 신고 기능은 준비 중입니다.');
    });
  }, [requireAuth]);

  const handleToggleVoteOption = useCallback(
    (optionId: string) => {
      if (!selectedNotice?.poll || selectedNotice.poll.closed) return;
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
    if (selectedNotice.poll.closed) {
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
      showToast('투표 항목을 선택해주세요.');
      return;
    }
    const clubId = group.clubId;
    const noticeId = selectedNotice.remoteId;
    if (!isManagedClub || typeof clubId !== 'number' || typeof noticeId !== 'number') {
      showToast('공지 투표 API를 사용할 수 없습니다.');
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
        bookshelfItems.find((item) => item.remoteMeetingId === meetingId) ?? null;

      if (!targetBook) {
        const detail = await fetchClubBookshelfDetail(clubId, meetingId);
        if (detail) {
          targetBook = mapBookshelfDetailToItem(detail);
          setBookshelfItems((prev) =>
            prev.some((item) => item.remoteMeetingId === meetingId)
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
      showToast(bookshelfComposerType === 'TOPIC' ? '발제 내용을 입력해주세요.' : '한줄평을 입력해주세요.');
      return;
    }

    if (bookshelfComposerType === 'REVIEW' && bookshelfComposerRating < 0.5) {
      showToast('평점을 선택해주세요.');
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
        if (!(error instanceof ApiError)) {
          showToast(
            bookshelfComposerType === 'TOPIC'
              ? editingBookshelfPost
                ? '발제 수정에 실패했습니다.'
                : '발제 등록에 실패했습니다.'
              : editingBookshelfPost
                ? '한줄평 수정에 실패했습니다.'
                : '한줄평 등록에 실패했습니다.',
          );
        }
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
    (post: BookshelfPostItem) => {
      const clubId = group.clubId;
      const meetingId = selectedBookshelfBook?.remoteMeetingId;
      if (
        !post.isAuthor ||
        typeof clubId !== 'number' ||
        typeof meetingId !== 'number' ||
        typeof post.remoteId !== 'number'
      ) {
        return;
      }

      const postLabel = post.type === 'TOPIC' ? '발제' : '한줄평';

      Alert.alert(`${postLabel} 메뉴`, '원하는 작업을 선택해주세요.', [
        { text: '취소', style: 'cancel' },
        {
          text: '수정',
          onPress: () => {
            handleOpenBookshelfComposer(post.type, post);
          },
        },
        {
          text: '삭제',
          style: 'destructive',
          onPress: () => {
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
                      if (!(error instanceof ApiError)) {
                        showToast(`${postLabel} 삭제에 실패했습니다.`);
                      }
                    } finally {
                      setSubmittingBookshelfComposer(false);
                    }
                  };

                  void remove();
                },
              },
            ]);
          },
        },
      ]);
    },
    [
      editingBookshelfPost?.id,
      group.clubId,
      handleOpenBookshelfComposer,
      refreshBookshelfPostsByType,
      selectedBookshelfBook?.remoteMeetingId,
    ],
  );

  const closeTeamManage = useCallback(() => {
    if (teamManageSaving) return;
    setTeamManageVisible(false);
    setTeamManageSelectedMemberId(null);
    setDraggingTeamMemberId(null);
    setDraggingTeamMemberPosition(null);
    setTeamManageDropLayouts({});
    dragStartRef.current = null;
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
    const meetingId = selectedBookshelfBook?.remoteMeetingId;

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
        const meetingMembers =
          meetingMembersResponse.members.length > 0
            ? meetingMembersResponse.members
            : meeting.members;

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
        if (!(error instanceof ApiError)) {
          showToast('조 편성 화면을 불러오지 못했습니다.');
        }
        setTeamManageVisible(false);
      } finally {
        setTeamManageLoading(false);
        setTimeout(refreshTeamManageDropLayouts, 0);
      }
    };

    void open();
  }, [canManageClub, group.clubId, refreshTeamManageDropLayouts, selectedBookshelfBook?.remoteMeetingId]);

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

      dragStartRef.current = null;
      setDraggingTeamMemberId(null);
      setDraggingTeamMemberPosition(null);
    },
    [findTeamManageDropTarget, moveTeamManageMemberToTarget],
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

  const handleTeamManageMemberMove = useCallback((event: GestureResponderEvent) => {
    const dragState = dragStartRef.current;
    if (!dragState) return;

    const dx = Math.abs(event.nativeEvent.pageX - dragState.pageX);
    const dy = Math.abs(event.nativeEvent.pageY - dragState.pageY);
    if (dx > 6 || dy > 6) {
      dragState.moved = true;
    }

    setDraggingTeamMemberPosition({
      x: event.nativeEvent.pageX,
      y: event.nativeEvent.pageY,
    });
  }, []);

  const handleTeamManageMemberRelease = useCallback(
    (event: GestureResponderEvent) => {
      finishTeamManageDrag(event.nativeEvent.pageX, event.nativeEvent.pageY);
    },
    [finishTeamManageDrag],
  );

  const handleSaveTeamManage = useCallback(() => {
    const clubId = group.clubId;
    const meetingId = selectedBookshelfBook?.remoteMeetingId;
    const selectedBook = selectedBookshelfBook;

    if (
      typeof clubId !== 'number' ||
      typeof meetingId !== 'number' ||
      !selectedBook
    ) {
      showToast('정기모임 정보를 찾을 수 없습니다.');
      return;
    }

    if (teamManageUnassignedMembers.length > 0) {
      showToast('모든 참여자를 조에 배정해주세요.');
      return;
    }

    if (teamManageTeams.some((team) => team.memberIds.length === 0)) {
      showToast('빈 조를 삭제하거나 참여자를 배정해주세요.');
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
        if (!(error instanceof ApiError)) {
          showToast('조 편성 저장에 실패했습니다.');
        }
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
    teamManageTeams,
    teamManageUnassignedMembers.length,
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
      const meetingId = selectedBookshelfBook?.remoteMeetingId;
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
      selectedBookshelfBook?.remoteMeetingId,
    ],
  );

  const handleOpenRegularChatPicker = useCallback(() => {
    setRegularChatPickerVisible(true);
    setActiveRegularChatGroupId(null);
    setRegularChatInput('');
  }, []);

  const handleSelectRegularChatGroup = useCallback((groupId: string) => {
    const groupItem = regularMeetingInfo?.groups.find((item) => item.id === groupId);
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

  const handleSubmitRegularChat = useCallback(() => {
    const content = regularChatInput.trim();
    if (!activeRegularChatGroup || !content || submittingRegularChat) return;

    const clubId = group.clubId;
    const meetingId = selectedBookshelfBook?.remoteMeetingId;
    const teamId = activeRegularChatGroup.teamId;

    if (
      typeof clubId !== 'number' ||
      typeof meetingId !== 'number' ||
      typeof teamId !== 'number'
    ) {
      showToast('채팅 전송 대상을 찾을 수 없습니다.');
      return;
    }

    const submit = async () => {
      setSubmittingRegularChat(true);
      try {
        await sendClubMeetingTeamChatMessage(clubId, meetingId, teamId, content);
        setRegularChatInput('');
        await refreshRegularChatGroupMessages(activeRegularChatGroup, {
          suppressErrorToast: true,
        });
      } catch (error) {
        if (!(error instanceof ApiError)) {
          showToast('채팅 전송에 실패했습니다.');
        }
      } finally {
        setSubmittingRegularChat(false);
      }
    };
    void submit();
  }, [
    activeRegularChatGroup,
    group.clubId,
    refreshRegularChatGroupMessages,
    regularChatInput,
    selectedBookshelfBook?.remoteMeetingId,
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
        if (!(error instanceof ApiError)) {
          showToast('책장 수정 정보를 불러오지 못했습니다.');
        }
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
      showToast('모임 삭제 API를 사용할 수 없습니다.');
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
      showToast('가입 신청 처리 API를 사용할 수 없습니다.');
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
      showToast('회원 역할 수정 API를 사용할 수 없습니다.');
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
      showToast('회원 제외 API를 사용할 수 없습니다.');
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
      showToast('모임 이름, 소개글, 지역, 카테고리, 대상을 입력해주세요.');
      return;
    }
    if (!canManageClub) {
      showToast('모임 수정 API를 사용할 수 없습니다.');
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
      if (!(error instanceof ApiError)) {
        showToast('책 검색에 실패했습니다.');
      }
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
      showToast('책을 선택해주세요.');
      return;
    }
    const clubId = group.clubId;
    if (!canManageClub || typeof clubId !== 'number') {
      showToast(isEditMode ? '책장 수정 API를 사용할 수 없습니다.' : '책장 생성 API를 사용할 수 없습니다.');
      return;
    }

    const generation = parseGenerationNumber(bookshelfCreateDraft.session);
    if (!generation) {
      showToast('기수를 숫자로 입력해주세요.');
      return;
    }

    const regularMeetingName = bookshelfCreateDraft.regularMeetingName.trim();
    const meetingLocation = bookshelfCreateDraft.meetingLocation.trim();
    const meetingDate = bookshelfCreateDraft.meetingDate.trim();
    if (!regularMeetingName || !meetingLocation || !meetingDate) {
      showToast('정기모임 이름, 장소, 날짜를 입력해주세요.');
      return;
    }
    if (regularMeetingName.length > BOOKSHELF_MEETING_TITLE_MAX_LENGTH) {
      showToast(`정기모임 이름은 ${BOOKSHELF_MEETING_TITLE_MAX_LENGTH}자 이하로 입력해주세요.`);
      return;
    }
    if (meetingLocation.length > BOOKSHELF_MEETING_LOCATION_MAX_LENGTH) {
      showToast(`모임 장소는 ${BOOKSHELF_MEETING_LOCATION_MAX_LENGTH}자 이하로 입력해주세요.`);
      return;
    }

    const sourceBook = bookshelfCreateDraft.sourceBook;
    if (isEditMode && !sourceBook) {
      showToast('수정할 책장 정보를 다시 불러와주세요.');
      return;
    }
    const sourceBookIsbn = sourceBook?.isbn.trim() ?? '';
    if (!isEditMode && !ISBN13_REGEX.test(sourceBookIsbn)) {
      showToast('책 ISBN 형식을 확인해주세요.');
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
        const meetingTime = toApiDateTime(meetingDate);
        if (!meetingTime) {
          showToast('올바른 모임 날짜를 선택해주세요.');
          return;
        }

        if (isEditMode && typeof editingMeetingId === 'number') {
          await updateClubBookshelf(clubId, editingMeetingId, {
            title: regularMeetingName,
            location: meetingLocation,
            meetingTime,
            generation,
            tag: primaryCategory,
          });
        } else {
          await createClubBookshelf(clubId, {
            isbn: sourceBookIsbn,
            title: regularMeetingName,
            location: meetingLocation,
            meetingTime,
            generation,
            tag: primaryCategory,
          });
        }

        const bookshelfList = await fetchClubBookshelves(clubId);
        const nextItems = bookshelfList.items.map(mapApiBookshelfToItem);
        setBookshelfItems(nextItems);
        setActiveTab('bookshelf');

        if (isEditMode && typeof editingMeetingId === 'number') {
          const updatedItem =
            nextItems.find((item) => item.remoteMeetingId === editingMeetingId) ?? null;

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
        if (!(error instanceof ApiError)) {
          showToast(isEditMode ? '책장 수정에 실패했습니다.' : '책장 생성에 실패했습니다.');
        }
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
      showToast('책장 삭제 API를 사용할 수 없습니다.');
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
              const bookshelfList = await fetchClubBookshelves(clubId);
              const nextItems = bookshelfList.items.map(mapApiBookshelfToItem);
              setBookshelfItems(nextItems);
              setSelectedBookshelfBookId(nextItems[0]?.id ?? null);
              setBookshelfViewMode('GRID');
              setActiveManagementScreen(null);
              setEditingBookshelfMeetingId(null);
              showToast('책장이 삭제되었습니다.');
            } catch (error) {
              if (!(error instanceof ApiError)) {
                showToast('책장 삭제에 실패했습니다.');
              }
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
      showToast('제목과 내용을 입력해주세요.');
      return;
    }
    if (!canManageClub) {
      showToast('공지 API를 사용할 수 없습니다.');
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
      showToast('공지 삭제 API를 사용할 수 없습니다.');
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
        style={styles.container}
        contentContainerStyle={[styles.content, { paddingBottom: spacing.xl * 2 }]}
        showsVerticalScrollIndicator={false}
        onScroll={handleGroupHomeScroll}
        scrollEventThrottle={16}
        refreshControl={
          <RefreshControl
            refreshing={groupHomeRefreshing}
            onRefresh={handleRefreshGroupHome}
            tintColor={colors.primary1}
            colors={[colors.primary1]}
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
      <Text style={[styles.sectionTitle, styles.detailTitle, styles.groupHomeTitle]}>
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
              onPress={() => setActiveTab(tab.key)}
            >
              <MaterialIcons
                name={tab.icon}
                size={16}
                color={active ? colors.primary1 : colors.gray4}
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
        selectedNotice ? (
          <View style={styles.noticeDetailCard}>
            <Pressable
              style={({ pressed }) => [styles.breadcrumbPress, pressed && styles.pressed]}
              onPress={() => {
                setSelectedNoticeId(null);
                setNoticeCommentInput('');
                setEditingNoticeCommentId(null);
              }}
            >
              <MaterialIcons name="chevron-left" size={18} color={colors.gray5} />
              <Text style={styles.breadcrumbText}>공지사항</Text>
            </Pressable>

            <View style={styles.noticeDetailTopRow}>
              <View style={styles.noticeDetailCategoryRow}>
                <View style={[styles.noticeTag, styles.noticeTagPin]}>
                  <Text style={styles.noticeTagText}>{selectedNotice.category}</Text>
                </View>
                <Text style={styles.noticeDetailDate}>{selectedNotice.date}</Text>
              </View>
              <Pressable
                style={({ pressed }) => [styles.noticeDetailMenuButton, pressed && styles.pressed]}
                onPress={() => setNoticeMenuVisible(true)}
              >
                <MaterialIcons name="more-vert" size={18} color={colors.gray5} />
              </Pressable>
            </View>
            <Text style={styles.noticeDetailTitle}>{selectedNotice.title}</Text>
            <Text style={styles.noticeDetailBody}>{selectedNotice.content}</Text>
            {selectedNotice.bookshelf ? (
              <Pressable
                style={({ pressed }) => [styles.noticeAttachmentCard, pressed && styles.pressed]}
                onPress={handleOpenNoticeBookshelf}
              >
                <Text style={styles.noticeAttachmentTitle}>책장</Text>
                <View style={styles.noticeBookshelfCard}>
                  <Image
                    source={{ uri: selectedNotice.bookshelf.coverImage }}
                    style={styles.noticeBookshelfCover}
                    resizeMode="cover"
                  />
                  <View style={styles.noticeBookshelfInfo}>
                    <Text style={styles.noticeBookshelfTitle}>{selectedNotice.bookshelf.title}</Text>
                    <Text style={styles.noticeBookshelfAuthor}>{selectedNotice.bookshelf.author}</Text>
                    <View style={styles.bookshelfBadgeRow}>
                      <View style={styles.bookshelfSessionBadge}>
                        <Text style={styles.bookshelfBadgeText}>{selectedNotice.bookshelf.session}</Text>
                      </View>
                      <View
                        style={[
                          styles.bookshelfCategoryBadge,
                          getBookshelfCategoryBadgeStyle(selectedNotice.bookshelf.category),
                        ]}
                      >
                        <Text style={styles.bookshelfBadgeText}>
                          {selectedNotice.bookshelf.category}
                        </Text>
                      </View>
                    </View>
                    <View style={styles.bookshelfRatingRow}>
                      {Array.from({ length: 5 }).map((_, idx) => (
                        <MaterialIcons
                          key={`${selectedNotice.id}-bookshelf-star-${idx}`}
                          name={getStarIconName(selectedNotice.bookshelf?.rating ?? 0, idx)}
                          size={14}
                          color={
                            getStarIconName(selectedNotice.bookshelf?.rating ?? 0, idx) ===
                            'star-border'
                              ? colors.gray2
                              : colors.secondary2
                          }
                        />
                      ))}
                      <Text style={styles.bookshelfRatingText}>
                        {formatAverageRating(selectedNotice.bookshelf.rating)}
                      </Text>
                    </View>
                  </View>
                </View>
              </Pressable>
            ) : null}
            {selectedNotice.poll ? (
              <View style={styles.noticePollSection}>
                <View style={styles.noticePollMetaRow}>
                  <View style={styles.noticePollSchedule}>
                    <Text style={styles.noticeAttachmentTitle}>투표</Text>
                    <Text style={styles.noticePollEndText}>
                      {selectedNotice.poll.startsAt} - {selectedNotice.poll.endsAt}
                    </Text>
                  </View>
                  <View style={styles.noticePollMetaRight}>
                    <Text style={styles.noticePollMetaText}>
                      {selectedNotice.poll.allowDuplicate ? '중복 가능' : '중복 불가'}
                    </Text>
                    <View style={styles.noticePollMetaPrivacy}>
                      <MaterialIcons
                        name={selectedNotice.poll.anonymous ? 'lock-outline' : 'person-outline'}
                        size={14}
                        color={colors.gray4}
                      />
                      <Text style={styles.noticePollMetaText}>
                        {selectedNotice.poll.anonymous ? '익명' : '실명'}
                      </Text>
                    </View>
                  </View>
                </View>

                <View style={styles.noticePollOptionList}>
                  {currentNoticePollOptions.map((option) => {
                    const selected = currentSelectedVoteOptionIds.includes(option.id);
                    const voteCount = option.voters.length;
                    const voteOptionLocked =
                      hasSubmittedVoteInNotice && !voteEditEnabled && !selectedNotice.poll?.closed;
                    return (
                      <Pressable
                        key={option.id}
                        style={({ pressed }) => [
                          styles.noticePollOptionRow,
                          selected && styles.noticePollOptionRowSelected,
                          voteOptionLocked && styles.noticePollOptionRowDisabled,
                          pressed && styles.pressed,
                        ]}
                        disabled={voteOptionLocked}
                        onPress={() => handleToggleVoteOption(option.id)}
                      >
                        <View style={styles.noticePollOptionLeft}>
                          <MaterialIcons
                            name={selected ? 'check-circle' : 'radio-button-unchecked'}
                            size={18}
                            color={selected ? colors.primary1 : colors.gray4}
                          />
                          <Text style={styles.noticePollOptionText} numberOfLines={1}>
                            {option.label}
                          </Text>
                        </View>
                        <Pressable
                          style={styles.noticePollOptionCount}
                          disabled={voteCount <= 0}
                          onPress={(event) => {
                            event.stopPropagation();
                            handleOpenVoteVoters(option.id);
                          }}
                        >
                          <MaterialIcons name="person-outline" size={16} color={colors.gray4} />
                          <Text style={styles.noticePollOptionCountText}>{voteCount}</Text>
                        </Pressable>
                      </Pressable>
                    );
                  })}
                </View>

                <Pressable
                  style={({ pressed }) => [
                    styles.noticePollSubmitButton,
                    (selectedNotice.poll?.closed ||
                      (!selectedNotice.poll?.closed &&
                        !(
                          hasSubmittedVoteInNotice && !voteEditEnabled
                        ) &&
                        currentSelectedVoteOptionIds.length === 0)) &&
                      styles.noticePollSubmitButtonDisabled,
                    pressed && styles.pressed,
                  ]}
                  disabled={
                    Boolean(selectedNotice.poll?.closed) ||
                    (
                      !(hasSubmittedVoteInNotice && !voteEditEnabled) &&
                      currentSelectedVoteOptionIds.length === 0
                    )
                  }
                  onPress={handleSubmitVote}
                >
                  <Text style={styles.noticePollSubmitText}>
                    {selectedNotice.poll?.closed
                      ? '투표 종료'
                      : hasSubmittedVoteInNotice && !voteEditEnabled
                        ? '다시 투표'
                        : '투표하기'}
                  </Text>
                </Pressable>
              </View>
            ) : null}
            {selectedNotice.photos && selectedNotice.photos.length > 0 ? (
              <View style={styles.noticeAttachmentCard}>
                <Text style={styles.noticeAttachmentTitle}>사진</Text>
                <View style={styles.noticePhotoGrid}>
                  {selectedNotice.photos.map((photo, index) => (
                    <View key={`${selectedNotice.id}-photo-${photo}-${index}`} style={styles.noticePhotoItem}>
                      <Image
                        source={{ uri: photo }}
                        style={styles.noticePhotoImage}
                        resizeMode="cover"
                      />
                    </View>
                  ))}
                </View>
              </View>
            ) : null}
            <View style={styles.noticeDetailDivider} />

            <View style={styles.noticeCommentSection}>
              <Text style={styles.noticeCommentHeader}>댓글</Text>
              <View style={styles.noticeCommentInputRow}>
                <TextInput
                  value={noticeCommentInput}
                  onChangeText={setNoticeCommentInput}
                  placeholder="댓글 내용"
                  placeholderTextColor={colors.gray3}
                  style={styles.noticeCommentInput}
                  editable={!submittingNoticeComment}
                />
                <Pressable
                  style={({ pressed }) => [
                    styles.primaryButton,
                    styles.noticeCommentSubmit,
                    (submittingNoticeComment || noticeCommentInput.trim().length === 0) &&
                      styles.primaryButtonDisabled,
                    pressed && styles.pressed,
                  ]}
                  onPress={handleSubmitNoticeComment}
                  disabled={submittingNoticeComment || noticeCommentInput.trim().length === 0}
                >
                  <Text style={styles.noticeCommentSubmitText}>
                    {submittingNoticeComment ? '처리중' : editingNoticeCommentId ? '수정' : '입력'}
                  </Text>
                </Pressable>
              </View>
              {editingNoticeCommentId ? (
                <Pressable
                  style={({ pressed }) => [styles.breadcrumbPress, pressed && styles.pressed]}
                  onPress={() => {
                    setEditingNoticeCommentId(null);
                    setNoticeCommentInput('');
                  }}
                >
                  <Text style={styles.breadcrumbText}>댓글 수정 취소</Text>
                </Pressable>
              ) : null}

              <View style={styles.noticeCommentList}>
                {currentNoticeComments.map((comment) => (
                  <View key={comment.id} style={styles.noticeCommentItem}>
                    <View style={styles.noticeCommentAvatar}>
                      {comment.authorProfileImageUrl ? (
                        <Image
                          source={{ uri: comment.authorProfileImageUrl }}
                          style={styles.noticeCommentAvatarImage}
                          resizeMode="cover"
                        />
                      ) : (
                        <MaterialIcons name="person-outline" size={20} color={colors.gray4} />
                      )}
                    </View>
                    <View style={styles.noticeCommentBody}>
                      <View style={styles.noticeCommentMetaRow}>
                        <View style={styles.noticeCommentAuthorRow}>
                          <Text style={styles.noticeCommentAuthor}>{comment.author}</Text>
                          {comment.isAuthor ? (
                            <View style={styles.noticeCommentAuthorBadge}>
                              <Text style={styles.noticeCommentAuthorBadgeText}>작성자</Text>
                            </View>
                          ) : null}
                          <Text style={styles.noticeCommentDate}>{comment.date}</Text>
                        </View>
                        <Pressable
                          style={({ pressed }) => [
                            styles.noticeCommentMenuButton,
                            pressed && styles.pressed,
                          ]}
                          onPress={() => handlePressCommentMenu(comment)}
                        >
                          <MaterialIcons name="more-vert" size={16} color={colors.gray4} />
                        </Pressable>
                      </View>
                      <Text style={styles.noticeCommentText}>{comment.content}</Text>
                    </View>
                  </View>
                ))}
                {currentNoticeComments.length === 0 ? (
                  <View style={styles.managementEmptyCard}>
                    <Text style={styles.managementEmptyText}>등록된 댓글이 없습니다.</Text>
                  </View>
                ) : null}
                {currentNoticeCommentPageState?.loadingMore ? (
                  <Text style={styles.helperText}>다음 댓글을 불러오는 중...</Text>
                ) : null}
              </View>
            </View>
          </View>
        ) : (
          <View style={styles.noticeBoardCard}>
              <View style={styles.noticeBoardHeader}>
                <View>
                  <Text style={styles.noticeBoardTitle}>공지사항</Text>
                  <Text style={styles.noticeBoardDescription}>
                    모임의 공지사항을 확인하세요!
                  </Text>
                </View>
              </View>
            <View style={styles.noticeList}>
              {visibleNotices.map((notice) => (
                <Pressable
                  key={notice.id}
                  style={({ pressed }) => [styles.noticeItemRow, pressed && styles.pressed]}
                  onPress={() => setSelectedNoticeId(notice.id)}
                >
                  <View style={styles.noticeTagRow}>
                    {notice.tags.map((tag, index) =>
                      renderNoticeTag(tag, `${notice.id}-${tag}-${index}`),
                    )}
                  </View>
                  <View style={styles.noticeItemContent}>
                    <Text style={styles.noticeItemTitle} numberOfLines={1}>
                      {notice.title}
                    </Text>
                    <View style={styles.noticeItemMetaRow}>
                      {notice.bookshelf ? (
                        <View style={styles.noticeItemMetaBadge}>
                          <MaterialIcons name="collections-bookmark" size={14} color={colors.gray4} />
                          <Text style={styles.noticeItemMetaText}>책장</Text>
                        </View>
                      ) : null}
                      {notice.poll ? (
                        <View style={styles.noticeItemMetaBadge}>
                          <MaterialIcons name="poll" size={14} color={colors.gray4} />
                          <Text style={styles.noticeItemMetaText}>투표</Text>
                        </View>
                      ) : null}
                      {notice.photos && notice.photos.length > 0 ? (
                        <View style={styles.noticeItemMetaBadge}>
                          <MaterialIcons name="image" size={14} color={colors.gray4} />
                          <Text style={styles.noticeItemMetaText}>사진 {notice.photos.length}</Text>
                        </View>
                      ) : null}
                    </View>
                  </View>
                </Pressable>
              ))}
              {visibleNotices.length === 0 ? (
                <View style={styles.managementEmptyCard}>
                  <Text style={styles.managementEmptyText}>등록된 공지가 없습니다.</Text>
                </View>
              ) : null}
            </View>
            {visibleNotices.length > 0 ? (
              <View style={styles.noticePagination}>
                <Pressable
                  style={({ pressed }) => [
                    styles.noticePageArrow,
                    currentNoticePage === 1 && styles.noticePageArrowDisabled,
                    pressed && styles.pressed,
                  ]}
                  disabled={currentNoticePage === 1}
                  onPress={() => setNoticePage((prev) => Math.max(1, prev - 1))}
                >
                  <MaterialIcons name="chevron-left" size={18} color={colors.gray5} />
                </Pressable>

                {visiblePageNumbers.map((page) => {
                  const active = page === currentNoticePage;
                  return (
                    <Pressable
                      key={`notice-page-${page}`}
                      style={({ pressed }) => [
                        styles.noticePageButton,
                        active && styles.noticePageButtonActive,
                        pressed && styles.pressed,
                      ]}
                      onPress={() => setNoticePage(page)}
                    >
                      <Text style={[styles.noticePageText, active && styles.noticePageTextActive]}>
                        {page}
                      </Text>
                    </Pressable>
                  );
                })}

                <Pressable
                  style={({ pressed }) => [
                    styles.noticePageArrow,
                    currentNoticePage >= totalNoticePages && styles.noticePageArrowDisabled,
                    pressed && styles.pressed,
                  ]}
                  disabled={currentNoticePage >= totalNoticePages}
                  onPress={() => setNoticePage((prev) => Math.min(totalNoticePages, prev + 1))}
                >
                  <MaterialIcons name="chevron-right" size={18} color={colors.gray5} />
                </Pressable>
              </View>
            ) : null}
          </View>
        )
      ) : null}

      {activeTab === 'bookshelf' ? (
        <View style={styles.bookshelfSection}>
          {bookshelfViewMode === 'GRID' ? (
            <>
              <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                contentContainerStyle={styles.bookshelfSessionRow}
              >
                {bookshelfSessions.map((session) => {
                  const active = selectedBookshelfSession === session;
                  return (
                    <Pressable
                      key={`${group.id}-session-${session}`}
                      style={({ pressed }) => [
                        styles.bookshelfSessionChip,
                        active && styles.bookshelfSessionChipActive,
                        pressed && styles.pressed,
                      ]}
                      onPress={() => setSelectedBookshelfSession(session)}
                    >
                      <Text
                        style={[
                          styles.bookshelfSessionText,
                          active && styles.bookshelfSessionTextActive,
                        ]}
                      >
                        {session}
                      </Text>
                    </Pressable>
                  );
                })}
              </ScrollView>
              {visibleBookshelfItems.length === 0 ? (
                <View style={styles.managementEmptyCard}>
                  <Text style={styles.managementEmptyText}>등록된 책장이 없습니다.</Text>
                </View>
              ) : (
                <View style={styles.bookshelfGrid}>
                  {visibleBookshelfItems.map((book) => (
                    <Pressable
                      key={book.id}
                      style={({ pressed }) => [styles.bookshelfCard, pressed && styles.pressed]}
                      onPress={() => openBookshelfDetail(book, 'TOPIC')}
                    >
                      <Image
                        source={{ uri: book.coverImage }}
                        style={styles.bookshelfCover}
                        resizeMode="cover"
                      />
                      <Text style={styles.bookshelfTitle} numberOfLines={1}>
                        {book.title}
                      </Text>
                      <Text style={styles.bookshelfAuthor} numberOfLines={1}>
                        {book.author}
                      </Text>
                      <View style={styles.bookshelfBadgeRow}>
                        <View style={styles.bookshelfSessionBadge}>
                          <Text style={styles.bookshelfBadgeText}>{book.session}</Text>
                        </View>
                        <View
                          style={[
                            styles.bookshelfCategoryBadge,
                            getBookshelfCategoryBadgeStyle(book.category),
                          ]}
                        >
                          <Text style={styles.bookshelfBadgeText}>{book.category}</Text>
                        </View>
                      </View>
                      {[
                        { label: '발제', tab: 'TOPIC' as const },
                        { label: '한줄평', tab: 'REVIEW' as const },
                        { label: '정기모임', tab: 'REGULAR' as const },
                      ].map((item) => (
                        <Pressable
                          key={`${book.id}-${item.label}`}
                          style={({ pressed }) => [styles.bookshelfLinkRow, pressed && styles.pressed]}
                          onPress={() => openBookshelfDetail(book, item.tab)}
                        >
                          <Text style={styles.bookshelfLinkLabel}>{item.label}</Text>
                          <MaterialIcons name="north-east" size={14} color={colors.gray3} />
                        </Pressable>
                      ))}
                      <View style={styles.bookshelfRatingRow}>
                        {Array.from({ length: 5 }).map((_, idx) => (
                          <MaterialIcons
                            key={`${book.id}-star-${idx}`}
                            name={getStarIconName(book.rating, idx)}
                            size={16}
                            color={
                              getStarIconName(book.rating, idx) === 'star-border'
                                ? colors.gray2
                                : colors.secondary2
                            }
                          />
                        ))}
                        <Text style={styles.bookshelfRatingText}>
                          {formatAverageRating(book.rating)}
                        </Text>
                      </View>
                    </Pressable>
                  ))}
                </View>
              )}
            </>
          ) : selectedBookshelfBook ? (
            <View style={styles.bookshelfDetailSection}>
              <View style={styles.detailTitleRow}>
                <Pressable
                  style={({ pressed }) => [styles.breadcrumbPress, pressed && styles.pressed]}
                  onPress={handleBackToBookshelfGrid}
                >
                  <MaterialIcons name="chevron-left" size={18} color={colors.gray5} />
                  <Text style={styles.breadcrumbText}>책장</Text>
                </Pressable>
                {canManageClub && bookshelfDetailTab === 'REGULAR' ? (
                  <View style={styles.detailTitleActionRow}>
                    <Pressable
                      style={({ pressed }) => [styles.detailTitleManageLink, pressed && styles.pressed]}
                      onPress={handleOpenBookshelfEdit}
                    >
                      <Text style={styles.detailTitleManageLinkText}>책장 수정</Text>
                    </Pressable>
                    <Pressable
                      style={({ pressed }) => [styles.detailTitleManageLink, pressed && styles.pressed]}
                      onPress={handlePressManageRegularGroups}
                    >
                      <Text style={styles.detailTitleManageLinkText}>조 관리하기</Text>
                    </Pressable>
                  </View>
                ) : null}
              </View>

              <View style={styles.bookshelfDetailBookCard}>
                <Image
                  source={{ uri: selectedBookshelfBook.coverImage }}
                  style={styles.bookshelfDetailBookCover}
                />
                <View style={styles.bookshelfDetailBookInfo}>
                  <Text style={styles.bookshelfDetailBookTitle}>{selectedBookshelfBook.title}</Text>
                  <Text style={styles.bookshelfDetailBookAuthor}>{selectedBookshelfBook.author}</Text>
                  <View style={styles.bookshelfBadgeRow}>
                    <View style={styles.bookshelfSessionBadge}>
                      <Text style={styles.bookshelfBadgeText}>{selectedBookshelfBook.session}</Text>
                    </View>
                    <View
                      style={[
                        styles.bookshelfCategoryBadge,
                        getBookshelfCategoryBadgeStyle(selectedBookshelfBook.category),
                      ]}
                    >
                      <Text style={styles.bookshelfBadgeText}>{selectedBookshelfBook.category}</Text>
                    </View>
                  </View>
                  <View style={styles.bookshelfRatingRow}>
                    {Array.from({ length: 5 }).map((_, idx) => (
                      <MaterialIcons
                        key={`${selectedBookshelfBook.id}-detail-star-${idx}`}
                        name={getStarIconName(selectedBookshelfBook.rating, idx)}
                        size={16}
                        color={
                          getStarIconName(selectedBookshelfBook.rating, idx) === 'star-border'
                            ? colors.gray2
                            : colors.secondary2
                        }
                      />
                    ))}
                    <Text style={styles.bookshelfRatingText}>
                      {formatAverageRating(selectedBookshelfBook.rating)}
                    </Text>
                  </View>
                  <Text style={styles.bookshelfDetailBookDescription} numberOfLines={4}>
                    책을 좋아하는 사람들이 모여 각자의 속도로 읽고, 각자의 언어로 생각을 나누는 모임입니다.
                  </Text>
                </View>
              </View>

              <View style={styles.bookshelfDetailTabRow}>
                {[
                  { label: '발제', tab: 'TOPIC' as const },
                  { label: '한줄평', tab: 'REVIEW' as const },
                  { label: '정기모임', tab: 'REGULAR' as const },
                ].map((item) => {
                  const active = bookshelfDetailTab === item.tab;
                  return (
                    <Pressable
                      key={`${selectedBookshelfBook.id}-${item.tab}`}
                      style={({ pressed }) => [
                        styles.bookshelfDetailTabButton,
                        active && styles.bookshelfDetailTabButtonActive,
                        pressed && styles.pressed,
                      ]}
                      onPress={() => handleChangeBookshelfTab(item.tab)}
                    >
                      <Text
                        style={[
                          styles.bookshelfDetailTabLabel,
                          active && styles.bookshelfDetailTabLabelActive,
                        ]}
                      >
                        {item.label}
                      </Text>
                    </Pressable>
                  );
                })}
              </View>

              {bookshelfDetailTab === 'TOPIC' ? (
                <View style={styles.bookshelfPanel}>
                  <View style={styles.bookshelfPanelHeader}>
                    <View style={styles.bookshelfPanelTitleRow}>
                      <MaterialIcons name="description" size={22} color={colors.gray6} />
                      <Text style={styles.bookshelfPanelTitle}>전체 발제</Text>
                    </View>
                    <Pressable
                      style={({ pressed }) => [styles.bookshelfPanelAddButton, pressed && styles.pressed]}
                      onPress={() => handleOpenBookshelfComposer('TOPIC')}
                    >
                      <MaterialIcons name="add" size={20} color={colors.primary1} />
                    </Pressable>
                  </View>

                  <View style={styles.bookshelfPostList}>
                    {bookshelfTopicItems.map((item) => (
                        <View key={item.id} style={styles.bookshelfPostCard}>
                          <View style={styles.bookshelfPostTop}>
                            <View style={styles.bookshelfPostAuthorRow}>
                              <View style={styles.bookshelfPostAvatar}>
                              {item.authorProfileImageUrl ? (
                                <Image
                                  source={{ uri: item.authorProfileImageUrl }}
                                  style={styles.bookshelfPostAvatarImage}
                                  resizeMode="cover"
                                />
                              ) : (
                                <MaterialIcons name="person" size={16} color={colors.gray3} />
                              )}
                            </View>
                            <Text style={styles.bookshelfPostAuthor}>{item.author}</Text>
                          </View>
                          {item.isAuthor ? (
                            <Pressable
                              style={({ pressed }) => [
                                styles.bookshelfPostMenuButton,
                                pressed && styles.pressed,
                              ]}
                              onPress={() => handlePressBookshelfPostMenu(item)}
                            >
                              <MaterialIcons name="more-vert" size={18} color={colors.gray4} />
                            </Pressable>
                          ) : null}
                        </View>
                        <Text style={styles.bookshelfPostContent}>{item.content}</Text>
                      </View>
                    ))}
                    {bookshelfTopicItems.length === 0 ? (
                      <View style={styles.managementEmptyCard}>
                        <Text style={styles.managementEmptyText}>등록된 발제가 없습니다.</Text>
                      </View>
                    ) : null}
                    {currentBookshelfTopicPageState?.loadingMore ? (
                      <Text style={styles.helperText}>다음 발제를 불러오는 중...</Text>
                    ) : null}
                  </View>
                </View>
              ) : null}

              {bookshelfDetailTab === 'REVIEW' ? (
                <View style={styles.bookshelfPanel}>
                  <View style={styles.bookshelfPanelHeader}>
                    <View style={styles.bookshelfPanelTitleRow}>
                      <MaterialIcons name="star-border" size={22} color={colors.gray6} />
                      <Text style={styles.bookshelfPanelTitle}>한줄평</Text>
                    </View>
                    <Pressable
                      style={({ pressed }) => [styles.bookshelfPanelAddButton, pressed && styles.pressed]}
                      onPress={() => handleOpenBookshelfComposer('REVIEW')}
                    >
                      <MaterialIcons name="add" size={20} color={colors.primary1} />
                    </Pressable>
                  </View>

	                  <View style={styles.bookshelfPostList}>
	                    {bookshelfReviewItems.map((item) => (
	                      <View key={item.id} style={styles.bookshelfPostCard}>
	                        <View style={styles.bookshelfPostTop}>
	                          <View style={styles.bookshelfPostAuthorRow}>
	                            <View style={styles.bookshelfPostAvatar}>
	                              {item.authorProfileImageUrl ? (
	                                <Image
	                                  source={{ uri: item.authorProfileImageUrl }}
	                                  style={styles.bookshelfPostAvatarImage}
	                                  resizeMode="cover"
	                                />
	                              ) : (
	                                <MaterialIcons name="person" size={16} color={colors.gray3} />
	                              )}
	                            </View>
	                            <Text style={styles.bookshelfPostAuthor}>{item.author}</Text>
	                          </View>
	                          {item.isAuthor ? (
	                            <Pressable
	                              style={({ pressed }) => [
	                                styles.bookshelfPostMenuButton,
	                                pressed && styles.pressed,
	                              ]}
	                              onPress={() => handlePressBookshelfPostMenu(item)}
	                            >
	                              <MaterialIcons name="more-vert" size={18} color={colors.gray4} />
	                            </Pressable>
	                          ) : null}
	                        </View>
	                        <View style={styles.bookshelfPostRatingRow}>
	                          {Array.from({ length: 5 }).map((_, idx) => (
	                            <MaterialIcons
	                              key={`${item.id}-review-star-${idx}`}
                              name={getStarIconName(item.rating ?? 0, idx)}
                              size={16}
                              color={
                                getStarIconName(item.rating ?? 0, idx) === 'star-border'
                                  ? colors.gray2
                                  : colors.secondary2
	                              }
	                            />
	                          ))}
	                        </View>
	                        <Text style={styles.bookshelfPostContent}>{item.content}</Text>
	                      </View>
	                    ))}
                    {bookshelfReviewItems.length === 0 ? (
                      <View style={styles.managementEmptyCard}>
                        <Text style={styles.managementEmptyText}>등록된 한줄평이 없습니다.</Text>
                      </View>
                    ) : null}
                  </View>
                </View>
              ) : null}

              {bookshelfDetailTab === 'REGULAR' ? (
                <View style={styles.bookshelfPanel}>
                  {regularMeetingInfo ? (
                    <>
                      <View style={styles.bookshelfRegularSummaryCard}>
                        <View style={styles.bookshelfRegularSummaryTitleRow}>
                          <MaterialIcons name="groups" size={24} color={colors.gray6} />
                          <Text style={styles.bookshelfRegularSummaryTitle}>{regularMeetingInfo.name}</Text>
                        </View>
                        <View style={styles.bookshelfRegularSummaryMetaRow}>
                          <MaterialIcons name="event" size={18} color={colors.gray4} />
                          <Text style={styles.bookshelfRegularSummaryMetaText}>
                            {regularMeetingInfo.date}
                          </Text>
                        </View>
                        <View style={styles.bookshelfRegularSummaryMetaRow}>
                          <MaterialIcons name="place" size={18} color={colors.gray4} />
                          <Text style={styles.bookshelfRegularSummaryMetaText}>
                            {regularMeetingInfo.location}
                          </Text>
                        </View>
                      </View>

                      <ScrollView
                        horizontal
                        showsHorizontalScrollIndicator={false}
                        contentContainerStyle={styles.bookshelfGroupChipRow}
                      >
                        {regularMeetingInfo.groups.map((groupItem) => {
                          const active = selectedRegularGroupId === groupItem.id;
                          return (
                            <Pressable
                              key={groupItem.id}
                              style={({ pressed }) => [
                                styles.bookshelfGroupChip,
                                active && styles.bookshelfGroupChipActive,
                                pressed && styles.pressed,
                              ]}
                              onPress={() => handleSelectRegularGroup(groupItem.id)}
                            >
                              <Text
                                style={[
                                  styles.bookshelfGroupChipText,
                                  active && styles.bookshelfGroupChipTextActive,
                                ]}
                              >
                                {groupItem.label}
                              </Text>
                            </Pressable>
                          );
                        })}
                      </ScrollView>

                      {bookshelfViewMode !== 'REGULAR_GROUP' && selectedRegularGroup ? (
                        <Pressable
                          style={({ pressed }) => [
                            styles.bookshelfRegularGroupPreviewCard,
                            pressed && styles.pressed,
                          ]}
                          onPress={() => handleEnterRegularGroup(selectedRegularGroup.id)}
                        >
                          <View style={styles.bookshelfRegularGroupPreviewHeader}>
                            <View style={styles.bookshelfGroupHeaderLeft}>
                              <Text style={styles.bookshelfGroupTitle}>{selectedRegularGroup.label}</Text>
                              <MaterialIcons name="person" size={20} color={colors.gray4} />
                              <Text style={styles.bookshelfGroupMemberCount}>
                                {selectedRegularGroup.memberCount}
                              </Text>
                            </View>
                            <MaterialIcons name="chevron-right" size={20} color={colors.gray4} />
                          </View>
                          <Text style={styles.bookshelfRegularGroupPreviewLabel}>참여자</Text>
                          <View style={styles.bookshelfRegularGroupMemberList}>
                            {selectedRegularGroup.members.map((member) => (
                              <View key={member.id} style={styles.bookshelfRegularGroupMemberRow}>
                                <View style={styles.bookshelfPostAvatar}>
                                  {member.profileImageUrl ? (
                                    <Image
                                      source={{ uri: member.profileImageUrl }}
                                      style={styles.bookshelfPostAvatarImage}
                                      resizeMode="cover"
                                    />
                                  ) : (
                                    <MaterialIcons name="person" size={16} color={colors.gray3} />
                                  )}
                                </View>
                                <Text style={styles.bookshelfRegularGroupMemberName}>{member.nickname}</Text>
                              </View>
                            ))}
                          </View>
                          <Text style={styles.bookshelfRegularGroupHint}>
                            조 페이지로 이동해 발제와 정렬 현황을 확인하세요.
                          </Text>
                        </Pressable>
                      ) : null}

                      {bookshelfViewMode === 'REGULAR_GROUP' && selectedRegularGroup ? (
                        <View style={styles.bookshelfGroupSection}>
                          <View style={styles.bookshelfGroupHeader}>
                            <View style={styles.bookshelfGroupHeaderLeft}>
                              <Text style={styles.bookshelfGroupTitle}>{selectedRegularGroup.label}</Text>
                              <View style={styles.bookshelfGroupMemberWrap}>
                                <Pressable
                                  style={({ pressed }) => [
                                    styles.bookshelfGroupMemberButton,
                                    pressed && styles.pressed,
                                  ]}
                                  onPress={handleToggleRegularGroupMembers}
                                >
                                  <MaterialIcons name="person" size={20} color={colors.gray4} />
                                  <Text style={styles.bookshelfGroupMemberCount}>
                                    {selectedRegularGroup.memberCount}
                                  </Text>
                                  <MaterialIcons
                                    name={
                                      regularGroupMembersVisible
                                        ? 'keyboard-arrow-up'
                                        : 'keyboard-arrow-down'
                                    }
                                    size={18}
                                    color={colors.gray4}
                                  />
                                </Pressable>
                                {regularGroupMembersVisible ? (
                                  <View style={styles.bookshelfGroupMemberDropdown}>
                                    <Text style={styles.bookshelfGroupMemberDropdownTitle}>
                                      {selectedRegularGroup.label} 참여자
                                    </Text>
                                    <View style={styles.bookshelfRegularGroupMemberList}>
                                      {selectedRegularGroup.members.map((member) => (
                                        <View
                                          key={`${member.id}-dropdown`}
                                          style={styles.bookshelfRegularGroupMemberRow}
                                        >
                                          <View style={styles.bookshelfPostAvatar}>
                                            {member.profileImageUrl ? (
                                              <Image
                                                source={{ uri: member.profileImageUrl }}
                                                style={styles.bookshelfPostAvatarImage}
                                                resizeMode="cover"
                                              />
                                            ) : (
                                              <MaterialIcons
                                                name="person"
                                                size={16}
                                                color={colors.gray3}
                                              />
                                            )}
                                          </View>
                                          <Text style={styles.bookshelfRegularGroupMemberName}>
                                            {member.nickname}
                                          </Text>
                                        </View>
                                      ))}
                                    </View>
                                  </View>
                                ) : null}
                              </View>
                            </View>
                            <View style={styles.bookshelfGroupActionRow}>
                              <Pressable
                                style={({ pressed }) => [
                                  styles.bookshelfGroupActionButton,
                                  pressed && styles.pressed,
                                ]}
                                onPress={() => handleOpenBookshelfComposer('TOPIC')}
                              >
                                <MaterialIcons name="edit" size={18} color={colors.gray4} />
                                <Text style={styles.bookshelfGroupSortText}>발제</Text>
                              </Pressable>
                              <Pressable
                                style={({ pressed }) => [
                                  styles.bookshelfGroupActionButton,
                                  pressed && styles.pressed,
                                ]}
                                onPress={() => handleSortRegularGroupPosts(selectedRegularGroup.id)}
                              >
                                <MaterialIcons name="sort" size={18} color={colors.gray4} />
                                <Text style={styles.bookshelfGroupSortText}>정렬하기</Text>
                              </Pressable>
                            </View>
                          </View>

                          <View style={styles.bookshelfGroupPostList}>
                            {selectedRegularGroup.posts.map((post) => (
                              <Pressable
                                key={post.id}
                                style={({ pressed }) => [
                                  styles.bookshelfGroupPostCard,
                                  post.completed && styles.bookshelfGroupPostCardCompleted,
                                  pressed && styles.pressed,
                                ]}
                                onPress={() => handleToggleRegularGroupPost(selectedRegularGroup.id, post.id)}
                              >
                                <View style={styles.bookshelfPostTop}>
                                  <View style={styles.bookshelfPostAuthorRow}>
                                    <View style={styles.bookshelfPostAvatar}>
                                      {post.authorProfileImageUrl ? (
                                        <Image
                                          source={{ uri: post.authorProfileImageUrl }}
                                          style={styles.bookshelfPostAvatarImage}
                                          resizeMode="cover"
                                        />
                                      ) : (
                                        <MaterialIcons name="person" size={16} color={colors.gray3} />
                                      )}
                                    </View>
                                    <Text style={styles.bookshelfPostAuthor}>{post.author}</Text>
                                  </View>
                                  <MaterialIcons
                                    name="check"
                                    size={28}
                                    color={post.completed ? '#3FBE78' : colors.gray2}
                                  />
                                </View>
                                <Text style={styles.bookshelfPostContent}>{post.content}</Text>
                              </Pressable>
                            ))}
                            {selectedRegularGroup.posts.length === 0 ? (
                              <View style={styles.managementEmptyCard}>
                                <Text style={styles.managementEmptyText}>등록된 조 발제가 없습니다.</Text>
                              </View>
                            ) : null}
                          </View>
                        </View>
                      ) : null}
                    </>
                  ) : (
                    <View style={styles.managementEmptyCard}>
                      <Text style={styles.managementEmptyText}>정기모임 정보가 없습니다.</Text>
                    </View>
                  )}
                </View>
              ) : null}
            </View>
          ) : null}
        </View>
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

              <ScrollView
                style={styles.managementScreenScroll}
                contentContainerStyle={styles.teamManageContent}
                scrollEnabled={draggingTeamMemberId === null}
                showsVerticalScrollIndicator={false}
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
                                <MaterialIcons name="person-outline" size={18} color={colors.gray4} />
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
                    <Text style={styles.teamManageCardTitle}>전체 독서 클럽 참여자</Text>
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
                              <MaterialIcons name="person-outline" size={18} color={colors.gray4} />
                            )}
                          </View>
                          <Text style={styles.teamManageMemberName}>{member.nickname}</Text>
                        </View>
                      );
                    })}
                    {teamManageUnassignedMembers.length === 0 ? (
                      <View style={styles.teamManageEmptySlot}>
                        <Text style={styles.teamManageEmptySlotText}>모든 참여자가 조에 배정되었습니다.</Text>
                      </View>
                    ) : null}
                  </View>
                </View>
              </ScrollView>

              <View
                style={[
                  styles.teamManageFooter,
                  { paddingBottom: Math.max(insets.bottom, spacing.md) + spacing.sm },
                ]}
              >
                <Text style={styles.teamManageFooterHint}>
                  {teamManageUnassignedMembers.length > 0
                    ? '모든 참여자를 조에 배정하면 저장할 수 있습니다.'
                    : '조 편성을 저장하면 정기모임 화면으로 돌아갑니다.'}
                </Text>
                <Pressable
                  style={({ pressed }) => [
                    styles.teamManageSaveButton,
                    (teamManageSaving || teamManageUnassignedMembers.length > 0)
                      ? styles.teamManageSaveButtonDisabled
                      : styles.teamManageSaveButtonActive,
                    pressed &&
                      !teamManageSaving &&
                      teamManageUnassignedMembers.length === 0 &&
                      styles.pressed,
                  ]}
                  onPress={handleSaveTeamManage}
                  disabled={teamManageSaving || teamManageUnassignedMembers.length > 0}
                >
                  <Text
                    style={[
                      styles.teamManageSaveButtonText,
                      (teamManageSaving || teamManageUnassignedMembers.length > 0) &&
                        styles.teamManageSaveButtonTextDisabled,
                    ]}
                  >
                    {teamManageSaving ? '저장중...' : '조 편성 저장하기'}
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
      <Modal
        visible={Boolean(bookshelfComposerType)}
        transparent
        animationType="fade"
        onRequestClose={closeBookshelfComposer}
      >
        <KeyboardAvoidingView
          style={styles.bookshelfComposerKeyboard}
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        >
          <Pressable style={styles.bookshelfComposerOverlay} onPress={closeBookshelfComposer}>
            <Pressable
              style={styles.bookshelfComposerCard}
              onPress={(event) => event.stopPropagation()}
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
                <TextInput
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
                  maxLength={300}
                />
                <Text style={styles.bookshelfComposerCounter}>
                  {bookshelfComposerInput.length}/300
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
	                        ? '수정중...'
	                        : '등록중...'
	                      : editingBookshelfPost
	                        ? '수정하기'
	                        : '등록하기'}
	                  </Text>
	                </Pressable>
	              </View>
            </Pressable>
          </Pressable>
        </KeyboardAvoidingView>
      </Modal>
      <Modal
        visible={managementMenuVisible || Boolean(activeManagementScreen) || bookshelfBookSelectorVisible}
        transparent
        animationType="fade"
        onRequestClose={handleCloseManagementLayer}
      >
        {bookshelfBookSelectorVisible ? (
          <KeyboardAvoidingView
            style={styles.managementScreen}
            behavior={Platform.OS === 'ios' ? 'padding' : undefined}
          >
            <View style={[styles.managementScreenHeader, { paddingTop: Math.max(insets.top, spacing.lg) + spacing.sm }]}>
              <Pressable onPress={closeBookshelfBookSelector} hitSlop={8}>
                <MaterialIcons name="chevron-left" size={24} color={colors.gray6} />
              </Pressable>
              <Text style={styles.managementScreenTitle}>책 검색</Text>
              <Pressable onPress={closeBookshelfBookSelector} hitSlop={8}>
                <MaterialIcons name="close" size={22} color={colors.gray6} />
              </Pressable>
            </View>

            <View style={[styles.managementScreenContent, styles.bookshelfBookSearchScreen]}>
              <View style={styles.bookshelfBookSearchInputRow}>
                <Pressable onPress={handleSubmitBookshelfBookSearch}>
                  <MaterialIcons name="search" size={22} color={colors.gray4} />
                </Pressable>
                <TextInput
                  value={bookshelfBookSearchQuery}
                  onChangeText={setBookshelfBookSearchQuery}
                  placeholder="책 제목, 작가 이름을 검색해보세요"
                  placeholderTextColor={colors.gray3}
                  style={styles.bookshelfBookSearchInput}
                  onSubmitEditing={handleSubmitBookshelfBookSearch}
                  returnKeyType="search"
                  autoFocus
                />
                {bookshelfBookSearchQuery.length > 0 ? (
                  <Pressable
                    onPress={() => {
                      setBookshelfBookSearchQuery('');
                      setBookshelfBookSearchKeyword('');
                      setBookshelfBookSearchResults([]);
                      setBookshelfBookSearchSearched(false);
                    }}
                    hitSlop={8}
                  >
                    <MaterialIcons name="close" size={18} color={colors.gray4} />
                  </Pressable>
                ) : null}
              </View>
              {bookshelfBookSearchSearched ? (
                <Text style={styles.bookshelfBookSearchGuide}>
                  {bookshelfBookSearchLoading
                    ? '검색 중...'
                    : `"${bookshelfBookSearchKeyword}" 총 ${bookshelfBookSearchResults.length}개의 검색결과가 있습니다.`}
                </Text>
              ) : (
                <Text style={styles.bookshelfBookSearchGuide}>
                  검색어를 입력하고 책을 선택해주세요.
                </Text>
              )}
              <ScrollView
                style={styles.bookshelfBookSearchScroll}
                contentContainerStyle={styles.bookshelfBookSearchList}
                keyboardShouldPersistTaps="handled"
                showsVerticalScrollIndicator={false}
              >
                {bookshelfBookSearchSearched &&
                !bookshelfBookSearchLoading &&
                bookshelfBookSearchResults.length === 0 ? (
                  <Text style={styles.bookshelfBookSearchEmpty}>검색 결과가 없습니다.</Text>
                ) : null}

                {bookshelfBookSearchResults.map((book, index) => (
                  <Pressable
                    key={`bookshelf-create-book-${book.isbn}-${index}`}
                    style={({ pressed }) => [
                      styles.bookshelfBookSearchItem,
                      bookshelfCreateDraft.sourceBook?.isbn === book.isbn &&
                        styles.bookshelfBookSearchItemActive,
                      pressed && styles.pressed,
                    ]}
                    onPress={() => handleSelectBookshelfSourceBook(book)}
                  >
                    {book.imgUrl ? (
                      <Image
                        source={{ uri: book.imgUrl }}
                        style={styles.bookshelfBookSearchCover}
                        resizeMode="cover"
                      />
                    ) : (
                      <View style={styles.bookshelfBookSearchCover} />
                    )}
                    <View style={styles.bookshelfBookSearchInfo}>
                      <Text style={styles.bookshelfBookSearchTitle} numberOfLines={2}>
                        {book.title}
                      </Text>
                      <Text style={styles.bookshelfBookSearchMeta} numberOfLines={1}>
                        {book.author}
                      </Text>
                      {book.publisher ? (
                        <Text style={styles.bookshelfBookSearchMeta} numberOfLines={1}>
                          {book.publisher}
                        </Text>
                      ) : null}
                    </View>
                  </Pressable>
                ))}
              </ScrollView>
            </View>
          </KeyboardAvoidingView>
        ) : activeManagementScreen ? (
          <KeyboardAvoidingView
            style={styles.managementScreen}
            behavior={Platform.OS === 'ios' ? 'padding' : undefined}
          >
            <View style={[styles.managementScreenHeader, { paddingTop: Math.max(insets.top, spacing.lg) + spacing.sm }]}>
              <Pressable onPress={handleCloseManagementScreen} hitSlop={8}>
                <MaterialIcons name="chevron-left" size={24} color={colors.gray6} />
              </Pressable>
              <Text style={styles.managementScreenTitle}>
                {activeManagementScreen === 'JOIN_REQUESTS'
                  ? '모임 가입 신청 관리'
                  : activeManagementScreen === 'MEMBERS'
                    ? '모임 회원 관리'
                    : activeManagementScreen === 'BOOKSHELF_CREATE'
                      ? typeof editingBookshelfMeetingId === 'number'
                        ? '책장 수정하기'
                        : '책장 생성하기'
                      : '모임 정보 수정하기'}
              </Text>
              <Pressable onPress={handleCloseManagementScreen} hitSlop={8}>
                <MaterialIcons name="close" size={22} color={colors.gray6} />
              </Pressable>
            </View>

            <ScrollView
              style={styles.managementScreenScroll}
              contentContainerStyle={styles.managementScreenContent}
              showsVerticalScrollIndicator={false}
            >
            {activeManagementScreen === 'JOIN_REQUESTS' ? (
              <>
                <View style={styles.managementSummaryCard}>
                  <Text style={styles.managementSummaryTitle}>가입 신청 현황</Text>
                  <Text style={styles.managementSummaryDescription}>
                    가입 메시지를 확인한 뒤 승인하거나 삭제할 수 있습니다.
                  </Text>
                  <View style={styles.managementCountBadge}>
                    <Text style={styles.managementCountBadgeText}>
                      대기 {joinRequests.length}
                    </Text>
                  </View>
                </View>

                <View style={styles.managementCardList}>
                  {joinRequests.map((request) => (
                    <View key={request.id} style={styles.managementListCard}>
                      <View style={styles.managementListCardTop}>
                        <View style={styles.managementIdentityRow}>
                          <View style={styles.managementAvatar}>
                            {request.profileImageUrl ? (
                              <Image
                                source={{ uri: request.profileImageUrl }}
                                style={styles.managementAvatarImage}
                                resizeMode="cover"
                              />
                            ) : (
                              <MaterialIcons name="person" size={18} color={colors.gray3} />
                            )}
                          </View>
                          <View style={styles.managementIdentityText}>
                            <Text style={styles.managementPrimaryText}>{request.nickname}</Text>
                            <Text style={styles.managementSecondaryText}>{request.name}</Text>
                          </View>
                        </View>
                        <Text style={styles.managementMetaText}>{request.appliedAt}</Text>
                      </View>
                      <Text style={styles.managementMetaText}>{request.email}</Text>
                      <View style={styles.managementActionRow}>
                        <Pressable
                          style={({ pressed }) => [
                            styles.managementGhostButton,
                            pressed && styles.pressed,
                          ]}
                          onPress={() => handleOpenJoinRequestProfile(request.nickname)}
                        >
                          <Text style={styles.managementGhostButtonText}>프로필 보기</Text>
                        </Pressable>
                        <Pressable
                          style={({ pressed }) => [
                            styles.managementGhostButton,
                            pressed && styles.pressed,
                          ]}
                          onPress={() => setSelectedJoinRequestMessage(request)}
                        >
                          <Text style={styles.managementGhostButtonText}>가입 메시지</Text>
                        </Pressable>
                        <Pressable
                          style={({ pressed }) => [
                            styles.managementPrimarySmallButton,
                            pressed && styles.pressed,
                          ]}
                          onPress={() => setSelectedJoinRequestActionId(request.id)}
                        >
                          <Text style={styles.managementPrimarySmallButtonText}>가입 처리</Text>
                        </Pressable>
                      </View>
                    </View>
                  ))}
                  {joinRequests.length === 0 ? (
                    <View style={styles.managementEmptyCard}>
                      <Text style={styles.managementEmptyText}>대기 중인 가입 신청이 없습니다.</Text>
                    </View>
                  ) : null}
                </View>
              </>
            ) : null}

            {activeManagementScreen === 'MEMBERS' ? (
              <>
                <View style={styles.managementSummaryCard}>
                  <Text style={styles.managementSummaryTitle}>회원 역할 관리</Text>
                  <Text style={styles.managementSummaryDescription}>
                    회원 역할을 수정하거나 운영진 권한을 조정할 수 있습니다.
                  </Text>
                  <View style={styles.managementCountBadge}>
                    <Text style={styles.managementCountBadgeText}>회원 {members.length}</Text>
                  </View>
                </View>

                <View style={styles.managementCardList}>
                  {members.map((member) => (
                    <View key={member.id} style={styles.managementListCard}>
                      <View style={styles.managementListCardTop}>
                        <View style={styles.managementIdentityRow}>
                          <View style={styles.managementAvatar}>
                            {member.profileImageUrl ? (
                              <Image
                                source={{ uri: member.profileImageUrl }}
                                style={styles.managementAvatarImage}
                                resizeMode="cover"
                              />
                            ) : (
                              <MaterialIcons name="person" size={18} color={colors.gray3} />
                            )}
                          </View>
                          <View style={styles.managementIdentityText}>
                            <Text style={styles.managementPrimaryText}>{member.nickname}</Text>
                            <Text style={styles.managementSecondaryText}>{member.name}</Text>
                          </View>
                        </View>
                        <View
                          style={[
                            styles.managementRoleBadge,
                            member.role === '개설자'
                              ? styles.managementRoleBadgeOwner
                              : member.role === '운영진'
                                ? styles.managementRoleBadgeStaff
                                : styles.managementRoleBadgeMember,
                          ]}
                        >
                          <Text style={styles.managementRoleBadgeText}>{member.role}</Text>
                        </View>
                      </View>
                      <Text style={styles.managementMetaText}>{member.email}</Text>
                      <Text style={styles.managementMetaText}>가입일 {member.joinedAt}</Text>
                      <Pressable
                        style={({ pressed }) => [
                          styles.managementWideButton,
                          pressed && styles.pressed,
                        ]}
                        onPress={() => setSelectedMemberActionId(member.id)}
                      >
                        <Text style={styles.managementWideButtonText}>역할 수정</Text>
                      </Pressable>
                    </View>
                  ))}
                  {members.length === 0 ? (
                    <View style={styles.managementEmptyCard}>
                      <Text style={styles.managementEmptyText}>조회된 회원이 없습니다.</Text>
                    </View>
                  ) : null}
                </View>
              </>
            ) : null}

            {activeManagementScreen === 'EDIT' ? (
              <View style={styles.managementEditSection}>
                <View style={styles.sectionBox}>
                  <Text style={styles.sectionTitle}>모임 정보 수정하기</Text>
                  <Text style={styles.helperText}>
                    모임 생성하기처럼 한 화면에서 수정하고 저장할 수 있습니다.
                  </Text>

                  <Text style={[styles.sectionTitle, { marginTop: spacing.md }]}>
                    독서 모임 이름을 입력해주세요!
                  </Text>
                  <TextInput
                    value={editDraft.name}
                    onChangeText={(text) => setEditDraft((prev) => ({ ...prev, name: text }))}
                    placeholder="독서 모임 이름을 입력해주세요"
                    placeholderTextColor={colors.gray3}
                    style={styles.input}
                  />

                  <Text style={[styles.sectionTitle, { marginTop: spacing.lg }]}>
                    모임의 소개글을 입력해주세요!
                  </Text>
                  <TextInput
                    value={editDraft.description}
                    onChangeText={(text) => setEditDraft((prev) => ({ ...prev, description: text }))}
                    placeholder="자유롭게 입력해주세요! (500자 제한)"
                    placeholderTextColor={colors.gray3}
                    style={[styles.input, styles.textArea]}
                    multiline
                  />

                  <Text style={[styles.sectionTitle, { marginTop: spacing.lg }]}>
                    모임의 프로필 사진을 변경할 수 있어요!
                  </Text>
	                  <View style={styles.logoRow}>
	                    <View style={styles.logoPlaceholder}>
	                      {editDraft.imageUrl ? (
	                        <Image
	                          source={{ uri: editDraft.imageUrl }}
	                          style={styles.managementEditImagePreview}
	                          resizeMode="cover"
	                        />
	                      ) : (
	                        <ClubDefaultProfileArtwork variant="preview" />
	                      )}
	                    </View>
                    <View style={{ gap: spacing.xs }}>
                      <Pressable
                        style={({ pressed }) => [styles.outlineButton, pressed && styles.pressed]}
                        onPress={() =>
                          setEditDraft((prev) => ({ ...prev, imageUrl: '' }))
                        }
                      >
                        <Text style={styles.outlineButtonText}>기본 프로필 사용하기</Text>
                      </Pressable>
                      <Pressable
                        style={({ pressed }) => [styles.outlineButton, pressed && styles.pressed]}
                        onPress={handlePickClubImage}
                      >
                        <Text style={styles.outlineButtonText}>
                          {uploadingClubImage ? '업로드중...' : '사진 변경하기'}
                        </Text>
                      </Pressable>
                    </View>
                  </View>

                  <Text style={[styles.sectionTitle, { marginTop: spacing.lg }]}>
                    모임의 공개여부를 알려주세요!
                  </Text>
                  <View style={styles.managementToggleRow}>
                    <Pressable
                      style={({ pressed }) => [
                        styles.managementToggleChip,
                        !editDraft.isPrivate && styles.managementToggleChipActive,
                        pressed && styles.pressed,
                      ]}
                      onPress={() => setEditDraft((prev) => ({ ...prev, isPrivate: false }))}
                    >
                      <Text
                        style={[
                          styles.managementToggleChipText,
                          !editDraft.isPrivate && styles.managementToggleChipTextActive,
                        ]}
                      >
                        공개
                      </Text>
                    </Pressable>
                    <Pressable
                      style={({ pressed }) => [
                        styles.managementToggleChip,
                        editDraft.isPrivate && styles.managementToggleChipActive,
                        pressed && styles.pressed,
                      ]}
                      onPress={() => setEditDraft((prev) => ({ ...prev, isPrivate: true }))}
                    >
                      <Text
                        style={[
                          styles.managementToggleChipText,
                          editDraft.isPrivate && styles.managementToggleChipTextActive,
                        ]}
                      >
                        비공개
                      </Text>
                    </Pressable>
                  </View>

                  <Text style={[styles.sectionTitle, { marginTop: spacing.lg }]}>
                    선호하는 독서 카테고리를 선택해주세요!
                  </Text>
                  <View style={styles.chipGrid}>
                    {Object.keys(categoryCodeByLabel).map((category) => {
                      const active = editDraft.categories.includes(category);
                      return (
                        <Pressable
                          key={`edit-category-${category}`}
                          onPress={() =>
                            setEditDraft((prev) => ({
                              ...prev,
                              categories: prev.categories.includes(category)
                                ? prev.categories.filter((item) => item !== category)
                                : [...prev.categories, category],
                            }))
                          }
                          style={({ pressed }) => [
                            styles.chip,
                            active ? styles.chipActive : null,
                            pressed && styles.pressed,
                          ]}
                        >
                          <Text style={[styles.chipText, active ? styles.chipTextActive : null]}>
                            {category}
                          </Text>
                        </Pressable>
                      );
                    })}
                  </View>

                  <Text style={[styles.sectionTitle, { marginTop: spacing.md }]}>
                    활동 지역을 입력해주세요!
                  </Text>
                  <TextInput
                    value={editDraft.region}
                    onChangeText={(text) => setEditDraft((prev) => ({ ...prev, region: text }))}
                    placeholder="활동 지역을 입력해주세요 (40자 제한)"
                    placeholderTextColor={colors.gray3}
                    style={styles.input}
                  />

                  <Text style={[styles.sectionTitle, { marginTop: spacing.md }]}>
                    모임의 대상을 선택해주세요!
                  </Text>
                  <View style={styles.chipGrid}>
                    {Object.keys(participantCodeByLabel).map((target) => {
                      const active = editDraft.targets.includes(target);
                      return (
                        <Pressable
                          key={`edit-target-${target}`}
                          onPress={() =>
                            setEditDraft((prev) => ({
                              ...prev,
                              targets: prev.targets.includes(target)
                                ? prev.targets.filter((item) => item !== target)
                                : [...prev.targets, target],
                            }))
                          }
                          style={({ pressed }) => [
                            styles.chip,
                            active ? styles.chipActive : null,
                            pressed && styles.pressed,
                          ]}
                        >
                          <Text style={[styles.chipText, active ? styles.chipTextActive : null]}>
                            {target}
                          </Text>
                        </Pressable>
                      );
                    })}
                  </View>
                </View>
              </View>
            ) : null}

            {activeManagementScreen === 'BOOKSHELF_CREATE' ? (
              <View style={styles.managementEditSection}>
                <View style={styles.sectionBox}>
                  <Text style={styles.sectionTitle}>
                    {typeof editingBookshelfMeetingId === 'number' ? '책장 수정하기' : '책장 생성하기'}
                  </Text>
                  <Text style={styles.helperText}>
                    {typeof editingBookshelfMeetingId === 'number'
                      ? '정기모임 정보를 수정하고 저장할 수 있습니다.'
                      : '책을 선택하고 정기모임 정보까지 한 화면에서 등록할 수 있습니다.'}
                  </Text>

                  <Text style={[styles.sectionTitle, { marginTop: spacing.md }]}>
                    책 선택
                  </Text>
                  <Pressable
                    style={({ pressed }) => [
                      styles.input,
                      styles.bookshelfCreateSelector,
                      pressed && typeof editingBookshelfMeetingId !== 'number' && styles.pressed,
                      typeof editingBookshelfMeetingId === 'number' && styles.bookshelfCreateSelectorDisabled,
                    ]}
                    disabled={typeof editingBookshelfMeetingId === 'number'}
                    onPress={() => setBookshelfBookSelectorVisible(true)}
                  >
                    <Text
                      style={[
                        styles.bookshelfCreateSelectorText,
                        !bookshelfCreateDraft.sourceBook && styles.bookshelfCreateSelectorPlaceholder,
                      ]}
                    >
                      {bookshelfCreateDraft.sourceBook
                        ? bookshelfCreateDraft.sourceBook.title
                        : '선택하기'}
                    </Text>
                  </Pressable>
                  {typeof editingBookshelfMeetingId === 'number' ? (
                    <Text style={styles.helperText}>수정 모드에서는 책을 변경할 수 없습니다.</Text>
                  ) : null}

                  <Text style={[styles.sectionTitle, { marginTop: spacing.md }]}>
                    기수
                  </Text>
                  <TextInput
                    value={bookshelfCreateDraft.session}
                    onChangeText={(text) =>
                      setBookshelfCreateDraft((prev) => ({
                        ...prev,
                        session: sanitizeGenerationInput(text),
                      }))
                    }
                    placeholder="예: 7"
                    placeholderTextColor={colors.gray3}
                    keyboardType="number-pad"
                    style={styles.input}
                  />
                  <Text style={styles.helperText}>
                    입력한 숫자는 책장에서 {formatGenerationLabel(bookshelfCreateDraft.session || '1')} 형태로 표시됩니다.
                  </Text>

                  <Text style={[styles.sectionTitle, { marginTop: spacing.md }]}>
                    태그
                  </Text>
                  <View style={styles.chipGrid}>
                    {Object.keys(categoryCodeByLabel).map((category) => {
                      const active = bookshelfCreateDraft.categories.includes(category);
                      return (
                        <Pressable
                          key={`bookshelf-create-category-${category}`}
                          onPress={() =>
                            setBookshelfCreateDraft((prev) => ({
                              ...prev,
                              categories: prev.categories.includes(category)
                                ? []
                                : [category],
                            }))
                          }
                          style={({ pressed }) => [
                            styles.chip,
                            active ? styles.chipActive : null,
                            pressed && styles.pressed,
                          ]}
                        >
                          <Text style={[styles.chipText, active ? styles.chipTextActive : null]}>
                            {category}
                          </Text>
                        </Pressable>
                      );
                    })}
                  </View>
                  <Text style={styles.helperText}>태그는 1개만 선택해 등록할 수 있습니다.</Text>

                  <Text style={[styles.sectionTitle, { marginTop: spacing.md }]}>
                    정기모임 이름
                  </Text>
                  <TextInput
                    value={bookshelfCreateDraft.regularMeetingName}
                    onChangeText={(text) =>
                      setBookshelfCreateDraft((prev) => ({ ...prev, regularMeetingName: text }))
                    }
                    placeholder="정기모임 이름을 입력해주세요"
                    placeholderTextColor={colors.gray3}
                    maxLength={BOOKSHELF_MEETING_TITLE_MAX_LENGTH}
                    style={styles.input}
                  />

                  <Text style={[styles.sectionTitle, { marginTop: spacing.md }]}>
                    모임 장소
                  </Text>
                  <TextInput
                    value={bookshelfCreateDraft.meetingLocation}
                    onChangeText={(text) =>
                      setBookshelfCreateDraft((prev) => ({ ...prev, meetingLocation: text }))
                    }
                    placeholder="모임 장소를 입력해주세요"
                    placeholderTextColor={colors.gray3}
                    maxLength={BOOKSHELF_MEETING_LOCATION_MAX_LENGTH}
                    style={styles.input}
                  />

                  <Text style={[styles.sectionTitle, { marginTop: spacing.md }]}>
                    모임 날짜
                  </Text>
                  <Pressable
                    style={({ pressed }) => [
                      styles.input,
                      styles.bookshelfDatePickerButton,
                      pressed && styles.pressed,
                    ]}
                    onPress={openBookshelfCalendar}
                  >
                    <View style={styles.bookshelfDatePickerValueRow}>
                      <View style={styles.bookshelfDatePickerIconWrap}>
                        <MaterialIcons
                          name="calendar-month"
                          size={18}
                          color={
                            bookshelfCreateDraft.meetingDate ? colors.primary1 : colors.gray4
                          }
                        />
                      </View>
                      <Text
                        style={[
                          styles.bookshelfDatePickerText,
                          !bookshelfCreateDraft.meetingDate &&
                            styles.bookshelfDatePickerPlaceholder,
                        ]}
                      >
                        {bookshelfCreateDraft.meetingDate || '날짜를 선택해주세요'}
                      </Text>
                    </View>
                    <MaterialIcons name="chevron-right" size={20} color={colors.gray4} />
                  </Pressable>
                  <Text style={styles.helperText}>달력에서 날짜를 선택해주세요.</Text>
                </View>
              </View>
            ) : null}
            </ScrollView>

            {activeManagementScreen === 'EDIT' || activeManagementScreen === 'BOOKSHELF_CREATE' ? (
              <View style={styles.managementFooter}>
                {activeManagementScreen === 'BOOKSHELF_CREATE' &&
                typeof editingBookshelfMeetingId === 'number' ? (
                  <View style={styles.managementFooterButtonRow}>
                    <Pressable
                      style={({ pressed }) => [
                        styles.outlineButton,
                        styles.managementFooterButton,
                        styles.managementFooterDangerButton,
                        (updatingBookshelf || deletingBookshelf) && styles.managementFooterDangerButtonDisabled,
                        pressed && !(updatingBookshelf || deletingBookshelf) && styles.pressed,
                      ]}
                      onPress={handleDeleteEditingBookshelf}
                      disabled={updatingBookshelf || deletingBookshelf}
                    >
                      <Text style={styles.managementFooterDangerButtonText}>
                        {deletingBookshelf ? '삭제중...' : '삭제하기'}
                      </Text>
                    </Pressable>
                    <Pressable
                      style={({ pressed }) => [
                        styles.primaryButton,
                        styles.managementFooterButton,
                        (updatingBookshelf || deletingBookshelf) && styles.primaryButtonDisabled,
                        pressed && !(updatingBookshelf || deletingBookshelf) && styles.pressed,
                      ]}
                      onPress={handleSubmitBookshelfCreate}
                      disabled={updatingBookshelf || deletingBookshelf}
                    >
                      <Text style={styles.primaryButtonText}>
                        {updatingBookshelf ? '저장중...' : '저장하기'}
                      </Text>
                    </Pressable>
                  </View>
                ) : (
                  <Pressable
                    style={({ pressed }) => [
                      styles.primaryButton,
                      styles.managementFooterButton,
                      activeManagementScreen === 'BOOKSHELF_CREATE' &&
                      creatingBookshelf &&
                      styles.primaryButtonDisabled,
                      pressed &&
                      !(activeManagementScreen === 'BOOKSHELF_CREATE' && creatingBookshelf) &&
                      styles.pressed,
                    ]}
                    onPress={
                      activeManagementScreen === 'EDIT'
                        ? handleSaveGroupEdit
                        : handleSubmitBookshelfCreate
                    }
                    disabled={activeManagementScreen === 'BOOKSHELF_CREATE' && creatingBookshelf}
                  >
                    <Text style={styles.primaryButtonText}>
                      {activeManagementScreen === 'EDIT'
                        ? '저장하기'
                        : creatingBookshelf
                          ? '등록중...'
                          : '등록하기'}
                    </Text>
                  </Pressable>
                )}
              </View>
            ) : null}
            {selectedJoinRequestMessage ? (
              <Pressable
                style={styles.managementInlineOverlay}
                onPress={() => setSelectedJoinRequestMessage(null)}
              >
                <Pressable
                  style={styles.managementMessageCard}
                  onPress={(event) => event.stopPropagation()}
                >
                  <Text style={styles.managementMessageTitle}>가입 메시지</Text>
                  <ScrollView
                    style={styles.managementMessageScroll}
                    showsVerticalScrollIndicator={false}
                  >
                    <Text style={styles.managementMessageBody}>
                      {selectedJoinRequestMessage.message}
                    </Text>
                  </ScrollView>
                </Pressable>
              </Pressable>
            ) : null}
            {selectedJoinRequestAction ? (
              <Pressable
                style={styles.managementInlineOverlay}
                onPress={() => {
                  if (submittingJoinRequestAction) return;
                  setSelectedJoinRequestActionId(null);
                }}
              >
                <Pressable
                  style={styles.managementJoinActionCard}
                  onPress={(event) => event.stopPropagation()}
                >
                  <Text style={styles.managementJoinActionTitle}>가입 처리</Text>
                  <Pressable
                    style={({ pressed }) => [
                      styles.managementJoinActionItem,
                      submittingJoinRequestAction && styles.managementJoinActionItemDisabled,
                      pressed && !submittingJoinRequestAction && styles.pressed,
                    ]}
                    disabled={submittingJoinRequestAction}
                    onPress={() => handleProcessJoinRequest(selectedJoinRequestAction, 'REJECT')}
                  >
                    <MaterialIcons
                      name="delete-outline"
                      size={34}
                      color={submittingJoinRequestAction ? colors.gray3 : colors.gray5}
                    />
                    <Text
                      style={[
                        styles.managementJoinActionItemText,
                        submittingJoinRequestAction && styles.managementJoinActionItemTextDisabled,
                      ]}
                    >
                      삭제하기
                    </Text>
                  </Pressable>
                  <Pressable
                    style={({ pressed }) => [
                      styles.managementJoinActionItem,
                      styles.managementJoinActionItemLast,
                      submittingJoinRequestAction && styles.managementJoinActionItemDisabled,
                      pressed && !submittingJoinRequestAction && styles.pressed,
                    ]}
                    disabled={submittingJoinRequestAction}
                    onPress={() => handleProcessJoinRequest(selectedJoinRequestAction, 'APPROVE')}
                  >
                    <MaterialIcons
                      name="check-circle-outline"
                      size={34}
                      color={submittingJoinRequestAction ? colors.gray3 : colors.gray5}
                    />
                    <Text
                      style={[
                        styles.managementJoinActionItemText,
                        submittingJoinRequestAction && styles.managementJoinActionItemTextDisabled,
                      ]}
                    >
                      {submittingJoinRequestAction ? '처리중...' : '가입처리'}
                    </Text>
                  </Pressable>
                </Pressable>
              </Pressable>
            ) : null}
            {selectedMemberAction ? (
              <Pressable
                style={styles.managementInlineOverlay}
                onPress={() => {
                  if (submittingMemberAction) return;
                  setSelectedMemberActionId(null);
                }}
              >
                <Pressable
                  style={styles.managementRoleMenuCard}
                  onPress={(event) => event.stopPropagation()}
                >
                  <Text style={styles.managementRoleMenuTitle}>역할 수정</Text>
                  {[
                    {
                      key: '운영진' as const,
                      label: '운영진 역할',
                      icon: 'workspace-premium' as const,
                      disabled:
                        submittingMemberAction ||
                        selectedMemberAction.role === '운영진' ||
                        selectedMemberAction.role === '개설자',
                      onPress: () => handleChangeMemberRole(selectedMemberAction.id, '운영진'),
                    },
                    {
                      key: '회원' as const,
                      label: '회원 역할',
                      icon: 'person-outline' as const,
                      disabled:
                        submittingMemberAction ||
                        selectedMemberAction.role === '회원' ||
                        selectedMemberAction.role === '개설자',
                      onPress: () => handleChangeMemberRole(selectedMemberAction.id, '회원'),
                    },
                    {
                      key: '개설자' as const,
                      label: '개설자 역할',
                      icon: 'schedule' as const,
                      disabled:
                        submittingMemberAction || selectedMemberAction.role === '개설자',
                      onPress: () => handleChangeMemberRole(selectedMemberAction.id, '개설자'),
                    },
                  ].map((item) => (
                    <Pressable
                      key={`${selectedMemberAction.id}-${item.key}`}
                      style={({ pressed }) => [
                        styles.managementRoleMenuItem,
                        item.disabled && styles.managementRoleMenuItemDisabled,
                        pressed && !item.disabled && styles.pressed,
                      ]}
                      disabled={item.disabled}
                      onPress={item.onPress}
                    >
                      <MaterialIcons
                        name={item.icon}
                        size={34}
                        color={item.disabled ? colors.gray3 : colors.gray5}
                      />
                      <Text
                        style={[
                          styles.managementRoleMenuItemText,
                          item.disabled && styles.managementRoleMenuItemTextDisabled,
                        ]}
                      >
                        {item.label}
                      </Text>
                    </Pressable>
                  ))}
                  <Pressable
                    style={({ pressed }) => [
                      styles.managementRoleMenuItem,
                      styles.managementRoleMenuItemLast,
                      (selectedMemberAction.role === '개설자' || submittingMemberAction) &&
                        styles.managementRoleMenuItemDisabled,
                      pressed &&
                        selectedMemberAction.role !== '개설자' &&
                        !submittingMemberAction &&
                        styles.pressed,
                    ]}
                    disabled={selectedMemberAction.role === '개설자' || submittingMemberAction}
                    onPress={() => handleRemoveMember(selectedMemberAction.id)}
                  >
                    <MaterialIcons
                      name="logout"
                      size={34}
                      color={
                        selectedMemberAction.role === '개설자' || submittingMemberAction
                          ? colors.gray3
                          : colors.gray5
                      }
                    />
                    <Text
                      style={[
                        styles.managementRoleMenuItemText,
                        (selectedMemberAction.role === '개설자' || submittingMemberAction) &&
                          styles.managementRoleMenuItemTextDisabled,
                      ]}
                    >
                      회원 탈퇴
                    </Text>
                  </Pressable>
                </Pressable>
              </Pressable>
            ) : null}
          </KeyboardAvoidingView>
        ) : (
          <Pressable
            style={styles.managementOverlay}
            onPress={closeManagementMenu}
          >
            <Pressable
              style={styles.managementMenuSheet}
              onPress={(event) => event.stopPropagation()}
            >
              <View style={styles.managementHandle} />
              <Text style={styles.managementMenuTitle}>모임 관리하기</Text>
              <Text style={styles.managementMenuCaption}>
                운영진용 관리 기능을 선택해주세요.
              </Text>
              {[
                {
                  key: 'JOIN_REQUESTS' as const,
                  title: '모임 가입 신청 관리',
                  description: `${joinRequests.length}개의 대기 신청`,
                  icon: 'person-add-alt-1' as const,
                  onPress: () => handleOpenManagementScreen('JOIN_REQUESTS'),
                },
                {
                  key: 'MEMBERS' as const,
                  title: '모임 회원 관리',
                  description: `${members.length}명의 모임 회원`,
                  icon: 'groups' as const,
                  onPress: () => handleOpenManagementScreen('MEMBERS'),
                },
                {
                  key: 'EDIT' as const,
                  title: '모임 수정하기',
                  description: '소개, 태그, 공개 여부 수정',
                  icon: 'edit' as const,
                  onPress: () => handleOpenManagementScreen('EDIT'),
                },
                {
                  key: 'NOTICE_CREATE' as const,
                  title: '공지 작성하기',
                  description: '책장, 투표, 사진 첨부 가능',
                  icon: 'edit-note' as const,
                  onPress: handleOpenNoticeComposerFromManagement,
                },
                {
                  key: 'BOOKSHELF_CREATE' as const,
                  title: '책장 생성하기',
                  description: '정기모임용 책장 추가',
                  icon: 'library-add' as const,
                  onPress: () => handleOpenManagementScreen('BOOKSHELF_CREATE'),
                },
                {
                  key: 'DELETE_CLUB' as const,
                  title: '모임 삭제하기',
                  description: '삭제 후 복구할 수 없습니다',
                  icon: 'delete-outline' as const,
                  onPress: handleDeleteManagedClub,
                },
              ].map((item) => (
                <Pressable
                  key={item.key}
                  style={({ pressed }) => [
                    styles.managementMenuItem,
                    pressed && styles.pressed,
                  ]}
                  onPress={item.onPress}
                >
                  <View style={styles.managementMenuIcon}>
                    <MaterialIcons name={item.icon} size={20} color={colors.primary1} />
                  </View>
                  <View style={styles.managementMenuTextWrap}>
                    <Text style={styles.managementMenuItemTitle}>{item.title}</Text>
                    <Text style={styles.managementMenuItemDescription}>{item.description}</Text>
                  </View>
                  <MaterialIcons name="chevron-right" size={20} color={colors.gray4} />
                </Pressable>
              ))}
            </Pressable>
          </Pressable>
        )}
      </Modal>
      <ReportMemberModal
        visible={Boolean(reportModal)}
        target={reportModal}
        submitting={submittingReport}
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
                placeholder="제목을 입력해주세요."
                placeholderTextColor={colors.gray3}
                style={styles.input}
              />

              <Text style={styles.noticeComposerLabel}>내용</Text>
              <TextInput
                value={noticeDraft.content}
                onChangeText={(text) => setNoticeDraft((prev) => ({ ...prev, content: text }))}
                placeholder="내용을 입력해주세요."
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
                    {uploadingNoticePhoto ? '업로드중' : '사진'}
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
                    <Text style={styles.helperText}>연결할 책장을 선택해주세요.</Text>
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
      <Modal
        visible={noticeBookSelectorVisible}
        transparent
        animationType="fade"
        onRequestClose={() => setNoticeBookSelectorVisible(false)}
      >
        <Pressable
          style={styles.managementOverlay}
          onPress={() => setNoticeBookSelectorVisible(false)}
        >
          <Pressable
            style={styles.noticeBookSelectorCard}
            onPress={(event) => event.stopPropagation()}
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
          </Pressable>
        </Pressable>
      </Modal>
      <Modal
        visible={noticeMenuVisible}
        transparent
        animationType="fade"
        onRequestClose={() => setNoticeMenuVisible(false)}
      >
        <Pressable
          style={styles.managementOverlayBottom}
          onPress={() => setNoticeMenuVisible(false)}
        >
          {selectedNotice ? (
            <Pressable
              style={styles.managementBottomSheet}
              onPress={(event) => event.stopPropagation()}
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
      <Modal
        visible={bookshelfCalendarVisible}
        transparent
        animationType="fade"
        onRequestClose={closeBookshelfCalendar}
      >
        <Pressable
          style={styles.managementCenteredOverlay}
          onPress={closeBookshelfCalendar}
        >
          <Pressable
            style={styles.bookshelfCalendarCard}
            onPress={(event) => event.stopPropagation()}
          >
            <View style={styles.managementModalHeader}>
              <Text style={styles.managementModalTitle}>모임 날짜 선택</Text>
              <Pressable onPress={closeBookshelfCalendar} hitSlop={8}>
                <MaterialIcons name="close" size={20} color={colors.gray6} />
              </Pressable>
            </View>
            <View style={styles.bookshelfCalendarMonthRow}>
              <Pressable
                style={({ pressed }) => [
                  styles.bookshelfCalendarMonthButton,
                  pressed && styles.pressed,
                ]}
                onPress={() =>
                  setBookshelfCalendarMonth(
                    (prev) => new Date(prev.getFullYear(), prev.getMonth() - 1, 1),
                  )
                }
              >
                <MaterialIcons name="chevron-left" size={20} color={colors.gray6} />
              </Pressable>
              <Text style={styles.bookshelfCalendarMonthText}>
                {formatCalendarMonthLabel(bookshelfCalendarMonth)}
              </Text>
              <Pressable
                style={({ pressed }) => [
                  styles.bookshelfCalendarMonthButton,
                  pressed && styles.pressed,
                ]}
                onPress={() =>
                  setBookshelfCalendarMonth(
                    (prev) => new Date(prev.getFullYear(), prev.getMonth() + 1, 1),
                  )
                }
              >
                <MaterialIcons name="chevron-right" size={20} color={colors.gray6} />
              </Pressable>
            </View>
            <View style={styles.bookshelfCalendarWeekRow}>
              {calendarWeekdayLabels.map((label) => (
                <Text key={`bookshelf-calendar-weekday-${label}`} style={styles.bookshelfCalendarWeekLabel}>
                  {label}
                </Text>
              ))}
            </View>
            <View style={styles.bookshelfCalendarGrid}>
              {bookshelfCalendarDays.map((day) => {
                const selected = bookshelfCreateDraft.meetingDate === day.value;
                return (
                  <Pressable
                    key={day.key}
                    style={({ pressed }) => [
                      styles.bookshelfCalendarDay,
                      pressed && styles.pressed,
                    ]}
                    onPress={() => handleSelectBookshelfMeetingDate(day.value)}
                  >
                    <View
                      style={[
                        styles.bookshelfCalendarDayInner,
                        day.inCurrentMonth
                          ? styles.bookshelfCalendarDayCurrentMonth
                          : styles.bookshelfCalendarDayOutside,
                        day.isToday && styles.bookshelfCalendarDayToday,
                        selected && styles.bookshelfCalendarDaySelected,
                      ]}
                    >
                      <Text
                        style={[
                          styles.bookshelfCalendarDayLabel,
                          !day.inCurrentMonth && styles.bookshelfCalendarDayLabelOutside,
                          selected && styles.bookshelfCalendarDayLabelSelected,
                        ]}
                      >
                        {day.label}
                      </Text>
                    </View>
                  </Pressable>
                );
              })}
            </View>
            <View style={styles.bookshelfCalendarFooter}>
              <Text style={styles.bookshelfCalendarFooterHint}>
                선택한 날짜가 바로 적용됩니다.
              </Text>
              <Pressable
                style={({ pressed }) => [
                  styles.bookshelfCalendarTodayButton,
                  pressed && styles.pressed,
                ]}
                onPress={handlePickTodayBookshelfMeetingDate}
              >
                <Text style={styles.bookshelfCalendarTodayButtonText}>오늘</Text>
              </Pressable>
            </View>
          </Pressable>
        </Pressable>
      </Modal>
      {activeTab === 'bookshelf' &&
      bookshelfViewMode === 'REGULAR_GROUP' &&
      selectedRegularGroup ? (
        <FloatingActionButton onPress={handleOpenRegularChatPicker}>
          <MaterialIcons name="chat-bubble-outline" size={20} color={colors.white} />
        </FloatingActionButton>
      ) : null}
      <Modal
        visible={contactModalVisible}
        transparent
        animationType="fade"
        onRequestClose={closeContactModal}
      >
        <Pressable style={styles.contactModalOverlay} onPress={closeContactModal}>
          <Pressable
            style={styles.contactModalCard}
            onPress={(event) => event.stopPropagation()}
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
          </Pressable>
        </Pressable>
      </Modal>
      <Modal
        visible={regularChatPickerVisible}
        transparent
        animationType="fade"
        onRequestClose={handleCloseRegularChat}
      >
        <Pressable style={styles.regularChatModalOverlay} onPress={handleCloseRegularChat}>
          <Pressable
            style={styles.regularChatPickerCard}
            onPress={(event) => event.stopPropagation()}
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
          </Pressable>
        </Pressable>
      </Modal>
      <Modal
        visible={Boolean(activeRegularChatGroup)}
        transparent
        animationType="slide"
        onRequestClose={handleCloseRegularChat}
      >
        <Pressable style={styles.regularChatModalOverlay} onPress={handleCloseRegularChat}>
          {activeRegularChatGroup ? (
            <Pressable
              style={styles.regularChatRoomCard}
              onPress={(event) => event.stopPropagation()}
            >
              <View style={styles.regularChatHeader}>
                <View style={styles.regularChatHeaderLeft}>
                  <Pressable onPress={handleBackToRegularChatPicker} hitSlop={8}>
                    <MaterialIcons name="chevron-left" size={20} color={colors.gray6} />
                  </Pressable>
                  <Text style={styles.regularChatTitle}>{activeRegularChatGroup.label}</Text>
                </View>
                <Pressable onPress={handleCloseRegularChat} hitSlop={8}>
                  <MaterialIcons name="close" size={20} color={colors.gray6} />
                </Pressable>
              </View>
              <ScrollView
                style={styles.regularChatMessages}
                contentContainerStyle={styles.regularChatMessagesContent}
                showsVerticalScrollIndicator={false}
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
                          <MaterialIcons name="person" size={16} color={colors.gray3} />
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
              <View style={styles.regularChatInputRow}>
                <TextInput
                  style={styles.regularChatInput}
                  placeholder="채팅 입력"
                  placeholderTextColor={colors.gray3}
                  value={regularChatInput}
                  onChangeText={setRegularChatInput}
                  editable={!submittingRegularChat}
                  onSubmitEditing={handleSubmitRegularChat}
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
            </Pressable>
          ) : null}
        </Pressable>
      </Modal>
      <Modal
        visible={Boolean(voteVotersModal)}
        transparent
        animationType="fade"
        onRequestClose={() => setVoteVotersModal(null)}
      >
        <Pressable
          style={styles.voteVotersModalOverlay}
          onPress={() => setVoteVotersModal(null)}
        >
          {voteVotersModal ? (
            <Pressable
              style={styles.voteVotersModalCard}
              onPress={(event) => event.stopPropagation()}
            >
              <Text style={styles.voteVotersModalTitle}>{voteVotersModal.optionLabel}</Text>
              <View style={styles.voteVotersList}>
                {voteVotersModal.voters.map((nickname, index) => (
                  <View key={`${nickname}-${index}`} style={styles.voteVotersRow}>
                    <View style={styles.voteVotersAvatar}>
                      <MaterialIcons name="person-outline" size={16} color={colors.gray4} />
                    </View>
                    <Text style={styles.voteVotersName}>{nickname}</Text>
                  </View>
                ))}
                {voteVotersModal.voters.length === 0 ? (
                  <Text style={styles.voteVotersEmptyText}>아직 투표자가 없습니다.</Text>
                ) : null}
              </View>
            </Pressable>
          ) : null}
        </Pressable>
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

    Alert.alert('알림', '현재 페이지는 저장 되지 않습니다.', [
      { text: '취소', style: 'cancel' },
      { text: '닫기', style: 'destructive', onPress: onClose },
    ]);
  }, [isDirty, onClose]);

  const handleCheckName = async () => {
    const normalized = name.trim();
    if (!normalized) {
      showToast('모임 이름을 입력해주세요.');
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
      showToast('카테고리와 모임 대상을 확인해주세요.');
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
    if (step < 4) setStep((prev) => (prev + 1) as CreateStep);
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
              return (
                <View
                  key={i}
                  style={[styles.stepDot, active ? styles.stepDotActive : styles.stepDotInactive]}
                >
                  <Text style={[styles.stepText, active ? styles.stepTextActive : null]}>{i}</Text>
                </View>
              );
            })}
          </View>

          {step === 1 && (
            <View style={styles.sectionBox}>
              <Text style={styles.sectionTitle}>독서 모임 이름을 입력해주세요!</Text>
              <View style={styles.inlineRow}>
                <TextInput
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
                    {checkingName ? '확인중...' : '중복확인'}
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
              <TextInput
                value={desc}
                onChangeText={setDesc}
                placeholder="자유롭게 입력해주세요! (500자 제한)"
                placeholderTextColor={colors.gray3}
                style={[styles.input, styles.textArea]}
                multiline
              />
            </View>
          )}

          {step === 2 && (
            <View style={styles.sectionBox}>
              <Text style={styles.sectionTitle}>모임의 프로필 사진을 업로드 해주세요!</Text>
              <View style={styles.createProfileCard}>
                <View style={styles.logoRow}>
                  <Pressable
                    style={({ pressed }) => [
                      styles.createProfilePreview,
                      clubImageMode === 'empty' && styles.createProfilePreviewEmpty,
                      pressed && styles.pressed,
                    ]}
                    onPress={handlePickClubImage}
                  >
                    {clubImageMode === 'uploaded' && clubImageUrl ? (
                      <Image
                        source={{ uri: clubImageUrl }}
                        style={styles.managementEditImagePreview}
                        resizeMode="cover"
                      />
                    ) : clubImageMode === 'default' ? (
                      <ClubDefaultProfileArtwork variant="preview" />
                    ) : (
                      <View style={styles.createProfileEmptyState}>
                        <View style={styles.createProfileCameraBadge}>
                          <MaterialIcons name="photo-camera" size={26} color={colors.primary1} />
                        </View>
                        <Text style={styles.createProfileEmptyTitle}>사진 업로드</Text>
                        <Text style={styles.createProfileEmptyDescription}>
                          비어 있는 박스를 눌러 사진을 선택하세요
                        </Text>
                      </View>
                    )}
                  </Pressable>

                  <View style={styles.createProfileActionColumn}>
                    <Pressable
                      style={({ pressed }) => [
                        styles.createProfileActionButton,
                        clubImageMode === 'default' && styles.createProfileActionButtonSelected,
                        pressed && styles.pressed,
                      ]}
                      onPress={handleUseDefaultClubImage}
                    >
                      <View
                        style={[
                          styles.createProfileActionIcon,
                          clubImageMode === 'default' && styles.createProfileActionIconSelected,
                        ]}
                      >
                        <MaterialIcons
                          name="auto-awesome"
                          size={16}
                          color={clubImageMode === 'default' ? colors.white : colors.primary1}
                        />
                      </View>
                      <View style={styles.createProfileActionTextWrap}>
                        <Text
                          style={[
                            styles.createProfileActionTitle,
                            clubImageMode === 'default' && styles.createProfileActionTitleSelected,
                          ]}
                        >
                          기본 프로필 사용하기
                        </Text>
                        <Text
                          style={[
                            styles.createProfileActionDescription,
                            clubImageMode === 'default' &&
                              styles.createProfileActionDescriptionSelected,
                          ]}
                        >
                          책모 로고가 모임 대표 이미지로 표시됩니다.
                        </Text>
                      </View>
                    </Pressable>

                    <Pressable
                      style={({ pressed }) => [
                        styles.createProfileActionButton,
                        styles.createProfileActionButtonPrimary,
                        uploadingClubImage && styles.createProfileActionButtonDisabled,
                        pressed && !uploadingClubImage && styles.pressed,
                      ]}
                      onPress={handlePickClubImage}
                      disabled={uploadingClubImage}
                    >
                      <View style={[styles.createProfileActionIcon, styles.createProfileActionIconPrimary]}>
                        <MaterialIcons name="photo-camera" size={16} color={colors.white} />
                      </View>
                      <View style={styles.createProfileActionTextWrap}>
                        <Text style={[styles.createProfileActionTitle, styles.createProfileActionTitlePrimary]}>
                          {uploadingClubImage ? '업로드중...' : '사진 업로드하기'}
                        </Text>
                        <Text
                          style={[
                            styles.createProfileActionDescription,
                            styles.createProfileActionDescriptionPrimary,
                          ]}
                        >
                          앨범에서 모임 이미지를 선택할 수 있어요.
                        </Text>
                      </View>
                    </Pressable>
                  </View>
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
              <TextInput
                value={region}
                onChangeText={setRegion}
                placeholder="활동 지역을 입력해주세요 (40자 제한)"
                placeholderTextColor={colors.gray3}
                style={styles.input}
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
                  <TextInput
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
                  />
                  <TextInput
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
                  />
                </View>
              ))}
              <Pressable
                style={({ pressed }) => [styles.addLinkButton, pressed && styles.pressed]}
                onPress={() => setLinks((prev: LinkItem[]) => [...prev, { text: '', url: '' }])}
              >
                <Text style={styles.addLinkText}>+</Text>
              </Pressable>
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
