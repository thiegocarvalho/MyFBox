import { describe, expect, it } from 'vitest';
import { parseDecimalInput, convertAmount, endOfMonthDate, summarizeTransactions } from './money';
import type { Transaction } from '../types/finance';

describe('utils/money', () => {
  it('faz parse de valores decimais em formato BR e US', () => {
    expect(parseDecimalInput('1.250,50')).toBe(1250.5);
    expect(parseDecimalInput('150.75')).toBe(150.75);
    expect(parseDecimalInput('R$ 99,90')).toBe(99.9);
    expect(parseDecimalInput('')).toBeNaN();
  });

  it('converte valores entre moedas usando rateSource', () => {
    const rates = [{ from: 'USD', to: 'BRL', rate: 5.5, updatedAt: '' }];
    expect(convertAmount(100, 'USD', 'BRL', rates)).toBeCloseTo(550);
    expect(convertAmount(100, 'BRL', 'BRL', rates)).toBe(100);
  });

  it('gera limite superior lexicográfico de fim de mês', () => {
    expect(endOfMonthDate('2024-02')).toBe('2024-02-31');
    expect(endOfMonthDate('2026-11')).toBe('2026-11-31');
  });

  it('sumariza receitas e despesas pagas vs pendentes', () => {
    const txs: Transaction[] = [
      {
        id: '1',
        type: 'income',
        amount: 1000,
        description: 'Salário',
        date: '2026-11-05',
        categoryId: 'c1',
        accountId: 'a1',
        status: 'paid',
        createdAt: '2026-11-18T12:00:00Z',
      },
      {
        id: '2',
        type: 'expense',
        amount: 250,
        description: 'Mercado',
        date: '2026-11-10',
        categoryId: 'c2',
        accountId: 'a1',
        status: 'pending',
        createdAt: '2026-11-18T12:00:00Z',
      },
    ];
    const summary = summarizeTransactions(txs, null);
    expect(summary.incomePaid.brl).toBe(1000);
    expect(summary.expensePending.brl).toBe(250);
    expect(summary.netPaid.brl).toBe(1000);
    expect(summary.netProjected.brl).toBe(750);
    expect(summary.hasPending).toBe(true);
  });
});
