import { useCallback, useEffect, useRef } from 'react';
import { Linking } from 'react-native';
import type { NavigationContainerRefWithCurrent } from '@react-navigation/native';

import type { RootStackParamList, TabParamList } from '../../navigation/types';
import { parseCheckmoDeepLink, type DeepLinkTarget } from '../../services/deepLinking';
import { createLogger } from '../../utils/logger';

type Props = {
  navigationReady: boolean;
  navigationRef: NavigationContainerRefWithCurrent<RootStackParamList>;
};

const logger = createLogger('DeepLinkCoordinator');

function targetKey(target: DeepLinkTarget): string {
  const params = 'params' in target ? target.params : undefined;
  return `${target.screen}:${JSON.stringify(params)}`;
}

export function DeepLinkCoordinator({ navigationReady, navigationRef }: Props) {
  const pendingTargetRef = useRef<DeepLinkTarget | null>(null);
  const handledTargetKeyRef = useRef<string | null>(null);

  const navigateToTarget = useCallback(
    (target: DeepLinkTarget): boolean => {
      if (!navigationReady || !navigationRef.isReady()) {
        pendingTargetRef.current = target;
        return false;
      }

      const key = targetKey(target);
      if (handledTargetKeyRef.current === key) return true;

      if (target.screen === 'UserProfile') {
        navigationRef.navigate('UserProfile', target.params);
      } else {
        navigationRef.navigate('Tabs', {
          screen: target.screen as keyof TabParamList,
          params: 'params' in target ? (target.params as never) : undefined,
        });
      }

      handledTargetKeyRef.current = key;
      return true;
    },
    [navigationReady, navigationRef],
  );

  const handleUrl = useCallback(
    (url: string | null | undefined) => {
      if (!url) return;

      const target = parseCheckmoDeepLink(url);
      if (!target) return;

      logger.info('딥링크 이동', { screen: target.screen });
      navigateToTarget(target);
    },
    [navigateToTarget],
  );

  useEffect(() => {
    void Linking.getInitialURL()
      .then(handleUrl)
      .catch((error) => {
        logger.warn('초기 딥링크 확인 실패', error);
      });

    const subscription = Linking.addEventListener('url', (event) => {
      handleUrl(event.url);
    });

    return () => {
      subscription.remove();
    };
  }, [handleUrl]);

  useEffect(() => {
    const pendingTarget = pendingTargetRef.current;
    if (!pendingTarget) return;

    pendingTargetRef.current = null;
    navigateToTarget(pendingTarget);
  }, [navigateToTarget, navigationReady]);

  return null;
}
