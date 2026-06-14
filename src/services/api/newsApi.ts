import { ApiEnvelope, requestJson, unwrapResult } from './http';

type UnknownRecord = Record<string, unknown>;

type NewsListResult = {
  basicInfoList?: unknown[];
  newsList?: unknown[];
  content?: unknown[];
  items?: unknown[];
};

type NewsListResponse = ApiEnvelope<NewsListResult | unknown[]>;
type NewsDetailResponse = ApiEnvelope<unknown>;

export type NewsCarouselType = 'PROMOTION' | 'GENERAL';

export type RemoteNewsSummary = {
  id: number;
  title: string;
  excerpt: string;
  thumbnailUrl?: string;
  date?: string;
  originalLink?: string;
  carousel?: NewsCarouselType;
};

export type RemoteNewsDetail = RemoteNewsSummary & {
  content: string;
  imageUrls: string[];
};

export type RemoteNewsSummaryList = {
  items: RemoteNewsSummary[];
  hasNext: boolean;
  nextCursor: number | null;
  pageSize?: number;
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

function firstDefined(...values: unknown[]): unknown {
  return values.find((value) => typeof value !== 'undefined' && value !== null);
}

function normalizeNewsSummary(raw: unknown): RemoteNewsSummary | null {
  const record = asRecord(raw);
  if (!record) return null;

  const id = toNumber(firstDefined(record.newsId, record.id));
  if (!id) return null;

  const title = toStringValue(record.title)?.trim() ?? '';
  if (!title) return null;

  const excerpt =
    toStringValue(firstDefined(record.summary, record.excerpt, record.description, record.content)) ??
    '';

  const carouselRaw = toStringValue(record.carousel);
  const carousel: NewsCarouselType | undefined =
    carouselRaw === 'PROMOTION' || carouselRaw === 'GENERAL' ? carouselRaw : undefined;

  return {
    id,
    title,
    excerpt,
    thumbnailUrl: toStringValue(firstDefined(record.thumbnailUrl, record.thumbUrl, record.imageUrl)),
    date: toStringValue(firstDefined(record.publishStartAt, record.createdAt, record.date)),
    originalLink: toStringValue(firstDefined(record.originalLink, record.link)),
    carousel,
  };
}

function normalizeNewsDetail(raw: unknown): RemoteNewsDetail | null {
  const record = asRecord(raw);
  if (!record) return null;

  const summary = normalizeNewsSummary(record);
  if (!summary) return null;

  const imageUrlsRaw = firstDefined(record.imageUrls, record.images);
  const imageUrls = Array.isArray(imageUrlsRaw)
    ? imageUrlsRaw.filter((value): value is string => typeof value === 'string')
    : [];

  const content =
    toStringValue(firstDefined(record.content, record.description, record.summary)) ?? '';

  return {
    ...summary,
    content,
    imageUrls,
  };
}

function normalizeNewsListResult(payload: unknown): RemoteNewsSummaryList {
  const result = unwrapResult(payload as NewsListResponse);
  const resultRecord = asRecord(result);

  const list = Array.isArray(result)
    ? result
    : Array.isArray(resultRecord?.basicInfoList)
      ? (resultRecord.basicInfoList as unknown[])
      : Array.isArray(resultRecord?.newsList)
        ? (resultRecord.newsList as unknown[])
        : Array.isArray(resultRecord?.content)
          ? (resultRecord.content as unknown[])
          : Array.isArray(resultRecord?.items)
            ? (resultRecord.items as unknown[])
            : [];

  return {
    items: list
      .map(normalizeNewsSummary)
      .filter((item): item is RemoteNewsSummary => Boolean(item)),
    hasNext: typeof resultRecord?.hasNext === 'boolean' ? resultRecord.hasNext : false,
    nextCursor: toNumber(resultRecord?.nextCursor) ?? null,
    pageSize: toNumber(resultRecord?.pageSize),
  };
}

export async function fetchNewsList(cursorId?: number): Promise<RemoteNewsSummaryList> {
  const response = await requestJson<NewsListResponse>('/news', {
    method: 'GET',
    query: {
      cursorId,
    },
  });
  return normalizeNewsListResult(response);
}

export async function fetchMyNewsList(cursorId?: number): Promise<RemoteNewsSummaryList> {
  const response = await requestJson<NewsListResponse>('/news/me', {
    method: 'GET',
    query: {
      cursorId,
    },
  });
  return normalizeNewsListResult(response);
}

export async function fetchNewsDetail(newsId: number): Promise<RemoteNewsDetail | null> {
  const response = await requestJson<NewsDetailResponse>(`/news/${newsId}`, {
    method: 'GET',
  });
  const result = unwrapResult(response);
  return normalizeNewsDetail(result);
}
