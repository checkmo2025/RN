import { PUBLIC_ENV } from '../../constants/publicEnv';
import { showToast } from '../../utils/toast';
import {
  deleteStoredRefreshToken,
  getStoredRefreshToken,
  saveStoredRefreshToken,
} from './authTokenStore';

const DEFAULT_API_BASE_URL = 'https://api.checkmo.co.kr/api/v1';
const API_VERSION_PATH = '/api/v1';
const DEFAULT_TIMEOUT_MS = 15_000;

type QueryValue = string | number | boolean | null | undefined;

export type ApiEnvelope<T> = {
  isSuccess?: boolean;
  code?: string;
  message?: string;
  result?: T;
};

export class ApiError extends Error {
  status: number;
  code?: string;
  body?: unknown;

  constructor(message: string, status: number, code?: string, body?: unknown) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
    this.code = code;
    this.body = body;
  }
}

type RequestOptions = {
  method?: 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE';
  query?: Record<string, QueryValue>;
  body?: unknown;
  headers?: Record<string, string>;
  credentials?: RequestCredentials;
  suppressErrorToast?: boolean;
  timeoutMs?: number;
  retryOnUnauthorized?: boolean;
};

type FetchApiOptions = RequestInit & {
  query?: Record<string, QueryValue>;
  retryOnUnauthorized?: boolean;
};

type RefreshTokenResponse = {
  refreshToken?: string;
};

type ProfileIncompleteSessionListener = () => void;

const profileIncompleteSessionListeners = new Set<ProfileIncompleteSessionListener>();

export function subscribeProfileIncompleteSession(
  listener: ProfileIncompleteSessionListener,
): () => void {
  profileIncompleteSessionListeners.add(listener);
  return () => {
    profileIncompleteSessionListeners.delete(listener);
  };
}

function notifyProfileIncompleteSession(): void {
  profileIncompleteSessionListeners.forEach((listener) => listener());
}

function normalizeApiBaseUrl(rawBaseUrl: string): string {
  const trimmed = rawBaseUrl.trim() || DEFAULT_API_BASE_URL;

  try {
    const url = new URL(trimmed);
    const pathname = url.pathname.replace(/\/+$/, '');
    const lowerPathname = pathname.toLowerCase();

    if (lowerPathname.endsWith(API_VERSION_PATH)) {
      url.pathname = pathname;
    } else if (/\/api\/v\d+$/i.test(pathname)) {
      url.pathname = pathname.replace(/\/api\/v\d+$/i, API_VERSION_PATH);
    } else if (lowerPathname.endsWith('/api')) {
      url.pathname = `${pathname}/v1`;
    } else {
      url.pathname = `${pathname}${API_VERSION_PATH}`;
    }

    url.search = '';
    url.hash = '';

    return url.toString().replace(/\/+$/, '');
  } catch {
    const withoutTrailingSlash = trimmed.replace(/\/+$/, '');
    if (/\/api\/v1$/i.test(withoutTrailingSlash)) return withoutTrailingSlash;
    if (/\/api\/v\d+$/i.test(withoutTrailingSlash)) {
      return withoutTrailingSlash.replace(/\/api\/v\d+$/i, API_VERSION_PATH);
    }
    if (/\/api$/i.test(withoutTrailingSlash)) return `${withoutTrailingSlash}/v1`;
    return `${withoutTrailingSlash}${API_VERSION_PATH}`;
  }
}

export const API_BASE_URL = normalizeApiBaseUrl(PUBLIC_ENV.API_BASE_URL);
export const API_ORIGIN_URL = new URL(API_BASE_URL).origin;

function normalizeApiPath(path: string): string {
  return path
    .trim()
    .replace(/^\/+/, '')
    .replace(/^api\/(?:v\d+\/?)?/i, '')
    .replace(/^v\d+\//i, '');
}

export function buildApiUrl(path: string, query?: Record<string, QueryValue>): string {
  const url = new URL(normalizeApiPath(path), `${API_BASE_URL}/`);

  if (query) {
    Object.entries(query).forEach(([key, value]) => {
      if (value === null || typeof value === 'undefined') return;
      url.searchParams.set(key, String(value));
    });
  }

  return url.toString();
}

function toDefaultHttpErrorMessage(status: number): string {
  switch (status) {
    case 400:
      return '요청 형식이 올바르지 않습니다.';
    case 401:
      return '로그인 상태를 확인해 주십시오.';
    case 403:
      return '접근 권한이 없습니다.';
    case 404:
      return '요청한 정보를 찾을 수 없습니다.';
    case 409:
      return '이미 처리된 요청이거나 충돌이 발생했습니다.';
    case 429:
      return '요청이 많습니다. 잠시 후 다시 시도해 주십시오.';
    case 500:
      return '서버 오류가 발생했습니다.';
    case 502:
    case 503:
    case 504:
      return '서버 연결이 원활하지 않습니다. 잠시 후 다시 시도해 주십시오.';
    default:
      return `요청에 실패했습니다. (${status})`;
  }
}

function getParsedMessage(parsed: unknown, fallback: string): string {
  if (typeof parsed === 'object' && parsed !== null && 'message' in parsed) {
    const message = String((parsed as { message?: unknown }).message ?? '').trim();
    if (message) return message;
  }
  return fallback;
}

function getParsedCode(parsed: unknown): string | undefined {
  if (typeof parsed === 'object' && parsed !== null && 'code' in parsed) {
    const code = String((parsed as { code?: unknown }).code ?? '').trim();
    return code || undefined;
  }
  return undefined;
}

function notifyProfileIncompleteSessionIfNeeded(status: number, parsed: unknown): void {
  if (status === 403 && getParsedCode(parsed) === 'AUTH_403') {
    notifyProfileIncompleteSession();
  }
}

async function parseResponseBody(response: Response): Promise<unknown> {
  const text = await response.text();
  if (!text) return null;

  try {
    return JSON.parse(text);
  } catch {
    return text;
  }
}

function shouldAttemptSessionRefresh(
  path: string,
  status: number,
  options: {
    credentials?: RequestCredentials;
    retryOnUnauthorized?: boolean;
    didRetry: boolean;
  },
): boolean {
  if (status !== 401) return false;
  if (options.didRetry) return false;
  if (options.retryOnUnauthorized === false) return false;
  if (options.credentials === 'omit') return false;

  const normalizedPath = normalizeApiPath(path).replace(/\/+$/, '').toLowerCase();
  if (normalizedPath.startsWith('auth/')) return false;
  if (normalizedPath === 'members/check-nickname') return false;
  if (normalizedPath === 'members/find-email') return false;

  return true;
}

let refreshSessionPromise: Promise<boolean> | null = null;

async function refreshAppSession(): Promise<boolean> {
  const refreshToken = await getStoredRefreshToken();
  if (!refreshToken) return false;

  let response: Response;
  try {
    response = await fetch(buildApiUrl('/auth/app/refresh'), {
      method: 'POST',
      credentials: 'include',
      headers: {
        Accept: 'application/json',
        'X-Refresh-Token': refreshToken,
      },
    });
  } catch {
    return false;
  }

  const parsed = await parseResponseBody(response);

  if (!response.ok) {
    await deleteStoredRefreshToken();
    return false;
  }

  if (
    typeof parsed === 'object' &&
    parsed !== null &&
    'isSuccess' in parsed &&
    (parsed as { isSuccess?: unknown }).isSuccess === false
  ) {
    await deleteStoredRefreshToken();
    return false;
  }

  const result = unwrapResult(parsed as ApiEnvelope<RefreshTokenResponse>);
  if (!result?.refreshToken) {
    await deleteStoredRefreshToken();
    return false;
  }

  await saveStoredRefreshToken(result.refreshToken);
  return true;
}

export async function silentRefreshSession(): Promise<boolean> {
  if (!refreshSessionPromise) {
    refreshSessionPromise = refreshAppSession().finally(() => {
      refreshSessionPromise = null;
    });
  }

  return refreshSessionPromise;
}

async function fetchWithTimeout(
  path: string,
  options: RequestOptions,
  headers: Record<string, string>,
  timeoutMs: number,
): Promise<Response> {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeoutMs);

  try {
    return await fetch(buildApiUrl(path, options.query), {
      method: options.method ?? 'GET',
      headers,
      body: typeof options.body !== 'undefined' ? JSON.stringify(options.body) : undefined,
      credentials: options.credentials ?? 'include',
      signal: controller.signal,
    });
  } finally {
    clearTimeout(timeoutId);
  }
}

async function requestJsonInternal<T>(
  path: string,
  options: RequestOptions,
  didRetry: boolean,
): Promise<T> {
  const {
    body,
    headers = {},
    credentials = 'include',
    suppressErrorToast = true,
    timeoutMs = DEFAULT_TIMEOUT_MS,
  } = options;

  const requestHeaders: Record<string, string> = {
    ...headers,
  };

  if (typeof body !== 'undefined') {
    requestHeaders['Content-Type'] = 'application/json';
  }

  let response: Response;
  try {
    response = await fetchWithTimeout(
      path,
      {
        ...options,
        credentials,
      },
      requestHeaders,
      timeoutMs,
    );
  } catch (error) {
    const message = '네트워크 연결을 확인해 주십시오.';
    if (!suppressErrorToast) {
      showToast(message);
    }
    throw new ApiError(message, 0, 'NETWORK_ERROR', error);
  }

  if (
    shouldAttemptSessionRefresh(path, response.status, {
      credentials,
      retryOnUnauthorized: options.retryOnUnauthorized,
      didRetry,
    }) &&
    (await silentRefreshSession())
  ) {
    return requestJsonInternal<T>(path, options, true);
  }

  const parsed = await parseResponseBody(response);

  if (!response.ok) {
    const message = getParsedMessage(parsed, toDefaultHttpErrorMessage(response.status));
    const code = getParsedCode(parsed);

    if (code === 'AUTH_405') {
      await deleteStoredRefreshToken();
    }
    notifyProfileIncompleteSessionIfNeeded(response.status, parsed);

    if (!suppressErrorToast) {
      showToast(message);
    }
    throw new ApiError(message, response.status, code, parsed);
  }

  if (
    typeof parsed === 'object' &&
    parsed !== null &&
    'isSuccess' in parsed &&
    (parsed as { isSuccess?: unknown }).isSuccess === false
  ) {
    const message = getParsedMessage(parsed, '요청에 실패했습니다.');
    const code = getParsedCode(parsed);
    notifyProfileIncompleteSessionIfNeeded(response.status, parsed);
    if (!suppressErrorToast) {
      showToast(message);
    }
    throw new ApiError(message, response.status, code, parsed);
  }

  return parsed as T;
}

export async function requestJson<T>(path: string, options: RequestOptions = {}): Promise<T> {
  return requestJsonInternal<T>(path, options, false);
}

export async function fetchApi(path: string, options: FetchApiOptions = {}): Promise<Response> {
  const {
    query,
    retryOnUnauthorized = true,
    credentials = 'include',
    ...fetchOptions
  } = options;

  let response: Response;
  try {
    response = await fetch(buildApiUrl(path, query), {
      ...fetchOptions,
      credentials,
    });
  } catch (error) {
    throw new ApiError('네트워크 연결을 확인해 주십시오.', 0, 'NETWORK_ERROR', error);
  }

  if (
    shouldAttemptSessionRefresh(path, response.status, {
      credentials,
      retryOnUnauthorized,
      didRetry: false,
    }) &&
    (await silentRefreshSession())
  ) {
    try {
      const retryResponse = await fetch(buildApiUrl(path, query), {
        ...fetchOptions,
        credentials,
      });
      if (retryResponse.status === 403) {
        try {
          const parsed = await parseResponseBody(retryResponse.clone());
          notifyProfileIncompleteSessionIfNeeded(retryResponse.status, parsed);
        } catch {
          // Ignore notification parsing failures; callers still receive the original response.
        }
      }
      return retryResponse;
    } catch (error) {
      throw new ApiError('네트워크 연결을 확인해 주십시오.', 0, 'NETWORK_ERROR', error);
    }
  }

  if (response.status === 403) {
    try {
      const parsed = await parseResponseBody(response.clone());
      notifyProfileIncompleteSessionIfNeeded(response.status, parsed);
    } catch {
      // Ignore notification parsing failures; callers still receive the original response.
    }
  }

  return response;
}

export function resolveErrorMessage(error: unknown, fallback: string): string {
  if (error instanceof ApiError && error.message?.trim()) {
    return error.message.trim();
  }
  return fallback;
}

export function unwrapResult<T>(payload: ApiEnvelope<T> | T | null | undefined): T | undefined {
  if (!payload) return undefined;

  if (typeof payload === 'object' && payload !== null && 'result' in payload) {
    return (payload as ApiEnvelope<T>).result;
  }

  return payload as T;
}
