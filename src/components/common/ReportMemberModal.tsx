import { useEffect, useMemo, useState } from 'react';
import {
  Image,
  Modal,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';

import { colors, radius, spacing, typography } from '../../theme';
import { INPUT_LIMITS } from '../../constants/inputLimits';
import { FeedbackPressable as Pressable } from './FeedbackPressable';
import { DefaultProfileAvatar } from './DefaultProfileAvatar';
import type { MemberReportType } from '../../services/api/memberApi';

export type ReportMemberModalState = {
  nickname: string;
  profileImageUrl?: string;
  initialType?: MemberReportType;
  allowedTypes?: MemberReportType[];
};

const reportTypeOptions: Array<{ type: MemberReportType; label: string }> = [
  { type: 'GENERAL', label: '일반' },
  { type: 'BOOK_STORY', label: '책이야기' },
  { type: 'COMMENT', label: '책이야기(댓글)' },
  { type: 'CLUB_MEETING', label: '모임 내부' },
];

type Props = {
  visible: boolean;
  target: ReportMemberModalState | null;
  submitting?: boolean;
  onPressTarget?: (nickname: string) => void;
  onClose: () => void;
  onSubmit: (payload: { reportType: MemberReportType; content?: string }) => void;
};

export function ReportMemberModal({
  visible,
  target,
  submitting = false,
  onPressTarget,
  onClose,
  onSubmit,
}: Props) {
  const [reportType, setReportType] = useState<MemberReportType>('GENERAL');
  const [content, setContent] = useState('');
  const availableTypeOptions = useMemo(() => {
    const allowed = target?.allowedTypes;
    if (!Array.isArray(allowed) || allowed.length === 0) {
      return reportTypeOptions;
    }

    const allowedSet = new Set<MemberReportType>(allowed);
    const filtered = reportTypeOptions.filter((option) => allowedSet.has(option.type));
    return filtered.length > 0 ? filtered : reportTypeOptions;
  }, [target?.allowedTypes]);

  useEffect(() => {
    if (!visible || !target) return;
    const fallbackType = availableTypeOptions[0]?.type ?? 'GENERAL';
    const preferredType = target.initialType ?? fallbackType;
    const nextType = availableTypeOptions.some((option) => option.type === preferredType)
      ? preferredType
      : fallbackType;
    setReportType(nextType);
    setContent('');
  }, [availableTypeOptions, target, visible]);

  const handleSubmit = () => {
    const trimmed = content.trim();
    onSubmit({
      reportType,
      content: trimmed || undefined,
    });
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
      <Pressable style={styles.backdrop} onPress={onClose} disableFeedback>
        {target ? (
          <Pressable
            style={styles.card}
            onPress={(event) => event.stopPropagation()}
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
              {availableTypeOptions.map((option) => {
                const active = reportType === option.type;
                return (
                  <Pressable
                    key={option.type}
                    style={[styles.typeButton, active ? styles.typeButtonActive : null]}
                    onPress={() => setReportType(option.type)}
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
              <TextInput
                value={content}
                onChangeText={setContent}
                placeholder="신고 내용 작성 (최대 500자)"
                placeholderTextColor={colors.gray3}
                style={styles.contentInput}
                multiline
                maxLength={INPUT_LIMITS.REPORT_CONTENT}
                textAlignVertical="top"
              />
            </View>

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
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.24)',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: spacing.md,
  },
  card: {
    width: '100%',
    maxWidth: 760,
    backgroundColor: colors.white,
    borderRadius: radius.md,
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
    padding: spacing.xs / 2,
  },
  targetCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    paddingVertical: spacing.xs,
  },
  targetCardPressed: {
    opacity: 0.72,
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
    opacity: 0.6,
  },
  submitButtonText: {
    ...typography.body1_2,
    color: colors.white,
  },
});
