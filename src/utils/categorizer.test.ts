import { describe, expect, it } from 'vitest';
import { predictCategory } from './categorizer';
import type { Category, Transaction } from '../types/finance';

describe('utils/categorizer', () => {
  const categories: Category[] = [
    { id: 'cat-food', name: 'Alimentação', type: 'expense', color: '#ff0000', icon: 'utensils' },
    { id: 'cat-transp', name: 'Transporte', type: 'expense', color: '#00ff00', icon: 'car' },
  ];

  it('prioriza histórico do usuário antes de palavras-chave', () => {
    const past: Transaction[] = [
      {
        id: 't1',
        type: 'expense',
        amount: 30,
        description: 'Padaria Central',
        date: '2026-11-01',
        categoryId: 'cat-food',
        accountId: 'a1',
        status: 'paid',
        createdAt: '2026-11-01T10:00:00Z',
      },
    ];
    const match = predictCategory('Padaria Central', 'expense', categories, past);
    expect(match?.categoryId).toBe('cat-food');
    expect(match?.confidence).toBe('history');
  });

  it('retorna null para descrições curtas demais', () => {
    expect(predictCategory('ab', 'expense', categories, [])).toBeNull();
  });
});
