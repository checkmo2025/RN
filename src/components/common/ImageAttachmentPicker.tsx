import { ActivityIndicator, Image, ScrollView, StyleSheet, Text, View } from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';

import { FeedbackPressable as Pressable } from './FeedbackPressable';
import { useLanguage } from '../../contexts/LanguageContext';
import type { ImageAttachmentsController } from '../../hooks/useImageAttachments';
import { colors, radius, spacing, typography } from '../../theme';

type Props = {
  controller: ImageAttachmentsController;
  compact?: boolean;
  disabled?: boolean;
};

export function ImageAttachmentPicker({ controller, compact = false, disabled = false }: Props) {
  const { l } = useLanguage();
  const blocked = disabled || controller.isUploading;
  const atLimit = controller.items.length >= controller.maxCount;

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Pressable
          style={[styles.addButton, (blocked || atLimit) && styles.disabled]}
          onPress={() => void controller.pickFromLibrary()}
          disabled={blocked || atLimit}
          accessibilityRole="button"
          accessibilityLabel={l('이미지 첨부')}
        >
          {controller.isUploading ? (
            <ActivityIndicator size="small" color={colors.primary1} />
          ) : (
            <MaterialIcons name="add-photo-alternate" size={19} color={colors.primary1} />
          )}
          <Text style={styles.addButtonText}>
            {controller.isUploading ? l('업로드 중...') : l('이미지 첨부')}
          </Text>
        </Pressable>
        <Text style={styles.counter}>
          {controller.items.length}/{controller.maxCount}
        </Text>
      </View>

      {controller.items.length > 0 ? (
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.list}
          keyboardShouldPersistTaps="handled"
        >
          {controller.items.map((item, index) => (
            <View
              key={item.id}
              style={[styles.item, compact ? styles.itemCompact : styles.itemRegular]}
            >
              <Image source={{ uri: item.previewUri }} style={styles.image} resizeMode="cover" />
              <Pressable
                style={styles.removeButton}
                onPress={() => controller.remove(item.id)}
                disabled={blocked}
                accessibilityRole="button"
                accessibilityLabel={l('첨부 이미지 {index} 삭제', { index: index + 1 })}
              >
                <MaterialIcons name="close" size={15} color={colors.white} />
              </Pressable>
              {controller.items.length > 1 ? (
                <View style={styles.moveRow}>
                  <Pressable
                    style={[styles.moveButton, index === 0 && styles.moveButtonDisabled]}
                    onPress={() => controller.move(item.id, -1)}
                    disabled={blocked || index === 0}
                    accessibilityRole="button"
                    accessibilityLabel={l('이미지 순서를 앞으로 이동')}
                  >
                    <MaterialIcons name="chevron-left" size={18} color={colors.white} />
                  </Pressable>
                  <Pressable
                    style={[
                      styles.moveButton,
                      index === controller.items.length - 1 && styles.moveButtonDisabled,
                    ]}
                    onPress={() => controller.move(item.id, 1)}
                    disabled={blocked || index === controller.items.length - 1}
                    accessibilityRole="button"
                    accessibilityLabel={l('이미지 순서를 뒤로 이동')}
                  >
                    <MaterialIcons name="chevron-right" size={18} color={colors.white} />
                  </Pressable>
                </View>
              ) : null}
            </View>
          ))}
        </ScrollView>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    gap: spacing.sm,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: spacing.sm,
  },
  addButton: {
    minHeight: 38,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
    borderWidth: 1,
    borderColor: colors.subbrown4,
    borderRadius: radius.sm,
    backgroundColor: colors.white,
  },
  disabled: {
    opacity: 0.5,
  },
  addButtonText: {
    ...typography.body2_2,
    color: colors.primary1,
  },
  counter: {
    ...typography.body2_3,
    color: colors.gray4,
  },
  list: {
    gap: spacing.sm,
  },
  item: {
    overflow: 'hidden',
    borderRadius: radius.sm,
    backgroundColor: colors.gray1,
  },
  itemCompact: {
    width: 76,
    height: 76,
  },
  itemRegular: {
    width: 108,
    height: 108,
  },
  image: {
    width: '100%',
    height: '100%',
  },
  removeButton: {
    position: 'absolute',
    top: spacing.xxs,
    right: spacing.xxs,
    width: 24,
    height: 24,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(0, 0, 0, 0.62)',
  },
  moveRow: {
    position: 'absolute',
    left: spacing.xxs,
    right: spacing.xxs,
    bottom: spacing.xxs,
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  moveButton: {
    width: 25,
    height: 25,
    borderRadius: 13,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(0, 0, 0, 0.62)',
  },
  moveButtonDisabled: {
    opacity: 0.3,
  },
});
