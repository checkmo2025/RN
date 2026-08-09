import { execFileSync } from 'node:child_process';
import { userInfo } from 'node:os';

const DEFAULT_API_BASE_URL = 'https://api.checkmo.co.kr/api/v1';
const REQUEST_TIMEOUT_MS = 15_000;

const AUTH_PROFILES = Object.freeze({
  admin: Object.freeze({
    service: 'kr.co.checkmo.book-story-automation.refresh-token',
    label: '책모 책이야기 자동화 관리자 로그인',
    displayName: '관리자',
  }),
  emotion: Object.freeze({
    service: 'kr.co.checkmo.book-story-automation.refresh-token.emotion',
    label: '책모 책이야기 자동화 감성회원 로그인',
    displayName: '감성회원',
  }),
});

export class AutomationAuthError extends Error {
  constructor(message, options = {}) {
    super(message, options);
    this.name = 'AutomationAuthError';
  }
}

function requireMacOS() {
  if (process.platform !== 'darwin') {
    throw new AutomationAuthError('이 로그인 도구는 macOS 키체인에서만 사용할 수 있습니다.');
  }
}

function keychainAccount() {
  return userInfo().username;
}

export function normalizeAuthProfile(profile = 'admin') {
  const normalized = String(profile).trim().toLowerCase();
  if (!Object.hasOwn(AUTH_PROFILES, normalized)) {
    throw new AutomationAuthError('로그인 프로필은 `admin` 또는 `emotion`이어야 합니다.');
  }
  return normalized;
}

export function authProfileFromArgs(args) {
  const profileIndex = args.indexOf('--profile');
  if (profileIndex < 0) return 'admin';
  const profile = args[profileIndex + 1];
  if (!profile || profile.startsWith('-')) {
    throw new AutomationAuthError('`--profile` 뒤에 `admin` 또는 `emotion`을 입력해 주세요.');
  }
  return normalizeAuthProfile(profile);
}

export function authProfileDisplayName(profile) {
  return AUTH_PROFILES[normalizeAuthProfile(profile)].displayName;
}

export function authProfileForPersona(persona) {
  if (persona === '관리자') return 'admin';
  if (persona === '감성회원') return 'emotion';
  throw new AutomationAuthError(`지원하지 않는 글 컨셉입니다: ${persona || '컨셉 없음'}`);
}

function apiBaseUrl() {
  const configured = process.env.CHECKMO_API_BASE_URL?.trim();
  const raw = configured || DEFAULT_API_BASE_URL;
  const url = new URL(raw);

  const isLocalHttp =
    url.protocol === 'http:' && (url.hostname === 'localhost' || url.hostname === '127.0.0.1');
  if (url.protocol !== 'https:' && !isLocalHttp) {
    throw new AutomationAuthError(
      'API 주소는 HTTPS이거나 로컬 개발용 localhost 주소여야 합니다.',
    );
  }

  return url.toString().replace(/\/$/, '');
}

function runSecurity(args) {
  requireMacOS();

  try {
    return execFileSync('/usr/bin/security', args, {
      encoding: 'utf8',
      stdio: ['ignore', 'pipe', 'pipe'],
    }).trim();
  } catch (error) {
    const status = typeof error?.status === 'number' ? error.status : null;
    throw new AutomationAuthError('macOS 키체인 작업에 실패했습니다.', {
      cause: status === null ? undefined : new Error(`security 종료 코드: ${status}`),
    });
  }
}

export function saveRefreshToken(refreshToken, profile = 'admin') {
  const normalized = refreshToken.trim();
  if (!normalized) {
    throw new AutomationAuthError('저장할 로그인 토큰이 비어 있습니다.');
  }

  const config = AUTH_PROFILES[normalizeAuthProfile(profile)];

  runSecurity([
    'add-generic-password',
    '-U',
    '-a',
    keychainAccount(),
    '-s',
    config.service,
    '-l',
    config.label,
    '-w',
    normalized,
  ]);
}

export function readRefreshToken(profile = 'admin') {
  const config = AUTH_PROFILES[normalizeAuthProfile(profile)];
  return runSecurity([
    'find-generic-password',
    '-a',
    keychainAccount(),
    '-s',
    config.service,
    '-w',
  ]);
}

async function parsePayload(response) {
  const contentType = response.headers.get('content-type') ?? '';
  if (!contentType.includes('application/json')) return null;

  try {
    return await response.json();
  } catch {
    return null;
  }
}

async function request(path, options = {}) {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);

  try {
    const response = await fetch(`${apiBaseUrl()}${path}`, {
      ...options,
      signal: controller.signal,
    });
    const payload = await parsePayload(response);

    if (!response.ok || payload?.isSuccess === false) {
      const message =
        typeof payload?.message === 'string' && payload.message.trim()
          ? payload.message.trim()
          : `서버 요청에 실패했습니다. (HTTP ${response.status})`;
      throw new AutomationAuthError(message);
    }

    return { response, payload };
  } catch (error) {
    if (error instanceof AutomationAuthError) throw error;
    if (error?.name === 'AbortError') {
      throw new AutomationAuthError('서버 응답 시간이 초과되었습니다.');
    }
    throw new AutomationAuthError('책모 서버에 연결하지 못했습니다.');
  } finally {
    clearTimeout(timeoutId);
  }
}

export async function publicApiRequest(path, options = {}) {
  const { payload } = await request(path, options);
  return payload;
}

function responseRefreshToken(payload) {
  const token = payload?.result?.refreshToken;
  if (typeof token !== 'string' || !token.trim()) {
    throw new AutomationAuthError('서버 응답에서 로그인 토큰을 확인하지 못했습니다.');
  }
  return token.trim();
}

function getSetCookies(headers) {
  if (typeof headers.getSetCookie === 'function') return headers.getSetCookie();
  const combined = headers.get('set-cookie');
  return combined ? [combined] : [];
}

function extractCookieValue(setCookies, name) {
  const prefix = `${name}=`;
  for (const cookie of setCookies) {
    const firstPart = cookie.split(';', 1)[0]?.trim();
    if (firstPart?.startsWith(prefix)) return firstPart.slice(prefix.length);
  }
  return null;
}

export async function loginWithIdentifier(identifier, password) {
  const normalizedIdentifier = identifier.trim();
  if (!normalizedIdentifier) {
    throw new AutomationAuthError('아이디 또는 이메일을 입력해 주세요.');
  }
  if (!password) {
    throw new AutomationAuthError('비밀번호를 입력해 주세요.');
  }

  const { payload } = await request('/auth/app/login', {
    method: 'POST',
    headers: {
      Accept: 'application/json',
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      identifier: normalizedIdentifier,
      password,
    }),
  });

  return responseRefreshToken(payload);
}

export async function refreshSession(refreshToken) {
  const { response, payload } = await request('/auth/app/refresh', {
    method: 'POST',
    headers: {
      Accept: 'application/json',
      'X-Refresh-Token': refreshToken,
    },
  });

  const nextRefreshToken = responseRefreshToken(payload);
  const accessToken = extractCookieValue(getSetCookies(response.headers), 'accessToken');
  if (!accessToken) {
    throw new AutomationAuthError('서버 응답에서 접근 세션을 확인하지 못했습니다.');
  }

  return { accessToken, nextRefreshToken };
}

export async function verifyLoginStatus(accessToken) {
  await request('/members/me/login-status', {
    method: 'GET',
    headers: {
      Accept: 'application/json',
      Cookie: `accessToken=${accessToken}`,
    },
  });
}

export async function authenticatedApiRequest(path, options = {}, profile = 'admin') {
  const normalizedProfile = normalizeAuthProfile(profile);
  const refreshToken = readRefreshToken(normalizedProfile);
  const { accessToken, nextRefreshToken } = await refreshSession(refreshToken);

  // 갱신 토큰은 한 번 사용하면 회전되므로 후속 API 성공 여부와 관계없이 즉시 보관한다.
  saveRefreshToken(nextRefreshToken, normalizedProfile);

  const headers = new Headers(options.headers);
  headers.set('Accept', 'application/json');
  headers.set('Cookie', `accessToken=${accessToken}`);

  const { payload } = await request(path, {
    ...options,
    headers,
  });
  return payload;
}
