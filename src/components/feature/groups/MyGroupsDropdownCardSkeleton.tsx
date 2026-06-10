import React from 'react';
import { StyleSheet, View } from 'react-native';
import { SkeletonBox } from '../../common/SkeletonBox';
import { colors, radius, spacing } from '../../../theme';

export function MyGroupsDropdownCardSkeleton() {
  return (
    <View style={styles.card}>
      <SkeletonBox style={styles.row} />
      <SkeletonBox style={styles.row} />
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: colors.subbrown4,
    borderRadius: radius.md,
    padding: spacing.md,
    gap: spacing.xs,
  },
  row: {
    height: 40,
    borderRadius: radius.md,
  },
});
