import React from 'react';
import { StyleSheet, View } from 'react-native';
import { SkeletonBox } from '../../common/SkeletonBox';
import { radius, spacing } from '../../../theme';

type Props = {
  horizontalInset: number;
};

export function NewsPromotionCarouselSkeleton({ horizontalInset }: Props) {
  return (
    <View>
      <View style={[styles.carousel, { paddingHorizontal: horizontalInset }]}>
        <SkeletonBox style={styles.card} />
      </View>
      <View style={[styles.dots, { paddingHorizontal: horizontalInset }]}>
        <SkeletonBox style={styles.dotActive} />
        <SkeletonBox style={styles.dot} />
        <SkeletonBox style={styles.dot} />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  carousel: {
    paddingVertical: spacing.xs,
  },
  card: {
    width: '100%',
    aspectRatio: 16 / 10,
    borderRadius: radius.md,
  },
  dots: {
    flexDirection: 'row',
    gap: spacing.xs,
    alignItems: 'center',
  },
  dotActive: {
    width: 16,
    height: 8,
    borderRadius: radius.sm,
  },
  dot: {
    width: 8,
    height: 8,
    borderRadius: radius.xs,
  },
});
