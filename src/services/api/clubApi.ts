import { ApiEnvelope, requestJson, unwrapResult } from './http';

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

type ApiResponseBoolean = ApiEnvelope<boolean>;
type ApiResponseString = ApiEnvelope<string>;
type ApiResponseClubList = ApiEnvelope<{
  clubList?: ClubSearchItem[];
  recommendationList?: ClubSearchItem[];
  recommendedClubList?: ClubSearchItem[];
  clubs?: ClubSearchItem[];
  items?: ClubSearchItem[];
  hasNext?: boolean;
  nextCursor?: number | null;
}>;
type ApiResponseMyClubList = ApiEnvelope<{
  clubList?: MyClubItem[];
  hasNext?: boolean;
  nextCursor?: number | null;
}>;
type ApiResponseClubDetail = ApiEnvelope<ClubDetailResult>;

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
    body: payload,
  });
}

export async function fetchMyClubs(cursorId?: number): Promise<MyClubList> {
  const response = await requestJson<ApiResponseMyClubList>('/me/clubs', {
    method: 'GET',
    query: {
      cursorId,
    },
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
    result.recommendedClubList;

  return {
    items: Array.isArray(rawItems) ? rawItems : [],
    hasNext: Boolean(result.hasNext),
    nextCursor: typeof result.nextCursor === 'number' ? result.nextCursor : null,
  };
}

export async function fetchRecommendedClubs(cursorId?: number): Promise<ClubSearchList> {
  const response = await requestJson<ApiResponseClubList>('/clubs/recommendations', {
    method: 'GET',
    query: {
      cursorId,
    },
  });

  const result = unwrapResult(response) ?? {};
  const rawItems =
    result.clubList ??
    result.recommendationList ??
    result.recommendedClubList ??
    result.items ??
    result.clubs;

  return {
    items: Array.isArray(rawItems) ? rawItems : [],
    hasNext: Boolean(result.hasNext),
    nextCursor: typeof result.nextCursor === 'number' ? result.nextCursor : null,
  };
}

export async function joinClub(clubId: number, joinMessage: string): Promise<void> {
  await requestJson<ApiResponseString>(`/clubs/${clubId}/join`, {
    method: 'POST',
    body: {
      joinMessage,
    },
  });
}

export async function leaveClub(clubId: number): Promise<void> {
  await requestJson<ApiResponseString>(`/clubs/${clubId}/leave`, {
    method: 'DELETE',
  });
}

export async function fetchClubHome(clubId: number): Promise<ClubDetailResult | undefined> {
  const response = await requestJson<ApiResponseClubDetail>(`/clubs/${clubId}/home`, {
    method: 'GET',
  });

  return unwrapResult(response);
}
