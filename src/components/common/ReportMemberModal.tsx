import { useEffect, useState } from 'react';
import {
  Image,
  Modal,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';

import { colors, radius, spacing, typography } from '../../theme';
import type { MemberReportType } from '../../services/api/memberApi';

export type ReportMemberModalState = {
  nickname: string;
  profileImageUrl?: string;
  initialType?: MemberReportType;
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
  onClose: () => void;
  onSubmit: (payload: { reportType: MemberReportType; content?: string }) => void;
};

export function ReportMemberModal({
  visible,
  target,
  submitting = false,
  onClose,
  onSubmit,
}: Props) {
  const [reportType, setReportType] = useState<MemberReportType>('GENERAL');
  const [content, setContent] = useState('');

  useEffect(() => {
    if (!visible || !target) return;
    setReportType(target.initialType ?? 'GENERAL');
    setContent('');
  }, [target, visible]);

  const handleSubmit = () => {
    const trimmed = content.trim();
    onSubmit({
      reportType,
      content: trimmed || undefined,
    });
  };

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <Pressable style={styles.backdrop} onPress={onClose}>
        {target ? (
          <Pressable style={styles.card} onPress={(event) => event.stopPropagation()}>
            <View style={styles.header}>
              <Text style={styles.title}>신고하기</Text>
              <Pressable style={styles.closeButton} onPress={onClose}>
                <MaterialIcons name="close" size={24} color={colors.primary1} />
              </Pressable>
            </View>

            <View style={styles.targetCard}>
              <View style={styles.avatar}>
                {target.profileImageUrl ? (
                  <Image source={{ uri: target.profileImageUrl }} style={styles.avatarImage} />
                ) : (
                  <MaterialIcons name="person-outline" size={22} color={colors.gray4} />
                )}
              </View>
              <View style={styles.targetMeta}>
                <Text style={styles.targetName}>{target.nickname}</Text>
                <Text style={styles.targetSub}>신고 대상 사용자</Text>
              </View>
            </View>

            <Text style={styles.label}>종류</Text>
            <View style={styles.typeRow}>
              {reportTypeOptions.map((option) => {
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
                placeholder="신고 내용 작성 (최대 400자)"
                placeholderTextColor={colors.gray3}
                style={styles.contentInput}
                multiline
                maxLength={400}
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
