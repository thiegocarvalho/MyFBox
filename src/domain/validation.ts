import { getVaultExchangeRates, normalizeCurrency } from '../services/currencyService';
import type {
  Account,
  AccountType,
  Category,
  EncryptedVaultEnvelope,
  ExchangeRate,
  MonthInsight,
  Transaction,
  VaultPayload,
  VaultSettings,
} from '../types/finance';
import { ensureSystemCategories, getDefaultCategoryId } from '../utils/categories';

export const MIN_PBKDF2_ITERATIONS = 10_000;
export const MAX_PBKDF2_ITERATIONS = 10_000_000;

const VALID_ACCOUNT_TYPES = new Set<AccountType>([
  'reserve',
  'investment',
  'checking',
  'credit',
  'wallet',
  'savings',
]);

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

export function assertValidEnvelope(
  candidate: unknown
): asserts candidate is EncryptedVaultEnvelope {
  if (!isRecord(candidate) || candidate.app !== 'MyFBox') {
    throw new Error('Formato de cofre inválido ou corrompido.');
  }

  const kdf = candidate.kdf;
  const cipher = candidate.cipher;
  const verifier = candidate.verifier;

  if (
    !isRecord(kdf) ||
    kdf.algorithm !== 'PBKDF2-HMAC-SHA256' ||
    typeof kdf.saltBase64 !== 'string' ||
    !kdf.saltBase64
  ) {
    throw new Error('Cabeçalho KDF do cofre inválido.');
  }

  const iterations = Number(kdf.iterations);
  if (
    !Number.isInteger(iterations) ||
    iterations < MIN_PBKDF2_ITERATIONS ||
    iterations > MAX_PBKDF2_ITERATIONS
  ) {
    throw new Error('Parâmetro de iterações PBKDF2 fora dos limites de segurança.');
  }

  if (
    !isRecord(cipher) ||
    cipher.algorithm !== 'AES-256-GCM' ||
    typeof cipher.ivBase64 !== 'string' ||
    typeof cipher.ciphertextBase64 !== 'string' ||
    !cipher.ivBase64 ||
    !cipher.ciphertextBase64
  ) {
    throw new Error('Bloco criptográfico do cofre inválido.');
  }

  if (
    !isRecord(verifier) ||
    typeof verifier.ivBase64 !== 'string' ||
    typeof verifier.ciphertextBase64 !== 'string' ||
    !verifier.ivBase64 ||
    !verifier.ciphertextBase64
  ) {
    throw new Error('Bloco verificador do cofre inválido.');
  }
}

export function sanitizeVaultPayload(raw: unknown): {
  payload: VaultPayload;
  changed: boolean;
} {
  if (!isRecord(raw)) {
    throw new Error('Estrutura interna do cofre inválida.');
  }

  if (
    !Array.isArray(raw.accounts) ||
    !Array.isArray(raw.categories) ||
    !Array.isArray(raw.transactions)
  ) {
    throw new Error('Coleções de dados do cofre ausentes ou corrompidas.');
  }

  let changed = false;
  const nowIso = new Date().toISOString();

  const validAccounts: Account[] = [];
  for (const item of raw.accounts) {
    if (!isRecord(item) || typeof item.id !== 'string' || !item.id.trim()) {
      changed = true;
      continue;
    }
    const type: AccountType = VALID_ACCOUNT_TYPES.has(item.type as AccountType)
      ? (item.type as AccountType)
      : 'checking';
    const initialBalance =
      typeof item.initialBalance === 'number' && Number.isFinite(item.initialBalance)
        ? item.initialBalance
        : 0;
    const currency = normalizeCurrency(
      typeof item.currency === 'string' ? item.currency : 'BRL'
    ) || 'BRL';

    validAccounts.push({
      id: item.id,
      name: typeof item.name === 'string' && item.name.trim() ? item.name.trim() : 'Conta',
      type,
      initialBalance,
      color: typeof item.color === 'string' && item.color ? item.color : '#C8FF00',
      currency,
      institution: typeof item.institution === 'string' ? item.institution : undefined,
    });
  }

  if (validAccounts.length === 0) {
    validAccounts.push({
      id: 'acc_main',
      name: 'Conta Principal',
      type: 'checking',
      initialBalance: 0,
      color: '#C8FF00',
      currency: 'BRL',
    });
    changed = true;
  }

  const rawCategories: Category[] = [];
  for (const item of raw.categories) {
    if (!isRecord(item) || typeof item.id !== 'string' || !item.id.trim()) {
      changed = true;
      continue;
    }
    const type = item.type === 'income' ? 'income' : 'expense';
    const budget =
      typeof item.monthlyBudget === 'number' &&
      Number.isFinite(item.monthlyBudget) &&
      item.monthlyBudget > 0
        ? item.monthlyBudget
        : undefined;
    const rawBudgetCurrency =
      type === 'expense' &&
      budget !== undefined &&
      typeof item.budgetCurrency === 'string' &&
      item.budgetCurrency.trim()
        ? normalizeCurrency(item.budgetCurrency)
        : undefined;

    rawCategories.push({
      id: item.id,
      name: typeof item.name === 'string' && item.name.trim() ? item.name.trim() : 'Categoria',
      type,
      color: typeof item.color === 'string' && item.color ? item.color : '#737373',
      icon: typeof item.icon === 'string' && item.icon ? item.icon : 'Tag',
      monthlyBudget: type === 'expense' ? budget : undefined,
      budgetCurrency:
        rawBudgetCurrency && rawBudgetCurrency !== 'BRL' ? rawBudgetCurrency : undefined,
      isSystem: Boolean(item.isSystem),
    });
  }

  const { categories: ensuredCategories, changed: catsChanged } =
    ensureSystemCategories(rawCategories);
  if (catsChanged) changed = true;

  const accountIds = new Set(validAccounts.map((a) => a.id));
  const fallbackAccountId = validAccounts[0].id;
  const categoryById = new Map(ensuredCategories.map((c) => [c.id, c]));
  const defaultExpenseCatId = getDefaultCategoryId(ensuredCategories, 'expense');
  const defaultIncomeCatId = getDefaultCategoryId(ensuredCategories, 'income');

  const validTransactions: Transaction[] = [];
  for (const item of raw.transactions) {
    if (!isRecord(item) || typeof item.id !== 'string' || !item.id.trim()) {
      changed = true;
      continue;
    }
    const amount =
      typeof item.amount === 'number' && Number.isFinite(item.amount) && item.amount > 0
        ? item.amount
        : 0;
    if (amount <= 0) {
      changed = true;
      continue;
    }

    const type = item.type === 'income' ? 'income' : 'expense';
    const status = item.status === 'pending' ? 'pending' : 'paid';
    const rawCatId = typeof item.categoryId === 'string' ? item.categoryId : '';
    const matchedCat = categoryById.get(rawCatId);
    const categoryId =
      matchedCat && matchedCat.type === type
        ? rawCatId
        : type === 'income'
        ? defaultIncomeCatId
        : defaultExpenseCatId;
    if (categoryId !== rawCatId) changed = true;

    const rawAccId = typeof item.accountId === 'string' ? item.accountId : '';
    const accountId = accountIds.has(rawAccId) ? rawAccId : fallbackAccountId;
    if (accountId !== rawAccId) changed = true;

    const currency =
      normalizeCurrency(typeof item.currency === 'string' ? item.currency : 'BRL') || 'BRL';

    validTransactions.push({
      id: item.id,
      description:
        typeof item.description === 'string' && item.description.trim()
          ? item.description.trim()
          : 'Lançamento',
      amount,
      currency,
      exchangeRate:
        typeof item.exchangeRate === 'number' &&
        Number.isFinite(item.exchangeRate) &&
        item.exchangeRate > 0
          ? item.exchangeRate
          : undefined,
      type,
      status,
      date:
        typeof item.date === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(item.date)
          ? item.date
          : nowIso.slice(0, 10),
      paidAt:
        status === 'paid' &&
        typeof item.paidAt === 'string' &&
        /^\d{4}-\d{2}-\d{2}$/.test(item.paidAt)
          ? item.paidAt
          : undefined,
      categoryId,
      accountId,
      notes: typeof item.notes === 'string' && item.notes.trim() ? item.notes.trim() : undefined,
      tags: Array.isArray(item.tags)
        ? item.tags.filter((t): t is string => typeof t === 'string')
        : undefined,
      recurrenceGroupId:
        typeof item.recurrenceGroupId === 'string' ? item.recurrenceGroupId : undefined,
      installmentIndex:
        typeof item.installmentIndex === 'number' ? item.installmentIndex : undefined,
      installmentTotal:
        typeof item.installmentTotal === 'number' ? item.installmentTotal : undefined,
      createdAt: typeof item.createdAt === 'string' ? item.createdAt : nowIso,
    });
  }

  const rawSettings = isRecord(raw.settings) ? raw.settings : {};
  const rawRates = Array.isArray(rawSettings.exchangeRates) ? rawSettings.exchangeRates : [];
  const validRates: ExchangeRate[] = [];
  for (const r of rawRates) {
    if (
      isRecord(r) &&
      typeof r.from === 'string' &&
      typeof r.to === 'string' &&
      typeof r.rate === 'number' &&
      Number.isFinite(r.rate) &&
      r.rate > 0
    ) {
      validRates.push({
        from: normalizeCurrency(r.from),
        to: normalizeCurrency(r.to),
        rate: r.rate,
        updatedAt: typeof r.updatedAt === 'string' ? r.updatedAt : '',
        source:
          r.source === 'manual' || r.source === 'agent' || r.source === 'mcp'
            ? r.source
            : 'manual',
      });
    }
  }

  const usdToBrlRate =
    typeof rawSettings.usdToBrlRate === 'number' &&
    Number.isFinite(rawSettings.usdToBrlRate) &&
    rawSettings.usdToBrlRate > 0
      ? rawSettings.usdToBrlRate
      : undefined;

  const settings: VaultSettings = {
    currency:
      normalizeCurrency(typeof rawSettings.currency === 'string' ? rawSettings.currency : 'BRL') ||
      'BRL',
    autoLockMinutes:
      typeof rawSettings.autoLockMinutes === 'number' &&
      rawSettings.autoLockMinutes >= 1 &&
      rawSettings.autoLockMinutes <= 240
        ? rawSettings.autoLockMinutes
        : 15,
    hideValuesByDefault: Boolean(rawSettings.hideValuesByDefault),
    vaultName:
      typeof rawSettings.vaultName === 'string' && rawSettings.vaultName.trim()
        ? rawSettings.vaultName.trim()
        : 'Cofre Pessoal',
    usdToBrlRate,
    usdRateUpdatedAt:
      typeof rawSettings.usdRateUpdatedAt === 'string' ? rawSettings.usdRateUpdatedAt : undefined,
    exchangeRates: getVaultExchangeRates({
      exchangeRates: validRates,
      usdToBrlRate,
      usdRateUpdatedAt:
        typeof rawSettings.usdRateUpdatedAt === 'string'
          ? rawSettings.usdRateUpdatedAt
          : undefined,
    }),
    lastBackupAt:
      typeof rawSettings.lastBackupAt === 'string' ? rawSettings.lastBackupAt : undefined,
    mcpEnabled: Boolean(rawSettings.mcpEnabled),
    mcpToken: typeof rawSettings.mcpToken === 'string' ? rawSettings.mcpToken : undefined,
    mcpPort:
      typeof rawSettings.mcpPort === 'number' &&
      rawSettings.mcpPort >= 1024 &&
      rawSettings.mcpPort <= 65535
        ? rawSettings.mcpPort
        : undefined,
  };

  const insights: MonthInsight[] | undefined = Array.isArray(raw.insights)
    ? raw.insights.filter(
        (i): i is MonthInsight =>
          isRecord(i) &&
          typeof i.month === 'string' &&
          typeof i.title === 'string' &&
          typeof i.body === 'string' &&
          typeof i.dataSignature === 'string'
      )
    : undefined;

  return {
    payload: {
      version: typeof raw.version === 'number' ? raw.version : 1,
      updatedAt: typeof raw.updatedAt === 'string' ? raw.updatedAt : nowIso,
      accounts: validAccounts,
      categories: ensuredCategories,
      transactions: validTransactions,
      settings,
      insights,
    },
    changed,
  };
}
