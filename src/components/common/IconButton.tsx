import { Pressable, StyleSheet, ViewStyle } from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';

import { colors, spacing } from '../../theme';

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
}: Props) {
  return (
    <Pressable
      onPress={onPress}
      hitSlop={hitSlop ?? undefined}
      disabled={disabled}
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
    paddingHorizontal: spacing.xs / 2,
    paddingVertical: spacing.xs / 2,
  },
  pressed: {
    opacity: 0.6,
  },
});
