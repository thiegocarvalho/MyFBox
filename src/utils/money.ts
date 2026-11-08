import type { Account, Currency, Transaction } from '../types/finance';

export function txCurrency(tx: Pick<Transaction, 'currency'>): Currency {
  return tx.currency || 'BRL';
}

export function accountCurrency(acc: Pick<Account, 'currency'>): Currency {
  return acc.currency || 'BRL';
}

export function isValidRate(rate: number | null | undefined): rate is number {
  return typeof rate === 'number' && Number.isFinite(rate) && rate > 0;
}

/**
 * Converte um valor entre BRL e USD usando a cotação USD→BRL informada.
 * Retorna null quando a conversão é necessária mas não há cotação válida.
 */
export function convertAmount(
  amount: number,
  from: Currency,
  to: Currency,
  usdToBrlRate: number | null | undefined
): number | null {
  if (from === to) return amount;
  if (!isValidRate(usdToBrlRate)) return null;
  return from === 'USD' ? amount * usdToBrlRate : amount / usdToBrlRate;
}

/**
 * Valor de um lançamento convertido para a moeda alvo. Usa a cotação fixada no
 * lançamento quando houver; senão, a cotação atual. Sem cotação disponível, o
 * lançamento não entra na soma (retorna 0).
 */
export function txAmountIn(
  tx: Pick<Transaction, 'amount' | 'currency' | 'exchangeRate'>,
  target: Currency,
  liveUsdToBrlRate: number | null | undefined
): number {
  const rate = isValidRate(tx.exchangeRate) ? tx.exchangeRate : liveUsdToBrlRate;
  return convertAmount(tx.amount, txCurrency(tx), target, rate) ?? 0;
}

export function txAmountInBrl(
  tx: Pick<Transaction, 'amount' | 'currency' | 'exchangeRate'>,
  liveUsdToBrlRate: number | null | undefined
): number {
  return txAmountIn(tx, 'BRL', liveUsdToBrlRate);
}

export interface AccountBalance {
  currency: Currency;
  paidInflows: number;
  paidOutflows: number;
  pendingNet: number;
  currentBalance: number;
  projectedBalance: number;
  txCount: number;
}

/**
 * Saldo de uma conta na moeda da própria conta. Lançamentos em outra moeda
 * (dados antigos ou reatribuídos) são convertidos em vez de somados crus.
 */
export function computeAccountBalance(
  acc: Account,
  transactions: Transaction[],
  liveUsdToBrlRate: number | null | undefined,
  projectionUntil?: string // YYYY-MM-DD inclusivo; pendentes depois disso ficam fora da previsão
): AccountBalance {
  const currency = accountCurrency(acc);
  let paidInflows = 0;
  let paidOutflows = 0;
  let pendingNet = 0;
  let txCount = 0;

  for (const tx of transactions) {
    if (tx.accountId !== acc.id) continue;
    txCount++;
    const value = txAmountIn(tx, currency, liveUsdToBrlRate);
    if (tx.status === 'paid') {
      if (tx.type === 'income') paidInflows += value;
      else paidOutflows += value;
    } else if (!projectionUntil || tx.date <= projectionUntil) {
      pendingNet += tx.type === 'income' ? value : -value;
    }
  }

  const currentBalance = acc.initialBalance + paidInflows - paidOutflows;
  return {
    currency,
    paidInflows,
    paidOutflows,
    pendingNet,
    currentBalance,
    projectedBalance: currentBalance + pendingNet,
    txCount,
  };
}

export interface DualAmount {
  brl: number;
  usd: number | null; // null quando não há cotação para converter
}

function dual(
  tx: Pick<Transaction, 'amount' | 'currency' | 'exchangeRate'>,
  liveUsdToBrlRate: number | null | undefined
): DualAmount {
  const rate = isValidRate(tx.exchangeRate) ? tx.exchangeRate : liveUsdToBrlRate;
  const from = txCurrency(tx);
  return {
    brl: convertAmount(tx.amount, from, 'BRL', rate) ?? 0,
    usd: convertAmount(tx.amount, from, 'USD', rate),
  };
}

function addDual(a: DualAmount, b: DualAmount): DualAmount {
  return { brl: a.brl + b.brl, usd: a.usd === null || b.usd === null ? null : a.usd + b.usd };
}

const ZERO: DualAmount = { brl: 0, usd: 0 };

export interface MonthSummary {
  incomePaid: DualAmount;
  incomePending: DualAmount;
  expensePaid: DualAmount;
  expensePending: DualAmount;
  /** Realizado: só lançamentos pagos (confirmados) */
  netPaid: DualAmount;
  /** Previsão: realizado + pendentes (a vencer / a receber) */
  netProjected: DualAmount;
  hasPending: boolean;
}

function subDual(a: DualAmount, b: DualAmount): DualAmount {
  return { brl: a.brl - b.brl, usd: a.usd === null || b.usd === null ? null : a.usd - b.usd };
}

/** Totais de um conjunto de lançamentos em BRL e USD, separando pago de pendente. */
export function summarizeTransactions(
  transactions: Transaction[],
  liveUsdToBrlRate: number | null | undefined
): MonthSummary {
  let incomePaid = ZERO;
  let incomePending = ZERO;
  let expensePaid = ZERO;
  let expensePending = ZERO;
  let hasPending = false;

  for (const tx of transactions) {
    const value = dual(tx, liveUsdToBrlRate);
    if (tx.status !== 'paid') hasPending = true;
    if (tx.type === 'income') {
      if (tx.status === 'paid') incomePaid = addDual(incomePaid, value);
      else incomePending = addDual(incomePending, value);
    } else {
      if (tx.status === 'paid') expensePaid = addDual(expensePaid, value);
      else expensePending = addDual(expensePending, value);
    }
  }

  const netPaid = subDual(incomePaid, expensePaid);
  const netProjected = subDual(addDual(netPaid, incomePending), expensePending);
  return { incomePaid, incomePending, expensePaid, expensePending, netPaid, netProjected, hasPending };
}

export interface NetWorth {
  /** Saldo confirmado (só lançamentos pagos) */
  current: DualAmount;
  /** Previsão: saldo confirmado + pendentes */
  projected: DualAmount;
}

/** Patrimônio somando todas as contas, expresso em BRL e em USD. */
export function computeNetWorth(
  accounts: Account[],
  transactions: Transaction[],
  liveUsdToBrlRate: number | null | undefined,
  projectionUntil?: string
): NetWorth {
  let current = ZERO;
  let projected = ZERO;
  for (const acc of accounts) {
    const bal = computeAccountBalance(acc, transactions, liveUsdToBrlRate, projectionUntil);
    const toDual = (amount: number): DualAmount => ({
      brl: convertAmount(amount, bal.currency, 'BRL', liveUsdToBrlRate) ?? 0,
      usd: convertAmount(amount, bal.currency, 'USD', liveUsdToBrlRate),
    });
    current = addDual(current, toDual(bal.currentBalance));
    projected = addDual(projected, toDual(bal.projectedBalance));
  }
  return { current, projected };
}

/** Último dia (inclusivo, para comparação de strings YYYY-MM-DD) de um mês YYYY-MM. */
export function endOfMonthDate(yearMonth: string): string {
  return `${yearMonth}-31`;
}

/**
 * Lê um valor digitado no formato brasileiro ou internacional:
 * "1.234,56" → 1234.56 · "1234,56" → 1234.56 · "1,234.56" → 1234.56 · "12.5" → 12.5
 * Retorna NaN quando não há número válido.
 */
export function parseDecimalInput(raw: string): number {
  let s = raw.trim().replace(/[^\d.,-]/g, '');
  if (!s) return NaN;
  const lastComma = s.lastIndexOf(',');
  const lastDot = s.lastIndexOf('.');
  if (lastComma > -1 && lastDot > -1) {
    // O separador que aparece por último é o decimal; o outro é de milhar
    s = lastComma > lastDot ? s.replace(/\./g, '').replace(',', '.') : s.replace(/,/g, '');
  } else if (lastComma > -1) {
    s = s.replace(/\./g, '').replace(',', '.');
  } else if ((s.match(/\./g) || []).length > 1) {
    // "1.234.567" só com pontos: são separadores de milhar
    s = s.replace(/\./g, '');
  }
  return Number(s);
}
