import { Modal, StyleSheet, Text, View } from 'react-native';

import { colors, radius, spacing, typography } from '../../theme';
import { FeedbackPressable as Pressable } from './FeedbackPressable';

export type ActionMenuAnchor = {
  pageX: number;
  pageY: number;
};

export type ActionMenuItem = {
  key?: string;
  label: string;
  onPress: () => void;
  destructive?: boolean;
  disabled?: boolean;
};

type ActionMenuProps = {
  visible: boolean;
  anchor: ActionMenuAnchor | null;
  items: ActionMenuItem[];
  onClose: () => void;
  screenWidth: number;
  screenHeight: number;
  menuWidth?: number;
  sideMargin?: number;
  verticalOffset?: number;
  topBoundary?: number;
  rowHeight?: number;
};

function getMenuPosition(
  anchor: ActionMenuAnchor,
  screenWidth: number,
  screenHeight: number,
  menuWidth: number,
  menuHeight: number,
  sideMargin: number,
  topBoundary: number,
  verticalOffset: number,
) {
  const maxLeft = Math.max(sideMargin, screenWidth - menuWidth - sideMargin);
  const left = Math.min(maxLeft, Math.max(sideMargin, anchor.pageX - menuWidth + 18));

  const maxTop = Math.max(sideMargin, screenHeight - menuHeight - sideMargin);
  const preferredTop = anchor.pageY - menuHeight - verticalOffset;
  const fallbackTop = anchor.pageY + verticalOffset;
  const top =
    preferredTop < topBoundary
      ? Math.min(maxTop, fallbackTop)
      : Math.min(maxTop, preferredTop);

  return { left, top };
}

export function ActionMenu({
  visible,
  anchor,
  items,
  onClose,
  screenWidth,
  screenHeight,
  menuWidth = 132,
  sideMargin = spacing.sm,
  verticalOffset = 8,
  topBoundary = 96,
  rowHeight = 40,
}: ActionMenuProps) {
  const normalizedItems = items.filter((item) => item.label.trim().length > 0);
  const menuHeight =
    normalizedItems.length * rowHeight + Math.max(0, normalizedItems.length - 1) * StyleSheet.hairlineWidth;
  const position =
    anchor && normalizedItems.length > 0
      ? getMenuPosition(
          anchor,
          screenWidth,
          screenHeight,
          menuWidth,
          menuHeight,
          sideMargin,
          topBoundary,
          verticalOffset,
        )
      : null;

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <Pressable style={styles.backdrop} onPress={onClose} disableFeedback>
        {position ? (
          <Pressable
            style={[styles.menu, { width: menuWidth, left: position.left, top: position.top }]}
            onPress={(event) => event.stopPropagation()}
            disableFeedback
          >
            {normalizedItems.map((item, index) => (
              <View key={item.key ?? `${item.label}-${index}`}>
                <Pressable
                  style={[styles.item, item.disabled && styles.itemDisabled]}
                  disabled={item.disabled}
                  onPress={() => {
                    onClose();
                    item.onPress();
                  }}
                >
                  <Text
                    style={[
                      styles.itemText,
                      item.destructive && styles.itemTextDanger,
                      item.disabled && styles.itemTextDisabled,
                    ]}
                  >
                    {item.label}
                  </Text>
                </Pressable>
                {index < normalizedItems.length - 1 ? <View style={styles.divider} /> : null}
              </View>
            ))}
          </Pressable>
        ) : null}
      </Pressable>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: 'transparent',
  },
  menu: {
    position: 'absolute',
    backgroundColor: colors.white,
    borderRadius: radius.sm,
    borderWidth: 1,
    borderColor: colors.gray2,
    overflow: 'hidden',
    shadowColor: colors.black,
    shadowOpacity: 0.08,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 2 },
    elevation: 6,
  },
  item: {
    minHeight: 40,
    paddingVertical: spacing.xs + 2,
    paddingHorizontal: spacing.md,
    justifyContent: 'center',
  },
  itemDisabled: {
    opacity: 0.45,
  },
  divider: {
    height: StyleSheet.hairlineWidth,
    backgroundColor: colors.gray2,
  },
  itemText: {
    ...typography.body2_2,
    color: colors.gray6,
  },
  itemTextDanger: {
    color: colors.likeRed,
  },
  itemTextDisabled: {
    color: colors.gray3,
  },
});
