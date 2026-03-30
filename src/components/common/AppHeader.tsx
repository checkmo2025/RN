import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useCallback, useEffect, useRef, useState } from 'react';
import { useFocusEffect } from '@react-navigation/native';
import { useNavigation } from '@react-navigation/native';
import { useRoute } from '@react-navigation/native';
import {
  Animated,
  Image,
  Linking,
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  useWindowDimensions,
  View,
} from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { SvgUri } from 'react-native-svg';

import { PUBLIC_ENV } from '../../constants/publicEnv';
import { colors, radius, spacing, typography } from '../../theme';
import { IconButton, IconName } from './IconButton';
import { useAuthGate } from '../../contexts/AuthGateContext';
import { navigateToHome } from '../../navigation/navigateToHome';
import { ApiError } from '../../services/api/http';
import { triggerSelectionHaptic } from '../../utils/haptics';
import {
  fetchBookDetail,
  fetchRecommendedBooks,
  searchBooks,
  type BookItem,
} from '../../services/api/bookApi';
import {
  isBookLiked,
  resolveBookLikeId,
  subscribeLikedBooks,
  toggleBookLike,
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
import BookStoryFeedCard from '../feature/bookstory/BookStoryFeedCard';

const logoUri = Image.resolveAssetSource(
  require('../../../assets/mobile-header-logo.svg'),
).uri;
const searchUri = Image.resolveAssetSource(
  require('../../../assets/header/header-search.svg'),
).uri;
const searchDarkUri = Image.resolveAssetSource(
  require('../../../assets/icons/search.svg'),
).uri;
const alarmUri = Image.resolveAssetSource(
  require('../../../assets/header/header-alarm.svg'),
).uri;
const writeIconUri = Image.resolveAssetSource(
  require('../../../assets/icons/pencil_icon.svg'),
).uri;
const ALADIN_RANKING_URL = PUBLIC_ENV.ALADIN_RANKING_URL;
const ALADIN_HOME_URL = PUBLIC_ENV.ALADIN_HOME_URL;

type HeaderAction = {
  key?: string;
  icon: IconName;
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

const HEADER_HEIGHT = 56;

function resolveBookId(book: BookItem | null): number | null {
  if (!book) return null;
  if (typeof book.bookId === 'number' && Number.isInteger(book.bookId) && book.bookId > 0) {
    return book.bookId;
  }

  if (/^\d+$/.test(book.isbn) && book.isbn.length <= 10) {
    const parsed = Number(book.isbn);
    if (Number.isInteger(parsed) && parsed > 0) {
      return parsed;
    }
  }

  return null;
}

function toSearchDescription(book: BookItem): string {
  if (book.description && book.description.trim()) return book.description;
  if (book.publisher && book.publisher.trim()) return book.publisher;
  return '책 설명이 없습니다.';
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
  const navigation = useNavigation<any>();
  const route = useRoute<any>();
  const { isLoggedIn, requireAuth } = useAuthGate();
  const { top } = useSafeAreaInsets();
  const { height: windowHeight, width: windowWidth } = useWindowDimensions();

  const [showNoti, setShowNoti] = useState(false);
  const [notificationPreview, setNotificationPreview] = useState<NotificationItem[]>([]);
  const [notificationPreviewLoading, setNotificationPreviewLoading] = useState(false);
  const [showSearchDropdown, setShowSearchDropdown] = useState(false);
  const [showSearchPage, setShowSearchPage] = useState(false);
  const [searchStage, setSearchStage] = useState<SearchStage>('results');

  const [query, setQuery] = useState('');
  const [searched, setSearched] = useState(false);
  const [searchedKeyword, setSearchedKeyword] = useState('');
  const [searchResults, setSearchResults] = useState<BookItem[]>([]);
  const [searchLoading, setSearchLoading] = useState(false);

  const [recommendedBooks, setRecommendedBooks] = useState<BookItem[]>([]);
  const [recommendLoading, setRecommendLoading] = useState(false);

  const [selectedBook, setSelectedBook] = useState<BookItem | null>(null);
  const [bookStories, setBookStories] = useState<RemoteStoryItem[]>([]);
  const [bookDetailLoading, setBookDetailLoading] = useState(false);
  const [bookStoriesLoading, setBookStoriesLoading] = useState(false);
  const [likedBookIds, setLikedBookIds] = useState<Set<string>>(new Set());

  const dropdownAnim = useRef(new Animated.Value(0)).current;
  const dropdownOpenGuardUntil = useRef(0);
  const activeBookRequestId = useRef(0);

  const openAladinUrl = useCallback(async (url: string) => {
    try {
      await Linking.openURL(url);
    } catch {
      showToast('링크를 열 수 없습니다.');
    }
  }, []);

  const isBookLikeTogglable = useCallback((book: BookItem) => {
    if (book.isbn.startsWith('placeholder-')) return false;
    return resolveBookLikeId(book) !== null;
  }, []);

  const isBookLikedInUi = useCallback(
    (book: BookItem) => {
      const likeId = resolveBookLikeId(book);
      if (!likeId) return false;
      return likedBookIds.has(likeId) || isBookLiked(book);
    },
    [likedBookIds],
  );

  const handleToggleBookLike = useCallback(
    (book: BookItem) => {
      if (!isLoggedIn) {
        requireAuth();
        return;
      }
      if (!isBookLikeTogglable(book)) return;

      triggerSelectionHaptic();
      const submit = async () => {
        const liked = await toggleBookLike(book);
        showToast(liked ? '내 서재에 담았습니다.' : '내 서재에서 제거했습니다.');
      };
      void submit();
    },
    [isBookLikeTogglable, isLoggedIn, requireAuth],
  );

  const hideDropdownImmediately = useCallback(() => {
    dropdownAnim.setValue(0);
    setShowSearchDropdown(false);
  }, [dropdownAnim]);

  const closeSearchDropdown = useCallback(() => {
    Animated.timing(dropdownAnim, {
      toValue: 0,
      duration: 160,
      useNativeDriver: true,
    }).start(({ finished }) => {
      if (finished) {
        setShowSearchDropdown(false);
      }
    });
  }, [dropdownAnim]);

  const openSearchDropdown = useCallback(() => {
    dropdownOpenGuardUntil.current = Date.now() + 220;
    setShowNoti(false);
    setShowSearchPage(false);
    setSearchStage('results');
    setSelectedBook(null);
    setBookStories([]);
    setShowSearchDropdown(true);
  }, []);

  const closeSearchPage = useCallback(() => {
    activeBookRequestId.current += 1;
    setShowSearchPage(false);
    setSearchStage('results');
    setSelectedBook(null);
    setBookStories([]);
    setBookDetailLoading(false);
    setBookStoriesLoading(false);
  }, []);

  const loadNotificationPreview = useCallback(async () => {
    if (!isLoggedIn) {
      setNotificationPreview([]);
      return;
    }

    setNotificationPreviewLoading(true);
    try {
      const notifications = await fetchNotificationPreview(5);
      setNotificationPreview(notifications);
    } catch (error) {
      if (error instanceof ApiError && error.status === 401) {
        setNotificationPreview([]);
        return;
      }
      if (!(error instanceof ApiError)) {
        showToast('알림을 불러오지 못했습니다.');
      }
    } finally {
      setNotificationPreviewLoading(false);
    }
  }, [isLoggedIn]);

  const navigateByNotification = useCallback(
    (notification: NotificationItem) => {
      const target = resolveNotificationTarget(notification);
      navigation.navigate(target.screen, target.params);
    },
    [navigation],
  );

  const handlePressNotification = useCallback(
    (notification: NotificationItem) => {
      const nextNotification = { ...notification, read: true };
      setNotificationPreview((prev) =>
        prev.map((item) =>
          item.notificationId === notification.notificationId ? nextNotification : item,
        ),
      );
      setShowNoti(false);
      navigateByNotification(nextNotification);

      const submit = async () => {
        if (notification.read) return;
        try {
          await markNotificationAsRead(notification.notificationId);
        } catch {
          setNotificationPreview((prev) =>
            prev.map((item) =>
              item.notificationId === notification.notificationId
                ? { ...item, read: false }
                : item,
            ),
          );
        }
      };
      void submit();
    },
    [navigateByNotification],
  );

  const loadRecommendedBooks = useCallback(async () => {
    setRecommendLoading(true);
    try {
      const books = await fetchRecommendedBooks();
      setRecommendedBooks(books.slice(0, 3));
    } catch (error) {
      if (!(error instanceof ApiError)) {
        showToast('추천 책을 불러오지 못했습니다.');
      }
    } finally {
      setRecommendLoading(false);
    }
  }, []);

  const executeSearch = useCallback(async (keyword: string) => {
    if (!keyword) {
      setSearched(false);
      setSearchResults([]);
      setSearchedKeyword('');
      return;
    }

    setSearched(true);
    setSearchedKeyword(keyword);
    setSearchResults([]);
    setSearchLoading(true);
    try {
      const result = await searchBooks(keyword, 1);
      setSearchResults(result.items);
    } catch (error) {
      if (!(error instanceof ApiError)) {
        showToast('책 검색에 실패했습니다.');
      }
      setSearchResults([]);
    } finally {
      setSearchLoading(false);
    }
  }, []);

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
          showToast('도서 상세를 불러오지 못했습니다.');
        }
      }
    }

    if (activeBookRequestId.current === requestId) {
      setBookDetailLoading(false);
    }

    const bookId = resolveBookId(enrichedBook);
    if (!bookId) {
      if (activeBookRequestId.current === requestId) {
        setBookStories([]);
        setBookStoriesLoading(false);
      }
      return;
    }

    try {
      const feed = await fetchBookStoriesByBook(bookId, undefined, {
        viewerAuthenticated: isLoggedIn,
      });
      if (activeBookRequestId.current === requestId) {
        setBookStories(feed.items);
      }
    } catch (error) {
      if (!(error instanceof ApiError)) {
        showToast('해당 도서의 책이야기를 불러오지 못했습니다.');
      }
      if (activeBookRequestId.current === requestId) {
        setBookStories([]);
      }
    } finally {
      if (activeBookRequestId.current === requestId) {
        setBookStoriesLoading(false);
      }
    }
  }, [isLoggedIn]);

  useEffect(() => {
    const routeBook = toBookItemFromRouteParam(route.params?.openSearchBook);
    if (!routeBook) return;

    hideDropdownImmediately();
    setShowNoti(false);
    setShowSearchPage(true);
    setSearchStage('detail');
    setQuery(routeBook.title);
    void loadSelectedBookData(routeBook);
    navigation.setParams({ openSearchBook: undefined });
  }, [
    hideDropdownImmediately,
    loadSelectedBookData,
    navigation,
    route.params?.openSearchBook,
  ]);

  const handleSearchSubmitFromDropdown = useCallback(() => {
    const keyword = query.trim();
    if (!keyword) {
      showToast('검색어를 입력해주세요.');
      return;
    }

    hideDropdownImmediately();
    setShowSearchPage(true);
    setSearchStage('results');
    void executeSearch(keyword);
  }, [executeSearch, hideDropdownImmediately, query]);

  const handleSearchSubmitInPage = useCallback(() => {
    const keyword = query.trim();
    if (!keyword) {
      showToast('검색어를 입력해주세요.');
      return;
    }

    setSearchStage('results');
    void executeSearch(keyword);
  }, [executeSearch, query]);

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
      const composeBook = book
        ? {
            bookId: book.bookId,
            isbn: book.isbn,
            title: book.title,
            author: book.author,
            description: toSearchDescription(book),
            imgUrl: book.imgUrl,
          }
        : undefined;

      hideDropdownImmediately();
      closeSearchPage();
      navigation.navigate('Story', { openCompose: true, composeBook });
    },
    [closeSearchPage, hideDropdownImmediately, navigation],
  );

  const headerTitle = showSearchPage ? '책 검색' : title;
  const searchPageHeight = Math.max(280, windowHeight - top - HEADER_HEIGHT);
  const notiCardWidth = Math.min(280, windowWidth - spacing.md * 2);

  const handleHeaderBack = useCallback(() => {
    if (!showSearchPage) return;
    if (searchStage === 'detail') {
      setSearchStage('results');
      return;
    }
    closeSearchPage();
  }, [closeSearchPage, searchStage, showSearchPage]);

  const handleLogoPress = useCallback(() => {
    setShowNoti(false);
    hideDropdownImmediately();
    closeSearchPage();

    if (onPressLogo) {
      onPressLogo();
      return;
    }

    navigateToHome(navigation);
  }, [closeSearchPage, hideDropdownImmediately, navigation, onPressLogo]);

  useEffect(() => {
    if (!showSearchDropdown) return;
    void loadRecommendedBooks();
  }, [loadRecommendedBooks, showSearchDropdown]);

  useEffect(() => {
    const unsubscribe = subscribeLikedBooks((books) => {
      setLikedBookIds(new Set(books.map((book) => book.id)));
    });
    return unsubscribe;
  }, []);

  useEffect(() => {
    if (!showSearchDropdown) {
      dropdownAnim.setValue(0);
      return;
    }

    dropdownAnim.setValue(0);
    Animated.timing(dropdownAnim, {
      toValue: 1,
      duration: 180,
      useNativeDriver: true,
    }).start();
  }, [dropdownAnim, showSearchDropdown]);

  useFocusEffect(
    useCallback(() => {
      return () => {
        setShowNoti(false);
        setShowSearchDropdown(false);
        setShowSearchPage(false);
        setSearchStage('results');
        setNotificationPreview([]);
      };
    }, []),
  );

  const derivedActions: HeaderAction[] =
    Array.isArray(actions) && actions.length > 0
      ? actions
      : [
          { key: 'search', icon: 'search', onPress: onPressSearch },
          { key: 'notifications', icon: 'notifications-none', onPress: onPressBell },
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
            />
          ) : (
            <Pressable
              onPress={handleLogoPress}
              hitSlop={8}
              style={styles.logoPress}
              accessibilityRole="button"
              accessibilityLabel="홈으로 이동"
            >
              <SvgUri uri={logoUri} width={44} height={24} />
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
              onPress={() => {
                if (action.icon === 'notifications-none') {
                  if (!isLoggedIn) {
                    requireAuth();
                    return;
                  }

                  const nextVisible = !showNoti;
                  setShowNoti(nextVisible);
                  hideDropdownImmediately();
                  closeSearchPage();
                  if (nextVisible) {
                    void loadNotificationPreview();
                  }
                  onPressBell?.();
                  return;
                }

                if (action.icon === 'search') {
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
                  <SvgUri uri={searchUri} width={24} height={24} />
                ) : action.icon === 'notifications-none' ? (
                  <SvgUri uri={alarmUri} width={24} height={24} />
                ) : undefined
              }
            />
          ))}
        </View>
      </View>

      <Modal
        visible={showNoti}
        transparent
        animationType="none"
        onRequestClose={() => setShowNoti(false)}
      >
        <Pressable
          style={styles.notiBackdrop}
          onPress={() => setShowNoti(false)}
        >
          <View style={[styles.notiPositioner, { paddingTop: top + HEADER_HEIGHT }]}>
            <Pressable
              style={[styles.notiCard, { width: notiCardWidth }]}
              onPress={(event) => event.stopPropagation()}
            >
              {notificationPreviewLoading ? (
                <Text style={styles.notiEmptyText}>알림을 불러오는 중...</Text>
              ) : null}
              {!notificationPreviewLoading && notificationPreview.length === 0 ? (
                <Text style={styles.notiEmptyText}>표시할 알림이 없습니다.</Text>
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
                        )}
                      </Text>
                      <Text style={styles.notiTime}>{toKstTimeAgoLabel(notification.createdAt)}</Text>
                    </Pressable>
                  ))
                : null}
            </Pressable>
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
        >
          <Pressable
            style={{ marginTop: top + HEADER_HEIGHT }}
            onPress={(event) => event.stopPropagation()}
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
                  placeholder="책 제목, 작가 이름을 검색해보세요"
                  placeholderTextColor={colors.gray2}
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
                  />
                ) : null}
                <Pressable
                  onPress={handleSearchSubmitFromDropdown}
                  hitSlop={8}
                  style={styles.dropdownSearchSubmitButton}
                >
                  <SvgUri uri={searchUri} width={24} height={24} />
                </Pressable>
              </View>

              <Text style={styles.dropdownRecoTitle}>오늘의 추천 책</Text>
              <View style={styles.dropdownRecoRow}>
                {(recommendedBooks.length > 0
                  ? recommendedBooks
                  : Array.from({ length: 3 }).map((_, idx) => ({
                      isbn: `placeholder-${idx}`,
                      title: '책 제목',
                      author: '작가/작가가',
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
                <Text style={styles.dropdownRecoLoading}>추천 책을 불러오는 중...</Text>
              ) : null}

              <Pressable
                style={styles.dropdownRecoLink}
                onPress={() => {
                  void openAladinUrl(ALADIN_RANKING_URL);
                }}
              >
                <Text style={styles.dropdownRecoLinkText}>알라딘 랭킹 더 보러가기</Text>
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
              contentContainerStyle={styles.searchPageContent}
              keyboardShouldPersistTaps="handled"
              showsVerticalScrollIndicator={false}
            >
              {searchStage === 'results' ? (
                <>
                  <View style={styles.searchPageInputRow}>
                    <View>
                      <SvgUri uri={searchUri} width={24} height={24} />
                    </View>
                    <TextInput
                      value={query}
                      onChangeText={setQuery}
                      placeholder="책 제목, 작가 이름을 검색해보세요"
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
                        onPress={() => {
                          setQuery('');
                          setSearched(false);
                          setSearchedKeyword('');
                          setSearchResults([]);
                        }}
                      />
                    ) : null}
                    <Pressable
                      onPress={handleSearchSubmitInPage}
                      hitSlop={8}
                      style={styles.searchPageSubmitButton}
                    >
                      <SvgUri uri={searchDarkUri} width={24} height={24} />
                    </Pressable>
                  </View>

                  {searched ? (
                    searchLoading ? (
                      <Text style={styles.searchCount}>검색 중...</Text>
                    ) : (
                      <Text style={styles.searchCount}>
                        "{searchedKeyword}" 총 {searchResults.length}개의 검색결과가 있습니다.
                      </Text>
                    )
                  ) : (
                    <Text style={styles.searchGuideText}>검색어를 입력하고 검색해보세요.</Text>
                  )}

                  {searched && !searchLoading && searchResults.length === 0 ? (
                    <Text style={styles.searchEmptyText}>검색 결과가 없습니다.</Text>
                  ) : null}

                  <View style={styles.resultList}>
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
                            {toSearchDescription(book)}
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
                          <SvgUri uri={writeIconUri} width={20} height={20} />
                        </Pressable>
                      </Pressable>
                    ))}
                  </View>
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
                    <Text style={styles.detailBackText}>검색결과</Text>
                  </Pressable>

                  <Text style={styles.detailHeaderText}>
                    도서 선택{' '}
                    <Text style={styles.detailHeaderTextAccent}>{selectedBook?.title ?? '상세'}</Text>{' '}
                    중
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
                          {toSearchDescription(selectedBook)}
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
                        <SvgUri uri={writeIconUri} width={20} height={20} />
                      </Pressable>
                    </Pressable>
                  ) : null}

                  {bookDetailLoading ? (
                    <Text style={styles.detailLoadingText}>도서 상세를 불러오는 중...</Text>
                  ) : null}

                  <Text style={styles.detailStoryCountTitle}>책이야기 {bookStories.length}</Text>

                  {bookStoriesLoading ? (
                    <Text style={styles.detailLoadingText}>책이야기 목록을 불러오는 중...</Text>
                  ) : null}

                  {!bookStoriesLoading && bookStories.length === 0 ? (
                    <Text style={styles.detailEmptyText}>아직 작성된 책이야기가 없습니다.</Text>
                  ) : null}

                  <View style={styles.detailStoryList}>
                    {bookStories.map((story) => {
                      const isMineForViewer = isLoggedIn && (story.mine ?? false);
                      return (
                        <BookStoryFeedCard
                          key={`book-story-${story.id}`}
                          authorName={story.nickname}
                          profileImgSrc={story.profileImageUrl}
                          timeAgo={toKstTimeAgoLabel(story.createdAt)}
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
    zIndex: 20,
    elevation: 20,
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
  notiBackdrop: {
    flex: 1,
  },
  notiPositioner: {
    paddingHorizontal: spacing.md,
    alignItems: 'flex-end',
  },
  notiCard: {
    backgroundColor: colors.white,
    borderRadius: spacing.md,
    borderWidth: 1,
    borderColor: colors.gray2,
    padding: spacing.sm,
    gap: spacing.xs,
  },
  notiRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    borderRadius: spacing.xs,
    paddingVertical: spacing.xs / 2,
    paddingHorizontal: spacing.xs / 2,
  },
  notiRowPressed: {
    backgroundColor: colors.gray1,
  },
  notiDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
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
    borderRadius: 18,
    borderWidth: 1,
    borderColor: colors.subbrown3,
    backgroundColor: colors.subbrown2,
    padding: spacing.xs / 2,
    minHeight: 210,
    gap: spacing.xs / 2,
  },
  dropdownRecoThumbWrap: {
    width: '100%',
    aspectRatio: 5 / 7,
    borderRadius: 12,
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
    gap: spacing.xs / 2,
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
    zIndex: 30,
    elevation: 30,
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
  resultList: {
    gap: spacing.sm,
  },
  resultCard: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    backgroundColor: colors.white,
    borderRadius: spacing.md,
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
    borderRadius: spacing.xs,
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
    opacity: 0.8,
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
