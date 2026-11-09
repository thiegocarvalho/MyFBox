/**
 * Ações do Modo MCP local.
 *
 * Funções puras: recebem o cofre descriptografado (em memória, dentro do app) e os
 * argumentos vindos do servidor MCP, e devolvem o resultado + o próximo estado do
 * cofre quando há escrita. Quem grava (recifrando no IndexedDB) é o App, pelo mesmo
 * caminho da interface (`persistVaultUpdate`).
 */
import type {
  Account,
  Category,
  Currency,
  MonthInsight,
  Transaction,
  TransactionStatus,
  TransactionType,
  VaultPayload,
} from '../types/finance';
import {
  POPULAR_CURRENCIES,
  POPULAR_CURRENCY_CODES,
  getVaultExchangeRates,
  isSupportedCurrency,
  normalizeCurrency,
  removeExchangeRate,
  upsertExchangeRate,
} from './currencyService';
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
} from '../utils/money';

export interface McpActionContext {
  usdToBrlRate?: number;
  today: string; // YYYY-MM-DD (data local)
  newId: (prefix: string) => string;
  nowIso: string;
}

export interface McpActionOutcome {
  result: unknown;
  nextVault?: VaultPayload;
  /** Mensagem curta exibida no app para dar visibilidade à ação feita pelo MCP */
  notice?: string;
}

export class McpActionError extends Error {}

type Args = Record<string, unknown>;

const CATEGORY_COLORS = ['#C8FF00', '#7DD3FC', '#FFB020', '#B794FF', '#FF4D3D', '#F472B6', '#34D399'];

// ---------- validação leve (o servidor já valida com zod; aqui é a última barreira) ----------
function str(args: Args, key: string, required = false): string | undefined {
  const v = args[key];
  if (v === undefined || v === null || v === '') {
    if (required) throw new McpActionError(`Campo obrigatório ausente: ${key}`);
    return undefined;
  }
  if (typeof v !== 'string') throw new McpActionError(`Campo ${key} deve ser texto`);
  return v.trim();
}

function num(args: Args, key: string, required = false): number | undefined {
  const v = args[key];
  if (v === undefined || v === null) {
    if (required) throw new McpActionError(`Campo obrigatório ausente: ${key}`);
    return undefined;
  }
  if (typeof v !== 'number' || !Number.isFinite(v)) {
    throw new McpActionError(`Campo ${key} deve ser número`);
  }
  return v;
}

function oneOf<T extends string>(args: Args, key: string, options: readonly T[]): T | undefined {
  const v = str(args, key);
  if (v === undefined) return undefined;
  if (!options.includes(v as T)) {
    throw new McpActionError(`Campo ${key} deve ser um de: ${options.join(', ')}`);
  }
  return v as T;
}

function isoDate(args: Args, key: string): string | undefined {
  const v = str(args, key);
  if (v === undefined) return undefined;
  if (!/^\d{4}-\d{2}-\d{2}$/.test(v)) throw new McpActionError(`${key} deve estar no formato AAAA-MM-DD`);
  return v;
}

function yearMonth(args: Args, key: string): string | undefined {
  const v = str(args, key);
  if (v === undefined) return undefined;
  if (!/^\d{4}-\d{2}$/.test(v)) throw new McpActionError(`${key} deve estar no formato AAAA-MM`);
  return v;
}

const round2 = (n: number) => Math.round(n * 100) / 100;

// ---------- representações compactas devolvidas ao MCP ----------
// Previsão até o fim do mês informado (mesma regra da interface), não todos os pendentes futuros
function describeAccount(acc: Account, vault: VaultPayload, rate: number | undefined, month: string) {
  const bal = computeAccountBalance(acc, vault.transactions, rate, endOfMonthDate(month));
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
  return { id: c.id, name: c.name, type: c.type, monthlyBudget: c.monthlyBudget ?? null };
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

// ---------- resolução de referências ----------
function findAccount(vault: VaultPayload, accountId?: string, accountName?: string): Account {
  if (accountId) {
    const acc = vault.accounts.find((a) => a.id === accountId);
    if (!acc) throw new McpActionError(`Conta não encontrada: ${accountId}`);
    return acc;
  }
  if (accountName) {
    const acc = vault.accounts.find((a) => a.name.toLowerCase() === accountName.toLowerCase());
    if (!acc) {
      throw new McpActionError(
        `Conta "${accountName}" não encontrada. Contas: ${vault.accounts.map((a) => a.name).join(', ')}`
      );
    }
    return acc;
  }
  const first = vault.accounts[0];
  if (!first) throw new McpActionError('O cofre não tem nenhuma conta.');
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
    if (!cat) throw new McpActionError(`Categoria de ${type} não encontrada: ${categoryId}`);
    return cat;
  }
  if (categoryName) {
    const cat = sameType.find((c) => c.name.toLowerCase() === categoryName.toLowerCase());
    if (cat) return cat;
    throw new McpActionError(
      `Categoria "${categoryName}" (${type}) não existe. Crie com create_category ou use uma destas: ${
        sameType.map((c) => c.name).join(', ') || '(nenhuma)'
      }`
    );
  }
  const prediction = predictCategory(description, type, vault.categories, vault.transactions);
  if (prediction) {
    const cat = sameType.find((c) => c.id === prediction.categoryId);
    if (cat) return cat;
  }
  return getDefaultCategory(vault.categories, type);
}

// ---------- ações ----------
function getOverview(vault: VaultPayload, args: Args, ctx: McpActionContext): McpActionOutcome {
  const month = yearMonth(args, 'month') ?? getCurrentYearMonth();
  const monthTxs = vault.transactions.filter((t) => t.date.startsWith(month));
  const summary = summarizeTransactions(monthTxs, ctx.usdToBrlRate);
  const netWorth = computeNetWorth(
    vault.accounts,
    vault.transactions,
    ctx.usdToBrlRate,
    endOfMonthDate(month)
  );
  const r = (d: { brl: number; usd: number | null }) => ({
    brl: round2(d.brl),
    usd: d.usd === null ? null : round2(d.usd),
  });
  return {
    result: {
      month,
      usdToBrlRate: ctx.usdToBrlRate ?? null,
      exchangeRatesCount: (vault.settings.exchangeRates ?? []).length,
      exchangeRates: getVaultExchangeRates(vault.settings).map((r) => `${r.from}/${r.to}: ${r.rate}`),
      confirmedBalance: r(netWorth.current),
      projectedBalanceEndOfMonth: r(netWorth.projected),
      month_paid: { income: r(summary.incomePaid), expense: r(summary.expensePaid), net: r(summary.netPaid) },
      month_pending: { income: r(summary.incomePending), expense: r(summary.expensePending) },
      month_projected_net: r(summary.netProjected),
      accounts: vault.accounts.map((a) => describeAccount(a, vault, ctx.usdToBrlRate, month)),
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

function createCategory(vault: VaultPayload, args: Args, ctx: McpActionContext): McpActionOutcome {
  const name = str(args, 'name', true)!;
  const type = oneOf(args, 'type', ['income', 'expense'] as const);
  if (!type) throw new McpActionError('Campo obrigatório ausente: type (income ou expense)');
  const budget = num(args, 'monthlyBudget');
  if (budget !== undefined && budget < 0) throw new McpActionError('monthlyBudget não pode ser negativo');

  const existing = vault.categories.find(
    (c) => c.type === type && c.name.toLowerCase() === name.toLowerCase()
  );
  if (existing) {
    return { result: { created: false, reason: 'já existe', category: describeCategory(existing) } };
  }

  const category: Category = {
    id: ctx.newId('cat'),
    name,
    type,
    color: str(args, 'color') ?? CATEGORY_COLORS[vault.categories.length % CATEGORY_COLORS.length],
    icon: 'Tag',
    monthlyBudget: type === 'expense' && budget ? budget : undefined,
  };
  return {
    result: { created: true, category: describeCategory(category) },
    nextVault: { ...vault, categories: [...vault.categories, category] },
    notice: `MCP criou a categoria "${name}"`,
  };
}

function setCategoryBudget(vault: VaultPayload, args: Args): McpActionOutcome {
  const categoryId = str(args, 'categoryId', true)!;
  const raw = args.monthlyBudget;
  if (raw !== null && (typeof raw !== 'number' || !Number.isFinite(raw) || raw < 0)) {
    throw new McpActionError('monthlyBudget deve ser um número >= 0, ou null para remover a meta');
  }
  const cat = vault.categories.find((c) => c.id === categoryId);
  if (!cat) throw new McpActionError(`Categoria não encontrada: ${categoryId}`);
  if (cat.type !== 'expense') throw new McpActionError('Metas só existem para categorias de despesa');
  const budget = raw === null || raw === 0 ? undefined : (raw as number);
  const updated: Category = { ...cat, monthlyBudget: budget };
  return {
    result: { category: describeCategory(updated) },
    nextVault: { ...vault, categories: vault.categories.map((c) => (c.id === cat.id ? updated : c)) },
    notice: budget
      ? `MCP definiu a meta de "${cat.name}"`
      : `MCP removeu a meta de "${cat.name}"`,
  };
}

function createTransaction(vault: VaultPayload, args: Args, ctx: McpActionContext): McpActionOutcome {
  const description = str(args, 'description', true)!;
  const amount = num(args, 'amount', true)!;
  if (amount <= 0) throw new McpActionError('amount deve ser maior que zero (o tipo define o sinal)');
  const type = oneOf(args, 'type', ['income', 'expense'] as const);
  if (!type) throw new McpActionError('Campo obrigatório ausente: type (income ou expense)');

  const date = isoDate(args, 'date') ?? ctx.today;
  const account = findAccount(vault, str(args, 'accountId'), str(args, 'accountName'));
  const category = resolveCategory(
    vault,
    type,
    description,
    str(args, 'categoryId'),
    str(args, 'categoryName')
  );
  const currency: Currency =
    oneOf(args, 'currency', ['BRL', 'USD'] as const) ?? accountCurrency(account);
  const status: TransactionStatus =
    oneOf(args, 'status', ['paid', 'pending'] as const) ?? (date > ctx.today ? 'pending' : 'paid');
  const repeatMonths = Math.max(1, Math.min(36, Math.floor(num(args, 'repeatMonths') ?? 1)));
  const explicitRate = num(args, 'exchangeRate');
  if (explicitRate !== undefined && !isValidRate(explicitRate)) {
    throw new McpActionError('exchangeRate deve ser maior que zero');
  }
  const notes = str(args, 'notes');

  const involvesUsd = currency === 'USD' || accountCurrency(account) === 'USD';
  // Mesma regra da interface: fixa cotação quando informada ou quando já está pago
  const rateFor = (itemStatus: TransactionStatus) =>
    involvesUsd
      ? explicitRate ?? (itemStatus === 'paid' && isValidRate(ctx.usdToBrlRate) ? ctx.usdToBrlRate : undefined)
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
    result: { created: created.length, transactions: created.map((t) => describeTransaction(t, nextVault)) },
    nextVault,
    notice:
      created.length > 1
        ? `MCP registrou ${created.length} lançamentos de "${description}"`
        : `MCP registrou "${description}"`,
  };
}

function updateTransaction(vault: VaultPayload, args: Args, ctx: McpActionContext): McpActionOutcome {
  const id = str(args, 'id', true)!;
  const tx = vault.transactions.find((t) => t.id === id);
  if (!tx) throw new McpActionError(`Lançamento não encontrado: ${id}`);

  const next: Transaction = { ...tx };
  const description = str(args, 'description');
  if (description) next.description = description;
  const amount = num(args, 'amount');
  if (amount !== undefined) {
    if (amount <= 0) throw new McpActionError('amount deve ser maior que zero');
    next.amount = round2(amount);
  }
  const type = oneOf(args, 'type', ['income', 'expense'] as const);
  if (type) next.type = type;
  const status = oneOf(args, 'status', ['paid', 'pending'] as const);
  if (status) next.status = status;
  const date = isoDate(args, 'date');
  if (date) next.date = date;
  // Data do pagamento: informada, ou hoje ao dar baixa; some ao voltar para pendente
  const paidAt = isoDate(args, 'paidAt');
  if (paidAt && paidAt > ctx.today) throw new McpActionError('paidAt não pode ser no futuro');
  if (next.status === 'paid') next.paidAt = paidAt ?? (status === 'paid' && tx.status !== 'paid' ? ctx.today : next.paidAt);
  else next.paidAt = undefined;
  const currency = oneOf(args, 'currency', ['BRL', 'USD'] as const);
  if (currency) next.currency = currency;
  if ('notes' in args) next.notes = str(args, 'notes');
  const accountId = str(args, 'accountId');
  const accountName = str(args, 'accountName');
  if (accountId || accountName) next.accountId = findAccount(vault, accountId, accountName).id;

  const categoryId = str(args, 'categoryId');
  const categoryName = str(args, 'categoryName');
  if (categoryId || categoryName || type) {
    const keepCurrent =
      !categoryId && !categoryName && vault.categories.some((c) => c.id === next.categoryId && c.type === next.type);
    if (!keepCurrent) {
      next.categoryId = resolveCategory(vault, next.type, next.description, categoryId, categoryName).id;
    }
  }

  return {
    result: { transaction: describeTransaction(next, vault) },
    nextVault: { ...vault, transactions: vault.transactions.map((t) => (t.id === id ? next : t)) },
    notice: `MCP atualizou "${next.description}"`,
  };
}

function deleteTransaction(vault: VaultPayload, args: Args): McpActionOutcome {
  const id = str(args, 'id', true)!;
  const tx = vault.transactions.find((t) => t.id === id);
  if (!tx) throw new McpActionError(`Lançamento não encontrado: ${id}`);
  return {
    result: { deleted: describeTransaction(tx, vault) },
    nextVault: { ...vault, transactions: vault.transactions.filter((t) => t.id !== id) },
    notice: `MCP excluiu "${tx.description}"`,
  };
}

// ---------- comparativos e insights ----------
function monthComparison(vault: VaultPayload, args: Args, ctx: McpActionContext): McpActionOutcome {
  const month = yearMonth(args, 'month') ?? getCurrentYearMonth();
  const count = Math.max(1, Math.min(24, Math.floor(num(args, 'months') ?? 6)));
  const rows = buildMonthComparison(vault.transactions, vault.categories, month, count, ctx.usdToBrlRate);
  const insights = vault.insights ?? [];
  return {
    result: {
      note:
        'Valores em BRL. Totais do mês contam pagos + pendentes (competência). USD convertido pela cotação fixada no lançamento ou pela atual.',
      months: rows.map((r) => {
        const insight = insights.find((i) => i.month === r.month);
        return {
          ...r,
          insight: insight
            ? { title: insight.title, updatedAt: insight.updatedAt, outdated: insight.dataSignature !== r.signature }
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
  if (!month) throw new McpActionError('Campo obrigatório ausente: month (AAAA-MM)');
  const title = str(args, 'title', true)!;
  const body = str(args, 'body', true)!;
  if (title.length > 120) throw new McpActionError('title deve ter até 120 caracteres');
  if (body.length > 4000) throw new McpActionError('body deve ter até 4000 caracteres');
  const rawHighlights = args.highlights;
  if (rawHighlights !== undefined && !Array.isArray(rawHighlights)) {
    throw new McpActionError('highlights deve ser uma lista de textos');
  }
  const highlights = (rawHighlights as unknown[] | undefined)
    ?.filter((h): h is string => typeof h === 'string' && h.trim() !== '')
    .map((h) => h.trim())
    .slice(0, 6);

  // Assinatura dos números atuais do mês: se mudarem depois, o insight aparece como desatualizado
  const [row] = buildMonthComparison(vault.transactions, vault.categories, month, 1, ctx.usdToBrlRate);
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
    notice: existing ? `MCP atualizou o insight de ${month}` : `MCP escreveu o insight de ${month}`,
  };
}

function deleteInsight(vault: VaultPayload, args: Args): McpActionOutcome {
  const month = yearMonth(args, 'month');
  if (!month) throw new McpActionError('Campo obrigatório ausente: month (AAAA-MM)');
  const existing = (vault.insights ?? []).find((i) => i.month === month);
  if (!existing) throw new McpActionError(`Não há insight para ${month}`);
  return {
    result: { deleted: month },
    nextVault: { ...vault, insights: (vault.insights ?? []).filter((i) => i.month !== month) },
    notice: `MCP removeu o insight de ${month}`,
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
      note: 'O MyFBox opera de forma 100% offline. Cotações são cadastradas manualmente ou pelo agente via MCP.',
    },
  };
}

function setExchangeRate(vault: VaultPayload, args: Args, ctx: McpActionContext): McpActionOutcome {
  const from = str(args, 'from', true);
  const to = str(args, 'to', true);
  const rate = num(args, 'rate', true);

  if (!from || !to) throw new McpActionError('from e to são obrigatórios');
  if (!rate || rate <= 0) throw new McpActionError('rate deve ser um número positivo maior que zero');

  const normFrom = normalizeCurrency(from);
  const normTo = normalizeCurrency(to);
  if (!isSupportedCurrency(normFrom)) {
    throw new McpActionError(
      `Moeda de origem "${normFrom}" não é suportada. Escolha uma das moedas mais populares: ${POPULAR_CURRENCY_CODES.join(', ')}`
    );
  }
  if (!isSupportedCurrency(normTo)) {
    throw new McpActionError(
      `Moeda de destino "${normTo}" não é suportada. Escolha uma das moedas mais populares: ${POPULAR_CURRENCY_CODES.join(', ')}`
    );
  }
  if (normFrom === normTo) throw new McpActionError('Moeda de origem e destino devem ser diferentes');

  const nextRates = upsertExchangeRate(vault.settings.exchangeRates, normFrom, normTo, rate, 'mcp');
  const nextSettings = { ...vault.settings, exchangeRates: nextRates };

  // Sincroniza retrocompatibilidade se for par USD/BRL
  if (normFrom === 'USD' && normTo === 'BRL') {
    nextSettings.usdToBrlRate = rate;
    nextSettings.usdRateUpdatedAt = `${ctx.today} (MCP)`;
  } else if (normFrom === 'BRL' && normTo === 'USD') {
    nextSettings.usdToBrlRate = Math.round((1 / rate) * 10000) / 10000;
    nextSettings.usdRateUpdatedAt = `${ctx.today} (MCP)`;
  }

  const nextVault: VaultPayload = {
    ...vault,
    settings: nextSettings,
    updatedAt: ctx.nowIso,
  };

  const updatedEntry = nextRates.find((r) => r.from === normFrom && r.to === normTo);

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
    notice: `MCP definiu cotação ${normFrom}/${normTo}: ${rate}`,
  };
}

function deleteExchangeRate(vault: VaultPayload, args: Args, ctx: McpActionContext): McpActionOutcome {
  const from = str(args, 'from', true);
  const to = str(args, 'to', true);
  if (!from || !to) throw new McpActionError('from e to são obrigatórios');

  const normFrom = normalizeCurrency(from);
  const normTo = normalizeCurrency(to);

  const nextRates = removeExchangeRate(vault.settings.exchangeRates, normFrom, normTo);
  const nextSettings = { ...vault.settings, exchangeRates: nextRates };

  if (normFrom === 'USD' && normTo === 'BRL') {
    delete nextSettings.usdToBrlRate;
    delete nextSettings.usdRateUpdatedAt;
  }

  const nextVault: VaultPayload = {
    ...vault,
    settings: nextSettings,
    updatedAt: ctx.nowIso,
  };

  return {
    result: { deleted: true, pair: `${normFrom}/${normTo}` },
    nextVault,
    notice: `MCP removeu cotação ${normFrom}/${normTo}`,
  };
}

export const MCP_ACTIONS = {
  get_overview: getOverview,
  list_accounts: (vault: VaultPayload, _args: Args, ctx: McpActionContext): McpActionOutcome => ({
    result: {
      month: getCurrentYearMonth(),
      accounts: vault.accounts.map((a) =>
        describeAccount(a, vault, ctx.usdToBrlRate, getCurrentYearMonth())
      ),
    },
  }),
  list_categories: (vault: VaultPayload, args: Args): McpActionOutcome => {
    const type = oneOf(args, 'type', ['income', 'expense'] as const);
    return {
      result: {
        categories: vault.categories.filter((c) => !type || c.type === type).map(describeCategory),
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

export function runMcpAction(
  name: string,
  vault: VaultPayload,
  args: Args,
  ctx: McpActionContext
): McpActionOutcome {
  const action = (MCP_ACTIONS as Record<string, (v: VaultPayload, a: Args, c: McpActionContext) => McpActionOutcome>)[name];
  if (!action) throw new McpActionError(`Ação desconhecida: ${name}`);
  return action(vault, args ?? {}, ctx);
}
