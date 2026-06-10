import { useMemo, useState, useCallback, useRef, useEffect } from 'react';
import {
  Animated,
  FlatList,
  Image,
  ImageBackground,
  LayoutAnimation,
  Platform,
  ScrollView,
  RefreshControl,
  StyleSheet,
  Text,
  View,
  UIManager,
  useWindowDimensions,
  Linking,
} from 'react-native';
import {
  useFocusEffect,
  useNavigation,
  useRoute,
  useScrollToTop,
  type EventArg,
  type NavigationProp,
  type ParamListBase,
  type RouteProp,
} from '@react-navigation/native';
import { MaterialIcons } from '@expo/vector-icons';

import { PUBLIC_ENV } from '../constants/publicEnv';
import { NEWS_DEFAULT_IMAGE } from '../constants/defaultAssets';
import { colors, radius, spacing, typography } from '../theme';
import { SkeletonBox } from '../components/common/SkeletonBox';
import { NewsCardSkeleton } from '../components/feature/news/NewsCardSkeleton';
import { FeedbackPressable as Pressable } from '../components/common/FeedbackPressable';
import { LeftFocalCoverImage } from '../components/common/LeftFocalCoverImage';
import { ScreenLayout } from '../components/common/ScreenLayout';
import { FloatingActionButton } from '../components/common/FloatingActionButton';
import {
  NewsPromotionCarousel,
  type NewsPromotionCarouselItem,
} from '../components/feature/news/NewsPromotionCarousel';
import { NewsPromotionCarouselSkeleton } from '../components/feature/news/NewsPromotionCarouselSkeleton';
import {
  fetchNewsDetail,
  fetchNewsList,
  type RemoteNewsDetail,
  type RemoteNewsSummary,
} from '../services/api/newsApi';
import { fetchRecommendedBooks, type BookItem } from '../services/api/bookApi';
import { ApiError } from '../services/api/http';
import { formatKstDateLabel } from '../utils/date';
import { showToast } from '../utils/toast';
import { collectAllCursorPages } from '../utils/pagination';
import { resolveApiError } from '../utils/resolveApiError';
import { useEdgeBackSwipe } from '../hooks/useEdgeBackSwipe';
import { useConsumeRouteParam } from '../hooks/useConsumeRouteParam';
import { parsePositiveIntParam, findNavigatorWithRoute } from '../navigation/navigateToHome';

type NewsItem = {
  id: string;
  newsId: number;
  title: string;
  excerpt: string;
  date: string;
  cover?: string;
  body: string;
  originalLink?: string;
};

type RecommendedBook = BookItem & {
  id: string;
};

type NewsRouteParams = {
  openNewsId?: number | string;
};

const DETAIL_BACK_EDGE_WIDTH = 28;
const DETAIL_BACK_ACTIVATE_DISTANCE = 14;
const DETAIL_BACK_TRIGGER_DISTANCE = 72;
const DETAIL_BACK_ACTIVATE_MAX_DY = 16;
const DETAIL_BACK_TRIGGER_MAX_DY = 60;
const fallbackPromotions: NewsItem[] = [
  {
    id: 'promo-fallback-1',
    newsId: 0,
    title: '봄메이트',
    excerpt: '5월 책 추천\n나의 돈키호테\n할인된 가격에\n만나보세요!',
    date: '',
    cover: NEWS_DEFAULT_IMAGE,
    body: '',
  },
  {
    id: 'promo-fallback-2',
    newsId: 0,
    title: '신간 소식',
    excerpt: '새로운 이야기와 큐레이션을 매주 만나보세요.',
    date: '',
    cover: NEWS_DEFAULT_IMAGE,
    body: '',
  },
  {
    id: 'promo-fallback-3',
    newsId: 0,
    title: '이벤트',
    excerpt: '책모 구독자 전용 굿즈 증정 이벤트',
    date: '',
    cover: NEWS_DEFAULT_IMAGE,
    body: '',
  },
];
const NEWS_CONTACT_URL = PUBLIC_ENV.SUPPORT_FORM_URL;

function shuffleItems<T>(items: T[]): T[] {
  const copied = [...items];
  for (let index = copied.length - 1; index > 0; index -= 1) {
    const randomIndex = Math.floor(Math.random() * (index + 1));
    [copied[index], copied[randomIndex]] = [copied[randomIndex], copied[index]];
  }
  return copied;
}

function toDateLabel(value?: string): string {
  return formatKstDateLabel(value, '-');
}

const NEWS_ERROR_OVERRIDES = { 401: '로그인 상태를 확인해 주십시오.', 403: '접근 권한이 없습니다.', 404: '요청한 소식을 찾을 수 없습니다.' } as const;

function toNewsItem(
  item: RemoteNewsSummary,
  index: number,
  keyPrefix: 'news' | 'promo',
): NewsItem {
  return {
    id: `${keyPrefix}-${item.id}`,
    newsId: item.id,
    title: item.title,
    excerpt: item.excerpt?.trim() || '소식 내용을 확인해보세요.',
    date: toDateLabel(item.date),
    cover: item.thumbnailUrl ?? NEWS_DEFAULT_IMAGE,
    body: '',
    originalLink: item.originalLink,
  };
}

function applyDetail(item: NewsItem, detail: RemoteNewsDetail): NewsItem {
  return {
    ...item,
    title: detail.title,
    excerpt: detail.excerpt || item.excerpt,
    date: toDateLabel(detail.date) || item.date,
    cover: detail.thumbnailUrl ?? item.cover,
    body: detail.content,
    originalLink: detail.originalLink ?? item.originalLink,
  };
}

function toStandaloneNewsItem(detail: RemoteNewsDetail): NewsItem {
  return {
    id: `news-${detail.id}`,
    newsId: detail.id,
    title: detail.title,
    excerpt: detail.excerpt?.trim() || '소식 내용을 확인해보세요.',
    date: toDateLabel(detail.date),
    cover: detail.thumbnailUrl ?? NEWS_DEFAULT_IMAGE,
    body: detail.content,
    originalLink: detail.originalLink,
  };
}

export function NewsScreen() {
  if (Platform.OS === 'android' && UIManager.setLayoutAnimationEnabledExperimental) {
    UIManager.setLayoutAnimationEnabledExperimental(true);
  }

  const navigation = useNavigation<NavigationProp<ParamListBase>>();
  const route = useRoute<RouteProp<{ News: NewsRouteParams }, 'News'>>();
  const { width } = useWindowDimensions();
  const horizontalInset = width >= 768 ? spacing.xl : spacing.md;
  const [selected, setSelected] = useState<NewsItem | null>(null);
  const [refreshing, setRefreshing] = useState(false);
  const [loadingNews, setLoadingNews] = useState(false);
  const [loadingDetail, setLoadingDetail] = useState(false);
  const [loadingBooks, setLoadingBooks] = useState(false);
  const [promotions, setPromotions] = useState<NewsItem[]>([]);
  const [items, setItems] = useState<NewsItem[]>([]);
  const [recommendedBooks, setRecommendedBooks] = useState<RecommendedBook[]>([]);
  const newsListRef = useRef<FlatList>(null);
  useScrollToTop(newsListRef);
  const detailScrollRef = useRef<ScrollView>(null);
  const detailTranslateX = useRef(new Animated.Value(0)).current;

  const animateTransition = useCallback(() => {
    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
  }, []);

  const closeSelectedDetail = useCallback(() => {
    animateTransition();
    detailTranslateX.stopAnimation(() => {
      detailTranslateX.setValue(0);
    });
    setSelected(null);
  }, [animateTransition, detailTranslateX]);

  const loadNews = useCallback(async () => {
    setLoadingNews(true);
    try {
      const allItems = await collectAllCursorPages({
        fetchPage: (cursor) => fetchNewsList(cursor),
        dedupeId: (item) => item.id,
      });

      const promotions = allItems.filter((item) => item.carousel === 'PROMOTION');
      const mappedPromotions = promotions.map((item, index) => toNewsItem(item, index, 'promo'));
      const mappedList = allItems.map((item, index) => toNewsItem(item, index, 'news'));

      setItems(mappedList);
      setPromotions(mappedPromotions.length > 0 ? mappedPromotions : fallbackPromotions);
    } catch (error) {
      setPromotions(fallbackPromotions);
      showToast(resolveApiError(error, NEWS_ERROR_OVERRIDES, '소식을 불러오지 못했습니다.'));
    } finally {
      setLoadingNews(false);
    }
  }, []);

  const loadRecommendedBookCards = useCallback(async () => {
    setLoadingBooks(true);
    try {
      const books = await fetchRecommendedBooks();
      const cards = shuffleItems(books).slice(0, 4).map((book, index) => {
        const fallbackId =
          (typeof book.bookId === 'number' && Number.isInteger(book.bookId)
            ? String(book.bookId)
            : '') || `recommended-${index}`;
        return {
          ...book,
          id: `${book.isbn || fallbackId}-${index}`,
          title: book.title || '책 제목',
          author: book.author || '작가 미상',
          description: book.description || '책 설명이 없습니다.',
        };
      });
      setRecommendedBooks(cards);
    } catch (error) {
      setRecommendedBooks([]);
      if (error instanceof ApiError) return;
      showToast('추천 책을 불러오지 못했습니다.');
    } finally {
      setLoadingBooks(false);
    }
  }, []);

  useEffect(() => {
    void loadNews();
  }, [loadNews]);

  useFocusEffect(
    useCallback(() => {
      void loadRecommendedBookCards();
      return undefined;
    }, [loadRecommendedBookCards]),
  );

  const onSelect = useCallback(
    (item: NewsItem) => {
      animateTransition();
      detailTranslateX.setValue(0);
      setSelected(item);

      if (item.newsId <= 0 || item.body.trim().length > 0) return;

      const loadDetail = async () => {
        setLoadingDetail(true);
        try {
          const detail = await fetchNewsDetail(item.newsId);
          if (!detail) return;
          setSelected((prev) => {
            if (!prev || prev.newsId !== item.newsId) return prev;
            return applyDetail(prev, detail);
          });
        } catch (error) {
          showToast(resolveApiError(error, NEWS_ERROR_OVERRIDES, '소식 상세를 불러오지 못했습니다.'));
        } finally {
          setLoadingDetail(false);
        }
      };
      void loadDetail();
    },
    [animateTransition, detailTranslateX],
  );

  const openNewsDetailById = useCallback(
    (newsId: number) => {
      if (!Number.isInteger(newsId) || newsId <= 0) return;

      animateTransition();
      detailTranslateX.stopAnimation(() => {
        detailTranslateX.setValue(0);
      });
      setSelected({
        id: `news-route-${newsId}`,
        newsId,
        title: '소식',
        excerpt: '소식 내용을 불러오는 중입니다.',
        date: '',
        body: '',
      });

      const loadDetailById = async () => {
        setLoadingDetail(true);
        try {
          const detail = await fetchNewsDetail(newsId);
          if (!detail) {
            setSelected(null);
            showToast('소식 상세를 불러오지 못했습니다.');
            return;
          }
          setSelected(toStandaloneNewsItem(detail));
        } catch (error) {
          setSelected(null);
          showToast(resolveApiError(error, NEWS_ERROR_OVERRIDES, '소식 상세를 불러오지 못했습니다.'));
        } finally {
          setLoadingDetail(false);
        }
      };

      void loadDetailById();
    },
    [animateTransition, detailTranslateX],
  );

  const openBookSearchDetail = useCallback(
    (book: RecommendedBook) => {
      const params = {
        openSearchBook: {
          isbn: book.isbn,
          bookId: book.bookId,
          title: book.title,
          author: book.author,
          description: book.description,
          imgUrl: book.imgUrl,
          publisher: book.publisher,
        },
      };

      const homeNav = findNavigatorWithRoute(navigation, 'Home');
      if (homeNav) { homeNav.navigate('Home', params); return; }
      const tabsNav = findNavigatorWithRoute(navigation, 'Tabs');
      if (tabsNav) { tabsNav.navigate('Tabs', { screen: 'Home', params }); return; }
      navigation.navigate('Home', params);
    },
    [navigation],
  );

  useConsumeRouteParam(
    route.params?.openNewsId,
    parsePositiveIntParam,
    openNewsDetailById,
    navigation,
    'openNewsId',
  );

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
        if (!selected) return;

        const targetKey = event.target;
        const parentState = parent.getState();
        const targetRoute = parentState.routes.find(
          (routeItem: { key: string; name: string }) => routeItem.key === targetKey,
        );
        const focusedRoute = parentState.routes[parentState.index];
        const isRetapOnNewsTab =
          Boolean(targetRoute) &&
          targetRoute?.name === 'News' &&
          focusedRoute?.key === targetKey;

        if (!isRetapOnNewsTab) return;

        requestAnimationFrame(() => {
          detailScrollRef.current?.scrollTo({ y: 0, animated: true });
        });
      },
    );

    return unsubscribe;
  }, [navigation, selected]);

  const handleRefresh = () => {
    setRefreshing(true);
    const refresh = async () => {
      detailTranslateX.stopAnimation(() => {
        detailTranslateX.setValue(0);
      });
      setSelected(null);
      await Promise.all([loadNews(), loadRecommendedBookCards()]);
      setRefreshing(false);
    };
    void refresh();
  };

  const handleContact = useCallback(() => {
    Linking.openURL(NEWS_CONTACT_URL).catch(() => null);
  }, []);

  useFocusEffect(
    useCallback(() => {
      return () => {
        detailTranslateX.stopAnimation(() => {
          detailTranslateX.setValue(0);
        });
        setSelected(null);
      };
    }, [detailTranslateX]),
  );

  const promotionCarouselItems = useMemo<NewsPromotionCarouselItem[]>(
    () =>
      promotions.map((promo) => ({
        id: promo.id,
        title: promo.title,
        description: promo.excerpt,
        imageUri: promo.cover,
      })),
    [promotions],
  );

  const detailBackSwipeResponder = useEdgeBackSwipe({
    isActive: !!selected,
    translateX: detailTranslateX,
    screenWidth: width,
    onClose: closeSelectedDetail,
    edgeWidth: DETAIL_BACK_EDGE_WIDTH,
    activateDistance: DETAIL_BACK_ACTIVATE_DISTANCE,
    activateMaxDy: DETAIL_BACK_ACTIVATE_MAX_DY,
    triggerDistance: DETAIL_BACK_TRIGGER_DISTANCE,
    triggerMaxDy: DETAIL_BACK_TRIGGER_MAX_DY,
  });

  const renderDetail = (item: NewsItem) => (
    <Animated.View
      style={[
        styles.detailSwipeContainer,
        { transform: [{ translateX: detailTranslateX }] },
      ]}
      {...detailBackSwipeResponder.panHandlers}
    >
      <ScrollView
        ref={detailScrollRef}
        style={styles.container}
        contentContainerStyle={styles.detailContent}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={handleRefresh}
          />
        }
      >
        <Pressable style={styles.breadcrumb} onPress={closeSelectedDetail}>
          <Text style={styles.breadcrumbText}>소식</Text>
          <Text style={styles.breadcrumbSep}>›</Text>
          <Text style={[styles.breadcrumbText, styles.breadcrumbActive]}>상세보기</Text>
        </Pressable>

        <View style={styles.hero}>
          {item.cover ? (
            <LeftFocalCoverImage uri={item.cover} style={styles.heroImage} />
          ) : (
            <View style={styles.heroImage} />
          )}
          <Text style={styles.heroDate}>{item.date}</Text>
        </View>

        <View style={styles.detailHeaderRow}>
          <Text style={styles.detailTitle}>{item.title}</Text>
          <Text style={styles.detailDate}>{item.date}</Text>
        </View>
        {loadingDetail ? (
          <View style={styles.detailBodySkeleton}>
            {['100%', '95%', '100%', '85%', '90%', '100%', '80%', '70%'].map((w, i) => (
              <SkeletonBox key={i} style={{ width: w as `${number}%`, height: 14 }} />
            ))}
          </View>
        ) : (
          <Text style={styles.detailBody}>{item.body || item.excerpt}</Text>
        )}
        {item.originalLink ? (
          <Pressable
            style={styles.detailLinkButton}
            onPress={() => {
              Linking.openURL(item.originalLink ?? '').catch(() => null);
            }}
          >
            <Text style={styles.detailLinkText}>원문 보기</Text>
          </Pressable>
        ) : null}
      </ScrollView>
    </Animated.View>
  );

  if (selected) {
    return <ScreenLayout title="소식">{renderDetail(selected)}</ScreenLayout>;
  }

  return (
    <ScreenLayout title="소식">
      <View style={styles.container}>
        <FlatList
          ref={newsListRef}
          data={items}
          keyExtractor={(item) => item.id}
          ListHeaderComponent={
            <View style={styles.headerWrap}>
              <View style={styles.carouselFullBleed}>
                {loadingNews && promotions.length === 0 ? (
                  <NewsPromotionCarouselSkeleton horizontalInset={horizontalInset} />
                ) : (
                  <NewsPromotionCarousel
                    items={promotionCarouselItems}
                    horizontalInset={horizontalInset}
                    onPressItem={(index) => {
                      const target = promotions[index];
                      if (!target) return;
                      onSelect(target);
                    }}
                  />
                )}
              </View>
              <View style={styles.recommendedSection}>
                <Text style={styles.recommendedTitle}>오늘의 추천 책</Text>
                <ScrollView
                  horizontal
                  showsHorizontalScrollIndicator={false}
                  contentContainerStyle={styles.recommendedRow}
                >
                  {loadingBooks
                    ? [0, 1, 2, 3].map((i) => (
                        <SkeletonBox key={i} style={styles.recommendedSkeletonCard} />
                      ))
                    : recommendedBooks.map((book) => (
                        <Pressable
                          key={book.id}
                          style={styles.recommendedCard}
                          onPress={() => openBookSearchDetail(book)}
                        >
                          <ImageBackground
                            source={book.imgUrl ? { uri: book.imgUrl } : undefined}
                            style={styles.recommendedThumb}
                            imageStyle={styles.recommendedThumbImage}
                          >
                            <View style={styles.recommendedOverlay} />
                            <View style={styles.recommendedTextWrap}>
                              <Text style={styles.recommendedBookTitle} numberOfLines={1}>
                                {book.title}
                              </Text>
                              <Text style={styles.recommendedBookAuthor} numberOfLines={1}>
                                {book.author}
                              </Text>
                            </View>
                          </ImageBackground>
                        </Pressable>
                      ))}
                </ScrollView>
              </View>
              <Text style={styles.newsListTitle}>소식</Text>
            </View>
          }
          ListEmptyComponent={
            loadingNews ? (
              <View style={styles.skeletonList}>
                <NewsCardSkeleton />
                <NewsCardSkeleton />
                <NewsCardSkeleton />
                <NewsCardSkeleton />
              </View>
            ) : (
              <Text style={styles.emptyNewsText}>등록된 소식이 없습니다.</Text>
            )
          }
          renderItem={({ item }) => (
            <Pressable style={styles.card} onPress={() => onSelect(item)}>
              {item.cover ? (
                <LeftFocalCoverImage uri={item.cover} style={styles.cardThumb} />
              ) : (
                <View style={styles.cardThumb} />
              )}
              <View style={styles.cardBody}>
                <Text style={styles.cardTitle}>{item.title}</Text>
                <Text style={styles.cardExcerpt} numberOfLines={1}>
                  {item.excerpt}
                </Text>
              </View>
              <Text style={styles.cardDate}>{item.date}</Text>
            </Pressable>
          )}
          contentContainerStyle={[styles.listContent, { paddingBottom: spacing.xl * 3 }]}
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={handleRefresh}
            />
          }
        />
        <FloatingActionButton onPress={handleContact} accessibilityLabel="문의하기">
          <MaterialIcons name="phone-in-talk" size={22} color={colors.white} />
        </FloatingActionButton>
      </View>
    </ScreenLayout>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  listContent: {
    padding: spacing.md,
    gap: spacing.sm,
    paddingBottom: spacing.xl * 2,
  },
  headerWrap: {
    marginBottom: spacing.sm,
  },
  carouselFullBleed: {
    marginHorizontal: -spacing.md,
  },
  carousel: {
    paddingVertical: spacing.xs,
  },
  promoWrapper: {
    marginRight: spacing.sm,
  },
  promoCard: {
    borderRadius: radius.md,
    backgroundColor: colors.gray1,
    overflow: 'hidden',
    justifyContent: 'flex-end',
    padding: spacing.lg,
    aspectRatio: 16 / 10,
  },
  promoGradient: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(91, 71, 61, 0.35)',
  },
  promoContent: {
    gap: spacing.xs,
  },
  promoTitle: {
    ...typography.subhead3,
    color: colors.white,
  },
  promoDesc: {
    ...typography.body1_3,
    color: colors.white,
  },
  dots: {
    flexDirection: 'row',
    gap: spacing.xs,
    paddingHorizontal: spacing.xs,
    alignItems: 'center',
  },
  recommendedSection: {
    marginTop: spacing.md,
    gap: spacing.sm,
  },
  recommendedTitle: {
    ...typography.body1_2,
    color: colors.gray6,
  },
  recommendedRow: {
    flexDirection: 'row',
    gap: spacing.sm,
    paddingRight: spacing.xs,
  },
  recommendedCard: {
    width: 132,
  },
  recommendedThumb: {
    aspectRatio: 3 / 4,
    borderRadius: radius.md,
    overflow: 'hidden',
    backgroundColor: colors.gray1,
    justifyContent: 'flex-end',
    padding: spacing.sm,
  },
  recommendedThumbImage: {
    borderRadius: radius.md,
  },
  recommendedOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(41, 31, 26, 0.2)',
  },
  recommendedTextWrap: {
    gap: spacing.xxs,
  },
  recommendedBookTitle: {
    ...typography.body1_2,
    color: colors.white,
  },
  recommendedBookAuthor: {
    ...typography.body2_3,
    color: colors.white,
  },
  newsListTitle: {
    marginTop: spacing.md,
    ...typography.body1_2,
    color: colors.gray6,
  },
  emptyNewsText: {
    ...typography.body2_3,
    color: colors.gray4,
    textAlign: 'center',
    paddingVertical: spacing.lg,
  },
  skeletonList: {
    gap: spacing.sm,
  },
  recommendedSkeletonCard: {
    width: 132,
    aspectRatio: 3 / 4,
    borderRadius: radius.md,
  },
  detailBodySkeleton: {
    gap: spacing.sm,
  },
  dot: {
    width: 8,
    height: 8,
    borderRadius: radius.xs,
    backgroundColor: colors.gray2,
  },
  dotActive: {
    backgroundColor: colors.primary1,
  },
  dotActiveSize: {
    width: 16,
    borderRadius: radius.sm,
  },
  banner: {
    borderRadius: radius.md,
    backgroundColor: colors.gray1,
    overflow: 'hidden',
    marginBottom: spacing.sm,
  },
  bannerImage: {
    width: '100%',
    aspectRatio: 16 / 9,
    backgroundColor: colors.gray2,
  },
  bannerOverlay: {
    ...StyleSheet.absoluteFillObject,
    justifyContent: 'center',
    padding: spacing.lg,
  },
  bannerTitle: {
    ...typography.headline2,
    color: colors.gray7,
  },
  bannerBody: {
    ...typography.subhead4,
    color: colors.gray7,
    marginTop: spacing.xs,
  },
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.white,
    borderRadius: radius.md,
    padding: spacing.md,
    gap: spacing.md,
    borderWidth: 1,
    borderColor: colors.subbrown4,
  },
  cardThumb: {
    width: 60,
    height: 80,
    borderRadius: radius.sm,
    backgroundColor: colors.gray1,
  },
  cardBody: {
    flex: 1,
    gap: spacing.xxs,
  },
  cardTitle: {
    ...typography.subhead4_1,
    color: colors.gray6,
  },
  cardExcerpt: {
    ...typography.body2_3,
    color: colors.gray5,
  },
  cardDate: {
    ...typography.body2_3,
    color: colors.gray4,
  },
  detailContent: {
    padding: spacing.md,
    gap: spacing.md,
    paddingBottom: spacing.xl * 2,
    backgroundColor: colors.background,
  },
  detailSwipeContainer: {
    flex: 1,
  },
  breadcrumb: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xxs,
  },
  breadcrumbText: {
    ...typography.body2_3,
    color: colors.gray4,
  },
  breadcrumbSep: {
    ...typography.body2_3,
    color: colors.gray3,
  },
  breadcrumbActive: {
    color: colors.gray6,
  },
  hero: {
    borderRadius: radius.md,
    overflow: 'hidden',
    backgroundColor: colors.gray1,
  },
  heroImage: {
    width: '100%',
    aspectRatio: 16 / 9,
    backgroundColor: colors.gray2,
  },
  heroDate: {
    position: 'absolute',
    bottom: spacing.md,
    right: spacing.md,
    ...typography.body2_3,
    color: colors.gray5,
  },
  detailHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  detailTitle: {
    ...typography.subhead2,
    color: colors.gray6,
  },
  detailDate: {
    ...typography.body2_3,
    color: colors.gray5,
  },
  detailBody: {
    ...typography.body1_3_relaxed,
    color: colors.gray6,
  },
  detailLinkButton: {
    alignSelf: 'flex-start',
    marginTop: spacing.xs,
    paddingVertical: spacing.xs,
    paddingHorizontal: spacing.sm,
    borderRadius: radius.sm,
    backgroundColor: colors.subbrown4,
  },
  detailLinkText: {
    ...typography.body2_3,
    color: colors.gray6,
  },
});
