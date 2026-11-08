import React, { useMemo, useRef, useState } from 'react';
import {
  ArrowRight,
  Check,
  CloudOff,
  Eye,
  EyeOff,
  FileCheck,
  Fingerprint,
  HardDrive,
  KeyRound,
  LoaderCircle,
  Lock,
  ShieldCheck,
  TriangleAlert,
  Upload,
} from 'lucide-react';
import type { EncryptedVaultEnvelope } from '../types/finance';
import { MyFBoxLogo } from './MyFBoxLogo';
import { passwordStrength } from '../utils/password';

interface VaultLockScreenProps {
  existingEnvelope: EncryptedVaultEnvelope | null;
  onUnlock: (password: string) => Promise<void>;
  onCreateVault: (password: string, vaultName: string) => Promise<void>;
  onRestoreBackupEnvelope: (envelope: EncryptedVaultEnvelope, password: string) => Promise<void>;
  /** Há um link de pareamento MCP aguardando o desbloqueio */
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

export const VaultLockScreen: React.FC<VaultLockScreenProps> = ({
  existingEnvelope,
  onUnlock,
  onCreateVault,
  onRestoreBackupEnvelope,
  pairingPending = false,
}) => {
  const [mode, setMode] = useState<GateMode>(existingEnvelope ? 'unlock' : 'create');
  const [vaultName, setVaultName] = useState('Cofre Financeiro');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [capsLockOn, setCapsLockOn] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [importedEnvelope, setImportedEnvelope] = useState<EncryptedVaultEnvelope | null>(null);
  const [importedFileName, setImportedFileName] = useState<string>('');
  const [dragActive, setDragActive] = useState(false);

  const fileInputRef = useRef<HTMLInputElement>(null);

  const strength = useMemo(() => passwordStrength(password), [password]);
  const confirmMatches = confirmPassword.length > 0 && confirmPassword === password;

  const switchMode = (next: GateMode) => {
    setMode(next);
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

  const handleCreateSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (password.length < 6) {
      setError('A senha mestra deve ter pelo menos 6 caracteres.');
      return;
    }
    if (password !== confirmPassword) {
      setError('A confirmação da senha não coincide.');
      return;
    }
    setBusy(true);
    setError(null);
    try {
      await onCreateVault(password, vaultName);
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

  // Um único cofre por navegador: com cofre existente não há "criar outro".
  // Para trocar de cofre, o único caminho é "Restaurar" (substitui pelo backup).
  const tabs: { id: GateMode; label: string }[] = existingEnvelope
    ? [
        { id: 'unlock', label: 'Entrar' },
        { id: 'restore', label: 'Restaurar' },
      ]
    : [
        { id: 'create', label: 'Criar cofre' },
        { id: 'restore', label: 'Restaurar' },
      ];

  // Sem cofre gravado o modo "Entrar" não existe: vai para "Criar"
  const activeMode: GateMode =
    !existingEnvelope && mode === 'unlock' ? 'create' : existingEnvelope && mode === 'create' ? 'unlock' : mode;

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
      {/* Painel da marca (desktop) */}
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
                <span>Chave derivada com PBKDF2 (310 mil iterações)</span>
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
            {/* Conteúdo duplicado para o loop contínuo da faixa */}
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

      {/* Painel do formulário */}
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
            <h2>{MODE_COPY[activeMode].title}</h2>
            <p>{MODE_COPY[activeMode].subtitle}</p>
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

          {/* Desbloquear */}
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

          {/* Criar */}
          {activeMode === 'create' && (
            <form onSubmit={handleCreateSubmit} className="gate-form">

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
                    required
                  />
                </div>
              </div>

              {renderPasswordField(
                'create-password',
                'Senha mestra',
                'Mínimo 6 caracteres',
                false,
                'new-password'
              )}

              {password && (
                <div className="gate-strength" data-score={strength.score}>
                  <div className="gate-strength-bars">
                    {[1, 2, 3, 4].map((i) => (
                      <span key={i} className={i <= strength.score ? 'on' : ''} />
                    ))}
                  </div>
                  <span className="gate-strength-label">{strength.label}</span>
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

              <button type="submit" className="gate-submit" disabled={busy}>
                {submitLabel(
                  <>
                    Criar cofre criptografado <ArrowRight size={16} />
                  </>,
                  'Gerando chave...'
                )}
              </button>
            </form>
          )}

          {/* Restaurar */}
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
