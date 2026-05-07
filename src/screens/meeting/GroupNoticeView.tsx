import { useMemo } from 'react';
import { Image, Text, View } from 'react-native';
import type { GestureResponderEvent } from 'react-native';
import type { NavigationProp, ParamListBase } from '@react-navigation/native';
import { MaterialIcons } from '@expo/vector-icons';
import { colors } from '../../theme';
import { DefaultProfileAvatar } from '../../components/common/DefaultProfileAvatar';
import { FeedbackPressable as Pressable } from '../../components/common/FeedbackPressable';
import { FormTextInput } from '../../components/common/FormTextInput';
import { styles } from './meetingStyles';
import {
  formatAverageRating,
  getStarIconName,
} from './helpers';
import type {
  CursorPageState,
  NoticeComment,
  NoticeItem,
  NoticePollOption,
} from './types';

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

function renderNoticeTag(tag: 'PIN' | 'VOTE' | 'MEETING', key: string) {
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
        <Text style={styles.noticeTagText}>투표</Text>
      </View>
    );
  }
  return (
    <View key={key} style={[styles.noticeTag, styles.noticeTagMeeting]}>
      <Text style={styles.noticeTagText}>모임</Text>
    </View>
  );
}

export type GroupNoticeViewProps = {
  isMember: boolean;
  navigation: NavigationProp<ParamListBase>;
  // Raw notice state
  noticeItems: NoticeItem[];
  noticePage: number;
  selectedNoticeId: string | null;
  noticeCommentInput: string;
  submittingNoticeComment: boolean;
  editingNoticeCommentId: string | null;
  noticeCommentsById: Record<string, NoticeComment[]>;
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
  handlePressCommentMenu: (comment: NoticeComment, event: GestureResponderEvent) => void;
};

export function GroupNoticeView({
  isMember,
  navigation,
  noticeItems,
  noticePage,
  selectedNoticeId,
  noticeCommentInput,
  submittingNoticeComment,
  editingNoticeCommentId,
  noticeCommentsById,
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
  handlePressCommentMenu,
}: GroupNoticeViewProps) {
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

  const currentNoticePollOptions = useMemo(() => {
    if (!selectedNotice?.poll) return [];
    return noticePollOptionsById[selectedNotice.id] ?? selectedNotice.poll.options;
  }, [noticePollOptionsById, selectedNotice]);

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
          공지사항은 독서 모임의 회원이 되신 후 조회 가능합니다.
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
          <Text style={styles.breadcrumbText}>공지사항</Text>
        </Pressable>

        <View style={styles.noticeDetailTopRow}>
          <View style={styles.noticeDetailCategoryRow}>
            <View style={[styles.noticeTag, styles.noticeTagPin]}>
              <Text style={styles.noticeTagText}>{selectedNotice.category}</Text>
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
        <Text style={styles.noticeDetailBody}>{selectedNotice.content}</Text>
        {selectedNotice.bookshelf ? (
          <Pressable
            style={({ pressed }) => [styles.noticeAttachmentCard, pressed && styles.pressed]}
            onPress={handleOpenNoticeBookshelf}
          >
            <Text style={styles.noticeAttachmentTitle}>책장</Text>
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
                      {selectedNotice.bookshelf.category}
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
                <Text style={styles.noticeAttachmentTitle}>투표</Text>
                <Text style={styles.noticePollEndText}>
                  {selectedNotice.poll.startsAt} - {selectedNotice.poll.endsAt}
                </Text>
              </View>
              <View style={styles.noticePollMetaRight}>
                <Text style={styles.noticePollMetaText}>
                  {selectedNotice.poll.allowDuplicate ? '중복 가능' : '중복 불가'}
                </Text>
                <View style={styles.noticePollMetaPrivacy}>
                  <MaterialIcons
                    name={selectedNotice.poll.anonymous ? 'lock-outline' : 'person-outline'}
                    size={14}
                    color={colors.gray4}
                  />
                  <Text style={styles.noticePollMetaText}>
                    {selectedNotice.poll.anonymous ? '익명' : '실명'}
                  </Text>
                </View>
              </View>
            </View>

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
                      disabled={voteCount <= 0}
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
                      ? '투표종료'
                      : hasSubmittedVoteInNotice && !voteEditEnabled
                        ? '다시 투표'
                        : '투표하기'}
                  </Text>
                </Pressable>
              );
            })()}
          </View>
        ) : null}
        {selectedNotice.photos && selectedNotice.photos.length > 0 ? (
          <View style={styles.noticeAttachmentCard}>
            <Text style={styles.noticeAttachmentTitle}>사진</Text>
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
          <Text style={styles.noticeCommentHeader}>댓글</Text>
          <View style={styles.noticeCommentInputRow}>
            <FormTextInput
              value={noticeCommentInput}
              onChangeText={setNoticeCommentInput}
              placeholder="댓글 내용"
              placeholderTextColor={colors.gray3}
              style={styles.noticeCommentInput}
              editable={!submittingNoticeComment}
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
                {submittingNoticeComment ? '처리 중' : editingNoticeCommentId ? '수정' : '입력'}
              </Text>
            </Pressable>
          </View>
          {editingNoticeCommentId ? (
            <Pressable
              style={({ pressed }) => [styles.breadcrumbPress, pressed && styles.pressed]}
              onPress={() => {
                setEditingNoticeCommentId(null);
                setNoticeCommentInput('');
              }}
            >
              <Text style={styles.breadcrumbText}>댓글 수정 취소</Text>
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
                          <Text style={styles.noticeCommentAuthorBadgeText}>작성자</Text>
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
                </View>
              </View>
            ))}
            {currentNoticeComments.length === 0 ? (
              <View style={styles.managementEmptyCard}>
                <Text style={styles.managementEmptyText}>등록된 댓글이 없습니다.</Text>
              </View>
            ) : null}
            {currentNoticeCommentPageState?.loadingMore ? (
              <Text style={styles.infiniteScrollLoadingText}>불러오는 중...</Text>
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
          <Text style={styles.noticeBoardTitle}>공지사항</Text>
          <Text style={styles.noticeBoardDescription}>모임의 공지사항을 확인하세요!</Text>
        </View>
      </View>
      <View style={styles.noticeList}>
        {visibleNotices.map((notice) => (
          <Pressable
            key={notice.id}
            style={({ pressed }) => [styles.noticeItemRow, pressed && styles.pressed]}
            onPress={() => setSelectedNoticeId(notice.id)}
          >
            <View style={styles.noticeTagRow}>
              {notice.tags.map((tag, index) =>
                renderNoticeTag(tag, `${notice.id}-${tag}-${index}`),
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
        {visibleNotices.length === 0 ? (
          <View style={styles.managementEmptyCard}>
            <Text style={styles.managementEmptyText}>등록된 공지가 없습니다.</Text>
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
