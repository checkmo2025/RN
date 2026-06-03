import { ApiEnvelope, requestJson, unwrapResult } from './http';
import { normalizeRemoteImageUrl } from '../../utils/image';
import { collectAllCursorPages } from '../../utils/pagination';

type FollowInfo = {
  nickname?: string;
  profileImageUrl?: string;
  imgUrl?: string;
  imageUrl?: string;
  following?: boolean;
};

type FollowListResult = {
  followList?: FollowInfo[];
  hasNext?: boolean;
  nextCursor?: number | null;
};

type DetailInfo = {
  nickname?: string;
  description?: string;
  profileImageUrl?: string;
  imgUrl?: string;
  imageUrl?: string;
  phoneNumber?: string;
  phone?: string;
  mobilePhoneNumber?: string;
  categories?: string[];
};

type RecommendedMemberResult = {
  friends?: Array<{
    nickname?: string;
    profileImageUrl?: string;
    imgUrl?: string;
    imageUrl?: string;
    followerCount?: number;
    followingCount?: number;
  }>;
};

type FollowCountResult = {
  followerCount?: number;
  followingCount?: number;
};

export type MyProfile = {
  nickname: string;
  description: string;
  profileImageUrl?: string;
  phoneNumber?: string;
  categories: string[];
};

export type UpdateMyProfilePayload = {
  description?: string;
  imgUrl?: string;
  categories?: string[];
};

export type UpdateMyEmailPayload = {
  currentEmail: string;
  newEmail: string;
  verificationCode: string;
};

export type UpdateMyPasswordPayload = {
  currentPassword: string;
  newPassword: string;
  confirmPassword: string;
};

export type ReportTargetType =
  | 'MEMBER' | 'CLUB' | 'BOOK_STORY' | 'BOOK_STORY_COMMENT'
  | 'CLUB_NOTICE' | 'CLUB_NOTICE_COMMENT' | 'CLUB_TOPIC' | 'CLUB_BOOK_REVIEW' | 'CHAT';

export type ReportReason = 'GENERAL' | 'INSULT' | 'INAPPROPRIATE_CONTENT' | 'SPAM';

export type CreateReportPayload = {
  targetType: ReportTargetType;
  targetId: string;
  reason: ReportReason;
  content?: string;
};

export type ReportItem = {
  reportId?: number;
  targetType?: string;
  targetTypeDescription?: string;
  targetId?: string;
  targetSummary?: string;
  reason?: string;
  reasonDescription?: string;
  content?: string;
  displayName?: string;
  displayImageUrl?: string;
  reportedAt?: string;
};

type NormalizedReportListPage = {
  items: ReportItem[];
  hasNext: boolean;
  nextCursor: number | null;
};

export type FollowList = {
  items: FollowInfo[];
  hasNext: boolean;
  nextCursor: number | null;
};

export type RecommendedMember = {
  nickname: string;
  profileImageUrl?: string;
  followerCount?: number;
  followingCount?: number;
};

export type FollowCount = {
  followerCount: number;
  followingCount: number;
};

export type MemberProfile = {
  nickname: string;
  description: string;
  profileImageUrl?: string;
  followerCount?: number;
  followingCount?: number;
  following?: boolean;
  categories: string[];
};

function normalizeFollowInfo(item: FollowInfo): FollowInfo {
  return {
    ...item,
    profileImageUrl: normalizeRemoteImageUrl(
      item.profileImageUrl ?? item.imgUrl ?? item.imageUrl,
    ),
  };
}

function normalizeReportListPage(payload: unknown): NormalizedReportListPage {
  if (!payload || typeof payload !== 'object') {
    return { items: [], hasNext: false, nextCursor: null };
  }
  const record = payload as Record<string, unknown>;
  const reports = Array.isArray(record.reports) ? record.reports as ReportItem[] : [];
  return {
    items: reports,
    hasNext: Boolean(record.hasNext),
    nextCursor: typeof record.nextCursor === 'number' ? record.nextCursor : null,
  };
}

function pickPhoneNumber(payload: {
  phoneNumber?: string;
  phone?: string;
  mobilePhoneNumber?: string;
}): string | undefined {
  const candidate =
    payload.phoneNumber ?? payload.phone ?? payload.mobilePhoneNumber;
  return typeof candidate === 'string' && candidate.trim().length > 0
    ? candidate.trim()
    : undefined;
}

export async function setFollowingMember(
  nickname: string,
  following: boolean,
): Promise<void> {
  const encodedNickname = encodeURIComponent(nickname);

  await requestJson<unknown>(`/members/${encodedNickname}/following`, {
    method: following ? 'POST' : 'DELETE',
  });
}

export async function deleteFollowerMember(
  nickname: string,
): Promise<void> {
  const encodedNickname = encodeURIComponent(nickname);

  await requestJson<unknown>(`/members/${encodedNickname}/follower`, {
    method: 'DELETE',
  });
}

export async function fetchMyProfile(options?: {
  suppressErrorToast?: boolean;
}): Promise<MyProfile | null> {
  const response = await requestJson<ApiEnvelope<DetailInfo>>('/members/me', {
    method: 'GET',
    suppressErrorToast: options?.suppressErrorToast ?? true,
  });
  const result = unwrapResult(response);

  if (!result) return null;

  return {
    nickname: typeof result.nickname === 'string' ? result.nickname : '',
    description: typeof result.description === 'string' ? result.description : '',
    profileImageUrl: normalizeRemoteImageUrl(
      result.profileImageUrl ?? result.imgUrl ?? result.imageUrl,
    ),
    phoneNumber: pickPhoneNumber(result),
    categories: Array.isArray(result.categories)
      ? result.categories.filter((value): value is string => typeof value === 'string')
      : [],
  };
}

export async function fetchMemberProfile(nickname: string): Promise<MemberProfile | null> {
  const encodedNickname = encodeURIComponent(nickname);
  const response = await requestJson<ApiEnvelope<DetailInfo & FollowInfo & {
    followerCount?: number;
    followingCount?: number;
    subscribed?: boolean;
    isFollowing?: boolean;
  }>>(`/members/${encodedNickname}`, {
    method: 'GET',
  });
  const result = unwrapResult(response);

  if (!result) return null;

  return {
    nickname: typeof result.nickname === 'string' ? result.nickname : '',
    description: typeof result.description === 'string' ? result.description : '',
    profileImageUrl: normalizeRemoteImageUrl(
      result.profileImageUrl ?? result.imgUrl ?? result.imageUrl,
    ),
    followerCount:
      typeof result.followerCount === 'number' ? result.followerCount : undefined,
    followingCount:
      typeof result.followingCount === 'number' ? result.followingCount : undefined,
    following:
      typeof result.following === 'boolean'
        ? result.following
        : typeof result.isFollowing === 'boolean'
          ? result.isFollowing
          : typeof result.subscribed === 'boolean'
            ? result.subscribed
            : undefined,
    categories: Array.isArray(result.categories)
      ? result.categories.filter((value): value is string => typeof value === 'string')
      : [],
  };
}

export async function fetchMyFollowers(cursorId?: number): Promise<FollowList> {
  const response = await requestJson<ApiEnvelope<FollowListResult>>('/members/me/follower', {
    method: 'GET',
    query: {
      cursorId,
    },
  });
  const result = unwrapResult(response) ?? {};

  return {
    items: Array.isArray(result.followList) ? result.followList.map(normalizeFollowInfo) : [],
    hasNext: Boolean(result.hasNext),
    nextCursor: typeof result.nextCursor === 'number' ? result.nextCursor : null,
  };
}

export async function fetchMyFollowing(cursorId?: number): Promise<FollowList> {
  const response = await requestJson<ApiEnvelope<FollowListResult>>('/members/me/following', {
    method: 'GET',
    query: {
      cursorId,
    },
  });
  const result = unwrapResult(response) ?? {};

  return {
    items: Array.isArray(result.followList) ? result.followList.map(normalizeFollowInfo) : [],
    hasNext: Boolean(result.hasNext),
    nextCursor: typeof result.nextCursor === 'number' ? result.nextCursor : null,
  };
}

export async function fetchMyFollowCount(): Promise<FollowCount> {
  const response = await requestJson<ApiEnvelope<FollowCountResult>>('/members/me/follow-count', {
    method: 'GET',
  });
  const result = unwrapResult(response) ?? {};

  return {
    followerCount: typeof result.followerCount === 'number' ? result.followerCount : 0,
    followingCount: typeof result.followingCount === 'number' ? result.followingCount : 0,
  };
}

export async function fetchMemberFollowers(nickname: string, cursorId?: number): Promise<FollowList> {
  const encodedNickname = encodeURIComponent(nickname);
  const response = await requestJson<ApiEnvelope<FollowListResult>>(
    `/members/${encodedNickname}/followers`,
    {
      method: 'GET',
      query: {
        cursorId,
      },
    },
  );
  const result = unwrapResult(response) ?? {};

  return {
    items: Array.isArray(result.followList) ? result.followList.map(normalizeFollowInfo) : [],
    hasNext: Boolean(result.hasNext),
    nextCursor: typeof result.nextCursor === 'number' ? result.nextCursor : null,
  };
}

export async function fetchMemberFollowings(nickname: string, cursorId?: number): Promise<FollowList> {
  const encodedNickname = encodeURIComponent(nickname);
  const response = await requestJson<ApiEnvelope<FollowListResult>>(
    `/members/${encodedNickname}/followings`,
    {
      method: 'GET',
      query: {
        cursorId,
      },
    },
  );
  const result = unwrapResult(response) ?? {};

  return {
    items: Array.isArray(result.followList) ? result.followList.map(normalizeFollowInfo) : [],
    hasNext: Boolean(result.hasNext),
    nextCursor: typeof result.nextCursor === 'number' ? result.nextCursor : null,
  };
}

export async function fetchRecommendedMembers(options?: {
  suppressErrorToast?: boolean;
}): Promise<RecommendedMember[]> {
  const response = await requestJson<ApiEnvelope<RecommendedMemberResult>>('/members/me/recommend', {
    method: 'GET',
    suppressErrorToast: options?.suppressErrorToast ?? true,
  });
  const result = unwrapResult(response) ?? {};
  const friends = Array.isArray(result.friends) ? result.friends : [];

  return friends.reduce<RecommendedMember[]>((acc, friend) => {
    const nickname =
      typeof friend.nickname === 'string' ? friend.nickname.trim() : '';
    if (!nickname) return acc;

    acc.push({
      nickname,
      profileImageUrl: normalizeRemoteImageUrl(
        friend.profileImageUrl ?? friend.imgUrl ?? friend.imageUrl,
      ),
      followerCount:
        typeof friend.followerCount === 'number' ? friend.followerCount : undefined,
      followingCount:
        typeof friend.followingCount === 'number' ? friend.followingCount : undefined,
    });
    return acc;
  }, []);
}

export async function updateMyProfile(payload: UpdateMyProfilePayload): Promise<MyProfile | null> {
  const response = await requestJson<ApiEnvelope<DetailInfo>>('/members/me', {
    method: 'PATCH',
    suppressErrorToast: false,
    body: payload,
  });
  const result = unwrapResult(response);
  if (!result) return null;

  return {
    nickname: typeof result.nickname === 'string' ? result.nickname : '',
    description: typeof result.description === 'string' ? result.description : '',
    profileImageUrl: normalizeRemoteImageUrl(
      result.profileImageUrl ?? result.imgUrl ?? result.imageUrl,
    ),
    phoneNumber: pickPhoneNumber(result),
    categories: Array.isArray(result.categories)
      ? result.categories.filter((value): value is string => typeof value === 'string')
      : [],
  };
}

export async function updateMyEmail(payload: UpdateMyEmailPayload): Promise<void> {
  await requestJson<ApiEnvelope<string>>('/members/me/update-email', {
    method: 'PATCH',
    suppressErrorToast: false,
    body: payload,
  });
}

export async function updateMyPassword(payload: UpdateMyPasswordPayload): Promise<void> {
  await requestJson<ApiEnvelope<string>>('/members/me/update-password', {
    method: 'PATCH',
    suppressErrorToast: false,
    body: payload,
  });
}

export async function createReport(payload: CreateReportPayload): Promise<void> {
  await requestJson<ApiEnvelope<number>>('/reports', {
    method: 'POST',
    suppressErrorToast: false,
    body: payload,
  });
}

export async function withdrawMember(): Promise<void> {
  await requestJson<ApiEnvelope<void>>('/members/withdrawal', {
    method: 'POST',
    suppressErrorToast: false,
  });
}

export async function fetchMyReports(): Promise<ReportItem[]> {
  return collectAllCursorPages({
    fetchPage: async (cursor) => {
      const response = await requestJson<ApiEnvelope<unknown>>('/reports/me', {
        method: 'GET',
        query: { cursorId: cursor },
      });
      return normalizeReportListPage(unwrapResult(response));
    },
    dedupeId: (item) => [
      typeof item.reportId === 'number' ? `id:${item.reportId}` : 'no-id',
      item.targetId ?? '',
      item.reason ?? '',
      item.reportedAt ?? '',
    ].join('|'),
  });
}

export type BlockedMember = {
  memberId: number;
  nickname: string;
  profileImageUrl?: string;
};

type BlockListPayload = {
  blocks?: unknown[];
  hasNext?: boolean;
  nextCursor?: number | null;
};

function normalizeBlockedMember(raw: unknown): BlockedMember | null {
  if (!raw || typeof raw !== 'object') return null;
  const r = raw as Record<string, unknown>;
  const memberId = typeof r.memberId === 'number' ? r.memberId : 0;
  const nickname = typeof r.nickname === 'string' ? r.nickname : '';
  if (!nickname) return null;
  return {
    memberId,
    nickname,
    profileImageUrl: normalizeRemoteImageUrl(typeof r.profileImageUrl === 'string' ? r.profileImageUrl : undefined),
  };
}

export async function fetchBlockedMembers(cursorId?: number): Promise<{
  items: BlockedMember[];
  hasNext: boolean;
  nextCursor: number | null;
}> {
  const response = await requestJson<ApiEnvelope<BlockListPayload>>('/members/me/blocks', {
    method: 'GET',
    query: { cursorId },
  });
  const result = unwrapResult(response) as BlockListPayload ?? {};
  const raw = Array.isArray(result.blocks) ? result.blocks : [];
  return {
    items: raw.map(normalizeBlockedMember).filter((x): x is BlockedMember => x !== null),
    hasNext: result.hasNext ?? false,
    nextCursor: result.nextCursor ?? null,
  };
}

export async function blockMember(nickname: string): Promise<void> {
  await requestJson<ApiEnvelope<void>>(`/members/${encodeURIComponent(nickname)}/block`, {
    method: 'POST',
    suppressErrorToast: false,
  });
}

export async function unblockMember(nickname: string): Promise<void> {
  await requestJson<ApiEnvelope<void>>(`/members/${encodeURIComponent(nickname)}/block`, {
    method: 'DELETE',
    suppressErrorToast: false,
  });
}
