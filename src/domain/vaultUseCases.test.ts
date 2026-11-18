import { describe, expect, it } from 'vitest';
import {
  addAccountInVault,
  addCategoryInVault,
  deleteAccountInVault,
  deleteCategoryInVault,
  deleteTransactionInVault,
  duplicateTransactionInVault,
  removeVaultExchangeRate,
  saveTransactionsInVault,
  setTransactionStatusInVault,
  transferBetweenAccountsInVault,
  updateAccountInVault,
  updateCategoryInVault,
  upsertVaultExchangeRate,
} from './vaultUseCases';
import type { VaultPayload } from '../types/finance';

function makeVault(): VaultPayload {
  return {
    version: 1,
    updatedAt: '2026-11-18T12:00:00Z',
    accounts: [
      { id: 'acc-1', name: 'Carteira', type: 'wallet', initialBalance: 1000, currency: 'BRL', color: '#10b981' },
      { id: 'acc-2', name: 'Dólar', type: 'checking', initialBalance: 100, currency: 'USD', color: '#3b82f6' },
    ],
    categories: [
      { id: 'cat-food', name: 'Alimentação', type: 'expense', color: '#ff5500', icon: 'utensils' },
      { id: 'cat-other-exp', name: 'Outros', type: 'expense', color: '#888888', icon: 'tag', isSystem: true },
      { id: 'cat-other-inc', name: 'Outros', type: 'income', color: '#888888', icon: 'tag', isSystem: true },
    ],
    transactions: [
      {
        id: 'tx-1',
        type: 'expense',
        amount: 50,
        description: 'Café',
        date: '2026-11-10',
        categoryId: 'cat-food',
        accountId: 'acc-1',
        status: 'pending',
        createdAt: '2026-11-10T10:00:00Z',
      },
    ],
    settings: {
      currency: 'BRL',
      hideValuesByDefault: false,
      vaultName: 'Teste',
      autoLockMinutes: 15,
      exchangeRates: [{ from: 'USD', to: 'BRL', rate: 5, updatedAt: '2026-11-18 10:00' }],
    },
  };
}

describe('domain/vaultUseCases', () => {
  it('cria, edita, duplica, marca como paga e exclui transações', () => {
    const v0 = makeVault();
    const v1 = saveTransactionsInVault(
      v0,
      [{ ...v0.transactions[0], id: 'tx-2', description: 'Almoço' }],
      false
    );
    expect(v1.transactions).toHaveLength(2);

    const v2 = saveTransactionsInVault(v1, [{ ...v1.transactions[0], amount: 80 }], true);
    expect(v2.transactions[0].amount).toBe(80);

    const v3 = setTransactionStatusInVault(v2, 'tx-1', 'paid', '2026-11-18');
    expect(v3.transactions.find((t) => t.id === 'tx-1')?.status).toBe('paid');
    expect(v3.transactions.find((t) => t.id === 'tx-1')?.paidAt).toBe('2026-11-18');

    const v4 = duplicateTransactionInVault(v3, v3.transactions[0]);
    expect(v4.transactions).toHaveLength(3);
    expect(v4.transactions[0].description).toContain('(Cópia)');

    const v5 = deleteTransactionInVault(v4, 'tx-1');
    expect(v5.transactions.some((t) => t.id === 'tx-1')).toBe(false);
  });

  it('protege categoria do sistema e realiza fallback ao excluir categoria em uso', () => {
    const v0 = makeVault();
    const withCat = addCategoryInVault(v0, {
      id: 'cat-travel',
      name: 'Viagem',
      type: 'expense',
      color: '#00aaff',
      icon: 'plane',
    });
    expect(withCat.categories).toHaveLength(4);

    const protectedUpdate = updateCategoryInVault(withCat, {
      id: 'cat-other-exp',
      name: 'Tentativa',
      type: 'expense',
      color: '#000000',
      icon: 'tag',
    });
    expect(protectedUpdate.categories.find((c) => c.id === 'cat-other-exp')?.name).toBe('Outros');
    expect(deleteCategoryInVault(protectedUpdate, 'cat-other-exp')).toBeNull();

    const afterDelete = deleteCategoryInVault(protectedUpdate, 'cat-food');
    expect(afterDelete).not.toBeNull();
    expect(afterDelete!.transactions[0].categoryId).toBe('cat-other-exp');
  });

  it('gerencia contas e transferência entre contas com moedas distintas', () => {
    const v0 = makeVault();
    const v1 = addAccountInVault(v0, {
      id: 'acc-3',
      name: 'Reserva',
      type: 'reserve',
      initialBalance: 0,
      currency: 'BRL',
      color: '#6366f1',
    });
    expect(v1.accounts).toHaveLength(3);

    const v2 = updateAccountInVault(v1, { ...v1.accounts[2], name: 'Reserva Emergência' });
    expect(v2.accounts[2].name).toBe('Reserva Emergência');

    const transfer = transferBetweenAccountsInVault(v2, {
      fromAccId: 'acc-1',
      toAccId: 'acc-2',
      amount: 500,
      description: 'Câmbio',
      date: '2026-11-18',
    });
    expect('error' in transfer).toBe(false);
    if ('nextVault' in transfer) {
      expect(transfer.nextVault.transactions).toHaveLength(3);
      const inTx = transfer.nextVault.transactions.find((t) => t.type === 'income');
      expect(inTx?.amount).toBeCloseTo(100);
    }

    const afterDelete = deleteAccountInVault(v2, 'acc-1');
    expect(afterDelete).not.toBeNull();
    expect(afterDelete!.accounts.some((a) => a.id === 'acc-1')).toBe(false);
    expect(afterDelete!.transactions[0].accountId).toBe('acc-3');
  });

  it('atualiza e remove taxas de câmbio nas configurações do cofre', () => {
    const v0 = makeVault();
    const v1 = upsertVaultExchangeRate(v0, 'EUR', 'BRL', 6.1);
    expect(v1.settings.exchangeRates?.some((r) => r.from === 'EUR' && r.to === 'BRL')).toBe(true);

    const v2 = removeVaultExchangeRate(v1, 'EUR', 'BRL');
    expect(v2.settings.exchangeRates?.some((r) => r.from === 'EUR' && r.to === 'BRL')).toBe(false);
  });
});
