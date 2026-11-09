import {
  findExchangeRate,
  formatRateDate,
  normalizeCurrency,
  removeExchangeRate,
  upsertExchangeRate,
} from '../services/currencyService';
import type {
  Account,
  Category,
  ExchangeRateOrigin,
  Transaction,
  TransactionStatus,
  VaultPayload,
  VaultSettings,
} from '../types/finance';
import {
  findOrCreateOutrosCategory,
  getDefaultCategoryId,
  isProtectedCategory,
} from '../utils/categories';
import { accountCurrency, convertAmount, isValidRate, txCurrency } from '../utils/money';
import { generateEntityId } from './id';

export function saveTransactionsInVault(
  vault: VaultPayload,
  txsToSave: readonly Transaction[],
  isEdit: boolean
): VaultPayload {
  if (txsToSave.length === 0) return vault;
  const nextTransactions =
    isEdit && txsToSave.length === 1
      ? vault.transactions.map((t) => (t.id === txsToSave[0].id ? txsToSave[0] : t))
      : [...txsToSave, ...vault.transactions];

  return {
    ...vault,
    transactions: nextTransactions,
  };
}

export function setTransactionStatusInVault(
  vault: VaultPayload,
  txId: string,
  nextStatus: TransactionStatus,
  todayStr: string,
  paidAt?: string
): VaultPayload {
  const nextTransactions = vault.transactions.map((t): Transaction => {
    if (t.id !== txId) return t;

    const account = vault.accounts.find((a) => a.id === t.accountId);
    const txCurr = txCurrency(t);
    const accCurr = accountCurrency(account ?? {});
    const foreignCurrency = txCurr !== 'BRL' ? txCurr : accCurr !== 'BRL' ? accCurr : null;
    const liveRateToBrl = foreignCurrency
      ? findExchangeRate(vault.settings, foreignCurrency, 'BRL')
      : null;

    const shouldFixRate =
      nextStatus === 'paid' &&
      foreignCurrency !== null &&
      !isValidRate(t.exchangeRate) &&
      isValidRate(liveRateToBrl);

    return {
      ...t,
      status: nextStatus,
      paidAt: nextStatus === 'paid' ? paidAt ?? todayStr : undefined,
      exchangeRate: shouldFixRate ? liveRateToBrl : t.exchangeRate,
    };
  });

  return {
    ...vault,
    transactions: nextTransactions,
  };
}

export function duplicateTransactionInVault(
  vault: VaultPayload,
  tx: Transaction
): VaultPayload {
  const clone: Transaction = {
    ...tx,
    id: generateEntityId('tx'),
    description: `${tx.description} (Cópia)`,
    createdAt: new Date().toISOString(),
  };

  return {
    ...vault,
    transactions: [clone, ...vault.transactions],
  };
}

export function deleteTransactionInVault(
  vault: VaultPayload,
  txId: string
): VaultPayload {
  return {
    ...vault,
    transactions: vault.transactions.filter((t) => t.id !== txId),
  };
}

export function addCategoryInVault(
  vault: VaultPayload,
  newCat: Category
): VaultPayload {
  return {
    ...vault,
    categories: [...vault.categories, newCat],
  };
}

export function updateCategoryInVault(
  vault: VaultPayload,
  updatedCat: Category
): VaultPayload {
  const original = vault.categories.find((c) => c.id === updatedCat.id);
  const safeCat: Category =
    original && isProtectedCategory(original)
      ? { ...updatedCat, name: 'Outros', isSystem: true }
      : updatedCat;

  return {
    ...vault,
    categories: vault.categories.map((c) => (c.id === safeCat.id ? safeCat : c)),
  };
}

export function deleteCategoryInVault(
  vault: VaultPayload,
  catId: string
): VaultPayload | null {
  const deleted = vault.categories.find((c) => c.id === catId);
  if (!deleted || isProtectedCategory(deleted)) return null;

  const remainingWithoutDeleted = vault.categories.filter((c) => c.id !== catId);
  const { target: outrosCategory, categories: nextCategories } = findOrCreateOutrosCategory(
    remainingWithoutDeleted,
    deleted.type
  );

  const nextTransactions = vault.transactions.map((t) =>
    t.categoryId === catId ? { ...t, categoryId: outrosCategory.id } : t
  );

  return {
    ...vault,
    categories: nextCategories,
    transactions: nextTransactions,
  };
}

export function addAccountInVault(
  vault: VaultPayload,
  account: Account
): VaultPayload {
  return {
    ...vault,
    accounts: [...vault.accounts, account],
  };
}

export function updateAccountInVault(
  vault: VaultPayload,
  account: Account
): VaultPayload {
  return {
    ...vault,
    accounts: vault.accounts.map((a) => (a.id === account.id ? account : a)),
  };
}

export function deleteAccountInVault(
  vault: VaultPayload,
  accId: string
): VaultPayload | null {
  if (vault.accounts.length <= 1) return null;
  const remaining = vault.accounts.filter((a) => a.id !== accId);
  if (remaining.length === 0) return null;

  const deletedCurrency = accountCurrency(
    vault.accounts.find((a) => a.id === accId) ?? {}
  );
  const fallbackAccId = (
    remaining.find((a) => accountCurrency(a) === deletedCurrency) ?? remaining[0]
  ).id;

  const nextTransactions = vault.transactions.map((t) =>
    t.accountId === accId ? { ...t, accountId: fallbackAccId } : t
  );

  return {
    ...vault,
    accounts: remaining,
    transactions: nextTransactions,
  };
}

export interface TransferBetweenAccountsInput {
  fromAccId: string;
  toAccId: string;
  amount: number;
  date: string;
  description: string;
}

export function transferBetweenAccountsInVault(
  vault: VaultPayload,
  input: TransferBetweenAccountsInput
): { nextVault: VaultPayload } | { error: string } {
  const fromAccount = vault.accounts.find((a) => a.id === input.fromAccId);
  const toAccount = vault.accounts.find((a) => a.id === input.toAccId);
  if (!fromAccount || !toAccount || fromAccount.id === toAccount.id) {
    return { error: 'Selecione contas de origem e destino válidas e distintas.' };
  }

  const fromCurrency = accountCurrency(fromAccount);
  const toCurrency = accountCurrency(toAccount);
  const convertedAmount = convertAmount(
    input.amount,
    fromCurrency,
    toCurrency,
    vault.settings
  );

  if (convertedAmount === null) {
    return {
      error: `Sem cotação ${fromCurrency}/${toCurrency} cadastrada para converter entre moedas diferentes.`,
    };
  }

  const inAmount = Math.round(convertedAmount * 100) / 100;
  const expCat = getDefaultCategoryId(vault.categories, 'expense');
  const incCat = getDefaultCategoryId(vault.categories, 'income');
  const nowIso = new Date().toISOString();

  const outRateToBrl =
    fromCurrency !== 'BRL'
      ? findExchangeRate(vault.settings, fromCurrency, 'BRL') ?? undefined
      : undefined;
  const inRateToBrl =
    toCurrency !== 'BRL'
      ? findExchangeRate(vault.settings, toCurrency, 'BRL') ?? undefined
      : undefined;

  const outTx: Transaction = {
    id: generateEntityId('tx_trf_out'),
    description: `${input.description} (Para ${toAccount.name})`,
    amount: input.amount,
    currency: fromCurrency,
    exchangeRate: isValidRate(outRateToBrl) ? outRateToBrl : undefined,
    type: 'expense',
    status: 'paid',
    date: input.date,
    paidAt: input.date,
    categoryId: expCat,
    accountId: input.fromAccId,
    notes: 'Transferência interna entre contas',
    createdAt: nowIso,
  };

  const inTx: Transaction = {
    id: generateEntityId('tx_trf_in'),
    description: `${input.description} (De ${fromAccount.name})`,
    amount: inAmount,
    currency: toCurrency,
    exchangeRate: isValidRate(inRateToBrl) ? inRateToBrl : undefined,
    type: 'income',
    status: 'paid',
    date: input.date,
    paidAt: input.date,
    categoryId: incCat,
    accountId: input.toAccId,
    notes: 'Transferência interna entre contas',
    createdAt: nowIso,
  };

  return {
    nextVault: {
      ...vault,
      transactions: [inTx, outTx, ...vault.transactions],
    },
  };
}

export function upsertVaultExchangeRate(
  vault: VaultPayload,
  fromRaw: string,
  toRaw: string,
  newRate: number,
  source: ExchangeRateOrigin = 'manual',
  timestampLabel?: string
): VaultPayload {
  const from = normalizeCurrency(fromRaw);
  const to = normalizeCurrency(toRaw);
  const nextRates = upsertExchangeRate(vault.settings.exchangeRates, from, to, newRate, source);
  const nextSettings: VaultSettings = {
    ...vault.settings,
    exchangeRates: nextRates,
  };

  const stamp = timestampLabel ?? `${formatRateDate()} (${source === 'mcp' ? 'MCP' : 'manual'})`;
  if (from === 'USD' && to === 'BRL') {
    nextSettings.usdToBrlRate = newRate;
    nextSettings.usdRateUpdatedAt = stamp;
  } else if (from === 'BRL' && to === 'USD') {
    nextSettings.usdToBrlRate = Math.round((1 / newRate) * 10000) / 10000;
    nextSettings.usdRateUpdatedAt = stamp;
  }

  return {
    ...vault,
    settings: nextSettings,
  };
}

export function removeVaultExchangeRate(
  vault: VaultPayload,
  fromRaw: string,
  toRaw: string
): VaultPayload {
  const from = normalizeCurrency(fromRaw);
  const to = normalizeCurrency(toRaw);
  const nextRates = removeExchangeRate(vault.settings.exchangeRates, from, to);
  const nextSettings: VaultSettings = {
    ...vault.settings,
    exchangeRates: nextRates,
  };

  if ((from === 'USD' && to === 'BRL') || (from === 'BRL' && to === 'USD')) {
    delete nextSettings.usdToBrlRate;
    delete nextSettings.usdRateUpdatedAt;
  }

  return {
    ...vault,
    settings: nextSettings,
  };
}
