export const SUPPORTED_LANGUAGES = ['pt-BR', 'en-GB', 'es', 'zh-CN'] as const;

export type AppLanguage = (typeof SUPPORTED_LANGUAGES)[number];

export interface LanguageMeta {
  code: AppLanguage;
  label: string;
  shortLabel: string;
  manifest: string;
}

export const LANGUAGE_OPTIONS: readonly LanguageMeta[] = [
  {
    code: 'pt-BR',
    label: 'Português (BR)',
    shortLabel: 'PT',
    manifest: './manifest.pt.webmanifest',
  },
  {
    code: 'en-GB',
    label: 'English (UK)',
    shortLabel: 'EN',
    manifest: './manifest.en.webmanifest',
  },
  {
    code: 'es',
    label: 'Español',
    shortLabel: 'ES',
    manifest: './manifest.es.webmanifest',
  },
  {
    code: 'zh-CN',
    label: '中文 (简体)',
    shortLabel: '中文',
    manifest: './manifest.zh.webmanifest',
  },
] as const;
