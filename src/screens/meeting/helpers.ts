import type { MaterialIcons } from '@expo/vector-icons';
import { createLogger } from '../../utils/logger';

const meetingLog = createLogger('meeting');
import type {
  ClubBookshelfDetail,
  ClubBookshelfReview,
  ClubBookshelfTopic,
  ClubCategoryCode,
  ClubDetailResult,
  ClubManagedMember,
  ClubMeetingInfo,
  ClubMeetingTeamTopics,
  ClubMembershipStatus,
  ClubNoticeComment,
  ClubNoticeDetail,
  ClubNoticePreview,
  ClubParticipantTypeCode,
  ClubSearchItem,
  ClubSearchOutputFilter,
} from '../../services/api/clubApi';
import { CATEGORY_CODE_TO_LABEL } from '../../constants/domain/category';
import { PARTICIPANT_CODE_TO_LABEL } from '../../constants/domain/participant';
import { INPUT_LIMITS } from '../../constants/inputLimits';
import { BOOK_DEFAULT_IMAGE } from '../../constants/defaultAssets';
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
  NoticeTag,
  NoticeComment,
  NoticePoll,
  RegularMeetingGroupItem,
  RegularMeetingInfo,
  RegularGroupPostItem,
  StarIconName,
} from './types';



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
  if (payload) {
    meetingLog.info(key, payload);
  } else {
    meetingLog.info(key);
  }
}

export function mapManagedClubDetailToGroup(detail: ClubDetailResult, prev: Group): Group {
  const tags = toLabelList(detail.category, CATEGORY_CODE_TO_LABEL).slice(0, 6);
  const participants = toLabelList(detail.participantTypes, PARTICIPANT_CODE_TO_LABEL);
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

function resolveNoticeTagKind(
  tagCode?: string,
  tagDescription?: string,
): NoticeTag | null {
  const normalized = `${tagCode ?? ''} ${tagDescription ?? ''}`.trim().toUpperCase();
  if (!normalized) return null;
  if (normalized.includes('PIN') || normalized.includes('고정')) return 'PIN';
  if (normalized.includes('VOTE') || normalized.includes('투표')) return 'VOTE';
  if (
    normalized.includes('MEETING') ||
    normalized.includes('MEET') ||
    normalized.includes('모임') ||
    normalized.includes('정기')
  ) return 'MEETING';
  return 'GENERAL';
}

function addNoticeTag(tags: NoticeTag[], tag: NoticeTag) {
  if (!tags.includes(tag)) tags.push(tag);
}

function getPrimaryNoticeCategory(tags: NoticeTag[]): NoticeItem['category'] {
  if (tags.includes('VOTE')) return '투표';
  if (tags.includes('MEETING')) return '모임';
  return '일반';
}

export function toNoticeTags(options: {
  tagCode?: string;
  tagDescription?: string;
  tagItems?: Array<{ code?: string; description?: string }>;
  hasPoll?: boolean;
  hasMeeting?: boolean;
  isPinned?: boolean;
}): NoticeTag[] {
  const tags: NoticeTag[] = [];
  if (options.isPinned) addNoticeTag(tags, 'PIN');

  const explicitTags = [
    ...(options.tagItems ?? []),
    { code: options.tagCode, description: options.tagDescription },
  ];
  explicitTags.forEach((item) => {
    const tag = resolveNoticeTagKind(item.code, item.description);
    if (tag) addNoticeTag(tags, tag);
  });

  if (options.hasPoll) addNoticeTag(tags, 'VOTE');
  if (options.hasMeeting) addNoticeTag(tags, 'MEETING');
  if (!tags.some((tag) => tag !== 'PIN')) addNoticeTag(tags, 'GENERAL');
  return tags;
}

export function mapNoticePreviewToNoticeItem(item: ClubNoticePreview): NoticeItem {
  const tags = toNoticeTags({
    tagCode: item.tagCode,
    tagDescription: item.tagDescription,
    tagItems: item.tagItems,
    isPinned: item.isPinned,
  });
  return {
    id: `notice-${item.id}`,
    remoteId: item.id,
    title: item.title,
    date: formatDotDate(item.createdAt),
    tags,
    category: getPrimaryNoticeCategory(tags),
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
  const tags = toNoticeTags({
    tagCode: detail.tagCode,
    tagDescription: detail.tagDescription,
    tagItems: detail.tagItems,
    hasPoll: Boolean(detail.voteDetail),
    hasMeeting: Boolean(detail.meetingDetail),
    isPinned: detail.isPinned,
  });

  return {
    id: `notice-${detail.id}`,
    remoteId: detail.id,
    title: detail.title,
    date: formatDotDate(detail.createdAt),
    tags,
    category: getPrimaryNoticeCategory(tags),
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

export function mapMeetingToRegularMeetingInfo(
  book: BookshelfItem | null,
  meeting: ClubMeetingInfo,
  topicsByTeamId: Record<number, ClubMeetingTeamTopics>,
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
    membershipStatus: 'MEMBER',
    applicationStatus: '가입 완료되었습니다',
  };
}

export function mapSearchClubToGroup(item: ClubSearchItem): Group {
  const rawItem = item as unknown as Record<string, unknown>;
  const clubCandidate =
    rawItem.club && typeof rawItem.club === 'object' ? rawItem.club : rawItem;
  const club = (clubCandidate as ClubDetailResult) ?? {};
  const clubId = typeof club.clubId === 'number' ? club.clubId : undefined;
  const tags = toLabelList(club.category, CATEGORY_CODE_TO_LABEL).slice(0, 6);
  const participants = toLabelList(club.participantTypes, PARTICIPANT_CODE_TO_LABEL);
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
    membershipStatus: item.myStatus,
    applicationStatus: mapClubStatusToApplication(item.myStatus),
    description: typeof club.description === 'string' ? club.description : undefined,
    isPrivate: typeof club.open === 'boolean' ? !club.open : undefined,
  };
}
