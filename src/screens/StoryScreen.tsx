import { useMemo, useRef, useState, useCallback, useEffect } from 'react';
import {
  Alert,
  Animated,
  FlatList,
  GestureResponderEvent,
  KeyboardAvoidingView,
  PanResponder,
  PanResponderGestureState,
  Modal,
  Pressable,
  ScrollView,
  RefreshControl,
  StyleSheet,
  Text,
  TextInput,
  View,
  LayoutAnimation,
  Platform,
  UIManager,
  useWindowDimensions,
  Image,
} from 'react-native';
import { useFocusEffect, useNavigation, useRoute } from '@react-navigation/native';
import { MaterialIcons } from '@expo/vector-icons';
import { SvgUri } from 'react-native-svg';
import * as Clipboard from 'expo-clipboard';

import { colors, radius, spacing, typography } from '../theme';
import { navigateToHome } from '../navigation/navigateToHome';
import { BookFlipLoadingScreen } from '../components/common/BookFlipLoadingScreen';
import { FloatingActionButton } from '../components/common/FloatingActionButton';
import { ScreenLayout } from '../components/common/ScreenLayout';
import { IconButton } from '../components/common/IconButton';
import { ReportMemberModal, type ReportMemberModalState } from '../components/common/ReportMemberModal';
import BookStoryFeedCard from '../components/feature/bookstory/BookStoryFeedCard';
import SubscribeUserItem from '../components/feature/member/SubscribeUserItem';
import { useAuthGate } from '../contexts/AuthGateContext';
import {
  createBookStory,
  createBookStoryComment,
  deleteBookStory,
  deleteBookStoryComment,
  fetchGuestAllBookStories,
  fetchBookStories,
  fetchClubBookStories,
  fetchBookStoryDetail,
  mergeGuestAllBookStoriesCache,
  type RemoteStoryComment,
  type RemoteStoryDetail,
  type RemoteStoryItem,
  toggleBookStoryLike,
  updateBookStory,
  updateBookStoryComment,
} from '../services/api/bookStoryApi';
import { fetchMyClubs } from '../services/api/clubApi';
import {
  fetchMyProfile,
  fetchRecommendedMembers,
  reportMember,
  setFollowingMember,
  type MemberReportType,
} from '../services/api/memberApi';
import { ApiError } from '../services/api/http';
import { searchBooks, type BookItem } from '../services/api/bookApi';
import { toKstTimeAgoLabel } from '../utils/date';
import { normalizeRemoteImageUrl } from '../utils/image';
import { showToast } from '../utils/toast';

type Book = {
  id: string;
  title: string;
  author: string;
  description: string;
  image?: string;
};

type Comment = {
  id: string;
  remoteId?: number;
  author: string;
  profileImageUrl?: string;
  time: string;
  text: string;
  mine?: boolean;
  deleted?: boolean;
  replyTo?: string;
};

type Story = {
  id: string;
  remoteId?: number;
  author: string;
  profileImageUrl?: string;
  mine?: boolean;
  timeAgo: string;
  views: number;
  title: string;
  body: string;
  fullText: string;
  likes: number;
  comments: number;
  tag: string;
  subscribed: boolean;
  liked: boolean;
  book?: Book;
  commentList: Comment[];
};

type StoryFeedItem =
  | {
      type: 'story';
      key: string;
      story: Story;
    }
  | {
      type: 'recommended';
      key: string;
    };

const COMMENT_INPUT_MIN_HEIGHT = 48;
const COMMENT_INPUT_MAX_HEIGHT = 160;

type CommentMenuState = {
  comment: Comment;
  pageX: number;
  pageY: number;
};

type StoryMenuState = {
  pageX: number;
  pageY: number;
};

type RecommendedUser = {
  id: string;
  nickname: string;
  profileImageUrl?: string;
  followerCount?: number;
  followingCount?: number;
  subscribed: boolean;
};

type StoryFilterTab = {
  key: string;
  label: string;
  type: 'ALL' | 'FOLLOWING' | 'CLUB';
  clubId?: number;
};

const ALL_STORY_TAB: StoryFilterTab = {
  key: 'ALL',
  label: '전체',
  type: 'ALL',
};

const FOLLOWING_STORY_TAB: StoryFilterTab = {
  key: 'FOLLOWING',
  label: '구독중',
  type: 'FOLLOWING',
};

const DETAIL_BACK_EDGE_WIDTH = 28;
const DETAIL_BACK_ACTIVATE_DISTANCE = 14;
const DETAIL_BACK_TRIGGER_DISTANCE = 72;
const DETAIL_BACK_ACTIVATE_MAX_DY = 16;
const DETAIL_BACK_TRIGGER_MAX_DY = 60;
const MIN_BOOK_FLIP_LOADING_MS = 1000;

async function waitForMinimumLoading(startedAt: number, minimumMs = MIN_BOOK_FLIP_LOADING_MS) {
  const elapsed = Date.now() - startedAt;
  const remaining = minimumMs - elapsed;
  if (remaining <= 0) return;
  await new Promise<void>((resolve) => {
    setTimeout(resolve, remaining);
  });
}

function toComposeBook(raw: unknown): Book | null {
  if (!raw || typeof raw !== 'object') return null;
  const item = raw as Record<string, unknown>;
  const title = typeof item.title === 'string' ? item.title : '';
  if (!title) return null;
  const author = typeof item.author === 'string' ? item.author : '작가 미상';
  const description =
    typeof item.description === 'string'
      ? item.description
      : typeof item.publisher === 'string'
        ? item.publisher
        : '';
  const image =
    normalizeRemoteImageUrl(
      typeof item.imgUrl === 'string'
        ? item.imgUrl
        : typeof item.image === 'string'
          ? item.image
          : undefined,
    );
  const idSource =
    item.isbn ?? item.isbn13 ?? item.bookId ?? item.id ?? `${title}-${author}`;
  const id = String(idSource);

  return {
    id,
    title,
    author,
    description,
    image,
  };
}

function mapBookItemToBook(item: BookItem): Book {
  return {
    id: item.isbn || String(item.bookId ?? ''),
    title: item.title,
    author: item.author || '작가 미상',
    description:
      item.description || item.publisher || '책 설명이 없습니다.',
    image: normalizeRemoteImageUrl(item.imgUrl),
  };
}

export function StoryScreen() {
  const navigation = useNavigation<any>();
  const route = useRoute<any>();
  const { requireAuth, isLoggedIn } = useAuthGate();
  const { width: screenWidth, height: screenHeight } = useWindowDimensions();
  if (Platform.OS === 'android' && UIManager.setLayoutAnimationEnabledExperimental) {
    UIManager.setLayoutAnimationEnabledExperimental(true);
  }

  const [selectedFilterKey, setSelectedFilterKey] = useState(ALL_STORY_TAB.key);
  const [myClubTabs, setMyClubTabs] = useState<Array<{ clubId: number; clubName: string }>>([]);
  const [recommendedUsers, setRecommendedUsers] = useState<RecommendedUser[]>([]);
  const [myNickname, setMyNickname] = useState('');
  const [selectedBook, setSelectedBook] = useState<Book | null>(null);
  const [showBookPicker, setShowBookPicker] = useState(false);
  const [bookSearchQuery, setBookSearchQuery] = useState('');
  const [bookSearchResults, setBookSearchResults] = useState<BookItem[]>([]);
  const [bookSearchLoading, setBookSearchLoading] = useState(false);
  const [bookSearchSearched, setBookSearchSearched] = useState(false);
  const [bookSearchKeyword, setBookSearchKeyword] = useState('');
  const [title, setTitle] = useState('');
  const [body, setBody] = useState('');
  const [stories, setStories] = useState<Story[]>([]);
  const [hasNext, setHasNext] = useState(false);
  const [nextCursor, setNextCursor] = useState<number | null>(null);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const [isComposing, setIsComposing] = useState(false);
  const [editingStoryId, setEditingStoryId] = useState<number | null>(null);
  const [refreshing, setRefreshing] = useState(false);
  const [detailRefreshing, setDetailRefreshing] = useState(false);
  const [selectedStory, setSelectedStory] = useState<Story | null>(null);
  const [commentInput, setCommentInput] = useState('');
  const [commentInputHeight, setCommentInputHeight] = useState(COMMENT_INPUT_MIN_HEIGHT);
  const [editingCommentId, setEditingCommentId] = useState<number | null>(null);
  const [replyTarget, setReplyTarget] = useState<{
    commentId?: number;
    commentKey: string;
    author: string;
  } | null>(null);
  const [commentMenu, setCommentMenu] = useState<CommentMenuState | null>(null);
  const [storyMenu, setStoryMenu] = useState<StoryMenuState | null>(null);
  const [reportModal, setReportModal] = useState<ReportMemberModalState | null>(null);
  const [submittingReport, setSubmittingReport] = useState(false);
  const [submittingStory, setSubmittingStory] = useState(false);
  const listRef = useRef<FlatList<StoryFeedItem>>(null);
  const commentInputRef = useRef<TextInput>(null);
  const inlineReplyInputRef = useRef<TextInput>(null);
  const writeIconUri = Image.resolveAssetSource(require('../../assets/icons/pencil_icon.svg')).uri;
  const detailTranslateX = useRef(new Animated.Value(0)).current;

  const animateTransition = useCallback(() => {
    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
  }, []);

  const closeStoryDetail = useCallback(() => {
    animateTransition();
    detailTranslateX.stopAnimation(() => {
      detailTranslateX.setValue(0);
    });
    setSelectedStory(null);
    setEditingCommentId(null);
    setReplyTarget(null);
    setCommentMenu(null);
    setStoryMenu(null);
    setCommentInput('');
  }, [animateTransition, detailTranslateX]);

  const isDetailBackSwipe = useCallback((gestureState: PanResponderGestureState) => {
    if (!selectedStory) return false;
    return (
      gestureState.x0 <= DETAIL_BACK_EDGE_WIDTH
      && gestureState.dx > DETAIL_BACK_ACTIVATE_DISTANCE
      && Math.abs(gestureState.dy) < DETAIL_BACK_ACTIVATE_MAX_DY
    );
  }, [selectedStory]);

  const detailBackSwipeResponder = useMemo(
    () =>
      PanResponder.create({
        onStartShouldSetPanResponder: () => false,
        onMoveShouldSetPanResponder: (_, gestureState) => isDetailBackSwipe(gestureState),
        onMoveShouldSetPanResponderCapture: (_, gestureState) => isDetailBackSwipe(gestureState),
        onPanResponderMove: (_, gestureState) => {
          detailTranslateX.setValue(Math.max(0, Math.min(gestureState.dx, screenWidth)));
        },
        onPanResponderRelease: (_, gestureState) => {
          const dragDistance = Math.max(0, gestureState.dx);
          const shouldClose =
            dragDistance >= DETAIL_BACK_TRIGGER_DISTANCE
            && Math.abs(gestureState.dy) <= DETAIL_BACK_TRIGGER_MAX_DY;
          if (shouldClose) {
            Animated.timing(detailTranslateX, {
              toValue: screenWidth,
              duration: 180,
              useNativeDriver: true,
            }).start(({ finished }) => {
              if (!finished) return;
              closeStoryDetail();
            });
            return;
          }
          Animated.spring(detailTranslateX, {
            toValue: 0,
            speed: 22,
            bounciness: 0,
            useNativeDriver: true,
          }).start();
        },
        onPanResponderTerminate: () => {
          Animated.spring(detailTranslateX, {
            toValue: 0,
            speed: 22,
            bounciness: 0,
            useNativeDriver: true,
          }).start();
        },
      }),
    [closeStoryDetail, detailTranslateX, isDetailBackSwipe, screenWidth],
  );

  const runBookSearch = useCallback(async (keyword: string) => {
    const trimmed = keyword.trim();
    if (!trimmed) {
      setBookSearchSearched(false);
      setBookSearchKeyword('');
      setBookSearchResults([]);
      return;
    }

    setBookSearchLoading(true);
    setBookSearchSearched(true);
    setBookSearchKeyword(trimmed);
    setBookSearchResults([]);
    try {
      const response = await searchBooks(trimmed, 1);
      setBookSearchResults(response.items);
    } catch (error) {
      if (!(error instanceof ApiError)) {
        showToast('책 검색에 실패했습니다.');
      }
      setBookSearchResults([]);
    } finally {
      setBookSearchLoading(false);
    }
  }, []);

  const openCompose = useCallback((initialBook?: Book) => {
    requireAuth(() => {
      setSelectedStory(null);
      setEditingStoryId(null);
      setTitle('');
      setBody('');
      setSelectedBook(initialBook ?? null);
      setShowBookPicker(false);
      setBookSearchQuery(initialBook?.title ?? '');
      setBookSearchResults([]);
      setBookSearchLoading(false);
      setBookSearchSearched(false);
      setBookSearchKeyword('');
      setReplyTarget(null);
      setCommentMenu(null);
      setStoryMenu(null);
      animateTransition();
      setIsComposing(true);
    });
  }, [requireAuth]);

  const closeCompose = () => {
    animateTransition();
    setIsComposing(false);
    setEditingStoryId(null);
    setShowBookPicker(false);
    setReplyTarget(null);
    setCommentMenu(null);
    setStoryMenu(null);
  };

  const hasUnsavedStoryChanges = useMemo(() => {
    const composingDraft =
      isComposing &&
      (title.trim().length > 0 || body.trim().length > 0 || selectedBook !== null);
    const commentDraft = Boolean(selectedStory) && commentInput.trim().length > 0;
    return composingDraft || commentDraft;
  }, [body, commentInput, isComposing, selectedBook, selectedStory, title]);
  const isCommentSubmitDisabled = commentInput.trim().length === 0;

  useEffect(() => {
    if (commentInput.length === 0) {
      setCommentInputHeight(COMMENT_INPUT_MIN_HEIGHT);
    }
  }, [commentInput]);

  const handleCommentInputSizeChange = useCallback((nextContentHeight: number) => {
    const nextHeight = Math.max(
      COMMENT_INPUT_MIN_HEIGHT,
      Math.min(COMMENT_INPUT_MAX_HEIGHT, Math.ceil(nextContentHeight)),
    );
    setCommentInputHeight((prev) => (Math.abs(prev - nextHeight) > 1 ? nextHeight : prev));
  }, []);

  const showDiscardStoryAlert = useCallback(
    (onClose: () => void) => {
      if (!hasUnsavedStoryChanges) {
        onClose();
        return;
      }

      Alert.alert('알림', '현재 페이지는 저장 되지 않습니다.', [
        { text: '취소', style: 'cancel' },
        { text: '닫기', style: 'destructive', onPress: onClose },
      ]);
    },
    [hasUnsavedStoryChanges],
  );

  const requestCloseCompose = useCallback(() => {
    showDiscardStoryAlert(closeCompose);
  }, [closeCompose, showDiscardStoryAlert]);

  const handlePressHeaderLogo = useCallback(() => {
    const goHome = () => {
      setCommentInput('');
      setEditingCommentId(null);
      setReplyTarget(null);
      setCommentMenu(null);
      setStoryMenu(null);
      setSelectedStory(null);
      closeCompose();
      navigateToHome(navigation);
    };

    if (hasUnsavedStoryChanges) {
      showDiscardStoryAlert(goHome);
      return;
    }

    navigateToHome(navigation);
  }, [closeCompose, hasUnsavedStoryChanges, navigation, showDiscardStoryAlert]);

  const storyTabs = useMemo<StoryFilterTab[]>(() => {
    if (!isLoggedIn) {
      return [ALL_STORY_TAB];
    }

    const uniqueClubs = Array.from(
      new Map(myClubTabs.map((club) => [club.clubId, club])).values(),
    );

    const clubTabs: StoryFilterTab[] = uniqueClubs.map((club) => ({
      key: `CLUB-${club.clubId}`,
      label: club.clubName,
      type: 'CLUB',
      clubId: club.clubId,
    }));

    return [ALL_STORY_TAB, FOLLOWING_STORY_TAB, ...clubTabs];
  }, [isLoggedIn, myClubTabs]);

  const selectedTab = useMemo<StoryFilterTab>(
    () => storyTabs.find((tab) => tab.key === selectedFilterKey) ?? storyTabs[0] ?? ALL_STORY_TAB,
    [selectedFilterKey, storyTabs],
  );

  const storyListItems = useMemo<StoryFeedItem[]>(() => {
    if (stories.length === 0) return [];

    const includeRecommendation = isLoggedIn && recommendedUsers.length > 0;
    const items: StoryFeedItem[] = [];

    stories.forEach((story, index) => {
      if (includeRecommendation && index > 0 && index % 12 === 0) {
        items.push({
          type: 'recommended',
          key: `recommended-${index}`,
        });
      }

      items.push({
        type: 'story',
        key: story.id,
        story,
      });
    });

    return items;
  }, [isLoggedIn, recommendedUsers.length, stories]);

  useEffect(() => {
    if (storyTabs.some((tab) => tab.key === selectedFilterKey)) return;
    setSelectedFilterKey(storyTabs[0]?.key ?? ALL_STORY_TAB.key);
  }, [selectedFilterKey, storyTabs]);

  useEffect(() => {
    if (!isLoggedIn) {
      setMyClubTabs([]);
      return;
    }

    let cancelled = false;

    const loadMyClubTabs = async () => {
      try {
        const all: Array<{ clubId: number; clubName: string }> = [];
        let hasNext = true;
        let cursorId: number | undefined;

        while (hasNext) {
          const response = await fetchMyClubs(cursorId, { suppressErrorToast: true });
          all.push(...response.items);
          hasNext = response.hasNext && typeof response.nextCursor === 'number';
          cursorId = response.nextCursor ?? undefined;
        }

        if (cancelled) return;
        setMyClubTabs(all);
      } catch (error) {
        if (!cancelled && !(error instanceof ApiError)) {
          showToast('내 독서모임 목록을 불러오지 못했습니다.');
        }
      }
    };

    void loadMyClubTabs();

    return () => {
      cancelled = true;
    };
  }, [isLoggedIn]);

  const canLoadApiFeed = selectedTab.type === 'ALL' || isLoggedIn;

  const loadRecommendedUsers = useCallback(async () => {
    if (!isLoggedIn) {
      setRecommendedUsers([]);
      return;
    }

    try {
      const users = await fetchRecommendedMembers({ suppressErrorToast: true });
      setRecommendedUsers(
        users.slice(0, 4).map((user) => ({
          id: user.nickname,
          nickname: user.nickname,
          profileImageUrl: user.profileImageUrl,
          followerCount: user.followerCount,
          followingCount: user.followingCount,
          subscribed: false,
        })),
      );
    } catch (error) {
      if (error instanceof ApiError && error.status === 401) {
        setRecommendedUsers([]);
        return;
      }
      if (!(error instanceof ApiError)) {
        showToast('추천 사용자를 불러오지 못했습니다.');
      }
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
        const profile = await fetchMyProfile({ suppressErrorToast: true });
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

  const openUserProfile = useCallback(
    (nickname: string) => {
      const memberNickname = nickname.trim();
      if (!memberNickname) return;
      if (isLoggedIn && myNickname && memberNickname === myNickname) {
        navigation.navigate('My');
        return;
      }
      navigation.navigate('UserProfile', { memberNickname, fromScreen: 'Story' });
    },
    [isLoggedIn, myNickname, navigation],
  );

  const loadStories = useCallback(
    async (options?: { reset?: boolean; forceRefresh?: boolean }) => {
      const reset = options?.reset ?? false;
      const forceRefresh = options?.forceRefresh ?? false;

      if (!canLoadApiFeed) {
        if (reset) {
          setStories([]);
          setHasNext(false);
          setNextCursor(null);
        }
        return;
      }

      const cursorId = reset ? undefined : nextCursor ?? undefined;

      if (!reset) {
        if (!hasNext || isLoadingMore) return;
        setIsLoadingMore(true);
      }

      try {
        const isGuestAll = !isLoggedIn && selectedTab.type === 'ALL';
        const feed =
          isGuestAll && reset
            ? await fetchGuestAllBookStories({ forceRefresh })
            : selectedTab.type === 'CLUB' && typeof selectedTab.clubId === 'number'
            ? await fetchClubBookStories(selectedTab.clubId, cursorId)
            : await fetchBookStories(
                selectedTab.type === 'FOLLOWING' ? 'FOLLOWING' : 'ALL',
                cursorId,
                { viewerAuthenticated: isLoggedIn },
              );
        if (isGuestAll && !reset) {
          mergeGuestAllBookStoriesCache(feed);
        }
        const mapped = feed.items.map(mapRemoteStoryToStory);

        setStories((prev) => {
          if (reset) return mapped;

          const existing = new Set(prev.map((story) => story.id));
          const appended = mapped.filter((story) => !existing.has(story.id));
          return [...prev, ...appended];
        });

        setHasNext(feed.hasNext);
        setNextCursor(feed.nextCursor);
      } catch (error) {
        if (!(error instanceof ApiError)) {
          showToast('책이야기 목록을 불러오지 못했습니다.');
        }
      } finally {
        if (!reset) {
          setIsLoadingMore(false);
        }
      }
    },
    [canLoadApiFeed, hasNext, isLoadingMore, isLoggedIn, nextCursor, selectedTab],
  );

  useEffect(() => {
    setSelectedStory(null);
    if (!canLoadApiFeed) {
      setStories([]);
      setHasNext(false);
      setNextCursor(null);
      return;
    }
    void loadStories({ reset: true });
  }, [canLoadApiFeed, loadStories, selectedTab.key]);

  const applyStoryUpdate = useCallback((next: Story) => {
    setStories((prev) => prev.map((story) => (story.id === next.id ? next : story)));
    setSelectedStory((prev) => (prev && prev.id === next.id ? next : prev));
  }, []);

  const loadStoryDetail = useCallback(
    async (story: Story) => {
      if (typeof story.remoteId !== 'number') return;
      try {
        const detail = await fetchBookStoryDetail(story.remoteId, {
          viewerAuthenticated: isLoggedIn,
        });
        if (!detail) return;
        const mapped = mapRemoteDetailToStory(detail, story);
        applyStoryUpdate(mapped);
      } catch (error) {
        if (!(error instanceof ApiError)) {
          showToast('책이야기 상세를 불러오지 못했습니다.');
        }
      }
    },
    [applyStoryUpdate, isLoggedIn],
  );

  const openStoryDetailByRemoteId = useCallback(async (remoteId: number) => {
    if (!Number.isInteger(remoteId) || remoteId <= 0) return;

    animateTransition();
    detailTranslateX.stopAnimation(() => {
      detailTranslateX.setValue(0);
    });
    setIsComposing(false);
    setEditingStoryId(null);
    setCommentInput('');
    setEditingCommentId(null);
    setReplyTarget(null);
    setCommentMenu(null);
    setStoryMenu(null);

    try {
      const detail = await fetchBookStoryDetail(remoteId, {
        viewerAuthenticated: isLoggedIn,
      });
      if (!detail) {
        showToast('해당 책이야기를 찾을 수 없습니다.');
        return;
      }
      const mapped = mapRemoteDetailToStory(detail);
      setStories((prev) => {
        const exists = prev.some((story) => story.id === mapped.id);
        if (!exists) return [mapped, ...prev];
        return prev.map((story) => (story.id === mapped.id ? mapped : story));
      });
      setSelectedStory(mapped);
    } catch (error) {
      if (!(error instanceof ApiError)) {
        showToast('책이야기 상세를 불러오지 못했습니다.');
      }
    }
  }, [animateTransition, detailTranslateX, isLoggedIn]);

  const startEditStory = useCallback((story: Story) => {
    if (typeof story.remoteId !== 'number') return;
    setEditingStoryId(story.remoteId);
    setTitle(story.title);
    setBody(story.fullText || story.body);
    setSelectedBook(story.book ?? null);
    setSelectedStory(null);
    setEditingCommentId(null);
    setCommentInput('');
    setReplyTarget(null);
    setCommentMenu(null);
    setStoryMenu(null);
    animateTransition();
    setIsComposing(true);
  }, []);

  const handleDeleteStory = useCallback(
    (story: Story) => {
      const storyRemoteId = story.remoteId;
      if (typeof storyRemoteId !== 'number') return;

      Alert.alert('책 이야기 삭제', '이 글을 삭제할까요?', [
        { text: '취소', style: 'cancel' },
        {
          text: '삭제',
          style: 'destructive',
          onPress: () => {
            const submit = async () => {
              try {
                await deleteBookStory(storyRemoteId);
                setStories((prev) => prev.filter((item) => item.id !== story.id));
                setSelectedStory(null);
                showToast('책이야기를 삭제했습니다.');
              } catch (error) {
                if (!(error instanceof ApiError)) {
                  showToast('책이야기 삭제에 실패했습니다.');
                }
              }
            };

            void submit();
          },
        },
      ]);
    },
    [],
  );

  const handleShareStory = useCallback(() => {
    if (!selectedStory) return;

    const storyId = selectedStory.remoteId ?? selectedStory.id.replace('story-', '');
    const url = `https://checkmo.co.kr/book-stories/${storyId}`;
    void Clipboard.setStringAsync(url);
    showToast('URL이 클립보드에 복사되었습니다.');
  }, [selectedStory]);

  const openStoryMenu = useCallback((event: GestureResponderEvent) => {
    setCommentMenu(null);
    setStoryMenu({
      pageX: event.nativeEvent.pageX,
      pageY: event.nativeEvent.pageY,
    });
  }, []);

  const openReportModal = useCallback(
    (
      nickname: string,
      profileImageUrl: string | undefined,
      defaultType: MemberReportType,
    ) => {
      const targetNickname = nickname.trim();
      if (!targetNickname) {
        showToast('신고 대상을 확인할 수 없습니다.');
        return;
      }
      setReportModal({
        nickname: targetNickname,
        profileImageUrl,
        initialType: defaultType,
      });
    },
    [],
  );

  const closeReportModal = useCallback(() => {
    if (submittingReport) return;
    setReportModal(null);
  }, [submittingReport]);

  const submitReport = useCallback((payload: { reportType: MemberReportType; content?: string }) => {
    if (!reportModal?.nickname) return;
    const content = payload.content?.trim() ?? '';
    if (content.length > 400) {
      showToast('신고 내용은 400자 이하로 입력해주세요.');
      return;
    }

    requireAuth(() => {
      const submit = async () => {
        setSubmittingReport(true);
        try {
          await reportMember({
            reportedMemberNickname: reportModal.nickname,
            reportType: payload.reportType,
            content: content || undefined,
          });
          showToast('신고가 접수되었습니다.');
          setReportModal(null);
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
  }, [reportModal, requireAuth]);

  const handleSelectStoryMenuAction = useCallback(
    (action: 'edit' | 'delete' | 'report' | 'share') => {
      if (!selectedStory) return;

      setStoryMenu(null);

      if (action === 'edit') {
        if (!isLoggedIn || !selectedStory.mine) return;
        startEditStory(selectedStory);
        return;
      }

      if (action === 'delete') {
        if (!isLoggedIn || !selectedStory.mine) return;
        handleDeleteStory(selectedStory);
        return;
      }

      if (action === 'report') {
        openReportModal(selectedStory.author, selectedStory.profileImageUrl, 'BOOK_STORY');
        return;
      }

      handleShareStory();
    },
    [handleDeleteStory, handleShareStory, openReportModal, selectedStory, startEditStory],
  );

  const openCommentMenu = useCallback(
    (comment: Comment, event: GestureResponderEvent) => {
      setStoryMenu(null);
      setCommentMenu({
        comment,
        pageX: event.nativeEvent.pageX,
        pageY: event.nativeEvent.pageY,
      });
    },
    [],
  );

  const beginEditComment = useCallback((comment: Comment) => {
    if (typeof comment.remoteId !== 'number') return;
    setCommentMenu(null);
    setEditingCommentId(comment.remoteId);
    setReplyTarget(null);
    setCommentInput(comment.deleted ? '' : comment.text);
    requestAnimationFrame(() => {
      commentInputRef.current?.focus();
    });
  }, []);

  const deleteComment = useCallback(
    (comment: Comment) => {
      if (
        !selectedStory ||
        !isLoggedIn ||
        !comment.mine ||
        typeof comment.remoteId !== 'number' ||
        typeof selectedStory.remoteId !== 'number'
      ) {
        return;
      }
      const storyRemoteId = selectedStory.remoteId;
      const commentRemoteId = comment.remoteId;

      const originalStory = selectedStory;
      const nextStory: Story = {
        ...originalStory,
        commentList: originalStory.commentList.filter(
          (item) => item.id !== comment.id,
        ),
        comments: Math.max(0, originalStory.comments - 1),
      };
      applyStoryUpdate(nextStory);
      setEditingCommentId(null);
      setReplyTarget(null);
      setCommentInput('');
      setCommentMenu(null);

      const submit = async () => {
        try {
          await deleteBookStoryComment(
            storyRemoteId,
            commentRemoteId,
          );
          showToast('댓글을 삭제했습니다.');
        } catch (error) {
          applyStoryUpdate(originalStory);
          if (!(error instanceof ApiError)) {
            showToast('댓글 삭제에 실패했습니다.');
          }
        }
      };
      void submit();
    },
    [applyStoryUpdate, selectedStory],
  );

  const handleSelectCommentMenuAction = useCallback(
    (action: 'edit' | 'delete' | 'report' | 'reply') => {
      const current = commentMenu?.comment;
      if (!current) return;

      setCommentMenu(null);

      if (action === 'edit') {
        beginEditComment(current);
        return;
      }

      if (action === 'delete') {
        deleteComment(current);
        return;
      }

      if (action === 'report') {
        openReportModal(current.author, current.profileImageUrl, 'COMMENT');
        return;
      }

      setEditingCommentId(null);
      setReplyTarget({
        commentId: current.remoteId,
        commentKey: current.id,
        author: current.author,
      });
      setCommentInput('');
      requestAnimationFrame(() => {
        inlineReplyInputRef.current?.focus();
      });
    },
    [beginEditComment, commentMenu, deleteComment, openReportModal],
  );

  const openBookPicker = useCallback(() => {
    setShowBookPicker(true);
  }, []);

  const closeBookPicker = useCallback(() => {
    setShowBookPicker(false);
  }, []);

  const handleSubmitBookSearch = useCallback(() => {
    const keyword = bookSearchQuery.trim();
    if (!keyword) {
      showToast('검색어를 입력해주세요.');
      return;
    }
    void runBookSearch(keyword);
  }, [bookSearchQuery, runBookSearch]);

  const handleSelectBookFromSearch = useCallback((bookItem: BookItem) => {
    setSelectedBook(mapBookItemToBook(bookItem));
    setBookSearchQuery(bookItem.title);
    setShowBookPicker(false);
  }, []);

  const handleSubmit = () => {
    if (!selectedBook) {
      showToast('책을 선택해주세요.');
      return;
    }
    if (!title.trim() || !body.trim()) {
      showToast('제목과 내용을 입력해주세요.');
      return;
    }
    requireAuth(() => {
      const post = async () => {
        const loadingStartedAt = Date.now();
        setSubmittingStory(true);
        try {
          const payload = {
            title: title.trim(),
            description: body.trim(),
            bookInfo: selectedBook
              ? {
                  isbn: selectedBook.id,
                  title: selectedBook.title,
                  author: selectedBook.author,
                  imgUrl: selectedBook.image,
                  description: selectedBook.description,
                }
              : undefined,
          };

          if (editingStoryId) {
            await updateBookStory(editingStoryId, payload);
            showToast('책이야기를 수정했습니다.');
          } else {
            await createBookStory(payload);
            showToast('책이야기를 등록했습니다.');
          }

          await loadStories({ reset: true });
        } catch (error) {
          if (!(error instanceof ApiError)) {
            showToast(
              editingStoryId
                ? '책이야기 수정에 실패했습니다.'
                : '책이야기 등록에 실패했습니다.',
            );
          }
        }

        try {
          setTitle('');
          setBody('');
          setSelectedBook(null);
          setEditingStoryId(null);
          closeCompose();
          listRef.current?.scrollToOffset({ offset: 0, animated: true });
        } finally {
          await waitForMinimumLoading(loadingStartedAt);
          setSubmittingStory(false);
        }
      };

      void post();
    });
  };

  const handleToggleSubscribe = (id: string) => {
    requireAuth(() => {
      const target = stories.find((story) => story.id === id);
      if (!target || typeof target.remoteId !== 'number') return;
      const nextSubscribed = !target.subscribed;

      const update = () => {
        setStories((prev) =>
          prev.map((story) =>
            story.id === id ? { ...story, subscribed: nextSubscribed } : story,
          ),
        );
        if (selectedStory?.id === id) {
          setSelectedStory((prev) =>
            prev ? { ...prev, subscribed: nextSubscribed } : prev,
          );
        }
      };

      update();

      const submit = async () => {
        try {
          await setFollowingMember(target.author, nextSubscribed);
          showToast(nextSubscribed ? '구독했습니다.' : '구독을 취소했습니다.');
        } catch {
          // Rollback on failure
          setStories((prev) =>
            prev.map((story) =>
              story.id === id ? { ...story, subscribed: !nextSubscribed } : story,
            ),
          );
          if (selectedStory?.id === id) {
            setSelectedStory((prev) =>
              prev ? { ...prev, subscribed: !nextSubscribed } : prev,
            );
          }
          showToast('구독 상태를 변경하지 못했습니다.');
        }
      };
      void submit();
    });
  };

  const handleToggleRecommendedSubscribe = useCallback((id: string) => {
    requireAuth(() => {
      const target = recommendedUsers.find((user) => user.id === id);
      if (!target) return;
      const nextSubscribed = !target.subscribed;

      setRecommendedUsers((prev) =>
        prev.map((user) =>
          user.id === id ? { ...user, subscribed: nextSubscribed } : user,
        ),
      );

      const submit = async () => {
        try {
          await setFollowingMember(target.nickname, nextSubscribed);
          showToast(nextSubscribed ? '구독했습니다.' : '구독을 취소했습니다.');
        } catch {
          setRecommendedUsers((prev) =>
            prev.map((user) =>
              user.id === id ? { ...user, subscribed: !nextSubscribed } : user,
            ),
          );
          showToast('구독 상태를 변경하지 못했습니다.');
        }
      };
      void submit();
    });
  }, [recommendedUsers, requireAuth]);

  const handleRefresh = () => {
    setRefreshing(true);
    const refresh = async () => {
      if (canLoadApiFeed) {
        await loadStories({ reset: true, forceRefresh: true });
      } else {
        setStories([]);
      }
      await loadRecommendedUsers();
      setSelectedStory(null);
      setRefreshing(false);
    };
    void refresh();
  };

  const handleSelectStory = (story: Story) => {
    animateTransition();
    detailTranslateX.stopAnimation(() => {
      detailTranslateX.setValue(0);
    });
    setIsComposing(false);
    setSelectedStory(story);
    setEditingCommentId(null);
    setReplyTarget(null);
    setCommentMenu(null);
    setStoryMenu(null);
    setCommentInput('');
    void loadStoryDetail(story);
  };

  const handleRefreshSelectedStory = useCallback(() => {
    if (!selectedStory || typeof selectedStory.remoteId !== 'number') {
      return;
    }

    setDetailRefreshing(true);

    const refresh = async () => {
      try {
        const detail = await fetchBookStoryDetail(selectedStory.remoteId as number);
        if (!detail) {
          showToast('해당 책이야기를 찾을 수 없습니다.');
          return;
        }
        const mapped = mapRemoteDetailToStory(detail, selectedStory);
        applyStoryUpdate(mapped);
      } catch (error) {
        if (!(error instanceof ApiError)) {
          showToast('책이야기 상세를 새로고침하지 못했습니다.');
        }
      } finally {
        setDetailRefreshing(false);
      }
    };

    void refresh();
  }, [applyStoryUpdate, selectedStory]);

  const handleToggleLike = (id: string) => {
    requireAuth(() => {
      const target = stories.find((story) => story.id === id);
      if (!target || typeof target.remoteId !== 'number') return;
      const remoteId = target.remoteId;
      const nextLiked = !target.liked;

      setStories((prev) =>
        prev.map((story) => {
          if (story.id !== id) return story;
          const likes = nextLiked ? story.likes + 1 : Math.max(0, story.likes - 1);
          return { ...story, liked: nextLiked, likes };
        }),
      );
      setSelectedStory((prev) => {
        if (!prev || prev.id !== id) return prev;
        const likes = nextLiked ? prev.likes + 1 : Math.max(0, prev.likes - 1);
        return { ...prev, liked: nextLiked, likes };
      });

      const submit = async () => {
        try {
          await toggleBookStoryLike(remoteId);
        } catch {
          // Rollback on failure
          setStories((prev) =>
            prev.map((story) => {
              if (story.id !== id) return story;
              const likes = !nextLiked ? story.likes + 1 : Math.max(0, story.likes - 1);
              return { ...story, liked: !nextLiked, likes };
            }),
          );
          setSelectedStory((prev) => {
            if (!prev || prev.id !== id) return prev;
            const likes = !nextLiked ? prev.likes + 1 : Math.max(0, prev.likes - 1);
            return { ...prev, liked: !nextLiked, likes };
          });
        }
      };
      void submit();
    });
  };

  const handleSubmitComment = () => {
    requireAuth(() => {
      if (!selectedStory || !commentInput.trim()) {
        showToast('댓글 내용을 입력해주세요.');
        return;
      }
      const content = commentInput.trim();
      const isEditing = typeof editingCommentId === 'number';
      const parentCommentId = !isEditing ? replyTarget?.commentId : undefined;
      const replyCommentKey = !isEditing ? replyTarget?.commentKey : undefined;
      let updated: Story;

      if (isEditing) {
        updated = {
          ...selectedStory,
          commentList: selectedStory.commentList.map((comment) =>
            comment.remoteId === editingCommentId ? { ...comment, text: content } : comment,
          ),
        };
      } else {
        const newComment: Comment = {
          id: `c-${Date.now()}`,
          author: 'hy_me',
          time: '방금 전',
          text: content,
          mine: true,
        };
        const nextCommentList = [...selectedStory.commentList];
        if (replyCommentKey) {
          const targetIndex = nextCommentList.findIndex((item) => item.id === replyCommentKey);
          if (targetIndex >= 0) {
            nextCommentList.splice(targetIndex + 1, 0, newComment);
          } else {
            nextCommentList.unshift(newComment);
          }
        } else {
          nextCommentList.unshift(newComment);
        }
        updated = {
          ...selectedStory,
          commentList: nextCommentList,
          comments: selectedStory.comments + 1,
        };
      }

      applyStoryUpdate(updated);
      setCommentInput('');
      setEditingCommentId(null);
      setReplyTarget(null);
      setCommentMenu(null);

      const remoteId = selectedStory.remoteId;
      if (typeof remoteId !== 'number') return;

      const submit = async () => {
        try {
          if (isEditing && typeof editingCommentId === 'number') {
            await updateBookStoryComment(remoteId, editingCommentId, content);
          } else {
            await createBookStoryComment(remoteId, content, parentCommentId);
          }
        } catch {
          applyStoryUpdate(selectedStory);
        }
      };
      void submit();
    });
  };

  useFocusEffect(
    useCallback(() => {
      return () => {
        setSelectedStory(null);
        setIsComposing(false);
        setEditingStoryId(null);
        setEditingCommentId(null);
        setReplyTarget(null);
        setCommentMenu(null);
        setStoryMenu(null);
        setCommentInput('');
      };
    }, []),
  );

  useEffect(() => {
    if (!route.params?.openCompose) return;
    const initialBook = toComposeBook(route.params?.composeBook);
    openCompose(initialBook ?? undefined);
    navigation.setParams({ openCompose: false, composeBook: undefined });
  }, [navigation, openCompose, route.params?.composeBook, route.params?.openCompose]);

  useEffect(() => {
    const value = route.params?.openStoryId;
    const remoteId =
      typeof value === 'number'
        ? value
        : typeof value === 'string'
          ? Number(value)
          : NaN;
    if (!Number.isInteger(remoteId) || remoteId <= 0) return;

    void openStoryDetailByRemoteId(remoteId);

    navigation.setParams({ openStoryId: undefined });
  }, [navigation, openStoryDetailByRemoteId, route.params?.openStoryId]);

  useEffect(() => {
    const parent = navigation.getParent();
    if (!parent) return undefined;

    const unsubscribe = parent.addListener('tabPress', (event: any) => {
      if (!hasUnsavedStoryChanges) return;

      const targetKey = event?.target;
      const parentState = parent.getState();
      const targetRoute = parentState.routes.find(
        (routeItem: { key: string; name: string }) => routeItem.key === targetKey,
      );
      if (!targetRoute || targetRoute.name === 'Story') return;

      event.preventDefault();
      Alert.alert('알림', '현재 페이지는 저장 되지 않습니다.', [
        { text: '취소', style: 'cancel' },
        {
          text: '닫기',
          style: 'destructive',
          onPress: () => {
            setCommentInput('');
            setEditingCommentId(null);
            setReplyTarget(null);
            setCommentMenu(null);
            setStoryMenu(null);
            setSelectedStory(null);
            closeCompose();
            parent.navigate(targetRoute.name as never);
          },
        },
      ]);
    });

    return unsubscribe;
  }, [closeCompose, hasUnsavedStoryChanges, navigation]);

  useEffect(() => {
    const unsubscribe = navigation.addListener('beforeRemove', (event: any) => {
      if (!hasUnsavedStoryChanges) return;

      event.preventDefault();
      Alert.alert('알림', '현재 페이지는 저장 되지 않습니다.', [
        { text: '취소', style: 'cancel' },
        {
          text: '닫기',
          style: 'destructive',
          onPress: () => {
            setCommentInput('');
            setEditingCommentId(null);
            setReplyTarget(null);
            setCommentMenu(null);
            setStoryMenu(null);
            setSelectedStory(null);
            closeCompose();
            navigation.dispatch(event.data.action);
          },
        },
      ]);
    });

    return unsubscribe;
  }, [closeCompose, hasUnsavedStoryChanges, navigation]);

  if (submittingStory) {
    return (
      <ScreenLayout title="책 이야기" onPressLogo={handlePressHeaderLogo}>
        <BookFlipLoadingScreen />
      </ScreenLayout>
    );
  }

  if (selectedStory) {
    const book = selectedStory.book;
    return (
      <ScreenLayout title="책 이야기" onPressLogo={handlePressHeaderLogo}>
        <Animated.View
          style={[
            styles.detailSwipeContainer,
            { transform: [{ translateX: detailTranslateX }] },
          ]}
          {...detailBackSwipeResponder.panHandlers}
        >
        <KeyboardAvoidingView style={styles.container} behavior="padding">
          <ScrollView
            contentContainerStyle={styles.detailContent}
            showsVerticalScrollIndicator={false}
            refreshControl={
              <RefreshControl
                refreshing={detailRefreshing}
                onRefresh={handleRefreshSelectedStory}
                tintColor={colors.primary1}
                colors={[colors.primary1]}
              />
            }
          >
          <View style={styles.breadcrumbRow}>
            <Pressable
              style={styles.breadcrumbButton}
              onPress={closeStoryDetail}
            >
              <Text style={styles.breadcrumbText}>책이야기</Text>
              <MaterialIcons
                name="chevron-right"
                size={18}
                color={colors.gray4}
              />
              <Text style={[styles.breadcrumbText, styles.breadcrumbActive]}>
                상세보기
              </Text>
            </Pressable>
          </View>

          <View style={styles.detailMetaRow}>
            <Text style={styles.detailMetaText}>{selectedStory.timeAgo}</Text>
            <Text style={styles.detailMetaDot}>·</Text>
            <Text style={styles.detailMetaText}>
              조회수 {selectedStory.views}
            </Text>
          </View>

          <View style={styles.detailHeader}>
            <View style={styles.storyAvatar}>
              {selectedStory.profileImageUrl ? (
                <Image source={{ uri: selectedStory.profileImageUrl }} style={styles.storyAvatarImage} />
              ) : (
                <MaterialIcons
                  name="person-outline"
                  size={28}
                  color={colors.gray5}
                />
              )}
            </View>
            <View style={styles.detailAuthorBlock}>
              <Text style={styles.storyAuthor}>{selectedStory.author}</Text>
            </View>
            <View style={styles.detailHeaderActions}>
              {!(isLoggedIn && selectedStory.mine) && (
                <Pressable
                  style={[
                    styles.chipButton,
                    selectedStory.subscribed ? styles.chipActive : styles.chipInactive,
                  ]}
                  onPress={() => handleToggleSubscribe(selectedStory.id)}
                >
                  <Text
                    style={[
                      styles.chipText,
                      selectedStory.subscribed
                        ? styles.chipTextActive
                        : styles.chipTextInactive,
                    ]}
                  >
                    {selectedStory.subscribed ? '구독중' : '구독'}
                  </Text>
                </Pressable>
              )}
              <Pressable
                onPress={openStoryMenu}
                hitSlop={8}
                style={styles.storyMenuButton}
              >
                <MaterialIcons
                  name="more-vert"
                  size={22}
                  color={colors.gray5}
                />
              </Pressable>
            </View>
          </View>

          {book && (
            <View style={styles.detailBookRow}>
              <View style={styles.detailBookThumb}>
                {book.image ? (
                  <Image
                    source={{ uri: book.image }}
                    style={styles.detailBookThumbImage}
                    resizeMode="cover"
                  />
                ) : null}
              </View>
              <View style={styles.detailBookInfo}>
                <Text style={styles.detailBookTitle}>{book.title}</Text>
                <Text style={styles.detailBookAuthor}>{book.author}</Text>
              </View>
              <View style={styles.detailActionCol}>
                <Pressable
                  style={styles.detailActionRow}
                  onPress={() => handleToggleLike(selectedStory.id)}
                >
                  <MaterialIcons
                    name={selectedStory.liked ? 'favorite' : 'favorite-border'}
                    size={20}
                    color={selectedStory.liked ? colors.likeRed : colors.gray5}
                  />
                  <Text style={styles.detailActionText}>
                    좋아요 {selectedStory.likes}
                  </Text>
                </Pressable>
                <Pressable
                  style={styles.detailActionRow}
                  onPress={handleShareStory}
                >
                  <MaterialIcons
                    name="share"
                    size={20}
                    color={colors.gray5}
                  />
                  <Text style={styles.detailActionText}>공유하기</Text>
                </Pressable>
              </View>
            </View>
          )}

          <Text style={styles.detailTitle}>{selectedStory.title}</Text>
          <Text style={styles.detailBody}>{selectedStory.fullText}</Text>

          <View style={styles.commentSection}>
            <Text style={styles.commentHeader}>댓글</Text>
            {(editingCommentId || !replyTarget) && (
              <View style={styles.commentInputRow}>
                <TextInput
                  ref={commentInputRef}
                  style={[
                    styles.commentInput,
                    { height: commentInputHeight },
                  ]}
                  placeholder={editingCommentId ? '댓글 수정' : '댓글 내용'}
                  placeholderTextColor={colors.gray3}
                  value={commentInput}
                  onChangeText={setCommentInput}
                  multiline
                  scrollEnabled={false}
                  textAlignVertical="top"
                  onContentSizeChange={(event) => {
                    handleCommentInputSizeChange(event.nativeEvent.contentSize.height);
                  }}
                />
                <Pressable
                  style={[
                    styles.commentSubmit,
                    isCommentSubmitDisabled && styles.commentSubmitDisabled,
                  ]}
                  onPress={handleSubmitComment}
                  disabled={isCommentSubmitDisabled}
                >
                  <Text
                    style={[
                      styles.commentSubmitText,
                      isCommentSubmitDisabled && styles.commentSubmitTextDisabled,
                    ]}
                  >
                    {editingCommentId ? '수정' : '입력'}
                  </Text>
                </Pressable>
              </View>
            )}

            <View style={styles.commentList}>
              {selectedStory.commentList.map((comment) => (
                <View
                  key={comment.id}
                  style={styles.commentItem}
                >
                  <View style={styles.commentAvatar}>
                    <MaterialIcons
                      name="person-outline"
                      size={20}
                      color={colors.gray5}
                    />
                  </View>
                  <View style={styles.commentBody}>
                    <View style={styles.commentHeaderRow}>
                      <View style={styles.commentMetaRow}>
                        <Text style={styles.commentAuthor}>{comment.author}</Text>
                        {comment.author === selectedStory.author && (
                          <View style={styles.commentAuthorBadge}>
                            <Text style={styles.commentAuthorBadgeText}>작성자</Text>
                          </View>
                        )}
                        <Text style={styles.commentTime}>{comment.time}</Text>
                      </View>
                      <Pressable
                        style={styles.commentMenuButton}
                        hitSlop={8}
                        onPress={(event) => openCommentMenu(comment, event)}
                      >
                        <MaterialIcons
                          name="more-vert"
                          size={16}
                          color={colors.gray4}
                        />
                      </Pressable>
                    </View>
                    <Text style={styles.commentText}>{comment.text}</Text>
                    {!editingCommentId && replyTarget?.commentKey === comment.id && (
                      <View style={styles.inlineReplyRow}>
                        <TextInput
                          ref={inlineReplyInputRef}
                          style={[
                            styles.commentInput,
                            { height: commentInputHeight },
                          ]}
                          placeholder="댓글 내용"
                          placeholderTextColor={colors.gray3}
                          value={commentInput}
                          onChangeText={setCommentInput}
                          multiline
                          scrollEnabled={false}
                          textAlignVertical="top"
                          onContentSizeChange={(event) => {
                            handleCommentInputSizeChange(event.nativeEvent.contentSize.height);
                          }}
                        />
                        <Pressable
                          style={[
                            styles.commentSubmit,
                            isCommentSubmitDisabled && styles.commentSubmitDisabled,
                          ]}
                          onPress={handleSubmitComment}
                          disabled={isCommentSubmitDisabled}
                        >
                          <Text
                            style={[
                              styles.commentSubmitText,
                              isCommentSubmitDisabled && styles.commentSubmitTextDisabled,
                            ]}
                          >
                            입력
                          </Text>
                        </Pressable>
                      </View>
                    )}
                  </View>
                </View>
              ))}
            </View>
          </View>
        </ScrollView>
        <Modal
          visible={Boolean(commentMenu)}
          transparent
          animationType="fade"
          onRequestClose={() => setCommentMenu(null)}
        >
          <Pressable
            style={styles.commentMenuModalBackdrop}
            onPress={() => setCommentMenu(null)}
          >
            {commentMenu && (
              <Pressable
                style={[
                  styles.commentMenuPopover,
                  getPopoverMenuPosition(
                    commentMenu.pageX,
                    commentMenu.pageY,
                    screenWidth,
                    screenHeight,
                  ),
                ]}
                onPress={(event) => event.stopPropagation()}
              >
                {isLoggedIn && commentMenu.comment.mine ? (
                  <>
                    <Pressable
                      style={styles.commentMenuItem}
                      onPress={() => handleSelectCommentMenuAction('edit')}
                    >
                      <Text style={styles.commentMenuText}>수정하기</Text>
                    </Pressable>
                    <View style={styles.commentMenuDivider} />
                    <Pressable
                      style={styles.commentMenuItem}
                      onPress={() => handleSelectCommentMenuAction('delete')}
                    >
                      <Text style={[styles.commentMenuText, styles.commentMenuTextDanger]}>
                        삭제하기
                      </Text>
                    </Pressable>
                  </>
                ) : (
                  <>
                    <Pressable
                      style={styles.commentMenuItem}
                      onPress={() => handleSelectCommentMenuAction('report')}
                    >
                      <Text style={styles.commentMenuText}>신고하기</Text>
                    </Pressable>
                    <View style={styles.commentMenuDivider} />
                    <Pressable
                      style={styles.commentMenuItem}
                      onPress={() => handleSelectCommentMenuAction('reply')}
                    >
                      <Text style={styles.commentMenuText}>댓글 쓰기</Text>
                    </Pressable>
                  </>
                )}
              </Pressable>
            )}
          </Pressable>
        </Modal>
        <Modal
          visible={Boolean(storyMenu)}
          transparent
          animationType="fade"
          onRequestClose={() => setStoryMenu(null)}
        >
          <Pressable
            style={styles.commentMenuModalBackdrop}
            onPress={() => setStoryMenu(null)}
          >
            {storyMenu && (
              <Pressable
                style={[
                  styles.commentMenuPopover,
                  getPopoverMenuPosition(
                    storyMenu.pageX,
                    storyMenu.pageY,
                    screenWidth,
                    screenHeight,
                  ),
                ]}
                onPress={(event) => event.stopPropagation()}
              >
                {isLoggedIn && selectedStory.mine ? (
                  <>
                    <Pressable
                      style={styles.commentMenuItem}
                      onPress={() => handleSelectStoryMenuAction('edit')}
                    >
                      <Text style={styles.commentMenuText}>수정하기</Text>
                    </Pressable>
                    <View style={styles.commentMenuDivider} />
                    <Pressable
                      style={styles.commentMenuItem}
                      onPress={() => handleSelectStoryMenuAction('delete')}
                    >
                      <Text style={[styles.commentMenuText, styles.commentMenuTextDanger]}>
                        삭제하기
                      </Text>
                    </Pressable>
                  </>
                ) : (
                  <>
                    <Pressable
                      style={styles.commentMenuItem}
                      onPress={() => handleSelectStoryMenuAction('report')}
                    >
                      <Text style={styles.commentMenuText}>신고하기</Text>
                    </Pressable>
                    <View style={styles.commentMenuDivider} />
                    <Pressable
                      style={styles.commentMenuItem}
                      onPress={() => handleSelectStoryMenuAction('share')}
                    >
                      <Text style={styles.commentMenuText}>공유하기</Text>
                    </Pressable>
                  </>
                )}
              </Pressable>
            )}
          </Pressable>
        </Modal>
        <ReportMemberModal
          visible={Boolean(reportModal)}
          target={reportModal}
          submitting={submittingReport}
          onClose={closeReportModal}
          onSubmit={submitReport}
        />
        </KeyboardAvoidingView>
        </Animated.View>
      </ScreenLayout>
    );
  }

  if (isComposing) {
    return (
      <ScreenLayout title="책 이야기" onPressLogo={handlePressHeaderLogo}>
        <KeyboardAvoidingView style={styles.container} behavior="padding">
          <ScrollView
            contentContainerStyle={styles.composeContent}
            showsVerticalScrollIndicator={false}
          >
          <View style={styles.composeHeader}>
            <Pressable
              style={styles.composeBack}
              onPress={requestCloseCompose}
            >
              <MaterialIcons name="chevron-left" size={20} color={colors.gray5} />
              <Text style={styles.composeBackText}>목록으로</Text>
            </Pressable>
            <View style={styles.writeRow}>
              <MaterialIcons
                name="play-arrow"
                size={18}
                color={colors.gray5}
              />
              <Text style={styles.writeLabel}>
                {editingStoryId ? '글 수정하기' : '글 작성하기'}
              </Text>
            </View>
          </View>

          <View style={styles.card}>
            {!selectedBook ? (
              <Pressable
                style={styles.bookSelectButton}
                onPress={openBookPicker}
              >
                <Text style={styles.bookSelectText}>책 선택하기</Text>
              </Pressable>
            ) : (
              <View style={styles.bookSummary}>
                {selectedBook.image ? (
                  <Image source={{ uri: selectedBook.image }} style={styles.bookThumbLarge} />
                ) : (
                  <View style={styles.bookThumbLarge} />
                )}
                <View style={styles.bookInfo}>
                  <Text style={styles.bookTitle}>{selectedBook.title}</Text>
                  <Text style={styles.bookAuthor}>{selectedBook.author}</Text>
                  <Text style={styles.bookDescription} numberOfLines={3}>
                    {selectedBook.description}
                  </Text>
                </View>
              </View>
            )}
            {selectedBook && (
              <Pressable
                style={styles.secondaryButton}
                onPress={openBookPicker}
              >
                <Text style={styles.secondaryButtonText}>변경하기</Text>
              </Pressable>
            )}
          </View>

          <View style={styles.formCard}>
            <TextInput
              value={title}
              onChangeText={setTitle}
              placeholder="제목을 입력해주세요."
              placeholderTextColor={colors.gray3}
              style={styles.titleInput}
            />
            <TextInput
              value={body}
              onChangeText={setBody}
              placeholder="자신의 책이야기를 들려주세요. (최대 5000자)"
              placeholderTextColor={colors.gray3}
              style={styles.bodyInput}
              multiline
              textAlignVertical="top"
            />
            <View style={styles.formActions}>
              <Pressable
                style={styles.secondaryButton}
                onPress={requestCloseCompose}
              >
                <Text style={styles.secondaryButtonText}>취소</Text>
              </Pressable>
              <Pressable style={styles.primaryButton} onPress={handleSubmit}>
                <Text style={styles.primaryButtonText}>
                  {editingStoryId ? '수정' : '등록'}
                </Text>
              </Pressable>
            </View>
          </View>
        </ScrollView>
        <Modal
          visible={showBookPicker}
          transparent
          animationType="slide"
          onRequestClose={closeBookPicker}
        >
          <Pressable style={styles.bookPickerBackdrop} onPress={closeBookPicker}>
            <Pressable
              style={styles.bookPickerSheet}
              onPress={(event) => event.stopPropagation()}
            >
              <View style={styles.bookPickerHeaderRow}>
                <Text style={styles.bookPickerHeaderText}>책 검색</Text>
                <IconButton
                  name="close"
                  color={colors.gray5}
                  size={20}
                  onPress={closeBookPicker}
                />
              </View>
              <View style={styles.bookSearchInputRow}>
                <Pressable onPress={handleSubmitBookSearch}>
                  <MaterialIcons name="search" size={22} color={colors.gray4} />
                </Pressable>
                <TextInput
                  value={bookSearchQuery}
                  onChangeText={setBookSearchQuery}
                  placeholder="책 제목, 작가 이름을 검색해보세요"
                  placeholderTextColor={colors.gray3}
                  style={styles.bookSearchInput}
                  onSubmitEditing={handleSubmitBookSearch}
                  returnKeyType="search"
                  autoFocus
                />
                {bookSearchQuery.length > 0 ? (
                  <IconButton
                    name="close"
                    color={colors.gray4}
                    size={18}
                    onPress={() => {
                      setBookSearchQuery('');
                      setBookSearchSearched(false);
                      setBookSearchKeyword('');
                      setBookSearchResults([]);
                    }}
                  />
                ) : null}
              </View>
              {bookSearchSearched ? (
                bookSearchLoading ? (
                  <Text style={styles.bookSearchGuideText}>검색 중...</Text>
                ) : (
                  <Text style={styles.bookSearchGuideText}>
                    "{bookSearchKeyword}" 총 {bookSearchResults.length}개의 검색결과가 있습니다.
                  </Text>
                )
              ) : (
                <Text style={styles.bookSearchGuideText}>검색어를 입력하고 책을 선택해주세요.</Text>
              )}

              <ScrollView
                style={styles.bookPickerScroll}
                contentContainerStyle={styles.bookPickerContent}
                keyboardShouldPersistTaps="handled"
                showsVerticalScrollIndicator={false}
              >
                {bookSearchSearched && !bookSearchLoading && bookSearchResults.length === 0 ? (
                  <Text style={styles.bookPickerEmptyText}>검색 결과가 없습니다.</Text>
                ) : null}

                {bookSearchResults.map((bookItem, index) => (
                  <Pressable
                    key={`${bookItem.isbn}-${index}`}
                    onPress={() => handleSelectBookFromSearch(bookItem)}
                    style={styles.bookOption}
                  >
                    {bookItem.imgUrl ? (
                      <Image source={{ uri: bookItem.imgUrl }} style={styles.bookThumb} />
                    ) : (
                      <View style={styles.bookThumb} />
                    )}
                    <View style={styles.bookInfo}>
                      <Text style={styles.bookTitle} numberOfLines={2}>
                        {bookItem.title}
                      </Text>
                      <Text style={styles.bookAuthor}>{bookItem.author}</Text>
                      <Text style={styles.bookDescription} numberOfLines={2}>
                        {bookItem.description || bookItem.publisher || '책 설명이 없습니다.'}
                      </Text>
                    </View>
                  </Pressable>
                ))}
              </ScrollView>
            </Pressable>
          </Pressable>
        </Modal>
        </KeyboardAvoidingView>
      </ScreenLayout>
    );
  }

  return (
    <ScreenLayout title="책 이야기" onPressLogo={handlePressHeaderLogo}>
      <KeyboardAvoidingView style={styles.container} behavior="padding">
        <FlatList
          ref={listRef}
          data={storyListItems}
          keyExtractor={(item) => item.key}
          ListHeaderComponent={
            <View style={styles.secondaryHeader}>
              <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                contentContainerStyle={styles.filterRow}
              >
                {storyTabs.map((tab) => {
                  const active = selectedTab.key === tab.key;
                  return (
                    <Pressable
                      key={tab.key}
                      onPress={() => setSelectedFilterKey(tab.key)}
                      style={[styles.filterTab, active ? styles.filterTabActive : null]}
                    >
                      <Text
                        style={[styles.filterTabText, active ? styles.filterTabTextActive : null]}
                      >
                        {tab.label}
                      </Text>
                    </Pressable>
                  );
                })}
              </ScrollView>
            </View>
          }
          renderItem={({ item }) => {
            if (item.type === 'recommended') {
              return (
                <View style={styles.recommendedCard}>
                  <Text style={styles.recommendedTitle}>사용자 추천</Text>
                  {recommendedUsers.map((user) => (
                    <SubscribeUserItem
                      key={user.id}
                      nickname={user.nickname}
                      profileImageUrl={user.profileImageUrl}
                      followingCount={user.followingCount}
                      followerCount={user.followerCount}
                      subscribed={user.subscribed}
                      onPressProfile={() => openUserProfile(user.nickname)}
                      onPressSubscribe={() => handleToggleRecommendedSubscribe(user.id)}
                    />
                  ))}
                </View>
              );
            }

            const story = item.story;
            const isMineForViewer = isLoggedIn && (story.mine ?? false);
            return (
              <BookStoryFeedCard
                authorName={story.author}
                profileImgSrc={story.profileImageUrl}
                timeAgo={story.timeAgo}
                viewCount={story.views}
                title={story.title}
                content={story.body}
                likeCount={story.likes}
                commentCount={story.comments}
                liked={story.liked}
                isAuthor={isMineForViewer}
                subscribed={isMineForViewer ? undefined : story.subscribed}
                coverImgSrc={story.book?.image}
                onPress={() => handleSelectStory(story)}
                onToggleLike={() => handleToggleLike(story.id)}
                onToggleSubscribe={
                  isMineForViewer ? undefined : () => handleToggleSubscribe(story.id)
                }
                onPressAuthor={() => openUserProfile(story.author)}
              />
            );
          }}
          ItemSeparatorComponent={() => <View style={styles.storyItemSeparator} />}
          contentContainerStyle={styles.listContent}
          onEndReached={() => {
            if (!canLoadApiFeed) return;
            void loadStories();
          }}
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
        <FloatingActionButton onPress={() => openCompose()}>
          <SvgUri uri={writeIconUri} width={20} height={20} />
        </FloatingActionButton>
      </KeyboardAvoidingView>
    </ScreenLayout>
  );
}

function mapRemoteStoryToStory(item: RemoteStoryItem): Story {
  const book: Book | undefined = item.bookInfo
      ? {
        id: item.bookInfo.isbn ?? `book-${item.id}`,
        title: item.bookInfo.title ?? '책 제목',
        author: item.bookInfo.author ?? '작가 미상',
        description: item.bookInfo.description ?? '',
        image: normalizeRemoteImageUrl(item.bookInfo.imgUrl),
      }
    : undefined;

  return {
    id: `story-${item.id}`,
    remoteId: item.id,
    author: item.nickname,
    profileImageUrl: normalizeRemoteImageUrl(item.profileImageUrl),
    mine: item.mine ?? false,
    timeAgo: toKstTimeAgoLabel(item.createdAt),
    views: item.viewCount,
    title: item.title,
    body: item.description,
    fullText: item.description,
    likes: item.likeCount,
    comments: item.commentCount,
    tag: '전체',
    subscribed: item.following,
    liked: item.liked,
    book,
    commentList: [],
  };
}

function mapRemoteCommentToComment(comment: RemoteStoryComment): Comment {
  return {
    id: `comment-${comment.id}`,
    remoteId: comment.id,
    author: comment.nickname,
    profileImageUrl: normalizeRemoteImageUrl(comment.profileImageUrl),
    time: toKstTimeAgoLabel(comment.createdAt),
    text: comment.deleted ? '삭제된 댓글입니다.' : comment.content,
    mine: comment.mine,
    deleted: comment.deleted,
    replyTo: typeof comment.parentCommentId === 'number' ? `comment-${comment.parentCommentId}` : undefined,
  };
}

function mapRemoteDetailToStory(detail: RemoteStoryDetail, previous?: Story): Story {
  const mapped = mapRemoteStoryToStory(detail);
  return {
    ...(previous ?? mapped),
    ...mapped,
    mine: detail.mine,
    fullText: detail.description,
    commentList: detail.commentList.map(mapRemoteCommentToComment),
  };
}

function getPopoverMenuPosition(
  pageX: number,
  pageY: number,
  screenWidth: number,
  screenHeight: number,
) {
  const menuWidth = 132;
  const menuHeight = 84;
  const margin = spacing.sm;

  const left = Math.min(
    screenWidth - menuWidth - margin,
    Math.max(margin, pageX - menuWidth + 18),
  );
  const preferredTop = pageY - menuHeight - 8;
  const fallbackTop = pageY + 8;
  const top =
    preferredTop < 96
      ? Math.min(screenHeight - menuHeight - margin, fallbackTop)
      : Math.min(screenHeight - menuHeight - margin, preferredTop);

  return { left, top };
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  detailSwipeContainer: {
    flex: 1,
  },
  listContent: {
    paddingBottom: spacing.xl,
  },
  storyItemSeparator: {
    height: spacing.sm,
  },
  secondaryHeader: {
    backgroundColor: colors.white,
    borderBottomWidth: 1,
    borderBottomColor: colors.gray2,
    marginBottom: spacing.md,
    paddingHorizontal: spacing.md,
    paddingTop: spacing.xs,
    gap: spacing.sm,
  },
  filterRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  filterTab: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.sm,
    minWidth: 72,
    borderBottomWidth: 2,
    borderBottomColor: 'transparent',
  },
  filterTabActive: {
    borderColor: colors.primary1,
  },
  filterTabText: {
    ...typography.body1_3,
    color: colors.gray5,
  },
  filterTabTextActive: {
    ...typography.body1_2,
    color: colors.gray6,
  },
  recommendedCard: {
    borderWidth: 1,
    borderColor: colors.gray2,
    borderRadius: radius.md,
    padding: spacing.md,
    backgroundColor: colors.gray1,
    gap: spacing.sm,
    marginHorizontal: spacing.md,
  },
  recommendedTitle: {
    ...typography.subhead4_1,
    color: colors.gray6,
  },
  writeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
  },
  writeLabel: {
    ...typography.body1_3,
    color: colors.gray6,
  },
  card: {
    backgroundColor: colors.white,
    borderRadius: radius.md,
    padding: spacing.md,
    gap: spacing.sm,
    shadowColor: '#000',
    shadowOpacity: 0.04,
    shadowRadius: 6,
    shadowOffset: { width: 0, height: 2 },
    elevation: 1,
  },
  bookSelectButton: {
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.primary1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: spacing.md,
  },
  bookSelectText: {
    ...typography.body1_2,
    color: colors.primary1,
  },
  bookOption: {
    flexDirection: 'row',
    gap: spacing.md,
    padding: spacing.sm,
    borderRadius: radius.sm,
    borderWidth: 1,
    borderColor: colors.gray2,
  },
  bookThumb: {
    width: 48,
    height: 64,
    borderRadius: radius.xs,
    backgroundColor: colors.subbrown4,
  },
  bookThumbLarge: {
    width: 64,
    height: 90,
    borderRadius: radius.xs,
    backgroundColor: colors.subbrown4,
  },
  bookInfo: {
    flex: 1,
    gap: spacing.xs,
  },
  bookTitle: {
    ...typography.body1_2,
    color: colors.gray6,
  },
  bookAuthor: {
    ...typography.body2_3,
    color: colors.gray5,
  },
  bookDescription: {
    ...typography.body2_3,
    color: colors.gray5,
  },
  bookSummary: {
    flexDirection: 'row',
    gap: spacing.md,
    alignItems: 'flex-start',
  },
  bookPickerBackdrop: {
    flex: 1,
    backgroundColor: colors.overlay30,
    justifyContent: 'flex-end',
  },
  bookPickerSheet: {
    backgroundColor: colors.white,
    borderTopLeftRadius: radius.md,
    borderTopRightRadius: radius.md,
    padding: spacing.md,
    maxHeight: '78%',
    gap: spacing.sm,
  },
  bookPickerHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  bookPickerHeaderText: {
    ...typography.subhead4_1,
    color: colors.gray6,
  },
  bookSearchInputRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    borderWidth: 1,
    borderColor: colors.gray2,
    borderRadius: radius.md,
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
  },
  bookSearchInput: {
    flex: 1,
    ...typography.body1_3,
    color: colors.gray6,
  },
  bookSearchGuideText: {
    ...typography.body2_3,
    color: colors.gray4,
  },
  bookPickerScroll: {
    maxHeight: 420,
  },
  bookPickerContent: {
    gap: spacing.sm,
    paddingBottom: spacing.sm,
  },
  bookPickerEmptyText: {
    ...typography.body1_3,
    color: colors.gray4,
    textAlign: 'center',
    paddingVertical: spacing.md,
  },
  secondaryButton: {
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.sm,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.gray2,
    alignSelf: 'flex-start',
  },
  secondaryButtonText: {
    ...typography.body1_2,
    color: colors.gray6,
  },
  primaryButton: {
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.sm,
    borderRadius: radius.md,
    backgroundColor: colors.primary1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  primaryButtonText: {
    ...typography.body1_2,
    color: colors.white,
  },
  formCard: {
    backgroundColor: colors.white,
    borderRadius: radius.md,
    padding: spacing.md,
    gap: spacing.sm,
    shadowColor: '#000',
    shadowOpacity: 0.04,
    shadowRadius: 6,
    shadowOffset: { width: 0, height: 2 },
    elevation: 1,
  },
  titleInput: {
    ...typography.subhead4,
    color: colors.gray6,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.gray2,
    paddingBottom: spacing.xs,
  },
  bodyInput: {
    ...typography.body1_3,
    color: colors.gray6,
    minHeight: 160,
    paddingTop: spacing.sm,
  },
  formActions: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: spacing.sm,
  },
  storyHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  storyAvatar: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: colors.gray1,
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  storyAvatarImage: {
    width: '100%',
    height: '100%',
  },
  storyMeta: {
    flex: 1,
  },
  storyAuthor: {
    ...typography.body1_2,
    color: colors.gray6,
  },
  storySubtitle: {
    ...typography.body2_3,
    color: colors.gray4,
  },
  chipButton: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
    borderRadius: radius.sm,
  },
  chipActive: {
    backgroundColor: colors.primary1,
  },
  chipInactive: {
    backgroundColor: colors.primary2,
  },
  chipText: {
    ...typography.body2_2,
  },
  chipTextActive: {
    color: colors.white,
  },
  chipTextInactive: {
    color: colors.white,
  },
  storyImagePlaceholder: {
    aspectRatio: 16 / 9,
    borderRadius: radius.md,
    backgroundColor: colors.gray1,
    overflow: 'hidden',
    alignItems: 'center',
    justifyContent: 'center',
  },
  storyImageBg: {
    opacity: 0.55,
  },
  storyImage: {
    width: '60%',
    height: '60%',
  },
  storyTitle: {
    ...typography.subhead4_1,
    color: colors.gray6,
  },
  storyText: {
    ...typography.body1_3,
    color: colors.gray6,
  },
  storyActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  actionDivider: {
    width: 1,
    height: 16,
    backgroundColor: colors.gray2,
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
  composeContent: {
    padding: spacing.md,
    gap: spacing.md,
  },
  composeHeader: {
    gap: spacing.xs,
  },
  composeBack: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs / 2,
  },
  composeBackText: {
    ...typography.body1_3,
    color: colors.gray5,
  },
  detailContent: {
    padding: spacing.md,
    gap: spacing.md,
  },
  breadcrumbRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  breadcrumbButton: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  breadcrumbText: {
    ...typography.body2_3,
    color: colors.gray4,
  },
  breadcrumbActive: {
    color: colors.gray6,
  },
  detailMetaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
  },
  detailMetaText: {
    ...typography.body2_3,
    color: colors.gray5,
  },
  detailMetaDot: {
    ...typography.body2_3,
    color: colors.gray3,
  },
  detailHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  detailAuthorBlock: {
    flex: 1,
  },
  detailHeaderActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
  },
  storyMenuButton: {
    padding: spacing.xs / 2,
  },
  detailBookRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    paddingVertical: spacing.sm,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.gray2,
  },
  detailBookThumb: {
    width: 64,
    height: 90,
    borderRadius: radius.xs,
    backgroundColor: colors.subbrown4,
    overflow: 'hidden',
  },
  detailBookThumbImage: {
    width: '100%',
    height: '100%',
  },
  detailBookInfo: {
    flex: 1,
    gap: spacing.xs / 2,
  },
  detailBookTitle: {
    ...typography.subhead4_1,
    color: colors.gray6,
  },
  detailBookAuthor: {
    ...typography.body2_3,
    color: colors.gray5,
  },
  detailActionCol: {
    gap: spacing.sm,
  },
  detailActionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
  },
  detailActionText: {
    ...typography.body2_3,
    color: colors.gray5,
  },
  detailTitle: {
    ...typography.subhead3,
    color: colors.gray6,
    marginTop: spacing.sm,
  },
  detailBody: {
    ...typography.body1_3,
    color: colors.gray6,
    lineHeight: 22,
    marginTop: spacing.xs,
  },
  commentSection: {
    marginTop: spacing.lg,
    gap: spacing.sm,
  },
  commentHeader: {
    ...typography.body1_2,
    color: colors.gray6,
  },
  commentInputRow: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    gap: spacing.xs,
  },
  commentInput: {
    flex: 1,
    borderWidth: 1,
    borderColor: colors.gray2,
    borderRadius: radius.md,
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.md,
    ...typography.body1_3,
    color: colors.gray6,
  },
  commentSubmit: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    backgroundColor: colors.primary1,
    borderRadius: radius.md,
  },
  commentSubmitDisabled: {
    backgroundColor: colors.gray2,
  },
  commentSubmitText: {
    ...typography.body1_2,
    color: colors.white,
  },
  commentSubmitTextDisabled: {
    color: colors.gray4,
  },
  commentList: {
    gap: spacing.sm,
  },
  commentItem: {
    flexDirection: 'row',
    gap: spacing.sm,
  },
  commentReply: {
    marginLeft: spacing.md,
  },
  commentAvatar: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: colors.gray1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  commentBody: {
    flex: 1,
    gap: spacing.xs / 2,
  },
  commentHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: spacing.sm,
  },
  commentMetaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  commentAuthorBadge: {
    borderRadius: radius.sm,
    borderWidth: 1,
    borderColor: colors.subbrown4,
    backgroundColor: colors.subbrown4,
    paddingHorizontal: spacing.xs,
    paddingVertical: 2,
  },
  commentAuthorBadgeText: {
    ...typography.body2_3,
    color: colors.primary1,
  },
  commentMenuButton: {
    padding: spacing.xs / 2,
  },
  commentMenuModalBackdrop: {
    flex: 1,
    backgroundColor: 'transparent',
  },
  commentMenuPopover: {
    position: 'absolute',
    width: 132,
    backgroundColor: colors.white,
    borderRadius: radius.sm,
    borderWidth: 1,
    borderColor: colors.gray2,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOpacity: 0.08,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 2 },
    elevation: 6,
  },
  commentMenuItem: {
    paddingVertical: 10,
    paddingHorizontal: spacing.md,
  },
  commentMenuDivider: {
    height: 1,
    backgroundColor: colors.gray2,
  },
  commentMenuText: {
    ...typography.body2_2,
    color: colors.gray6,
  },
  commentMenuTextDanger: {
    color: colors.likeRed,
  },
  reportModalBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.24)',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: spacing.md,
  },
  reportModalCard: {
    width: '100%',
    maxWidth: 760,
    backgroundColor: colors.white,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.gray2,
    padding: spacing.md,
    gap: spacing.sm,
  },
  reportModalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  reportModalTitle: {
    ...typography.subhead3,
    color: colors.gray6,
  },
  reportModalCloseButton: {
    padding: spacing.xs / 2,
  },
  reportTargetText: {
    ...typography.body2_3,
    color: colors.gray4,
  },
  reportLabel: {
    ...typography.body2_3,
    color: colors.gray4,
  },
  reportTypeRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.xs,
  },
  reportTypeButton: {
    minWidth: 92,
    borderWidth: 1,
    borderColor: colors.gray2,
    borderRadius: radius.sm,
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.white,
  },
  reportTypeButtonActive: {
    borderColor: colors.primary1,
    backgroundColor: colors.primary1,
  },
  reportTypeButtonText: {
    ...typography.body2_2,
    color: colors.gray3,
  },
  reportTypeButtonTextActive: {
    color: colors.white,
  },
  reportContentBox: {
    borderWidth: 1,
    borderColor: colors.gray2,
    borderRadius: radius.sm,
    backgroundColor: colors.gray1,
    minHeight: 220,
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.sm,
  },
  reportContentInput: {
    ...typography.body1_3,
    color: colors.gray6,
    minHeight: 200,
  },
  reportSubmitButton: {
    height: 52,
    borderRadius: radius.sm,
    backgroundColor: colors.primary1,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: spacing.xs,
  },
  reportSubmitButtonDisabled: {
    opacity: 0.6,
  },
  reportSubmitButtonText: {
    ...typography.body1_2,
    color: colors.white,
  },
  commentAuthor: {
    ...typography.body1_3,
    color: colors.gray6,
  },
  commentTime: {
    ...typography.body2_3,
    color: colors.gray4,
  },
  commentText: {
    ...typography.body1_3,
    color: colors.gray6,
  },
  inlineReplyRow: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    gap: spacing.xs,
    marginTop: spacing.xs,
  },
});
