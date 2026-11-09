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
import { MyFBoxLogo } from './MyFBoxLogo';
import { passwordStrength } from '../utils/password';
import { parseDecimalInput } from '../utils/money';
import { POPULAR_CURRENCIES, getCurrencySymbol } from '../services/currencyService';

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

const MODE_COPY: Record<GateMode, { title: string; subtitle: string }> = {
  unlock: {
    title: 'Bem-vindo de volta',
    subtitle: 'Digite sua senha mestra para descriptografar o cofre.',
  },
  create: {
    title: 'Crie seu cofre',
    subtitle: 'Seus dados são cifrados com esta senha. Ela não pode ser recuperada.',
  },
  restore: {
    title: 'Restaurar backup',
    subtitle: 'Importe um arquivo .myfbox.json e informe a senha usada nele.',
  },
};

function formatUpdatedAt(iso: string | undefined): string | null {
  if (!iso) return null;
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return null;
  return d.toLocaleString('pt-BR', {
    day: '2-digit',
    month: 'short',
    hour: '2-digit',
    minute: '2-digit',
  });
}

const ACCOUNT_COLORS = ['#C8FF00', '#38BDF8', '#F59E0B', '#10B981', '#8B5CF6', '#F43F5E'];

export const VaultLockScreen: React.FC<VaultLockScreenProps> = ({
  existingEnvelope,
  onUnlock,
  onCreateVault,
  onRestoreBackupEnvelope,
  pairingPending = false,
}) => {
  const [mode, setMode] = useState<GateMode>(existingEnvelope ? 'unlock' : 'create');
  const [createStep, setCreateStep] = useState<1 | 2>(1);
  const [vaultName, setVaultName] = useState('Cofre Financeiro');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [capsLockOn, setCapsLockOn] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [accountName, setAccountName] = useState('Conta Principal');
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
      setError('Informe sua senha mestra.');
      return;
    }
    setBusy(true);
    setError(null);
    try {
      await onUnlock(password);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Senha incorreta.');
    } finally {
      setBusy(false);
    }
  };

  const handleStep1Continue = (e: React.FormEvent) => {
    e.preventDefault();
    if (password.length < 8) {
      setError('A senha mestra deve ter pelo menos 8 caracteres.');
      return;
    }
    if (strength.score === 0) {
      setError(strength.tip ?? 'Escolha uma senha mestra menos previsível.');
      return;
    }
    if (password !== confirmPassword) {
      setError('A confirmação da senha não coincide.');
      return;
    }
    setError(null);
    setCreateStep(2);
  };

  const handleCreateSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!accountName.trim()) {
      setError('Informe um nome para a sua primeira conta.');
      return;
    }
    const initBal = parseDecimalInput(accountInitialBalance) || 0;
    setBusy(true);
    setError(null);
    try {
      await onCreateVault(password, vaultName.trim() || 'Meu Cofre', {
        name: accountName.trim(),
        type: accountType,
        color: accountColor,
        initialBalance: initBal,
        currency: accountCurrency,
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erro ao criar o cofre.');
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
        throw new Error('Arquivo de backup inválido.');
      }
      setImportedEnvelope(parsed);
      setImportedFileName(file.name);
      setMode('restore');
    } catch (err) {
      setError(
        err instanceof SyntaxError
          ? 'O arquivo não é um JSON válido.'
          : err instanceof Error
          ? err.message
          : 'Arquivo inválido.'
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
      setError('Selecione um arquivo de backup (.myfbox.json).');
      return;
    }
    if (!password) {
      setError('Digite a senha do backup.');
      return;
    }
    setBusy(true);
    setError(null);
    try {
      await onRestoreBackupEnvelope(importedEnvelope, password);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Senha incorreta para este backup.');
    } finally {
      setBusy(false);
    }
  };

  const tabs: { id: GateMode; label: string }[] = existingEnvelope
    ? [
        { id: 'unlock', label: 'Entrar' },
        { id: 'restore', label: 'Restaurar' },
      ]
    : [
        { id: 'create', label: 'Criar cofre' },
        { id: 'restore', label: 'Restaurar' },
      ];

  const activeMode: GateMode =
    !existingEnvelope && mode === 'unlock'
      ? 'create'
      : existingEnvelope && mode === 'create'
      ? 'unlock'
      : mode;

  const updatedLabel = formatUpdatedAt(existingEnvelope?.updatedAt);

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
          aria-label={showPassword ? 'Ocultar senha' : 'Mostrar senha'}
        >
          {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
        </button>
      </div>
      {capsLockOn && (
        <span className="gate-hint warn">
          <TriangleAlert size={12} /> Caps Lock está ativado
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
            <MyFBoxLogo size={64} />
            <span>MyFBox</span>
          </div>

          <div className="gate-pitch">
            <h1>
              Suas finanças, <mark>cifradas</mark> no seu dispositivo.
            </h1>
            <p>
              Sem conta, sem servidor, sem rastreio.
              <br />
              <strong>Só você tem a chave.</strong>
            </p>
          </div>

          <ul className="gate-features">
            <li>
              <span className="gate-feature-icon">
                <ShieldCheck size={16} />
              </span>
              <div>
                <strong>AES-256-GCM</strong>
                <span>Chave derivada com PBKDF2 (600 mil iterações)</span>
              </div>
            </li>
            <li>
              <span className="gate-feature-icon">
                <HardDrive size={16} />
              </span>
              <div>
                <strong>100% local-first</strong>
                <span>Dados gravados apenas neste navegador</span>
              </div>
            </li>
            <li>
              <span className="gate-feature-icon">
                <CloudOff size={16} />
              </span>
              <div>
                <strong>Funciona offline</strong>
                <span>Backups cifrados que você mesmo guarda</span>
              </div>
            </li>
          </ul>
        </div>
        <div className="gate-marquee">
          <div className="gate-marquee-track">
            {[0, 1].map((copy) => (
              <React.Fragment key={copy}>
                <span>Local-first</span>
                <span>AES-256-GCM</span>
                <span>Sem servidor</span>
                <span>Offline</span>
                <span>Seus dados, sua chave</span>
              </React.Fragment>
            ))}
          </div>
        </div>
      </aside>

      <main className="gate-main">
        <div className="gate-panel">
          <div className="gate-brand gate-brand-mobile">
            <MyFBoxLogo size={52} />
            <span>MyFBox</span>
          </div>

          <div className="gate-tabs" role="tablist" aria-label="Acesso ao cofre">
            {tabs.map((t) => (
              <button
                key={t.id}
                type="button"
                role="tab"
                aria-selected={activeMode === t.id}
                className={`gate-tab ${activeMode === t.id ? 'active' : ''}`}
                onClick={() => switchMode(t.id)}
              >
                {t.label}
              </button>
            ))}
          </div>

          <header className="gate-heading">
            {activeMode === 'create' && (
              <div className="gate-steps" aria-label="Progresso da criação">
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
                  <span>Cofre & Senha</span>
                </button>
                <span className="gate-step-sep">/</span>
                <span className={`gate-step-indicator ${createStep === 2 ? 'active' : ''}`}>
                  <span className="gate-step-num">2</span>
                  <span>Primeira Conta</span>
                </span>
              </div>
            )}
            <h2>
              {activeMode === 'create'
                ? createStep === 1
                  ? 'Crie seu cofre'
                  : 'Sua primeira conta'
                : MODE_COPY[activeMode].title}
            </h2>
            <p>
              {activeMode === 'create'
                ? createStep === 1
                  ? 'Defina o nome e a senha mestra para cifrar seus dados.'
                  : 'Configure nome, tipo, cor e saldo inicial para começar.'
                : MODE_COPY[activeMode].subtitle}
            </p>
          </header>

          {pairingPending && existingEnvelope && (
            <div className="gate-alert warn" role="status">
              <TriangleAlert size={15} />
              <span>
                Um assistente (MCP local) pediu acesso. Desbloqueie o cofre para revisar e autorizar.
              </span>
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
                  <strong>Cofre neste dispositivo</strong>
                  <span>
                    {updatedLabel ? `Atualizado em ${updatedLabel}` : 'Cofre criptografado'}
                  </span>
                </div>
                {existingEnvelope.keyFingerprint && (
                  <span className="gate-fingerprint mono" title="Impressão digital da chave">
                    <Fingerprint size={12} /> {existingEnvelope.keyFingerprint}
                  </span>
                )}
              </div>

              {renderPasswordField('unlock-password', 'Senha mestra', 'Digite sua senha', true)}

              <button type="submit" className="gate-submit" disabled={busy}>
                {submitLabel(
                  <>
                    Desbloquear cofre <ArrowRight size={16} />
                  </>,
                  'Descriptografando...'
                )}
              </button>
            </form>
          )}

          {activeMode === 'create' && createStep === 1 && (
            <form onSubmit={handleStep1Continue} className="gate-form">
              {existingEnvelope && (
                <div className="gate-alert warn">
                  <TriangleAlert size={15} />
                  <span>
                    Atenção: Criar um novo cofre substituirá o cofre salvo neste navegador.
                    Se deseja manter seus dados atuais, faça um backup antes de prosseguir.
                  </span>
                </div>
              )}

              <div className="gate-field">
                <label htmlFor="create-name">Nome do cofre</label>
                <div className="gate-input">
                  <Lock size={16} className="gate-input-icon" aria-hidden />
                  <input
                    id="create-name"
                    type="text"
                    value={vaultName}
                    onChange={(e) => setVaultName(e.target.value)}
                    placeholder="Ex: Finanças pessoais"
                    autoFocus={!existingEnvelope}
                    required
                  />
                </div>
                <span className="gate-hint">Dê um nome para identificar o seu cofre.</span>
              </div>

              {renderPasswordField(
                'create-password',
                'Senha mestra',
                'Mínimo 8 caracteres',
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
                    <span className="gate-strength-label">{strength.label}</span>
                  </div>

                  <div className="gate-strength-meta">
                    <div className="gate-strength-time">
                      <Clock size={13} aria-hidden />
                      <span>
                        Tempo para descobrir: <strong>{strength.crackTimeText}</strong>
                      </span>
                    </div>
                  </div>

                  {strength.tip && <span className="gate-strength-tip">{strength.tip}</span>}
                </div>
              )}

              <div className="gate-field">
                <label htmlFor="confirm-password">Confirmar senha</label>
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
                    placeholder="Repita a senha"
                    autoComplete="new-password"
                    required
                  />
                  {confirmMatches && (
                    <span className="gate-input-ok" aria-label="Senhas coincidem">
                      <Check size={16} />
                    </span>
                  )}
                </div>
              </div>

              <button type="submit" className="gate-submit">
                Continuar: Configurar primeira conta <ArrowRight size={16} />
              </button>
            </form>
          )}

          {activeMode === 'create' && createStep === 2 && (
            <form onSubmit={handleCreateSubmit} className="gate-form">
              <div className="gate-field">
                <label htmlFor="account-name">Nome da conta</label>
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
                    placeholder="Ex: Conta Corrente, Carteira, Nubank..."
                    autoFocus
                    required
                  />
                </div>
                <span className="gate-hint">Identificação da conta no seu cofre.</span>
              </div>

              <div className="gate-form-row">
                <div className="gate-field">
                  <label htmlFor="account-type">Tipo</label>
                  <div className="gate-input">
                    <Landmark size={16} className="gate-input-icon" aria-hidden />
                    <select
                      id="account-type"
                      value={accountType}
                      onChange={(e) => setAccountType(e.target.value as AccountType)}
                    >
                      <option value="checking">Conta Corrente</option>
                      <option value="wallet">Carteira (Dinheiro)</option>
                      <option value="reserve">Reserva de Emergência</option>
                      <option value="investment">Investimento</option>
                      <option value="savings">Poupança</option>
                      <option value="credit">Cartão</option>
                    </select>
                  </div>
                </div>

                <div className="gate-field">
                  <label htmlFor="account-currency">Moeda</label>
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
                  Saldo Inicial ({getCurrencySymbol(accountCurrency)})
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
                    placeholder="0,00"
                    required
                  />
                </div>
              </div>

              <div className="gate-field">
                <label>Cor identificadora</label>
                <div className="color-swatches-row" role="radiogroup" aria-label="Cor da conta">
                  {ACCOUNT_COLORS.map((c) => (
                    <button
                      type="button"
                      key={c}
                      className={`color-swatch-btn ${accountColor === c ? 'selected' : ''}`}
                      style={{ backgroundColor: c }}
                      onClick={() => setAccountColor(c)}
                      aria-label={`Selecionar cor ${c}`}
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
                  <ArrowLeft size={16} /> Voltar
                </button>
                <button type="submit" className="gate-submit" disabled={busy} style={{ flex: 1 }}>
                  {submitLabel(
                    <>
                      Criar cofre e começar <ArrowRight size={16} />
                    </>,
                    'Gerando chave...'
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
                  <span>
                    Restaurar substitui o cofre que já existe neste navegador. O app guarda um
                    cofre só.
                  </span>
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
                  <strong>Arraste o arquivo de backup aqui</strong>
                  <span>
                    ou <u>clique para selecionar</u> um <code>.myfbox.json</code>
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
                    Trocar
                  </button>
                </div>
              )}

              {renderPasswordField(
                'restore-password',
                'Senha do backup',
                'Senha mestra usada neste backup'
              )}

              <button type="submit" className="gate-submit" disabled={busy || !importedEnvelope}>
                {submitLabel(
                  <>
                    Restaurar e abrir <ArrowRight size={16} />
                  </>,
                  'Restaurando...'
                )}
              </button>
            </form>
          )}

          <footer className="gate-footer">
            <ShieldCheck size={13} />
            <span>Seus dados não saem deste dispositivo.</span>
          </footer>
        </div>
      </main>
    </div>
  );
};
