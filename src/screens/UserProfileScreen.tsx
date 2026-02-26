import { useMemo, useState, useCallback } from 'react';
import {
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  useWindowDimensions,
  View,
} from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';

import { colors, radius, spacing, typography } from '../theme';
import { ScreenLayout } from '../components/common/ScreenLayout';
import { showToast } from '../utils/toast';

type TabKey = '책 이야기' | '서재' | '모임';

type StoryCard = {
  id: string;
  title: string;
  excerpt: string;
  likes: number;
  comments: number;
};

type BookCard = {
  id: string;
  title: string;
  author: string;
};

type GroupItem = {
  id: string;
  name: string;
  memberCount: number;
  category: string;
};

const tabs: TabKey[] = ['책 이야기', '서재', '모임'];

export function UserProfileScreen() {
  const { width } = useWindowDimensions();
  const [activeTab, setActiveTab] = useState<TabKey>('책 이야기');
  const [subscribed, setSubscribed] = useState(false);

  const stories: StoryCard[] = useMemo(
    () =>
      Array.from({ length: 9 }).map((_, idx) => ({
        id: `story-${idx + 1}`,
        title: '나는 나이든 왕자다',
        excerpt:
          '나는 나이든 왕자다. 그 누가 숫자가 중요하다고 했던가. 세고 또 세면서 어떤 인연을 떠올려 본다.',
        likes: (idx % 5) + 1,
        comments: (idx % 3) + 1,
      })),
    [],
  );

  const books: BookCard[] = useMemo(
    () =>
      Array.from({ length: 10 }).map((_, idx) => ({
        id: `book-${idx + 1}`,
        title: idx % 2 === 0 ? '단테 <신곡> 인문...' : '오래된 세계의 농...',
        author: idx % 2 === 0 ? '박상진' : '이다혜',
      })),
    [],
  );

  const groups: GroupItem[] = useMemo(
    () =>
      ['새벽 독서회', '강북 소설 클럽', '논픽션 라운지', '퇴근길 북클럽'].map((name, idx) => ({
        id: `group-${idx + 1}`,
        name,
        memberCount: 24 + idx * 7,
        category: idx % 2 === 0 ? '인문학' : '소설/시/희곡',
      })),
    [],
  );

  const storyCardWidth = width >= 1280 ? '32%' : width >= 820 ? '48%' : '100%';
  const bookCardWidth = width >= 1280 ? '23.8%' : width >= 1000 ? '31.5%' : width >= 720 ? '48%' : '100%';

  const handleSubscribe = useCallback(() => {
    setSubscribed((prev) => {
      const next = !prev;
      showToast(next ? '구독했습니다.' : '구독을 취소했습니다.');
      return next;
    });
  }, []);

  const renderStoryCards = () => (
    <View style={styles.gridWrap}>
      {stories.map((story) => (
        <Pressable
          key={story.id}
          style={({ pressed }) => [
            styles.storyCard,
            { width: storyCardWidth },
            pressed && styles.pressed,
          ]}
        >
          <View style={styles.storyCardHeader}>
            <View style={styles.storyAuthorWrap}>
              <View style={styles.storyAuthorAvatar}>
                <MaterialIcons name="person-outline" size={16} color={colors.gray4} />
              </View>
              <View>
                <Text style={styles.storyAuthorName}>hy_0716</Text>
                <Text style={styles.storyMeta}>2분전 · 조회수 302</Text>
              </View>
            </View>
            <View style={styles.subscribeChip}>
              <Text style={styles.subscribeChipText}>구독</Text>
            </View>
          </View>
          <View style={styles.storyThumb} />
          <Text style={styles.storyTitle}>{story.title}</Text>
          <Text style={styles.storyExcerpt} numberOfLines={2}>
            {story.excerpt}
          </Text>
          <View style={styles.storyFooter}>
            <View style={styles.storyFooterItem}>
              <MaterialIcons name="favorite-border" size={14} color={colors.gray4} />
              <Text style={styles.storyFooterText}>좋아요 {story.likes}</Text>
            </View>
            <View style={styles.storyFooterDivider} />
            <View style={styles.storyFooterItem}>
              <MaterialIcons name="chat-bubble-outline" size={14} color={colors.gray4} />
              <Text style={styles.storyFooterText}>댓글 {story.comments}</Text>
            </View>
          </View>
        </Pressable>
      ))}
    </View>
  );

  const renderLibraryCards = () => (
    <View style={styles.gridWrap}>
      {books.map((book) => (
        <View key={book.id} style={[styles.bookCard, { width: bookCardWidth }]}>
          <View style={styles.bookThumb}>
            <MaterialIcons name="favorite" size={20} color={colors.secondary1} />
          </View>
          <Text style={styles.bookTitle} numberOfLines={1}>
            {book.title}
          </Text>
          <Text style={styles.bookAuthor} numberOfLines={1}>
            {book.author}
          </Text>
        </View>
      ))}
    </View>
  );

  const renderMeetings = () => (
    <View style={styles.groupList}>
      {groups.map((group) => (
        <Pressable key={group.id} style={({ pressed }) => [styles.groupRow, pressed && styles.pressed]}>
          <View>
            <Text style={styles.groupName}>{group.name}</Text>
            <Text style={styles.groupMeta}>
              {group.category} · 멤버 {group.memberCount}명
            </Text>
          </View>
          <MaterialIcons name="chevron-right" size={18} color={colors.gray4} />
        </Pressable>
      ))}
    </View>
  );

  const renderTabContent = () => {
    if (activeTab === '책 이야기') return renderStoryCards();
    if (activeTab === '서재') return renderLibraryCards();
    return renderMeetings();
  };

  return (
    <ScreenLayout title="다른사람 프로필">
      <ScrollView
        style={styles.container}
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.breadcrumbRow}>
          <Text style={styles.breadcrumbText}>전체</Text>
          <MaterialIcons name="chevron-right" size={16} color={colors.gray4} />
          <Text style={[styles.breadcrumbText, styles.breadcrumbActive]}>다른사람 프로필</Text>
        </View>

        <View style={styles.profileRow}>
          <View style={styles.profileAvatar}>
            <MaterialIcons name="person" size={48} color={colors.gray3} />
          </View>
          <View style={styles.profileMeta}>
            <Text style={styles.profileName}>_hy_0716</Text>
            <Text style={styles.profileSub}>구독중 2 · 구독자 2</Text>
            <Text style={styles.profileDesc} numberOfLines={3}>
              이제 다양한 책을 함께 읽고 서로의 생각을 나누는 특별한 시간을 시작해보세요. 한 권의 책이 주는 작은 울림이 일상에
              큰 변화를 가져올지도 모릅니다.
            </Text>
          </View>
        </View>

        <View style={styles.actionRow}>
          <Pressable
            style={({ pressed }) => [
              styles.primaryButton,
              subscribed ? styles.primaryButtonDisabled : null,
              pressed && styles.pressed,
            ]}
            onPress={handleSubscribe}
          >
            <Text style={[styles.primaryButtonText, subscribed ? styles.disabledText : null]}>
              {subscribed ? '구독 중' : '구독하기'}
            </Text>
          </Pressable>
          <Pressable
            style={({ pressed }) => [styles.secondaryButton, pressed && styles.pressed]}
            onPress={() => showToast('신고 기능은 준비 중입니다.')}
          >
            <Text style={styles.secondaryButtonText}>신고하기</Text>
          </Pressable>
        </View>

        <View style={styles.tabRow}>
          {tabs.map((tab) => {
            const active = tab === activeTab;
            return (
              <Pressable
                key={tab}
                style={({ pressed }) => [styles.tabButton, active ? styles.tabActive : null, pressed && styles.pressed]}
                onPress={() => setActiveTab(tab)}
              >
                <Text style={[styles.tabLabel, active ? styles.tabLabelActive : styles.tabLabelInactive]}>
                  {tab}
                </Text>
              </Pressable>
            );
          })}
        </View>

        <View style={styles.tabContent}>{renderTabContent()}</View>
      </ScrollView>
    </ScreenLayout>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  content: {
    width: '100%',
    maxWidth: 1120,
    alignSelf: 'center',
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
    backgroundColor: colors.background,
    paddingVertical: spacing.sm,
  },
  profileAvatar: {
    width: 96,
    height: 96,
    borderRadius: 48,
    borderWidth: 1,
    borderColor: colors.gray2,
    backgroundColor: colors.white,
    alignItems: 'center',
    justifyContent: 'center',
  },
  profileMeta: {
    flex: 1,
    gap: spacing.xs / 2,
  },
  profileName: {
    ...typography.subhead2,
    color: colors.gray6,
  },
  profileSub: {
    ...typography.body2_3,
    color: colors.gray4,
  },
  profileDesc: {
    ...typography.body1_3,
    color: colors.gray5,
    lineHeight: 20,
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
    color: colors.gray5,
  },
  secondaryButton: {
    width: 140,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.gray2,
    backgroundColor: colors.white,
    alignItems: 'center',
    justifyContent: 'center',
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
    paddingVertical: spacing.sm,
    alignItems: 'center',
    justifyContent: 'center',
  },
  tabActive: {
    borderBottomWidth: 2,
    borderBottomColor: colors.primary1,
  },
  tabLabel: {
    ...typography.body1_2,
  },
  tabLabelActive: {
    color: colors.primary1,
  },
  tabLabelInactive: {
    color: colors.gray4,
  },
  tabContent: {
    minHeight: 300,
  },
  gridWrap: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
  },
  storyCard: {
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.gray2,
    backgroundColor: colors.white,
    padding: spacing.sm,
    gap: spacing.sm,
  },
  storyCardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  storyAuthorWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
  },
  storyAuthorAvatar: {
    width: 24,
    height: 24,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.gray2,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.background,
  },
  storyAuthorName: {
    ...typography.body2_2,
    color: colors.gray6,
  },
  storyMeta: {
    ...typography.body2_3,
    color: colors.gray3,
  },
  subscribeChip: {
    borderRadius: radius.pill,
    backgroundColor: colors.primary1,
    paddingHorizontal: spacing.xs,
    paddingVertical: 4,
  },
  subscribeChipText: {
    ...typography.body2_3,
    color: colors.white,
  },
  storyThumb: {
    width: '100%',
    aspectRatio: 16 / 9,
    borderRadius: radius.sm,
    backgroundColor: colors.gray1,
  },
  storyTitle: {
    ...typography.subhead4_1,
    color: colors.gray6,
  },
  storyExcerpt: {
    ...typography.body2_3,
    color: colors.gray5,
    lineHeight: 18,
  },
  storyFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderTopWidth: 1,
    borderTopColor: colors.gray2,
    paddingTop: spacing.xs,
  },
  storyFooterItem: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.xs / 2,
  },
  storyFooterText: {
    ...typography.body2_3,
    color: colors.gray4,
  },
  storyFooterDivider: {
    width: 1,
    height: 14,
    backgroundColor: colors.gray2,
  },
  bookCard: {
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.gray2,
    backgroundColor: colors.white,
    padding: spacing.xs,
    gap: spacing.xs,
  },
  bookThumb: {
    width: '100%',
    aspectRatio: 2 / 3,
    borderRadius: radius.sm,
    backgroundColor: colors.gray1,
    padding: spacing.xs,
    alignItems: 'flex-start',
    justifyContent: 'flex-start',
  },
  bookTitle: {
    ...typography.body1_2,
    color: colors.gray6,
  },
  bookAuthor: {
    ...typography.body2_3,
    color: colors.gray4,
  },
  groupList: {
    gap: spacing.sm,
  },
  groupRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.gray2,
    backgroundColor: colors.white,
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.md,
  },
  groupName: {
    ...typography.body1_2,
    color: colors.gray6,
  },
  groupMeta: {
    ...typography.body2_3,
    color: colors.gray4,
    marginTop: 2,
  },
  pressed: {
    opacity: 0.72,
  },
});
