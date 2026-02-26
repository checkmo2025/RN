import { useMemo, useState, useCallback, useRef, useEffect } from 'react';
import {
  Animated,
  FlatList,
  Image,
  ImageBackground,
  LayoutAnimation,
  PanResponder,
  PanResponderGestureState,
  Platform,
  Pressable,
  ScrollView,
  RefreshControl,
  StyleSheet,
  Text,
  View,
  UIManager,
  useWindowDimensions,
  Linking,
} from 'react-native';
import { useFocusEffect } from '@react-navigation/native';

import { colors, radius, spacing, typography } from '../theme';
import { ScreenLayout } from '../components/common/ScreenLayout';
import {
  fetchNewsCarousel,
  fetchNewsDetail,
  fetchNewsList,
  type RemoteNewsDetail,
  type RemoteNewsSummary,
} from '../services/api/newsApi';
import { ApiError } from '../services/api/http';
import { showToast } from '../utils/toast';

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

type RecommendedBook = {
  id: string;
  title: string;
  author: string;
  imageUri?: string;
};

const DETAIL_BACK_EDGE_WIDTH = 28;
const DETAIL_BACK_ACTIVATE_DISTANCE = 14;
const DETAIL_BACK_TRIGGER_DISTANCE = 72;
const DETAIL_BACK_ACTIVATE_MAX_DY = 16;
const DETAIL_BACK_TRIGGER_MAX_DY = 60;
const fallbackPromotionImages = [
  Image.resolveAssetSource(require('../../assets/images/background.png')).uri,
  Image.resolveAssetSource(require('../../assets/images/news_sample2.png')).uri,
  Image.resolveAssetSource(require('../../assets/images/news_sample3.png')).uri,
];
const fallbackPromotions: NewsItem[] = [
  {
    id: 'promo-fallback-1',
    newsId: 0,
    title: '봄메이트',
    excerpt: '5월 책 추천\n나의 돈키호테\n할인된 가격에\n만나보세요!',
    date: '',
    cover: fallbackPromotionImages[0],
    body: '',
  },
  {
    id: 'promo-fallback-2',
    newsId: 0,
    title: '신간 소식',
    excerpt: '새로운 이야기와 큐레이션을 매주 만나보세요.',
    date: '',
    cover: fallbackPromotionImages[1],
    body: '',
  },
  {
    id: 'promo-fallback-3',
    newsId: 0,
    title: '이벤트',
    excerpt: '책모 구독자 전용 굿즈 증정 이벤트',
    date: '',
    cover: fallbackPromotionImages[2],
    body: '',
  },
];

function toDateLabel(value?: string): string {
  if (!value) return '';
  if (value.includes('T')) return value.slice(0, 10);
  return value;
}

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
    cover: item.thumbnailUrl ?? fallbackPromotionImages[index % fallbackPromotionImages.length],
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

export function NewsScreen() {
  if (Platform.OS === 'android' && UIManager.setLayoutAnimationEnabledExperimental) {
    UIManager.setLayoutAnimationEnabledExperimental(true);
  }

  const { width } = useWindowDimensions();
  const [selected, setSelected] = useState<NewsItem | null>(null);
  const [refreshing, setRefreshing] = useState(false);
  const [loadingNews, setLoadingNews] = useState(false);
  const [loadingDetail, setLoadingDetail] = useState(false);
  const [activeSlide, setActiveSlide] = useState(0);
  const [promotions, setPromotions] = useState<NewsItem[]>(fallbackPromotions);
  const [items, setItems] = useState<NewsItem[]>([]);
  const detailTranslateX = useRef(new Animated.Value(0)).current;
  const littlePrinceUri = Image.resolveAssetSource(
    require('../../assets/tmp/little-prince.jpg'),
  ).uri;

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

  const recommendedBooks: RecommendedBook[] = useMemo(
    () => [
      {
        id: 'rb-1',
        title: '어린 왕자',
        author: '생텍쥐페리',
        imageUri: littlePrinceUri,
      },
      {
        id: 'rb-2',
        title: '돈키호테',
        author: '세르반테스',
      },
    ],
    [littlePrinceUri],
  );

  const loadNews = useCallback(async () => {
    setLoadingNews(true);
    try {
      const [carouselResponse, listResponse] = await Promise.all([
        fetchNewsCarousel(5),
        fetchNewsList(),
      ]);

      const mappedList = listResponse.map((item, index) => toNewsItem(item, index, 'news'));
      const carouselSource = carouselResponse.length > 0
        ? carouselResponse
        : listResponse.slice(0, 5);
      const mappedPromotions = carouselSource.map((item, index) => toNewsItem(item, index, 'promo'));

      setItems(mappedList);
      setPromotions(mappedPromotions);
      setActiveSlide((prev) => Math.min(prev, Math.max(0, mappedPromotions.length - 1)));
    } catch (error) {
      setPromotions(fallbackPromotions);
      if (error instanceof ApiError) return;
      showToast('소식을 불러오지 못했습니다.');
    } finally {
      setLoadingNews(false);
    }
  }, []);

  useEffect(() => {
    void loadNews();
  }, [loadNews]);

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
          if (!(error instanceof ApiError)) {
            showToast('소식 상세를 불러오지 못했습니다.');
          }
        } finally {
          setLoadingDetail(false);
        }
      };
      void loadDetail();
    },
    [animateTransition, detailTranslateX],
  );

  const handleRefresh = () => {
    setRefreshing(true);
    const refresh = async () => {
      detailTranslateX.stopAnimation(() => {
        detailTranslateX.setValue(0);
      });
      setSelected(null);
      await loadNews();
      setRefreshing(false);
    };
    void refresh();
  };

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

  const isDetailBackSwipe = useCallback((gestureState: PanResponderGestureState) => {
    if (!selected) return false;
    return (
      gestureState.x0 <= DETAIL_BACK_EDGE_WIDTH
      && gestureState.dx > DETAIL_BACK_ACTIVATE_DISTANCE
      && Math.abs(gestureState.dy) < DETAIL_BACK_ACTIVATE_MAX_DY
    );
  }, [selected]);

  const detailBackSwipeResponder = useMemo(
    () =>
      PanResponder.create({
        onStartShouldSetPanResponder: () => false,
        onMoveShouldSetPanResponder: (_, gestureState) => isDetailBackSwipe(gestureState),
        onMoveShouldSetPanResponderCapture: (_, gestureState) => isDetailBackSwipe(gestureState),
        onPanResponderMove: (_, gestureState) => {
          detailTranslateX.setValue(Math.max(0, Math.min(gestureState.dx, width)));
        },
        onPanResponderRelease: (_, gestureState) => {
          const dragDistance = Math.max(0, gestureState.dx);
          const shouldClose =
            dragDistance >= DETAIL_BACK_TRIGGER_DISTANCE
            && Math.abs(gestureState.dy) <= DETAIL_BACK_TRIGGER_MAX_DY;
          if (shouldClose) {
            Animated.timing(detailTranslateX, {
              toValue: width,
              duration: 180,
              useNativeDriver: true,
            }).start(({ finished }) => {
              if (!finished) return;
              closeSelectedDetail();
            });
            return;
          }
          Animated.spring(detailTranslateX, {
            toValue: 0,
            speed: 22,
            bounciness: 0,
            useNativeDriver: true,
          }).start();
        },
        onPanResponderTerminate: () => {
          Animated.spring(detailTranslateX, {
            toValue: 0,
            speed: 22,
            bounciness: 0,
            useNativeDriver: true,
          }).start();
        },
      }),
    [closeSelectedDetail, detailTranslateX, isDetailBackSwipe, width],
  );

  const renderDetail = (item: NewsItem) => (
    <Animated.View
      style={[
        styles.detailSwipeContainer,
        { transform: [{ translateX: detailTranslateX }] },
      ]}
      {...detailBackSwipeResponder.panHandlers}
    >
      <ScrollView
        style={styles.container}
        contentContainerStyle={styles.detailContent}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={handleRefresh}
            tintColor={colors.primary1}
            colors={[colors.primary1]}
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
            <Image source={{ uri: item.cover }} style={styles.heroImage} />
          ) : (
            <View style={styles.heroImage} />
          )}
          <View style={styles.heroOverlay}>
            <Text style={styles.heroTitle}>{item.title}</Text>
          </View>
          <Text style={styles.heroDate}>{item.date}</Text>
        </View>

        <View style={styles.detailHeaderRow}>
          <Text style={styles.detailTitle}>{item.title}</Text>
          <Text style={styles.detailDate}>{item.date}</Text>
        </View>
        <Text style={styles.detailBody}>
          {loadingDetail ? '불러오는 중...' : item.body || item.excerpt}
        </Text>
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
          data={items}
          keyExtractor={(item) => item.id}
          ListHeaderComponent={
            <View style={styles.headerWrap}>
              <ScrollView
                horizontal
                pagingEnabled
                showsHorizontalScrollIndicator={false}
                snapToAlignment="center"
                onScroll={(event) => {
                  const index = Math.round(
                    event.nativeEvent.contentOffset.x / (width - spacing.xl * 2),
                  );
                  setActiveSlide(index);
                }}
                scrollEventThrottle={16}
                decelerationRate="fast"
                contentContainerStyle={styles.carousel}
              >
                {promotions.map((promo) => (
                  <Pressable key={promo.id} style={styles.promoWrapper} onPress={() => onSelect(promo)}>
                    <ImageBackground
                      source={promo.cover ? { uri: promo.cover } : undefined}
                      style={[styles.promoCard, { width: width - spacing.xl * 2 }]}
                    >
                      <View style={styles.promoGradient} />
                      <View style={styles.promoContent}>
                        <Text style={styles.promoTitle}>{promo.title}</Text>
                        <Text style={styles.promoDesc}>{promo.excerpt}</Text>
                      </View>
                    </ImageBackground>
                  </Pressable>
                ))}
              </ScrollView>
              <View style={styles.dots}>
                {promotions.map((promo, index) => (
                  <View
                    key={promo.id}
                    style={[
                      styles.dot,
                      index === activeSlide ? styles.dotActive : null,
                    ]}
                  />
                ))}
              </View>
              <View style={styles.recommendedSection}>
                <Text style={styles.recommendedTitle}>오늘의 추천 책</Text>
                <View style={styles.recommendedRow}>
                  {recommendedBooks.map((book) => (
                    <Pressable key={book.id} style={styles.recommendedCard}>
                      <ImageBackground
                        source={book.imageUri ? { uri: book.imageUri } : undefined}
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
                </View>
              </View>
              <Text style={styles.newsListTitle}>소식</Text>
            </View>
          }
          ListEmptyComponent={
            !loadingNews ? <Text style={styles.emptyNewsText}>등록된 소식이 없습니다.</Text> : null
          }
          renderItem={({ item }) => (
            <Pressable style={styles.card} onPress={() => onSelect(item)}>
              {item.cover ? (
                <Image source={{ uri: item.cover }} style={styles.cardThumb} />
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
              tintColor={colors.primary1}
              colors={[colors.primary1]}
            />
          }
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
  listContent: {
    padding: spacing.md,
    gap: spacing.sm,
    paddingBottom: spacing.xl * 2,
  },
  headerWrap: {
    marginBottom: spacing.md,
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
  },
  recommendedCard: {
    flex: 1,
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
    gap: spacing.xs / 2,
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
  dot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: colors.gray2,
  },
  dotActive: {
    backgroundColor: colors.primary1,
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
    gap: spacing.xs / 2,
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
    gap: spacing.xs / 2,
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
  heroOverlay: {
    position: 'absolute',
    top: spacing.lg,
    left: spacing.lg,
    right: spacing.lg,
  },
  heroTitle: {
    ...typography.headline2,
    color: colors.gray7,
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
    ...typography.body1_3,
    color: colors.gray6,
    lineHeight: 22,
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
