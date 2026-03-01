import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';

import { ApiError } from '../services/api/http';
import { fetchLoginStatusSilently } from '../services/api/authApi';

type AuthGateContextValue = {
  isLoggedIn: boolean;
  authPageVisible: boolean;
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

export function AuthGateProvider({ children }: Props) {
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [authPageVisible, setAuthPageVisible] = useState(false);
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
      }, 1200);
    },
    [],
  );

  useEffect(() => {
    let cancelled = false;

    const syncLoginState = async () => {
      try {
        const status = await fetchLoginStatusSilently(true);
        if (!cancelled) {
          setIsLoggedIn(status !== null);
        }
      } catch (error) {
        if (cancelled) return;
        if (error instanceof ApiError && error.status === 401) {
          setIsLoggedIn(false);
          return;
        }
        setIsLoggedIn(false);
      }
    };

    void syncLoginState();

    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    return () => {
      if (transitionTimerRef.current) {
        clearTimeout(transitionTimerRef.current);
      }
    };
  }, []);

  const closeAuthPage = useCallback(() => {
    setAuthPageVisible(false);
    pendingActionRef.current = null;
  }, []);

  const completeLogin = useCallback(() => {
    startAuthTransitionLoading('default');
    setIsLoggedIn(true);
    setAuthPageVisible(false);
    const callback = pendingActionRef.current;
    pendingActionRef.current = null;
    callback?.();
  }, [startAuthTransitionLoading]);

  const requireAuth = useCallback(
    (onAuthed?: () => void) => {
      if (isLoggedIn) {
        onAuthed?.();
        return;
      }
      startAuthTransitionLoading('authRequired');
      pendingActionRef.current = onAuthed ?? null;
      setAuthPageVisible(true);
    },
    [isLoggedIn, startAuthTransitionLoading],
  );

  const logout = useCallback(() => {
    startAuthTransitionLoading('default');
    setIsLoggedIn(false);
    setAuthPageVisible(false);
    pendingActionRef.current = null;
  }, [startAuthTransitionLoading]);

  const value = useMemo<AuthGateContextValue>(
    () => ({
      isLoggedIn,
      authPageVisible,
      authTransitionLoading,
      authTransitionVariant,
      requireAuth,
      completeLogin,
      closeAuthPage,
      logout,
    }),
    [
      authPageVisible,
      authTransitionLoading,
      authTransitionVariant,
      closeAuthPage,
      completeLogin,
      isLoggedIn,
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
