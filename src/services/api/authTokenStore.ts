import * as SecureStore from 'expo-secure-store';

const REFRESH_TOKEN_KEY = 'checkmo.refreshToken';
const REFRESH_TOKEN_UPDATED_AT_KEY = 'checkmo.refreshTokenUpdatedAt';

function parseStoredTimestamp(value: string | null): number | null {
  if (!value) return null;

  const parsed = Number(value);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : null;
}

export async function saveStoredRefreshToken(
  refreshToken: string,
  updatedAtMillis = Date.now(),
): Promise<void> {
  const normalizedToken = refreshToken.trim();
  if (!normalizedToken) {
    await deleteStoredRefreshToken();
    return;
  }

  await Promise.all([
    SecureStore.setItemAsync(REFRESH_TOKEN_KEY, normalizedToken),
    SecureStore.setItemAsync(REFRESH_TOKEN_UPDATED_AT_KEY, String(updatedAtMillis)),
  ]);
}

export async function getStoredRefreshToken(): Promise<string | null> {
  return SecureStore.getItemAsync(REFRESH_TOKEN_KEY);
}

export async function getStoredRefreshTokenUpdatedAt(): Promise<number | null> {
  return parseStoredTimestamp(await SecureStore.getItemAsync(REFRESH_TOKEN_UPDATED_AT_KEY));
}

export async function deleteStoredRefreshToken(): Promise<void> {
  await Promise.all([
    SecureStore.deleteItemAsync(REFRESH_TOKEN_KEY),
    SecureStore.deleteItemAsync(REFRESH_TOKEN_UPDATED_AT_KEY),
  ]);
}
