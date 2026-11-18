import React, { Suspense, lazy, useEffect, useRef, useState } from 'react';
import {
  ShieldCheck,
  Download,
  Upload,
  FileSpreadsheet,
  KeyRound,
  Terminal,
  CheckCircle2,
  AlertTriangle,
  Clock,
  Fingerprint,
  FileCheck,
  ChevronDown,
  Bot,
  Unlink,
  HardDrive,
  Plus,
  Trash2,
  Edit3,
  SlidersHorizontal,
  Coins,
  BookOpen,
  Check,
  Copy,
} from 'lucide-react';
import type {
  Account,
  AppLanguage,
  Category,
  EncryptedVaultEnvelope,
  ExchangeRate,
  Transaction,
  VaultSettings,
} from '../types/finance';
import { LanguageSelector } from './LanguageSelector';
import { useI18n } from '../i18n/useI18n';
import { exportTransactionsToCSV } from '../services/importExport';
import { passwordStrength } from '../utils/password';
import { parseDecimalInput } from '../utils/money';
import { mcpShortCode, type McpBridgeStatus } from '../services/mcpBridge';
import { buildMcpSetupInfo } from '../utils/mcpConfig';
import type { StoragePersistStatus } from '../services/storagePersistence';
import {
  POPULAR_CURRENCIES,
  formatRate,
  getCurrencyInfo,
  getVaultExchangeRates,
  normalizeCurrency,
} from '../services/currencyService';

const McpInstructionsModal = lazy(() =>
  import('./McpInstructionsModal').then((m) => ({ default: m.McpInstructionsModal }))
);

const AUTO_LOCK_OPTIONS = [5, 15, 30, 60];
const BACKUP_STALE_DAYS = 7;

function daysSince(iso: string | undefined): number | null {
  if (!iso) return null;
  const t = new Date(iso).getTime();
  if (Number.isNaN(t)) return null;
  return Math.floor((Date.now() - t) / 86_400_000);
}

type ConfigTab = 'all' | 'security' | 'backups' | 'currency' | 'mcp' | 'danger';

interface BackupSecurityViewProps {
  envelope: EncryptedVaultEnvelope | null;
  transactions: Transaction[];
  categories: Category[];
  accounts: Account[];
  autoLockMinutes: number;
  onUpdateAutoLockMinutes: (mins: number) => void;
  language?: AppLanguage;
  onUpdateLanguage?: (lang: AppLanguage) => Promise<void> | void;
  onChangeMasterPassword: (newPassword: string) => Promise<void>;
  onRestoreBackupEnvelope: (envelope: EncryptedVaultEnvelope, password: string) => Promise<void>;
  lastBackupAt?: string;
  onDownloadBackup: () => void;
  onDeleteVault: (password: string) => Promise<void>;
  storageStatus: StoragePersistStatus;
  onRequestPersist: () => void;
  usdRate?: number;
  usdRateUpdatedAt?: string;
  exchangeRates?: ExchangeRate[];
  onSaveExchangeRate?: (from: string, to: string, rate: number) => Promise<void>;
  onDeleteExchangeRate?: (from: string, to: string) => Promise<void>;
  onUpdateManualUsdRate?: (rate: number) => Promise<void>;
  mcp: {
    enabled: boolean;
    token?: string;
    port: number;
    status: McpBridgeStatus;
    detail?: string;
  };
  onUpdateMcpSettings: (
    patch: Partial<Pick<VaultSettings, 'mcpEnabled' | 'mcpToken' | 'mcpPort'>>
  ) => void;
  initialConfigTab?: ConfigTab;
}

export const BackupSecurityView: React.FC<BackupSecurityViewProps> = ({
  envelope,
  transactions,
  categories,
  accounts,
  autoLockMinutes,
  onUpdateAutoLockMinutes,
  language,
  onUpdateLanguage,
  onChangeMasterPassword,
  onRestoreBackupEnvelope,
  lastBackupAt,
  onDownloadBackup,
  onDeleteVault,
  storageStatus,
  onRequestPersist,
  usdRate,
  usdRateUpdatedAt,
  exchangeRates,
  onSaveExchangeRate,
  onDeleteExchangeRate,
  onUpdateManualUsdRate,
  mcp,
  onUpdateMcpSettings,
  initialConfigTab,
}) => {
  const { t, language: activeLanguage } = useI18n();

  const mcpStatusLabel = (status: McpBridgeStatus) => {
    switch (status) {
      case 'off':
        return t('backup.mcp.statusOff');
      case 'connecting':
        return t('backup.mcp.statusConnecting');
      case 'connected':
        return t('backup.mcp.statusConnected');
      case 'error':
        return t('backup.mcp.statusError');
    }
  };

  const autoLockInfo = (mins: number) => {
    if (mins === 5) return { title: t('backup.autolock.5.title'), desc: t('backup.autolock.5.desc') };
    if (mins === 15) return { title: t('backup.autolock.15.title'), desc: t('backup.autolock.15.desc') };
    if (mins === 30) return { title: t('backup.autolock.30.title'), desc: t('backup.autolock.30.desc') };
    if (mins === 60) return { title: t('backup.autolock.60.title'), desc: t('backup.autolock.60.desc') };
    return { title: t('backup.autolock.customTitle', { minutes: mins }), desc: '' };
  };

  const describeBackupAge = (days: number | null): string => {
    if (days === null) return t('backup.age.never');
    if (days === 0) return t('backup.age.today');
    if (days === 1) return t('backup.age.yesterday');
    return t('backup.age.daysAgo', { days });
  };
  const [deletePassword, setDeletePassword] = useState('');
  const [deleteConfirmed, setDeleteConfirmed] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [deleteError, setDeleteError] = useState<string | null>(null);

  const handleDeleteVaultSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!deleteConfirmed || !deletePassword) return;
    setDeleting(true);
    setDeleteError(null);
    try {
      await onDeleteVault(deletePassword);
    } catch {
      setDeleteError(t('backup.delete.wrongPassword'));
      setDeleting(false);
    }
  };

  const [mcpCodeFor, setMcpCodeFor] = useState<{ token: string; code: string } | null>(null);
  useEffect(() => {
    if (!mcp.token) return;
    let alive = true;
    const token = mcp.token;
    mcpShortCode(token).then((code) => alive && setMcpCodeFor({ token, code }));
    return () => {
      alive = false;
    };
  }, [mcp.token]);
  const mcpCode = mcpCodeFor && mcpCodeFor.token === mcp.token ? mcpCodeFor.code : null;

  const toggleMcp = () => onUpdateMcpSettings({ mcpEnabled: !mcp.enabled });
  const [dragTarget, setDragTarget] = useState<'backup' | null>(null);
  const [restoring, setRestoring] = useState(false);
  const [feedback, setFeedback] = useState<{ type: 'ok' | 'err'; text: string } | null>(null);
  const [showMcpInstructions, setShowMcpInstructions] = useState(false);
  const [activeConfigTab, setActiveConfigTab] = useState<ConfigTab>(initialConfigTab ?? 'all');
  const [desktopVaultPath, setDesktopVaultPath] = useState<string | null>(null);
  const [desktopMcpPath, setDesktopMcpPath] = useState<string | null>(null);
  const [copiedMcpItem, setCopiedMcpItem] = useState<'json' | 'cli' | 'prompt' | null>(null);
  const mcpSetup = buildMcpSetupInfo({ desktopMcpPath });

  const copyMcpSnippet = (kind: 'json' | 'cli' | 'prompt', text: string) => {
    void navigator.clipboard?.writeText(text).catch(() => undefined);
    setCopiedMcpItem(kind);
    setTimeout(() => {
      setCopiedMcpItem((prev) => (prev === kind ? null : prev));
    }, 2000);
  };

  useEffect(() => {
    const vaultApi = window.myfboxDesktop?.vault;
    if (!vaultApi) return;
    let alive = true;
    vaultApi.info().then((info) => {
      if (alive) setDesktopVaultPath(info.filePath);
    }).catch(() => {});
    return () => {
      alive = false;
    };
  }, [envelope]);

  useEffect(() => {
    const mcpApi = window.myfboxDesktop?.mcp;
    if (!mcpApi) return;
    let alive = true;
    mcpApi.info().then((info) => {
      if (alive && info?.serverPath) setDesktopMcpPath(info.serverPath);
    }).catch(() => {});
    return () => {
      alive = false;
    };
  }, []);

  const [newPassword, setNewPassword] = useState('');
  const [confirmNewPassword, setConfirmNewPassword] = useState('');
  const [changingPw, setChangingPw] = useState(false);

  const [backupToRestore, setBackupToRestore] = useState<EncryptedVaultEnvelope | null>(null);
  const [backupFileName, setBackupFileName] = useState('');
  const [backupPassword, setBackupPassword] = useState('');

  const [isAddingRate, setIsAddingRate] = useState(false);
  const [editingPair, setEditingPair] = useState<string | null>(null);
  const [rateFromInput, setRateFromInput] = useState('USD');
  const [rateToInput, setRateToInput] = useState('BRL');
  const [rateValueInput, setRateValueInput] = useState('');
  const [rateFormError, setRateFormError] = useState<string | null>(null);

  const allRates = getVaultExchangeRates({
    exchangeRates,
    usdToBrlRate: usdRate,
    usdRateUpdatedAt,
  });

  const handleRateFormSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setRateFormError(null);
    const from = normalizeCurrency(rateFromInput);
    const to = normalizeCurrency(rateToInput);
    if (!from || !to) {
      setRateFormError(t('backup.currency.errorMissingCodes'));
      return;
    }
    if (from === to) {
      setRateFormError(t('backup.currency.errorSameCurrency'));
      return;
    }
    const val = parseDecimalInput(rateValueInput);
    if (!Number.isFinite(val) || val <= 0) {
      setRateFormError(t('backup.currency.errorInvalidRate'));
      return;
    }
    if (onSaveExchangeRate) {
      await onSaveExchangeRate(from, to, val);
    } else if (onUpdateManualUsdRate && from === 'USD' && to === 'BRL') {
      await onUpdateManualUsdRate(val);
    }
    setIsAddingRate(false);
    setEditingPair(null);
    setRateValueInput('');
  };

  const startEditRate = (from: string, to: string, currentRate: number) => {
    setRateFromInput(from);
    setRateToInput(to);
    setRateValueInput(currentRate.toString().replace('.', ','));
    setEditingPair(`${from}/${to}`);
    setIsAddingRate(true);
    setRateFormError(null);
  };

  const startNewRate = () => {
    setRateFromInput('USD');
    setRateToInput('BRL');
    setRateValueInput('');
    setEditingPair(null);
    setIsAddingRate(true);
    setRateFormError(null);
  };

  const cancelRateForm = () => {
    setIsAddingRate(false);
    setEditingPair(null);
    setRateValueInput('');
    setRateFormError(null);
  };

  const handleDeleteRate = async (from: string, to: string) => {
    if (onDeleteExchangeRate) {
      await onDeleteExchangeRate(from, to);
    }
  };

  const backupFileInputRef = useRef<HTMLInputElement>(null);

  const pwStrength = passwordStrength(newPassword);
  const pwMatches = confirmNewPassword.length > 0 && confirmNewPassword === newPassword;

  const handlePasswordChangeSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (newPassword.length < 8) {
      setFeedback({ type: 'err', text: t('backup.password.errorMinLength') });
      return;
    }
    if (pwStrength.score === 0) {
      setFeedback({
        type: 'err',
        text: pwStrength.tip ?? t('backup.password.errorPredictable'),
      });
      return;
    }
    if (newPassword !== confirmNewPassword) {
      setFeedback({ type: 'err', text: t('backup.password.errorMismatch') });
      return;
    }
    setChangingPw(true);
    setFeedback(null);
    try {
      await onChangeMasterPassword(newPassword);
      setNewPassword('');
      setConfirmNewPassword('');
      setFeedback({
        type: 'ok',
        text: t('backup.password.success'),
      });
    } catch (err) {
      setFeedback({
        type: 'err',
        text: err instanceof Error ? err.message : t('backup.password.errorReencrypt'),
      });
    } finally {
      setChangingPw(false);
    }
  };

  const handleSelectBackupFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (file) void loadBackupFile(file);
  };

  const loadBackupFile = async (file: File) => {
    try {
      const text = await file.text();
      const parsed = JSON.parse(text) as EncryptedVaultEnvelope;
      if (parsed.app !== 'MyFBox' || !parsed.cipher || !parsed.kdf) {
        throw new Error(t('backup.restore.errorInvalidFile'));
      }
      setBackupToRestore(parsed);
      setBackupFileName(file.name);
      setFeedback(null);
    } catch (err) {
      setFeedback({
        type: 'err',
        text: err instanceof Error ? err.message : t('backup.restore.errorInvalidGeneric'),
      });
    }
  };

  const handleRestoreBackupSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!backupToRestore || !backupPassword) return;
    setRestoring(true);
    try {
      await onRestoreBackupEnvelope(backupToRestore, backupPassword);
      setBackupToRestore(null);
      setBackupFileName('');
      setBackupPassword('');
      setFeedback({
        type: 'ok',
        text: t('backup.restore.success'),
      });
    } catch (err) {
      setFeedback({
        type: 'err',
        text: err instanceof Error ? err.message : t('backup.restore.errorWrongPassword'),
      });
    } finally {
      setRestoring(false);
    }
  };

  const dropProps = (target: 'backup', onFile: (f: File) => void) => ({
    onDragOver: (e: React.DragEvent) => {
      e.preventDefault();
      setDragTarget(target);
    },
    onDragLeave: () => setDragTarget(null),
    onDrop: (e: React.DragEvent) => {
      e.preventDefault();
      setDragTarget(null);
      const file = e.dataTransfer.files?.[0];
      if (file) onFile(file);
    },
  });

  const backupDays = daysSince(lastBackupAt);
  const backupIsStale = backupDays === null || backupDays > BACKUP_STALE_DAYS;

  const renderMcpCard = (num: string) => (
    <section className="panel-card bk-card" key="mcp-card">
      <header className="bk-card-header bk-mcp-card-header">
        <span className="bk-num">{num}</span>
        <div className="bk-mcp-title-wrap">
          <div className="bk-mcp-title-row">
            <h3>{t('backup.mcp.title')}</h3>
            <div className="bk-mcp-header-actions">
              <button
                type="button"
                className="btn-secondary btn-sm bk-btn-instructions"
                onClick={() => setShowMcpInstructions(true)}
                title={t('backup.mcp.instructionsTitle')}
              >
                <BookOpen size={14} />
                {t('backup.mcp.instructionsBtn')}
              </button>
              <button
                type="button"
                role="switch"
                aria-checked={mcp.enabled}
                aria-label={t('backup.mcp.switchAria')}
                className={`bk-switch ${mcp.enabled ? 'on' : ''}`}
                onClick={toggleMcp}
              >
                <span className="bk-switch-knob" />
                <span className="bk-switch-label">
                  {mcp.enabled ? t('backup.mcp.on') : t('backup.mcp.off')}
                </span>
              </button>
            </div>
          </div>
          <p>{t('backup.mcp.subtitle')}</p>
        </div>
      </header>

      {mcpSetup.environment === 'desktop' ? (
        <p className="field-hint" style={{ marginBottom: '0.75rem' }}>
          <strong>{t('backup.mcp.desktopLabel')}</strong> {t('backup.mcp.desktopHint')}
        </p>
      ) : (
        mcpSetup.environment === 'web-remote' && (
          <p className="field-hint" style={{ marginBottom: '0.75rem' }}>
            <strong>{t('backup.mcp.webLabel')}</strong> {t('backup.mcp.webHint')}
          </p>
        )
      )}

      <div className="mcp-code-block-wrap" style={{ marginBottom: '0.75rem' }}>
        <div className="mcp-code-header">
          <span>{t('backup.mcp.easyWayTitle')}</span>
          <button
            type="button"
            className="btn-ghost btn-sm"
            onClick={() => copyMcpSnippet('prompt', mcpSetup.agentPrompt)}
          >
            {copiedMcpItem === 'prompt' ? <Check size={12} /> : <Copy size={12} />}
            {copiedMcpItem === 'prompt' ? t('backup.mcp.promptCopied') : t('backup.mcp.copyPrompt')}
          </button>
        </div>
        <div style={{ padding: '10px 14px', fontSize: '12.5px', lineHeight: 1.5, color: 'var(--text-secondary)' }}>
          “{mcpSetup.agentPrompt}”
        </div>
      </div>

      <div className="mcp-code-block-wrap" style={{ marginBottom: '0.85rem' }}>
        <div className="mcp-code-header">
          <span>
            {mcpSetup.environment === 'desktop'
              ? t('backup.mcp.manualDesktop')
              : mcpSetup.environment === 'web-remote'
                ? t('backup.mcp.manualWeb')
                : t('backup.mcp.manualLocal')}
          </span>
          <div className="mcp-code-actions">
            <button
              type="button"
              className="btn-ghost btn-sm"
              onClick={() => copyMcpSnippet('cli', mcpSetup.claudeCliCommand)}
              title={t('backup.mcp.copyCliTitle')}
            >
              {copiedMcpItem === 'cli' ? <Check size={12} /> : <Terminal size={12} />}
              {copiedMcpItem === 'cli' ? t('backup.mcp.cliCopied') : t('backup.mcp.copyCli')}
            </button>
            <button
              type="button"
              className="btn-ghost btn-sm"
              onClick={() => copyMcpSnippet('json', mcpSetup.mcpConfigJson)}
            >
              {copiedMcpItem === 'json' ? <Check size={12} /> : <Copy size={12} />}
              {copiedMcpItem === 'json' ? t('backup.mcp.jsonCopied') : t('backup.mcp.copyJson')}
            </button>
          </div>
        </div>
        <pre>{mcpSetup.mcpConfigJson}</pre>
      </div>

      {mcp.enabled ? (
        <>
          <div className={`bk-mcp-status ${mcp.token ? mcp.status : 'waiting'}`} role="status">
            <Bot size={16} />
            {mcp.token ? (
              <>
                <strong>{mcpStatusLabel(mcp.status)}</strong>
                {mcp.status !== 'connected' && mcp.detail && <span>{mcp.detail}</span>}
                {mcp.status === 'connected' && <span>{t('backup.mcp.connectedDesc')}</span>}
              </>
            ) : (
              <>
                <strong>{t('backup.mcp.waitingTitle')}</strong>
                <span>{t('backup.mcp.waitingDesc')}</span>
              </>
            )}
          </div>

          {mcp.token ? (
            <div className="bk-mcp-paired">
              <div>
                <span className="eyebrow">{t('backup.mcp.pairedEyebrow')}</span>
                <span>
                  {t('backup.mcp.codeLabel')} <strong className="mono">{mcpCode ?? '····-····'}</strong> ·{' '}
                  {t('backup.mcp.portLabel')} <strong className="mono">{mcp.port}</strong>
                </span>
              </div>
              <button
                type="button"
                className="btn-secondary"
                onClick={() => onUpdateMcpSettings({ mcpEnabled: false, mcpToken: undefined })}
                title={t('backup.mcp.forgetTitle')}
              >
                <Unlink size={15} /> {t('backup.mcp.forgetBtn')}
              </button>
            </div>
          ) : null}
        </>
      ) : (
        <div className="bk-card-footer">
          <span className="field-hint">{t('backup.mcp.disabledHint')}</span>
        </div>
      )}
    </section>
  );

  const renderAutoLockCard = (num: string) => (
    <section className="panel-card bk-card" key="autolock-card">
      <header className="bk-card-header">
        <span className="bk-num">{num}</span>
        <div>
          <h3>{t('backup.autolock.title')}</h3>
          <p>{t('backup.autolock.subtitle')}</p>
        </div>
      </header>

      <div className="form-field">
        <label>{t('language.settingsTitle')}</label>
        <p className="bk-hint">{t('language.settingsDesc')}</p>
        <LanguageSelector variant="buttons" value={language} onChange={onUpdateLanguage} />
      </div>

      <div className="form-field">
        <label id="bk-autolock">{t('backup.autolock.inactivityLabel')}</label>
        <div className="bk-autolock-vertical" role="radiogroup" aria-labelledby="bk-autolock">
          {AUTO_LOCK_OPTIONS.map((m) => {
            const isSelected = autoLockMinutes === m;
            const info = autoLockInfo(m);
            return (
              <button
                key={m}
                type="button"
                role="radio"
                aria-checked={isSelected}
                className={`bk-autolock-row ${isSelected ? 'active' : ''}`}
                onClick={() => onUpdateAutoLockMinutes(m)}
              >
                <span className="bk-autolock-radio">
                  {isSelected && <span className="bk-autolock-dot" />}
                </span>
                <div className="bk-autolock-text">
                  <strong>{info.title}</strong>
                  <span>{info.desc}</span>
                </div>
                {isSelected && <Check size={16} className="bk-autolock-check" />}
              </button>
            );
          })}
        </div>
      </div>

      <div className="bk-card-footer">
        <span className="field-hint">{t('backup.autolock.footerHint')}</span>
      </div>
    </section>
  );

  const renderCurrencyCard = (num: string) => (
    <section className="panel-card bk-card bk-wide" key="currency-card">
      <header className="bk-card-header">
        <span className="bk-num">{num}</span>
        <div>
          <h3>{t('backup.currency.title')}</h3>
          <p>{t('backup.currency.subtitle')}</p>
        </div>
      </header>

      <div className="bk-currency-box">
        <div className="bk-rates-header">
          <span className="bk-rate-label">
            {t('backup.currency.registeredRates', { count: allRates.length })}
          </span>
          {!isAddingRate && (
            <button
              type="button"
              className="btn-primary btn-sm"
              onClick={startNewRate}
            >
              <Plus size={14} />
              {t('backup.currency.addRate')}
            </button>
          )}
        </div>

        {isAddingRate && (
          <form onSubmit={handleRateFormSubmit} className="bk-rate-add-card">
            <div className="bk-rate-form-title">
              <strong>
                {editingPair
                  ? t('backup.currency.editRateTitle', { pair: editingPair })
                  : t('backup.currency.newRateTitle')}
              </strong>
            </div>

            <div className="bk-rate-form-grid">
              <div className="form-field">
                <label htmlFor="rate-from">{t('backup.currency.fromLabel')}</label>
                <select
                  id="rate-from"
                  value={rateFromInput}
                  onChange={(e) => setRateFromInput(e.target.value)}
                  disabled={!!editingPair}
                  className="mono"
                  required
                >
                  {POPULAR_CURRENCIES.map((c) => (
                    <option key={c.code} value={c.code}>
                      {c.flag} {c.code} — {c.name} ({c.symbol})
                    </option>
                  ))}
                </select>
              </div>

              <div className="form-field">
                <label htmlFor="rate-to">{t('backup.currency.toLabel')}</label>
                <select
                  id="rate-to"
                  value={rateToInput}
                  onChange={(e) => setRateToInput(e.target.value)}
                  disabled={!!editingPair}
                  className="mono"
                  required
                >
                  {POPULAR_CURRENCIES.map((c) => (
                    <option key={c.code} value={c.code}>
                      {c.flag} {c.code} — {c.name} ({c.symbol})
                    </option>
                  ))}
                </select>
              </div>

              <div className="form-field">
                <label htmlFor="rate-val">
                  {t('backup.currency.rateLabel', { from: rateFromInput, to: rateToInput })}
                </label>
                <input
                  id="rate-val"
                  type="text"
                  inputMode="decimal"
                  value={rateValueInput}
                  onChange={(e) => {
                    setRateFormError(null);
                    setRateValueInput(e.target.value);
                  }}
                  placeholder={t('backup.currency.ratePlaceholder')}
                  className="mono"
                  autoFocus={!editingPair}
                  required
                />
              </div>
            </div>

            {rateFormError && (
              <div className="field-hint bad" role="alert" style={{ marginTop: 4 }}>
                {rateFormError}
              </div>
            )}

            <div className="bk-rate-form-actions">
              <button type="submit" className="btn-primary btn-sm">
                {t('backup.currency.saveBtn')}
              </button>
              <button
                type="button"
                className="btn-secondary btn-sm"
                onClick={cancelRateForm}
              >
                {t('backup.actions.cancel')}
              </button>
            </div>
          </form>
        )}

        {allRates.length === 0 ? (
          <div className="bk-rate-empty">
            <span>{t('backup.currency.empty')}</span>
          </div>
        ) : (
          <div className="bk-rates-grid">
            {allRates.map((r) => {
              const pairKey = `${r.from}/${r.to}`;
              const isBeingEdited = editingPair === pairKey;
              const fromInfo = getCurrencyInfo(r.from);
              const toInfo = getCurrencyInfo(r.to);
              return (
                <div key={pairKey} className={`bk-rate-card ${isBeingEdited ? 'editing' : ''}`}>
                  <div className="bk-rate-card-top">
                    <div className="bk-rate-pair mono">
                      <span>{fromInfo?.flag ?? '🪙'}</span>
                      <strong>{r.from}</strong>
                      <span className="bk-rate-symbol">({fromInfo?.symbol ?? r.from})</span>
                      <span className="bk-rate-arrow">→</span>
                      <span>{toInfo?.flag ?? '🪙'}</span>
                      <strong>{r.to}</strong>
                      <span className="bk-rate-symbol">({toInfo?.symbol ?? r.to})</span>
                    </div>

                    <div className="bk-rate-card-actions">
                      <button
                        type="button"
                        className="bk-rate-action-btn"
                        title={t('backup.currency.editIconTitle', { pair: pairKey })}
                        onClick={() => startEditRate(r.from, r.to, r.rate)}
                      >
                        <Edit3 size={13} />
                      </button>
                      {onDeleteExchangeRate && (
                        <button
                          type="button"
                          className="bk-rate-action-btn danger"
                          title={t('backup.currency.deleteIconTitle', { pair: pairKey })}
                          onClick={() => handleDeleteRate(r.from, r.to)}
                        >
                          <Trash2 size={13} />
                        </button>
                      )}
                    </div>
                  </div>

                  <div className="bk-rate-val mono">
                    1 {r.from} = {toInfo?.symbol ?? ''} {formatRate(r.rate)}
                  </div>

                  <div className="bk-rate-meta">
                    <span className="bk-rate-updated">
                      {r.updatedAt
                        ? t('backup.currency.updatedAt', { date: r.updatedAt })
                        : t('backup.currency.manual')}
                    </span>
                    {r.source && (
                      <span className="bk-rate-source-tag">
                        {r.source === 'mcp' || r.source === 'agent'
                          ? t('backup.currency.mcpAgent')
                          : t('backup.currency.manual')}
                      </span>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      <span className="field-hint">{t('backup.currency.footerHint')}</span>
    </section>
  );

  const renderChangePasswordCard = (num: string) => (
    <section className="panel-card bk-card" key="password-card">
      <header className="bk-card-header">
        <span className="bk-num">{num}</span>
        <div>
          <h3>{t('backup.password.title')}</h3>
          <p>{t('backup.password.subtitle')}</p>
        </div>
      </header>

      <form onSubmit={handlePasswordChangeSubmit} className="bk-form">
        <div className="form-field">
          <label htmlFor="bk-new-pw">
            <KeyRound size={13} style={{ display: 'inline', marginRight: 4 }} />
            {t('backup.password.newLabel')}
          </label>
          <input
            id="bk-new-pw"
            type="password"
            value={newPassword}
            onChange={(e) => setNewPassword(e.target.value)}
            placeholder={t('backup.password.newPlaceholder')}
            autoComplete="new-password"
            required
          />
        </div>
        {newPassword && (
          <div className="gate-strength-wrap" data-score={pwStrength.score}>
            <div className="gate-strength" data-score={pwStrength.score}>
              <div className="gate-strength-bars">
                {[1, 2, 3, 4].map((i) => (
                  <span key={i} className={i <= pwStrength.score ? 'on' : ''} />
                ))}
              </div>
              <span className="gate-strength-label">{pwStrength.label}</span>
            </div>

            <div className="gate-strength-meta">
              <div className="gate-strength-time">
                <Clock size={13} aria-hidden />
                <span>
                  {t('backup.password.crackTimeLabel')} <strong>{pwStrength.crackTimeText}</strong>
                </span>
              </div>
            </div>

            {pwStrength.tip && <span className="gate-strength-tip">{pwStrength.tip}</span>}
          </div>
        )}
        <div className="form-field">
          <label htmlFor="bk-new-pw2">{t('backup.password.confirmLabel')}</label>
          <input
            id="bk-new-pw2"
            type="password"
            value={confirmNewPassword}
            onChange={(e) => setConfirmNewPassword(e.target.value)}
            placeholder={t('backup.password.confirmPlaceholder')}
            autoComplete="new-password"
            required
          />
          {confirmNewPassword && (
            <span className={`field-hint ${pwMatches ? 'ok' : 'bad'}`}>
              {pwMatches ? t('backup.password.matchOk') : t('backup.password.matchFail')}
            </span>
          )}
        </div>
        <button type="submit" className="btn-secondary" disabled={changingPw}>
          {changingPw ? t('backup.password.submitting') : t('backup.password.submitBtn')}
        </button>
        <span className="field-hint">{t('backup.password.footerHint')}</span>
      </form>
    </section>
  );

  const renderExportBackupCard = (num: string) => (
    <section className="panel-card bk-card" key="export-card">
      <header className="bk-card-header">
        <span className="bk-num">{num}</span>
        <div>
          <h3>{t('backup.export.title')}</h3>
          <p>{t('backup.export.subtitle')}</p>
        </div>
      </header>

      {backupIsStale && (
        <div className="bk-callout warn">
          <AlertTriangle size={15} />
          <span>
            {backupDays === null
              ? t('backup.export.staleNever')
              : t('backup.export.staleDays', { days: backupDays })}
          </span>
        </div>
      )}

      <div className="bk-actions-vertical" style={{ marginTop: 'auto' }}>
        <button
          type="button"
          className="btn-primary bk-btn-full"
          disabled={!envelope}
          onClick={onDownloadBackup}
        >
          <Download size={16} /> {t('backup.export.downloadBtn')}
        </button>
        <button
          type="button"
          className="btn-secondary bk-btn-full"
          onClick={() => exportTransactionsToCSV(transactions, categories, accounts)}
          title={t('backup.export.csvTitle')}
        >
          <FileSpreadsheet size={16} /> {t('backup.export.csvBtn')}
        </button>
      </div>
      <span className="field-hint">{t('backup.export.csvHint')}</span>
    </section>
  );

  const renderRestoreBackupCard = (num: string) => (
    <section className="panel-card bk-card" key="restore-card">
      <header className="bk-card-header">
        <span className="bk-num">{num}</span>
        <div>
          <h3>{t('backup.restore.title')}</h3>
          <p>{t('backup.restore.subtitle')}</p>
        </div>
      </header>

      <input
        ref={backupFileInputRef}
        type="file"
        accept=".json,.myfbox"
        onChange={handleSelectBackupFile}
        hidden
      />

      {!backupToRestore ? (
        <div
          className={`gate-dropzone ${dragTarget === 'backup' ? 'drag' : ''}`}
          role="button"
          tabIndex={0}
          onClick={() => backupFileInputRef.current?.click()}
          onKeyDown={(e) => {
            if (e.key === 'Enter' || e.key === ' ') {
              e.preventDefault();
              backupFileInputRef.current?.click();
            }
          }}
          {...dropProps('backup', (f) => void loadBackupFile(f))}
        >
          <span className="gate-dropzone-icon">
            <Upload size={20} />
          </span>
          <strong>{t('backup.restore.dropTitle')}</strong>
          <span>{t('backup.restore.dropSubtitle')}</span>
        </div>
      ) : (
        <form onSubmit={handleRestoreBackupSubmit} className="bk-form">
          <div className="gate-file-chip">
            <FileCheck size={16} />
            <span className="gate-file-name">{backupFileName}</span>
            <button
              type="button"
              className="gate-btn-ghost"
              onClick={() => {
                setBackupToRestore(null);
                setBackupFileName('');
                setBackupPassword('');
              }}
            >
              {t('backup.restore.changeFile')}
            </button>
          </div>
          <div className="bk-callout danger">
            <AlertTriangle size={15} />
            <span>{t('backup.restore.warning')}</span>
          </div>
          <div className="form-field">
            <label htmlFor="bk-restore-pw">{t('backup.restore.passwordLabel')}</label>
            <input
              id="bk-restore-pw"
              type="password"
              value={backupPassword}
              onChange={(e) => setBackupPassword(e.target.value)}
              placeholder={t('backup.restore.passwordPlaceholder')}
              autoComplete="current-password"
              required
            />
          </div>
          <button type="submit" className="btn-primary" disabled={restoring || !backupPassword}>
            {restoring ? t('backup.restore.submitting') : t('backup.restore.submitBtn')}
          </button>
        </form>
      )}
    </section>
  );

  const renderDangerSection = (num1: string, num2: string) => (
    <div className="bk-grid" key="danger-grid">
      <details className="panel-card bk-card bk-collapsible-card" open>
        <summary className="bk-collapsible-header">
          <span className="bk-num">{num1}</span>
          <div className="bk-collapsible-title">
            <h3>{t('backup.disk.title')}</h3>
            <p>{t('backup.disk.subtitle')}</p>
          </div>
          <ChevronDown size={18} className="bk-collapsible-chevron" />
        </summary>

        <div className="bk-collapsible-body">
          {envelope ? (
            <div className="crypto-inspector-box mono">
              <div>
                <span className="crypto-key">{t('backup.disk.algKdf')}</span> {envelope.cipher.algorithm} +{' '}
                {envelope.kdf.algorithm} ({envelope.kdf.iterations.toLocaleString(activeLanguage)} iter)
              </div>
              <div>
                <span className="crypto-key">{t('backup.disk.keyFingerprint')}</span> {envelope.keyFingerprint}
              </div>
              <div>
                <span className="crypto-key">{t('backup.disk.salt')}</span>{' '}
                {envelope.kdf.saltBase64}
              </div>
              <div>
                <span className="crypto-key">{t('backup.disk.iv')}</span>{' '}
                {envelope.cipher.ivBase64}
              </div>
              <div>
                <span className="crypto-key">{t('backup.disk.ciphertextSize')}</span>{' '}
                {envelope.cipher.ciphertextBase64.length.toLocaleString(activeLanguage)} bytes Base64
              </div>
              <div className="ciphertext-sample">
                <span className="crypto-key">{t('backup.disk.ciphertextSample')}</span>
                <code>{envelope.cipher.ciphertextBase64.slice(0, 148)}...</code>
              </div>
            </div>
          ) : (
            <span className="field-hint">{t('backup.disk.empty')}</span>
          )}
        </div>
      </details>

      <section className="panel-card bk-card bk-danger">
        <header className="bk-card-header">
          <span className="bk-num">{num2}</span>
          <div>
            <h3>{t('backup.delete.title')}</h3>
            <p>{t('backup.delete.subtitle')}</p>
          </div>
        </header>

        {backupIsStale ? (
          <div className="bk-callout danger">
            <AlertTriangle size={15} />
            <span>
              {backupDays === null
                ? t('backup.delete.staleNever')
                : t('backup.delete.staleDays', { days: backupDays })}{' '}
              {t('backup.delete.downloadBefore')}
            </span>
            <button type="button" className="btn-secondary bk-inline-btn" onClick={onDownloadBackup}>
              <Download size={14} /> {t('backup.delete.downloadBtn')}
            </button>
          </div>
        ) : (
          <div className="bk-callout warn">
            <CheckCircle2 size={15} />
            <span>
              {t('backup.delete.recentBackup', {
                age: describeBackupAge(backupDays).toLowerCase(),
              })}
            </span>
          </div>
        )}

        <form onSubmit={handleDeleteVaultSubmit} className="bk-form bk-danger-form" style={{ marginTop: 'auto' }}>
          <div className="form-field">
            <label htmlFor="bk-delete-pw">{t('backup.delete.passwordLabel')}</label>
            <input
              id="bk-delete-pw"
              type="password"
              value={deletePassword}
              onChange={(e) => {
                setDeletePassword(e.target.value);
                setDeleteError(null);
              }}
              placeholder={t('backup.delete.passwordPlaceholder')}
              autoComplete="current-password"
            />
            {deleteError && <span className="field-hint bad">{deleteError}</span>}
          </div>
          <label className="bk-check">
            <input
              type="checkbox"
              checked={deleteConfirmed}
              onChange={(e) => setDeleteConfirmed(e.target.checked)}
            />
            <span>{t('backup.delete.confirmCheckbox')}</span>
          </label>
          <button
            type="submit"
            className="bk-btn-danger"
            disabled={!deleteConfirmed || !deletePassword || deleting}
          >
            {deleting ? t('backup.delete.submitting') : t('backup.delete.submitBtn')}
          </button>
        </form>
      </section>
    </div>
  );

  return (
    <div className="security-view-stack bk">
      {feedback && (
        <div
          className={feedback.type === 'ok' ? 'vault-alert-ok' : 'vault-alert-error'}
          role={feedback.type === 'ok' ? 'status' : 'alert'}
        >
          {feedback.type === 'ok' ? <CheckCircle2 size={16} /> : <AlertTriangle size={16} />}
          <span>{feedback.text}</span>
        </div>
      )}

      <section className="bk-status">
        <div className="bk-status-item">
          <ShieldCheck size={18} />
          <div>
            <span>{t('backup.status.encryption')}</span>
            <strong>AES-256-GCM</strong>
          </div>
        </div>
        <div className={`bk-status-item ${backupIsStale ? 'warn' : 'ok'}`}>
          {backupIsStale ? <AlertTriangle size={18} /> : <CheckCircle2 size={18} />}
          <div>
            <span>{t('backup.status.lastBackup')}</span>
            <strong>{describeBackupAge(backupDays)}</strong>
          </div>
        </div>
        <div className="bk-status-item">
          <Clock size={18} />
          <div>
            <span>{t('backup.status.autoLock')}</span>
            <strong>
              {autoLockMinutes < 60
                ? t('backup.status.autoLockMins', { minutes: autoLockMinutes })
                : t('backup.status.autoLockHour')}
            </strong>
          </div>
        </div>
        <div className={`bk-status-item ${storageStatus === 'persisted' ? 'ok' : 'warn'}`}>
          {storageStatus === 'persisted' ? <HardDrive size={18} /> : <AlertTriangle size={18} />}
          <div>
            <span>{t('backup.status.storage')}</span>
            <strong>
              {desktopVaultPath
                ? t('backup.status.storageDesktop')
                : storageStatus === 'persisted'
                ? t('backup.status.storagePersisted')
                : storageStatus === 'unsupported'
                ? t('backup.status.storageUnsupported')
                : t('backup.status.storageNotPersisted')}
            </strong>
            {desktopVaultPath && (
              <span className="mono" title={desktopVaultPath} style={{ fontSize: '0.72rem', opacity: 0.78, wordBreak: 'break-all' }}>
                {desktopVaultPath}
              </span>
            )}
            {!desktopVaultPath && storageStatus === 'not-persisted' && (
              <button type="button" className="bk-status-action" onClick={onRequestPersist}>
                {t('backup.status.requestPersistBtn')}
              </button>
            )}
          </div>
        </div>
        <div className="bk-status-item">
          <Fingerprint size={18} />
          <div>
            <span>{t('backup.status.keyFingerprint')}</span>
            <strong className="mono">{envelope?.keyFingerprint ?? '—'}</strong>
          </div>
        </div>
      </section>

      <nav className="bk-tabs" aria-label={t('backup.tabs.ariaLabel')}>
        <button
          type="button"
          className={`bk-tab-btn ${activeConfigTab === 'all' ? 'active' : ''}`}
          onClick={() => setActiveConfigTab('all')}
        >
          <SlidersHorizontal size={14} /> {t('backup.tabs.all')}
        </button>
        <button
          type="button"
          className={`bk-tab-btn ${activeConfigTab === 'mcp' ? 'active' : ''}`}
          onClick={() => setActiveConfigTab('mcp')}
        >
          <Bot size={14} /> {t('backup.tabs.mcp')}
        </button>
        <button
          type="button"
          className={`bk-tab-btn ${activeConfigTab === 'currency' ? 'active' : ''}`}
          onClick={() => setActiveConfigTab('currency')}
        >
          <Coins size={14} /> {t('backup.tabs.currency', { count: allRates.length })}
        </button>
        <button
          type="button"
          className={`bk-tab-btn ${activeConfigTab === 'security' ? 'active' : ''}`}
          onClick={() => setActiveConfigTab('security')}
        >
          <ShieldCheck size={14} /> {t('backup.tabs.security')}
        </button>
        <button
          type="button"
          className={`bk-tab-btn ${activeConfigTab === 'backups' ? 'active' : ''}`}
          onClick={() => setActiveConfigTab('backups')}
        >
          <Download size={14} /> {t('backup.tabs.backups')}
        </button>
        <button
          type="button"
          className={`bk-tab-btn ${activeConfigTab === 'danger' ? 'active' : ''}`}
          onClick={() => setActiveConfigTab('danger')}
        >
          <Terminal size={14} /> {t('backup.tabs.danger')}
        </button>
      </nav>

      {(activeConfigTab === 'all' || activeConfigTab === 'mcp' || activeConfigTab === 'security') && (
        <div className="bk-section">
          {activeConfigTab === 'all' ? (
            <div className="bk-grid">
              {renderMcpCard('.01')}
              {renderAutoLockCard('.02')}
            </div>
          ) : activeConfigTab === 'mcp' ? (
            renderMcpCard('.01')
          ) : (
            <div className="bk-grid">
              {renderAutoLockCard('.01')}
              {renderChangePasswordCard('.02')}
            </div>
          )}
        </div>
      )}

      {(activeConfigTab === 'all' || activeConfigTab === 'currency') && (
        <div className="bk-section">
          {renderCurrencyCard(activeConfigTab === 'all' ? '.03' : '.01')}
        </div>
      )}

      {(activeConfigTab === 'all' || activeConfigTab === 'backups') && (
        <div className="bk-section">
          {activeConfigTab === 'all' ? (
            <div className="bk-grid-3">
              {renderChangePasswordCard('.04')}
              {renderExportBackupCard('.05')}
              {renderRestoreBackupCard('.06')}
            </div>
          ) : (
            <div className="bk-grid">
              {renderExportBackupCard('.01')}
              {renderRestoreBackupCard('.02')}
            </div>
          )}
        </div>
      )}

      {(activeConfigTab === 'all' || activeConfigTab === 'danger') && (
        <div className="bk-section">
          {activeConfigTab === 'all' && (
            <div className="bk-section-header">
              <div className="bk-section-title-wrap">
                <Terminal size={16} />
                <h4>{t('backup.dangerSection.title')}</h4>
              </div>
              <span className="bk-section-desc">{t('backup.dangerSection.subtitle')}</span>
            </div>
          )}
          {renderDangerSection(activeConfigTab === 'all' ? '.07' : '.01', activeConfigTab === 'all' ? '.08' : '.02')}
        </div>
      )}

      {showMcpInstructions && (
        <Suspense fallback={null}>
          <McpInstructionsModal
            isOpen={showMcpInstructions}
            onClose={() => setShowMcpInstructions(false)}
          />
        </Suspense>
      )}
    </div>
  );
};
