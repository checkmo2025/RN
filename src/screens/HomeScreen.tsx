import { useCallback, useEffect, useRef, useState } from 'react';
import {
  FlatList,
  Pressable,
  RefreshControl,
  StyleSheet,
  Text,
  View,
  useWindowDimensions,
  Image,
  NativeScrollEvent,
  NativeSyntheticEvent,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';

import { colors, radius, spacing, typography } from '../theme';
import { ScreenLayout } from '../components/common/ScreenLayout';
import HomePromotions, { Promotion } from '../components/feature/home/HomePromotions';
import HomePostCard from '../components/feature/home/HomePostCard';
import SubscribeUserItem from '../components/feature/member/SubscribeUserItem';
import { useAuthGate } from '../contexts/AuthGateContext';
import { resolveHomeAccessPolicy } from '../constants/homeAccessPolicy';
import {
  fetchGuestAllBookStories,
  fetchBookStories,
  mergeGuestAllBookStoriesCache,
  toggleBookStoryLike,
  type RemoteStoryItem,
} from '../services/api/bookStoryApi';
import { fetchMyProfile, fetchRecommendedMembers, setFollowingMember } from '../services/api/memberApi';
import { fetchNewsCarousel } from '../services/api/newsApi';
import { ApiError } from '../services/api/http';
import { toKstTimeAgoLabel } from '../utils/date';
import { triggerSelectionHaptic } from '../utils/haptics';
import { normalizeRemoteImageUrl } from '../utils/image';
import { showToast } from '../utils/toast';

type Post = {
  id: string;
  remoteId: number;
  author: string;
  profileImageUrl?: string;
  mine: boolean;
  timeAgo: string;
  views: number;
  title: string;
  body: string;
  likes: number;
  comments: number;
  liked: boolean;
  subscribed: boolean;
  image?: string;
};

type UserRecommendation = {
  id: string;
  nickname: string;
  subscribed: boolean;
  profileImageUrl?: string;
  followingCount?: number;
  followerCount?: number;
};

const defaultPromotionImages = [
  Image.resolveAssetSource(require('../../assets/images/background.png')).uri,
  Image.resolveAssetSource(require('../../assets/images/news_sample2.png')).uri,
  Image.resolveAssetSource(require('../../assets/images/news_sample3.png')).uri,
];

const defaultPromotions: Promotion[] = [
  {
    id: 'p1',
    title: '봄메이트',
    description: '5월 책 추천\n나의 돈키호테\n할인된 가격에\n만나보세요!',
    imageUri: defaultPromotionImages[0],
  },
  {
    id: 'p2',
    title: '신간 소식',
    description: '새로운 이야기와\n서점 큐레이션을\n매주 만나보세요.',
    imageUri: defaultPromotionImages[1],
  },
  {
    id: 'p3',
    title: '이벤트',
    description: '책모 구독자 전용\n굿즈 증정 이벤트',
    imageUri: defaultPromotionImages[2],
  },
].slice(0, 5);

export function HomeScreen() {
  const navigation = useNavigation<any>();
  const { requireAuth, isLoggedIn } = useAuthGate();
  const accessPolicy = resolveHomeAccessPolicy({ isLoggedIn });
  const { width } = useWindowDimensions();
  const horizontalInset = width >= 768 ? spacing.xl : spacing.md;
  const promotionWidth = Math.max(260, width - horizontalInset * 2);
  const promotionStep = promotionWidth + spacing.sm;
  const [activeSlide, setActiveSlide] = useState(0);
  const [userRecommendations, setUserRecommendations] = useState<UserRecommendation[]>([]);
  const [posts, setPosts] = useState<Post[]>([]);
  const [myNickname, setMyNickname] = useState('');
  const [loadingPosts, setLoadingPosts] = useState(false);
  const [loadingMorePosts, setLoadingMorePosts] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [promotions, setPromotions] = useState<Promotion[]>(defaultPromotions);
  const loadingPostsRef = useRef(false);
  const loadingMorePostsRef = useRef(false);
  const hasNextPostsRef = useRef(true);
  const nextPostsCursorRef = useRef<number | null>(null);

  const loadRecommendedUsers = useCallback(async () => {
    if (!isLoggedIn) {
      setUserRecommendations([]);
      return;
    }

    try {
      const users = await fetchRecommendedMembers();
      if (users.length === 0) {
        setUserRecommendations([]);
        return;
      }
      setUserRecommendations(
        users.slice(0, 3).map((user) => ({
          id: user.nickname,
          nickname: user.nickname,
          profileImageUrl: user.profileImageUrl,
          followingCount: user.followingCount,
          followerCount: user.followerCount,
          subscribed: false,
        })),
      );
    } catch (error) {
      if (error instanceof ApiError && error.status === 401) {
        setUserRecommendations([]);
        return;
      }
      if (!(error instanceof ApiError)) {
        showToast('추천 사용자를 불러오지 못했습니다.');
      }
      setUserRecommendations([]);
    }
  }, [isLoggedIn]);

  useEffect(() => {
    void loadRecommendedUsers();
  }, [loadRecommendedUsers]);

  useEffect(() => {
    if (!isLoggedIn) {
      setMyNickname('');
      return;
    }

    let cancelled = false;

    const loadMyNickname = async () => {
      try {
        const profile = await fetchMyProfile();
        if (cancelled) return;
        setMyNickname(profile?.nickname?.trim() ?? '');
      } catch (error) {
        if (cancelled) return;
        if (error instanceof ApiError && error.status === 401) {
          setMyNickname('');
          return;
        }
        setMyNickname('');
      }
    };

    void loadMyNickname();

    return () => {
      cancelled = true;
    };
  }, [isLoggedIn]);

  const loadPromotions = useCallback(async () => {
    try {
      const news = await fetchNewsCarousel(5);
      if (news.length === 0) {
        setPromotions(defaultPromotions);
        return;
      }
      setPromotions(
        news.map((item, index) => ({
          id: `news-promo-${item.id}`,
          title: item.title,
          description:
            item.excerpt.trim() || '새로운 소식을 확인해보세요.',
          imageUri:
            item.thumbnailUrl ??
            defaultPromotionImages[index % defaultPromotionImages.length],
        })),
      );
    } catch (error) {
      if (error instanceof ApiError) return;
      showToast('소식을 불러오지 못했습니다.');
      setPromotions(defaultPromotions);
    }
  }, []);

  useEffect(() => {
    void loadPromotions();
  }, [loadPromotions]);

  const loadPosts = useCallback(
    async ({ reset = false, forceRefresh = false }: { reset?: boolean; forceRefresh?: boolean } = {}) => {
      if (!accessPolicy.canViewBookStoryFeed) return;
      if (reset) {
        if (loadingPostsRef.current) return;
        loadingPostsRef.current = true;
        setLoadingPosts(true);
      } else {
        if (loadingMorePostsRef.current || !hasNextPostsRef.current) return;
        loadingMorePostsRef.current = true;
        setLoadingMorePosts(true);
      }

      try {
        const cursorId = reset ? undefined : nextPostsCursorRef.current ?? undefined;
        const isGuestAll = !isLoggedIn;
        const feed =
          !isLoggedIn && reset
            ? await fetchGuestAllBookStories({ forceRefresh })
            : await fetchBookStories('ALL', cursorId, { viewerAuthenticated: isLoggedIn });
        if (isGuestAll && !reset) {
          mergeGuestAllBookStoriesCache(feed);
        }
        const mapped = feed.items.map(mapRemoteStoryToPost);

        setPosts((prev) => {
          if (reset) return mapped;
          if (mapped.length === 0) return prev;
          const existingIds = new Set(prev.map((item) => item.remoteId));
          const append = mapped.filter((item) => !existingIds.has(item.remoteId));
          return append.length > 0 ? [...prev, ...append] : prev;
        });
        hasNextPostsRef.current = feed.hasNext;
        nextPostsCursorRef.current = feed.nextCursor;
      } catch (error) {
        if (reset && !(error instanceof ApiError)) {
          showToast('책이야기 목록을 불러오지 못했습니다.');
        }
      } finally {
        if (reset) {
          loadingPostsRef.current = false;
          setLoadingPosts(false);
        } else {
          loadingMorePostsRef.current = false;
          setLoadingMorePosts(false);
        }
      }
    },
    [accessPolicy.canViewBookStoryFeed, isLoggedIn],
  );

  useEffect(() => {
    void loadPosts({ reset: true });
  }, [loadPosts]);

  const handleSubscribeToggle = (id: string) => {
    if (!accessPolicy.canUseRecommendedSubscribe) {
      requireAuth();
      return;
    }

    requireAuth(() => {
      const target = userRecommendations.find((user) => user.id === id);
      if (!target) return;
      const nextSubscribed = !target.subscribed;

      triggerSelectionHaptic();
      setUserRecommendations((prev) =>
        prev.map((user) =>
          user.id === id ? { ...user, subscribed: nextSubscribed } : user,
        ),
      );

      const submit = async () => {
        try {
          await setFollowingMember(target.nickname, nextSubscribed);
          showToast(nextSubscribed ? '구독했습니다.' : '구독을 취소했습니다.');
        } catch {
          setUserRecommendations((prev) =>
            prev.map((user) =>
              user.id === id ? { ...user, subscribed: !nextSubscribed } : user,
            ),
          );
          showToast('구독 상태를 변경하지 못했습니다.');
        }
      };
      void submit();
    });
  };

  const handleLoadMorePosts = () => {
    void loadPosts();
  };

  const handleToggleLike = (id: string) => {
    if (!accessPolicy.canUseBookStoryLike) {
      requireAuth();
      return;
    }

    requireAuth(() => {
      const target = posts.find((post) => post.id === id);
      if (!target) return;
      const nextLiked = !target.liked;

      triggerSelectionHaptic();
      setPosts((prev) =>
        prev.map((post) => {
          if (post.id !== id) return post;
          return {
            ...post,
            liked: nextLiked,
            likes: nextLiked ? post.likes + 1 : Math.max(0, post.likes - 1),
          };
        }),
      );

      const submit = async () => {
        try {
          await toggleBookStoryLike(target.remoteId);
        } catch {
          setPosts((prev) =>
            prev.map((post) => {
              if (post.id !== id) return post;
              return {
                ...post,
                liked: !nextLiked,
                likes: !nextLiked ? post.likes + 1 : Math.max(0, post.likes - 1),
              };
            }),
          );
          showToast('좋아요 상태를 변경하지 못했습니다.');
        }
      };
      void submit();
    });
  };

  const handleTogglePostSubscribe = (id: string) => {
    if (!accessPolicy.canUseBookStorySubscribe) {
      requireAuth();
      return;
    }

    requireAuth(() => {
      const target = posts.find((post) => post.id === id);
      if (!target) return;
      const nextSubscribed = !target.subscribed;

      triggerSelectionHaptic();
      setPosts((prev) =>
        prev.map((post) =>
          post.id === id ? { ...post, subscribed: nextSubscribed } : post,
        ),
      );

      const submit = async () => {
        try {
          await setFollowingMember(target.author, nextSubscribed);
          showToast(nextSubscribed ? '구독했습니다.' : '구독을 취소했습니다.');
        } catch {
          setPosts((prev) =>
            prev.map((post) =>
              post.id === id ? { ...post, subscribed: !nextSubscribed } : post,
            ),
          );
          showToast('구독 상태를 변경하지 못했습니다.');
        }
      };
      void submit();
    });
  };

  const handleRefresh = () => {
    setRefreshing(true);
    const refresh = async () => {
      await Promise.all([
        loadRecommendedUsers(),
        loadPosts({ reset: true, forceRefresh: true }),
        loadPromotions(),
      ]);
      setRefreshing(false);
    };
    void refresh();
  };

  const handlePromotionScroll = (event: NativeSyntheticEvent<NativeScrollEvent>) => {
    const rawIndex = Math.round(event.nativeEvent.contentOffset.x / promotionStep);
    const safeIndex = Math.max(0, Math.min(promotions.length - 1, rawIndex));
    if (safeIndex !== activeSlide) {
      setActiveSlide(safeIndex);
    }
  };

  const openUserProfile = useCallback(
    (nickname: string) => {
      const memberNickname = nickname.trim();
      if (!memberNickname) return;
      if (isLoggedIn && myNickname && memberNickname === myNickname) {
        navigation.navigate('My');
        return;
      }
      navigation.navigate('UserProfile', { memberNickname, fromScreen: 'Home' });
    },
    [isLoggedIn, myNickname, navigation],
  );

  const openPostDetail = useCallback(
    (id: string) => {
      const target = posts.find((post) => post.id === id);
      if (!target || typeof target.remoteId !== 'number') return;
      navigation.navigate('Story', { openStoryId: target.remoteId });
    },
    [navigation, posts],
  );

  const header = (
    <View style={styles.headerContainer}>
      <View style={[styles.contentBlock, { paddingHorizontal: horizontalInset }]}>
        <Text style={styles.sectionTitle}>소식</Text>
      </View>
      <HomePromotions
        promotions={promotions}
        horizontalInset={horizontalInset}
        promotionWidth={promotionWidth}
        promotionStep={promotionStep}
        activeSlide={activeSlide}
        onScroll={handlePromotionScroll}
      />
      {isLoggedIn ? (
        <View style={[styles.contentBlock, { paddingHorizontal: horizontalInset }]}>
          <View style={styles.userRecommendationCard}>
            <Text style={styles.sectionTitle}>사용자 추천</Text>
            <View style={styles.userRecommendationList}>
              {userRecommendations.length > 0 ? (
                userRecommendations.map((user) => (
                  <SubscribeUserItem
                    key={user.id}
                    nickname={user.nickname}
                    profileImageUrl={user.profileImageUrl}
                    followingCount={user.followingCount}
                    followerCount={user.followerCount}
                    subscribed={user.subscribed}
                    onPressProfile={() => openUserProfile(user.nickname)}
                    onPressSubscribe={() => handleSubscribeToggle(user.id)}
                  />
                ))
              ) : (
                <Text style={styles.emptyUserText}>추천 사용자가 없습니다.</Text>
              )}
            </View>
          </View>
        </View>
      ) : null}

      <View style={[styles.contentBlock, { paddingHorizontal: horizontalInset }]}>
        <Text style={styles.sectionTitle}>책이야기</Text>
      </View>
      <View style={styles.headerToStorySpacer} />
    </View>
  );

  return (
    <ScreenLayout title="책모 홈">
      <View style={styles.screenBody}>
        <FlatList
          data={posts}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.listContent}
          ListHeaderComponent={header}
          ItemSeparatorComponent={() => <View style={styles.postItemSeparator} />}
          ListEmptyComponent={
            !loadingPosts ? (
              <Text style={styles.emptyPostText}>표시할 책이야기가 없습니다.</Text>
            ) : null
          }
          ListFooterComponent={
            loadingMorePosts ? <Text style={styles.loadingPostText}>불러오는 중...</Text> : null
          }
          renderItem={({ item }) => (
            <HomePostCard
              post={item}
              viewerIsLoggedIn={isLoggedIn}
              onPress={openPostDetail}
              onToggleLike={handleToggleLike}
              onToggleSubscribe={handleTogglePostSubscribe}
              onPressAuthor={openUserProfile}
            />
          )}
          onEndReached={handleLoadMorePosts}
          onEndReachedThreshold={0.3}
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={handleRefresh}
              tintColor={colors.primary1}
              colors={[colors.primary1]}
            />
          }
        />
      </View>
    </ScreenLayout>
  );
}

function mapRemoteStoryToPost(item: RemoteStoryItem): Post {
  return {
    id: `post-${item.id}`,
    remoteId: item.id,
    author: item.nickname,
    profileImageUrl: normalizeRemoteImageUrl(item.profileImageUrl),
    mine: item.mine ?? false,
    timeAgo: toKstTimeAgoLabel(item.createdAt),
    views: item.viewCount,
    title: item.title,
    body: item.description,
    likes: item.likeCount,
    comments: item.commentCount,
    liked: item.liked,
    subscribed: item.following,
    image: normalizeRemoteImageUrl(item.bookInfo?.imgUrl),
  };
}

const styles = StyleSheet.create({
  screenBody: {
    flex: 1,
  },
  listContent: {
    backgroundColor: colors.background,
    paddingTop: spacing.md,
  },
  postItemSeparator: {
    height: spacing.sm,
  },
  headerContainer: {
    gap: spacing.md,
  },
  userRecommendationCard: {
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
  userRecommendationList: {
    gap: spacing.sm,
  },
  emptyUserText: {
    ...typography.body2_2,
    color: colors.gray4,
  },
  emptyPostText: {
    ...typography.body2_2,
    color: colors.gray4,
    textAlign: 'center',
    paddingVertical: spacing.lg,
  },
  loadingPostText: {
    ...typography.body2_3,
    color: colors.gray4,
    textAlign: 'center',
    paddingVertical: spacing.md,
  },
  headerToStorySpacer: {
    height: spacing.sm,
  },
  contentBlock: {
    width: '100%',
  },
  sectionTitle: {
    ...typography.body1_2,
    color: colors.gray6,
  },
});
