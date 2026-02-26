import { ApiEnvelope, requestJson, unwrapResult } from './http';

type UnknownRecord = Record<string, unknown>;

type BookStoryListResult = {
  basicInfoList?: unknown[];
  bookStoryList?: unknown[];
  stories?: unknown[];
  content?: unknown[];
  items?: unknown[];
  hasNext?: boolean;
  nextCursor?: number | null;
};

type BookStoryListResponse = ApiEnvelope<BookStoryListResult | unknown[]>;
type BookStoryDetailResponse = ApiEnvelope<unknown>;

export type StoryScope = 'ALL' | 'FOLLOWING';

export type StoryBookInfo = {
  isbn?: string;
  title?: string;
  author?: string;
  imgUrl?: string;
  publisher?: string;
  description?: string;
};

export type RemoteStoryComment = {
  id: number;
  nickname: string;
  content: string;
  createdAt?: string;
  parentCommentId?: number;
  deleted: boolean;
  mine: boolean;
};

export type RemoteStoryItem = {
  id: number;
  title: string;
  description: string;
  nickname: string;
  profileImageUrl?: string;
  createdAt?: string;
  viewCount: number;
  likeCount: number;
  commentCount: number;
  liked: boolean;
  following: boolean;
  mine?: boolean;
  bookInfo?: StoryBookInfo;
};

export type RemoteStoryDetail = RemoteStoryItem & {
  mine: boolean;
  commentList: RemoteStoryComment[];
};

export type StoryFeed = {
  items: RemoteStoryItem[];
  hasNext: boolean;
  nextCursor: number | null;
};

const fallbackStoryList: StoryFeed = {
  items: [],
  hasNext: false,
  nextCursor: null,
};

function asRecord(value: unknown): UnknownRecord | null {
  return typeof value === 'object' && value !== null ? (value as UnknownRecord) : null;
}

function toNumber(value: unknown): number | undefined {
  if (typeof value === 'number' && Number.isFinite(value)) return value;
  if (typeof value === 'string') {
    const parsed = Number(value);
    if (Number.isFinite(parsed)) return parsed;
  }
  return undefined;
}

function toStringValue(value: unknown): string | undefined {
  return typeof value === 'string' ? value : undefined;
}

function toBoolean(value: unknown): boolean | undefined {
  if (typeof value === 'boolean') return value;
  return undefined;
}

function firstDefined(...values: unknown[]): unknown {
  return values.find((value) => typeof value !== 'undefined' && value !== null);
}

function normalizeBookInfo(raw: unknown): StoryBookInfo | undefined {
  const record = asRecord(raw);
  if (!record) return undefined;

  const mapped: StoryBookInfo = {
    isbn: toStringValue(firstDefined(record.isbn, record.bookId)),
    title: toStringValue(record.title),
    author: toStringValue(record.author),
    imgUrl: toStringValue(firstDefined(record.imgUrl, record.imageUrl)),
    publisher: toStringValue(record.publisher),
    description: toStringValue(firstDefined(record.description, record.content)),
  };

  if (
    !mapped.isbn &&
    !mapped.title &&
    !mapped.author &&
    !mapped.imgUrl &&
    !mapped.publisher &&
    !mapped.description
  ) {
    return undefined;
  }

  return mapped;
}

function normalizeStoryItem(raw: unknown): RemoteStoryItem | null {
  const record = asRecord(raw);
  if (!record) return null;

  const authorInfo = asRecord(firstDefined(record.authorInfo, record.memberInfo, record.author));
  const id = toNumber(
    firstDefined(record.bookStoryId, record.storyId, record.id, record.domainId, record.sourceId),
  );

  if (!id) return null;

  const nickname =
    toStringValue(
      firstDefined(
        authorInfo?.nickname,
        authorInfo?.displayName,
        record.nickname,
        record.displayName,
        record.authorName,
      ),
    ) ?? '알 수 없음';

  return {
    id,
    title:
      toStringValue(firstDefined(record.title, record.bookStoryTitle, record.storyTitle)) ??
      '제목 없음',
    description: toStringValue(firstDefined(record.description, record.content, record.body)) ?? '',
    nickname,
    profileImageUrl: toStringValue(
      firstDefined(authorInfo?.profileImageUrl, record.profileImageUrl, record.authorProfileImageUrl),
    ),
    createdAt: toStringValue(firstDefined(record.createdAt, record.updatedAt)),
    viewCount: toNumber(firstDefined(record.viewCount, record.views, record.readCount)) ?? 0,
    likeCount: toNumber(firstDefined(record.likeCount, record.likes)) ?? 0,
    commentCount: toNumber(firstDefined(record.commentCount, record.comments)) ?? 0,
    liked: toBoolean(firstDefined(record.liked, record.isLiked, record.likedByMe)) ?? false,
    following:
      toBoolean(firstDefined(authorInfo?.following, record.following, record.subscribed)) ?? false,
    mine:
      toBoolean(firstDefined(record.mine, record.isMine, record.myStory, record.ownedByMe)) ??
      undefined,
    bookInfo: normalizeBookInfo(firstDefined(record.bookInfo, record.book)),
  };
}

function normalizeStoryComment(raw: unknown): RemoteStoryComment | null {
  const record = asRecord(raw);
  if (!record) return null;

  const authorInfo = asRecord(firstDefined(record.authorInfo, record.memberInfo, record.author));
  const id = toNumber(firstDefined(record.commentId, record.id));
  if (!id) return null;

  return {
    id,
    nickname:
      toStringValue(
        firstDefined(
          authorInfo?.nickname,
          authorInfo?.displayName,
          record.nickname,
          record.displayName,
          record.authorName,
        ),
      ) ?? '알 수 없음',
    content: toStringValue(firstDefined(record.content, record.comment, record.description)) ?? '',
    createdAt: toStringValue(firstDefined(record.createdAt, record.updatedAt)),
    parentCommentId: toNumber(firstDefined(record.parentCommentId, record.parentId)),
    deleted: toBoolean(firstDefined(record.deleted, record.isDeleted)) ?? false,
    mine:
      toBoolean(firstDefined(record.mine, record.isMine, record.myComment, record.ownedByMe)) ??
      false,
  };
}

function normalizeStoryFeed(payload: unknown): StoryFeed {
  const result = unwrapResult(payload as BookStoryListResponse);

  if (Array.isArray(result)) {
    return {
      items: result.map(normalizeStoryItem).filter((item): item is RemoteStoryItem => Boolean(item)),
      hasNext: false,
      nextCursor: null,
    };
  }

  const record = asRecord(result);
  if (!record) return fallbackStoryList;

  const rawItems = firstDefined(
    record.basicInfoList,
    record.bookStoryList,
    record.stories,
    record.content,
    record.items,
  );

  const list = Array.isArray(rawItems) ? rawItems : [];

  return {
    items: list.map(normalizeStoryItem).filter((item): item is RemoteStoryItem => Boolean(item)),
    hasNext: toBoolean(record.hasNext) ?? false,
    nextCursor: toNumber(record.nextCursor) ?? null,
  };
}

function normalizeStoryDetail(payload: unknown): RemoteStoryDetail | null {
  const result = unwrapResult(payload as BookStoryDetailResponse);
  const record = asRecord(result);
  if (!record) return null;

  const source =
    asRecord(firstDefined(record.detail, record.bookStory, record.story, record.item)) ?? record;

  const item = normalizeStoryItem(source);
  if (!item) return null;

  const rawComments = firstDefined(
    source.commentInfoList,
    source.commentList,
    source.comments,
    source.commentInfos,
    record.commentInfoList,
    record.commentList,
    record.comments,
  );

  const commentList = Array.isArray(rawComments)
    ? rawComments
        .map(normalizeStoryComment)
        .filter((comment): comment is RemoteStoryComment => Boolean(comment))
    : [];

  return {
    ...item,
    mine:
      item.mine ??
      toBoolean(firstDefined(source.mine, source.isMine, source.myStory, source.ownedByMe)) ??
      false,
    commentList,
    commentCount: item.commentCount || commentList.length,
  };
}

async function fetchStoryFeedByPath(path: string, cursorId?: number): Promise<StoryFeed> {
  const response = await requestJson<BookStoryListResponse>(path, {
    method: 'GET',
    suppressErrorToast: true,
    query: {
      cursorId,
    },
  });

  return normalizeStoryFeed(response);
}

export async function fetchBookStories(scope: StoryScope, cursorId?: number): Promise<StoryFeed> {
  const path = scope === 'FOLLOWING' ? '/book-stories/following' : '/book-stories';
  return fetchStoryFeedByPath(path, cursorId);
}

export async function fetchMyBookStories(cursorId?: number): Promise<StoryFeed> {
  return fetchStoryFeedByPath('/book-stories/me', cursorId);
}

export async function fetchMemberBookStories(
  nickname: string,
  cursorId?: number,
): Promise<StoryFeed> {
  const encodedNickname = encodeURIComponent(nickname);
  return fetchStoryFeedByPath(`/book-stories/members/${encodedNickname}`, cursorId);
}

export async function fetchBookStoriesByBook(bookId: number, cursorId?: number): Promise<StoryFeed> {
  return fetchStoryFeedByPath(`/book-stories/search/${bookId}`, cursorId);
}

export async function fetchClubBookStories(clubId: number, cursorId?: number): Promise<StoryFeed> {
  return fetchStoryFeedByPath(`/book-stories/clubs/${clubId}`, cursorId);
}

export async function fetchBookStoryDetail(bookStoryId: number): Promise<RemoteStoryDetail | null> {
  const response = await requestJson<BookStoryDetailResponse>(`/book-stories/${bookStoryId}`, {
    method: 'GET',
  });

  return normalizeStoryDetail(response);
}

export async function createBookStory(payload: {
  title: string;
  description: string;
  bookInfo?: StoryBookInfo;
}): Promise<void> {
  await requestJson<unknown>('/book-stories', {
    method: 'POST',
    body: {
      title: payload.title,
      description: payload.description,
      ...(payload.bookInfo ? { bookInfo: payload.bookInfo } : {}),
    },
  });
}

export async function updateBookStory(
  bookStoryId: number,
  payload: {
    title: string;
    description: string;
    bookInfo?: StoryBookInfo;
  },
): Promise<void> {
  await requestJson<unknown>(`/book-stories/${bookStoryId}`, {
    method: 'PATCH',
    body: {
      title: payload.title,
      description: payload.description,
      ...(payload.bookInfo ? { bookInfo: payload.bookInfo } : {}),
    },
  });
}

export async function deleteBookStory(bookStoryId: number): Promise<void> {
  await requestJson<unknown>(`/book-stories/${bookStoryId}`, {
    method: 'DELETE',
  });
}

export async function toggleBookStoryLike(bookStoryId: number): Promise<void> {
  await requestJson<unknown>(`/book-stories/${bookStoryId}/like`, {
    method: 'POST',
  });
}

export async function createBookStoryComment(
  bookStoryId: number,
  content: string,
  parentCommentId?: number,
): Promise<void> {
  await requestJson<unknown>(`/book-stories/${bookStoryId}/comments`, {
    method: 'POST',
    query: {
      parentCommentId,
    },
    body: {
      content,
    },
  });
}

export async function updateBookStoryComment(
  bookStoryId: number,
  commentId: number,
  content: string,
): Promise<void> {
  await requestJson<unknown>(`/book-stories/${bookStoryId}/comments/${commentId}`, {
    method: 'PATCH',
    body: {
      content,
    },
  });
}

export async function deleteBookStoryComment(
  bookStoryId: number,
  commentId: number,
): Promise<void> {
  await requestJson<unknown>(`/book-stories/${bookStoryId}/comments/${commentId}`, {
    method: 'DELETE',
  });
}
