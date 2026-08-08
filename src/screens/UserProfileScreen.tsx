import { useMemo, useState, useCallback, useEffect, useRef } from 'react';
import {
  Alert,
  Animated,
  Image,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  useWindowDimensions,
  View,
} from 'react-native';
import {
  useNavigation,
  useRoute,
  type NavigationProp,
  type ParamListBase,
  type RouteProp,
} from '@react-navigation/native';
import { MaterialIcons } from '@expo/vector-icons';

import { BOOKSTORY_COMMENT_URI, BOOKSTORY_LIKE_URI } from '../constants/iconMap';
import { colors, dialog, interactionOpacity, radius, spacing, typography } from '../theme';
import { navigateToHome } from '../navigation/navigateToHome';
import { FeedbackPressable as Pressable } from '../components/common/FeedbackPressable';
import { DefaultProfileAvatar } from '../components/common/DefaultProfileAvatar';
import { DialogOverlay } from '../components/common/DialogOverlay';
import { ScreenLayout } from '../components/common/ScreenLayout';
import { ActionMenu, type ActionMenuItem } from '../components/common/ActionMenu';
import { ReportMemberModal, type ReportMemberModalState } from '../components/common/ReportMemberModal';
import { SkeletonBox } from '../components/common/SkeletonBox';
import { ProfileImageViewer } from '../components/common/ProfileImageViewer';
import { useAuthGate } from '../contexts/AuthGateContext';
import { useLanguage } from '../contexts/LanguageContext';
import { triggerSelectionHaptic } from '../utils/haptics';
import { BOOK_DEFAULT_IMAGE } from '../constants/defaultAssets';
import { useEdgeBackSwipe } from '../hooks/useEdgeBackSwipe';
import { showToast } from '../utils/toast';
import {
  ApiError,
  PROFILE_INCOMPLETE_MESSAGE,
  isProfileIncompleteApiError,
} from '../services/api/http';
import { fetchAllMemberLikedBooks, type MemberLikedBookItem } from '../services/api/bookApi';
import { fetchMemberClubs, type ClubCategoryCode } from '../services/api/clubApi';
import { CATEGORY_CODE_TO_LABEL } from '../constants/domain/category';
import {
  fetchMemberFollowers,
  fetchMemberFollowings,
  fetchMemberProfile,
  createReport,
  setFollowingMember,
  blockMember,
  unblockMember,
  type ReportReason,
  type MemberProfile,
} from '../services/api/memberApi';
import {
  fetchMemberBookStories,
  type RemoteStoryItem,
} from '../services/api/bookStoryApi';
import { normalizeRemoteImageUrl } from '../utils/image';
import { emitMemberBlocked, isSameMemberNickname } from '../utils/blockedMembers';
import { normalizeNickname, validateNickname } from '../utils/nickname';

type TabKey = '책 이야기' | '서재' | '모임';
type UserProfileRouteParams = {
  memberNickname?: string;
};

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
  isbn: string;
  bookId?: number;
  title: string;
  author: string;
  imageUrl?: string;
};

type GroupItem = {
  id: string;
  clubId: number;
  name: string;
};

type FollowUser = {
  nickname: string;
  profileImageUrl?: string;
  following: boolean;
};

const tabs: TabKey[] = ['책 이야기', '서재', '모임'];
const LikeIcon = BOOKSTORY_LIKE_URI;
const CommentIcon = BOOKSTORY_COMMENT_URI;
const PROFILE_BACK_EDGE_WIDTH = 32;
const PROFILE_BACK_ACTIVATE_DISTANCE = 12;
const PROFILE_BACK_ACTIVATE_MAX_DY = 18;
const PROFILE_BACK_TRIGGER_DISTANCE = 96;
const PROFILE_BACK_TRIGGER_MAX_DY = 72;

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
  const visitedCursors = new Set<number>();

  for (let i = 0; i < 100; i += 1) {
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
    if (visitedCursors.has(result.nextCursor)) break;

    visitedCursors.add(result.nextCursor);
    cursorId = result.nextCursor;
  }

  const uniqueByNickname = new Map<string, FollowUser>();
  all.forEach((item) => {
    uniqueByNickname.set(item.nickname, item);
  });

  return Array.from(uniqueByNickname.values());
}

function resolveStoryFeedErrorMessage(error: unknown, fallback: string): string {
  if (!(error instanceof ApiError)) return fallback;

  if (error.status === 401) return '로그인 상태를 확인해 주십시오.';
  if (isProfileIncompleteApiError(error)) return PROFILE_INCOMPLETE_MESSAGE;
  if (error.status === 403) return '접근 권한이 없습니다.';
  if (error.status === 404) return '요청한 책이야기를 찾을 수 없습니다.';

  const normalized = error.message?.trim();
  return normalized || fallback;
}

export function UserProfileScreen() {
  const navigation = useNavigation<NavigationProp<ParamListBase>>();
  const route = useRoute<RouteProp<{ UserProfile: UserProfileRouteParams }, 'UserProfile'>>();
  const { requireAuth } = useAuthGate();
  const { l } = useLanguage();
  const { width: screenWidth, height: screenHeight } = useWindowDimensions();
  const translateX = useRef(new Animated.Value(0)).current;
  const [activeTab, setActiveTab] = useState<TabKey>('책 이야기');
  const [refreshing, setRefreshing] = useState(false);
  const [submittingFollow, setSubmittingFollow] = useState(false);
  const [submittingReport, setSubmittingReport] = useState(false);
  const [blockingMember, setBlockingMember] = useState(false);
  const [profileLoading, setProfileLoading] = useState(true);
  const [profile, setProfile] = useState<MemberProfile | null>(null);
  const [profileImageViewerVisible, setProfileImageViewerVisible] = useState(false);
  const [stories, setStories] = useState<StoryCard[]>([]);
  const [books, setBooks] = useState<BookCard[]>([]);
  const [loadingBooks, setLoadingBooks] = useState(false);
  const [groups, setGroups] = useState<GroupItem[]>([]);
  const [loadingGroups, setLoadingGroups] = useState(false);
  const [followerUsers, setFollowerUsers] = useState<FollowUser[]>([]);
  const [followingUsers, setFollowingUsers] = useState<FollowUser[]>([]);
  const [showFollowPage, setShowFollowPage] = useState(false);
  const [activeFollowTab, setActiveFollowTab] = useState<'FOLLOWER' | 'FOLLOWING'>('FOLLOWER');
  const [loadingFollowUsers, setLoadingFollowUsers] = useState(false);
  const [togglingFollowNickname, setTogglingFollowNickname] = useState<string | null>(null);
  const [reportModal, setReportModal] = useState<ReportMemberModalState | null>(null);
  const [showBlockReportModal, setShowBlockReportModal] = useState(false);
  const [groupMenuAnchor, setGroupMenuAnchor] = useState<{ pageX: number; pageY: number } | null>(null);
  const [groupMenuClubId, setGroupMenuClubId] = useState<number | null>(null);
  const routeNicknameValidation = validateNickname(
    typeof route.params?.memberNickname === 'string' ? route.params.memberNickname : '',
  );
  const memberNickname = routeNicknameValidation.isValid
    ? routeNicknameValidation.normalized
    : '_hy_0716';

  useEffect(() => {
    setShowFollowPage(false);
    setActiveFollowTab('FOLLOWER');
    setFollowerUsers([]);
    setFollowingUsers([]);
    setTogglingFollowNickname(null);
    setProfileImageViewerVisible(false);
    setBooks([]);
    setGroups([]);
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
    const profileResult = await fetchMemberProfile(memberNickname);
    setProfile(profileResult);

    try {
      let cursorId: number | undefined;
      const visitedCursors = new Set<number>();
      const seenStoryIds = new Set<number>();
      const allStories: RemoteStoryItem[] = [];

      for (let page = 0; page < 100; page += 1) {
        const response = await fetchMemberBookStories(memberNickname, cursorId);
        response.items.forEach((item) => {
          if (seenStoryIds.has(item.id)) return;
          seenStoryIds.add(item.id);
          allStories.push(item);
        });

        if (!response.hasNext || typeof response.nextCursor !== 'number') break;
        if (visitedCursors.has(response.nextCursor)) break;

        visitedCursors.add(response.nextCursor);
        cursorId = response.nextCursor;
      }

      setStories(allStories.map(mapRemoteStoryToCard));
    } catch (error) {
      setStories([]);
      showToast(l(resolveStoryFeedErrorMessage(error, '책이야기를 불러오지 못했습니다.')));
    }
  }, [l, memberNickname]);

  const mapMemberLikedBooksToCards = useCallback((items: MemberLikedBookItem[]): BookCard[] => {
    const mapped = items.map((book, index) => {
      const isbn = book.isbn.trim();
      const title = book.title?.trim() || l('책 제목');
      const author = book.author?.trim() || l('작가 미상');
      const id = isbn || `${title}-${author}-${index}`;

      return {
        id,
        isbn,
        bookId: book.bookId,
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
  }, [l]);

  const loadLikedBooks = useCallback(async () => {
    setLoadingBooks(true);
    try {
      const all: MemberLikedBookItem[] = await fetchAllMemberLikedBooks(memberNickname);
      setBooks(mapMemberLikedBooksToCards(all));
    } catch (error) {
      setBooks([]);
      if (!(error instanceof ApiError)) {
        showToast(l('서재를 불러오지 못했습니다.'));
      }
    } finally {
      setLoadingBooks(false);
    }
  }, [l, mapMemberLikedBooksToCards, memberNickname]);

  const loadGroups = useCallback(async () => {
    setLoadingGroups(true);
    try {
      const items = await fetchMemberClubs(memberNickname, { suppressErrorToast: true });
      setGroups(
        items.map((club) => ({
          id: `club-${club.clubId}`,
          clubId: club.clubId,
          name: club.clubName,
        })),
      );
    } catch (error) {
      setGroups([]);
      if (!(error instanceof ApiError)) {
        showToast(l('모임 목록을 불러오지 못했습니다.'));
      }
    } finally {
      setLoadingGroups(false);
    }
  }, [l, memberNickname]);

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
        showToast(l('구독 목록을 불러오지 못했습니다.'));
      }
    } finally {
      setLoadingFollowUsers(false);
    }
  }, [l, memberNickname]);

  useEffect(() => {
    let cancelled = false;

    const load = async () => {
      setProfileLoading(true);
      try {
        await Promise.all([loadProfile(), loadLikedBooks(), loadGroups()]);
      } catch (error) {
        if (cancelled) return;
        if (!(error instanceof ApiError)) {
          showToast(l('프로필을 불러오지 못했습니다.'));
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
  }, [l, loadGroups, loadLikedBooks, loadProfile]);

  const handleRefresh = useCallback(() => {
    setRefreshing(true);

    const refresh = async () => {
      try {
        await Promise.all([loadProfile(), loadLikedBooks(), loadGroups()]);
      } catch (error) {
        if (!(error instanceof ApiError)) {
          showToast(l('프로필을 새로고침하지 못했습니다.'));
        }
      } finally {
        setRefreshing(false);
      }
    };

    void refresh();
  }, [l, loadGroups, loadLikedBooks, loadProfile]);

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
        showToast(nextFollowing ? l('구독했습니다.') : l('구독을 취소했습니다.'));
        await loadProfile();
      } catch (error) {
        if (!(error instanceof ApiError)) {
          showToast(l('구독 상태를 변경하지 못했습니다.'));
        }
      } finally {
        setSubmittingFollow(false);
      }
    };

    void submit();
  }, [l, loadProfile, memberNickname, profile, submittingFollow]);

  const following = profile?.following ?? false;
  const profileName = normalizeNickname(profile?.nickname ?? '') || memberNickname;
  const profileDesc =
    profile?.description?.trim() ||
    l('소개글이 없습니다.');
  const profileCategories = useMemo(
    () =>
      (profile?.categories ?? []).map((code) => CATEGORY_CODE_TO_LABEL[code as ClubCategoryCode] ?? code),
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
        showToast(nextFollowing ? l('구독했습니다.') : l('구독을 취소했습니다.'));
        } catch (error) {
          setFollowerUsers(prevFollowerUsers);
          setFollowingUsers(prevFollowingUsers);
          if (!(error instanceof ApiError)) {
            showToast(l('구독 상태를 변경하지 못했습니다.'));
          }
        } finally {
          setTogglingFollowNickname((prev) => (prev === targetNickname ? null : prev));
        }
      };

      void submit();
    },
    [followerUsers, followingUsers, l, togglingFollowNickname],
  );

  const handleOpenReportModal = useCallback(() => {
    setShowBlockReportModal(false);
    setReportModal({
      nickname: profileName,
      profileImageUrl: profile?.profileImageUrl,
    });
  }, [profile?.profileImageUrl, profileName]);

  const handleConfirmBlockMember = useCallback(() => {
    setShowBlockReportModal(false);
    Alert.alert(
      l('차단하기'),
      l('{name} 님의 차단을 하시겠습니까?', { name: profileName }),
      [
        { text: l('취소'), style: 'cancel' },
        {
          text: l('차단'),
          style: 'destructive',
          onPress: () => {
            const submit = async () => {
              setBlockingMember(true);
              try {
                await blockMember(memberNickname);
                emitMemberBlocked(memberNickname);
                if (profile?.nickname && !isSameMemberNickname(memberNickname, profile.nickname)) {
                  emitMemberBlocked(profile.nickname);
                }
                showToast(l('차단되었습니다.'));
                navigation.goBack();
              } catch {
                showToast(l('차단에 실패했습니다. 다시 시도해 주세요.'));
              } finally {
                setBlockingMember(false);
              }
            };
            void submit();
          },
        },
      ],
    );
  }, [l, memberNickname, navigation, profile?.nickname, profileName]);

  const handleOpenGroupMenu = useCallback((pageX: number, pageY: number, clubId: number) => {
    setGroupMenuClubId(clubId);
    setGroupMenuAnchor({ pageX, pageY });
  }, []);

  const handleCloseGroupMenu = useCallback(() => {
    setGroupMenuAnchor(null);
    setGroupMenuClubId(null);
  }, []);

  const handleVisitGroupByClubId = useCallback(
    (clubId: number) => {
      if (!Number.isInteger(clubId) || clubId <= 0) {
        showToast(l('해당 모임 정보를 찾을 수 없습니다.'));
        return;
      }

      triggerSelectionHaptic();
      requireAuth(() => {
        navigation.navigate('Tabs', {
          screen: 'Meeting',
          params: { openClubId: clubId },
        });
      });
    },
    [l, navigation, requireAuth],
  );

  const handleVisitGroup = useCallback(() => {
    const clubId = groupMenuClubId;
    handleCloseGroupMenu();
    if (typeof clubId !== 'number') return;
    handleVisitGroupByClubId(clubId);
  }, [groupMenuClubId, handleCloseGroupMenu, handleVisitGroupByClubId]);

  const groupMenuItems = useMemo<ActionMenuItem[]>(
    () => [
      {
        key: 'visit',
        label: l('방문하기'),
        onPress: handleVisitGroup,
      },
    ],
    [handleVisitGroup, l],
  );

  const handleCloseReportModal = useCallback(() => {
    if (submittingReport) return;
    setReportModal(null);
  }, [submittingReport]);

  const handleSubmitReport = useCallback(
    (payload: { reason: ReportReason; content?: string }) => {
      requireAuth(() => {
        const submit = async () => {
          setSubmittingReport(true);
          try {
            await createReport({
              targetType: 'MEMBER',
              targetId: memberNickname,
              reason: payload.reason,
              content: payload.content,
            });
            setReportModal(null);
            showToast(l('신고가 접수되었습니다.'));
          } catch (error) {
            if (!(error instanceof ApiError)) {
              showToast(l('신고 접수에 실패했습니다.'));
            }
          } finally {
            setSubmittingReport(false);
          }
        };
        void submit();
      });
    },
    [l, memberNickname, requireAuth],
  );

  const handleOpenStoryDetail = useCallback(
    (story: StoryCard) => {
      if (!Number.isInteger(story.remoteId) || story.remoteId <= 0) {
        showToast(l('유효한 책이야기 정보가 없습니다.'));
        return;
      }

      navigation.navigate('Tabs', {
        screen: 'Story',
        params: { openStoryId: story.remoteId },
      });
    },
    [l, navigation],
  );

  const handleOpenBookSearchDetail = useCallback(
    (book: BookCard) => {
      navigation.navigate('Tabs', {
        screen: 'Home',
        params: {
          openSearchBook: {
            isbn: book.isbn,
            bookId: book.bookId,
            title: book.title,
            author: book.author,
            imgUrl: book.imageUrl,
          },
        },
      });
    },
    [navigation],
  );

  const renderStoryCards = () => (
    <View style={[styles.gridContent, styles.cardWrap]}>
      {stories.length === 0 ? <Text style={styles.emptyText}>{l('작성한 책이야기가 없습니다.')}</Text> : null}
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
          <View style={styles.storyTextWrap}>
            <Text style={styles.storyTitle} numberOfLines={2}>
              {story.title}
            </Text>
            <Text style={styles.storyExcerpt} numberOfLines={2}>
              {story.excerpt}
            </Text>
          </View>
          <View style={styles.storyActions}>
            <View style={styles.inlineAction}>
              <LikeIcon width={18} height={18} />
              <Text style={styles.inlineText}>{story.likes}</Text>
            </View>
            <View style={styles.actionDivider} />
            <View style={styles.inlineAction}>
              <CommentIcon width={18} height={18} />
              <Text style={styles.inlineText}>{story.comments}</Text>
            </View>
          </View>
        </Pressable>
      ))}
    </View>
  );

  const renderLibraryCards = () => (
    <View style={[styles.gridContent, styles.bookWrap]}>
      {loadingBooks ? (
        <View style={styles.bookWrap}>
          {[0, 1, 2, 3, 4, 5].map((i) => (
            <View key={i} style={styles.bookCard}>
              <SkeletonBox style={styles.bookThumb} />
              <SkeletonBox style={styles.bookSkeletonTitle} />
              <SkeletonBox style={styles.bookSkeletonAuthor} />
            </View>
          ))}
        </View>
      ) : null}
      {!loadingBooks && books.length === 0 ? <Text style={styles.emptyText}>{l('공개된 서재가 없습니다.')}</Text> : null}
      {books.map((book) => (
        <Pressable
          key={book.id}
          style={({ pressed }) => [styles.bookCard, pressed && styles.pressed]}
          onPress={() => handleOpenBookSearchDetail(book)}
        >
          <View style={styles.bookThumb}>
            <Image source={{ uri: book.imageUrl || BOOK_DEFAULT_IMAGE }} style={styles.bookThumbImage} resizeMode="cover" />
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
        </Pressable>
      ))}
    </View>
  );

  const renderMeetings = () => (
    <View style={styles.listContainer}>
      {loadingGroups ? (
        <View style={styles.listContainer}>
          {[0, 1, 2].map((i) => (
            <View key={i} style={[styles.groupRow, styles.groupSkeletonRow]}>
              <SkeletonBox style={styles.groupSkeletonName} />
            </View>
          ))}
        </View>
      ) : null}
      {!loadingGroups && groups.length === 0 ? (
        <Text style={styles.emptyText}>{l('공개된 모임이 없습니다.')}</Text>
      ) : null}
      {groups.map((group) => (
        <Pressable
          key={group.id}
          style={({ pressed }) => [styles.groupRow, pressed && styles.pressed]}
          onPress={() => handleVisitGroupByClubId(group.clubId)}
          accessibilityRole="button"
          accessibilityLabel={`${group.name} ${l('방문하기')}`}
        >
          <Text style={styles.groupName}>{group.name}</Text>
          <Pressable
            style={styles.groupMenuButton}
            hitSlop={8}
            onPress={(event) => {
              event.stopPropagation();
              handleOpenGroupMenu(
                event.nativeEvent.pageX,
                event.nativeEvent.pageY,
                group.clubId,
              );
            }}
            accessibilityRole="button"
            accessibilityLabel={`${group.name} ${l('메뉴')}`}
          >
            <MaterialIcons name="more-vert" size={18} color={colors.gray4} />
          </Pressable>
        </Pressable>
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
        <Text style={styles.breadcrumbText}>{l('뒤로가기')}</Text>
      </Pressable>

      <View style={styles.followProfileArea}>
        <View style={styles.followProfileAvatar}>
          {profile?.profileImageUrl ? (
            <Pressable
              style={styles.profileAvatarButton}
              onPress={() => {
                triggerSelectionHaptic();
                setProfileImageViewerVisible(true);
              }}
              accessibilityRole="button"
              accessibilityLabel={l('프로필 사진 크게 보기')}
            >
              <Image source={{ uri: profile.profileImageUrl }} style={styles.followProfileAvatarImage} />
            </Pressable>
          ) : (
            <DefaultProfileAvatar size={92} />
          )}
        </View>
        <Text style={styles.followProfileName}>{profileName}</Text>
      </View>

      <View style={styles.followTabRow}>
        <Pressable
          style={[styles.followTabButton, activeFollowTab === 'FOLLOWER' && styles.followTabActive]}
          onPress={() => {
            triggerSelectionHaptic();
            setActiveFollowTab('FOLLOWER');
          }}
        >
          <Text style={[styles.followTabText, activeFollowTab === 'FOLLOWER' && styles.followTabTextActive]}>
            {l('구독자 {count}', { count: followerCount })}
          </Text>
        </Pressable>
        <Pressable
          style={[styles.followTabButton, activeFollowTab === 'FOLLOWING' && styles.followTabActive]}
          onPress={() => {
            triggerSelectionHaptic();
            setActiveFollowTab('FOLLOWING');
          }}
        >
          <Text style={[styles.followTabText, activeFollowTab === 'FOLLOWING' && styles.followTabTextActive]}>
            {l('구독중 {count}', { count: followingCount })}
          </Text>
        </Pressable>
      </View>

      <View style={styles.followListWrap}>
        {loadingFollowUsers ? (
          <View style={styles.followSkeletonWrap}>
            {[0, 1, 2].map((i) => (
              <View key={i} style={styles.followSkeletonRow}>
                <SkeletonBox style={styles.followSkeletonAvatar} />
                <SkeletonBox style={styles.followSkeletonName} />
                <SkeletonBox style={styles.followSkeletonChip} />
              </View>
            ))}
          </View>
        ) : null}
        {!loadingFollowUsers && activeFollowUsers.length === 0 ? (
          <Text style={styles.emptyText}>{l('표시할 사용자가 없습니다.')}</Text>
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
                  {toggling ? l('처리 중...') : user.following ? l('구독중') : l('구독')}
                </Text>
              </Pressable>
            </View>
          );
        })}
      </View>
    </View>
  );

  const backSwipeResponder = useEdgeBackSwipe({
    isActive: true,
    translateX,
    screenWidth,
    onClose: useCallback(() => { translateX.setValue(0); handleGoBack(); }, [handleGoBack, translateX]),
    edgeWidth: PROFILE_BACK_EDGE_WIDTH,
    activateDistance: PROFILE_BACK_ACTIVATE_DISTANCE,
    activateMaxDy: PROFILE_BACK_ACTIVATE_MAX_DY,
    triggerDistance: PROFILE_BACK_TRIGGER_DISTANCE,
    triggerMaxDy: PROFILE_BACK_TRIGGER_MAX_DY,
  });

  return (
    <ScreenLayout title={l('다른사람 프로필')}>
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
                <Text style={styles.breadcrumbText}>{l('뒤로가기')}</Text>
              </Pressable>

              <View style={styles.profileRow}>
                <View style={styles.profileAvatar}>
                  {profile?.profileImageUrl ? (
                    <Pressable
                      style={styles.profileAvatarButton}
                      onPress={() => {
                        triggerSelectionHaptic();
                        setProfileImageViewerVisible(true);
                      }}
                      accessibilityRole="button"
                      accessibilityLabel={l('프로필 사진 크게 보기')}
                    >
                      <Image source={{ uri: profile.profileImageUrl }} style={styles.profileAvatarImage} />
                    </Pressable>
                  ) : (
                    <DefaultProfileAvatar size={96} />
                  )}
                </View>
                <View style={styles.profileMeta}>
                  <Text style={styles.profileName}>{profileName}</Text>
                  <View style={styles.profileFollowRow}>
                    <Pressable onPress={openFollowingList} hitSlop={8}>
                      <Text style={styles.profileSub}>
                        {l('구독중 {count}', { count: followingCount })}
                      </Text>
                    </Pressable>
                    <Text style={styles.profileSub}> · </Text>
                    <Pressable onPress={openFollowerList} hitSlop={8}>
                      <Text style={styles.profileSub}>
                        {l('구독자 {count}', { count: followerCount })}
                      </Text>
                    </Pressable>
                  </View>
                  <Text style={styles.profileDesc}>
                    {profileDesc}
                  </Text>
                  {profileCategories.length > 0 ? (
                    <Text style={styles.profileCategory}>
                      {l('관심 카테고리 · {categories}', {
                        categories: profileCategories.map((category) => l(category)).join(', '),
                      })}
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
                    {submittingFollow ? l('처리 중...') : following ? l('구독 중') : l('구독하기')}
                  </Text>
                </Pressable>
                <Pressable
                  style={({ pressed }) => [styles.secondaryButton, pressed && styles.pressed]}
                  onPress={() => setShowBlockReportModal(true)}
                >
                  <Text style={styles.secondaryButtonText}>{l('신고/차단')}</Text>
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
                      onPress={() => {
                        triggerSelectionHaptic();
                        setActiveTab(tab);
                      }}
                    >
                      <Text style={[styles.tabLabel, active ? styles.tabLabelActive : null]}>
                        {l(tab)}
                      </Text>
                    </Pressable>
                  );
                })}
              </View>

              <View style={styles.tabContent}>
                {profileLoading && !refreshing ? (
                  <View style={styles.profileSkeletonWrap}>
                    <SkeletonBox style={styles.profileSkeletonAvatar} />
                    <SkeletonBox style={styles.profileSkeletonName} />
                    <SkeletonBox style={styles.profileSkeletonBio} />
                  </View>
                ) : (
                  renderTabContent()
                )}
              </View>
            </>
          )}
        </ScrollView>
      </Animated.View>
      <ProfileImageViewer
        visible={profileImageViewerVisible}
        imageUrl={profile?.profileImageUrl}
        onClose={() => setProfileImageViewerVisible(false)}
      />
      <ReportMemberModal
        visible={Boolean(reportModal)}
        target={reportModal}
        submitting={submittingReport}
        onClose={handleCloseReportModal}
        onSubmit={handleSubmitReport}
      />
      <DialogOverlay
        visible={showBlockReportModal}
        onClose={() => setShowBlockReportModal(false)}
        overlayStyle={styles.modalOverlay}
        cardStyle={styles.modalCard}
      >
        <View style={styles.modalProfileSection}>
          {profile?.profileImageUrl ? (
            <Image source={{ uri: profile.profileImageUrl }} style={styles.modalAvatar} />
          ) : (
            <DefaultProfileAvatar size={52} />
          )}
          <Text style={styles.modalNickname}>{profileName}</Text>
        </View>
        <View style={styles.modalDivider} />
        <View style={styles.modalActions}>
          <Pressable
            style={({ pressed }) => [styles.modalActionButton, pressed && styles.pressed]}
            onPress={() => setShowBlockReportModal(false)}
          >
            <Text style={styles.modalActionText}>{l('취소')}</Text>
          </Pressable>
          <View style={styles.modalActionDivider} />
          <Pressable
            style={({ pressed }) => [styles.modalActionButton, pressed && styles.pressed]}
            onPress={handleOpenReportModal}
          >
            <Text style={styles.modalActionText}>{l('신고하기')}</Text>
          </Pressable>
          <View style={styles.modalActionDivider} />
          <Pressable
            style={({ pressed }) => [styles.modalActionButton, pressed && styles.pressed]}
            onPress={handleConfirmBlockMember}
          >
            <Text style={[styles.modalActionText, styles.modalActionDestructive]}>{l('차단하기')}</Text>
          </Pressable>
        </View>
      </DialogOverlay>

      <ActionMenu
        visible={Boolean(groupMenuAnchor)}
        anchor={groupMenuAnchor}
        items={groupMenuItems}
        onClose={handleCloseGroupMenu}
        screenWidth={screenWidth}
        screenHeight={screenHeight}
        menuWidth={132}
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
    gap: spacing.xxs,
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
  profileAvatarButton: {
    width: '100%',
    height: '100%',
    borderRadius: 999,
    overflow: 'hidden',
  },
  profileMeta: {
    flex: 1,
    gap: spacing.xxs,
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
    ...typography.body1_3_compact,
    color: colors.gray6,
  },
  profileCategory: {
    ...typography.caption1_3_relaxed,
    color: colors.gray5,
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
    minHeight: 308,
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
  storyTextWrap: {
    gap: spacing.xs,
    minHeight: 84,
  },
  storyTitle: {
    ...typography.body1_2,
    color: colors.gray6,
    minHeight: 40,
  },
  storyExcerpt: {
    ...typography.body2_3,
    color: colors.gray5,
    minHeight: 34,
  },
  storyActions: {
    flexDirection: 'row',
    alignItems: 'center',
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: colors.gray2,
    paddingTop: spacing.xs,
    marginTop: 'auto',
  },
  inlineAction: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.xxs,
  },
  inlineText: {
    ...typography.body2_3,
    color: colors.gray5,
  },
  actionDivider: {
    width: 1,
    height: 20,
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
    gap: spacing.xxs,
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
    paddingVertical: spacing.xxs,
    paddingHorizontal: spacing.xxs,
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
    opacity: interactionOpacity.disabledSoft,
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
    opacity: interactionOpacity.pressed,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: colors.overlay30,
    paddingHorizontal: spacing.md,
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalCard: {
    width: '100%',
    maxWidth: dialog.maxWidth,
    borderRadius: dialog.borderRadius,
    backgroundColor: colors.white,
  },
  modalProfileSection: {
    alignItems: 'center',
    paddingVertical: spacing.lg,
    paddingHorizontal: spacing.md,
    gap: spacing.sm,
  },
  modalAvatar: {
    width: 52,
    height: 52,
    borderRadius: 26,
  },
  modalNickname: {
    ...typography.body1,
    color: colors.gray6,
  },
modalDivider: {
    height: 1,
    backgroundColor: colors.gray1,
  },
  modalActions: {
    flexDirection: 'row',
  },
  modalActionButton: {
    flex: 1,
    paddingVertical: spacing.md,
    alignItems: 'center',
    justifyContent: 'center',
  },
  modalActionText: {
    ...typography.body2,
    color: colors.gray5,
  },
  modalActionDestructive: {
    color: colors.secondary1,
  },
  modalActionDivider: {
    width: 1,
    backgroundColor: colors.gray1,
  },
  profileSkeletonWrap: {
    alignItems: 'center',
    gap: spacing.sm,
    paddingVertical: spacing.lg,
  },
  profileSkeletonAvatar: {
    width: 92,
    height: 92,
    borderRadius: 46,
  },
  profileSkeletonName: {
    width: 120,
    height: 16,
    borderRadius: 4,
  },
  profileSkeletonBio: {
    width: 200,
    height: 12,
    borderRadius: 4,
  },
  bookSkeletonTitle: {
    width: '80%',
    height: 12,
    borderRadius: 4,
    alignSelf: 'flex-start',
  },
  bookSkeletonAuthor: {
    width: '60%',
    height: 10,
    borderRadius: 4,
    alignSelf: 'flex-start',
  },
  groupSkeletonRow: {
    justifyContent: 'center',
  },
  groupSkeletonName: {
    height: 14,
    width: '60%',
    borderRadius: 4,
  },
  followSkeletonWrap: {
    gap: spacing.sm,
  },
  followSkeletonRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    height: 64,
  },
  followSkeletonAvatar: {
    width: 42,
    height: 42,
    borderRadius: 21,
  },
  followSkeletonName: {
    flex: 1,
    height: 14,
    borderRadius: 4,
  },
  followSkeletonChip: {
    width: 60,
    height: 32,
    borderRadius: 6,
  },
});
