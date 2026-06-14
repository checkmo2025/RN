import * as SecureStore from 'expo-secure-store';

const REFRESH_TOKEN_KEY = 'checkmo.refreshToken';

export async function saveStoredRefreshToken(refreshToken: string): Promise<void> {
  const normalizedToken = refreshToken.trim();
  if (!normalizedToken) {
    await deleteStoredRefreshToken();
    return;
  }

  await SecureStore.setItemAsync(REFRESH_TOKEN_KEY, normalizedToken);
}

export async function getStoredRefreshToken(): Promise<string | null> {
  return SecureStore.getItemAsync(REFRESH_TOKEN_KEY);
}

export async function deleteStoredRefreshToken(): Promise<void> {
  await SecureStore.deleteItemAsync(REFRESH_TOKEN_KEY);
}
