import { enGB } from './dictionaries/en-GB';
import { es } from './dictionaries/es';
import { ptBR, type TranslationDictionary, type TranslationKey } from './dictionaries/pt-BR';
import { zhCN } from './dictionaries/zh-CN';
import { LANGUAGE_OPTIONS, SUPPORTED_LANGUAGES, type AppLanguage, type LanguageMeta } from './types';

export { LANGUAGE_OPTIONS, SUPPORTED_LANGUAGES };
export type { AppLanguage, LanguageMeta, TranslationDictionary, TranslationKey };

export const LANGUAGE_STORAGE_KEY = 'myfbox_language';
export const DEFAULT_LANGUAGE: AppLanguage = 'pt-BR';

export const dictionaries: Record<AppLanguage, TranslationDictionary> = {
  'pt-BR': ptBR,
  'en-GB': enGB,
  es,
  'zh-CN': zhCN,
};

export function normalizeLanguage(raw?: string | null): AppLanguage | null {
  if (!raw || typeof raw !== 'string') return null;
  const cleaned = raw.trim().toLowerCase().replace(/_/g, '-');
  if (!cleaned) return null;
  if (cleaned === 'pt' || cleaned.startsWith('pt-')) return 'pt-BR';
  if (cleaned === 'en' || cleaned.startsWith('en-')) return 'en-GB';
  if (cleaned === 'es' || cleaned.startsWith('es-')) return 'es';
  if (cleaned === 'zh' || cleaned.startsWith('zh-')) return 'zh-CN';
  return null;
}

export function detectBrowserLanguage(navLang?: string): AppLanguage {
  const source =
    navLang ??
    (typeof navigator !== 'undefined' ? navigator.language || navigator.languages?.[0] : '');
  return normalizeLanguage(source) ?? DEFAULT_LANGUAGE;
}

export function readStoredLanguage(): AppLanguage | null {
  try {
    if (typeof globalThis.localStorage === 'undefined') return null;
    return normalizeLanguage(globalThis.localStorage.getItem(LANGUAGE_STORAGE_KEY));
  } catch {
    return null;
  }
}

export function readUrlLanguage(): AppLanguage | null {
  try {
    if (typeof window === 'undefined' || !window.location?.search) return null;
    const params = new URLSearchParams(window.location.search);
    return normalizeLanguage(params.get('lang'));
  } catch {
    return null;
  }
}

export function detectInitialLanguage(): AppLanguage {
  return readUrlLanguage() ?? readStoredLanguage() ?? detectBrowserLanguage();
}

let activeLanguage: AppLanguage = detectInitialLanguage();
const listeners = new Set<(lang: AppLanguage) => void>();

export function applyLanguageToDocument(lang: AppLanguage): void {
  if (typeof document !== 'undefined' && document.documentElement) {
    document.documentElement.lang = lang;
  }
}

export function getActiveLanguage(): AppLanguage {
  return activeLanguage;
}

export function getLanguageMeta(lang: AppLanguage): LanguageMeta {
  return LANGUAGE_OPTIONS.find((item) => item.code === lang) ?? LANGUAGE_OPTIONS[0];
}

export function setActiveLanguage(lang: AppLanguage): void {
  const normalized = normalizeLanguage(lang) ?? DEFAULT_LANGUAGE;
  activeLanguage = normalized;
  try {
    if (typeof globalThis.localStorage !== 'undefined') {
      globalThis.localStorage.setItem(LANGUAGE_STORAGE_KEY, normalized);
    }
  } catch {
    /* ignore storage errors in restricted contexts */
  }
  applyLanguageToDocument(normalized);
  for (const listener of listeners) {
    listener(normalized);
  }
}

export function subscribeLanguageChange(listener: (lang: AppLanguage) => void): () => void {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

export function t(
  key: TranslationKey,
  params?: Record<string, string | number>,
  lang: AppLanguage = activeLanguage
): string {
  const dict = dictionaries[lang] ?? dictionaries[DEFAULT_LANGUAGE];
  let text = dict[key] ?? dictionaries[DEFAULT_LANGUAGE][key] ?? key;
  if (params) {
    for (const [paramKey, paramValue] of Object.entries(params)) {
      text = text.replace(new RegExp(`\\{\\{${paramKey}\\}\\}`, 'g'), String(paramValue));
    }
  }
  return text;
}
