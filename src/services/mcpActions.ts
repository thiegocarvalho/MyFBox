import {
  addAccountInVault,
  removeVaultExchangeRate,
  transferBetweenAccountsInVault,
  upsertVaultExchangeRate,
} from '../domain/vaultUseCases';
import { tDomainMcp } from '../i18n/modules/domainMcp';
import type {
  Account,
  AccountType,
  Category,
  Currency,
  MonthInsight,
  Transaction,
  TransactionStatus,
  TransactionType,
  VaultPayload,
} from '../types/finance';
import { predictCategory } from '../utils/categorizer';
import { getDefaultCategory } from '../utils/categories';
import { buildMonthComparison } from '../utils/comparison';
import { addMonthsToDateStr, getCurrentYearMonth } from '../utils/formatters';
import {
  accountCurrency,
  computeAccountBalance,
  computeNetWorth,
  endOfMonthDate,
  isValidRate,
  summarizeTransactions,
  txCurrency,
} from '../utils/money';
import {
  POPULAR_CURRENCIES,
  POPULAR_CURRENCY_CODES,
  findExchangeRate,
  getVaultExchangeRates,
  isSupportedCurrency,
  normalizeCurrency,
} from './currencyService';

export interface McpActionContext {
  usdToBrlRate?: number;
  today: string;
  newId: (prefix: string) => string;
  nowIso: string;
}

export interface McpActionOutcome {
  result: unknown;
  nextVault?: VaultPayload;
  notice?: string;
}

export class McpActionError extends Error {}

type Args = Record<string, unknown>;

const CATEGORY_COLORS = [
  '#C8FF00',
  '#7DD3FC',
  '#FFB020',
  '#B794FF',
  '#FF4D3D',
  '#F472B6',
  '#34D399',
];

function str(args: Args, key: string, required = false): string | undefined {
  const v = args[key];
  if (v === undefined || v === null || v === '') {
    if (required) throw new McpActionError(tDomainMcp('domainMcp.mcpActions.missingRequiredField', { key }));
    return undefined;
  }
  if (typeof v !== 'string') throw new McpActionError(tDomainMcp('domainMcp.mcpActions.fieldMustBeText', { key }));
  return v.trim();
}

function num(args: Args, key: string, required = false): number | undefined {
  const v = args[key];
  if (v === undefined || v === null) {
    if (required) throw new McpActionError(tDomainMcp('domainMcp.mcpActions.missingRequiredField', { key }));
    return undefined;
  }
  if (typeof v !== 'number' || !Number.isFinite(v)) {
    throw new McpActionError(tDomainMcp('domainMcp.mcpActions.fieldMustBeNumber', { key }));
  }
  return v;
}

function oneOf<T extends string>(args: Args, key: string, options: readonly T[]): T | undefined {
  const v = str(args, key);
  if (v === undefined) return undefined;
  if (!options.includes(v as T)) {
    throw new McpActionError(
      tDomainMcp('domainMcp.mcpActions.fieldMustBeOneOf', { key, options: options.join(', ') })
    );
  }
  return v as T;
}

function isoDate(args: Args, key: string): string | undefined {
  const v = str(args, key);
  if (v === undefined) return undefined;
  if (!/^\d{4}-\d{2}-\d{2}$/.test(v)) {
    throw new McpActionError(tDomainMcp('domainMcp.mcpActions.invalidIsoDate', { key }));
  }
  return v;
}

function yearMonth(args: Args, key: string): string | undefined {
  const v = str(args, key);
  if (v === undefined) return undefined;
  if (!/^\d{4}-\d{2}$/.test(v)) {
    throw new McpActionError(tDomainMcp('domainMcp.mcpActions.invalidYearMonth', { key }));
  }
  return v;
}

const round2 = (n: number) => Math.round(n * 100) / 100;

function describeAccount(acc: Account, vault: VaultPayload, month: string) {
  const bal = computeAccountBalance(
    acc,
    vault.transactions,
    vault.settings,
    endOfMonthDate(month)
  );
  return {
    id: acc.id,
    name: acc.name,
    type: acc.type,
    currency: bal.currency,
    institution: acc.institution,
    balance: round2(bal.currentBalance),
    projectedBalanceEndOfMonth: round2(bal.projectedBalance),
  };
}

function describeCategory(c: Category) {
  return {
    id: c.id,
    name: c.name,
    type: c.type,
    monthlyBudget: c.monthlyBudget ?? null,
    budgetCurrency: c.monthlyBudget ? (c.budgetCurrency ?? 'BRL') : null,
  };
}

function describeTransaction(tx: Transaction, vault: VaultPayload) {
  return {
    id: tx.id,
    date: tx.date,
    paidAt: tx.paidAt,
    description: tx.description,
    type: tx.type,
    status: tx.status,
    amount: tx.amount,
    currency: tx.currency || 'BRL',
    exchangeRate: tx.exchangeRate,
    category: vault.categories.find((c) => c.id === tx.categoryId)?.name ?? null,
    categoryId: tx.categoryId,
    account: vault.accounts.find((a) => a.id === tx.accountId)?.name ?? null,
    accountId: tx.accountId,
    notes: tx.notes,
    installment:
      tx.installmentTotal && tx.installmentIndex
        ? `${tx.installmentIndex}/${tx.installmentTotal}`
        : undefined,
  };
}

function findAccount(vault: VaultPayload, accountId?: string, accountName?: string): Account {
  if (accountId) {
    const acc = vault.accounts.find((a) => a.id === accountId);
    if (!acc) throw new McpActionError(tDomainMcp('domainMcp.mcpActions.accountNotFound', { id: accountId }));
    return acc;
  }
  if (accountName) {
    const acc = vault.accounts.find((a) => a.name.toLowerCase() === accountName.toLowerCase());
    if (!acc) {
      throw new McpActionError(
        tDomainMcp('domainMcp.mcpActions.accountNameNotFound', {
          name: accountName,
          accounts: vault.accounts.map((a) => a.name).join(', '),
        })
      );
    }
    return acc;
  }
  const first = vault.accounts[0];
  if (!first) throw new McpActionError(tDomainMcp('domainMcp.mcpActions.noAccountsInVault'));
  return first;
}

function resolveCategory(
  vault: VaultPayload,
  type: TransactionType,
  description: string,
  categoryId?: string,
  categoryName?: string
): Category {
  const sameType = vault.categories.filter((c) => c.type === type);
  if (categoryId) {
    const cat = sameType.find((c) => c.id === categoryId);
    if (!cat) throw new McpActionError(tDomainMcp('domainMcp.mcpActions.categoryNotFound', { type, id: categoryId }));
    return cat;
  }
  if (categoryName) {
    const cat = sameType.find((c) => c.name.toLowerCase() === categoryName.toLowerCase());
    if (cat) return cat;
    throw new McpActionError(
      tDomainMcp('domainMcp.mcpActions.categoryNameNotFound', {
        name: categoryName,
        type,
        categories: sameType.map((c) => c.name).join(', ') || tDomainMcp('domainMcp.mcpActions.none'),
      })
    );
  }
  const prediction = predictCategory(description, type, vault.categories, vault.transactions);
  if (prediction) {
    const cat = sameType.find((c) => c.id === prediction.categoryId);
    if (cat) return cat;
  }
  return getDefaultCategory(vault.categories, type);
}

function getOverview(vault: VaultPayload, args: Args, ctx: McpActionContext): McpActionOutcome {
  const month = yearMonth(args, 'month') ?? getCurrentYearMonth();
  const monthTxs = vault.transactions.filter((t) => t.date.startsWith(month));
  const summary = summarizeTransactions(monthTxs, vault.settings);
  const netWorth = computeNetWorth(
    vault.accounts,
    vault.transactions,
    vault.settings,
    endOfMonthDate(month)
  );
  const r = (d: { brl: number; usd: number | null }) => ({
    brl: round2(d.brl),
    usd: d.usd === null ? null : round2(d.usd),
  });
  return {
    result: {
      month,
      usdToBrlRate: ctx.usdToBrlRate ?? vault.settings.usdToBrlRate ?? null,
      exchangeRatesCount: (vault.settings.exchangeRates ?? []).length,
      exchangeRates: getVaultExchangeRates(vault.settings).map(
        (rate) => `${rate.from}/${rate.to}: ${rate.rate}`
      ),
      confirmedBalance: r(netWorth.current),
      projectedBalanceEndOfMonth: r(netWorth.projected),
      month_paid: {
        income: r(summary.incomePaid),
        expense: r(summary.expensePaid),
        net: r(summary.netPaid),
      },
      month_pending: {
        income: r(summary.incomePending),
        expense: r(summary.expensePending),
      },
      month_projected_net: r(summary.netProjected),
      accounts: vault.accounts.map((a) => describeAccount(a, vault, month)),
    },
  };
}

function listTransactions(vault: VaultPayload, args: Args): McpActionOutcome {
  const month = yearMonth(args, 'month');
  const type = oneOf(args, 'type', ['income', 'expense'] as const);
  const status = oneOf(args, 'status', ['paid', 'pending'] as const);
  const categoryId = str(args, 'categoryId');
  const accountId = str(args, 'accountId');
  const search = str(args, 'search')?.toLowerCase();
  const limit = Math.max(1, Math.min(500, num(args, 'limit') ?? 50));

  const filtered = vault.transactions
    .filter(
      (t) =>
        (!month || t.date.startsWith(month)) &&
        (!type || t.type === type) &&
        (!status || t.status === status) &&
        (!categoryId || t.categoryId === categoryId) &&
        (!accountId || t.accountId === accountId) &&
        (!search ||
          t.description.toLowerCase().includes(search) ||
          (t.notes ?? '').toLowerCase().includes(search))
    )
    .sort((a, b) => b.date.localeCompare(a.date));

  return {
    result: {
      total: filtered.length,
      returned: Math.min(limit, filtered.length),
      transactions: filtered.slice(0, limit).map((t) => describeTransaction(t, vault)),
    },
  };
}

const ACCOUNT_TYPES: readonly AccountType[] = [
  'checking',
  'savings',
  'reserve',
  'investment',
  'credit',
  'wallet',
];

function createAccount(
  vault: VaultPayload,
  args: Args,
  ctx: McpActionContext
): McpActionOutcome {
  const name = str(args, 'name', true)!;
  const existing = vault.accounts.find((a) => a.name.toLowerCase() === name.toLowerCase());
  const month = getCurrentYearMonth();
  if (existing) {
    return {
      result: {
        created: false,
        reason: 'já existe',
        account: describeAccount(existing, vault, month),
      },
    };
  }

  const type: AccountType = oneOf(args, 'type', ACCOUNT_TYPES) ?? 'checking';
  const rawCurrency = str(args, 'currency');
  const currency: Currency = rawCurrency
    ? oneOf({ currency: normalizeCurrency(rawCurrency) }, 'currency', POPULAR_CURRENCY_CODES)!
    : 'BRL';
  const initialBalance = round2(num(args, 'initialBalance') ?? 0);
  const institution = str(args, 'institution');
  const color =
    str(args, 'color') ?? CATEGORY_COLORS[vault.accounts.length % CATEGORY_COLORS.length];

  const account: Account = {
    id: ctx.newId('acc'),
    name,
    type,
    currency,
    initialBalance,
    color,
    institution,
  };
  const nextVault = addAccountInVault(vault, account);
  return {
    result: {
      created: true,
      account: describeAccount(account, nextVault, month),
    },
    nextVault,
    notice: tDomainMcp('domainMcp.mcpActions.noticeCreatedAccount', { name, currency }),
  };
}

function transferBetweenAccounts(
  vault: VaultPayload,
  args: Args,
  ctx: McpActionContext
): McpActionOutcome {
  const fromId = str(args, 'fromAccountId');
  const fromName = str(args, 'fromAccountName');
  const toId = str(args, 'toAccountId');
  const toName = str(args, 'toAccountName');

  if (!fromId && !fromName) {
    throw new McpActionError(tDomainMcp('domainMcp.mcpActions.missingFromAccount'));
  }
  if (!toId && !toName) {
    throw new McpActionError(tDomainMcp('domainMcp.mcpActions.missingToAccount'));
  }

  const fromAcc = findAccount(vault, fromId, fromName);
  const toAcc = findAccount(vault, toId, toName);
  const amount = num(args, 'amount', true)!;
  if (amount <= 0) {
    throw new McpActionError(tDomainMcp('domainMcp.mcpActions.amountPositive'));
  }

  const date = isoDate(args, 'date') ?? ctx.today;
  const description = str(args, 'description') ?? 'Transferência entre contas';

  const outcome = transferBetweenAccountsInVault(vault, {
    fromAccId: fromAcc.id,
    toAccId: toAcc.id,
    amount: round2(amount),
    date,
    description,
  });

  if ('error' in outcome) {
    throw new McpActionError(outcome.error);
  }

  const [inTx, outTx] = outcome.nextVault.transactions;
  return {
    result: {
      transferred: true,
      fromAccount: fromAcc.name,
      toAccount: toAcc.name,
      outgoingTransaction: describeTransaction(outTx, outcome.nextVault),
      incomingTransaction: describeTransaction(inTx, outcome.nextVault),
    },
    nextVault: outcome.nextVault,
    notice: tDomainMcp('domainMcp.mcpActions.noticeTransferred', {
      from: fromAcc.name,
      to: toAcc.name,
    }),
  };
}

function createCategory(vault: VaultPayload, args: Args, ctx: McpActionContext): McpActionOutcome {
  const name = str(args, 'name', true)!;
  const type = oneOf(args, 'type', ['income', 'expense'] as const);
  if (!type) throw new McpActionError(tDomainMcp('domainMcp.mcpActions.missingType'));
  const budget = num(args, 'monthlyBudget');
  if (budget !== undefined && budget < 0) {
    throw new McpActionError(tDomainMcp('domainMcp.mcpActions.budgetNonNegative'));
  }

  const existing = vault.categories.find(
    (c) => c.type === type && c.name.toLowerCase() === name.toLowerCase()
  );
  if (existing) {
    return {
      result: { created: false, reason: 'já existe', category: describeCategory(existing) },
    };
  }

  const rawBudgetCurrency = str(args, 'budgetCurrency') ?? str(args, 'currency');
  const budgetCurrency: Currency | undefined =
    rawBudgetCurrency && type === 'expense' && budget
      ? normalizeCurrency(rawBudgetCurrency) || 'BRL'
      : undefined;

  const category: Category = {
    id: ctx.newId('cat'),
    name,
    type,
    color: str(args, 'color') ?? CATEGORY_COLORS[vault.categories.length % CATEGORY_COLORS.length],
    icon: 'Tag',
    monthlyBudget: type === 'expense' && budget ? budget : undefined,
    budgetCurrency:
      budgetCurrency && budgetCurrency !== 'BRL' ? budgetCurrency : undefined,
  };
  return {
    result: { created: true, category: describeCategory(category) },
    nextVault: { ...vault, categories: [...vault.categories, category] },
    notice: tDomainMcp('domainMcp.mcpActions.noticeCreatedCategory', { name }),
  };
}

function setCategoryBudget(vault: VaultPayload, args: Args): McpActionOutcome {
  const categoryId = str(args, 'categoryId', true)!;
  const raw = args.monthlyBudget;
  if (raw !== null && (typeof raw !== 'number' || !Number.isFinite(raw) || raw < 0)) {
    throw new McpActionError(tDomainMcp('domainMcp.mcpActions.budgetInvalidValue'));
  }
  const cat = vault.categories.find((c) => c.id === categoryId);
  if (!cat) throw new McpActionError(tDomainMcp('domainMcp.mcpActions.categoryNotFoundById', { id: categoryId }));
  if (cat.type !== 'expense') {
    throw new McpActionError(tDomainMcp('domainMcp.mcpActions.budgetExpenseOnly'));
  }
  const budget = raw === null || raw === 0 ? undefined : (raw as number);
  const rawBudgetCurrency = str(args, 'budgetCurrency') ?? str(args, 'currency');
  const nextCurr = budget
    ? normalizeCurrency(rawBudgetCurrency ?? cat.budgetCurrency ?? 'BRL') || 'BRL'
    : undefined;
  const updated: Category = {
    ...cat,
    monthlyBudget: budget,
    budgetCurrency: nextCurr && nextCurr !== 'BRL' ? nextCurr : undefined,
  };
  return {
    result: { category: describeCategory(updated) },
    nextVault: {
      ...vault,
      categories: vault.categories.map((c) => (c.id === cat.id ? updated : c)),
    },
    notice: budget
      ? tDomainMcp('domainMcp.mcpActions.noticeSetBudget', { name: cat.name })
      : tDomainMcp('domainMcp.mcpActions.noticeRemovedBudget', { name: cat.name }),
  };
}

function createTransaction(
  vault: VaultPayload,
  args: Args,
  ctx: McpActionContext
): McpActionOutcome {
  const description = str(args, 'description', true)!;
  const amount = num(args, 'amount', true)!;
  if (amount <= 0) {
    throw new McpActionError(tDomainMcp('domainMcp.mcpActions.amountPositiveWithType'));
  }
  const type = oneOf(args, 'type', ['income', 'expense'] as const);
  if (!type) throw new McpActionError(tDomainMcp('domainMcp.mcpActions.missingType'));

  const date = isoDate(args, 'date') ?? ctx.today;
  const account = findAccount(vault, str(args, 'accountId'), str(args, 'accountName'));
  const category = resolveCategory(
    vault,
    type,
    description,
    str(args, 'categoryId'),
    str(args, 'categoryName')
  );
  const rawCurrency = str(args, 'currency');
  const currency: Currency = rawCurrency
    ? oneOf({ currency: normalizeCurrency(rawCurrency) }, 'currency', POPULAR_CURRENCY_CODES)!
    : accountCurrency(account);
  const status: TransactionStatus =
    oneOf(args, 'status', ['paid', 'pending'] as const) ??
    (date > ctx.today ? 'pending' : 'paid');
  const repeatMonths = Math.max(1, Math.min(36, Math.floor(num(args, 'repeatMonths') ?? 1)));
  const explicitRate = num(args, 'exchangeRate');
  if (explicitRate !== undefined && !isValidRate(explicitRate)) {
    throw new McpActionError(tDomainMcp('domainMcp.mcpActions.ratePositive'));
  }
  const notes = str(args, 'notes');

  const accCurr = accountCurrency(account);
  const foreignCurr = currency !== 'BRL' ? currency : accCurr !== 'BRL' ? accCurr : null;
  const liveRateToBrl = foreignCurr
    ? findExchangeRate(vault.settings, foreignCurr, 'BRL') ?? undefined
    : undefined;

  const rateFor = (itemStatus: TransactionStatus) =>
    foreignCurr !== null
      ? explicitRate ?? (itemStatus === 'paid' && isValidRate(liveRateToBrl) ? liveRateToBrl : undefined)
      : undefined;

  const groupId = repeatMonths > 1 ? ctx.newId('rec') : undefined;
  const created: Transaction[] = [];
  for (let i = 0; i < repeatMonths; i++) {
    const itemStatus: TransactionStatus = i === 0 ? status : 'pending';
    created.push({
      id: ctx.newId('tx'),
      description: repeatMonths > 1 ? `${description} (${i + 1}/${repeatMonths})` : description,
      amount: round2(amount),
      currency,
      exchangeRate: i === 0 ? rateFor(itemStatus) : undefined,
      type,
      status: itemStatus,
      date: i === 0 ? date : addMonthsToDateStr(date, i),
      paidAt: itemStatus === 'paid' ? (date <= ctx.today ? date : ctx.today) : undefined,
      categoryId: category.id,
      accountId: account.id,
      notes,
      recurrenceGroupId: groupId,
      installmentIndex: repeatMonths > 1 ? i + 1 : undefined,
      installmentTotal: repeatMonths > 1 ? repeatMonths : undefined,
      createdAt: ctx.nowIso,
    });
  }
  const nextVault = { ...vault, transactions: [...created, ...vault.transactions] };
  return {
    result: {
      created: created.length,
      transactions: created.map((t) => describeTransaction(t, nextVault)),
    },
    nextVault,
    notice:
      created.length > 1
        ? tDomainMcp('domainMcp.mcpActions.noticeCreatedTxMany', {
            count: created.length,
            desc: description,
          })
        : tDomainMcp('domainMcp.mcpActions.noticeCreatedTxOne', { desc: description }),
  };
}

function updateTransaction(
  vault: VaultPayload,
  args: Args,
  ctx: McpActionContext
): McpActionOutcome {
  const id = str(args, 'id', true)!;
  const tx = vault.transactions.find((t) => t.id === id);
  if (!tx) throw new McpActionError(tDomainMcp('domainMcp.mcpActions.txNotFound', { id }));

  const next: Transaction = { ...tx };
  const description = str(args, 'description');
  if (description) next.description = description;
  const amount = num(args, 'amount');
  if (amount !== undefined) {
    if (amount <= 0) throw new McpActionError(tDomainMcp('domainMcp.mcpActions.amountPositive'));
    next.amount = round2(amount);
  }
  const type = oneOf(args, 'type', ['income', 'expense'] as const);
  if (type) next.type = type;
  const status = oneOf(args, 'status', ['paid', 'pending'] as const);
  if (status) next.status = status;
  const date = isoDate(args, 'date');
  if (date) next.date = date;

  const paidAt = isoDate(args, 'paidAt');
  if (paidAt && paidAt > ctx.today) throw new McpActionError(tDomainMcp('domainMcp.mcpActions.paidAtFuture'));
  if (next.status === 'paid') {
    next.paidAt = paidAt ?? (status === 'paid' && tx.status !== 'paid' ? ctx.today : next.paidAt);
  } else {
    next.paidAt = undefined;
  }

  const rawCurrency = str(args, 'currency');
  if (rawCurrency) {
    next.currency = oneOf(
      { currency: normalizeCurrency(rawCurrency) },
      'currency',
      POPULAR_CURRENCY_CODES
    );
  }
  const explicitRate = num(args, 'exchangeRate');
  if (explicitRate !== undefined) {
    if (!isValidRate(explicitRate)) {
      throw new McpActionError(tDomainMcp('domainMcp.mcpActions.ratePositive'));
    }
    next.exchangeRate = explicitRate;
  }

  if ('notes' in args) next.notes = str(args, 'notes');
  const accountId = str(args, 'accountId');
  const accountName = str(args, 'accountName');
  if (accountId || accountName) {
    next.accountId = findAccount(vault, accountId, accountName).id;
  }

  if (next.status === 'paid' && !isValidRate(next.exchangeRate)) {
    const account = vault.accounts.find((a) => a.id === next.accountId);
    const curr = txCurrency(next);
    const accCurr = accountCurrency(account ?? {});
    const foreignCurr = curr !== 'BRL' ? curr : accCurr !== 'BRL' ? accCurr : null;
    if (foreignCurr !== null) {
      const liveRateToBrl = findExchangeRate(vault.settings, foreignCurr, 'BRL');
      if (isValidRate(liveRateToBrl)) {
        next.exchangeRate = liveRateToBrl;
      }
    }
  }

  const categoryId = str(args, 'categoryId');
  const categoryName = str(args, 'categoryName');
  if (categoryId || categoryName || type) {
    const keepCurrent =
      !categoryId &&
      !categoryName &&
      vault.categories.some((c) => c.id === next.categoryId && c.type === next.type);
    if (!keepCurrent) {
      next.categoryId = resolveCategory(
        vault,
        next.type,
        next.description,
        categoryId,
        categoryName
      ).id;
    }
  }

  return {
    result: { transaction: describeTransaction(next, vault) },
    nextVault: {
      ...vault,
      transactions: vault.transactions.map((t) => (t.id === id ? next : t)),
    },
    notice: tDomainMcp('domainMcp.mcpActions.noticeUpdatedTx', { desc: next.description }),
  };
}

function deleteTransaction(vault: VaultPayload, args: Args): McpActionOutcome {
  const id = str(args, 'id', true)!;
  const tx = vault.transactions.find((t) => t.id === id);
  if (!tx) throw new McpActionError(tDomainMcp('domainMcp.mcpActions.txNotFound', { id }));
  return {
    result: { deleted: describeTransaction(tx, vault) },
    nextVault: { ...vault, transactions: vault.transactions.filter((t) => t.id !== id) },
    notice: tDomainMcp('domainMcp.mcpActions.noticeDeletedTx', { desc: tx.description }),
  };
}

function monthComparison(vault: VaultPayload, args: Args): McpActionOutcome {
  const month = yearMonth(args, 'month') ?? getCurrentYearMonth();
  const count = Math.max(1, Math.min(24, Math.floor(num(args, 'months') ?? 6)));
  const rows = buildMonthComparison(
    vault.transactions,
    vault.categories,
    month,
    count,
    vault.settings
  );
  const insights = vault.insights ?? [];
  return {
    result: {
      note: 'Valores em BRL. Totais do mês contam pagos + pendentes (competência). Moedas estrangeiras convertidas pela cotação fixada no lançamento ou pela atual.',
      months: rows.map((r) => {
        const insight = insights.find((i) => i.month === r.month);
        return {
          ...r,
          insight: insight
            ? {
                title: insight.title,
                updatedAt: insight.updatedAt,
                outdated: insight.dataSignature !== r.signature,
              }
            : null,
        };
      }),
    },
  };
}

function listInsights(vault: VaultPayload, args: Args): McpActionOutcome {
  const month = yearMonth(args, 'month');
  const insights = (vault.insights ?? [])
    .filter((i) => !month || i.month === month)
    .sort((a, b) => b.month.localeCompare(a.month));
  return { result: { insights } };
}

function saveInsight(vault: VaultPayload, args: Args, ctx: McpActionContext): McpActionOutcome {
  const month = yearMonth(args, 'month');
  if (!month) throw new McpActionError(tDomainMcp('domainMcp.mcpActions.missingMonth'));
  const title = str(args, 'title', true)!;
  const body = str(args, 'body', true)!;
  if (title.length > 120) throw new McpActionError(tDomainMcp('domainMcp.mcpActions.titleMaxLength'));
  if (body.length > 4000) throw new McpActionError(tDomainMcp('domainMcp.mcpActions.bodyMaxLength'));
  const rawHighlights = args.highlights;
  if (rawHighlights !== undefined && !Array.isArray(rawHighlights)) {
    throw new McpActionError(tDomainMcp('domainMcp.mcpActions.highlightsMustBeTextList'));
  }
  const highlights = (rawHighlights as unknown[] | undefined)
    ?.filter((h): h is string => typeof h === 'string' && h.trim() !== '')
    .map((h) => h.trim())
    .slice(0, 6);

  const [row] = buildMonthComparison(
    vault.transactions,
    vault.categories,
    month,
    1,
    vault.settings
  );
  const existing = (vault.insights ?? []).find((i) => i.month === month);
  const insight: MonthInsight = {
    month,
    title,
    body,
    highlights: highlights?.length ? highlights : undefined,
    author: 'agent',
    createdAt: existing?.createdAt ?? ctx.nowIso,
    updatedAt: ctx.nowIso,
    dataSignature: row.signature,
  };
  const others = (vault.insights ?? []).filter((i) => i.month !== month);
  return {
    result: { saved: existing ? 'updated' : 'created', insight },
    nextVault: { ...vault, insights: [...others, insight] },
    notice: existing
      ? tDomainMcp('domainMcp.mcpActions.noticeUpdatedInsight', { month })
      : tDomainMcp('domainMcp.mcpActions.noticeCreatedInsight', { month }),
  };
}

function deleteInsight(vault: VaultPayload, args: Args): McpActionOutcome {
  const month = yearMonth(args, 'month');
  if (!month) throw new McpActionError(tDomainMcp('domainMcp.mcpActions.missingMonth'));
  const existing = (vault.insights ?? []).find((i) => i.month === month);
  if (!existing) throw new McpActionError(tDomainMcp('domainMcp.mcpActions.insightNotFound', { month }));
  return {
    result: { deleted: month },
    nextVault: { ...vault, insights: (vault.insights ?? []).filter((i) => i.month !== month) },
    notice: tDomainMcp('domainMcp.mcpActions.noticeDeletedInsight', { month }),
  };
}

function listExchangeRates(vault: VaultPayload): McpActionOutcome {
  const rates = getVaultExchangeRates(vault.settings);
  return {
    result: {
      rates,
      count: rates.length,
      offline: true,
      supportedCurrencies: POPULAR_CURRENCIES.map((c) => ({
        code: c.code,
        name: c.name,
        symbol: c.symbol,
        flag: c.flag,
      })),
      note: tDomainMcp('domainMcp.mcpActions.offlineRatesNote'),
    },
  };
}

function setExchangeRate(
  vault: VaultPayload,
  args: Args,
  ctx: McpActionContext
): McpActionOutcome {
  const from = str(args, 'from', true);
  const to = str(args, 'to', true);
  const rate = num(args, 'rate', true);

  if (!from || !to) throw new McpActionError(tDomainMcp('domainMcp.mcpActions.fromToRequired'));
  if (!rate || rate <= 0) {
    throw new McpActionError(tDomainMcp('domainMcp.mcpActions.ratePositiveNumber'));
  }

  const normFrom = normalizeCurrency(from);
  const normTo = normalizeCurrency(to);
  if (!isSupportedCurrency(normFrom)) {
    throw new McpActionError(
      tDomainMcp('domainMcp.mcpActions.unsupportedFromCurrency', {
        from: normFrom,
        supported: POPULAR_CURRENCY_CODES.join(', '),
      })
    );
  }
  if (!isSupportedCurrency(normTo)) {
    throw new McpActionError(
      tDomainMcp('domainMcp.mcpActions.unsupportedToCurrency', {
        to: normTo,
        supported: POPULAR_CURRENCY_CODES.join(', '),
      })
    );
  }
  if (normFrom === normTo) {
    throw new McpActionError(tDomainMcp('domainMcp.mcpActions.sameCurrencyError'));
  }

  const nextVault: VaultPayload = {
    ...upsertVaultExchangeRate(vault, normFrom, normTo, rate, 'mcp', `${ctx.today} (MCP)`),
    updatedAt: ctx.nowIso,
  };

  const updatedEntry = nextVault.settings.exchangeRates?.find(
    (r) => r.from === normFrom && r.to === normTo
  );

  return {
    result: {
      saved: true,
      from: normFrom,
      to: normTo,
      pair: `${normFrom}/${normTo}`,
      rate,
      updatedAt: updatedEntry?.updatedAt,
    },
    nextVault,
    notice: tDomainMcp('domainMcp.mcpActions.noticeSetRate', {
      from: normFrom,
      to: normTo,
      rate,
    }),
  };
}

function deleteExchangeRate(
  vault: VaultPayload,
  args: Args,
  ctx: McpActionContext
): McpActionOutcome {
  const from = str(args, 'from', true);
  const to = str(args, 'to', true);
  if (!from || !to) throw new McpActionError(tDomainMcp('domainMcp.mcpActions.fromToRequired'));

  const normFrom = normalizeCurrency(from);
  const normTo = normalizeCurrency(to);
  const nextVault: VaultPayload = {
    ...removeVaultExchangeRate(vault, normFrom, normTo),
    updatedAt: ctx.nowIso,
  };

  return {
    result: { deleted: true, pair: `${normFrom}/${normTo}` },
    nextVault,
    notice: tDomainMcp('domainMcp.mcpActions.noticeDeletedRate', {
      from: normFrom,
      to: normTo,
    }),
  };
}

export const MCP_ACTIONS = {
  get_overview: getOverview,
  list_accounts: (vault: VaultPayload): McpActionOutcome => ({
    result: {
      month: getCurrentYearMonth(),
      accounts: vault.accounts.map((a) => describeAccount(a, vault, getCurrentYearMonth())),
    },
  }),
  create_account: createAccount,
  transfer_between_accounts: transferBetweenAccounts,
  list_categories: (vault: VaultPayload, args: Args): McpActionOutcome => {
    const type = oneOf(args, 'type', ['income', 'expense'] as const);
    return {
      result: {
        categories: vault.categories
          .filter((c) => !type || c.type === type)
          .map(describeCategory),
      },
    };
  },
  list_transactions: listTransactions,
  create_category: createCategory,
  set_category_budget: setCategoryBudget,
  create_transaction: createTransaction,
  update_transaction: updateTransaction,
  delete_transaction: deleteTransaction,
  get_month_comparison: monthComparison,
  list_insights: listInsights,
  save_insight: saveInsight,
  delete_insight: deleteInsight,
  list_exchange_rates: listExchangeRates,
  set_exchange_rate: setExchangeRate,
  delete_exchange_rate: deleteExchangeRate,
} as const;

export type McpActionName = keyof typeof MCP_ACTIONS;

function getForbiddenActionMessage(name: string): string {
  switch (name) {
    case 'create_vault':
    case 'init_vault':
      return tDomainMcp('domainMcp.mcpActions.forbiddenCreateVault');
    case 'delete_vault':
    case 'destroy_vault':
    case 'reset_vault':
    case 'wipe_vault':
      return tDomainMcp('domainMcp.mcpActions.forbiddenDeleteVault');
    case 'export_csv':
      return tDomainMcp('domainMcp.mcpActions.forbiddenExportCsv');
    case 'export_unencrypted':
    case 'export_plaintext':
      return tDomainMcp('domainMcp.mcpActions.forbiddenExportUnencrypted');
    case 'change_password':
      return tDomainMcp('domainMcp.mcpActions.forbiddenChangePassword');
    case 'restore_backup':
      return tDomainMcp('domainMcp.mcpActions.forbiddenRestoreBackup');
    default:
      return tDomainMcp('domainMcp.mcpActions.unknownAction', { name });
  }
}

export function runMcpAction(
  name: string,
  vault: VaultPayload,
  args: Args,
  ctx: McpActionContext
): McpActionOutcome {
  const forbidden = [
    'create_vault',
    'init_vault',
    'delete_vault',
    'destroy_vault',
    'reset_vault',
    'wipe_vault',
    'export_csv',
    'export_unencrypted',
    'export_plaintext',
    'change_password',
    'restore_backup',
  ];
  if (forbidden.includes(name)) {
    throw new McpActionError(getForbiddenActionMessage(name));
  }
  const action = (
    MCP_ACTIONS as Record<
      string,
      (v: VaultPayload, a: Args, c: McpActionContext) => McpActionOutcome
    >
  )[name];
  if (!action) throw new McpActionError(tDomainMcp('domainMcp.mcpActions.unknownAction', { name }));
  return action(vault, args ?? {}, ctx);
}
