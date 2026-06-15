import type { ComponentProps } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';

import { colors, interactionOpacity, spacing, typography } from '../../theme';
import { BottomSheet } from './BottomSheet';
import { FeedbackPressable as Pressable } from './FeedbackPressable';

type MaterialIconName = ComponentProps<typeof MaterialIcons>['name'];

export type BottomSheetActionMenuItem = {
  key?: string;
  label: string;
  icon?: MaterialIconName;
  onPress: () => void;
  destructive?: boolean;
  disabled?: boolean;
};

type BottomSheetActionMenuProps = {
  visible: boolean;
  title: string;
  actions: BottomSheetActionMenuItem[];
  onClose: () => void;
};

export function BottomSheetActionMenu({
  visible,
  title,
  actions,
  onClose,
}: BottomSheetActionMenuProps) {
  const normalizedActions = actions.filter((action) => action.label.trim().length > 0);

  return (
    <BottomSheet visible={visible} onClose={onClose}>
      <Text style={styles.title}>{title}</Text>
      <View style={styles.list}>
        {normalizedActions.map((action, index) => {
          const iconColor = action.disabled
            ? colors.gray3
            : action.destructive
              ? colors.likeRed
              : colors.gray5;
          return (
            <Pressable
              key={action.key ?? `${action.label}-${index}`}
              style={({ pressed }) => [
                styles.item,
                index < normalizedActions.length - 1 && styles.itemBorder,
                action.disabled && styles.itemDisabled,
                pressed && !action.disabled && styles.itemPressed,
              ]}
              disabled={action.disabled}
              onPress={() => {
                onClose();
                requestAnimationFrame(action.onPress);
              }}
            >
              {action.icon ? (
                <MaterialIcons name={action.icon} size={20} color={iconColor} />
              ) : (
                <View style={styles.iconPlaceholder} />
              )}
              <Text
                style={[
                  styles.itemText,
                  action.destructive && styles.itemTextDanger,
                  action.disabled && styles.itemTextDisabled,
                ]}
              >
                {action.label}
              </Text>
            </Pressable>
          );
        })}
      </View>
    </BottomSheet>
  );
}

const styles = StyleSheet.create({
  title: {
    ...typography.subhead4_1,
    color: colors.gray6,
    marginBottom: spacing.xs,
  },
  list: {
    gap: 0,
  },
  item: {
    minHeight: 48,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    paddingVertical: spacing.sm,
  },
  itemBorder: {
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.gray2,
  },
  itemPressed: {
    opacity: interactionOpacity.pressed,
  },
  itemDisabled: {
    opacity: interactionOpacity.disabled,
  },
  iconPlaceholder: {
    width: 20,
    height: 20,
  },
  itemText: {
    ...typography.body1_3,
    color: colors.gray6,
  },
  itemTextDanger: {
    color: colors.likeRed,
  },
  itemTextDisabled: {
    color: colors.gray3,
  },
});
