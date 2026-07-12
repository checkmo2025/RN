import { useCallback, useEffect, useRef } from 'react';
import { Linking } from 'react-native';
import type { NavigationContainerRefWithCurrent } from '@react-navigation/native';

import type { RootStackParamList, TabParamList } from '../../navigation/types';
import { trackCampaignDetails } from '../../services/analytics';
import { parseCheckmoDeepLink, type DeepLinkTarget } from '../../services/deepLinking';
import { captureMarketingAttribution } from '../../services/marketingAttribution';
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
  const handledMarketingUrlRef = useRef<string | null>(null);

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

      const shouldTrackMarketing = handledMarketingUrlRef.current !== url;
      handledMarketingUrlRef.current = url;

      if (shouldTrackMarketing) void captureMarketingAttribution(url)
        .then((attribution) => {
          if (!attribution) return;
          logger.info('마케팅 유입 저장', {
            source: attribution.source,
            campaign: attribution.campaign,
          });
          return trackCampaignDetails(attribution);
        })
        .then((tracked) => {
          if (tracked) logger.info('GA4 캠페인 이벤트 전송');
        })
        .catch((error) => logger.warn('마케팅 유입 처리 실패', error));

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
