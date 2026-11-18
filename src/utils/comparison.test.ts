import { describe, expect, it } from 'vitest';
import { buildMonthComparison } from './comparison';
import type { Category, Transaction } from '../types/finance';

describe('utils/comparison', () => {
  it('compara totais mensais consecutivos por categoria', () => {
    const categories: Category[] = [
      { id: 'c1', name: 'Mercado', type: 'expense', color: '#ff0000', icon: 'shopping-cart' },
    ];
    const transactions: Transaction[] = [
      {
        id: 't1',
        type: 'expense',
        amount: 400,
        description: 'Mercado',
        date: '2026-10-10',
        categoryId: 'c1',
        accountId: 'a1',
        status: 'paid',
        createdAt: '2026-10-10T10:00:00Z',
      },
      {
        id: 't2',
        type: 'expense',
        amount: 600,
        description: 'Mercado',
        date: '2026-11-10',
        categoryId: 'c1',
        accountId: 'a1',
        status: 'paid',
        createdAt: '2026-11-10T10:00:00Z',
      },
    ];

    const comparisons = buildMonthComparison(transactions, categories, '2026-11', 1);
    expect(comparisons).toHaveLength(1);
    expect(comparisons[0].month).toBe('2026-11');
    expect(comparisons[0].expense.total).toBe(600);
    expect(comparisons[0].vsPrevious?.expense).toBe(200);
    expect(comparisons[0].vsPrevious?.expensePct).toBe(50);
  });
});
