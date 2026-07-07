import type { NotificationItem, NotificationType } from '../api/notificationApi';

type UnknownRecord = Record<string, unknown>;

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

function readFirstNumber(record: UnknownRecord, keys: string[]): number | undefined {
  for (const key of keys) {
    const value = toNumber(record[key]);
    if (typeof value === 'number') return value;
  }
  return undefined;
}

function readFirstString(record: UnknownRecord, keys: string[]): string | undefined {
  for (const key of keys) {
    const value = toStringValue(record[key]);
    if (value) return value;
  }
  return undefined;
}

export function parsePushNotificationData(data: unknown): NotificationItem | null {
  const record = asRecord(data);
  if (!record) return null;

  const nestedNotification = asRecord(record.notification);
  const source = nestedNotification ?? record;
  const notificationId = readFirstNumber(source, ['notificationId', 'id']);
  const notificationType = readFirstString(source, ['notificationType', 'type']) as
    | NotificationType
    | undefined;

  if (typeof notificationId !== 'number' || !notificationType) {
    return null;
  }

  const domainId =
    notificationType === 'LIKE' || notificationType === 'COMMENT'
      ? readFirstNumber(source, ['domainId', 'bookStoryId', 'storyId'])
      : notificationType === 'JOIN_CLUB' ||
          notificationType === 'CLUB_MEETING_CREATED' ||
          notificationType === 'CLUB_NOTICE_CREATED'
        ? readFirstNumber(source, ['domainId', 'clubId'])
        : readFirstNumber(source, ['domainId']);

  const sourceId =
    notificationType === 'CLUB_NOTICE_CREATED'
      ? readFirstNumber(source, ['sourceId', 'noticeId'])
      : notificationType === 'CLUB_MEETING_CREATED'
        ? readFirstNumber(source, ['sourceId', 'meetingId'])
        : notificationType === 'JOIN_CLUB'
          ? readFirstNumber(source, ['sourceId', 'clubMemberId', 'memberId'])
          : readFirstNumber(source, ['sourceId']);

  return {
    notificationId,
    notificationType,
    domainId,
    sourceId,
    displayName: readFirstString(source, ['displayName', 'actorName', 'clubName']) ?? '',
    read: false,
    createdAt: readFirstString(source, ['createdAt']) ?? '',
  };
}
