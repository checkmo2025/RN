import { API_BASE_URL, ApiEnvelope, ApiError, unwrapResult } from './http';

type UnknownRecord = Record<string, unknown>;

type QueryValue = string | number | boolean | null | undefined;

type RequestOptions = {
  method?: 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE';
  query?: Record<string, QueryValue>;
  body?: unknown;
  headers?: Record<string, string>;
};

type NewsListResult = {
  basicInfoList?: unknown[];
  newsList?: unknown[];
  content?: unknown[];
  items?: unknown[];
};

type NewsListResponse = ApiEnvelope<NewsListResult | unknown[]>;
type NewsDetailResponse = ApiEnvelope<unknown>;

export type RemoteNewsSummary = {
  id: number;
  title: string;
  excerpt: string;
  thumbnailUrl?: string;
  date?: string;
  originalLink?: string;
};

export type RemoteNewsDetail = RemoteNewsSummary & {
  content: string;
  imageUrls: string[];
};

function buildUrl(path: string, query?: Record<string, QueryValue>) {
  const normalizedPath = path
    .replace(/^\/+/, '')
    .replace(/^api\//, '');
  const url = new URL(normalizedPath, `${API_BASE_URL}/`);

  if (query) {
    Object.entries(query).forEach(([key, value]) => {
      if (value === null || typeof value === 'undefined') return;
      url.searchParams.set(key, String(value));
    });
  }

  return url.toString();
}

async function requestJsonSilent<T>(path: string, options: RequestOptions = {}): Promise<T> {
  const {
    method = 'GET',
    query,
    body,
    headers = {},
  } = options;

  const requestHeaders: Record<string, string> = {
    ...headers,
  };

  if (typeof body !== 'undefined') {
    requestHeaders['Content-Type'] = 'application/json';
  }

  let response: Response;
  try {
    response = await fetch(buildUrl(path, query), {
      method,
      headers: requestHeaders,
      body: typeof body !== 'undefined' ? JSON.stringify(body) : undefined,
      credentials: 'include',
    });
  } catch (error) {
    throw new ApiError('네트워크 연결을 확인해주세요.', 0, 'NETWORK_ERROR', error);
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

  if (!response.ok) {
    const message =
      (typeof parsed === 'object' && parsed !== null && 'message' in parsed
        ? String((parsed as { message?: unknown }).message)
        : null) ?? `요청에 실패했습니다. (${response.status})`;

    const code =
      typeof parsed === 'object' && parsed !== null && 'code' in parsed
        ? String((parsed as { code?: unknown }).code)
        : undefined;

    throw new ApiError(message, response.status, code, parsed);
  }

  if (
    typeof parsed === 'object' &&
    parsed !== null &&
    'isSuccess' in parsed &&
    (parsed as { isSuccess?: unknown }).isSuccess === false
  ) {
    const message =
      typeof (parsed as { message?: unknown }).message === 'string'
        ? ((parsed as { message?: string }).message as string)
        : '요청에 실패했습니다.';
    const code =
      typeof (parsed as { code?: unknown }).code === 'string'
        ? ((parsed as { code?: string }).code as string)
        : undefined;
    throw new ApiError(message, response.status, code, parsed);
  }

  return parsed as T;
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

  return {
    id,
    title,
    excerpt,
    thumbnailUrl: toStringValue(firstDefined(record.thumbnailUrl, record.thumbUrl, record.imageUrl)),
    date: toStringValue(firstDefined(record.publishStartAt, record.createdAt, record.date)),
    originalLink: toStringValue(firstDefined(record.originalLink, record.link)),
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

function normalizeNewsList(payload: unknown): RemoteNewsSummary[] {
  const result = unwrapResult(payload as NewsListResponse);

  const list = Array.isArray(result)
    ? result
    : Array.isArray(asRecord(result)?.basicInfoList)
      ? (asRecord(result)?.basicInfoList as unknown[])
      : Array.isArray(asRecord(result)?.newsList)
        ? (asRecord(result)?.newsList as unknown[])
        : Array.isArray(asRecord(result)?.content)
          ? (asRecord(result)?.content as unknown[])
          : Array.isArray(asRecord(result)?.items)
            ? (asRecord(result)?.items as unknown[])
            : [];

  return list
    .map(normalizeNewsSummary)
    .filter((item): item is RemoteNewsSummary => Boolean(item));
}

export async function fetchNewsList(page?: number): Promise<RemoteNewsSummary[]> {
  const candidatePaths = ['/news', '/news/list', '/newses'] as const;

  for (const path of candidatePaths) {
    try {
      const response = await requestJsonSilent<NewsListResponse>(path, {
        method: 'GET',
        query: {
          page,
        },
      });
      return normalizeNewsList(response);
    } catch (error) {
      if (error instanceof ApiError && (error.status === 404 || error.status === 405)) {
        continue;
      }
      throw error;
    }
  }

  throw new ApiError('소식 목록 조회 경로를 찾지 못했습니다.', 404, 'NEWS_LIST_PATH_NOT_FOUND');
}

export async function fetchNewsDetail(newsId: number): Promise<RemoteNewsDetail | null> {
  const candidatePaths = [`/news/${newsId}`, `/news/detail/${newsId}`, `/newses/${newsId}`] as const;

  for (const path of candidatePaths) {
    try {
      const response = await requestJsonSilent<NewsDetailResponse>(path, {
        method: 'GET',
      });
      const result = unwrapResult(response);
      return normalizeNewsDetail(result);
    } catch (error) {
      if (error instanceof ApiError && (error.status === 404 || error.status === 405)) {
        continue;
      }
      throw error;
    }
  }

  throw new ApiError('소식 상세 조회 경로를 찾지 못했습니다.', 404, 'NEWS_DETAIL_PATH_NOT_FOUND');
}

export async function fetchNewsCarousel(limit = 5): Promise<RemoteNewsSummary[]> {
  try {
    const carouselPaths = ['/news/carousel', '/news/banner', '/news/banners'] as const;
    for (const path of carouselPaths) {
      try {
        const response = await requestJsonSilent<NewsListResponse>(path, {
          method: 'GET',
        });
        const items = normalizeNewsList(response);
        if (items.length > 0) return items.slice(0, limit);
      } catch (error) {
        if (error instanceof ApiError && (error.status === 404 || error.status === 405)) {
          continue;
        }
        throw error;
      }
    }
  } catch (error) {
    if (!(error instanceof ApiError)) {
      throw error;
    }
  }

  const list = await fetchNewsList();
  return list.slice(0, limit);
}
