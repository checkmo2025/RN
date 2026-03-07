import { ApiEnvelope, requestJson, unwrapResult } from './http';
import { normalizeRemoteImageUrl } from '../../utils/image';

type UnknownRecord = Record<string, unknown>;
type ViewerContextOptions = {
  viewerAuthenticated?: boolean;
};

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
  profileImageUrl?: string;
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

let guestAllFirstPageCache: StoryFeed | null = null;
let guestAllFirstPagePending: Promise<StoryFeed> | null = null;

function cloneStoryFeed(feed: StoryFeed): StoryFeed {
  return {
    items: [...feed.items],
    hasNext: feed.hasNext,
    nextCursor: feed.nextCursor,
  };
}

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
    isbn: toStringValue(firstDefined(record.isbn, record.bookId, record.isbn13, record.bookIsbn)),
    title: toStringValue(firstDefined(record.title, record.bookTitle)),
    author: toStringValue(firstDefined(record.author, record.bookAuthor)),
    imgUrl: normalizeRemoteImageUrl(
      toStringValue(
        firstDefined(
          record.imgUrl,
          record.imageUrl,
          record.image,
          record.cover,
          record.coverImage,
          record.coverImgSrc,
          record.thumbnailUrl,
          record.thumbnail,
          record.thumbUrl,
          record.bookImageUrl,
          record.bookImgUrl,
        ),
      ),
    ),
    publisher: toStringValue(firstDefined(record.publisher, record.bookPublisher)),
    description: toStringValue(
      firstDefined(record.description, record.content, record.bookDetail, record.bookDescription),
    ),
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

function extractStoryBookInfo(record: UnknownRecord): StoryBookInfo | undefined {
  const nestedBookInfo = normalizeBookInfo(
    firstDefined(record.bookInfo, record.book, record.bookDetailInfo, record.bookData, record.bookResponse),
  );
  if (nestedBookInfo) return nestedBookInfo;

  return normalizeBookInfo({
    bookId: firstDefined(record.bookId, record.isbn, record.isbn13, record.bookIsbn),
    title: record.bookTitle,
    author: record.bookAuthor,
    description: firstDefined(record.bookDetail, record.bookDescription),
    publisher: record.bookPublisher,
    bookImageUrl: firstDefined(
      record.bookImageUrl,
      record.bookImgUrl,
      record.bookThumbnailUrl,
      record.bookThumbUrl,
      record.coverImgSrc,
      record.coverImage,
    ),
  });
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
    profileImageUrl: normalizeRemoteImageUrl(
      toStringValue(
        firstDefined(
          authorInfo?.profileImageUrl,
          authorInfo?.profileImgUrl,
          authorInfo?.imgUrl,
          authorInfo?.imageUrl,
          record.profileImageUrl,
          record.profileImgUrl,
          record.memberProfileImageUrl,
          record.authorProfileImageUrl,
          record.imageUrl,
          record.imgUrl,
        ),
      ),
    ),
    createdAt: toStringValue(firstDefined(record.createdAt, record.updatedAt)),
    viewCount: toNumber(firstDefined(record.viewCount, record.views, record.readCount)) ?? 0,
    likeCount: toNumber(firstDefined(record.likeCount, record.likes)) ?? 0,
    commentCount: toNumber(firstDefined(record.commentCount, record.comments)) ?? 0,
    liked: toBoolean(firstDefined(record.liked, record.isLiked, record.likedByMe)) ?? false,
    following:
      toBoolean(firstDefined(authorInfo?.following, record.following, record.subscribed)) ?? false,
    mine:
      toBoolean(
        firstDefined(record.mine, record.isMine, record.myStory, record.ownedByMe, record.writtenByMe),
      ) ??
      undefined,
    bookInfo: extractStoryBookInfo(record),
  };
}

function applyViewerContextToStoryItem(
  item: RemoteStoryItem,
  viewerAuthenticated: boolean,
): RemoteStoryItem {
  if (viewerAuthenticated) return item;
  return {
    ...item,
    liked: false,
    following: false,
    mine: false,
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
    profileImageUrl: normalizeRemoteImageUrl(
      toStringValue(
        firstDefined(
          authorInfo?.profileImageUrl,
          authorInfo?.profileImgUrl,
          authorInfo?.imgUrl,
          authorInfo?.imageUrl,
          record.profileImageUrl,
          record.profileImgUrl,
          record.memberProfileImageUrl,
          record.authorProfileImageUrl,
          record.imageUrl,
          record.imgUrl,
        ),
      ),
    ),
    content: toStringValue(firstDefined(record.content, record.comment, record.description)) ?? '',
    createdAt: toStringValue(firstDefined(record.createdAt, record.updatedAt)),
    parentCommentId: toNumber(firstDefined(record.parentCommentId, record.parentId)),
    deleted: toBoolean(firstDefined(record.deleted, record.isDeleted)) ?? false,
    mine:
      toBoolean(
        firstDefined(record.mine, record.isMine, record.myComment, record.ownedByMe, record.writtenByMe),
      ) ??
      false,
  };
}

function applyViewerContextToStoryComment(
  comment: RemoteStoryComment,
  viewerAuthenticated: boolean,
): RemoteStoryComment {
  if (viewerAuthenticated) return comment;
  return {
    ...comment,
    mine: false,
  };
}

function normalizeStoryFeed(payload: unknown, viewerAuthenticated = true): StoryFeed {
  const result = unwrapResult(payload as BookStoryListResponse);

  if (Array.isArray(result)) {
    return {
      items: result
        .map(normalizeStoryItem)
        .filter((item): item is RemoteStoryItem => Boolean(item))
        .map((item) => applyViewerContextToStoryItem(item, viewerAuthenticated)),
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
    items: list
      .map(normalizeStoryItem)
      .filter((item): item is RemoteStoryItem => Boolean(item))
      .map((item) => applyViewerContextToStoryItem(item, viewerAuthenticated)),
    hasNext: toBoolean(record.hasNext) ?? false,
    nextCursor: toNumber(record.nextCursor) ?? null,
  };
}

function normalizeStoryDetail(payload: unknown, viewerAuthenticated = true): RemoteStoryDetail | null {
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
        .map((comment) => applyViewerContextToStoryComment(comment, viewerAuthenticated))
    : [];

  return applyViewerContextToStoryDetail(
    {
      ...item,
      mine:
        item.mine ??
        toBoolean(
          firstDefined(
            source.mine,
            source.isMine,
            source.myStory,
            source.ownedByMe,
            source.writtenByMe,
          ),
        ) ??
        false,
      commentList,
      commentCount: item.commentCount || commentList.length,
    },
    viewerAuthenticated,
  );
}

function applyViewerContextToStoryDetail(
  detail: RemoteStoryDetail,
  viewerAuthenticated: boolean,
): RemoteStoryDetail {
  if (viewerAuthenticated) return detail;
  return {
    ...detail,
    liked: false,
    following: false,
    mine: false,
    commentList: detail.commentList.map((comment) =>
      applyViewerContextToStoryComment(comment, viewerAuthenticated),
    ),
  };
}

async function fetchStoryFeedByPath(
  path: string,
  cursorId?: number,
  options: ViewerContextOptions = {},
): Promise<StoryFeed> {
  const response = await requestJson<BookStoryListResponse>(path, {
    method: 'GET',
    suppressErrorToast: true,
    query: {
      cursorId,
    },
  });

  return normalizeStoryFeed(response, options.viewerAuthenticated ?? true);
}

export async function fetchBookStories(
  scope: StoryScope,
  cursorId?: number,
  options?: ViewerContextOptions,
): Promise<StoryFeed> {
  const path = scope === 'FOLLOWING' ? '/book-stories/following' : '/book-stories';
  return fetchStoryFeedByPath(path, cursorId, options);
}

export async function fetchGuestAllBookStories(options?: {
  forceRefresh?: boolean;
}): Promise<StoryFeed> {
  const forceRefresh = options?.forceRefresh ?? false;

  if (!forceRefresh && guestAllFirstPageCache) {
    return cloneStoryFeed(guestAllFirstPageCache);
  }

  if (!forceRefresh && guestAllFirstPagePending) {
    const pending = await guestAllFirstPagePending;
    return cloneStoryFeed(pending);
  }

  const requestPromise = fetchStoryFeedByPath('/book-stories', undefined, {
    viewerAuthenticated: false,
  })
    .then((feed) => {
      guestAllFirstPageCache = cloneStoryFeed(feed);
      return cloneStoryFeed(feed);
    })
    .finally(() => {
      guestAllFirstPagePending = null;
    });

  guestAllFirstPagePending = requestPromise;

  return requestPromise;
}

export function mergeGuestAllBookStoriesCache(feed: StoryFeed): StoryFeed {
  const previousItems = guestAllFirstPageCache?.items ?? [];
  const existingIds = new Set(previousItems.map((item) => item.id));
  const sanitizedItems = feed.items.map((item) => applyViewerContextToStoryItem(item, false));
  const nextItems = [
    ...previousItems,
    ...sanitizedItems.filter((item) => !existingIds.has(item.id)),
  ];

  guestAllFirstPageCache = {
    items: nextItems,
    hasNext: feed.hasNext,
    nextCursor: feed.nextCursor,
  };

  return cloneStoryFeed(guestAllFirstPageCache);
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

export async function fetchBookStoriesByBook(
  bookId: number,
  cursorId?: number,
  options?: ViewerContextOptions,
): Promise<StoryFeed> {
  return fetchStoryFeedByPath(`/book-stories/search/${bookId}`, cursorId, options);
}

export async function fetchClubBookStories(clubId: number, cursorId?: number): Promise<StoryFeed> {
  return fetchStoryFeedByPath(`/book-stories/clubs/${clubId}`, cursorId);
}

export async function fetchBookStoryDetail(
  bookStoryId: number,
  options?: ViewerContextOptions,
): Promise<RemoteStoryDetail | null> {
  const response = await requestJson<BookStoryDetailResponse>(`/book-stories/${bookStoryId}`, {
    method: 'GET',
  });

  return normalizeStoryDetail(response, options?.viewerAuthenticated ?? true);
}

export async function createBookStory(payload: {
  isbn: string;
  title: string;
  description: string;
}): Promise<void> {
  await requestJson<unknown>('/book-stories', {
    method: 'POST',
    body: {
      isbn: payload.isbn,
      title: payload.title,
      description: payload.description,
    },
  });
}

export async function updateBookStory(
  bookStoryId: number,
  payload: {
    description: string;
  },
): Promise<void> {
  await requestJson<unknown>(`/book-stories/${bookStoryId}`, {
    method: 'PATCH',
    body: {
      description: payload.description,
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
