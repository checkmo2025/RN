import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import type { RefObject } from 'react';
import { Image, Modal, ScrollView, Text, View } from 'react-native';
import { SkeletonBox } from '../../components/common/SkeletonBox';
import type { GestureResponderEvent } from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { colors } from '../../theme';
import { DefaultProfileAvatar } from '../../components/common/DefaultProfileAvatar';
import { FeedbackPressable as Pressable } from '../../components/common/FeedbackPressable';
import {
  BottomSheetActionMenu,
  type BottomSheetActionMenuItem,
} from '../../components/common/BottomSheetActionMenu';
import { styles } from './meetingStyles';
import { formatAverageRating, getStarIconName } from './helpers';
import { useLanguage } from '../../contexts/LanguageContext';
import type {
  BookshelfDetailLoadState,
  BookshelfDetailSection,
  BookshelfDetailTab,
  BookshelfItem,
  BookshelfPostItem,
  BookshelfViewMode,
  CursorPageState,
  Group,
  RegularMeetingGroupItem,
  RegularMeetingInfo,
} from './types';

function getBookshelfCategoryBadgeStyle(category: string) {
  switch (category) {
    case '자기계발':
      return styles.bookshelfCategoryBlue;
    case '정치/외교/국방':
      return styles.bookshelfCategoryPurple;
    case '어린이/청소년':
      return styles.bookshelfCategoryOrange;
    case '사회과학':
      return styles.bookshelfCategoryTeal;
    default:
      return styles.bookshelfCategoryPink;
  }
}

export type GroupBookshelfViewProps = {
  isMember: boolean;
  isInitialLoading?: boolean;
  canManageClub: boolean;
  group: Group;
  shouldScrollToBookshelfDetailRef: RefObject<boolean>;
  bookshelfTabScrollRef: RefObject<boolean>;
  onScrollToPillNav: () => void;
  onScrollToBookshelfDetail: (sectionY: number) => void;
  bookshelfDetailMinHeight?: number;
  // Bookshelf state
  bookshelfViewMode: BookshelfViewMode;
  bookshelfSessions: string[];
  selectedBookshelfSession: string;
  visibleBookshelfItems: BookshelfItem[];
  selectedBookshelfBook: BookshelfItem | null;
  canManageRegularGroups: boolean;
  bookshelfDetailTab: BookshelfDetailTab;
  bookshelfTopicItems: BookshelfPostItem[];
  bookshelfReviewItems: BookshelfPostItem[];
  currentBookshelfTopicPageState: CursorPageState | null;
  bookshelfDetailLoadState: BookshelfDetailLoadState;
  regularMeetingInfo: RegularMeetingInfo | null;
  selectedRegularGroupId: string | null;
  selectedRegularGroup: RegularMeetingGroupItem | null;
  regularGroupPendingPostKeys: ReadonlySet<string>;
  regularGroupMembersVisible: boolean;
  // Setters
  setSelectedBookshelfSession: (session: string) => void;
  // Handlers
  openBookshelfDetail: (book: BookshelfItem, tab: BookshelfDetailTab) => void;
  handleBackToBookshelfGrid: () => void;
  handleChangeBookshelfTab: (tab: BookshelfDetailTab) => void;
  handleOpenBookshelfComposer: (type: 'TOPIC' | 'REVIEW', post?: BookshelfPostItem) => void;
  handlePressBookshelfPostMenu: (post: BookshelfPostItem, event: GestureResponderEvent) => void;
  handleSelectRegularGroup: (groupId: string) => void;
  handleToggleRegularGroupMembers: () => void;
  handleToggleRegularGroupPost: (groupId: string, postId: string) => void;
  handleSortRegularGroupPosts: (groupId: string) => void;
  handleOpenBookshelfEdit: () => void;
  handleDeleteSelectedBookshelf: () => void;
  handlePressManageRegularGroups: () => void;
  retryBookshelfDetailSection: (section: BookshelfDetailSection) => void;
};

export function GroupBookshelfView({
  isMember,
  isInitialLoading = false,
  canManageClub,
  group,
  shouldScrollToBookshelfDetailRef,
  bookshelfTabScrollRef,
  onScrollToPillNav,
  onScrollToBookshelfDetail,
  bookshelfDetailMinHeight,
  bookshelfViewMode,
  bookshelfSessions,
  selectedBookshelfSession,
  visibleBookshelfItems,
  selectedBookshelfBook,
  canManageRegularGroups,
  bookshelfDetailTab,
  bookshelfTopicItems,
  bookshelfReviewItems,
  currentBookshelfTopicPageState,
  bookshelfDetailLoadState,
  regularMeetingInfo,
  selectedRegularGroupId,
  selectedRegularGroup,
  regularGroupPendingPostKeys,
  regularGroupMembersVisible,
  setSelectedBookshelfSession,
  openBookshelfDetail,
  handleBackToBookshelfGrid,
  handleChangeBookshelfTab,
  handleOpenBookshelfComposer,
  handlePressBookshelfPostMenu,
  handleSelectRegularGroup,
  handleToggleRegularGroupMembers,
  handleToggleRegularGroupPost,
  handleSortRegularGroupPosts,
  handleOpenBookshelfEdit,
  handleDeleteSelectedBookshelf,
  handlePressManageRegularGroups,
  retryBookshelfDetailSection,
}: GroupBookshelfViewProps) {
  const { l } = useLanguage();
  const bookshelfSectionYRef = useRef(0);
  const detailSectionYRef = useRef(0);
  const regularGroupMemberButtonRef = useRef<View>(null);
  const [bookshelfMenuVisible, setBookshelfMenuVisible] = useState(false);
  const [regularGroupMemberDropdownAnchor, setRegularGroupMemberDropdownAnchor] = useState<{
    left: number;
    top: number;
  } | null>(null);
  const scrollToBookshelfDetail = useCallback(() => {
    onScrollToBookshelfDetail(bookshelfSectionYRef.current + detailSectionYRef.current);
  }, [onScrollToBookshelfDetail]);
  const showBookshelfTopicLoading =
    (bookshelfDetailLoadState.topic === 'idle' ||
      bookshelfDetailLoadState.topic === 'loading') &&
    bookshelfTopicItems.length === 0;
  const showBookshelfReviewLoading =
    (bookshelfDetailLoadState.review === 'idle' ||
      bookshelfDetailLoadState.review === 'loading') &&
    bookshelfReviewItems.length === 0;
  const showRegularMeetingLoading =
    bookshelfDetailLoadState.regular === 'idle' ||
    bookshelfDetailLoadState.regular === 'loading';

  const renderDetailLoadError = (
    section: BookshelfDetailSection,
    message: string,
  ) => (
    <View style={styles.detailLoadStateCard}>
      <Text style={styles.detailLoadStateText}>{l(message)}</Text>
      <Pressable
        style={({ pressed }) => [styles.detailLoadRetryButton, pressed && styles.pressed]}
        onPress={() => retryBookshelfDetailSection(section)}
        accessibilityRole="button"
        accessibilityLabel={l('다시 시도')}
      >
        <MaterialIcons name="refresh" size={18} color={colors.primary1} />
        <Text style={styles.detailLoadRetryText}>{l('다시 시도')}</Text>
      </Pressable>
    </View>
  );

  useEffect(() => {
    setBookshelfMenuVisible(false);
  }, [selectedBookshelfBook?.id]);

  useEffect(() => {
    if (!regularGroupMembersVisible) {
      setRegularGroupMemberDropdownAnchor(null);
    }
  }, [regularGroupMembersVisible]);

  const closeRegularGroupMembers = useCallback(() => {
    if (regularGroupMembersVisible) {
      handleToggleRegularGroupMembers();
    }
  }, [handleToggleRegularGroupMembers, regularGroupMembersVisible]);

  const handlePressRegularGroupMembers = useCallback(() => {
    if (regularGroupMembersVisible) {
      handleToggleRegularGroupMembers();
      return;
    }

    const button = regularGroupMemberButtonRef.current;
    if (!button) {
      handleToggleRegularGroupMembers();
      return;
    }

    button.measureInWindow((pageX, pageY, _width, height) => {
      setRegularGroupMemberDropdownAnchor({
        left: pageX,
        top: pageY + height,
      });
      handleToggleRegularGroupMembers();
    });
  }, [handleToggleRegularGroupMembers, regularGroupMembersVisible]);

  const bookshelfMenuItems = useMemo<BottomSheetActionMenuItem[]>(() => {
    if (!selectedBookshelfBook || !canManageClub) return [];
    return [
      {
        key: 'edit',
        label: l('책장 수정'),
        icon: 'edit',
        onPress: handleOpenBookshelfEdit,
      },
      {
        key: 'delete',
        label: l('책장 삭제'),
        icon: 'delete-outline',
        destructive: true,
        disabled: typeof selectedBookshelfBook.remoteMeetingId !== 'number',
        onPress: handleDeleteSelectedBookshelf,
      },
      {
        key: 'manage-groups',
        label: l('조 관리하기'),
        icon: 'groups',
        disabled: !canManageRegularGroups,
        onPress: handlePressManageRegularGroups,
      },
    ];
  }, [
    canManageClub,
    canManageRegularGroups,
    handleDeleteSelectedBookshelf,
    handleOpenBookshelfEdit,
    handlePressManageRegularGroups,
    l,
    selectedBookshelfBook,
  ]);

  if (isInitialLoading) {
    return (
      <View style={styles.bookshelfTabSkeletonWrap}>
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.bookshelfSessionRow}
          scrollEnabled={false}
        >
          {[0, 1, 2, 3].map((i) => (
            <SkeletonBox key={i} style={styles.bookshelfSessionChipSkeleton} />
          ))}
        </ScrollView>
        <View style={styles.bookshelfGrid}>
          {[0, 1, 2, 3].map((i) => (
            <View key={i} style={styles.bookshelfCard}>
              <SkeletonBox style={styles.bookshelfCover} />
              <SkeletonBox style={styles.bookshelfTabSkeletonTitle} />
              <SkeletonBox style={styles.bookshelfTabSkeletonSub} />
            </View>
          ))}
        </View>
      </View>
    );
  }

  if (!isMember) {
    return (
      <View style={styles.managementEmptyCard}>
        <Text style={styles.managementEmptyText}>
          {l('책장은 독서 모임의 회원이 되신 후 조회 가능합니다.')}
        </Text>
      </View>
    );
  }

  return (
<View
  style={styles.bookshelfSection}
  onLayout={(event) => {
    bookshelfSectionYRef.current = event.nativeEvent.layout.y;
    // 책장 탭 진입 시: GRID 콘텐츠가 레이아웃된 뒤에 스크롤 (즉시 스크롤은 클램프되어 덜 올라감)
    if (bookshelfViewMode !== 'GRID') return;
    if (!bookshelfTabScrollRef.current) return;
    bookshelfTabScrollRef.current = false;
    onScrollToPillNav();
  }}
>
  {bookshelfViewMode === 'GRID' ? (
    <>
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.bookshelfSessionRow}
      >
        {bookshelfSessions.map((session) => {
          const active = selectedBookshelfSession === session;
          return (
            <Pressable
              key={`${group.id}-session-${session}`}
              android_ripple={{ color: 'transparent' }}
              style={({ pressed }) => [
                styles.bookshelfSessionChip,
                active ? styles.bookshelfSessionChipActive : styles.bookshelfSessionChipInactive,
                pressed && styles.pressed,
              ]}
              onPress={() => setSelectedBookshelfSession(session)}
            >
              <Text
                style={[
                  styles.bookshelfSessionText,
                  active && styles.bookshelfSessionTextActive,
                ]}
              >
                {session}
              </Text>
            </Pressable>
          );
        })}
      </ScrollView>
      {visibleBookshelfItems.length === 0 ? (
        <View style={styles.managementEmptyCard}>
          <Text style={styles.managementEmptyText}>{l('등록된 책장이 없습니다.')}</Text>
        </View>
      ) : (
        <View style={styles.bookshelfGrid}>
          {visibleBookshelfItems.map((book) => (
            <Pressable
              key={book.id}
              style={({ pressed }) => [styles.bookshelfCard, pressed && styles.pressed]}
              onPress={() => openBookshelfDetail(book, 'TOPIC')}
            >
              <Image
                source={{ uri: book.coverImage }}
                style={styles.bookshelfCover}
                resizeMode="cover"
              />
              <Text style={styles.bookshelfTitle} numberOfLines={1}>
                {book.title}
              </Text>
              <Text style={styles.bookshelfAuthor} numberOfLines={1}>
                {book.author}
              </Text>
              <View style={styles.bookshelfBadgeRow}>
                <View style={styles.bookshelfSessionBadge}>
                  <Text style={styles.bookshelfBadgeText}>{book.session}</Text>
                </View>
                <View
                  style={[
                    styles.bookshelfCategoryBadge,
                    getBookshelfCategoryBadgeStyle(book.category),
                  ]}
                >
                  <Text style={styles.bookshelfBadgeText}>{l(book.category)}</Text>
                </View>
              </View>
              {[
                { label: '발제', tab: 'TOPIC' as const },
                { label: '한줄평', tab: 'REVIEW' as const },
                { label: '정기모임', tab: 'REGULAR' as const },
              ].map((item) => (
                <Pressable
                  key={`${book.id}-${item.label}`}
                  style={({ pressed }) => [styles.bookshelfLinkRow, pressed && styles.pressed]}
                  onPress={() => openBookshelfDetail(book, item.tab)}
                >
                  <Text style={styles.bookshelfLinkLabel}>{l(item.label)}</Text>
                  <MaterialIcons name="north-east" size={14} color={colors.gray3} />
                </Pressable>
              ))}
              <View style={styles.bookshelfRatingRow}>
                {Array.from({ length: 5 }).map((_, idx) => (
                  <MaterialIcons
                    key={`${book.id}-star-${idx}`}
                    name={getStarIconName(book.rating, idx)}
                    size={16}
                    color={
                      getStarIconName(book.rating, idx) === 'star-border'
                        ? colors.gray2
                        : colors.secondary2
                    }
                  />
                ))}
                <Text style={styles.bookshelfRatingText}>
                  {formatAverageRating(book.rating)}
                </Text>
              </View>
            </Pressable>
          ))}
        </View>
      )}
    </>
  ) : selectedBookshelfBook ? (
    <View
      style={[
        styles.bookshelfDetailSection,
        bookshelfDetailMinHeight ? { minHeight: bookshelfDetailMinHeight } : null,
      ]}
      onLayout={(event) => {
        detailSectionYRef.current = event.nativeEvent.layout.y;
        if (!shouldScrollToBookshelfDetailRef.current) return;
        bookshelfTabScrollRef.current = false;
        shouldScrollToBookshelfDetailRef.current = false;
        scrollToBookshelfDetail();
      }}
    >
      <View style={styles.detailTitleRow}>
        <Pressable
          style={({ pressed }) => [styles.breadcrumbPress, pressed && styles.pressed]}
          onPress={handleBackToBookshelfGrid}
        >
          <MaterialIcons name="chevron-left" size={18} color={colors.gray5} />
          <Text style={styles.breadcrumbText}>{l('책장')}</Text>
        </Pressable>
        {canManageClub ? (
          <Pressable
            style={({ pressed }) => [styles.bookshelfDetailMenuButton, pressed && styles.pressed]}
            onPress={() => setBookshelfMenuVisible(true)}
            hitSlop={8}
          >
            <MaterialIcons name="more-vert" size={22} color={colors.gray5} />
          </Pressable>
        ) : null}
      </View>

      <View style={styles.bookshelfDetailBookCard}>
        <Image
          source={{ uri: selectedBookshelfBook.coverImage }}
          style={styles.bookshelfDetailBookCover}
        />
        <View style={styles.bookshelfDetailBookInfo}>
          <Text style={styles.bookshelfDetailBookTitle}>{selectedBookshelfBook.title}</Text>
          <Text style={styles.bookshelfDetailBookAuthor}>{selectedBookshelfBook.author}</Text>
          <View style={styles.bookshelfBadgeRow}>
            <View style={styles.bookshelfSessionBadge}>
              <Text style={styles.bookshelfBadgeText}>{selectedBookshelfBook.session}</Text>
            </View>
            <View
              style={[
                styles.bookshelfCategoryBadge,
                getBookshelfCategoryBadgeStyle(selectedBookshelfBook.category),
              ]}
            >
              <Text style={styles.bookshelfBadgeText}>{l(selectedBookshelfBook.category)}</Text>
            </View>
          </View>
          <View style={styles.bookshelfRatingRow}>
            {Array.from({ length: 5 }).map((_, idx) => (
              <MaterialIcons
                key={`${selectedBookshelfBook.id}-detail-star-${idx}`}
                name={getStarIconName(selectedBookshelfBook.rating, idx)}
                size={16}
                color={
                  getStarIconName(selectedBookshelfBook.rating, idx) === 'star-border'
                    ? colors.gray2
                    : colors.secondary2
                }
              />
            ))}
            <Text style={styles.bookshelfRatingText}>
              {formatAverageRating(selectedBookshelfBook.rating)}
            </Text>
          </View>
        </View>
      </View>

      {bookshelfDetailLoadState.base === 'idle' ||
      bookshelfDetailLoadState.base === 'loading' ? (
        <View style={styles.detailLoadInlineState} accessibilityRole="progressbar">
          <Text style={styles.detailLoadStateText}>{l('책장 기본 정보를 불러오는 중...')}</Text>
        </View>
      ) : bookshelfDetailLoadState.base === 'error' ? (
        renderDetailLoadError('base', '책장 기본 정보를 불러오지 못했습니다.')
      ) : null}

      <View style={styles.bookshelfDetailTabRow}>
        {[
          { label: '발제', tab: 'TOPIC' as const },
          { label: '한줄평', tab: 'REVIEW' as const },
          { label: '정기모임', tab: 'REGULAR' as const },
        ].map((item) => {
          const active = bookshelfDetailTab === item.tab;
          return (
            <Pressable
              key={`${selectedBookshelfBook.id}-${item.tab}`}
              style={({ pressed }) => [
                styles.bookshelfDetailTabButton,
                active && styles.bookshelfDetailTabButtonActive,
                pressed && styles.pressed,
              ]}
              onPress={() => handleChangeBookshelfTab(item.tab)}
            >
              <Text
                style={[
                  styles.bookshelfDetailTabLabel,
                  active && styles.bookshelfDetailTabLabelActive,
                ]}
              >
                {l(item.label)}
              </Text>
            </Pressable>
          );
        })}
      </View>

      {bookshelfDetailTab === 'TOPIC' ? (
        <View style={styles.bookshelfPanel}>
          <View style={styles.bookshelfPanelHeader}>
            <View style={styles.bookshelfPanelTitleRow}>
              <MaterialIcons name="description" size={22} color={colors.gray6} />
              <Text style={styles.bookshelfPanelTitle}>{l('전체 발제')}</Text>
            </View>
            <Pressable
              style={({ pressed }) => [styles.bookshelfPanelAddButton, pressed && styles.pressed]}
              onPress={() => handleOpenBookshelfComposer('TOPIC')}
            >
              <MaterialIcons name="add" size={20} color={colors.primary1} />
            </Pressable>
          </View>

          <View style={styles.bookshelfPostList}>
            {bookshelfTopicItems.map((item) => (
                <View key={item.id} style={styles.bookshelfPostCard}>
                  <View style={styles.bookshelfPostTop}>
                    <View style={styles.bookshelfPostAuthorRow}>
                      <View style={styles.bookshelfPostAvatar}>
                      {item.authorProfileImageUrl ? (
                        <Image
                          source={{ uri: item.authorProfileImageUrl }}
                          style={styles.bookshelfPostAvatarImage}
                          resizeMode="cover"
                        />
                      ) : (
                        <DefaultProfileAvatar size={16} />
                      )}
                    </View>
                    <Text style={styles.bookshelfPostAuthor}>{item.author}</Text>
                  </View>
                  <Pressable
                    style={({ pressed }) => [
                      styles.bookshelfPostMenuButton,
                      pressed && styles.pressed,
                    ]}
                    onPress={(event) => handlePressBookshelfPostMenu(item, event)}
                  >
                    <MaterialIcons name="more-vert" size={18} color={colors.gray4} />
                  </Pressable>
                </View>
                <Text style={styles.bookshelfPostContent}>{item.content}</Text>
              </View>
            ))}
            {showBookshelfTopicLoading ? (
              <View style={styles.managementEmptyCard}>
                <Text style={styles.managementEmptyText}>{l('발제를 불러오는 중...')}</Text>
              </View>
            ) : null}
            {bookshelfDetailLoadState.topic === 'error'
              ? renderDetailLoadError('topic', '발제를 불러오지 못했습니다.')
              : null}
            {bookshelfDetailLoadState.topic === 'success' &&
            bookshelfTopicItems.length === 0 ? (
              <View style={styles.managementEmptyCard}>
                <Text style={styles.managementEmptyText}>{l('등록된 발제가 없습니다.')}</Text>
              </View>
            ) : null}
            {currentBookshelfTopicPageState?.loadingMore ? (
              <Text style={styles.infiniteScrollLoadingText}>{l('불러오는 중...')}</Text>
            ) : null}
          </View>
        </View>
      ) : null}

      {bookshelfDetailTab === 'REVIEW' ? (
        <View style={styles.bookshelfPanel}>
          <View style={styles.bookshelfPanelHeader}>
            <View style={styles.bookshelfPanelTitleRow}>
              <MaterialIcons name="star-border" size={22} color={colors.gray6} />
              <Text style={styles.bookshelfPanelTitle}>{l('한줄평')}</Text>
            </View>
            <Pressable
              style={({ pressed }) => [styles.bookshelfPanelAddButton, pressed && styles.pressed]}
              onPress={() => handleOpenBookshelfComposer('REVIEW')}
            >
              <MaterialIcons name="add" size={20} color={colors.primary1} />
            </Pressable>
          </View>

	                  <View style={styles.bookshelfPostList}>
	                    {bookshelfReviewItems.map((item) => (
	                      <View key={item.id} style={styles.bookshelfPostCard}>
	                        <View style={styles.bookshelfPostTop}>
	                          <View style={styles.bookshelfPostAuthorRow}>
	                            <View style={styles.bookshelfPostAvatar}>
	                              {item.authorProfileImageUrl ? (
	                                <Image
	                                  source={{ uri: item.authorProfileImageUrl }}
	                                  style={styles.bookshelfPostAvatarImage}
	                                  resizeMode="cover"
	                                />
	                              ) : (
	                                <DefaultProfileAvatar size={16} />
	                              )}
	                            </View>
	                            <Text style={styles.bookshelfPostAuthor}>{item.author}</Text>
	                          </View>
	                          <Pressable
	                            style={({ pressed }) => [
	                              styles.bookshelfPostMenuButton,
	                              pressed && styles.pressed,
	                            ]}
	                            onPress={(event) => handlePressBookshelfPostMenu(item, event)}
	                          >
	                            <MaterialIcons name="more-vert" size={18} color={colors.gray4} />
	                          </Pressable>
	                        </View>
	                        <View style={styles.bookshelfPostRatingRow}>
	                          {Array.from({ length: 5 }).map((_, idx) => (
	                            <MaterialIcons
	                              key={`${item.id}-review-star-${idx}`}
                      name={getStarIconName(item.rating ?? 0, idx)}
                      size={16}
                      color={
                        getStarIconName(item.rating ?? 0, idx) === 'star-border'
                          ? colors.gray2
                          : colors.secondary2
	                              }
	                            />
	                          ))}
	                        </View>
	                        <Text style={styles.bookshelfPostContent}>{item.content}</Text>
	                      </View>
	                    ))}
            {showBookshelfReviewLoading ? (
              <View style={styles.managementEmptyCard}>
                <Text style={styles.managementEmptyText}>{l('한줄평을 불러오는 중...')}</Text>
              </View>
            ) : null}
            {bookshelfDetailLoadState.review === 'error'
              ? renderDetailLoadError('review', '한줄평을 불러오지 못했습니다.')
              : null}
            {bookshelfDetailLoadState.review === 'success' &&
            bookshelfReviewItems.length === 0 ? (
              <View style={styles.managementEmptyCard}>
                <Text style={styles.managementEmptyText}>{l('등록된 한줄평이 없습니다.')}</Text>
              </View>
            ) : null}
          </View>
        </View>
      ) : null}

      {bookshelfDetailTab === 'REGULAR' ? (
        <View style={styles.bookshelfPanel}>
          {bookshelfDetailLoadState.regular === 'error'
            ? renderDetailLoadError('regular', '정기모임 정보를 불러오지 못했습니다.')
            : null}
          {showRegularMeetingLoading ? (
            <View style={styles.managementEmptyCard}>
              <Text style={styles.managementEmptyText}>{l('정기모임 정보를 불러오는 중...')}</Text>
            </View>
          ) : regularMeetingInfo ? (
            <>
              <View style={styles.bookshelfRegularSummaryCard}>
                <View style={styles.bookshelfRegularSummaryTitleRow}>
                  <View style={styles.bookshelfRegularSummaryTitleIconWrap}>
                    <MaterialIcons name="groups" size={24} color={colors.gray6} />
                  </View>
                  <Text
                    style={styles.bookshelfRegularSummaryTitle}
                    numberOfLines={2}
                    ellipsizeMode="tail"
                    lineBreakStrategyIOS="hangul-word"
                    textBreakStrategy="balanced"
                  >
                    {regularMeetingInfo.name}
                  </Text>
                </View>
                <View style={styles.bookshelfRegularSummaryMetaRow}>
                  <MaterialIcons name="event" size={18} color={colors.gray4} />
                  <Text style={styles.bookshelfRegularSummaryMetaText}>
                    {regularMeetingInfo.date}
                  </Text>
                </View>
                <View style={styles.bookshelfRegularSummaryMetaRow}>
                  <MaterialIcons name="place" size={18} color={colors.gray4} />
                  <Text style={styles.bookshelfRegularSummaryMetaText}>
                    {regularMeetingInfo.location}
                  </Text>
                </View>
              </View>

              {regularMeetingInfo.groups.length > 0 ? (
                <ScrollView
                  horizontal
                  showsHorizontalScrollIndicator={false}
                  contentContainerStyle={styles.bookshelfGroupChipRow}
                >
                  {regularMeetingInfo.groups.map((groupItem) => {
                    const active = selectedRegularGroupId === groupItem.id;
                    return (
                      <Pressable
                        key={groupItem.id}
                        style={({ pressed }) => [
                          styles.bookshelfGroupChip,
                          active && styles.bookshelfGroupChipActive,
                          pressed && styles.pressed,
                        ]}
                        onPress={() => handleSelectRegularGroup(groupItem.id)}
                      >
                        <Text
                          style={[
                            styles.bookshelfGroupChipText,
                            active && styles.bookshelfGroupChipTextActive,
                          ]}
                        >
                          {l(groupItem.label)}
                        </Text>
                      </Pressable>
                    );
                  })}
                </ScrollView>
              ) : bookshelfDetailLoadState.regular === 'success' ? (
                <View style={styles.managementEmptyCard}>
                  <Text style={styles.managementEmptyText}>{l('등록된 조 정보가 없습니다.')}</Text>
                </View>
              ) : null}

              {selectedRegularGroup ? (
                <View style={styles.bookshelfGroupSection}>
                  <View style={styles.bookshelfGroupHeader}>
                    <View style={styles.bookshelfGroupHeaderLeft}>
                      <Text style={styles.bookshelfGroupTitle}>{l(selectedRegularGroup.label)}</Text>
                      <View style={styles.bookshelfGroupMemberWrap}>
                        <View
                          ref={regularGroupMemberButtonRef}
                          collapsable={false}
                        >
                          <Pressable
                            style={({ pressed }) => [
                              styles.bookshelfGroupMemberButton,
                              pressed && styles.pressed,
                            ]}
                            onPress={handlePressRegularGroupMembers}
                          >
                            <MaterialIcons name="person" size={20} color={colors.gray4} />
                            <Text style={styles.bookshelfGroupMemberCount}>
                              {selectedRegularGroup.memberCount}
                            </Text>
                            <MaterialIcons
                              name={
                                regularGroupMembersVisible
                                  ? 'keyboard-arrow-up'
                                  : 'keyboard-arrow-down'
                              }
                              size={18}
                              color={colors.gray4}
                            />
                          </Pressable>
                        </View>
                      </View>
                    </View>
                    <View style={styles.bookshelfGroupActionRow}>
                      <Pressable
                        style={({ pressed }) => [
                          styles.bookshelfGroupActionButton,
                          pressed && styles.pressed,
                        ]}
                        onPress={() => handleOpenBookshelfComposer('TOPIC')}
                      >
                        <MaterialIcons name="edit" size={18} color={colors.gray4} />
                        <Text style={styles.bookshelfGroupSortText}>{l('발제')}</Text>
                      </Pressable>
                      <Pressable
                        style={({ pressed }) => [
                          styles.bookshelfGroupActionButton,
                          pressed && styles.pressed,
                        ]}
                        onPress={() => handleSortRegularGroupPosts(selectedRegularGroup.id)}
                      >
                        <MaterialIcons name="sort" size={18} color={colors.gray4} />
                        <Text style={styles.bookshelfGroupSortText}>{l('정렬하기')}</Text>
                      </Pressable>
                    </View>
                  </View>

                  <Modal
                    visible={
                      regularGroupMembersVisible &&
                      regularGroupMemberDropdownAnchor !== null
                    }
                    transparent
                    animationType="fade"
                    onRequestClose={closeRegularGroupMembers}
                  >
                    <Pressable
                      style={styles.bookshelfGroupMemberModalBackdrop}
                      onPress={closeRegularGroupMembers}
                      disableFeedback
                    >
                      {regularGroupMemberDropdownAnchor ? (
                        <Pressable
                          style={[
                            styles.bookshelfGroupMemberDropdown,
                            regularGroupMemberDropdownAnchor,
                          ]}
                          onPress={(event) => event.stopPropagation()}
                          disableFeedback
                        >
                          <Text style={styles.bookshelfGroupMemberDropdownTitle}>
                            {l('{group} 참여자', { group: l(selectedRegularGroup.label) })}
                          </Text>
                          <View style={styles.bookshelfRegularGroupMemberList}>
                            {selectedRegularGroup.members.map((member) => (
                              <View
                                key={`${member.id}-dropdown`}
                                style={styles.bookshelfRegularGroupMemberRow}
                              >
                                <View style={styles.bookshelfPostAvatar}>
                                  {member.profileImageUrl ? (
                                    <Image
                                      source={{ uri: member.profileImageUrl }}
                                      style={styles.bookshelfPostAvatarImage}
                                      resizeMode="cover"
                                    />
                                  ) : (
                                    <DefaultProfileAvatar size={16} />
                                  )}
                                </View>
                                <Text style={styles.bookshelfRegularGroupMemberName}>
                                  {member.nickname}
                                </Text>
                              </View>
                            ))}
                          </View>
                        </Pressable>
                      ) : null}
                    </Pressable>
                  </Modal>

                  <View style={styles.bookshelfGroupPostList}>
                    {selectedRegularGroup.posts.map((post) => {
                      const isPending = regularGroupPendingPostKeys.has(
                        `${selectedRegularGroup.id}:${post.id}`,
                      );
                      return (
                        <Pressable
                          key={post.id}
                          disabled={isPending}
                          style={({ pressed }) => [
                            styles.bookshelfGroupPostCard,
                            post.completed && styles.bookshelfGroupPostCardCompleted,
                            isPending && styles.bookshelfGroupPostCardPending,
                            pressed && styles.pressed,
                          ]}
                          onPress={() => handleToggleRegularGroupPost(selectedRegularGroup.id, post.id)}
                        >
                          <View style={styles.bookshelfPostTop}>
                            <View style={styles.bookshelfPostAuthorRow}>
                              <View style={styles.bookshelfPostAvatar}>
                                {post.authorProfileImageUrl ? (
                                  <Image
                                    source={{ uri: post.authorProfileImageUrl }}
                                    style={styles.bookshelfPostAvatarImage}
                                    resizeMode="cover"
                                  />
                                ) : (
                                  <DefaultProfileAvatar size={16} />
                                )}
                              </View>
                              <Text style={styles.bookshelfPostAuthor}>{post.author}</Text>
                            </View>
                            <MaterialIcons
                              name="check"
                              size={28}
                              color={post.completed ? '#3FBE78' : colors.gray2}
                            />
                          </View>
                          <Text style={styles.bookshelfPostContent}>{post.content}</Text>
                        </Pressable>
                      );
                    })}
                    {selectedRegularGroup.posts.length === 0 ? (
                      <View style={styles.managementEmptyCard}>
                        <Text style={styles.managementEmptyText}>{l('등록된 조 발제가 없습니다.')}</Text>
                      </View>
                    ) : null}
                  </View>
                </View>
              ) : null}
            </>
          ) : bookshelfDetailLoadState.regular === 'success' ? (
            <View style={styles.managementEmptyCard}>
              <Text style={styles.managementEmptyText}>{l('정기모임 정보가 없습니다.')}</Text>
            </View>
          ) : null}
        </View>
      ) : null}

      <BottomSheetActionMenu
        visible={bookshelfMenuVisible}
        title={l('책장 메뉴')}
        actions={bookshelfMenuItems}
        onClose={() => setBookshelfMenuVisible(false)}
      />
    </View>
  ) : null}
</View>
  );
}
