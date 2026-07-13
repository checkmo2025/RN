import React from 'react';
import { StyleSheet, View, type StyleProp, type ViewStyle } from 'react-native';
import { SkeletonBox } from '../../common/SkeletonBox';
import { colors, radius, spacing } from '../../../theme';

type Props = {
  style?: StyleProp<ViewStyle>;
};

export function BookStoryFeedCardSkeleton({ style }: Props = {}) {
  return (
    <View style={[styles.card, style]}>
      <View style={styles.headerRow}>
        <SkeletonBox style={styles.avatar} />
        <View style={styles.meta}>
          <SkeletonBox style={styles.authorLine} />
          <SkeletonBox style={styles.subtitleLine} />
        </View>
        <SkeletonBox style={styles.chip} />
      </View>

      <SkeletonBox style={styles.cover} />

      <View style={styles.body}>
        <SkeletonBox style={styles.titleLine} />
        <SkeletonBox style={styles.contentLine1} />
        <SkeletonBox style={styles.contentLine2} />
        <SkeletonBox style={styles.contentLine3} />
      </View>

      <View style={styles.footer}>
        <SkeletonBox style={styles.footerAction} />
        <SkeletonBox style={styles.footerAction} />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: colors.white,
    borderRadius: radius.md,
    borderWidth: 2,
    borderColor: colors.subbrown4,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    gap: spacing.sm,
    marginHorizontal: 18,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  avatar: {
    width: 32,
    height: 32,
    borderRadius: 16,
  },
  meta: {
    flex: 1,
    gap: spacing.xxs,
  },
  authorLine: {
    width: 80,
    height: 14,
  },
  subtitleLine: {
    width: 120,
    height: 10,
  },
  chip: {
    width: 52,
    height: 26,
    borderRadius: 6,
  },
  cover: {
    width: '100%',
    height: 168,
    borderRadius: radius.sm,
  },
  body: {
    gap: spacing.xs,
  },
  titleLine: {
    width: '70%',
    height: 16,
  },
  contentLine1: {
    width: '100%',
    height: 12,
  },
  contentLine2: {
    width: '90%',
    height: 12,
  },
  contentLine3: {
    width: '60%',
    height: 12,
  },
  footer: {
    marginTop: 'auto',
    flexDirection: 'row',
    gap: spacing.sm,
    borderTopWidth: 1,
    borderTopColor: colors.subbrown4,
    paddingTop: spacing.sm,
  },
  footerAction: {
    flex: 1,
    height: 20,
  },
});
