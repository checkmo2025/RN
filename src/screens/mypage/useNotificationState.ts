import { useCallback, useEffect, useRef, useState } from 'react';
import { AppState, Linking } from 'react-native';
import { type NavigationProp, type ParamListBase } from '@react-navigation/native';
import { ApiError } from '../../services/api/http';
import {
  fetchNotifications,
  fetchNotificationSettings,
  markNotificationAsRead,
  toggleNotificationSetting,
  type NotificationItem,
  type NotificationSettingInfo,
  type NotificationSettingType,
} from '../../services/api/notificationApi';
import {
  getPushNotificationsStateAsync,
  logPushRegistrationError,
  setPushNotificationsEnabledAsync,
  type PushPreferenceUpdateResult,
} from '../../services/push/pushNotificationService';
import { formatNotificationText, resolveNotificationTarget } from '../../utils/notification';
import { showToast } from '../../utils/toast';
import { resolveApiError } from '../../utils/resolveApiError';

export type AlarmItem = {
  id: string;
  notificationId: number;
  notificationType: NotificationItem['notificationType'];
  domainId?: number;
  sourceId?: number;
  displayName: string;
  text: string;
  createdAt: string;
  unread?: boolean;
};

export const defaultNotificationSettings: NotificationSettingInfo = {
  bookStoryLiked: true,
  bookStoryComment: true,
  clubNoticeCreated: true,
  clubMeetingCreated: true,
  newFollower: true,
  joinClub: true,
};

export const notificationSettingRows: Array<{
  type: NotificationSettingType;
  label: string;
  key: keyof NotificationSettingInfo;
}> = [
  { type: 'BOOK_STORY_LIKED', label: '책 이야기 좋아요 알림', key: 'bookStoryLiked' },
  { type: 'BOOK_STORY_COMMENT', label: '책 이야기 댓글 알림', key: 'bookStoryComment' },
  { type: 'NEW_FOLLOWER', label: '구독자 알림', key: 'newFollower' },
  { type: 'JOIN_CLUB', label: '독서 모임 가입 알림', key: 'joinClub' },
  { type: 'CLUB_MEETING_CREATED', label: '모임 일정 알림', key: 'clubMeetingCreated' },
  { type: 'CLUB_NOTICE_CREATED', label: '공지사항 알림', key: 'clubNoticeCreated' },
];

const FETCH_ERROR_OVERRIDES = {
  400: '요청 정보를 다시 확인해야 합니다.',
  401: '로그인 상태를 확인해 주십시오.',
  403: '접근 권한이 없습니다.',
  404: '요청한 정보를 찾을 수 없습니다.',
} as const;

type Params = {
  isLoggedIn: boolean;
  navigation: NavigationProp<ParamListBase>;
};

export function useNotificationState({ isLoggedIn, navigation }: Params) {
  const [alarms, setAlarms] = useState<AlarmItem[]>([]);
  const [loadingAlarms, setLoadingAlarms] = useState(false);
  const [notificationSettings, setNotificationSettings] = useState<NotificationSettingInfo>(
    defaultNotificationSettings,
  );
  const [pushNotificationsEnabled, setPushNotificationsEnabled] = useState(false);
  const [loadingNotificationSettings, setLoadingNotificationSettings] = useState(false);
  const [togglingNotificationSetting, setTogglingNotificationSetting] =
    useState<NotificationSettingType | null>(null);
  const [togglingPushNotifications, setTogglingPushNotifications] = useState(false);
  const retryPushEnableAfterSettingsRef = useRef(false);

  const mapNotificationToAlarm = useCallback((item: NotificationItem): AlarmItem => {
    return {
      id: `alarm-${item.notificationId}`,
      notificationId: item.notificationId,
      notificationType: item.notificationType,
      domainId: item.domainId,
      sourceId: item.sourceId,
      displayName: item.displayName,
      text: formatNotificationText(item.notificationType, item.displayName),
      createdAt: item.createdAt,
      unread: !item.read,
    };
  }, []);

  const navigateByNotification = useCallback(
    (notification: NotificationItem) => {
      const target = resolveNotificationTarget(notification);
      if (target.toastMessage) {
        showToast(target.toastMessage);
      }
      if (!target.screen) return;
      navigation.navigate(target.screen, target.params);
    },
    [navigation],
  );

  const loadAllNotifications = useCallback(async () => {
    if (!isLoggedIn) {
      setAlarms([]);
      return;
    }

    setLoadingAlarms(true);
    try {
      const allItems: NotificationItem[] = [];
      let cursorId: number | undefined;
      const visitedCursors = new Set<number>();
      const seenNotificationIds = new Set<number>();

      for (let i = 0; i < 100; i += 1) {
        const response = await fetchNotifications(cursorId);
        response.items.forEach((item) => {
          if (seenNotificationIds.has(item.notificationId)) return;
          seenNotificationIds.add(item.notificationId);
          allItems.push(item);
        });
        if (!response.hasNext || typeof response.nextCursor !== 'number') break;
        if (visitedCursors.has(response.nextCursor)) break;

        visitedCursors.add(response.nextCursor);
        cursorId = response.nextCursor;
      }

      setAlarms(allItems.map(mapNotificationToAlarm));
    } catch (error) {
      setAlarms([]);
      showToast(resolveApiError(error, FETCH_ERROR_OVERRIDES, '알림 목록을 불러오지 못했습니다.'));
    } finally {
      setLoadingAlarms(false);
    }
  }, [isLoggedIn, mapNotificationToAlarm]);

  const loadNotificationSettingInfo = useCallback(async () => {
    if (!isLoggedIn) {
      setNotificationSettings(defaultNotificationSettings);
      setPushNotificationsEnabled(false);
      return;
    }

    setLoadingNotificationSettings(true);
    const [settingResult, pushStateResult] = await Promise.allSettled([
      fetchNotificationSettings(),
      getPushNotificationsStateAsync(),
    ]);

    if (settingResult.status === 'fulfilled') {
      setNotificationSettings(settingResult.value);
    } else {
      const error = settingResult.reason;
      if (error instanceof ApiError && error.status === 401) {
        setNotificationSettings(defaultNotificationSettings);
      } else if (!(error instanceof ApiError)) {
        showToast('알림 설정을 불러오지 못했습니다.');
      }
    }

    if (pushStateResult.status === 'fulfilled') {
      setPushNotificationsEnabled(pushStateResult.value.enabled);
    } else {
      logPushRegistrationError(pushStateResult.reason);
      setPushNotificationsEnabled(false);
    }
    setLoadingNotificationSettings(false);
  }, [isLoggedIn]);

  const resolvePushPreferenceMessage = useCallback(
    (result: PushPreferenceUpdateResult): string | null => {
      if (result.status !== 'skipped') return null;

      switch (result.reason) {
        case 'permission-denied':
          return '기기 설정에서 책모 알림 권한을 허용해 주세요.';
        case 'permission-undetermined':
          return '알림 권한을 허용해야 푸시 알림을 받을 수 있습니다.';
        case 'channel-disabled':
          return '기기 설정에서 책모 알림 채널을 허용해 주세요.';
        case 'not-physical-device':
          return '푸시 알림은 실제 기기에서만 사용할 수 있습니다.';
        case 'missing-project-id':
          return '푸시 알림 프로젝트 설정을 확인할 수 없습니다.';
        case 'unsupported-platform':
          return '이 기기에서는 푸시 알림을 사용할 수 없습니다.';
        case 'user-disabled':
        default:
          return null;
      }
    },
    [],
  );

  const handleTogglePushNotifications = useCallback(() => {
    if (togglingPushNotifications) return;
    const previous = pushNotificationsEnabled;
    const next = !previous;

    setPushNotificationsEnabled(next);
    setTogglingPushNotifications(true);

    const submit = async () => {
      try {
        const result = await setPushNotificationsEnabledAsync(next);
        if (next && result.status !== 'registered') {
          setPushNotificationsEnabled(false);
          const message = resolvePushPreferenceMessage(result);
          if (message) showToast(message);
          if (
            result.status === 'skipped' &&
            (result.reason === 'permission-denied' ||
              result.reason === 'permission-undetermined' ||
              result.reason === 'channel-disabled')
          ) {
            retryPushEnableAfterSettingsRef.current = true;
            try {
              await Linking.openSettings();
            } catch {
              retryPushEnableAfterSettingsRef.current = false;
              showToast('기기 알림 설정을 열지 못했습니다.');
            }
          }
          return;
        }
        retryPushEnableAfterSettingsRef.current = false;
        setPushNotificationsEnabled(next);
      } catch (error) {
        logPushRegistrationError(error);
        setPushNotificationsEnabled(previous);
        showToast('푸시 알림 설정을 변경하지 못했습니다.');
      } finally {
        setTogglingPushNotifications(false);
      }
    };
    void submit();
  }, [pushNotificationsEnabled, resolvePushPreferenceMessage, togglingPushNotifications]);

  useEffect(() => {
    const subscription = AppState.addEventListener('change', (nextAppState) => {
      if (nextAppState !== 'active' || !isLoggedIn) return;

      const syncPushState = async () => {
        if (!retryPushEnableAfterSettingsRef.current) {
          try {
            const state = await getPushNotificationsStateAsync();
            setPushNotificationsEnabled(state.enabled);
          } catch (error) {
            logPushRegistrationError(error);
          }
          return;
        }

        retryPushEnableAfterSettingsRef.current = false;
        setTogglingPushNotifications(true);
        try {
          const result = await setPushNotificationsEnabledAsync(true);
          const registered = result.status === 'registered';
          setPushNotificationsEnabled(registered);
          if (registered) {
            showToast('푸시 알림을 켰습니다.');
          } else {
            const message = resolvePushPreferenceMessage(result);
            if (message) showToast(message);
          }
        } catch (error) {
          logPushRegistrationError(error);
          setPushNotificationsEnabled(false);
          showToast('푸시 알림 설정을 변경하지 못했습니다.');
        } finally {
          setTogglingPushNotifications(false);
        }
      };

      void syncPushState();
    });

    return () => {
      subscription.remove();
    };
  }, [isLoggedIn, resolvePushPreferenceMessage]);

  const handlePressAlarm = useCallback(
    (alarm: AlarmItem) => {
      const notification: NotificationItem = {
        notificationId: alarm.notificationId,
        notificationType: alarm.notificationType,
        domainId: alarm.domainId,
        sourceId: alarm.sourceId,
        displayName: alarm.displayName,
        read: !alarm.unread,
        createdAt: alarm.createdAt,
      };

      setAlarms((prev) =>
        prev.map((item) =>
          item.notificationId === alarm.notificationId ? { ...item, unread: false } : item,
        ),
      );
      navigateByNotification(notification);

      if (!alarm.unread) return;

      const submit = async () => {
        try {
          await markNotificationAsRead(alarm.notificationId);
        } catch {
          setAlarms((prev) =>
            prev.map((item) =>
              item.notificationId === alarm.notificationId ? { ...item, unread: true } : item,
            ),
          );
        }
      };
      void submit();
    },
    [navigateByNotification],
  );

  const handleToggleNotificationSetting = useCallback(
    (settingType: NotificationSettingType) => {
      const row = notificationSettingRows.find((item) => item.type === settingType);
      if (!row) return;
      const key = row.key;
      const previous = notificationSettings[key];
      const next = !previous;

      setNotificationSettings((prev) => ({ ...prev, [key]: next }));
      setTogglingNotificationSetting(settingType);

      const submit = async () => {
        try {
          await toggleNotificationSetting(settingType);
        } catch (error) {
          setNotificationSettings((prev) => ({ ...prev, [key]: previous }));
          if (!(error instanceof ApiError)) {
            showToast('알림 설정을 변경하지 못했습니다.');
          }
        } finally {
          setTogglingNotificationSetting((prevType) =>
            prevType === settingType ? null : prevType,
          );
        }
      };
      void submit();
    },
    [notificationSettings],
  );

  return {
    alarms,
    loadingAlarms,
    notificationSettings,
    pushNotificationsEnabled,
    loadingNotificationSettings,
    togglingNotificationSetting,
    togglingPushNotifications,
    loadAllNotifications,
    loadNotificationSettingInfo,
    handlePressAlarm,
    handleToggleNotificationSetting,
    handleTogglePushNotifications,
  };
}
