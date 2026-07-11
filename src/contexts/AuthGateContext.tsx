import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';
import { AppState } from 'react-native';

import {
  ApiError,
  PROFILE_INCOMPLETE_MESSAGE,
  ensureFreshAppSessionIfNeeded,
  isStoredRefreshTokenRefreshDue,
  isProfileIncompleteApiError,
  subscribeProfileIncompleteSession,
  subscribeUnauthorizedSession,
} from '../services/api/http';
import {
  getAuthSessionGeneration,
  getStoredRefreshToken,
} from '../services/api/authTokenStore';
import {
  clearStoredAuthSession,
  fetchLoginStatusSilently,
  silentRefreshSession,
} from '../services/api/authApi';
import { clearStoredPushRegistrationCache } from '../services/push/pushDeviceStorage';
import { showToast } from '../utils/toast';

const AUTH_TRANSITION_MS = 1000;

export type AuthPageMode = 'login' | 'profileCompletion';
type AuthSessionState = 'loggedOut' | 'profileIncomplete' | 'loggedIn';

type AuthGateContextValue = {
  isReady: boolean;
  isLoggedIn: boolean;
  isProfileIncomplete: boolean;
  authPageVisible: boolean;
  authPageMode: AuthPageMode;
  authTransitionLoading: boolean;
  authTransitionVariant: 'default' | 'authRequired';
  requireAuth: (onAuthed?: () => void) => void;
  completeLogin: () => void;
  closeAuthPage: () => void;
  logout: () => void;
};

const AuthGateContext = createContext<AuthGateContextValue | null>(null);

type Props = {
  children: React.ReactNode;
};

function isSessionResetError(error: unknown): boolean {
  return error instanceof ApiError && error.code === 'AUTH_405';
}

export function AuthGateProvider({ children }: Props) {
  const [isReady, setIsReady] = useState(false);
  const [authSessionState, setAuthSessionStateValue] = useState<AuthSessionState>('loggedOut');
  const authSessionStateRef = useRef<AuthSessionState>('loggedOut');
  const [authPageVisible, setAuthPageVisible] = useState(false);
  const [authPageMode, setAuthPageMode] = useState<AuthPageMode>('login');
  const [authTransitionLoading, setAuthTransitionLoading] = useState(false);
  const [authTransitionVariant, setAuthTransitionVariant] = useState<'default' | 'authRequired'>(
    'default',
  );
  const pendingActionRef = useRef<(() => void) | null>(null);
  const transitionTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const startAuthTransitionLoading = useCallback(
    (variant: 'default' | 'authRequired' = 'default') => {
      if (transitionTimerRef.current) {
        clearTimeout(transitionTimerRef.current);
      }

      setAuthTransitionVariant(variant);
      setAuthTransitionLoading(true);
      transitionTimerRef.current = setTimeout(() => {
        setAuthTransitionLoading(false);
        setAuthTransitionVariant('default');
        transitionTimerRef.current = null;
      }, AUTH_TRANSITION_MS);
    },
    [],
  );

  const setAuthSessionState = useCallback((next: AuthSessionState) => {
    authSessionStateRef.current = next;
    setAuthSessionStateValue(next);
  }, []);

  const openProfileCompletion = useCallback((options?: { notify?: boolean }) => {
    setAuthSessionState('profileIncomplete');
    setAuthPageMode('profileCompletion');
    setAuthPageVisible(true);
    if (options?.notify) {
      showToast(PROFILE_INCOMPLETE_MESSAGE);
    }
  }, [setAuthSessionState]);

  const applyLoginStatus = useCallback(
    (status: Awaited<ReturnType<typeof fetchLoginStatusSilently>> | null) => {
      if (status) {
        setAuthSessionState('loggedIn');
        setAuthPageVisible(false);
        return;
      }

      void clearStoredPushRegistrationCache();
      setAuthSessionState('loggedOut');
      setAuthPageVisible(false);
    },
    [setAuthSessionState],
  );

  const clearSessionState = useCallback(async () => {
    await Promise.all([
      clearStoredAuthSession(),
      clearStoredPushRegistrationCache(),
    ]);
    setAuthSessionState('loggedOut');
    setAuthPageMode('login');
    setAuthPageVisible(false);
    pendingActionRef.current = null;
  }, [setAuthSessionState]);

  const markSessionLoggedOut = useCallback(() => {
    void clearStoredPushRegistrationCache();
    setAuthSessionState('loggedOut');
    setAuthPageMode('login');
    setAuthPageVisible(false);
    pendingActionRef.current = null;
  }, [setAuthSessionState]);

  useEffect(() => {
    let cancelled = false;

    const syncLoginState = async () => {
      const startupGeneration = getAuthSessionGeneration();

      try {
        const storedRefreshToken = await getStoredRefreshToken();
        if (cancelled) return;

        // 앱 세션은 SecureStore의 RT가 기준이다. AT 쿠키만 남은 상태를 로그인으로 인정하면
        // AT 만료 시점(최대 2시간)에 뒤늦게 로그아웃되는 현상이 다시 발생한다.
        if (!storedRefreshToken) {
          markSessionLoggedOut();
          setIsReady(true);
          return;
        }

        const refreshed = await silentRefreshSession();
        if (cancelled) return;

        const currentRefreshToken = await getStoredRefreshToken();
        if (cancelled) return;
        if (!refreshed && !currentRefreshToken) {
          markSessionLoggedOut();
          setIsReady(true);
          return;
        }

        if (getAuthSessionGeneration() !== startupGeneration) {
          setIsReady(true);
          return;
        }

        const statusGeneration = getAuthSessionGeneration();
        const status = await fetchLoginStatusSilently(true);
        if (cancelled) return;
        if (getAuthSessionGeneration() !== statusGeneration) {
          setIsReady(true);
          return;
        }

        applyLoginStatus(status);
        setIsReady(true);
      } catch (error) {
        if (cancelled) return;
        if (isProfileIncompleteApiError(error)) {
          openProfileCompletion({ notify: true });
          setIsReady(true);
          return;
        }
        if (error instanceof ApiError && error.code === 'AUTH_SESSION_CHANGED') {
          setIsReady(true);
          return;
        }
        if (isSessionResetError(error)) {
          await clearSessionState();
        } else {
          const stillHasRefreshToken = Boolean(await getStoredRefreshToken());
          if (stillHasRefreshToken) {
            // 네트워크/5xx 같은 일시 실패는 세션 만료가 아니다. RT를 보존하고 다음
            // foreground/API 요청에서 다시 검증한다.
            setAuthSessionState('loggedIn');
            setAuthPageVisible(false);
          } else {
            markSessionLoggedOut();
          }
        }
        setIsReady(true);
      }
    };

    void syncLoginState();

    return () => {
      cancelled = true;
    };
  }, [
    applyLoginStatus,
    clearSessionState,
    markSessionLoggedOut,
    openProfileCompletion,
    setAuthSessionState,
  ]);

  useEffect(() => {
    let cancelled = false;

    const refreshForegroundSession = async () => {
      const foregroundGeneration = getAuthSessionGeneration();

      try {
        const refreshToken = await getStoredRefreshToken();
        if (!refreshToken) {
          if (!cancelled && authSessionStateRef.current !== 'loggedOut') {
            markSessionLoggedOut();
          }
          return;
        }

        const wasLoggedOut = authSessionStateRef.current === 'loggedOut';
        const shouldRefresh = wasLoggedOut || (await isStoredRefreshTokenRefreshDue());
        if (!shouldRefresh) return;
        if (getAuthSessionGeneration() !== foregroundGeneration) return;

        // UI가 로그아웃 상태라면 갱신 시각과 관계없이 RT를 실제 검증한 뒤 복구한다.
        const refreshed = wasLoggedOut
          ? await silentRefreshSession()
          : await ensureFreshAppSessionIfNeeded();
        if (cancelled) return;

        if (!refreshed) {
          const stillHasRefreshToken = Boolean(await getStoredRefreshToken());
          if (!cancelled && !stillHasRefreshToken) {
            markSessionLoggedOut();
          }
          return;
        }
        if (getAuthSessionGeneration() !== foregroundGeneration) return;

        const statusGeneration = getAuthSessionGeneration();
        const status = await fetchLoginStatusSilently(true);
        if (!cancelled && getAuthSessionGeneration() === statusGeneration) {
          applyLoginStatus(status);
        }
      } catch (error) {
        if (cancelled) return;
        if (error instanceof ApiError && error.code === 'AUTH_SESSION_CHANGED') {
          return;
        }
        if (isProfileIncompleteApiError(error)) {
          openProfileCompletion({ notify: true });
          return;
        }
        if (isSessionResetError(error)) {
          await clearSessionState();
          return;
        }
        const stillHasRefreshToken = Boolean(await getStoredRefreshToken());
        if (!stillHasRefreshToken) {
          markSessionLoggedOut();
        }
      }
    };

    const subscription = AppState.addEventListener('change', (nextState) => {
      if (nextState === 'active') {
        void refreshForegroundSession();
      }
    });

    return () => {
      cancelled = true;
      subscription.remove();
    };
  }, [applyLoginStatus, clearSessionState, markSessionLoggedOut, openProfileCompletion]);

  useEffect(() => {
    return () => {
      if (transitionTimerRef.current) {
        clearTimeout(transitionTimerRef.current);
      }
    };
  }, []);

  useEffect(() => {
    return subscribeProfileIncompleteSession(() => {
      openProfileCompletion({ notify: true });
    });
  }, [openProfileCompletion]);

  useEffect(() => {
    return subscribeUnauthorizedSession((message) => {
      // 수동 로그아웃이 완료된 뒤 늦게 도착한 이전 세션의 401은 만료 UX를 다시 열지 않는다.
      if (authSessionStateRef.current === 'loggedOut') return;
      // HTTP 계층이 해당 세대의 RT만 조건부 삭제한 뒤 알림을 보낸다. 여기서 다시
      // 무조건 삭제하면 이전 세션의 늦은 401이 새 로그인 토큰까지 지울 수 있다.
      void clearStoredPushRegistrationCache();
      showToast(message || '로그인 상태를 확인해 주십시오.');
      setAuthSessionState('loggedOut');
      pendingActionRef.current = null;
      setAuthPageMode('login');
      setAuthPageVisible(true);
      startAuthTransitionLoading('authRequired');
    });
  }, [setAuthSessionState, startAuthTransitionLoading]);

  const closeAuthPage = useCallback(() => {
    if (authSessionStateRef.current === 'profileIncomplete') {
      return;
    }
    setAuthPageVisible(false);
    pendingActionRef.current = null;
  }, []);

  const completeLogin = useCallback(() => {
    startAuthTransitionLoading('default');
    setAuthSessionState('loggedIn');
    setAuthPageVisible(false);
    setAuthPageMode('login');
    const callback = pendingActionRef.current;
    pendingActionRef.current = null;
    callback?.();
  }, [setAuthSessionState, startAuthTransitionLoading]);

  const requireAuth = useCallback(
    (onAuthed?: () => void) => {
      if (authSessionStateRef.current === 'loggedIn') {
        onAuthed?.();
        return;
      }
      startAuthTransitionLoading('authRequired');
      pendingActionRef.current = onAuthed ?? null;
      setAuthPageMode(authSessionStateRef.current === 'profileIncomplete' ? 'profileCompletion' : 'login');
      setAuthPageVisible(true);
    },
    [startAuthTransitionLoading],
  );

  const logout = useCallback(() => {
    startAuthTransitionLoading('default');
    setAuthSessionState('loggedOut');
    setAuthPageVisible(false);
    setAuthPageMode('login');
    pendingActionRef.current = null;
  }, [setAuthSessionState, startAuthTransitionLoading]);

  const isLoggedIn = authSessionState === 'loggedIn';
  const isProfileIncomplete = authSessionState === 'profileIncomplete';

  const value = useMemo<AuthGateContextValue>(
    () => ({
      isReady,
      isLoggedIn,
      isProfileIncomplete,
      authPageVisible,
      authPageMode,
      authTransitionLoading,
      authTransitionVariant,
      requireAuth,
      completeLogin,
      closeAuthPage,
      logout,
    }),
    [
      isReady,
      authPageMode,
      authPageVisible,
      authTransitionLoading,
      authTransitionVariant,
      closeAuthPage,
      completeLogin,
      isLoggedIn,
      isProfileIncomplete,
      requireAuth,
      logout,
    ],
  );

  return <AuthGateContext.Provider value={value}>{children}</AuthGateContext.Provider>;
}

export function useAuthGate() {
  const ctx = useContext(AuthGateContext);
  if (!ctx) {
    throw new Error('useAuthGate must be used within AuthGateProvider');
  }
  return ctx;
}
