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
import {
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
  const [reportModal, setReportModal] = useState<ReportMemberModalState | null>(null);
  const memberNickname =
    typeof route.params?.memberNickname === 'string' && route.params.memberNickname.trim().length > 0
      ? route.params.memberNickname.trim()
      : '_hy_0716';

  const books: BookCard[] = useMemo(() => [], []);
  const groups: GroupItem[] = useMemo(() => [], []);

  const handleGoBack = useCallback(() => {
    if (navigation.canGoBack()) {
      navigation.goBack();
      return;
    }
    navigateToHome(navigation);
  }, [navigation]);

  const loadProfile = useCallback(async () => {
    const [profileResult, storiesResult] = await Promise.all([
      fetchMemberProfile(memberNickname),
      fetchMemberBookStories(memberNickname),
    ]);

    setProfile(profileResult);
    setStories(storiesResult.items.map(mapRemoteStoryToCard));
  }, [memberNickname]);

  useEffect(() => {
    let cancelled = false;

    const load = async () => {
      setProfileLoading(true);
      try {
        await loadProfile();
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
  }, [loadProfile]);

  const handleRefresh = useCallback(() => {
    setRefreshing(true);

    const refresh = async () => {
      try {
        await loadProfile();
      } catch (error) {
        if (!(error instanceof ApiError)) {
          showToast('프로필을 새로고침하지 못했습니다.');
        }
      } finally {
        setRefreshing(false);
      }
    };

    void refresh();
  }, [loadProfile]);

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

        if (routeNames.includes('Story')) {
          nav.navigate('Story', { openStoryId: story.remoteId });
          return;
        }

        if (routeNames.includes('Tabs')) {
          nav.navigate('Tabs', {
            screen: 'Story',
            params: { openStoryId: story.remoteId },
          });
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
      {books.length === 0 ? <Text style={styles.emptyText}>공개된 서재가 없습니다.</Text> : null}
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
              onRefresh={handleRefresh}
              tintColor={colors.primary1}
              colors={[colors.primary1]}
            />
          }
        >
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
              <Text style={styles.profileSub}>
                구독중 {profile?.followingCount ?? 0} · 구독자 {profile?.followerCount ?? 0}
              </Text>
              <Text style={styles.profileDesc} numberOfLines={3}>
                {profileDesc}
              </Text>
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
  profileDesc: {
    ...typography.body1_3,
    color: colors.gray6,
    lineHeight: 20,
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
  pressed: {
    opacity: 0.7,
  },
});
