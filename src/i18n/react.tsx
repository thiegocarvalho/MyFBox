import React, { useCallback, useEffect, useState } from 'react';
import {
  applyLanguageToDocument,
  getActiveLanguage,
  setActiveLanguage,
  subscribeLanguageChange,
  t as translate,
  type AppLanguage,
  type TranslationKey,
} from './index';
import { I18nContext } from './context';

export const I18nProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [language, setLanguageState] = useState<AppLanguage>(() => getActiveLanguage());

  useEffect(() => {
    applyLanguageToDocument(language);
    return subscribeLanguageChange((next) => {
      setLanguageState(next);
    });
  }, [language]);

  const setLanguage = useCallback((next: AppLanguage) => {
    setActiveLanguage(next);
  }, []);

  const t = useCallback(
    (key: TranslationKey, params?: Record<string, string | number>) =>
      translate(key, params, language),
    [language]
  );

  return (
    <I18nContext.Provider value={{ language, setLanguage, t }}>{children}</I18nContext.Provider>
  );
};
