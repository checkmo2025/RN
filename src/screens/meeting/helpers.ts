import { Image } from 'react-native';
import type { MaterialIcons } from '@expo/vector-icons';
import type {
  ClubBookshelfDetail,
  ClubBookshelfReview,
  ClubBookshelfTopic,
  ClubDetailResult,
  ClubManagedMember,
  ClubMeetingChatHistory,
  ClubMeetingChatMessage,
  ClubMeetingInfo,
  ClubMeetingTeamTopics,
  ClubMembershipStatus,
  ClubNoticeComment,
  ClubNoticeDetail,
  ClubNoticePreview,
  ClubSearchItem,
  ClubSearchOutputFilter,
} from '../../services/api/clubApi';
import { INPUT_LIMITS } from '../../constants/inputLimits';
import { normalizeRemoteImageUrl } from '../../utils/image';
import { parseApiDateMillis } from '../../utils/date';
import {
  formatDotDate,
  formatDotDateTime,
  formatGenerationLabel,
  toGroupTargets,
  toTeamLabel,
} from './formatters';
import { normalizeClubContacts, toLabelList, mapClubStatusToApplication } from './mappers';
import type {
  BookshelfCreateDraft,
  BookshelfItem,
  BookshelfPostItem,
  CursorPageState,
  Group,
  GroupEditDraft,
  GroupJoinRequestItem,
  GroupMemberItem,
  GroupMemberRole,
  NoticeDraft,
  NoticeItem,
  NoticeComment,
  NoticePoll,
  RegularGroupChatMessage,
  RegularMeetingGroupItem,
  RegularMeetingInfo,
  RegularGroupPostItem,
  StarIconName,
} from './types';

const BOOK_DEFAULT_IMAGE = Image.resolveAssetSource(
  require('../../../assets/images/book-default.png'),
).uri;

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

const participantLabelByCode: Record<string, string> = {
  STUDENT: '대학생',
  WORKER: '직장인',
  ONLINE: '온라인',
  CLUB: '동아리',
  MEETING: '모임',
  OFFLINE: '오프라인',
};

const clubHomeTagToneByLabel: Record<string, 'amber' | 'coral' | 'sky' | 'violet'> = {
  여행: 'amber',
  외국어: 'amber',
  '어린이/청소년': 'amber',
  '종교/철학': 'amber',
  '소설/시/희곡': 'coral',
  에세이: 'coral',
  인문학: 'coral',
  과학: 'sky',
  '컴퓨터/IT': 'sky',
  '경제/경영': 'sky',
  자기계발: 'sky',
  사회과학: 'violet',
  '정치/외교/국방': 'violet',
  '역사/문화': 'violet',
  '예술/대중문화': 'violet',
};

export function buildBookshelfCreateDraft(defaultSession = '7'): BookshelfCreateDraft {
  return {
    sourceBook: null,
    session: defaultSession,
    categories: [],
    regularMeetingName: '',
    meetingLocation: '',
    meetingDate: '',
  };
}

export function buildNoticeDraft(): NoticeDraft {
  return {
    title: '',
    content: '',
    isPinned: false,
    bookshelfEnabled: false,
    bookshelfId: null,
    pollEnabled: false,
    pollAnonymous: true,
    pollAllowDuplicate: false,
    pollStartsAt: '2026.03.01 10:00',
    pollEndsAt: '2026.03.08 22:00',
    pollOptions: ['', '', ''],
    photos: [],
  };
}

export function resolveRegularMeetingId(
  book: Pick<BookshelfItem, 'remoteMeetingId' | 'regularMeetingId'> | null | undefined,
): number | undefined {
  if (!book) return undefined;
  if (typeof book.regularMeetingId === 'number') return book.regularMeetingId;
  if (typeof book.remoteMeetingId === 'number') return book.remoteMeetingId;
  return undefined;
}

export function sortNoticeItems(items: NoticeItem[]): NoticeItem[] {
  return [...items].sort(
    (left, right) => Number(Boolean(right.isPinned)) - Number(Boolean(left.isPinned)),
  );
}

export function mapClubStatusToRole(status?: ClubMembershipStatus): GroupMemberRole {
  if (status === 'OWNER') return '개설자';
  if (status === 'STAFF') return '운영진';
  return '회원';
}

export function toEditDraft(group: Group): GroupEditDraft {
  return {
    name: group.name,
    description: group.description ?? '',
    region: group.region.replace(/^활동 지역 · /, ''),
    categories: group.tags,
    targets: toGroupTargets(group.topic),
    isPrivate: group.isPrivate ?? false,
    imageUrl: group.profileImageUrl ?? '',
  };
}

export function logMeetingAction(key: string, payload?: Record<string, unknown>) {
  if (!__DEV__) return;
  if (payload) {
    console.info(`[meeting] ${key}`, payload);
    return;
  }
  console.info(`[meeting] ${key}`);
}

export function mapManagedClubDetailToGroup(detail: ClubDetailResult, prev: Group): Group {
  const tags = toLabelList(detail.category, categoryLabelByCode).slice(0, 6);
  const participants = toLabelList(detail.participantTypes, participantLabelByCode);
  const links = normalizeClubContacts(detail.links);
  const region =
    typeof detail.region === 'string' && detail.region.trim().length > 0
      ? detail.region.trim()
      : prev.region.replace(/^활동 지역 · /, '');

  return {
    ...prev,
    name: typeof detail.name === 'string' && detail.name.length > 0 ? detail.name : prev.name,
    profileImageUrl:
      normalizeRemoteImageUrl(detail.profileImageUrl ?? undefined) ?? prev.profileImageUrl,
    links: Array.isArray(detail.links) ? links : prev.links,
    description: typeof detail.description === 'string' ? detail.description : prev.description,
    tags: tags.length > 0 ? tags : prev.tags,
    topic: participants.length > 0 ? `모임 대상 · ${participants.join(', ')}` : prev.topic,
    region: `활동 지역 · ${region}`,
    isPrivate: typeof detail.open === 'boolean' ? !detail.open : prev.isPrivate,
  };
}

export function mapClubManagedMemberToJoinRequest(item: ClubManagedMember): GroupJoinRequestItem {
  return {
    id: `club-member-pending-${item.clubMemberId}`,
    clubMemberId: item.clubMemberId,
    nickname: item.nickname,
    profileImageUrl: item.profileImageUrl,
    name: item.name ?? item.nickname,
    email: item.email ?? '',
    appliedAt: formatDotDate(item.appliedAt),
    message: item.joinMessage?.trim() || '가입 메시지가 없습니다.',
  };
}

export function mapClubManagedMemberToGroupMember(item: ClubManagedMember): GroupMemberItem {
  return {
    id: `club-member-${item.clubMemberId}`,
    clubMemberId: item.clubMemberId,
    nickname: item.nickname,
    profileImageUrl: item.profileImageUrl,
    name: item.name ?? item.nickname,
    email: item.email ?? '',
    joinedAt: formatDotDate(item.joinedAt),
    role: mapClubStatusToRole(item.clubMemberStatus),
  };
}

export function mapApiBookshelfToItem(book: {
  meetingId: number;
  generation?: number;
  tag?: string;
  averageRate?: number;
  bookId?: string;
  title?: string;
  author?: string;
  imgUrl?: string;
}): BookshelfItem {
  return {
    id: `bookshelf-${book.meetingId}`,
    remoteMeetingId: book.meetingId,
    bookId: book.bookId,
    generation: book.generation,
    session: formatGenerationLabel(book.generation),
    title: book.title ?? '책 제목',
    author: book.author ?? '작가 미상',
    category: book.tag?.trim() || '기본 태그',
    coverImage: book.imgUrl ?? BOOK_DEFAULT_IMAGE,
    rating: normalizeAverageRating(book.averageRate),
  };
}

export function mapBookshelfDetailToItem(
  detail: ClubBookshelfDetail,
  bookshelfMeetingId?: number,
): BookshelfItem {
  const normalizedBookshelfMeetingId =
    typeof bookshelfMeetingId === 'number' ? bookshelfMeetingId : detail.meetingId;
  return {
    id: `bookshelf-${normalizedBookshelfMeetingId}`,
    remoteMeetingId: normalizedBookshelfMeetingId,
    regularMeetingId: detail.meetingId,
    bookId: detail.book.bookId,
    generation: detail.generation,
    session: formatGenerationLabel(detail.generation),
    title: detail.book.title ?? detail.title ?? '책 제목',
    author: detail.book.author ?? '작가 미상',
    category: detail.tag?.trim() || '기본 태그',
    coverImage: detail.book.imgUrl ?? BOOK_DEFAULT_IMAGE,
    rating: normalizeAverageRating(detail.averageRate),
    regularMeetingName: detail.title,
    meetingLocation: detail.location,
    meetingDate: formatDotDate(detail.meetingTime),
  };
}

export function mapBookshelfTopicToPostItem(item: ClubBookshelfTopic): BookshelfPostItem {
  return {
    id: `bookshelf-topic-${item.topicId}`,
    remoteId: item.topicId,
    type: 'TOPIC',
    author: item.authorNickname,
    content: item.content,
    createdAt: item.createdAt,
    authorProfileImageUrl: item.authorProfileImageUrl,
    isAuthor: item.isAuthor,
  };
}

export function mapBookshelfReviewToPostItem(item: ClubBookshelfReview): BookshelfPostItem {
  return {
    id: `bookshelf-review-${item.bookReviewId}`,
    remoteId: item.bookReviewId,
    type: 'REVIEW',
    author: item.authorNickname,
    content: item.description,
    rating: item.rate,
    createdAt: item.createdAt,
    authorProfileImageUrl: item.authorProfileImageUrl,
    isAuthor: item.isAuthor,
  };
}

export function sortBookshelfPostsByLatest(items: BookshelfPostItem[]): BookshelfPostItem[] {
  return [...items].sort((left, right) => {
    const rightTime = right.createdAt ? Date.parse(right.createdAt) : NaN;
    const leftTime = left.createdAt ? Date.parse(left.createdAt) : NaN;

    if (Number.isFinite(rightTime) && Number.isFinite(leftTime) && rightTime !== leftTime) {
      return rightTime - leftTime;
    }

    if (right.remoteId !== left.remoteId) {
      return right.remoteId - left.remoteId;
    }

    return right.id.localeCompare(left.id, 'ko', { numeric: true });
  });
}

export function areRegularGroupPostsEqual(
  left: RegularGroupPostItem[],
  right: RegularGroupPostItem[],
) {
  if (left.length !== right.length) return false;

  for (let index = 0; index < left.length; index += 1) {
    const leftItem = left[index];
    const rightItem = right[index];

    if (
      leftItem.id !== rightItem.id ||
      leftItem.remoteTopicId !== rightItem.remoteTopicId ||
      leftItem.author !== rightItem.author ||
      leftItem.authorProfileImageUrl !== rightItem.authorProfileImageUrl ||
      leftItem.content !== rightItem.content ||
      leftItem.completed !== rightItem.completed
    ) {
      return false;
    }
  }

  return true;
}

export function areRegularGroupChatMessagesEqual(
  left: RegularGroupChatMessage[],
  right: RegularGroupChatMessage[],
) {
  if (left.length !== right.length) return false;

  for (let index = 0; index < left.length; index += 1) {
    const leftItem = left[index];
    const rightItem = right[index];

    if (
      leftItem.id !== rightItem.id ||
      leftItem.author !== rightItem.author ||
      leftItem.content !== rightItem.content ||
      leftItem.time !== rightItem.time ||
      leftItem.mine !== rightItem.mine
    ) {
      return false;
    }
  }

  return true;
}

export function getStarIconName(
  rating: number,
  index: number,
): keyof typeof MaterialIcons.glyphMap {
  const nearestHalfRating = Math.max(0, Math.min(5, Math.round(rating * 2) / 2));
  const fillAmount = nearestHalfRating - index;
  if (fillAmount >= 1) return 'star';
  if (fillAmount >= 0.5) return 'star-half';
  return 'star-border';
}

export function formatRatingLabel(rating: number) {
  return Number.isInteger(rating) ? `${rating}점` : `${rating.toFixed(1)}점`;
}

export function normalizeAverageRating(rating?: number) {
  return Math.max(0, Math.min(5, rating ?? 0));
}

export function formatAverageRating(rating: number) {
  return normalizeAverageRating(rating).toFixed(2);
}

export function getClubHomeTagTone(tag: string): 'amber' | 'coral' | 'sky' | 'violet' {
  return clubHomeTagToneByLabel[tag] ?? 'amber';
}

export function toNoticeTags(options: {
  tagCode?: string;
  hasPoll?: boolean;
  hasMeeting?: boolean;
}): Array<'PIN' | 'VOTE' | 'MEETING'> {
  const tags: Array<'PIN' | 'VOTE' | 'MEETING'> = [];
  const hasVoteTag = options.hasPoll ?? options.tagCode === 'VOTE';
  const hasMeetingTag = options.hasMeeting ?? options.tagCode === 'MEETING';
  if (hasVoteTag) tags.push('VOTE');
  if (hasMeetingTag) tags.push('MEETING');
  return tags;
}

export function mapNoticePreviewToNoticeItem(item: ClubNoticePreview): NoticeItem {
  const tags = toNoticeTags({ tagCode: item.tagCode });
  return {
    id: `notice-${item.id}`,
    remoteId: item.id,
    title: item.title,
    date: formatDotDate(item.createdAt),
    tags,
    category: item.tagCode === 'VOTE' ? '투표' : item.tagCode === 'MEETING' ? '모임' : '일반',
    content: '',
    authorNickname: item.authorNickname,
    authorProfileImageUrl: item.authorProfileImageUrl,
    isPinned: item.isPinned,
  };
}

export function mergeNoticeDetail(
  baseNotice: NoticeItem | null,
  detail: ClubNoticeDetail,
): NoticeItem {
  const bookshelfAttachment =
    detail.meetingDetail?.meetingId && detail.meetingDetail.bookInfo
      ? {
          id: `bookshelf-${detail.meetingDetail.meetingId}`,
          remoteMeetingId: detail.meetingDetail.meetingId,
          session: formatGenerationLabel(detail.meetingDetail.generation),
          title:
            detail.meetingDetail.bookInfo.title ?? detail.meetingDetail.title ?? '책 제목',
          author: detail.meetingDetail.bookInfo.author ?? '작가 미상',
          category: detail.meetingDetail.tag?.trim() || '기본 태그',
          coverImage: detail.meetingDetail.bookInfo.imgUrl ?? BOOK_DEFAULT_IMAGE,
          rating: 0,
        }
      : undefined;

  return {
    id: `notice-${detail.id}`,
    remoteId: detail.id,
    title: detail.title,
    date: formatDotDate(detail.createdAt),
    tags: toNoticeTags({
      tagCode: detail.tagCode,
      hasPoll: Boolean(detail.voteDetail),
      hasMeeting: Boolean(detail.meetingDetail),
    }),
    category: detail.voteDetail ? '투표' : detail.meetingDetail ? '모임' : '일반',
    content: detail.content,
    authorNickname: detail.authorNickname ?? baseNotice?.authorNickname,
    authorProfileImageUrl:
      detail.authorProfileImageUrl ?? baseNotice?.authorProfileImageUrl,
    bookshelf: bookshelfAttachment,
    poll: detail.voteDetail
      ? ({
          startsAt: formatDotDateTime(detail.voteDetail.startTime),
          endsAt: formatDotDateTime(detail.voteDetail.deadline),
          endsAtMillis: parseApiDateMillis(detail.voteDetail.deadline) ?? null,
          allowDuplicate: detail.voteDetail.duplication,
          anonymous: detail.voteDetail.anonymity,
          options: detail.voteDetail.items.map((option) => ({
            id: `notice-${detail.id}-vote-${option.itemNumber}`,
            label: option.item,
            voters: option.votedMembers.map((member) => member.nickname),
          })),
        } satisfies NoticePoll)
      : undefined,
    photos: detail.imageUrls,
    isPinned: detail.isPinned,
  };
}

export function mapNoticeCommentToUi(
  item: ClubNoticeComment,
  currentNickname?: string,
): NoticeComment {
  const normalizedCurrentNickname = currentNickname?.trim();
  const normalizedAuthor = item.nickname.trim();

  return {
    id: `notice-comment-${item.commentId}`,
    remoteId: item.commentId,
    author: item.nickname,
    authorProfileImageUrl: item.profileImageUrl,
    date: formatDotDate(item.updatedAt ?? item.createdAt),
    content: item.content,
    mine:
      Boolean(normalizedCurrentNickname) &&
      normalizedAuthor.localeCompare(normalizedCurrentNickname ?? '', 'ko', {
        sensitivity: 'accent',
      }) === 0,
  };
}

export function mapMeetingChatMessageToUi(
  item: ClubMeetingChatMessage,
  currentNickname?: string,
): RegularGroupChatMessage {
  const normalizedCurrentNickname = currentNickname?.trim();
  const normalizedAuthor = item.senderNickname.trim();

  return {
    id: `meeting-chat-${item.messageId}`,
    author: item.senderNickname,
    content: item.content,
    time: formatDotDateTime(item.sendAt),
    mine:
      Boolean(normalizedCurrentNickname) &&
      normalizedAuthor.localeCompare(normalizedCurrentNickname ?? '', 'ko', {
        sensitivity: 'accent',
      }) === 0,
  };
}

export function mapMeetingToRegularMeetingInfo(
  book: BookshelfItem | null,
  meeting: ClubMeetingInfo,
  topicsByTeamId: Record<number, ClubMeetingTeamTopics>,
  chatsByTeamId: Record<number, ClubMeetingChatHistory>,
  currentNickname?: string,
): RegularMeetingInfo | null {
  if (!book) return null;

  const fallbackTeamsFromMembers = Array.from(
    new Set(
      meeting.members
        .map((member) => member.teamNumber)
        .filter(
          (teamNumber): teamNumber is number =>
            typeof teamNumber === 'number' && teamNumber > 0,
        ),
    ),
  )
    .sort((left, right) => left - right)
    .map((teamNumber) => ({ teamNumber }));

  const normalizedTeams: Array<{ teamId?: number; teamNumber: number }> =
    meeting.teams.length > 0
      ? meeting.teams
          .filter((team) => typeof team.teamNumber === 'number' && team.teamNumber > 0)
          .map((team) => ({ teamId: team.teamId, teamNumber: team.teamNumber }))
      : fallbackTeamsFromMembers;

  const groups: RegularMeetingGroupItem[] = normalizedTeams.map((team) => {
    const teamMembers = meeting.members.filter((member) => {
      if (typeof team.teamId === 'number' && typeof member.teamId === 'number') {
        return member.teamId === team.teamId;
      }
      return member.teamNumber === team.teamNumber;
    });
    const teamTopics =
      typeof team.teamId === 'number' ? topicsByTeamId[team.teamId]?.topics ?? [] : [];
    const teamChats =
      typeof team.teamId === 'number' ? chatsByTeamId[team.teamId]?.chats ?? [] : [];
    const label = toTeamLabel(team.teamNumber);
    const groupId =
      typeof team.teamId === 'number'
        ? `${book.id}-regular-group-${team.teamId}`
        : `${book.id}-regular-group-team-number-${team.teamNumber}`;
    const members = teamMembers.map((member) => ({
      id: `${groupId}-member-${member.clubMemberId}`,
      nickname: member.nickname,
      profileImageUrl: member.profileImageUrl,
    }));

    return {
      id: groupId,
      teamId: typeof team.teamId === 'number' ? team.teamId : undefined,
      label,
      memberCount: members.length,
      members,
      posts: teamTopics.map((topic) => ({
        id: `${groupId}-topic-${topic.topicId}`,
        remoteTopicId: topic.topicId,
        author: topic.authorNickname,
        authorProfileImageUrl: topic.authorProfileImageUrl,
        content: topic.content,
        completed: topic.isSelected,
      })),
      chatMessages: teamChats.map((chat) => mapMeetingChatMessageToUi(chat, currentNickname)),
    };
  });

  return {
    id: `${book.id}-regular`,
    name: meeting.title?.trim() || `${book.title} 정기모임`,
    date: formatDotDate(meeting.meetingTime),
    location: meeting.location?.trim() || '장소 미정',
    groups,
  };
}

export function ensureRegularMeetingInfo(
  info: RegularMeetingInfo | null,
  book: BookshelfItem,
  detail?: ClubBookshelfDetail | null,
): RegularMeetingInfo {
  const preferredName = book.regularMeetingName?.trim() || detail?.title?.trim();
  const preferredDate = book.meetingDate?.trim() || formatDotDate(detail?.meetingTime);
  const preferredLocation = book.meetingLocation?.trim() || detail?.location?.trim();

  if (!info) {
    return {
      id: `${book.id}-regular`,
      name: preferredName || `${book.title} 정기모임`,
      date: preferredDate || '날짜 미정',
      location: preferredLocation || '장소 미정',
      groups: [],
    };
  }

  return {
    ...info,
    name: preferredName || info.name?.trim() || `${book.title} 정기모임`,
    date: preferredDate || info.date?.trim() || '날짜 미정',
    location: preferredLocation || info.location?.trim() || '장소 미정',
  };
}

export function toNoticeBookshelfAttachment(book: BookshelfItem) {
  return {
    id: book.id,
    remoteMeetingId: book.remoteMeetingId,
    session: book.session,
    title: book.title,
    author: book.author,
    category: book.category,
    coverImage: book.coverImage,
    rating: book.rating,
  };
}

export const MEETING_SEARCH_KEYWORD_MAX_LENGTH = INPUT_LIMITS.CLUB_NAME;

export const outputFilterOptions: Array<{ label: string; value: ClubSearchOutputFilter }> = [
  { label: '전체', value: 'ALL' },
  { label: '대학생', value: 'STUDENT' },
  { label: '직장인', value: 'WORKER' },
  { label: '온라인', value: 'ONLINE' },
  { label: '동아리', value: 'CLUB' },
  { label: '모임', value: 'MEETING' },
  { label: '대면', value: 'OFFLINE' },
];

export function mapMyClubToGroup(club: { clubId: number; clubName: string }): Group {
  return {
    id: `club-${club.clubId}`,
    clubId: club.clubId,
    name: club.clubName,
    tags: [],
    topic: '모임 대상 · 정보 없음',
    region: '활동 지역 · 정보 없음',
    applicationStatus: '가입 완료되었습니다',
  };
}

export function mapSearchClubToGroup(item: ClubSearchItem): Group {
  const rawItem = item as unknown as Record<string, unknown>;
  const clubCandidate =
    rawItem.club && typeof rawItem.club === 'object' ? rawItem.club : rawItem;
  const club = (clubCandidate as ClubDetailResult) ?? {};
  const clubId = typeof club.clubId === 'number' ? club.clubId : undefined;
  const tags = toLabelList(club.category, categoryLabelByCode).slice(0, 6);
  const participants = toLabelList(club.participantTypes, participantLabelByCode);
  const regionText =
    typeof club.region === 'string' && club.region.trim().length > 0
      ? club.region.trim()
      : '정보 없음';

  return {
    id: clubId ? `club-${clubId}` : `club-${club.name ?? Math.random().toString()}`,
    clubId,
    name: typeof club.name === 'string' && club.name.length > 0 ? club.name : '이름 없는 모임',
    profileImageUrl: normalizeRemoteImageUrl(club.profileImageUrl ?? undefined),
    links: normalizeClubContacts(club.links),
    tags,
    topic: participants.length > 0 ? `모임 대상 · ${participants.join(', ')}` : '모임 대상 · 정보 없음',
    region: `활동 지역 · ${regionText}`,
    applicationStatus: mapClubStatusToApplication(item.myStatus),
    description: typeof club.description === 'string' ? club.description : undefined,
    isPrivate: typeof club.open === 'boolean' ? !club.open : undefined,
  };
}
