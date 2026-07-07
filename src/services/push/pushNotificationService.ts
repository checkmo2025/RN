import { AppState, Platform } from 'react-native';
import * as Application from 'expo-application';
import Constants from 'expo-constants';
import * as Device from 'expo-device';
import * as Notifications from 'expo-notifications';

import {
  registerPushDevice,
  unregisterPushDevice,
  type PushPlatform,
} from '../api/pushDeviceApi';
import { createLogger } from '../../utils/logger';
import {
  clearStoredPushRegistrationCache,
  getStoredLastExpoPushToken,
  getStoredPushNotificationsEnabled,
  getStoredPushInstallationId,
  saveStoredLastExpoPushToken,
  saveStoredPushNotificationsEnabled,
  saveStoredPushInstallationId,
} from './pushDeviceStorage';

export const CHECKMO_PUSH_CHANNEL_ID = 'checkmo-default';

type PushRegistrationResult =
  | {
      status: 'registered';
      installationId: string;
      tokenChanged: boolean;
    }
  | {
      status: 'skipped';
      reason:
        | 'unsupported-platform'
        | 'not-physical-device'
        | 'permission-denied'
        | 'permission-undetermined'
        | 'missing-project-id'
        | 'user-disabled';
    };

export type PushPreferenceUpdateResult =
  | PushRegistrationResult
  | {
      status: 'disabled';
    };

type ExpoConfigLike = {
  version?: string;
  extra?: {
    eas?: {
      projectId?: string;
    };
  };
  ios?: {
    buildNumber?: string;
  };
  android?: {
    versionCode?: string | number;
  };
};

const logger = createLogger('PushNotifications');

let notificationHandlerConfigured = false;

export function configurePushNotificationHandler(): void {
  if (notificationHandlerConfigured) return;
  notificationHandlerConfigured = true;

  Notifications.setNotificationHandler({
    handleNotification: async () => ({
      shouldShowBanner: true,
      shouldShowList: true,
      shouldPlaySound: true,
      shouldSetBadge: false,
      priority: Notifications.AndroidNotificationPriority.HIGH,
    }),
  });
}

async function ensureAndroidPushChannelAsync(): Promise<void> {
  if (Platform.OS !== 'android') return;

  await Notifications.setNotificationChannelAsync(CHECKMO_PUSH_CHANNEL_ID, {
    name: '책모 알림',
    importance: Notifications.AndroidImportance.HIGH,
    sound: 'default',
    vibrationPattern: [0, 250, 250, 250],
    lightColor: '#8B5E3C',
    enableVibrate: true,
    enableLights: true,
    showBadge: true,
  });
}

function resolvePushPlatform(): PushPlatform | null {
  if (Platform.OS === 'ios') return 'IOS';
  if (Platform.OS === 'android') return 'ANDROID';
  return null;
}

function resolveExpoConfig(): ExpoConfigLike | null {
  return (Constants.expoConfig as ExpoConfigLike | null | undefined) ?? null;
}

function resolveEasProjectId(): string | null {
  const expoConfig = resolveExpoConfig();
  const configProjectId = expoConfig?.extra?.eas?.projectId?.trim();
  if (configProjectId) return configProjectId;

  const easConfig = Constants.easConfig as { projectId?: string } | null | undefined;
  const easProjectId = easConfig?.projectId?.trim();
  return easProjectId || null;
}

function resolveAppVersion(): string {
  return Application.nativeApplicationVersion?.trim() || resolveExpoConfig()?.version?.trim() || 'unknown';
}

function resolveBuildNumber(): string {
  const nativeBuildVersion = Application.nativeBuildVersion?.trim();
  if (nativeBuildVersion) return nativeBuildVersion;

  const expoConfig = resolveExpoConfig();
  if (Platform.OS === 'ios') return expoConfig?.ios?.buildNumber?.trim() || 'unknown';
  if (Platform.OS === 'android') {
    const versionCode = expoConfig?.android?.versionCode;
    if (typeof versionCode === 'number') return String(versionCode);
    return versionCode?.trim() || 'unknown';
  }

  return 'unknown';
}

async function ensureNotificationPermissionAsync(
  requestPermission: boolean,
): Promise<'granted' | 'denied' | 'undetermined'> {
  const existingPermission = await Notifications.getPermissionsAsync();
  if (existingPermission.granted) return 'granted';

  const status = String(existingPermission.status);
  if (status !== 'undetermined' || !requestPermission || existingPermission.canAskAgain === false) {
    return status === 'denied' ? 'denied' : 'undetermined';
  }

  const requestedPermission = await Notifications.requestPermissionsAsync({
    ios: {
      allowAlert: true,
      allowSound: true,
      allowBadge: false,
    },
  });

  if (requestedPermission.granted) return 'granted';
  return String(requestedPermission.status) === 'denied' ? 'denied' : 'undetermined';
}

export async function registerCurrentPushDeviceAsync(
  options: { requestPermission?: boolean; ignoreStoredPreference?: boolean } = {},
): Promise<PushRegistrationResult> {
  const platform = resolvePushPlatform();
  if (!platform) {
    return { status: 'skipped', reason: 'unsupported-platform' };
  }
  if (!options.ignoreStoredPreference && !(await getStoredPushNotificationsEnabled())) {
    return { status: 'skipped', reason: 'user-disabled' };
  }
  if (!Device.isDevice) {
    return { status: 'skipped', reason: 'not-physical-device' };
  }

  configurePushNotificationHandler();
  await ensureAndroidPushChannelAsync();

  const permissionStatus = await ensureNotificationPermissionAsync(options.requestPermission ?? false);
  if (permissionStatus !== 'granted') {
    return {
      status: 'skipped',
      reason: permissionStatus === 'denied' ? 'permission-denied' : 'permission-undetermined',
    };
  }

  const projectId = resolveEasProjectId();
  if (!projectId) {
    return { status: 'skipped', reason: 'missing-project-id' };
  }

  const expoPushToken = (await Notifications.getExpoPushTokenAsync({ projectId })).data.trim();
  const installationId = await getStoredPushInstallationId();
  const previousExpoPushToken = await getStoredLastExpoPushToken();
  const registration = await registerPushDevice({
    installationId,
    expoPushToken,
    platform,
    appVersion: resolveAppVersion(),
    buildNumber: resolveBuildNumber(),
  });

  await saveStoredPushInstallationId(registration.installationId);
  await saveStoredLastExpoPushToken(expoPushToken);

  return {
    status: 'registered',
    installationId: registration.installationId,
    tokenChanged: previousExpoPushToken !== expoPushToken,
  };
}

export async function unregisterCurrentPushDeviceAsync(
  options: { deleteInstallationId?: boolean } = {},
): Promise<void> {
  const installationId = await getStoredPushInstallationId();
  try {
    if (installationId) {
      await unregisterPushDevice(installationId);
    }
  } finally {
    await clearStoredPushRegistrationCache(options);
  }
}

export async function setPushNotificationsEnabledAsync(
  enabled: boolean,
): Promise<PushPreferenceUpdateResult> {
  if (!enabled) {
    await saveStoredPushNotificationsEnabled(false);
    try {
      await unregisterCurrentPushDeviceAsync();
    } catch (error) {
      await saveStoredPushNotificationsEnabled(true);
      throw error;
    }
    return { status: 'disabled' };
  }

  try {
    const result = await registerCurrentPushDeviceAsync({
      requestPermission: true,
      ignoreStoredPreference: true,
    });
    await saveStoredPushNotificationsEnabled(result.status === 'registered');
    return result;
  } catch (error) {
    await saveStoredPushNotificationsEnabled(false);
    throw error;
  }
}

export function isAppStateActive(): boolean {
  return AppState.currentState === 'active';
}

export function logPushRegistrationResult(result: PushRegistrationResult): void {
  if (result.status === 'registered') {
    logger.debug('푸시 디바이스 등록 완료', {
      installationId: result.installationId,
      tokenChanged: result.tokenChanged,
    });
    return;
  }

  logger.debug('푸시 디바이스 등록 생략', { reason: result.reason });
}

export function logPushRegistrationError(error: unknown): void {
  logger.warn('푸시 디바이스 등록 실패', error);
}

export function logPushUnregistrationError(error: unknown): void {
  logger.warn('푸시 디바이스 해제 실패', error);
}
