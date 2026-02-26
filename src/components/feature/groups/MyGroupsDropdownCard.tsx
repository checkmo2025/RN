import { useEffect, useMemo, useState } from 'react';
import type { StyleProp, TextStyle, ViewStyle } from 'react-native';
import {
  LayoutAnimation,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  UIManager,
  View,
} from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';

import { colors, radius, spacing, typography } from '../../../theme';

export type MyGroupSummary = {
  id: string;
  name: string;
};

type Props<T extends MyGroupSummary> = {
  groups: T[];
  onPressGroup?: (group: T) => void;
  visibleCount?: number;
  containerStyle?: StyleProp<ViewStyle>;
  rowStyle?: StyleProp<ViewStyle>;
  rowTextStyle?: StyleProp<TextStyle>;
};

export function MyGroupsDropdownCard<T extends MyGroupSummary>({
  groups,
  onPressGroup,
  visibleCount = 3,
  containerStyle,
  rowStyle,
  rowTextStyle,
}: Props<T>) {
  const [expanded, setExpanded] = useState(false);

  useEffect(() => {
    if (Platform.OS === 'android' && UIManager.setLayoutAnimationEnabledExperimental) {
      UIManager.setLayoutAnimationEnabledExperimental(true);
    }
  }, []);

  const showToggle = groups.length > visibleCount;

  const visibleGroups = useMemo(
    () => (showToggle && !expanded ? groups.slice(0, visibleCount) : groups),
    [expanded, groups, showToggle, visibleCount],
  );

  return (
    <View style={[styles.card, containerStyle]}>
      {visibleGroups.map((group) => (
        <Pressable
          key={group.id}
          style={({ pressed }) => [styles.row, rowStyle, pressed && styles.pressed]}
          onPress={() => onPressGroup?.(group)}
        >
          <Text style={[styles.name, rowTextStyle]} numberOfLines={1}>
            {group.name}
          </Text>
        </Pressable>
      ))}

      {showToggle ? (
        <Pressable
          style={({ pressed }) => [styles.toggleButton, pressed && styles.pressed]}
          onPress={() => {
            LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
            setExpanded((prev) => !prev);
          }}
        >
          <Text style={styles.toggleText}>{expanded ? '접기' : '전체보기'}</Text>
          <MaterialIcons
            name={expanded ? 'expand-less' : 'expand-more'}
            size={18}
            color={colors.gray6}
          />
        </Pressable>
      ) : null}
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
    backgroundColor: colors.white,
    borderRadius: radius.md,
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.md,
  },
  name: {
    ...typography.body1_3,
    color: colors.gray6,
  },
  toggleButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.xs / 2,
    marginTop: spacing.xs,
  },
  toggleText: {
    ...typography.body2_2,
    color: colors.gray6,
  },
  pressed: {
    opacity: 0.7,
  },
});
