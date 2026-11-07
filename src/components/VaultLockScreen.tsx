import React, { useRef, useState } from 'react';
import {
  Eye,
  EyeOff,
  Upload,
  AlertTriangle,
  ArrowRight,
  ShieldCheck,
} from 'lucide-react';
import type { EncryptedVaultEnvelope } from '../types/finance';
import { MyFBoxLogo } from './MyFBoxLogo';

interface VaultLockScreenProps {
  existingEnvelope: EncryptedVaultEnvelope | null;
  onUnlock: (password: string) => Promise<void>;
  onCreateVault: (password: string, vaultName: string) => Promise<void>;
  onRestoreBackupEnvelope: (envelope: EncryptedVaultEnvelope, password: string) => Promise<void>;
  onResetVault: () => Promise<void>;
}

export const VaultLockScreen: React.FC<VaultLockScreenProps> = ({
  existingEnvelope,
  onUnlock,
  onCreateVault,
  onRestoreBackupEnvelope,
  onResetVault,
}) => {
  const [mode, setMode] = useState<'unlock' | 'create' | 'restore'>(
    existingEnvelope ? 'unlock' : 'create'
  );
  const [vaultName, setVaultName] = useState('Cofre Financeiro');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [importedEnvelope, setImportedEnvelope] = useState<EncryptedVaultEnvelope | null>(null);
  const [importedFileName, setImportedFileName] = useState<string>('');
  const [confirmReset, setConfirmReset] = useState(false);

  const fileInputRef = useRef<HTMLInputElement>(null);

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

  const handleBackupFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
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
      setError(err instanceof Error ? err.message : 'Arquivo inválido.');
    }
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

  return (
    <div className="vault-gate-shell">
      <div className="vault-gate-card">
        {/* Cabeçalho Limpo */}
        <div className="vault-gate-header">
          <div className="brand-logo-wrap-lg">
            <MyFBoxLogo size={46} />
          </div>
          <h2>MyFBox</h2>
          <p className="vault-gate-sub">Controle Financeiro Criptografado no Dispositivo</p>
        </div>

        {error && (
          <div className="vault-alert-error" role="alert">
            <AlertTriangle size={15} />
            <span>{error}</span>
          </div>
        )}

        {/* Modo 1: Desbloqueio Rápido */}
        {mode === 'unlock' && existingEnvelope && (
          <form onSubmit={handleUnlockSubmit} className="vault-gate-form">
            <div className="form-field">
              <label htmlFor="unlock-password">Senha Mestra</label>
              <div className="pw-input-wrap">
                <input
                  id="unlock-password"
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Digite sua senha..."
                  autoFocus
                  required
                />
                <button
                  type="button"
                  className="pw-toggle-btn"
                  onClick={() => setShowPassword((v) => !v)}
                  title={showPassword ? 'Ocultar' : 'Mostrar'}
                >
                  {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
            </div>

            <button type="submit" className="btn-primary btn-full" disabled={busy}>
              {busy ? (
                'Desbloqueando...'
              ) : (
                <>
                  Entrar no Cofre <ArrowRight size={16} />
                </>
              )}
            </button>

            <div className="vault-gate-links">
              <button
                type="button"
                className="link-subtle"
                onClick={() => {
                  setMode('restore');
                  setPassword('');
                  setError(null);
                }}
              >
                Restaurar Backup
              </button>
              <span>•</span>
              <button
                type="button"
                className="link-subtle"
                onClick={() => {
                  setMode('create');
                  setPassword('');
                  setError(null);
                }}
              >
                Criar Novo Cofre
              </button>
            </div>

            {confirmReset ? (
              <div className="reset-confirm-box">
                <p>Tem certeza? Isso apagará os dados locais deste navegador.</p>
                <div className="reset-confirm-actions">
                  <button type="button" className="btn-secondary-sm" onClick={() => setConfirmReset(false)}>
                    Cancelar
                  </button>
                  <button type="button" className="btn-danger-sm" onClick={onResetVault}>
                    Sim, Apagar Dados
                  </button>
                </div>
              </div>
            ) : (
              <button
                type="button"
                className="link-danger-muted"
                onClick={() => setConfirmReset(true)}
              >
                Redefinir / Limpar cofre deste navegador
              </button>
            )}
          </form>
        )}

        {/* Modo 2: Criar Cofre */}
        {mode === 'create' && (
          <form onSubmit={handleCreateSubmit} className="vault-gate-form">
            <div className="form-field">
              <label htmlFor="create-name">Nome do Cofre</label>
              <input
                id="create-name"
                type="text"
                value={vaultName}
                onChange={(e) => setVaultName(e.target.value)}
                placeholder="Ex: Finanças Pessoais"
                required
              />
            </div>

            <div className="form-field">
              <label htmlFor="create-password">Senha Mestra</label>
              <div className="pw-input-wrap">
                <input
                  id="create-password"
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Mínimo 6 caracteres"
                  required
                />
                <button
                  type="button"
                  className="pw-toggle-btn"
                  onClick={() => setShowPassword((v) => !v)}
                >
                  {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
            </div>

            <div className="form-field">
              <label htmlFor="confirm-password">Confirmar Senha</label>
              <input
                id="confirm-password"
                type="password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                placeholder="Repita a senha"
                required
              />
            </div>

            <button type="submit" className="btn-primary btn-full" disabled={busy}>
              {busy ? 'Criando Cofre...' : 'Criar Cofre Criptografado'}
            </button>

            {existingEnvelope && (
              <button
                type="button"
                className="link-subtle"
                onClick={() => {
                  setMode('unlock');
                  setPassword('');
                  setError(null);
                }}
              >
                ← Voltar para o cofre existente
              </button>
            )}
          </form>
        )}

        {/* Modo 3: Restaurar Backup */}
        {mode === 'restore' && (
          <form onSubmit={handleRestoreSubmit} className="vault-gate-form">
            <input
              type="file"
              ref={fileInputRef}
              accept=".json,.myfbox"
              onChange={handleBackupFileSelect}
              style={{ display: 'none' }}
            />

            {!importedEnvelope ? (
              <div
                className="drop-zone"
                onClick={() => fileInputRef.current?.click()}
              >
                <Upload size={24} />
                <p>Clique para selecionar arquivo <strong>.myfbox.json</strong></p>
              </div>
            ) : (
              <div className="selected-backup-badge">
                <ShieldCheck size={16} />
                <span>{importedFileName}</span>
                <button
                  type="button"
                  className="link-subtle"
                  onClick={() => fileInputRef.current?.click()}
                >
                  Trocar
                </button>
              </div>
            )}

            <div className="form-field">
              <label htmlFor="restore-password">Senha do Arquivo de Backup</label>
              <input
                id="restore-password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Senha mestra usada neste backup"
                required
              />
            </div>

            <button
              type="submit"
              className="btn-primary btn-full"
              disabled={busy || !importedEnvelope}
            >
              {busy ? 'Restaurando...' : 'Restaurar e Abrir Cofre'}
            </button>

            <button
              type="button"
              className="link-subtle"
              onClick={() => {
                setMode(existingEnvelope ? 'unlock' : 'create');
                setPassword('');
                setError(null);
              }}
            >
              ← Cancelar restauração
            </button>
          </form>
        )}
      </div>
    </div>
  );
};
