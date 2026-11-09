import type { ExchangeRateSource } from '../services/currencyService';
import type { Category, Transaction } from '../types/finance';
import { shiftYearMonth } from './formatters';
import { txAmountInBrl } from './money';

export interface MonthCategoryTotal {
  categoryId: string;
  name: string;
  color: string;
  type: 'income' | 'expense';
  total: number;
  delta?: number | null;
  share?: number;
}

export interface MonthCategoryChange extends MonthCategoryTotal {
  previous: number;
  delta: number;
}

export interface MonthComparison {
  month: string;
  income: { paid: number; pending: number; total: number };
  expense: { paid: number; pending: number; total: number };
  net: number;
  transactionCount: number;
  categories: MonthCategoryTotal[];
  vsPrevious: {
    income: number;
    expense: number;
    net: number;
    expensePct: number | null;
  } | null;
  topChanges: MonthCategoryChange[];
  signature: string;
}

const round2 = (n: number) => Math.round(n * 100) / 100;

function computeBucketTotals(
  monthTransactions: readonly Transaction[],
  catMap: ReadonlyMap<string, Category>,
  rateSource: ExchangeRateSource
) {
  const income = { paid: 0, pending: 0, total: 0 };
  const expense = { paid: 0, pending: 0, total: 0 };
  const byCat = new Map<string, MonthCategoryTotal>();
  let count = 0;

  for (const tx of monthTransactions) {
    count++;
    const value = txAmountInBrl(tx, rateSource);
    const bucket = tx.type === 'income' ? income : expense;
    if (tx.status === 'paid') bucket.paid += value;
    else bucket.pending += value;
    bucket.total += value;

    const cat = catMap.get(tx.categoryId);
    const cur = byCat.get(tx.categoryId) ?? {
      categoryId: tx.categoryId,
      name: cat?.name ?? 'Sem categoria',
      color: cat?.color ?? '#8C8C8C',
      type: tx.type,
      total: 0,
    };
    cur.total += value;
    byCat.set(tx.categoryId, cur);
  }

  const r = (o: { paid: number; pending: number; total: number }) => ({
    paid: round2(o.paid),
    pending: round2(o.pending),
    total: round2(o.total),
  });

  return {
    income: r(income),
    expense: r(expense),
    count,
    categories: [...byCat.values()]
      .map((c) => ({ ...c, total: round2(c.total) }))
      .sort((a, b) => b.total - a.total),
  };
}

function signatureOf(t: ReturnType<typeof computeBucketTotals>): string {
  const raw = [
    t.count,
    t.income.paid,
    t.income.pending,
    t.expense.paid,
    t.expense.pending,
    ...t.categories.map((c) => `${c.categoryId}:${c.total}`),
  ].join('|');
  let h = 2166136261;
  for (let i = 0; i < raw.length; i++) {
    h ^= raw.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return (h >>> 0).toString(36);
}

export function buildMonthComparison(
  transactions: readonly Transaction[],
  categories: readonly Category[],
  endMonth: string,
  monthCount: number,
  rateSource?: ExchangeRateSource
): MonthComparison[] {
  const months = Array.from({ length: monthCount + 1 }, (_, i) =>
    shiftYearMonth(endMonth, i - monthCount)
  );
  const monthSet = new Set(months);
  const txsByMonth = new Map<string, Transaction[]>();

  for (const tx of transactions) {
    const ym = tx.date.slice(0, 7);
    if (!monthSet.has(ym)) continue;
    const list = txsByMonth.get(ym);
    if (list) list.push(tx);
    else txsByMonth.set(ym, [tx]);
  }

  const catMap = new Map(categories.map((c) => [c.id, c]));
  const totals = months.map((m) =>
    computeBucketTotals(txsByMonth.get(m) ?? [], catMap, rateSource)
  );

  const result: MonthComparison[] = [];
  for (let i = 1; i < months.length; i++) {
    const cur = totals[i];
    const prev = totals[i - 1];
    const net = round2(cur.income.total - cur.expense.total);
    const prevNet = prev.income.total - prev.expense.total;
    const prevHasData = prev.count > 0;

    const prevByCat = new Map(prev.categories.map((c) => [c.categoryId, c.total]));
    const ids = new Set([
      ...cur.categories.filter((c) => c.type === 'expense').map((c) => c.categoryId),
      ...prev.categories.filter((c) => c.type === 'expense').map((c) => c.categoryId),
    ]);

    const topChanges: MonthCategoryChange[] = [...ids]
      .map((id) => {
        const now = cur.categories.find((c) => c.categoryId === id);
        const before = prev.categories.find((c) => c.categoryId === id);
        const base = (now ?? before)!;
        const previous = prevByCat.get(id) ?? 0;
        const total = now?.total ?? 0;
        return { ...base, total, previous, delta: round2(total - previous) };
      })
      .filter((c) => c.delta !== 0)
      .sort((a, b) => Math.abs(b.delta) - Math.abs(a.delta))
      .slice(0, 3);

    result.push({
      month: months[i],
      income: cur.income,
      expense: cur.expense,
      net,
      transactionCount: cur.count,
      categories: cur.categories.map((c) => {
        const bucketTotal = c.type === 'expense' ? cur.expense.total : cur.income.total;
        return {
          ...c,
          share: bucketTotal > 0 ? round2((c.total / bucketTotal) * 100) : 0,
          delta: prevHasData ? round2(c.total - (prevByCat.get(c.categoryId) ?? 0)) : null,
        };
      }),
      vsPrevious: prevHasData
        ? {
            income: round2(cur.income.total - prev.income.total),
            expense: round2(cur.expense.total - prev.expense.total),
            net: round2(net - prevNet),
            expensePct:
              prev.expense.total > 0
                ? round2(((cur.expense.total - prev.expense.total) / prev.expense.total) * 100)
                : null,
          }
        : null,
      topChanges: prevHasData ? topChanges : [],
      signature: signatureOf(cur),
    });
  }

  return result;
}
