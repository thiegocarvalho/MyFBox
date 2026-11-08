import { useCallback, useEffect, useRef, useState } from 'react';
import {
  ShieldCheck,
  Lock,
  Eye,
  EyeOff,
  ChevronLeft,
  ChevronRight,
  LayoutDashboard,
  BarChart3,
  ReceiptText,
  Target,
  Wallet,
  DatabaseBackup,
  Plus,
  Download,
  RefreshCw,
} from 'lucide-react';
import type {
  Account,
  Category,
  CryptoSession,
  EncryptedVaultEnvelope,
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
import { downloadEncryptedBackupFile } from './services/importExport';
import {
  formatMonthYearLabel,
  getCurrentYearMonth,
  shiftYearMonth,
} from './utils/formatters';
import { fetchLiveUsdRate } from './services/currencyService';
import { accountCurrency, convertAmount, isValidRate } from './utils/money';
import {
  startMcpBridge,
  takePairingFromLocation,
  type McpBridgeStatus,
  type McpPairingRequest,
} from './services/mcpBridge';
import { McpPairDialog } from './components/McpPairDialog';
import { ComparisonView } from './components/ComparisonView';
import {
  requestPersistentStorage,
  type StoragePersistStatus,
} from './services/storagePersistence';
import { runMcpAction } from './services/mcpActions';

const DEFAULT_MCP_PORT = 4777;

function localTodayStr(): string {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}
import { VaultLockScreen } from './components/VaultLockScreen';
import { DashboardView } from './components/DashboardView';
import { TransactionsView } from './components/TransactionsView';
import { BudgetsView } from './components/BudgetsView';
import { AccountsView } from './components/AccountsView';
import { BackupSecurityView } from './components/BackupSecurityView';
import { TransactionModal } from './components/TransactionModal';
import { MyFBoxLogo } from './components/MyFBoxLogo';

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

  // Cotação USD/BRL via AwesomeAPI
  const [usdRate, setUsdRate] = useState<number | null>(() => vault?.settings.usdToBrlRate || null);
  const [rateRefreshing, setRateRefreshing] = useState(false);

  useEffect(() => {
    vaultRef.current = vault;
  }, [vault]);

  useEffect(() => {
    if (!session) return;
    let isMounted = true;
    fetchLiveUsdRate(false).then((info) => {
      if (!isMounted || !info) return;
      setUsdRate(info.rate);
      const currentVault = vaultRef.current;
      if (currentVault && currentVault.settings.usdToBrlRate !== info.rate) {
        persistVaultUpdate({
          ...currentVault,
          settings: {
            ...currentVault.settings,
            usdToBrlRate: info.rate,
            usdRateUpdatedAt: info.updatedAt,
          },
        });
      }
    });
    return () => {
      isMounted = false;
    };
  }, [session, persistVaultUpdate]);

  const handleRefreshUsdRate = useCallback(async () => {
    setRateRefreshing(true);
    const info = await fetchLiveUsdRate(true);
    if (info) {
      setUsdRate(info.rate);
      // Lê o cofre atual (não o capturado antes do await) para não sobrescrever
      // lançamentos salvos enquanto a cotação estava sendo buscada.
      const currentVault = vaultRef.current;
      if (currentVault) {
        await persistVaultUpdate({
          ...currentVault,
          settings: {
            ...currentVault.settings,
            usdToBrlRate: info.rate,
            usdRateUpdatedAt: info.updatedAt,
          },
        });
      }
      showToast(`Cotação atualizada: 1 USD = R$ ${info.rate.toFixed(2)}`);
    } else {
      showToast('Não foi possível obter a cotação no momento.');
    }
    setRateRefreshing(false);
  }, [persistVaultUpdate, showToast]);

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

      if (!isInput && !txModalOpen && (e.key === 'n' || e.key === 'N')) {
        e.preventDefault();
        handleOpenNewTransaction('expense');
      }
    };
    window.addEventListener('keydown', handleGlobalKey);
    return () => window.removeEventListener('keydown', handleGlobalKey);
  }, [session, vault, txModalOpen, handleOpenNewTransaction]);

  // Handlers de Autenticação e Criptografia
  const handleUnlockVault = async (password: string) => {
    if (!envelope) return;
    const { payload, session: unlockedSession } = await unlockEnvelopeWithPassword(
      envelope,
      password
    );
    // Cofres antigos (menos iterações PBKDF2) são recifrados com o padrão atual e sal novo
    const activeSession = needsKdfUpgrade(unlockedSession)
      ? await createNewCryptoSession(password)
      : unlockedSession;
    if (activeSession !== unlockedSession) {
      const upgraded = await encryptPayloadToEnvelope(payload, activeSession);
      await saveEncryptedEnvelopeToDisk(upgraded);
      envelopeRef.current = upgraded;
      setEnvelope(upgraded);
    }
    setSession(activeSession);
    setVault(payload);
    setHideValues(payload.settings.hideValuesByDefault || false);
  };

  const handleCreateVault = async (
    password: string,
    vaultName: string
  ) => {
    const newSession = await createNewCryptoSession(password);
    const initialPayload = createInitialVaultPayload(vaultName);
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
    // Backup antigo: regrava já com o KDF atual (mesma senha, sal novo)
    const restoredSession = needsKdfUpgrade(unlockedSession)
      ? await createNewCryptoSession(password)
      : unlockedSession;
    const freshEnvelope = await encryptPayloadToEnvelope(payload, restoredSession);
    await saveEncryptedEnvelopeToDisk(freshEnvelope);
    setEnvelope(freshEnvelope);
    setSession(restoredSession);
    setVault(payload);
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

  const handleToggleTransactionStatus = async (txId: string) => {
    if (!vault) return;
    const liveRate = usdRate || vault.settings.usdToBrlRate;
    const nextTransactions = vault.transactions.map((t): Transaction => {
      if (t.id !== txId) return t;
      const nextStatus = t.status === 'paid' ? 'pending' : 'paid';
      // Ao liquidar um lançamento em USD sem cotação fixada, fixa a cotação do dia
      const account = vault.accounts.find((a) => a.id === t.accountId);
      const involvesUsd = t.currency === 'USD' || accountCurrency(account ?? {}) === 'USD';
      const shouldFixRate =
        nextStatus === 'paid' && involvesUsd && !isValidRate(t.exchangeRate) && isValidRate(liveRate);
      return {
        ...t,
        status: nextStatus,
        exchangeRate: shouldFixRate ? liveRate : t.exchangeRate,
      };
    });
    await persistVaultUpdate({
      ...vault,
      transactions: nextTransactions,
    });
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
    await persistVaultUpdate({
      ...vault,
      categories: vault.categories.map((c) => (c.id === updatedCat.id ? updatedCat : c)),
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
    let remaining = vault.categories.filter((c) => c.id !== catId);
    const isInUse = vault.transactions.some((t) => t.categoryId === catId);
    // Lançamentos vão para uma categoria do MESMO tipo (nunca despesa → receita).
    // Se não houver nenhuma e a categoria estiver em uso, cria "Outros" desse tipo.
    let fallback = remaining.find((c) => c.type === deleted.type);
    if (!fallback && isInUse) {
      fallback = {
        id: `cat_other_${deleted.type}_${Date.now()}`,
        name: 'Outros',
        type: deleted.type,
        color: '#8C8C8C',
        icon: 'Tag',
      };
      remaining = [...remaining, fallback];
    }
    const fallbackId = fallback?.id;
    const nextTransactions = fallbackId
      ? vault.transactions.map((t) =>
          t.categoryId === catId ? { ...t, categoryId: fallbackId } : t
        )
      : vault.transactions;
    await persistVaultUpdate({
      ...vault,
      categories: remaining,
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
    const expCat =
      vault.categories.find((c) => c.type === 'expense')?.id || vault.categories[0]?.id || '';
    const incCat =
      vault.categories.find((c) => c.type === 'income')?.id || vault.categories[0]?.id || '';
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
              <span className="brand-title">MyFBox</span>
              <span className="vault-name-badge">{vault.settings.vaultName}</span>
            </div>
          </div>

          {/* Seletor de Mês Compacto */}
          <div className="month-navigator">
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
                title="Voltar ao mês atual"
              >
                Atual
              </button>
            )}
          </div>
        </div>

        {/* Abas de Navegação Centrais */}
        <nav className="workspace-tabs">
          <button
            type="button"
            className={`ws-tab ${activeTab === 'dashboard' ? 'active' : ''}`}
            onClick={() => setActiveTab('dashboard')}
          >
            <LayoutDashboard size={15} /> Visão Geral
          </button>
          <button
            type="button"
            className={`ws-tab ${activeTab === 'transactions' ? 'active' : ''}`}
            onClick={() => setActiveTab('transactions')}
          >
            <ReceiptText size={15} /> Lançamentos ({vault.transactions.length})
          </button>
          <button
            type="button"
            className={`ws-tab ${activeTab === 'compare' ? 'active' : ''}`}
            onClick={() => setActiveTab('compare')}
          >
            <BarChart3 size={15} /> Comparativos
          </button>
          <button
            type="button"
            className={`ws-tab ${activeTab === 'budgets' ? 'active' : ''}`}
            onClick={() => setActiveTab('budgets')}
          >
            <Target size={15} /> Metas
          </button>
          <button
            type="button"
            className={`ws-tab ${activeTab === 'accounts' ? 'active' : ''}`}
            onClick={() => setActiveTab('accounts')}
          >
            <Wallet size={15} /> Contas ({vault.accounts.length})
          </button>
          <button
            type="button"
            className={`ws-tab ${activeTab === 'security' ? 'active' : ''}`}
            onClick={() => setActiveTab('security')}
            title="Backups, Importação e Segurança"
          >
            <DatabaseBackup size={15} /> Backups
          </button>
        </nav>

        {/* Ações Rápidas no Topo */}
        <div className="header-right">
          {/* Cotação USD/BRL da AwesomeAPI */}
          <button
            type="button"
            className="currency-rate-chip"
            onClick={handleRefreshUsdRate}
            title={
              vault.settings.usdRateUpdatedAt
                ? `Cotação AwesomeAPI (USD Comercial)\nAtualizado em: ${vault.settings.usdRateUpdatedAt}\nClique para atualizar cotação`
                : 'Cotação AwesomeAPI (USD Comercial)\nClique para atualizar cotação'
            }
          >
            <span className="rate-chip-flag">🇺🇸</span>
            <span className="rate-chip-label">USD</span>
            <span className="rate-chip-val mono">
              {usdRate || vault.settings.usdToBrlRate
                ? `R$ ${(usdRate || vault.settings.usdToBrlRate)?.toFixed(2)}`
                : 'R$ —'}
            </span>
            <RefreshCw size={11} className={`rate-chip-icon ${rateRefreshing ? 'spinning' : ''}`} />
          </button>

          <button
            type="button"
            className="icon-action-btn"
            onClick={() => setHideValues((v) => !v)}
            title={hideValues ? 'Mostrar valores monetários' : 'Ocultar valores (Modo Privacidade)'}
          >
            {hideValues ? <Eye size={16} /> : <EyeOff size={16} />}
          </button>

          {envelope && (
            <button
              type="button"
              className="icon-action-btn"
              onClick={handleDownloadBackup}
              title="Baixar Backup Criptografado (.myfbox.json)"
            >
              <Download size={16} />
            </button>
          )}

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
        {activeTab === 'dashboard' && (
          <DashboardView
            selectedYearMonth={selectedYearMonth}
            onSelectYearMonth={setSelectedYearMonth}
            transactions={vault.transactions}
            categories={vault.categories}
            accounts={vault.accounts}
            hideValues={hideValues}
            usdToBrlRate={usdRate || vault.settings.usdToBrlRate}
            onToggleTransactionStatus={handleToggleTransactionStatus}
            onOpenNewTransaction={handleOpenNewTransaction}
            onNavigateTab={(tab) => setActiveTab(tab)}
          />
        )}

        {activeTab === 'transactions' && (
          <TransactionsView
            selectedYearMonth={selectedYearMonth}
            transactions={vault.transactions}
            categories={vault.categories}
            accounts={vault.accounts}
            hideValues={hideValues}
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
            onDeleteInsight={(month) =>
              persistVaultUpdate({
                ...vault,
                insights: (vault.insights ?? []).filter((i) => i.month !== month),
              })
            }
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
            onImportTransactions={(newTxs) =>
              persistVaultUpdate({
                ...vault,
                transactions: [...newTxs, ...vault.transactions],
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
      </main>

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
