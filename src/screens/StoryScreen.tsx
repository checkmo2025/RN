import { useMemo, useRef, useState, useCallback, useEffect } from 'react';
import {
  ActivityIndicator,
  Alert,
  Animated,
  FlatList,
  GestureResponderEvent,
  InteractionManager,
  Keyboard,
  KeyboardAvoidingView,
  LayoutChangeEvent,
  Modal,
  NativeScrollEvent,
  NativeSyntheticEvent,
  ScrollView,
  RefreshControl,
  Share,
  StyleSheet,
  Text,
  TextInput,
  TextInputContentSizeChangeEventData,
  View,
  Platform,
  useWindowDimensions,
  Image,
} from 'react-native';
import {
  useFocusEffect,
  useNavigation,
  useRoute,
  useScrollToTop,
  type EventArg,
  type NavigationAction,
  type NavigationProp,
  type ParamListBase,
  type RouteProp,
} from '@react-navigation/native';
import { MaterialIcons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { PUBLIC_ENV } from '../constants/publicEnv';
import { PENCIL_ICON_URI } from '../constants/iconMap';
import { INPUT_LIMITS } from '../constants/inputLimits';
import { colors, interactionOpacity, layers, radius, scaleSize, spacing, typography } from '../theme';
import { navigateToHome, parsePositiveIntParam } from '../navigation/navigateToHome';
import { FeedbackPressable as Pressable } from '../components/common/FeedbackPressable';
import { DefaultProfileAvatar } from '../components/common/DefaultProfileAvatar';
import { FloatingActionButton } from '../components/common/FloatingActionButton';
import { ScreenLayout } from '../components/common/ScreenLayout';
import { IconButton } from '../components/common/IconButton';
import { ActionMenu, type ActionMenuItem } from '../components/common/ActionMenu';
import {
  BottomSheetActionMenu,
  type BottomSheetActionMenuItem,
} from '../components/common/BottomSheetActionMenu';
import { FormTextInput } from '../components/common/FormTextInput';
import { ReportMemberModal, type ReportMemberModalState } from '../components/common/ReportMemberModal';
import { ToastHost } from '../components/common/ToastHost';
import BookStoryFeedCard from '../components/feature/bookstory/BookStoryFeedCard';
import { BookStoryFeedCardSkeleton } from '../components/feature/bookstory/BookStoryFeedCardSkeleton';
import { SkeletonBox } from '../components/common/SkeletonBox';
import { ImageAttachmentPicker } from '../components/common/ImageAttachmentPicker';
import { ImageGallery } from '../components/common/ImageGallery';
import { ImageViewerModal } from '../components/common/ImageViewerModal';
import SubscribeUserItem from '../components/feature/member/SubscribeUserItem';
import { useAuthGate } from '../contexts/AuthGateContext';
import { useLanguage } from '../contexts/LanguageContext';
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
  type BookStoryStatus,
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
  createReport,
  setFollowingMember,
  type ReportReason,
} from '../services/api/memberApi';
import { ApiError } from '../services/api/http';
import { type BookItem } from '../services/api/bookApi';
import { toKstTimeAgoLabel } from '../utils/date';
import { triggerSelectionHaptic } from '../utils/haptics';
import { normalizeRemoteImageUrl } from '../utils/image';
import { showToast } from '../utils/toast';
import { showAlertAfterKeyboardDismiss } from '../utils/alertAfterKeyboardDismiss';
import { resolveApiError } from '../utils/resolveApiError';
import { createLogger } from '../utils/logger';
import {
  isBlockedMemberNickname,
  isSameMemberNickname,
  subscribeBlockedMemberChanges,
} from '../utils/blockedMembers';
import { useEdgeBackSwipe } from '../hooks/useEdgeBackSwipe';
import { useBookSearch } from '../hooks/useBookSearch';
import { useRelativeNow } from '../hooks/useRelativeNow';
import { useImageAttachments } from '../hooks/useImageAttachments';

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
  createdAt?: string;
  text: string;
  imageUrls: string[];
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
  createdAt?: string;
  views: number;
  title: string;
  body: string;
  fullText: string;
  imageUrls: string[];
  likes: number;
  comments: number;
  tag: string;
  subscribed: boolean;
  liked: boolean;
  book?: Book;
  commentList: Comment[];
};

type StoryFeedRow =
  | {
      type: 'stories';
      key: string;
      stories: Story[];
    }
  | {
      type: 'recommended';
      key: string;
    };


type CommentMenuState = {
  comment: Comment;
  pageX: number;
  pageY: number;
};

type RecommendedUser = {
  id: string;
  nickname: string;
  profileImageUrl?: string;
  subscribed: boolean;
};

type StoryFilterTab = {
  key: string;
  label: string;
  type: 'ALL' | 'FOLLOWING' | 'CLUB';
  clubId?: number;
};

type StoryRouteParams = {
  openCompose?: boolean;
  composeBook?: unknown;
  openStoryId?: number | string;
  openStoryFocus?: 'comments';
  openStoryReturnTarget?: 'MY_STORIES';
  openDraftId?: number;
  openDraftTitle?: string;
  openDraftBody?: string;
  openDraftBook?: unknown;
  openDraftImageUrls?: string[];
  openDraftReturnTarget?: 'MY_STORIES';
};

type ComposeInitialDraft = {
  title: string;
  body: string;
  bookKey: string | null;
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
const FOCUSED_INPUT_TARGET_FROM_BOTTOM_RATIO = 0.6;
const FOCUSED_INPUT_SCROLL_RETRY_DELAYS_MS = [0, 120, 300] as const;
const MIN_BOOK_FLIP_LOADING_MS = 1000;
const TABLET_MIN_SHORTEST_WIDTH = 600;
const TABLET_STORY_GRID_MIN_WIDTH = 720;
const STORY_FEED_SINGLE_COLUMN_MAX_WIDTH = 600;
const STORY_FEED_GRID_MAX_WIDTH = 920;
const STORY_READING_MAX_WIDTH = 720;
const ISBN13_REGEX = /^\d{13}$/;
const EMPTY_COMPOSE_INITIAL_DRAFT: ComposeInitialDraft = {
  title: '',
  body: '',
  bookKey: null,
};
const storyLog = createLogger('story');

function getFocusedInputTargetCenterY(screenHeight: number) {
  return screenHeight * (1 - FOCUSED_INPUT_TARGET_FROM_BOTTOM_RATIO);
}

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

function mapBookItemToBook(item: BookItem, l: (text: string) => string): Book {
  return {
    id: item.isbn || String(item.bookId ?? ''),
    title: item.title,
    author: item.author || l('작가 미상'),
    description:
      item.description || item.publisher || l('책 설명이 없습니다.'),
    image: normalizeRemoteImageUrl(item.imgUrl),
  };
}

function getComposeBookKey(book: Book | null) {
  if (!book) return null;
  return [book.id.trim(), book.title.trim(), book.author.trim()].join('|');
}

function buildComposeInitialDraft(
  book: Book | null,
  title: string,
  body: string,
): ComposeInitialDraft {
  return {
    title,
    body,
    bookKey: getComposeBookKey(book),
  };
}

export function StoryScreen() {
  const navigation = useNavigation<NavigationProp<ParamListBase>>();
  const route = useRoute<RouteProp<{ Story: StoryRouteParams }, 'Story'>>();
  const { requireAuth, isLoggedIn } = useAuthGate();
  const { language, l } = useLanguage();
  const relativeNowMillis = useRelativeNow();
  const { width: screenWidth, height: screenHeight } = useWindowDimensions();
  const insets = useSafeAreaInsets();
  const isTabletLayout =
    Math.min(screenWidth, screenHeight) >= TABLET_MIN_SHORTEST_WIDTH;
  const storyFeedColumnCount =
    isTabletLayout && screenWidth >= TABLET_STORY_GRID_MIN_WIDTH ? 2 : 1;
  const storyFeedRowMaxWidth =
    !isTabletLayout
      ? screenWidth
      : storyFeedColumnCount === 2
        ? STORY_FEED_GRID_MAX_WIDTH
        : STORY_FEED_SINGLE_COLUMN_MAX_WIDTH;
  const tabletReadingContentStyle =
    isTabletLayout
      ? {
          width: '100%' as const,
          maxWidth: STORY_READING_MAX_WIDTH,
          alignSelf: 'center' as const,
        }
      : undefined;
  const storySkeletonRows = storyFeedColumnCount === 2 ? [[0, 1], [2, 3]] : [[0], [1], [2]];

  const [selectedFilterKey, setSelectedFilterKey] = useState(ALL_STORY_TAB.key);
  const [myClubTabs, setMyClubTabs] = useState<Array<{ clubId: number; clubName: string }>>([]);
  const [recommendedUsers, setRecommendedUsers] = useState<RecommendedUser[]>([]);
  const [myNickname, setMyNickname] = useState('');
  const [selectedBook, setSelectedBook] = useState<Book | null>(null);
  const [showBookPicker, setShowBookPicker] = useState(false);
  const {
    query: bookSearchQuery,
    setQuery: setBookSearchQuery,
    searched: bookSearchSearched,
    searchedKeyword: bookSearchKeyword,
    results: bookSearchResults,
    loading: bookSearchLoading,
    hasNext: bookSearchHasNext,
    totalResults: bookSearchTotalResults,
    loadingMore: bookSearchLoadingMore,
    search: runBookSearch,
    loadMore: loadMoreBookSearch,
    reset: resetBookSearch,
  } = useBookSearch();
  const [title, setTitle] = useState('');
  const [body, setBody] = useState('');
  const [composeInitialDraft, setComposeInitialDraft] =
    useState<ComposeInitialDraft>(EMPTY_COMPOSE_INITIAL_DRAFT);
  const [stories, setStories] = useState<Story[]>([]);
  const [hasNext, setHasNext] = useState(false);
  const [nextCursor, setNextCursor] = useState<number | null>(null);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const [isInitialLoading, setIsInitialLoading] = useState(false);
  const [loadMoreError, setLoadMoreError] = useState(false);
  const [isDetailLoading, setIsDetailLoading] = useState(false);
  const [detailLoadError, setDetailLoadError] = useState(false);
  const [isComposing, setIsComposing] = useState(false);
  const [editingStoryId, setEditingStoryId] = useState<number | null>(null);
  const [draftStoryId, setDraftStoryId] = useState<number | null>(null);
  const isEditingStory = editingStoryId !== null;
  const [refreshing, setRefreshing] = useState(false);
  const [detailRefreshing, setDetailRefreshing] = useState(false);
  const [selectedStory, setSelectedStory] = useState<Story | null>(null);
  const [commentInput, setCommentInput] = useState('');
  const [editingCommentId, setEditingCommentId] = useState<number | null>(null);
  const [editingCommentOriginalText, setEditingCommentOriginalText] = useState('');
  const [replyTarget, setReplyTarget] = useState<{
    commentId?: number;
    commentKey: string;
    author: string;
  } | null>(null);
  const [commentMenu, setCommentMenu] = useState<CommentMenuState | null>(null);
  const storyAttachments = useImageAttachments([], INPUT_LIMITS.BOOK_STORY_IMAGE_COUNT);
  const commentAttachments = useImageAttachments([], INPUT_LIMITS.BOOK_STORY_COMMENT_IMAGE_COUNT);
  const {
    isDirty: storyAttachmentsDirty,
    reset: resetStoryAttachments,
    resolveImageUrls: resolveStoryImageUrls,
    getIsDirty: getIsStoryAttachmentsDirty,
  } = storyAttachments;
  const {
    isDirty: commentAttachmentsDirty,
    reset: resetCommentAttachments,
    resolveImageUrls: resolveCommentImageUrls,
    getIsDirty: getIsCommentAttachmentsDirty,
  } = commentAttachments;
  const [imageViewer, setImageViewer] = useState<{ imageUrls: string[]; index: number } | null>(null);
  const [storyMenu, setStoryMenu] = useState(false);
  const [reportModal, setReportModal] = useState<ReportMemberModalState | null>(null);
  const [submittingReport, setSubmittingReport] = useState(false);
  const [submittingStory, setSubmittingStory] = useState(false);
  const [submittingComment, setSubmittingComment] = useState(false);
  const listRef = useRef<FlatList<StoryFeedRow>>(null);
  useScrollToTop(listRef);
  const listScrollOffsetRef = useRef(0);
  const pendingListScrollRestoreRef = useRef<number | null>(null);
  const loadingStoriesRef = useRef(false);
  const loadingMoreStoriesRef = useRef(false);
  const hasNextStoriesRef = useRef(false);
  const nextStoryCursorRef = useRef<number | null>(null);
  const storyFeedRequestIdRef = useRef(0);
  const storyDetailRequestIdRef = useRef(0);
  const lastEndReachedAtRef = useRef(0);
  const detailScrollRef = useRef<ScrollView>(null);
  const detailScrollYRef = useRef(0);
  const commentInputRef = useRef<TextInput>(null);
  const inlineReplyInputRef = useRef<TextInput>(null);
  const inlineEditCommentInputRef = useRef<TextInput>(null);
  const bodyInputRef = useRef<TextInput>(null);
  const composeScrollRef = useRef<ScrollView>(null);
  const composeScrollYRef = useRef(0);
  const composeBodyFocusedRef = useRef(false);
  const composeBodyContentHeightRef = useRef(0);
  const commentSectionYRef = useRef(0);
  const pendingDetailFocusRef = useRef<'comments' | null>(null);
  const isComposingRef = useRef(false);
  const titleValueRef = useRef('');
  const bodyValueRef = useRef('');
  const selectedBookValueRef = useRef<Book | null>(null);
  const composeInitialDraftRef = useRef<ComposeInitialDraft>(EMPTY_COMPOSE_INITIAL_DRAFT);
  const selectedStoryValueRef = useRef<Story | null>(null);
  const storyReturnTargetRef = useRef<StoryRouteParams['openStoryReturnTarget'] | null>(null);
  const composeReturnTargetRef = useRef<StoryRouteParams['openDraftReturnTarget'] | null>(null);
  const commentDraftTextRef = useRef('');
  const editingCommentIdRef = useRef<number | null>(null);
  const editingCommentOriginalTextRef = useRef('');
  const WriteIcon = PENCIL_ICON_URI;
  const detailTranslateX = useRef(new Animated.Value(0)).current;

  const removeBlockedMemberLocally = useCallback((nickname: string) => {
    setStories((prev) => prev.filter((story) => !isSameMemberNickname(story.author, nickname)));
    setRecommendedUsers((prev) =>
      prev.filter((user) => !isSameMemberNickname(user.nickname, nickname)),
    );
    setSelectedStory((prev) => {
      if (!prev || !isSameMemberNickname(prev.author, nickname)) return prev;
      selectedStoryValueRef.current = null;
      return null;
    });
  }, []);

  useEffect(() => {
    return subscribeBlockedMemberChanges(({ nickname, blocked }) => {
      if (!blocked) return;
      removeBlockedMemberLocally(nickname);
    });
  }, [removeBlockedMemberLocally]);

  useEffect(() => {
    isComposingRef.current = isComposing;
    titleValueRef.current = title;
    bodyValueRef.current = body;
    selectedBookValueRef.current = selectedBook;
    composeInitialDraftRef.current = composeInitialDraft;
    selectedStoryValueRef.current = selectedStory;
    commentDraftTextRef.current = commentInput;
    editingCommentIdRef.current = editingCommentId;
    editingCommentOriginalTextRef.current = editingCommentOriginalText;
  }, [
    body,
    commentInput,
    composeInitialDraft,
    editingCommentId,
    editingCommentOriginalText,
    isComposing,
    selectedBook,
    selectedStory,
    title,
  ]);

  useEffect(() => {
    storyLog.debug('screen_state', {
      isComposing,
      editingStoryId,
      selectedStoryId: selectedStory?.id ?? null,
      selectedStoryRemoteId: selectedStory?.remoteId ?? null,
      submittingStory,
      titleLength: title.length,
      bodyLength: body.length,
    });
  }, [editingStoryId, isComposing, selectedStory?.id, selectedStory?.remoteId, submittingStory]);

  const animateTransition = useCallback(() => {
    // New Architecture(Fabric)에서 LayoutAnimation은 화면 전환(상세↔작성) 시
    // 이미 unregister된 뷰를 마운트하려다 "RCTComponentViewRegistry: Attempt to
    // query unregistered component" 네이티브 크래시를 일으킨다. 전환 애니메이션을
    // 비활성화해 크래시를 막는다.
  }, []);

  const handleStoryListScroll = useCallback((event: NativeSyntheticEvent<NativeScrollEvent>) => {
    listScrollOffsetRef.current = event.nativeEvent.contentOffset.y;
  }, []);

  const restoreStoryListScrollIfNeeded = useCallback(() => {
    const offset = pendingListScrollRestoreRef.current;
    if (offset === null) return;

    const restoredOffset = Math.max(0, offset);
    pendingListScrollRestoreRef.current = null;

    requestAnimationFrame(() => {
      listRef.current?.scrollToOffset({ offset: restoredOffset, animated: false });
      InteractionManager.runAfterInteractions(() => {
        listRef.current?.scrollToOffset({ offset: restoredOffset, animated: false });
      });
    });
  }, []);

  const closeStoryDetail = useCallback(() => {
    const returnTarget = storyReturnTargetRef.current;
    storyReturnTargetRef.current = null;
    if (returnTarget === 'MY_STORIES') {
      pendingListScrollRestoreRef.current = null;
    } else {
      pendingListScrollRestoreRef.current = listScrollOffsetRef.current;
    }
    animateTransition();
    detailTranslateX.stopAnimation(() => {
      detailTranslateX.setValue(0);
    });
    storyDetailRequestIdRef.current += 1;
    selectedStoryValueRef.current = null;
    editingCommentIdRef.current = null;
    editingCommentOriginalTextRef.current = '';
    commentDraftTextRef.current = '';
    setSelectedStory(null);
    setIsDetailLoading(false);
    setDetailLoadError(false);
    setEditingCommentId(null);
    setReplyTarget(null);
    setCommentMenu(null);
    setStoryMenu(false);
    setCommentInput('');
    setEditingCommentOriginalText('');
    resetCommentAttachments([]);
    setImageViewer(null);
    pendingDetailFocusRef.current = null;
    commentSectionYRef.current = 0;

    if (returnTarget === 'MY_STORIES') {
      navigation.navigate('My', { openMyTab: '내 책 이야기' });
    }
  }, [animateTransition, detailTranslateX, navigation, resetCommentAttachments]);

  useEffect(() => {
    if (selectedStory || isComposing) return;
    restoreStoryListScrollIfNeeded();
  }, [isComposing, restoreStoryListScrollIfNeeded, selectedStory]);

  const scrollToCommentSection = useCallback((animated = true) => {
    if (commentSectionYRef.current <= 0) return false;
    detailScrollRef.current?.scrollTo({
      y: Math.max(0, commentSectionYRef.current - spacing.sm),
      animated,
    });
    return true;
  }, []);

  const scrollStoryInputToFocusTarget = useCallback(
    (input: TextInput | null) => {
      if (!input) return;

      requestAnimationFrame(() => {
        input.measureInWindow((_x, inputY, _width, inputHeight) => {
          const inputCenterY = inputY + inputHeight / 2;
          const targetCenterY = getFocusedInputTargetCenterY(screenHeight);
          detailScrollRef.current?.scrollTo({
            y: Math.max(0, detailScrollYRef.current + inputCenterY - targetCenterY),
            animated: true,
          });
        });
      });
    },
    [screenHeight],
  );

  const scheduleStoryInputFocusScroll = useCallback(
    (getInput: () => TextInput | null) => {
      FOCUSED_INPUT_SCROLL_RETRY_DELAYS_MS.forEach((delay) => {
        setTimeout(() => scrollStoryInputToFocusTarget(getInput()), delay);
      });
    },
    [scrollStoryInputToFocusTarget],
  );

  const handleFocusCommentInput = useCallback(() => {
    scheduleStoryInputFocusScroll(() => commentInputRef.current);
  }, [scheduleStoryInputFocusScroll]);

  const handleFocusInlineReplyInput = useCallback(() => {
    scheduleStoryInputFocusScroll(() => inlineReplyInputRef.current);
  }, [scheduleStoryInputFocusScroll]);

  const handleFocusInlineEditCommentInput = useCallback(() => {
    scheduleStoryInputFocusScroll(() => inlineEditCommentInputRef.current);
  }, [scheduleStoryInputFocusScroll]);

  const scrollDetailToTop = useCallback((animated = true) => {
    detailScrollRef.current?.scrollTo({ y: 0, animated });
  }, []);

  const handleCommentSectionLayout = useCallback(
    (event: LayoutChangeEvent) => {
      commentSectionYRef.current = event.nativeEvent.layout.y;

      if (pendingDetailFocusRef.current !== 'comments') return;
      requestAnimationFrame(() => {
        if (!scrollToCommentSection(true)) return;
        pendingDetailFocusRef.current = null;
        setTimeout(() => {
          commentInputRef.current?.focus();
        }, 350);
      });
    },
    [scrollToCommentSection],
  );

  const openCompose = useCallback((
    initialBook?: Book,
    draft?: { id: number; title: string; body: string; imageUrls: string[] },
    returnTarget?: StoryRouteParams['openDraftReturnTarget'],
  ) => {
    requireAuth(() => {
      const nextTitle = draft?.title ?? '';
      const nextBody = draft?.body ?? '';
      const nextBook = initialBook ?? null;
      const nextInitialDraft = buildComposeInitialDraft(nextBook, nextTitle, nextBody);
      selectedStoryValueRef.current = null;
      isComposingRef.current = true;
      titleValueRef.current = nextTitle;
      bodyValueRef.current = nextBody;
      selectedBookValueRef.current = nextBook;
      composeInitialDraftRef.current = nextInitialDraft;
      composeReturnTargetRef.current = returnTarget ?? null;
      composeScrollYRef.current = 0;
      composeBodyFocusedRef.current = false;
      composeBodyContentHeightRef.current = 0;
      commentDraftTextRef.current = '';
      editingCommentIdRef.current = null;
      editingCommentOriginalTextRef.current = '';
      setSelectedStory(null);
      setEditingStoryId(null);
      setDraftStoryId(draft?.id ?? null);
      setTitle(nextTitle);
      setBody(nextBody);
      setSelectedBook(nextBook);
      setComposeInitialDraft(nextInitialDraft);
      setShowBookPicker(false);
      resetBookSearch();
      setBookSearchQuery(initialBook?.title ?? draft?.title ?? '');
      setCommentInput('');
      setEditingCommentId(null);
      setEditingCommentOriginalText('');
      setReplyTarget(null);
      setCommentMenu(null);
      setStoryMenu(false);
      resetStoryAttachments(draft?.imageUrls ?? []);
      resetCommentAttachments([]);
      animateTransition();
      setIsComposing(true);
    });
  }, [
    animateTransition,
    requireAuth,
    resetBookSearch,
    resetCommentAttachments,
    resetStoryAttachments,
    setBookSearchQuery,
  ]);

  const closeCompose = useCallback((returnToSource = false) => {
    const returnTarget = composeReturnTargetRef.current;
    composeReturnTargetRef.current = null;
    animateTransition();
    isComposingRef.current = false;
    composeInitialDraftRef.current = EMPTY_COMPOSE_INITIAL_DRAFT;
    composeBodyFocusedRef.current = false;
    composeBodyContentHeightRef.current = 0;
    editingCommentIdRef.current = null;
    editingCommentOriginalTextRef.current = '';
    commentDraftTextRef.current = '';
    setIsComposing(false);
    setEditingStoryId(null);
    setDraftStoryId(null);
    setComposeInitialDraft(EMPTY_COMPOSE_INITIAL_DRAFT);
    setShowBookPicker(false);
    setReplyTarget(null);
    setCommentMenu(null);
    setStoryMenu(false);
    resetStoryAttachments([]);
    resetCommentAttachments([]);
    if (returnToSource && returnTarget === 'MY_STORIES') {
      navigation.navigate('My', { openMyTab: '내 책 이야기' });
    }
  }, [animateTransition, navigation, resetCommentAttachments, resetStoryAttachments]);

  const hasUnsavedStoryChanges = useMemo(() => {
    const composingDraft =
      isComposing &&
      (title !== composeInitialDraft.title ||
        body !== composeInitialDraft.body ||
        getComposeBookKey(selectedBook) !== composeInitialDraft.bookKey ||
        storyAttachmentsDirty);
    const commentDraft =
      Boolean(selectedStory) &&
      ((editingCommentId !== null
        ? commentInput !== editingCommentOriginalText
        : commentInput.trim().length > 0) ||
        commentAttachmentsDirty);
    return composingDraft || commentDraft;
  }, [
    body,
    commentInput,
    composeInitialDraft,
    editingCommentId,
    editingCommentOriginalText,
    isComposing,
    commentAttachmentsDirty,
    selectedBook,
    selectedStory,
    storyAttachmentsDirty,
    title,
  ]);
  const isCommentSubmitDisabled =
    commentInput.trim().length === 0 || submittingComment || commentAttachments.isUploading;

  const hasUnsavedStoryChangesNow = useCallback(() => {
    const initialDraft = composeInitialDraftRef.current;
    const composingDraft =
      isComposingRef.current &&
      (titleValueRef.current !== initialDraft.title ||
        bodyValueRef.current !== initialDraft.body ||
        getComposeBookKey(selectedBookValueRef.current) !== initialDraft.bookKey ||
        getIsStoryAttachmentsDirty());
    const commentDraft =
      Boolean(selectedStoryValueRef.current) &&
      ((editingCommentIdRef.current !== null
        ? commentDraftTextRef.current !== editingCommentOriginalTextRef.current
        : commentDraftTextRef.current.trim().length > 0) ||
        getIsCommentAttachmentsDirty());
    return composingDraft || commentDraft;
  }, [getIsCommentAttachmentsDirty, getIsStoryAttachmentsDirty]);

  const showDiscardStoryAlert = useCallback(
    (onClose: () => void) => {
      if (!hasUnsavedStoryChangesNow()) {
        onClose();
        return;
      }

      showAlertAfterKeyboardDismiss(l('알림'), l('현재 페이지는 저장되지 않습니다.'), [
        { text: l('취소'), style: 'cancel' },
        { text: l('닫기'), style: 'destructive', onPress: onClose },
      ]);
    },
    [hasUnsavedStoryChangesNow, l],
  );

  const handleChangeStoryTitle = useCallback((text: string) => {
    titleValueRef.current = text;
    setTitle(text);
  }, []);

  const handleChangeStoryBody = useCallback((text: string) => {
    bodyValueRef.current = text;
    setBody(text);
  }, []);

  const scrollComposeBodyCursorToTarget = useCallback(
    (animated = true) => {
      if (!composeBodyFocusedRef.current) return;

      requestAnimationFrame(() => {
        bodyInputRef.current?.measureInWindow((_x, inputY, _width, inputHeight) => {
          const contentHeight = composeBodyContentHeightRef.current || inputHeight;
          const estimatedCursorY = inputY + Math.min(inputHeight, contentHeight) - spacing.md;
          const targetY = getFocusedInputTargetCenterY(screenHeight);
          if (estimatedCursorY <= targetY + spacing.xs) return;

          composeScrollRef.current?.scrollTo({
            y: Math.max(0, composeScrollYRef.current + estimatedCursorY - targetY),
            animated,
          });
        });
      });
    },
    [screenHeight],
  );

  const scheduleComposeBodyCursorScroll = useCallback(() => {
    FOCUSED_INPUT_SCROLL_RETRY_DELAYS_MS.forEach((delay) => {
      setTimeout(() => scrollComposeBodyCursorToTarget(true), delay);
    });
  }, [scrollComposeBodyCursorToTarget]);

  const handleFocusStoryBodyInput = useCallback(() => {
    composeBodyFocusedRef.current = true;
    scheduleComposeBodyCursorScroll();
  }, [scheduleComposeBodyCursorScroll]);

  const handleBlurStoryBodyInput = useCallback(() => {
    composeBodyFocusedRef.current = false;
  }, []);

  const handleStoryBodyContentSizeChange = useCallback(
    (event: NativeSyntheticEvent<TextInputContentSizeChangeEventData>) => {
      composeBodyContentHeightRef.current = event.nativeEvent.contentSize.height;
      scrollComposeBodyCursorToTarget(true);
    },
    [scrollComposeBodyCursorToTarget],
  );

  const handleComposeScroll = useCallback((event: NativeSyntheticEvent<NativeScrollEvent>) => {
    composeScrollYRef.current = event.nativeEvent.contentOffset.y;
  }, []);

  const handleChangeCommentInput = useCallback((text: string) => {
    commentDraftTextRef.current = text;
    setCommentInput(text);
  }, []);

  const requestCloseCompose = useCallback(() => {
    showDiscardStoryAlert(() => closeCompose(true));
  }, [closeCompose, showDiscardStoryAlert]);

  const requestCloseStoryDetail = useCallback(() => {
    showDiscardStoryAlert(closeStoryDetail);
  }, [closeStoryDetail, showDiscardStoryAlert]);

  const detailBackSwipeResponder = useEdgeBackSwipe({
    isActive: !!selectedStory,
    translateX: detailTranslateX,
    screenWidth,
    onClose: requestCloseStoryDetail,
    edgeWidth: DETAIL_BACK_EDGE_WIDTH,
    activateDistance: DETAIL_BACK_ACTIVATE_DISTANCE,
    activateMaxDy: DETAIL_BACK_ACTIVATE_MAX_DY,
    triggerDistance: DETAIL_BACK_TRIGGER_DISTANCE,
    triggerMaxDy: DETAIL_BACK_TRIGGER_MAX_DY,
    requireHorizontalDominance: true,
  });

  const handlePressHeaderLogo = useCallback(() => {
    const goHome = () => {
      setCommentInput('');
      setEditingCommentId(null);
      setEditingCommentOriginalText('');
      setReplyTarget(null);
      setCommentMenu(null);
      setStoryMenu(false);
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

  const storyListItems = useMemo<StoryFeedRow[]>(() => {
    if (stories.length === 0) return [];

    const includeRecommendation = isLoggedIn && recommendedUsers.length > 0;
    const rows: StoryFeedRow[] = [];
    let pendingStories: Story[] = [];

    const flushPendingStories = () => {
      if (pendingStories.length === 0) return;
      rows.push({
        type: 'stories',
        key: `stories-${pendingStories.map((story) => story.id).join('-')}`,
        stories: pendingStories,
      });
      pendingStories = [];
    };

    stories.forEach((story, index) => {
      if (includeRecommendation && index > 0 && index % 12 === 0) {
        flushPendingStories();
        rows.push({
          type: 'recommended',
          key: `recommended-${index}`,
        });
      }

      pendingStories.push(story);
      if (pendingStories.length === storyFeedColumnCount) {
        flushPendingStories();
      }
    });

    flushPendingStories();
    return rows;
  }, [isLoggedIn, recommendedUsers.length, stories, storyFeedColumnCount]);

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
          showToast(l('내 독서모임 목록을 불러오지 못했습니다.'));
        }
      }
    };

    void loadMyClubTabs();

    return () => {
      cancelled = true;
    };
  }, [isLoggedIn, l]);

  const canLoadApiFeed = selectedTab.type === 'ALL' || isLoggedIn;

  const loadRecommendedUsers = useCallback(async () => {
    if (!isLoggedIn) {
      setRecommendedUsers([]);
      return;
    }

    try {
      const users = await fetchRecommendedMembers({ suppressErrorToast: true });
      setRecommendedUsers(
        users
          .filter((user) => !isBlockedMemberNickname(user.nickname))
          .slice(0, 4)
          .map((user) => ({
            id: user.nickname,
            nickname: user.nickname,
            profileImageUrl: user.profileImageUrl,
            subscribed: false,
          })),
      );
    } catch (error) {
      if (error instanceof ApiError && error.status === 401) {
        setRecommendedUsers([]);
        return;
      }
      if (!(error instanceof ApiError)) {
        showToast(l('추천 사용자를 불러오지 못했습니다.'));
      }
    }
  }, [isLoggedIn, l]);

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

  const handleOpenStoryAuthor = useCallback(() => {
    if (!selectedStory) return;

    if (isLoggedIn && (selectedStory.mine ?? false)) {
      navigation.navigate('My');
      return;
    }

    openUserProfile(selectedStory.author);
  }, [isLoggedIn, navigation, openUserProfile, selectedStory]);

  const loadStories = useCallback(
    async (options?: { reset?: boolean; forceRefresh?: boolean }) => {
      const reset = options?.reset ?? false;
      const forceRefresh = options?.forceRefresh ?? false;

      if (!canLoadApiFeed) {
        if (reset) {
          hasNextStoriesRef.current = false;
          nextStoryCursorRef.current = null;
          setLoadMoreError(false);
          setStories([]);
          setHasNext(false);
          setNextCursor(null);
        }
        return;
      }

      let requestId: number;
      const cursorId = reset ? undefined : nextStoryCursorRef.current ?? undefined;

      if (!reset) {
        if (loadingStoriesRef.current || loadingMoreStoriesRef.current || !hasNextStoriesRef.current) {
          return;
        }
        loadingMoreStoriesRef.current = true;
        requestId = storyFeedRequestIdRef.current + 1;
        storyFeedRequestIdRef.current = requestId;
        setLoadMoreError(false);
        setIsLoadingMore(true);
      } else {
        if (loadingStoriesRef.current) return;
        loadingStoriesRef.current = true;
        requestId = storyFeedRequestIdRef.current + 1;
        storyFeedRequestIdRef.current = requestId;
        setLoadMoreError(false);
        setIsInitialLoading(true);
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
        const mapped = feed.items
          .map((item) => mapRemoteStoryToStory(item, l))
          .filter((story) => !isBlockedMemberNickname(story.author));
        if (requestId !== storyFeedRequestIdRef.current) return;

        setStories((prev) => {
          if (reset) return mapped;

          const existing = new Set(prev.map((story) => story.id));
          const appended = mapped.filter((story) => !existing.has(story.id));
          return [...prev, ...appended];
        });

        hasNextStoriesRef.current = feed.hasNext;
        nextStoryCursorRef.current = feed.nextCursor;
        setHasNext(feed.hasNext);
        setNextCursor(feed.nextCursor);
      } catch (error) {
        if (requestId !== storyFeedRequestIdRef.current) return;
        if (!reset) {
          setLoadMoreError(true);
        } else {
          showToast(
            resolveApiError(
              error,
              {
                401: l('로그인 상태를 확인해 주십시오.'),
                403: l('접근 권한이 없습니다.'),
                404: l('요청한 책이야기를 찾을 수 없습니다.'),
              },
              l('책이야기 목록을 불러오지 못했습니다.'),
            ),
          );
        }
      } finally {
        if (!reset) {
          loadingMoreStoriesRef.current = false;
          if (requestId === storyFeedRequestIdRef.current) {
            setIsLoadingMore(false);
          }
        } else {
          if (requestId !== storyFeedRequestIdRef.current) return;
          loadingStoriesRef.current = false;
          setIsInitialLoading(false);
        }
      }
    },
    [canLoadApiFeed, isLoggedIn, l, selectedTab],
  );

  useEffect(() => {
    setSelectedStory(null);
    if (!canLoadApiFeed) {
      hasNextStoriesRef.current = false;
      nextStoryCursorRef.current = null;
      setLoadMoreError(false);
      setStories([]);
      setHasNext(false);
      setNextCursor(null);
      return;
    }
    void loadStories({ reset: true });
  }, [canLoadApiFeed, loadStories, selectedTab.key]);

  const handleEndReached = useCallback(() => {
    if (!canLoadApiFeed || loadMoreError) return;
    const now = Date.now();
    if (now - lastEndReachedAtRef.current < 600) return;
    lastEndReachedAtRef.current = now;
    void loadStories();
  }, [canLoadApiFeed, loadMoreError, loadStories]);

  const handleRetryLoadMore = useCallback(() => {
    setLoadMoreError(false);
    lastEndReachedAtRef.current = 0;
    void loadStories();
  }, [loadStories]);

  const applyStoryUpdate = useCallback((next: Story) => {
    setStories((prev) => prev.map((story) => (story.id === next.id ? next : story)));
    setSelectedStory((prev) => (prev && prev.id === next.id ? next : prev));
  }, []);

  const loadStoryDetail = useCallback(
    async (story: Story) => {
      if (typeof story.remoteId !== 'number') return;
      const requestId = ++storyDetailRequestIdRef.current;
      setIsDetailLoading(true);
      setDetailLoadError(false);
      try {
        const detail = await fetchBookStoryDetail(story.remoteId, {
          viewerAuthenticated: isLoggedIn,
        });
        if (requestId !== storyDetailRequestIdRef.current) return;
        if (!detail) {
          throw new Error('Empty book story detail response');
        }
        const mapped = mapRemoteDetailToStory(detail, l, story);
        storyLog.debug('detail_loaded', {
          remoteId: story.remoteId,
          feedBodyLength: story.fullText.length,
          detailBodyLength: detail.description.length,
        });
        selectedStoryValueRef.current = mapped;
        applyStoryUpdate(mapped);
      } catch (error) {
        if (requestId !== storyDetailRequestIdRef.current) return;
        storyLog.warn('detail_load_failed', {
          remoteId: story.remoteId,
          error,
        });
        setDetailLoadError(true);
        showToast(
          resolveApiError(
            error,
            {
              401: l('책이야기 상세를 보려면 로그인이 필요합니다.'),
              403: l('이 책이야기를 볼 권한이 없습니다.'),
              404: l('해당 책이야기를 찾을 수 없습니다.'),
            },
            l('책이야기 상세를 불러오지 못했습니다.'),
          ),
        );
      } finally {
        if (requestId === storyDetailRequestIdRef.current) {
          setIsDetailLoading(false);
        }
      }
    },
    [applyStoryUpdate, isLoggedIn, l],
  );

  const openStoryDetailByRemoteId = useCallback(
    async (remoteId: number, options?: { focusComments?: boolean }) => {
      if (!Number.isInteger(remoteId) || remoteId <= 0) return false;
      pendingDetailFocusRef.current = options?.focusComments ? 'comments' : null;
      commentSectionYRef.current = 0;

      animateTransition();
      detailTranslateX.stopAnimation(() => {
        detailTranslateX.setValue(0);
      });
      isComposingRef.current = false;
      composeInitialDraftRef.current = EMPTY_COMPOSE_INITIAL_DRAFT;
      commentDraftTextRef.current = '';
      editingCommentIdRef.current = null;
      editingCommentOriginalTextRef.current = '';
      setIsComposing(false);
      setEditingStoryId(null);
      setComposeInitialDraft(EMPTY_COMPOSE_INITIAL_DRAFT);
      setCommentInput('');
      setEditingCommentId(null);
      setEditingCommentOriginalText('');
      setReplyTarget(null);
      setCommentMenu(null);
      setStoryMenu(false);
      resetStoryAttachments([]);
      resetCommentAttachments([]);

      const requestId = ++storyDetailRequestIdRef.current;
      setIsDetailLoading(true);
      setDetailLoadError(false);
      try {
        const detail = await fetchBookStoryDetail(remoteId, {
          viewerAuthenticated: isLoggedIn,
        });
        if (requestId !== storyDetailRequestIdRef.current) return false;
        if (!detail) {
          showToast(l('해당 책이야기를 찾을 수 없습니다.'));
          return false;
        }
        const mapped = mapRemoteDetailToStory(detail, l);
        storyLog.debug('detail_loaded_by_route', {
          remoteId,
          detailBodyLength: detail.description.length,
        });
        setStories((prev) => {
          const exists = prev.some((story) => story.id === mapped.id);
          if (!exists) return [mapped, ...prev];
          return prev.map((story) => (story.id === mapped.id ? mapped : story));
        });
        selectedStoryValueRef.current = mapped;
        setSelectedStory(mapped);
        setDetailLoadError(false);
        return true;
      } catch (error) {
        if (requestId !== storyDetailRequestIdRef.current) return false;
        storyLog.warn('detail_load_by_route_failed', { remoteId, error });
        showToast(
          resolveApiError(
            error,
            {
              401: l('책이야기 상세를 보려면 로그인이 필요합니다.'),
              403: l('이 책이야기를 볼 권한이 없습니다.'),
              404: l('해당 책이야기를 찾을 수 없습니다.'),
            },
            l('책이야기 상세를 불러오지 못했습니다.'),
          ),
        );
        return false;
      } finally {
        if (requestId === storyDetailRequestIdRef.current) {
          setIsDetailLoading(false);
        }
      }
    },
    [
      animateTransition,
      resetCommentAttachments,
      detailTranslateX,
      isLoggedIn,
      l,
      resetStoryAttachments,
    ],
  );

  const startEditStory = useCallback(
    (story: Story) => {
      if (typeof story.remoteId !== 'number') return;
      const nextBody = story.fullText || story.body;
      const nextBook = story.book ?? null;
      const nextInitialDraft = buildComposeInitialDraft(nextBook, story.title, nextBody);
      storyLog.info('edit_start', {
        storyId: story.id,
        remoteId: story.remoteId,
        titleLength: story.title.length,
        bodyLength: nextBody.length,
        hasBook: Boolean(nextBook),
        wasComposing: isComposingRef.current,
        selectedStoryId: selectedStoryValueRef.current?.id ?? null,
      });
      selectedStoryValueRef.current = null;
      isComposingRef.current = true;
      titleValueRef.current = story.title;
      bodyValueRef.current = nextBody;
      selectedBookValueRef.current = nextBook;
      composeInitialDraftRef.current = nextInitialDraft;
      composeScrollYRef.current = 0;
      composeBodyFocusedRef.current = false;
      composeBodyContentHeightRef.current = 0;
      commentDraftTextRef.current = '';
      editingCommentIdRef.current = null;
      editingCommentOriginalTextRef.current = '';
      setEditingStoryId(story.remoteId);
      setTitle(story.title);
      setBody(nextBody);
      setSelectedBook(nextBook);
      setComposeInitialDraft(nextInitialDraft);
      setSelectedStory(null);
      setEditingCommentId(null);
      setEditingCommentOriginalText('');
      setCommentInput('');
      setReplyTarget(null);
      setCommentMenu(null);
      setStoryMenu(false);
      resetStoryAttachments(story.imageUrls);
      resetCommentAttachments([]);
      animateTransition();
      setIsComposing(true);
      // 모달 dismiss/화면 전환이 끝난 뒤에 포커스해야 iOS first-responder 충돌 크래시를 피한다.
      InteractionManager.runAfterInteractions(() => {
        bodyInputRef.current?.focus();
      });
    },
    [animateTransition, resetCommentAttachments, resetStoryAttachments],
  );

  const handleDeleteStory = useCallback(
    (story: Story) => {
      const storyRemoteId = story.remoteId;
      if (typeof storyRemoteId !== 'number') return;

      Alert.alert(l('책 이야기 삭제'), l('이 글을 삭제하시겠습니까?'), [
        { text: l('취소'), style: 'cancel' },
        {
          text: l('삭제'),
          style: 'destructive',
          onPress: () => {
            const submit = async () => {
              try {
                await deleteBookStory(storyRemoteId);
                setStories((prev) => prev.filter((item) => item.id !== story.id));
                setSelectedStory(null);
                showToast(l('책이야기를 삭제했습니다.'));
              } catch (error) {
                if (!(error instanceof ApiError)) {
                  showToast(l('책이야기 삭제에 실패했습니다.'));
                }
              }
            };

            void submit();
          },
        },
      ]);
    },
    [l],
  );

  const handleShareStory = useCallback(() => {
    if (!selectedStory) return;

    const storyId = selectedStory.remoteId ?? selectedStory.id.replace('story-', '');
    const webBaseUrl = PUBLIC_ENV.WEB_BASE_URL.replace(/\/+$/, '');
    const url = `${webBaseUrl}/stories/${storyId}`;
    void Share.share({ message: url });
  }, [selectedStory]);

  const openStoryMenu = useCallback(() => {
    setCommentMenu(null);
    setStoryMenu(true);
  }, []);

  const openReportModal = useCallback(
    (nickname: string, profileImageUrl: string | undefined) => {
      const targetNickname = nickname.trim();
      if (!targetNickname) {
        showToast(l('신고 대상을 확인할 수 없습니다.'));
        return;
      }
      setStoryMenu(false);
      setCommentMenu(null);
      setReportModal(null);

      const openModal = () => {
        setReportModal({ nickname: targetNickname, profileImageUrl });
      };

      if (!isLoggedIn) {
        requireAuth(openModal);
        return;
      }

      openModal();
    },
    [isLoggedIn, l, requireAuth],
  );

  const closeReportModal = useCallback(() => {
    if (submittingReport) return;
    setReportModal(null);
  }, [submittingReport]);

  const handlePressReportTarget = useCallback(
    (nickname: string) => {
      const targetNickname = nickname.trim();
      if (!targetNickname || submittingReport) return;
      setReportModal(null);
      openUserProfile(targetNickname);
    },
    [openUserProfile, submittingReport],
  );

  const submitReport = useCallback((payload: { reason: ReportReason; content?: string }) => {
    if (!reportModal?.nickname) return;
    const target = reportModal;
    if (!isLoggedIn) {
      setReportModal(null);
      requireAuth(() => {
        setReportModal(target);
      });
      return;
    }

    requireAuth(() => {
      const submit = async () => {
        setSubmittingReport(true);
        try {
          await createReport({
            targetType: 'MEMBER',
            targetId: reportModal.nickname,
            reason: payload.reason,
            content: payload.content,
          });
          showToast(l('신고가 접수되었습니다.'));
          setReportModal(null);
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
  }, [isLoggedIn, l, reportModal, requireAuth]);

  const handleSelectStoryMenuAction = useCallback(
    (action: 'edit' | 'delete' | 'report' | 'share') => {
      if (!selectedStory) return;

      setStoryMenu(false);

      if (action === 'edit') {
        if (!isLoggedIn || !selectedStory.mine) return;
        storyLog.info('edit_menu_press', {
          storyId: selectedStory.id,
          remoteId: selectedStory.remoteId ?? null,
          titleLength: selectedStory.title.length,
          bodyLength: (selectedStory.fullText || selectedStory.body).length,
        });
        startEditStory(selectedStory);
        return;
      }

      if (action === 'delete') {
        if (!isLoggedIn || !selectedStory.mine) return;
        handleDeleteStory(selectedStory);
        return;
      }

      if (action === 'report') {
        openReportModal(selectedStory.author, selectedStory.profileImageUrl);
        return;
      }

      handleShareStory();
    },
    [handleDeleteStory, handleShareStory, isLoggedIn, openReportModal, selectedStory, startEditStory],
  );

  const openCommentMenu = useCallback(
    (comment: Comment, event: GestureResponderEvent) => {
      setStoryMenu(false);
      setCommentMenu({
        comment,
        pageX: event.nativeEvent.pageX,
        pageY: event.nativeEvent.pageY,
      });
    },
    [],
  );

  const beginEditComment = useCallback(
    (comment: Comment) => {
      if (typeof comment.remoteId !== 'number') return;
      const nextCommentText = comment.deleted ? '' : comment.text;
      editingCommentIdRef.current = comment.remoteId;
      editingCommentOriginalTextRef.current = nextCommentText;
      commentDraftTextRef.current = nextCommentText;
      setCommentMenu(null);
      setEditingCommentId(comment.remoteId);
      setEditingCommentOriginalText(nextCommentText);
      setReplyTarget(null);
      setCommentInput(nextCommentText);
      resetCommentAttachments(comment.imageUrls);
      requestAnimationFrame(() => {
        inlineEditCommentInputRef.current?.focus();
        scheduleStoryInputFocusScroll(() => inlineEditCommentInputRef.current);
      });
    },
    [resetCommentAttachments, scheduleStoryInputFocusScroll],
  );

  const cancelEditComment = useCallback(() => {
    editingCommentIdRef.current = null;
    editingCommentOriginalTextRef.current = '';
    commentDraftTextRef.current = '';
    setEditingCommentId(null);
    setEditingCommentOriginalText('');
    setCommentInput('');
    resetCommentAttachments([]);
  }, [resetCommentAttachments]);

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

      Alert.alert(l('댓글 삭제'), l('이 댓글을 삭제하시겠습니까?'), [
        { text: l('취소'), style: 'cancel' },
        {
          text: l('삭제'),
          style: 'destructive',
          onPress: () => {
            const nextStory: Story = {
              ...originalStory,
              commentList: originalStory.commentList.filter(
                (item) => item.id !== comment.id,
              ),
              comments: Math.max(0, originalStory.comments - 1),
            };
            applyStoryUpdate(nextStory);
            editingCommentIdRef.current = null;
            editingCommentOriginalTextRef.current = '';
            commentDraftTextRef.current = '';
            setEditingCommentId(null);
            setEditingCommentOriginalText('');
            setReplyTarget(null);
            setCommentInput('');
            setCommentMenu(null);
            resetCommentAttachments([]);

            const submit = async () => {
              try {
                await deleteBookStoryComment(
                  storyRemoteId,
                  commentRemoteId,
                );
                showToast(l('댓글을 삭제했습니다.'));
              } catch (error) {
                applyStoryUpdate(originalStory);
                if (!(error instanceof ApiError)) {
                  showToast(l('댓글 삭제에 실패했습니다.'));
                }
              }
            };
            void submit();
          },
        },
      ]);
    },
    [applyStoryUpdate, isLoggedIn, l, resetCommentAttachments, selectedStory],
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
        openReportModal(current.author, current.profileImageUrl);
        return;
      }

      if (current.deleted) {
        showToast(l('삭제된 댓글에는 대댓글을 작성할 수 없습니다.'));
        return;
      }
      if (current.replyTo) {
        showToast(l('대댓글에는 다시 답글을 달 수 없습니다.'));
        return;
      }
      if (typeof current.remoteId !== 'number') {
        showToast(l('잠시 후 다시 시도해 주십시오.'));
        return;
      }

      editingCommentIdRef.current = null;
      editingCommentOriginalTextRef.current = '';
      commentDraftTextRef.current = '';
      setEditingCommentId(null);
      setEditingCommentOriginalText('');
      setReplyTarget({
        commentId: current.remoteId,
        commentKey: current.id,
        author: current.author,
      });
      setCommentInput('');
      resetCommentAttachments([]);
      requestAnimationFrame(() => {
        setTimeout(() => {
          inlineReplyInputRef.current?.focus();
          scheduleStoryInputFocusScroll(() => inlineReplyInputRef.current);
        }, 0);
      });
    },
    [
      beginEditComment,
      commentMenu,
      resetCommentAttachments,
      deleteComment,
      l,
      openReportModal,
      scheduleStoryInputFocusScroll,
    ],
  );

  const commentMenuItems = useMemo<ActionMenuItem[]>(() => {
    if (!commentMenu) return [];
    const canReply = !commentMenu.comment.replyTo && !commentMenu.comment.deleted;
    const replyItems: ActionMenuItem[] = canReply
      ? [
          {
            key: 'reply',
            label: l('대댓글 쓰기'),
            onPress: () => handleSelectCommentMenuAction('reply'),
          },
        ]
      : [];
    if (isLoggedIn && commentMenu.comment.mine) {
      return [
        ...replyItems,
        { key: 'edit', label: l('수정하기'), onPress: () => handleSelectCommentMenuAction('edit') },
        {
          key: 'delete',
          label: l('삭제하기'),
          destructive: true,
          onPress: () => handleSelectCommentMenuAction('delete'),
        },
      ];
    }
    return [
      { key: 'report', label: l('신고하기'), onPress: () => handleSelectCommentMenuAction('report') },
      ...replyItems,
    ];
  }, [commentMenu, handleSelectCommentMenuAction, isLoggedIn, l]);

  const storyMenuItems = useMemo<BottomSheetActionMenuItem[]>(() => {
    if (!storyMenu || !selectedStory) return [];
    if (isLoggedIn && selectedStory.mine) {
      return [
        {
          key: 'edit',
          label: l('수정하기'),
          icon: 'edit',
          onPress: () => handleSelectStoryMenuAction('edit'),
        },
        {
          key: 'delete',
          label: l('삭제하기'),
          icon: 'delete-outline',
          destructive: true,
          onPress: () => handleSelectStoryMenuAction('delete'),
        },
      ];
    }
    return [
      {
        key: 'report',
        label: l('신고하기'),
        icon: 'flag',
        onPress: () => handleSelectStoryMenuAction('report'),
      },
      {
        key: 'share',
        label: l('공유하기'),
        icon: 'share',
        onPress: () => handleSelectStoryMenuAction('share'),
      },
    ];
  }, [handleSelectStoryMenuAction, isLoggedIn, l, selectedStory, storyMenu]);

  const openBookPicker = useCallback(() => {
    if (isEditingStory) {
      showToast(l('수정 모드에서는 책을 변경할 수 없습니다.'));
      return;
    }
    setShowBookPicker(true);
  }, [isEditingStory, l]);

  const closeBookPicker = useCallback(() => {
    setShowBookPicker(false);
  }, []);

  const handleSubmitBookSearch = useCallback(() => {
    Keyboard.dismiss();
    const keyword = bookSearchQuery.trim();
    if (!keyword) {
      showToast(l('검색어를 입력해야 합니다.'));
      return;
    }
    void runBookSearch(keyword);
  }, [bookSearchQuery, l, runBookSearch]);

  const handleBookSearchScroll = useCallback(
    (event: NativeSyntheticEvent<NativeScrollEvent>) => {
      if (
        !bookSearchSearched ||
        bookSearchLoading ||
        bookSearchLoadingMore ||
        !bookSearchHasNext ||
        bookSearchResults.length === 0
      ) {
        return;
      }

      const { layoutMeasurement, contentOffset, contentSize } = event.nativeEvent;
      const distanceToBottom = contentSize.height - (layoutMeasurement.height + contentOffset.y);
      if (distanceToBottom <= 240) {
        void loadMoreBookSearch();
      }
    },
    [
      bookSearchHasNext,
      bookSearchLoading,
      bookSearchLoadingMore,
      bookSearchResults.length,
      bookSearchSearched,
      loadMoreBookSearch,
    ],
  );

  const handleSelectBookFromSearch = useCallback((bookItem: BookItem) => {
    setSelectedBook(mapBookItemToBook(bookItem, l));
    setBookSearchQuery(bookItem.title);
    setShowBookPicker(false);
  }, [l]);

  const handleSaveDraft = useCallback(() => {
    if (submittingStory) return;

    requireAuth(() => {
      Keyboard.dismiss();
      const nextTitle = title.trim();
      const nextBody = body.trim();

      if (!nextTitle && !nextBody && !selectedBook) {
        showToast(l('제목, 내용 또는 책을 입력해야 합니다.'));
        return;
      }

      const save = async () => {
        let isbn: string | null = null;
        if (draftStoryId === null) {
          if (!selectedBook) {
            showToast(l('책을 선택해야 임시저장할 수 있습니다.'));
            return;
          }
          isbn = selectedBook.id.trim();
          if (!ISBN13_REGEX.test(isbn)) {
            showToast(l('책 정보 형식이 올바르지 않습니다.'));
            return;
          }
        }

        setSubmittingStory(true);
        try {
          const imageUrls = await resolveStoryImageUrls('BOOK_STORY');
          if (draftStoryId !== null) {
            await updateBookStory(draftStoryId, {
              description: nextBody,
              title: nextTitle || undefined,
              imageUrls,
              status: 'DRAFT' as BookStoryStatus,
            });
          } else {
            if (!isbn) return;
            const newId = await createBookStory({
              isbn,
              title: nextTitle || l('임시저장'),
              description: nextBody,
              imageUrls,
              status: 'DRAFT' as BookStoryStatus,
            });
            if (newId > 0) setDraftStoryId(newId);
          }
          showToast(l('임시저장되었습니다.'));
          closeCompose();
          navigation.navigate('My', { openMyTab: '내 책 이야기' });
        } catch {
          showToast(l('임시저장에 실패했습니다.'));
        } finally {
          setSubmittingStory(false);
        }
      };

      void save();
    });
  }, [
    body,
    draftStoryId,
    l,
    navigation,
    requireAuth,
    selectedBook,
    closeCompose,
    resolveStoryImageUrls,
    submittingStory,
    title,
  ]);

  const handleSubmit = () => {
    if (submittingStory) {
      storyLog.warn('submit_ignored_while_submitting', {
        editingStoryId,
        draftStoryId,
      });
      return;
    }

    Keyboard.dismiss();
    const nextTitle = title.trim();
    const nextDescription = body.trim();
    const currentEditingStoryId = editingStoryId;
    const currentDraftStoryId = draftStoryId;
    const currentSelectedBook = selectedBook;
    storyLog.info('submit_press', {
      mode:
        currentEditingStoryId !== null
          ? 'edit'
          : currentDraftStoryId !== null
            ? 'draft_publish'
            : 'create',
      editingStoryId: currentEditingStoryId,
      draftStoryId: currentDraftStoryId,
      titleLength: nextTitle.length,
      bodyLength: nextDescription.length,
      hasBook: Boolean(currentSelectedBook),
      selectedStoryId: selectedStoryValueRef.current?.id ?? null,
      isComposing: isComposingRef.current,
    });

    if (currentEditingStoryId === null && !currentSelectedBook) {
      storyLog.warn('submit_validation_failed', { reason: 'missing_book' });
      showToast(l('책을 선택해야 합니다.'));
      return;
    }
    if (currentEditingStoryId !== null && (!nextTitle || !nextDescription)) {
      storyLog.warn('submit_validation_failed', {
        mode: 'edit',
        reason: 'missing_title_or_body',
        editingStoryId: currentEditingStoryId,
        hasTitle: Boolean(nextTitle),
        hasBody: Boolean(nextDescription),
      });
      showToast(l('제목과 내용을 입력해야 합니다.'));
      return;
    }
    if (currentEditingStoryId === null && (!nextTitle || !nextDescription)) {
      storyLog.warn('submit_validation_failed', {
        mode: 'create',
        reason: 'missing_title_or_body',
        hasTitle: Boolean(nextTitle),
        hasBody: Boolean(nextDescription),
      });
      showToast(l('제목과 내용을 입력해야 합니다.'));
      return;
    }
    requireAuth(() => {
      const post = async () => {
        const loadingStartedAt = Date.now();
        storyLog.info('submit_start', {
          editingStoryId: currentEditingStoryId,
          draftStoryId: currentDraftStoryId,
        });
        setSubmittingStory(true);
        try {
          let updatedEditedStory: Story | null = null;
          const imageUrls = await resolveStoryImageUrls('BOOK_STORY');

          if (currentEditingStoryId !== null) {
            storyLog.info('edit_update_start', {
              remoteId: currentEditingStoryId,
              titleLength: nextTitle.length,
              bodyLength: nextDescription.length,
            });
            // 서버가 수정 시에도 title을 필수로 요구하므로 (읽기 전용) 원본 제목을 함께 전송한다.
            await updateBookStory(currentEditingStoryId, {
              title: nextTitle || undefined,
              description: nextDescription,
              imageUrls,
            });
            storyLog.info('edit_update_success', { remoteId: currentEditingStoryId });
            try {
              const detail = await fetchBookStoryDetail(currentEditingStoryId, {
                viewerAuthenticated: isLoggedIn,
              });
              if (detail) {
                updatedEditedStory = mapRemoteDetailToStory(detail, l);
                storyLog.info('edit_detail_refetch_success', {
                  remoteId: currentEditingStoryId,
                  commentCount: detail.commentList.length,
                });
              } else {
                storyLog.warn('edit_detail_refetch_empty', { remoteId: currentEditingStoryId });
              }
            } catch (detailError) {
              storyLog.warn('edit_detail_refetch_failed', {
                remoteId: currentEditingStoryId,
                error: detailError,
              });
              updatedEditedStory = null;
            }
            showToast(l('책이야기를 수정했습니다.'));
          } else if (currentDraftStoryId !== null) {
            // 임시저장 → 발행
            await updateBookStory(currentDraftStoryId, {
              title: nextTitle,
              description: nextDescription,
              imageUrls,
              status: 'PUBLISHED' as BookStoryStatus,
            });
            showToast(l('책이야기를 등록했습니다.'));
            setDraftStoryId(null);
          } else {
            if (!currentSelectedBook) {
              showToast(l('책을 선택해야 합니다.'));
              return;
            }
            const isbn = currentSelectedBook.id.trim();
            if (!ISBN13_REGEX.test(isbn)) {
              showToast(l('책 정보 형식이 올바르지 않습니다.'));
              return;
            }
            await createBookStory({
              isbn,
              title: nextTitle,
              description: nextDescription,
              imageUrls,
              status: 'PUBLISHED' as BookStoryStatus,
            });
            showToast(l('책이야기를 등록했습니다.'));
          }

          await loadStories({ reset: true });
          storyLog.info('feed_reload_success_after_submit', {
            editingStoryId: currentEditingStoryId,
            hasUpdatedEditedStory: Boolean(updatedEditedStory),
          });

          titleValueRef.current = '';
          bodyValueRef.current = '';
          selectedBookValueRef.current = null;
          commentDraftTextRef.current = '';
          editingCommentIdRef.current = null;
          editingCommentOriginalTextRef.current = '';
          setTitle('');
          setBody('');
          setSelectedBook(null);
          setEditingStoryId(null);
          storyLog.info('close_compose_after_submit', {
            editingStoryId: currentEditingStoryId,
            willOpenEditedDetail: Boolean(updatedEditedStory),
          });
          closeCompose();

          if (updatedEditedStory) {
            selectedStoryValueRef.current = updatedEditedStory;
            setStories((prev) => {
              const exists = prev.some((story) => story.id === updatedEditedStory.id);
              if (!exists) return [updatedEditedStory, ...prev];
              return prev.map((story) =>
                story.id === updatedEditedStory.id ? updatedEditedStory : story,
              );
            });
            setSelectedStory(updatedEditedStory);
            storyLog.info('edited_detail_restored', {
              storyId: updatedEditedStory.id,
              remoteId: updatedEditedStory.remoteId ?? null,
            });
            requestAnimationFrame(() => {
              scrollDetailToTop(false);
            });
          } else {
            selectedStoryValueRef.current = null;
            listScrollOffsetRef.current = 0;
            pendingListScrollRestoreRef.current = null;
            listRef.current?.scrollToOffset({ offset: 0, animated: true });
          }
        } catch (error) {
          storyLog.error('submit_failed', {
            editingStoryId: currentEditingStoryId,
            draftStoryId: currentDraftStoryId,
            error,
          });
          if (!(error instanceof ApiError)) {
            showToast(
              currentEditingStoryId !== null
                ? l('책이야기 수정에 실패했습니다.')
                : l('책이야기 등록에 실패했습니다.'),
            );
          }
        } finally {
          await waitForMinimumLoading(loadingStartedAt);
          setSubmittingStory(false);
          storyLog.info('submit_finished', {
            editingStoryId: currentEditingStoryId,
            elapsedMs: Date.now() - loadingStartedAt,
          });
        }
      };

      void post();
    });
  };

  const handleOpenComposeSubmitChoice = () => {
    if (submittingStory) return;
    if (editingStoryId !== null) {
      handleSubmit();
      return;
    }

    showAlertAfterKeyboardDismiss(l('저장 방식 선택'), undefined, [
      { text: l('임시저장'), onPress: handleSaveDraft },
      { text: l('등록'), onPress: handleSubmit },
    ]);
  };

  const handleToggleSubscribe = (id: string) => {
    requireAuth(() => {
      const target = stories.find((story) => story.id === id);
      if (!target || typeof target.remoteId !== 'number') return;
      const nextSubscribed = !target.subscribed;

      triggerSelectionHaptic();
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
          showToast(nextSubscribed ? l('구독했습니다.') : l('구독을 취소했습니다.'));
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
          showToast(l('구독 상태를 변경하지 못했습니다.'));
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

      triggerSelectionHaptic();
      setRecommendedUsers((prev) =>
        prev.map((user) =>
          user.id === id ? { ...user, subscribed: nextSubscribed } : user,
        ),
      );

      const submit = async () => {
        try {
          await setFollowingMember(target.nickname, nextSubscribed);
          showToast(nextSubscribed ? l('구독했습니다.') : l('구독을 취소했습니다.'));
        } catch {
          setRecommendedUsers((prev) =>
            prev.map((user) =>
              user.id === id ? { ...user, subscribed: !nextSubscribed } : user,
            ),
          );
          showToast(l('구독 상태를 변경하지 못했습니다.'));
        }
      };
      void submit();
    });
  }, [l, recommendedUsers, requireAuth]);

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

  const handleSelectStory = useCallback(
    (story: Story, options?: { focusComments?: boolean }) => {
      pendingDetailFocusRef.current = options?.focusComments ? 'comments' : null;
      commentSectionYRef.current = 0;
      animateTransition();
      detailTranslateX.stopAnimation(() => {
        detailTranslateX.setValue(0);
      });
      isComposingRef.current = false;
      composeInitialDraftRef.current = EMPTY_COMPOSE_INITIAL_DRAFT;
      selectedStoryValueRef.current = story;
      commentDraftTextRef.current = '';
      editingCommentIdRef.current = null;
      editingCommentOriginalTextRef.current = '';
      setIsComposing(false);
      setComposeInitialDraft(EMPTY_COMPOSE_INITIAL_DRAFT);
      setSelectedStory(story);
      setDetailLoadError(false);
      setEditingCommentId(null);
      setEditingCommentOriginalText('');
      setReplyTarget(null);
      setCommentMenu(null);
      setStoryMenu(false);
      setCommentInput('');
      resetStoryAttachments([]);
      resetCommentAttachments([]);
      void loadStoryDetail(story);
    },
    [
      animateTransition,
      resetCommentAttachments,
      detailTranslateX,
      loadStoryDetail,
      resetStoryAttachments,
    ],
  );

  const handleRetryStoryDetail = useCallback(() => {
    const story = selectedStoryValueRef.current;
    if (!story) return;
    void loadStoryDetail(story);
  }, [loadStoryDetail]);

  const handleRefreshSelectedStory = useCallback(() => {
    if (!selectedStory || typeof selectedStory.remoteId !== 'number') {
      return;
    }

    setDetailRefreshing(true);

    const refresh = async () => {
      try {
        const detail = await fetchBookStoryDetail(selectedStory.remoteId as number, {
          viewerAuthenticated: isLoggedIn,
        });
        if (!detail) {
          showToast(l('해당 책이야기를 찾을 수 없습니다.'));
          return;
        }
        const mapped = mapRemoteDetailToStory(detail, l, selectedStory);
        selectedStoryValueRef.current = mapped;
        setDetailLoadError(false);
        applyStoryUpdate(mapped);
      } catch (error) {
        showToast(
          resolveApiError(
            error,
            {
              401: l('로그인 상태를 확인해 주십시오.'),
              403: l('이 책이야기를 볼 권한이 없습니다.'),
              404: l('해당 책이야기를 찾을 수 없습니다.'),
            },
            l('책이야기 상세를 새로고침하지 못했습니다.'),
          ),
        );
      } finally {
        setDetailRefreshing(false);
      }
    };

    void refresh();
  }, [applyStoryUpdate, isLoggedIn, l, selectedStory]);

  const handleToggleLike = (id: string) => {
    requireAuth(() => {
      const target = stories.find((story) => story.id === id);
      if (!target || typeof target.remoteId !== 'number') return;
      const remoteId = target.remoteId;
      const nextLiked = !target.liked;

      triggerSelectionHaptic();
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
    if (submittingComment) return;
    requireAuth(() => {
      Keyboard.dismiss();
      if (!selectedStory || !commentInput.trim()) {
        showToast(l('댓글 내용을 입력해야 합니다.'));
        return;
      }
      const content = commentInput.trim();
      if (content.length > INPUT_LIMITS.BOOK_STORY_COMMENT) {
        showToast(l('댓글은 {limit}자 이하여야 합니다.', {
          limit: INPUT_LIMITS.BOOK_STORY_COMMENT,
        }));
        return;
      }
      const isEditing = typeof editingCommentId === 'number';
      const parentCommentId = !isEditing ? replyTarget?.commentId : undefined;
      const replyCommentKey = !isEditing ? replyTarget?.commentKey : undefined;
      if (!isEditing && replyCommentKey) {
        const replyParent = selectedStory.commentList.find((comment) => comment.id === replyCommentKey);
        if (replyParent?.replyTo) {
          showToast(l('대댓글에는 다시 답글을 달 수 없습니다.'));
          setReplyTarget(null);
          resetCommentAttachments([]);
          return;
        }
      }

      const remoteId = selectedStory.remoteId;
      if (typeof remoteId !== 'number') return;

      const submit = async () => {
        setSubmittingComment(true);
        try {
          const imageUrls = await resolveCommentImageUrls('BOOK_STORY_COMMENT');
          if (isEditing && typeof editingCommentId === 'number') {
            await updateBookStoryComment(remoteId, editingCommentId, content, imageUrls);
          } else {
            await createBookStoryComment(remoteId, content, parentCommentId, imageUrls);
          }

          commentDraftTextRef.current = '';
          editingCommentIdRef.current = null;
          editingCommentOriginalTextRef.current = '';
          setCommentInput('');
          setEditingCommentId(null);
          setEditingCommentOriginalText('');
          setReplyTarget(null);
          setCommentMenu(null);
          resetCommentAttachments([]);

          try {
            const detail = await fetchBookStoryDetail(remoteId, {
              viewerAuthenticated: isLoggedIn,
            });
            if (detail) {
              const mapped = mapRemoteDetailToStory(detail, l);
              setStories((prev) => {
                const exists = prev.some((story) => story.id === mapped.id);
                if (!exists) return [mapped, ...prev];
                return prev.map((story) => (story.id === mapped.id ? mapped : story));
              });
              selectedStoryValueRef.current = mapped;
              setSelectedStory(mapped);
            } else {
              showToast(l('댓글은 등록되었지만 최신 목록을 불러오지 못했습니다.'));
            }
          } catch {
            showToast(l('댓글은 등록되었지만 최신 목록을 불러오지 못했습니다.'));
          }
        } catch (error) {
          if (!(error instanceof ApiError)) {
            showToast(l(isEditing ? '댓글 수정에 실패했습니다.' : '댓글 등록에 실패했습니다.'));
          }
        } finally {
          setSubmittingComment(false);
        }
      };
      void submit();
    });
  };

  useFocusEffect(
    useCallback(() => {
      return () => {
        storyDetailRequestIdRef.current += 1;
        selectedStoryValueRef.current = null;
        isComposingRef.current = false;
        composeInitialDraftRef.current = EMPTY_COMPOSE_INITIAL_DRAFT;
        composeReturnTargetRef.current = null;
        commentDraftTextRef.current = '';
        editingCommentIdRef.current = null;
        editingCommentOriginalTextRef.current = '';
        setSelectedStory(null);
        setIsDetailLoading(false);
        setDetailLoadError(false);
        setIsComposing(false);
        setEditingStoryId(null);
        setComposeInitialDraft(EMPTY_COMPOSE_INITIAL_DRAFT);
        setEditingCommentId(null);
        setEditingCommentOriginalText('');
        setReplyTarget(null);
        setCommentMenu(null);
        setStoryMenu(false);
        setCommentInput('');
        resetStoryAttachments([]);
        resetCommentAttachments([]);
        setImageViewer(null);
      };
    }, [resetCommentAttachments, resetStoryAttachments]),
  );

  useEffect(() => {
    if (!route.params?.openCompose) return;
    const initialBook = toComposeBook(route.params?.composeBook);
    openCompose(initialBook ?? undefined);
    navigation.setParams({ openCompose: false, composeBook: undefined });
  }, [navigation, openCompose, route.params?.composeBook, route.params?.openCompose]);

  useEffect(() => {
    const draftId = route.params?.openDraftId;
    if (!draftId) return;
    const draftBook = toComposeBook(route.params?.openDraftBook);
    const returnTarget = route.params?.openDraftReturnTarget === 'MY_STORIES'
      ? route.params.openDraftReturnTarget
      : undefined;
    openCompose(draftBook ?? undefined, {
      id: draftId,
      title: route.params?.openDraftTitle ?? '',
      body: route.params?.openDraftBody ?? '',
      imageUrls: route.params?.openDraftImageUrls ?? [],
    }, returnTarget);
    navigation.setParams({
      openDraftId: undefined,
      openDraftTitle: undefined,
      openDraftBody: undefined,
      openDraftBook: undefined,
      openDraftImageUrls: undefined,
      openDraftReturnTarget: undefined,
    });
  }, [
    navigation,
    openCompose,
    route.params?.openDraftBook,
    route.params?.openDraftBody,
    route.params?.openDraftId,
    route.params?.openDraftImageUrls,
    route.params?.openDraftReturnTarget,
    route.params?.openDraftTitle,
  ]);

  useEffect(() => {
    const remoteId = parsePositiveIntParam(route.params?.openStoryId);
    if (remoteId === null) return;
    const shouldFocusComments = route.params?.openStoryFocus === 'comments';
    const returnTarget = route.params?.openStoryReturnTarget === 'MY_STORIES'
      ? route.params.openStoryReturnTarget
      : null;
    storyReturnTargetRef.current = returnTarget;
    const openDetail = async () => {
      const opened = await openStoryDetailByRemoteId(remoteId, {
        focusComments: shouldFocusComments,
      });
      if (!opened) {
        storyReturnTargetRef.current = null;
      }
    };
    void openDetail();
    navigation.setParams({
      openStoryId: undefined,
      openStoryFocus: undefined,
      openStoryReturnTarget: undefined,
    });
  }, [
    navigation,
    openStoryDetailByRemoteId,
    route.params?.openStoryFocus,
    route.params?.openStoryId,
    route.params?.openStoryReturnTarget,
  ]);

  useEffect(() => {
    const parent = navigation.getParent() as
      | (NavigationProp<ParamListBase> & {
          addListener: (
            eventName: 'tabPress',
            listener: (event: EventArg<'tabPress', true, undefined>) => void,
          ) => () => void;
        })
      | undefined;
    if (!parent) return undefined;

    const unsubscribe = parent.addListener(
      'tabPress',
      (event: EventArg<'tabPress', true, undefined>) => {
        const targetKey = event.target;
        const parentState = parent.getState();
        const targetRoute = parentState.routes.find(
          (routeItem: { key: string; name: string }) => routeItem.key === targetKey,
        );
        const focusedRoute = parentState.routes[parentState.index];
        const isRetapOnStoryTab =
          Boolean(targetRoute) &&
          targetRoute?.name === 'Story' &&
          focusedRoute?.key === targetKey;

        if (!isRetapOnStoryTab || !selectedStory) return;

        requestAnimationFrame(() => {
          scrollDetailToTop(true);
        });
      },
    );

    return unsubscribe;
  }, [navigation, scrollDetailToTop, selectedStory]);

  useEffect(() => {
    const parent = navigation.getParent() as
      | (NavigationProp<ParamListBase> & {
          addListener: (
            eventName: 'tabPress',
            listener: (event: EventArg<'tabPress', true, undefined>) => void,
          ) => () => void;
        })
      | undefined;
    if (!parent) return undefined;

    const unsubscribe = parent.addListener(
      'tabPress',
      (event: EventArg<'tabPress', true, undefined>) => {
        if (!hasUnsavedStoryChanges) return;

        const targetKey = event.target;
        const parentState = parent.getState();
        const targetRoute = parentState.routes.find(
          (routeItem: { key: string; name: string }) => routeItem.key === targetKey,
        );
        if (!targetRoute || targetRoute.name === 'Story') return;

        event.preventDefault();
        showAlertAfterKeyboardDismiss(l('알림'), l('현재 페이지는 저장되지 않습니다.'), [
          { text: l('취소'), style: 'cancel' },
          {
            text: l('닫기'),
            style: 'destructive',
            onPress: () => {
              setCommentInput('');
              setEditingCommentId(null);
              setEditingCommentOriginalText('');
              setReplyTarget(null);
              setCommentMenu(null);
              setStoryMenu(false);
              setSelectedStory(null);
              closeCompose();
              parent.navigate(targetRoute.name);
            },
          },
        ]);
      },
    );

    return unsubscribe;
  }, [closeCompose, hasUnsavedStoryChanges, l, navigation]);

  useEffect(() => {
    const unsubscribe = navigation.addListener(
      'beforeRemove',
      (event: EventArg<'beforeRemove', true, { action: NavigationAction }>) => {
        if (!hasUnsavedStoryChanges) return;

        event.preventDefault();
        showAlertAfterKeyboardDismiss(l('알림'), l('현재 페이지는 저장되지 않습니다.'), [
          { text: l('취소'), style: 'cancel' },
          {
            text: l('닫기'),
            style: 'destructive',
            onPress: () => {
              setCommentInput('');
              setEditingCommentId(null);
              setEditingCommentOriginalText('');
              setReplyTarget(null);
              setCommentMenu(null);
              setStoryMenu(false);
              setSelectedStory(null);
              closeCompose();
              navigation.dispatch(event.data.action);
            },
          },
        ]);
      },
    );

    return unsubscribe;
  }, [closeCompose, hasUnsavedStoryChanges, l, navigation]);

  if (selectedStory) {
    const book = selectedStory.book;
    return (
      <ScreenLayout title="책 이야기" onPressLogo={handlePressHeaderLogo}>
        <Animated.View
          style={[
            styles.detailSwipeContainer,
            { transform: [{ translateX: detailTranslateX }] },
          ]}
        >
        <View
          style={styles.detailBackSwipeEdge}
          {...detailBackSwipeResponder.panHandlers}
        />
        <KeyboardAvoidingView
          style={styles.container}
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
          keyboardVerticalOffset={Platform.OS === 'ios' ? insets.top + scaleSize(44) : 0}
        >
          <ScrollView
            ref={detailScrollRef}
            contentContainerStyle={[styles.detailContent, tabletReadingContentStyle]}
            showsVerticalScrollIndicator={false}
            keyboardShouldPersistTaps="handled"
            scrollEventThrottle={16}
            onScroll={(event) => {
              detailScrollYRef.current = event.nativeEvent.contentOffset.y;
            }}
            refreshControl={
              <RefreshControl
                refreshing={detailRefreshing}
                onRefresh={handleRefreshSelectedStory}
              />
            }
          >
          <View style={styles.breadcrumbRow}>
            <Pressable
              style={styles.breadcrumbButton}
              onPress={requestCloseStoryDetail}
            >
              <Text style={styles.breadcrumbText}>{l('책이야기')}</Text>
              <MaterialIcons
                name="chevron-right"
                size={18}
                color={colors.gray4}
              />
              <Text style={[styles.breadcrumbText, styles.breadcrumbActive]}>
                {l('상세보기')}
              </Text>
            </Pressable>
          </View>

          <View style={styles.detailHeader}>
            <Pressable
              style={({ pressed }) => [styles.detailAuthorPressable, pressed && styles.pressed]}
              onPress={handleOpenStoryAuthor}
              hitSlop={8}
            >
              <View style={styles.storyAvatar}>
                {selectedStory.profileImageUrl ? (
                  <Image source={{ uri: selectedStory.profileImageUrl }} style={styles.storyAvatarImage} />
                ) : (
                  <DefaultProfileAvatar size={32} />
                )}
              </View>
              <View style={styles.detailAuthorBlock}>
                <Text style={styles.storyAuthor}>{selectedStory.author}</Text>
              </View>
            </Pressable>
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
                    {selectedStory.subscribed ? l('구독중') : l('구독')}
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

          <View style={styles.detailMetaRow}>
            <Text style={styles.detailMetaText}>
              {toKstTimeAgoLabel(selectedStory.createdAt, relativeNowMillis, language)}
            </Text>
            <Text style={styles.detailMetaDot}>·</Text>
            <Text style={styles.detailMetaText}>
              {l('조회수 {count}', { count: selectedStory.views })}
            </Text>
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
                    {l('좋아요 {count}', { count: selectedStory.likes })}
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
                  <Text style={styles.detailActionText}>{l('공유하기')}</Text>
                </Pressable>
              </View>
            </View>
          )}

          <Text style={styles.detailTitle}>{selectedStory.title}</Text>
          {isDetailLoading ? (
            <View
              style={styles.detailBodyLoading}
              accessibilityRole="progressbar"
              accessibilityLabel={l('책이야기 본문을 불러오는 중입니다.')}
            >
              <SkeletonBox style={styles.detailBodySkeletonLine} />
              <SkeletonBox style={styles.detailBodySkeletonLine} />
              <SkeletonBox style={styles.detailBodySkeletonShortLine} />
            </View>
          ) : detailLoadError ? (
            <View style={styles.detailBodyError}>
              <Text style={styles.detailBodyErrorText}>
                {l('전체 본문을 불러오지 못했습니다.')}
              </Text>
              <Pressable
                style={styles.detailBodyRetryButton}
                onPress={handleRetryStoryDetail}
                accessibilityRole="button"
                accessibilityLabel={l('책이야기 본문 다시 불러오기')}
              >
                <MaterialIcons name="refresh" size={18} color={colors.white} />
                <Text style={styles.detailBodyRetryText}>{l('다시 시도')}</Text>
              </Pressable>
            </View>
          ) : (
            <Text style={styles.detailBody}>{selectedStory.fullText}</Text>
          )}
          {!isDetailLoading && !detailLoadError && selectedStory.imageUrls.length > 0 ? (
            <View style={styles.detailImageGallery}>
              <ImageGallery
                imageUrls={selectedStory.imageUrls}
                onPressImage={(index) =>
                  setImageViewer({ imageUrls: selectedStory.imageUrls, index })
                }
              />
            </View>
          ) : null}

          <View style={styles.commentSection} onLayout={handleCommentSectionLayout}>
            <Text style={styles.commentHeader}>{l('댓글')}</Text>
            {isDetailLoading && selectedStory.commentList.length === 0 && (
              <View style={styles.commentSkeletonList}>
                {[0, 1].map((i) => (
                  <View key={i} style={styles.commentSkeletonItem}>
                    <SkeletonBox style={styles.commentSkeletonAvatar} />
                    <View style={styles.commentSkeletonBody}>
                      <SkeletonBox style={styles.commentSkeletonName} />
                      <SkeletonBox style={styles.commentSkeletonText} />
                    </View>
                  </View>
                ))}
              </View>
            )}
            {!editingCommentId && !replyTarget && (
              <View style={styles.commentComposerBlock}>
                <View style={styles.commentInputRow}>
                  <FormTextInput
                    ref={commentInputRef}
                    style={styles.commentInput}
                    placeholder={l('댓글 내용 (최대 {limit}자)', {
                      limit: INPUT_LIMITS.BOOK_STORY_COMMENT,
                    })}
                    placeholderTextColor={colors.gray3}
                    value={commentInput}
                    onChangeText={handleChangeCommentInput}
                    multiline
                    maxLength={INPUT_LIMITS.BOOK_STORY_COMMENT}
                    overLimitMessage={l('댓글은 {limit}자 이하여야 합니다.', {
                      limit: INPUT_LIMITS.BOOK_STORY_COMMENT,
                    })}
                    onFocus={handleFocusCommentInput}
                    editable={!submittingComment}
                  />
                  <Pressable
                    style={({ pressed }) => [
                      styles.commentSubmit,
                      isCommentSubmitDisabled && styles.commentSubmitDisabled,
                      pressed && styles.pressed,
                    ]}
                    onPress={handleSubmitComment}
                    disabled={isCommentSubmitDisabled}
                  >
                    <Text style={styles.commentSubmitText}>
                      {submittingComment ? l('처리 중') : l('등록')}
                    </Text>
                  </Pressable>
                </View>
                <ImageAttachmentPicker
                  controller={commentAttachments}
                  compact
                  disabled={submittingComment}
                />
              </View>
            )}

            <View style={styles.commentList}>
              {selectedStory.commentList.map((comment) => (
                <View key={comment.id} style={[styles.commentItem, comment.replyTo && styles.commentReply]}>
                  {comment.replyTo ? <Text style={styles.replyPrefix}>ㄴ</Text> : null}
                  <View style={styles.commentAvatar}>
                    {comment.profileImageUrl ? (
                      <Image source={{ uri: comment.profileImageUrl }} style={styles.commentAvatarImage} />
                    ) : (
                      <DefaultProfileAvatar size={28} />
                    )}
                  </View>
                  <View style={styles.commentBody}>
                    <View style={styles.commentHeaderRow}>
                      <View style={styles.commentMetaRow}>
                        <Text style={styles.commentAuthor}>{comment.author}</Text>
                        {comment.author === selectedStory.author && (
                          <View style={styles.commentAuthorBadge}>
                            <Text style={styles.commentAuthorBadgeText}>{l('작성자')}</Text>
                          </View>
                        )}
                        <Text style={styles.commentTime}>
                          {toKstTimeAgoLabel(comment.createdAt, relativeNowMillis, language)}
                        </Text>
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
                    {editingCommentId === comment.remoteId ? (
                      <View style={styles.inlineCommentEditBlock}>
                        <View style={styles.inlineReplyRow}>
                          <FormTextInput
                            ref={inlineEditCommentInputRef}
                            style={styles.commentInput}
                            placeholder={l(
                              comment.replyTo
                                ? '대댓글 수정 (최대 {limit}자)'
                                : '댓글 수정 (최대 {limit}자)',
                              {
                                limit: INPUT_LIMITS.BOOK_STORY_COMMENT,
                              },
                            )}
                            placeholderTextColor={colors.gray3}
                            value={commentInput}
                            onChangeText={handleChangeCommentInput}
                            multiline
                            maxLength={INPUT_LIMITS.BOOK_STORY_COMMENT}
                            overLimitMessage={l('댓글은 {limit}자 이하여야 합니다.', {
                              limit: INPUT_LIMITS.BOOK_STORY_COMMENT,
                            })}
                            onFocus={handleFocusInlineEditCommentInput}
                            editable={!submittingComment}
                          />
                          <Pressable
                            style={({ pressed }) => [
                              styles.commentSubmit,
                              isCommentSubmitDisabled && styles.commentSubmitDisabled,
                              pressed && styles.pressed,
                            ]}
                            onPress={handleSubmitComment}
                            disabled={isCommentSubmitDisabled}
                          >
                            <Text style={styles.commentSubmitText}>
                              {submittingComment ? l('처리 중') : l('수정')}
                            </Text>
                          </Pressable>
                        </View>
                        <ImageAttachmentPicker
                          controller={commentAttachments}
                          compact
                          disabled={submittingComment}
                        />
                        <Pressable
                          style={({ pressed }) => [
                            styles.commentEditCancelButton,
                            pressed && styles.pressed,
                          ]}
                          onPress={cancelEditComment}
                        >
                          <Text style={styles.commentEditCancelText}>
                            {l('댓글 수정 취소')}
                          </Text>
                        </Pressable>
                      </View>
                    ) : (
                      <>
                        <Text style={styles.commentText}>{comment.text}</Text>
                        <ImageGallery
                          imageUrls={comment.imageUrls}
                          compact
                          onPressImage={(index) =>
                            setImageViewer({ imageUrls: comment.imageUrls, index })
                          }
                        />
                      </>
                    )}
                    {!editingCommentId && replyTarget?.commentKey === comment.id && (
                      <View style={styles.commentComposerBlock}>
                        <View style={styles.inlineReplyRow}>
                          <FormTextInput
                            ref={inlineReplyInputRef}
                            style={styles.commentInput}
                            placeholder={l('대댓글 내용 (최대 {limit}자)', {
                              limit: INPUT_LIMITS.BOOK_STORY_COMMENT,
                            })}
                            placeholderTextColor={colors.gray3}
                            value={commentInput}
                            onChangeText={handleChangeCommentInput}
                            multiline
                            maxLength={INPUT_LIMITS.BOOK_STORY_COMMENT}
                            overLimitMessage={l('댓글은 {limit}자 이하여야 합니다.', {
                              limit: INPUT_LIMITS.BOOK_STORY_COMMENT,
                            })}
                            onFocus={handleFocusInlineReplyInput}
                            editable={!submittingComment}
                          />
                          <Pressable
                            style={({ pressed }) => [
                              styles.commentSubmit,
                              isCommentSubmitDisabled && styles.commentSubmitDisabled,
                              pressed && styles.pressed,
                            ]}
                            onPress={handleSubmitComment}
                            disabled={isCommentSubmitDisabled}
                          >
                            <Text style={styles.commentSubmitText}>
                              {submittingComment ? l('처리 중') : l('등록')}
                            </Text>
                          </Pressable>
                        </View>
                        <ImageAttachmentPicker
                          controller={commentAttachments}
                          compact
                          disabled={submittingComment}
                        />
                      </View>
                    )}
                  </View>
                </View>
              ))}
            </View>
          </View>
        </ScrollView>
        <ActionMenu
          visible={Boolean(commentMenu)}
          anchor={
            commentMenu
              ? {
                  pageX: commentMenu.pageX,
                  pageY: commentMenu.pageY,
                }
              : null
          }
          items={commentMenuItems}
          onClose={() => setCommentMenu(null)}
          screenWidth={screenWidth}
          screenHeight={screenHeight}
          menuWidth={132}
          topBoundary={96}
        />
        <BottomSheetActionMenu
          visible={storyMenu}
          title={l('책이야기 메뉴')}
          actions={storyMenuItems}
          onClose={() => setStoryMenu(false)}
        />
        <ReportMemberModal
          visible={Boolean(reportModal)}
          target={reportModal}
          submitting={submittingReport}
          onPressTarget={handlePressReportTarget}
          onClose={closeReportModal}
          onSubmit={submitReport}
        />
        {imageViewer ? (
          <ImageViewerModal
            imageUrls={imageViewer.imageUrls}
            index={imageViewer.index}
            onIndexChange={(index) =>
              setImageViewer((current) => (current ? { ...current, index } : null))
            }
            onClose={() => setImageViewer(null)}
          />
        ) : null}
        </KeyboardAvoidingView>
        </Animated.View>
      </ScreenLayout>
    );
  }

  if (isComposing) {
    return (
      <ScreenLayout title="책 이야기" onPressLogo={handlePressHeaderLogo}>
        <KeyboardAvoidingView
          style={styles.container}
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
          keyboardVerticalOffset={Platform.OS === 'ios' ? insets.top + scaleSize(44) : 0}
        >
          <ScrollView
            ref={composeScrollRef}
            contentContainerStyle={[styles.composeContent, tabletReadingContentStyle]}
            showsVerticalScrollIndicator={false}
            keyboardShouldPersistTaps="handled"
            onScroll={handleComposeScroll}
            scrollEventThrottle={16}
          >
          <View style={styles.composeHeader}>
            <Pressable
              style={styles.composeBack}
              onPress={requestCloseCompose}
            >
              <MaterialIcons name="chevron-left" size={20} color={colors.gray5} />
              <Text style={styles.composeBackText}>{l('목록으로')}</Text>
            </Pressable>
            <View style={styles.writeRow}>
              <MaterialIcons
                name="play-arrow"
                size={18}
                color={colors.gray5}
              />
              <Text style={styles.writeLabel}>
                {editingStoryId ? l('글 수정하기') : l('글 작성하기')}
              </Text>
            </View>
          </View>

          <View style={styles.card}>
            {!selectedBook ? (
              isEditingStory ? (
                <View style={styles.bookReadOnlyNotice}>
                  <Text style={styles.bookReadOnlyNoticeText}>
                    {l('수정 모드에서는 책 정보를 변경할 수 없습니다.')}
                  </Text>
                </View>
              ) : (
                <Pressable
                  style={styles.bookSelectButton}
                  onPress={openBookPicker}
                >
                  <Text style={styles.bookSelectText}>{l('책 선택하기')}</Text>
                </Pressable>
              )
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
            {selectedBook && !isEditingStory && (
              <Pressable
                style={styles.secondaryButton}
                onPress={openBookPicker}
              >
                <Text style={styles.secondaryButtonText}>{l('변경하기')}</Text>
              </Pressable>
            )}
            {isEditingStory ? (
              <Text style={styles.bookReadOnlyGuide}>
                {l('수정 모드에서는 책은 변경할 수 없고 제목과 본문만 수정됩니다.')}
              </Text>
            ) : null}
          </View>

          <View style={styles.formCard}>
            <FormTextInput
              value={title}
              onChangeText={handleChangeStoryTitle}
              placeholder={l('제목을 입력해야 합니다.')}
              placeholderTextColor={colors.gray3}
              style={styles.titleInput}
              autoFocus={!isEditingStory}
              maxLength={INPUT_LIMITS.BOOK_STORY_TITLE}
              overLimitMessage={l('책이야기 제목은 {limit}자 이하여야 합니다.', {
                limit: INPUT_LIMITS.BOOK_STORY_TITLE,
              })}
            />
            <Text style={styles.titleCounterText}>
              {title.length}/{INPUT_LIMITS.BOOK_STORY_TITLE}
            </Text>
            <FormTextInput
              ref={bodyInputRef}
              value={body}
              onChangeText={handleChangeStoryBody}
              placeholder={l('자신의 책이야기를 들려주세요. (최대 {limit}자)', {
                limit: INPUT_LIMITS.BOOK_STORY_CONTENT,
              })}
              placeholderTextColor={colors.gray3}
              style={styles.bodyInput}
              multiline
              scrollEnabled={false}
              textAlignVertical="top"
              onFocus={handleFocusStoryBodyInput}
              onBlur={handleBlurStoryBodyInput}
              onContentSizeChange={handleStoryBodyContentSizeChange}
              maxLength={INPUT_LIMITS.BOOK_STORY_CONTENT}
              overLimitMessage={l('책이야기 본문은 {limit}자 이하여야 합니다.', {
                limit: INPUT_LIMITS.BOOK_STORY_CONTENT,
              })}
            />
            <Text style={styles.bodyCounterText}>
              {body.length}/{INPUT_LIMITS.BOOK_STORY_CONTENT}
            </Text>
            <View style={styles.composeAttachmentSection}>
              <Text style={styles.composeAttachmentTitle}>{l('사진 첨부')}</Text>
              <ImageAttachmentPicker
                controller={storyAttachments}
                disabled={submittingStory}
              />
            </View>
          </View>
        </ScrollView>
        <View
          style={[
            styles.composeFooter,
            { paddingBottom: Math.max(insets.bottom, spacing.lg) },
          ]}
        >
          <Pressable
            style={[
              styles.secondaryButton,
              styles.composeFooterButton,
              submittingStory && styles.formButtonDisabled,
            ]}
            onPress={requestCloseCompose}
            disabled={submittingStory}
          >
            <Text style={styles.secondaryButtonText}>{l('취소')}</Text>
          </Pressable>
          <Pressable
            style={[
              styles.primaryButton,
              styles.composeFooterButton,
              submittingStory && styles.formButtonDisabled,
            ]}
            onPress={handleOpenComposeSubmitChoice}
            disabled={submittingStory}
          >
            <Text style={styles.primaryButtonText}>
              {submittingStory
                ? editingStoryId
                  ? l('수정 중...')
                  : l('처리 중...')
                : editingStoryId
                  ? l('수정하기')
                  : l('등록/임시저장')}
            </Text>
          </Pressable>
        </View>
        <Modal
          visible={showBookPicker}
          animationType="slide"
          onRequestClose={closeBookPicker}
        >
          <View style={[styles.bookPickerModalContainer, { paddingTop: insets.top + spacing.sm }]}>
                <View style={styles.bookPickerHeaderRow}>
                  <Text style={styles.bookPickerHeaderText}>{l('책 검색')}</Text>
                  <IconButton
                    name="close"
                    color={colors.gray5}
                    size={20}
                    onPress={closeBookPicker}
                    accessibilityLabel={l('닫기')}
                  />
                </View>
                <View style={styles.bookSearchInputRow}>
                  <Pressable onPress={handleSubmitBookSearch}>
                    <MaterialIcons name="search" size={22} color={colors.gray4} />
                  </Pressable>
                  <TextInput
                    value={bookSearchQuery}
                    onChangeText={setBookSearchQuery}
                    placeholder={l('책 제목, 작가 이름을 검색해보세요')}
                    placeholderTextColor={colors.gray3}
                    style={styles.bookSearchInput}
                    onSubmitEditing={handleSubmitBookSearch}
                    returnKeyType="search"
                    autoFocus={showBookPicker}
                  />
                  {bookSearchQuery.length > 0 ? (
                    <IconButton
                      name="close"
                      color={colors.gray4}
                      size={18}
                      accessibilityLabel={l('검색어 지우기')}
                      onPress={resetBookSearch}
                    />
                  ) : null}
                </View>
                {bookSearchSearched ? (
                  bookSearchLoading ? (
                    <Text style={styles.bookSearchGuideText}>{l('검색 중...')}</Text>
                  ) : (
                    <Text style={styles.bookSearchGuideText}>
                      {l('"{keyword}" 총 {count}개의 검색결과가 있습니다.', {
                        keyword: bookSearchKeyword,
                        count: bookSearchTotalResults,
                      })}
                    </Text>
                  )
                ) : (
                  <Text style={styles.bookSearchGuideText}>
                    {l('검색어를 입력하고 책을 선택해야 합니다.')}
                  </Text>
                )}

                <KeyboardAvoidingView
                  style={styles.bookPickerListArea}
                  behavior={Platform.OS === 'ios' ? 'padding' : undefined}
                >
                  <ScrollView
                    style={styles.bookPickerScroll}
                    contentContainerStyle={[
                      styles.bookPickerContent,
                      { paddingBottom: insets.bottom + spacing.lg },
                    ]}
                    keyboardShouldPersistTaps="handled"
                    showsVerticalScrollIndicator={false}
                    scrollEventThrottle={16}
                    onScroll={handleBookSearchScroll}
                  >
                    {bookSearchSearched && !bookSearchLoading && bookSearchResults.length === 0 ? (
                      <Text style={styles.bookPickerEmptyText}>{l('검색 결과가 없습니다.')}</Text>
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
                            {bookItem.description || bookItem.publisher || l('책 설명이 없습니다.')}
                          </Text>
                        </View>
                      </Pressable>
                    ))}

                    {bookSearchSearched &&
                    !bookSearchLoading &&
                    bookSearchResults.length > 0 ? (
                      bookSearchLoadingMore ? (
                        <View style={styles.bookSearchPaginationFooter}>
                          <ActivityIndicator size="small" color={colors.primary1} />
                        </View>
                      ) : !bookSearchHasNext ? (
                        <Text style={styles.bookSearchEndText}>
                          {l('마지막 검색 결과입니다.')}
                        </Text>
                      ) : null
                    ) : null}
                  </ScrollView>
                </KeyboardAvoidingView>
          </View>
          {showBookPicker ? <ToastHost /> : null}
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
                        {l(tab.label)}
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
                <View style={[styles.recommendedRow, { maxWidth: storyFeedRowMaxWidth }]}>
                  <View style={styles.recommendedCard}>
                    <Text style={styles.recommendedTitle}>{l('사용자 추천')}</Text>
                    {recommendedUsers.map((user) => (
                      <SubscribeUserItem
                        key={user.id}
                        nickname={user.nickname}
                        profileImageUrl={user.profileImageUrl}
                        subscribed={user.subscribed}
                        onPressProfile={() => openUserProfile(user.nickname)}
                        onPressSubscribe={() => handleToggleRecommendedSubscribe(user.id)}
                      />
                    ))}
                  </View>
                </View>
              );
            }

            return (
              <View style={[styles.storyFeedRow, { maxWidth: storyFeedRowMaxWidth }]}>
                {item.stories.map((story) => {
                  const isMineForViewer = isLoggedIn && (story.mine ?? false);
                  return (
                    <BookStoryFeedCard
                      key={story.id}
                      style={styles.storyFeedCard}
                      authorName={story.author}
                      profileImgSrc={story.profileImageUrl}
                      timeAgo={toKstTimeAgoLabel(story.createdAt, relativeNowMillis, language)}
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
                      onPressComment={() => handleSelectStory(story, { focusComments: true })}
                      onToggleLike={() => handleToggleLike(story.id)}
                      onToggleSubscribe={
                        isMineForViewer ? undefined : () => handleToggleSubscribe(story.id)
                      }
                      onPressAuthor={() => openUserProfile(story.author)}
                    />
                  );
                })}
                {item.stories.length < storyFeedColumnCount ? (
                  <View style={styles.storyFeedCardPlaceholder} />
                ) : null}
              </View>
            );
          }}
          ItemSeparatorComponent={() => <View style={styles.storyItemSeparator} />}
          contentContainerStyle={styles.listContent}
          onScroll={handleStoryListScroll}
          scrollEventThrottle={16}
          onEndReached={handleEndReached}
          onEndReachedThreshold={0.3}
          showsVerticalScrollIndicator={false}
          ListEmptyComponent={
            isInitialLoading ? (
              <View style={[styles.skeletonList, { maxWidth: storyFeedRowMaxWidth }]}>
                {storySkeletonRows.map((row, rowIndex) => (
                  <View key={`story-skeleton-row-${rowIndex}`} style={styles.storyFeedRow}>
                    {row.map((item) => (
                      <BookStoryFeedCardSkeleton
                        key={`story-skeleton-${item}`}
                        style={styles.storyFeedCard}
                      />
                    ))}
                  </View>
                ))}
              </View>
            ) : null
          }
          ListFooterComponent={
            isLoadingMore ? (
              <View style={styles.listFooter}>
                <Text style={styles.listFooterText}>{l('불러오는 중...')}</Text>
              </View>
            ) : loadMoreError ? (
              <Pressable style={styles.listFooter} onPress={handleRetryLoadMore}>
                <Text style={styles.listFooterText}>
                  {l('책이야기를 추가로 불러오지 못했습니다.')} {l('다시 시도')}
                </Text>
              </Pressable>
            ) : (
              <View style={{ height: spacing.xxl }} />
            )
          }
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={handleRefresh}
            />
          }
        />
        <FloatingActionButton onPress={() => openCompose()} accessibilityLabel={l('글 작성하기')}>
          <WriteIcon width={20} height={20} />
        </FloatingActionButton>
      </KeyboardAvoidingView>
    </ScreenLayout>
  );
}

function mapRemoteStoryToStory(
  item: RemoteStoryItem | RemoteStoryDetail,
  l: (text: string) => string,
): Story {
  const book: Book | undefined = item.bookInfo
      ? {
        id: item.bookInfo.isbn ?? `book-${item.id}`,
        title: item.bookInfo.title ?? l('책 제목'),
        author: item.bookInfo.author ?? l('작가 미상'),
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
    createdAt: item.createdAt,
    views: item.viewCount,
    title: item.title,
    body: item.description,
    fullText: item.description,
    imageUrls: item.imageUrls,
    likes: item.likeCount,
    comments: item.commentCount,
    tag: l('전체'),
    subscribed: item.following,
    liked: item.liked,
    book,
    commentList: [],
  };
}

function mapRemoteCommentToComment(
  comment: RemoteStoryComment,
  l: (text: string) => string,
): Comment {
  return {
    id: `comment-${comment.id}`,
    remoteId: comment.id,
    author: comment.nickname,
    profileImageUrl: normalizeRemoteImageUrl(comment.profileImageUrl),
    createdAt: comment.createdAt,
    text: comment.deleted ? l('삭제된 댓글입니다.') : comment.content,
    imageUrls: comment.deleted ? [] : comment.imageUrls,
    mine: comment.mine,
    deleted: comment.deleted,
    replyTo: typeof comment.parentCommentId === 'number' ? `comment-${comment.parentCommentId}` : undefined,
  };
}

function mapRemoteDetailToStory(
  detail: RemoteStoryDetail,
  l: (text: string) => string,
  previous?: Story,
): Story {
  const mapped = mapRemoteStoryToStory(detail, l);
  return {
    ...(previous ?? mapped),
    ...mapped,
    mine: detail.mine,
    fullText: detail.description,
    commentList: detail.commentList.map((comment) => mapRemoteCommentToComment(comment, l)),
  };
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  detailSwipeContainer: {
    flex: 1,
  },
  detailBackSwipeEdge: {
    position: 'absolute',
    top: 0,
    bottom: 0,
    left: 0,
    width: DETAIL_BACK_EDGE_WIDTH,
    zIndex: layers.dropdown,
  },
  listContent: {
    paddingBottom: spacing.xl,
  },
  listFooter: {
    paddingVertical: spacing.md,
    alignItems: 'center',
  },
  listFooterText: {
    ...typography.body2,
    color: colors.gray4,
  },
  storyItemSeparator: {
    height: spacing.sm,
  },
  storyFeedRow: {
    width: '100%',
    alignSelf: 'center',
    flexDirection: 'row',
    alignItems: 'stretch',
    gap: spacing.sm,
    paddingHorizontal: 18,
  },
  storyFeedCard: {
    flex: 1,
    minWidth: 0,
    marginHorizontal: 0,
  },
  storyFeedCardPlaceholder: {
    flex: 1,
    minWidth: 0,
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
    flexGrow: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
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
    ...typography.body1,
    color: colors.gray7,
  },
  skeletonList: {
    width: '100%',
    alignSelf: 'center',
    paddingTop: spacing.xs,
    gap: spacing.sm,
  },
  commentSkeletonList: {
    gap: spacing.md,
    paddingVertical: spacing.sm,
  },
  commentSkeletonItem: {
    flexDirection: 'row',
    gap: spacing.sm,
    alignItems: 'flex-start',
  },
  commentSkeletonAvatar: {
    width: 28,
    height: 28,
    borderRadius: 14,
  },
  commentSkeletonBody: {
    flex: 1,
    gap: spacing.xs,
  },
  commentSkeletonName: {
    width: 80,
    height: 12,
  },
  commentSkeletonText: {
    width: '90%',
    height: 12,
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
  recommendedRow: {
    width: '100%',
    alignSelf: 'center',
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
    shadowColor: colors.black,
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
  bookReadOnlyNotice: {
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.gray2,
    backgroundColor: colors.gray1,
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.sm,
    alignItems: 'center',
    justifyContent: 'center',
  },
  bookReadOnlyNoticeText: {
    ...typography.body2_3,
    color: colors.gray5,
    textAlign: 'center',
  },
  bookReadOnlyGuide: {
    ...typography.body2_3,
    color: colors.gray5,
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
  bookPickerModalContainer: {
    flex: 1,
    backgroundColor: colors.white,
    paddingHorizontal: spacing.md,
    gap: spacing.sm,
  },
  bookPickerListArea: {
    flex: 1,
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
    flex: 1,
  },
  bookPickerContent: {
    gap: spacing.sm,
  },
  bookPickerEmptyText: {
    ...typography.body1_3,
    color: colors.gray4,
    textAlign: 'center',
    paddingVertical: spacing.md,
  },
  bookSearchPaginationFooter: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: spacing.md,
  },
  bookSearchEndText: {
    ...typography.body2_3,
    color: colors.gray4,
    textAlign: 'center',
    paddingVertical: spacing.sm,
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
  formButtonDisabled: {
    opacity: 0.5,
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
  draftButton: {
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.sm,
    borderRadius: radius.md,
    backgroundColor: colors.subbrown4,
    alignItems: 'center',
    justifyContent: 'center',
  },
  draftButtonText: {
    ...typography.body1_2,
    color: colors.primary3,
  },
  formCard: {
    backgroundColor: colors.white,
    borderRadius: radius.md,
    padding: spacing.md,
    gap: spacing.sm,
    shadowColor: colors.black,
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
  titleCounterText: {
    ...typography.body2_3,
    color: colors.gray4,
    textAlign: 'right',
  },
  bodyInput: {
    ...typography.body1_3,
    color: colors.gray6,
    minHeight: 160,
    paddingTop: spacing.sm,
    paddingRight: spacing.lg,
    paddingBottom: spacing.lg,
  },
  bodyCounterText: {
    ...typography.body2_3,
    color: colors.gray4,
    textAlign: 'right',
    marginTop: spacing.xxs,
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
  composeAttachmentSection: {
    marginTop: spacing.xs,
    paddingTop: spacing.md,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: colors.gray2,
    gap: spacing.sm,
  },
  composeAttachmentTitle: {
    ...typography.body1_2,
    color: colors.gray6,
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
    backgroundColor: colors.subbrown4,
  },
  chipInactive: {
    backgroundColor: colors.primary1,
  },
  chipText: {
    ...typography.body2_2,
  },
  chipTextActive: {
    color: colors.primary3,
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
    paddingBottom: spacing.xxl * 4,
    gap: spacing.md,
  },
  composeFooter: {
    flexDirection: 'row',
    gap: spacing.sm,
    paddingHorizontal: spacing.md,
    paddingTop: spacing.sm,
    borderTopWidth: 1,
    borderTopColor: colors.gray1,
    backgroundColor: colors.white,
  },
  composeFooterButton: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: radius.md,
    paddingVertical: spacing.sm,
  },
  composeHeader: {
    gap: spacing.xs,
  },
  composeBack: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xxs,
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
    marginTop: 2,
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
  detailAuthorPressable: {
    flex: 1,
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
    padding: spacing.xxs,
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
    gap: spacing.xxs,
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
    ...typography.body1_3_relaxed,
    color: colors.gray6,
    marginTop: spacing.xs,
  },
  detailImageGallery: {
    marginTop: spacing.md,
  },
  detailBodyLoading: {
    marginTop: spacing.xs,
    gap: spacing.xs,
  },
  detailBodySkeletonLine: {
    width: '100%',
    height: 18,
  },
  detailBodySkeletonShortLine: {
    width: '64%',
    height: 18,
  },
  detailBodyError: {
    marginTop: spacing.xs,
    paddingVertical: spacing.lg,
    alignItems: 'center',
    gap: spacing.sm,
  },
  detailBodyErrorText: {
    ...typography.body1_3,
    color: colors.gray4,
    textAlign: 'center',
  },
  detailBodyRetryButton: {
    minHeight: 40,
    paddingHorizontal: spacing.md,
    borderRadius: radius.sm,
    backgroundColor: colors.primary1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.xs,
  },
  detailBodyRetryText: {
    ...typography.body2_2,
    color: colors.white,
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
  commentComposerBlock: {
    gap: spacing.sm,
  },
  commentInput: {
    flex: 1,
    minHeight: 48,
    maxHeight: 120,
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
  replyPrefix: {
    ...typography.body2_3,
    color: colors.gray4,
    marginTop: spacing.xxs,
  },
  commentAvatar: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: colors.gray1,
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  commentAvatarImage: {
    width: '100%',
    height: '100%',
  },
  commentBody: {
    flex: 1,
    gap: spacing.xxs,
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
    backgroundColor: colors.subbrown4,
    paddingHorizontal: spacing.xs,
    paddingVertical: 2,
  },
  commentAuthorBadgeText: {
    ...typography.body2_3,
    color: colors.primary1,
  },
  commentMenuButton: {
    padding: spacing.xxs,
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
  inlineCommentEditBlock: {
    gap: spacing.xs,
  },
  commentEditCancelButton: {
    alignSelf: 'flex-start',
    paddingVertical: spacing.xxs,
  },
  commentEditCancelText: {
    ...typography.body2_3,
    color: colors.gray4,
    textDecorationLine: 'underline',
  },
  pressed: {
    opacity: interactionOpacity.pressed,
  },
});
