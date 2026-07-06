import { useCallback, useEffect, useState } from 'react';
import {
  Alert,
  Image,
  Keyboard,
  KeyboardAvoidingView,
  Modal,
  Platform,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';

import { colors, dialog, interactionOpacity, radius, spacing, typography } from '../../theme';
import { INPUT_LIMITS } from '../../constants/inputLimits';
import { FeedbackPressable as Pressable } from './FeedbackPressable';
import { DefaultProfileAvatar } from './DefaultProfileAvatar';
import { FormTextInput } from './FormTextInput';
import { ToastHost } from './ToastHost';
import type { ReportReason } from '../../services/api/memberApi';
import { useLanguage } from '../../contexts/LanguageContext';

export type ReportMemberModalState = {
  nickname: string;
  profileImageUrl?: string;
};

const reasonOptions: Array<{ type: ReportReason; label: string }> = [
  { type: 'GENERAL', label: '일반' },
  { type: 'INSULT', label: '욕설/비방' },
  { type: 'INAPPROPRIATE_CONTENT', label: '음란/부적절' },
  { type: 'SPAM', label: '홍보/도배' },
];

type Props = {
  visible: boolean;
  target: ReportMemberModalState | null;
  submitting?: boolean;
  onPressTarget?: (nickname: string) => void;
  onClose: () => void;
  onSubmit: (payload: { reason: ReportReason; content?: string }) => void;
};

export function ReportMemberModal({
  visible,
  target,
  submitting = false,
  onPressTarget,
  onClose,
  onSubmit,
}: Props) {
  const { l } = useLanguage();
  const [reason, setReason] = useState<ReportReason>('GENERAL');
  const [content, setContent] = useState('');

  useEffect(() => {
    if (!visible) return;
    setReason('GENERAL');
    setContent('');
  }, [visible]);

  const handleSubmit = () => {
    const trimmed = content.trim();
    onSubmit({ reason, content: trimmed || undefined });
  };

  const confirmDiscardIfNeeded = useCallback(
    (onConfirm: () => void) => {
      if (submitting) return;

      if (!content.trim()) {
        onConfirm();
        return;
      }

      Alert.alert(l('알림'), l('현재 페이지는 저장되지 않습니다.'), [
        { text: l('취소'), style: 'cancel' },
        { text: l('닫기'), style: 'destructive', onPress: onConfirm },
      ]);
    },
    [content, l, submitting],
  );

  const handleClose = useCallback(() => {
    confirmDiscardIfNeeded(onClose);
  }, [confirmDiscardIfNeeded, onClose]);

  const handlePressTarget = useCallback(
    (nickname: string) => {
      confirmDiscardIfNeeded(() => onPressTarget?.(nickname));
    },
    [confirmDiscardIfNeeded, onPressTarget],
  );

  const targetCardContent = target ? (
    <>
      <View style={styles.avatar}>
        {target.profileImageUrl ? (
          <Image source={{ uri: target.profileImageUrl }} style={styles.avatarImage} />
        ) : (
          <DefaultProfileAvatar size={40} />
        )}
      </View>
      <View style={styles.targetMeta}>
        <Text style={styles.targetName}>{target.nickname}</Text>
        <Text style={styles.targetSub}>{l('신고 대상 사용자')}</Text>
      </View>
    </>
  ) : null;

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={handleClose}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.keyboardView}
      >
      <Pressable style={styles.backdrop} onPress={handleClose} disableFeedback>
        {target ? (
          <Pressable
            style={styles.card}
            onPress={(event) => { event.stopPropagation(); Keyboard.dismiss(); }}
            disableFeedback
          >
            <View style={styles.header}>
              <Text style={styles.title}>{l('신고하기')}</Text>
              <Pressable style={styles.closeButton} onPress={handleClose}>
                <MaterialIcons name="close" size={24} color={colors.primary1} />
              </Pressable>
            </View>

            {onPressTarget ? (
              <Pressable
                style={({ pressed }) => [styles.targetCard, pressed ? styles.targetCardPressed : null]}
                onPress={() => handlePressTarget(target.nickname)}
                disabled={submitting}
              >
                {targetCardContent}
              </Pressable>
            ) : (
              <View style={styles.targetCard}>{targetCardContent}</View>
            )}

            <Text style={styles.label}>{l('종류')}</Text>
            <View style={styles.typeRow}>
              {reasonOptions.map((option) => {
                const active = reason === option.type;
                return (
                  <Pressable
                    key={option.type}
                    style={[styles.typeButton, active ? styles.typeButtonActive : null]}
                    onPress={() => setReason(option.type)}
                  >
                    <Text style={[styles.typeButtonText, active ? styles.typeButtonTextActive : null]}>
                      {l(option.label)}
                    </Text>
                  </Pressable>
                );
              })}
            </View>

            <Text style={styles.label}>{l('내용')}</Text>
            <View style={styles.contentBox}>
              <FormTextInput
                value={content}
                onChangeText={setContent}
                placeholder={l('신고 내용 작성 (최대 {limit}자)', {
                  limit: INPUT_LIMITS.REPORT_CONTENT,
                })}
                placeholderTextColor={colors.gray3}
                style={styles.contentInput}
                multiline
                scrollEnabled
                textAlignVertical="top"
                maxLength={INPUT_LIMITS.REPORT_CONTENT}
                overLimitMessage={l('신고 내용은 {limit}자 이하여야 합니다.', {
                  limit: INPUT_LIMITS.REPORT_CONTENT,
                })}
              />
            </View>
            <Text style={styles.contentCounterText}>
              {content.length}/{INPUT_LIMITS.REPORT_CONTENT}
            </Text>

            <Pressable
              style={[styles.submitButton, submitting ? styles.submitButtonDisabled : null]}
              onPress={handleSubmit}
              disabled={submitting}
            >
              <Text style={styles.submitButtonText}>
                {submitting ? l('등록 중...') : l('신고 등록')}
              </Text>
            </Pressable>
          </Pressable>
        ) : null}
      </Pressable>
      </KeyboardAvoidingView>
      <ToastHost />
    </Modal>
  );
}

const styles = StyleSheet.create({
  keyboardView: {
    flex: 1,
  },
  backdrop: {
    flex: 1,
    backgroundColor: colors.overlay30,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: spacing.md,
  },
  card: {
    width: '100%',
    maxWidth: dialog.maxWidth,
    backgroundColor: colors.white,
    borderRadius: dialog.borderRadius,
    borderWidth: 1,
    borderColor: colors.gray2,
    padding: spacing.md,
    gap: spacing.sm,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  title: {
    ...typography.subhead3,
    color: colors.gray6,
  },
  closeButton: {
    padding: spacing.xxs,
  },
  targetCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    paddingVertical: spacing.xs,
  },
  targetCardPressed: {
    opacity: interactionOpacity.pressed,
  },
  avatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: colors.gray1,
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  avatarImage: {
    width: '100%',
    height: '100%',
  },
  targetMeta: {
    flex: 1,
    gap: 2,
  },
  targetName: {
    ...typography.body1_2,
    color: colors.gray6,
  },
  targetSub: {
    ...typography.body2_3,
    color: colors.gray4,
  },
  label: {
    ...typography.body2_3,
    color: colors.gray4,
  },
  typeRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.xs,
  },
  typeButton: {
    minWidth: 92,
    borderWidth: 1,
    borderColor: colors.gray2,
    borderRadius: radius.sm,
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.white,
  },
  typeButtonActive: {
    borderColor: colors.primary1,
    backgroundColor: colors.primary1,
  },
  typeButtonText: {
    ...typography.body2_2,
    color: colors.gray3,
  },
  typeButtonTextActive: {
    color: colors.white,
  },
  contentBox: {
    borderWidth: 1,
    borderColor: colors.gray2,
    borderRadius: radius.sm,
    backgroundColor: colors.gray1,
    minHeight: 204,
    maxHeight: 244,
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.sm,
  },
  contentInput: {
    ...typography.body1_3,
    color: colors.gray6,
    minHeight: 180,
    maxHeight: 220,
    paddingRight: spacing.md,
    paddingBottom: spacing.lg,
  },
  contentCounterText: {
    ...typography.body2_3,
    color: colors.gray4,
    textAlign: 'right',
    marginTop: spacing.xxs,
  },
  submitButton: {
    height: 52,
    borderRadius: radius.sm,
    backgroundColor: colors.primary1,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: spacing.xs,
  },
  submitButtonDisabled: {
    opacity: interactionOpacity.disabled,
  },
  submitButtonText: {
    ...typography.body1_2,
    color: colors.white,
  },
});
