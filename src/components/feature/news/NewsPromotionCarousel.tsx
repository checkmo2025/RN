import { useEffect, useMemo, useRef, useState } from 'react';
import {
  ImageBackground,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
  useWindowDimensions,
} from 'react-native';

import { colors, radius, spacing, typography } from '../../../theme';

export type NewsPromotionCarouselItem = {
  id: string;
  title: string;
  description: string;
  imageUri?: string;
};

type Props = {
  items: NewsPromotionCarouselItem[];
  horizontalInset: number;
  onPressItem?: (index: number) => void;
  autoPlayIntervalMs?: number;
};

export function NewsPromotionCarousel({
  items,
  horizontalInset,
  onPressItem,
  autoPlayIntervalMs = 5000,
}: Props) {
  const { width } = useWindowDimensions();
  const promotionWidth = Math.max(260, width - horizontalInset * 2);
  const promotionStep = promotionWidth + spacing.sm;
  const [activeSlide, setActiveSlide] = useState(0);
  const carouselRef = useRef<ScrollView | null>(null);
  const snapOffsets = useMemo(
    () =>
      items.map((_, index) =>
        index === 0 ? 0 : horizontalInset + promotionStep * index,
      ),
    [horizontalInset, items, promotionStep],
  );

  useEffect(() => {
    setActiveSlide((prev) => Math.min(prev, Math.max(0, items.length - 1)));
  }, [items.length]);

  useEffect(() => {
    if (items.length <= 1) return;

    const intervalId = setInterval(() => {
      setActiveSlide((prev) => {
        const next = prev >= items.length - 1 ? 0 : prev + 1;
        const nextOffset = snapOffsets[next] ?? 0;
        carouselRef.current?.scrollTo({
          x: nextOffset,
          animated: true,
        });
        return next;
      });
    }, autoPlayIntervalMs);

    return () => {
      clearInterval(intervalId);
    };
  }, [autoPlayIntervalMs, items.length, snapOffsets]);

  return (
    <>
      <ScrollView
        ref={carouselRef}
        horizontal
        showsHorizontalScrollIndicator={false}
        snapToOffsets={snapOffsets}
        disableIntervalMomentum
        onScroll={(event) => {
          const offsetX = event.nativeEvent.contentOffset.x;
          let nearestIndex = 0;
          let minDiff = Number.POSITIVE_INFINITY;

          snapOffsets.forEach((offset, index) => {
            const diff = Math.abs(offsetX - offset);
            if (diff < minDiff) {
              minDiff = diff;
              nearestIndex = index;
            }
          });

          if (nearestIndex !== activeSlide) {
            setActiveSlide(nearestIndex);
          }
        }}
        scrollEventThrottle={16}
        decelerationRate="fast"
        contentContainerStyle={[styles.carousel, { paddingHorizontal: horizontalInset }]}
      >
        {items.map((item, index) => (
          <Pressable
            key={item.id}
            style={[styles.promoWrapper, { width: promotionWidth }]}
            onPress={() => onPressItem?.(index)}
            disabled={!onPressItem}
          >
            <ImageBackground
              source={item.imageUri ? { uri: item.imageUri } : undefined}
              style={styles.promoCard}
              imageStyle={styles.promoImage}
              accessible
              accessibilityLabel={`${item.title} 프로모션`}
            >
              <View style={styles.promoGradient} />
              <View style={styles.promoContent}>
                <Text style={styles.promoTitle}>{item.title}</Text>
                <Text style={styles.promoDesc}>{item.description}</Text>
              </View>
            </ImageBackground>
          </Pressable>
        ))}
      </ScrollView>

      <View style={[styles.dots, { paddingHorizontal: horizontalInset }]}>
        {items.map((item, index) => {
          const isActive = index === activeSlide;
          return (
            <View
              key={item.id}
              style={[
                styles.dot,
                isActive ? styles.dotActive : null,
                isActive ? styles.dotActiveSize : null,
              ]}
            />
          );
        })}
      </View>
    </>
  );
}

const styles = StyleSheet.create({
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
  promoImage: {
    borderRadius: radius.md,
  },
  promoGradient: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(41, 31, 26, 0.32)',
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
    alignItems: 'center',
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
  dotActiveSize: {
    width: 16,
    borderRadius: 8,
  },
});
