import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useCallback, useEffect, useRef, useState } from 'react';
import {
  useFocusEffect,
  useNavigation,
  useRoute,
  type NavigationProp,
  type ParamListBase,
  type RouteProp,
} from '@react-navigation/native';
import {
  ActivityIndicator,
  Animated,
  Image,
  Keyboard,
  Linking,
  Modal,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  useWindowDimensions,
  View,
} from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';

import { PUBLIC_ENV } from '../../constants/publicEnv';
import {
  HEADER_ALARM_URI,
  HEADER_SEARCH_URI,
  MOBILE_HEADER_LOGO_URI,
  PENCIL_ICON_URI,
  SEARCH_DARK_URI,
} from '../../constants/iconMap';
import { colors, interactionOpacity, layers, motion, radius, scaleSize, spacing, typography } from '../../theme';
import { FeedbackPressable as Pressable } from './FeedbackPressable';
import { IconButton, IconName } from './IconButton';
import { useAuthGate } from '../../contexts/AuthGateContext';
import { navigateToHome, navigateToMyAlarms } from '../../navigation/navigateToHome';
import { ApiError } from '../../services/api/http';
import { triggerSelectionHaptic } from '../../utils/haptics';
import {
  fetchAllMyLikedBooks,
  fetchBookDetail,
  fetchRecommendedBooks,
  toggleBookLikeByIsbn,
  type BookItem,
} from '../../services/api/bookApi';
import {
  publishBookLikeState,
  resolveBookLikeId,
  subscribeBookLikeState,
} from '../../services/api/bookLikeApi';
import {
  fetchBookStoriesByBook,
  type RemoteStoryItem,
} from '../../services/api/bookStoryApi';
import {
  fetchNotificationPreview,
  markNotificationAsRead,
  type NotificationItem,
} from '../../services/api/notificationApi';
import { toKstTimeAgoLabel } from '../../utils/date';
import { formatNotificationText, resolveNotificationTarget } from '../../utils/notification';
import { showToast } from '../../utils/toast';
import {
  isBlockedMemberNickname,
  isSameMemberNickname,
  subscribeBlockedMemberChanges,
} from '../../utils/blockedMembers';
import { useConsumeRouteParam } from '../../hooks/useConsumeRouteParam';
import { useBookSearch } from '../../hooks/useBookSearch';
import { useRelativeNow } from '../../hooks/useRelativeNow';
import { useLanguage } from '../../contexts/LanguageContext';
import BookStoryFeedCard from '../feature/bookstory/BookStoryFeedCard';
import { SkeletonBox } from './SkeletonBox';

const LogoIcon = MOBILE_HEADER_LOGO_URI;
const SearchIcon = HEADER_SEARCH_URI;
const SearchDarkIcon = SEARCH_DARK_URI;
const AlarmIcon = HEADER_ALARM_URI;
const WriteIcon = PENCIL_ICON_URI;
const ALADIN_RANKING_URL = PUBLIC_ENV.ALADIN_RANKING_URL;
const ALADIN_HOME_URL = PUBLIC_ENV.ALADIN_HOME_URL;

type HeaderAction = {
  key?: string;
  icon: IconName;
  label?: string;
  onPress?: () => void;
};

type Props = {
  title: string;
  actions?: HeaderAction[];
  onPressSearch?: () => void;
  onPressBell?: () => void;
  onPressLogo?: () => void;
};

type SearchStage = 'results' | 'detail';
type HeaderRouteParams = {
  openSearchBook?: unknown;
};

const HEADER_HEIGHT = scaleSize(44);

function resolveBookStorySearchId(book: BookItem | null): string | null {
  if (!book) return null;

  if (typeof book.bookId === 'number' && Number.isInteger(book.bookId) && book.bookId > 0) {
    return String(book.bookId);
  }

  const normalizedIsbn = book.isbn.replace(/-/g, '').trim();
  if (/^\d+$/.test(normalizedIsbn)) {
    return normalizedIsbn;
  }

  return null;
}

function toSearchDescription(book: BookItem, fallback = '책 설명이 없습니다.'): string {
  if (book.description && book.description.trim()) return book.description;
  if (book.publisher && book.publisher.trim()) return book.publisher;
  return fallback;
}

function toBookItemFromRouteParam(raw: unknown): BookItem | null {
  if (!raw || typeof raw !== 'object') return null;
  const record = raw as Record<string, unknown>;
  const title = typeof record.title === 'string' ? record.title.trim() : '';
  if (!title) return null;

  const author =
    typeof record.author === 'string' && record.author.trim().length > 0
      ? record.author.trim()
      : '작가 미상';
  const isbn =
    typeof record.isbn === 'string' && record.isbn.trim().length > 0
      ? record.isbn.trim()
      : '';

  const parsedBookId =
    typeof record.bookId === 'number' && Number.isInteger(record.bookId) && record.bookId > 0
      ? record.bookId
      : typeof record.bookId === 'string' && /^\d+$/.test(record.bookId)
        ? Number(record.bookId)
        : undefined;

  return {
    isbn,
    bookId: parsedBookId,
    title,
    author,
    description:
      typeof record.description === 'string' && record.description.trim().length > 0
        ? record.description
        : typeof record.publisher === 'string' && record.publisher.trim().length > 0
          ? record.publisher
          : '책 설명이 없습니다.',
    imgUrl: typeof record.imgUrl === 'string' ? record.imgUrl : undefined,
    publisher: typeof record.publisher === 'string' ? record.publisher : undefined,
  };
}

export function AppHeader(props: Props) {
  const { title, actions, onPressSearch, onPressBell, onPressLogo } = props;
  const navigation = useNavigation<NavigationProp<ParamListBase>>();
  const route = useRoute<RouteProp<{ Header: HeaderRouteParams }, 'Header'>>();
  const { isLoggedIn, requireAuth } = useAuthGate();
  const { language, l } = useLanguage();
  const relativeNowMillis = useRelativeNow();
  const { top, bottom } = useSafeAreaInsets();
  const { height: windowHeight, width: windowWidth } = useWindowDimensions();

  const [showNoti, setShowNoti] = useState(false);
  const [notiModalOpen, setNotiModalOpen] = useState(false);
  const [notificationPreview, setNotificationPreview] = useState<NotificationItem[]>([]);
  const [notificationPreviewLoading, setNotificationPreviewLoading] = useState(false);
  const [hasUnread, setHasUnread] = useState(false);
  const [showSearchDropdown, setShowSearchDropdown] = useState(false);
  const [showSearchPage, setShowSearchPage] = useState(false);
  const [searchStage, setSearchStage] = useState<SearchStage>('results');

  const {
    query,
    setQuery,
    searched,
    searchedKeyword,
    results: searchResults,
    loading: searchLoading,
    hasNext: searchHasNext,
    totalResults: searchTotalResults,
    search: executeSearch,
    loadMore: loadMoreSearchResults,
    reset: resetSearch,
  } = useBookSearch();

  const [recommendedBooks, setRecommendedBooks] = useState<BookItem[]>([]);
  const [recommendLoading, setRecommendLoading] = useState(false);

  const [selectedBook, setSelectedBook] = useState<BookItem | null>(null);
  const [bookStories, setBookStories] = useState<RemoteStoryItem[]>([]);
  const [bookDetailLoading, setBookDetailLoading] = useState(false);
  const [bookStoriesLoading, setBookStoriesLoading] = useState(false);
  const [likedBookIds, setLikedBookIds] = useState<Set<string>>(new Set());

  const dropdownAnim = useRef(new Animated.Value(0)).current;
  const notiAnim = useRef(new Animated.Value(0)).current;
  const dropdownOpenGuardUntil = useRef(0);
  const activeBookRequestId = useRef(0);

  useEffect(() => {
    return subscribeBlockedMemberChanges(({ nickname, blocked }) => {
      if (!blocked) return;
      setBookStories((prev) =>
        prev.filter((story) => !isSameMemberNickname(story.nickname, nickname)),
      );
    });
  }, []);

  const openNoti = useCallback(() => {
    setShowNoti(true);
    setNotiModalOpen(true);
    notiAnim.setValue(0);
    Animated.timing(notiAnim, {
      toValue: 1,
      duration: motion.duration.normal,
      useNativeDriver: true,
    }).start();
  }, [notiAnim]);

  const closeNoti = useCallback(() => {
    setShowNoti(false);
    Animated.timing(notiAnim, {
      toValue: 0,
      duration: motion.duration.normal,
      useNativeDriver: true,
    }).start(({ finished }) => {
      if (finished) setNotiModalOpen(false);
    });
  }, [notiAnim]);

  const closeNotiImmediate = useCallback(() => {
    setShowNoti(false);
    setNotiModalOpen(false);
    notiAnim.setValue(0);
  }, [notiAnim]);

  const openAladinUrl = useCallback(async (url: string) => {
    try {
      await Linking.openURL(url);
    } catch {
      showToast(l('링크를 열 수 없습니다.'));
    }
  }, [l]);

  const isBookLikeTogglable = useCallback((book: BookItem) => {
    const normalizedIsbn = book.isbn.trim();
    if (!normalizedIsbn || normalizedIsbn.startsWith('placeholder-')) return false;
    return resolveBookLikeId(book) !== null;
  }, []);

  const isBookLikedInUi = useCallback(
    (book: BookItem) => {
      const likeId = resolveBookLikeId(book);
      if (!likeId) return false;
      if (likedBookIds.has(likeId)) return true;
      return Boolean(book.likedByMe);
    },
    [likedBookIds],
  );

  const executeBookLikeToggle = useCallback(
    (book: BookItem) => {
      if (!isBookLikeTogglable(book)) return;

      triggerSelectionHaptic();
      const likeId = resolveBookLikeId(book);
      const wasLiked = isBookLikedInUi(book);
      if (!likeId) return;

      setLikedBookIds((prev) => {
        const next = new Set(prev);
        if (wasLiked) {
          next.delete(likeId);
        } else {
          next.add(likeId);
        }
        return next;
      });

      const submit = async () => {
        try {
          if (book.isbn.trim()) {
            await toggleBookLikeByIsbn(book.isbn);
          }
          publishBookLikeState(book, !wasLiked);
          showToast(
            wasLiked
              ? l('내 서재에서 제거했습니다.')
              : l('내 서재에 담았습니다.'),
          );
        } catch (error) {
          setLikedBookIds((prev) => {
            const rollback = new Set(prev);
            if (wasLiked) {
              rollback.add(likeId);
            } else {
              rollback.delete(likeId);
            }
            return rollback;
          });
          if (error instanceof ApiError) {
            showToast(error.message || l('내 서재 업데이트에 실패했습니다.'));
            return;
          }
          showToast(l('내 서재 업데이트에 실패했습니다.'));
        }
      };
      void submit();
    },
    [isBookLikeTogglable, isBookLikedInUi, l],
  );

  useEffect(() => {
    return subscribeBookLikeState(({ likeId, liked }) => {
      setLikedBookIds((prev) => {
        const next = new Set(prev);
        if (liked) {
          next.add(likeId);
        } else {
          next.delete(likeId);
        }
        return next;
      });
    });
  }, []);

  const hideDropdownImmediately = useCallback(() => {
    dropdownAnim.setValue(0);
    setShowSearchDropdown(false);
  }, [dropdownAnim]);

  const closeSearchDropdown = useCallback(() => {
    Animated.timing(dropdownAnim, {
      toValue: 0,
      duration: motion.duration.fast,
      useNativeDriver: true,
    }).start(({ finished }) => {
      if (finished) {
        setShowSearchDropdown(false);
      }
    });
  }, [dropdownAnim]);

  const openSearchDropdown = useCallback(() => {
    dropdownOpenGuardUntil.current = Date.now() + 220;
    closeNotiImmediate();
    setShowSearchPage(false);
    setSearchStage('results');
    setSelectedBook(null);
    setBookStories([]);
    setShowSearchDropdown(true);
  }, [closeNotiImmediate]);

  const closeSearchPage = useCallback(() => {
    activeBookRequestId.current += 1;
    setShowSearchPage(false);
    setSearchStage('results');
    setSelectedBook(null);
    setBookStories([]);
    setBookDetailLoading(false);
    setBookStoriesLoading(false);
  }, []);

  const handleToggleBookLike = useCallback(
    (book: BookItem) => {
      if (!isLoggedIn) {
        if (showSearchPage) {
          requireAuth(() => {
            executeBookLikeToggle(book);
          });
          return;
        }

        hideDropdownImmediately();
        closeSearchPage();
        requestAnimationFrame(() => {
          requireAuth(() => {
            executeBookLikeToggle(book);
          });
        });
        return;
      }
      executeBookLikeToggle(book);
    },
    [
      closeSearchPage,
      executeBookLikeToggle,
      hideDropdownImmediately,
      isLoggedIn,
      requireAuth,
      showSearchPage,
    ],
  );

  const refreshUnreadBadge = useCallback(
    async (previewItems?: NotificationItem[]) => {
      if (!isLoggedIn) {
        setHasUnread(false);
        return;
      }

      if (Array.isArray(previewItems)) {
        setHasUnread(previewItems.some((item) => !item.read));
        return;
      }

      try {
        const items = await fetchNotificationPreview(1);
        setHasUnread(items.some((item) => !item.read));
      } catch (error) {
        if (error instanceof ApiError && (error.status === 401 || error.status === 404)) {
          setHasUnread(false);
        }
      }
    },
    [isLoggedIn],
  );

  const loadNotificationPreview = useCallback(async () => {
    if (!isLoggedIn) {
      setNotificationPreview([]);
      void refreshUnreadBadge([]);
      return;
    }

    setNotificationPreviewLoading(true);
    try {
      const notifications = await fetchNotificationPreview(5);
      setNotificationPreview(notifications);
      void refreshUnreadBadge(notifications);
    } catch (error) {
      if (error instanceof ApiError && error.status === 401) {
        setNotificationPreview([]);
        void refreshUnreadBadge([]);
        return;
      }
      if (!(error instanceof ApiError)) {
        showToast(l('알림을 불러오지 못했습니다.'));
      }
    } finally {
      setNotificationPreviewLoading(false);
    }
  }, [isLoggedIn, l, refreshUnreadBadge]);

  useEffect(() => {
    void refreshUnreadBadge();
  }, [refreshUnreadBadge]);

  const navigateByNotification = useCallback(
    (notification: NotificationItem) => {
      const target = resolveNotificationTarget(notification);
      if (target.toastMessage) {
        showToast(l(target.toastMessage));
      }
      if (!target.screen) return;
      navigation.navigate(target.screen, target.params);
    },
    [l, navigation],
  );

  const handlePressNotification = useCallback(
    (notification: NotificationItem) => {
      const nextNotification = { ...notification, read: true };
      setNotificationPreview((prev) =>
        prev.map((item) =>
          item.notificationId === notification.notificationId ? nextNotification : item,
        ),
      );
      closeNotiImmediate();
      navigateByNotification(nextNotification);

      const submit = async () => {
        if (notification.read) return;
        try {
          await markNotificationAsRead(notification.notificationId);
          void refreshUnreadBadge();
        } catch {
          setNotificationPreview((prev) =>
            prev.map((item) =>
              item.notificationId === notification.notificationId
                ? { ...item, read: false }
                : item,
            ),
          );
          void refreshUnreadBadge();
        }
      };
      void submit();
    },
    [closeNotiImmediate, navigateByNotification, refreshUnreadBadge],
  );

  const loadRecommendedBooks = useCallback(async () => {
    setRecommendLoading(true);
    try {
      const books = await fetchRecommendedBooks();
      setRecommendedBooks(books.slice(0, 3));
    } catch (error) {
      if (!(error instanceof ApiError)) {
        showToast(l('추천 책을 불러오지 못했습니다.'));
      }
    } finally {
      setRecommendLoading(false);
    }
  }, [l]);

  const loadLikedBookIds = useCallback(async () => {
    if (!isLoggedIn) {
      setLikedBookIds(new Set());
      return;
    }

    try {
      const likedBooks = await fetchAllMyLikedBooks();
      const nextIds = new Set<string>();
      likedBooks.forEach((book) => {
        const likeId = resolveBookLikeId(book);
        if (!likeId) return;
        nextIds.add(likeId);
      });
      setLikedBookIds(nextIds);
    } catch (error) {
      if (error instanceof ApiError && error.status === 401) {
        setLikedBookIds(new Set());
        return;
      }
      if (error instanceof ApiError) {
        showToast(error.message || l('내 서재 정보를 불러오지 못했습니다.'));
        return;
      }
      showToast(l('내 서재 정보를 불러오지 못했습니다.'));
    }
  }, [isLoggedIn, l]);

  const loadSelectedBookData = useCallback(async (book: BookItem) => {
    const requestId = Date.now();
    activeBookRequestId.current = requestId;

    setSelectedBook(book);
    setBookStories([]);
    setBookDetailLoading(true);
    setBookStoriesLoading(true);

    let enrichedBook = book;

    const normalizedIsbn = book.isbn.trim();
    if (normalizedIsbn.length > 0 && !normalizedIsbn.startsWith('placeholder-')) {
      try {
        const detail = await fetchBookDetail(normalizedIsbn);
        if (detail && activeBookRequestId.current === requestId) {
          enrichedBook = {
            ...book,
            ...detail,
            bookId: detail.bookId ?? book.bookId,
          };
          setSelectedBook(enrichedBook);
        }
      } catch (error) {
        if (!(error instanceof ApiError)) {
          showToast(l('도서 상세를 불러오지 못했습니다.'));
        }
      }
    }

    if (activeBookRequestId.current === requestId) {
      setBookDetailLoading(false);
    }

    const bookStorySearchId = resolveBookStorySearchId(enrichedBook);
    if (!bookStorySearchId) {
      if (activeBookRequestId.current === requestId) {
        setBookStories([]);
        setBookStoriesLoading(false);
      }
      return;
    }

    try {
      const feed = await fetchBookStoriesByBook(bookStorySearchId, undefined, {
        viewerAuthenticated: isLoggedIn,
      });
      if (activeBookRequestId.current === requestId) {
        setBookStories(feed.items.filter((story) => !isBlockedMemberNickname(story.nickname)));
      }
    } catch (error) {
      if (!(error instanceof ApiError)) {
        showToast(l('해당 도서의 책이야기를 불러오지 못했습니다.'));
      }
      if (activeBookRequestId.current === requestId) {
        setBookStories([]);
      }
    } finally {
      if (activeBookRequestId.current === requestId) {
        setBookStoriesLoading(false);
      }
    }
  }, [isLoggedIn, l]);

  useConsumeRouteParam(
    route.params?.openSearchBook,
    toBookItemFromRouteParam,
    (routeBook) => {
      hideDropdownImmediately();
      closeNotiImmediate();
      setShowSearchPage(true);
      setSearchStage('detail');
      setQuery(routeBook.title);
      void loadSelectedBookData(routeBook);
    },
    navigation,
    'openSearchBook',
  );

  const handleSearchSubmitFromDropdown = useCallback(() => {
    Keyboard.dismiss();
    const keyword = query.trim();
    if (!keyword) {
      showToast(l('검색어를 입력해야 합니다.'));
      return;
    }

    hideDropdownImmediately();
    setShowSearchPage(true);
    setSearchStage('results');
    void executeSearch(keyword);
  }, [executeSearch, hideDropdownImmediately, l, query]);

  const handleSearchSubmitInPage = useCallback(() => {
    Keyboard.dismiss();
    const keyword = query.trim();
    if (!keyword) {
      showToast(l('검색어를 입력해야 합니다.'));
      return;
    }

    setSearchStage('results');
    void executeSearch(keyword);
  }, [executeSearch, l, query]);

  const handleSelectBook = useCallback(
    (book: BookItem) => {
      setSearchStage('detail');
      void loadSelectedBookData(book);
    },
    [loadSelectedBookData],
  );

  const handleSelectRecommendedBook = useCallback(
    (book: BookItem) => {
      setQuery(book.title);
      hideDropdownImmediately();
      setShowSearchPage(true);
      setSearchStage('detail');
      void loadSelectedBookData(book);
    },
    [hideDropdownImmediately, loadSelectedBookData],
  );

  const openStoryCompose = useCallback(
    (book?: BookItem | null) => {
      const openCompose = () => {
        const composeBook = book
          ? {
              bookId: book.bookId,
              isbn: book.isbn,
              title: book.title,
              author: book.author,
              description: toSearchDescription(book, l('책 설명이 없습니다.')),
              imgUrl: book.imgUrl,
            }
          : undefined;

        hideDropdownImmediately();
        closeSearchPage();
        navigation.navigate('Story', { openCompose: true, composeBook });
      };

      if (!isLoggedIn) {
        requireAuth(openCompose);
        return;
      }

      openCompose();
    },
    [closeSearchPage, hideDropdownImmediately, isLoggedIn, l, navigation, requireAuth],
  );

  const headerTitle = showSearchPage ? l('책 검색') : l(title);
  const searchPageHeight = Math.max(scaleSize(280), windowHeight - top - HEADER_HEIGHT);
  const searchPageBottomPadding = bottom + scaleSize(100);
  const notiCardWidth = Math.min(scaleSize(280), windowWidth - spacing.md * 2);

  const handleHeaderBack = useCallback(() => {
    if (!showSearchPage) return;
    if (searchStage === 'detail') {
      setSearchStage('results');
      return;
    }
    closeSearchPage();
  }, [closeSearchPage, searchStage, showSearchPage]);

  const handleLogoPress = useCallback(() => {
    triggerSelectionHaptic();
    closeNotiImmediate();
    hideDropdownImmediately();
    closeSearchPage();

    if (onPressLogo) {
      onPressLogo();
      return;
    }

    navigateToHome(navigation);
  }, [closeNotiImmediate, closeSearchPage, hideDropdownImmediately, navigation, onPressLogo]);

  useEffect(() => {
    if (!showSearchDropdown) return;
    void loadRecommendedBooks();
  }, [loadRecommendedBooks, showSearchDropdown]);

  useEffect(() => {
    if (!isLoggedIn) {
      setLikedBookIds(new Set());
      return;
    }

    if (showSearchDropdown || showSearchPage) {
      void loadLikedBookIds();
    }
  }, [isLoggedIn, loadLikedBookIds, showSearchDropdown, showSearchPage]);

  useEffect(() => {
    if (!showSearchDropdown) {
      dropdownAnim.setValue(0);
      return;
    }

    dropdownAnim.setValue(0);
    Animated.timing(dropdownAnim, {
      toValue: 1,
      duration: motion.duration.normal,
      useNativeDriver: true,
    }).start();
  }, [dropdownAnim, showSearchDropdown]);

  useFocusEffect(
    useCallback(() => {
      return () => {
        closeNotiImmediate();
        setShowSearchDropdown(false);
        setShowSearchPage(false);
        setSearchStage('results');
        setNotificationPreview([]);
      };
    }, [closeNotiImmediate]),
  );

  const derivedActions: HeaderAction[] =
    Array.isArray(actions) && actions.length > 0
      ? actions
      : [
          { key: 'search', icon: 'search', label: l('검색'), onPress: onPressSearch },
          { key: 'notifications', icon: 'notifications-none', label: l('알림'), onPress: onPressBell },
        ];

  return (
    <View style={styles.container}>
      <View style={styles.headerBar}>
        <View style={styles.left}>
          {showSearchPage ? (
            <IconButton
              name="chevron-left"
              color={colors.white}
              size={26}
              onPress={handleHeaderBack}
              accessibilityLabel={l('뒤로가기')}
            />
          ) : (
            <Pressable
              onPress={handleLogoPress}
              hitSlop={8}
              style={styles.logoPress}
              accessibilityRole="button"
              accessibilityLabel={l('홈으로 이동')}
            >
              <LogoIcon width={44} height={24} />
            </Pressable>
          )}
        </View>
        <Text style={styles.title}>{headerTitle}</Text>
        <View style={styles.actions}>
          {derivedActions.map((action, index) => (
            <IconButton
              key={action.key ?? `${action.icon}-${index}`}
              name={action.icon}
              color={colors.white}
              size={24}
              accessibilityLabel={action.label ?? action.key}
              onPress={() => {
                if (action.icon === 'notifications-none') {
                  if (!isLoggedIn) {
                    requireAuth(() => {
                      openNoti();
                      hideDropdownImmediately();
                      closeSearchPage();
                      void loadNotificationPreview();
                      onPressBell?.();
                    });
                    return;
                  }

                  if (showNoti) {
                    closeNoti();
                  } else {
                    openNoti();
                    void loadNotificationPreview();
                  }
                  hideDropdownImmediately();
                  closeSearchPage();
                  onPressBell?.();
                  return;
                }

                if (action.icon === 'search') {
                  triggerSelectionHaptic();
                  if (showSearchPage) {
                    closeSearchPage();
                  } else if (showSearchDropdown) {
                    closeSearchDropdown();
                  } else {
                    openSearchDropdown();
                  }
                  onPressSearch?.();
                  return;
                }

                action.onPress?.();
              }}
              style={showNoti && action.icon === 'notifications-none' ? styles.activeAction : undefined}
              renderIcon={
                action.icon === 'search' ? (
                  <SearchIcon width={24} height={24} />
                ) : action.icon === 'notifications-none' ? (
                  <View>
                    <AlarmIcon width={24} height={24} />
                    {hasUnread ? <View style={styles.unreadDot} /> : null}
                  </View>
                ) : undefined
              }
            />
          ))}
        </View>
      </View>

      <Modal
        visible={notiModalOpen}
        transparent
        animationType="none"
        onRequestClose={closeNoti}
      >
        <Pressable
          style={styles.notiBackdrop}
          onPress={closeNoti}
          disableFeedback
        >
          <View style={[styles.notiPositioner, { paddingTop: top + HEADER_HEIGHT }]}>
            <Animated.View
              style={{
                opacity: notiAnim,
                transform: [
                  {
                    translateY: notiAnim.interpolate({
                      inputRange: [0, 1],
                      outputRange: [-14, 0],
                    }),
                  },
                ],
              }}
            >
            <Pressable
              style={[styles.notiCard, { width: notiCardWidth }]}
              onPress={(event) => event.stopPropagation()}
              disableFeedback
            >
              {notificationPreviewLoading ? (
                <>
                  {[0, 1, 2].map((i) => (
                    <View key={i} style={styles.notiRow}>
                      <SkeletonBox style={{ width: 8, height: 8, borderRadius: 4 }} />
                      <SkeletonBox style={{ flex: 1, height: 14, borderRadius: radius.xs }} />
                      <SkeletonBox style={{ width: 36, height: 12, borderRadius: radius.xs }} />
                    </View>
                  ))}
                </>
              ) : null}
              {!notificationPreviewLoading && notificationPreview.length === 0 ? (
                <Text style={styles.notiEmptyText}>{l('표시할 알림이 없습니다.')}</Text>
              ) : null}
              {!notificationPreviewLoading
                ? notificationPreview.map((notification) => (
                    <Pressable
                      key={`noti-${notification.notificationId}`}
                      style={({ pressed }) => [styles.notiRow, pressed ? styles.notiRowPressed : null]}
                      onPress={() => handlePressNotification(notification)}
                    >
                      <View
                        style={[
                          styles.notiDot,
                          !notification.read ? styles.notiDotActive : null,
                        ]}
                      />
                      <Text style={styles.notiText} numberOfLines={2}>
                        {formatNotificationText(
                          notification.notificationType,
                          notification.displayName,
                          language,
                        )}
                      </Text>
                      <Text style={styles.notiTime}>
                        {toKstTimeAgoLabel(notification.createdAt, relativeNowMillis, language)}
                      </Text>
                    </Pressable>
                  ))
                : null}
              <Pressable
                style={({ pressed }) => [styles.notiAllButton, pressed && styles.notiRowPressed]}
                onPress={() => {
                  closeNoti();
                  navigateToMyAlarms(navigation);
                }}
              >
                <Text style={styles.notiAllButtonText}>{l('알림 전체보기')}</Text>
              </Pressable>
            </Pressable>
            </Animated.View>
          </View>
        </Pressable>
      </Modal>

      <Modal
        visible={showSearchDropdown}
        transparent
        animationType="none"
        onRequestClose={closeSearchDropdown}
      >
        <Pressable
          style={styles.dropdownBackdrop}
          onPress={() => {
            if (Date.now() < dropdownOpenGuardUntil.current) {
              return;
            }
            closeSearchDropdown();
          }}
          disableFeedback
        >
          <Pressable
            style={{ marginTop: top + HEADER_HEIGHT }}
            onPress={(event) => event.stopPropagation()}
            disableFeedback
          >
            <Animated.View
              style={[
                styles.dropdownPanel,
                {
                  opacity: dropdownAnim,
                  transform: [
                    {
                      translateY: dropdownAnim.interpolate({
                        inputRange: [0, 1],
                        outputRange: [-14, 0],
                      }),
                    },
                  ],
                },
              ]}
            >
              <View style={styles.dropdownSearchBar}>
                <TextInput
                  value={query}
                  onChangeText={setQuery}
                  placeholder={l('책 제목, 작가 이름을 검색해보세요')}
                  placeholderTextColor={colors.gray3}
                  style={styles.dropdownSearchInput}
                  onSubmitEditing={handleSearchSubmitFromDropdown}
                  returnKeyType="search"
                />
                {query.length > 0 ? (
                  <IconButton
                    name="close"
                    color={colors.gray2}
                    size={20}
                    onPress={() => setQuery('')}
                    accessibilityLabel={l('검색어 지우기')}
                  />
                ) : null}
                <Pressable
                  onPress={handleSearchSubmitFromDropdown}
                  hitSlop={8}
                  style={styles.dropdownSearchSubmitButton}
                >
                  <SearchIcon width={24} height={24} />
                </Pressable>
              </View>

              <Text style={styles.dropdownRecoTitle}>{l('오늘의 추천 책')}</Text>
              <View style={styles.dropdownRecoRow}>
                {(recommendedBooks.length > 0
                  ? recommendedBooks
                  : Array.from({ length: 3 }).map((_, idx) => ({
                      isbn: `placeholder-${idx}`,
                      title: l('책 제목'),
                      author: l('작가 미상'),
                      description: '',
                      imgUrl: undefined,
                    }))).map((book) => (
                  <Pressable
                    key={book.isbn}
                    style={styles.dropdownRecoCard}
                    onPress={() => handleSelectRecommendedBook(book)}
                  >
                    <View style={styles.dropdownRecoThumbWrap}>
                      {book.imgUrl ? (
                        <Image source={{ uri: book.imgUrl }} style={styles.dropdownRecoThumb} />
                      ) : (
                        <View style={[styles.dropdownRecoThumb, styles.dropdownRecoThumbPlaceholder]} />
                      )}
                      {isBookLikeTogglable(book) ? (
                        <Pressable
                          style={styles.dropdownRecoHeartBadge}
                          onPress={(event) => {
                            event.stopPropagation();
                            handleToggleBookLike(book);
                          }}
                        >
                          <MaterialIcons
                            name={isBookLikedInUi(book) ? 'favorite' : 'favorite-border'}
                            size={16}
                            color={colors.secondary1}
                          />
                        </Pressable>
                      ) : null}
                    </View>
                    <Text style={styles.dropdownRecoBookTitle} numberOfLines={1}>
                      {book.title}
                    </Text>
                    <Text style={styles.dropdownRecoBookAuthor} numberOfLines={1}>
                      {book.author}
                    </Text>
                  </Pressable>
                ))}
              </View>

              {recommendLoading ? (
                <Text style={styles.dropdownRecoLoading}>
                  {l('추천 책을 불러오는 중...')}
                </Text>
              ) : null}

              <Pressable
                style={styles.dropdownRecoLink}
                onPress={() => {
                  void openAladinUrl(ALADIN_RANKING_URL);
                }}
              >
                <Text style={styles.dropdownRecoLinkText}>
                  {l('알라딘 랭킹 더 보러가기')}
                </Text>
                <MaterialIcons name="north-east" size={16} color={colors.white} />
              </Pressable>
            </Animated.View>
          </Pressable>
        </Pressable>
      </Modal>

      {showSearchPage ? (
        <View style={styles.searchPageRoot} pointerEvents="box-none">
          <View
            style={[
              styles.searchPageSheet,
              {
                top: HEADER_HEIGHT,
                height: searchPageHeight,
              },
            ]}
          >
            <ScrollView
              style={styles.searchPageScroll}
              contentContainerStyle={[
                styles.searchPageContent,
                { paddingBottom: searchPageBottomPadding },
              ]}
              keyboardShouldPersistTaps="handled"
              showsVerticalScrollIndicator={false}
              scrollEventThrottle={16}
              onScroll={({ nativeEvent }) => {
                if (searchStage !== 'results') return;
                const { layoutMeasurement, contentOffset, contentSize } = nativeEvent;
                const distanceToBottom =
                  contentSize.height - (layoutMeasurement.height + contentOffset.y);
                if (distanceToBottom <= 240) {
                  void loadMoreSearchResults();
                }
              }}
            >
              {searchStage === 'results' ? (
                <>
                  <View style={styles.searchPageInputRow}>
                    <TextInput
                      value={query}
                      onChangeText={setQuery}
                      placeholder={l('책 제목, 작가 이름을 검색해보세요')}
                      placeholderTextColor={colors.gray3}
                      style={styles.searchPageInput}
                      onSubmitEditing={handleSearchSubmitInPage}
                      returnKeyType="search"
                    />
                    {query.length > 0 ? (
                      <IconButton
                        name="close"
                        color={colors.gray4}
                        size={20}
                        accessibilityLabel={l('검색어 지우기')}
                        onPress={resetSearch}
                      />
                    ) : null}
                    <Pressable
                      onPress={handleSearchSubmitInPage}
                      hitSlop={8}
                      style={styles.searchPageSubmitButton}
                    >
                      <SearchDarkIcon width={24} height={24} />
                    </Pressable>
                  </View>

                  {searched ? (
                    searchLoading ? (
                      <Text style={styles.searchCount}>{l('검색 중...')}</Text>
                    ) : (
                      <Text style={styles.searchCount}>
                        {l('"{keyword}" 총 {count}개의 검색결과가 있습니다.', {
                          keyword: searchedKeyword,
                          count: searchTotalResults,
                        })}
                      </Text>
                    )
                  ) : (
                    <Text style={styles.searchGuideText}>
                      {l('검색어를 입력하고 검색해보세요.')}
                    </Text>
                  )}

                  {searched && !searchLoading && searchResults.length === 0 ? (
                    <Text style={styles.searchEmptyText}>{l('검색 결과가 없습니다.')}</Text>
                  ) : null}

                  <View style={styles.resultList}>
                    {searchLoading ? (
                      <>
                        {[0, 1, 2].map((i) => (
                          <View key={i} style={styles.resultCard}>
                            <SkeletonBox style={{ width: 96, height: 138, borderRadius: radius.sm }} />
                            <View style={[styles.resultBody, { gap: spacing.xs }]}>
                              <SkeletonBox style={{ height: 18, width: '90%', borderRadius: radius.xs }} />
                              <SkeletonBox style={{ height: 18, width: '70%', borderRadius: radius.xs }} />
                              <SkeletonBox style={{ height: 14, width: '55%', borderRadius: radius.xs }} />
                              <SkeletonBox style={{ height: 13, width: '85%', borderRadius: radius.xs }} />
                              <SkeletonBox style={{ height: 13, width: '75%', borderRadius: radius.xs }} />
                            </View>
                          </View>
                        ))}
                      </>
                    ) : null}
                    {searchResults.map((book, index) => (
                      <Pressable
                        key={`${book.isbn}-${index}`}
                        style={styles.resultCard}
                        onPress={() => handleSelectBook(book)}
                      >
                        {book.imgUrl ? (
                          <Image source={{ uri: book.imgUrl }} style={styles.resultThumb} />
                        ) : (
                          <View style={styles.resultThumb} />
                        )}

                        <View style={styles.resultBody}>
                          <Text style={styles.resultTitle} numberOfLines={2}>
                            {book.title}
                          </Text>
                          <Text style={styles.resultAuthor}>{book.author}</Text>
                          <Text style={styles.resultDesc} numberOfLines={3}>
                            {toSearchDescription(book, l('책 설명이 없습니다.'))}
                          </Text>
                        </View>

                        <Pressable
                          style={styles.resultLikeButton}
                          onPress={(event) => {
                            event.stopPropagation();
                            handleToggleBookLike(book);
                          }}
                        >
                          <MaterialIcons
                            name={isBookLikedInUi(book) ? 'favorite' : 'favorite-border'}
                            size={24}
                            color={isBookLikedInUi(book) ? colors.secondary1 : colors.gray5}
                          />
                        </Pressable>

                        <Pressable
                          style={({ pressed }) => [
                            styles.resultWriteButton,
                            pressed && styles.resultWriteButtonPressed,
                          ]}
                          onPress={(event) => {
                            event.stopPropagation();
                            openStoryCompose(book);
                          }}
                        >
                          <WriteIcon width={20} height={20} />
                        </Pressable>
                      </Pressable>
                    ))}
                  </View>

                  {searched && searchResults.length > 0 ? (
                    searchHasNext ? (
                      <View style={styles.searchMoreSpinner}>
                        <ActivityIndicator size="small" color={colors.primary1} />
                      </View>
                    ) : (
                      <Text style={styles.searchEndText}>{l('마지막 검색 결과입니다.')}</Text>
                    )
                  ) : null}
                </>
              ) : (
                <>
                  <Pressable
                    style={styles.detailBackRow}
                    onPress={() => {
                      setSearchStage('results');
                    }}
                  >
                    <MaterialIcons name="chevron-left" size={20} color={colors.gray5} />
                    <Text style={styles.detailBackText}>{l('검색결과')}</Text>
                  </Pressable>

                  <Text style={styles.detailHeaderText}>
                    {l('도서 선택 {title} 중', {
                      title: selectedBook?.title ?? l('상세'),
                    })}
                  </Text>

                  {selectedBook ? (
                    <Pressable
                      style={styles.resultCard}
                      onPress={() => {
                        void openAladinUrl(ALADIN_HOME_URL);
                      }}
                    >
                      {selectedBook.imgUrl ? (
                        <Image source={{ uri: selectedBook.imgUrl }} style={styles.resultThumb} />
                      ) : (
                        <View style={styles.resultThumb} />
                      )}
                      <View style={styles.resultBody}>
                        <Text style={styles.resultTitle} numberOfLines={2}>
                          {selectedBook.title}
                        </Text>
                        <Text style={styles.resultAuthor}>{selectedBook.author}</Text>
                        <Text style={styles.resultDesc} numberOfLines={3}>
                          {toSearchDescription(selectedBook, l('책 설명이 없습니다.'))}
                        </Text>
                      </View>

                      <Pressable
                        style={styles.resultLikeButton}
                        onPress={(event) => {
                          event.stopPropagation();
                          handleToggleBookLike(selectedBook);
                        }}
                      >
                        <MaterialIcons
                          name={isBookLikedInUi(selectedBook) ? 'favorite' : 'favorite-border'}
                          size={24}
                          color={isBookLikedInUi(selectedBook) ? colors.secondary1 : colors.gray5}
                        />
                      </Pressable>
                      <Pressable
                        style={({ pressed }) => [
                          styles.resultWriteButton,
                          pressed && styles.resultWriteButtonPressed,
                        ]}
                        onPress={(event) => {
                          event.stopPropagation();
                          openStoryCompose(selectedBook);
                        }}
                      >
                        <WriteIcon width={20} height={20} />
                      </Pressable>
                    </Pressable>
                  ) : null}

                  {bookDetailLoading ? (
                    <Text style={styles.detailLoadingText}>
                      {l('도서 상세를 불러오는 중...')}
                    </Text>
                  ) : null}

                  <Text style={styles.detailStoryCountTitle}>
                    {l('책이야기 {count}', { count: bookStories.length })}
                  </Text>

                  {bookStoriesLoading ? (
                    <Text style={styles.detailLoadingText}>
                      {l('책이야기 목록을 불러오는 중...')}
                    </Text>
                  ) : null}

                  {!bookStoriesLoading && bookStories.length === 0 ? (
                    <Text style={styles.detailEmptyText}>
                      {l('아직 작성된 책이야기가 없습니다.')}
                    </Text>
                  ) : null}

                  <View style={styles.detailStoryList}>
                    {bookStories.map((story) => {
                      const isMineForViewer = isLoggedIn && (story.mine ?? false);
                      return (
                        <BookStoryFeedCard
                          key={`book-story-${story.id}`}
                          authorName={story.nickname}
                          profileImgSrc={story.profileImageUrl}
                          timeAgo={toKstTimeAgoLabel(story.createdAt, relativeNowMillis, language)}
                          viewCount={story.viewCount}
                          title={story.title}
                          content={story.description}
                          coverImgSrc={story.bookInfo?.imgUrl ?? selectedBook?.imgUrl}
                          likeCount={story.likeCount}
                          commentCount={story.commentCount}
                          liked={story.liked}
                          isAuthor={isMineForViewer}
                          subscribed={isMineForViewer ? undefined : story.following}
                          onPress={() => {
                            closeSearchPage();
                            navigation.navigate('Story', { openStoryId: story.id });
                          }}
                          onPressComment={() => {
                            closeSearchPage();
                            navigation.navigate('Story', {
                              openStoryId: story.id,
                              openStoryFocus: 'comments',
                            });
                          }}
                        />
                      );
                    })}
                  </View>
                </>
              )}
            </ScrollView>
          </View>
        </View>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: colors.primary1,
    zIndex: layers.dropdown,
    elevation: layers.dropdown,
  },
  headerBar: {
    height: HEADER_HEIGHT,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: spacing.md,
    gap: spacing.sm,
  },
  left: {
    width: 64,
    alignItems: 'flex-start',
    justifyContent: 'center',
  },
  logoPress: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  title: {
    ...typography.subhead3,
    color: colors.white,
    flex: 1,
    textAlign: 'center',
  },
  actions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    width: 64,
    justifyContent: 'flex-end',
  },
  activeAction: {
    opacity: 0.88,
  },
  unreadDot: {
    position: 'absolute',
    top: 0,
    right: 0,
    width: 8,
    height: 8,
    borderRadius: radius.xs,
    backgroundColor: colors.likeRed,
  },
  notiBackdrop: {
    flex: 1,
  },
  notiPositioner: {
    paddingHorizontal: spacing.md,
    alignItems: 'flex-end',
  },
  notiCard: {
    backgroundColor: colors.white,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.gray2,
    padding: spacing.sm,
    gap: spacing.xs,
  },
  notiRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    borderRadius: radius.sm,
    paddingVertical: spacing.xxs,
    paddingHorizontal: spacing.xxs,
  },
  notiRowPressed: {
    backgroundColor: colors.gray1,
  },
  notiDot: {
    width: 8,
    height: 8,
    borderRadius: radius.xs,
    backgroundColor: colors.gray3,
  },
  notiDotActive: {
    backgroundColor: colors.likeRed,
  },
  notiText: {
    flex: 1,
    ...typography.body2_2,
    color: colors.gray6,
  },
  notiTime: {
    ...typography.body2_3,
    color: colors.gray4,
  },
  notiEmptyText: {
    ...typography.body2_3,
    color: colors.gray4,
    textAlign: 'center',
    paddingVertical: spacing.sm,
  },
  notiAllButton: {
    borderTopWidth: 1,
    borderTopColor: colors.gray2,
    paddingVertical: spacing.xs,
    borderRadius: radius.sm,
    alignItems: 'center',
    marginTop: spacing.xxs,
  },
  notiAllButtonText: {
    ...typography.body2_2,
    color: colors.primary1,
  },
  dropdownBackdrop: {
    flex: 1,
    backgroundColor: colors.overlay30,
  },
  dropdownPanel: {
    backgroundColor: colors.primary1,
    paddingHorizontal: spacing.md,
    paddingTop: spacing.md,
    paddingBottom: spacing.md,
    gap: spacing.md,
  },
  dropdownSearchBar: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: colors.gray2,
    paddingVertical: spacing.sm,
  },
  dropdownSearchInput: {
    flex: 1,
    ...typography.subhead4,
    color: colors.white,
  },
  dropdownSearchSubmitButton: {
    width: 28,
    height: 28,
    alignItems: 'center',
    justifyContent: 'center',
  },
  dropdownRecoTitle: {
    ...typography.subhead3,
    color: colors.white,
  },
  dropdownRecoRow: {
    flexDirection: 'row',
    gap: spacing.xs,
  },
  dropdownRecoCard: {
    flex: 1,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.subbrown3,
    backgroundColor: colors.subbrown2,
    padding: spacing.xxs,
    minHeight: 210,
    gap: spacing.xxs,
  },
  dropdownRecoThumbWrap: {
    width: '100%',
    aspectRatio: 5 / 7,
    borderRadius: radius.md,
    overflow: 'hidden',
    backgroundColor: colors.subbrown4,
  },
  dropdownRecoThumb: {
    width: '100%',
    height: '100%',
  },
  dropdownRecoThumbPlaceholder: {
    backgroundColor: colors.subbrown4,
  },
  dropdownRecoHeartBadge: {
    position: 'absolute',
    top: spacing.xs,
    left: spacing.xs,
    width: 26,
    height: 26,
    borderRadius: 13,
    backgroundColor: colors.white,
    alignItems: 'center',
    justifyContent: 'center',
  },
  dropdownRecoBookTitle: {
    ...typography.body2_2,
    color: colors.white,
  },
  dropdownRecoBookAuthor: {
    ...typography.body2_3,
    color: colors.gray2,
  },
  dropdownRecoLoading: {
    ...typography.body2_3,
    color: colors.gray2,
  },
  dropdownRecoLink: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    alignItems: 'center',
    gap: spacing.xxs,
    borderTopWidth: 1,
    borderTopColor: colors.gray2,
    paddingTop: spacing.sm,
  },
  dropdownRecoLinkText: {
    ...typography.body1_3,
    color: colors.white,
  },
  searchPageRoot: {
    ...StyleSheet.absoluteFillObject,
    zIndex: layers.overlay,
    elevation: layers.overlay,
  },
  searchPageSheet: {
    position: 'absolute',
    left: 0,
    right: 0,
    backgroundColor: colors.background,
    borderTopWidth: 1,
    borderTopColor: colors.subbrown4,
  },
  searchPageScroll: {
    flex: 1,
  },
  searchPageContent: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.md,
    gap: spacing.md,
  },
  searchPageInputRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: colors.gray2,
    paddingVertical: spacing.sm,
  },
  searchPageInput: {
    flex: 1,
    ...typography.subhead3,
    color: colors.gray7,
  },
  searchPageSubmitButton: {
    width: 28,
    height: 28,
    alignItems: 'center',
    justifyContent: 'center',
  },
  searchCount: {
    ...typography.body1_3,
    color: colors.gray4,
  },
  searchGuideText: {
    ...typography.body1_3,
    color: colors.gray4,
  },
  searchEmptyText: {
    ...typography.body1_3,
    color: colors.gray4,
    textAlign: 'center',
    paddingVertical: spacing.md,
  },
  searchMoreButton: {
    alignSelf: 'center',
    borderWidth: 1,
    borderColor: colors.primary1,
    borderRadius: radius.pill,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.sm,
    backgroundColor: colors.white,
  },
  searchMoreButtonPressed: {
    opacity: interactionOpacity.pressedStrong,
  },
  searchMoreButtonText: {
    ...typography.body1_2,
    color: colors.primary1,
  },
  searchMoreSpinner: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: spacing.md,
  },
  searchEndText: {
    ...typography.body2_3,
    color: colors.gray4,
    textAlign: 'center',
    paddingVertical: spacing.sm,
  },
  resultList: {
    gap: spacing.xs,
  },
  resultCard: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    backgroundColor: colors.white,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.subbrown4,
    padding: spacing.md,
    gap: spacing.md,
    position: 'relative',
    minHeight: 184,
  },
  resultThumb: {
    width: 96,
    height: 138,
    borderRadius: radius.sm,
    backgroundColor: colors.gray1,
  },
  resultBody: {
    flex: 1,
    gap: spacing.xs,
    paddingRight: spacing.xl,
  },
  resultTitle: {
    ...typography.subhead2,
    color: colors.gray7,
  },
  resultAuthor: {
    ...typography.subhead4_1,
    color: colors.gray5,
  },
  resultDesc: {
    ...typography.body1_3,
    color: colors.gray4,
  },
  resultLikeButton: {
    position: 'absolute',
    top: spacing.md,
    right: spacing.md,
  },
  resultWriteButton: {
    position: 'absolute',
    right: spacing.md,
    bottom: spacing.md,
    width: 48,
    height: 48,
    borderRadius: radius.pill,
    backgroundColor: colors.primary1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  resultWriteButtonPressed: {
    opacity: interactionOpacity.pressedStrong,
  },
	  detailBackRow: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    paddingVertical: spacing.xs,
  },
  detailBackText: {
    ...typography.body1_2,
    color: colors.gray5,
  },
  detailHeaderText: {
    ...typography.subhead3,
    color: colors.gray6,
  },
  detailHeaderTextAccent: {
    color: colors.primary2,
  },
  detailLoadingText: {
    ...typography.body1_3,
    color: colors.gray4,
  },
  detailStoryCountTitle: {
    ...typography.subhead2,
    color: colors.gray6,
    marginTop: spacing.sm,
  },
  detailEmptyText: {
    ...typography.body1_3,
    color: colors.gray4,
    textAlign: 'center',
    paddingVertical: spacing.md,
  },
  detailStoryList: {
    gap: spacing.xs,
    paddingBottom: spacing.md,
  },
});
