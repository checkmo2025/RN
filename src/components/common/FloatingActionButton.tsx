import React from 'react';
import { Pressable, StyleSheet, View } from 'react-native';

import { colors, interactionOpacity, radius, spacing } from '../../theme';

type Props = {
  onPress: () => void;
  children: React.ReactNode;
  accessibilityLabel?: string;
};

export function FloatingActionButton({ onPress, children, accessibilityLabel }: Props) {
  return (
    <Pressable
      style={({ pressed }) => [styles.fab, pressed ? styles.pressed : null]}
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel}
    >
      <View pointerEvents="none">{children}</View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  fab: {
    position: 'absolute',
    right: spacing.xl,
    bottom: spacing.xl,
    width: 48,
    height: 48,
    borderRadius: radius.pill,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.primary1,
  },
  pressed: {
    opacity: interactionOpacity.pressedStrong,
  },
});
