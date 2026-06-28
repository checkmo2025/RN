import { useCallback, useEffect, useState } from 'react';
import { Linking } from 'react-native';

import appConfig from '../../app.json';
import {
  fetchAppVersionPolicy,
  getAppPlatform,
  type AppVersionPolicy,
} from '../services/api/appVersionApi';
import { createLogger } from '../utils/logger';
import { showToast } from '../utils/toast';

const logger = createLogger('AppVersionGate');

export const CURRENT_APP_VERSION = appConfig.expo.version;

export type AppVersionGateState =
  | { status: 'checking' | 'none' }
  | { status: 'force' | 'recommend'; policy: AppVersionPolicy; currentVersion: string };

function parseVersion(version: string): number[] {
  return version
    .trim()
    .split(/[+-]/, 1)[0]
    .split('.')
    .map((part) => {
      const value = Number.parseInt(part, 10);
      return Number.isFinite(value) ? value : 0;
    });
}

export function compareSemanticVersion(left: string, right: string): number {
  const leftParts = parseVersion(left);
  const rightParts = parseVersion(right);
  const maxLength = Math.max(leftParts.length, rightParts.length, 3);

  for (let index = 0; index < maxLength; index += 1) {
    const leftValue = leftParts[index] ?? 0;
    const rightValue = rightParts[index] ?? 0;

    if (leftValue < rightValue) return -1;
    if (leftValue > rightValue) return 1;
  }

  return 0;
}

function resolveGateState(policy: AppVersionPolicy): AppVersionGateState {
  if (compareSemanticVersion(CURRENT_APP_VERSION, policy.minSupportedVersion) < 0) {
    return { status: 'force', policy, currentVersion: CURRENT_APP_VERSION };
  }

  if (compareSemanticVersion(CURRENT_APP_VERSION, policy.latestVersion) < 0) {
    return { status: 'recommend', policy, currentVersion: CURRENT_APP_VERSION };
  }

  return { status: 'none' };
}

export function useAppVersionGate() {
  const [state, setState] = useState<AppVersionGateState>({ status: 'checking' });

  useEffect(() => {
    const platform = getAppPlatform();
    if (!platform) {
      setState({ status: 'none' });
      return;
    }

    let canceled = false;

    fetchAppVersionPolicy(platform)
      .then((policy) => {
        if (!canceled) {
          setState(resolveGateState(policy));
        }
      })
      .catch((error) => {
        logger.warn('앱 버전 정책 조회 실패', error);
        if (!canceled) {
          setState({ status: 'none' });
        }
      });

    return () => {
      canceled = true;
    };
  }, []);

  const dismissRecommendation = useCallback(() => {
    setState((current) => (current.status === 'recommend' ? { status: 'none' } : current));
  }, []);

  const openStore = useCallback(async () => {
    if (state.status !== 'force' && state.status !== 'recommend') return;

    try {
      await Linking.openURL(state.policy.storeUrl);
    } catch (error) {
      logger.warn('스토어 URL 열기 실패', error);
      showToast('스토어를 열 수 없습니다. 잠시 후 다시 시도해 주세요.');
    }
  }, [state]);

  return {
    state,
    dismissRecommendation,
    openStore,
  };
}
