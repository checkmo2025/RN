import { createContext, useCallback, useContext, useMemo, useRef, useState } from 'react';

type AuthGateContextValue = {
  isLoggedIn: boolean;
  authPageVisible: boolean;
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
  const pendingActionRef = useRef<(() => void) | null>(null);

  const closeAuthPage = useCallback(() => {
    setAuthPageVisible(false);
    pendingActionRef.current = null;
  }, []);

  const completeLogin = useCallback(() => {
    setIsLoggedIn(true);
    setAuthPageVisible(false);
    const callback = pendingActionRef.current;
    pendingActionRef.current = null;
    callback?.();
  }, []);

  const requireAuth = useCallback(
    (onAuthed?: () => void) => {
      if (isLoggedIn) {
        onAuthed?.();
        return;
      }
      pendingActionRef.current = onAuthed ?? null;
      setAuthPageVisible(true);
    },
    [isLoggedIn],
  );

  const logout = useCallback(() => {
    setIsLoggedIn(false);
  }, []);

  const value = useMemo<AuthGateContextValue>(
    () => ({
      isLoggedIn,
      authPageVisible,
      requireAuth,
      completeLogin,
      closeAuthPage,
      logout,
    }),
    [authPageVisible, closeAuthPage, completeLogin, isLoggedIn, requireAuth, logout],
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
