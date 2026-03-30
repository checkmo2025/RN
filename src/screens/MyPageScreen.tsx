import { useMemo, useState, useCallback, useEffect, useRef } from 'react';
import {
  Alert,
  Animated,
  Easing,
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
  Image,
  RefreshControl,
  Linking,
  useWindowDimensions,
} from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { SvgUri } from 'react-native-svg';
import { useFocusEffect, useNavigation, useRoute } from '@react-navigation/native';
import * as ImagePicker from 'expo-image-picker';

import { PUBLIC_ENV } from '../constants/publicEnv';
import { colors, radius, spacing, typography } from '../theme';
import { DefaultProfileAvatar } from '../components/common/DefaultProfileAvatar';
import { ScreenLayout } from '../components/common/ScreenLayout';
import { useAuthGate } from '../contexts/AuthGateContext';
import { issueProfileImageUploadUrl, logoutSession } from '../services/api/authApi';
import { ApiError } from '../services/api/http';
import {
  fetchAllMyLikedBooks,
  toggleBookLikeByIsbn,
  type MemberLikedBookItem,
} from '../services/api/bookApi';
import { fetchMyBookStories } from '../services/api/bookStoryApi';
import { fetchMyClubs, leaveClub } from '../services/api/clubApi';
import {
  deleteFollowerMember,
  fetchMyFollowCount,
  fetchMyReports,
  fetchMyFollowers,
  fetchMyFollowing,
  fetchMyProfile,
  setFollowingMember,
  updateMyEmail,
  updateMyPassword,
  updateMyProfile,
  withdrawMember,
  type ReportItem,
} from '../services/api/memberApi';
import {
  fetchNotifications,
  fetchNotificationSettings,
  markNotificationAsRead,
  toggleNotificationSetting,
  type NotificationItem,
  type NotificationSettingInfo,
  type NotificationSettingType,
} from '../services/api/notificationApi';
import { fetchMyNewsList, type RemoteNewsSummary } from '../services/api/newsApi';
import { formatKstDateLabel, toKstTimeAgoLabel } from '../utils/date';
import { normalizeRemoteImageUrl } from '../utils/image';
import { formatNotificationText, resolveNotificationTarget } from '../utils/notification';
import { showToast } from '../utils/toast';

const tabs = ['내 책 이야기', '내 서재', '내 모임', '내 알림'] as const;
type TabKey = (typeof tabs)[number];

type StoryCard = {
  id: string;
  remoteId?: number;
  title: string;
  excerpt: string;
  imageUrl?: string;
  likes: number;
  comments: number;
};

type BookCard = {
  id: string;
  isbn: string;
  bookId?: number;
  title: string;
  author: string;
  imageUrl?: string;
};

type GroupItem = {
  id: string;
  clubId?: number;
  name: string;
};

type MyNewsItem = {
  id: string;
  newsId: number;
  title: string;
  excerpt: string;
  date: string;
  thumbnailUrl?: string;
};

type AlarmItem = {
  id: string;
  notificationId: number;
  notificationType: NotificationItem['notificationType'];
  domainId?: number;
  sourceId?: number;
  displayName: string;
  text: string;
  time: string;
  unread?: boolean;
};

type FollowUser = {
  nickname: string;
  profileImageUrl?: string;
  following: boolean;
};

type ReportHistoryItem = {
  id: string;
  reportType: string;
  reportedMemberNickname: string;
  content: string;
  createdAtLabel: string;
};

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

const profileEditCategoryOrder = [
  'TRAVEL',
  'FOREIGN_LANGUAGE',
  'CHILDREN_BOOKS',
  'RELIGION_PHILOSOPHY',
  'FICTION_POETRY_DRAMA',
  'ESSAY',
  'HUMANITIES',
  'SCIENCE',
  'COMPUTER_IT',
  'ECONOMY_MANAGEMENT',
  'SELF_DEVELOPMENT',
  'SOCIAL_SCIENCE',
  'POLITICS_DIPLOMACY_DEFENSE',
  'HISTORY_CULTURE',
  'ART_POP_CULTURE',
] as const;

const categoryChipColorByCode: Record<string, string> = {
  TRAVEL: colors.secondary2,
  FOREIGN_LANGUAGE: colors.secondary2,
  CHILDREN_BOOKS: colors.secondary2,
  RELIGION_PHILOSOPHY: colors.secondary2,
  FICTION_POETRY_DRAMA: colors.secondary1,
  ESSAY: colors.secondary1,
  HUMANITIES: colors.secondary1,
  SCIENCE: colors.secondary3,
  COMPUTER_IT: colors.secondary3,
  ECONOMY_MANAGEMENT: colors.secondary3,
  SELF_DEVELOPMENT: colors.secondary3,
  SOCIAL_SCIENCE: colors.secondary4,
  POLITICS_DIPLOMACY_DEFENSE: colors.secondary4,
  HISTORY_CULTURE: colors.secondary4,
  ART_POP_CULTURE: colors.secondary4,
};

const defaultProfilePalette = [
  colors.subbrown3,
  colors.primary2,
  colors.primary1,
  colors.subbrown1,
  colors.primary3,
  colors.gray2,
  colors.gray4,
  colors.gray5,
  colors.gray6,
  colors.gray7,
];

const fallbackStories: StoryCard[] = Array.from({ length: 6 }).map((_, idx) => ({
  id: `s-${idx}`,
  title: '나는 나이든 왕자다',
  excerpt: '나는 나이트 왕자다. 그 누가 숫자가 중요하다가 했던가. 세고 또...',
  likes: 1 + (idx % 3),
  comments: 1 + (idx % 2),
}));

const fallbackGroups: GroupItem[] = Array.from({ length: 5 }).map((_, idx) => ({
  id: `g-${idx}`,
  name: '복적복적',
}));

const fallbackBooks: BookCard[] = [];

const defaultNotificationSettings: NotificationSettingInfo = {
  bookStoryLiked: true,
  bookStoryComment: true,
  clubNoticeCreated: true,
  clubMeetingCreated: true,
  newFollower: true,
  joinClub: true,
};

const notificationSettingRows: Array<{
  type: NotificationSettingType;
  label: string;
  key: keyof NotificationSettingInfo;
}> = [
  { type: 'BOOK_STORY_LIKED', label: '책 이야기 좋아요 알림', key: 'bookStoryLiked' },
  { type: 'BOOK_STORY_COMMENT', label: '책 이야기 댓글 알림', key: 'bookStoryComment' },
  { type: 'NEW_FOLLOWER', label: '구독자 알림', key: 'newFollower' },
  { type: 'JOIN_CLUB', label: '독서 모임 가입 알림', key: 'joinClub' },
  { type: 'CLUB_MEETING_CREATED', label: '모임 일정 알림', key: 'clubMeetingCreated' },
  { type: 'CLUB_NOTICE_CREATED', label: '공지사항 알림', key: 'clubNoticeCreated' },
];

const reportTypeLabelByCode: Record<string, string> = {
  GENERAL: '일반',
  CLUB_MEETING: '독서 모임',
  BOOK_STORY: '책 이야기',
  COMMENT: '댓글',
};

type GroupMenuState = {
  group: GroupItem;
  pageX: number;
  pageY: number;
};

function normalizeImageUrl(url?: string): string | undefined {
  return normalizeRemoteImageUrl(url);
}

function inferMimeType(fileName?: string, fallback?: string): string {
  if (typeof fallback === 'string' && fallback.startsWith('image/')) return fallback;
  const lower = (fileName ?? '').toLowerCase();
  if (lower.endsWith('.png')) return 'image/png';
  if (lower.endsWith('.webp')) return 'image/webp';
  if (lower.endsWith('.heic')) return 'image/heic';
  if (lower.endsWith('.jpg') || lower.endsWith('.jpeg')) return 'image/jpeg';
  return 'image/jpeg';
}

function toDateLabel(value?: string): string {
  return formatKstDateLabel(value);
}

function getMenuPosition(pageX: number, pageY: number, screenWidth: number, screenHeight: number) {
  const menuWidth = 112;
  const menuHeight = 46;
  const gap = spacing.xs;
  const left = Math.min(
    Math.max(pageX - menuWidth + 12, spacing.md),
    Math.max(spacing.md, screenWidth - menuWidth - spacing.md),
  );
  const top = pageY + menuHeight + gap < screenHeight ? pageY + gap : pageY - menuHeight - gap;
  return { left, top };
}

async function fetchAllFollowUsers(
  loader: (cursorId?: number) => Promise<{
    items: Array<{
      nickname?: string;
      profileImageUrl?: string;
      following?: boolean;
    }>;
    hasNext: boolean;
    nextCursor: number | null;
  }>,
): Promise<FollowUser[]> {
  let cursorId: number | undefined;
  const all: FollowUser[] = [];

  for (let i = 0; i < 20; i += 1) {
    const result = await loader(cursorId);
    all.push(
      ...result.items
        .map((item) => ({
          nickname: typeof item.nickname === 'string' ? item.nickname : '',
          profileImageUrl: normalizeImageUrl(item.profileImageUrl),
          following: Boolean(item.following),
        }))
        .filter((item) => item.nickname.length > 0),
    );

    if (!result.hasNext || typeof result.nextCursor !== 'number') break;
    cursorId = result.nextCursor;
  }

  const uniqueByNickname = new Map<string, FollowUser>();
  all.forEach((item) => {
    uniqueByNickname.set(item.nickname, item);
  });

  return Array.from(uniqueByNickname.values());
}

function NotificationToggle({
  enabled,
  disabled,
  onPress,
}: {
  enabled: boolean;
  disabled?: boolean;
  onPress: () => void;
}) {
  const progress = useRef(new Animated.Value(enabled ? 1 : 0)).current;

  useEffect(() => {
    Animated.timing(progress, {
      toValue: enabled ? 1 : 0,
      duration: 180,
      easing: Easing.out(Easing.cubic),
      useNativeDriver: false,
    }).start();
  }, [enabled, progress]);

  const translateX = progress.interpolate({
    inputRange: [0, 1],
    outputRange: [0, 20],
  });
  const trackColor = progress.interpolate({
    inputRange: [0, 1],
    outputRange: [colors.gray2, colors.primary1],
  });

  return (
    <Pressable
      style={[styles.toggleButton, disabled ? styles.toggleButtonDisabled : null]}
      onPress={onPress}
      disabled={disabled}
    >
      <Animated.View
        style={[
          styles.toggleTrack,
          {
            backgroundColor: trackColor,
            borderColor: trackColor,
          },
        ]}
      >
        <Animated.View style={[styles.toggleThumb, { transform: [{ translateX }] }]} />
      </Animated.View>
    </Pressable>
  );
}

export function MyPageScreen() {
  const { isLoggedIn, logout } = useAuthGate();
  const navigation = useNavigation<any>();
  const route = useRoute<any>();
  const { width: screenWidth, height: screenHeight } = useWindowDimensions();
  const [activeTab, setActiveTab] = useState<TabKey>('내 책 이야기');
  const [refreshing, setRefreshing] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [selectedSetting, setSelectedSetting] = useState<string | null>(null);
  const [stories, setStories] = useState<StoryCard[]>([]);
  const [books, setBooks] = useState<BookCard[]>([]);
  const [alarms, setAlarms] = useState<AlarmItem[]>([]);
  const [myNews, setMyNews] = useState<MyNewsItem[]>([]);
  const [groups, setGroups] = useState<GroupItem[]>([]);
  const [profileName, setProfileName] = useState('_hy_0716');
  const [profileDesc, setProfileDesc] = useState(
    '이제 다양한 책을 함께 읽고 서로의 생각을 나누는 특별한 시간을 시작해보세요. 한 권의 책이 주는 작은 울림이 ......',
  );
  const [profileImageUrl, setProfileImageUrl] = useState<string | undefined>(undefined);
  const [profilePhoneNumber, setProfilePhoneNumber] = useState('');
  const [profileDefaultColor, setProfileDefaultColor] = useState(colors.subbrown3);
  const [profileCategoryCodes, setProfileCategoryCodes] = useState<string[]>([]);
  const [profileCategories, setProfileCategories] = useState<string[]>([]);
  const [followerCount, setFollowerCount] = useState(0);
  const [followingCount, setFollowingCount] = useState(0);
  const [followerUsers, setFollowerUsers] = useState<FollowUser[]>([]);
  const [followingUsers, setFollowingUsers] = useState<FollowUser[]>([]);
  const [deletingFollowerNickname, setDeletingFollowerNickname] = useState<string | null>(null);
  const [showFollowPage, setShowFollowPage] = useState(false);
  const [activeFollowTab, setActiveFollowTab] = useState<'FOLLOWER' | 'FOLLOWING'>('FOLLOWER');
  const [loadingStories, setLoadingStories] = useState(false);
  const [loadingBooks, setLoadingBooks] = useState(false);
  const [loadingAlarms, setLoadingAlarms] = useState(false);
  const [loadingMyNews, setLoadingMyNews] = useState(false);
  const [loadingGroups, setLoadingGroups] = useState(false);
  const [loadingProfile, setLoadingProfile] = useState(false);
  const [loadingFollowUsers, setLoadingFollowUsers] = useState(false);
  const [notificationSettings, setNotificationSettings] = useState<NotificationSettingInfo>(
    defaultNotificationSettings,
  );
  const [loadingNotificationSettings, setLoadingNotificationSettings] = useState(false);
  const [togglingNotificationSetting, setTogglingNotificationSetting] =
    useState<NotificationSettingType | null>(null);
  const [groupMenu, setGroupMenu] = useState<GroupMenuState | null>(null);
  const [profileEditDescription, setProfileEditDescription] = useState('');
  const [profileEditImageUrl, setProfileEditImageUrl] = useState('');
  const [profileEditCategoryCodes, setProfileEditCategoryCodes] = useState<string[]>([]);
  const [profileEditDefaultColor, setProfileEditDefaultColor] = useState(colors.subbrown3);
  const [profileEditUseDefaultAvatar, setProfileEditUseDefaultAvatar] = useState(false);
  const [showDefaultAvatarPicker, setShowDefaultAvatarPicker] = useState(false);
  const [uploadingProfileImage, setUploadingProfileImage] = useState(false);
  const [submittingProfileEdit, setSubmittingProfileEdit] = useState(false);
  const [emailCurrent, setEmailCurrent] = useState('');
  const [emailNext, setEmailNext] = useState('');
  const [emailVerificationCode, setEmailVerificationCode] = useState('');
  const [submittingEmailUpdate, setSubmittingEmailUpdate] = useState(false);
  const [passwordCurrent, setPasswordCurrent] = useState('');
  const [passwordNext, setPasswordNext] = useState('');
  const [passwordConfirm, setPasswordConfirm] = useState('');
  const [submittingPasswordUpdate, setSubmittingPasswordUpdate] = useState(false);
  const [reportHistory, setReportHistory] = useState<ReportHistoryItem[]>([]);
  const [loadingReportHistory, setLoadingReportHistory] = useState(false);
  const [submittingWithdrawal, setSubmittingWithdrawal] = useState(false);
  const [submittingLogout, setSubmittingLogout] = useState(false);

  const settingIconUri = useMemo(
    () => Image.resolveAssetSource(require('../../assets/mypage/mypage-setting.svg')).uri,
    [],
  );
  const settingProfileUri = useMemo(
    () => Image.resolveAssetSource(require('../../assets/mypage/setting-profile.svg')).uri,
    [],
  );
  const settingServiceUri = useMemo(
    () => Image.resolveAssetSource(require('../../assets/mypage/setting-service.svg')).uri,
    [],
  );
  const settingOtherUri = useMemo(
    () => Image.resolveAssetSource(require('../../assets/mypage/setting-other.svg')).uri,
    [],
  );
  const likeIconUri = useMemo(
    () => Image.resolveAssetSource(require('../../assets/book-story/bookstory-like.svg')).uri,
    [],
  );
  const commentIconUri = useMemo(
    () => Image.resolveAssetSource(require('../../assets/book-story/bookstory-comment.svg')).uri,
    [],
  );

  const mapLikedBooksToCards = useCallback((items: MemberLikedBookItem[]): BookCard[] => {
    const mapped = items.map((book, index) => {
      const normalizedIsbn = book.isbn.trim();
      const title = book.title?.trim() || '책 제목';
      const author = book.author?.trim() || '작가 미상';
      const id = normalizedIsbn || `${title}-${author}-${index}`;

      return {
        id,
        isbn: normalizedIsbn,
        bookId: book.bookId,
        title,
        author,
        imageUrl: normalizeImageUrl(book.imgUrl),
      };
    });

    const uniqueById = new Map<string, BookCard>();
    mapped.forEach((item) => {
      if (!uniqueById.has(item.id)) {
        uniqueById.set(item.id, item);
      }
    });
    return Array.from(uniqueById.values());
  }, []);

  const mapMyNewsItems = useCallback((items: RemoteNewsSummary[]): MyNewsItem[] => {
    return items.map((item) => ({
      id: `my-news-${item.id}`,
      newsId: item.id,
      title: item.title || '제목 없음',
      excerpt: item.excerpt?.trim() || '소식 내용을 확인해보세요.',
      date: toDateLabel(item.date),
      thumbnailUrl: normalizeImageUrl(item.thumbnailUrl),
    }));
  }, []);

  const mapReportItems = useCallback((items: ReportItem[]): ReportHistoryItem[] => {
    return items.map((item, index) => {
      const reportId =
        typeof item.reportId === 'number' ? `report-${item.reportId}` : `report-${index}`;
      const reportTypeCode =
        typeof item.reportType === 'string' ? item.reportType : 'GENERAL';
      return {
        id: reportId,
        reportType: reportTypeLabelByCode[reportTypeCode] ?? reportTypeCode,
        reportedMemberNickname:
          typeof item.reportedMemberNickname === 'string' && item.reportedMemberNickname.trim()
            ? item.reportedMemberNickname
            : '알 수 없음',
        content:
          typeof item.content === 'string' && item.content.trim()
            ? item.content
            : '신고 사유가 입력되지 않았습니다.',
        createdAtLabel: toDateLabel(item.createdAt),
      };
    });
  }, []);

  const loadLikedBooks = useCallback(async () => {
    setLoadingBooks(true);
    try {
      const items = await fetchAllMyLikedBooks();
      setBooks(mapLikedBooksToCards(items));
    } finally {
      setLoadingBooks(false);
    }
  }, [mapLikedBooksToCards]);

  const loadMyPageData = useCallback(async () => {
    if (!isLoggedIn) {
      setStories(fallbackStories);
      setBooks(fallbackBooks);
      setAlarms([]);
      setMyNews([]);
      setGroups(fallbackGroups);
      setProfileName('_hy_0716');
      setProfileDesc(
        '이제 다양한 책을 함께 읽고 서로의 생각을 나누는 특별한 시간을 시작해보세요. 한 권의 책이 주는 작은 울림이 ......',
      );
      setProfileImageUrl(undefined);
      setProfilePhoneNumber('');
      setProfileCategoryCodes([]);
      setProfileCategories([]);
      setFollowerUsers([]);
      setFollowingUsers([]);
      setFollowerCount(0);
      setFollowingCount(0);
      setNotificationSettings(defaultNotificationSettings);
      setLoadingBooks(false);
      return;
    }

    setLoadingProfile(true);
    try {
      const profile = await fetchMyProfile();
      if (profile) {
        setProfileName(profile.nickname || '_사용자');
        setProfileDesc(profile.description || '소개글이 없습니다.');
        setProfileImageUrl(normalizeImageUrl(profile.profileImageUrl));
        setProfilePhoneNumber(profile.phoneNumber ?? '');
        setProfileCategoryCodes(profile.categories);
        setProfileCategories(
          profile.categories
            .map((code) => categoryLabelByCode[code] ?? code)
            .filter((label) => label.length > 0),
        );
      } else {
        setProfilePhoneNumber('');
      }
    } catch (error) {
      if (!(error instanceof ApiError)) {
        showToast('내 프로필을 불러오지 못했습니다.');
      }
    } finally {
      setLoadingProfile(false);
    }

    try {
      const [followCount, followers, followings] = await Promise.all([
        fetchMyFollowCount().catch(() => null),
        fetchAllFollowUsers(fetchMyFollowers),
        fetchAllFollowUsers(fetchMyFollowing),
      ]);
      setFollowerUsers(followers);
      setFollowingUsers(followings);
      setFollowerCount(followCount?.followerCount ?? followers.length);
      setFollowingCount(followCount?.followingCount ?? followings.length);
    } catch (error) {
      if (!(error instanceof ApiError)) {
        showToast('구독 정보를 불러오지 못했습니다.');
      }
    }

    setLoadingStories(true);
    try {
      const result = await fetchMyBookStories();
      const mapped: StoryCard[] = result.items.map((item) => ({
        id: `s-${item.id}`,
        remoteId: item.id,
        title: item.title || '제목 없음',
        excerpt: item.description || '내용이 없습니다.',
        imageUrl: normalizeImageUrl(item.bookInfo?.imgUrl),
        likes: item.likeCount ?? 0,
        comments: item.commentCount ?? 0,
      }));
      setStories(mapped);
    } catch (error) {
      if (!(error instanceof ApiError)) {
        showToast('내 책이야기를 불러오지 못했습니다.');
      }
    } finally {
      setLoadingStories(false);
    }

    try {
      await loadLikedBooks();
    } catch (error) {
      if (!(error instanceof ApiError)) {
        showToast('내 서재를 불러오지 못했습니다.');
      }
    }

    setLoadingGroups(true);
    try {
      const result = await fetchMyClubs();
      setGroups(
        result.items.map((club) => ({
          id: `club-${club.clubId}`,
          clubId: club.clubId,
          name: club.clubName,
        })),
      );
    } catch (error) {
      if (!(error instanceof ApiError)) {
        showToast('내 모임을 불러오지 못했습니다.');
      }
    } finally {
    setLoadingGroups(false);
    }
  }, [isLoggedIn, loadLikedBooks]);

  const loadFollowUsers = useCallback(async () => {
    if (!isLoggedIn) {
      setFollowerUsers([]);
      setFollowingUsers([]);
      setFollowerCount(0);
      setFollowingCount(0);
      return;
    }

    setLoadingFollowUsers(true);
    try {
      const [followCount, followers, followings] = await Promise.all([
        fetchMyFollowCount().catch(() => null),
        fetchAllFollowUsers(fetchMyFollowers),
        fetchAllFollowUsers(fetchMyFollowing),
      ]);
      setFollowerUsers(followers);
      setFollowingUsers(followings);
      setFollowerCount(followCount?.followerCount ?? followers.length);
      setFollowingCount(followCount?.followingCount ?? followings.length);
    } catch (error) {
      if (!(error instanceof ApiError)) {
        showToast('구독 정보를 불러오지 못했습니다.');
      }
    } finally {
      setLoadingFollowUsers(false);
    }
  }, [isLoggedIn]);

  const navigateByNotification = useCallback(
    (notification: NotificationItem) => {
      const target = resolveNotificationTarget(notification);
      navigation.navigate(target.screen, target.params);
    },
    [navigation],
  );

  const mapNotificationToAlarm = useCallback((item: NotificationItem): AlarmItem => {
    return {
      id: `alarm-${item.notificationId}`,
      notificationId: item.notificationId,
      notificationType: item.notificationType,
      domainId: item.domainId,
      sourceId: item.sourceId,
      displayName: item.displayName,
      text: formatNotificationText(item.notificationType, item.displayName),
      time: toKstTimeAgoLabel(item.createdAt),
      unread: !item.read,
    };
  }, []);

  const loadAllNotifications = useCallback(async () => {
    if (!isLoggedIn) {
      setAlarms([]);
      return;
    }

    setLoadingAlarms(true);
    try {
      const allItems: NotificationItem[] = [];
      let cursorId: number | undefined;

      for (let i = 0; i < 20; i += 1) {
        const response = await fetchNotifications(cursorId);
        allItems.push(...response.items);
        if (!response.hasNext || typeof response.nextCursor !== 'number') break;
        cursorId = response.nextCursor;
      }

      setAlarms(allItems.map(mapNotificationToAlarm));
    } catch (error) {
      if (error instanceof ApiError && error.status === 401) {
        setAlarms([]);
        return;
      }
      if (!(error instanceof ApiError)) {
        showToast('알림 목록을 불러오지 못했습니다.');
      }
    } finally {
      setLoadingAlarms(false);
    }
  }, [isLoggedIn, mapNotificationToAlarm]);

  const loadMyNews = useCallback(async () => {
    if (!isLoggedIn) {
      setMyNews([]);
      return;
    }

    setLoadingMyNews(true);
    try {
      const allItems: RemoteNewsSummary[] = [];
      let cursorId: number | undefined;

      for (let i = 0; i < 20; i += 1) {
        const response = await fetchMyNewsList(cursorId);
        allItems.push(...response.items);
        if (!response.hasNext || typeof response.nextCursor !== 'number') break;
        cursorId = response.nextCursor;
      }

      setMyNews(mapMyNewsItems(allItems));
    } catch (error) {
      if (error instanceof ApiError && error.status === 401) {
        setMyNews([]);
        return;
      }
      if (error instanceof ApiError) {
        setMyNews([]);
        return;
      }
      showToast('내 소식을 불러오지 못했습니다.');
    } finally {
      setLoadingMyNews(false);
    }
  }, [isLoggedIn, mapMyNewsItems]);

  const loadNotificationSettingInfo = useCallback(async () => {
    if (!isLoggedIn) {
      setNotificationSettings(defaultNotificationSettings);
      return;
    }

    setLoadingNotificationSettings(true);
    try {
      const settingInfo = await fetchNotificationSettings();
      setNotificationSettings(settingInfo);
    } catch (error) {
      if (error instanceof ApiError && error.status === 401) {
        setNotificationSettings(defaultNotificationSettings);
        return;
      }
      if (!(error instanceof ApiError)) {
        showToast('알림 설정을 불러오지 못했습니다.');
      }
    } finally {
      setLoadingNotificationSettings(false);
    }
  }, [isLoggedIn]);

  const handlePressAlarm = useCallback(
    (alarm: AlarmItem) => {
      const notification: NotificationItem = {
        notificationId: alarm.notificationId,
        notificationType: alarm.notificationType,
        domainId: alarm.domainId,
        sourceId: alarm.sourceId,
        displayName: alarm.displayName,
        read: !alarm.unread,
        createdAt: '',
      };

      setAlarms((prev) =>
        prev.map((item) =>
          item.notificationId === alarm.notificationId ? { ...item, unread: false } : item,
        ),
      );
      navigateByNotification(notification);

      if (!alarm.unread) return;

      const submit = async () => {
        try {
          await markNotificationAsRead(alarm.notificationId);
        } catch {
          setAlarms((prev) =>
            prev.map((item) =>
              item.notificationId === alarm.notificationId ? { ...item, unread: true } : item,
            ),
          );
        }
      };
      void submit();
    },
    [navigateByNotification],
  );

  const handleToggleNotificationSetting = useCallback((settingType: NotificationSettingType) => {
    const row = notificationSettingRows.find((item) => item.type === settingType);
    if (!row) return;
    const key = row.key;
    const previous = notificationSettings[key];
    const next = !previous;

    setNotificationSettings((prev) => ({
      ...prev,
      [key]: next,
    }));
    setTogglingNotificationSetting(settingType);

    const submit = async () => {
      try {
        await toggleNotificationSetting(settingType);
      } catch (error) {
        setNotificationSettings((prev) => ({
          ...prev,
          [key]: previous,
        }));
        if (!(error instanceof ApiError)) {
          showToast('알림 설정을 변경하지 못했습니다.');
        }
      } finally {
        setTogglingNotificationSetting((prevType) =>
          prevType === settingType ? null : prevType,
        );
      }
    };
    void submit();
  }, [notificationSettings]);

  const loadReportHistory = useCallback(async () => {
    if (!isLoggedIn) {
      setReportHistory([]);
      return;
    }

    setLoadingReportHistory(true);
    try {
      const reports = await fetchMyReports();
      setReportHistory(mapReportItems(reports));
    } catch (error) {
      if (error instanceof ApiError && error.status === 401) {
        setReportHistory([]);
        return;
      }
      if (error instanceof ApiError) {
        setReportHistory([]);
        return;
      }
      if (!(error instanceof ApiError)) {
        showToast('신고 목록을 불러오지 못했습니다.');
      }
    } finally {
      setLoadingReportHistory(false);
    }
  }, [isLoggedIn, mapReportItems]);

  const toggleProfileEditCategory = useCallback((code: string) => {
    setProfileEditCategoryCodes((prev) => {
      if (prev.includes(code)) return prev.filter((item) => item !== code);
      if (prev.length >= 6) {
        showToast('관심 카테고리는 최대 6개까지 선택할 수 있습니다.');
        return prev;
      }
      return [...prev, code];
    });
  }, []);

  const handlePickProfileImage = useCallback(() => {
    if (uploadingProfileImage) return;

    const submit = async () => {
      const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (!permission.granted) {
        showToast('사진 접근 권한이 필요합니다.');
        return;
      }

      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ['images'],
        allowsEditing: true,
        quality: 0.9,
      });

      if (result.canceled || !result.assets?.length) return;
      const asset = result.assets[0];
      const fileName = asset.fileName ?? `profile_${Date.now()}.jpg`;
      const contentType = inferMimeType(fileName, asset.mimeType);

      setUploadingProfileImage(true);
      try {
        const uploadMeta = await issueProfileImageUploadUrl(fileName, contentType);
        if (!uploadMeta?.presignedUrl || !uploadMeta.imageUrl) {
          showToast('이미지 업로드 URL 발급에 실패했습니다.');
          return;
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
          return;
        }

        setProfileEditImageUrl(uploadMeta.imageUrl);
        setProfileEditUseDefaultAvatar(false);
        showToast('프로필 이미지를 적용했습니다.');
      } catch (error) {
        if (!(error instanceof ApiError)) {
          showToast('이미지 업로드에 실패했습니다.');
        }
      } finally {
        setUploadingProfileImage(false);
      }
    };
    void submit();
  }, [uploadingProfileImage]);

  const handleSelectDefaultAvatarColor = useCallback((color: string) => {
    setProfileEditDefaultColor(color);
    setProfileEditUseDefaultAvatar(true);
    setProfileEditImageUrl('');
    setShowDefaultAvatarPicker(false);
  }, []);

  const handleSubmitProfileEdit = useCallback(() => {
    const description = profileEditDescription.trim();
    if (description.length > 20) {
      showToast('소개는 20자 이내로 입력해주세요.');
      return;
    }

    const categories =
      profileEditCategoryCodes.length > 0 ? profileEditCategoryCodes : profileCategoryCodes;
    if (categories.length === 0) {
      showToast('관심 카테고리를 1개 이상 선택해주세요.');
      return;
    }

    setSubmittingProfileEdit(true);
    const submit = async () => {
      try {
        const imageUrl = profileEditUseDefaultAvatar ? '' : profileEditImageUrl.trim() || undefined;
        const updated = await updateMyProfile({
          description,
          imgUrl: imageUrl,
          categories,
        });
        const nextDescription = updated?.description ?? description;
        const nextCategoryCodes = updated?.categories ?? categories;
        const nextImageUrl = profileEditUseDefaultAvatar
          ? undefined
          : normalizeImageUrl(updated?.profileImageUrl ?? imageUrl);
        const nextPhoneNumber = updated?.phoneNumber ?? profilePhoneNumber;

        setProfileDesc(nextDescription || '소개글이 없습니다.');
        setProfileImageUrl(nextImageUrl);
        setProfilePhoneNumber(nextPhoneNumber);
        setProfileCategoryCodes(nextCategoryCodes);
        setProfileCategories(
          nextCategoryCodes
            .map((code) => categoryLabelByCode[code] ?? code)
            .filter((label) => label.length > 0),
        );
        if (profileEditUseDefaultAvatar) {
          setProfileDefaultColor(profileEditDefaultColor);
        }
        showToast('프로필이 변경되었습니다.');
      } catch (error) {
        if (!(error instanceof ApiError)) {
          showToast('프로필 변경에 실패했습니다.');
        }
      } finally {
        setSubmittingProfileEdit(false);
      }
    };
    void submit();
  }, [
    profileCategoryCodes,
    profileEditCategoryCodes,
    profileEditDefaultColor,
    profileEditDescription,
    profileEditImageUrl,
    profileEditUseDefaultAvatar,
    profilePhoneNumber,
  ]);

  const handleSubmitEmailUpdate = useCallback(() => {
    const currentEmail = emailCurrent.trim();
    const newEmail = emailNext.trim();
    const verificationCode = emailVerificationCode.trim();

    if (!currentEmail || !newEmail || !verificationCode) {
      showToast('이메일 변경 정보를 모두 입력해주세요.');
      return;
    }

    setSubmittingEmailUpdate(true);
    const submit = async () => {
      try {
        await updateMyEmail({
          currentEmail,
          newEmail,
          verificationCode,
        });
        showToast('이메일이 변경되었습니다.');
        setEmailCurrent('');
        setEmailNext('');
        setEmailVerificationCode('');
      } catch (error) {
        if (!(error instanceof ApiError)) {
          showToast('이메일 변경에 실패했습니다.');
        }
      } finally {
        setSubmittingEmailUpdate(false);
      }
    };
    void submit();
  }, [emailCurrent, emailNext, emailVerificationCode]);

  const handleSubmitPasswordUpdate = useCallback(() => {
    const currentPassword = passwordCurrent.trim();
    const newPassword = passwordNext.trim();
    const confirmPassword = passwordConfirm.trim();

    if (!currentPassword || !newPassword || !confirmPassword) {
      showToast('비밀번호 정보를 모두 입력해주세요.');
      return;
    }
    if (newPassword !== confirmPassword) {
      showToast('비밀번호와 비밀번호 확인이 일치하지 않습니다.');
      return;
    }

    setSubmittingPasswordUpdate(true);
    const submit = async () => {
      try {
        await updateMyPassword({
          currentPassword,
          newPassword,
          confirmPassword,
        });
        showToast('비밀번호가 변경되었습니다.');
        setPasswordCurrent('');
        setPasswordNext('');
        setPasswordConfirm('');
      } catch (error) {
        if (!(error instanceof ApiError)) {
          showToast('비밀번호 변경에 실패했습니다.');
        }
      } finally {
        setSubmittingPasswordUpdate(false);
      }
    };
    void submit();
  }, [passwordConfirm, passwordCurrent, passwordNext]);

  const handleWithdrawMember = useCallback(() => {
    if (submittingWithdrawal) return;

    Alert.alert('회원 탈퇴', '정말 탈퇴하시겠습니까? 탈퇴 후에는 되돌릴 수 없습니다.', [
      { text: '취소', style: 'cancel' },
      {
        text: '탈퇴하기',
        style: 'destructive',
        onPress: () => {
          setSubmittingWithdrawal(true);
          const submit = async () => {
            try {
              await withdrawMember();
              showToast('탈퇴가 신청되었습니다.');
              logout();
              setShowSettings(false);
              setSelectedSetting(null);
            } catch (error) {
              if (!(error instanceof ApiError)) {
                showToast('회원 탈퇴에 실패했습니다.');
              }
            } finally {
              setSubmittingWithdrawal(false);
            }
          };
          void submit();
        },
      },
    ]);
  }, [logout, submittingWithdrawal]);

  const handleLogoutPress = useCallback(() => {
    if (submittingLogout) return;

    Alert.alert('로그아웃', '로그아웃하시겠습니까?', [
      { text: '취소', style: 'cancel' },
      {
        text: '로그아웃',
        style: 'destructive',
        onPress: () => {
          setSubmittingLogout(true);
          const submit = async () => {
            try {
              await logoutSession();
              logout();
              setShowSettings(false);
              setSelectedSetting(null);
              navigation.navigate('Home');
              showToast('로그아웃되었습니다.');
            } catch (error) {
              if (!(error instanceof ApiError)) {
                showToast('로그아웃에 실패했습니다.');
              }
            } finally {
              setSubmittingLogout(false);
            }
          };
          void submit();
        },
      },
    ]);
  }, [logout, navigation, submittingLogout]);

  const openFollowerList = useCallback(() => {
    setGroupMenu(null);
    setActiveFollowTab('FOLLOWER');
    setShowFollowPage(true);
    void loadFollowUsers();
  }, [loadFollowUsers]);

  const openFollowingList = useCallback(() => {
    setGroupMenu(null);
    setActiveFollowTab('FOLLOWING');
    setShowFollowPage(true);
    void loadFollowUsers();
  }, [loadFollowUsers]);

  const openMemberProfile = useCallback(
    (nickname: string) => {
      const memberNickname = nickname.trim();
      if (!memberNickname) return;

      if (profileName.trim() && memberNickname === profileName.trim()) {
        setShowFollowPage(false);
        navigation.navigate('My');
        return;
      }

      navigation.navigate('UserProfile', { memberNickname, fromScreen: 'My' });
    },
    [navigation, profileName],
  );

  const handleToggleFollowUser = useCallback(
    (nickname: string, nextFollowing: boolean) => {
      const prevFollowerUsers = followerUsers;
      const prevFollowingUsers = followingUsers;
      const prevFollowerCount = followerCount;
      const prevFollowingCount = followingCount;
      const wasFollowing = prevFollowingUsers.some((item) => item.nickname === nickname);

      setFollowerUsers((prev) =>
        prev.map((item) =>
          item.nickname === nickname ? { ...item, following: nextFollowing } : item,
        ),
      );

      setFollowingUsers((prev) => {
        if (nextFollowing) {
          const target = prev.find((item) => item.nickname === nickname);
          if (target) {
            return prev.map((item) =>
              item.nickname === nickname ? { ...item, following: true } : item,
            );
          }
          const fromFollower = prevFollowerUsers.find((item) => item.nickname === nickname);
          if (fromFollower) {
            return [{ ...fromFollower, following: true }, ...prev];
          }
          return [{ nickname, following: true }, ...prev];
        }
        return prev.filter((item) => item.nickname !== nickname);
      });
      setFollowingCount((prev) => {
        if (nextFollowing) {
          return wasFollowing ? prev : prev + 1;
        }
        return wasFollowing ? Math.max(0, prev - 1) : prev;
      });

      const submit = async () => {
        try {
          await setFollowingMember(nickname, nextFollowing);
          showToast(nextFollowing ? '구독했습니다.' : '구독을 취소했습니다.');
        } catch (error) {
          setFollowerUsers(prevFollowerUsers);
          setFollowingUsers(prevFollowingUsers);
          setFollowerCount(prevFollowerCount);
          setFollowingCount(prevFollowingCount);
          if (!(error instanceof ApiError)) {
            showToast('구독 상태를 변경하지 못했습니다.');
          }
        }
      };
      void submit();
    },
    [followerCount, followerUsers, followingCount, followingUsers],
  );

  const handleDeleteFollower = useCallback(
    (nickname: string) => {
      const targetNickname = nickname.trim();
      if (!targetNickname) return;
      if (deletingFollowerNickname === targetNickname) return;

      const targetFollower = followerUsers.find((item) => item.nickname === targetNickname);
      if (!targetFollower) return;

      Alert.alert('구독자 삭제', `'${targetFollower.nickname}'님을 삭제하시겠습니까?`, [
        { text: '취소', style: 'cancel' },
        {
          text: '삭제',
          style: 'destructive',
          onPress: () => {
            if (deletingFollowerNickname === targetNickname) return;
            setDeletingFollowerNickname(targetNickname);

            const submit = async () => {
              try {
                await deleteFollowerMember(targetNickname);
                setFollowerUsers((prev) =>
                  prev.filter((item) => item.nickname !== targetNickname),
                );
                setFollowerCount((prev) => Math.max(0, prev - 1));
                showToast('구독자를 삭제했습니다.');
              } catch (error) {
                if (!(error instanceof ApiError)) {
                  showToast('구독자 삭제에 실패했습니다.');
                }
              } finally {
                setDeletingFollowerNickname((prev) =>
                  prev === targetNickname ? null : prev,
                );
              }
            };
            void submit();
          },
        },
      ]);
    },
    [deletingFollowerNickname, followerUsers],
  );

  const handleToggleBookLike = useCallback((book: BookCard) => {
    const submit = async () => {
      if (!book.isbn.trim()) {
        showToast('ISBN 정보가 없어 서재 상태를 변경할 수 없습니다.');
        return;
      }

      try {
        await toggleBookLikeByIsbn(book.isbn);
        await loadLikedBooks();
        showToast('내 서재가 업데이트되었습니다.');
      } catch (error) {
        if (!(error instanceof ApiError)) {
          showToast('내 서재 업데이트에 실패했습니다.');
        }
      }
    };
    void submit();
  }, [loadLikedBooks]);

  const renderStories = () => (
    <View style={[styles.gridContent, styles.cardWrap]}>
      {loadingStories ? <Text style={styles.loadingText}>내 책이야기를 불러오는 중...</Text> : null}
      {!loadingStories && stories.length === 0 ? (
        <Text style={styles.emptyText}>작성한 책이야기가 없습니다.</Text>
      ) : null}
      {stories.map((item) => (
        <Pressable
          key={item.id}
          style={({ pressed }) => [styles.storyCard, pressed && styles.pressed]}
          onPress={() => {
            if (typeof item.remoteId !== 'number' || item.remoteId <= 0) {
              showToast('해당 책이야기를 찾을 수 없습니다.');
              return;
            }
            navigation.navigate('Story', { openStoryId: item.remoteId });
          }}
        >
          <View style={styles.storyThumb}>
            {item.imageUrl ? (
              <Image source={{ uri: item.imageUrl }} style={styles.storyThumbImage} resizeMode="cover" />
            ) : null}
          </View>
          <Text style={styles.storyTitle}>{item.title}</Text>
          <Text style={styles.storyExcerpt} numberOfLines={2}>
            {item.excerpt}
          </Text>
          <View style={styles.storyActions}>
            <View style={styles.inlineAction}>
              <SvgUri uri={likeIconUri} width={18} height={18} />
              <Text style={styles.inlineText}>{item.likes}</Text>
            </View>
            <View style={styles.actionDivider} />
            <View style={styles.inlineAction}>
              <SvgUri uri={commentIconUri} width={18} height={18} />
              <Text style={styles.inlineText}>{item.comments}</Text>
            </View>
          </View>
        </Pressable>
      ))}
    </View>
  );

  const renderBooks = () => (
    <View style={[styles.gridContent, styles.bookWrap]}>
      {loadingBooks ? <Text style={styles.loadingText}>내 서재를 불러오는 중...</Text> : null}
      {!loadingBooks && books.length === 0 ? (
        <Text style={styles.emptyText}>내 서재에 표시할 책이 없습니다.</Text>
      ) : null}
      {books.map((item) => (
        <View key={item.id} style={styles.bookCard}>
          <View style={styles.bookThumb}>
            {item.imageUrl ? (
              <Image source={{ uri: item.imageUrl }} style={styles.bookThumbImage} resizeMode="cover" />
            ) : null}
            <Pressable
              style={({ pressed }) => [styles.bookLikeBadge, pressed && styles.pressed]}
              onPress={() => handleToggleBookLike(item)}
            >
              <MaterialIcons name="favorite" size={18} color={colors.secondary1} />
            </Pressable>
          </View>
          <Text style={styles.bookTitle} numberOfLines={1}>
            {item.title}
          </Text>
          <Text style={styles.bookAuthor} numberOfLines={1}>
            {item.author}
          </Text>
        </View>
      ))}
    </View>
  );

  const renderGroups = () => (
    <View style={styles.listContainer}>
      {loadingGroups ? <Text style={styles.loadingText}>내 모임을 불러오는 중...</Text> : null}
      {!loadingGroups && groups.length === 0 ? (
        <Text style={styles.emptyText}>가입한 모임이 없습니다.</Text>
      ) : null}
      {groups.map((group) => (
        <Pressable
          key={group.id}
          style={({ pressed }) => [styles.groupRow, pressed && styles.pressed]}
          onPress={() => handleOpenGroupHome(group)}
        >
          <Text style={styles.groupName}>{group.name}</Text>
          <Pressable
            style={styles.groupMenuButton}
            hitSlop={8}
            onPress={(event) => {
              event.stopPropagation();
              setGroupMenu({
                group,
                pageX: event.nativeEvent.pageX,
                pageY: event.nativeEvent.pageY,
              });
            }}
          >
            <MaterialIcons name="more-vert" size={18} color={colors.gray4} />
          </Pressable>
        </Pressable>
      ))}
    </View>
  );

  const renderAlarms = () => (
    <View style={styles.listContainer}>
      {loadingAlarms ? <Text style={styles.loadingText}>알림을 불러오는 중...</Text> : null}
      {!loadingAlarms && alarms.length === 0 ? (
        <Text style={styles.emptyText}>도착한 알림이 없습니다.</Text>
      ) : null}
      {alarms.map((alarm) => (
        <Pressable
          key={alarm.id}
          style={({ pressed }) => [styles.alarmRow, pressed && styles.pressed]}
          onPress={() => handlePressAlarm(alarm)}
        >
          <View style={[styles.alarmDot, alarm.unread ? styles.alarmDotActive : null]} />
          <View style={styles.alarmBody}>
            <Text style={styles.alarmText} numberOfLines={2}>
              {alarm.text}
            </Text>
          </View>
          <Text style={styles.alarmTime}>{alarm.time}</Text>
        </Pressable>
      ))}
    </View>
  );

  const renderMyNews = () => (
    <View style={styles.listContainer}>
      {loadingMyNews ? <Text style={styles.loadingText}>내 소식을 불러오는 중...</Text> : null}
      {!loadingMyNews && myNews.length === 0 ? (
        <Text style={styles.emptyText}>등록한 소식이 없습니다.</Text>
      ) : null}
      {myNews.map((item) => (
        <Pressable
          key={item.id}
          style={({ pressed }) => [styles.myNewsRow, pressed && styles.pressed]}
          onPress={() => handleOpenMyNews(item)}
        >
          {item.thumbnailUrl ? (
            <Image source={{ uri: item.thumbnailUrl }} style={styles.myNewsThumb} />
          ) : (
            <View style={styles.myNewsThumbPlaceholder}>
              <MaterialIcons name="article" size={20} color={colors.gray3} />
            </View>
          )}
          <View style={styles.myNewsBody}>
            <Text style={styles.myNewsTitle} numberOfLines={1}>
              {item.title}
            </Text>
            <Text style={styles.myNewsExcerpt} numberOfLines={2}>
              {item.excerpt}
            </Text>
          </View>
          <Text style={styles.myNewsDate}>{item.date}</Text>
        </Pressable>
      ))}
    </View>
  );

  const renderTabContent = () => {
    switch (activeTab) {
      case '내 책 이야기':
        return renderStories();
      case '내 서재':
        return renderBooks();
      case '내 모임':
        return renderGroups();
      case '내 알림':
        return renderAlarms();
      default:
        return null;
    }
  };

  const activeFollowUsers =
    activeFollowTab === 'FOLLOWER' ? followerUsers : followingUsers;

  const renderFollowPage = () => (
    <View style={styles.followPageWrap}>
      <View style={styles.breadcrumbRow}>
        <Pressable
          style={({ pressed }) => [styles.breadcrumbRow, pressed && styles.pressed]}
          onPress={() => setShowFollowPage(false)}
        >
          <Text style={styles.breadcrumbText}>전체</Text>
          <MaterialIcons name="chevron-right" size={16} color={colors.gray4} />
          <Text style={[styles.breadcrumbText, styles.breadcrumbActive]}>마이페이지</Text>
        </Pressable>
      </View>

      <View style={styles.followProfileArea}>
        <View style={styles.followProfileAvatar}>
          {profileImageUrl ? (
            <Image source={{ uri: profileImageUrl }} style={styles.followProfileAvatarImage} />
          ) : (
            <DefaultProfileAvatar size={92} />
          )}
        </View>
        <Text style={styles.followProfileName}>{profileName}</Text>
      </View>

      <View style={styles.followTabRow}>
        <Pressable
          style={[styles.followTabButton, activeFollowTab === 'FOLLOWER' && styles.followTabActive]}
          onPress={() => setActiveFollowTab('FOLLOWER')}
        >
          <Text
            style={[
              styles.followTabText,
              activeFollowTab === 'FOLLOWER' && styles.followTabTextActive,
            ]}
          >
            구독자 {followerCount}
          </Text>
        </Pressable>
        <Pressable
          style={[styles.followTabButton, activeFollowTab === 'FOLLOWING' && styles.followTabActive]}
          onPress={() => setActiveFollowTab('FOLLOWING')}
        >
          <Text
            style={[
              styles.followTabText,
              activeFollowTab === 'FOLLOWING' && styles.followTabTextActive,
            ]}
          >
            구독중 {followingCount}
          </Text>
        </Pressable>
      </View>

      <View style={styles.followListWrap}>
        {loadingFollowUsers ? (
          <Text style={styles.loadingText}>구독 목록을 불러오는 중...</Text>
        ) : null}

        {!loadingFollowUsers && activeFollowUsers.length === 0 ? (
          <Text style={styles.emptyText}>표시할 사용자가 없습니다.</Text>
        ) : null}

        {activeFollowUsers.map((user) => {
          const isFollowerTab = activeFollowTab === 'FOLLOWER';
          const deleting = deletingFollowerNickname === user.nickname;

          return (
            <View key={`${activeFollowTab}-${user.nickname}`} style={styles.followUserRow}>
            <Pressable
              style={({ pressed }) => [styles.followUserMeta, pressed && styles.pressed]}
              onPress={() => openMemberProfile(user.nickname)}
            >
              <View style={styles.followUserAvatar}>
                {user.profileImageUrl ? (
                  <Image source={{ uri: user.profileImageUrl }} style={styles.followUserAvatarImage} />
                ) : (
                  <DefaultProfileAvatar size={28} />
                )}
              </View>
              <Text style={styles.followUserName}>{user.nickname}</Text>
            </Pressable>

            {isFollowerTab ? (
              <Pressable
                style={[
                  styles.followDeleteButton,
                  deleting ? styles.followDeleteButtonDisabled : null,
                ]}
                onPress={() => handleDeleteFollower(user.nickname)}
                disabled={deleting}
              >
                <Text style={styles.followDeleteButtonText}>{deleting ? '삭제중...' : '삭제'}</Text>
              </Pressable>
            ) : (
              <Pressable
                style={[
                  styles.followButton,
                  user.following ? styles.followButtonActive : styles.followButtonInactive,
                ]}
                onPress={() => handleToggleFollowUser(user.nickname, !user.following)}
              >
                <Text
                  style={[
                    styles.followButtonText,
                    user.following ? styles.followButtonTextActive : styles.followButtonTextInactive,
                  ]}
                >
                  {user.following ? '구독중' : '구독'}
                </Text>
              </Pressable>
            )}
          </View>
          );
        })}
      </View>
    </View>
  );

  useFocusEffect(
    useCallback(() => {
      void loadMyPageData();

      return () => {
        setActiveTab('내 책 이야기');
        setShowSettings(false);
        setSelectedSetting(null);
        setShowFollowPage(false);
        setActiveFollowTab('FOLLOWER');
        setGroupMenu(null);
      };
    }, [loadMyPageData]),
  );

  useEffect(() => {
    if (activeTab !== '내 모임') {
      setGroupMenu(null);
    }
  }, [activeTab]);

  useEffect(() => {
    if (activeTab !== '내 알림') return;
    void loadAllNotifications();
  }, [activeTab, loadAllNotifications]);

  useEffect(() => {
    if (selectedSetting !== '알림 관리') return;
    void loadNotificationSettingInfo();
  }, [loadNotificationSettingInfo, selectedSetting]);

  useEffect(() => {
    if (selectedSetting !== '내 소식 관리') return;
    void loadMyNews();
  }, [loadMyNews, selectedSetting]);

  useEffect(() => {
    if (selectedSetting !== '신고 관리') return;
    void loadReportHistory();
  }, [loadReportHistory, selectedSetting]);

  useEffect(() => {
    if (selectedSetting !== '프로필 편집') return;
    setProfileEditDescription(profileDesc === '소개글이 없습니다.' ? '' : profileDesc);
    setProfileEditImageUrl(profileImageUrl ?? '');
    setProfileEditCategoryCodes(profileCategoryCodes);
    setProfileEditDefaultColor(profileDefaultColor);
    setProfileEditUseDefaultAvatar(!profileImageUrl);
    setShowDefaultAvatarPicker(false);
  }, [profileCategoryCodes, profileDefaultColor, profileDesc, profileImageUrl, selectedSetting]);

  useEffect(() => {
    const nextMyTab = route.params?.openMyTab;
    if (nextMyTab !== 'ALARM') return;

    setShowFollowPage(false);
    setShowSettings(false);
    setSelectedSetting(null);
    setActiveTab('내 알림');
    navigation.setParams({ openMyTab: undefined });
  }, [navigation, route.params?.openMyTab]);

  useEffect(() => {
    const nextFollowTab = route.params?.openFollowTab;
    if (nextFollowTab !== 'FOLLOWER' && nextFollowTab !== 'FOLLOWING') return;

    setShowSettings(false);
    setSelectedSetting(null);
    setShowFollowPage(true);
    setActiveFollowTab(nextFollowTab);
    void loadFollowUsers();
    navigation.setParams({ openFollowTab: undefined });
  }, [loadFollowUsers, navigation, route.params?.openFollowTab]);

  const handleLeaveGroup = useCallback((group: GroupItem) => {
    if (typeof group.clubId !== 'number') {
      showToast('탈퇴할 수 없는 모임입니다.');
      return;
    }

    Alert.alert('모임 탈퇴', `'${group.name}' 모임에서 탈퇴할까요?`, [
      { text: '취소', style: 'cancel' },
      {
        text: '탈퇴하기',
        style: 'destructive',
        onPress: () => {
          const submit = async () => {
            try {
              await leaveClub(group.clubId as number);
              setGroups((prev) => prev.filter((item) => item.id !== group.id));
              showToast('모임에서 탈퇴했습니다.');
            } catch (error) {
              if (!(error instanceof ApiError)) {
                showToast('모임 탈퇴에 실패했습니다.');
              }
            }
          };
          void submit();
        },
      },
    ]);
  }, []);

  const handleOpenGroupHome = useCallback((group: GroupItem) => {
    if (typeof group.clubId !== 'number' || group.clubId <= 0) {
      showToast('해당 모임 정보를 찾을 수 없습니다.');
      return;
    }

    navigation.navigate('Meeting', { openClubId: group.clubId });
  }, [navigation]);

  const handleOpenMyNews = useCallback((item: MyNewsItem) => {
    if (item.newsId <= 0) {
      showToast('소식 정보를 찾을 수 없습니다.');
      return;
    }

    navigation.navigate('News', { openNewsId: item.newsId });
  }, [navigation]);

  const handleWriteStory = useCallback(() => {
    navigation.navigate('Story', { openCompose: true });
  }, [navigation]);

  const handleContact = useCallback(() => {
    Linking.openURL(PUBLIC_ENV.SUPPORT_FORM_URL).catch(() => null);
  }, []);

  const settingsSections = [
    {
      title: '계정 관리',
      iconUri: settingProfileUri,
      items: [
        '프로필 편집',
        '이메일 변경',
        '비밀번호 변경',
        '탈퇴/비활성화',
      ],
    },
    {
      title: '서비스',
      iconUri: settingServiceUri,
      items: ['내 소식 관리', '신고 관리', '알림 관리'],
    },
    {
      title: '기타',
      iconUri: settingOtherUri,
      items: ['고객센터/문의하기', '이용약관', '버전 정보', '로그아웃'],
    },
  ];

  const renderSettingDetail = () => {
    if (!selectedSetting) return null;

    const back = (
      <Pressable
        style={({ pressed }) => [styles.breadcrumbRow, pressed && styles.pressed]}
        onPress={() => setSelectedSetting(null)}
      >
        <Text style={styles.breadcrumbText}>뒤로가기</Text>
      </Pressable>
    );

    if (selectedSetting === '버전 정보') {
      return (
        <View style={styles.settingsDetailWrap}>
          {back}
          <Text style={styles.detailTitle}>{selectedSetting}</Text>
          <Text style={styles.detailDivider} />
          <Text style={styles.detailBody}>버전 업데이트 날짜 : 2026.01.01</Text>
        </View>
      );
    }

    if (selectedSetting === '프로필 편집') {
      const selectedCategorySet = new Set(profileEditCategoryCodes);
      return (
        <View style={styles.settingsDetailWrap}>
          {back}
          <Text style={styles.detailTitle}>프로필 편집</Text>
          <Text style={styles.detailDivider} />
          <View style={styles.formBlock}>
            <Text style={styles.detailLabel}>소개</Text>
            <View style={styles.inputPlaceholder}>
              <TextInput
                value={profileEditDescription}
                onChangeText={setProfileEditDescription}
                placeholder="소개를 입력해주세요 (최대 20자)"
                placeholderTextColor={colors.gray3}
                style={styles.inputField}
                maxLength={20}
              />
            </View>
          </View>
          <View style={styles.formBlock}>
            <Text style={styles.detailLabel}>프로필 이미지</Text>
            <View style={styles.profileImageEditor}>
              <View style={styles.profileImagePreviewWrap}>
                {profileEditUseDefaultAvatar || !profileEditImageUrl ? (
                  <View style={styles.profileImagePreviewDefault}>
                    <MaterialIcons name="person" size={44} color={profileEditDefaultColor} />
                  </View>
                ) : (
                  <Image source={{ uri: profileEditImageUrl }} style={styles.profileImagePreview} />
                )}
              </View>
              <View style={styles.profileImageButtonRow}>
                <Pressable
                  style={({ pressed }) => [
                    styles.profileImageActionButton,
                    pressed && styles.pressed,
                  ]}
                  onPress={handlePickProfileImage}
                  disabled={uploadingProfileImage}
                >
                  <Text style={styles.profileImageActionText}>
                    {uploadingProfileImage ? '업로드 중...' : '파일에서 선택'}
                  </Text>
                </Pressable>
                <Pressable
                  style={({ pressed }) => [
                    styles.profileImageActionButton,
                    pressed && styles.pressed,
                  ]}
                  onPress={() => setShowDefaultAvatarPicker(true)}
                >
                  <Text style={styles.profileImageActionText}>기본 프로필 선택</Text>
                </Pressable>
              </View>
            </View>
          </View>
          <View style={styles.formBlock}>
            <Text style={styles.detailLabel}>관심 카테고리</Text>
            <View style={styles.categoryPickerWrap}>
              {profileEditCategoryOrder.map((code) => {
                const selected = selectedCategorySet.has(code);
                const color = categoryChipColorByCode[code] ?? colors.secondary3;
                return (
                  <Pressable
                    key={code}
                    style={({ pressed }) => [
                      styles.categoryChip,
                      selected ? { backgroundColor: color } : styles.categoryChipUnselected,
                      selected ? styles.categoryChipSelected : null,
                      pressed && styles.pressed,
                    ]}
                    onPress={() => toggleProfileEditCategory(code)}
                  >
                    <Text
                      style={[
                        styles.categoryChipText,
                        selected ? null : styles.categoryChipTextUnselected,
                      ]}
                    >
                      {categoryLabelByCode[code] ?? code}
                    </Text>
                  </Pressable>
                );
              })}
            </View>
            <Text style={styles.categoryHintText}>
              최소 1개, 최대 6개 선택 가능합니다.
            </Text>
          </View>
          <Pressable
            style={[styles.submitButton, submittingProfileEdit ? styles.submitButtonDisabled : null]}
            onPress={handleSubmitProfileEdit}
            disabled={submittingProfileEdit}
          >
            <Text style={styles.submitButtonText}>
              {submittingProfileEdit ? '변경 중...' : '변경하기'}
            </Text>
          </Pressable>

          <Modal
            visible={showDefaultAvatarPicker}
            transparent
            animationType="fade"
            onRequestClose={() => setShowDefaultAvatarPicker(false)}
          >
            <Pressable
              style={styles.defaultAvatarModalOverlay}
              onPress={() => setShowDefaultAvatarPicker(false)}
            >
              <Pressable
                style={styles.defaultAvatarModalCard}
                onPress={(event) => event.stopPropagation()}
              >
                <Text style={styles.defaultAvatarModalTitle}>원하시는 색상을 선택해주세요.</Text>
                <View style={styles.defaultAvatarGrid}>
                  {defaultProfilePalette.map((color) => {
                    const selected = profileEditDefaultColor === color;
                    return (
                      <Pressable
                        key={color}
                        style={[
                          styles.defaultAvatarOption,
                          selected ? styles.defaultAvatarOptionSelected : null,
                        ]}
                        onPress={() => handleSelectDefaultAvatarColor(color)}
                      >
                        <MaterialIcons name="person" size={42} color={color} />
                      </Pressable>
                    );
                  })}
                </View>
              </Pressable>
            </Pressable>
          </Modal>
        </View>
      );
    }

    if (selectedSetting === '비밀번호 변경') {
      return (
        <View style={styles.settingsDetailWrap}>
          {back}
          <Text style={styles.detailTitle}>{selectedSetting}</Text>
          <Text style={styles.detailDivider} />
          <View style={styles.formBlock}>
            <Text style={styles.detailLabel}>기존 비밀번호</Text>
            <View style={styles.inputPlaceholder}>
              <TextInput
                value={passwordCurrent}
                onChangeText={setPasswordCurrent}
                placeholder="기존 비밀번호를 입력해주세요"
                placeholderTextColor={colors.gray3}
                style={styles.inputField}
                secureTextEntry
              />
            </View>
          </View>
          <View style={styles.formBlock}>
            <Text style={styles.detailLabel}>새 비밀번호</Text>
            <View style={styles.inputPlaceholder}>
              <TextInput
                value={passwordNext}
                onChangeText={setPasswordNext}
                placeholder="새 비밀번호를 입력해주세요"
                placeholderTextColor={colors.gray3}
                style={styles.inputField}
                secureTextEntry
              />
            </View>
            <View style={styles.inputPlaceholder}>
              <TextInput
                value={passwordConfirm}
                onChangeText={setPasswordConfirm}
                placeholder="비밀번호 확인"
                placeholderTextColor={colors.gray3}
                style={styles.inputField}
                secureTextEntry
              />
            </View>
          </View>
          <Pressable
            style={[styles.submitButton, submittingPasswordUpdate ? styles.submitButtonDisabled : null]}
            onPress={handleSubmitPasswordUpdate}
            disabled={submittingPasswordUpdate}
          >
            <Text style={styles.submitButtonText}>
              {submittingPasswordUpdate ? '변경 중...' : '변경하기'}
            </Text>
          </Pressable>
        </View>
      );
    }

    if (selectedSetting === '탈퇴/비활성화') {
      return (
        <View style={styles.settingsDetailWrap}>
          {back}
          <Text style={styles.detailTitle}>탈퇴/비활성화</Text>
          <Text style={styles.detailDivider} />
          <View style={styles.detailList}>
            <Text style={styles.detailBody}>
              1. 탈퇴 신청 후 보류 기간{'\n'}- 탈퇴 신청 시 즉시 탈퇴가 아닌 7일간의 유예 기간이 적용됩니다.{'\n'}- 이 기간
              동안에는 언제든 탈퇴를 철회할 수 있습니다.
            </Text>
            <Text style={styles.detailBody}>
              2. 탈퇴 처리{'\n'}- 유예 기간(7일)이 지나면 회원 정보와 활동 기록은 모두 영구적으로 삭제됩니다.{'\n'}- 단, 법적
              보관 의무가 있는 데이터는 관련 법령에 따라 일정 기간 보관 후 파기됩니다.
            </Text>
            <Text style={styles.detailBody}>
              3. 주의사항{'\n'}- 유예 기간(7일)이 지나면 복구가 불가능하며, 동일 계정으로 재가입해도 기존 데이터는 복원되지
              않습니다.
            </Text>
          </View>
          <Pressable
            style={[
              styles.submitButton,
              styles.submitButtonDanger,
              submittingWithdrawal ? styles.submitButtonDisabled : null,
            ]}
            onPress={handleWithdrawMember}
            disabled={submittingWithdrawal}
          >
            <Text style={styles.submitButtonText}>
              {submittingWithdrawal ? '처리 중...' : '탈퇴 신청하기'}
            </Text>
          </Pressable>
        </View>
      );
    }

    if (selectedSetting === '내 소식 관리') {
      return (
        <View style={styles.settingsDetailWrap}>
          {back}
          <Text style={styles.detailTitle}>내 소식 관리</Text>
          <Text style={styles.detailDivider} />
          {renderMyNews()}
        </View>
      );
    }

    if (selectedSetting === '신고 관리') {
      return (
        <View style={styles.settingsDetailWrap}>
          {back}
          <Text style={styles.detailTitle}>신고 관리</Text>
          <Text style={styles.detailDivider} />
          {loadingReportHistory ? (
            <Text style={styles.loadingText}>신고 목록을 불러오는 중...</Text>
          ) : null}
          {!loadingReportHistory && reportHistory.length === 0 ? (
            <Text style={styles.emptyText}>신고한 내역이 없습니다.</Text>
          ) : null}
          <View style={styles.reportList}>
            {reportHistory.map((report) => (
              <View key={report.id} style={styles.reportCard}>
                <Text style={styles.reportBadge}>{report.reportType}</Text>
                <View style={styles.reportHeader}>
                  <Text style={styles.reportUser}>{report.reportedMemberNickname}</Text>
                  {report.createdAtLabel ? (
                    <Text style={styles.reportDate}>{report.createdAtLabel}</Text>
                  ) : null}
                </View>
                <Text style={styles.reportText}>{report.content}</Text>
              </View>
            ))}
          </View>
        </View>
      );
    }

    if (selectedSetting === '이용약관') {
      return (
        <ScrollView
          style={styles.container}
          contentContainerStyle={styles.settingsDetailWrap}
          showsVerticalScrollIndicator={false}
        >
          {back}
          <Text style={styles.detailTitle}>이용약관</Text>
          <Text style={styles.detailDivider} />
          <Text style={styles.detailBody}>
            제 1조 (목적){'\n'}본 약관은 책모(이하 “서비스”)가 제공하는 독서 커뮤니티 플랫폼 및 관련 제반 서비스의 이용과
            관련하여 서비스와 회원 간의 권리, 의무 및 책임을 규정할 목적으로 합니다.{'\n\n'}제 2조 (정의){'\n'}본 약관에서
            사용하는 용어의 정의는 다음과 같습니다.{'\n'}1. “서비스”란 책모가 제공하는 웹 및 애플리케이션 기반의 독서 커뮤니티,
            모임, 콘텐츠 공유 등 일체의 서비스를 의미합니다.
          </Text>
        </ScrollView>
      );
    }

    if (selectedSetting === '알림 관리') {
      return (
        <View style={styles.settingsDetailWrap}>
          {back}
          <Text style={styles.detailTitle}>알림 관리</Text>
          <Text style={styles.detailDivider} />
          {loadingNotificationSettings ? (
            <Text style={styles.loadingText}>알림 설정을 불러오는 중...</Text>
          ) : null}
          {notificationSettingRows.map((row) => {
            const enabled = notificationSettings[row.key];
            const toggling = togglingNotificationSetting === row.type;
            return (
              <View key={row.type} style={styles.alarmRow}>
                <View style={styles.alarmInfo}>
                  <Text style={styles.detailLabel}>{row.label}</Text>
                  <Text style={styles.detailBody}>내 활동에 대한 알림 수신</Text>
                </View>
                <NotificationToggle
                  enabled={enabled}
                  disabled={toggling}
                  onPress={() => handleToggleNotificationSetting(row.type)}
                />
              </View>
            );
          })}
        </View>
      );
    }

    if (selectedSetting === '이메일 변경') {
      return (
        <View style={styles.settingsDetailWrap}>
          {back}
          <Text style={styles.detailTitle}>이메일 변경</Text>
          <Text style={styles.detailDivider} />
          <View style={styles.formBlock}>
            <Text style={styles.detailLabel}>기존 이메일</Text>
            <View style={styles.inputPlaceholder}>
              <TextInput
                value={emailCurrent}
                onChangeText={setEmailCurrent}
                placeholder="기존 이메일을 입력해주세요"
                placeholderTextColor={colors.gray3}
                style={styles.inputField}
                autoCapitalize="none"
                keyboardType="email-address"
              />
            </View>
          </View>
          <View style={styles.formBlock}>
            <Text style={styles.detailLabel}>변경 이메일</Text>
            <View style={styles.inputPlaceholder}>
              <TextInput
                value={emailNext}
                onChangeText={setEmailNext}
                placeholder="변경할 이메일을 입력해주세요"
                placeholderTextColor={colors.gray3}
                style={styles.inputField}
                autoCapitalize="none"
                keyboardType="email-address"
              />
            </View>
          </View>
          <View style={styles.formBlock}>
            <Text style={styles.detailLabel}>인증번호</Text>
            <View style={styles.inputPlaceholder}>
              <TextInput
                value={emailVerificationCode}
                onChangeText={setEmailVerificationCode}
                placeholder="인증번호 입력"
                placeholderTextColor={colors.gray3}
                style={styles.inputField}
              />
            </View>
          </View>
          <Pressable
            style={[styles.submitButton, submittingEmailUpdate ? styles.submitButtonDisabled : null]}
            onPress={handleSubmitEmailUpdate}
            disabled={submittingEmailUpdate}
          >
            <Text style={styles.submitButtonText}>
              {submittingEmailUpdate ? '변경 중...' : '변경하기'}
            </Text>
          </Pressable>
        </View>
      );
    }

    return (
      <View style={styles.settingsDetailWrap}>
        {back}
        <Text style={styles.detailTitle}>{selectedSetting}</Text>
      </View>
    );
  };

  if (showFollowPage) {
    return (
      <ScreenLayout title="마이페이지">
        <ScrollView
          style={styles.container}
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={() => {
                setRefreshing(true);
                const refresh = async () => {
                  await loadFollowUsers();
                  setRefreshing(false);
                };
                void refresh();
              }}
              tintColor={colors.primary1}
              colors={[colors.primary1]}
            />
          }
        >
          {renderFollowPage()}
        </ScrollView>
      </ScreenLayout>
    );
  }

  if (showSettings) {
    return (
      <ScreenLayout title="마이페이지">
        <ScrollView
          style={styles.container}
          contentContainerStyle={styles.settingsContent}
          showsVerticalScrollIndicator={false}
        >
          {selectedSetting ? null : (
            <View style={styles.breadcrumbRow}>
              <Pressable
                style={({ pressed }) => [
                  styles.breadcrumbRow,
                  pressed && styles.pressed,
                ]}
                onPress={() => {
                  setShowSettings(false);
                }}
              >
                <Text style={styles.breadcrumbText}>뒤로가기</Text>
              </Pressable>
            </View>
          )}

          {selectedSetting ? (
            renderSettingDetail()
          ) : (
            <>
              {settingsSections.map((section) => (
                <View key={section.title} style={styles.settingsSection}>
                  <View style={styles.settingsHeader}>
                    <SvgUri uri={section.iconUri} width={18} height={18} />
                    <Text style={styles.settingsTitle}>{section.title}</Text>
                  </View>
                  <View style={styles.settingsItems}>
                    {section.items.map((item) => (
                      <Pressable
                        key={item}
                        style={({ pressed }) => [styles.settingsItem, pressed && styles.pressed]}
                        disabled={item === '로그아웃' && submittingLogout}
                        onPress={() => {
                          if (item === '고객센터/문의하기') {
                            handleContact();
                            return;
                          }
                          if (item === '로그아웃') {
                            handleLogoutPress();
                            return;
                          }
                          setSelectedSetting(item);
                        }}
                      >
                        <Text style={styles.settingsItemText}>
                          {item === '로그아웃' && submittingLogout ? '로그아웃 중...' : item}
                        </Text>
                      </Pressable>
                    ))}
                  </View>
                </View>
              ))}
            </>
          )}
        </ScrollView>
      </ScreenLayout>
    );
  }

  return (
    <ScreenLayout title="마이페이지">
      <View style={styles.container}>
        <ScrollView
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={() => {
                setRefreshing(true);
                const refresh = async () => {
                  await loadMyPageData();
                  if (activeTab === '내 알림') {
                    await loadAllNotifications();
                  }
                  if (selectedSetting === '알림 관리') {
                    await loadNotificationSettingInfo();
                  }
                  setRefreshing(false);
                };
                void refresh();
              }}
              tintColor={colors.primary1}
              colors={[colors.primary1]}
            />
          }
        >
        <View style={styles.breadcrumbRow}>
          <Text style={styles.breadcrumbText}>전체</Text>
          <MaterialIcons name="chevron-right" size={16} color={colors.gray4} />
          <Text style={[styles.breadcrumbText, styles.breadcrumbActive]}>마이페이지</Text>
        </View>

        <View style={styles.profileRow}>
          <View style={styles.profileAvatar}>
            {profileImageUrl ? (
              <Image source={{ uri: profileImageUrl }} style={styles.profileAvatarImage} />
            ) : (
              <DefaultProfileAvatar size={64} />
            )}
          </View>
          <View style={styles.profileMeta}>
            <Text style={styles.profileName}>{profileName}</Text>
            <View style={styles.profileFollowRow}>
              <Pressable onPress={openFollowerList} hitSlop={6}>
                <Text style={styles.profileSub}>구독자 {followerCount}</Text>
              </Pressable>
              <Pressable onPress={openFollowingList} hitSlop={6}>
                <Text style={styles.profileSub}>구독중 {followingCount}</Text>
              </Pressable>
            </View>
            <Text style={styles.profileDesc} numberOfLines={2}>
              {profileDesc}
            </Text>
            {profileCategories.length > 0 ? (
              <Text style={styles.profileCategory}>
                관심 카테고리 · {profileCategories.join(', ')}
              </Text>
            ) : null}
            {loadingProfile ? <Text style={styles.loadingText}>프로필을 불러오는 중...</Text> : null}
          </View>
          <Pressable
            onPress={() => setShowSettings(true)}
            style={({ pressed }) => (pressed ? styles.pressed : undefined)}
          >
            <SvgUri uri={settingIconUri} width={22} height={22} />
          </Pressable>
        </View>

        <View style={styles.actionButtons}>
          <Pressable
            style={({ pressed }) => [styles.primaryButton, pressed && styles.pressed]}
            onPress={handleWriteStory}
          >
            <Text style={styles.primaryButtonText}>책 이야기 쓰기</Text>
          </Pressable>
          <Pressable
            style={({ pressed }) => [styles.secondaryButton, pressed && styles.pressed]}
            onPress={handleContact}
          >
            <Text style={styles.secondaryButtonText}>소식 문의하기</Text>
          </Pressable>
        </View>

        <View style={styles.tabRow}>
          {tabs.map((tab) => {
            const active = tab === activeTab;
            return (
              <Pressable
                key={tab}
                style={({ pressed }) => [
                  styles.tabButton,
                  active ? styles.tabActive : null,
                  pressed && styles.pressed,
                ]}
                onPress={() => setActiveTab(tab)}
              >
                <Text style={[styles.tabLabel, active ? styles.tabLabelActive : null]}>
                  {tab}
                </Text>
              </Pressable>
            );
          })}
        </View>

        <View style={styles.tabContent}>{renderTabContent()}</View>
        </ScrollView>

        <Modal
          visible={Boolean(groupMenu)}
          transparent
          animationType="fade"
          onRequestClose={() => setGroupMenu(null)}
        >
          <Pressable style={styles.groupMenuBackdrop} onPress={() => setGroupMenu(null)}>
            {groupMenu ? (
              <Pressable
                style={[
                  styles.groupMenuPopover,
                  getMenuPosition(groupMenu.pageX, groupMenu.pageY, screenWidth, screenHeight),
                ]}
                onPress={(event) => event.stopPropagation()}
              >
                <Pressable
                  style={styles.groupMenuItem}
                  onPress={() => {
                    const target = groupMenu.group;
                    setGroupMenu(null);
                    handleLeaveGroup(target);
                  }}
                >
                  <Text style={styles.groupMenuText}>탈퇴하기</Text>
                </Pressable>
              </Pressable>
            ) : null}
          </Pressable>
        </Modal>
      </View>
    </ScreenLayout>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  scrollContent: {
    padding: spacing.md,
    gap: spacing.md,
    paddingBottom: spacing.xl * 2,
  },
  breadcrumbRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs / 2,
  },
  breadcrumbText: {
    ...typography.body2_3,
    color: colors.gray4,
  },
  breadcrumbActive: {
    color: colors.gray6,
  },
  settingsContent: {
    padding: spacing.md,
    gap: spacing.md,
    paddingBottom: spacing.xl * 2,
    backgroundColor: colors.background,
  },
  settingsSection: {
    gap: spacing.sm,
  },
  settingsHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
  },
  settingsTitle: {
    ...typography.body1_2,
    color: colors.gray6,
  },
  settingsItems: {
    gap: spacing.xs,
    paddingLeft: spacing.xl,
  },
  settingsItem: {
    paddingVertical: spacing.xs,
  },
  settingsItemText: {
    ...typography.body1_3,
    color: colors.gray5,
  },
  settingsDetailWrap: {
    gap: spacing.sm,
  },
  detailTitle: {
    ...typography.subhead3,
    color: colors.gray6,
  },
  detailDivider: {
    width: '100%',
    height: StyleSheet.hairlineWidth,
    backgroundColor: colors.gray2,
  },
  detailLabel: {
    ...typography.body1_2,
    color: colors.gray6,
  },
  detailBody: {
    ...typography.body1_3,
    color: colors.gray6,
    lineHeight: 22,
  },
  formBlock: {
    gap: spacing.xs,
    marginBottom: spacing.sm,
  },
  profileImageEditor: {
    borderWidth: 1,
    borderColor: colors.gray2,
    borderRadius: radius.md,
    padding: spacing.md,
    backgroundColor: colors.white,
    gap: spacing.sm,
  },
  profileImagePreviewWrap: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  profileImagePreviewDefault: {
    width: 96,
    height: 96,
    borderRadius: 48,
    borderWidth: 1,
    borderColor: colors.subbrown3,
    backgroundColor: colors.background,
    alignItems: 'center',
    justifyContent: 'center',
  },
  profileImagePreview: {
    width: 96,
    height: 96,
    borderRadius: 48,
    borderWidth: 1,
    borderColor: colors.subbrown3,
    backgroundColor: colors.background,
  },
  profileImageButtonRow: {
    flexDirection: 'row',
    gap: spacing.xs,
  },
  profileImageActionButton: {
    flex: 1,
    borderWidth: 1,
    borderColor: colors.subbrown2,
    borderRadius: radius.sm,
    paddingVertical: spacing.xs,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.background,
  },
  profileImageActionText: {
    ...typography.body2_3,
    color: colors.gray6,
  },
  categoryPickerWrap: {
    borderWidth: 1,
    borderColor: colors.subbrown2,
    borderStyle: 'dashed',
    borderRadius: radius.md,
    padding: spacing.sm,
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.xs,
    backgroundColor: colors.white,
  },
  categoryChip: {
    borderRadius: radius.sm,
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs / 2,
    borderWidth: 1,
    borderColor: 'transparent',
  },
  categoryChipUnselected: {
    backgroundColor: colors.gray2,
  },
  categoryChipSelected: {
    borderColor: colors.primary1,
    borderWidth: 2,
  },
  categoryChipText: {
    ...typography.body2_2,
    color: colors.white,
  },
  categoryChipTextUnselected: {
    color: colors.gray5,
  },
  categoryHintText: {
    ...typography.body2_3,
    color: colors.gray4,
  },
  defaultAvatarModalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.35)',
    paddingHorizontal: spacing.md,
    alignItems: 'center',
    justifyContent: 'center',
  },
  defaultAvatarModalCard: {
    width: '100%',
    maxWidth: 420,
    borderRadius: radius.lg,
    backgroundColor: colors.white,
    padding: spacing.lg,
    gap: spacing.md,
  },
  defaultAvatarModalTitle: {
    ...typography.body1_2,
    color: colors.gray6,
  },
  defaultAvatarGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    rowGap: spacing.md,
  },
  defaultAvatarOption: {
    width: '19%',
    aspectRatio: 1,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: colors.subbrown3,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.background,
  },
  defaultAvatarOptionSelected: {
    borderColor: colors.primary1,
    borderWidth: 2,
  },
  inputPlaceholder: {
    borderWidth: 1,
    borderColor: colors.gray2,
    borderRadius: radius.md,
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.md,
    backgroundColor: colors.white,
  },
  inputField: {
    ...typography.body1_3,
    color: colors.gray6,
    paddingVertical: 0,
  },
  inputFieldMultiline: {
    minHeight: 88,
    textAlignVertical: 'top',
  },
  submitButton: {
    backgroundColor: colors.primary1,
    paddingVertical: spacing.sm,
    borderRadius: radius.md,
    alignItems: 'center',
  },
  submitButtonDisabled: {
    opacity: 0.7,
  },
  submitButtonDanger: {
    backgroundColor: colors.gray6,
  },
  submitButtonText: {
    ...typography.body1_2,
    color: colors.white,
  },
  reportTypeRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.xs,
  },
  reportTypeChip: {
    borderWidth: 1,
    borderColor: colors.gray2,
    borderRadius: radius.lg,
    backgroundColor: colors.white,
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs / 2,
  },
  reportTypeChipActive: {
    borderColor: colors.primary1,
    backgroundColor: colors.subbrown4,
  },
  reportTypeChipText: {
    ...typography.body2_3,
    color: colors.gray5,
  },
  reportTypeChipTextActive: {
    color: colors.primary1,
  },
  detailList: {
    gap: spacing.sm,
  },
  reportList: {
    gap: spacing.sm,
  },
  reportCard: {
    backgroundColor: colors.white,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.subbrown4,
    padding: spacing.md,
    gap: spacing.xs,
  },
  reportBadge: {
    alignSelf: 'flex-start',
    backgroundColor: colors.secondary1,
    color: colors.white,
    ...typography.body2_3,
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs / 2,
    borderRadius: radius.lg,
  },
  reportHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  reportUser: {
    ...typography.body1_3,
    color: colors.gray6,
  },
  reportDate: {
    ...typography.body2_3,
    color: colors.gray4,
  },
  reportText: {
    ...typography.body2_3,
    color: colors.gray5,
  },
  alarmRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: colors.white,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.subbrown4,
    padding: spacing.md,
    gap: spacing.sm,
  },
  alarmInfo: {
    flex: 1,
    gap: spacing.xs / 2,
  },
  alarmDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: colors.gray3,
  },
  alarmDotActive: {
    backgroundColor: colors.likeRed,
  },
  alarmBody: {
    flex: 1,
  },
  alarmText: {
    ...typography.body1_3,
    color: colors.gray6,
  },
  alarmTime: {
    ...typography.body2_3,
    color: colors.gray4,
  },
  myNewsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.white,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.subbrown4,
    padding: spacing.sm,
    gap: spacing.sm,
  },
  myNewsThumb: {
    width: 64,
    height: 64,
    borderRadius: radius.sm,
    backgroundColor: colors.gray1,
  },
  myNewsThumbPlaceholder: {
    width: 64,
    height: 64,
    borderRadius: radius.sm,
    backgroundColor: colors.gray1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  myNewsBody: {
    flex: 1,
    gap: spacing.xs / 2,
  },
  myNewsTitle: {
    ...typography.body1_2,
    color: colors.gray6,
  },
  myNewsExcerpt: {
    ...typography.body2_3,
    color: colors.gray5,
  },
  myNewsDate: {
    ...typography.body2_3,
    color: colors.gray4,
    alignSelf: 'flex-start',
  },
  toggleButton: {
    width: 44,
    height: 24,
    alignItems: 'center',
    justifyContent: 'center',
  },
  toggleTrack: {
    width: '100%',
    height: '100%',
    borderRadius: 12,
    borderWidth: 1,
    paddingHorizontal: 2,
    justifyContent: 'center',
  },
  toggleButtonDisabled: {
    opacity: 0.65,
  },
  toggleThumb: {
    width: 18,
    height: 18,
    borderRadius: 9,
    backgroundColor: colors.white,
  },
  followPageWrap: {
    gap: spacing.md,
  },
  followProfileArea: {
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.xs,
    paddingVertical: spacing.md,
  },
  followProfileAvatar: {
    width: 92,
    height: 92,
    borderRadius: 46,
    borderWidth: 1,
    borderColor: colors.subbrown3,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.white,
    overflow: 'hidden',
  },
  followProfileAvatarImage: {
    width: '100%',
    height: '100%',
  },
  followProfileName: {
    ...typography.subhead3,
    color: colors.gray6,
  },
  followTabRow: {
    flexDirection: 'row',
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.gray2,
  },
  followTabButton: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: spacing.sm,
    borderBottomWidth: 2,
    borderBottomColor: 'transparent',
  },
  followTabActive: {
    borderBottomColor: colors.primary1,
  },
  followTabText: {
    ...typography.body1_3,
    color: colors.gray4,
  },
  followTabTextActive: {
    color: colors.gray6,
  },
  followListWrap: {
    gap: spacing.xs,
    paddingTop: spacing.sm,
  },
  followUserRow: {
    backgroundColor: colors.white,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.subbrown4,
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.md,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  followUserMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    flex: 1,
  },
  followUserAvatar: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: colors.gray1,
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  followUserAvatarImage: {
    width: '100%',
    height: '100%',
  },
  followUserName: {
    ...typography.body1_3,
    color: colors.gray6,
  },
  followButton: {
    minWidth: 56,
    borderRadius: radius.sm,
    paddingVertical: spacing.xs / 1.5,
    paddingHorizontal: spacing.sm,
    alignItems: 'center',
    justifyContent: 'center',
  },
  followButtonActive: {
    backgroundColor: colors.subbrown4,
  },
  followButtonInactive: {
    backgroundColor: colors.primary1,
  },
  followButtonText: {
    ...typography.body2_2,
  },
  followButtonTextActive: {
    color: colors.primary3,
  },
  followButtonTextInactive: {
    color: colors.white,
  },
  followDeleteButton: {
    minWidth: 56,
    borderRadius: radius.sm,
    paddingVertical: spacing.xs / 1.5,
    paddingHorizontal: spacing.sm,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: colors.gray2,
    backgroundColor: colors.white,
  },
  followDeleteButtonDisabled: {
    opacity: 0.6,
  },
  followDeleteButtonText: {
    ...typography.body2_2,
    color: colors.gray5,
  },
  profileRow: {
    flexDirection: 'row',
    gap: spacing.md,
    alignItems: 'center',
  },
  profileAvatar: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: colors.gray2,
  },
  profileAvatarImage: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: colors.gray2,
  },
  profileMeta: {
    flex: 1,
    gap: spacing.xs / 2,
  },
  profileFollowRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
  },
  profileName: {
    ...typography.subhead4_1,
    color: colors.gray6,
  },
  profileSub: {
    ...typography.body2_3,
    color: colors.gray4,
  },
  profileDesc: {
    ...typography.body1_3,
    color: colors.gray6,
  },
  profileCategory: {
    ...typography.body2_3,
    color: colors.gray5,
    lineHeight: 20,
    flexShrink: 1,
  },
  actionButtons: {
    flexDirection: 'row',
    gap: spacing.sm,
  },
  primaryButton: {
    flex: 1,
    backgroundColor: colors.primary1,
    borderRadius: radius.md,
    paddingVertical: spacing.sm,
    alignItems: 'center',
    justifyContent: 'center',
  },
  primaryButtonText: {
    ...typography.body1_2,
    color: colors.white,
  },
  secondaryButton: {
    flex: 1,
    backgroundColor: colors.white,
    borderRadius: radius.md,
    paddingVertical: spacing.sm,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: colors.gray2,
  },
  secondaryButtonText: {
    ...typography.body1_2,
    color: colors.gray6,
  },
  tabRow: {
    flexDirection: 'row',
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.gray2,
  },
  tabButton: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: spacing.sm,
  },
  tabActive: {
    borderBottomWidth: 2,
    borderBottomColor: colors.primary1,
  },
  tabLabel: {
    ...typography.body1_3,
    color: colors.gray4,
  },
  tabLabelActive: {
    color: colors.primary1,
  },
  tabContent: {
    minHeight: 200,
  },
  gridContent: {
    gap: spacing.sm,
    paddingVertical: spacing.sm,
  },
  cardWrap: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
  },
  storyCard: {
    width: '48%',
    backgroundColor: colors.white,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.subbrown4,
    padding: spacing.sm,
    gap: spacing.xs,
  },
  storyThumb: {
    backgroundColor: colors.gray1,
    borderRadius: radius.sm,
    aspectRatio: 1,
    overflow: 'hidden',
  },
  storyThumbImage: {
    width: '100%',
    height: '100%',
  },
  storyTitle: {
    ...typography.body1_2,
    color: colors.gray6,
  },
  storyExcerpt: {
    ...typography.body2_3,
    color: colors.gray5,
  },
  storyActions: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  inlineAction: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs / 2,
  },
  inlineText: {
    ...typography.body2_3,
    color: colors.gray5,
  },
  actionDivider: {
    width: 1,
    height: 16,
    backgroundColor: colors.gray2,
  },
  bookWrap: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
  },
  bookCard: {
    width: '30%',
    backgroundColor: colors.white,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.subbrown4,
    padding: spacing.xs,
    gap: spacing.xs / 2,
    alignItems: 'center',
  },
  bookThumb: {
    width: '100%',
    aspectRatio: 2 / 3,
    borderRadius: radius.sm,
    backgroundColor: colors.gray1,
    overflow: 'hidden',
    justifyContent: 'flex-start',
  },
  bookThumbImage: {
    width: '100%',
    height: '100%',
  },
  bookLikeBadge: {
    position: 'absolute',
    top: spacing.xs,
    left: spacing.xs,
  },
  bookTitle: {
    ...typography.body2_2,
    color: colors.gray6,
    alignSelf: 'flex-start',
  },
  bookAuthor: {
    ...typography.body2_3,
    color: colors.gray5,
    alignSelf: 'flex-start',
  },
  listContainer: {
    gap: spacing.sm,
    paddingVertical: spacing.sm,
  },
  loadingText: {
    ...typography.body2_3,
    color: colors.gray4,
  },
  emptyText: {
    ...typography.body1_3,
    color: colors.gray5,
  },
  groupRow: {
    backgroundColor: colors.white,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.subbrown4,
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.md,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  groupName: {
    ...typography.body1_3,
    color: colors.gray6,
    flex: 1,
  },
  groupMenuButton: {
    marginLeft: spacing.sm,
    paddingVertical: spacing.xs / 2,
    paddingHorizontal: spacing.xs / 2,
  },
  groupMenuBackdrop: {
    flex: 1,
  },
  groupMenuPopover: {
    position: 'absolute',
    width: 112,
    backgroundColor: colors.white,
    borderRadius: radius.sm,
    borderWidth: 1,
    borderColor: colors.subbrown4,
    overflow: 'hidden',
  },
  groupMenuItem: {
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.md,
  },
  groupMenuText: {
    ...typography.body2_2,
    color: colors.gray6,
  },
  pressed: {
    opacity: 0.7,
  },
});
