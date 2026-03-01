import { ApiEnvelope, requestJson, unwrapResult } from './http';
import { normalizeRemoteImageUrl } from '../../utils/image';

type UnknownRecord = Record<string, unknown>;

type BookListResult = {
  detailInfoList?: unknown[];
  items?: unknown[];
  content?: unknown[];
  hasNext?: boolean;
  currentPage?: number;
};

type BookListResponse = ApiEnvelope<BookListResult | unknown[]>;
type BookDetailResponse = ApiEnvelope<unknown>;

export type BookItem = {
  isbn: string;
  bookId?: number;
  title: string;
  author: string;
  description: string;
  imgUrl?: string;
  publisher?: string;
};

export type BookSearchResult = {
  items: BookItem[];
  hasNext: boolean;
  currentPage: number;
};

function asRecord(value: unknown): UnknownRecord | null {
  return typeof value === 'object' && value !== null ? (value as UnknownRecord) : null;
}

function firstDefined(...values: unknown[]): unknown {
  return values.find((value) => typeof value !== 'undefined' && value !== null);
}

function toStringValue(value: unknown): string | undefined {
  return typeof value === 'string' ? value : undefined;
}

function toBoolean(value: unknown): boolean | undefined {
  return typeof value === 'boolean' ? value : undefined;
}

function toNumber(value: unknown): number | undefined {
  if (typeof value === 'number' && Number.isFinite(value)) return value;
  if (typeof value === 'string') {
    const parsed = Number(value);
    if (Number.isFinite(parsed)) return parsed;
  }
  return undefined;
}

function normalizeBookItem(raw: unknown): BookItem | null {
  const record = asRecord(raw);
  if (!record) return null;

  const bookId = toNumber(firstDefined(record.bookId, record.id));
  const isbn =
    toStringValue(firstDefined(record.isbn13, record.isbn, record.bookId, record.id)) ?? '';
  const title = toStringValue(firstDefined(record.title, record.bookTitle)) ?? '';
  const author =
    toStringValue(firstDefined(record.author, record.authorName, record.writer)) ?? '';
  const description =
    toStringValue(firstDefined(record.description, record.content, record.summary)) ?? '';
  const imgUrl = normalizeRemoteImageUrl(
    toStringValue(firstDefined(record.imgUrl, record.imageUrl, record.cover, record.thumbnailUrl)),
  );
  const publisher = toStringValue(firstDefined(record.publisher, record.publisherName));

  if (!isbn && !title) return null;

  return {
    isbn: isbn || `book-${title}`,
    bookId,
    title: title || '책 제목',
    author: author || '작가 미상',
    description,
    imgUrl,
    publisher,
  };
}

function normalizeBookList(payload: unknown): BookSearchResult {
  const result = unwrapResult(payload as BookListResponse);

  if (Array.isArray(result)) {
    return {
      items: result.map(normalizeBookItem).filter((item): item is BookItem => Boolean(item)),
      hasNext: false,
      currentPage: 1,
    };
  }

  const record = asRecord(result);
  if (!record) {
    return { items: [], hasNext: false, currentPage: 1 };
  }

  const rawList = firstDefined(
    record.detailInfoList,
    record.items,
    record.content,
  );
  const list = Array.isArray(rawList) ? rawList : [];

  return {
    items: list.map(normalizeBookItem).filter((item): item is BookItem => Boolean(item)),
    hasNext: toBoolean(record.hasNext) ?? false,
    currentPage: toNumber(record.currentPage) ?? 1,
  };
}

export async function fetchRecommendedBooks(): Promise<BookItem[]> {
  const response = await requestJson<BookListResponse>('/books/recommend', {
    method: 'GET',
  });

  return normalizeBookList(response).items;
}

export async function searchBooks(keyword: string, page = 1): Promise<BookSearchResult> {
  const response = await requestJson<BookListResponse>('/books/search', {
    method: 'GET',
    query: {
      keyword,
      page,
    },
  });

  return normalizeBookList(response);
}

export async function fetchBookDetail(isbn: string): Promise<BookItem | null> {
  const response = await requestJson<BookDetailResponse>(`/books/${encodeURIComponent(isbn)}`, {
    method: 'GET',
  });
  const result = unwrapResult(response);
  return normalizeBookItem(result);
}
