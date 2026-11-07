import React, { useRef, useState } from 'react';
import {
  ShieldCheck,
  Lock,
  KeyRound,
  Eye,
  EyeOff,
  Upload,
  Sparkles,
  FileSpreadsheet,
  AlertTriangle,
  Trash2,
  ArrowRight,
  Cpu,
} from 'lucide-react';
import type { EncryptedVaultEnvelope } from '../types/finance';

interface VaultLockScreenProps {
  existingEnvelope: EncryptedVaultEnvelope | null;
  onUnlock: (password: string) => Promise<void>;
  onCreateVault: (password: string, vaultName: string, withSampleData: boolean) => Promise<void>;
  onRestoreBackupEnvelope: (envelope: EncryptedVaultEnvelope, password: string) => Promise<void>;
  onResetVault: () => Promise<void>;
}

function evaluatePasswordStrength(pw: string): { score: number; label: string; color: string } {
  if (!pw) return { score: 0, label: 'Digite uma senha mestra', color: '#64748B' };
  let score = 0;
  if (pw.length >= 8) score += 1;
  if (pw.length >= 12) score += 1;
  if (/[A-Z]/.test(pw) && /[a-z]/.test(pw)) score += 1;
  if (/\d/.test(pw)) score += 1;
  if (/[^A-Za-z0-9]/.test(pw)) score += 1;

  if (score <= 1) return { score: 1, label: 'Curta / Fraca', color: '#F43F5E' };
  if (score === 2) return { score: 2, label: 'Razoável', color: '#F59E0B' };
  if (score === 3) return { score: 3, label: 'Forte', color: '#38BDF8' };
  return { score: 4, label: 'Blindada (Alta Entropia)', color: '#2DD4BF' };
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
  const [vaultName, setVaultName] = useState('Cofre Financeiro Pessoal');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [withSampleData, setWithSampleData] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [importedEnvelope, setImportedEnvelope] = useState<EncryptedVaultEnvelope | null>(null);
  const [importedFileName, setImportedFileName] = useState<string>('');
  const [confirmReset, setConfirmReset] = useState(false);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const strength = evaluatePasswordStrength(password);

  const handleUnlockSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!password) {
      setError('Informe sua senha mestra para descriptografar o cofre.');
      return;
    }
    setBusy(true);
    setError(null);
    try {
      await onUnlock(password);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Falha ao desbloquear o cofre.');
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
      setError('A confirmação da senha mestra não coincide.');
      return;
    }
    setBusy(true);
    setError(null);
    try {
      await onCreateVault(password, vaultName, withSampleData);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erro ao inicializar o cofre.');
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
        throw new Error('O arquivo selecionado não é um cofre criptografado MyFBox válido.');
      }
      setImportedEnvelope(parsed);
      setImportedFileName(file.name);
      setMode('restore');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Arquivo de backup inválido.');
    }
  };

  const handleRestoreSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!importedEnvelope) {
      setError('Selecione um arquivo .myfbox.json primeiro.');
      return;
    }
    if (!password) {
      setError('Digite a senha mestra do backup selecionado.');
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
      <div className="vault-gate-grid">
        {/* Coluna Esquerda: Identidade Técnica e Arquitetura Zero-Knowledge */}
        <section className="vault-gate-brand">
          <div className="vault-badge-row">
            <span className="vault-chip">
              <ShieldCheck size={14} /> LOCAL-FIRST • ZERO-KNOWLEDGE
            </span>
            <span className="vault-chip mono">AES-256-GCM</span>
          </div>

          <h1 className="vault-hero-title">
            MyFBox
            <span className="vault-hero-subtitle">
              Cofre financeiro pessoal criptografado no dispositivo.
            </span>
          </h1>

          <p className="vault-hero-lead">
            Seus ganhos, gastos e metas de orçamento nunca saem da sua máquina. A chave de
            criptografia é derivada na memória RAM a partir da sua Senha Mestra e descartada assim
            que o cofre é trancado.
          </p>

          <div className="vault-spec-card">
            <div className="vault-spec-header">
              <Cpu size={15} />
              <span>ESPECIFICAÇÃO CRIPTOGRÁFICA ATIVA</span>
            </div>
            <div className="vault-spec-rows">
              <div className="vault-spec-row">
                <span>Derivação de Chave (KDF)</span>
                <strong className="mono">PBKDF2-HMAC-SHA256 (310.000 iter)</strong>
              </div>
              <div className="vault-spec-row">
                <span>Cifra Autenticada</span>
                <strong className="mono">AES-256-GCM (IV 96-bit aleatório)</strong>
              </div>
              <div className="vault-spec-row">
                <span>Persistência Local</span>
                <strong className="mono">IndexedDB (100% Ciphertext)</strong>
              </div>
              {existingEnvelope && (
                <div className="vault-spec-row highlight">
                  <span>Key Fingerprint do Cofre Local</span>
                  <strong className="mono">{existingEnvelope.keyFingerprint}</strong>
                </div>
              )}
            </div>
          </div>
        </section>

        {/* Coluna Direita: Formulário de Desbloqueio / Criação / Restauração */}
        <section className="vault-gate-panel">
          <div className="vault-mode-tabs">
            {existingEnvelope && (
              <button
                type="button"
                className={`vault-tab ${mode === 'unlock' ? 'active' : ''}`}
                onClick={() => {
                  setMode('unlock');
                  setError(null);
                }}
              >
                <Lock size={15} /> Desbloquear Cofre
              </button>
            )}
            <button
              type="button"
              className={`vault-tab ${mode === 'create' ? 'active' : ''}`}
              onClick={() => {
                setMode('create');
                setError(null);
              }}
            >
              <KeyRound size={15} /> {existingEnvelope ? 'Novo Cofre' : 'Criar Cofre'}
            </button>
            <button
              type="button"
              className={`vault-tab ${mode === 'restore' ? 'active' : ''}`}
              onClick={() => {
                setMode('restore');
                setError(null);
              }}
            >
              <Upload size={15} /> Restaurar Backup
            </button>
          </div>

          {error && (
            <div className="vault-alert-error" role="alert">
              <AlertTriangle size={16} />
              <span>{error}</span>
            </div>
          )}

          {mode === 'unlock' && existingEnvelope && (
            <form onSubmit={handleUnlockSubmit} className="vault-form">
              <div className="vault-status-banner">
                <div>
                  <span className="eyebrow">COFRE CRIPTOGRAFADO DETECTADO</span>
                  <div className="mono vault-fp-line">
                    KEY ID: {existingEnvelope.keyFingerprint}
                  </div>
                </div>
                <div className="vault-updated-meta mono">
                  Atualizado em{' '}
                  {new Date(existingEnvelope.updatedAt).toLocaleString('pt-BR', {
                    day: '2-digit',
                    month: '2-digit',
                    hour: '2-digit',
                    minute: '2-digit',
                  })}
                </div>
              </div>

              <div className="form-field">
                <label htmlFor="unlock-password">Senha Mestra</label>
                <div className="password-input-wrap">
                  <input
                    id="unlock-password"
                    type={showPassword ? 'text' : 'password'}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="Digite sua senha mestra para derivar a chave..."
                    autoFocus
                    required
                  />
                  <button
                    type="button"
                    className="icon-btn"
                    onClick={() => setShowPassword((v) => !v)}
                    title={showPassword ? 'Ocultar senha' : 'Mostrar senha'}
                  >
                    {showPassword ? <EyeOff size={17} /> : <Eye size={17} />}
                  </button>
                </div>
              </div>

              <button type="submit" className="btn-primary btn-full" disabled={busy}>
                {busy ? (
                  'Derivando chave PBKDF2 (310k)...'
                ) : (
                  <>
                    Desbloquear Cofre Local <ArrowRight size={17} />
                  </>
                )}
              </button>

              <div className="vault-reset-footer">
                {!confirmReset ? (
                  <button
                    type="button"
                    className="btn-ghost-danger"
                    onClick={() => setConfirmReset(true)}
                  >
                    <Trash2 size={14} /> Apagar cofre local deste navegador
                  </button>
                ) : (
                  <div className="reset-confirm-box">
                    <span>Tem certeza? Sem backup .myfbox os dados serão apagados.</span>
                    <div className="reset-confirm-actions">
                      <button
                        type="button"
                        className="btn-danger-sm"
                        onClick={async () => {
                          await onResetVault();
                          setConfirmReset(false);
                          setMode('create');
                        }}
                      >
                        Confirmar Exclusão
                      </button>
                      <button
                        type="button"
                        className="btn-secondary-sm"
                        onClick={() => setConfirmReset(false)}
                      >
                        Cancelar
                      </button>
                    </div>
                  </div>
                )}
              </div>
            </form>
          )}

          {mode === 'create' && (
            <form onSubmit={handleCreateSubmit} className="vault-form">
              {existingEnvelope && (
                <div className="vault-warning-note">
                  <AlertTriangle size={15} />
                  <span>
                    Atenção: criar um novo cofre substituirá o cofre local atual. Exporte um backup
                    antes se desejar mantê-lo.
                  </span>
                </div>
              )}

              <div className="form-field">
                <label htmlFor="vault-name">Nome do Cofre</label>
                <input
                  id="vault-name"
                  type="text"
                  value={vaultName}
                  onChange={(e) => setVaultName(e.target.value)}
                  placeholder="Ex: Finanças Pessoais 2026"
                  required
                />
              </div>

              <div className="form-field">
                <label htmlFor="create-password">Defina sua Senha Mestra</label>
                <div className="password-input-wrap">
                  <input
                    id="create-password"
                    type={showPassword ? 'text' : 'password'}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="Mínimo de 6 caracteres (recomendado 12+)"
                    required
                  />
                  <button
                    type="button"
                    className="icon-btn"
                    onClick={() => setShowPassword((v) => !v)}
                  >
                    {showPassword ? <EyeOff size={17} /> : <Eye size={17} />}
                  </button>
                </div>
                <div className="strength-meter">
                  <div className="strength-bars">
                    {[1, 2, 3, 4].map((lvl) => (
                      <span
                        key={lvl}
                        className="strength-segment"
                        style={{
                          backgroundColor:
                            strength.score >= lvl ? strength.color : 'rgba(148, 163, 184, 0.18)',
                        }}
                      />
                    ))}
                  </div>
                  <span className="strength-label" style={{ color: strength.color }}>
                    {strength.label}
                  </span>
                </div>
              </div>

              <div className="form-field">
                <label htmlFor="confirm-password">Confirmar Senha Mestra</label>
                <input
                  id="confirm-password"
                  type={showPassword ? 'text' : 'password'}
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  placeholder="Repita a senha mestra..."
                  required
                />
              </div>

              <div className="template-selector">
                <span className="template-label">Estrutura inicial do cofre:</span>
                <div className="template-cards">
                  <button
                    type="button"
                    className={`template-card ${withSampleData ? 'selected' : ''}`}
                    onClick={() => setWithSampleData(true)}
                  >
                    <div className="template-card-head">
                      <Sparkles size={16} />
                      <strong>Com Dados de Exemplo</strong>
                    </div>
                    <p>
                      Inclui lançamentos realistas, contas e metas para explorar gráficos e fluxo de
                      caixa imediatamente.
                    </p>
                  </button>

                  <button
                    type="button"
                    className={`template-card ${!withSampleData ? 'selected' : ''}`}
                    onClick={() => setWithSampleData(false)}
                  >
                    <div className="template-card-head">
                      <FileSpreadsheet size={16} />
                      <strong>Cofre Limpo (Zerado)</strong>
                    </div>
                    <p>
                      Apenas categorias e contas padrão configuradas, sem nenhum lançamento
                      pré-cadastrado.
                    </p>
                  </button>
                </div>
              </div>

              <button type="submit" className="btn-primary btn-full" disabled={busy}>
                {busy ? (
                  'Gerando sal criptográfico e cifrando cofre...'
                ) : (
                  <>
                    Criar e Criptografar Cofre <ArrowRight size={17} />
                  </>
                )}
              </button>
            </form>
          )}

          {mode === 'restore' && (
            <form onSubmit={handleRestoreSubmit} className="vault-form">
              <input
                ref={fileInputRef}
                type="file"
                accept=".json,.myfbox"
                onChange={handleBackupFileSelect}
                style={{ display: 'none' }}
              />

              <div className="restore-dropzone" onClick={() => fileInputRef.current?.click()}>
                <Upload size={24} />
                <div>
                  <strong>
                    {importedFileName
                      ? `Arquivo carregado: ${importedFileName}`
                      : 'Selecionar arquivo de backup (.myfbox.json)'}
                  </strong>
                  <p>
                    {importedEnvelope
                      ? `Key ID: ${importedEnvelope.keyFingerprint} • ${importedEnvelope.kdf.iterations.toLocaleString('pt-BR')} iterações PBKDF2`
                      : 'Clique para buscar um backup criptografado exportado anteriormente'}
                  </p>
                </div>
              </div>

              <div className="form-field">
                <label htmlFor="restore-password">Senha Mestra do Backup</label>
                <div className="password-input-wrap">
                  <input
                    id="restore-password"
                    type={showPassword ? 'text' : 'password'}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="Senha usada quando o backup foi criado"
                    required
                  />
                  <button
                    type="button"
                    className="icon-btn"
                    onClick={() => setShowPassword((v) => !v)}
                  >
                    {showPassword ? <EyeOff size={17} /> : <Eye size={17} />}
                  </button>
                </div>
              </div>

              <button
                type="submit"
                className="btn-primary btn-full"
                disabled={busy || !importedEnvelope}
              >
                {busy ? 'Descriptografando e restaurando...' : 'Descriptografar e Restaurar Cofre'}
              </button>
            </form>
          )}
        </section>
      </div>
    </div>
  );
};
