import { Platform } from 'react-native';

import { ApiEnvelope, requestJson, unwrapResult } from './http';

export type AppPlatform = 'ios' | 'android';

export type AppVersionPolicy = {
  minSupportedVersion: string;
  latestVersion: string;
  storeUrl: string;
};

export function getAppPlatform(): AppPlatform | null {
  if (Platform.OS === 'ios' || Platform.OS === 'android') {
    return Platform.OS;
  }

  return null;
}

export async function fetchAppVersionPolicy(platform: AppPlatform): Promise<AppVersionPolicy> {
  const response = await requestJson<ApiEnvelope<AppVersionPolicy>>('/app/version', {
    query: { platform },
    credentials: 'omit',
    headers: {
      Accept: 'application/json',
    },
    retryOnUnauthorized: false,
    suppressErrorToast: true,
    timeoutMs: 5_000,
  });
  const result = unwrapResult(response);

  if (!result) {
    throw new Error('앱 버전 정책 응답이 비어 있습니다.');
  }

  return result;
}
