import { lazy, Suspense, useCallback, useEffect, useRef, useState } from 'react';
import {
  ShieldCheck,
  Lock,
  Eye,
  EyeOff,
  ChevronLeft,
  ChevronRight,
  Undo2,
  LayoutDashboard,
  BarChart3,
  ReceiptText,
  Target,
  Wallet,
  Settings,
  Plus,
} from 'lucide-react';
import type {
  Account,
  Category,
  CryptoSession,
  EncryptedVaultEnvelope,
  InitialAccountData,
  Transaction,
  TransactionType,
  VaultPayload,
  VaultSettings,
} from './types/finance';
import {
  createNewCryptoSession,
  encryptPayloadToEnvelope,
  loadEncryptedEnvelopeFromDisk,
  saveEncryptedEnvelopeToDisk,
  unlockEnvelopeWithPassword,
  deleteEncryptedVaultFromDisk,
  needsKdfUpgrade,
} from './services/cryptoVault';
import { createInitialVaultPayload } from './services/defaultData';
import {
  ensureSystemCategories,
  findOrCreateOutrosCategory,
  getDefaultCategoryId,
  isProtectedCategory,
} from './utils/categories';
import { downloadEncryptedBackupFile } from './services/importExport';
import {
  formatMonthYearLabel,
  getCurrentYearMonth,
  shiftYearMonth,
} from './utils/formatters';
import {
  formatRate,
  formatRateDate,
  normalizeCurrency,
  removeExchangeRate,
  upsertExchangeRate,
} from './services/currencyService';
import { accountCurrency, convertAmount, isValidRate } from './utils/money';
import {
  startMcpBridge,
  takePairingFromLocation,
  type McpBridgeStatus,
  type McpPairingRequest,
} from './services/mcpBridge';
import {
  requestPersistentStorage,
  type StoragePersistStatus,
} from './services/storagePersistence';
import { runMcpAction } from './services/mcpActions';

const DEFAULT_MCP_PORT = 4777;

// Telas carregadas sob demanda: a tela de entrada não baixa o código do app inteiro (LCP).
// Depois do desbloqueio elas são pré-carregadas em segundo plano (troca de aba sem espera).
const viewLoaders = {
  DashboardView: () => import('./components/DashboardView'),
  TransactionsView: () => import('./components/TransactionsView'),
  ComparisonView: () => import('./components/ComparisonView'),
  BudgetsView: () => import('./components/BudgetsView'),
  AccountsView: () => import('./components/AccountsView'),
  BackupSecurityView: () => import('./components/BackupSecurityView'),
  TransactionModal: () => import('./components/TransactionModal'),
  McpPairDialog: () => import('./components/McpPairDialog'),
};
const DashboardView = lazy(() => viewLoaders.DashboardView().then((m) => ({ default: m.DashboardView })));
const TransactionsView = lazy(() =>
  viewLoaders.TransactionsView().then((m) => ({ default: m.TransactionsView }))
);
const ComparisonView = lazy(() => viewLoaders.ComparisonView().then((m) => ({ default: m.ComparisonView })));
const BudgetsView = lazy(() => viewLoaders.BudgetsView().then((m) => ({ default: m.BudgetsView })));
const AccountsView = lazy(() => viewLoaders.AccountsView().then((m) => ({ default: m.AccountsView })));
const BackupSecurityView = lazy(() =>
  viewLoaders.BackupSecurityView().then((m) => ({ default: m.BackupSecurityView }))
);
const TransactionModal = lazy(() =>
  viewLoaders.TransactionModal().then((m) => ({ default: m.TransactionModal }))
);
const McpPairDialog = lazy(() => viewLoaders.McpPairDialog().then((m) => ({ default: m.McpPairDialog })));

function prefetchViews() {
  const run = () => Object.values(viewLoaders).forEach((load) => void load());
  if ('requestIdleCallback' in window) window.requestIdleCallback(run, { timeout: 2000 });
  else setTimeout(run, 300);
}


function localTodayStr(): string {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}
import { VaultLockScreen } from './components/VaultLockScreen';
import { MyFBoxLogo } from './components/MyFBoxLogo';
import { MobileMenu, MobileMenuButton, type NavItem } from './components/MobileMenu';

type ActiveTab = 'dashboard' | 'transactions' | 'compare' | 'budgets' | 'accounts' | 'security';

export function App() {
  const [loadingDisk, setLoadingDisk] = useState(true);
  const [envelope, setEnvelope] = useState<EncryptedVaultEnvelope | null>(null);
  // Envelope cifrado mais recente gravado no disco (usado pelo backup via MCP)
  const envelopeRef = useRef<EncryptedVaultEnvelope | null>(null);
  useEffect(() => {
    envelopeRef.current = envelope;
  }, [envelope]);
  const [session, setSession] = useState<CryptoSession | null>(null);
  const [vault, setVault] = useState<VaultPayload | null>(null);

  const [activeTab, setActiveTab] = useState<ActiveTab>('dashboard');
  const [selectedYearMonth, setSelectedYearMonth] = useState<string>(getCurrentYearMonth());
  const [hideValues, setHideValues] = useState<boolean>(false);

  // Modal de Lançamento
  const [txModalOpen, setTxModalOpen] = useState<boolean>(false);
  const [txModalInitialType, setTxModalInitialType] = useState<TransactionType>('expense');
  const [editingTx, setEditingTx] = useState<Transaction | null>(null);

  // Toast de feedback
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const showToast = useCallback((msg: string) => {
    setToastMessage(msg);
    window.setTimeout(() => setToastMessage(null), 3200);
  }, []);

  useEffect(() => {
    loadEncryptedEnvelopeFromDisk()
      .then((env) => {
        setEnvelope(env);
      })
      .finally(() => {
        setLoadingDisk(false);
      });
  }, []);

  const lockVault = useCallback(() => {
    setSession(null);
    setVault(null);
    setTxModalOpen(false);
    setEditingTx(null);
  }, []);

  // Persistir alterações criptografando imediatamente com novo IV de 96 bits
  // Cópia sempre atual do cofre: atualizada na hora da escrita (não só após o render),
  // para que operações em sequência (ex.: chamadas do MCP) nunca leiam um estado velho.
  const vaultRef = useRef<VaultPayload | null>(vault);
  // Gravações em fila: cifrar + salvar é assíncrono, e duas alterações rápidas não podem
  // terminar fora de ordem (a mais antiga sobrescreveria a mais nova no disco).
  const writeChainRef = useRef<Promise<void>>(Promise.resolve());

  const persistVaultUpdate = useCallback(
    async (nextVault: VaultPayload, activeSession: CryptoSession | null = session) => {
      if (!activeSession) return;
      const stamped: VaultPayload = {
        ...nextVault,
        updatedAt: new Date().toISOString(),
      };
      vaultRef.current = stamped;
      setVault(stamped);
      const write = writeChainRef.current.then(async () => {
        const newEnv = await encryptPayloadToEnvelope(stamped, activeSession);
        await saveEncryptedEnvelopeToDisk(newEnv);
        envelopeRef.current = newEnv;
        setEnvelope(newEnv);
      });
      writeChainRef.current = write.catch(() => undefined);
      await write;
    },
    [session]
  );

  // Auto-lock por inatividade
  useEffect(() => {
    if (!session || !vault) return;
    const timeoutMs = (vault.settings.autoLockMinutes || 15) * 60 * 1000;
    let timer = window.setTimeout(lockVault, timeoutMs);

    const resetTimer = () => {
      window.clearTimeout(timer);
      timer = window.setTimeout(lockVault, timeoutMs);
    };

    const events = ['mousedown', 'keydown', 'touchstart', 'scroll'];
    events.forEach((ev) => window.addEventListener(ev, resetTimer, { passive: true }));
    return () => {
      window.clearTimeout(timer);
      events.forEach((ev) => window.removeEventListener(ev, resetTimer));
    };
  }, [session, vault, lockVault]);

  // Cotações de Câmbio offline (100% locais — sem APIs externas)
  const usdRate = vault?.settings.usdToBrlRate ?? null;

  useEffect(() => {
    vaultRef.current = vault;
  }, [vault]);

  const handleSaveExchangeRate = useCallback(
    async (fromRaw: string, toRaw: string, newRate: number) => {
      if (newRate <= 0 || !Number.isFinite(newRate)) return;
      const from = normalizeCurrency(fromRaw);
      const to = normalizeCurrency(toRaw);
      if (from === to) return;

      const currentVault = vaultRef.current;
      if (currentVault) {
        const nextRates = upsertExchangeRate(
          currentVault.settings.exchangeRates,
          from,
          to,
          newRate,
          'manual'
        );
        const nextSettings: VaultSettings = { ...currentVault.settings, exchangeRates: nextRates };

        if (from === 'USD' && to === 'BRL') {
          nextSettings.usdToBrlRate = newRate;
          nextSettings.usdRateUpdatedAt = `${formatRateDate()} (manual)`;
        } else if (from === 'BRL' && to === 'USD') {
          const inv = Math.round((1 / newRate) * 10000) / 10000;
          nextSettings.usdToBrlRate = inv;
          nextSettings.usdRateUpdatedAt = `${formatRateDate()} (manual)`;
        }

        await persistVaultUpdate({
          ...currentVault,
          settings: nextSettings,
        });
        showToast(`Cotação salva: 1 ${from} = ${formatRate(newRate)} ${to}`);
      }
    },
    [persistVaultUpdate, showToast]
  );

  const handleDeleteExchangeRate = useCallback(
    async (fromRaw: string, toRaw: string) => {
      const from = normalizeCurrency(fromRaw);
      const to = normalizeCurrency(toRaw);
      const currentVault = vaultRef.current;
      if (currentVault) {
        const nextRates = removeExchangeRate(currentVault.settings.exchangeRates, from, to);
        const nextSettings: VaultSettings = { ...currentVault.settings, exchangeRates: nextRates };

        if (from === 'USD' && to === 'BRL') {
          delete nextSettings.usdToBrlRate;
          delete nextSettings.usdRateUpdatedAt;
        }

        await persistVaultUpdate({
          ...currentVault,
          settings: nextSettings,
        });
        showToast(`Cotação ${from}/${to} removida`);
      }
    },
    [persistVaultUpdate, showToast]
  );

  const handleUpdateManualUsdRate = useCallback(
    async (newRate: number) => {
      await handleSaveExchangeRate('USD', 'BRL', newRate);
    },
    [handleSaveExchangeRate]
  );

  // ---------- Armazenamento persistente (o navegador não apaga o cofre sem o usuário) ----------
  const [storageStatus, setStorageStatus] = useState<StoragePersistStatus>('unsupported');
  const handleRequestPersist = useCallback(async () => {
    const status = await requestPersistentStorage();
    setStorageStatus(status);
    return status;
  }, []);
  useEffect(() => {
    // Pede ao abrir o cofre (criar, desbloquear ou restaurar)
    if (!session) return;
    let alive = true;
    requestPersistentStorage().then((status) => {
      if (alive) setStorageStatus(status);
    });
    return () => {
      alive = false;
    };
  }, [session]);

  // ---------- Modo MCP local (desligado por padrão; ativado na aba Backups) ----------
  const [mcpStatus, setMcpStatus] = useState<McpBridgeStatus>('off');
  const [mcpDetail, setMcpDetail] = useState<string | undefined>();
  const mcpQueueRef = useRef<Promise<unknown>>(Promise.resolve());
  const persistRef = useRef(persistVaultUpdate);
  const usdRateRef = useRef<number | undefined>(undefined);
  const showToastRef = useRef(showToast);

  useEffect(() => {
    persistRef.current = persistVaultUpdate;
    showToastRef.current = showToast;
    usdRateRef.current = usdRate || vault?.settings.usdToBrlRate;
  });

  const mcpEnabled = Boolean(vault?.settings.mcpEnabled);
  const mcpToken = vault?.settings.mcpToken;
  const mcpPort = vault?.settings.mcpPort || DEFAULT_MCP_PORT;

  useEffect(() => {
    if (!session || !mcpEnabled || !mcpToken) return;
    const stop = startMcpBridge({
      port: mcpPort,
      token: mcpToken,
      onStatus: (status, detail) => {
        setMcpStatus(status);
        setMcpDetail(detail);
      },
      // Chamadas em fila: cada ação lê o cofre mais recente e grava antes da próxima
      onCall: (action, args) => {
        const run = mcpQueueRef.current.then(async () => {
          const current = vaultRef.current;
          if (!current) throw new Error('Cofre trancado.');

          // Backup: entrega só o envelope JÁ CIFRADO (o mesmo do arquivo .myfbox.json)
          if (action === 'export_backup') {
            const env = envelopeRef.current;
            if (!env) throw new Error('Ainda não há envelope cifrado gravado.');
            const result = {
              envelope: env,
              vaultName: current.settings.vaultName,
              keyFingerprint: env.keyFingerprint,
              envelopeUpdatedAt: env.updatedAt,
              transactionCount: current.transactions.length,
            };
            await persistRef.current({
              ...current,
              settings: { ...current.settings, lastBackupAt: new Date().toISOString() },
            });
            showToastRef.current('MCP salvou um backup cifrado na pasta do projeto');
            return result;
          }

          const outcome = runMcpAction(action, current, args, {
            usdToBrlRate: usdRateRef.current,
            today: localTodayStr(),
            nowIso: new Date().toISOString(),
            newId: (prefix) => `${prefix}_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
          });
          if (outcome.nextVault) await persistRef.current(outcome.nextVault);
          if (outcome.notice) showToastRef.current(outcome.notice);
          return outcome.result;
        });
        mcpQueueRef.current = run.catch(() => undefined);
        return run;
      },
    });
    return stop;
  }, [session, mcpEnabled, mcpToken, mcpPort]);

  // Pareamento por link (#mcp-pair=...): guarda o pedido e pede confirmação após desbloquear
  const [pendingPair, setPendingPair] = useState<McpPairingRequest | null>(null);
  useEffect(() => {
    const read = () => {
      const req = takePairingFromLocation();
      if (req) setPendingPair(req);
    };
    read();
    window.addEventListener('hashchange', read);
    return () => window.removeEventListener('hashchange', read);
  }, []);

  const handleUpdateMcpSettings = useCallback(
    async (patch: Partial<Pick<VaultSettings, 'mcpEnabled' | 'mcpToken' | 'mcpPort'>>) => {
      const current = vaultRef.current;
      if (!current) return;
      await persistVaultUpdate({ ...current, settings: { ...current.settings, ...patch } });
    },
    [persistVaultUpdate]
  );

  // Handlers de Lançamentos (Transações)
  const handleOpenNewTransaction = useCallback((type: TransactionType) => {
    setEditingTx(null);
    setTxModalInitialType(type);
    setTxModalOpen(true);
  }, []);

  useEffect(() => {
    if (session) prefetchViews();
  }, [session]);

  // Menu do celular (overlay em tela cheia)
  const [menuOpen, setMenuOpen] = useState(false);
  const menuButtonRef = useRef<HTMLButtonElement>(null);
  const closeMenu = useCallback(() => {
    setMenuOpen(false);
    menuButtonRef.current?.focus(); // devolve o foco ao botão MENU
  }, []);

  // No celular as abas rolam na horizontal: mantém a aba ativa visível
  useEffect(() => {
    document
      .querySelector('.workspace-tabs .ws-tab.active')
      ?.scrollIntoView({ block: 'nearest', inline: 'nearest' });
  }, [activeTab, session]);

  // Atalho global de teclado: Pressione 'N' para novo lançamento
  useEffect(() => {
    if (!session || !vault) return;
    const handleGlobalKey = (e: KeyboardEvent) => {
      const activeEl = document.activeElement;
      const isInput =
        activeEl instanceof HTMLInputElement ||
        activeEl instanceof HTMLTextAreaElement ||
        activeEl instanceof HTMLSelectElement ||
        activeEl?.getAttribute('contenteditable') === 'true';

      if (!isInput && !txModalOpen && !menuOpen && (e.key === 'n' || e.key === 'N')) {
        e.preventDefault();
        handleOpenNewTransaction('expense');
      }
    };
    window.addEventListener('keydown', handleGlobalKey);
    return () => window.removeEventListener('keydown', handleGlobalKey);
  }, [session, vault, txModalOpen, menuOpen, handleOpenNewTransaction]);

  // Handlers de Autenticação e Criptografia
  const handleUnlockVault = async (password: string) => {
    if (!envelope) return;
    const { payload, session: unlockedSession } = await unlockEnvelopeWithPassword(
      envelope,
      password
    );
    // Garante que as categorias do sistema ("Outros" para despesa e receita) existam no cofre
    const { categories: ensuredCats, changed: catsChanged } = ensureSystemCategories(payload.categories);
    const safePayload: VaultPayload = catsChanged ? { ...payload, categories: ensuredCats } : payload;

    // Cofres antigos (menos iterações PBKDF2) são recifrados com o padrão atual e sal novo
    const activeSession = needsKdfUpgrade(unlockedSession)
      ? await createNewCryptoSession(password)
      : unlockedSession;
    if (catsChanged || activeSession !== unlockedSession) {
      const upgraded = await encryptPayloadToEnvelope(safePayload, activeSession);
      await saveEncryptedEnvelopeToDisk(upgraded);
      envelopeRef.current = upgraded;
      setEnvelope(upgraded);
    }
    setSession(activeSession);
    setVault(safePayload);
    setHideValues(safePayload.settings.hideValuesByDefault || false);
  };

  const handleCreateVault = async (
    password: string,
    vaultName: string,
    initialAccount?: InitialAccountData
  ) => {
    const newSession = await createNewCryptoSession(password);
    const initialPayload = createInitialVaultPayload(vaultName, initialAccount);
    const newEnv = await encryptPayloadToEnvelope(initialPayload, newSession);
    await saveEncryptedEnvelopeToDisk(newEnv);
    setEnvelope(newEnv);
    setSession(newSession);
    setVault(initialPayload);
    setActiveTab('dashboard');
  };

  const handleRestoreBackupEnvelope = async (
    importedEnvelope: EncryptedVaultEnvelope,
    password: string
  ) => {
    const { payload, session: unlockedSession } = await unlockEnvelopeWithPassword(
      importedEnvelope,
      password
    );
    // Garante categorias essenciais do sistema ("Outros")
    const { categories: ensuredCats } = ensureSystemCategories(payload.categories);
    const safePayload: VaultPayload = { ...payload, categories: ensuredCats };

    // Backup antigo: regrava já com o KDF atual (mesma senha, sal novo)
    const restoredSession = needsKdfUpgrade(unlockedSession)
      ? await createNewCryptoSession(password)
      : unlockedSession;
    const freshEnvelope = await encryptPayloadToEnvelope(safePayload, restoredSession);
    await saveEncryptedEnvelopeToDisk(freshEnvelope);
    setEnvelope(freshEnvelope);
    setSession(restoredSession);
    setVault(safePayload);
    setActiveTab('dashboard');
  };

  // Baixa o backup cifrado e registra a data no cofre (aviso de backup antigo)
  const handleDownloadBackup = async () => {
    if (!envelope || !vault) return;
    downloadEncryptedBackupFile(envelope, vault.settings.vaultName);
    await persistVaultUpdate({
      ...vault,
      settings: { ...vault.settings, lastBackupAt: new Date().toISOString() },
    });
  };

  // Apaga o cofre deste navegador para criar outro. Exige a senha mestra atual
  // (confere descriptografando o envelope) antes de apagar.
  const handleDeleteVault = async (password: string) => {
    const env = envelopeRef.current;
    if (!env) throw new Error('Não há cofre gravado neste navegador.');
    await unlockEnvelopeWithPassword(env, password); // lança erro se a senha estiver errada
    await deleteEncryptedVaultFromDisk();
    envelopeRef.current = null;
    vaultRef.current = null;
    setEnvelope(null);
    setSession(null);
    setVault(null);
    setActiveTab('dashboard');
  };

  const handleChangeMasterPassword = async (newPassword: string) => {
    if (!vault) return;
    const newSession = await createNewCryptoSession(newPassword);
    setSession(newSession);
    await persistVaultUpdate(vault, newSession);
  };

  const handleSaveTransactions = async (txsToSave: Transaction[], isEdit: boolean) => {
    if (!vault) return;
    let nextTransactions: Transaction[];
    if (isEdit && txsToSave.length === 1) {
      const updated = txsToSave[0];
      nextTransactions = vault.transactions.map((t) => (t.id === updated.id ? updated : t));
      showToast(`Lançamento "${updated.description}" atualizado no cofre`);
    } else {
      nextTransactions = [...txsToSave, ...vault.transactions];
      const count = txsToSave.length;
      showToast(
        count === 1
          ? `Lançamento "${txsToSave[0].description}" salvo no cofre`
          : `${count} lançamentos registrados no cofre`
      );
    }
    await persistVaultUpdate({
      ...vault,
      transactions: nextTransactions,
    });
    setTxModalOpen(false);
    setEditingTx(null);
  };

  // Muda a situação de um lançamento. Ao pagar, registra a data do pagamento (paidAt) sem
  // mexer na data de vencimento; ao voltar para pendente, a data do pagamento é apagada.
  const setTransactionStatus = async (
    txId: string,
    nextStatus: Transaction['status'],
    paidAt?: string
  ) => {
    if (!vault) return;
    const liveRate = usdRate || vault.settings.usdToBrlRate;
    const nextTransactions = vault.transactions.map((t): Transaction => {
      if (t.id !== txId) return t;
      // Ao liquidar um lançamento em USD sem cotação fixada, fixa a cotação do dia
      const account = vault.accounts.find((a) => a.id === t.accountId);
      const involvesUsd = t.currency === 'USD' || accountCurrency(account ?? {}) === 'USD';
      const shouldFixRate =
        nextStatus === 'paid' && involvesUsd && !isValidRate(t.exchangeRate) && isValidRate(liveRate);
      return {
        ...t,
        status: nextStatus,
        paidAt: nextStatus === 'paid' ? paidAt ?? localTodayStr() : undefined,
        exchangeRate: shouldFixRate ? liveRate : t.exchangeRate,
      };
    });
    await persistVaultUpdate({
      ...vault,
      transactions: nextTransactions,
    });
  };

  const handleToggleTransactionStatus = async (txId: string) => {
    const tx = vault?.transactions.find((t) => t.id === txId);
    if (!tx) return;
    await setTransactionStatus(txId, tx.status === 'paid' ? 'pending' : 'paid');
  };

  const handleSettleTransaction = async (txId: string, paidAt: string) => {
    await setTransactionStatus(txId, 'paid', paidAt);
  };

  const handleDeleteTransaction = async (txId: string) => {
    if (!vault) return;
    await persistVaultUpdate({
      ...vault,
      transactions: vault.transactions.filter((t) => t.id !== txId),
    });
  };

  const handleDuplicateTransaction = async (tx: Transaction) => {
    if (!vault) return;
    const clone: Transaction = {
      ...tx,
      id: `tx_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
      description: `${tx.description} (Cópia)`,
      createdAt: new Date().toISOString(),
    };
    await persistVaultUpdate({
      ...vault,
      transactions: [clone, ...vault.transactions],
    });
  };

  // Handlers de Categorias e Metas
  const handleUpdateCategory = async (updatedCat: Category) => {
    if (!vault) return;
    const original = vault.categories.find((c) => c.id === updatedCat.id);
    // Se for categoria protegida do sistema, o nome é fixo ("Outros") e isSystem permanece true
    const safeCat: Category = original && isProtectedCategory(original)
      ? { ...updatedCat, name: 'Outros', isSystem: true }
      : updatedCat;

    await persistVaultUpdate({
      ...vault,
      categories: vault.categories.map((c) => (c.id === safeCat.id ? safeCat : c)),
    });
  };

  const handleAddCategory = async (newCat: Category) => {
    if (!vault) return;
    await persistVaultUpdate({
      ...vault,
      categories: [...vault.categories, newCat],
    });
  };

  const handleDeleteCategory = async (catId: string) => {
    if (!vault) return;
    const deleted = vault.categories.find((c) => c.id === catId);
    if (!deleted) return;

    // Categoria protegida do sistema ("Outros") nunca pode ser excluída
    if (isProtectedCategory(deleted)) {
      return;
    }

    const remainingWithoutDeleted = vault.categories.filter((c) => c.id !== catId);

    // Garante que a categoria "Outros" do mesmo tipo exista para absorver os lançamentos
    const { target: outrosCategory, categories: nextCategories } = findOrCreateOutrosCategory(
      remainingWithoutDeleted,
      deleted.type
    );

    // Todos os lançamentos vinculados à categoria apagada vão OBRIGATORIAMENTE para a categoria "Outros"
    const nextTransactions = vault.transactions.map((t) =>
      t.categoryId === catId ? { ...t, categoryId: outrosCategory.id } : t
    );

    await persistVaultUpdate({
      ...vault,
      categories: nextCategories,
      transactions: nextTransactions,
    });
  };

  // Handlers de Contas
  const handleAddAccount = async (acc: Account) => {
    if (!vault) return;
    await persistVaultUpdate({
      ...vault,
      accounts: [...vault.accounts, acc],
    });
  };

  const handleUpdateAccount = async (acc: Account) => {
    if (!vault) return;
    await persistVaultUpdate({
      ...vault,
      accounts: vault.accounts.map((a) => (a.id === acc.id ? acc : a)),
    });
  };

  const handleDeleteAccount = async (accId: string) => {
    if (!vault || vault.accounts.length <= 1) return;
    const remaining = vault.accounts.filter((a) => a.id !== accId);
    const deletedCurrency = accountCurrency(
      vault.accounts.find((a) => a.id === accId) ?? {}
    );
    // Prefere uma conta da mesma moeda para não misturar R$ e US$ no saldo
    const fallbackAccId = (
      remaining.find((a) => accountCurrency(a) === deletedCurrency) ?? remaining[0]
    ).id;
    const nextTransactions = vault.transactions.map((t) =>
      t.accountId === accId ? { ...t, accountId: fallbackAccId } : t
    );
    await persistVaultUpdate({
      ...vault,
      accounts: remaining,
      transactions: nextTransactions,
    });
  };

  const handleTransferBetweenAccounts = async (
    fromAccId: string,
    toAccId: string,
    amount: number,
    date: string,
    description: string
  ) => {
    if (!vault) return;
    const fromAccount = vault.accounts.find((a) => a.id === fromAccId);
    const toAccount = vault.accounts.find((a) => a.id === toAccId);
    if (!fromAccount || !toAccount) return;
    const fromName = fromAccount.name;
    const toName = toAccount.name;
    const fromCurrency = accountCurrency(fromAccount);
    const toCurrency = accountCurrency(toAccount);
    const rate = usdRate || vault.settings.usdToBrlRate;
    const convertedAmount = convertAmount(amount, fromCurrency, toCurrency, rate);
    if (convertedAmount === null) {
      showToast('Sem cotação USD/BRL disponível para transferir entre moedas diferentes.');
      return;
    }
    const isCrossCurrency = fromCurrency !== toCurrency;
    const fixedRate = isCrossCurrency && isValidRate(rate) ? rate : undefined;
    const inAmount = Math.round(convertedAmount * 100) / 100;
    const expCat = getDefaultCategoryId(vault.categories, 'expense');
    const incCat = getDefaultCategoryId(vault.categories, 'income');
    const nowIso = new Date().toISOString();

    const outTx: Transaction = {
      id: `tx_trf_out_${Date.now()}`,
      description: `${description} (Para ${toName})`,
      amount,
      currency: fromCurrency,
      exchangeRate: fromCurrency === 'USD' ? fixedRate : undefined,
      type: 'expense',
      status: 'paid',
      date,
      categoryId: expCat,
      accountId: fromAccId,
      notes: 'Transferência interna entre contas',
      createdAt: nowIso,
    };

    const inTx: Transaction = {
      id: `tx_trf_in_${Date.now() + 1}`,
      description: `${description} (De ${fromName})`,
      amount: inAmount,
      currency: toCurrency,
      exchangeRate: toCurrency === 'USD' ? fixedRate : undefined,
      type: 'income',
      status: 'paid',
      date,
      categoryId: incCat,
      accountId: toAccId,
      notes: 'Transferência interna entre contas',
      createdAt: nowIso,
    };

    await persistVaultUpdate({
      ...vault,
      transactions: [inTx, outTx, ...vault.transactions],
    });
  };

  if (loadingDisk) {
    return (
      <div className="loading-screen mono">
        Carregando cofre criptografado...
      </div>
    );
  }

  if (!session || !vault) {
    return (
      <VaultLockScreen
        existingEnvelope={envelope}
        onUnlock={handleUnlockVault}
        onCreateVault={handleCreateVault}
        onRestoreBackupEnvelope={handleRestoreBackupEnvelope}
        pairingPending={Boolean(pendingPair)}
      />
    );
  }

  // Seções do app: usadas pelas abas (desktop) e pelo menu em tela cheia (celular)
  const navItems: NavItem<ActiveTab>[] = [
    { id: 'dashboard', label: 'Visão Geral', icon: LayoutDashboard },
    { id: 'transactions', label: 'Lançamentos', icon: ReceiptText, count: vault.transactions.length },
    { id: 'compare', label: 'Comparativos', icon: BarChart3 },
    { id: 'budgets', label: 'Metas', icon: Target },
    { id: 'accounts', label: 'Contas', icon: Wallet, count: vault.accounts.length },
    { id: 'security', label: 'Configurações', icon: Settings },
  ];

  return (
    <div className="app-shell">
      {/* Topbar Unificada e Limpa */}
      <header className="workspace-header">
        <div className="header-left">
          <div className="brand-block">
            <div className="brand-logo-wrap">
              <MyFBoxLogo size={40} />
            </div>
            <div className="brand-text">
              <span className="brand-title">
                My<span className="brand-highlight">F</span>Box
              </span>
              <span className="brand-tagline">My Financial Box</span>
            </div>
          </div>

          {/* Seletor de Mês Compacto */}
          <div
            className={`month-navigator ${selectedYearMonth !== getCurrentYearMonth() ? 'is-away' : ''}`}
          >
            <button
              type="button"
              className="month-nav-btn"
              onClick={() => setSelectedYearMonth((ym) => shiftYearMonth(ym, -1))}
              title="Mês anterior"
            >
              <ChevronLeft size={16} />
            </button>
            <span className="month-current-display">
              {formatMonthYearLabel(selectedYearMonth)}
            </span>
            <button
              type="button"
              className="month-nav-btn"
              onClick={() => setSelectedYearMonth((ym) => shiftYearMonth(ym, 1))}
              title="Próximo mês"
            >
              <ChevronRight size={16} />
            </button>
            {selectedYearMonth !== getCurrentYearMonth() && (
              <button
                type="button"
                className="month-today-btn"
                onClick={() => setSelectedYearMonth(getCurrentYearMonth())}
                aria-label={`Voltar para ${formatMonthYearLabel(getCurrentYearMonth())}`}
                title={`Voltar para ${formatMonthYearLabel(getCurrentYearMonth())}`}
              >
                <Undo2 size={15} strokeWidth={2.5} aria-hidden />
                <span className="month-today-long">Mês atual</span>
                <span className="month-today-short">Atual</span>
              </button>
            )}
          </div>
        </div>

        {/* Abas de Navegação Centrais */}
        <nav className="workspace-tabs" aria-label="Seções do app">
          {navItems.map((item) => {
            const Icon = item.icon;
            return (
              <button
                key={item.id}
                type="button"
                className={`ws-tab ${activeTab === item.id ? 'active' : ''}`}
                onClick={() => setActiveTab(item.id)}
                aria-current={activeTab === item.id ? 'page' : undefined}
              >
                <Icon size={15} /> {item.label}
                {item.count !== undefined ? ` (${item.count})` : ''}
              </button>
            );
          })}
        </nav>

        {/* Celular: um botão MENU de largura total abre a navegação em tela cheia */}
        <MobileMenuButton
          ref={menuButtonRef}
          onClick={() => setMenuOpen(true)}
          currentLabel={navItems.find((i) => i.id === activeTab)?.label ?? ''}
          expanded={menuOpen}
        />
        <MobileMenu
          open={menuOpen}
          items={navItems}
          active={activeTab}
          onSelect={setActiveTab}
          onClose={closeMenu}
        />

        {/* Ações Rápidas no Topo */}
        <div className="header-right">
          <button
            type="button"
            className="icon-action-btn"
            onClick={() => setHideValues((v) => !v)}
            title={hideValues ? 'Mostrar valores monetários' : 'Ocultar valores (Modo Privacidade)'}
          >
            {hideValues ? <Eye size={16} /> : <EyeOff size={16} />}
          </button>

          <button
            type="button"
            className="icon-action-btn lock"
            onClick={lockVault}
            title="Trancar Cofre"
          >
            <Lock size={15} />
          </button>

          <button
            type="button"
            className="btn-primary btn-sm"
            onClick={() => handleOpenNewTransaction('expense')}
            title="Adicionar lançamento (Tecla N)"
          >
            <Plus size={15} /> Novo
          </button>
        </div>
      </header>

      {/* Conteúdo Principal */}
      <main className="workspace-main">
        <Suspense fallback={<div className="view-loading" aria-busy="true" />}>
        {activeTab === 'dashboard' && (
          <DashboardView
            selectedYearMonth={selectedYearMonth}
            onSelectYearMonth={setSelectedYearMonth}
            transactions={vault.transactions}
            categories={vault.categories}
            accounts={vault.accounts}
            hideValues={hideValues}
            usdToBrlRate={usdRate || vault.settings.usdToBrlRate}
            onSettleTransaction={handleSettleTransaction}
            onOpenNewTransaction={handleOpenNewTransaction}
            onNavigateTab={(tab) => setActiveTab(tab)}
          />
        )}

        {activeTab === 'transactions' && (
          <TransactionsView
            selectedYearMonth={selectedYearMonth}
            onSelectYearMonth={setSelectedYearMonth}
            transactions={vault.transactions}
            categories={vault.categories}
            accounts={vault.accounts}
            hideValues={hideValues}
            usdToBrlRate={usdRate || vault.settings.usdToBrlRate}
            onOpenNewTransaction={handleOpenNewTransaction}
            onEditTransaction={(tx) => {
              setEditingTx(tx);
              setTxModalOpen(true);
            }}
            onDuplicateTransaction={handleDuplicateTransaction}
            onDeleteTransaction={handleDeleteTransaction}
            onToggleTransactionStatus={handleToggleTransactionStatus}
          />
        )}

        {activeTab === 'budgets' && (
          <BudgetsView
            selectedYearMonth={selectedYearMonth}
            categories={vault.categories}
            transactions={vault.transactions}
            hideValues={hideValues}
            usdToBrlRate={usdRate || vault.settings.usdToBrlRate}
            onUpdateCategory={handleUpdateCategory}
            onAddCategory={handleAddCategory}
            onDeleteCategory={handleDeleteCategory}
          />
        )}

        {activeTab === 'compare' && (
          <ComparisonView
            selectedYearMonth={selectedYearMonth}
            transactions={vault.transactions}
            categories={vault.categories}
            insights={vault.insights ?? []}
            hideValues={hideValues}
            usdToBrlRate={usdRate || vault.settings.usdToBrlRate}
          />
        )}

        {activeTab === 'accounts' && (
          <AccountsView
            accounts={vault.accounts}
            transactions={vault.transactions}
            hideValues={hideValues}
            usdToBrlRate={usdRate || vault.settings.usdToBrlRate}
            selectedYearMonth={selectedYearMonth}
            onAddAccount={handleAddAccount}
            onUpdateAccount={handleUpdateAccount}
            onDeleteAccount={handleDeleteAccount}
            onTransferBetweenAccounts={handleTransferBetweenAccounts}
          />
        )}

        {activeTab === 'security' && (
          <BackupSecurityView
            envelope={envelope}
            transactions={vault.transactions}
            categories={vault.categories}
            accounts={vault.accounts}
            autoLockMinutes={vault.settings.autoLockMinutes}
            onUpdateAutoLockMinutes={(mins) =>
              persistVaultUpdate({
                ...vault,
                settings: { ...vault.settings, autoLockMinutes: mins },
              })
            }
            onChangeMasterPassword={handleChangeMasterPassword}
            onRestoreBackupEnvelope={handleRestoreBackupEnvelope}
            onDeleteVault={handleDeleteVault}
            lastBackupAt={vault.settings.lastBackupAt}
            onDownloadBackup={handleDownloadBackup}
            storageStatus={storageStatus}
            onRequestPersist={async () => {
              const status = await handleRequestPersist();
              showToast(
                status === 'persisted'
                  ? 'Armazenamento persistente ativo: o navegador não vai apagar o cofre sozinho.'
                  : status === 'unsupported'
                  ? 'Este navegador não permite pedir armazenamento persistente.'
                  : 'O navegador recusou por enquanto. Favoritar o app ou usá-lo com frequência costuma liberar.'
              );
            }}
            usdRate={usdRate || vault.settings.usdToBrlRate}
            usdRateUpdatedAt={vault.settings.usdRateUpdatedAt}
            exchangeRates={vault.settings.exchangeRates}
            onSaveExchangeRate={handleSaveExchangeRate}
            onDeleteExchangeRate={handleDeleteExchangeRate}
            onUpdateManualUsdRate={handleUpdateManualUsdRate}
            mcp={{
              enabled: mcpEnabled,
              token: mcpToken,
              port: mcpPort,
              status: mcpStatus,
              detail: mcpDetail,
            }}
            onUpdateMcpSettings={handleUpdateMcpSettings}
          />
        )}
        </Suspense>
      </main>

      <Suspense fallback={null}>
      {/* Modal de Criar / Editar Lançamento */}
      {txModalOpen && (
        <TransactionModal
          initialType={txModalInitialType}
          editingTransaction={editingTx}
          categories={vault.categories}
          accounts={vault.accounts}
          transactions={vault.transactions}
          defaultYearMonth={selectedYearMonth}
          usdToBrlRate={usdRate || vault.settings.usdToBrlRate}
          onCreateCategory={handleAddCategory}
          onSave={handleSaveTransactions}
          onClose={() => {
            setTxModalOpen(false);
            setEditingTx(null);
          }}
        />
      )}

      {pendingPair && (
        <McpPairDialog
          request={pendingPair}
          onApprove={async () => {
            const req = pendingPair;
            setPendingPair(null);
            await handleUpdateMcpSettings({
              mcpEnabled: true,
              mcpToken: req.token,
              mcpPort: req.port,
            });
            showToast('Assistente autorizado. Conectando ao servidor MCP local...');
          }}
          onReject={() => {
            setPendingPair(null);
            showToast('Pareamento recusado. Nada foi alterado.');
          }}
        />
      )}
      </Suspense>

      {/* Toast de Feedback */}
      {toastMessage && (
        <div className="vault-toast-notification">
          <ShieldCheck size={16} />
          <span>{toastMessage}</span>
        </div>
      )}
    </div>
  );
}

export default App;
