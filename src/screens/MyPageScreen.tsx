import { useMemo, useState, useCallback, useEffect, useRef } from 'react';
import {
  Alert,
  Animated,
  BackHandler,
  Easing,
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
import {
  useFocusEffect,
  useNavigation,
  useRoute,
  useScrollToTop,
  type NavigationProp,
  type ParamListBase,
  type RouteProp,
} from '@react-navigation/native';
import { PUBLIC_ENV } from '../constants/publicEnv';
import {
  BOOKSTORY_COMMENT_URI,
  BOOKSTORY_LIKE_URI,
  MYPAGE_SETTING_OTHER_URI,
  MYPAGE_SETTING_PROFILE_URI,
  MYPAGE_SETTING_SERVICE_URI,
  MYPAGE_SETTING_URI,
} from '../constants/iconMap';
import { termsDocumentOrder, termsDocuments } from '../constants/termsDocuments';
import { buttonSize, colors, interactionOpacity, motion, radius, spacing, typography, scaleSize } from '../theme';
import { FeedbackPressable as Pressable } from '../components/common/FeedbackPressable';
import { DefaultProfileAvatar } from '../components/common/DefaultProfileAvatar';
import { ScreenLayout } from '../components/common/ScreenLayout';
import { ActionMenu, type ActionMenuItem } from '../components/common/ActionMenu';
import { DialogOverlay } from '../components/common/DialogOverlay';
import { BookFlipLoadingScreen } from '../components/common/BookFlipLoadingScreen';
import { FormTextInput } from '../components/common/FormTextInput';
import { useAuthGate } from '../contexts/AuthGateContext';
import { useLanguage } from '../contexts/LanguageContext';
import { checkNicknameDuplicate, issueProfileImageUploadUrl } from '../services/api/authApi';
import { ApiError } from '../services/api/http';
import {
  fetchAllMyLikedBooks,
  toggleBookLikeByIsbn,
  type MemberLikedBookItem,
} from '../services/api/bookApi';
import {
  publishBookLikeState,
  resolveBookLikeId,
  subscribeBookLikeState,
} from '../services/api/bookLikeApi';
import { deleteBookStory, fetchMyBookStories } from '../services/api/bookStoryApi';
import { fetchMyClubs, leaveClub, type ClubCategoryCode } from '../services/api/clubApi';
import { CATEGORY_CODE_TO_LABEL, CATEGORY_CHIP_COLOR } from '../constants/domain/category';
import {
  deleteFollowerMember,
  fetchMyFollowCount,
  fetchMyFollowers,
  fetchMyFollowing,
  fetchMyProfile,
  setFollowingMember,
  updateMyProfile,
  fetchBlockedMembers,
  unblockMember,
  type BlockedMember,
} from '../services/api/memberApi';
import { fetchMyNewsList, type RemoteNewsSummary } from '../services/api/newsApi';
import { formatKstDateLabel } from '../utils/date';
import { triggerSelectionHaptic } from '../utils/haptics';
import { normalizeRemoteImageUrl } from '../utils/image';
import { showToast } from '../utils/toast';
import { pickAndUploadImage } from '../utils/imageUpload';
import { collectAllCursorPages } from '../utils/pagination';
import { resolveApiError } from '../utils/resolveApiError';
import { useConsumeRouteParam } from '../hooks/useConsumeRouteParam';
import { useUnsavedChangesGuard } from '../hooks/useUnsavedChangesGuard';
import { INPUT_LIMITS } from '../constants/inputLimits';
import { nicknameRegex } from '../constants/validation';
import { BOOK_DEFAULT_IMAGE } from '../constants/defaultAssets';
import {
  useNotificationState,
  notificationSettingRows,
  type AlarmItem,
} from './mypage/useNotificationState';
import { useAccountSettingsState, type ReportHistoryItem } from './mypage/useAccountSettingsState';
import { SkeletonBox } from '../components/common/SkeletonBox';
import { languageOptions, type LanguageCode } from '../i18n/translations';

const tabs = ['내 책 이야기', '내 서재', '내 모임', '내 알림'] as const;
const reportContentBreakInterval = 28;
const softBreak = String.fromCharCode(8203);

function formatReportContent(content: string): string {
  return content
    .split(/(\s+)/)
    .map((part) => {
      if (/^\s+$/.test(part) || part.length <= reportContentBreakInterval) return part;
      return Array.from(part).reduce((acc, char, index) => {
        const needsBreak = index > 0 && index % reportContentBreakInterval === 0;
        return `${acc}${needsBreak ? softBreak : ''}${char}`;
      }, '');
    })
    .join('');
}

type TabKey = (typeof tabs)[number];
type MyPageRouteParams = {
  openMyTab?: TabKey | 'ALARM';
  openFollowTab?: 'FOLLOWER' | 'FOLLOWING';
};

type SettingItemKey =
  | 'profileEdit'
  | 'emailChange'
  | 'passwordChange'
  | 'withdrawal'
  | 'myNews'
  | 'report'
  | 'blocked'
  | 'notifications'
  | 'contact'
  | 'terms'
  | 'version'
  | 'language'
  | 'logout';

type SettingsItem = {
  key: SettingItemKey;
  label: string;
};

type SettingsSection = {
  title: string;
  iconUri: typeof MYPAGE_SETTING_PROFILE_URI;
  items: SettingsItem[];
};

type StoryCard = {
  id: string;
  remoteId?: number;
  title: string;
  excerpt: string;
  imageUrl?: string;
  likes: number;
  comments: number;
  status?: 'DRAFT' | 'PUBLISHED';
  bookInfo?: {
    isbn?: string;
    title?: string;
    author?: string;
    imgUrl?: string;
  };
};

type BookCard = {
  id: string;
  isbn: string;
  bookId?: number;
  title: string;
  author: string;
  imageUrl?: string;
  liked: boolean;
};

function toBookLikePayload(book: BookCard) {
  return {
    isbn: book.isbn,
    bookId: book.bookId,
    title: book.title,
    author: book.author,
    imgUrl: book.imageUrl,
  };
}

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

type FollowUser = {
  nickname: string;
  profileImageUrl?: string;
  following: boolean;
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



const fallbackBooks: BookCard[] = [];

type GroupMenuState = {
  group: GroupItem;
  pageX: number;
  pageY: number;
};

function normalizeImageUrl(url?: string): string | undefined {
  return normalizeRemoteImageUrl(url);
}

function toDateLabel(value?: string): string {
  return formatKstDateLabel(value);
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
  const visitedCursors = new Set<number>();

  for (let i = 0; i < 100; i += 1) {
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
    if (visitedCursors.has(result.nextCursor)) break;

    visitedCursors.add(result.nextCursor);
    cursorId = result.nextCursor;
  }

  const uniqueByNickname = new Map<string, FollowUser>();
  all.forEach((item) => {
    uniqueByNickname.set(item.nickname, item);
  });

  return Array.from(uniqueByNickname.values());
}

const STORY_FEED_ERROR_OVERRIDES = { 401: '로그인 상태를 확인해 주십시오.', 403: '접근 권한이 없습니다.', 404: '요청한 책이야기를 찾을 수 없습니다.' } as const;
const MY_PAGE_FETCH_ERROR_OVERRIDES = { 400: '요청 정보를 다시 확인해야 합니다.', 401: '로그인 상태를 확인해 주십시오.', 403: '접근 권한이 없습니다.', 404: '요청한 정보를 찾을 수 없습니다.' } as const;

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
      duration: motion.duration.normal,
      easing: Easing.out(Easing.cubic),
      useNativeDriver: false, // backgroundColor 애니메이션은 native driver 불가
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
  const { isLoggedIn, logout, requireAuth } = useAuthGate();
  const { language, setLanguage, t, l } = useLanguage();
  const myPageScrollRef = useRef<ScrollView>(null);
  useScrollToTop(myPageScrollRef);
  const navigation = useNavigation<NavigationProp<ParamListBase>>();
  const route = useRoute<RouteProp<{ My: MyPageRouteParams }, 'My'>>();
  const { width: screenWidth, height: screenHeight } = useWindowDimensions();
  const bookshelfCardWidth = useMemo(() => {
    const columns = 3;
    const horizontalPadding = scaleSize(spacing.md) * 2;
    const totalGaps = scaleSize(spacing.sm) * (columns - 1);
    const width = Math.floor((screenWidth - horizontalPadding - totalGaps) / columns);
    return width > 0 ? width : 0;
  }, [screenWidth]);
  const [activeTab, setActiveTab] = useState<TabKey>('내 책 이야기');
  const [refreshing, setRefreshing] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [selectedSetting, setSelectedSetting] = useState<SettingItemKey | null>(null);
  const [stories, setStories] = useState<StoryCard[]>([]);
  const [deletingDraftStoryId, setDeletingDraftStoryId] = useState<number | null>(null);
  const [blockedMembers, setBlockedMembers] = useState<BlockedMember[]>([]);
  const [loadingBlockedMembers, setLoadingBlockedMembers] = useState(false);
  const [books, setBooks] = useState<BookCard[]>([]);
  const [myNews, setMyNews] = useState<MyNewsItem[]>([]);
  const [groups, setGroups] = useState<GroupItem[]>([]);
  const [profileName, setProfileName] = useState('user_id');
  const [profileDesc, setProfileDesc] = useState(
    '이제 다양한 책을 함께 읽고 서로의 생각을 나누는 특별한 시간을 시작해보세요. 한 권의 책이 주는 작은 울림이 ......',
  );
  const [profileImageUrl, setProfileImageUrl] = useState<string | undefined>(undefined);
  const [profilePhoneNumber, setProfilePhoneNumber] = useState('');
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
  const [loadingMyNews, setLoadingMyNews] = useState(false);
  const [loadingGroups, setLoadingGroups] = useState(false);
  const [loadingProfile, setLoadingProfile] = useState(false);
  const [loadingFollowUsers, setLoadingFollowUsers] = useState(false);
  const [groupMenu, setGroupMenu] = useState<GroupMenuState | null>(null);
  const [profileEditDescription, setProfileEditDescription] = useState('');
  const [profileEditImageUrl, setProfileEditImageUrl] = useState('');
  const [profileEditCategoryCodes, setProfileEditCategoryCodes] = useState<string[]>([]);
  const [profileEditUseDefaultAvatar, setProfileEditUseDefaultAvatar] = useState(false);
  const [uploadingProfileImage, setUploadingProfileImage] = useState(false);
  const [submittingProfileEdit, setSubmittingProfileEdit] = useState(false);
  const [profileEditNickname, setProfileEditNickname] = useState('');
  const [nicknameChecked, setNicknameChecked] = useState(true);
  const [nicknameStatus, setNicknameStatus] = useState<'idle' | 'available' | 'duplicate'>('idle');
  const [checkingNickname, setCheckingNickname] = useState(false);

  const {
    alarms,
    loadingAlarms,
    notificationSettings,
    loadingNotificationSettings,
    togglingNotificationSetting,
    loadAllNotifications,
    loadNotificationSettingInfo,
    handlePressAlarm,
    handleToggleNotificationSetting,
  } = useNotificationState({ isLoggedIn, navigation });

  const {
    emailCurrent,
    setEmailCurrent,
    emailNext,
    setEmailNext,
    emailVerificationCode,
    setEmailVerificationCode,
    emailVerificationSent,
    emailVerified,
    sendingEmailVerificationCode,
    confirmingEmailVerificationCode,
    remainingEmailVerificationSeconds,
    emailVerificationRemainingText,
    submittingEmailUpdate,
    passwordCurrent,
    setPasswordCurrent,
    passwordNext,
    setPasswordNext,
    passwordConfirm,
    setPasswordConfirm,
    showPasswordCurrent,
    setShowPasswordCurrent,
    showPasswordNext,
    setShowPasswordNext,
    showPasswordConfirm,
    setShowPasswordConfirm,
    submittingPasswordUpdate,
    reportHistory,
    loadingReportHistory,
    submittingWithdrawal,
    submittingLogout,
    loadReportHistory,
    resetEmailVerification,
    handleSendEmailVerificationCode,
    handleConfirmEmailVerificationCode,
    handleSubmitEmailUpdate,
    handleSubmitPasswordUpdate,
    handleWithdrawMember,
    handleLogoutPress,
  } = useAccountSettingsState({
    isLoggedIn,
    logout,
    navigation,
    onCloseSettings: () => {
      setShowSettings(false);
      setSelectedSetting(null);
    },
    selectedSettingKey: selectedSetting,
  });

  const SettingIcon = MYPAGE_SETTING_URI;
  const settingProfileIcon = MYPAGE_SETTING_PROFILE_URI;
  const settingServiceIcon = MYPAGE_SETTING_SERVICE_URI;
  const settingOtherIcon = MYPAGE_SETTING_OTHER_URI;
  const LikeIcon = BOOKSTORY_LIKE_URI;
  const CommentIcon = BOOKSTORY_COMMENT_URI;
  const getSettingLabel = useCallback(
    (key: SettingItemKey) => {
      switch (key) {
        case 'profileEdit':
          return t('settings.profileEdit');
        case 'emailChange':
          return t('settings.emailChange');
        case 'passwordChange':
          return t('settings.passwordChange');
        case 'withdrawal':
          return t('settings.withdrawal');
        case 'myNews':
          return t('settings.myNews');
        case 'report':
          return t('settings.report');
        case 'blocked':
          return t('settings.blocked');
        case 'notifications':
          return t('settings.notifications');
        case 'contact':
          return t('settings.contact');
        case 'terms':
          return t('settings.terms');
        case 'version':
          return t('settings.version');
        case 'language':
          return t('settings.language');
        case 'logout':
          return t('settings.logout');
        default:
          return key;
      }
    },
    [t],
  );
  const getTabLabel = useCallback(
    (tab: TabKey) => {
      switch (tab) {
        case '내 책 이야기':
          return t('profile.tabs.myStories');
        case '내 서재':
          return t('profile.tabs.bookshelf');
        case '내 모임':
          return t('profile.tabs.clubs');
        case '내 알림':
          return t('profile.tabs.alarms');
        default:
          return tab;
      }
    },
    [t],
  );
  const currentLanguageLabel =
    languageOptions.find((option) => option.code === language)?.label ?? languageOptions[0].label;
  const displayProfileName = isLoggedIn ? profileName : t('profile.needLoginName');
  const displayProfileDesc = isLoggedIn ? profileDesc : t('profile.needLoginDescription');
  const handleSelectLanguage = useCallback(
    (nextLanguage: LanguageCode) => {
      if (nextLanguage === language) return;
      void setLanguage(nextLanguage);
    },
    [language, setLanguage],
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
        liked: true,
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

  const loadLikedBooks = useCallback(async () => {
    setLoadingBooks(true);
    try {
      const items = await fetchAllMyLikedBooks();
      setBooks(mapLikedBooksToCards(items));
    } finally {
      setLoadingBooks(false);
    }
  }, [mapLikedBooksToCards]);

  useEffect(() => {
    return subscribeBookLikeState(({ likeId, liked, book }) => {
      setBooks((prev) => {
        const existingIndex = prev.findIndex((item) => resolveBookLikeId(item) === likeId);
        if (!liked) {
          return existingIndex >= 0
            ? prev.filter((_, index) => index !== existingIndex)
            : prev;
        }

        if (existingIndex >= 0) {
          return prev.map((item, index) =>
            index === existingIndex ? { ...item, liked: true } : item,
          );
        }

        if (!book) return prev;

        const nextBook: BookCard = {
          id: likeId,
          isbn: book.isbn.trim(),
          bookId: book.bookId,
          title: book.title.trim() || '책 제목',
          author: book.author.trim() || '작가 미상',
          imageUrl: normalizeRemoteImageUrl(book.imgUrl),
          liked: true,
        };
        return [nextBook, ...prev];
      });
    });
  }, []);

  const loadMyPageData = useCallback(async () => {
    if (!isLoggedIn) {
      setStories([]);
      setBooks(fallbackBooks);
      setMyNews([]);
      setGroups([]);
      setProfileName('로그인이 필요해요');
      setProfileDesc('로그인 후 마이페이지 기능을 이용할 수 있습니다.');
      setProfileImageUrl(undefined);
      setProfilePhoneNumber('');
      setProfileCategoryCodes([]);
      setProfileCategories([]);
      setFollowerUsers([]);
      setFollowingUsers([]);
      setFollowerCount(0);
      setFollowingCount(0);
      setLoadingProfile(false);
      setLoadingStories(false);
      setLoadingBooks(false);
      setLoadingGroups(false);
      setLoadingMyNews(false);
      setLoadingFollowUsers(false);
      return;
    }

    setLoadingProfile(true);
    setLoadingStories(true);
    setLoadingGroups(true);

    await Promise.all([
      (async () => {
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
                .map((code) => CATEGORY_CODE_TO_LABEL[code as ClubCategoryCode] ?? code)
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
      })(),
      (async () => {
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
      })(),
      (async () => {
        try {
          const allStories = await collectAllCursorPages({
            fetchPage: (cursor) => fetchMyBookStories(cursor),
            dedupeId: (item) => item.id,
          });
          const mapped: StoryCard[] = allStories.map((item) => ({
            id: `s-${item.id}`,
            remoteId: item.id,
            title: item.title || '제목 없음',
            excerpt: item.description || '내용이 없습니다.',
            imageUrl: normalizeImageUrl(item.bookInfo?.imgUrl),
            likes: item.likeCount ?? 0,
            comments: item.commentCount ?? 0,
            status: item.status,
            bookInfo: item.bookInfo,
          }));
          setStories(mapped);
        } catch (error) {
          showToast(resolveApiError(error, STORY_FEED_ERROR_OVERRIDES, '내 책이야기를 불러오지 못했습니다.'));
        } finally {
          setLoadingStories(false);
        }
      })(),
      loadLikedBooks().catch((error) => {
        if (!(error instanceof ApiError)) {
          showToast('내 서재를 불러오지 못했습니다.');
        }
      }),
      (async () => {
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
      })(),
    ]);
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

  const loadMyNews = useCallback(async () => {
    if (!isLoggedIn) {
      setMyNews([]);
      return;
    }

    setLoadingMyNews(true);
    try {
      const allItems: RemoteNewsSummary[] = [];
      let cursorId: number | undefined;
      const visitedCursors = new Set<number>();
      const seenNewsIds = new Set<number>();

      for (let i = 0; i < 100; i += 1) {
        const response = await fetchMyNewsList(cursorId);
        response.items.forEach((item) => {
          if (seenNewsIds.has(item.id)) return;
          seenNewsIds.add(item.id);
          allItems.push(item);
        });
        if (!response.hasNext || typeof response.nextCursor !== 'number') break;
        if (visitedCursors.has(response.nextCursor)) break;

        visitedCursors.add(response.nextCursor);
        cursorId = response.nextCursor;
      }

      setMyNews(mapMyNewsItems(allItems));
    } catch (error) {
      setMyNews([]);
      showToast(resolveApiError(error, MY_PAGE_FETCH_ERROR_OVERRIDES, '내 소식을 불러오지 못했습니다.'));
    } finally {
      setLoadingMyNews(false);
    }
  }, [isLoggedIn, mapMyNewsItems]);

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
      setUploadingProfileImage(true);
      try {
        const imageUrl = await pickAndUploadImage(issueProfileImageUploadUrl, 'profile');
        if (!imageUrl) return;
        setProfileEditImageUrl(imageUrl);
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


  const handleProfileEditNicknameChange = useCallback((text: string) => {
    const filtered = text
      .replace(/[^a-z0-9!@#$%^&*()_+\-=\[\]{};':"\\|,.<>/?]/g, '')
      .slice(0, INPUT_LIMITS.NICKNAME);
    setProfileEditNickname(filtered);
    // 현재 닉네임 그대로면 자동 통과, 바뀌면 중복확인 필요
    setNicknameChecked(filtered === profileName);
    setNicknameStatus('idle');
  }, [profileName]);

  const handleCheckNickname = useCallback(() => {
    const nickname = profileEditNickname.trim();
    if (!nickname) {
      showToast('닉네임을 입력해주세요.');
      return;
    }
    // 본인 현재 닉네임이면 중복으로 처리하지 않고 API 호출 생략
    if (nickname === profileName) {
      setNicknameChecked(true);
      setNicknameStatus('idle');
      showToast('현재 사용 중인 닉네임입니다.');
      return;
    }
    setCheckingNickname(true);
    const run = async () => {
      try {
        const duplicate = await checkNicknameDuplicate(nickname);
        if (duplicate) {
          setNicknameChecked(false);
          setNicknameStatus('duplicate');
          showToast('이미 사용 중인 닉네임입니다.');
        } else {
          setNicknameChecked(true);
          setNicknameStatus('available');
          showToast('사용 가능한 닉네임입니다.');
        }
      } catch (error) {
        setNicknameChecked(false);
        showToast(error instanceof ApiError ? error.message : '닉네임 확인 중 오류가 발생했습니다.');
      } finally {
        setCheckingNickname(false);
      }
    };
    void run();
  }, [profileEditNickname, profileName]);

  const handleSubmitProfileEdit = useCallback(() => {
    const nickname = profileEditNickname.trim();
    if (!nickname) {
      showToast('닉네임을 입력해주세요.');
      return;
    }
    if (!nicknameRegex.test(nickname)) {
      showToast('닉네임은 영어 소문자/숫자/특수문자만 사용할 수 있습니다.');
      return;
    }
    if (nickname !== profileName && !nicknameChecked) {
      showToast('닉네임 중복확인을 해주세요.');
      return;
    }

    const description = profileEditDescription.trim();
    if (description.length > INPUT_LIMITS.USER_DESCRIPTION) {
      showToast(`소개는 ${INPUT_LIMITS.USER_DESCRIPTION}자 이내여야 합니다.`);
      return;
    }

    const categories =
      profileEditCategoryCodes.length > 0 ? profileEditCategoryCodes : profileCategoryCodes;
    if (categories.length === 0) {
      showToast('관심 카테고리를 1개 이상 선택해야 합니다.');
      return;
    }

    setSubmittingProfileEdit(true);
    const submit = async () => {
      try {
        const imageUrl = profileEditUseDefaultAvatar ? '' : profileEditImageUrl.trim() || undefined;
        const updated = await updateMyProfile({
          nickname,
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
        const nextNickname = updated?.nickname ?? nickname;

        setProfileName(nextNickname || '_사용자');
        setProfileDesc(nextDescription || '소개글이 없습니다.');
        setProfileImageUrl(nextImageUrl);
        setProfilePhoneNumber(nextPhoneNumber);
        setProfileCategoryCodes(nextCategoryCodes);
        setProfileCategories(
          nextCategoryCodes
            .map((code) => CATEGORY_CODE_TO_LABEL[code as ClubCategoryCode] ?? code)
            .filter((label) => label.length > 0),
        );
        setSelectedSetting(null);
        setShowSettings(false);
        showToast('프로필이 변경되었습니다.');
      } catch (error) {
        if (error instanceof ApiError) {
          // 중복확인 ↔ 저장 사이에 닉네임이 선점된 경우(BE 재검증) 다시 확인하도록 초기화
          if (error.code === 'MEMBER_416') {
            setNicknameChecked(false);
            setNicknameStatus('duplicate');
          }
        } else {
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
    profileEditDescription,
    profileEditImageUrl,
    profileEditUseDefaultAvatar,
    profilePhoneNumber,
    profileEditNickname,
    profileName,
    nicknameChecked,
  ]);

  const handleProfileEditBack = useCallback(() => {
    const originalDesc = profileDesc === '소개글이 없습니다.' ? '' : profileDesc;
    const originalCodes = [...profileCategoryCodes].sort().join(',');
    const currentCodes = [...profileEditCategoryCodes].sort().join(',');
    const isDirty =
      profileEditNickname !== profileName ||
      profileEditDescription !== originalDesc ||
      profileEditImageUrl !== (profileImageUrl ?? '') ||
      profileEditUseDefaultAvatar !== !profileImageUrl ||
      currentCodes !== originalCodes;

    if (!isDirty) {
      setSelectedSetting(null);
      return;
    }

    Alert.alert(
      '변경사항',
      '변경된 내용이 저장되지 않습니다.',
      [
        { text: '취소', style: 'cancel' },
        { text: '나가기', style: 'destructive', onPress: () => setSelectedSetting(null) },
      ],
    );
  }, [
    profileDesc,
    profileName,
    profileEditNickname,
    profileCategoryCodes,
    profileEditCategoryCodes,
    profileEditDescription,
    profileEditImageUrl,
    profileImageUrl,
    profileEditUseDefaultAvatar,
  ]);

  const handleCloseSelectedSetting = useCallback(() => {
    setSelectedSetting(null);
  }, []);

  const passwordUpdateDirty = useMemo(
    () =>
      passwordCurrent.length > 0 ||
      passwordNext.length > 0 ||
      passwordConfirm.length > 0,
    [passwordConfirm, passwordCurrent, passwordNext],
  );
  const emailUpdateDirty = useMemo(
    () =>
      emailCurrent.trim().length > 0 ||
      emailNext.trim().length > 0 ||
      emailVerificationCode.trim().length > 0 ||
      emailVerificationSent ||
      emailVerified,
    [emailCurrent, emailNext, emailVerificationCode, emailVerificationSent, emailVerified],
  );
  const accountUpdateGuardEnabled =
    selectedSetting === 'passwordChange' || selectedSetting === 'emailChange';

  const { requestClose: handleAccountUpdateBack } = useUnsavedChangesGuard({
    enabled: accountUpdateGuardEnabled,
    isDirty:
      selectedSetting === 'passwordChange'
        ? passwordUpdateDirty
        : selectedSetting === 'emailChange'
          ? emailUpdateDirty
          : false,
    onConfirmLeave: handleCloseSelectedSetting,
    title: '변경사항',
    message: '변경된 내용이 저장되지 않습니다.',
    confirmText: '나가기',
  });

  useEffect(() => {
    if (selectedSetting !== 'profileEdit') return;
    const sub = BackHandler.addEventListener('hardwareBackPress', () => {
      handleProfileEditBack();
      return true;
    });
    return () => sub.remove();
  }, [handleProfileEditBack, selectedSetting]);

  const openFollowerList = useCallback(() => {
    if (!isLoggedIn) {
      requireAuth(() => {
        setGroupMenu(null);
        setActiveFollowTab('FOLLOWER');
        setShowFollowPage(true);
        void loadFollowUsers();
      });
      return;
    }
    setGroupMenu(null);
    setActiveFollowTab('FOLLOWER');
    setShowFollowPage(true);
    void loadFollowUsers();
  }, [isLoggedIn, loadFollowUsers, requireAuth]);

  const openFollowingList = useCallback(() => {
    if (!isLoggedIn) {
      requireAuth(() => {
        setGroupMenu(null);
        setActiveFollowTab('FOLLOWING');
        setShowFollowPage(true);
        void loadFollowUsers();
      });
      return;
    }
    setGroupMenu(null);
    setActiveFollowTab('FOLLOWING');
    setShowFollowPage(true);
    void loadFollowUsers();
  }, [isLoggedIn, loadFollowUsers, requireAuth]);

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
        showToast('책 정보가 없어 서재 상태를 변경할 수 없습니다.');
        return;
      }

      const current = books.find((item) => item.id === book.id);
      const bookLikePayload = toBookLikePayload(book);

      if (current) {
        const nextLiked = !current.liked;
        const previousBooks = books;
        setBooks((prev) => {
          if (nextLiked) {
            return prev.map((item) =>
              item.id === book.id ? { ...item, liked: true } : item,
            );
          }
          return prev.filter((item) => item.id !== book.id);
        });
        try {
          await toggleBookLikeByIsbn(book.isbn);
          publishBookLikeState(bookLikePayload, nextLiked);
          showToast(nextLiked ? '내 서재에 담았습니다.' : '좋아요가 취소되었습니다.');
        } catch (error) {
          setBooks(previousBooks);
          if (!(error instanceof ApiError)) {
            showToast('내 서재 업데이트에 실패했습니다.');
          }
        }
      } else {
        const newBook: BookCard = { ...book, liked: true };
        setBooks((prev) => [newBook, ...prev]);
        try {
          await toggleBookLikeByIsbn(book.isbn);
          publishBookLikeState(bookLikePayload, true);
          showToast('내 서재에 담았습니다.');
        } catch (error) {
          setBooks((prev) => prev.filter((item) => item.id !== book.id));
          if (!(error instanceof ApiError)) {
            showToast('내 서재 업데이트에 실패했습니다.');
          }
        }
      }
    };
    void submit();
  }, [books]);

  const handleDeleteDraftStory = useCallback(
    (story: StoryCard) => {
      const storyId = story.remoteId;
      if (story.status !== 'DRAFT' || typeof storyId !== 'number' || storyId <= 0) {
        showToast('삭제할 임시저장을 찾을 수 없습니다.');
        return;
      }
      if (deletingDraftStoryId === storyId) return;

      Alert.alert(
        '임시저장 삭제',
        `'${story.title}' 임시저장을 삭제하시겠습니까?`,
        [
          { text: '취소', style: 'cancel' },
          {
            text: '삭제',
            style: 'destructive',
            onPress: () => {
              setDeletingDraftStoryId(storyId);
              const submit = async () => {
                try {
                  await deleteBookStory(storyId);
                  setStories((prev) => prev.filter((item) => item.remoteId !== storyId));
                  showToast('임시저장을 삭제했습니다.');
                } catch (error) {
                  showToast(
                    resolveApiError(
                      error,
                      STORY_FEED_ERROR_OVERRIDES,
                      '임시저장을 삭제하지 못했습니다.',
                    ),
                  );
                } finally {
                  setDeletingDraftStoryId((prev) => (prev === storyId ? null : prev));
                }
              };
              void submit();
            },
          },
        ],
      );
    },
    [deletingDraftStoryId],
  );

  const renderStories = () => (
    <View style={[styles.gridContent, styles.cardWrap]}>
      {loadingStories ? (
        <>
          {[0, 1, 2, 3].map((i) => (
            <View key={i} style={styles.storyCard}>
              <View style={styles.storyThumb}>
                <SkeletonBox style={{ width: '100%', height: '100%' }} />
              </View>
              <View style={styles.storyTextWrap}>
                <SkeletonBox style={{ height: 40, borderRadius: radius.xs }} />
                <SkeletonBox style={{ height: 34, width: '75%', borderRadius: radius.xs }} />
              </View>
              <View style={styles.storyActions}>
                <SkeletonBox style={{ flex: 1, height: 16, borderRadius: radius.xs }} />
                <View style={styles.actionDivider} />
                <SkeletonBox style={{ flex: 1, height: 16, borderRadius: radius.xs }} />
              </View>
            </View>
          ))}
        </>
      ) : null}
      {!loadingStories && stories.length === 0 ? (
        <Text style={styles.emptyText}>{l('작성한 책이야기가 없습니다.')}</Text>
      ) : null}
      {stories.map((item) => (
        <Pressable
          key={item.id}
          style={({ pressed }) => [styles.storyCard, pressed && styles.pressed]}
          disabled={deletingDraftStoryId === item.remoteId}
          onPress={() => {
            if (typeof item.remoteId !== 'number' || item.remoteId <= 0) {
              showToast('해당 책이야기를 찾을 수 없습니다.');
              return;
            }
            if (item.status === 'DRAFT') {
              navigation.navigate('Story', {
                openDraftId: item.remoteId,
                openDraftTitle: item.title,
                openDraftBody: item.excerpt,
                openDraftBook: item.bookInfo,
              });
            } else {
              navigation.navigate('Story', { openStoryId: item.remoteId });
            }
          }}
        >
          <View style={styles.storyThumb}>
            {item.imageUrl ? (
              <Image source={{ uri: item.imageUrl }} style={styles.storyThumbImage} resizeMode="cover" />
            ) : null}
          </View>
          <View style={styles.storyTextWrap}>
            <Text style={styles.storyTitle} numberOfLines={2}>
              {item.title}
            </Text>
            <Text style={styles.storyExcerpt} numberOfLines={2}>
              {item.excerpt}
            </Text>
          </View>
          <View style={styles.storyActions}>
            {item.status === 'DRAFT' ? (
              <View style={styles.draftActions}>
                <Text style={styles.draftBadge}>{l('임시저장')}</Text>
                <Pressable
                  style={({ pressed }) => [
                    styles.draftDeleteButton,
                    deletingDraftStoryId === item.remoteId && styles.draftDeleteButtonDisabled,
                    pressed && deletingDraftStoryId !== item.remoteId && styles.pressed,
                  ]}
                  onPress={(event) => {
                    event.stopPropagation();
                    handleDeleteDraftStory(item);
                  }}
                  disabled={deletingDraftStoryId === item.remoteId}
                  accessibilityRole="button"
                  accessibilityLabel={l('{title} 임시저장 삭제', { title: item.title })}
                >
                  <Text style={styles.draftDeleteButtonText}>
                    {deletingDraftStoryId === item.remoteId ? l('삭제 중...') : l('삭제')}
                  </Text>
                </Pressable>
              </View>
            ) : (
              <>
                <View style={styles.inlineAction}>
                  <LikeIcon width={18} height={18} />
                  <Text style={styles.inlineText}>{item.likes}</Text>
                </View>
                <View style={styles.actionDivider} />
                <View style={styles.inlineAction}>
                  <CommentIcon width={18} height={18} />
                  <Text style={styles.inlineText}>{item.comments}</Text>
                </View>
              </>
            )}
          </View>
        </Pressable>
      ))}
    </View>
  );

  const renderBooks = () => (
    <View style={[styles.gridContent, styles.bookWrap]}>
      {loadingBooks ? (
        <>
          {[0, 1, 2, 3, 4, 5].map((i) => (
            <View key={i} style={[styles.bookCard, { width: bookshelfCardWidth }]}>
              <SkeletonBox style={{ width: '100%', aspectRatio: 2 / 3, borderRadius: radius.sm }} />
              <SkeletonBox style={{ height: 14, width: '85%', borderRadius: radius.xs }} />
              <SkeletonBox style={{ height: 12, width: '60%', borderRadius: radius.xs }} />
            </View>
          ))}
        </>
      ) : null}
      {!loadingBooks && books.length === 0 ? (
        <Text style={styles.emptyText}>{l('내 서재에 표시할 책이 없습니다.')}</Text>
      ) : null}
      {books.map((item) => (
        <View key={item.id} style={[styles.bookCard, { width: bookshelfCardWidth }]}>
          <View style={styles.bookThumb}>
            <Image source={{ uri: item.imageUrl || BOOK_DEFAULT_IMAGE }} style={styles.bookThumbImage} resizeMode="cover" />
            <Pressable
              style={({ pressed }) => [styles.bookLikeBadge, pressed && styles.pressed]}
              onPress={() => handleToggleBookLike(item)}
            >
              <MaterialIcons
                name={item.liked ? 'favorite' : 'favorite-border'}
                size={18}
                color={item.liked ? colors.secondary1 : colors.gray3}
              />
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
      {loadingGroups ? (
        <>
          {[0, 1, 2].map((i) => (
            <View key={i} style={styles.groupRow}>
              <SkeletonBox style={{ flex: 1, height: 18, borderRadius: radius.xs, marginRight: spacing.sm }} />
              <SkeletonBox style={{ width: 18, height: 18, borderRadius: radius.xs }} />
            </View>
          ))}
        </>
      ) : null}
      {!loadingGroups && groups.length === 0 ? (
        <Text style={styles.emptyText}>{l('가입한 모임이 없습니다.')}</Text>
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
      {loadingAlarms ? (
        <>
          {[0, 1, 2].map((i) => (
            <View key={i} style={styles.alarmRow}>
              <SkeletonBox style={{ width: 8, height: 8, borderRadius: 4 }} />
              <SkeletonBox style={{ flex: 1, height: 16, borderRadius: radius.xs }} />
              <SkeletonBox style={{ width: 40, height: 12, borderRadius: radius.xs }} />
            </View>
          ))}
        </>
      ) : null}
      {!loadingAlarms && alarms.length === 0 ? (
        <Text style={styles.emptyText}>{l('도착한 알림이 없습니다.')}</Text>
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
      {loadingMyNews ? (
        <>
          {[0, 1, 2].map((i) => (
            <View key={i} style={styles.myNewsRow}>
              <SkeletonBox style={{ width: 64, height: 64, borderRadius: radius.sm }} />
              <View style={styles.myNewsBody}>
                <SkeletonBox style={{ height: 16, width: '90%', borderRadius: radius.xs }} />
                <SkeletonBox style={{ height: 13, width: '70%', borderRadius: radius.xs }} />
              </View>
              <SkeletonBox style={{ width: 40, height: 12, alignSelf: 'flex-start', borderRadius: radius.xs }} />
            </View>
          ))}
        </>
      ) : null}
      {!loadingMyNews && myNews.length === 0 ? (
        <Text style={styles.emptyText}>{l('등록한 소식이 없습니다.')}</Text>
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

  const renderGuestPrompt = () => (
    <View style={styles.guestPromptWrap}>
      <Text style={styles.emptyText}>{t('profile.guestPrompt')}</Text>
      <Pressable
        style={({ pressed }) => [styles.guestPromptButton, pressed && styles.pressed]}
        onPress={() => requireAuth()}
      >
        <Text style={styles.guestPromptButtonText}>{t('profile.loginButton')}</Text>
      </Pressable>
    </View>
  );

  const renderTabContent = () => {
    if (!isLoggedIn) {
      return renderGuestPrompt();
    }

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
          <Text style={styles.breadcrumbText}>{t('common.all')}</Text>
          <MaterialIcons name="chevron-right" size={16} color={colors.gray4} />
          <Text style={[styles.breadcrumbText, styles.breadcrumbActive]}>{t('profile.screenTitle')}</Text>
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
          onPress={() => {
            triggerSelectionHaptic();
            setActiveFollowTab('FOLLOWER');
          }}
        >
          <Text
            style={[
              styles.followTabText,
              activeFollowTab === 'FOLLOWER' && styles.followTabTextActive,
            ]}
          >
            {t('profile.subscribers')} {followerCount}
          </Text>
        </Pressable>
        <Pressable
          style={[styles.followTabButton, activeFollowTab === 'FOLLOWING' && styles.followTabActive]}
          onPress={() => {
            triggerSelectionHaptic();
            setActiveFollowTab('FOLLOWING');
          }}
        >
          <Text
            style={[
              styles.followTabText,
              activeFollowTab === 'FOLLOWING' && styles.followTabTextActive,
            ]}
          >
            {t('profile.subscribing')} {followingCount}
          </Text>
        </Pressable>
      </View>

      <View style={styles.followListWrap}>
        {loadingFollowUsers ? (
          <>
            {[0, 1, 2].map((i) => (
              <View key={i} style={styles.followUserRow}>
                <View style={styles.followUserMeta}>
                  <SkeletonBox style={{ width: 28, height: 28, borderRadius: 14 }} />
                  <SkeletonBox style={{ flex: 1, height: 16, borderRadius: radius.xs }} />
                </View>
                <SkeletonBox style={{ width: 56, height: 26, borderRadius: radius.sm }} />
              </View>
            ))}
          </>
        ) : null}

        {!loadingFollowUsers && activeFollowUsers.length === 0 ? (
          <Text style={styles.emptyText}>{l('표시할 사용자가 없습니다.')}</Text>
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
                <Text style={styles.followDeleteButtonText}>
                  {deleting ? l('삭제 중...') : l('삭제')}
                </Text>
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
                  {user.following ? t('profile.following') : t('profile.follow')}
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
    if (alarms.length > 0) return;
    void loadAllNotifications();
  }, [activeTab, loadAllNotifications, alarms.length]);

  useEffect(() => {
    if (selectedSetting !== 'notifications') return;
    void loadNotificationSettingInfo();
  }, [loadNotificationSettingInfo, selectedSetting]);

  useEffect(() => {
    if (selectedSetting !== 'myNews') return;
    void loadMyNews();
  }, [loadMyNews, selectedSetting]);

  useEffect(() => {
    if (selectedSetting !== 'report') return;
    void loadReportHistory();
  }, [loadReportHistory, selectedSetting]);

  const loadBlockedMembers = useCallback(async () => {
    setLoadingBlockedMembers(true);
    try {
      const result = await fetchBlockedMembers();
      setBlockedMembers(result.items);
    } catch {
      showToast('차단 목록을 불러오지 못했습니다.');
    } finally {
      setLoadingBlockedMembers(false);
    }
  }, []);

  const handleUnblockMember = useCallback((nickname: string) => {
    Alert.alert(l('차단 해제'), l('{nickname} 님의 차단을 해제하시겠습니까?', { nickname }), [
      { text: l('취소'), style: 'cancel' },
      {
        text: l('해제'),
        onPress: async () => {
          try {
            await unblockMember(nickname);
            setBlockedMembers((prev) => prev.filter((m) => m.nickname !== nickname));
            showToast('차단이 해제되었습니다.');
          } catch {
            showToast('차단 해제에 실패했습니다.');
          }
        },
      },
    ]);
  }, []);

  useEffect(() => {
    if (selectedSetting !== 'blocked') return;
    void loadBlockedMembers();
  }, [loadBlockedMembers, selectedSetting]);

  useEffect(() => {
    if (selectedSetting !== 'profileEdit') return;
    setProfileEditNickname(profileName);
    setNicknameChecked(true);
    setNicknameStatus('idle');
    setProfileEditDescription(profileDesc === '소개글이 없습니다.' ? '' : profileDesc);
    setProfileEditImageUrl(profileImageUrl ?? '');
    setProfileEditCategoryCodes(profileCategoryCodes);
    setProfileEditUseDefaultAvatar(!profileImageUrl);
  }, [profileCategoryCodes, profileDesc, profileImageUrl, profileName, selectedSetting]);

  useConsumeRouteParam(
    route.params?.openMyTab,
    (raw) => (raw === 'ALARM' ? (raw as 'ALARM') : null),
    () => {
      setShowFollowPage(false);
      setShowSettings(false);
      setSelectedSetting(null);
      setActiveTab('내 알림');
    },
    navigation,
    'openMyTab',
  );

  useConsumeRouteParam(
    route.params?.openFollowTab,
    (raw) => (raw === 'FOLLOWER' || raw === 'FOLLOWING' ? (raw as 'FOLLOWER' | 'FOLLOWING') : null),
    (tab) => {
      setShowSettings(false);
      setSelectedSetting(null);
      setShowFollowPage(true);
      setActiveFollowTab(tab);
      void loadFollowUsers();
    },
    navigation,
    'openFollowTab',
  );

  const handleLeaveGroup = useCallback((group: GroupItem) => {
    if (typeof group.clubId !== 'number') {
      showToast('탈퇴할 수 없는 모임입니다.');
      return;
    }

    Alert.alert(l('모임 탈퇴'), l('{clubName} 모임에서 탈퇴하시겠습니까?', {
      clubName: group.name,
    }), [
      { text: l('취소'), style: 'cancel' },
      {
        text: l('탈퇴하기'),
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

  const groupMenuItems = useMemo<ActionMenuItem[]>(() => {
    if (!groupMenu) return [];
    const target = groupMenu.group;
    return [
      {
        key: 'leave',
        label: '탈퇴하기',
        destructive: true,
        onPress: () => handleLeaveGroup(target),
      },
    ];
  }, [groupMenu, handleLeaveGroup]);

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
    requireAuth(() => {
      navigation.navigate('Story', { openCompose: true });
    });
  }, [navigation, requireAuth]);

  const handleContact = useCallback(() => {
    Linking.openURL(PUBLIC_ENV.SUPPORT_FORM_URL).catch(() => null);
  }, []);

  const settingsSections = useMemo<SettingsSection[]>(() => [
    {
      title: t('settings.sections.account'),
      iconUri: settingProfileIcon,
      items: [
        { key: 'profileEdit', label: getSettingLabel('profileEdit') },
        { key: 'emailChange', label: getSettingLabel('emailChange') },
        { key: 'passwordChange', label: getSettingLabel('passwordChange') },
        { key: 'withdrawal', label: getSettingLabel('withdrawal') },
      ],
    },
    {
      title: t('settings.sections.service'),
      iconUri: settingServiceIcon,
      items: [
        { key: 'myNews', label: getSettingLabel('myNews') },
        { key: 'report', label: getSettingLabel('report') },
        { key: 'blocked', label: getSettingLabel('blocked') },
        { key: 'notifications', label: getSettingLabel('notifications') },
      ],
    },
    {
      title: t('settings.sections.other'),
      iconUri: settingOtherIcon,
      items: [
        { key: 'contact', label: getSettingLabel('contact') },
        { key: 'terms', label: getSettingLabel('terms') },
        { key: 'language', label: getSettingLabel('language') },
        { key: 'version', label: getSettingLabel('version') },
        { key: 'logout', label: getSettingLabel('logout') },
      ],
    },
  ], [getSettingLabel, settingOtherIcon, settingProfileIcon, settingServiceIcon, t]);

  const renderSettingDetail = () => {
    if (!selectedSetting) return null;

    const back = (
      <Pressable
        style={({ pressed }) => [styles.breadcrumbRow, pressed && styles.pressed]}
        onPress={accountUpdateGuardEnabled ? handleAccountUpdateBack : handleCloseSelectedSetting}
      >
        <MaterialIcons name="chevron-left" size={18} color={colors.gray4} />
        <Text style={styles.breadcrumbText}>{t('common.back')}</Text>
      </Pressable>
    );

    if (selectedSetting === 'version') {
      return (
        <View style={styles.settingsDetailWrap}>
          {back}
          <Text style={styles.detailTitle}>{getSettingLabel(selectedSetting)}</Text>
          <Text style={styles.detailDivider} />
          <Text style={styles.detailBody}>{t('settings.versionUpdatedAt')}</Text>
        </View>
      );
    }

    if (selectedSetting === 'language') {
      return (
        <View style={styles.settingsDetailWrap}>
          {back}
          <Text style={styles.detailTitle}>{getSettingLabel(selectedSetting)}</Text>
          <Text style={styles.detailDivider} />
          <Text style={styles.detailBody}>{t('settings.languageDescription')}</Text>
          <Text style={styles.languageCurrentText}>
            {t('settings.currentLanguage')}: {currentLanguageLabel}
          </Text>
          <View style={styles.languageList}>
            {languageOptions.map((option) => {
              const selected = option.code === language;
              return (
                <Pressable
                  key={option.code}
                  style={({ pressed }) => [
                    styles.languageItem,
                    selected ? styles.languageItemSelected : null,
                    pressed && styles.pressed,
                  ]}
                  onPress={() => handleSelectLanguage(option.code)}
                  accessibilityRole="button"
                  accessibilityState={{ selected }}
                >
                  <Text
                    style={[
                      styles.languageItemText,
                      selected ? styles.languageItemTextSelected : null,
                    ]}
                  >
                    {option.label}
                  </Text>
                  {selected ? <MaterialIcons name="check" size={20} color={colors.primary1} /> : null}
                </Pressable>
              );
            })}
          </View>
        </View>
      );
    }

    if (selectedSetting === 'profileEdit') {
      const selectedCategorySet = new Set(profileEditCategoryCodes);
      const profileEditBack = (
        <Pressable
          style={({ pressed }) => [styles.breadcrumbRow, pressed && styles.pressed]}
          onPress={handleProfileEditBack}
        >
          <MaterialIcons name="chevron-left" size={18} color={colors.gray4} />
          <Text style={styles.breadcrumbText}>{t('common.back')}</Text>
        </Pressable>
      );
      return (
        <View style={styles.settingsDetailWrap}>
          {profileEditBack}
          <Text style={styles.detailTitle}>{getSettingLabel(selectedSetting)}</Text>
          <Text style={styles.detailDivider} />
          <View style={styles.formBlock}>
            <Text style={styles.detailLabel}>{l('닉네임')}</Text>
            <View style={styles.nicknameRow}>
              <View style={[styles.inputPlaceholder, styles.nicknameInputWrap]}>
                <FormTextInput
                  value={profileEditNickname}
                  onChangeText={handleProfileEditNicknameChange}
                  placeholder={l('영어 소문자/숫자/특수문자, 최대 20자')}
                  placeholderTextColor={colors.gray3}
                  style={[styles.inputField, styles.inputFieldDescenderSafe]}
                  maxLength={INPUT_LIMITS.NICKNAME}
                  autoCapitalize="none"
                />
              </View>
              <Pressable
                style={[
                  styles.nicknameCheckButton,
                  !profileEditNickname || nicknameChecked || checkingNickname
                    ? styles.nicknameCheckButtonDisabled
                    : null,
                ]}
                disabled={!profileEditNickname || nicknameChecked || checkingNickname}
                onPress={handleCheckNickname}
              >
                <Text style={styles.nicknameCheckButtonText}>
                  {nicknameChecked ? l('확인됨') : checkingNickname ? l('확인 중') : l('중복확인')}
                </Text>
              </Pressable>
            </View>
            {profileEditNickname !== profileName ? (
              <Text
                style={[
                  styles.nicknameStatusText,
                  nicknameStatus === 'available'
                    ? styles.nicknameStatusAvailable
                    : nicknameStatus === 'duplicate'
                      ? styles.nicknameStatusDuplicate
                      : null,
                ]}
              >
                {nicknameStatus === 'available'
                  ? l('사용 가능한 닉네임입니다.')
                  : nicknameStatus === 'duplicate'
                    ? l('이미 사용 중인 닉네임입니다.')
                    : l('닉네임 중복확인을 해주세요.')}
              </Text>
            ) : null}
          </View>
          <View style={styles.formBlock}>
            <Text style={styles.detailLabel}>{l('소개')}</Text>
            <View style={styles.inputPlaceholder}>
              <FormTextInput
                value={profileEditDescription}
                onChangeText={setProfileEditDescription}
                placeholder={l('소개를 입력해주세요 (최대 {limit}자)', {
                  limit: INPUT_LIMITS.USER_DESCRIPTION,
                })}
                placeholderTextColor={colors.gray3}
                style={[styles.inputField, styles.inputFieldDescenderSafe]}
                maxLength={INPUT_LIMITS.USER_DESCRIPTION}
              />
            </View>
            <Text style={styles.inputCounterText}>
              {profileEditDescription.length}/{INPUT_LIMITS.USER_DESCRIPTION}
            </Text>
          </View>
          <View style={styles.formBlock}>
            <Text style={styles.detailLabel}>{l('프로필 이미지')}</Text>
            <View style={styles.profileImageEditor}>
              <View style={styles.profileImagePreviewWrap}>
                {profileEditUseDefaultAvatar || !profileEditImageUrl ? (
                  <View style={styles.profileImagePreviewDefault}>
                    <MaterialIcons name="person" size={44} color={colors.subbrown3} />
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
                    {uploadingProfileImage ? l('업로드 중...') : l('파일에서 선택')}
                  </Text>
                </Pressable>
                <Pressable
                  style={({ pressed }) => [
                    styles.profileImageActionButton,
                    pressed && styles.pressed,
                  ]}
                  onPress={() => { setProfileEditUseDefaultAvatar(true); setProfileEditImageUrl(''); }}
                >
                  <Text style={styles.profileImageActionText}>{l('기본 프로필 선택')}</Text>
                </Pressable>
              </View>
            </View>
          </View>
          <View style={styles.formBlock}>
            <Text style={styles.detailLabel}>{l('관심 카테고리')}</Text>
            <View style={styles.categoryPickerWrap}>
              {profileEditCategoryOrder.map((code) => {
                const selected = selectedCategorySet.has(code);
                const color = CATEGORY_CHIP_COLOR[code as ClubCategoryCode] ?? colors.secondary3;
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
                      {l(CATEGORY_CODE_TO_LABEL[code as ClubCategoryCode] ?? code)}
                    </Text>
                  </Pressable>
                );
              })}
            </View>
            <Text style={styles.categoryHintText}>
              {l('최소 1개, 최대 6개 선택 가능합니다.')}
            </Text>
          </View>
          <Pressable
            style={[styles.submitButton, submittingProfileEdit ? styles.submitButtonDisabled : null]}
            onPress={handleSubmitProfileEdit}
            disabled={submittingProfileEdit}
          >
            <Text style={styles.submitButtonText}>
              {submittingProfileEdit ? l('변경 중...') : l('변경하기')}
            </Text>
          </Pressable>

        </View>
      );
    }

    if (selectedSetting === 'passwordChange') {
      return (
        <View style={styles.settingsDetailWrap}>
          {back}
          <Text style={styles.detailTitle}>{getSettingLabel(selectedSetting)}</Text>
          <Text style={styles.detailDivider} />
          <View style={styles.formBlock}>
            <Text style={styles.detailLabel}>{l('기존 비밀번호')}</Text>
            <View style={styles.inputPlaceholder}>
              <View style={styles.passwordInputRow}>
                <TextInput
                  value={passwordCurrent}
                  onChangeText={setPasswordCurrent}
                  placeholder={l('기존 비밀번호를 입력해주세요')}
                  placeholderTextColor={colors.gray3}
                  style={[styles.inputField, styles.inputFieldDescenderSafe, styles.passwordInputField]}
                  secureTextEntry={!showPasswordCurrent}
                  autoCapitalize="none"
                  autoCorrect={false}
                  spellCheck={false}
                />
                <Pressable
                  style={({ pressed }) => [styles.passwordToggleButton, pressed && styles.pressed]}
                  hitSlop={8}
                  onPress={() => setShowPasswordCurrent((prev) => !prev)}
                >
                  <MaterialIcons
                    name={showPasswordCurrent ? 'visibility-off' : 'visibility'}
                    size={20}
                    color={colors.gray4}
                  />
                </Pressable>
              </View>
            </View>
          </View>
          <View style={styles.formBlock}>
            <Text style={styles.detailLabel}>{l('새 비밀번호')}</Text>
            <View style={styles.inputPlaceholder}>
              <View style={styles.passwordInputRow}>
                <TextInput
                  value={passwordNext}
                  onChangeText={setPasswordNext}
                  placeholder={l('새 비밀번호를 입력해주세요')}
                  placeholderTextColor={colors.gray3}
                  style={[styles.inputField, styles.inputFieldDescenderSafe, styles.passwordInputField]}
                  secureTextEntry={!showPasswordNext}
                  autoCapitalize="none"
                  autoCorrect={false}
                  spellCheck={false}
                />
                <Pressable
                  style={({ pressed }) => [styles.passwordToggleButton, pressed && styles.pressed]}
                  hitSlop={8}
                  onPress={() => setShowPasswordNext((prev) => !prev)}
                >
                  <MaterialIcons
                    name={showPasswordNext ? 'visibility-off' : 'visibility'}
                    size={20}
                    color={colors.gray4}
                  />
                </Pressable>
              </View>
            </View>
            <View style={styles.inputPlaceholder}>
              <View style={styles.passwordInputRow}>
                <TextInput
                  value={passwordConfirm}
                  onChangeText={setPasswordConfirm}
                  placeholder={l('비밀번호 확인')}
                  placeholderTextColor={colors.gray3}
                  style={[styles.inputField, styles.inputFieldDescenderSafe, styles.passwordInputField]}
                  secureTextEntry={!showPasswordConfirm}
                  autoCapitalize="none"
                  autoCorrect={false}
                  spellCheck={false}
                />
                <Pressable
                  style={({ pressed }) => [styles.passwordToggleButton, pressed && styles.pressed]}
                  hitSlop={8}
                  onPress={() => setShowPasswordConfirm((prev) => !prev)}
                >
                  <MaterialIcons
                    name={showPasswordConfirm ? 'visibility-off' : 'visibility'}
                    size={20}
                    color={colors.gray4}
                  />
                </Pressable>
              </View>
            </View>
          </View>
          <Pressable
            style={[styles.submitButton, submittingPasswordUpdate ? styles.submitButtonDisabled : null]}
            onPress={handleSubmitPasswordUpdate}
            disabled={submittingPasswordUpdate}
          >
            <Text style={styles.submitButtonText}>
              {submittingPasswordUpdate ? l('변경 중...') : l('변경하기')}
            </Text>
          </Pressable>
        </View>
      );
    }

    if (selectedSetting === 'withdrawal') {
      return (
        <View style={styles.settingsDetailWrap}>
          {back}
          <Text style={styles.detailTitle}>{getSettingLabel(selectedSetting)}</Text>
          <Text style={styles.detailDivider} />
          <View style={styles.detailList}>
            <Text style={styles.detailBody}>
              {l('1. 탈퇴 신청 후 보류 기간\n- 탈퇴 신청 시 즉시 탈퇴가 아닌 7일간의 유예 기간이 적용됩니다.\n- 이 기간 동안에는 언제든 탈퇴를 철회할 수 있습니다.')}
            </Text>
            <Text style={styles.detailBody}>
              {l('2. 탈퇴 처리\n- 유예 기간(7일)이 지나면 회원 정보와 활동 기록은 모두 영구적으로 삭제됩니다.\n- 단, 법적 보관 의무가 있는 데이터는 관련 법령에 따라 일정 기간 보관 후 파기됩니다.')}
            </Text>
            <Text style={styles.detailBody}>
              {l('3. 주의사항\n- 유예 기간(7일)이 지나면 복구가 불가능하며, 동일 계정으로 재가입해도 기존 데이터는 복원되지 않습니다.')}
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
              {submittingWithdrawal ? l('처리 중...') : l('탈퇴 신청하기')}
            </Text>
          </Pressable>
        </View>
      );
    }

    if (selectedSetting === 'myNews') {
      return (
        <View style={styles.settingsDetailWrap}>
          {back}
          <Text style={styles.detailTitle}>{getSettingLabel(selectedSetting)}</Text>
          <Text style={styles.detailDivider} />
          {renderMyNews()}
        </View>
      );
    }

    if (selectedSetting === 'report') {
      return (
        <View style={styles.settingsDetailWrap}>
          {back}
          <Text style={styles.detailTitle}>{getSettingLabel(selectedSetting)}</Text>
          <Text style={styles.detailDivider} />
          {loadingReportHistory ? (
            <View style={styles.reportList}>
              {[0, 1, 2].map((i) => (
                <View key={i} style={styles.reportCard}>
                  <SkeletonBox style={{ height: 22, width: 60, borderRadius: radius.lg }} />
                  <View style={styles.reportHeader}>
                    <SkeletonBox style={{ height: 16, width: '50%', borderRadius: radius.xs }} />
                    <SkeletonBox style={{ height: 13, width: 60, borderRadius: radius.xs }} />
                  </View>
                  <SkeletonBox style={{ height: 14, width: '85%', borderRadius: radius.xs }} />
                </View>
              ))}
            </View>
          ) : null}
          {!loadingReportHistory && reportHistory.length === 0 ? (
            <Text style={styles.emptyText}>{l('신고한 내역이 없습니다.')}</Text>
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
                <Text style={styles.reportText}>
                  {formatReportContent(report.content)}
                </Text>
              </View>
            ))}
          </View>
        </View>
      );
    }

    if (selectedSetting === 'blocked') {
      return (
        <View style={styles.settingsDetailWrap}>
          {back}
          <Text style={styles.detailTitle}>{getSettingLabel(selectedSetting)}</Text>
          <Text style={styles.detailDivider} />
          {loadingBlockedMembers ? (
            <View style={styles.reportList}>
              {[0, 1, 2].map((i) => (
                <View key={i} style={styles.reportCard}>
                  <View style={styles.reportHeader}>
                    <SkeletonBox style={{ height: 16, width: '50%', borderRadius: radius.xs }} />
                    <SkeletonBox style={{ height: 14, width: 60, borderRadius: radius.xs }} />
                  </View>
                </View>
              ))}
            </View>
          ) : null}
          {!loadingBlockedMembers && blockedMembers.length === 0 ? (
            <Text style={styles.emptyText}>{l('차단한 사용자가 없습니다.')}</Text>
          ) : null}
          <View style={styles.reportList}>
            {blockedMembers.map((member) => (
              <View key={member.memberId} style={styles.reportCard}>
                <View style={styles.reportHeader}>
                  <Text style={styles.reportUser}>{member.nickname}</Text>
                  <Pressable
                    style={({ pressed }) => [pressed && styles.pressed]}
                    onPress={() => handleUnblockMember(member.nickname)}
                  >
                    <Text style={styles.unblockButton}>{l('차단 해제')}</Text>
                  </Pressable>
                </View>
              </View>
            ))}
          </View>
        </View>
      );
    }

    if (selectedSetting === 'terms') {
      return (
        <ScrollView
          style={styles.container}
          contentContainerStyle={styles.settingsDetailWrap}
          showsVerticalScrollIndicator={false}
        >
          {back}
          <Text style={styles.detailTitle}>{getSettingLabel(selectedSetting)}</Text>
          <Text style={styles.detailDivider} />
          {termsDocumentOrder.map((key) => {
            const termsDoc = termsDocuments[key];
            return (
              <View key={key} style={styles.termsDocumentSection}>
                <Text style={styles.detailLabel}>{termsDoc.title}</Text>
                <Text style={styles.detailBody}>{termsDoc.content}</Text>
              </View>
            );
          })}
        </ScrollView>
      );
    }

    if (selectedSetting === 'notifications') {
      return (
        <View style={styles.settingsDetailWrap}>
          {back}
          <Text style={styles.detailTitle}>{getSettingLabel(selectedSetting)}</Text>
          <Text style={styles.detailDivider} />
          {loadingNotificationSettings ? (
            <>
              {[0, 1, 2, 3, 4, 5].map((i) => (
                <View key={i} style={styles.alarmRow}>
                  <View style={styles.alarmInfo}>
                    <SkeletonBox style={{ height: 16, width: '60%', borderRadius: radius.xs }} />
                    <SkeletonBox style={{ height: 13, width: '80%', borderRadius: radius.xs }} />
                  </View>
                  <SkeletonBox style={{ width: 44, height: 26, borderRadius: radius.lg }} />
                </View>
              ))}
            </>
          ) : null}
          {notificationSettingRows.map((row) => {
            const enabled = notificationSettings[row.key];
            const toggling = togglingNotificationSetting === row.type;
            return (
              <View key={row.type} style={styles.alarmRow}>
                <View style={styles.alarmInfo}>
                  <Text style={styles.detailLabel}>{l(row.label)}</Text>
                  <Text style={styles.detailBody}>{l('내 활동에 대한 알림 수신')}</Text>
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

    if (selectedSetting === 'emailChange') {
      return (
        <View style={styles.settingsDetailWrap}>
          {back}
          <Text style={styles.detailTitle}>{getSettingLabel(selectedSetting)}</Text>
          <Text style={styles.detailDivider} />
          <View style={styles.formBlock}>
            <Text style={styles.detailLabel}>{l('기존 이메일')}</Text>
            <View style={styles.inputPlaceholder}>
              <TextInput
                value={emailCurrent}
                onChangeText={setEmailCurrent}
                placeholder={l('기존 이메일을 입력해주세요')}
                placeholderTextColor={colors.gray3}
                style={[styles.inputField, styles.inputFieldEmail]}
                autoCapitalize="none"
                keyboardType="email-address"
                autoCorrect={false}
                spellCheck={false}
                textContentType="emailAddress"
                autoComplete="email"
              />
            </View>
          </View>
          <View style={styles.formBlock}>
            <Text style={styles.detailLabel}>{l('변경 이메일')}</Text>
            <View style={styles.inputPlaceholder}>
              <TextInput
                value={emailNext}
                onChangeText={(value) => {
                  setEmailNext(value);
                  resetEmailVerification();
                }}
                placeholder={l('변경할 이메일을 입력해주세요')}
                placeholderTextColor={colors.gray3}
                style={[styles.inputField, styles.inputFieldEmail]}
                autoCapitalize="none"
                keyboardType="email-address"
                autoCorrect={false}
                spellCheck={false}
                textContentType="emailAddress"
                autoComplete="email"
              />
            </View>
            <Pressable
              style={({ pressed }) => [
                styles.emailVerificationButton,
                pressed && !emailVerified ? styles.pressed : null,
                emailVerified ? styles.submitButtonDisabled : null,
              ]}
              onPress={handleSendEmailVerificationCode}
              disabled={sendingEmailVerificationCode || emailVerified}
            >
              <Text style={styles.emailVerificationButtonText}>
                {sendingEmailVerificationCode
                  ? l('발송 중...')
                  : emailVerificationSent
                    ? l('인증번호 재발송')
                    : l('인증번호 발송')}
              </Text>
            </Pressable>
          </View>
          <View style={styles.formBlock}>
            <Text style={styles.detailLabel}>{l('인증번호')}</Text>
            <View style={styles.inputPlaceholder}>
              <TextInput
                value={emailVerificationCode}
                onChangeText={setEmailVerificationCode}
                placeholder={l('인증번호 입력')}
                placeholderTextColor={colors.gray3}
                style={[styles.inputField, styles.inputFieldEmail]}
                keyboardType="number-pad"
                autoCorrect={false}
                spellCheck={false}
                textContentType="oneTimeCode"
                autoComplete="one-time-code"
              />
            </View>
            {emailVerificationSent && !emailVerified ? (
              <Text
                style={[
                  styles.emailVerificationTimerText,
                  remainingEmailVerificationSeconds <= 0 ? styles.emailVerificationTimerExpiredText : null,
                ]}
              >
                {l('남은 시간 {time}', { time: emailVerificationRemainingText })}
              </Text>
            ) : null}
            <Pressable
              style={({ pressed }) => [
                styles.emailVerificationButton,
                emailVerified ? styles.emailVerificationButtonActive : null,
                pressed ? styles.pressed : null,
              ]}
              onPress={handleConfirmEmailVerificationCode}
              disabled={confirmingEmailVerificationCode}
            >
              <Text
                style={[
                  styles.emailVerificationButtonText,
                  emailVerified ? styles.emailVerificationButtonTextActive : null,
                ]}
              >
                {confirmingEmailVerificationCode
                  ? l('확인 중...')
                  : emailVerified
                    ? l('인증 완료되었습니다')
                    : l('인증 완료')}
              </Text>
            </Pressable>
          </View>
          <Pressable
            style={[
              styles.submitButton,
              submittingEmailUpdate || !emailVerified ? styles.submitButtonDisabled : null,
            ]}
            onPress={handleSubmitEmailUpdate}
            disabled={submittingEmailUpdate || !emailVerified}
          >
            <Text style={styles.submitButtonText}>
              {submittingEmailUpdate ? l('변경 중...') : l('변경하기')}
            </Text>
          </Pressable>
        </View>
      );
    }

    return (
      <View style={styles.settingsDetailWrap}>
        {back}
        <Text style={styles.detailTitle}>{getSettingLabel(selectedSetting)}</Text>
      </View>
    );
  };

  if (showFollowPage) {
    return (
      <ScreenLayout title={t('profile.screenTitle')}>
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
      <ScreenLayout title={t('profile.screenTitle')}>
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
                <MaterialIcons name="chevron-left" size={18} color={colors.gray4} />
                <Text style={styles.breadcrumbText}>{t('common.back')}</Text>
              </Pressable>
            </View>
          )}

          {selectedSetting ? (
            renderSettingDetail()
          ) : (
            <>
              {settingsSections.map((section) => {
                const SectionIcon = section.iconUri;
                return (
                  <View key={section.title} style={styles.settingsSection}>
                    <View style={styles.settingsHeader}>
                      <SectionIcon width={18} height={18} />
                      <Text style={styles.settingsTitle}>{section.title}</Text>
                    </View>
                    <View style={styles.settingsItems}>
                      {section.items.map((item) => (
                        <Pressable
                          key={item.key}
                          style={({ pressed }) => [styles.settingsItem, pressed && styles.pressed]}
                          disabled={item.key === 'logout' && submittingLogout}
                          onPress={() => {
                            if (item.key === 'contact') {
                              handleContact();
                              return;
                            }
                            if (item.key === 'logout') {
                              handleLogoutPress();
                              return;
                            }
                            setSelectedSetting(item.key);
                          }}
                        >
                          <Text style={styles.settingsItemText}>
                            {item.key === 'logout' && submittingLogout
                              ? t('settings.logoutLoading')
                              : item.label}
                          </Text>
                        </Pressable>
                      ))}
                    </View>
                  </View>
                );
              })}
            </>
          )}
        </ScrollView>
      </ScreenLayout>
    );
  }

  if (submittingLogout) {
    return (
      <BookFlipLoadingScreen
        detailTitle={t('settings.logoutProgressTitle')}
        detailDescription={t('settings.logoutProgressDescription')}
      />
    );
  }

  return (
    <ScreenLayout title={t('profile.screenTitle')}>
      <View style={styles.container}>
        <ScrollView
          ref={myPageScrollRef}
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
                  if (selectedSetting === 'notifications') {
                    await loadNotificationSettingInfo();
                  }
                  setRefreshing(false);
                };
                void refresh();
              }}
            />
          }
        >
        <View style={styles.breadcrumbRow}>
          <Text style={styles.breadcrumbText}>{t('common.all')}</Text>
          <MaterialIcons name="chevron-right" size={16} color={colors.gray4} />
          <Text style={[styles.breadcrumbText, styles.breadcrumbActive]}>{t('profile.screenTitle')}</Text>
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
            <Text style={styles.profileName}>{displayProfileName}</Text>
            <View style={styles.profileFollowRow}>
              <Pressable onPress={openFollowerList} hitSlop={8}>
                <Text style={styles.profileSub}>{t('profile.subscribers')} {followerCount}</Text>
              </Pressable>
              <Pressable onPress={openFollowingList} hitSlop={8}>
                <Text style={styles.profileSub}>{t('profile.subscribing')} {followingCount}</Text>
              </Pressable>
            </View>
            <Text style={styles.profileDesc} numberOfLines={2}>
              {displayProfileDesc}
            </Text>
            {profileCategories.length > 0 ? (
              <Text style={styles.profileCategory}>
                {t('profile.interests')} · {profileCategories.join(', ')}
              </Text>
            ) : null}
            {loadingProfile ? <Text style={styles.loadingText}>{t('common.loadingProfile')}</Text> : null}
          </View>
          <Pressable
            onPress={() => {
              if (!isLoggedIn) {
                requireAuth(() => setShowSettings(true));
                return;
              }
              setShowSettings(true);
            }}
            style={({ pressed }) => (pressed ? styles.pressed : undefined)}
          >
            <SettingIcon width={22} height={22} />
          </Pressable>
        </View>

        <View style={styles.actionButtons}>
          <Pressable
            style={({ pressed }) => [styles.primaryButton, pressed && styles.pressed]}
            onPress={handleWriteStory}
          >
            <Text style={styles.primaryButtonText}>{t('profile.writeStory')}</Text>
          </Pressable>
          <Pressable
            style={({ pressed }) => [styles.secondaryButton, pressed && styles.pressed]}
            onPress={handleContact}
          >
            <Text style={styles.secondaryButtonText}>{t('profile.contactNews')}</Text>
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
                onPress={() => {
                  triggerSelectionHaptic();
                  setActiveTab(tab);
                }}
              >
                <Text style={[styles.tabLabel, active ? styles.tabLabelActive : null]}>
                  {getTabLabel(tab)}
                </Text>
              </Pressable>
            );
          })}
        </View>

        <View style={styles.tabContent}>{renderTabContent()}</View>
        </ScrollView>

        <ActionMenu
          visible={Boolean(groupMenu)}
          anchor={
            groupMenu
              ? {
                  pageX: groupMenu.pageX,
                  pageY: groupMenu.pageY,
                }
              : null
          }
          items={groupMenuItems}
          onClose={() => setGroupMenu(null)}
          screenWidth={screenWidth}
          screenHeight={screenHeight}
          menuWidth={112}
        />
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
    gap: spacing.xxs,
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
    ...typography.subhead4_1,
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
    ...typography.body1_2,
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
    ...typography.body1_3_relaxed,
    color: colors.gray6,
  },
  languageCurrentText: {
    ...typography.body2_3,
    color: colors.gray4,
  },
  languageList: {
    gap: spacing.xs,
  },
  languageItem: {
    minHeight: 48,
    borderWidth: 1,
    borderColor: colors.subbrown4,
    borderRadius: radius.md,
    backgroundColor: colors.white,
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.md,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  languageItemSelected: {
    borderColor: colors.primary1,
    backgroundColor: colors.subbrown4,
  },
  languageItemText: {
    ...typography.body1_2,
    color: colors.gray6,
  },
  languageItemTextSelected: {
    color: colors.primary1,
  },
  termsDocumentSection: {
    gap: spacing.xs,
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
    borderRadius: radius.lg,
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xxs,
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
  inputFieldDescenderSafe: {
    paddingVertical: spacing.xxs,
  },
  inputCounterText: {
    ...typography.body2_3,
    color: colors.gray4,
    textAlign: 'right',
  },
  nicknameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  nicknameInputWrap: {
    flex: 1,
  },
  nicknameCheckButton: {
    borderWidth: 1,
    borderColor: colors.primary1,
    borderRadius: radius.md,
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.md,
    backgroundColor: colors.white,
  },
  nicknameCheckButtonDisabled: {
    borderColor: colors.gray2,
  },
  nicknameCheckButtonText: {
    ...typography.body2_3,
    color: colors.primary1,
  },
  nicknameStatusText: {
    ...typography.body2_3,
    color: colors.gray4,
    marginTop: spacing.xxs,
    marginLeft: spacing.xxs,
  },
  nicknameStatusAvailable: {
    color: colors.green,
  },
  nicknameStatusDuplicate: {
    color: colors.likeRed,
  },
  inputFieldEmail: {
    paddingVertical: spacing.xxs,
  },
  passwordInputRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  passwordInputField: {
    flex: 1,
  },
  passwordToggleButton: {
    marginLeft: spacing.xs,
    padding: spacing.xxs,
  },
  emailVerificationButton: {
    borderWidth: 1,
    borderColor: colors.primary1,
    borderRadius: radius.md,
    backgroundColor: colors.white,
    height: buttonSize.cta,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: spacing.md,
  },
  emailVerificationButtonActive: {
    backgroundColor: colors.primary1,
  },
  emailVerificationButtonText: {
    ...typography.body1_2,
    color: colors.primary1,
  },
  emailVerificationButtonTextActive: {
    color: colors.white,
  },
  emailVerificationTimerText: {
    ...typography.body2_3,
    color: colors.gray4,
    marginTop: -spacing.xxs,
  },
  emailVerificationTimerExpiredText: {
    color: colors.likeRed,
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
    opacity: interactionOpacity.disabled,
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
    borderRadius: radius.sm,
    backgroundColor: colors.white,
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xxs,
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
    paddingVertical: spacing.xxs,
    borderRadius: radius.lg,
  },
  reportHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: spacing.sm,
  },
  reportUser: {
    flex: 1,
    minWidth: 0,
    ...typography.body1_3,
    color: colors.gray6,
  },
  reportDate: {
    flexShrink: 0,
    ...typography.body2_3,
    color: colors.gray4,
  },
  reportText: {
    width: '100%',
    alignSelf: 'stretch',
    flexShrink: 1,
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
    gap: spacing.xxs,
  },
  alarmDot: {
    width: 8,
    height: 8,
    borderRadius: radius.xs,
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
    gap: spacing.xxs,
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
  guestPromptWrap: {
    backgroundColor: colors.white,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.subbrown4,
    padding: spacing.md,
    gap: spacing.sm,
    alignItems: 'center',
  },
  guestPromptButton: {
    minWidth: 112,
    borderRadius: radius.sm,
    backgroundColor: colors.primary1,
    paddingVertical: spacing.xs,
    paddingHorizontal: spacing.md,
    alignItems: 'center',
    justifyContent: 'center',
  },
  guestPromptButtonText: {
    ...typography.body2_2,
    color: colors.white,
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
    borderRadius: radius.md,
    borderWidth: 1,
    paddingHorizontal: 2,
    justifyContent: 'center',
  },
  toggleButtonDisabled: {
    opacity: interactionOpacity.disabledSoft,
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
    opacity: interactionOpacity.disabled,
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
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  profileAvatarImage: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: colors.gray2,
  },
  profileMeta: {
    flex: 1,
    gap: spacing.xxs,
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
    ...typography.caption1_3_relaxed,
    color: colors.gray5,
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
    minHeight: 308,
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
  storyTextWrap: {
    gap: spacing.xs,
    minHeight: 84,
  },
  storyTitle: {
    ...typography.body1_2,
    color: colors.gray6,
    minHeight: 40,
  },
  storyExcerpt: {
    ...typography.body2_3,
    color: colors.gray5,
    minHeight: 34,
  },
  storyActions: {
    flexDirection: 'row',
    alignItems: 'center',
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: colors.gray2,
    paddingTop: spacing.xs,
    marginTop: 'auto',
  },
  inlineAction: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.xxs,
  },
  inlineText: {
    ...typography.body2_3,
    color: colors.gray5,
  },
  actionDivider: {
    width: 1,
    height: 20,
    backgroundColor: colors.gray2,
  },
  bookWrap: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
  },
  bookCard: {
    backgroundColor: colors.white,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.subbrown4,
    padding: spacing.xs,
    gap: spacing.xxs,
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
    paddingVertical: spacing.xxs,
    paddingHorizontal: spacing.xxs,
  },
  pressed: {
    opacity: interactionOpacity.pressed,
  },
  draftBadge: {
    ...typography.body2_3,
    color: colors.secondary2,
    borderWidth: 1,
    borderColor: colors.secondary2,
    borderRadius: 4,
    paddingHorizontal: 6,
    paddingVertical: 2,
  },
  draftActions: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: spacing.xs,
  },
  draftDeleteButton: {
    borderWidth: 1,
    borderColor: colors.likeRed,
    borderRadius: radius.xs,
    paddingHorizontal: spacing.xs,
    paddingVertical: spacing.xxs,
  },
  draftDeleteButtonDisabled: {
    opacity: interactionOpacity.disabled,
  },
  draftDeleteButtonText: {
    ...typography.body2_3,
    color: colors.likeRed,
  },
  unblockButton: {
    ...typography.body2_3,
    color: colors.secondary1,
    borderWidth: 1,
    borderColor: colors.secondary1,
    borderRadius: 4,
    paddingHorizontal: spacing.xs,
    paddingVertical: 3,
  },
});
