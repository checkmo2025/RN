import React from 'react';
import { Pressable, StyleSheet, View } from 'react-native';

import { colors, radius, spacing } from '../../theme';

type Props = {
  onPress: () => void;
  children: React.ReactNode;
};

export function FloatingActionButton({ onPress, children }: Props) {
  return (
    <Pressable
      style={({ pressed }) => [styles.fab, pressed ? styles.pressed : null]}
      onPress={onPress}
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
    opacity: 0.8,
  },
});
