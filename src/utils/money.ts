import {
  findExchangeRate,
  normalizeCurrency,
  type ExchangeRateSource,
} from '../services/currencyService';
import type { Account, Category, Currency, Transaction } from '../types/finance';

export function txCurrency(tx: Pick<Transaction, 'currency'>): Currency {
  return normalizeCurrency(tx.currency) || 'BRL';
}

export function accountCurrency(acc: Pick<Account, 'currency'>): Currency {
  return normalizeCurrency(acc.currency) || 'BRL';
}

export function categoryBudgetCurrency(cat: Pick<Category, 'budgetCurrency'>): Currency {
  return normalizeCurrency(cat.budgetCurrency) || 'BRL';
}

export function categoryBudgetInBrl(
  cat: Pick<Category, 'monthlyBudget' | 'budgetCurrency'>,
  rateSource: ExchangeRateSource
): number {
  const budget = cat.monthlyBudget;
  if (!budget || budget <= 0) return 0;
  const curr = categoryBudgetCurrency(cat);
  if (curr === 'BRL') return budget;
  const converted = convertAmount(budget, curr, 'BRL', rateSource);
  return converted !== null ? converted : budget;
}

export function isValidRate(rate: number | null | undefined): rate is number {
  return typeof rate === 'number' && Number.isFinite(rate) && rate > 0;
}

export function convertAmount(
  amount: number,
  fromRaw: Currency,
  toRaw: Currency,
  rateSource: ExchangeRateSource
): number | null {
  const from = normalizeCurrency(fromRaw) || 'BRL';
  const to = normalizeCurrency(toRaw) || 'BRL';
  if (from === to) return amount;

  const rate = findExchangeRate(rateSource, from, to);
  if (!isValidRate(rate)) return null;
  return amount * rate;
}

export function txAmountIn(
  tx: Pick<Transaction, 'amount' | 'currency' | 'exchangeRate'>,
  targetRaw: Currency,
  rateSource: ExchangeRateSource
): number {
  const from = txCurrency(tx);
  const target = normalizeCurrency(targetRaw) || 'BRL';
  if (from === target) return tx.amount;

  if (isValidRate(tx.exchangeRate)) {
    if (from !== 'BRL' && target === 'BRL') {
      return tx.amount * tx.exchangeRate;
    }
    if (from === 'BRL' && target !== 'BRL') {
      return tx.amount / tx.exchangeRate;
    }
    const brlValue = tx.amount * tx.exchangeRate;
    const brlToTarget = findExchangeRate(rateSource, 'BRL', target);
    if (isValidRate(brlToTarget)) {
      return brlValue * brlToTarget;
    }
  }

  return convertAmount(tx.amount, from, target, rateSource) ?? 0;
}

export function txAmountInBrl(
  tx: Pick<Transaction, 'amount' | 'currency' | 'exchangeRate'>,
  rateSource: ExchangeRateSource
): number {
  return txAmountIn(tx, 'BRL', rateSource);
}

export interface AccountBalance {
  currency: Currency;
  paidInflows: number;
  paidOutflows: number;
  monthPaidInflows: number;
  monthPaidOutflows: number;
  pendingNet: number;
  currentBalance: number;
  projectedBalance: number;
  txCount: number;
  monthTxCount: number;
}

export function computeAccountBalance(
  acc: Account,
  transactions: readonly Transaction[],
  rateSource: ExchangeRateSource,
  projectionUntil?: string
): AccountBalance {
  const currency = accountCurrency(acc);
  const monthPrefix = projectionUntil ? projectionUntil.slice(0, 7) : undefined;
  let paidInflows = 0;
  let paidOutflows = 0;
  let monthPaidInflows = 0;
  let monthPaidOutflows = 0;
  let pendingNet = 0;
  let txCount = 0;
  let monthTxCount = 0;

  for (const tx of transactions) {
    if (tx.accountId !== acc.id) continue;
    txCount++;
    const isInMonth = monthPrefix ? tx.date.startsWith(monthPrefix) : true;
    if (isInMonth) monthTxCount++;

    const value = txAmountIn(tx, currency, rateSource);
    if (tx.status === 'paid') {
      if (tx.type === 'income') {
        paidInflows += value;
        if (isInMonth) monthPaidInflows += value;
      } else {
        paidOutflows += value;
        if (isInMonth) monthPaidOutflows += value;
      }
    } else if (!projectionUntil || tx.date <= projectionUntil) {
      pendingNet += tx.type === 'income' ? value : -value;
    }
  }

  const currentBalance = acc.initialBalance + paidInflows - paidOutflows;
  return {
    currency,
    paidInflows,
    paidOutflows,
    monthPaidInflows,
    monthPaidOutflows,
    pendingNet,
    currentBalance,
    projectedBalance: currentBalance + pendingNet,
    txCount,
    monthTxCount,
  };
}

export interface DualAmount {
  brl: number;
  usd: number | null;
}

function toDualFromTx(
  tx: Pick<Transaction, 'amount' | 'currency' | 'exchangeRate'>,
  rateSource: ExchangeRateSource
): DualAmount {
  const from = txCurrency(tx);
  const brl = txAmountIn(tx, 'BRL', rateSource);

  if (from === 'USD') {
    return { brl, usd: tx.amount };
  }
  if (isValidRate(tx.exchangeRate) && from === 'BRL') {
    return { brl: tx.amount, usd: tx.amount / tx.exchangeRate };
  }
  const usdRate = findExchangeRate(rateSource, 'BRL', 'USD');
  return {
    brl,
    usd: isValidRate(usdRate) ? brl * usdRate : null,
  };
}

function addDual(a: DualAmount, b: DualAmount): DualAmount {
  return {
    brl: a.brl + b.brl,
    usd: a.usd === null || b.usd === null ? null : a.usd + b.usd,
  };
}

function subDual(a: DualAmount, b: DualAmount): DualAmount {
  return {
    brl: a.brl - b.brl,
    usd: a.usd === null || b.usd === null ? null : a.usd - b.usd,
  };
}

const ZERO_DUAL: DualAmount = { brl: 0, usd: 0 };

export interface MonthSummary {
  incomePaid: DualAmount;
  incomePending: DualAmount;
  expensePaid: DualAmount;
  expensePending: DualAmount;
  netPaid: DualAmount;
  netProjected: DualAmount;
  hasPending: boolean;
}

export function summarizeTransactions(
  transactions: readonly Transaction[],
  rateSource: ExchangeRateSource
): MonthSummary {
  let incomePaid = ZERO_DUAL;
  let incomePending = ZERO_DUAL;
  let expensePaid = ZERO_DUAL;
  let expensePending = ZERO_DUAL;
  let hasPending = false;

  for (const tx of transactions) {
    const value = toDualFromTx(tx, rateSource);
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
  return {
    incomePaid,
    incomePending,
    expensePaid,
    expensePending,
    netPaid,
    netProjected,
    hasPending,
  };
}

export interface NetWorth {
  current: DualAmount;
  projected: DualAmount;
}

export function computeNetWorth(
  accounts: readonly Account[],
  transactions: readonly Transaction[],
  rateSource: ExchangeRateSource,
  projectionUntil?: string
): NetWorth {
  const txsByAccount = new Map<string, Transaction[]>();
  for (const tx of transactions) {
    const list = txsByAccount.get(tx.accountId);
    if (list) list.push(tx);
    else txsByAccount.set(tx.accountId, [tx]);
  }

  let current = ZERO_DUAL;
  let projected = ZERO_DUAL;

  for (const acc of accounts) {
    const accTxs = txsByAccount.get(acc.id) ?? [];
    const bal = computeAccountBalance(acc, accTxs, rateSource, projectionUntil);
    const toDual = (amount: number): DualAmount => ({
      brl: convertAmount(amount, bal.currency, 'BRL', rateSource) ?? 0,
      usd: convertAmount(amount, bal.currency, 'USD', rateSource),
    });
    current = addDual(current, toDual(bal.currentBalance));
    projected = addDual(projected, toDual(bal.projectedBalance));
  }

  return { current, projected };
}

export function endOfMonthDate(yearMonth: string): string {
  return `${yearMonth}-31`;
}

export function parseDecimalInput(raw: string): number {
  let s = raw.trim().replace(/[^\d.,-]/g, '');
  if (!s) return NaN;
  const lastComma = s.lastIndexOf(',');
  const lastDot = s.lastIndexOf('.');
  if (lastComma > -1 && lastDot > -1) {
    s = lastComma > lastDot ? s.replace(/\./g, '').replace(',', '.') : s.replace(/,/g, '');
  } else if (lastComma > -1) {
    s = s.replace(/\./g, '').replace(',', '.');
  } else if ((s.match(/\./g) || []).length > 1) {
    s = s.replace(/\./g, '');
  }
  return Number(s);
}
