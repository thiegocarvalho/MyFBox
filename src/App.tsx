import { useCallback, useEffect, useState } from 'react';
import {
  ShieldCheck,
  Lock,
  Eye,
  EyeOff,
  ChevronLeft,
  ChevronRight,
  LayoutDashboard,
  ReceiptText,
  Target,
  Wallet,
  DatabaseBackup,
  Plus,
  Download,
} from 'lucide-react';
import type {
  Account,
  Category,
  CryptoSession,
  EncryptedVaultEnvelope,
  Transaction,
  TransactionType,
  VaultPayload,
} from './types/finance';
import {
  createNewCryptoSession,
  deleteEncryptedVaultFromDisk,
  encryptPayloadToEnvelope,
  loadEncryptedEnvelopeFromDisk,
  saveEncryptedEnvelopeToDisk,
  unlockEnvelopeWithPassword,
} from './services/cryptoVault';
import { createInitialVaultPayload } from './services/defaultData';
import { downloadEncryptedBackupFile } from './services/importExport';
import {
  formatMonthYearLabel,
  getCurrentYearMonth,
  shiftYearMonth,
} from './utils/formatters';
import { VaultLockScreen } from './components/VaultLockScreen';
import { DashboardView } from './components/DashboardView';
import { TransactionsView } from './components/TransactionsView';
import { BudgetsView } from './components/BudgetsView';
import { AccountsView } from './components/AccountsView';
import { BackupSecurityView } from './components/BackupSecurityView';
import { TransactionModal } from './components/TransactionModal';

type ActiveTab = 'dashboard' | 'transactions' | 'budgets' | 'accounts' | 'security';

export function App() {
  const [loadingDisk, setLoadingDisk] = useState(true);
  const [envelope, setEnvelope] = useState<EncryptedVaultEnvelope | null>(null);
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
  const persistVaultUpdate = useCallback(
    async (nextVault: VaultPayload, activeSession: CryptoSession | null = session) => {
      if (!activeSession) return;
      const stamped: VaultPayload = {
        ...nextVault,
        updatedAt: new Date().toISOString(),
      };
      setVault(stamped);
      const newEnv = await encryptPayloadToEnvelope(stamped, activeSession);
      await saveEncryptedEnvelopeToDisk(newEnv);
      setEnvelope(newEnv);
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
    setSession(unlockedSession);
    setVault(payload);
    setHideValues(payload.settings.hideValuesByDefault || false);
  };

  const handleCreateVault = async (
    password: string,
    vaultName: string
  ) => {
    const newSession = await createNewCryptoSession(password);
    const initialPayload = createInitialVaultPayload(false, vaultName);
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
    const { payload, session: restoredSession } = await unlockEnvelopeWithPassword(
      importedEnvelope,
      password
    );
    const freshEnvelope = await encryptPayloadToEnvelope(payload, restoredSession);
    await saveEncryptedEnvelopeToDisk(freshEnvelope);
    setEnvelope(freshEnvelope);
    setSession(restoredSession);
    setVault(payload);
    setActiveTab('dashboard');
  };

  const handleResetVault = async () => {
    await deleteEncryptedVaultFromDisk();
    setEnvelope(null);
    setSession(null);
    setVault(null);
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
    const nextTransactions = vault.transactions.map((t) =>
      t.id === txId ? { ...t, status: t.status === 'paid' ? 'pending' : 'paid' } : t
    ) as Transaction[];
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
    const remaining = vault.categories.filter((c) => c.id !== catId);
    if (remaining.length === 0) return;
    const fallbackId = remaining[0].id;
    const nextTransactions = vault.transactions.map((t) =>
      t.categoryId === catId ? { ...t, categoryId: fallbackId } : t
    );
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
    const fallbackAccId = remaining[0].id;
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
    const fromName = vault.accounts.find((a) => a.id === fromAccId)?.name || 'Origem';
    const toName = vault.accounts.find((a) => a.id === toAccId)?.name || 'Destino';
    const expCat =
      vault.categories.find((c) => c.type === 'expense')?.id || vault.categories[0]?.id || '';
    const incCat =
      vault.categories.find((c) => c.type === 'income')?.id || vault.categories[0]?.id || '';
    const nowIso = new Date().toISOString();

    const outTx: Transaction = {
      id: `tx_trf_out_${Date.now()}`,
      description: `${description} (Para ${toName})`,
      amount,
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
      amount,
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
        onResetVault={handleResetVault}
      />
    );
  }

  return (
    <div className="app-shell">
      {/* Topbar Unificada e Limpa */}
      <header className="workspace-header">
        <div className="header-left">
          <div className="brand-block">
            <div className="brand-mark">MF</div>
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
              onClick={() => downloadEncryptedBackupFile(envelope, vault.settings.vaultName)}
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
            onUpdateCategory={handleUpdateCategory}
            onAddCategory={handleAddCategory}
            onDeleteCategory={handleDeleteCategory}
          />
        )}

        {activeTab === 'accounts' && (
          <AccountsView
            accounts={vault.accounts}
            transactions={vault.transactions}
            hideValues={hideValues}
            onAddAccount={handleAddAccount}
            onUpdateAccount={handleUpdateAccount}
            onDeleteAccount={handleDeleteAccount}
            onTransferBetweenAccounts={handleTransferBetweenAccounts}
          />
        )}

        {activeTab === 'security' && (
          <BackupSecurityView
            vaultName={vault.settings.vaultName}
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
          onSave={handleSaveTransactions}
          onClose={() => {
            setTxModalOpen(false);
            setEditingTx(null);
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
