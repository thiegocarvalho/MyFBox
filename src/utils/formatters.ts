import { getActiveLanguage, type AppLanguage } from '../i18n';
import { getCurrencySymbol } from '../services/currencyService';
import type { Currency } from '../types/finance';

const NON_ISO_CURRENCIES = new Set<string>(['BTC', 'ETH', 'USDT']);
const CURRENCY_FORMATTER_CACHE = new Map<string, Intl.NumberFormat | null>();
const DECIMAL_FORMATTER_CACHE = new Map<string, Intl.NumberFormat>();
const DATE_FORMATTER_CACHE = new Map<string, Intl.DateTimeFormat>();

function resolveLocale(language?: AppLanguage): AppLanguage {
  return language ?? getActiveLanguage();
}

function getDecimalFormatter(locale: AppLanguage): Intl.NumberFormat {
  let formatter = DECIMAL_FORMATTER_CACHE.get(locale);
  if (!formatter) {
    formatter = new Intl.NumberFormat(locale, {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    });
    DECIMAL_FORMATTER_CACHE.set(locale, formatter);
  }
  return formatter;
}

function getCurrencyFormatter(currency: string, locale: AppLanguage): Intl.NumberFormat | null {
  if (NON_ISO_CURRENCIES.has(currency)) return null;
  const cacheKey = `${locale}:${currency}`;
  if (CURRENCY_FORMATTER_CACHE.has(cacheKey)) {
    return CURRENCY_FORMATTER_CACHE.get(cacheKey) ?? null;
  }
  try {
    const formatter = new Intl.NumberFormat(locale, {
      style: 'currency',
      currency,
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    });
    CURRENCY_FORMATTER_CACHE.set(cacheKey, formatter);
    return formatter;
  } catch {
    CURRENCY_FORMATTER_CACHE.set(cacheKey, null);
    return null;
  }
}

function getDateFormatter(
  locale: AppLanguage,
  kind: 'short' | 'full' | 'monthYear'
): Intl.DateTimeFormat {
  const cacheKey = `${locale}:${kind}`;
  let formatter = DATE_FORMATTER_CACHE.get(cacheKey);
  if (!formatter) {
    const options: Intl.DateTimeFormatOptions =
      kind === 'short'
        ? { day: '2-digit', month: 'short', timeZone: 'UTC' }
        : kind === 'full'
          ? { day: '2-digit', month: '2-digit', year: 'numeric', timeZone: 'UTC' }
          : { month: 'long', year: 'numeric', timeZone: 'UTC' };
    formatter = new Intl.DateTimeFormat(locale, options);
    DATE_FORMATTER_CACHE.set(cacheKey, formatter);
  }
  return formatter;
}

export function formatMoney(
  value: number,
  currency: Currency = 'BRL',
  hideValues: boolean = false,
  language?: AppLanguage
): string {
  if (hideValues) {
    const sym = getCurrencySymbol(currency) || currency;
    return `${sym} •••••`;
  }
  const locale = resolveLocale(language);
  const formatter = getCurrencyFormatter(currency, locale);
  if (formatter) {
    return formatter.format(value);
  }
  const sym = getCurrencySymbol(currency) || currency;
  return `${sym} ${getDecimalFormatter(locale).format(value)}`;
}

export function formatBRL(value: number, hideValues: boolean = false): string {
  return formatMoney(value, 'BRL', hideValues);
}

export function formatNumber(
  value: number,
  options?: Intl.NumberFormatOptions,
  language?: AppLanguage
): string {
  return new Intl.NumberFormat(resolveLocale(language), options).format(value);
}

export function formatShortDate(dateStr: string, language?: AppLanguage): string {
  if (!dateStr || !/^\d{4}-\d{2}-\d{2}/.test(dateStr)) return dateStr;
  const [year, month, day] = dateStr.slice(0, 10).split('-').map(Number);
  const date = new Date(Date.UTC(year, month - 1, day));
  return getDateFormatter(resolveLocale(language), 'short').format(date);
}

export function formatFullDate(dateStr: string, language?: AppLanguage): string {
  if (!dateStr || !/^\d{4}-\d{2}-\d{2}/.test(dateStr)) return dateStr;
  const [year, month, day] = dateStr.slice(0, 10).split('-').map(Number);
  const date = new Date(Date.UTC(year, month - 1, day));
  return getDateFormatter(resolveLocale(language), 'full').format(date);
}

export function formatFullDateBR(dateStr: string, language?: AppLanguage): string {
  return formatFullDate(dateStr, language);
}

export function formatMonthYearLabel(yearMonth: string, language?: AppLanguage): string {
  const [year, month] = yearMonth.split('-').map(Number);
  const date = new Date(Date.UTC(year || 2000, (month || 1) - 1, 1));
  const formatted = getDateFormatter(resolveLocale(language), 'monthYear').format(date);
  return formatted.charAt(0).toUpperCase() + formatted.slice(1);
}

export function shiftYearMonth(yearMonth: string, deltaMonths: number): string {
  const [year, month] = yearMonth.split('-').map(Number);
  const d = new Date(year, month - 1 + deltaMonths, 1);
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  return `${y}-${m}`;
}

export function getCurrentYearMonth(): string {
  const now = new Date();
  const y = now.getFullYear();
  const m = String(now.getMonth() + 1).padStart(2, '0');
  return `${y}-${m}`;
}

export function localTodayStr(offsetDays: number = 0): string {
  const d = new Date();
  if (offsetDays !== 0) {
    d.setDate(d.getDate() + offsetDays);
  }
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

export function addMonthsToDateStr(dateStr: string, monthsToAdd: number): string {
  const [y, m, d] = dateStr.split('-').map(Number);
  const targetMonthDate = new Date(y, m - 1 + monthsToAdd, 1);
  const maxDayInTargetMonth = new Date(
    targetMonthDate.getFullYear(),
    targetMonthDate.getMonth() + 1,
    0
  ).getDate();
  const clampedDay = Math.min(d, maxDayInTargetMonth);
  const finalY = targetMonthDate.getFullYear();
  const finalM = String(targetMonthDate.getMonth() + 1).padStart(2, '0');
  const finalD = String(clampedDay).padStart(2, '0');
  return `${finalY}-${finalM}-${finalD}`;
}
