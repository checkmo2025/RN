import { ApiEnvelope, ApiError, requestJson, unwrapResult } from './http';

type FollowInfo = {
  nickname?: string;
  profileImageUrl?: string;
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
  categories?: string[];
};

type RecommendedMemberResult = {
  friends?: Array<{
    nickname?: string;
    profileImageUrl?: string;
    followerCount?: number;
    followingCount?: number;
  }>;
};

type LoginStatusResult = {
  provider?: string;
  email?: string;
};

export type MyProfile = {
  nickname: string;
  description: string;
  profileImageUrl?: string;
  categories: string[];
};

export type MemberLoginStatus = {
  provider?: string;
  email?: string;
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

export type MemberReportType = 'GENERAL' | 'CLUB_MEETING' | 'BOOK_STORY' | 'COMMENT';

export type ReportMemberPayload = {
  reportedMemberNickname: string;
  reportType: MemberReportType;
  content?: string;
};

export type ReportItem = {
  reportId?: number;
  reportedMemberNickname?: string;
  reportedMemberProfileImageUrl?: string;
  reportType?: string;
  content?: string;
  createdAt?: string;
};

type ReportListResult = {
  reports?: ReportItem[];
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

export async function setFollowingMember(
  nickname: string,
  following: boolean,
): Promise<void> {
  const encodedNickname = encodeURIComponent(nickname);

  await requestJson<unknown>(`/members/${encodedNickname}/following`, {
    method: following ? 'POST' : 'DELETE',
  });
}

export async function fetchMyProfile(): Promise<MyProfile | null> {
  const response = await requestJson<ApiEnvelope<DetailInfo>>('/members/me', {
    method: 'GET',
  });
  const result = unwrapResult(response);

  if (!result) return null;

  return {
    nickname: typeof result.nickname === 'string' ? result.nickname : '',
    description: typeof result.description === 'string' ? result.description : '',
    profileImageUrl:
      typeof result.profileImageUrl === 'string' ? result.profileImageUrl : undefined,
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
    items: Array.isArray(result.followList) ? result.followList : [],
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
    items: Array.isArray(result.followList) ? result.followList : [],
    hasNext: Boolean(result.hasNext),
    nextCursor: typeof result.nextCursor === 'number' ? result.nextCursor : null,
  };
}

export async function fetchRecommendedMembers(): Promise<RecommendedMember[]> {
  const response = await requestJson<ApiEnvelope<RecommendedMemberResult>>('/members/me/recommend', {
    method: 'GET',
  });
  const result = unwrapResult(response) ?? {};
  const friends = Array.isArray(result.friends) ? result.friends : [];

  return friends.reduce<RecommendedMember[]>((acc, friend) => {
    const nickname =
      typeof friend.nickname === 'string' ? friend.nickname.trim() : '';
    if (!nickname) return acc;

    acc.push({
      nickname,
      profileImageUrl:
        typeof friend.profileImageUrl === 'string'
          ? friend.profileImageUrl
          : undefined,
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
    body: payload,
  });
  const result = unwrapResult(response);
  if (!result) return null;

  return {
    nickname: typeof result.nickname === 'string' ? result.nickname : '',
    description: typeof result.description === 'string' ? result.description : '',
    profileImageUrl:
      typeof result.profileImageUrl === 'string' ? result.profileImageUrl : undefined,
    categories: Array.isArray(result.categories)
      ? result.categories.filter((value): value is string => typeof value === 'string')
      : [],
  };
}

export async function updateMyEmail(payload: UpdateMyEmailPayload): Promise<void> {
  await requestJson<ApiEnvelope<string>>('/members/me/update-email', {
    method: 'PATCH',
    body: payload,
  });
}

export async function updateMyPassword(payload: UpdateMyPasswordPayload): Promise<void> {
  await requestJson<ApiEnvelope<string>>('/members/me/update-password', {
    method: 'PATCH',
    body: payload,
  });
}

export async function fetchMemberLoginStatus(): Promise<MemberLoginStatus | null> {
  const response = await requestJson<ApiEnvelope<LoginStatusResult>>('/members/me/login-status', {
    method: 'GET',
  });
  return unwrapResult(response) ?? null;
}

export async function reportMember(payload: ReportMemberPayload): Promise<void> {
  await requestJson<ApiEnvelope<number>>('/members/report', {
    method: 'POST',
    body: payload,
  });
}

export async function fetchMyReports(): Promise<ReportItem[]> {
  const candidatePaths = ['/members/me/reports', '/members/reports'] as const;

  for (const path of candidatePaths) {
    try {
      const response = await requestJson<ApiEnvelope<ReportListResult>>(path, {
        method: 'GET',
      });
      const result = unwrapResult(response) ?? {};
      return Array.isArray(result.reports) ? result.reports : [];
    } catch (error) {
      if (error instanceof ApiError && error.status === 404) continue;
      throw error;
    }
  }

  return [];
}
