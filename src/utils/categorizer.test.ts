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

  it('categoriza por palavras-chave nos 4 idiomas (pt-BR, en-GB, es, zh-CN)', () => {
    const multiCats: Category[] = [
      { id: 'cat_housing', name: 'Moradia', type: 'expense', color: '#f43f5e', icon: 'Home' },
      { id: 'cat_groceries', name: 'Supermercado', type: 'expense', color: '#f59e0b', icon: 'ShoppingCart' },
      { id: 'cat_transport', name: 'Transporte', type: 'expense', color: '#38bdf8', icon: 'Car' },
      { id: 'cat_health', name: 'Saúde', type: 'expense', color: '#ec4899', icon: 'HeartPulse' },
      { id: 'cat_salary', name: 'Salário', type: 'income', color: '#10b981', icon: 'Briefcase' },
    ];

    expect(predictCategory('Aluguel apartamento', 'expense', multiCats)?.categoryId).toBe('cat_housing');
    expect(predictCategory('Tesco supermarket', 'expense', multiCats)?.categoryId).toBe('cat_groceries');
    expect(predictCategory('Billete de autobús', 'expense', multiCats)?.categoryId).toBe('cat_transport');
    expect(predictCategory('药店买药', 'expense', multiCats)?.categoryId).toBe('cat_health');
    expect(predictCategory('房租', 'expense', multiCats)?.categoryId).toBe('cat_housing');
    expect(predictCategory('Monthly payroll', 'income', multiCats)?.categoryId).toBe('cat_salary');
    expect(predictCategory('工资收入', 'income', multiCats)?.categoryId).toBe('cat_salary');
  });
});
