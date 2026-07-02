import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';
import * as SecureStore from 'expo-secure-store';

import {
  isLanguageCode,
  translate,
  translateLiteral,
  setActiveLanguage,
  type LanguageCode,
  type TranslationParams,
  type TranslationKey,
} from '../i18n/translations';

const LANGUAGE_STORAGE_KEY = 'checkmo.language';

type LanguageContextValue = {
  language: LanguageCode;
  isLanguageReady: boolean;
  setLanguage: (nextLanguage: LanguageCode) => Promise<void>;
  t: (key: TranslationKey, params?: TranslationParams) => string;
  l: (text: string, params?: TranslationParams) => string;
};

const LanguageContext = createContext<LanguageContextValue | null>(null);

type Props = {
  children: ReactNode;
};

export function LanguageProvider({ children }: Props) {
  const [language, setLanguageState] = useState<LanguageCode>('ko');
  const [isLanguageReady, setIsLanguageReady] = useState(false);

  useEffect(() => {
    setActiveLanguage(language);
  }, [language]);

  useEffect(() => {
    let mounted = true;

    const loadLanguage = async () => {
      try {
        const storedLanguage = await SecureStore.getItemAsync(LANGUAGE_STORAGE_KEY);
        if (mounted && isLanguageCode(storedLanguage)) {
          setLanguageState(storedLanguage);
        }
      } catch {
        // 저장된 언어를 읽지 못하면 기본 한국어로 계속 진행한다.
      } finally {
        if (mounted) {
          setIsLanguageReady(true);
        }
      }
    };

    void loadLanguage();

    return () => {
      mounted = false;
    };
  }, []);

  const setLanguage = useCallback(async (nextLanguage: LanguageCode) => {
    setLanguageState(nextLanguage);
    try {
      await SecureStore.setItemAsync(LANGUAGE_STORAGE_KEY, nextLanguage);
    } catch {
      // 언어 변경은 UI 상태를 우선 반영하고, 저장 실패는 다음 실행 때 기본값으로 복구한다.
    }
  }, []);

  const t = useCallback(
    (key: TranslationKey, params?: TranslationParams) => translate(language, key, params),
    [language],
  );
  const l = useCallback(
    (text: string, params?: TranslationParams) => translateLiteral(language, text, params),
    [language],
  );

  const value = useMemo(
    () => ({
      language,
      isLanguageReady,
      setLanguage,
      t,
      l,
    }),
    [isLanguageReady, language, l, setLanguage, t],
  );

  return <LanguageContext.Provider value={value}>{children}</LanguageContext.Provider>;
}

export function useLanguage() {
  const value = useContext(LanguageContext);
  if (!value) {
    throw new Error('useLanguage must be used within LanguageProvider');
  }
  return value;
}
