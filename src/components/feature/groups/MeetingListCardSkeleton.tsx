import React from 'react';
import { StyleSheet, View } from 'react-native';
import { SkeletonBox } from '../../common/SkeletonBox';
import { colors, radius, spacing } from '../../../theme';

export function MeetingListCardSkeleton() {
  return (
    <View style={styles.card}>
      <View style={styles.header}>
        <SkeletonBox style={styles.title} />
      </View>

      <View style={styles.tagRow}>
        <SkeletonBox style={styles.tag} />
        <SkeletonBox style={styles.tagShort} />
        <SkeletonBox style={styles.tag} />
      </View>

      <View style={styles.infoRow}>
        <SkeletonBox style={styles.thumb} />
        <View style={styles.metaWrap}>
          <SkeletonBox style={styles.metaLine} />
          <SkeletonBox style={styles.metaLineShort} />
        </View>
      </View>

      <View style={styles.actions}>
        <SkeletonBox style={styles.button} />
        <SkeletonBox style={styles.button} />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    minHeight: 216,
    backgroundColor: colors.white,
    borderWidth: 2,
    borderColor: colors.subbrown4,
    borderRadius: radius.md,
    paddingTop: 13,
    paddingBottom: 13,
    paddingHorizontal: 14,
    gap: spacing.xs,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'flex-start',
  },
  title: {
    height: 18,
    width: '60%',
    borderRadius: radius.xs,
  },
  tagRow: {
    flexDirection: 'row',
    gap: 6,
  },
  tag: {
    height: 22,
    width: 52,
    borderRadius: radius.xs,
  },
  tagShort: {
    height: 22,
    width: 44,
    borderRadius: radius.xs,
  },
  infoRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: spacing.xs,
  },
  thumb: {
    width: 74,
    height: 74,
    borderRadius: radius.xs,
  },
  metaWrap: {
    flex: 1,
    gap: 6,
    paddingTop: 4,
  },
  metaLine: {
    height: 14,
    width: '80%',
    borderRadius: radius.xs,
  },
  metaLineShort: {
    height: 14,
    width: '55%',
    borderRadius: radius.xs,
  },
  actions: {
    flexDirection: 'row',
    gap: 6,
    marginTop: 'auto',
  },
  button: {
    flex: 1,
    height: 36,
    borderRadius: radius.md,
  },
});
