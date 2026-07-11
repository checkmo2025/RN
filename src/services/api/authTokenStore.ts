import * as SecureStore from 'expo-secure-store';

const REFRESH_TOKEN_KEY = 'checkmo.refreshToken';
const REFRESH_TOKEN_UPDATED_AT_KEY = 'checkmo.refreshTokenUpdatedAt';

let tokenMutationQueue: Promise<void> = Promise.resolve();
let authSessionGeneration = 0;
let storedAuthSessionIdentityGeneration = 0;

function parseStoredTimestamp(value: string | null): number | null {
  if (!value) return null;

  const parsed = Number(value);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : null;
}

function enqueueTokenMutation<T>(mutation: () => Promise<T>): Promise<T> {
  const result = tokenMutationQueue.then(mutation, mutation);
  tokenMutationQueue = result.then(
    () => undefined,
    () => undefined,
  );
  return result;
}

function normalizeToken(refreshToken: string): string {
  return refreshToken.trim();
}

async function writeStoredRefreshToken(
  refreshToken: string,
  updatedAtMillis: number,
): Promise<void> {
  // 서버에서 토큰 회전이 끝난 뒤 로컬에 이전 토큰이 남는 것이 가장 위험하므로 토큰을 먼저 저장한다.
  await SecureStore.setItemAsync(REFRESH_TOKEN_KEY, refreshToken);

  try {
    await SecureStore.setItemAsync(REFRESH_TOKEN_UPDATED_AT_KEY, String(updatedAtMillis));
  } catch {
    // 시각 저장만 실패하면 다음 요청에서 선제 갱신하도록 시각을 비워 둔다.
    try {
      await SecureStore.deleteItemAsync(REFRESH_TOKEN_UPDATED_AT_KEY);
    } catch {
      // Refresh Token 자체는 이미 안전하게 저장됐으므로 시각 정리 실패는 무시한다.
    }
  }
}

async function clearStoredRefreshToken(): Promise<void> {
  // 토큰부터 제거하면 시각 삭제가 실패해도 세션이 로컬에 남지 않는다.
  await SecureStore.deleteItemAsync(REFRESH_TOKEN_KEY);

  try {
    await SecureStore.deleteItemAsync(REFRESH_TOKEN_UPDATED_AT_KEY);
  } catch {
    // 토큰이 없으면 남은 시각 값은 인증에 사용되지 않는다.
  }
}

export function getAuthSessionGeneration(): number {
  return authSessionGeneration;
}

export function advanceAuthSessionGeneration(): void {
  authSessionGeneration += 1;
}

export function getStoredAuthSessionIdentityGeneration(): number {
  return storedAuthSessionIdentityGeneration;
}

function advanceStoredAuthSessionIdentityGeneration(): void {
  storedAuthSessionIdentityGeneration += 1;
}

export async function saveStoredRefreshToken(
  refreshToken: string,
  updatedAtMillis = Date.now(),
): Promise<void> {
  const normalizedToken = normalizeToken(refreshToken);
  advanceAuthSessionGeneration();

  await enqueueTokenMutation(async () => {
    if (!normalizedToken) {
      await clearStoredRefreshToken();
      advanceStoredAuthSessionIdentityGeneration();
      return;
    }

    await writeStoredRefreshToken(normalizedToken, updatedAtMillis);
    advanceStoredAuthSessionIdentityGeneration();
  });
}

export async function getStoredRefreshToken(): Promise<string | null> {
  await tokenMutationQueue;
  return SecureStore.getItemAsync(REFRESH_TOKEN_KEY);
}

export async function getStoredRefreshTokenUpdatedAt(): Promise<number | null> {
  await tokenMutationQueue;
  return parseStoredTimestamp(await SecureStore.getItemAsync(REFRESH_TOKEN_UPDATED_AT_KEY));
}

export async function replaceStoredRefreshTokenIfCurrent(
  expectedRefreshToken: string,
  nextRefreshToken: string,
  updatedAtMillis = Date.now(),
): Promise<boolean> {
  const normalizedExpectedToken = normalizeToken(expectedRefreshToken);
  const normalizedNextToken = normalizeToken(nextRefreshToken);
  if (!normalizedExpectedToken || !normalizedNextToken) return false;

  return enqueueTokenMutation(async () => {
    const currentToken = normalizeToken((await SecureStore.getItemAsync(REFRESH_TOKEN_KEY)) ?? '');
    if (currentToken !== normalizedExpectedToken) return false;

    await writeStoredRefreshToken(normalizedNextToken, updatedAtMillis);
    return true;
  });
}

export async function deleteStoredRefreshTokenIfCurrent(
  expectedRefreshToken: string,
): Promise<boolean> {
  const normalizedExpectedToken = normalizeToken(expectedRefreshToken);
  if (!normalizedExpectedToken) return false;

  return enqueueTokenMutation(async () => {
    const currentToken = normalizeToken((await SecureStore.getItemAsync(REFRESH_TOKEN_KEY)) ?? '');
    if (currentToken !== normalizedExpectedToken) return false;

    advanceAuthSessionGeneration();
    await clearStoredRefreshToken();
    advanceStoredAuthSessionIdentityGeneration();
    return true;
  });
}

export async function deleteStoredRefreshToken(): Promise<void> {
  advanceAuthSessionGeneration();
  await enqueueTokenMutation(async () => {
    await clearStoredRefreshToken();
    advanceStoredAuthSessionIdentityGeneration();
  });
}
