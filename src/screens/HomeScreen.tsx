import { useMemo, useState } from 'react';
import {
  FlatList,
  Pressable,
  ScrollView,
  RefreshControl,
  StyleSheet,
  Text,
  View,
  useWindowDimensions,
  Image,
} from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';

import { colors, radius, spacing, typography } from '../theme';
import { BookStoryCard } from '../components/BookStoryCard';

const likeIconUri = Image.resolveAssetSource(
  require('../../assets/book-story/bookstory-like.svg'),
).uri;
const commentIconUri = Image.resolveAssetSource(
  require('../../assets/book-story/bookstory-comment.svg'),
).uri;

type Promotion = {
  id: string;
  title: string;
  description: string;
};

type Group = {
  id: string;
  name: string;
};

type UserRecommendation = {
  id: string;
  username: string;
  subscribed: boolean;
};

type Post = {
  id: string;
  author: string;
  timeAgo: string;
  views: number;
  title: string;
  body: string;
  likes: number;
  comments: number;
  liked: boolean;
};

export function HomeScreen() {
  const { width } = useWindowDimensions();
  const [activeSlide, setActiveSlide] = useState(0);
  const [userRecommendations, setUserRecommendations] = useState<
    UserRecommendation[]
  >([
    { id: 'u1', username: 'hy_0716', subscribed: false },
    { id: 'u2', username: 'hy_0717', subscribed: false },
    { id: 'u3', username: 'hy_0718', subscribed: false },
  ]);
  const [posts, setPosts] = useState<Post[]>(() => buildPosts(6));
  const [refreshing, setRefreshing] = useState(false);

  const promotions = useMemo<Promotion[]>(
    () =>
      [
        {
          id: 'p1',
          title: '봄메이트',
          description: '5월 책 추천\n나의 돈키호테\n할인된 가격에\n만나보세요!',
        },
        {
          id: 'p2',
          title: '신간 소식',
          description: '새로운 이야기와\n서점 큐레이션을\n매주 만나보세요.',
        },
        {
          id: 'p3',
          title: '이벤트',
          description: '책모 구독자 전용\n굿즈 증정 이벤트',
        },
      ].slice(0, 5),
    [],
  );

  const joinedGroups: Group[] = [];

  const handleSubscribeToggle = (id: string) => {
    setUserRecommendations((prev) =>
      prev.map((user) =>
        user.id === id ? { ...user, subscribed: !user.subscribed } : user,
      ),
    );
  };

  const handleLoadMorePosts = () => {
    setPosts((prev) => [...prev, ...buildPosts(4, prev.length)]);
  };

  const handleToggleLike = (id: string) => {
    setPosts((prev) =>
      prev.map((post) => {
        if (post.id !== id) return post;
        const liked = !post.liked;
        const likes = liked ? post.likes + 1 : Math.max(0, post.likes - 1);
        return { ...post, liked, likes };
      }),
    );
  };

  const handleRefresh = () => {
    setRefreshing(true);
    setTimeout(() => {
      setPosts(buildPosts(6));
      setUserRecommendations((prev) =>
        prev.map((user) => ({ ...user, subscribed: false })),
      );
      setRefreshing(false);
    }, 700);
  };

  const renderPromotion = ({ item }: { item: Promotion }) => (
    <View
      style={[styles.promoCard, { width: width - spacing.xl * 2 }]}
      accessible
      accessibilityLabel={`${item.title} 프로모션`}
    >
      <View style={styles.promoGradient} />
      <View style={styles.promoContent}>
        <Text style={styles.promoTitle}>{item.title}</Text>
        <Text style={styles.promoDesc}>{item.description}</Text>
      </View>
    </View>
  );

  const header = (
    <View style={styles.headerContainer}>
      <Text style={styles.sectionTitle}>소식</Text>
      <ScrollView
        horizontal
        pagingEnabled
        showsHorizontalScrollIndicator={false}
        snapToAlignment="center"
        onScroll={(event) => {
          const index = Math.round(
            event.nativeEvent.contentOffset.x / (width - spacing.xl * 2),
          );
          setActiveSlide(index);
        }}
        scrollEventThrottle={16}
        decelerationRate="fast"
        contentContainerStyle={styles.carousel}
      >
        {promotions.map((promo) => (
          <View key={promo.id} style={styles.promoWrapper}>
            {renderPromotion({ item: promo })}
          </View>
        ))}
      </ScrollView>
      <View style={styles.dots}>
        {promotions.map((promo, index) => (
          <View
            key={promo.id}
            style={[
              styles.dot,
              index === activeSlide ? styles.dotActive : null,
            ]}
          />
        ))}
      </View>

      <View style={styles.columns}>
        <View style={[styles.columnCard, styles.columnLeft]}>
          <Text style={styles.columnTitle}>독서모임</Text>
          {joinedGroups.length === 0 ? (
            <View style={styles.emptyGroups}>
              <Text style={styles.emptyGroupsTitle}>
                다른 독서 모임도 둘러볼까요?
              </Text>
              <Pressable style={styles.secondaryButton}>
                <MaterialIcons
                  name="search"
                  size={18}
                  color={colors.gray6}
                />
                <Text style={styles.secondaryButtonText}>모임 검색하기</Text>
              </Pressable>
              <Pressable style={styles.primaryButton}>
                <MaterialIcons
                  name="add"
                  size={18}
                  color={colors.white}
                />
                <Text style={styles.primaryButtonText}>모임 생성하기</Text>
              </Pressable>
            </View>
          ) : (
            <View style={styles.groupList}>
              {joinedGroups.map((group) => (
                <View key={group.id} style={styles.groupItem}>
                  <Text style={styles.groupName}>{group.name}</Text>
                </View>
              ))}
            </View>
          )}
        </View>

        <View style={[styles.columnCard, styles.columnRight]}>
          <Text style={styles.columnTitle}>사용자 추천</Text>
          {userRecommendations.map((user) => (
            <View key={user.id} style={styles.userRow}>
              <View style={styles.userAvatar}>
                <MaterialIcons
                  name="person-outline"
                  size={20}
                  color={colors.gray5}
                />
              </View>
              <Text style={styles.username}>{user.username}</Text>
              <Pressable
                onPress={() => handleSubscribeToggle(user.id)}
                style={[
                  styles.chipButton,
                  user.subscribed ? styles.chipActive : styles.chipInactive,
                ]}
              >
                <Text
                  style={[
                    styles.chipText,
                    user.subscribed
                      ? styles.chipTextActive
                      : styles.chipTextInactive,
                  ]}
                >
                  {user.subscribed ? '구독중' : '구독'}
                </Text>
              </Pressable>
            </View>
          ))}
        </View>
      </View>
    </View>
  );

  return (
    <FlatList
      data={posts}
      keyExtractor={(item) => item.id}
      contentContainerStyle={styles.listContent}
      ListHeaderComponent={header}
      renderItem={({ item }) => (
        <BookStoryCard
          author={item.author}
          timeAgo={item.timeAgo}
          views={item.views}
          title={item.title}
          body={item.body}
          likes={item.likes}
          comments={item.comments}
          liked={item.liked}
          image={Image.resolveAssetSource(require('../../assets/tmp/little-prince.jpg')).uri}
          onToggleLike={() => handleToggleLike(item.id)}
        />
      )}
      onEndReached={handleLoadMorePosts}
      onEndReachedThreshold={0.3}
      showsVerticalScrollIndicator={false}
      ListFooterComponent={<View style={{ height: spacing.xxl }} />}
      refreshControl={
        <RefreshControl
          refreshing={refreshing}
          onRefresh={handleRefresh}
          tintColor={colors.primary1}
          colors={[colors.primary1]}
        />
      }
    />
  );
}

function buildPosts(count: number, offset = 0): Post[] {
  return Array.from({ length: count }).map((_, index) => {
    const id = offset + index + 1;
    return {
      id: `post-${id}`,
      author: `hy_071${(id % 10).toString()}`,
      timeAgo: `${2 + (id % 3)}분전`,
      views: 300 + id,
      title: '나는 나이트 왕자다',
      body:
        '나는 나이트 왕자다. 그 누가 숫자가 중요하다가 했던가. 세고 또 세는 그런 마법같은 경험을 한 사람은 놀랍도록 이 세상에 얼마 안된다! 나는 숲이 아닌 바다만큼...',
      likes: 1 + (id % 3),
      comments: 1 + (id % 2),
      liked: false,
    };
  });
}

const styles = StyleSheet.create({
  listContent: {
    paddingBottom: spacing.xl,
    backgroundColor: colors.background,
  },
  headerContainer: {
    paddingHorizontal: spacing.xl,
    paddingVertical: spacing.md,
    gap: spacing.md,
  },
  sectionTitle: {
    ...typography.body1_2,
    color: colors.gray6,
  },
  carousel: {
    paddingVertical: spacing.xs,
  },
  promoWrapper: {
    marginRight: spacing.sm,
  },
  promoCard: {
    borderRadius: radius.md,
    backgroundColor: colors.gray1,
    overflow: 'hidden',
    justifyContent: 'flex-end',
    padding: spacing.lg,
    aspectRatio: 16 / 10,
  },
  promoGradient: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(91, 71, 61, 0.35)',
  },
  promoContent: {
    gap: spacing.xs,
  },
  promoTitle: {
    ...typography.subhead3,
    color: colors.white,
  },
  promoDesc: {
    ...typography.body1_3,
    color: colors.white,
  },
  dots: {
    flexDirection: 'row',
    gap: spacing.xs,
    paddingHorizontal: spacing.xs,
  },
  dot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: colors.gray2,
  },
  dotActive: {
    backgroundColor: colors.primary1,
  },
  columns: {
    flexDirection: 'row',
    gap: spacing.md,
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
  },
  primaryButtonText: {
    ...typography.body1_2,
    color: colors.white,
  },
  groupList: {
    gap: spacing.xs,
  },
  groupItem: {
    backgroundColor: colors.subbrown4,
    borderRadius: radius.sm,
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.md,
  },
  groupName: {
    ...typography.body1_3,
    color: colors.gray6,
  },
  userRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  userAvatar: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: colors.gray1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  username: {
    ...typography.body1_3,
    color: colors.gray6,
    flex: 1,
  },
  chipButton: {
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
    borderRadius: radius.lg,
    borderWidth: 1,
  },
  chipActive: {
    backgroundColor: colors.primary1,
    borderColor: colors.primary1,
  },
  chipInactive: {
    backgroundColor: colors.white,
    borderColor: colors.primary1,
  },
  chipText: {
    ...typography.body2_2,
  },
  chipTextActive: {
    color: colors.white,
  },
  chipTextInactive: {
    color: colors.primary1,
  },
  postCard: {
    backgroundColor: colors.white,
    marginHorizontal: spacing.md,
    marginVertical: spacing.xs,
    padding: spacing.md,
    borderRadius: radius.lg,
    gap: spacing.sm,
    shadowColor: '#000',
    shadowOpacity: 0.06,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 2 },
    elevation: 2,
  },
  postHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  postAvatar: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: colors.gray1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  postMeta: {
    flex: 1,
  },
  postAuthor: {
    ...typography.body1_2,
    color: colors.gray6,
  },
  postSubtitle: {
    ...typography.body2_3,
    color: colors.gray4,
  },
  subscribeInline: {
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
    borderRadius: radius.lg,
    backgroundColor: colors.primary1,
  },
  postPlaceholder: {
    aspectRatio: 16 / 9,
    borderRadius: radius.md,
    backgroundColor: colors.gray1,
  },
  postTitle: {
    ...typography.subhead4_1,
    color: colors.gray6,
  },
  postBody: {
    ...typography.body1_3,
    color: colors.gray6,
  },
  postActions: {
    flexDirection: 'row',
    gap: spacing.lg,
  },
  postAction: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
  },
  postActionText: {
    ...typography.body2_3,
    color: colors.gray5,
  },
});
