import React, { useMemo, useRef, useState } from 'react';
import {
  ArrowLeft,
  ArrowRight,
  Check,
  Clock,
  CloudOff,
  Coins,
  Eye,
  EyeOff,
  FileCheck,
  Fingerprint,
  HardDrive,
  KeyRound,
  Landmark,
  LoaderCircle,
  Lock,
  ShieldCheck,
  TriangleAlert,
  Upload,
  Wallet,
} from 'lucide-react';
import type {
  AccountType,
  Currency,
  EncryptedVaultEnvelope,
  InitialAccountData,
} from '../types/finance';
import { MyFBoxBrand } from './MyFBoxLogo';
import { LanguageSelector } from './LanguageSelector';
import { passwordStrength, type PasswordStrengthResult } from '../utils/password';
import { parseDecimalInput } from '../utils/money';
import { POPULAR_CURRENCIES, getCurrencySymbol } from '../services/currencyService';
import { useI18n } from '../i18n/useI18n';

interface VaultLockScreenProps {
  existingEnvelope: EncryptedVaultEnvelope | null;
  onUnlock: (password: string) => Promise<void>;
  onCreateVault: (
    password: string,
    vaultName: string,
    initialAccount?: InitialAccountData
  ) => Promise<void>;
  onRestoreBackupEnvelope: (envelope: EncryptedVaultEnvelope, password: string) => Promise<void>;
  pairingPending?: boolean;
}

type GateMode = 'unlock' | 'create' | 'restore';
type TranslateFn = ReturnType<typeof useI18n>['t'];

function formatUpdatedAt(iso: string | undefined, language: string): string | null {
  if (!iso) return null;
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return null;
  return d.toLocaleString(language, {
    day: '2-digit',
    month: 'short',
    hour: '2-digit',
    minute: '2-digit',
  });
}

function formatCrackTimeLocalized(seconds: number, t: TranslateFn): string {
  if (!Number.isFinite(seconds)) return t('lock.crackTime.billionsYears');
  if (seconds <= 1) return t('lock.crackTime.instant');
  if (seconds < 60) return t('lock.crackTime.seconds', { count: Math.max(1, Math.round(seconds)) });

  const minutes = Math.round(seconds / 60);
  if (minutes < 60) return t('lock.crackTime.minutes', { count: minutes });

  const hours = Math.round(seconds / 3600);
  if (hours < 24) return t('lock.crackTime.hours', { count: hours });

  const days = Math.round(seconds / 86400);
  if (days < 30) {
    return t(days === 1 ? 'lock.crackTime.daySingular' : 'lock.crackTime.dayPlural', {
      count: days,
    });
  }

  const months = Math.round(seconds / (86400 * 30.44));
  if (months < 12) {
    return t(months === 1 ? 'lock.crackTime.monthSingular' : 'lock.crackTime.monthPlural', {
      count: months,
    });
  }

  const years = Math.round(seconds / (86400 * 365.25));
  if (years < 100) {
    return t(years === 1 ? 'lock.crackTime.yearSingular' : 'lock.crackTime.yearPlural', {
      count: years,
    });
  }
  if (years < 1000) return t('lock.crackTime.hundredsYears');
  if (years < 10_000) {
    return t('lock.crackTime.thousandYears', { count: Math.round(years / 1000) });
  }
  if (years < 1_000_000) return t('lock.crackTime.hundredThousandsYears');
  if (years < 1_000_000_000) return t('lock.crackTime.millionsYears');
  return t('lock.crackTime.billionsYears');
}

function getStrengthTip(pw: string, strength: PasswordStrengthResult, t: TranslateFn): string {
  if (!pw) return '';
  if (strength.tip === 'Evite sequências ou senhas muito comuns.') {
    return t('lock.strength.tipCommon');
  }
  if (pw.length < 6) return t('lock.strength.tipMin6');
  if (pw.length < 8) return t('lock.strength.tipMin8');
  if (pw.length < 12) return t('lock.strength.tipGood12');
  return t('lock.strength.tipStrong');
}

const ACCOUNT_COLORS = ['#C8FF00', '#38BDF8', '#F59E0B', '#10B981', '#8B5CF6', '#F43F5E'];

export const VaultLockScreen: React.FC<VaultLockScreenProps> = ({
  existingEnvelope,
  onUnlock,
  onCreateVault,
  onRestoreBackupEnvelope,
  pairingPending = false,
}) => {
  const { language, t } = useI18n();
  const [mode, setMode] = useState<GateMode>(existingEnvelope ? 'unlock' : 'create');
  const [createStep, setCreateStep] = useState<1 | 2>(1);
  const [vaultName, setVaultName] = useState(() => t('lock.defaultVaultName'));
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [capsLockOn, setCapsLockOn] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [accountName, setAccountName] = useState(() => t('lock.defaultAccountName'));
  const [accountType, setAccountType] = useState<AccountType>('checking');
  const [accountCurrency, setAccountCurrency] = useState<Currency>('BRL');
  const [accountColor, setAccountColor] = useState(ACCOUNT_COLORS[0]);
  const [accountInitialBalance, setAccountInitialBalance] = useState('0');

  const [importedEnvelope, setImportedEnvelope] = useState<EncryptedVaultEnvelope | null>(null);
  const [importedFileName, setImportedFileName] = useState<string>('');
  const [dragActive, setDragActive] = useState(false);

  const fileInputRef = useRef<HTMLInputElement>(null);

  const strength = useMemo(() => passwordStrength(password), [password]);
  const confirmMatches = confirmPassword.length > 0 && confirmPassword === password;

  const switchMode = (next: GateMode) => {
    setMode(next);
    setCreateStep(1);
    setPassword('');
    setConfirmPassword('');
    setError(null);
    setShowPassword(false);
  };

  const trackCapsLock = (e: React.KeyboardEvent<HTMLInputElement>) => {
    setCapsLockOn(e.getModifierState('CapsLock'));
  };

  const handleUnlockSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!password) {
      setError(t('lock.error.enterMasterPassword'));
      return;
    }
    setBusy(true);
    setError(null);
    try {
      await onUnlock(password);
    } catch (err) {
      setError(err instanceof Error ? err.message : t('lock.error.wrongPassword'));
    } finally {
      setBusy(false);
    }
  };

  const handleStep1Continue = (e: React.FormEvent) => {
    e.preventDefault();
    if (password.length < 8) {
      setError(t('lock.error.passwordMinLength'));
      return;
    }
    if (strength.score === 0) {
      setError(getStrengthTip(password, strength, t) || t('lock.error.weakPassword'));
      return;
    }
    if (password !== confirmPassword) {
      setError(t('lock.error.passwordMismatch'));
      return;
    }
    setError(null);
    setCreateStep(2);
  };

  const handleCreateSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!accountName.trim()) {
      setError(t('lock.error.enterAccountName'));
      return;
    }
    const initBal = parseDecimalInput(accountInitialBalance) || 0;
    setBusy(true);
    setError(null);
    try {
      await onCreateVault(password, vaultName.trim() || t('lock.fallbackVaultName'), {
        name: accountName.trim(),
        type: accountType,
        color: accountColor,
        initialBalance: initBal,
        currency: accountCurrency,
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : t('lock.error.createVault'));
    } finally {
      setBusy(false);
    }
  };

  const loadBackupFile = async (file: File) => {
    setError(null);
    try {
      const text = await file.text();
      const parsed = JSON.parse(text) as EncryptedVaultEnvelope;
      if (parsed.app !== 'MyFBox' || !parsed.cipher || !parsed.kdf) {
        throw new Error(t('lock.error.invalidBackupFile'));
      }
      setImportedEnvelope(parsed);
      setImportedFileName(file.name);
      setMode('restore');
    } catch (err) {
      setError(
        err instanceof SyntaxError
          ? t('lock.error.invalidJson')
          : err instanceof Error
          ? err.message
          : t('lock.error.invalidFile')
      );
    }
  };

  const handleBackupFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (file) void loadBackupFile(file);
  };

  const handleDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setDragActive(false);
    const file = e.dataTransfer.files?.[0];
    if (file) void loadBackupFile(file);
  };

  const handleRestoreSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!importedEnvelope) {
      setError(t('lock.error.selectBackupFile'));
      return;
    }
    if (!password) {
      setError(t('lock.error.enterBackupPassword'));
      return;
    }
    setBusy(true);
    setError(null);
    try {
      await onRestoreBackupEnvelope(importedEnvelope, password);
    } catch (err) {
      setError(err instanceof Error ? err.message : t('lock.error.wrongBackupPassword'));
    } finally {
      setBusy(false);
    }
  };

  const tabs: { id: GateMode; label: string }[] = existingEnvelope
    ? [
        { id: 'unlock', label: t('lock.tab.unlock') },
        { id: 'restore', label: t('lock.tab.restore') },
      ]
    : [
        { id: 'create', label: t('lock.tab.create') },
        { id: 'restore', label: t('lock.tab.restore') },
      ];

  const activeMode: GateMode =
    !existingEnvelope && mode === 'unlock'
      ? 'create'
      : existingEnvelope && mode === 'create'
      ? 'unlock'
      : mode;

  const updatedLabel = formatUpdatedAt(existingEnvelope?.updatedAt, language);
  const strengthLabel = t(`lock.strength.${Math.min(4, Math.max(0, strength.score))}` as `lock.strength.0`);
  const strengthCrackTime = formatCrackTimeLocalized(strength.crackTimeSeconds, t);
  const strengthTip = getStrengthTip(password, strength, t);

  const renderPasswordField = (
    id: string,
    label: string,
    placeholder: string,
    autoFocus = false,
    autoComplete = 'current-password'
  ) => (
    <div className="gate-field">
      <label htmlFor={id}>{label}</label>
      <div className="gate-input">
        <KeyRound size={16} className="gate-input-icon" aria-hidden />
        <input
          id={id}
          type={showPassword ? 'text' : 'password'}
          value={password}
          onChange={(e) => {
            setPassword(e.target.value);
            setError(null);
          }}
          onKeyDown={trackCapsLock}
          onKeyUp={trackCapsLock}
          placeholder={placeholder}
          autoComplete={autoComplete}
          autoFocus={autoFocus}
          required
        />
        <button
          type="button"
          className="gate-input-action"
          onClick={() => setShowPassword((v) => !v)}
          aria-label={showPassword ? t('lock.password.hideAria') : t('lock.password.showAria')}
        >
          {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
        </button>
      </div>
      {capsLockOn && (
        <span className="gate-hint warn">
          <TriangleAlert size={12} /> {t('lock.capsLockOn')}
        </span>
      )}
    </div>
  );

  const submitLabel = (idle: React.ReactNode, working: string) =>
    busy ? (
      <>
        <LoaderCircle size={16} className="gate-spin" /> {working}
      </>
    ) : (
      idle
    );

  return (
    <div className="gate-shell">
      <aside className="gate-aside" aria-hidden>
        <div className="gate-grid-pattern" />
        <div className="gate-aside-content">
          <div className="gate-brand">
            <MyFBoxBrand size={40} />
          </div>

          <div className="gate-pitch">
            <h1>
              {t('lock.pitch.titleBefore')}
              <mark>{t('lock.pitch.titleHighlight')}</mark>
              {t('lock.pitch.titleAfter')}
            </h1>
            <p>
              {t('lock.pitch.subtitleLine1')}
              <br />
              <strong>{t('lock.pitch.subtitleLine2')}</strong>
            </p>
          </div>

          <ul className="gate-features">
            <li>
              <span className="gate-feature-icon">
                <ShieldCheck size={16} />
              </span>
              <div>
                <strong>{t('lock.feature.encryptionTitle')}</strong>
                <span>{t('lock.feature.encryptionDesc')}</span>
              </div>
            </li>
            <li>
              <span className="gate-feature-icon">
                <HardDrive size={16} />
              </span>
              <div>
                <strong>{t('lock.feature.localTitle')}</strong>
                <span>{t('lock.feature.localDesc')}</span>
              </div>
            </li>
            <li>
              <span className="gate-feature-icon">
                <CloudOff size={16} />
              </span>
              <div>
                <strong>{t('lock.feature.offlineTitle')}</strong>
                <span>{t('lock.feature.offlineDesc')}</span>
              </div>
            </li>
          </ul>
        </div>
        <div className="gate-marquee">
          <div className="gate-marquee-track">
            {[0, 1].map((copy) => (
              <React.Fragment key={copy}>
                <span>{t('lock.marquee.localFirst')}</span>
                <span>{t('lock.marquee.encryption')}</span>
                <span>{t('lock.marquee.noServer')}</span>
                <span>{t('lock.marquee.offline')}</span>
                <span>{t('lock.marquee.yourKey')}</span>
              </React.Fragment>
            ))}
          </div>
        </div>
      </aside>

      <main className="gate-main">
        <div className="gate-panel">
          <div className="gate-panel-topbar">
            <div className="gate-brand gate-brand-mobile">
              <MyFBoxBrand size={40} />
            </div>
            <LanguageSelector variant="compact" />
          </div>

          <div className="gate-tabs" role="tablist" aria-label={t('lock.tabsAria')}>
            {tabs.map((tab) => (
              <button
                key={tab.id}
                type="button"
                role="tab"
                aria-selected={activeMode === tab.id}
                className={`gate-tab ${activeMode === tab.id ? 'active' : ''}`}
                onClick={() => switchMode(tab.id)}
              >
                {tab.label}
              </button>
            ))}
          </div>

          <header className="gate-heading">
            {activeMode === 'create' && (
              <div className="gate-steps" aria-label={t('lock.stepsAria')}>
                <button
                  type="button"
                  className={`gate-step-indicator ${createStep === 1 ? 'active' : 'completed'}`}
                  onClick={() => {
                    setError(null);
                    setCreateStep(1);
                  }}
                  disabled={busy}
                >
                  <span className="gate-step-num">1</span>
                  <span>{t('lock.step1.label')}</span>
                </button>
                <span className="gate-step-sep">/</span>
                <span className={`gate-step-indicator ${createStep === 2 ? 'active' : ''}`}>
                  <span className="gate-step-num">2</span>
                  <span>{t('lock.step2.label')}</span>
                </span>
              </div>
            )}
            <h2>
              {activeMode === 'create'
                ? createStep === 1
                  ? t('lock.mode.create.title')
                  : t('lock.step2.title')
                : activeMode === 'unlock'
                ? t('lock.mode.unlock.title')
                : t('lock.mode.restore.title')}
            </h2>
            <p>
              {activeMode === 'create'
                ? createStep === 1
                  ? t('lock.step1.subtitle')
                  : t('lock.step2.subtitle')
                : activeMode === 'unlock'
                ? t('lock.mode.unlock.subtitle')
                : t('lock.mode.restore.subtitle')}
            </p>
          </header>

          {pairingPending && existingEnvelope && (
            <div className="gate-alert warn" role="status">
              <TriangleAlert size={15} />
              <span>{t('lock.pairingPending')}</span>
            </div>
          )}

          {error && (
            <div className="gate-alert" role="alert">
              <TriangleAlert size={15} />
              <span>{error}</span>
            </div>
          )}

          {activeMode === 'unlock' && existingEnvelope && (
            <form onSubmit={handleUnlockSubmit} className="gate-form">
              <div className="gate-vault-chip">
                <span className="gate-vault-chip-icon">
                  <Lock size={15} />
                </span>
                <div>
                  <strong>{t('lock.vaultOnDevice')}</strong>
                  <span>
                    {updatedLabel
                      ? t('lock.updatedAt', { date: updatedLabel })
                      : t('lock.encryptedVault')}
                  </span>
                </div>
                {existingEnvelope.keyFingerprint && (
                  <span className="gate-fingerprint mono" title={t('lock.keyFingerprintTitle')}>
                    <Fingerprint size={12} /> {existingEnvelope.keyFingerprint}
                  </span>
                )}
              </div>

              {renderPasswordField(
                'unlock-password',
                t('lock.masterPasswordLabel'),
                t('lock.masterPasswordPlaceholder'),
                true
              )}

              <button type="submit" className="gate-submit" disabled={busy}>
                {submitLabel(
                  <>
                    {t('lock.unlockButton')} <ArrowRight size={16} />
                  </>,
                  t('lock.unlocking')
                )}
              </button>
            </form>
          )}

          {activeMode === 'create' && createStep === 1 && (
            <form onSubmit={handleStep1Continue} className="gate-form">
              {existingEnvelope && (
                <div className="gate-alert warn">
                  <TriangleAlert size={15} />
                  <span>{t('lock.createOverwriteWarning')}</span>
                </div>
              )}

              <div className="gate-field">
                <label htmlFor="create-name">{t('lock.vaultNameLabel')}</label>
                <div className="gate-input">
                  <Lock size={16} className="gate-input-icon" aria-hidden />
                  <input
                    id="create-name"
                    type="text"
                    value={vaultName}
                    onChange={(e) => setVaultName(e.target.value)}
                    placeholder={t('lock.vaultNamePlaceholder')}
                    autoFocus={!existingEnvelope}
                    required
                  />
                </div>
                <span className="gate-hint">{t('lock.vaultNameHint')}</span>
              </div>

              {renderPasswordField(
                'create-password',
                t('lock.masterPasswordLabel'),
                t('lock.createPasswordPlaceholder'),
                false,
                'new-password'
              )}

              {password && (
                <div className="gate-strength-wrap" data-score={strength.score}>
                  <div className="gate-strength" data-score={strength.score}>
                    <div className="gate-strength-bars">
                      {[1, 2, 3, 4].map((i) => (
                        <span key={i} className={i <= strength.score ? 'on' : ''} />
                      ))}
                    </div>
                    <span className="gate-strength-label">{strengthLabel}</span>
                  </div>

                  <div className="gate-strength-meta">
                    <div className="gate-strength-time">
                      <Clock size={13} aria-hidden />
                      <span>
                        {t('lock.strength.crackTimeLabel')} <strong>{strengthCrackTime}</strong>
                      </span>
                    </div>
                  </div>

                  {strengthTip && <span className="gate-strength-tip">{strengthTip}</span>}
                </div>
              )}

              <div className="gate-field">
                <label htmlFor="confirm-password">{t('lock.confirmPasswordLabel')}</label>
                <div className={`gate-input ${confirmMatches ? 'valid' : ''}`}>
                  <KeyRound size={16} className="gate-input-icon" aria-hidden />
                  <input
                    id="confirm-password"
                    type={showPassword ? 'text' : 'password'}
                    value={confirmPassword}
                    onChange={(e) => {
                      setConfirmPassword(e.target.value);
                      setError(null);
                    }}
                    placeholder={t('lock.confirmPasswordPlaceholder')}
                    autoComplete="new-password"
                    required
                  />
                  {confirmMatches && (
                    <span className="gate-input-ok" aria-label={t('lock.passwordsMatchAria')}>
                      <Check size={16} />
                    </span>
                  )}
                </div>
              </div>

              <button type="submit" className="gate-submit">
                {t('lock.continueToStep2')} <ArrowRight size={16} />
              </button>
            </form>
          )}

          {activeMode === 'create' && createStep === 2 && (
            <form onSubmit={handleCreateSubmit} className="gate-form">
              <div className="gate-field">
                <label htmlFor="account-name">{t('lock.accountNameLabel')}</label>
                <div className="gate-input">
                  <Wallet size={16} className="gate-input-icon" aria-hidden />
                  <input
                    id="account-name"
                    type="text"
                    value={accountName}
                    onChange={(e) => {
                      setAccountName(e.target.value);
                      setError(null);
                    }}
                    placeholder={t('lock.accountNamePlaceholder')}
                    autoFocus
                    required
                  />
                </div>
                <span className="gate-hint">{t('lock.accountNameHint')}</span>
              </div>

              <div className="gate-form-row">
                <div className="gate-field">
                  <label htmlFor="account-type">{t('lock.accountTypeLabel')}</label>
                  <div className="gate-input">
                    <Landmark size={16} className="gate-input-icon" aria-hidden />
                    <select
                      id="account-type"
                      value={accountType}
                      onChange={(e) => setAccountType(e.target.value as AccountType)}
                    >
                      <option value="checking">{t('lock.accountType.checking')}</option>
                      <option value="wallet">{t('lock.accountType.wallet')}</option>
                      <option value="reserve">{t('lock.accountType.reserve')}</option>
                      <option value="investment">{t('lock.accountType.investment')}</option>
                      <option value="savings">{t('lock.accountType.savings')}</option>
                      <option value="credit">{t('lock.accountType.credit')}</option>
                    </select>
                  </div>
                </div>

                <div className="gate-field">
                  <label htmlFor="account-currency">{t('lock.accountCurrencyLabel')}</label>
                  <div className="gate-input">
                    <Coins size={16} className="gate-input-icon" aria-hidden />
                    <select
                      id="account-currency"
                      value={accountCurrency}
                      onChange={(e) => setAccountCurrency(e.target.value as Currency)}
                    >
                      {POPULAR_CURRENCIES.map((c) => (
                        <option key={c.code} value={c.code}>
                          {c.flag} {c.code} — {c.name} ({c.symbol})
                        </option>
                      ))}
                    </select>
                  </div>
                </div>
              </div>

              <div className="gate-field">
                <label htmlFor="account-balance">
                  {t('lock.accountInitialBalanceLabel', {
                    symbol: getCurrencySymbol(accountCurrency),
                  })}
                </label>
                <div className="gate-input">
                  <Coins size={16} className="gate-input-icon" aria-hidden />
                  <input
                    id="account-balance"
                    type="number"
                    step="0.01"
                    className="mono"
                    value={accountInitialBalance}
                    onChange={(e) => {
                      setAccountInitialBalance(e.target.value);
                      setError(null);
                    }}
                    placeholder={t('lock.accountInitialBalancePlaceholder')}
                    required
                  />
                </div>
              </div>

              <div className="gate-field">
                <label>{t('lock.accountColorLabel')}</label>
                <div
                  className="color-swatches-row"
                  role="radiogroup"
                  aria-label={t('lock.accountColorAria')}
                >
                  {ACCOUNT_COLORS.map((c) => (
                    <button
                      type="button"
                      key={c}
                      className={`color-swatch-btn ${accountColor === c ? 'selected' : ''}`}
                      style={{ backgroundColor: c }}
                      onClick={() => setAccountColor(c)}
                      aria-label={t('lock.selectColorAria', { hex: c })}
                    />
                  ))}
                </div>
              </div>

              <div className="gate-btn-row">
                <button
                  type="button"
                  className="gate-btn-secondary"
                  onClick={() => {
                    setError(null);
                    setCreateStep(1);
                  }}
                  disabled={busy}
                >
                  <ArrowLeft size={16} /> {t('lock.backButton')}
                </button>
                <button type="submit" className="gate-submit" disabled={busy} style={{ flex: 1 }}>
                  {submitLabel(
                    <>
                      {t('lock.createAndStartButton')} <ArrowRight size={16} />
                    </>,
                    t('lock.generatingKey')
                  )}
                </button>
              </div>
            </form>
          )}

          {activeMode === 'restore' && (
            <form onSubmit={handleRestoreSubmit} className="gate-form">
              <input
                type="file"
                ref={fileInputRef}
                accept=".json,.myfbox"
                onChange={handleBackupFileSelect}
                hidden
              />

              {existingEnvelope && (
                <div className="gate-alert warn">
                  <TriangleAlert size={15} />
                  <span>{t('lock.restoreOverwriteWarning')}</span>
                </div>
              )}

              {!importedEnvelope ? (
                <div
                  className={`gate-dropzone ${dragActive ? 'drag' : ''}`}
                  role="button"
                  tabIndex={0}
                  onClick={() => fileInputRef.current?.click()}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' || e.key === ' ') {
                      e.preventDefault();
                      fileInputRef.current?.click();
                    }
                  }}
                  onDragOver={(e) => {
                    e.preventDefault();
                    setDragActive(true);
                  }}
                  onDragLeave={() => setDragActive(false)}
                  onDrop={handleDrop}
                >
                  <span className="gate-dropzone-icon">
                    <Upload size={20} />
                  </span>
                  <strong>{t('lock.dropzoneTitle')}</strong>
                  <span>
                    {t('lock.dropzoneOr')}
                    <u>{t('lock.dropzoneClick')}</u>
                    {t('lock.dropzoneExt')}
                    <code>.myfbox.json</code>
                  </span>
                </div>
              ) : (
                <div className="gate-file-chip">
                  <FileCheck size={16} />
                  <span className="gate-file-name">{importedFileName}</span>
                  <button
                    type="button"
                    className="gate-btn-ghost"
                    onClick={() => fileInputRef.current?.click()}
                  >
                    {t('lock.changeFileButton')}
                  </button>
                </div>
              )}

              {renderPasswordField(
                'restore-password',
                t('lock.backupPasswordLabel'),
                t('lock.backupPasswordPlaceholder')
              )}

              <button type="submit" className="gate-submit" disabled={busy || !importedEnvelope}>
                {submitLabel(
                  <>
                    {t('lock.restoreButton')} <ArrowRight size={16} />
                  </>,
                  t('lock.restoring')
                )}
              </button>
            </form>
          )}

          <footer className="gate-footer">
            <ShieldCheck size={13} />
            <span>{t('lock.footerNotice')}</span>
          </footer>
        </div>
      </main>
    </div>
  );
};
