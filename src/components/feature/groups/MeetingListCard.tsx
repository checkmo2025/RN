import React, { useEffect, useRef } from 'react';
import {
  Image,
  StyleSheet,
  Text,
  TextInput,
  View,
  type LayoutChangeEvent,
} from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';

import { colors, radius, spacing, typography } from '../../../theme';
import { INPUT_LIMITS } from '../../../constants/inputLimits';
import { CLUB_DEFAULT_IMAGE } from '../../../constants/defaultAssets';
import { FeedbackPressable as Pressable } from '../../common/FeedbackPressable';
import { FormTextInput } from '../../common/FormTextInput';

type Props = {
  name: string;
  tags: string[];
  topic: string;
  region: string;
  profileImageUrl?: string;
  isPrivate?: boolean;
  applicationStatus?: string;
  applyOpen?: boolean;
  applyReason?: string;
  onPressApply?: () => void;
  onChangeApplyReason?: (value: string) => void;
  onApplyInputFocus?: () => void;
  onApplyInputLayout?: (event: LayoutChangeEvent) => void;
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
  profileImageUrl,
  isPrivate,
  applicationStatus,
  applyOpen,
  applyReason,
  onPressApply,
  onChangeApplyReason,
  onApplyInputFocus,
  onApplyInputLayout,
  onSubmitApply,
  onPressVisit,
}: Props) {
  const applyInputRef = useRef<TextInput>(null);
  const canSubmit = (applyReason ?? '').trim().length > 0;

  useEffect(() => {
    if (!applyOpen) return;
    requestAnimationFrame(() => {
      setTimeout(() => {
        applyInputRef.current?.focus();
      }, 120);
    });
  }, [applyOpen]);

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
        <View style={styles.thumb}>
          <Image source={{ uri: profileImageUrl || CLUB_DEFAULT_IMAGE }} style={styles.thumbImage} resizeMode="cover" />
        </View>
        <View style={styles.metaWrap}>
          <Text style={styles.metaText}>{topic}</Text>
          <Text style={styles.metaText}>{region}</Text>
        </View>
      </View>

      {applyOpen ? (
        <View style={styles.applySection} onLayout={onApplyInputLayout}>
          <FormTextInput
            ref={applyInputRef}
            value={applyReason}
            onChangeText={(text) => onChangeApplyReason?.(text)}
            onFocus={onApplyInputFocus}
            placeholder="신청 사유를 입력해보세요(300자 제한)"
            placeholderTextColor={colors.gray3}
            multiline
            maxLength={INPUT_LIMITS.APPLY_REASON}
            overLimitMessage={`신청 사유는 ${INPUT_LIMITS.APPLY_REASON}자 이하여야 합니다.`}
            style={styles.applyInput}
          />
          <Text style={styles.applyCounterText}>
            {(applyReason ?? '').length}/{INPUT_LIMITS.APPLY_REASON}
          </Text>
          <Pressable
            style={[styles.applySubmitButton, !canSubmit && styles.applySubmitDisabled]}
            disabled={!canSubmit}
            onPress={onSubmitApply}
          >
            <Text style={styles.applySubmitText}>가입신청하기</Text>
          </Pressable>
        </View>
      ) : (
        <View style={styles.actions}>
          <Pressable
            style={[styles.applyButton, applicationStatus && styles.applyButtonDisabled]}
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
          <Pressable style={styles.visitButton} onPress={onPressVisit}>
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
    ...typography.subhead3,
    color: colors.gray7,
    flex: 1,
    marginRight: spacing.xs,
  },
  headerRight: {
    alignItems: 'flex-end',
    gap: spacing.xxs,
    flexShrink: 0,
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
    borderRadius: radius.xs,
    paddingHorizontal: spacing.xs,
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
    gap: spacing.xs,
  },
  thumb: {
    width: 74,
    height: 74,
    borderRadius: radius.xs,
    backgroundColor: colors.gray1,
    overflow: 'hidden',
  },
  thumbImage: {
    width: '100%',
    height: '100%',
  },
  thumbPlaceholder: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  metaWrap: {
    flex: 1,
    gap: 2,
  },
  metaText: {
    ...typography.caption1_3,
    color: colors.gray4,
  },
  actions: {
    flexDirection: 'row',
    gap: 6,
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
    gap: spacing.xs,
    marginTop: 2,
  },
  applyInput: {
    height: 148,
    maxHeight: 180,
    borderRadius: radius.md,
    backgroundColor: colors.gray1,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    ...typography.body1_3,
    color: colors.gray6,
  },
  applyCounterText: {
    ...typography.body2_3,
    color: colors.gray4,
    textAlign: 'right',
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
});
