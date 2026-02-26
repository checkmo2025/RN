import { showToast } from '../../utils/toast';

export const API_BASE_URL = 'https://api.checkmo.co.kr/api';

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
  suppressErrorToast?: boolean;
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

export async function requestJson<T>(path: string, options: RequestOptions = {}): Promise<T> {
  const {
    method = 'GET',
    query,
    body,
    headers = {},
    suppressErrorToast = false,
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
    const message = '네트워크 연결을 확인해주세요.';
    if (!suppressErrorToast) {
      showToast(message);
    }
    throw new ApiError(message, 0, 'NETWORK_ERROR', error);
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
    const message =
      typeof (parsed as { message?: unknown }).message === 'string'
        ? ((parsed as { message?: string }).message as string)
        : '요청에 실패했습니다.';
    const code =
      typeof (parsed as { code?: unknown }).code === 'string'
        ? ((parsed as { code?: string }).code as string)
        : undefined;
    if (!suppressErrorToast) {
      showToast(message);
    }
    throw new ApiError(message, response.status, code, parsed);
  }

  return parsed as T;
}

export function unwrapResult<T>(payload: ApiEnvelope<T> | T | null | undefined): T | undefined {
  if (!payload) return undefined;

  if (typeof payload === 'object' && payload !== null && 'result' in payload) {
    return (payload as ApiEnvelope<T>).result;
  }

  return payload as T;
}
