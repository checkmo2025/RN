import { AppState, Platform } from 'react-native';
import * as Application from 'expo-application';
import Constants from 'expo-constants';
import * as Device from 'expo-device';
import * as Notifications from 'expo-notifications';

import {
  registerPushDevice,
  unregisterPushDevice,
  type PushDeviceRegistrationResult,
  type PushPlatform,
} from '../api/pushDeviceApi';
import { ApiError } from '../api/http';
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
        | 'channel-disabled'
        | 'missing-project-id'
        | 'user-disabled';
    };

type RegisteredPushResult = Extract<PushRegistrationResult, { status: 'registered' }>;

export type PushPreferenceUpdateResult =
  | PushRegistrationResult
  | {
      status: 'disabled';
    };

export type PushNotificationsState = {
  preferenceEnabled: boolean;
  permissionStatus: 'granted' | 'denied' | 'undetermined';
  channelEnabled: boolean;
  enabled: boolean;
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
let pushDeviceRegistrationInFlight: Promise<RegisteredPushResult> | null = null;

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

async function isAndroidPushChannelEnabledAsync(): Promise<boolean> {
  if (Platform.OS !== 'android') return true;

  try {
    const channel = await Notifications.getNotificationChannelAsync(CHECKMO_PUSH_CHANNEL_ID);
    return !channel || channel.importance !== Notifications.AndroidImportance.NONE;
  } catch {
    return true;
  }
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

export async function getPushNotificationsStateAsync(): Promise<PushNotificationsState> {
  const preferenceEnabled = await getStoredPushNotificationsEnabled();
  const platform = resolvePushPlatform();
  if (!platform || !Device.isDevice) {
    return {
      preferenceEnabled,
      permissionStatus: 'undetermined',
      channelEnabled: platform !== 'ANDROID',
      enabled: false,
    };
  }

  const [permissionStatus, channelEnabled] = await Promise.all([
    ensureNotificationPermissionAsync(false),
    isAndroidPushChannelEnabledAsync(),
  ]);

  return {
    preferenceEnabled,
    permissionStatus,
    channelEnabled,
    enabled: preferenceEnabled && permissionStatus === 'granted' && channelEnabled,
  };
}

function assertActivePushRegistration(
  registration: PushDeviceRegistrationResult,
): PushDeviceRegistrationResult {
  if (registration.active) return registration;
  throw new ApiError(
    '푸시 디바이스가 활성화되지 않았습니다.',
    409,
    'PUSH_DEVICE_INACTIVE',
    registration,
  );
}

async function registerPushDeviceSingleFlight(
  platform: PushPlatform,
  projectId: string,
): Promise<RegisteredPushResult> {
  if (pushDeviceRegistrationInFlight) return pushDeviceRegistrationInFlight;

  const registrationPromise = (async (): Promise<RegisteredPushResult> => {
    const expoPushToken = (await Notifications.getExpoPushTokenAsync({ projectId })).data.trim();
    const installationId = await getStoredPushInstallationId();
    const previousExpoPushToken = await getStoredLastExpoPushToken();
    const registration = assertActivePushRegistration(
      await registerPushDevice({
        installationId,
        expoPushToken,
        platform,
        appVersion: resolveAppVersion(),
        buildNumber: resolveBuildNumber(),
      }),
    );

    await saveStoredPushInstallationId(registration.installationId);
    await saveStoredLastExpoPushToken(expoPushToken);

    return {
      status: 'registered',
      installationId: registration.installationId,
      tokenChanged: previousExpoPushToken !== expoPushToken,
    };
  })();

  pushDeviceRegistrationInFlight = registrationPromise;
  try {
    return await registrationPromise;
  } finally {
    if (pushDeviceRegistrationInFlight === registrationPromise) {
      pushDeviceRegistrationInFlight = null;
    }
  }
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
  if (!(await isAndroidPushChannelEnabledAsync())) {
    return { status: 'skipped', reason: 'channel-disabled' };
  }

  const projectId = resolveEasProjectId();
  if (!projectId) {
    return { status: 'skipped', reason: 'missing-project-id' };
  }
  if (!options.ignoreStoredPreference && !(await getStoredPushNotificationsEnabled())) {
    return { status: 'skipped', reason: 'user-disabled' };
  }

  return registerPushDeviceSingleFlight(platform, projectId);
}

export async function unregisterCurrentPushDeviceAsync(
  options: { deleteInstallationId?: boolean } = {},
): Promise<void> {
  if (pushDeviceRegistrationInFlight) {
    try {
      await pushDeviceRegistrationInFlight;
    } catch {
      // Continue with any installation ID that remains after a failed registration.
    }
  }

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
    const keepEnabledIntent =
      result.status === 'registered' ||
      (result.status === 'skipped' &&
        (result.reason === 'permission-denied' ||
          result.reason === 'permission-undetermined' ||
          result.reason === 'channel-disabled'));
    await saveStoredPushNotificationsEnabled(keepEnabledIntent);
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
