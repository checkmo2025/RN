import React from 'react';
import { MaterialIcons } from '@expo/vector-icons';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { colors, radius, spacing, typography } from '../../../theme';
import { MyGroupsDropdownCard } from '../groups/MyGroupsDropdownCard';
import SubscribeUserItem from '../member/SubscribeUserItem';

export type Group = { id: string; name: string };
export type UserRecommendation = {
  id: string;
  nickname: string;
  subscribed: boolean;
  profileImageUrl?: string;
};

type Props = {
  groups: Group[];
  userRecommendations: UserRecommendation[];
  onToggleSubscribe: (id: string) => void;
  onPressSearchGroup?: () => void;
  onPressCreateGroup?: () => void;
  onPressGroup?: (group: Group) => void;
  useTwoColumns: boolean;
  horizontalInset: number;
};

export default function HomeColumns({
  groups,
  userRecommendations,
  onToggleSubscribe,
  onPressSearchGroup,
  onPressCreateGroup,
  onPressGroup,
  useTwoColumns,
  horizontalInset,
}: Props) {
  return (
    <View
      style={[
        styles.contentBlock,
        styles.columns,
        useTwoColumns ? styles.columnsRow : styles.columnsStack,
        { paddingHorizontal: horizontalInset },
      ]}
    >
      <View style={[styles.columnCard, styles.columnLeft]}>
        <Text style={styles.columnTitle}>독서모임</Text>
        {groups.length === 0 ? (
          <View style={styles.emptyGroups}>
            <Text style={styles.emptyGroupsTitle}>다른 독서 모임도 둘러볼까요?</Text>
            <Pressable style={styles.secondaryButton} onPress={onPressSearchGroup}>
              <MaterialIcons name="search" size={18} color={colors.gray6} />
              <Text style={styles.secondaryButtonText}>모임 검색하기</Text>
            </Pressable>
            <Pressable style={styles.primaryButton} onPress={onPressCreateGroup}>
              <MaterialIcons name="add" size={18} color={colors.white} />
              <Text style={styles.primaryButtonText}>모임 생성하기</Text>
            </Pressable>
          </View>
        ) : (
          <MyGroupsDropdownCard groups={groups} onPressGroup={onPressGroup} />
        )}
      </View>

      <View style={[styles.columnCard, styles.columnRight]}>
        <Text style={styles.columnTitle}>사용자 추천</Text>
        {userRecommendations.map((user) => (
          <SubscribeUserItem
            key={user.id}
            nickname={user.nickname}
            profileImageUrl={user.profileImageUrl}
            subscribed={user.subscribed}
            onPressSubscribe={() => onToggleSubscribe(user.id)}
          />
        ))}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  contentBlock: {
    width: '100%',
  },
  columns: {
    gap: spacing.md,
  },
  columnsRow: {
    flexDirection: 'row',
  },
  columnsStack: {
    flexDirection: 'column',
  },
  columnCard: {
    flex: 1,
    backgroundColor: colors.white,
    borderRadius: radius.md,
    padding: spacing.md,
    gap: spacing.sm,
    shadowColor: '#000',
    shadowOpacity: 0.06,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 2 },
    elevation: 2,
  },
  columnLeft: {},
  columnRight: {},
  columnTitle: {
    ...typography.body1_2,
    color: colors.gray6,
  },
  emptyGroups: {
    gap: spacing.sm,
  },
  emptyGroupsTitle: {
    ...typography.body1_3,
    color: colors.gray5,
  },
  secondaryButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.gray2,
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.md,
    backgroundColor: colors.white,
    alignSelf: 'flex-start',
  },
  secondaryButtonText: {
    ...typography.body1_2,
    color: colors.gray6,
  },
  primaryButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    borderRadius: radius.md,
    backgroundColor: colors.primary1,
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.md,
    alignSelf: 'flex-start',
  },
  primaryButtonText: {
    ...typography.body1_2,
    color: colors.white,
  },
});
