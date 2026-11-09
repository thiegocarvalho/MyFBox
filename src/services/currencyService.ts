/**
 * Gerenciamento local e offline de Cotações de Câmbio.
 *
 * O MyFBox é 100% offline — não consulta APIs externas de cotação.
 * As cotações são cadastradas ou atualizadas pelo próprio usuário no painel
 * ou pelo agente de IA através do servidor MCP local.
 */
import type { ExchangeRate, VaultSettings } from '../types/finance';

export interface PopularCurrency {
  code: string;
  name: string;
  symbol: string;
  flag: string;
}

/**
 * Lista fechada das moedas mais populares no mundo (fiat principais e cripto líderes)
 * com seus respectivos códigos ISO, nomes e símbolos oficiais.
 */
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

export function getCurrencyInfo(code: string): PopularCurrency | undefined {
  const norm = normalizeCurrency(code);
  return POPULAR_CURRENCIES.find((c) => c.code === norm);
}

export function getCurrencySymbol(code: string): string {
  const info = getCurrencyInfo(code);
  return info?.symbol || code;
}

export function getCurrencyFlag(code: string): string {
  const info = getCurrencyInfo(code);
  return info?.flag || '';
}

export function isSupportedCurrency(code: string): code is PopularCurrencyCode {
  const norm = normalizeCurrency(code);
  return POPULAR_CURRENCY_CODES.includes(norm as PopularCurrencyCode);
}

/** Normaliza código de moeda para maiúsculas e sem espaços (ex: "usd" -> "USD") */
export function normalizeCurrency(code: string): string {
  return (code || '').trim().toUpperCase();
}

/** Formata número de taxa de câmbio */
export function formatRate(rate: number): string {
  if (!Number.isFinite(rate) || rate <= 0) return '0.00';
  if (rate >= 100) {
    return rate.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  }
  if (rate >= 1) {
    return rate.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 4 });
  }
  return rate.toLocaleString('pt-BR', { minimumFractionDigits: 4, maximumFractionDigits: 6 });
}

/** Formata data/hora para registro de atualização */
export function formatRateDate(d: Date = new Date()): string {
  const yyyy = d.getFullYear();
  const mm = String(d.getMonth() + 1).padStart(2, '0');
  const dd = String(d.getDate()).padStart(2, '0');
  const hh = String(d.getHours()).padStart(2, '0');
  const min = String(d.getMinutes()).padStart(2, '0');
  return `${yyyy}-${mm}-${dd} ${hh}:${min}`;
}

/**
 * Retorna as cotações configuradas no cofre, incluindo retrocompatibilidade
 * com `usdToBrlRate` legado caso ainda não esteja na lista explícita.
 */
export function getVaultExchangeRates(settings: VaultSettings): ExchangeRate[] {
  const list = settings.exchangeRates ? [...settings.exchangeRates] : [];

  // Se houver usdToBrlRate legado e o par USD/BRL não constar na lista, sintetiza ele
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

/**
 * Adiciona ou atualiza uma cotação no array de taxas.
 */
export function upsertExchangeRate(
  rates: ExchangeRate[] | undefined,
  fromRaw: string,
  toRaw: string,
  rate: number,
  source: 'manual' | 'agent' | 'mcp' = 'manual'
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

/**
 * Remove uma cotação do array de taxas.
 */
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

/**
 * Busca a cotação entre duas moedas.
 * Se houver par direto (FROM -> TO), usa a taxa.
 * Se houver par inverso (TO -> FROM), usa 1 / taxa.
 */
export function findExchangeRate(
  rates: ExchangeRate[] | undefined,
  fromRaw: string,
  toRaw: string
): number | null {
  const from = normalizeCurrency(fromRaw);
  const to = normalizeCurrency(toRaw);
  if (from === to) return 1;
  if (!rates || rates.length === 0) return null;

  const direct = rates.find(
    (r) => normalizeCurrency(r.from) === from && normalizeCurrency(r.to) === to
  );
  if (direct && direct.rate > 0) return direct.rate;

  const inverse = rates.find(
    (r) => normalizeCurrency(r.from) === to && normalizeCurrency(r.to) === from
  );
  if (inverse && inverse.rate > 0) return 1 / inverse.rate;

  return null;
}
