import type { MaterialIcons } from '@expo/vector-icons';
import type { ClubContact, ClubMembershipStatus } from '../../services/api/clubApi';

export type Group = {
  id: string;
  clubId?: number;
  name: string;
  profileImageUrl?: string;
  links?: ClubContact[];
  tags: string[];
  topic: string;
  region: string;
  membershipStatus?: ClubMembershipStatus;
  applicationStatus?: string;
  description?: string;
  notice?: string;
  nextSession?: string;
  isPrivate?: boolean;
};

export type CreateStep = 1 | 2 | 3 | 4;

export type NoticeTag = 'PIN' | 'VOTE' | 'MEETING';

export type NoticeBookshelfAttachment = {
  id: string;
  remoteMeetingId?: number;
  session: string;
  title: string;
  author: string;
  category: string;
  coverImage: string;
  rating: number;
};

export type NoticeItem = {
  id: string;
  remoteId?: number;
  title: string;
  date: string;
  tags: NoticeTag[];
  category: '일반' | '모임' | '투표';
  content: string;
  authorNickname?: string;
  authorProfileImageUrl?: string;
  bookshelf?: NoticeBookshelfAttachment;
  poll?: NoticePoll;
  photos?: string[];
  isPinned?: boolean;
};

export type NoticeComment = {
  id: string;
  remoteId?: number;
  author: string;
  authorProfileImageUrl?: string;
  date: string;
  content: string;
  mine?: boolean;
  isAuthor?: boolean;
};

export type CursorPageState = {
  hasNext: boolean;
  nextCursor: number | null;
  loadingMore: boolean;
};

export type BookshelfItem = {
  id: string;
  remoteMeetingId?: number;
  regularMeetingId?: number;
  bookId?: string;
  generation?: number;
  session: string;
  title: string;
  author: string;
  category: string;
  coverImage: string;
  rating: number;
  regularMeetingName?: string;
  meetingLocation?: string;
  meetingDate?: string;
};

export type BookshelfDetailTab = 'TOPIC' | 'REVIEW' | 'REGULAR';
export type BookshelfViewMode = 'GRID' | 'DETAIL' | 'REGULAR_GROUP';

export type BookshelfPostItem = {
  id: string;
  remoteId: number;
  type: 'TOPIC' | 'REVIEW';
  author: string;
  content: string;
  rating?: number;
  createdAt?: string;
  authorProfileImageUrl?: string;
  isAuthor?: boolean;
};

export type NoticeCommentMenuState = {
  comment: NoticeComment;
  pageX: number;
  pageY: number;
};

export type BookshelfPostMenuState = {
  post: BookshelfPostItem;
  pageX: number;
  pageY: number;
};

export type RegularGroupPostItem = {
  id: string;
  remoteTopicId?: number;
  author: string;
  authorProfileImageUrl?: string;
  content: string;
  completed: boolean;
};

export type RegularGroupMemberItem = {
  id: string;
  nickname: string;
  profileImageUrl?: string;
};

export type RegularGroupChatMessage = {
  id: string;
  author: string;
  content: string;
  time: string;
  mine?: boolean;
};

export type RegularMeetingGroupItem = {
  id: string;
  teamId?: number;
  label: string;
  memberCount: number;
  members: RegularGroupMemberItem[];
  posts: RegularGroupPostItem[];
  chatMessages: RegularGroupChatMessage[];
};

export type RegularMeetingInfo = {
  id: string;
  name: string;
  date: string;
  location: string;
  groups: RegularMeetingGroupItem[];
};

export type TeamManageMemberItem = {
  clubMemberId: number;
  nickname: string;
  profileImageUrl?: string;
};

export type TeamManageTeamItem = {
  teamNumber: number;
  memberIds: number[];
};

export type GroupManagementScreen = 'JOIN_REQUESTS' | 'MEMBERS' | 'EDIT' | 'BOOKSHELF_CREATE';

export type GroupJoinRequestItem = {
  id: string;
  clubMemberId?: number;
  nickname: string;
  profileImageUrl?: string;
  name: string;
  email: string;
  appliedAt: string;
  message: string;
};

export type GroupMemberRole = '개설자' | '운영진' | '회원';

export type GroupMemberItem = {
  id: string;
  clubMemberId?: number;
  nickname: string;
  profileImageUrl?: string;
  name: string;
  email: string;
  joinedAt: string;
  role: GroupMemberRole;
};

export type GroupEditDraft = {
  name: string;
  description: string;
  region: string;
  categories: string[];
  targets: string[];
  isPrivate: boolean;
  imageUrl: string;
};

export type BookshelfCreateDraft = {
  sourceBook: {
    isbn: string;
    title: string;
    author: string;
    coverImage?: string;
    publisher?: string;
    description?: string;
  } | null;
  session: string;
  categories: string[];
  regularMeetingName: string;
  meetingLocation: string;
  meetingDate: string;
};

export type ClubProfileMode = 'empty' | 'default' | 'uploaded';

export type NoticePollOption = {
  id: string;
  label: string;
  voters: string[];
};

export type NoticePoll = {
  startsAt: string;
  endsAt: string;
  endsAtMillis: number | null;
  allowDuplicate: boolean;
  anonymous: boolean;
  closed?: boolean;
  options: NoticePollOption[];
};

export type NoticeDraft = {
  title: string;
  content: string;
  isPinned: boolean;
  bookshelfEnabled: boolean;
  bookshelfId: string | null;
  pollEnabled: boolean;
  pollAnonymous: boolean;
  pollAllowDuplicate: boolean;
  pollStartsAt: string;
  pollEndsAt: string;
  pollOptions: string[];
  photos: string[];
};

export type StarIconName = keyof typeof MaterialIcons.glyphMap;

export const inputFilters = ['모임별', '지역별'] as const;
export type MeetingInputFilter = (typeof inputFilters)[number];

export type WorkspaceSnapshot = {
  managedGroup: Group;
  canManageClub: boolean;
  latestNoticeId: number | null;
  bookshelfItems: BookshelfItem[];
  noticeItems: NoticeItem[];
  editDraftPatch: Partial<GroupEditDraft>;
  joinRequests: GroupJoinRequestItem[];
  members: GroupMemberItem[];
};
