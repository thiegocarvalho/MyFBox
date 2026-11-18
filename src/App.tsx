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
  Bot,
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
import { downloadEncryptedBackupFile } from './services/importExport';
import {
  formatMonthYearLabel,
  getCurrentYearMonth,
  localTodayStr,
  shiftYearMonth,
} from './utils/formatters';
import { formatRate, normalizeCurrency } from './services/currencyService';
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
import { generateEntityId } from './domain/id';
import {
  addAccountInVault,
  addCategoryInVault,
  deleteAccountInVault,
  deleteCategoryInVault,
  deleteTransactionInVault,
  removeVaultExchangeRate,
  saveTransactionsInVault,
  setTransactionStatusInVault,
  transferBetweenAccountsInVault,
  updateAccountInVault,
  updateCategoryInVault,
  upsertVaultExchangeRate,
} from './domain/vaultUseCases';
import { VaultLockScreen } from './components/VaultLockScreen';
import { MyFBoxBrand } from './components/MyFBoxLogo';
import { MobileMenu, MobileMenuButton, type NavItem } from './components/MobileMenu';
import { LanguageSelector } from './components/LanguageSelector';
import {
  getActiveLanguage,
  getLanguageMeta,
  setActiveLanguage,
  type AppLanguage,
} from './i18n';
import { useI18n } from './i18n/useI18n';

const DEFAULT_MCP_PORT = 4777;

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

const DashboardView = lazy(() =>
  viewLoaders.DashboardView().then((m) => ({ default: m.DashboardView }))
);
const TransactionsView = lazy(() =>
  viewLoaders.TransactionsView().then((m) => ({ default: m.TransactionsView }))
);
const ComparisonView = lazy(() =>
  viewLoaders.ComparisonView().then((m) => ({ default: m.ComparisonView }))
);
const BudgetsView = lazy(() =>
  viewLoaders.BudgetsView().then((m) => ({ default: m.BudgetsView }))
);
const AccountsView = lazy(() =>
  viewLoaders.AccountsView().then((m) => ({ default: m.AccountsView }))
);
const BackupSecurityView = lazy(() =>
  viewLoaders.BackupSecurityView().then((m) => ({ default: m.BackupSecurityView }))
);
const TransactionModal = lazy(() =>
  viewLoaders.TransactionModal().then((m) => ({ default: m.TransactionModal }))
);
const McpPairDialog = lazy(() =>
  viewLoaders.McpPairDialog().then((m) => ({ default: m.McpPairDialog }))
);

function prefetchViews() {
  const run = () => Object.values(viewLoaders).forEach((load) => void load());
  if ('requestIdleCallback' in window) window.requestIdleCallback(run, { timeout: 2000 });
  else setTimeout(run, 300);
}

type ActiveTab = 'dashboard' | 'transactions' | 'compare' | 'budgets' | 'accounts' | 'security';

export function App() {
  const { language, t } = useI18n();
  const [loadingDisk, setLoadingDisk] = useState(true);
  const [envelope, setEnvelope] = useState<EncryptedVaultEnvelope | null>(null);
  const envelopeRef = useRef<EncryptedVaultEnvelope | null>(null);
  useEffect(() => {
    envelopeRef.current = envelope;
  }, [envelope]);

  const [session, setSession] = useState<CryptoSession | null>(null);
  const [vault, setVault] = useState<VaultPayload | null>(null);

  const [activeTab, setActiveTab] = useState<ActiveTab>('dashboard');
  const [selectedYearMonth, setSelectedYearMonth] = useState<string>(getCurrentYearMonth());
  const [hideValues, setHideValues] = useState<boolean>(false);

  const [txModalOpen, setTxModalOpen] = useState<boolean>(false);
  const [txModalInitialType, setTxModalInitialType] = useState<TransactionType>('expense');
  const [editingTx, setEditingTx] = useState<Transaction | null>(null);
  const [duplicatingTx, setDuplicatingTx] = useState<Transaction | null>(null);

  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const toastTimerRef = useRef<number | null>(null);
  const showToast = useCallback((msg: string) => {
    if (toastTimerRef.current !== null) {
      window.clearTimeout(toastTimerRef.current);
    }
    setToastMessage(msg);
    toastTimerRef.current = window.setTimeout(() => {
      setToastMessage(null);
      toastTimerRef.current = null;
    }, 3200);
  }, []);

  useEffect(() => {
    return () => {
      if (toastTimerRef.current !== null) {
        window.clearTimeout(toastTimerRef.current);
      }
    };
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

  const vaultRef = useRef<VaultPayload | null>(vault);
  const writeChainRef = useRef<Promise<void>>(Promise.resolve());

  const lockVault = useCallback(() => {
    vaultRef.current = null;
    setSession(null);
    setVault(null);
    setTxModalOpen(false);
    setEditingTx(null);
    setDuplicatingTx(null);
  }, []);

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

  const usdRate = vault?.settings.usdToBrlRate ?? null;

  useEffect(() => {
    vaultRef.current = vault;
  }, [vault]);

  const handleSaveExchangeRate = useCallback(
    async (fromRaw: string, toRaw: string, newRate: number) => {
      const currentVault = vaultRef.current;
      if (!currentVault) return;
      const from = normalizeCurrency(fromRaw);
      const to = normalizeCurrency(toRaw);
      if (!from || !to) return;
      const nextVault = upsertVaultExchangeRate(currentVault, from, to, newRate, 'manual');
      await persistVaultUpdate(nextVault);
      showToast(t('app.toast.rateSaved', { from, rate: formatRate(newRate), to }));
    },
    [persistVaultUpdate, showToast, t]
  );

  const handleDeleteExchangeRate = useCallback(
    async (fromRaw: string, toRaw: string) => {
      const currentVault = vaultRef.current;
      if (!currentVault) return;
      const from = normalizeCurrency(fromRaw);
      const to = normalizeCurrency(toRaw);
      if (!from || !to) return;
      const nextVault = removeVaultExchangeRate(currentVault, from, to);
      await persistVaultUpdate(nextVault);
      showToast(t('app.toast.rateDeleted', { from, to }));
    },
    [persistVaultUpdate, showToast, t]
  );

  const handleUpdateManualUsdRate = useCallback(
    async (newRate: number) => {
      await handleSaveExchangeRate('USD', 'BRL', newRate);
    },
    [handleSaveExchangeRate]
  );

  const [storageStatus, setStorageStatus] = useState<StoragePersistStatus>('unsupported');
  const handleRequestPersist = useCallback(async () => {
    const status = await requestPersistentStorage();
    setStorageStatus(status);
    return status;
  }, []);
  useEffect(() => {
    if (!session) return;
    let alive = true;
    requestPersistentStorage().then((status) => {
      if (alive) setStorageStatus(status);
    });
    return () => {
      alive = false;
    };
  }, [session]);

  const [mcpStatus, setMcpStatus] = useState<McpBridgeStatus>('off');
  const [mcpDetail, setMcpDetail] = useState<string | undefined>();
  const [securityConfigTarget, setSecurityConfigTarget] = useState<{
    tab: 'all' | 'mcp';
    key: number;
  }>({ tab: 'all', key: 0 });
  const mcpQueueRef = useRef<Promise<unknown>>(Promise.resolve());
  const persistRef = useRef(persistVaultUpdate);
  const usdRateRef = useRef<number | undefined>(undefined);
  const showToastRef = useRef(showToast);
  const tRef = useRef(t);

  useEffect(() => {
    persistRef.current = persistVaultUpdate;
    showToastRef.current = showToast;
    tRef.current = t;
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
      onCall: (action, args) => {
        const run = mcpQueueRef.current.then(async () => {
          const current = vaultRef.current;
          if (!current) throw new Error(tRef.current('app.error.vaultLocked'));

          if (action === 'export_backup') {
            await persistRef.current({
              ...current,
              settings: { ...current.settings, lastBackupAt: new Date().toISOString() },
            });
            const env = envelopeRef.current;
            if (!env || env.cipher?.algorithm !== 'AES-256-GCM' || !env.cipher?.ciphertextBase64) {
              throw new Error(tRef.current('app.error.noValidEnvelope'));
            }
            const result = {
              envelope: env,
              vaultName: current.settings.vaultName,
              keyFingerprint: env.keyFingerprint,
              envelopeUpdatedAt: env.updatedAt,
              transactionCount: current.transactions.length,
            };
            showToastRef.current(tRef.current('app.toast.mcpBackupSaved'));
            return result;
          }

          const { runMcpAction } = await import('./services/mcpActions');
          const outcome = runMcpAction(action, current, args, {
            usdToBrlRate: usdRateRef.current,
            today: localTodayStr(),
            nowIso: new Date().toISOString(),
            newId: (prefix) => generateEntityId(prefix),
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

  const handleOpenNewTransaction = useCallback((type: TransactionType) => {
    setEditingTx(null);
    setDuplicatingTx(null);
    setTxModalInitialType(type);
    setTxModalOpen(true);
  }, []);

  useEffect(() => {
    if (session) prefetchViews();
  }, [session]);

  const [menuOpen, setMenuOpen] = useState(false);
  const menuButtonRef = useRef<HTMLButtonElement>(null);
  const closeMenu = useCallback(() => {
    setMenuOpen(false);
    menuButtonRef.current?.focus();
  }, []);

  useEffect(() => {
    document
      .querySelector('.workspace-tabs .ws-tab.active')
      ?.scrollIntoView({ block: 'nearest', inline: 'nearest' });
  }, [activeTab, session]);

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

  const handleUnlockVault = async (password: string) => {
    if (!envelope) return;
    const { payload, normalized, session: unlockedSession } = await unlockEnvelopeWithPassword(
      envelope,
      password
    );

    const activeSession = needsKdfUpgrade(unlockedSession)
      ? await createNewCryptoSession(password)
      : unlockedSession;
    if (normalized || activeSession !== unlockedSession) {
      const upgraded = await encryptPayloadToEnvelope(payload, activeSession);
      await saveEncryptedEnvelopeToDisk(upgraded);
      envelopeRef.current = upgraded;
      setEnvelope(upgraded);
    }
    vaultRef.current = payload;
    setSession(activeSession);
    setVault(payload);
    setHideValues(payload.settings.hideValuesByDefault || false);
    if (payload.settings.language) {
      setActiveLanguage(payload.settings.language);
    }
  };

  const handleCreateVault = async (
    password: string,
    vaultName: string,
    initialAccount?: InitialAccountData
  ) => {
    const newSession = await createNewCryptoSession(password);
    const initialPayload = createInitialVaultPayload(vaultName, initialAccount);
    initialPayload.settings.language = getActiveLanguage();
    const newEnv = await encryptPayloadToEnvelope(initialPayload, newSession);
    await saveEncryptedEnvelopeToDisk(newEnv);
    envelopeRef.current = newEnv;
    vaultRef.current = initialPayload;
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

    const restoredSession = needsKdfUpgrade(unlockedSession)
      ? await createNewCryptoSession(password)
      : unlockedSession;
    const freshEnvelope = await encryptPayloadToEnvelope(payload, restoredSession);
    await saveEncryptedEnvelopeToDisk(freshEnvelope);
    envelopeRef.current = freshEnvelope;
    vaultRef.current = payload;
    setEnvelope(freshEnvelope);
    setSession(restoredSession);
    setVault(payload);
    if (payload.settings.language) {
      setActiveLanguage(payload.settings.language);
    }
    setActiveTab('dashboard');
  };

  const handleDownloadBackup = async () => {
    if (!envelope || !vault) return;
    downloadEncryptedBackupFile(envelope, vault.settings.vaultName);
    await persistVaultUpdate({
      ...vault,
      settings: { ...vault.settings, lastBackupAt: new Date().toISOString() },
    });
  };

  const handleDeleteVault = async (password: string) => {
    const env = envelopeRef.current;
    if (!env) throw new Error(t('app.error.noVaultStored'));
    await unlockEnvelopeWithPassword(env, password);
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

  const handleHeaderLanguageChange = useCallback(
    async (nextLang: AppLanguage) => {
      setActiveLanguage(nextLang);
      const currentVault = vaultRef.current;
      if (currentVault) {
        await persistVaultUpdate({
          ...currentVault,
          settings: { ...currentVault.settings, language: nextLang },
        });
      }
    },
    [persistVaultUpdate]
  );

  const handleSaveTransactions = async (txsToSave: Transaction[], isEdit: boolean) => {
    if (!vault) return;
    const nextVault = saveTransactionsInVault(vault, txsToSave, isEdit);
    if (isEdit && txsToSave.length === 1) {
      showToast(t('app.toast.txUpdated', { description: txsToSave[0].description }));
    } else {
      const count = txsToSave.length;
      showToast(
        count === 1
          ? t('app.toast.txSaved', { description: txsToSave[0].description })
          : t('app.toast.txsSaved', { count })
      );
    }
    await persistVaultUpdate(nextVault);
    setTxModalOpen(false);
    setEditingTx(null);
    setDuplicatingTx(null);
  };

  const setTransactionStatus = async (
    txId: string,
    nextStatus: Transaction['status'],
    paidAt?: string,
    accountId?: string
  ) => {
    if (!vault) return;
    const nextVault = setTransactionStatusInVault(
      vault,
      txId,
      nextStatus,
      localTodayStr(),
      paidAt,
      accountId
    );
    await persistVaultUpdate(nextVault);
  };

  const handleToggleTransactionStatus = async (txId: string) => {
    const tx = vault?.transactions.find((t) => t.id === txId);
    if (!tx) return;
    await setTransactionStatus(txId, tx.status === 'paid' ? 'pending' : 'paid');
  };

  const handleSettleTransaction = async (
    txId: string,
    paidAt: string,
    accountId?: string
  ) => {
    await setTransactionStatus(txId, 'paid', paidAt, accountId);
  };

  const handleDeleteTransaction = async (txId: string) => {
    if (!vault) return;
    await persistVaultUpdate(deleteTransactionInVault(vault, txId));
  };

  const handleDuplicateTransaction = (tx: Transaction) => {
    setEditingTx(null);
    setDuplicatingTx(tx);
    setTxModalOpen(true);
  };

  const handleUpdateCategory = async (updatedCat: Category) => {
    if (!vault) return;
    await persistVaultUpdate(updateCategoryInVault(vault, updatedCat));
  };

  const handleAddCategory = async (newCat: Category) => {
    if (!vault) return;
    await persistVaultUpdate(addCategoryInVault(vault, newCat));
  };

  const handleDeleteCategory = async (catId: string) => {
    if (!vault) return;
    const nextVault = deleteCategoryInVault(vault, catId);
    if (!nextVault) return;
    await persistVaultUpdate(nextVault);
  };

  const handleAddAccount = async (acc: Account) => {
    if (!vault) return;
    await persistVaultUpdate(addAccountInVault(vault, acc));
  };

  const handleUpdateAccount = async (acc: Account) => {
    if (!vault) return;
    await persistVaultUpdate(updateAccountInVault(vault, acc));
  };

  const handleDeleteAccount = async (accId: string) => {
    if (!vault) return;
    const nextVault = deleteAccountInVault(vault, accId);
    if (!nextVault) return;
    await persistVaultUpdate(nextVault);
  };

  const handleTransferBetweenAccounts = async (
    fromAccId: string,
    toAccId: string,
    amount: number,
    date: string,
    description: string
  ) => {
    if (!vault) return;
    const result = transferBetweenAccountsInVault(vault, {
      fromAccId,
      toAccId,
      amount,
      date,
      description,
    });
    if ('error' in result) {
      showToast(result.error);
      return;
    }
    await persistVaultUpdate(result.nextVault);
  };

  if (loadingDisk) {
    return <div className="loading-screen mono">{t('app.loadingVault')}</div>;
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

  const navItems: NavItem<ActiveTab>[] = [
    { id: 'dashboard', label: t('nav.dashboard'), icon: LayoutDashboard },
    {
      id: 'transactions',
      label: t('nav.transactions'),
      icon: ReceiptText,
      count: vault.transactions.length,
    },
    { id: 'compare', label: t('nav.compare'), icon: BarChart3 },
    { id: 'budgets', label: t('nav.budgets'), icon: Target },
    { id: 'accounts', label: t('nav.accounts'), icon: Wallet, count: vault.accounts.length },
    { id: 'security', label: t('nav.security'), icon: Settings },
  ];

  const currentMonthLabel = formatMonthYearLabel(getCurrentYearMonth());

  return (
    <div className="app-shell">
      <header className="workspace-header">
        <div className="header-left">
          <MyFBoxBrand size={40} />

          <div
            className={`month-navigator ${selectedYearMonth !== getCurrentYearMonth() ? 'is-away' : ''}`}
          >
            <button
              type="button"
              className="month-nav-btn"
              onClick={() => setSelectedYearMonth((ym) => shiftYearMonth(ym, -1))}
              title={t('app.month.prevTitle')}
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
              title={t('app.month.nextTitle')}
            >
              <ChevronRight size={16} />
            </button>
            {selectedYearMonth !== getCurrentYearMonth() && (
              <button
                type="button"
                className="month-today-btn"
                onClick={() => setSelectedYearMonth(getCurrentYearMonth())}
                aria-label={t('app.month.backToCurrentAria', { month: currentMonthLabel })}
                title={t('app.month.backToCurrentAria', { month: currentMonthLabel })}
              >
                <Undo2 size={15} strokeWidth={2.5} aria-hidden />
                <span className="month-today-long">{t('app.month.currentLong')}</span>
                <span className="month-today-short">{t('app.month.currentShort')}</span>
              </button>
            )}
          </div>
        </div>

        <nav className="workspace-tabs" aria-label={t('menu.sectionsAria')}>
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

        <div className="header-right">
          <LanguageSelector
            variant="compact"
            value={vault?.settings.language ?? language}
            onChange={handleHeaderLanguageChange}
          />
          <button
            type="button"
            className={`mcp-header-btn status-${mcpStatus}`}
            onClick={() => {
              setSecurityConfigTarget((prev) => ({ tab: 'mcp', key: prev.key + 1 }));
              setActiveTab('security');
            }}
            title={
              mcpStatus === 'connected'
                ? t('app.mcp.titleConnected')
                : mcpStatus === 'connecting'
                ? t('app.mcp.titleConnecting')
                : mcpStatus === 'error'
                ? mcpDetail
                  ? t('app.mcp.titleErrorDetail', { detail: mcpDetail })
                  : t('app.mcp.titleError')
                : t('app.mcp.titleOff')
            }
            aria-label={t('app.mcp.aria', { status: mcpStatus })}
          >
            <span className="mcp-header-dot" aria-hidden />
            <Bot size={15} aria-hidden />
            <span className="mcp-header-label">MCP</span>
          </button>

          <button
            type="button"
            className="icon-action-btn"
            onClick={() => setHideValues((v) => !v)}
            title={hideValues ? t('app.privacy.showTitle') : t('app.privacy.hideTitle')}
          >
            {hideValues ? <Eye size={16} /> : <EyeOff size={16} />}
          </button>

          <button
            type="button"
            className="icon-action-btn lock"
            onClick={lockVault}
            title={t('app.lockVaultTitle')}
          >
            <Lock size={15} />
          </button>

          <button
            type="button"
            className="btn-primary btn-sm"
            onClick={() => handleOpenNewTransaction('expense')}
            title={t('app.newTxTitle')}
          >
            <Plus size={15} /> {t('app.newTxButton')}
          </button>
        </div>
      </header>

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
              rateSource={vault.settings}
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
              rateSource={vault.settings}
              onOpenNewTransaction={handleOpenNewTransaction}
              onEditTransaction={(tx) => {
                setDuplicatingTx(null);
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
              rateSource={vault.settings}
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
              rateSource={vault.settings}
            />
          )}

          {activeTab === 'accounts' && (
            <AccountsView
              accounts={vault.accounts}
              transactions={vault.transactions}
              hideValues={hideValues}
              usdToBrlRate={usdRate || vault.settings.usdToBrlRate}
              rateSource={vault.settings}
              selectedYearMonth={selectedYearMonth}
              onAddAccount={handleAddAccount}
              onUpdateAccount={handleUpdateAccount}
              onDeleteAccount={handleDeleteAccount}
              onTransferBetweenAccounts={handleTransferBetweenAccounts}
            />
          )}

          {activeTab === 'security' && (
            <BackupSecurityView
              key={securityConfigTarget.key}
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
              language={vault.settings.language ?? language}
              onUpdateLanguage={async (nextLang: AppLanguage) => {
                setActiveLanguage(nextLang);
                await persistVaultUpdate({
                  ...vault,
                  settings: { ...vault.settings, language: nextLang },
                });
                showToast(
                  t('language.savedToast', { language: getLanguageMeta(nextLang).label })
                );
              }}
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
                    ? t('app.toast.storagePersisted')
                    : status === 'unsupported'
                      ? t('app.toast.storageUnsupported')
                      : t('app.toast.storageDenied')
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
              initialConfigTab={securityConfigTarget.tab}
            />
          )}
        </Suspense>
      </main>

      <Suspense fallback={null}>
        {txModalOpen && (
          <TransactionModal
            initialType={txModalInitialType}
            editingTransaction={editingTx}
            duplicatingTransaction={duplicatingTx}
            categories={vault.categories}
            accounts={vault.accounts}
            transactions={vault.transactions}
            defaultYearMonth={selectedYearMonth}
            usdToBrlRate={usdRate || vault.settings.usdToBrlRate}
            rateSource={vault.settings}
            onCreateCategory={handleAddCategory}
            onSave={handleSaveTransactions}
            onClose={() => {
              setTxModalOpen(false);
              setEditingTx(null);
              setDuplicatingTx(null);
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
              showToast(t('app.toast.mcpApproved'));
            }}
            onReject={() => {
              setPendingPair(null);
              showToast(t('app.toast.mcpRejected'));
            }}
          />
        )}
      </Suspense>

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
