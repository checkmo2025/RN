import { ApiEnvelope, ApiError, fetchApi, requestJson, unwrapResult } from './http';
import { asRecord, toBooleanValue, toNumberValue, toStringValue, firstDefined } from './parseUtils';
import { normalizeRemoteImageUrl } from '../../utils/image';

export type ClubCategoryCode =
  | 'FICTION_POETRY_DRAMA'
  | 'ESSAY'
  | 'HUMANITIES'
  | 'SOCIAL_SCIENCE'
  | 'POLITICS_DIPLOMACY_DEFENSE'
  | 'ECONOMY_MANAGEMENT'
  | 'SELF_DEVELOPMENT'
  | 'HISTORY_CULTURE'
  | 'SCIENCE'
  | 'COMPUTER_IT'
  | 'ART_POP_CULTURE'
  | 'TRAVEL'
  | 'FOREIGN_LANGUAGE'
  | 'CHILDREN_BOOKS'
  | 'RELIGION_PHILOSOPHY';

export type ClubParticipantTypeCode =
  | 'STUDENT'
  | 'WORKER'
  | 'ONLINE'
  | 'CLUB'
  | 'MEETING'
  | 'OFFLINE';

export type ClubContact = {
  label?: string;
  link: string;
};

export type ClubMembershipStatus =
  | 'NONE'
  | 'PENDING'
  | 'MEMBER'
  | 'STAFF'
  | 'OWNER'
  | 'WITHDRAWN'
  | 'KICKED';

export type ClubMyMembership = {
  clubId?: number;
  myStatus?: ClubMembershipStatus;
  active: boolean;
  staff: boolean;
};

export type ClubCodeDescription = {
  code: string;
  description?: string;
};

export type ClubDetailResult = {
  clubId?: number;
  name?: string;
  description?: string;
  profileImageUrl?: string | null;
  region?: string;
  category?: Array<ClubCategoryCode | ClubCodeDescription>;
  participantTypes?: Array<ClubParticipantTypeCode | ClubCodeDescription>;
  links?: ClubContact[];
  open?: boolean;
};

export type ClubSearchItem = {
  club: ClubDetailResult;
  myStatus?: ClubMembershipStatus;
};

export type ClubSearchList = {
  items: ClubSearchItem[];
  hasNext: boolean;
  nextCursor: number | null;
};

export type ClubSearchInputFilter = 'NAME' | 'REGION';
export type ClubSearchOutputFilter =
  | 'ALL'
  | 'STUDENT'
  | 'WORKER'
  | 'ONLINE'
  | 'CLUB'
  | 'MEETING'
  | 'OFFLINE';

export type SearchClubsParams = {
  keyword?: string;
  inputFilter?: ClubSearchInputFilter;
  outputFilter?: ClubSearchOutputFilter;
  cursorId?: number;
};

export type MyClubItem = {
  clubId: number;
  clubName: string;
};

export type MyClubList = {
  items: MyClubItem[];
  hasNext: boolean;
  nextCursor: number | null;
};

export type ClubCreatePayload = {
  name: string;
  description: string;
  region: string;
  category: ClubCategoryCode[];
  participantTypes: ClubParticipantTypeCode[];
  links?: ClubContact[];
  open?: boolean;
  profileImageUrl?: string;
};

export type ClubMemberQueryStatus =
  | 'ALL'
  | 'ACTIVE'
  | 'MEMBER'
  | 'STAFF'
  | 'OWNER'
  | 'PENDING'
  | 'WITHDRAWN'
  | 'KICKED';

export type ClubMemberActionCommand =
  | 'APPROVE'
  | 'REJECT'
  | 'CHANGE_ROLE'
  | 'TRANSFER_OWNER'
  | 'KICK';

export type ClubMemberActionPayload = {
  command: ClubMemberActionCommand;
  status?: ClubMembershipStatus;
};

export type ClubManagedMember = {
  clubMemberId: number;
  nickname: string;
  profileImageUrl?: string;
  name?: string;
  email?: string;
  joinMessage?: string;
  clubMemberStatus?: ClubMembershipStatus;
  appliedAt?: string;
  joinedAt?: string;
};

export type ClubManagedMemberList = {
  items: ClubManagedMember[];
  hasNext: boolean;
  nextCursor: number | null;
};

export type ClubParticipantStatus = 'MEMBER' | 'STAFF' | 'OWNER';

export type ClubParticipant = {
  clubMemberId: number;
  nickname: string;
  profileImageUrl?: string;
  following: boolean;
  clubMemberStatus: ClubParticipantStatus;
  staff: boolean;
};

export type ClubParticipantList = {
  items: ClubParticipant[];
  totalCount: number;
  hasNext: boolean;
  nextCursor: number | null;
};

export type ClubNoticeTagCode = 'PIN' | 'VOTE' | 'MEETING' | string;

export type ClubNoticeTagItem = {
  code?: ClubNoticeTagCode;
  description?: string;
};

export type ClubNoticePreview = {
  id: number;
  title: string;
  createdAt?: string;
  isPinned: boolean;
  tagCode?: ClubNoticeTagCode;
  tagDescription?: string;
  tagItems: ClubNoticeTagItem[];
  authorNickname?: string;
  authorProfileImageUrl?: string;
};

export type ClubNoticeList = {
  pinnedNotices: ClubNoticePreview[];
  normalNotices: ClubNoticePreview[];
  page: number;
  size: number;
  totalElements: number;
  totalPages: number;
  hasNext: boolean;
};

export type ClubLatestNoticePreview = {
  id: number;
  title: string;
};

export type ClubNoticeVoteItem = {
  itemNumber: number;
  item: string;
  voteCount: number;
  votedMembers: Array<{
    nickname: string;
    profileImageUrl?: string;
  }>;
  isSelected: boolean;
};

export type ClubNoticeVoteDetail = {
  id: number;
  title?: string;
  content?: string;
  anonymity: boolean;
  duplication: boolean;
  startTime?: string;
  deadline?: string;
  items: ClubNoticeVoteItem[];
};

export type ClubNoticeMeetingDetail = {
  meetingId?: number;
  title?: string;
  meetingTime?: string;
  location?: string;
  generation?: number;
  tag?: string;
  content?: string;
  bookInfo?: {
    bookId?: string;
    title?: string;
    author?: string;
    imgUrl?: string;
    publisher?: string;
    description?: string;
  };
};

export type ClubNoticeDetail = {
  id: number;
  title: string;
  content: string;
  createdAt?: string;
  isPinned: boolean;
  tagCode?: ClubNoticeTagCode;
  tagDescription?: string;
  tagItems: ClubNoticeTagItem[];
  imageUrls: string[];
  meetingDetail?: ClubNoticeMeetingDetail;
  voteDetail?: ClubNoticeVoteDetail;
  authorNickname?: string;
  authorProfileImageUrl?: string;
};

export type ClubNoticeComment = {
  commentId: number;
  nickname: string;
  profileImageUrl?: string;
  content: string;
  createdAt?: string;
  updatedAt?: string;
};

export type ClubNoticeCommentList = {
  items: ClubNoticeComment[];
  hasNext: boolean;
  nextCursor: number | null;
};

export type CreateClubVotePayload = {
  title: string;
  content?: string;
  item1: string;
  item2: string;
  item3?: string;
  item4?: string;
  item5?: string;
  item6?: string;
  anonymity?: boolean;
  duplication?: boolean;
  startTime: string;
  deadline: string;
};

export type CreateClubNoticePayload = {
  title: string;
  content: string;
  meetingId?: number;
  imageUrls?: string[];
  vote?: CreateClubVotePayload;
  isPinned?: boolean;
};

export type UpdateClubNoticePayload = {
  title: string;
  content: string;
  meetingId?: number;
  imageUrls?: string[];
  vote?: {
    deadline: string;
  };
  isPinned?: boolean;
};

export type CreateClubNoticeCommentPayload = {
  content: string;
};

export type SubmitClubVotePayload = {
  selectedItemNumbers: number[];
};

export type ClubBookshelfItem = {
  meetingId: number;
  generation?: number;
  tag?: string;
  averageRate?: number;
  bookId?: string;
  title?: string;
  author?: string;
  imgUrl?: string;
};

export type ClubBookshelfList = {
  items: ClubBookshelfItem[];
  hasNext: boolean;
  nextCursor: number | null;
  isStaff: boolean;
};

export type ClubBookshelfDetail = {
  meetingId: number;
  title?: string;
  meetingTime?: string;
  location?: string;
  generation?: number;
  tag?: string;
  averageRate?: number;
  content?: string;
  book: {
    bookId?: string;
    title?: string;
    author?: string;
    imgUrl?: string;
    publisher?: string;
    description?: string;
  };
};

export type CreateClubBookshelfPayload = {
  isbn: string;
  title?: string;
  meetingTime?: string;
  location?: string;
  generation?: number;
  tag?: string;
};

export type UpdateClubBookshelfPayload = {
  title?: string;
  meetingTime?: string;
  location?: string;
  generation?: number;
  tag?: string;
};

export type ClubBookshelfTopic = {
  topicId: number;
  content: string;
  createdAt?: string;
  authorNickname: string;
  authorProfileImageUrl?: string;
  isAuthor: boolean;
};

export type ClubBookshelfTopicList = {
  items: ClubBookshelfTopic[];
  hasNext: boolean;
  nextCursor: number | null;
};

export type ClubBookshelfReview = {
  bookReviewId: number;
  description: string;
  rate: number;
  createdAt?: string;
  authorNickname: string;
  authorProfileImageUrl?: string;
  isAuthor: boolean;
};

export type ClubBookshelfReviewList = {
  items: ClubBookshelfReview[];
  hasNext: boolean;
  nextCursor: number | null;
};

export type CreateClubBookshelfTopicPayload = {
  description: string;
};

export type CreateClubBookshelfReviewPayload = {
  description: string;
  rate: number;
};

export type ClubMeetingTeamKey = {
  teamId: number;
  teamNumber: number;
};

export type ClubMeetingMember = {
  clubMemberId: number;
  nickname: string;
  profileImageUrl?: string;
  teamId?: number;
  teamNumber?: number;
};

export type ClubMeetingInfo = {
  meetingId: number;
  title?: string;
  meetingTime?: string;
  location?: string;
  teams: ClubMeetingTeamKey[];
  members: ClubMeetingMember[];
  isStaff: boolean;
};

export type ClubMeetingMemberList = {
  teams: ClubMeetingTeamKey[];
  members: ClubMeetingMember[];
};

export type ClubMeetingTopic = {
  topicId: number;
  content: string;
  createdAt?: string;
  authorNickname: string;
  authorProfileImageUrl?: string;
  isSelected: boolean;
};

export type ClubMeetingTeamTopics = {
  existingTeams: ClubMeetingTeamKey[];
  requestedTeam?: ClubMeetingTeamKey;
  topics: ClubMeetingTopic[];
  hasNext: boolean;
  nextCursor: number | null;
};

export type ClubMeetingChatMessage = {
  messageId: number;
  content: string;
  sendAt?: string;
  senderNickname: string;
  senderProfileImageUrl?: string;
};

export type ClubMeetingChatHistory = {
  chats: ClubMeetingChatMessage[];
  hasNext: boolean;
  nextCursor: number | null;
};


export type ManageClubMeetingTeamsPayload = {
  teamMemberList: Array<{
    teamNumber: number;
    clubMemberIds: number[];
  }>;
};

export type ClubNextMeetingRedirect = {
  meetingId?: number;
  redirectUrl?: string;
};

type ApiResponseBoolean = ApiEnvelope<boolean>;
type ApiResponseString = ApiEnvelope<string>;
type ApiResponseVoid = ApiEnvelope<void>;
type ApiResponseClubList = ApiEnvelope<{
  clubList?: unknown[];
  recommendationList?: unknown[];
  recommendedClubList?: unknown[];
  recommendations?: unknown[];
  clubs?: unknown[];
  items?: unknown[];
  hasNext?: boolean;
  nextCursor?: number | null;
}>;
type ApiResponseMyClubList = ApiEnvelope<{
  clubList?: MyClubItem[];
  hasNext?: boolean;
  nextCursor?: number | null;
}>;
type ApiResponseClubDetail = ApiEnvelope<ClubDetailResult>;
type ApiResponseClubMyMembership = ApiEnvelope<unknown>;
type ApiResponseManagedClubMembers = ApiEnvelope<{
  clubMembers?: unknown[];
  hasNext?: boolean;
  nextCursor?: number | null;
}>;
type ApiResponseClubParticipants = ApiEnvelope<{
  clubMembers?: unknown[];
  totalCount?: number;
  hasNext?: boolean;
  nextCursor?: number | null;
}>;
type ApiResponseNoticeList = ApiEnvelope<{
  pinnedNotices?: unknown[];
  normalNotices?: {
    notices?: unknown[];
    page?: number;
    size?: number;
    totalElements?: number;
    totalPages?: number;
    hasNext?: boolean;
  };
}>;
type ApiResponseNoticeDetail = ApiEnvelope<unknown>;
type ApiResponseNoticeComments = ApiEnvelope<{
  comments?: unknown[];
  hasNext?: boolean;
  nextCursor?: number | null;
}>;
type ApiResponseBookshelfList = ApiEnvelope<{
  bookShelfInfoList?: unknown[];
  hasNext?: boolean;
  nextCursor?: number | null;
  isStaff?: boolean;
}>;
type ApiResponseBookshelfDetail = ApiEnvelope<unknown>;
type ApiResponseBookshelfTopics = ApiEnvelope<{
  topicDetailList?: unknown[];
  hasNext?: boolean;
  nextCursor?: number | null;
}>;
type ApiResponseBookshelfReviews = ApiEnvelope<{
  bookReviewDetailList?: unknown[];
  hasNext?: boolean;
  nextCursor?: number | null;
}>;
type ApiResponseMeetingInfo = ApiEnvelope<unknown>;
type ApiResponseMeetingMemberList = ApiEnvelope<unknown>;
type ApiResponseMeetingTeamTopics = ApiEnvelope<unknown>;
type ApiResponseMeetingChatHistory = ApiEnvelope<unknown>;

function extractMeetingIdFromUrl(value?: string): number | undefined {
  if (!value) return undefined;

  const patterns = [
    /[?&]meetingId=(\d+)/i,
    /\/meetings\/(\d+)(?:\/|$|\?)/i,
    /\/bookshelves\/(\d+)(?:\/|$|\?)/i,
  ];

  for (const pattern of patterns) {
    const matched = value.match(pattern);
    const meetingId = toNumberValue(matched?.[1]);
    if (typeof meetingId === 'number') {
      return meetingId;
    }
  }

  return undefined;
}

function toClubMembershipStatus(value: unknown): ClubMembershipStatus | undefined {
  if (
    value === 'NONE' ||
    value === 'PENDING' ||
    value === 'MEMBER' ||
    value === 'STAFF' ||
    value === 'OWNER' ||
    value === 'WITHDRAWN' ||
    value === 'KICKED'
  ) {
    return value;
  }
  return undefined;
}

function toClubParticipantStatus(value: unknown): ClubParticipantStatus {
  if (value === 'OWNER' || value === 'STAFF' || value === 'MEMBER') {
    return value;
  }
  return 'MEMBER';
}

function normalizeClubMyMembership(raw: unknown): ClubMyMembership | null {
  const record = asRecord(raw);
  if (!record) return null;

  return {
    clubId: toNumberValue(record.clubId),
    myStatus: toClubMembershipStatus(record.myStatus),
    active: toBooleanValue(record.active) ?? false,
    staff: toBooleanValue(record.staff) ?? false,
  };
}

function normalizeBasicMemberInfo(raw: unknown): {
  nickname: string;
  profileImageUrl?: string;
} {
  const record = asRecord(raw);
  return {
    nickname: toStringValue(record?.nickname) ?? '알 수 없음',
    profileImageUrl: normalizeRemoteImageUrl(
      toStringValue(firstDefined(record?.profileImageUrl, record?.imgUrl, record?.imageUrl)),
    ),
  };
}

function normalizeOptionalMemberInfo(raw: unknown): {
  nickname?: string;
  profileImageUrl?: string;
} {
  if (typeof raw === 'string') {
    const nickname = raw.trim();
    return {
      nickname: nickname.length > 0 ? nickname : undefined,
    };
  }

  const record = asRecord(raw);
  if (!record) return {};

  const nickname = toStringValue(
    firstDefined(record.nickname, record.memberNickname, record.name),
  )?.trim();

  return {
    nickname: nickname && nickname.length > 0 ? nickname : undefined,
    profileImageUrl: normalizeRemoteImageUrl(
      toStringValue(
        firstDefined(
          record.profileImageUrl,
          record.imgUrl,
          record.imageUrl,
          record.profileImgUrl,
        ),
      ),
    ),
  };
}

function normalizeDetailedMemberInfo(raw: unknown): {
  nickname: string;
  profileImageUrl?: string;
  name?: string;
  email?: string;
} {
  const record = asRecord(raw);
  const basic = normalizeBasicMemberInfo(record);
  return {
    ...basic,
    name: toStringValue(record?.name),
    email: toStringValue(record?.email),
  };
}

function normalizeClubManagedMember(raw: unknown): ClubManagedMember | null {
  const record = asRecord(raw);
  if (!record) return null;

  const clubMemberId = toNumberValue(record.clubMemberId);
  if (!clubMemberId) return null;

  const detailInfo = normalizeDetailedMemberInfo(firstDefined(record.detailInfo, record.memberInfo));

  return {
    clubMemberId,
    nickname: detailInfo.nickname,
    profileImageUrl: detailInfo.profileImageUrl,
    name: detailInfo.name,
    email: detailInfo.email,
    joinMessage: toStringValue(record.joinMessage),
    clubMemberStatus: toClubMembershipStatus(record.clubMemberStatus),
    appliedAt: toStringValue(record.appliedAt),
    joinedAt: toStringValue(record.joinedAt),
  };
}

function normalizeClubParticipant(raw: unknown): ClubParticipant | null {
  const record = asRecord(raw);
  if (!record) return null;

  const clubMemberId = toNumberValue(record.clubMemberId);
  if (!clubMemberId) return null;

  const memberInfo = normalizeOptionalMemberInfo(
    firstDefined(record.memberInfo, record.detailInfo, record.member, record.user, record),
  );
  const nickname =
    memberInfo.nickname ??
    toStringValue(firstDefined(record.nickname, record.memberNickname, record.name))?.trim();
  if (!nickname) return null;

  const clubMemberStatus = toClubParticipantStatus(record.clubMemberStatus);
  const staff =
    toBooleanValue(record.staff) ?? (clubMemberStatus === 'OWNER' || clubMemberStatus === 'STAFF');

  return {
    clubMemberId,
    nickname,
    profileImageUrl:
      memberInfo.profileImageUrl ??
      normalizeRemoteImageUrl(
        toStringValue(
          firstDefined(
            record.profileImageUrl,
            record.imgUrl,
            record.imageUrl,
            record.profileImgUrl,
          ),
        ),
      ),
    following:
      toBooleanValue(firstDefined(record.following, record.isFollowing, record.subscribed)) ??
      false,
    clubMemberStatus,
    staff,
  };
}

function normalizeClubNoticeTag(raw: unknown): {
  code?: ClubNoticeTagCode;
  description?: string;
} {
  const record = asRecord(raw);
  return {
    code: toStringValue(firstDefined(record?.code, raw)),
    description: toStringValue(record?.description),
  };
}

function normalizeClubNoticeTags(...rawValues: unknown[]): ClubNoticeTagItem[] {
  const tags: ClubNoticeTagItem[] = [];

  rawValues.forEach((raw) => {
    if (Array.isArray(raw)) {
      raw.forEach((item) => {
        const tag = normalizeClubNoticeTag(item);
        if (tag.code || tag.description) tags.push(tag);
      });
      return;
    }

    const tag = normalizeClubNoticeTag(raw);
    if (tag.code || tag.description) tags.push(tag);
  });

  return tags;
}

function normalizeClubNoticePreview(raw: unknown): ClubNoticePreview | null {
  const record = asRecord(raw);
  if (!record) return null;

  const id = toNumberValue(record.id);
  if (!id) return null;

  const tagItems = normalizeClubNoticeTags(
    record.tagItems,
    record.tags,
    record.noticeTags,
    record.tagItem,
    record.tag,
    firstDefined(record.tagCode, record.type),
  );
  const primaryTag = tagItems[0];
  const authorInfo = normalizeOptionalMemberInfo(
    firstDefined(
      record.authorInfo,
      record.memberInfo,
      record.author,
      record.createdBy,
      record.writer,
    ),
  );
  const authorNickname =
    authorInfo.nickname ??
    toStringValue(
      firstDefined(
        record.authorNickname,
        record.memberNickname,
        record.nickname,
        record.createdByNickname,
        record.writerNickname,
      ),
    )?.trim();

  return {
    id,
    title: toStringValue(record.title) ?? '공지사항',
    createdAt: toStringValue(record.createdAt),
    isPinned: toBooleanValue(record.isPinned) ?? false,
    tagCode: primaryTag?.code,
    tagDescription: primaryTag?.description,
    tagItems,
    authorNickname:
      authorNickname && authorNickname.length > 0 ? authorNickname : undefined,
    authorProfileImageUrl: authorInfo.profileImageUrl,
  };
}

function normalizeClubLatestNoticePreview(raw: unknown): ClubLatestNoticePreview | null {
  const record = asRecord(raw);
  if (!record) return null;
  const id = toNumberValue(record.id);
  if (!id) return null;

  return {
    id,
    title: toStringValue(record.title) ?? '공지사항',
  };
}

function normalizeBookInfo(raw: unknown): {
  bookId?: string;
  title?: string;
  author?: string;
  imgUrl?: string;
  publisher?: string;
  description?: string;
} {
  const record = asRecord(raw);
  return {
    bookId: toStringValue(firstDefined(record?.bookId, record?.isbn, record?.isbn13)),
    title: toStringValue(record?.title),
    author: toStringValue(record?.author),
    imgUrl: normalizeRemoteImageUrl(
      toStringValue(firstDefined(record?.imgUrl, record?.imageUrl, record?.cover)),
    ),
    publisher: toStringValue(record?.publisher),
    description: toStringValue(record?.description),
  };
}

function normalizeNoticeMeetingDetail(raw: unknown): ClubNoticeMeetingDetail | undefined {
  const record = asRecord(raw);
  if (!record) return undefined;

  return {
    meetingId: toNumberValue(record.meetingId),
    title: toStringValue(record.title),
    meetingTime: toStringValue(record.meetingTime),
    location: toStringValue(record.location),
    generation: toNumberValue(record.generation),
    tag: toStringValue(record.tag),
    content: toStringValue(record.content),
    bookInfo: normalizeBookInfo(record.bookInfo),
  };
}

function normalizeClubNoticeVoteItem(raw: unknown): ClubNoticeVoteItem | null {
  const record = asRecord(raw);
  if (!record) return null;
  const itemNumber = toNumberValue(record.itemNumber);
  if (!itemNumber) return null;

  const votedMembersRaw = Array.isArray(record.votedMembers) ? record.votedMembers : [];
  return {
    itemNumber,
    item: toStringValue(record.item) ?? '',
    voteCount: toNumberValue(record.voteCount) ?? 0,
    votedMembers: votedMembersRaw.map(normalizeBasicMemberInfo),
    isSelected: toBooleanValue(record.isSelected) ?? false,
  };
}

function normalizeClubNoticeVoteDetail(raw: unknown): ClubNoticeVoteDetail | undefined {
  const record = asRecord(raw);
  if (!record) return undefined;
  const id = toNumberValue(record.id);
  if (!id) return undefined;

  const items = Array.isArray(record.items)
    ? record.items
        .map(normalizeClubNoticeVoteItem)
        .filter((item): item is ClubNoticeVoteItem => Boolean(item))
    : [];

  return {
    id,
    title: toStringValue(record.title),
    content: toStringValue(record.content),
    anonymity: toBooleanValue(record.anonymity) ?? true,
    duplication: toBooleanValue(record.duplication) ?? false,
    startTime: toStringValue(record.startTime),
    deadline: toStringValue(record.deadline),
    items,
  };
}

function normalizeClubNoticeDetail(raw: unknown): ClubNoticeDetail | null {
  const record = asRecord(raw);
  if (!record) return null;
  const id = toNumberValue(record.id);
  if (!id) return null;

  const tagItems = normalizeClubNoticeTags(
    record.tagItems,
    record.tags,
    record.noticeTags,
    record.tag,
    record.tagItem,
    firstDefined(record.tagCode, record.type),
  );
  const primaryTag = tagItems[0];
  const authorInfo = normalizeOptionalMemberInfo(
    firstDefined(
      record.authorInfo,
      record.memberInfo,
      record.author,
      record.createdBy,
      record.writer,
    ),
  );
  const authorNickname =
    authorInfo.nickname ??
    toStringValue(
      firstDefined(
        record.authorNickname,
        record.memberNickname,
        record.nickname,
        record.createdByNickname,
        record.writerNickname,
      ),
    )?.trim();
  const imageUrls = Array.isArray(record.imageUrls)
    ? record.imageUrls
        .map((value) => normalizeRemoteImageUrl(toStringValue(value)))
        .filter((value): value is string => Boolean(value))
    : [];

  return {
    id,
    title: toStringValue(record.title) ?? '공지사항',
    content: toStringValue(record.content) ?? '',
    createdAt: toStringValue(record.createdAt),
    isPinned: toBooleanValue(record.isPinned) ?? false,
    tagCode: primaryTag?.code,
    tagDescription: primaryTag?.description,
    tagItems,
    imageUrls,
    meetingDetail: normalizeNoticeMeetingDetail(record.meetingDetail),
    voteDetail: normalizeClubNoticeVoteDetail(record.voteDetail),
    authorNickname:
      authorNickname && authorNickname.length > 0 ? authorNickname : undefined,
    authorProfileImageUrl: authorInfo.profileImageUrl,
  };
}

function normalizeClubNoticeComment(raw: unknown): ClubNoticeComment | null {
  const record = asRecord(raw);
  if (!record) return null;
  const commentId = toNumberValue(firstDefined(record.commentId, record.id));
  if (!commentId) return null;

  const authorInfo = normalizeBasicMemberInfo(firstDefined(record.authorInfo, record.memberInfo, record.author));

  return {
    commentId,
    nickname: authorInfo.nickname,
    profileImageUrl: authorInfo.profileImageUrl,
    content: toStringValue(record.content) ?? '',
    createdAt: toStringValue(record.createdAt),
    updatedAt: toStringValue(record.updatedAt),
  };
}

function normalizeClubBookshelfItem(raw: unknown): ClubBookshelfItem | null {
  const record = asRecord(raw);
  if (!record) return null;
  const meetingInfo = asRecord(record.meetingInfo);
  const bookInfo = asRecord(record.bookInfo);
  const meetingId = toNumberValue(firstDefined(meetingInfo?.meetingId, record.meetingId));
  if (!meetingId) return null;

  return {
    meetingId,
    generation: toNumberValue(firstDefined(meetingInfo?.generation, record.generation)),
    tag: toStringValue(firstDefined(meetingInfo?.tag, record.tag)),
    averageRate: toNumberValue(firstDefined(meetingInfo?.averageRate, record.averageRate)),
    bookId: toStringValue(firstDefined(bookInfo?.bookId, bookInfo?.isbn, bookInfo?.isbn13)),
    title: toStringValue(firstDefined(bookInfo?.title, record.title)),
    author: toStringValue(firstDefined(bookInfo?.author, record.author)),
    imgUrl: normalizeRemoteImageUrl(
      toStringValue(firstDefined(bookInfo?.imgUrl, bookInfo?.imageUrl, bookInfo?.cover, record.imgUrl)),
    ),
  };
}

function normalizeClubBookshelfDetail(raw: unknown): ClubBookshelfDetail | null {
  const record = asRecord(raw);
  if (!record) return null;
  const meetingInfo = asRecord(record.meetingInfo);
  const meetingId = toNumberValue(firstDefined(meetingInfo?.meetingId, record.meetingId));
  if (!meetingId) return null;

  return {
    meetingId,
    title: toStringValue(firstDefined(meetingInfo?.title, record.title)),
    meetingTime: toStringValue(firstDefined(meetingInfo?.meetingTime, record.meetingTime)),
    location: toStringValue(firstDefined(meetingInfo?.location, record.location)),
    generation: toNumberValue(firstDefined(meetingInfo?.generation, record.generation)),
    tag: toStringValue(firstDefined(meetingInfo?.tag, record.tag)),
    averageRate: toNumberValue(firstDefined(meetingInfo?.averageRate, record.averageRate)),
    content: toStringValue(firstDefined(meetingInfo?.content, record.content)),
    book: normalizeBookInfo(firstDefined(record.bookDetailInfo, record.bookInfo)),
  };
}

function normalizeClubBookshelfTopic(raw: unknown): ClubBookshelfTopic | null {
  const record = asRecord(raw);
  if (!record) return null;
  const topicId = toNumberValue(firstDefined(record.topicId, record.id));
  if (!topicId) return null;
  const authorInfo = normalizeBasicMemberInfo(firstDefined(record.authorInfo, record.author));
  return {
    topicId,
    content: toStringValue(record.content) ?? '',
    createdAt: toStringValue(record.createdAt),
    authorNickname: authorInfo.nickname,
    authorProfileImageUrl: authorInfo.profileImageUrl,
    isAuthor: toBooleanValue(record.isAuthor) ?? false,
  };
}

function normalizeClubBookshelfReview(raw: unknown): ClubBookshelfReview | null {
  const record = asRecord(raw);
  if (!record) return null;
  const bookReviewId = toNumberValue(firstDefined(record.bookReviewId, record.id));
  if (!bookReviewId) return null;
  const authorInfo = normalizeBasicMemberInfo(firstDefined(record.authorInfo, record.author));
  return {
    bookReviewId,
    description: toStringValue(firstDefined(record.description, record.content)) ?? '',
    rate: toNumberValue(firstDefined(record.rate, record.rating)) ?? 0,
    createdAt: toStringValue(record.createdAt),
    authorNickname: authorInfo.nickname,
    authorProfileImageUrl: authorInfo.profileImageUrl,
    isAuthor: toBooleanValue(record.isAuthor) ?? false,
  };
}

function normalizeTeamKey(raw: unknown): ClubMeetingTeamKey | null {
  const record = asRecord(raw);
  if (!record) return null;
  const teamId = toNumberValue(firstDefined(record.teamId, record.id));
  const teamNumber = toNumberValue(
    firstDefined(record.teamNumber, record.teamNo, record.number, record.order),
  );
  if (!teamId || !teamNumber) return null;
  return { teamId, teamNumber };
}

function normalizeMeetingMember(raw: unknown): ClubMeetingMember | null {
  const record = asRecord(raw);
  if (!record) return null;
  const clubMemberId = toNumberValue(
    firstDefined(record.clubMemberId, record.memberId, record.id),
  );
  if (!clubMemberId) return null;

  const memberInfo = normalizeBasicMemberInfo(
    firstDefined(
      record.memberInfo,
      record.authorInfo,
      record.detailInfo,
      record.member,
      record.user,
      record,
    ),
  );
  const teamKey =
    normalizeTeamKey(firstDefined(record.teamKey, record.teamInfo, record.team)) ??
    normalizeTeamKey(record);

  return {
    clubMemberId,
    nickname: memberInfo.nickname,
    profileImageUrl: memberInfo.profileImageUrl,
    teamId: teamKey?.teamId,
    teamNumber: teamKey?.teamNumber,
  };
}

function normalizeMeetingMemberList(raw: unknown): ClubMeetingMemberList {
  const record = asRecord(raw);
  const rawTeams = firstDefined(
    record?.existingTeams,
    record?.teams,
    record?.teamKeys,
    record?.teamList,
    record?.existingTeamList,
  );
  const rawMembers = firstDefined(
    record?.clubMembers,
    record?.members,
    record?.teamMembers,
    record?.teamMemberList,
    record?.clubMemberList,
  );

  const members = Array.isArray(rawMembers)
    ? rawMembers.flatMap((entry) => {
        const entryRecord = asRecord(entry);
        const groupedMembers = Array.isArray(
          firstDefined(entryRecord?.members, entryRecord?.clubMembers, entryRecord?.teamMembers),
        )
          ? (firstDefined(
              entryRecord?.members,
              entryRecord?.clubMembers,
              entryRecord?.teamMembers,
            ) as unknown[])
          : null;

        if (groupedMembers) {
          return groupedMembers
            .map((member) =>
              normalizeMeetingMember({
                ...(asRecord(member) ?? {}),
                teamKey: firstDefined(
                  asRecord(member)?.teamKey,
                  asRecord(member)?.teamInfo,
                  asRecord(member)?.team,
                  entryRecord?.teamKey,
                  entryRecord?.teamInfo,
                  entryRecord?.team,
                ),
              }),
            )
            .filter((item): item is ClubMeetingMember => Boolean(item));
        }

        const normalized = normalizeMeetingMember(entry);
        return normalized ? [normalized] : [];
      })
    : [];

  return {
    teams: Array.isArray(rawTeams)
      ? rawTeams
          .map(normalizeTeamKey)
          .filter((item): item is ClubMeetingTeamKey => Boolean(item))
      : [],
    members,
  };
}

function normalizeMeetingTopic(raw: unknown): ClubMeetingTopic | null {
  const record = asRecord(raw);
  if (!record) return null;
  const topicId = toNumberValue(firstDefined(record.topicId, record.id));
  if (!topicId) return null;
  const authorInfo = normalizeBasicMemberInfo(firstDefined(record.author, record.authorInfo, record.memberInfo));
  return {
    topicId,
    content: toStringValue(record.content) ?? '',
    createdAt: toStringValue(record.createdAt),
    authorNickname: authorInfo.nickname,
    authorProfileImageUrl: authorInfo.profileImageUrl,
    isSelected: toBooleanValue(record.isSelected) ?? false,
  };
}

function normalizeMeetingChatMessage(raw: unknown): ClubMeetingChatMessage | null {
  const record = asRecord(raw);
  if (!record) return null;
  const messageId = toNumberValue(firstDefined(record.messageId, record.id));
  if (!messageId) return null;
  const senderInfo = normalizeBasicMemberInfo(
    firstDefined(record.sender, record.authorInfo, record.memberInfo, record.author),
  );

  return {
    messageId,
    content: toStringValue(record.content) ?? '',
    sendAt: toStringValue(firstDefined(record.sendAt, record.createdAt)),
    senderNickname: senderInfo.nickname,
    senderProfileImageUrl: senderInfo.profileImageUrl,
  };
}

function normalizeMeetingChatHistory(raw: unknown): ClubMeetingChatHistory {
  const record = asRecord(raw);
  const rawChats = firstDefined(record?.chats, record?.chatList, record?.chatHistoryList);

  return {
    chats: Array.isArray(rawChats)
      ? rawChats
          .map(normalizeMeetingChatMessage)
          .filter((item): item is ClubMeetingChatMessage => Boolean(item))
      : [],
    hasNext: toBooleanValue(record?.hasNext) ?? false,
    nextCursor: toNumberValue(record?.nextCursor) ?? null,
  };
}

function normalizeMemberClubItem(raw: unknown): MyClubItem | null {
  const record = asRecord(raw);
  if (!record) return null;

  const clubId = toNumberValue(firstDefined(record.clubId, record.id));
  if (!clubId) return null;

  const clubName =
    toStringValue(firstDefined(record.clubName, record.name, record.title))?.trim() ?? '';
  if (!clubName) return null;

  return {
    clubId,
    clubName,
  };
}

function normalizeClubSearchItem(raw: unknown): ClubSearchItem | null {
  const record = asRecord(raw);
  if (!record) return null;

  const directClub = asRecord(record.club);
  if (directClub) {
    return {
      club: directClub as ClubDetailResult,
      myStatus: toClubMembershipStatus(record.myStatus),
    };
  }

  const clubInfo = asRecord(record.clubInfo);
  if (clubInfo) {
    const nestedClub = asRecord(clubInfo.club);
    if (nestedClub) {
      return {
        club: nestedClub as ClubDetailResult,
        myStatus:
          toClubMembershipStatus(clubInfo.myStatus) ??
          toClubMembershipStatus(record.myStatus),
      };
    }

    return {
      club: clubInfo as ClubDetailResult,
      myStatus:
        toClubMembershipStatus(clubInfo.myStatus) ??
        toClubMembershipStatus(record.myStatus),
    };
  }

  if ('clubId' in record || 'name' in record) {
    return {
      club: record as ClubDetailResult,
      myStatus: toClubMembershipStatus(record.myStatus),
    };
  }

  return null;
}

function normalizeClubSearchItems(rawList: unknown): ClubSearchItem[] {
  if (!Array.isArray(rawList)) return [];
  return rawList
    .map(normalizeClubSearchItem)
    .filter((item): item is ClubSearchItem => Boolean(item));
}

export async function checkClubNameDuplicate(clubName: string): Promise<boolean> {
  const response = await requestJson<ApiResponseBoolean>('/clubs/check-name', {
    method: 'GET',
    query: {
      clubName,
    },
  });

  return unwrapResult(response) ?? false;
}

export async function createClub(payload: ClubCreatePayload): Promise<void> {
  await requestJson<ApiResponseString>('/clubs', {
    method: 'POST',
    suppressErrorToast: false,
    body: payload,
  });
}

export async function fetchMemberClubs(
  memberNickname: string,
  options?: { suppressErrorToast?: boolean },
): Promise<MyClubItem[]> {
  const response = await requestJson<ApiEnvelope<unknown>>('/clubs', {
    method: 'GET',
    query: {
      memberNickname,
    },
    suppressErrorToast: options?.suppressErrorToast ?? true,
  });

  const result = asRecord(unwrapResult(response));
  const rawList = Array.isArray(result?.clubList) ? result.clubList : [];

  return rawList
    .map(normalizeMemberClubItem)
    .filter((item): item is MyClubItem => Boolean(item));
}

export async function fetchMyClubs(
  cursorId?: number,
  options?: { suppressErrorToast?: boolean },
): Promise<MyClubList> {
  const response = await requestJson<ApiResponseMyClubList>('/me/clubs', {
    method: 'GET',
    query: {
      cursorId,
    },
    suppressErrorToast: options?.suppressErrorToast ?? true,
  });

  const result = unwrapResult(response) ?? {};

  return {
    items: Array.isArray(result.clubList) ? result.clubList : [],
    hasNext: Boolean(result.hasNext),
    nextCursor: typeof result.nextCursor === 'number' ? result.nextCursor : null,
  };
}

export async function searchClubs(params: SearchClubsParams = {}): Promise<ClubSearchList> {
  const response = await requestJson<ApiResponseClubList>('/clubs/search', {
    method: 'GET',
    query: {
      keyword: params.keyword,
      inputFilter: params.inputFilter,
      outputFilter: params.outputFilter ?? 'ALL',
      cursorId: params.cursorId,
    },
  });

  const result = unwrapResult(response) ?? {};
  const rawItems =
    result.clubList ??
    result.items ??
    result.clubs ??
    result.recommendationList ??
    result.recommendedClubList ??
    result.recommendations;

  return {
    items: normalizeClubSearchItems(rawItems),
    hasNext: Boolean(result.hasNext),
    nextCursor: typeof result.nextCursor === 'number' ? result.nextCursor : null,
  };
}

export async function fetchRecommendedClubs(options?: {
  suppressErrorToast?: boolean;
}): Promise<ClubSearchList> {
  const response = await requestJson<ApiResponseClubList>('/clubs/recommendations', {
    method: 'GET',
    suppressErrorToast: options?.suppressErrorToast ?? true,
  });

  const result = unwrapResult(response) ?? {};
  const rawItems =
    result.recommendations ??
    result.clubList ??
    result.recommendationList ??
    result.recommendedClubList ??
    result.items ??
    result.clubs;

  return {
    items: normalizeClubSearchItems(rawItems),
    hasNext: false,
    nextCursor: null,
  };
}

export async function joinClub(clubId: number, joinMessage: string): Promise<void> {
  await requestJson<ApiResponseString>(`/clubs/${clubId}/join`, {
    method: 'POST',
    suppressErrorToast: false,
    body: {
      joinMessage,
    },
  });
}

export async function leaveClub(clubId: number): Promise<void> {
  await requestJson<ApiResponseString>(`/clubs/${clubId}/leave`, {
    method: 'DELETE',
    suppressErrorToast: false,
  });
}

export async function fetchClubHome(clubId: number): Promise<ClubDetailResult | undefined> {
  const response = await requestJson<ApiResponseClubDetail>(`/clubs/${clubId}/home`, {
    method: 'GET',
  });

  return unwrapResult(response);
}

export async function fetchClubDetail(clubId: number): Promise<ClubDetailResult | undefined> {
  const response = await requestJson<ApiResponseClubDetail>(`/clubs/${clubId}`, {
    method: 'GET',
  });

  return unwrapResult(response);
}

export async function deleteClub(clubId: number): Promise<void> {
  await requestJson<ApiResponseString>(`/clubs/${clubId}`, {
    method: 'DELETE',
  });
}

export async function fetchClubMyMembership(
  clubId: number,
  options?: { suppressErrorToast?: boolean },
): Promise<ClubMyMembership | null> {
  const response = await requestJson<ApiResponseClubMyMembership>(`/clubs/${clubId}/me`, {
    method: 'GET',
    suppressErrorToast: options?.suppressErrorToast ?? true,
  });

  return normalizeClubMyMembership(unwrapResult(response));
}

export async function updateClub(
  clubId: number,
  payload: ClubCreatePayload,
): Promise<void> {
  await requestJson<ApiResponseString>(`/clubs/${clubId}`, {
    method: 'PUT',
    suppressErrorToast: false,
    body: payload,
  });
}

export async function fetchClubMembers(
  clubId: number,
  status: ClubMemberQueryStatus,
  cursorId?: number,
): Promise<ClubManagedMemberList> {
  const response = await requestJson<ApiResponseManagedClubMembers>(`/clubs/${clubId}/members`, {
    method: 'GET',
    query: {
      status,
      cursorId,
    },
  });

  const result = unwrapResult(response) ?? {};
  return {
    items: Array.isArray(result.clubMembers)
      ? result.clubMembers
          .map(normalizeClubManagedMember)
          .filter((item): item is ClubManagedMember => Boolean(item))
      : [],
    hasNext: Boolean(result.hasNext),
    nextCursor: toNumberValue(result.nextCursor) ?? null,
  };
}

export async function fetchClubParticipants(
  clubId: number,
  cursorId?: number,
): Promise<ClubParticipantList> {
  const response = await requestJson<ApiResponseClubParticipants>(`/clubs/${clubId}/participants`, {
    method: 'GET',
    query: {
      cursorId,
    },
  });

  const result = unwrapResult(response) ?? {};
  return {
    items: Array.isArray(result.clubMembers)
      ? result.clubMembers
          .map(normalizeClubParticipant)
          .filter((item): item is ClubParticipant => Boolean(item))
      : [],
    totalCount: toNumberValue(result.totalCount) ?? 0,
    hasNext: Boolean(result.hasNext),
    nextCursor: toNumberValue(result.nextCursor) ?? null,
  };
}

export async function updateClubMemberStatus(
  clubId: number,
  clubMemberId: number,
  payload: ClubMemberActionPayload,
): Promise<void> {
  await requestJson<ApiResponseString>(`/clubs/${clubId}/members/${clubMemberId}`, {
    method: 'PATCH',
    suppressErrorToast: false,
    body: payload,
  });
}

export async function fetchClubNotices(clubId: number, page = 1): Promise<ClubNoticeList> {
  const response = await requestJson<ApiResponseNoticeList>(`/clubs/${clubId}/notices`, {
    method: 'GET',
    query: {
      page,
    },
  });

  const result = unwrapResult(response) ?? {};
  const normalNotices = asRecord(result.normalNotices);

  return {
    pinnedNotices: Array.isArray(result.pinnedNotices)
      ? result.pinnedNotices
          .map(normalizeClubNoticePreview)
          .filter((item): item is ClubNoticePreview => Boolean(item))
      : [],
    normalNotices: Array.isArray(normalNotices?.notices)
      ? normalNotices.notices
          .map(normalizeClubNoticePreview)
          .filter((item): item is ClubNoticePreview => Boolean(item))
      : [],
    page: toNumberValue(normalNotices?.page) ?? page,
    size: toNumberValue(normalNotices?.size) ?? 0,
    totalElements: toNumberValue(normalNotices?.totalElements) ?? 0,
    totalPages: toNumberValue(normalNotices?.totalPages) ?? 1,
    hasNext: toBooleanValue(normalNotices?.hasNext) ?? false,
  };
}

export async function fetchClubLatestNotice(
  clubId: number,
  options?: { suppressErrorToast?: boolean },
): Promise<ClubLatestNoticePreview | null> {
  try {
    const response = await requestJson<ApiEnvelope<unknown>>(`/clubs/${clubId}/notices/latest`, {
      method: 'GET',
      suppressErrorToast: options?.suppressErrorToast,
    });

    return normalizeClubLatestNoticePreview(unwrapResult(response));
  } catch (error) {
    if (error instanceof ApiError && error.status === 404) {
      return null;
    }

    throw error;
  }
}

export async function fetchClubNoticeDetail(
  clubId: number,
  noticeId: number,
): Promise<ClubNoticeDetail | null> {
  const response = await requestJson<ApiResponseNoticeDetail>(`/clubs/${clubId}/notices/${noticeId}`, {
    method: 'GET',
  });

  return normalizeClubNoticeDetail(unwrapResult(response));
}

export async function createClubNotice(
  clubId: number,
  payload: CreateClubNoticePayload,
): Promise<void> {
  await requestJson<ApiResponseString>(`/clubs/${clubId}/notices`, {
    method: 'POST',
    suppressErrorToast: false,
    body: payload,
  });
}

export async function updateClubNotice(
  clubId: number,
  noticeId: number,
  payload: UpdateClubNoticePayload,
): Promise<void> {
  await requestJson<ApiResponseString>(`/clubs/${clubId}/notices/${noticeId}`, {
    method: 'PATCH',
    suppressErrorToast: false,
    body: payload,
  });
}

export async function deleteClubNotice(clubId: number, noticeId: number): Promise<void> {
  await requestJson<ApiResponseString>(`/clubs/${clubId}/notices/${noticeId}`, {
    method: 'DELETE',
    suppressErrorToast: false,
  });
}

export async function fetchClubNoticeComments(
  clubId: number,
  noticeId: number,
  cursorId?: number,
): Promise<ClubNoticeCommentList> {
  const response = await requestJson<ApiResponseNoticeComments>(
    `/clubs/${clubId}/notices/${noticeId}/comments`,
    {
      method: 'GET',
      query: {
        cursorId,
      },
    },
  );

  const result = unwrapResult(response) ?? {};
  return {
    items: Array.isArray(result.comments)
      ? result.comments
          .map(normalizeClubNoticeComment)
          .filter((item): item is ClubNoticeComment => Boolean(item))
      : [],
    hasNext: Boolean(result.hasNext),
    nextCursor: toNumberValue(result.nextCursor) ?? null,
  };
}

export async function createClubNoticeComment(
  clubId: number,
  noticeId: number,
  payload: CreateClubNoticeCommentPayload,
): Promise<void> {
  await requestJson<ApiResponseString>(`/clubs/${clubId}/notices/${noticeId}/comments`, {
    method: 'POST',
    suppressErrorToast: false,
    body: payload,
  });
}

export async function updateClubNoticeComment(
  clubId: number,
  noticeId: number,
  commentId: number,
  payload: CreateClubNoticeCommentPayload,
): Promise<void> {
  await requestJson<ApiResponseString>(`/clubs/${clubId}/notices/${noticeId}/comments/${commentId}`, {
    method: 'PATCH',
    suppressErrorToast: false,
    body: payload,
  });
}

export async function deleteClubNoticeComment(
  clubId: number,
  noticeId: number,
  commentId: number,
): Promise<void> {
  await requestJson<ApiResponseString>(`/clubs/${clubId}/notices/${noticeId}/comments/${commentId}`, {
    method: 'DELETE',
    suppressErrorToast: false,
  });
}

export async function submitClubNoticeVote(
  clubId: number,
  noticeId: number,
  voteId: number,
  payload: SubmitClubVotePayload,
): Promise<void> {
  await requestJson<ApiResponseString>(`/clubs/${clubId}/notices/${noticeId}/votes/${voteId}`, {
    method: 'POST',
    suppressErrorToast: false,
    body: payload,
  });
}

export async function fetchClubBookshelves(
  clubId: number,
  cursorId?: number,
): Promise<ClubBookshelfList> {
  const response = await requestJson<ApiResponseBookshelfList>(`/clubs/${clubId}/bookshelves`, {
    method: 'GET',
    query: {
      cursorId,
    },
  });

  const result = unwrapResult(response) ?? {};
  return {
    items: Array.isArray(result.bookShelfInfoList)
      ? result.bookShelfInfoList
          .map(normalizeClubBookshelfItem)
          .filter((item): item is ClubBookshelfItem => Boolean(item))
      : [],
    hasNext: Boolean(result.hasNext),
    nextCursor: toNumberValue(result.nextCursor) ?? null,
    isStaff: toBooleanValue(result.isStaff) ?? false,
  };
}

export async function fetchClubBookshelfDetail(
  clubId: number,
  meetingId: number,
  options?: { suppressErrorToast?: boolean },
): Promise<ClubBookshelfDetail | null> {
  const response = await requestJson<ApiResponseBookshelfDetail>(
    `/clubs/${clubId}/bookshelves/${meetingId}`,
    {
      method: 'GET',
      suppressErrorToast: options?.suppressErrorToast,
    },
  );

  return normalizeClubBookshelfDetail(unwrapResult(response));
}

export async function fetchClubBookshelfEditInfo(
  clubId: number,
  meetingId: number,
  options?: { suppressErrorToast?: boolean },
): Promise<ClubBookshelfDetail | null> {
  const response = await requestJson<ApiResponseBookshelfDetail>(
    `/clubs/${clubId}/bookshelves/${meetingId}/edit`,
    {
      method: 'GET',
      suppressErrorToast: options?.suppressErrorToast,
    },
  );

  return normalizeClubBookshelfDetail(unwrapResult(response));
}

export async function createClubBookshelf(
  clubId: number,
  payload: CreateClubBookshelfPayload,
): Promise<void> {
  await requestJson<ApiResponseString>(`/clubs/${clubId}/bookshelves`, {
    method: 'POST',
    suppressErrorToast: false,
    body: payload,
  });
}

export async function updateClubBookshelf(
  clubId: number,
  meetingId: number,
  payload: UpdateClubBookshelfPayload,
): Promise<void> {
  await requestJson<ApiResponseString>(`/clubs/${clubId}/bookshelves/${meetingId}`, {
    method: 'PATCH',
    suppressErrorToast: false,
    body: payload,
  });
}

export async function deleteClubBookshelf(
  clubId: number,
  meetingId: number,
): Promise<void> {
  await requestJson<ApiResponseString>(`/clubs/${clubId}/bookshelves/${meetingId}`, {
    method: 'DELETE',
    suppressErrorToast: false,
  });
}

export async function fetchClubBookshelfTopics(
  clubId: number,
  meetingId: number,
  cursorId?: number,
  options?: { suppressErrorToast?: boolean },
): Promise<ClubBookshelfTopicList> {
  const response = await requestJson<ApiResponseBookshelfTopics>(
    `/clubs/${clubId}/bookshelves/${meetingId}/topics`,
    {
      method: 'GET',
      query: {
        cursorId,
      },
      suppressErrorToast: options?.suppressErrorToast,
    },
  );

  const result = unwrapResult(response) ?? {};
  return {
    items: Array.isArray(result.topicDetailList)
      ? result.topicDetailList
          .map(normalizeClubBookshelfTopic)
          .filter((item): item is ClubBookshelfTopic => Boolean(item))
      : [],
    hasNext: Boolean(result.hasNext),
    nextCursor: toNumberValue(result.nextCursor) ?? null,
  };
}

export async function fetchClubBookshelfReviews(
  clubId: number,
  meetingId: number,
  cursorId?: number,
  options?: { suppressErrorToast?: boolean },
): Promise<ClubBookshelfReviewList> {
  const response = await requestJson<ApiResponseBookshelfReviews>(
    `/clubs/${clubId}/bookshelves/${meetingId}/reviews`,
    {
      method: 'GET',
      query: {
        cursorId,
      },
      suppressErrorToast: options?.suppressErrorToast,
    },
  );

  const result = unwrapResult(response) ?? {};
  return {
    items: Array.isArray(result.bookReviewDetailList)
      ? result.bookReviewDetailList
          .map(normalizeClubBookshelfReview)
          .filter((item): item is ClubBookshelfReview => Boolean(item))
      : [],
    hasNext: Boolean(result.hasNext),
    nextCursor: toNumberValue(result.nextCursor) ?? null,
  };
}

export async function createClubBookshelfTopic(
  clubId: number,
  meetingId: number,
  payload: CreateClubBookshelfTopicPayload,
): Promise<void> {
  await requestJson<ApiResponseString>(`/clubs/${clubId}/bookshelves/${meetingId}/topics`, {
    method: 'POST',
    suppressErrorToast: false,
    body: payload,
  });
}

export async function createClubBookshelfReview(
  clubId: number,
  meetingId: number,
  payload: CreateClubBookshelfReviewPayload,
): Promise<void> {
  await requestJson<ApiResponseString>(`/clubs/${clubId}/bookshelves/${meetingId}/reviews`, {
    method: 'POST',
    suppressErrorToast: false,
    body: payload,
  });
}

export async function updateClubBookshelfTopic(
  clubId: number,
  meetingId: number,
  topicId: number,
  payload: CreateClubBookshelfTopicPayload,
): Promise<void> {
  await requestJson<ApiResponseString>(`/clubs/${clubId}/bookshelves/${meetingId}/topics/${topicId}`, {
    method: 'PATCH',
    suppressErrorToast: false,
    body: payload,
  });
}

export async function deleteClubBookshelfTopic(
  clubId: number,
  meetingId: number,
  topicId: number,
): Promise<void> {
  await requestJson<ApiResponseString>(`/clubs/${clubId}/bookshelves/${meetingId}/topics/${topicId}`, {
    method: 'DELETE',
    suppressErrorToast: false,
  });
}

export async function updateClubBookshelfReview(
  clubId: number,
  meetingId: number,
  reviewId: number,
  payload: CreateClubBookshelfReviewPayload,
): Promise<void> {
  await requestJson<ApiResponseString>(`/clubs/${clubId}/bookshelves/${meetingId}/reviews/${reviewId}`, {
    method: 'PATCH',
    suppressErrorToast: false,
    body: payload,
  });
}

export async function deleteClubBookshelfReview(
  clubId: number,
  meetingId: number,
  reviewId: number,
): Promise<void> {
  await requestJson<ApiResponseString>(`/clubs/${clubId}/bookshelves/${meetingId}/reviews/${reviewId}`, {
    method: 'DELETE',
    suppressErrorToast: false,
  });
}

export async function fetchClubMeeting(
  clubId: number,
  meetingId: number,
  options?: { suppressErrorToast?: boolean },
): Promise<ClubMeetingInfo | null> {
  const response = await requestJson<ApiResponseMeetingInfo>(`/clubs/${clubId}/meetings/${meetingId}`, {
    method: 'GET',
    suppressErrorToast: options?.suppressErrorToast,
  });

  const result = asRecord(unwrapResult(response));
  if (!result) return null;
  const meetingInfo = asRecord(
    firstDefined(result.meetingInfo, result.detailInfo, result.meeting, result.meetingDetail),
  );
  const normalizedMeetingId = toNumberValue(
    firstDefined(result.meetingId, meetingInfo?.meetingId, result.id),
  ) ?? meetingId;

  const rawTeamMembers = firstDefined(
    result.teamMembers,
    result.teamMemberList,
    result.clubMembers,
    result.clubMemberList,
    result.members,
    meetingInfo?.teamMemberList,
    meetingInfo?.teamMembers,
    meetingInfo?.clubMemberList,
    meetingInfo?.clubMembers,
    meetingInfo?.members,
  );
  const normalizedMembers = Array.isArray(rawTeamMembers)
    ? rawTeamMembers.flatMap((entry) => {
        const record = asRecord(entry);
        const groupedMembers = Array.isArray(
          firstDefined(record?.members, record?.clubMembers, record?.teamMembers),
        )
          ? (firstDefined(record?.members, record?.clubMembers, record?.teamMembers) as unknown[])
          : null;

        if (groupedMembers) {
          return groupedMembers
            .map((member) =>
              normalizeMeetingMember({
                ...(asRecord(member) ?? {}),
                teamKey: firstDefined(
                  asRecord(member)?.teamKey,
                  asRecord(member)?.teamInfo,
                  asRecord(member)?.team,
                  record?.teamKey,
                  record?.teamInfo,
                  record?.team,
                ),
              }),
            )
            .filter((item): item is ClubMeetingMember => Boolean(item));
        }

        const normalized = normalizeMeetingMember(entry);
        return normalized ? [normalized] : [];
      })
    : [];

  return {
    meetingId: normalizedMeetingId,
    title: toStringValue(firstDefined(result.title, meetingInfo?.title)),
    meetingTime: toStringValue(firstDefined(result.meetingTime, meetingInfo?.meetingTime)),
    location: toStringValue(firstDefined(result.location, meetingInfo?.location)),
    teams: Array.isArray(
      firstDefined(
        result.existingTeams,
        result.existingTeamList,
        result.teams,
        result.teamKeys,
        result.teamList,
        meetingInfo?.existingTeams,
        meetingInfo?.existingTeamList,
        meetingInfo?.teams,
        meetingInfo?.teamKeys,
      ),
    )
      ? (firstDefined(
          result.existingTeams,
          result.existingTeamList,
          result.teams,
          result.teamKeys,
          result.teamList,
          meetingInfo?.existingTeams,
          meetingInfo?.existingTeamList,
          meetingInfo?.teams,
          meetingInfo?.teamKeys,
        ) as unknown[])
          .map(normalizeTeamKey)
          .filter((item): item is ClubMeetingTeamKey => Boolean(item))
      : [],
    members: normalizedMembers,
    isStaff: toBooleanValue(firstDefined(result.isStaff, meetingInfo?.isStaff)) ?? false,
  };
}

export async function fetchClubMeetingMembers(
  clubId: number,
  meetingId: number,
  options?: { suppressErrorToast?: boolean },
): Promise<ClubMeetingMemberList> {
  const response = await requestJson<ApiResponseMeetingMemberList>(
    `/clubs/${clubId}/meetings/${meetingId}/members`,
    {
      method: 'GET',
      suppressErrorToast: options?.suppressErrorToast,
    },
  );

  return normalizeMeetingMemberList(unwrapResult(response));
}

// redirect: 'manual' 처리가 필요해 requestJson 우회. Location 헤더 직접 추출 목적.
export async function fetchClubNextMeetingRedirect(
  clubId: number,
): Promise<ClubNextMeetingRedirect | null> {
  let response: Response;

  try {
    response = await fetchApi(`/clubs/${clubId}/meetings/next`, {
      method: 'GET',
      redirect: 'manual',
      headers: {
        Accept: 'application/json',
      },
    });
  } catch (error) {
    throw new ApiError('네트워크 연결을 확인해 주십시오.', 0, 'NETWORK_ERROR', error);
  }

  const text = await response.text();
  let parsed: unknown = null;

  if (text) {
    try {
      parsed = JSON.parse(text);
    } catch {
      parsed = text;
    }
  }

  const parsedResult = unwrapResult(parsed as ApiEnvelope<unknown>);
  const resultRecord = asRecord(parsedResult);
  const locationHeader = response.headers.get('Location') ?? response.headers.get('location') ?? undefined;
  const redirectUrl = toStringValue(
    firstDefined(
      resultRecord?.redirectUrl,
      resultRecord?.url,
      locationHeader,
      response.redirected ? response.url : undefined,
    ),
  );
  const meetingId = toNumberValue(
    firstDefined(
      resultRecord?.meetingId,
      extractMeetingIdFromUrl(redirectUrl),
      extractMeetingIdFromUrl(locationHeader),
      extractMeetingIdFromUrl(response.url),
    ),
  );

  if (response.status >= 400) {
    const parsedRecord = asRecord(parsed);
    const message =
      toStringValue(parsedRecord?.message) ?? `요청에 실패했습니다. (${response.status})`;
    const code = toStringValue(parsedRecord?.code);
    throw new ApiError(message, response.status, code, parsed);
  }

  if (!meetingId && !redirectUrl) {
    return null;
  }

  return {
    meetingId,
    redirectUrl,
  };
}

export async function manageClubMeetingTeams(
  clubId: number,
  meetingId: number,
  payload: ManageClubMeetingTeamsPayload,
): Promise<void> {
  await requestJson<ApiResponseVoid>(`/clubs/${clubId}/meetings/${meetingId}/teams`, {
    method: 'PUT',
    body: payload,
  });
}

export async function fetchClubMeetingTeamTopics(
  clubId: number,
  meetingId: number,
  teamId: number,
  cursorId?: number,
  options?: { suppressErrorToast?: boolean },
): Promise<ClubMeetingTeamTopics> {
  const response = await requestJson<ApiResponseMeetingTeamTopics>(
    `/clubs/${clubId}/meetings/${meetingId}/teams/${teamId}/topics`,
    {
      method: 'GET',
      query: {
        cursorId,
      },
      suppressErrorToast: options?.suppressErrorToast,
    },
  );

  const result = asRecord(unwrapResult(response)) ?? {};
  const rawTeams = firstDefined(
    result.existingTeams,
    result.existingTeamList,
    result.teams,
    result.teamKeys,
  );
  const rawTopics = firstDefined(result.topics, result.topicList, result.topicDetailList);
  return {
    existingTeams: Array.isArray(rawTeams)
      ? rawTeams
          .map(normalizeTeamKey)
          .filter((item): item is ClubMeetingTeamKey => Boolean(item))
      : [],
    requestedTeam:
      normalizeTeamKey(
        firstDefined(result.requestedTeam, result.requestedTeamKey, result.teamKey),
      ) ?? undefined,
    topics: Array.isArray(rawTopics)
      ? rawTopics
          .map(normalizeMeetingTopic)
          .filter((item): item is ClubMeetingTopic => Boolean(item))
      : [],
    hasNext: Boolean(result.hasNext),
    nextCursor: toNumberValue(result.nextCursor) ?? null,
  };
}

export async function fetchClubMeetingTeamChatMessages(
  clubId: number,
  meetingId: number,
  teamId: number,
  cursorId?: number,
  options?: { suppressErrorToast?: boolean },
): Promise<ClubMeetingChatHistory> {
  const response = await requestJson<ApiResponseMeetingChatHistory>(
    `/clubs/${clubId}/meetings/${meetingId}/teams/${teamId}/chat/messages`,
    {
      method: 'GET',
      query: { cursorId },
      suppressErrorToast: options?.suppressErrorToast,
    },
  );

  return normalizeMeetingChatHistory(unwrapResult(response));
}
