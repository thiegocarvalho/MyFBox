import { createContext } from 'react';
import {
  getActiveLanguage,
  setActiveLanguage,
  t as translate,
  type AppLanguage,
  type TranslationKey,
} from './index';

export interface I18nContextValue {
  language: AppLanguage;
  setLanguage: (lang: AppLanguage) => void;
  t: (key: TranslationKey, params?: Record<string, string | number>) => string;
}

export const I18nContext = createContext<I18nContextValue>({
  language: getActiveLanguage(),
  setLanguage: setActiveLanguage,
  t: (key, params) => translate(key, params),
});
