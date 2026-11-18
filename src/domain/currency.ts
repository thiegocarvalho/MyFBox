import type { ExchangeRate, ExchangeRateOrigin, VaultSettings } from '../types/finance';

export type ExchangeRateSource =
  | number
  | null
  | undefined
  | readonly ExchangeRate[]
  | Pick<VaultSettings, 'exchangeRates' | 'usdToBrlRate' | 'usdRateUpdatedAt'>;

export function normalizeCurrency(code: string | undefined | null): string {
  return (code || '').trim().toUpperCase();
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
