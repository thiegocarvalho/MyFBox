import { describe, expect, it } from 'vitest';
import {
  findExchangeRate,
  normalizeCurrency,
  removeExchangeRate,
  upsertExchangeRate,
} from './currency';

describe('domain/currency', () => {
  it('normaliza códigos de moeda com trim e uppercase', () => {
    expect(normalizeCurrency(' brl ')).toBe('BRL');
    expect(normalizeCurrency(undefined)).toBe('');
  });

  it('calcula taxa direta, inversa e por pivô (BRL/USD)', () => {
    const rates = [
      { from: 'USD', to: 'BRL', rate: 5, updatedAt: '2026-11-18 10:00' },
      { from: 'EUR', to: 'USD', rate: 1.1, updatedAt: '2026-11-18 10:00' },
    ];
    expect(findExchangeRate(rates, 'USD', 'USD')).toBe(1);
    expect(findExchangeRate(rates, 'USD', 'BRL')).toBe(5);
    expect(findExchangeRate(rates, 'BRL', 'USD')).toBeCloseTo(0.2);
    expect(findExchangeRate(rates, 'EUR', 'BRL')).toBeCloseTo(5.5);
  });

  it('atualiza e remove taxas sem mutar o array original', () => {
    const initial = [{ from: 'USD', to: 'BRL', rate: 5, updatedAt: '2026-11-18 10:00' }];
    const updated = upsertExchangeRate(initial, 'usd', 'brl', 5.25);
    expect(updated).toHaveLength(1);
    expect(updated[0].rate).toBe(5.25);
    expect(initial[0].rate).toBe(5);

    const removed = removeExchangeRate(updated, 'USD', 'BRL');
    expect(removed).toHaveLength(0);
  });
});
