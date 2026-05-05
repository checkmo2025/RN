import { Pressable, StyleSheet, ViewStyle } from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';

import { colors, interactionOpacity, spacing } from '../../theme';

export type IconName = React.ComponentProps<typeof MaterialIcons>['name'];

type Props = {
  name: IconName;
  color?: string;
  size?: number;
  onPress?: () => void;
  style?: ViewStyle;
  hitSlop?: number | null;
  disabled?: boolean;
  renderIcon?: React.ReactNode;
  accessibilityLabel?: string;
};

export function IconButton({
  name,
  color = colors.white,
  size = 24,
  onPress,
  style,
  hitSlop = 8,
  disabled,
  renderIcon,
  accessibilityLabel,
}: Props) {
  return (
    <Pressable
      onPress={onPress}
      hitSlop={hitSlop ?? undefined}
      disabled={disabled}
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel}
      style={({ pressed }) => [
        styles.button,
        style,
        pressed && !disabled ? styles.pressed : null,
      ]}
    >
      {renderIcon ?? <MaterialIcons name={name} size={size} color={color} />}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  button: {
    paddingHorizontal: spacing.xxs,
    paddingVertical: spacing.xxs,
  },
  pressed: {
    opacity: interactionOpacity.pressed,
  },
});
