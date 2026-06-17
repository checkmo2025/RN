import { useEffect, useState } from 'react';
import {
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
import type { ReportReason } from '../../services/api/memberApi';

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
        <Text style={styles.targetSub}>신고 대상 사용자</Text>
      </View>
    </>
  ) : null;

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.keyboardView}
      >
      <Pressable style={styles.backdrop} onPress={onClose} disableFeedback>
        {target ? (
          <Pressable
            style={styles.card}
            onPress={(event) => { event.stopPropagation(); Keyboard.dismiss(); }}
            disableFeedback
          >
            <View style={styles.header}>
              <Text style={styles.title}>신고하기</Text>
              <Pressable style={styles.closeButton} onPress={onClose}>
                <MaterialIcons name="close" size={24} color={colors.primary1} />
              </Pressable>
            </View>

            {onPressTarget ? (
              <Pressable
                style={({ pressed }) => [styles.targetCard, pressed ? styles.targetCardPressed : null]}
                onPress={() => onPressTarget(target.nickname)}
                disabled={submitting}
              >
                {targetCardContent}
              </Pressable>
            ) : (
              <View style={styles.targetCard}>{targetCardContent}</View>
            )}

            <Text style={styles.label}>종류</Text>
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
                      {option.label}
                    </Text>
                  </Pressable>
                );
              })}
            </View>

            <Text style={styles.label}>내용</Text>
            <View style={styles.contentBox}>
              <FormTextInput
                value={content}
                onChangeText={setContent}
                placeholder="신고 내용 작성 (최대 500자)"
                placeholderTextColor={colors.gray3}
                style={styles.contentInput}
                multiline
                maxLength={INPUT_LIMITS.REPORT_CONTENT}
                overLimitMessage={`신고 내용은 ${INPUT_LIMITS.REPORT_CONTENT}자 이하여야 합니다.`}
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
                {submitting ? '등록 중...' : '신고 등록'}
              </Text>
            </Pressable>
          </Pressable>
        ) : null}
      </Pressable>
      </KeyboardAvoidingView>
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
    minHeight: 220,
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.sm,
  },
  contentInput: {
    ...typography.body1_3,
    color: colors.gray6,
    minHeight: 200,
    maxHeight: 220,
  },
  contentCounterText: {
    ...typography.body2_3,
    color: colors.gray4,
    textAlign: 'right',
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
