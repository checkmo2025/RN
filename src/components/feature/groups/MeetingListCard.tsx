import React from 'react';
import { Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';

import { colors, radius, spacing, typography } from '../../../theme';

type Props = {
  name: string;
  tags: string[];
  topic: string;
  region: string;
  isPrivate?: boolean;
  applicationStatus?: string;
  applyOpen?: boolean;
  applyReason?: string;
  onPressApply?: () => void;
  onChangeApplyReason?: (value: string) => void;
  onSubmitApply?: () => void;
  onPressVisit?: () => void;
};

const CATEGORY_COLOR_MAP: Record<string, string> = {
  // secondary_2
  여행: colors.secondary2,
  외국어: colors.secondary2,
  '어린이/청소년': colors.secondary2,
  '종교/철학': colors.secondary2,

  // secondary_1
  '소설/시/희곡': colors.secondary1,
  에세이: colors.secondary1,
  인문학: colors.secondary1,

  // secondary_3
  과학: colors.secondary3,
  '컴퓨터/IT': colors.secondary3,
  '경제/경영': colors.secondary3,
  자기계발: colors.secondary3,

  // secondary_4
  사회과학: colors.secondary4,
  '정치/외교/국방': colors.secondary4,
  '역사/문화': colors.secondary4,
  '예술/대중문화': colors.secondary4,
};

export function MeetingListCard({
  name,
  tags,
  topic,
  region,
  isPrivate,
  applicationStatus,
  applyOpen,
  applyReason,
  onPressApply,
  onChangeApplyReason,
  onSubmitApply,
  onPressVisit,
}: Props) {
  const canSubmit = (applyReason ?? '').trim().length > 0;

  return (
    <View style={styles.card}>
      <View style={styles.header}>
        <Text style={styles.title}>{name}</Text>
        <View style={styles.headerRight}>
          {isPrivate ? (
            <View style={styles.privateWrap}>
              <Text style={styles.privateText}>비공개</Text>
              <MaterialIcons name="lock-outline" size={14} color={colors.gray4} />
            </View>
          ) : null}
          {applicationStatus ? (
            <View style={styles.statusWrap}>
              <Text style={styles.statusText}>{applicationStatus}</Text>
              <MaterialIcons name="check-circle-outline" size={14} color={colors.green} />
            </View>
          ) : null}
        </View>
      </View>

      <View style={styles.tagRow}>
        {tags.slice(0, 6).map((tag) => (
          <View
            key={tag}
            style={[
              styles.tag,
              { backgroundColor: CATEGORY_COLOR_MAP[tag] ?? colors.subbrown2 },
              tag.length <= 2 ? styles.tagShort : null,
            ]}
          >
            <Text style={styles.tagText}>{tag}</Text>
          </View>
        ))}
      </View>

      <View style={styles.infoRow}>
        <View style={styles.thumb} />
        <View style={styles.metaWrap}>
          <Text style={styles.metaText}>{topic}</Text>
          <Text style={styles.metaText}>{region}</Text>
        </View>
      </View>

      {applyOpen ? (
        <View style={styles.applySection}>
          <TextInput
            value={applyReason}
            onChangeText={onChangeApplyReason}
            placeholder="신청 사유를 입력해보세요(300자 제한)"
            placeholderTextColor={colors.gray3}
            multiline
            maxLength={300}
            textAlignVertical="top"
            style={styles.applyInput}
          />
          <Pressable
            style={({ pressed }) => [
              styles.applySubmitButton,
              !canSubmit ? styles.applySubmitDisabled : null,
              pressed && canSubmit ? styles.pressed : null,
            ]}
            disabled={!canSubmit}
            onPress={onSubmitApply}
          >
            <Text style={styles.applySubmitText}>가입신청하기</Text>
          </Pressable>
        </View>
      ) : (
        <View style={styles.actions}>
          <Pressable
            style={({ pressed }) => [
              styles.applyButton,
              applicationStatus ? styles.applyButtonDisabled : null,
              pressed && !applicationStatus ? styles.pressed : null,
            ]}
            disabled={Boolean(applicationStatus)}
            onPress={onPressApply}
          >
            <Text
              style={[
                styles.applyButtonText,
                applicationStatus ? styles.applyButtonTextDisabled : null,
              ]}
            >
              {applicationStatus ? '신청완료' : '가입신청하기'}
            </Text>
          </Pressable>
          <Pressable style={({ pressed }) => [styles.visitButton, pressed && styles.pressed]} onPress={onPressVisit}>
            <Text style={styles.visitButtonText}>방문하기</Text>
          </Pressable>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    minHeight: 216,
    backgroundColor: colors.white,
    borderWidth: 2,
    borderColor: colors.subbrown4,
    borderRadius: radius.md,
    paddingTop: 13,
    paddingBottom: 13,
    paddingHorizontal: 14,
    gap: spacing.xs,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
  },
  title: {
    ...typography.body1_2,
    color: colors.gray7,
  },
  headerRight: {
    alignItems: 'flex-end',
    gap: 4,
  },
  privateWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 2,
  },
  privateText: {
    ...typography.body2_3,
    color: colors.gray4,
  },
  statusWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 2,
  },
  statusText: {
    ...typography.body2_2,
    color: colors.green,
  },
  tagRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
  },
  tag: {
    borderRadius: 4,
    paddingHorizontal: 8,
    paddingVertical: 2,
    alignItems: 'center',
    justifyContent: 'center',
  },
  tagShort: {
    minWidth: 44,
  },
  tagText: {
    ...typography.body2_3,
    color: colors.white,
  },
  infoRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 8,
  },
  thumb: {
    width: 74,
    height: 74,
    borderRadius: 4,
    backgroundColor: colors.gray1,
  },
  metaWrap: {
    flex: 1,
    gap: 2,
  },
  metaText: {
    ...typography.body2_3,
    color: colors.gray4,
    lineHeight: 18,
  },
  actions: {
    flexDirection: 'row',
    gap: 2,
    marginTop: 'auto',
  },
  applyButton: {
    flex: 1,
    height: 36,
    borderRadius: radius.md,
    backgroundColor: colors.primary1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  applyButtonText: {
    ...typography.body1_2,
    color: colors.white,
  },
  applyButtonDisabled: {
    backgroundColor: colors.gray2,
  },
  applyButtonTextDisabled: {
    color: colors.white,
  },
  visitButton: {
    flex: 1,
    height: 36,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.subbrown2,
    backgroundColor: colors.white,
    alignItems: 'center',
    justifyContent: 'center',
  },
  visitButtonText: {
    ...typography.body1_2,
    color: colors.gray6,
  },
  applySection: {
    gap: 8,
    marginTop: 2,
  },
  applyInput: {
    height: 148,
    borderRadius: radius.md,
    backgroundColor: colors.gray1,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    ...typography.body1_3,
    color: colors.gray6,
  },
  applySubmitButton: {
    height: 36,
    borderRadius: radius.md,
    backgroundColor: colors.primary1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  applySubmitDisabled: {
    backgroundColor: colors.gray2,
  },
  applySubmitText: {
    ...typography.body1_2,
    color: colors.white,
  },
  pressed: {
    opacity: 0.75,
  },
});
