import { describe, expect, it } from 'vitest';
import { buildTransactionsCSV } from './importExport';
import type { Account, Category, Transaction } from '../types/finance';

describe('services/importExport', () => {
  it('neutraliza fórmulas (CSV injection) e escapa aspas corretamente', () => {
    const accounts: Account[] = [
      { id: 'a1', name: 'Banco "Principal"', type: 'checking', initialBalance: 0, color: '#3b82f6' },
    ];
    const categories: Category[] = [
      { id: 'c1', name: '=CMD()', type: 'expense', color: '#000000', icon: 'tag' },
    ];
    const transactions: Transaction[] = [
      {
        id: 't1',
        type: 'expense',
        amount: 42.5,
        description: '+SUM(A1:A2)',
        date: '2026-11-18',
        categoryId: 'c1',
        accountId: 'a1',
        status: 'paid',
        notes: '@malicious',
        createdAt: '2026-11-18T10:00:00Z',
      },
    ];

    const csv = buildTransactionsCSV(transactions, categories, accounts);
    expect(csv.startsWith('\uFEFFData,Descricao,')).toBe(true);
    expect(csv).toContain('"\'+SUM(A1:A2)"');
    expect(csv).toContain('"\'=CMD()"');
    expect(csv).toContain('"\'@malicious"');
    expect(csv).toContain('"Banco ""Principal"""');
  });
});
