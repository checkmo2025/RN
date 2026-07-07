import * as SecureStore from 'expo-secure-store';

const INSTALLATION_ID_KEY = 'checkmo.push.installationId.v1';
const LAST_EXPO_PUSH_TOKEN_KEY = 'checkmo.push.lastExpoPushToken.v1';
const PUSH_NOTIFICATIONS_ENABLED_KEY = 'checkmo.push.notificationsEnabled.v1';

function normalizeStoredString(value: string | null): string | null {
  const trimmed = value?.trim();
  return trimmed ? trimmed : null;
}

async function saveOrDelete(key: string, value: string | null): Promise<void> {
  const normalizedValue = normalizeStoredString(value);
  if (!normalizedValue) {
    await SecureStore.deleteItemAsync(key);
    return;
  }

  await SecureStore.setItemAsync(key, normalizedValue);
}

export async function getStoredPushInstallationId(): Promise<string | null> {
  return normalizeStoredString(await SecureStore.getItemAsync(INSTALLATION_ID_KEY));
}

export async function saveStoredPushInstallationId(installationId: string | null): Promise<void> {
  await saveOrDelete(INSTALLATION_ID_KEY, installationId);
}

export async function deleteStoredPushInstallationId(): Promise<void> {
  await SecureStore.deleteItemAsync(INSTALLATION_ID_KEY);
}

export async function getStoredLastExpoPushToken(): Promise<string | null> {
  return normalizeStoredString(await SecureStore.getItemAsync(LAST_EXPO_PUSH_TOKEN_KEY));
}

export async function saveStoredLastExpoPushToken(expoPushToken: string | null): Promise<void> {
  await saveOrDelete(LAST_EXPO_PUSH_TOKEN_KEY, expoPushToken);
}

export async function deleteStoredLastExpoPushToken(): Promise<void> {
  await SecureStore.deleteItemAsync(LAST_EXPO_PUSH_TOKEN_KEY);
}

export async function getStoredPushNotificationsEnabled(): Promise<boolean> {
  const storedValue = await SecureStore.getItemAsync(PUSH_NOTIFICATIONS_ENABLED_KEY);
  return storedValue !== 'false';
}

export async function saveStoredPushNotificationsEnabled(enabled: boolean): Promise<void> {
  await SecureStore.setItemAsync(PUSH_NOTIFICATIONS_ENABLED_KEY, enabled ? 'true' : 'false');
}

export async function clearStoredPushRegistrationCache(
  options: { deleteInstallationId?: boolean } = {},
): Promise<void> {
  await deleteStoredLastExpoPushToken();
  if (options.deleteInstallationId) {
    await deleteStoredPushInstallationId();
  }
}
