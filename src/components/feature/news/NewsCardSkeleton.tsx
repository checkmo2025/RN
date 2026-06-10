import React from 'react';
import { StyleSheet, View } from 'react-native';
import { SkeletonBox } from '../../common/SkeletonBox';
import { colors, radius, spacing } from '../../../theme';

export function NewsCardSkeleton() {
  return (
    <View style={styles.card}>
      <SkeletonBox style={styles.thumb} />
      <View style={styles.body}>
        <SkeletonBox style={styles.titleLine} />
        <SkeletonBox style={styles.excerptLine} />
      </View>
      <SkeletonBox style={styles.dateLine} />
    </View>
  );
}

const styles = StyleSheet.create({
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
  thumb: {
    width: 60,
    height: 80,
    borderRadius: radius.sm,
  },
  body: {
    flex: 1,
    gap: spacing.xs,
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
    width: 44,
    height: 12,
  },
});
