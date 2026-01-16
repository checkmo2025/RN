import { useMemo, useState, useCallback } from 'react';
import {
  FlatList,
  LayoutAnimation,
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

type NewsItem = {
  id: string;
  title: string;
  excerpt: string;
  date: string;
  cover?: string;
  body: string;
};

export function NewsScreen() {
  if (Platform.OS === 'android' && UIManager.setLayoutAnimationEnabledExperimental) {
    UIManager.setLayoutAnimationEnabledExperimental(true);
  }

  const { width } = useWindowDimensions();
  const [selected, setSelected] = useState<NewsItem | null>(null);
  const [refreshing, setRefreshing] = useState(false);
  const [activeSlide, setActiveSlide] = useState(0);

  const promotions: NewsItem[] = useMemo(
    () =>
      [
        {
          id: 'p1',
          title: '봄메이트',
          excerpt: '5월 책 추천\n나의 돈키호테\n할인된 가격에\n만나보세요!',
          date: '2025-05-01',
          body: '배너 본문입니다.',
        },
        {
          id: 'p2',
          title: '신간 소식',
          excerpt: '새로운 이야기와 큐레이션을 매주 만나보세요.',
          date: '2025-05-08',
          body: '본문',
        },
        {
          id: 'p3',
          title: '이벤트',
          excerpt: '책모 구독자 전용 굿즈 증정 이벤트',
          date: '2025-05-15',
          body: '본문',
        },
      ].slice(0, 5),
    [],
  );

  const items: NewsItem[] = useMemo(
    () =>
      Array.from({ length: 8 }).map((_, idx) => ({
        id: `news-${idx + 1}`,
        title: '책 읽는 한강공원',
        excerpt:
          '소식내용소식내용소식내용소식내용소식내용소식내용소식내용소식내용소식내용소식내용소식내용소식내용',
        date: '2025-10-09',
        body:
          '🎉✨ 책읽는 한강공원이 📚\n\n25년 하반기에 다시 돌아옵니다! 🎶🦩🕺\n반짝이는 강물과 따스한 햇살 아래, 특별한 프로그램들이 여러분을 기다립니다.\n\n자연 속에서 즐기는 여유, 모두가 함께 만드는 즐거움, 그리고 한강에서만 느낄 수 있는 특별한 순간까지!',
      })),
    [],
  );

  const onSelect = (item: NewsItem) => {
    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
    setSelected(item);
  };

  const handleRefresh = () => {
    setRefreshing(true);
    setTimeout(() => {
      setSelected(null);
      setRefreshing(false);
    }, 600);
  };

  useFocusEffect(
    useCallback(() => {
      return () => {
        setSelected(null);
      };
    }, []),
  );

  const renderDetail = (item: NewsItem) => (
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
      <Pressable style={styles.breadcrumb} onPress={() => setSelected(null)}>
        <Text style={styles.breadcrumbText}>소식</Text>
        <Text style={styles.breadcrumbSep}>›</Text>
        <Text style={[styles.breadcrumbText, styles.breadcrumbActive]}>상세보기</Text>
      </Pressable>

      <View style={styles.hero}>
        <View style={styles.heroImage} />
        <View style={styles.heroOverlay}>
          <Text style={styles.heroTitle}>{item.title}</Text>
        </View>
        <Text style={styles.heroDate}>{item.date}</Text>
      </View>

      <View style={styles.detailHeaderRow}>
        <Text style={styles.detailTitle}>{item.title}</Text>
        <Text style={styles.detailDate}>{item.date}</Text>
      </View>
      <Text style={styles.detailBody}>{item.body}</Text>
    </ScrollView>
  );

  if (selected) {
    return renderDetail(selected);
  }

  return (
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
                <View key={promo.id} style={styles.promoWrapper}>
                  <View style={[styles.promoCard, { width: width - spacing.xl * 2 }]}>
                    <View style={styles.promoGradient} />
                    <View style={styles.promoContent}>
                      <Text style={styles.promoTitle}>{promo.title}</Text>
                      <Text style={styles.promoDesc}>{promo.excerpt}</Text>
                    </View>
                  </View>
                </View>
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
          </View>
        }
        renderItem={({ item }) => (
          <Pressable style={styles.card} onPress={() => onSelect(item)}>
            <View style={styles.cardThumb} />
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
      <Pressable
        style={({ pressed }) => [styles.fab, pressed && { opacity: 0.85 }]}
        onPress={() => Linking.openURL('https://forms.gle/vb6un6ji6WwTCZ9w5').catch(() => null)}
      >
        <Text style={styles.fabIcon}>✎</Text>
      </Pressable>
    </View>
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
  dot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: colors.gray2,
  },
  dotActive: {
    backgroundColor: colors.primary1,
  },
  fab: {
    position: 'absolute',
    right: spacing.lg,
    bottom: spacing.xl * 1.5,
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: colors.primary2,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOpacity: 0.16,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 4 },
    elevation: 5,
  },
  fabIcon: {
    ...typography.subhead3,
    color: colors.white,
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
});
