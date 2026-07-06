import React from 'react';
import { StyleSheet, View } from 'react-native';
import { SkeletonBox } from '../../common/SkeletonBox';
import { colors, radius, spacing } from '../../../theme';

export function NewsCardSkeleton() {
  return (
    <View style={styles.card}>
      <View style={styles.mediaColumn}>
        <SkeletonBox style={styles.thumb} />
        <SkeletonBox style={styles.dateLine} />
      </View>
      <View style={styles.body}>
        <SkeletonBox style={styles.titleLine} />
        <SkeletonBox style={styles.excerptLine} />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    backgroundColor: colors.white,
    borderRadius: radius.md,
    padding: spacing.md,
    gap: spacing.md,
    borderWidth: 1,
    borderColor: colors.subbrown4,
  },
  mediaColumn: {
    width: 80,
    gap: spacing.xs,
    alignItems: 'center',
    flexShrink: 0,
  },
  thumb: {
    width: 80,
    height: 80,
    borderRadius: radius.sm,
  },
  body: {
    flex: 1,
    gap: spacing.xs,
    paddingTop: spacing.xxs,
  },
  titleLine: {
    width: '80%',
    height: 16,
  },
  excerptLine: {
    width: '60%',
    height: 12,
  },
  dateLine: {
    width: 64,
    height: 12,
  },
});
