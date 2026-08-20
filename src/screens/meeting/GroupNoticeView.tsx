import { useCallback, useMemo, useRef } from 'react';
import { SkeletonBox } from '../../components/common/SkeletonBox';
import { Image, Text, TextInput, View } from 'react-native';
import type { GestureResponderEvent } from 'react-native';
import type { NavigationProp, ParamListBase } from '@react-navigation/native';
import { MaterialIcons } from '@expo/vector-icons';
import { colors } from '../../theme';
import { DefaultProfileAvatar } from '../../components/common/DefaultProfileAvatar';
import { FeedbackPressable as Pressable } from '../../components/common/FeedbackPressable';
import { FormTextInput } from '../../components/common/FormTextInput';
import { ImageAttachmentPicker } from '../../components/common/ImageAttachmentPicker';
import { ImageGallery } from '../../components/common/ImageGallery';
import type { ImageAttachmentsController } from '../../hooks/useImageAttachments';
import { INPUT_LIMITS } from '../../constants/inputLimits';
import { styles } from './meetingStyles';
import {
  formatAverageRating,
  getStarIconName,
} from './helpers';
import type {
  AsyncLoadStatus,
  CursorPageState,
  NoticeComment,
  NoticeItem,
  NoticePollOption,
} from './types';
import { useLanguage } from '../../contexts/LanguageContext';

const NOTICE_PAGE_SIZE = 8;

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

function renderNoticeTag(tag: NoticeItem['tags'][number], key: string, l: (text: string) => string) {
  if (tag === 'PIN') {
    return (
      <View key={key} style={[styles.noticeTag, styles.noticeTagPin]}>
        <MaterialIcons name="push-pin" size={12} color={colors.white} />
      </View>
    );
  }
  if (tag === 'VOTE') {
    return (
      <View key={key} style={[styles.noticeTag, styles.noticeTagVote]}>
        <Text style={styles.noticeTagText}>{l('투표')}</Text>
      </View>
    );
  }
  if (tag === 'MEETING') {
    return (
      <View key={key} style={[styles.noticeTag, styles.noticeTagMeeting]}>
        <Text style={styles.noticeTagText}>{l('모임')}</Text>
      </View>
    );
  }
  return (
    <View key={key} style={[styles.noticeTag, styles.noticeTagGeneral]}>
      <Text style={styles.noticeTagText}>{l('일반')}</Text>
    </View>
  );
}

export type GroupNoticeViewProps = {
  isMember: boolean;
  isInitialLoading?: boolean;
  navigation: NavigationProp<ParamListBase>;
  // Raw notice state
  noticeItems: NoticeItem[];
  noticePage: number;
  selectedNoticeId: string | null;
  noticeCommentInput: string;
  submittingNoticeComment: boolean;
  noticeCommentAttachments: ImageAttachmentsController;
  editingNoticeCommentId: string | null;
  noticeCommentsById: Record<string, NoticeComment[]>;
  noticeDetailLoadStateById: Record<string, AsyncLoadStatus>;
  noticeCommentLoadStateById: Record<string, AsyncLoadStatus>;
  noticeCommentPageStateByNoticeId: Record<string, CursorPageState>;
  noticePollOptionsById: Record<string, NoticePollOption[]>;
  selectedVoteOptionIdsByNotice: Record<string, string[]>;
  submittedVoteOptionIdsByNotice: Record<string, string[]>;
  voteEditEnabledByNotice: Record<string, boolean>;
  // Setters
  setSelectedNoticeId: (id: string | null) => void;
  setNoticeCommentInput: (input: string) => void;
  setEditingNoticeCommentId: (id: string | null) => void;
  setNoticeMenuVisible: (visible: boolean) => void;
  setNoticePage: React.Dispatch<React.SetStateAction<number>>;
  setPhotoViewer: (viewer: { photos: string[]; index: number } | null) => void;
  // Handlers
  handleOpenNoticeBookshelf: () => void;
  handleToggleVoteOption: (optionId: string) => void;
  handleOpenVoteVoters: (optionId: string) => void;
  handleSubmitVote: () => void;
  handleSubmitNoticeComment: () => void;
  handleCancelNoticeCommentEdit: () => void;
  handlePressCommentMenu: (comment: NoticeComment, event: GestureResponderEvent) => void;
  retryNoticeDetail: () => void;
  retryNoticeComments: () => void;
  onCommentInputMeasured?: (inputY: number, inputHeight: number) => void;
};

export function GroupNoticeView({
  isMember,
  isInitialLoading = false,
  navigation,
  noticeItems,
  noticePage,
  selectedNoticeId,
  noticeCommentInput,
  submittingNoticeComment,
  noticeCommentAttachments,
  editingNoticeCommentId,
  noticeCommentsById,
  noticeDetailLoadStateById,
  noticeCommentLoadStateById,
  noticeCommentPageStateByNoticeId,
  noticePollOptionsById,
  selectedVoteOptionIdsByNotice,
  submittedVoteOptionIdsByNotice,
  voteEditEnabledByNotice,
  setSelectedNoticeId,
  setNoticeCommentInput,
  setEditingNoticeCommentId,
  setNoticeMenuVisible,
  setNoticePage,
  setPhotoViewer,
  handleOpenNoticeBookshelf,
  handleToggleVoteOption,
  handleOpenVoteVoters,
  handleSubmitVote,
  handleSubmitNoticeComment,
  handleCancelNoticeCommentEdit,
  handlePressCommentMenu,
  retryNoticeDetail,
  retryNoticeComments,
  onCommentInputMeasured,
}: GroupNoticeViewProps) {
  const { l } = useLanguage();
  const noticeCommentInputRef = useRef<TextInput>(null);
  const selectedNotice = useMemo(
    () => noticeItems.find((item) => item.id === selectedNoticeId) ?? null,
    [noticeItems, selectedNoticeId],
  );

  const currentNoticeComments = useMemo(() => {
    if (!selectedNotice) return [];
    return noticeCommentsById[selectedNotice.id] ?? [];
  }, [noticeCommentsById, selectedNotice]);

  const currentNoticeCommentPageState = useMemo<CursorPageState | null>(() => {
    if (!selectedNotice) return null;
    return noticeCommentPageStateByNoticeId[selectedNotice.id] ?? null;
  }, [noticeCommentPageStateByNoticeId, selectedNotice]);

  const currentNoticeDetailLoadStatus = useMemo<AsyncLoadStatus>(() => {
    if (!selectedNotice) return 'idle';
    return (
      noticeDetailLoadStateById[selectedNotice.id] ??
      (selectedNotice.content.trim().length > 0 ? 'success' : 'idle')
    );
  }, [noticeDetailLoadStateById, selectedNotice]);

  const currentNoticeCommentLoadStatus = useMemo<AsyncLoadStatus>(() => {
    if (!selectedNotice) return 'idle';
    return (
      noticeCommentLoadStateById[selectedNotice.id] ??
      (Object.prototype.hasOwnProperty.call(noticeCommentsById, selectedNotice.id)
        ? 'success'
        : 'idle')
    );
  }, [noticeCommentLoadStateById, noticeCommentsById, selectedNotice]);

  const currentNoticePollOptions = useMemo(() => {
    if (!selectedNotice?.poll) return [];
    return noticePollOptionsById[selectedNotice.id] ?? selectedNotice.poll.options;
  }, [noticePollOptionsById, selectedNotice]);

  const measureNoticeCommentInput = useCallback(() => {
    if (!onCommentInputMeasured) return;

    requestAnimationFrame(() => {
      noticeCommentInputRef.current?.measureInWindow((_x, inputY, _width, inputHeight) => {
        onCommentInputMeasured(inputY, inputHeight);
      });
    });
  }, [onCommentInputMeasured]);

  const handleNoticeCommentInputFocus = useCallback(() => {
    measureNoticeCommentInput();
    setTimeout(measureNoticeCommentInput, 120);
    setTimeout(measureNoticeCommentInput, 300);
  }, [measureNoticeCommentInput]);

  const currentSelectedVoteOptionIds = useMemo(() => {
    if (!selectedNotice) return [];
    return selectedVoteOptionIdsByNotice[selectedNotice.id] ?? [];
  }, [selectedNotice, selectedVoteOptionIdsByNotice]);

  const hasSubmittedVoteInNotice = useMemo(() => {
    if (!selectedNotice) return false;
    return (submittedVoteOptionIdsByNotice[selectedNotice.id] ?? []).length > 0;
  }, [selectedNotice, submittedVoteOptionIdsByNotice]);

  const voteEditEnabled = useMemo(() => {
    if (!selectedNotice) return false;
    return Boolean(voteEditEnabledByNotice[selectedNotice.id]);
  }, [selectedNotice, voteEditEnabledByNotice]);

  const totalNoticePages = Math.max(1, Math.ceil(noticeItems.length / NOTICE_PAGE_SIZE));
  const currentNoticePage = Math.min(noticePage, totalNoticePages);

  const visibleNotices = useMemo(() => {
    const start = (currentNoticePage - 1) * NOTICE_PAGE_SIZE;
    const end = start + NOTICE_PAGE_SIZE;
    return noticeItems.slice(start, end);
  }, [currentNoticePage, noticeItems]);

  const visiblePageNumbers = useMemo(() => {
    const pageWindow = 5;
    const half = Math.floor(pageWindow / 2);
    let start = Math.max(1, currentNoticePage - half);
    let end = Math.min(totalNoticePages, start + pageWindow - 1);
    start = Math.max(1, end - pageWindow + 1);
    return Array.from({ length: end - start + 1 }).map((_, idx) => start + idx);
  }, [currentNoticePage, totalNoticePages]);

  if (!isMember) {
    return (
      <View style={styles.managementEmptyCard}>
        <Text style={styles.managementEmptyText}>
          {l('공지사항은 독서 모임의 회원이 되신 후 조회 가능합니다.')}
        </Text>
      </View>
    );
  }

  if (selectedNotice) {
    return (
      <View style={styles.noticeDetailCard}>
        <Pressable
          style={({ pressed }) => [styles.breadcrumbPress, pressed && styles.pressed]}
          onPress={() => {
            setSelectedNoticeId(null);
            setNoticeCommentInput('');
            setEditingNoticeCommentId(null);
          }}
        >
          <MaterialIcons name="chevron-left" size={18} color={colors.gray5} />
          <Text style={styles.breadcrumbText}>{l('공지사항')}</Text>
        </Pressable>

        <View style={styles.noticeDetailTopRow}>
          <View style={styles.noticeDetailCategoryRow}>
            <View style={styles.noticeTagRow}>
              {selectedNotice.tags.map((tag, index) =>
                renderNoticeTag(tag, `${selectedNotice.id}-${tag}-${index}`, l),
              )}
            </View>
            <Text style={styles.noticeDetailDate}>{selectedNotice.date}</Text>
          </View>
          <Pressable
            style={({ pressed }) => [styles.noticeDetailMenuButton, pressed && styles.pressed]}
            onPress={() => setNoticeMenuVisible(true)}
          >
            <MaterialIcons name="more-vert" size={18} color={colors.gray5} />
          </Pressable>
        </View>
        <Text style={styles.noticeDetailTitle}>{selectedNotice.title}</Text>
        {selectedNotice.content.trim().length > 0 || currentNoticeDetailLoadStatus === 'success' ? (
          <Text style={styles.noticeDetailBody}>{selectedNotice.content}</Text>
        ) : currentNoticeDetailLoadStatus === 'error' ? (
          <View style={styles.detailLoadStateCard}>
            <Text style={styles.detailLoadStateText}>{l('공지 내용을 불러오지 못했습니다.')}</Text>
            <Pressable
              style={({ pressed }) => [styles.detailLoadRetryButton, pressed && styles.pressed]}
              onPress={retryNoticeDetail}
              accessibilityRole="button"
              accessibilityLabel={l('다시 시도')}
            >
              <MaterialIcons name="refresh" size={18} color={colors.primary1} />
              <Text style={styles.detailLoadRetryText}>{l('다시 시도')}</Text>
            </Pressable>
          </View>
        ) : (
          <View style={styles.noticeDetailBodySkeleton} accessibilityRole="progressbar">
            {[0, 1, 2, 3].map((item) => (
              <SkeletonBox
                key={`notice-detail-body-${item}`}
                style={{ width: item === 3 ? '72%' : '100%', height: 14, borderRadius: 4 }}
              />
            ))}
          </View>
        )}
        {selectedNotice.bookshelf ? (
          <Pressable
            style={({ pressed }) => [styles.noticeAttachmentCard, pressed && styles.pressed]}
            onPress={handleOpenNoticeBookshelf}
          >
            <Text style={styles.noticeAttachmentTitle}>{l('책장')}</Text>
            <View style={styles.noticeBookshelfCard}>
              <Image
                source={{ uri: selectedNotice.bookshelf.coverImage }}
                style={styles.noticeBookshelfCover}
                resizeMode="cover"
              />
              <View style={styles.noticeBookshelfInfo}>
                <Text style={styles.noticeBookshelfTitle}>{selectedNotice.bookshelf.title}</Text>
                <Text style={styles.noticeBookshelfAuthor}>{selectedNotice.bookshelf.author}</Text>
                <View style={styles.bookshelfBadgeRow}>
                  <View style={styles.bookshelfSessionBadge}>
                    <Text style={styles.bookshelfBadgeText}>{selectedNotice.bookshelf.session}</Text>
                  </View>
                  <View
                    style={[
                      styles.bookshelfCategoryBadge,
                      getBookshelfCategoryBadgeStyle(selectedNotice.bookshelf.category),
                    ]}
                  >
                    <Text style={styles.bookshelfBadgeText}>
                      {l(selectedNotice.bookshelf.category)}
                    </Text>
                  </View>
                </View>
                <View style={styles.bookshelfRatingRow}>
                  {Array.from({ length: 5 }).map((_, idx) => (
                    <MaterialIcons
                      key={`${selectedNotice.id}-bookshelf-star-${idx}`}
                      name={getStarIconName(selectedNotice.bookshelf?.rating ?? 0, idx)}
                      size={14}
                      color={
                        getStarIconName(selectedNotice.bookshelf?.rating ?? 0, idx) === 'star-border'
                          ? colors.gray2
                          : colors.secondary2
                      }
                    />
                  ))}
                  <Text style={styles.bookshelfRatingText}>
                    {formatAverageRating(selectedNotice.bookshelf.rating)}
                  </Text>
                </View>
              </View>
            </View>
          </Pressable>
        ) : null}
        {selectedNotice.poll ? (
          <View style={styles.noticePollSection}>
            <View style={styles.noticePollMetaRow}>
              <View style={styles.noticePollSchedule}>
                <Text style={styles.noticeAttachmentTitle}>{l('투표')}</Text>
              </View>
              <View style={styles.noticePollMetaRight}>
                <Text style={styles.noticePollMetaText}>
                  {selectedNotice.poll.allowDuplicate ? l('중복 가능') : l('중복 불가')}
                </Text>
                <View style={styles.noticePollMetaPrivacy}>
                  <MaterialIcons
                    name={selectedNotice.poll.anonymous ? 'lock-outline' : 'person-outline'}
                    size={14}
                    color={colors.gray4}
                  />
                  <Text style={styles.noticePollMetaText}>
                    {selectedNotice.poll.anonymous ? l('익명') : l('실명')}
                  </Text>
                </View>
              </View>
            </View>
            <Text style={styles.noticePollEndText} numberOfLines={1}>
              {selectedNotice.poll.startsAt} - {selectedNotice.poll.endsAt}
            </Text>

            <View style={styles.noticePollOptionList}>
              {currentNoticePollOptions.map((option) => {
                const selected = currentSelectedVoteOptionIds.includes(option.id);
                const voteCount = option.voters.length;
                const isPollExpired =
                  !selectedNotice.poll?.closed &&
                  selectedNotice.poll?.endsAtMillis != null &&
                  Date.now() > selectedNotice.poll.endsAtMillis;
                const pollEnded = Boolean(selectedNotice.poll?.closed) || isPollExpired;
                const voteOptionLocked = pollEnded || (hasSubmittedVoteInNotice && !voteEditEnabled);
                return (
                  <Pressable
                    key={option.id}
                    style={({ pressed }) => [
                      styles.noticePollOptionRow,
                      selected && styles.noticePollOptionRowSelected,
                      voteOptionLocked && styles.noticePollOptionRowDisabled,
                      pressed && styles.pressed,
                    ]}
                    disabled={voteOptionLocked}
                    onPress={() => handleToggleVoteOption(option.id)}
                  >
                    <View style={styles.noticePollOptionLeft}>
                      <MaterialIcons
                        name={selected ? 'check-circle' : 'radio-button-unchecked'}
                        size={18}
                        color={selected ? colors.primary1 : colors.gray4}
                      />
                      <Text style={styles.noticePollOptionText} numberOfLines={1}>
                        {option.label}
                      </Text>
                    </View>
                    <Pressable
                      style={styles.noticePollOptionCount}
                      onPress={(event) => {
                        event.stopPropagation();
                        handleOpenVoteVoters(option.id);
                      }}
                    >
                      <MaterialIcons name="person-outline" size={16} color={colors.gray4} />
                      <Text style={styles.noticePollOptionCountText}>{voteCount}</Text>
                    </Pressable>
                  </Pressable>
                );
              })}
            </View>

            {(() => {
              const isPollExpired =
                !selectedNotice.poll?.closed &&
                selectedNotice.poll?.endsAtMillis != null &&
                Date.now() > selectedNotice.poll.endsAtMillis;
              const pollEnded = Boolean(selectedNotice.poll?.closed) || isPollExpired;
              const noOptionSelected =
                !(hasSubmittedVoteInNotice && !voteEditEnabled) &&
                currentSelectedVoteOptionIds.length === 0;
              return (
                <Pressable
                  style={({ pressed }) => [
                    styles.noticePollSubmitButton,
                    (pollEnded || noOptionSelected) && styles.noticePollSubmitButtonDisabled,
                    pressed && styles.pressed,
                  ]}
                  disabled={pollEnded || noOptionSelected}
                  onPress={handleSubmitVote}
                >
                  <Text style={styles.noticePollSubmitText}>
                    {pollEnded
                      ? l('투표종료')
                      : hasSubmittedVoteInNotice && !voteEditEnabled
                        ? l('다시 투표')
                        : l('투표하기')}
                  </Text>
                </Pressable>
              );
            })()}
          </View>
        ) : null}
        {selectedNotice.photos && selectedNotice.photos.length > 0 ? (
          <View style={styles.noticeAttachmentCard}>
            <Text style={styles.noticeAttachmentTitle}>{l('사진')}</Text>
            <View style={styles.noticePhotoGrid}>
              {selectedNotice.photos.map((photo, index) => (
                <Pressable
                  key={`${selectedNotice.id}-photo-${photo}-${index}`}
                  style={({ pressed }) => [styles.noticePhotoItem, pressed && styles.pressed]}
                  onPress={() => setPhotoViewer({ photos: selectedNotice.photos!, index })}
                >
                  <Image
                    source={{ uri: photo }}
                    style={styles.noticePhotoImage}
                    resizeMode="cover"
                  />
                </Pressable>
              ))}
            </View>
          </View>
        ) : null}
        <View style={styles.noticeDetailDivider} />

        <View style={styles.noticeCommentSection}>
          <Text style={styles.noticeCommentHeader}>{l('댓글')}</Text>
          <View style={styles.noticeCommentInputRow}>
            <FormTextInput
              ref={noticeCommentInputRef}
              value={noticeCommentInput}
              onChangeText={setNoticeCommentInput}
              placeholder={l('댓글 내용 (최대 {limit}자)', {
                limit: INPUT_LIMITS.NOTICE_COMMENT,
              })}
              placeholderTextColor={colors.gray3}
              style={styles.noticeCommentInput}
              editable={!submittingNoticeComment}
              maxLength={INPUT_LIMITS.NOTICE_COMMENT}
              overLimitMessage={l('공지사항 댓글은 {limit}자 이하여야 합니다.', {
                limit: INPUT_LIMITS.NOTICE_COMMENT,
              })}
              onFocus={handleNoticeCommentInputFocus}
            />
            <Pressable
              style={({ pressed }) => [
                styles.primaryButton,
                styles.noticeCommentSubmit,
                (submittingNoticeComment || noticeCommentInput.trim().length === 0) &&
                  styles.primaryButtonDisabled,
                pressed && styles.pressed,
              ]}
              onPress={handleSubmitNoticeComment}
              disabled={submittingNoticeComment || noticeCommentInput.trim().length === 0}
            >
              <Text style={styles.noticeCommentSubmitText}>
                {submittingNoticeComment ? l('처리 중') : editingNoticeCommentId ? l('수정') : l('등록')}
              </Text>
            </Pressable>
          </View>
          <ImageAttachmentPicker
            controller={noticeCommentAttachments}
            compact
            disabled={submittingNoticeComment}
          />
          {editingNoticeCommentId ? (
            <Pressable
              style={({ pressed }) => [styles.breadcrumbPress, pressed && styles.pressed]}
              onPress={handleCancelNoticeCommentEdit}
            >
              <Text style={styles.breadcrumbText}>{l('댓글 수정 취소')}</Text>
            </Pressable>
          ) : null}

          <View style={styles.noticeCommentList}>
            {currentNoticeComments.map((comment) => (
              <View key={comment.id} style={styles.noticeCommentItem}>
                <Pressable
                  style={({ pressed }) => [styles.noticeCommentAvatar, pressed && styles.pressed]}
                  onPress={() =>
                    navigation.navigate('UserProfile', {
                      memberNickname: comment.author,
                      fromScreen: 'Meeting',
                    })
                  }
                >
                  {comment.authorProfileImageUrl ? (
                    <Image
                      source={{ uri: comment.authorProfileImageUrl }}
                      style={styles.noticeCommentAvatarImage}
                      resizeMode="cover"
                    />
                  ) : (
                    <DefaultProfileAvatar size={20} />
                  )}
                </Pressable>
                <View style={styles.noticeCommentBody}>
                  <View style={styles.noticeCommentMetaRow}>
                    <View style={styles.noticeCommentAuthorRow}>
                      <Pressable
                        onPress={() =>
                          navigation.navigate('UserProfile', {
                            memberNickname: comment.author,
                            fromScreen: 'Meeting',
                          })
                        }
                      >
                        <Text style={styles.noticeCommentAuthor}>{comment.author}</Text>
                      </Pressable>
                      {comment.isAuthor ? (
                        <View style={styles.noticeCommentAuthorBadge}>
                          <Text style={styles.noticeCommentAuthorBadgeText}>{l('작성자')}</Text>
                        </View>
                      ) : null}
                      <Text style={styles.noticeCommentDate}>{comment.date}</Text>
                    </View>
                    <Pressable
                      style={({ pressed }) => [
                        styles.noticeCommentMenuButton,
                        pressed && styles.pressed,
                      ]}
                      onPress={(event) => handlePressCommentMenu(comment, event)}
                    >
                      <MaterialIcons name="more-vert" size={16} color={colors.gray4} />
                    </Pressable>
                  </View>
                  <Text style={styles.noticeCommentText}>{comment.content}</Text>
                  <ImageGallery
                    imageUrls={comment.imageUrls}
                    compact
                    onPressImage={(index) =>
                      setPhotoViewer({ photos: comment.imageUrls, index })
                    }
                  />
                </View>
              </View>
            ))}
            {(currentNoticeCommentLoadStatus === 'idle' ||
              currentNoticeCommentLoadStatus === 'loading') &&
            currentNoticeComments.length === 0 ? (
              <View style={styles.detailLoadStateCard} accessibilityRole="progressbar">
                <Text style={styles.detailLoadStateText}>{l('댓글을 불러오는 중...')}</Text>
              </View>
            ) : null}
            {currentNoticeCommentLoadStatus === 'error' ? (
              <View style={styles.detailLoadStateCard}>
                <Text style={styles.detailLoadStateText}>{l('댓글을 불러오지 못했습니다.')}</Text>
                <Pressable
                  style={({ pressed }) => [styles.detailLoadRetryButton, pressed && styles.pressed]}
                  onPress={retryNoticeComments}
                  accessibilityRole="button"
                  accessibilityLabel={l('다시 시도')}
                >
                  <MaterialIcons name="refresh" size={18} color={colors.primary1} />
                  <Text style={styles.detailLoadRetryText}>{l('다시 시도')}</Text>
                </Pressable>
              </View>
            ) : null}
            {currentNoticeCommentLoadStatus === 'success' && currentNoticeComments.length === 0 ? (
              <View style={styles.managementEmptyCard}>
                <Text style={styles.managementEmptyText}>{l('등록된 댓글이 없습니다.')}</Text>
              </View>
            ) : null}
            {currentNoticeCommentPageState?.loadingMore ? (
              <Text style={styles.infiniteScrollLoadingText}>{l('불러오는 중...')}</Text>
            ) : null}
          </View>
        </View>
      </View>
    );
  }

  return (
    <View style={styles.noticeBoardCard}>
      <View style={styles.noticeBoardHeader}>
        <View>
          <Text style={styles.noticeBoardTitle}>{l('공지사항')}</Text>
          <Text style={styles.noticeBoardDescription}>{l('모임의 공지사항을 확인하세요!')}</Text>
        </View>
      </View>
      <View style={styles.noticeList}>
        {isInitialLoading ? (
          <>
            {[0, 1, 2, 3].map((i) => (
              <View key={i} style={styles.noticeItemRow}>
                <SkeletonBox style={{ width: 42, height: 28, borderRadius: 6, flexShrink: 0 }} />
                <SkeletonBox style={{ flex: 1, height: 16, borderRadius: 4 }} />
              </View>
            ))}
          </>
        ) : null}
        {!isInitialLoading && visibleNotices.map((notice) => (
          <Pressable
            key={notice.id}
            style={({ pressed }) => [styles.noticeItemRow, pressed && styles.pressed]}
            onPress={() => setSelectedNoticeId(notice.id)}
          >
            <View style={styles.noticeTagRow}>
              {notice.tags.map((tag, index) =>
                renderNoticeTag(tag, `${notice.id}-${tag}-${index}`, l),
              )}
            </View>
            <Text style={styles.noticeItemTitle} numberOfLines={1}>
              {notice.title}
            </Text>
            {notice.photos && notice.photos.length > 0 ? (
              <View style={styles.noticeItemPhotoCount}>
                <MaterialIcons name="image" size={15} color={colors.gray4} />
                <Text style={styles.noticeItemMetaText}>{notice.photos.length}</Text>
              </View>
            ) : null}
          </Pressable>
        ))}
        {!isInitialLoading && visibleNotices.length === 0 ? (
          <View style={styles.managementEmptyCard}>
            <Text style={styles.managementEmptyText}>{l('등록된 공지가 없습니다.')}</Text>
          </View>
        ) : null}
      </View>
      {visibleNotices.length > 0 ? (
        <View style={styles.noticePagination}>
          <Pressable
            style={({ pressed }) => [
              styles.noticePageArrow,
              currentNoticePage === 1 && styles.noticePageArrowDisabled,
              pressed && styles.pressed,
            ]}
            disabled={currentNoticePage === 1}
            onPress={() => setNoticePage((prev) => Math.max(1, prev - 1))}
          >
            <MaterialIcons name="chevron-left" size={18} color={colors.gray5} />
          </Pressable>

          {visiblePageNumbers.map((page) => {
            const active = page === currentNoticePage;
            return (
              <Pressable
                key={`notice-page-${page}`}
                style={({ pressed }) => [
                  styles.noticePageButton,
                  active && styles.noticePageButtonActive,
                  pressed && styles.pressed,
                ]}
                onPress={() => setNoticePage(page)}
              >
                <Text style={[styles.noticePageText, active && styles.noticePageTextActive]}>
                  {page}
                </Text>
              </Pressable>
            );
          })}

          <Pressable
            style={({ pressed }) => [
              styles.noticePageArrow,
              currentNoticePage >= totalNoticePages && styles.noticePageArrowDisabled,
              pressed && styles.pressed,
            ]}
            disabled={currentNoticePage >= totalNoticePages}
            onPress={() => setNoticePage((prev) => Math.min(totalNoticePages, prev + 1))}
          >
            <MaterialIcons name="chevron-right" size={18} color={colors.gray5} />
          </Pressable>
        </View>
      ) : null}
    </View>
  );
}
