import { colors } from './colors';
import { radius } from './radius';
import { spacing } from './spacing';
import { typography } from './typography';

export const inputStyles = {
  // 단일 행 입력 (TextInput 기본)
  base: {
    height: 56,
    borderWidth: 1,
    borderColor: colors.gray2,
    borderRadius: radius.md,
    paddingHorizontal: spacing.md,
    backgroundColor: colors.white,
    ...typography.body1_3,
    color: colors.gray6,
  },

  // 여러 줄 입력 (multiline TextInput)
  multiline: {
    minHeight: 88,
    borderWidth: 1,
    borderColor: colors.gray2,
    borderRadius: radius.md,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    backgroundColor: colors.white,
    ...typography.body1_3,
    color: colors.gray6,
    textAlignVertical: 'top' as const,
  },

  placeholderColor: colors.gray3,
} as const;
