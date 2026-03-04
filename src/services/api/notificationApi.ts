import { ApiEnvelope, requestJson, unwrapResult } from './http';

type UnknownRecord = Record<string, unknown>;

export type NotificationType =
  | 'LIKE'
  | 'COMMENT'
  | 'FOLLOW'
  | 'JOIN_CLUB'
  | 'CLUB_MEETING_CREATED'
  | 'CLUB_NOTICE_CREATED';

export type NotificationItem = {
  notificationId: number;
  notificationType: NotificationType;
  domainId?: number;
  sourceId?: number;
  displayName: string;
  read: boolean;
  createdAt: string;
};

export type NotificationFeed = {
  items: NotificationItem[];
  hasNext: boolean;
  nextCursor: number | null;
  pageSize: number;
};

export type NotificationSettingType =
  | 'BOOK_STORY_LIKED'
  | 'BOOK_STORY_COMMENT'
  | 'CLUB_NOTICE_CREATED'
  | 'CLUB_MEETING_CREATED'
  | 'NEW_FOLLOWER'
  | 'JOIN_CLUB';

export type NotificationSettingInfo = {
  bookStoryLiked: boolean;
  bookStoryComment: boolean;
  clubNoticeCreated: boolean;
  clubMeetingCreated: boolean;
  newFollower: boolean;
  joinClub: boolean;
};

type NotificationListResult = {
  notifications?: unknown[];
  hasNext?: boolean;
  nextCursor?: number | null;
  pageSize?: number;
};

type NotificationPreviewResult = {
  notifications?: unknown[];
};

type NotificationSettingResult = {
  bookStoryLiked?: boolean;
  bookStoryComment?: boolean;
  clubNoticeCreated?: boolean;
  clubMeetingCreated?: boolean;
  newFollower?: boolean;
  joinClub?: boolean;
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
  return typeof value === 'string' ? value : undefined;
}

function toBoolean(value: unknown): boolean | undefined {
  return typeof value === 'boolean' ? value : undefined;
}

function toNotificationType(value: unknown): NotificationType | undefined {
  if (
    value === 'LIKE' ||
    value === 'COMMENT' ||
    value === 'FOLLOW' ||
    value === 'JOIN_CLUB' ||
    value === 'CLUB_MEETING_CREATED' ||
    value === 'CLUB_NOTICE_CREATED'
  ) {
    return value;
  }
  return undefined;
}

function readFirstNumber(record: UnknownRecord, keys: string[]): number | undefined {
  for (const key of keys) {
    const value = toNumber(record[key]);
    if (typeof value === 'number') {
      return value;
    }
  }

  return undefined;
}

function normalizeNotificationItem(raw: unknown): NotificationItem | null {
  const record = asRecord(raw);
  if (!record) return null;

  const notificationId = toNumber(record.notificationId);
  const notificationType = toNotificationType(record.notificationType);
  if (typeof notificationId !== 'number' || !notificationType) return null;

  const domainId =
    notificationType === 'LIKE' || notificationType === 'COMMENT'
      ? readFirstNumber(record, ['domainId', 'bookStoryId', 'storyId'])
      : notificationType === 'JOIN_CLUB' ||
          notificationType === 'CLUB_MEETING_CREATED' ||
          notificationType === 'CLUB_NOTICE_CREATED'
        ? readFirstNumber(record, ['domainId', 'clubId'])
        : readFirstNumber(record, ['domainId']);

  const sourceId =
    notificationType === 'CLUB_NOTICE_CREATED'
      ? readFirstNumber(record, ['sourceId', 'noticeId'])
      : notificationType === 'CLUB_MEETING_CREATED'
        ? readFirstNumber(record, ['sourceId', 'meetingId'])
        : notificationType === 'JOIN_CLUB'
          ? readFirstNumber(record, ['sourceId', 'clubMemberId', 'memberId'])
          : readFirstNumber(record, ['sourceId']);

  return {
    notificationId,
    notificationType,
    domainId,
    sourceId,
    displayName: toStringValue(record.displayName) ?? '',
    read: toBoolean(record.read) ?? false,
    createdAt: toStringValue(record.createdAt) ?? '',
  };
}

function normalizeNotificationFeed(result: unknown): NotificationFeed {
  const record = asRecord(result);
  if (!record) {
    return {
      items: [],
      hasNext: false,
      nextCursor: null,
      pageSize: 0,
    };
  }

  const notifications = Array.isArray(record.notifications) ? record.notifications : [];
  return {
    items: notifications
      .map(normalizeNotificationItem)
      .filter((item): item is NotificationItem => Boolean(item)),
    hasNext: toBoolean(record.hasNext) ?? false,
    nextCursor: toNumber(record.nextCursor) ?? null,
    pageSize: toNumber(record.pageSize) ?? notifications.length,
  };
}

export async function fetchNotificationPreview(size = 5): Promise<NotificationItem[]> {
  const response = await requestJson<ApiEnvelope<NotificationPreviewResult>>('/notifications/preview', {
    method: 'GET',
    query: {
      size,
    },
  });

  const result = unwrapResult(response);
  return normalizeNotificationFeed(result).items;
}

export async function fetchNotifications(cursorId?: number): Promise<NotificationFeed> {
  const response = await requestJson<ApiEnvelope<NotificationListResult>>('/notifications', {
    method: 'GET',
    query: {
      cursorId,
    },
  });

  const result = unwrapResult(response);
  return normalizeNotificationFeed(result);
}

export async function markNotificationAsRead(notificationId: number): Promise<void> {
  await requestJson<ApiEnvelope<number>>(`/notifications/${notificationId}/read`, {
    method: 'PATCH',
  });
}

export async function fetchNotificationSettings(): Promise<NotificationSettingInfo> {
  const response = await requestJson<ApiEnvelope<NotificationSettingResult>>('/notifications/settings', {
    method: 'GET',
  });

  const result = asRecord(unwrapResult(response));

  return {
    bookStoryLiked: toBoolean(result?.bookStoryLiked) ?? true,
    bookStoryComment: toBoolean(result?.bookStoryComment) ?? true,
    clubNoticeCreated: toBoolean(result?.clubNoticeCreated) ?? true,
    clubMeetingCreated: toBoolean(result?.clubMeetingCreated) ?? true,
    newFollower: toBoolean(result?.newFollower) ?? true,
    joinClub: toBoolean(result?.joinClub) ?? true,
  };
}

export async function toggleNotificationSetting(settingType: NotificationSettingType): Promise<void> {
  await requestJson<ApiEnvelope<void>>(`/notifications/settings/${settingType}`, {
    method: 'PATCH',
  });
}
