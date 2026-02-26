import React from 'react';
import {
  ImageBackground,
  NativeScrollEvent,
  NativeSyntheticEvent,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';

import { colors, radius, spacing, typography } from '../../../theme';

export type Promotion = {
  id: string;
  title: string;
  description: string;
  imageUri: string;
};

type Props = {
  promotions: Promotion[];
  horizontalInset: number;
  promotionWidth: number;
  promotionStep: number;
  activeSlide: number;
  onScroll: (event: NativeSyntheticEvent<NativeScrollEvent>) => void;
};

export default function HomePromotions({
  promotions,
  horizontalInset,
  promotionWidth,
  promotionStep,
  activeSlide,
  onScroll,
}: Props) {
  return (
    <>
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        snapToInterval={promotionStep}
        disableIntervalMomentum
        onScroll={onScroll}
        scrollEventThrottle={16}
        decelerationRate="fast"
        contentContainerStyle={[styles.carousel, { paddingHorizontal: horizontalInset }]}
      >
        {promotions.map((promo) => (
          <View key={promo.id} style={[styles.promoWrapper, { width: promotionWidth }]}>
            <ImageBackground
              source={{ uri: promo.imageUri }}
              style={[styles.promoCard, { width: '100%' }]}
              imageStyle={styles.promoImage}
              accessible
              accessibilityLabel={`${promo.title} 프로모션`}
            >
              <View style={styles.promoGradient} />
              <View style={styles.promoContent}>
                <Text style={styles.promoTitle}>{promo.title}</Text>
                <Text style={styles.promoDesc}>{promo.description}</Text>
              </View>
            </ImageBackground>
          </View>
        ))}
      </ScrollView>

      <View style={[styles.dots, { paddingHorizontal: horizontalInset }]}>
        {promotions.map((promo, index) => {
          const isActive = index === activeSlide;
          return (
            <View
              key={promo.id}
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
