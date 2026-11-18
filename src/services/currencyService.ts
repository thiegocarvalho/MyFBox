import { getActiveLanguage, type AppLanguage } from '../i18n';
import {
  findExchangeRate,
  formatRateDate,
  getVaultExchangeRates,
  normalizeCurrency,
  removeExchangeRate,
  resolveExchangeRates,
  upsertExchangeRate,
  type ExchangeRateSource,
} from '../domain/currency';
export {
  findExchangeRate,
  formatRateDate,
  getVaultExchangeRates,
  normalizeCurrency,
  removeExchangeRate,
  resolveExchangeRates,
  upsertExchangeRate,
  type ExchangeRateSource,
};

export interface PopularCurrency {
  code: string;
  name: string;
  symbol: string;
  flag: string;
}

export const POPULAR_CURRENCIES: readonly PopularCurrency[] = [
  { code: 'BRL', name: 'Real Brasileiro', symbol: 'R$', flag: '🇧🇷' },
  { code: 'USD', name: 'Dólar Americano', symbol: 'US$', flag: '🇺🇸' },
  { code: 'EUR', name: 'Euro', symbol: '€', flag: '🇪🇺' },
  { code: 'GBP', name: 'Libra Esterlina', symbol: '£', flag: '🇬🇧' },
  { code: 'JPY', name: 'Iene Japonês', symbol: '¥', flag: '🇯🇵' },
  { code: 'CHF', name: 'Franco Suíço', symbol: 'CHF', flag: '🇨🇭' },
  { code: 'CAD', name: 'Dólar Canadense', symbol: 'CA$', flag: '🇨🇦' },
  { code: 'AUD', name: 'Dólar Australiano', symbol: 'AU$', flag: '🇦🇺' },
  { code: 'CNY', name: 'Yuan Chinês', symbol: 'CN¥', flag: '🇨🇳' },
  { code: 'ARS', name: 'Peso Argentino', symbol: 'AR$', flag: '🇦🇷' },
  { code: 'CLP', name: 'Peso Chileno', symbol: 'CLP$', flag: '🇨🇱' },
  { code: 'UYU', name: 'Peso Uruguaio', symbol: '$U', flag: '🇺🇾' },
  { code: 'MXN', name: 'Peso Mexicano', symbol: 'MX$', flag: '🇲🇽' },
] as const;

export const POPULAR_CURRENCY_CODES = [
  'BRL',
  'USD',
  'EUR',
  'GBP',
  'JPY',
  'CHF',
  'CAD',
  'AUD',
  'CNY',
  'ARS',
  'CLP',
  'UYU',
  'MXN',
] as const;

export type PopularCurrencyCode = (typeof POPULAR_CURRENCY_CODES)[number];

const CURRENCY_BY_CODE = new Map<string, PopularCurrency>(
  POPULAR_CURRENCIES.map((item) => [item.code, item])
);

const SUPPORTED_CODE_SET = new Set<string>(POPULAR_CURRENCY_CODES);

export function getCurrencyInfo(code: string): PopularCurrency | undefined {
  return CURRENCY_BY_CODE.get(normalizeCurrency(code));
}

export function getCurrencySymbol(code: string): string {
  const norm = normalizeCurrency(code);
  return CURRENCY_BY_CODE.get(norm)?.symbol || norm;
}

export function getCurrencyFlag(code: string): string {
  return CURRENCY_BY_CODE.get(normalizeCurrency(code))?.flag || '';
}

const currencyDisplayCache = new Map<string, Intl.DisplayNames>();

export function getCurrencyName(code: string, lang: AppLanguage = getActiveLanguage()): string {
  const norm = normalizeCurrency(code);
  const fallback = CURRENCY_BY_CODE.get(norm)?.name || norm;
  try {
    let dn = currencyDisplayCache.get(lang);
    if (!dn && typeof Intl !== 'undefined' && typeof Intl.DisplayNames === 'function') {
      dn = new Intl.DisplayNames([lang], { type: 'currency' });
      currencyDisplayCache.set(lang, dn);
    }
    const localized = dn?.of(norm);
    if (localized && localized !== norm) {
      return localized.charAt(0).toUpperCase() + localized.slice(1);
    }
  } catch {
    /* fallback to static name */
  }
  return fallback;
}

export function isSupportedCurrency(code: string): code is PopularCurrencyCode {
  return SUPPORTED_CODE_SET.has(normalizeCurrency(code));
}

export function formatRate(rate: number, lang: AppLanguage = getActiveLanguage()): string {
  if (!Number.isFinite(rate) || rate <= 0) return '0.00';
  const locale = lang === 'es' ? 'es-ES' : lang;
  if (rate >= 100) {
    return new Intl.NumberFormat(locale, {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(rate);
  }
  if (rate >= 1) {
    return new Intl.NumberFormat(locale, {
      minimumFractionDigits: 2,
      maximumFractionDigits: 4,
    }).format(rate);
  }
  return new Intl.NumberFormat(locale, {
    minimumFractionDigits: 4,
    maximumFractionDigits: 6,
  }).format(rate);
}
