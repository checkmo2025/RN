import { Pressable, StyleSheet, Text, ViewStyle } from 'react-native';

import { colors, radius, spacing, typography } from '../../theme';

type ButtonVariant = 'primary' | 'secondary' | 'outline' | 'danger';
type ButtonSize = 'lg' | 'md';

type Props = {
  label: string;
  onPress?: () => void;
  disabled?: boolean;
  loading?: boolean;
  loadingLabel?: string;
  variant?: ButtonVariant;
  size?: ButtonSize;
  fullWidth?: boolean;
  style?: ViewStyle;
};

export function AppButton({
  label,
  onPress,
  disabled,
  loading,
  loadingLabel,
  variant = 'primary',
  size = 'md',
  fullWidth,
  style,
}: Props) {
  const isDisabled = disabled || loading;

  return (
    <Pressable
      onPress={onPress}
      disabled={isDisabled}
      style={({ pressed }) => [
        styles.base,
        size === 'lg' ? styles.sizeLg : styles.sizeMd,
        fullWidth ? styles.fullWidth : null,
        variant === 'primary' ? styles.primary : null,
        variant === 'primary' && isDisabled ? styles.primaryDisabled : null,
        variant === 'secondary' ? styles.secondary : null,
        variant === 'secondary' && isDisabled ? styles.secondaryDisabled : null,
        variant === 'outline' ? styles.outline : null,
        variant === 'outline' && isDisabled ? styles.outlineDisabled : null,
        variant === 'danger' ? styles.danger : null,
        variant === 'danger' && isDisabled ? styles.dangerDisabled : null,
        pressed && !isDisabled ? styles.pressed : null,
        style ?? null,
      ]}
    >
      <Text
        style={[
          styles.baseText,
          variant === 'primary' ? styles.primaryText : null,
          variant === 'secondary' ? styles.secondaryText : null,
          variant === 'outline' ? styles.outlineText : null,
          variant === 'danger' ? styles.dangerText : null,
        ]}
      >
        {loading && loadingLabel ? loadingLabel : label}
      </Text>
    </Pressable>
  );
}

export function PrimaryButton({
  label,
  onPress,
  disabled,
  style,
}: {
  label: string;
  onPress?: () => void;
  disabled?: boolean;
  style?: ViewStyle;
}) {
  return <AppButton label={label} onPress={onPress} disabled={disabled} style={style} />;
}

export function SecondaryButton({
  label,
  onPress,
  disabled,
  style,
}: {
  label: string;
  onPress?: () => void;
  disabled?: boolean;
  style?: ViewStyle;
}) {
  return <AppButton variant="secondary" label={label} onPress={onPress} disabled={disabled} style={style} />;
}

const styles = StyleSheet.create({
  base: {
    borderRadius: radius.md,
    paddingHorizontal: spacing.md,
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
  },
  sizeLg: {
    height: 52,
  },
  sizeMd: {
    paddingVertical: spacing.sm + 2,
  },
  fullWidth: {
    flex: 1,
  },
  // primary
  primary: {
    backgroundColor: colors.primary1,
  },
  primaryDisabled: {
    backgroundColor: colors.gray2,
  },
  // secondary
  secondary: {
    borderWidth: 1,
    borderColor: colors.gray2,
    backgroundColor: colors.white,
  },
  secondaryDisabled: {
    opacity: 0.5,
  },
  // outline
  outline: {
    borderWidth: 1,
    borderColor: colors.primary1,
    backgroundColor: colors.white,
  },
  outlineDisabled: {
    borderColor: colors.gray2,
  },
  // danger
  danger: {
    backgroundColor: colors.likeRed,
  },
  dangerDisabled: {
    opacity: 0.5,
  },
  pressed: {
    opacity: 0.8,
  },
  // text
  baseText: {
    ...typography.body1_2,
  },
  primaryText: {
    color: colors.white,
  },
  secondaryText: {
    color: colors.gray6,
  },
  outlineText: {
    color: colors.primary1,
  },
  dangerText: {
    color: colors.white,
  },
});
