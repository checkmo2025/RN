import { useMemo, useState, useCallback } from 'react';
import { ScrollView, StyleSheet, Text, View, Pressable } from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { SvgUri } from 'react-native-svg';

import { colors, radius, spacing, typography } from '../theme';

type TabKey = '책 이야기' | '서재' | '모임';

type StoryCard = {
  id: string;
  title: string;
  author: string;
};

type BookCard = {
  id: string;
  title: string;
  author: string;
};

type GroupItem = {
  id: string;
  name: string;
};

export function UserProfileScreen() {
  const [activeTab, setActiveTab] = useState<TabKey>('서재');
  const [subscribed, setSubscribed] = useState(false);

  const stories: StoryCard[] = useMemo(
    () =>
      Array.from({ length: 6 }).map((_, idx) => ({
        id: `story-${idx}`,
        title: '책 제목',
        author: '작가/작가가',
      })),
    [],
  );

  const books: BookCard[] = stories.map((s, idx) => ({ ...s, id: `book-${idx}` }));

  const groups: GroupItem[] = useMemo(
    () =>
      ['복적복적', '긍적긍정', '까끌까끌', '말랑말랑', '발끈발끈'].map((name, idx) => ({
        id: `g-${idx}`,
        name,
      })),
    [],
  );

  const handleSubscribe = useCallback(() => setSubscribed((prev) => !prev), []);

  const renderTabs = () => (
    <View style={styles.tabRow}>
      (['책 이야기', '서재', '모임'] as TabKey[]).map?
    </View>
  );

  const renderContent = () => {
    if (activeTab === '책 이야기') {
      return (
        <View style={styles.gridWrap}>
          {stories.map((story) => (
            <View key={story.id} style={styles.card}>
              <View style={styles.cardThumb}>
                <MaterialIcons name="favorite" size={18} color={colors.secondary1} />
              </View>
              <Text style={styles.cardTitle}>{story.title}</Text>
              <Text style={styles.cardAuthor}>{story.author}</Text>
            </View>
          ))}
        </View>
      );
    }
    if (activeTab === '서재') {
      return (
        <View style={styles.gridWrap}>
          {books.map((book) => (
            <View key={book.id} style={styles.card}>
              <View style={styles.cardThumb}>
                <MaterialIcons name="favorite" size={18} color={colors.secondary1} />
              </View>
              <Text style={styles.cardTitle}>{book.title}</Text>
              <Text style={styles.cardAuthor}>{book.author}</Text>
            </View>
          ))}
        </View>
      );
    }
    return (
      <View style={styles.groupList}>
        {groups.map((group) => (
          <Pressable key={group.id} style={({ pressed }) => [styles.groupRow, pressed && styles.pressed]}>
            <Text style={styles.groupName}>{group.name}</Text>
          </Pressable>
        ))}
      </View>
    );
  };

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
      <View style={styles.breadcrumbRow}>
        <Text style={styles.breadcrumbText}>전체</Text>
        <MaterialIcons name="chevron-right" size={16} color={colors.gray4} />
        <Text style={[styles.breadcrumbText, styles.breadcrumbActive]}>마이페이지</Text>
      </View>

      <View style={styles.profileRow}>
        <View style={styles.profileAvatar} />
        <View style={styles.profileMeta}>
          <Text style={styles.profileName}>_hy_0716</Text>
          <Text style={styles.profileSub}>구독중 2   구독중 2</Text>
          <Text style={styles.profileDesc} numberOfLines={3}>
            이제 다양한 책을 함께 읽고 서로의 생각을 나누는 특별한 시간을 시작해보세요. 한 권의 책이 주는 작은 울림이 일상에 큰
            변화를 가져올지도 모릅니다.
          </Text>
        </View>
      </View>

      <View style={styles.actionRow}>
        <Pressable
          style={({ pressed }) => [
            styles.primaryButton,
            subscribed && styles.primaryButtonDisabled,
            pressed && styles.pressed,
          ]}
          onPress={handleSubscribe}
        >
          <Text style={[styles.primaryButtonText, subscribed && styles.disabledText]}>
            {subscribed ? '구독 중' : '구독하기'}
          </Text>
        </Pressable>
        <Pressable style={({ pressed }) => [styles.secondaryButton, pressed && styles.pressed]}>
          <Text style={styles.secondaryButtonText}>신고하기</Text>
        </Pressable>
      </View>

      <View style={styles.tabRow}>
        {(['책 이야기', '서재', '모임'] as TabKey[]).map((tab) => {
          const active = tab === activeTab;
          return (
            <Pressable
              key={tab}
              style={({ pressed }) => [
                styles.tabButton,
                active ? styles.tabActive : null,
                pressed && styles.pressed,
              ]}
              onPress={() => setActiveTab(tab)}
            >
              <Text style={[styles.tabLabel, active ? styles.tabLabelActive : styles.tabLabelInactive]}>{tab}</Text>
            </Pressable>
          );
        })}
      </View>

      <View style={styles.tabContent}>{renderContent()}</View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  content: {
    padding: spacing.md,
    gap: spacing.md,
    paddingBottom: spacing.xl * 2,
  },
  breadcrumbRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs / 2,
  },
  breadcrumbText: {
    ...typography.body2_3,
    color: colors.gray4,
  },
  breadcrumbActive: {
    color: colors.gray6,
  },
  profileRow: {
    flexDirection: 'row',
    gap: spacing.md,
    alignItems: 'center',
  },
  profileAvatar: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: colors.gray2,
  },
  profileMeta: {
    flex: 1,
    gap: spacing.xs / 2,
  },
  profileName: {
    ...typography.subhead3,
    color: colors.gray6,
  },
  profileSub: {
    ...typography.body2_3,
    color: colors.gray4,
  },
  profileDesc: {
    ...typography.body1_3,
    color: colors.gray6,
  },
  actionRow: {
    flexDirection: 'row',
    gap: spacing.sm,
  },
  primaryButton: {
    flex: 1,
    backgroundColor: colors.primary1,
    borderRadius: radius.md,
    paddingVertical: spacing.sm,
    alignItems: 'center',
    justifyContent: 'center',
  },
  primaryButtonDisabled: {
    backgroundColor: colors.gray2,
  },
  primaryButtonText: {
    ...typography.body1_2,
    color: colors.white,
  },
  disabledText: {
    ...typography.body1_2,
    color: colors.gray5,
  },
  secondaryButton: {
    flex: 1,
    backgroundColor: colors.white,
    borderRadius: radius.md,
    paddingVertical: spacing.sm,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: colors.gray2,
  },
  secondaryButtonText: {
    ...typography.body1_2,
    color: colors.gray6,
  },
  tabRow: {
    flexDirection: 'row',
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.gray2,
  },
  tabButton: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: spacing.sm,
  },
  tabActive: {
    borderBottomWidth: 2,
    borderBottomColor: colors.primary1,
  },
  tabLabel: {
    ...typography.body1_3,
  },
  tabLabelActive: {
    color: colors.primary1,
  },
  tabLabelInactive: {
    color: colors.gray4,
  },
  tabContent: {
    minHeight: 200,
  },
  gridWrap: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
  },
  card: {
    width: '30%',
    backgroundColor: colors.white,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.subbrown4,
    padding: spacing.xs,
    gap: spacing.xs / 2,
  },
  cardThumb: {
    width: '100%',
    aspectRatio: 2 / 3,
    borderRadius: radius.sm,
    backgroundColor: colors.gray1,
    alignItems: 'flex-start',
    justifyContent: 'flex-start',
    padding: spacing.xs,
  },
  cardTitle: {
    ...typography.body1_2,
    color: colors.gray6,
  },
  cardAuthor: {
    ...typography.body2_3,
    color: colors.gray5,
  },
  groupList: {
    gap: spacing.sm,
  },
  groupRow: {
    backgroundColor: colors.white,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.subbrown4,
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.md,
  },
  groupName: {
    ...typography.body1_3,
    color: colors.gray6,
  },
  pressed: {
    opacity: 0.7,
  },
});
