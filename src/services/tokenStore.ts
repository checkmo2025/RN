import * as SecureStore from 'expo-secure-store';

const ACCESS_TOKEN_KEY = 'accessToken';
const REFRESH_TOKEN_KEY = 'refreshToken';
const AUTH_COOKIE_NAMES = new Set([ACCESS_TOKEN_KEY, REFRESH_TOKEN_KEY]);

export const saveRefreshToken = (token: string) =>
  SecureStore.setItemAsync(REFRESH_TOKEN_KEY, token);

export const getRefreshToken = () => SecureStore.getItemAsync(REFRESH_TOKEN_KEY);

export const deleteRefreshToken = () => SecureStore.deleteItemAsync(REFRESH_TOKEN_KEY);

export async function saveAuthCookiesFromHeader(setCookieHeader: string): Promise<void> {
  const cookiePattern = /(?:^|,\s*)(accessToken|refreshToken)=([^;,]*)/g;
  const updates: Array<Promise<void>> = [];
  let match: RegExpExecArray | null;

  while ((match = cookiePattern.exec(setCookieHeader)) !== null) {
    const [, name, value] = match;
    if (!AUTH_COOKIE_NAMES.has(name)) continue;

    const key = name === ACCESS_TOKEN_KEY ? ACCESS_TOKEN_KEY : REFRESH_TOKEN_KEY;
    updates.push(
      value
        ? SecureStore.setItemAsync(key, value)
        : SecureStore.deleteItemAsync(key),
    );
  }

  await Promise.all(updates);
}

export async function saveAuthCookiesFromHeaders(setCookieHeaders: string[]): Promise<void> {
  await Promise.all(setCookieHeaders.map((header) => saveAuthCookiesFromHeader(header)));
}

export async function getAuthCookieHeader(): Promise<string | undefined> {
  const [accessToken, refreshToken] = await Promise.all([
    SecureStore.getItemAsync(ACCESS_TOKEN_KEY),
    SecureStore.getItemAsync(REFRESH_TOKEN_KEY),
  ]);
  const cookies = [
    accessToken ? `${ACCESS_TOKEN_KEY}=${accessToken}` : null,
    refreshToken ? `${REFRESH_TOKEN_KEY}=${refreshToken}` : null,
  ].filter((cookie): cookie is string => Boolean(cookie));

  return cookies.length > 0 ? cookies.join('; ') : undefined;
}

export async function deleteAuthCookies(): Promise<void> {
  await Promise.all([
    SecureStore.deleteItemAsync(ACCESS_TOKEN_KEY),
    SecureStore.deleteItemAsync(REFRESH_TOKEN_KEY),
  ]);
}
