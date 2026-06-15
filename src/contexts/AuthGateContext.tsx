import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';

import { ApiError, subscribeProfileIncompleteSession } from '../services/api/http';
import {
  clearStoredAuthSession,
  fetchLoginStatusSilently,
  silentRefreshSession,
} from '../services/api/authApi';

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

function isProfileIncompleteError(error: unknown): boolean {
  return error instanceof ApiError && error.status === 403 && error.code === 'AUTH_403';
}

function isSessionExpiredError(error: unknown): boolean {
  return error instanceof ApiError && (error.status === 401 || error.code === 'AUTH_405');
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

  const openProfileCompletion = useCallback(() => {
    setAuthSessionState('profileIncomplete');
    setAuthPageMode('profileCompletion');
    setAuthPageVisible(true);
  }, [setAuthSessionState]);

  const applyLoginStatus = useCallback(
    (status: Awaited<ReturnType<typeof fetchLoginStatusSilently>> | null) => {
      if (status) {
        setAuthSessionState('loggedIn');
        setAuthPageVisible(false);
        return;
      }

      setAuthSessionState('loggedOut');
      setAuthPageVisible(false);
    },
    [setAuthSessionState],
  );

  const clearSessionState = useCallback(async () => {
    await clearStoredAuthSession();
    setAuthSessionState('loggedOut');
    setAuthPageMode('login');
    setAuthPageVisible(false);
    pendingActionRef.current = null;
  }, [setAuthSessionState]);

  useEffect(() => {
    let cancelled = false;

    const syncLoginState = async () => {
      try {
        const status = await fetchLoginStatusSilently(true);
        if (!cancelled) {
          applyLoginStatus(status);
          setIsReady(true);
        }
      } catch (error) {
        if (cancelled) return;
        if (isProfileIncompleteError(error)) {
          openProfileCompletion();
          setIsReady(true);
          return;
        }
        if (error instanceof ApiError && error.status === 401) {
          const refreshed = await silentRefreshSession();
          if (cancelled) return;

          if (refreshed) {
            try {
              const status = await fetchLoginStatusSilently(true);
              if (!cancelled) {
                applyLoginStatus(status);
              }
            } catch (refreshStatusError) {
              if (!cancelled) {
                if (isProfileIncompleteError(refreshStatusError)) {
                  openProfileCompletion();
                } else {
                  await clearSessionState();
                }
              }
            }
          } else {
            await clearSessionState();
          }
        } else if (isSessionExpiredError(error)) {
          await clearSessionState();
        } else {
          setAuthSessionState('loggedOut');
          setAuthPageVisible(false);
        }
        setIsReady(true);
      }
    };

    void syncLoginState();

    return () => {
      cancelled = true;
    };
  }, [applyLoginStatus, clearSessionState, openProfileCompletion, setAuthSessionState]);

  useEffect(() => {
    return () => {
      if (transitionTimerRef.current) {
        clearTimeout(transitionTimerRef.current);
      }
    };
  }, []);

  useEffect(() => {
    return subscribeProfileIncompleteSession(() => {
      openProfileCompletion();
    });
  }, [openProfileCompletion]);

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
