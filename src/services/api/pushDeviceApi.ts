import { ApiEnvelope, ApiError, requestJson, unwrapResult } from './http';

type UnknownRecord = Record<string, unknown>;

export type PushPlatform = 'IOS' | 'ANDROID';

export type PushDeviceRegistrationPayload = {
  installationId: string | null;
  expoPushToken: string;
  platform: PushPlatform;
  appVersion: string;
  buildNumber: string;
};

export type PushDeviceRegistrationResult = {
  deviceId?: number;
  installationId: string;
  active: boolean;
  registeredAt?: string;
};

type PushDeviceRegistrationRawResult = {
  deviceId?: unknown;
  installationId?: unknown;
  active?: unknown;
  registeredAt?: unknown;
};

function asRecord(value: unknown): UnknownRecord | null {
  return typeof value === 'object' && value !== null ? (value as UnknownRecord) : null;
}

function toNumber(value: unknown): number | undefined {
  if (typeof value === 'number' && Number.isFinite(value)) return value;
  if (typeof value === 'string') {
    const parsed = Number(value);
    if (Number.isFinite(parsed)) return parsed;
  }
  return undefined;
}

function toStringValue(value: unknown): string | undefined {
  return typeof value === 'string' ? value.trim() || undefined : undefined;
}

function toBoolean(value: unknown): boolean | undefined {
  return typeof value === 'boolean' ? value : undefined;
}

function normalizeRegistrationResult(raw: PushDeviceRegistrationRawResult | unknown): PushDeviceRegistrationResult {
  const record = asRecord(raw);
  const installationId = toStringValue(record?.installationId);

  if (!installationId) {
    throw new ApiError('푸시 디바이스 등록 응답을 확인할 수 없습니다.', 500, 'MISSING_INSTALLATION_ID', raw);
  }

  return {
    deviceId: toNumber(record?.deviceId),
    installationId,
    active: toBoolean(record?.active) ?? true,
    registeredAt: toStringValue(record?.registeredAt),
  };
}

export async function registerPushDevice(
  payload: PushDeviceRegistrationPayload,
): Promise<PushDeviceRegistrationResult> {
  const response = await requestJson<ApiEnvelope<PushDeviceRegistrationRawResult>>(
    '/notifications/push-devices',
    {
      method: 'PUT',
      body: payload,
      suppressErrorToast: true,
    },
  );

  return normalizeRegistrationResult(unwrapResult(response));
}

export async function unregisterPushDevice(
  installationId: string,
  options: { suppressUnauthorizedSessionNotification?: boolean } = {},
): Promise<void> {
  const normalizedInstallationId = installationId.trim();
  if (!normalizedInstallationId) return;

  await requestJson<ApiEnvelope<null>>(
    `/notifications/push-devices/${encodeURIComponent(normalizedInstallationId)}`,
    {
      method: 'DELETE',
      suppressErrorToast: true,
      retryOnUnauthorized: options.suppressUnauthorizedSessionNotification ? false : undefined,
      suppressUnauthorizedSessionNotification:
        options.suppressUnauthorizedSessionNotification,
    },
  );
}
