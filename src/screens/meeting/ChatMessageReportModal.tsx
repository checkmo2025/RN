import { useCallback, useEffect, useState } from 'react';
import { Alert, Image, Keyboard, StyleSheet, Text, View } from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';

import { DefaultProfileAvatar } from '../../components/common/DefaultProfileAvatar';
import { FeedbackPressable as Pressable } from '../../components/common/FeedbackPressable';
import { FormTextInput } from '../../components/common/FormTextInput';
import { ToastHost } from '../../components/common/ToastHost';
import { INPUT_LIMITS } from '../../constants/inputLimits';
import { useLanguage } from '../../contexts/LanguageContext';
import type { ClubMeetingChatMessage } from '../../services/api/clubApi';
import type { ReportReason } from '../../services/api/memberApi';
import {
  buttonSize,
  colors,
  dialog,
  inputStyles,
  interactionOpacity,
  layers,
  radius,
  spacing,
  typography,
} from '../../theme';
import type { MeetingChatReportTarget } from './useMeetingChatState';

const reasonOptions: Array<{ type: ReportReason; label: string }> = [
  { type: 'GENERAL', label: '일반' },
  { type: 'INSULT', label: '욕설/비방' },
  { type: 'INAPPROPRIATE_CONTENT', label: '음란/부적절' },
  { type: 'SPAM', label: '홍보/도배' },
];

type Props = {
  target: MeetingChatReportTarget | null;
  submitting: boolean;
  onClose: () => void;
  onSubmit: (payload: { reason: ReportReason; content?: string }) => void;
};

export function ChatMessageReportModal({ target, submitting, onClose, onSubmit }: Props) {
  const { l } = useLanguage();
  const [reason, setReason] = useState<ReportReason>('GENERAL');
  const [content, setContent] = useState('');
  const message: ClubMeetingChatMessage | null = target?.message ?? null;

  useEffect(() => {
    if (!message) return;
    setReason('GENERAL');
    setContent('');
  }, [message]);

  const handleClose = useCallback(() => {
    if (submitting) return;

    if (!content.trim()) {
      onClose();
      return;
    }

    Alert.alert(l('알림'), l('현재 페이지는 저장되지 않습니다.'), [
      { text: l('취소'), style: 'cancel' },
      { text: l('닫기'), style: 'destructive', onPress: onClose },
    ]);
  }, [content, l, onClose, submitting]);

  if (!message || !target) return null;

  return (
    <View style={styles.overlay}>
      <Pressable style={StyleSheet.absoluteFill} onPress={handleClose} disableFeedback />
      <View style={styles.card}>
          <View style={styles.header}>
            <Text style={styles.title}>
              {target.targetType === 'CHAT' ? l('메시지 신고') : l('사용자 신고')}
            </Text>
            <Pressable onPress={handleClose} hitSlop={8} accessibilityLabel={l('신고 닫기')}>
              <MaterialIcons name="close" size={24} color={colors.primary1} />
            </Pressable>
          </View>

          <View style={styles.messagePreview}>
            <View style={styles.avatar}>
              {message.senderProfileImageUrl ? (
                <Image source={{ uri: message.senderProfileImageUrl }} style={styles.avatarImage} />
              ) : (
                <DefaultProfileAvatar size={40} />
              )}
            </View>
            <View style={styles.previewBody}>
              <Text style={styles.nickname}>{message.senderNickname}</Text>
              {target.targetType === 'CHAT' ? (
                <Text style={styles.previewContent} numberOfLines={3}>
                  {message.content}
                </Text>
              ) : (
                <Text style={styles.previewContent}>{l('신고 대상 사용자')}</Text>
              )}
            </View>
          </View>

          <Text style={styles.label}>{l('종류')}</Text>
          <View style={styles.reasonRow}>
            {reasonOptions.map((option) => {
              const active = option.type === reason;
              return (
                <Pressable
                  key={option.type}
                  style={[styles.reasonButton, active && styles.reasonButtonActive]}
                  onPress={() => setReason(option.type)}
                  disabled={submitting}
                >
                  <Text style={[styles.reasonText, active && styles.reasonTextActive]}>
                    {l(option.label)}
                  </Text>
                </Pressable>
              );
            })}
          </View>

          <Text style={styles.label}>{l('내용')}</Text>
          <FormTextInput
            value={content}
            onChangeText={setContent}
            style={styles.contentInput}
            placeholder={l('신고 내용 작성 (최대 {limit}자)', { limit: INPUT_LIMITS.REPORT_CONTENT })}
            placeholderTextColor={colors.gray3}
            multiline
            maxLength={INPUT_LIMITS.REPORT_CONTENT}
            editable={!submitting}
          />
          <Text style={styles.counter}>
            {content.length}/{INPUT_LIMITS.REPORT_CONTENT}
          </Text>

          <Pressable
            style={[styles.submitButton, submitting && styles.submitButtonDisabled]}
            onPress={() => {
              Keyboard.dismiss();
              onSubmit({ reason, content: content.trim() || undefined });
            }}
            disabled={submitting}
          >
            <Text style={styles.submitText}>{submitting ? l('등록 중...') : l('신고 등록')}</Text>
          </Pressable>
          <ToastHost />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  overlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: colors.overlay30,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: spacing.md,
    zIndex: layers.overlay,
    elevation: layers.overlay,
  },
  card: {
    width: '100%',
    maxWidth: dialog.maxWidth,
    maxHeight: '90%',
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
  title: { ...typography.subhead3, color: colors.gray6 },
  messagePreview: {
    flexDirection: 'row',
    gap: spacing.sm,
    padding: spacing.sm,
    borderRadius: radius.md,
    backgroundColor: colors.background,
  },
  avatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    overflow: 'hidden',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.gray1,
  },
  avatarImage: { width: '100%', height: '100%' },
  previewBody: { flex: 1, gap: spacing.xxs },
  nickname: { ...typography.body1_2, color: colors.gray6 },
  previewContent: { ...typography.body2_3, color: colors.gray5 },
  label: { ...typography.body2_3, color: colors.gray4 },
  reasonRow: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.xs },
  reasonButton: {
    minHeight: buttonSize.icon,
    paddingHorizontal: spacing.sm,
    borderRadius: radius.sm,
    borderWidth: 1,
    borderColor: colors.gray2,
    alignItems: 'center',
    justifyContent: 'center',
  },
  reasonButtonActive: { backgroundColor: colors.primary1, borderColor: colors.primary1 },
  reasonText: { ...typography.body2_2, color: colors.gray5 },
  reasonTextActive: { color: colors.white },
  contentInput: {
    ...inputStyles.multiline,
  },
  counter: { ...typography.body2_3, color: colors.gray4, textAlign: 'right' },
  submitButton: {
    minHeight: buttonSize.field,
    borderRadius: radius.md,
    backgroundColor: colors.primary1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  submitButtonDisabled: { opacity: interactionOpacity.disabled },
  submitText: { ...typography.body1, color: colors.white },
});
