import { describe, it, expect, beforeEach } from 'vitest';
import {
  SUPPORTED_LANGUAGES,
  dictionaries,
  detectBrowserLanguage,
  normalizeLanguage,
  getActiveLanguage,
  setActiveLanguage,
  t,
  LANGUAGE_STORAGE_KEY,
} from './index';
import { domainMcpMessages, tDomainMcp } from './modules/domainMcp';

describe('i18n engine and dictionary parity', () => {
  beforeEach(() => {
    const store = new Map<string, string>();
    Object.defineProperty(globalThis, 'localStorage', {
      value: {
        getItem: (k: string) => store.get(k) ?? null,
        setItem: (k: string, v: string) => {
          store.set(k, String(v));
        },
        removeItem: (k: string) => {
          store.delete(k);
        },
      },
      configurable: true,
    });
    setActiveLanguage('pt-BR');
  });

  it('supports exactly pt-BR, en-GB, es and zh-CN', () => {
    expect(SUPPORTED_LANGUAGES).toEqual(['pt-BR', 'en-GB', 'es', 'zh-CN']);
  });

  it('ensures full key parity and non-empty strings across all 4 dictionaries', () => {
    const baseKeys = Object.keys(dictionaries['pt-BR']).sort();
    expect(baseKeys.length).toBeGreaterThan(0);

    for (const lang of SUPPORTED_LANGUAGES) {
      const dict = dictionaries[lang];
      const keys = Object.keys(dict).sort();
      expect(keys, `Key mismatch in ${lang}`).toEqual(baseKeys);

      for (const key of baseKeys) {
        const val = dict[key as keyof typeof dict];
        expect(typeof val, `${lang}.${key} must be string`).toBe('string');
        expect(val.trim().length, `${lang}.${key} must not be empty`).toBeGreaterThan(0);
      }
    }
  });

  it('normalizes language codes and maps browser locales', () => {
    expect(normalizeLanguage('pt-BR')).toBe('pt-BR');
    expect(normalizeLanguage('pt')).toBe('pt-BR');
    expect(normalizeLanguage('en')).toBe('en-GB');
    expect(normalizeLanguage('en-US')).toBe('en-GB');
    expect(normalizeLanguage('en-GB')).toBe('en-GB');
    expect(normalizeLanguage('es-419')).toBe('es');
    expect(normalizeLanguage('zh')).toBe('zh-CN');
    expect(normalizeLanguage('zh-Hans')).toBe('zh-CN');
    expect(normalizeLanguage('fr-FR')).toBeNull();

    expect(detectBrowserLanguage('en-US')).toBe('en-GB');
    expect(detectBrowserLanguage('es-ES')).toBe('es');
    expect(detectBrowserLanguage('zh-CN')).toBe('zh-CN');
    expect(detectBrowserLanguage('de-DE')).toBe('pt-BR');
  });

  it('persists active language in localStorage and translates with interpolation', () => {
    setActiveLanguage('en-GB');
    expect(getActiveLanguage()).toBe('en-GB');
    expect(globalThis.localStorage.getItem(LANGUAGE_STORAGE_KEY)).toBe('en-GB');

    const msg = t('language.currentLabel', { language: 'English (UK)' });
    expect(msg).toContain('English (UK)');
  });

  it('includes core UI keys for app screens and enforces British English spelling in en-GB', () => {
    const requiredUiKeys = [
      'lock.tab.unlock',
      'nav.dashboard',
      'tx.newTransaction',
      'accounts.title',
      'budgets.title',
      'analytics.comparison.eyebrow',
      'backup.title',
      'audio.play',
    ];
    for (const key of requiredUiKeys) {
      expect(dictionaries['pt-BR']).toHaveProperty(key);
    }

    const usSpellingPattern =
      /\b(categoriz(e|ed|ing)|colors?|authoriz(e|ed|ing)|behaviors?|customiz(e|ed|ing)|canceled)\b/i;
    for (const [key, value] of Object.entries(dictionaries['en-GB'])) {
      expect(value, `en-GB.${key} must use British spelling`).not.toMatch(usSpellingPattern);
    }
  });

  it('guarantees domainMcp messages parity across all 4 locales and verifies tDomainMcp helper', () => {
    const ptKeys = Object.keys(domainMcpMessages['pt-BR']).sort();
    expect(ptKeys.length).toBeGreaterThan(150);

    for (const lang of SUPPORTED_LANGUAGES) {
      const keys = Object.keys(domainMcpMessages[lang]).sort();
      expect(keys, `domainMcp parity mismatch in ${lang}`).toEqual(ptKeys);
    }

    expect(tDomainMcp('domainMcp.defaultData.vaultName', undefined, 'pt-BR')).toBe('Cofre Pessoal');
    expect(tDomainMcp('domainMcp.defaultData.vaultName', undefined, 'en-GB')).toBe('Personal Vault');
    expect(tDomainMcp('domainMcp.defaultData.vaultName', undefined, 'es')).toBe('Bóveda Personal');
    expect(tDomainMcp('domainMcp.defaultData.vaultName', undefined, 'zh-CN')).toBe('个人保险库');
  });

  it('audits total translation keys volume and zero missing keys across all supported locales', () => {
    const totalKeys = Object.keys(dictionaries['pt-BR']).length;
    expect(totalKeys).toBeGreaterThanOrEqual(1000);

    for (const lang of SUPPORTED_LANGUAGES) {
      expect(Object.keys(dictionaries[lang]).length).toBe(totalKeys);
      for (const [k, v] of Object.entries(dictionaries[lang])) {
        expect(v, `Missing translation for ${lang}.${k}`).toBeTruthy();
        expect(typeof v).toBe('string');
      }
    }
  });
});
