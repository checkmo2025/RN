import { useCallback, useEffect, useRef } from 'react';
import { AppState } from 'react-native';
import type { NavigationContainerRefWithCurrent } from '@react-navigation/native';
import * as Notifications from 'expo-notifications';

import { useAuthGate } from '../../contexts/AuthGateContext';
import type { RootStackParamList, TabParamList } from '../../navigation/types';
import {
  markNotificationAsRead,
  type NotificationItem,
} from '../../services/api/notificationApi';
import {
  configurePushNotificationHandler,
  logPushRegistrationError,
  logPushRegistrationResult,
  registerCurrentPushDeviceAsync,
} from '../../services/push/pushNotificationService';
import { parsePushNotificationData } from '../../services/push/pushPayload';
import { createLogger } from '../../utils/logger';
import { resolveNotificationTarget } from '../../utils/notification';
import { showToast } from '../../utils/toast';

type Props = {
  navigationRef: NavigationContainerRefWithCurrent<RootStackParamList>;
};

const logger = createLogger('PushNotificationCoordinator');

function responseKey(response: Notifications.NotificationResponse): string {
  const requestIdentifier = response.notification.request.identifier;
  const notificationId = response.notification.request.content.data?.notificationId;
  return `${requestIdentifier}:${String(notificationId ?? '')}`;
}

function isDefaultNotificationAction(response: Notifications.NotificationResponse): boolean {
  return response.actionIdentifier === Notifications.DEFAULT_ACTION_IDENTIFIER;
}

export function PushNotificationCoordinator({ navigationRef }: Props) {
  const { isReady, isLoggedIn, requireAuth } = useAuthGate();
  const registrationInFlightRef = useRef(false);
  const pendingResponseRef = useRef<Notifications.NotificationResponse | null>(null);
  const handledResponseKeyRef = useRef<string | null>(null);

  const navigateToAlarm = useCallback(() => {
    if (!navigationRef.isReady()) return false;

    navigationRef.navigate('Tabs', {
      screen: 'My',
      params: { openMyTab: 'ALARM' },
    });
    return true;
  }, [navigationRef]);

  const navigateToNotification = useCallback(
    (notification: NotificationItem | null) => {
      if (!notification) {
        return navigateToAlarm();
      }

      const target = resolveNotificationTarget(notification);
      if (target.toastMessage) {
        showToast(target.toastMessage);
      }

      if (!target.screen) {
        return true;
      }
      if (!navigationRef.isReady()) {
        return false;
      }

      if (target.screen === 'UserProfile') {
        navigationRef.navigate('UserProfile', target.params as RootStackParamList['UserProfile']);
        return true;
      }

      navigationRef.navigate('Tabs', {
        screen: target.screen as keyof TabParamList,
        params: target.params as never,
      });
      return true;
    },
    [navigateToAlarm, navigationRef],
  );

  const handleNotificationResponse = useCallback(
    (response: Notifications.NotificationResponse) => {
      if (!isDefaultNotificationAction(response)) return;

      const key = responseKey(response);
      if (handledResponseKeyRef.current === key) return;

      if (!isReady || !navigationRef.isReady()) {
        pendingResponseRef.current = response;
        return;
      }

      if (!isLoggedIn) {
        handledResponseKeyRef.current = key;
        requireAuth(() => {
          navigateToAlarm();
        });
        return;
      }

      const notification = parsePushNotificationData(response.notification.request.content.data);
      const didNavigate = navigateToNotification(notification);
      if (!didNavigate) {
        pendingResponseRef.current = response;
        return;
      }

      handledResponseKeyRef.current = key;
      if (notification) {
        void markNotificationAsRead(notification.notificationId).catch((error) => {
          logger.warn('푸시 알림 읽음 처리 실패', error);
        });
      }
      void Notifications.clearLastNotificationResponseAsync().catch(() => undefined);
    },
    [isLoggedIn, isReady, navigateToAlarm, navigateToNotification, navigationRef, requireAuth],
  );

  const flushPendingResponse = useCallback(() => {
    const pendingResponse = pendingResponseRef.current;
    if (!pendingResponse) return;
    pendingResponseRef.current = null;
    handleNotificationResponse(pendingResponse);
  }, [handleNotificationResponse]);

  const syncPushRegistration = useCallback(async (requestPermission: boolean) => {
    if (registrationInFlightRef.current) return;
    registrationInFlightRef.current = true;

    try {
      const result = await registerCurrentPushDeviceAsync({ requestPermission });
      logPushRegistrationResult(result);
    } catch (error) {
      logPushRegistrationError(error);
    } finally {
      registrationInFlightRef.current = false;
    }
  }, []);

  useEffect(() => {
    configurePushNotificationHandler();
  }, []);

  useEffect(() => {
    if (!isReady || !isLoggedIn) return;
    void syncPushRegistration(true);
  }, [isLoggedIn, isReady, syncPushRegistration]);

  useEffect(() => {
    const subscription = AppState.addEventListener('change', (nextAppState) => {
      if (nextAppState === 'active' && isReady && isLoggedIn) {
        void syncPushRegistration(false);
      }
    });

    return () => {
      subscription.remove();
    };
  }, [isLoggedIn, isReady, syncPushRegistration]);

  useEffect(() => {
    const subscription = Notifications.addPushTokenListener(() => {
      if (isReady && isLoggedIn) {
        void syncPushRegistration(false);
      }
    });

    return () => {
      subscription.remove();
    };
  }, [isLoggedIn, isReady, syncPushRegistration]);

  useEffect(() => {
    const subscription = Notifications.addNotificationResponseReceivedListener((response) => {
      handleNotificationResponse(response);
    });

    void Notifications.getLastNotificationResponseAsync()
      .then((response) => {
        if (response) {
          handleNotificationResponse(response);
        }
      })
      .catch(() => undefined);

    return () => {
      subscription.remove();
    };
  }, [handleNotificationResponse]);

  useEffect(() => {
    flushPendingResponse();
  }, [flushPendingResponse]);

  return null;
}
