import type { ExchangeRate, ExchangeRateOrigin, VaultSettings } from '../types/finance';

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
  { code: 'BTC', name: 'Bitcoin', symbol: '₿', flag: '🪙' },
  { code: 'ETH', name: 'Ethereum', symbol: 'Ξ', flag: '💎' },
  { code: 'USDT', name: 'Tether USD', symbol: '₮', flag: '💵' },
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
  'BTC',
  'ETH',
  'USDT',
] as const;

export type PopularCurrencyCode = (typeof POPULAR_CURRENCY_CODES)[number];

export type ExchangeRateSource =
  | number
  | null
  | undefined
  | readonly ExchangeRate[]
  | Pick<VaultSettings, 'exchangeRates' | 'usdToBrlRate' | 'usdRateUpdatedAt'>;

const CURRENCY_BY_CODE = new Map<string, PopularCurrency>(
  POPULAR_CURRENCIES.map((item) => [item.code, item])
);

const SUPPORTED_CODE_SET = new Set<string>(POPULAR_CURRENCY_CODES);

export function normalizeCurrency(code: string | undefined | null): string {
  return (code || '').trim().toUpperCase();
}

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

export function isSupportedCurrency(code: string): code is PopularCurrencyCode {
  return SUPPORTED_CODE_SET.has(normalizeCurrency(code));
}

const RATE_FMT_2 = new Intl.NumberFormat('pt-BR', {
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
});
const RATE_FMT_4 = new Intl.NumberFormat('pt-BR', {
  minimumFractionDigits: 2,
  maximumFractionDigits: 4,
});
const RATE_FMT_6 = new Intl.NumberFormat('pt-BR', {
  minimumFractionDigits: 4,
  maximumFractionDigits: 6,
});

export function formatRate(rate: number): string {
  if (!Number.isFinite(rate) || rate <= 0) return '0.00';
  if (rate >= 100) {
    return RATE_FMT_2.format(rate);
  }
  if (rate >= 1) {
    return RATE_FMT_4.format(rate);
  }
  return RATE_FMT_6.format(rate);
}

export function formatRateDate(d: Date = new Date()): string {
  const yyyy = d.getFullYear();
  const mm = String(d.getMonth() + 1).padStart(2, '0');
  const dd = String(d.getDate()).padStart(2, '0');
  const hh = String(d.getHours()).padStart(2, '0');
  const min = String(d.getMinutes()).padStart(2, '0');
  return `${yyyy}-${mm}-${dd} ${hh}:${min}`;
}

export function getVaultExchangeRates(
  settings: Pick<VaultSettings, 'exchangeRates' | 'usdToBrlRate' | 'usdRateUpdatedAt'>
): ExchangeRate[] {
  const list = settings.exchangeRates ? [...settings.exchangeRates] : [];
  const hasUsdBrl = list.some(
    (r) => normalizeCurrency(r.from) === 'USD' && normalizeCurrency(r.to) === 'BRL'
  );

  if (!hasUsdBrl && typeof settings.usdToBrlRate === 'number' && settings.usdToBrlRate > 0) {
    list.unshift({
      from: 'USD',
      to: 'BRL',
      rate: settings.usdToBrlRate,
      updatedAt: settings.usdRateUpdatedAt || formatRateDate(),
      source: 'manual',
    });
  }

  return list;
}

export function resolveExchangeRates(source: ExchangeRateSource): readonly ExchangeRate[] {
  if (source === null || source === undefined) return [];
  if (typeof source === 'number') {
    if (!Number.isFinite(source) || source <= 0) return [];
    return [{ from: 'USD', to: 'BRL', rate: source, updatedAt: '' }];
  }
  if (Array.isArray(source)) {
    return source;
  }
  return getVaultExchangeRates(source as Pick<VaultSettings, 'exchangeRates' | 'usdToBrlRate' | 'usdRateUpdatedAt'>);
}

export function upsertExchangeRate(
  rates: ExchangeRate[] | undefined,
  fromRaw: string,
  toRaw: string,
  rate: number,
  source: ExchangeRateOrigin = 'manual'
): ExchangeRate[] {
  const from = normalizeCurrency(fromRaw);
  const to = normalizeCurrency(toRaw);
  const current = rates ? [...rates] : [];

  const existingIdx = current.findIndex(
    (r) => normalizeCurrency(r.from) === from && normalizeCurrency(r.to) === to
  );

  const entry: ExchangeRate = {
    from,
    to,
    rate,
    updatedAt: formatRateDate(),
    source,
  };

  if (existingIdx >= 0) {
    current[existingIdx] = entry;
  } else {
    current.push(entry);
  }

  return current;
}

export function removeExchangeRate(
  rates: ExchangeRate[] | undefined,
  fromRaw: string,
  toRaw: string
): ExchangeRate[] {
  const from = normalizeCurrency(fromRaw);
  const to = normalizeCurrency(toRaw);
  if (!rates) return [];

  return rates.filter(
    (r) => !(normalizeCurrency(r.from) === from && normalizeCurrency(r.to) === to)
  );
}

function findDirectOrInverseRate(
  rates: readonly ExchangeRate[],
  from: string,
  to: string
): number | null {
  if (from === to) return 1;

  for (const r of rates) {
    if (r.rate <= 0 || !Number.isFinite(r.rate)) continue;
    const rFrom = normalizeCurrency(r.from);
    const rTo = normalizeCurrency(r.to);
    if (rFrom === from && rTo === to) return r.rate;
    if (rFrom === to && rTo === from) return 1 / r.rate;
  }

  return null;
}

export function findExchangeRate(
  source: ExchangeRateSource,
  fromRaw: string,
  toRaw: string
): number | null {
  const from = normalizeCurrency(fromRaw) || 'BRL';
  const to = normalizeCurrency(toRaw) || 'BRL';
  if (from === to) return 1;

  const rates = resolveExchangeRates(source);
  if (rates.length === 0) return null;

  const direct = findDirectOrInverseRate(rates, from, to);
  if (direct !== null) return direct;

  for (const pivot of ['BRL', 'USD'] as const) {
    if (pivot === from || pivot === to) continue;
    const toPivot = findDirectOrInverseRate(rates, from, pivot);
    const fromPivot = findDirectOrInverseRate(rates, pivot, to);
    if (toPivot !== null && fromPivot !== null) {
      return toPivot * fromPivot;
    }
  }

  return null;
}
