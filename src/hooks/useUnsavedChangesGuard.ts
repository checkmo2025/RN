import { useCallback, useEffect } from 'react';
import { Alert, BackHandler } from 'react-native';
import {
  useNavigation,
  useRoute,
  type EventArg,
  type NavigationAction,
  type NavigationProp,
  type ParamListBase,
} from '@react-navigation/native';

type UseUnsavedChangesGuardParams = {
  enabled: boolean;
  isDirty: boolean;
  onConfirmLeave: () => void;
  title?: string;
  message?: string;
  confirmText?: string;
  cancelText?: string;
  guardNavigation?: boolean;
  guardTabPress?: boolean;
  guardHardwareBack?: boolean;
};

type ConfirmOptions = {
  onConfirm?: () => void;
};

const DEFAULT_TITLE = '알림';
const DEFAULT_MESSAGE = '현재 페이지는 저장되지 않습니다.';
const DEFAULT_CONFIRM_TEXT = '닫기';
const DEFAULT_CANCEL_TEXT = '취소';

export function useUnsavedChangesGuard({
  enabled,
  isDirty,
  onConfirmLeave,
  title = DEFAULT_TITLE,
  message = DEFAULT_MESSAGE,
  confirmText = DEFAULT_CONFIRM_TEXT,
  cancelText = DEFAULT_CANCEL_TEXT,
  guardNavigation = true,
  guardTabPress = true,
  guardHardwareBack = true,
}: UseUnsavedChangesGuardParams) {
  const navigation = useNavigation<NavigationProp<ParamListBase>>();
  const route = useRoute();

  const confirmIfDirty = useCallback(
    ({ onConfirm }: ConfirmOptions = {}) => {
      const leave = () => {
        onConfirmLeave();
        onConfirm?.();
      };

      if (!enabled || !isDirty) {
        leave();
        return;
      }

      Alert.alert(title, message, [
        { text: cancelText, style: 'cancel' },
        { text: confirmText, style: 'destructive', onPress: leave },
      ]);
    },
    [
      cancelText,
      confirmText,
      enabled,
      isDirty,
      message,
      onConfirmLeave,
      title,
    ],
  );

  useEffect(() => {
    if (!guardNavigation) return undefined;

    const unsubscribe = navigation.addListener(
      'beforeRemove',
      (event: EventArg<'beforeRemove', true, { action: NavigationAction }>) => {
        if (!enabled || !isDirty) return;

        event.preventDefault();
        confirmIfDirty({
          onConfirm: () => navigation.dispatch(event.data.action),
        });
      },
    );

    return unsubscribe;
  }, [confirmIfDirty, enabled, guardNavigation, isDirty, navigation]);

  useEffect(() => {
    if (!guardTabPress) return undefined;

    const parent = navigation.getParent() as
      | (NavigationProp<ParamListBase> & {
          addListener: (
            eventName: 'tabPress',
            listener: (event: EventArg<'tabPress', true, undefined>) => void,
          ) => () => void;
        })
      | undefined;
    if (!parent) return undefined;

    const unsubscribe = parent.addListener(
      'tabPress',
      (event: EventArg<'tabPress', true, undefined>) => {
        if (!enabled || !isDirty) return;

        const targetRoute = parent
          .getState()
          .routes.find((routeItem) => routeItem.key === event.target);
        if (!targetRoute || targetRoute.name === route.name) return;

        event.preventDefault();
        confirmIfDirty({
          onConfirm: () => parent.navigate(targetRoute.name),
        });
      },
    );

    return unsubscribe;
  }, [confirmIfDirty, enabled, guardTabPress, isDirty, navigation, route.name]);

  useEffect(() => {
    if (!guardHardwareBack || !enabled) return undefined;

    const subscription = BackHandler.addEventListener('hardwareBackPress', () => {
      confirmIfDirty();
      return true;
    });

    return () => subscription.remove();
  }, [confirmIfDirty, enabled, guardHardwareBack]);

  const requestClose = useCallback(() => {
    confirmIfDirty();
  }, [confirmIfDirty]);

  return {
    requestClose,
  };
}
