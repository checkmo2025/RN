import { useMemo, useState, useCallback, useEffect, useRef } from 'react';
import {
  Animated,
  Image,
  PanResponder,
  type PanResponderGestureState,
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  useWindowDimensions,
  View,
} from 'react-native';
import { useNavigation, useRoute } from '@react-navigation/native';
import { MaterialIcons } from '@expo/vector-icons';
import { SvgUri } from 'react-native-svg';

import { colors, radius, spacing, typography } from '../theme';
import { navigateToHome } from '../navigation/navigateToHome';
import { DefaultProfileAvatar } from '../components/common/DefaultProfileAvatar';
import { ScreenLayout } from '../components/common/ScreenLayout';
import { ReportMemberModal, type ReportMemberModalState } from '../components/common/ReportMemberModal';
import { useAuthGate } from '../contexts/AuthGateContext';
import { triggerSelectionHaptic } from '../utils/haptics';
import { showToast } from '../utils/toast';
import { ApiError } from '../services/api/http';
import { fetchMemberLikedBooks, type MemberLikedBookItem } from '../services/api/bookApi';
import {
  fetchMemberFollowers,
  fetchMemberFollowings,
  fetchMemberProfile,
  reportMember,
  setFollowingMember,
  type MemberReportType,
  type MemberProfile,
} from '../services/api/memberApi';
import {
  fetchMemberBookStories,
  type RemoteStoryItem,
} from '../services/api/bookStoryApi';
import { normalizeRemoteImageUrl } from '../utils/image';

type TabKey = '책 이야기' | '서재' | '모임';

type StoryCard = {
  id: string;
  remoteId: number;
  title: string;
  excerpt: string;
  likes: number;
  comments: number;
  imageUrl?: string;
};

type BookCard = {
  id: string;
  title: string;
  author: string;
  imageUrl?: string;
};

type GroupItem = {
  id: string;
  name: string;
};

type FollowUser = {
  nickname: string;
  profileImageUrl?: string;
  following: boolean;
};

const tabs: TabKey[] = ['책 이야기', '서재', '모임'];
const likeIconUri = Image.resolveAssetSource(
  require('../../assets/book-story/bookstory-like.svg'),
).uri;
const commentIconUri = Image.resolveAssetSource(
  require('../../assets/book-story/bookstory-comment.svg'),
).uri;
const PROFILE_BACK_EDGE_WIDTH = 32;
const PROFILE_BACK_ACTIVATE_DISTANCE = 12;
const PROFILE_BACK_ACTIVATE_MAX_DY = 18;
const PROFILE_BACK_TRIGGER_DISTANCE = 96;
const PROFILE_BACK_TRIGGER_MAX_DY = 72;
const categoryLabelByCode: Record<string, string> = {
  FICTION_POETRY_DRAMA: '소설/시/희곡',
  ESSAY: '에세이',
  HUMANITIES: '인문학',
  SOCIAL_SCIENCE: '사회과학',
  POLITICS_DIPLOMACY_DEFENSE: '정치/외교/국방',
  ECONOMY_MANAGEMENT: '경제/경영',
  SELF_DEVELOPMENT: '자기계발',
  HISTORY_CULTURE: '역사/문화',
  SCIENCE: '과학',
  COMPUTER_IT: '컴퓨터/IT',
  ART_POP_CULTURE: '예술/대중문화',
  TRAVEL: '여행',
  FOREIGN_LANGUAGE: '외국어',
  CHILDREN_BOOKS: '어린이/청소년',
  RELIGION_PHILOSOPHY: '종교/철학',
};

function mapRemoteStoryToCard(item: RemoteStoryItem): StoryCard {
  return {
    id: `story-${item.id}`,
    remoteId: item.id,
    title: item.title,
    excerpt: item.description,
    likes: item.likeCount,
    comments: item.commentCount,
    imageUrl: normalizeRemoteImageUrl(item.bookInfo?.imgUrl),
  };
}

async function fetchAllFollowUsers(
  loader: (cursorId?: number) => Promise<{
    items: Array<{
      nickname?: string;
      profileImageUrl?: string;
      following?: boolean;
    }>;
    hasNext: boolean;
    nextCursor: number | null;
  }>,
): Promise<FollowUser[]> {
  let cursorId: number | undefined;
  const all: FollowUser[] = [];

  for (let i = 0; i < 20; i += 1) {
    const result = await loader(cursorId);
    all.push(
      ...result.items
        .map((item) => ({
          nickname: typeof item.nickname === 'string' ? item.nickname : '',
          profileImageUrl: normalizeRemoteImageUrl(item.profileImageUrl),
          following: Boolean(item.following),
        }))
        .filter((item) => item.nickname.length > 0),
    );

    if (!result.hasNext || typeof result.nextCursor !== 'number') break;
    cursorId = result.nextCursor;
  }

  const uniqueByNickname = new Map<string, FollowUser>();
  all.forEach((item) => {
    uniqueByNickname.set(item.nickname, item);
  });

  return Array.from(uniqueByNickname.values());
}

export function UserProfileScreen() {
  const navigation = useNavigation<any>();
  const route = useRoute<any>();
  const { requireAuth } = useAuthGate();
  const { width: screenWidth } = useWindowDimensions();
  const translateX = useRef(new Animated.Value(0)).current;
  const [activeTab, setActiveTab] = useState<TabKey>('책 이야기');
  const [refreshing, setRefreshing] = useState(false);
  const [submittingFollow, setSubmittingFollow] = useState(false);
  const [submittingReport, setSubmittingReport] = useState(false);
  const [profileLoading, setProfileLoading] = useState(true);
  const [profile, setProfile] = useState<MemberProfile | null>(null);
  const [stories, setStories] = useState<StoryCard[]>([]);
  const [books, setBooks] = useState<BookCard[]>([]);
  const [loadingBooks, setLoadingBooks] = useState(false);
  const [followerUsers, setFollowerUsers] = useState<FollowUser[]>([]);
  const [followingUsers, setFollowingUsers] = useState<FollowUser[]>([]);
  const [showFollowPage, setShowFollowPage] = useState(false);
  const [activeFollowTab, setActiveFollowTab] = useState<'FOLLOWER' | 'FOLLOWING'>('FOLLOWER');
  const [loadingFollowUsers, setLoadingFollowUsers] = useState(false);
  const [togglingFollowNickname, setTogglingFollowNickname] = useState<string | null>(null);
  const [reportModal, setReportModal] = useState<ReportMemberModalState | null>(null);
  const memberNickname =
    typeof route.params?.memberNickname === 'string' && route.params.memberNickname.trim().length > 0
      ? route.params.memberNickname.trim()
      : '_hy_0716';

  const groups: GroupItem[] = useMemo(() => [], []);

  useEffect(() => {
    setShowFollowPage(false);
    setActiveFollowTab('FOLLOWER');
    setFollowerUsers([]);
    setFollowingUsers([]);
    setTogglingFollowNickname(null);
    setBooks([]);
  }, [memberNickname]);

  const handleGoBack = useCallback(() => {
    if (showFollowPage) {
      setShowFollowPage(false);
      return;
    }

    if (navigation.canGoBack()) {
      navigation.goBack();
      return;
    }
    navigateToHome(navigation);
  }, [navigation, showFollowPage]);

  const loadProfile = useCallback(async () => {
    const [profileResult, storiesResult] = await Promise.all([
      fetchMemberProfile(memberNickname),
      fetchMemberBookStories(memberNickname),
    ]);

    setProfile(profileResult);
    setStories(storiesResult.items.map(mapRemoteStoryToCard));
  }, [memberNickname]);

  const mapMemberLikedBooksToCards = useCallback((items: MemberLikedBookItem[]): BookCard[] => {
    const mapped = items.map((book, index) => {
      const isbn = book.isbn?.trim();
      const title = book.title?.trim() || '책 제목';
      const author = book.author?.trim() || '작가 미상';
      const id = isbn || `${title}-${author}-${index}`;

      return {
        id,
        title,
        author,
        imageUrl: normalizeRemoteImageUrl(book.imgUrl),
      };
    });

    const uniqueById = new Map<string, BookCard>();
    mapped.forEach((item) => {
      if (!uniqueById.has(item.id)) {
        uniqueById.set(item.id, item);
      }
    });
    return Array.from(uniqueById.values());
  }, []);

  const loadLikedBooks = useCallback(async () => {
    setLoadingBooks(true);
    try {
      let cursorId: number | undefined;
      const all: MemberLikedBookItem[] = [];

      for (let i = 0; i < 20; i += 1) {
        const result = await fetchMemberLikedBooks(memberNickname, cursorId);
        all.push(...result.items);

        if (!result.hasNext || typeof result.nextCursor !== 'number') break;
        cursorId = result.nextCursor;
      }

      setBooks(mapMemberLikedBooksToCards(all));
    } catch (error) {
      setBooks([]);
      if (!(error instanceof ApiError)) {
        showToast('서재를 불러오지 못했습니다.');
      }
    } finally {
      setLoadingBooks(false);
    }
  }, [mapMemberLikedBooksToCards, memberNickname]);

  const loadFollowUsers = useCallback(async () => {
    setLoadingFollowUsers(true);
    try {
      const [followers, followings] = await Promise.all([
        fetchAllFollowUsers((cursorId) => fetchMemberFollowers(memberNickname, cursorId)),
        fetchAllFollowUsers((cursorId) => fetchMemberFollowings(memberNickname, cursorId)),
      ]);
      setFollowerUsers(followers);
      setFollowingUsers(followings);
    } catch (error) {
      if (!(error instanceof ApiError)) {
        showToast('구독 목록을 불러오지 못했습니다.');
      }
    } finally {
      setLoadingFollowUsers(false);
    }
  }, [memberNickname]);

  useEffect(() => {
    let cancelled = false;

    const load = async () => {
      setProfileLoading(true);
      try {
        await Promise.all([loadProfile(), loadLikedBooks()]);
      } catch (error) {
        if (cancelled) return;
        if (!(error instanceof ApiError)) {
          showToast('프로필을 불러오지 못했습니다.');
        }
      } finally {
        if (!cancelled) {
          setProfileLoading(false);
        }
      }
    };

    void load();

    return () => {
      cancelled = true;
    };
  }, [loadLikedBooks, loadProfile]);

  const handleRefresh = useCallback(() => {
    setRefreshing(true);

    const refresh = async () => {
      try {
        await Promise.all([loadProfile(), loadLikedBooks()]);
      } catch (error) {
        if (!(error instanceof ApiError)) {
          showToast('프로필을 새로고침하지 못했습니다.');
        }
      } finally {
        setRefreshing(false);
      }
    };

    void refresh();
  }, [loadLikedBooks, loadProfile]);

  const handleFollowPageRefresh = useCallback(() => {
    setRefreshing(true);

    const refresh = async () => {
      try {
        await loadFollowUsers();
      } finally {
        setRefreshing(false);
      }
    };

    void refresh();
  }, [loadFollowUsers]);

  const handleSubscribe = useCallback(() => {
    if (!profile || submittingFollow) return;

    const nextFollowing = !(profile.following ?? false);
    triggerSelectionHaptic();
    setSubmittingFollow(true);

    const submit = async () => {
      try {
        await setFollowingMember(memberNickname, nextFollowing);
        showToast(nextFollowing ? '구독했습니다.' : '구독을 취소했습니다.');
        await loadProfile();
      } catch (error) {
        if (!(error instanceof ApiError)) {
          showToast('구독 상태를 변경하지 못했습니다.');
        }
      } finally {
        setSubmittingFollow(false);
      }
    };

    void submit();
  }, [loadProfile, memberNickname, profile, submittingFollow]);

  const following = profile?.following ?? false;
  const profileName = profile?.nickname?.trim() || memberNickname;
  const profileDesc =
    profile?.description?.trim() ||
    '소개글이 없습니다.';
  const profileCategories = useMemo(
    () =>
      (profile?.categories ?? []).map((code) => categoryLabelByCode[code] ?? code),
    [profile?.categories],
  );
  const followerCount = profile?.followerCount ?? followerUsers.length;
  const followingCount = profile?.followingCount ?? followingUsers.length;
  const activeFollowUsers = activeFollowTab === 'FOLLOWER' ? followerUsers : followingUsers;

  const openFollowerList = useCallback(() => {
    requireAuth(() => {
      setActiveFollowTab('FOLLOWER');
      setShowFollowPage(true);
      void loadFollowUsers();
    });
  }, [loadFollowUsers, requireAuth]);

  const openFollowingList = useCallback(() => {
    requireAuth(() => {
      setActiveFollowTab('FOLLOWING');
      setShowFollowPage(true);
      void loadFollowUsers();
    });
  }, [loadFollowUsers, requireAuth]);

  const openMemberProfile = useCallback(
    (nickname: string) => {
      const targetNickname = nickname.trim();
      if (!targetNickname) return;
      if (targetNickname === memberNickname) return;
      navigation.navigate('UserProfile', { memberNickname: targetNickname, fromScreen: 'UserProfile' });
    },
    [memberNickname, navigation],
  );

  const handleToggleFollowUser = useCallback(
    (nickname: string, nextFollowing: boolean) => {
      const targetNickname = nickname.trim();
      if (!targetNickname) return;
      if (togglingFollowNickname === targetNickname) return;

      const prevFollowerUsers = followerUsers;
      const prevFollowingUsers = followingUsers;

      setTogglingFollowNickname(targetNickname);
      setFollowerUsers((prev) =>
        prev.map((item) =>
          item.nickname === targetNickname ? { ...item, following: nextFollowing } : item,
        ),
      );
      setFollowingUsers((prev) => {
        if (nextFollowing) {
          const target = prev.find((item) => item.nickname === targetNickname);
          if (target) {
            return prev.map((item) =>
              item.nickname === targetNickname ? { ...item, following: true } : item,
            );
          }
          const fromFollower = prevFollowerUsers.find((item) => item.nickname === targetNickname);
          if (fromFollower) {
            return [{ ...fromFollower, following: true }, ...prev];
          }
          return [{ nickname: targetNickname, following: true }, ...prev];
        }
        return prev.filter((item) => item.nickname !== targetNickname);
      });

      const submit = async () => {
        try {
          await setFollowingMember(targetNickname, nextFollowing);
          showToast(nextFollowing ? '구독했습니다.' : '구독을 취소했습니다.');
        } catch (error) {
          setFollowerUsers(prevFollowerUsers);
          setFollowingUsers(prevFollowingUsers);
          if (!(error instanceof ApiError)) {
            showToast('구독 상태를 변경하지 못했습니다.');
          }
        } finally {
          setTogglingFollowNickname((prev) => (prev === targetNickname ? null : prev));
        }
      };

      void submit();
    },
    [followerUsers, followingUsers, togglingFollowNickname],
  );

  const handleOpenReportModal = useCallback(() => {
    setReportModal({
      nickname: profileName,
      profileImageUrl: profile?.profileImageUrl,
      initialType: 'GENERAL',
    });
  }, [profile?.profileImageUrl, profileName]);

  const handleCloseReportModal = useCallback(() => {
    if (submittingReport) return;
    setReportModal(null);
  }, [submittingReport]);

  const handleSubmitReport = useCallback(
    (payload: { reportType: MemberReportType; content?: string }) => {
      requireAuth(() => {
        const submit = async () => {
          setSubmittingReport(true);
          try {
            await reportMember({
              reportedMemberNickname: memberNickname,
              reportType: payload.reportType,
              content: payload.content,
            });
            setReportModal(null);
            showToast('신고가 접수되었습니다.');
          } catch (error) {
            if (!(error instanceof ApiError)) {
              showToast('신고 접수에 실패했습니다.');
            }
          } finally {
            setSubmittingReport(false);
          }
        };
        void submit();
      });
    },
    [memberNickname, requireAuth],
  );

  const handleOpenStoryDetail = useCallback(
    (story: StoryCard) => {
      if (!Number.isInteger(story.remoteId) || story.remoteId <= 0) {
        showToast('유효한 책이야기 정보가 없습니다.');
        return;
      }

      const chain: any[] = [];
      const visited = new Set<any>();
      let current: any = navigation;

      while (current && !visited.has(current)) {
        chain.push(current);
        visited.add(current);
        current = current.getParent?.();
      }

      for (const nav of chain) {
        const routeNames: string[] = nav?.getState?.()?.routeNames ?? [];

        if (routeNames.includes('Tabs')) {
          nav.navigate('Tabs', { screen: 'Story' });

          // Ensure detail params are applied after switching from the stack screen to tabs.
          setTimeout(() => {
            nav.navigate('Tabs', {
              screen: 'Story',
              params: { openStoryId: story.remoteId },
            });
          }, 0);
          return;
        }

        if (routeNames.includes('Story')) {
          nav.navigate('Story', { openStoryId: story.remoteId });
          return;
        }
      }

      showToast('책이야기 화면으로 이동하지 못했습니다.');
    },
    [navigation],
  );

  const renderStoryCards = () => (
    <View style={[styles.gridContent, styles.cardWrap]}>
      {stories.length === 0 ? <Text style={styles.emptyText}>작성한 책이야기가 없습니다.</Text> : null}
      {stories.map((story) => (
        <Pressable
          key={story.id}
          style={({ pressed }) => [styles.storyCard, pressed && styles.pressed]}
          onPress={() => handleOpenStoryDetail(story)}
        >
          <View style={styles.storyThumb}>
            {story.imageUrl ? (
              <Image source={{ uri: story.imageUrl }} style={styles.storyThumbImage} resizeMode="cover" />
            ) : null}
          </View>
          <Text style={styles.storyTitle}>{story.title}</Text>
          <Text style={styles.storyExcerpt} numberOfLines={2}>
            {story.excerpt}
          </Text>
          <View style={styles.storyActions}>
            <View style={styles.inlineAction}>
              <SvgUri uri={likeIconUri} width={18} height={18} />
              <Text style={styles.inlineText}>{story.likes}</Text>
            </View>
            <View style={styles.actionDivider} />
            <View style={styles.inlineAction}>
              <SvgUri uri={commentIconUri} width={18} height={18} />
              <Text style={styles.inlineText}>{story.comments}</Text>
            </View>
          </View>
        </Pressable>
      ))}
    </View>
  );

  const renderLibraryCards = () => (
    <View style={[styles.gridContent, styles.bookWrap]}>
      {loadingBooks ? <Text style={styles.emptyText}>서재를 불러오는 중...</Text> : null}
      {!loadingBooks && books.length === 0 ? <Text style={styles.emptyText}>공개된 서재가 없습니다.</Text> : null}
      {books.map((book) => (
        <View key={book.id} style={styles.bookCard}>
          <View style={styles.bookThumb}>
            {book.imageUrl ? (
              <Image source={{ uri: book.imageUrl }} style={styles.bookThumbImage} resizeMode="cover" />
            ) : null}
            <View style={styles.bookLikeBadge}>
              <MaterialIcons name="favorite" size={18} color={colors.secondary1} />
            </View>
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
    <View style={styles.listContainer}>
      {groups.length === 0 ? <Text style={styles.emptyText}>공개된 모임이 없습니다.</Text> : null}
      {groups.map((group) => (
        <View key={group.id} style={styles.groupRow}>
          <Text style={styles.groupName}>{group.name}</Text>
          <Pressable style={styles.groupMenuButton} hitSlop={8}>
            <MaterialIcons name="more-vert" size={18} color={colors.gray4} />
          </Pressable>
        </View>
      ))}
    </View>
  );

  const renderTabContent = () => {
    if (activeTab === '책 이야기') return renderStoryCards();
    if (activeTab === '서재') return renderLibraryCards();
    return renderMeetings();
  };

  const renderFollowPage = () => (
    <View style={styles.followPageWrap}>
      <Pressable
        style={({ pressed }) => [styles.breadcrumbRow, pressed && styles.pressed]}
        onPress={() => setShowFollowPage(false)}
      >
        <MaterialIcons name="chevron-left" size={18} color={colors.gray5} />
        <Text style={styles.breadcrumbText}>뒤로가기</Text>
      </Pressable>

      <View style={styles.followProfileArea}>
        <View style={styles.followProfileAvatar}>
          {profile?.profileImageUrl ? (
            <Image source={{ uri: profile.profileImageUrl }} style={styles.followProfileAvatarImage} />
          ) : (
            <DefaultProfileAvatar size={92} />
          )}
        </View>
        <Text style={styles.followProfileName}>{profileName}</Text>
      </View>

      <View style={styles.followTabRow}>
        <Pressable
          style={[styles.followTabButton, activeFollowTab === 'FOLLOWER' && styles.followTabActive]}
          onPress={() => setActiveFollowTab('FOLLOWER')}
        >
          <Text style={[styles.followTabText, activeFollowTab === 'FOLLOWER' && styles.followTabTextActive]}>
            구독자 {followerCount}
          </Text>
        </Pressable>
        <Pressable
          style={[styles.followTabButton, activeFollowTab === 'FOLLOWING' && styles.followTabActive]}
          onPress={() => setActiveFollowTab('FOLLOWING')}
        >
          <Text style={[styles.followTabText, activeFollowTab === 'FOLLOWING' && styles.followTabTextActive]}>
            구독중 {followingCount}
          </Text>
        </Pressable>
      </View>

      <View style={styles.followListWrap}>
        {loadingFollowUsers ? (
          <Text style={styles.emptyText}>구독 목록을 불러오는 중...</Text>
        ) : null}
        {!loadingFollowUsers && activeFollowUsers.length === 0 ? (
          <Text style={styles.emptyText}>표시할 사용자가 없습니다.</Text>
        ) : null}

        {activeFollowUsers.map((user) => {
          const toggling = togglingFollowNickname === user.nickname;
          return (
            <View key={`${activeFollowTab}-${user.nickname}`} style={styles.followUserRow}>
              <Pressable
                style={({ pressed }) => [styles.followUserMeta, pressed && styles.pressed]}
                onPress={() => openMemberProfile(user.nickname)}
              >
                <View style={styles.followUserAvatar}>
                  {user.profileImageUrl ? (
                    <Image source={{ uri: user.profileImageUrl }} style={styles.followUserAvatarImage} />
                  ) : (
                    <DefaultProfileAvatar size={28} />
                  )}
                </View>
                <Text style={styles.followUserName}>{user.nickname}</Text>
              </Pressable>

              <Pressable
                style={[
                  styles.followButton,
                  user.following ? styles.followButtonActive : styles.followButtonInactive,
                  toggling && styles.followButtonDisabled,
                ]}
                onPress={() => handleToggleFollowUser(user.nickname, !user.following)}
                disabled={toggling}
              >
                <Text
                  style={[
                    styles.followButtonText,
                    user.following ? styles.followButtonTextActive : styles.followButtonTextInactive,
                  ]}
                >
                  {toggling ? '처리 중...' : user.following ? '구독중' : '구독'}
                </Text>
              </Pressable>
            </View>
          );
        })}
      </View>
    </View>
  );

  const isBackSwipe = useCallback((gestureState: PanResponderGestureState) => {
    return (
      gestureState.x0 <= PROFILE_BACK_EDGE_WIDTH
      && gestureState.dx > PROFILE_BACK_ACTIVATE_DISTANCE
      && Math.abs(gestureState.dy) < PROFILE_BACK_ACTIVATE_MAX_DY
    );
  }, []);

  const backSwipeResponder = useMemo(
    () =>
      PanResponder.create({
        onStartShouldSetPanResponder: () => false,
        onMoveShouldSetPanResponder: (_, gestureState) => isBackSwipe(gestureState),
        onMoveShouldSetPanResponderCapture: (_, gestureState) => isBackSwipe(gestureState),
        onPanResponderMove: (_, gestureState) => {
          translateX.setValue(Math.max(0, Math.min(gestureState.dx, screenWidth)));
        },
        onPanResponderRelease: (_, gestureState) => {
          const dragDistance = Math.max(0, gestureState.dx);
          const shouldGoBack =
            dragDistance >= PROFILE_BACK_TRIGGER_DISTANCE
            && Math.abs(gestureState.dy) <= PROFILE_BACK_TRIGGER_MAX_DY;

          if (shouldGoBack) {
            Animated.timing(translateX, {
              toValue: screenWidth,
              duration: 180,
              useNativeDriver: true,
            }).start(({ finished }) => {
              if (!finished) return;
              translateX.setValue(0);
              handleGoBack();
            });
            return;
          }

          Animated.spring(translateX, {
            toValue: 0,
            speed: 22,
            bounciness: 0,
            useNativeDriver: true,
          }).start();
        },
        onPanResponderTerminate: () => {
          Animated.spring(translateX, {
            toValue: 0,
            speed: 22,
            bounciness: 0,
            useNativeDriver: true,
          }).start();
        },
      }),
    [handleGoBack, isBackSwipe, screenWidth, translateX],
  );

  return (
    <ScreenLayout title="다른사람 프로필">
      <Animated.View
        style={[styles.container, { transform: [{ translateX }] }]}
        {...backSwipeResponder.panHandlers}
      >
        <ScrollView
          contentContainerStyle={styles.content}
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={showFollowPage ? handleFollowPageRefresh : handleRefresh}
              tintColor={colors.primary1}
              colors={[colors.primary1]}
            />
          }
        >
          {showFollowPage ? (
            renderFollowPage()
          ) : (
            <>
              <Pressable
                style={({ pressed }) => [styles.breadcrumbRow, pressed && styles.pressed]}
                onPress={handleGoBack}
              >
                <MaterialIcons name="chevron-left" size={18} color={colors.gray5} />
                <Text style={styles.breadcrumbText}>뒤로가기</Text>
              </Pressable>

              <View style={styles.profileRow}>
                <View style={styles.profileAvatar}>
                  {profile?.profileImageUrl ? (
                    <Image source={{ uri: profile.profileImageUrl }} style={styles.profileAvatarImage} />
                  ) : (
                    <DefaultProfileAvatar size={96} />
                  )}
                </View>
                <View style={styles.profileMeta}>
                  <Text style={styles.profileName}>{profileName}</Text>
                  <View style={styles.profileFollowRow}>
                    <Pressable onPress={openFollowingList} hitSlop={6}>
                      <Text style={styles.profileSub}>구독중 {followingCount}</Text>
                    </Pressable>
                    <Text style={styles.profileSub}> · </Text>
                    <Pressable onPress={openFollowerList} hitSlop={6}>
                      <Text style={styles.profileSub}>구독자 {followerCount}</Text>
                    </Pressable>
                  </View>
                  <Text style={styles.profileDesc} numberOfLines={3}>
                    {profileDesc}
                  </Text>
                  {profileCategories.length > 0 ? (
                    <Text style={styles.profileCategory}>
                      관심 카테고리 · {profileCategories.join(', ')}
                    </Text>
                  ) : null}
                </View>
              </View>

              <View style={styles.actionButtons}>
                <Pressable
                  style={({ pressed }) => [
                    styles.primaryButton,
                    following ? styles.primaryButtonDisabled : null,
                    pressed && styles.pressed,
                  ]}
                  onPress={handleSubscribe}
                  disabled={submittingFollow || profileLoading}
                >
                  <Text style={[styles.primaryButtonText, following ? styles.disabledText : null]}>
                    {submittingFollow ? '처리 중...' : following ? '구독 중' : '구독하기'}
                  </Text>
                </Pressable>
                <Pressable
                  style={({ pressed }) => [styles.secondaryButton, pressed && styles.pressed]}
                  onPress={handleOpenReportModal}
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
                      style={({ pressed }) => [
                        styles.tabButton,
                        active ? styles.tabActive : null,
                        pressed && styles.pressed,
                      ]}
                      onPress={() => setActiveTab(tab)}
                    >
                      <Text style={[styles.tabLabel, active ? styles.tabLabelActive : null]}>
                        {tab}
                      </Text>
                    </Pressable>
                  );
                })}
              </View>

              <View style={styles.tabContent}>
                {profileLoading && !refreshing ? (
                  <Text style={styles.emptyText}>불러오는 중...</Text>
                ) : (
                  renderTabContent()
                )}
              </View>
            </>
          )}
        </ScrollView>
      </Animated.View>
      <ReportMemberModal
        visible={Boolean(reportModal)}
        target={reportModal}
        submitting={submittingReport}
        onClose={handleCloseReportModal}
        onSubmit={handleSubmitReport}
      />
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
    alignSelf: 'flex-start',
  },
  breadcrumbText: {
    ...typography.body2_3,
    color: colors.gray5,
  },
  profileRow: {
    flexDirection: 'row',
    gap: spacing.md,
    alignItems: 'center',
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
    overflow: 'hidden',
  },
  profileAvatarImage: {
    width: '100%',
    height: '100%',
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
  profileFollowRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  profileDesc: {
    ...typography.body1_3,
    color: colors.gray6,
    lineHeight: 20,
  },
  profileCategory: {
    ...typography.body2_3,
    color: colors.gray5,
    lineHeight: 20,
    flexShrink: 1,
  },
  actionButtons: {
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
    backgroundColor: colors.subbrown4,
  },
  primaryButtonText: {
    ...typography.body1_2,
    color: colors.white,
  },
  disabledText: {
    color: colors.primary3,
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
    color: colors.gray4,
  },
  tabLabelActive: {
    color: colors.primary1,
  },
  tabContent: {
    minHeight: 200,
  },
  gridContent: {
    gap: spacing.sm,
    paddingVertical: spacing.sm,
  },
  cardWrap: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
  },
  storyCard: {
    width: '48%',
    backgroundColor: colors.white,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.subbrown4,
    padding: spacing.sm,
    gap: spacing.xs,
  },
  storyThumb: {
    backgroundColor: colors.gray1,
    borderRadius: radius.sm,
    aspectRatio: 1,
    overflow: 'hidden',
  },
  storyThumbImage: {
    width: '100%',
    height: '100%',
  },
  storyTitle: {
    ...typography.body1_2,
    color: colors.gray6,
  },
  storyExcerpt: {
    ...typography.body2_3,
    color: colors.gray5,
  },
  storyActions: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  inlineAction: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs / 2,
  },
  inlineText: {
    ...typography.body2_3,
    color: colors.gray5,
  },
  actionDivider: {
    width: 1,
    height: 16,
    backgroundColor: colors.gray2,
  },
  bookWrap: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
  },
  bookCard: {
    width: '30%',
    backgroundColor: colors.white,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.subbrown4,
    padding: spacing.xs,
    gap: spacing.xs / 2,
    alignItems: 'center',
  },
  bookThumb: {
    width: '100%',
    aspectRatio: 2 / 3,
    borderRadius: radius.sm,
    backgroundColor: colors.gray1,
    overflow: 'hidden',
    justifyContent: 'flex-start',
  },
  bookThumbImage: {
    width: '100%',
    height: '100%',
  },
  bookLikeBadge: {
    position: 'absolute',
    top: spacing.xs,
    left: spacing.xs,
  },
  bookTitle: {
    ...typography.body2_2,
    color: colors.gray6,
    alignSelf: 'flex-start',
  },
  bookAuthor: {
    ...typography.body2_3,
    color: colors.gray5,
    alignSelf: 'flex-start',
  },
  listContainer: {
    gap: spacing.sm,
    paddingVertical: spacing.sm,
  },
  emptyText: {
    ...typography.body1_3,
    color: colors.gray5,
  },
  groupRow: {
    backgroundColor: colors.white,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.subbrown4,
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.md,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  groupName: {
    ...typography.body1_3,
    color: colors.gray6,
    flex: 1,
  },
  groupMenuButton: {
    marginLeft: spacing.sm,
    paddingVertical: spacing.xs / 2,
    paddingHorizontal: spacing.xs / 2,
  },
  followPageWrap: {
    gap: spacing.md,
  },
  followProfileArea: {
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.xs,
    paddingVertical: spacing.md,
  },
  followProfileAvatar: {
    width: 92,
    height: 92,
    borderRadius: 46,
    borderWidth: 1,
    borderColor: colors.subbrown3,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.white,
    overflow: 'hidden',
  },
  followProfileAvatarImage: {
    width: '100%',
    height: '100%',
  },
  followProfileName: {
    ...typography.subhead3,
    color: colors.gray6,
  },
  followTabRow: {
    flexDirection: 'row',
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.gray2,
  },
  followTabButton: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: spacing.sm,
    borderBottomWidth: 2,
    borderBottomColor: 'transparent',
  },
  followTabActive: {
    borderBottomColor: colors.primary1,
  },
  followTabText: {
    ...typography.body1_3,
    color: colors.gray4,
  },
  followTabTextActive: {
    color: colors.gray6,
  },
  followListWrap: {
    gap: spacing.xs,
    paddingTop: spacing.sm,
  },
  followUserRow: {
    backgroundColor: colors.white,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.subbrown4,
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.md,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  followUserMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    flex: 1,
  },
  followUserAvatar: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: colors.gray1,
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  followUserAvatarImage: {
    width: '100%',
    height: '100%',
  },
  followUserName: {
    ...typography.body1_3,
    color: colors.gray6,
  },
  followButton: {
    minWidth: 56,
    borderRadius: radius.sm,
    paddingVertical: spacing.xs / 1.5,
    paddingHorizontal: spacing.sm,
    alignItems: 'center',
    justifyContent: 'center',
  },
  followButtonActive: {
    backgroundColor: colors.subbrown4,
  },
  followButtonInactive: {
    backgroundColor: colors.primary1,
  },
  followButtonDisabled: {
    opacity: 0.65,
  },
  followButtonText: {
    ...typography.body2_2,
  },
  followButtonTextActive: {
    color: colors.primary3,
  },
  followButtonTextInactive: {
    color: colors.white,
  },
  pressed: {
    opacity: 0.7,
  },
});
