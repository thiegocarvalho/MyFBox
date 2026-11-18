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
  Category,
  EncryptedVaultEnvelope,
  ExchangeRate,
  Transaction,
  VaultSettings,
} from '../types/finance';
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

const MCP_STATUS_LABEL: Record<McpBridgeStatus, string> = {
  off: 'Desligado',
  connecting: 'Procurando o servidor...',
  connected: 'Conectado',
  error: 'Sem conexão',
};

const AUTO_LOCK_OPTIONS = [5, 15, 30, 60];
const AUTO_LOCK_LABELS: Record<number, { title: string; desc: string }> = {
  5: { title: '5 minutos', desc: 'Mais restrito — ideal para computadores compartilhados' },
  15: { title: '15 minutos (recomendado)', desc: 'Equilíbrio ideal entre segurança e praticidade' },
  30: { title: '30 minutos', desc: 'Permite pausas mais longas sem trancar o cofre' },
  60: { title: '1 hora', desc: 'Tranca apenas após longos períodos de inatividade' },
};
const BACKUP_STALE_DAYS = 7;

function daysSince(iso: string | undefined): number | null {
  if (!iso) return null;
  const t = new Date(iso).getTime();
  if (Number.isNaN(t)) return null;
  return Math.floor((Date.now() - t) / 86_400_000);
}

function describeBackupAge(days: number | null): string {
  if (days === null) return 'Nunca feito';
  if (days === 0) return 'Hoje';
  if (days === 1) return 'Ontem';
  return `Há ${days} dias`;
}

type ConfigTab = 'all' | 'security' | 'backups' | 'currency' | 'mcp' | 'danger';

interface BackupSecurityViewProps {
  envelope: EncryptedVaultEnvelope | null;
  transactions: Transaction[];
  categories: Category[];
  accounts: Account[];
  autoLockMinutes: number;
  onUpdateAutoLockMinutes: (mins: number) => void;
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
      setDeleteError('Senha mestra incorreta. Nada foi apagado.');
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
  const [copiedMcpItem, setCopiedMcpItem] = useState<'json' | 'cli' | null>(null);
  const mcpSetup = buildMcpSetupInfo({ desktopMcpPath });

  const copyMcpSnippet = (kind: 'json' | 'cli', text: string) => {
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
      setRateFormError('Informe os códigos das moedas de origem e destino.');
      return;
    }
    if (from === to) {
      setRateFormError('As moedas de origem e destino devem ser diferentes.');
      return;
    }
    const val = parseDecimalInput(rateValueInput);
    if (!Number.isFinite(val) || val <= 0) {
      setRateFormError('Informe uma cotação numérica válida maior que zero.');
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
      setFeedback({ type: 'err', text: 'A nova senha mestra deve ter pelo menos 8 caracteres.' });
      return;
    }
    if (pwStrength.score === 0) {
      setFeedback({
        type: 'err',
        text: pwStrength.tip ?? 'Escolha uma senha mestra menos previsível.',
      });
      return;
    }
    if (newPassword !== confirmNewPassword) {
      setFeedback({ type: 'err', text: 'A confirmação da nova senha não coincide.' });
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
        text: 'Senha mestra atualizada! Novo sal criptográfico gerado e cofre re-criptografado em AES-256-GCM.',
      });
    } catch (err) {
      setFeedback({
        type: 'err',
        text: err instanceof Error ? err.message : 'Erro ao re-criptografar cofre.',
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
        throw new Error('Arquivo não é um backup criptografado .myfbox válido.');
      }
      setBackupToRestore(parsed);
      setBackupFileName(file.name);
      setFeedback(null);
    } catch (err) {
      setFeedback({
        type: 'err',
        text: err instanceof Error ? err.message : 'Backup inválido.',
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
        text: 'Backup descriptografado e restaurado com sucesso!',
      });
    } catch (err) {
      setFeedback({
        type: 'err',
        text: err instanceof Error ? err.message : 'Senha incorreta para este backup.',
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
            <h3>Modo MCP local (Model Context Protocol)</h3>
            <div className="bk-mcp-header-actions">
              <button
                type="button"
                className="btn-secondary btn-sm bk-btn-instructions"
                onClick={() => setShowMcpInstructions(true)}
                title="Abrir guia de instruções, prompts prontos e capacidades do MCP"
              >
                <BookOpen size={14} />
                Instruções
              </button>
              <button
                type="button"
                role="switch"
                aria-checked={mcp.enabled}
                aria-label="Ativar Modo MCP local"
                className={`bk-switch ${mcp.enabled ? 'on' : ''}`}
                onClick={toggleMcp}
              >
                <span className="bk-switch-knob" />
                <span className="bk-switch-label">{mcp.enabled ? 'Ligado' : 'Desligado'}</span>
              </button>
            </div>
          </div>
          <p>
            Ponte local segura em <code>127.0.0.1</code> para assistentes de IA operarem o cofre desbloqueado.
          </p>
        </div>
      </header>

      {mcpSetup.environment === 'desktop' ? (
        <div className="bk-card-footer" style={{ marginBottom: '0.75rem' }}>
          <span className="field-hint">
            <strong>App Desktop (Linux, Windows e macOS):</strong> o servidor MCP já vem embutido
            no aplicativo em <code>{mcpSetup.serverPath}</code>. Basta ter o Node.js instalado e
            colar o <code>mcp.json</code> (ou rodar o comando CLI) no seu assistente de IA.
          </span>
        </div>
      ) : (
        mcpSetup.environment === 'web-remote' && (
          <div className="bk-warning-banner" role="note" style={{ marginBottom: '0.75rem' }}>
            <AlertTriangle size={16} aria-hidden />
            <div>
              <strong>Ponte MCP na versão Web:</strong> esta configuração usa <code>npx</code> para
              baixar e rodar a ponte local automaticamente (sem clonar o repositório) já apontando
              para <code>{`MYFBOX_APP_URL=${mcpSetup.appUrl}`}</code>. Exige Node.js e Git
              (Chrome/Edge/Firefox; o Safari pode bloquear conexões em <code>127.0.0.1</code>). No{' '}
              <strong>app Desktop</strong>, tudo já vem embutido.
            </div>
          </div>
        )
      )}

      <div className="mcp-code-block-wrap" style={{ marginBottom: '0.85rem' }}>
        <div className="mcp-code-header">
          <span>
            {mcpSetup.environment === 'desktop'
              ? 'mcp.json (Desktop — pronto para colar)'
              : mcpSetup.environment === 'web-remote'
                ? 'mcp.json (Web via npx — pronto para colar)'
                : 'mcp.json (Local)'}
          </span>
          <div className="mcp-code-actions">
            <button
              type="button"
              className="btn-ghost btn-sm"
              onClick={() => copyMcpSnippet('cli', mcpSetup.claudeCliCommand)}
              title="Copiar comando único para Claude Code (claude mcp add)"
            >
              {copiedMcpItem === 'cli' ? <Check size={12} /> : <Terminal size={12} />}
              {copiedMcpItem === 'cli' ? 'CLI copiado!' : 'Copiar CLI'}
            </button>
            <button
              type="button"
              className="btn-ghost btn-sm"
              onClick={() => copyMcpSnippet('json', mcpSetup.mcpConfigJson)}
            >
              {copiedMcpItem === 'json' ? <Check size={12} /> : <Copy size={12} />}
              {copiedMcpItem === 'json' ? 'Copiado!' : 'Copiar JSON'}
            </button>
          </div>
        </div>
        <pre className="mono">{mcpSetup.mcpConfigJson}</pre>
      </div>

      {mcp.enabled ? (
        <>
          <div className={`bk-mcp-status ${mcp.token ? mcp.status : 'waiting'}`} role="status">
            <Bot size={16} />
            {mcp.token ? (
              <>
                <strong>{MCP_STATUS_LABEL[mcp.status]}</strong>
                {mcp.status !== 'connected' && mcp.detail && <span>{mcp.detail}</span>}
                {mcp.status === 'connected' && (
                  <span>O assistente pode ler e registrar lançamentos no cofre aberto.</span>
                )}
              </>
            ) : (
              <>
                <strong>Aguardando pareamento</strong>
                <span>Peça ao assistente de IA para se conectar ao MyFBox.</span>
              </>
            )}
          </div>

          {mcp.token ? (
            <div className="bk-mcp-paired">
              <div>
                <span className="eyebrow">PAREADO</span>
                <span>
                  Código <strong className="mono">{mcpCode ?? '····-····'}</strong> · porta{' '}
                  <strong className="mono">{mcp.port}</strong>
                </span>
              </div>
              <button
                type="button"
                className="btn-secondary"
                onClick={() => onUpdateMcpSettings({ mcpEnabled: false, mcpToken: undefined })}
                title="Desliga e esquece este pareamento; para voltar, pareie de novo pelo link"
              >
                <Unlink size={15} /> Esquecer pareamento
              </button>
            </div>
          ) : null}

          {mcp.status !== 'connected' && (
            <div className="bk-mcp-howto">
              <span className="eyebrow">COMO CONECTAR O ASSISTENTE</span>
              <ol>
                <li>
                  Abra o assistente de IA na pasta do projeto (o <code>.mcp.json</code> já registra o
                  servidor <code>myfbox</code>).
                </li>
                <li>Peça: “conecte ao MyFBox”. Ele fornecerá um link com código curto.</li>
                <li>Abra o link neste navegador, confira o código e clique em Autorizar.</li>
              </ol>
              <span className="field-hint">
                Após pareado, você pode pedir ao assistente: “registre almoço de R$ 42”, “adicione cotação EUR/BRL 6.30” ou “quanto gastei este mês?”.
              </span>
            </div>
          )}
        </>
      ) : (
        <div className="bk-card-footer">
          <span className="field-hint">
            O Modo MCP vem desligado por segurança. Ative o interruptor acima para permitir que agentes de IA se conectem ao seu cofre aberto via ponte local.
          </span>
        </div>
      )}
    </section>
  );

  const renderAutoLockCard = (num: string) => (
    <section className="panel-card bk-card" key="autolock-card">
      <header className="bk-card-header">
        <span className="bk-num">{num}</span>
        <div>
          <h3>Bloqueio Automático</h3>
          <p>Tranca o cofre após inatividade para proteger seus dados de olhares curiosos.</p>
        </div>
      </header>

      <div className="form-field">
        <label id="bk-autolock">Tempo de inatividade até trancar</label>
        <div className="bk-autolock-vertical" role="radiogroup" aria-labelledby="bk-autolock">
          {AUTO_LOCK_OPTIONS.map((m) => {
            const isSelected = autoLockMinutes === m;
            const info = AUTO_LOCK_LABELS[m] ?? { title: `${m} minutos`, desc: '' };
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
        <span className="field-hint">
          Ao trancar, a chave criptográfica em memória é totalmente apagada. Para destravar,
          sua senha mestra será exigida novamente.
        </span>
      </div>
    </section>
  );

  const renderCurrencyCard = (num: string) => (
    <section className="panel-card bk-card bk-wide" key="currency-card">
      <header className="bk-card-header">
        <span className="bk-num">{num}</span>
        <div>
          <h3>Gestão de Câmbio Multimoeda (100% Offline)</h3>
          <p>
            Cadastre cotações entre qualquer par de moedas. O MyFBox é 100% offline:
            as taxas são inseridas manualmente pelo painel ou atualizadas pelo agente de IA via MCP.
          </p>
        </div>
      </header>

      <div className="bk-currency-box">
        <div className="bk-rates-header">
          <span className="bk-rate-label">Cotações Cadastradas ({allRates.length})</span>
          {!isAddingRate && (
            <button
              type="button"
              className="btn-primary btn-sm"
              onClick={startNewRate}
            >
              <Plus size={14} />
              Adicionar Cotação
            </button>
          )}
        </div>

        {isAddingRate && (
          <form onSubmit={handleRateFormSubmit} className="bk-rate-add-card">
            <div className="bk-rate-form-title">
              <strong>{editingPair ? `Editar Cotação: ${editingPair}` : 'Nova Cotação de Câmbio'}</strong>
            </div>

            <div className="bk-rate-form-grid">
              <div className="form-field">
                <label htmlFor="rate-from">Moeda Origem</label>
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
                <label htmlFor="rate-to">Moeda Destino</label>
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
                  Taxa (1 {rateFromInput} = ? {rateToInput})
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
                  placeholder="Ex: 5,65"
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
                Salvar Cotação
              </button>
              <button
                type="button"
                className="btn-secondary btn-sm"
                onClick={cancelRateForm}
              >
                Cancelar
              </button>
            </div>
          </form>
        )}

        {allRates.length === 0 ? (
          <div className="bk-rate-empty">
            <span>Nenhuma cotação cadastrada no cofre ainda. Clique em "Adicionar Cotação" ou peça ao assistente de IA.</span>
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
                        title={`Editar cotação ${pairKey}`}
                        onClick={() => startEditRate(r.from, r.to, r.rate)}
                      >
                        <Edit3 size={13} />
                      </button>
                      {onDeleteExchangeRate && (
                        <button
                          type="button"
                          className="bk-rate-action-btn danger"
                          title={`Remover cotação ${pairKey}`}
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
                      {r.updatedAt ? `Atualizado: ${r.updatedAt}` : 'Manual'}
                    </span>
                    {r.source && (
                      <span className="bk-rate-source-tag">
                        {r.source === 'mcp' || r.source === 'agent' ? 'MCP / Agente' : 'Manual'}
                      </span>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      <span className="field-hint">
        Cotações locais são usadas para converter saldos e lançamentos na <strong>Visão Geral</strong>,{' '}
        <strong>Comparativos</strong> e <strong>Metas</strong>. Ao liquidar um lançamento em moeda
        estrangeira, a cotação é congelada nele.
      </span>
    </section>
  );

  const renderChangePasswordCard = (num: string) => (
    <section className="panel-card bk-card" key="password-card">
      <header className="bk-card-header">
        <span className="bk-num">{num}</span>
        <div>
          <h3>Alterar Senha Mestra</h3>
          <p>Gera um novo sal criptográfico e re-criptografa todo o cofre em AES-256-GCM.</p>
        </div>
      </header>

      <form onSubmit={handlePasswordChangeSubmit} className="bk-form">
        <div className="form-field">
          <label htmlFor="bk-new-pw">
            <KeyRound size={13} style={{ display: 'inline', marginRight: 4 }} />
            Nova senha mestra
          </label>
          <input
            id="bk-new-pw"
            type="password"
            value={newPassword}
            onChange={(e) => setNewPassword(e.target.value)}
            placeholder="Mínimo 8 caracteres"
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
                  Tempo para descobrir: <strong>{pwStrength.crackTimeText}</strong>
                </span>
              </div>
            </div>

            {pwStrength.tip && <span className="gate-strength-tip">{pwStrength.tip}</span>}
          </div>
        )}
        <div className="form-field">
          <label htmlFor="bk-new-pw2">Confirmar nova senha</label>
          <input
            id="bk-new-pw2"
            type="password"
            value={confirmNewPassword}
            onChange={(e) => setConfirmNewPassword(e.target.value)}
            placeholder="Repita a nova senha"
            autoComplete="new-password"
            required
          />
          {confirmNewPassword && (
            <span className={`field-hint ${pwMatches ? 'ok' : 'bad'}`}>
              {pwMatches ? 'As senhas coincidem' : 'As senhas ainda não coincidem'}
            </span>
          )}
        </div>
        <button type="submit" className="btn-secondary" disabled={changingPw}>
          {changingPw ? 'Recifrando o cofre...' : 'Trocar senha e recifrar cofre'}
        </button>
        <span className="field-hint">
          Backups baixados anteriormente continuam protegidos pela senha antiga.
        </span>
      </form>
    </section>
  );

  const renderExportBackupCard = (num: string) => (
    <section className="panel-card bk-card" key="export-card">
      <header className="bk-card-header">
        <span className="bk-num">{num}</span>
        <div>
          <h3>Exportar Backup Cifrado</h3>
          <p>
            O arquivo <code>.myfbox.json</code> contém todo o cofre criptografado.
            Pode ser salvo com segurança na nuvem ou em um pen-drive.
          </p>
        </div>
      </header>

      {backupIsStale && (
        <div className="bk-callout warn">
          <AlertTriangle size={15} />
          <span>
            {backupDays === null
              ? 'Você ainda não fez nenhum backup. Se este navegador for limpo, o cofre se perde junto.'
              : `Seu último backup tem ${backupDays} dias. Lançamentos recentes não estão salvos fora.`}
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
          <Download size={16} /> Baixar backup cifrado (.myfbox.json)
        </button>
        <button
          type="button"
          className="btn-secondary bk-btn-full"
          onClick={() => exportTransactionsToCSV(transactions, categories, accounts)}
          title="Planilha sem criptografia, para usar no Excel ou Google Sheets"
        >
          <FileSpreadsheet size={16} /> Exportar planilha (.csv)
        </button>
      </div>
      <span className="field-hint">
        A planilha .csv é gerada <strong>sem criptografia</strong>. Guarde em local protegido.
      </span>
    </section>
  );

  const renderRestoreBackupCard = (num: string) => (
    <section className="panel-card bk-card" key="restore-card">
      <header className="bk-card-header">
        <span className="bk-num">{num}</span>
        <div>
          <h3>Restaurar Backup</h3>
          <p>Carrega um arquivo <code>.myfbox.json</code> e substitui os dados deste navegador.</p>
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
          <strong>Arraste o backup aqui</strong>
          <span>
            ou <u>clique para selecionar</u> um <code>.myfbox.json</code>
          </span>
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
              Trocar
            </button>
          </div>
          <div className="bk-callout danger">
            <AlertTriangle size={15} />
            <span>
              Isso <strong>substitui</strong> o cofre atual deste navegador. Baixe um backup do
              cofre atual antes se quiser mantê-lo.
            </span>
          </div>
          <div className="form-field">
            <label htmlFor="bk-restore-pw">Senha mestra do backup</label>
            <input
              id="bk-restore-pw"
              type="password"
              value={backupPassword}
              onChange={(e) => setBackupPassword(e.target.value)}
              placeholder="Senha mestra usada neste backup"
              autoComplete="current-password"
              required
            />
          </div>
          <button type="submit" className="btn-primary" disabled={restoring || !backupPassword}>
            {restoring ? 'Restaurando...' : 'Substituir e restaurar'}
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
            <h3>O que está no disco</h3>
            <p>A prova de que este navegador armazena exclusivamente bytes cifrados, nada em texto aberto.</p>
          </div>
          <ChevronDown size={18} className="bk-collapsible-chevron" />
        </summary>

        <div className="bk-collapsible-body">
          {envelope ? (
            <div className="crypto-inspector-box mono">
              <div>
                <span className="crypto-key">ALG / KDF:</span> {envelope.cipher.algorithm} +{' '}
                {envelope.kdf.algorithm} ({envelope.kdf.iterations.toLocaleString('pt-BR')} iter)
              </div>
              <div>
                <span className="crypto-key">KEY FINGERPRINT:</span> {envelope.keyFingerprint}
              </div>
              <div>
                <span className="crypto-key">SALT (128-bit Base64):</span>{' '}
                {envelope.kdf.saltBase64}
              </div>
              <div>
                <span className="crypto-key">IV ATUAL (96-bit Base64):</span>{' '}
                {envelope.cipher.ivBase64}
              </div>
              <div>
                <span className="crypto-key">CIPHERTEXT SIZE:</span>{' '}
                {envelope.cipher.ciphertextBase64.length.toLocaleString('pt-BR')} bytes Base64
              </div>
              <div className="ciphertext-sample">
                <span className="crypto-key">AMOSTRA DO CIPHERTEXT:</span>
                <code>{envelope.cipher.ciphertextBase64.slice(0, 148)}...</code>
              </div>
            </div>
          ) : (
            <span className="field-hint">Nenhum envelope gravado ainda.</span>
          )}
        </div>
      </details>

      <section className="panel-card bk-card bk-danger">
        <header className="bk-card-header">
          <span className="bk-num">{num2}</span>
          <div>
            <h3>Apagar este cofre e recomeçar</h3>
            <p>
              Remove o cofre cifrado deste navegador (contas, lançamentos, categorias, metas,
              insights e pareamento MCP). Ação irreversível.
            </p>
          </div>
        </header>

        {backupIsStale ? (
          <div className="bk-callout danger">
            <AlertTriangle size={15} />
            <span>
              {backupDays === null
                ? 'Você nunca fez backup deste cofre.'
                : `Seu último backup tem ${backupDays} dias.`}{' '}
              Baixe um backup antes de apagar.
            </span>
            <button type="button" className="btn-secondary bk-inline-btn" onClick={onDownloadBackup}>
              <Download size={14} /> Baixar backup
            </button>
          </div>
        ) : (
          <div className="bk-callout warn">
            <CheckCircle2 size={15} />
            <span>Último backup: {describeBackupAge(backupDays).toLowerCase()}. Confira se está guardado antes de apagar.</span>
          </div>
        )}

        <form onSubmit={handleDeleteVaultSubmit} className="bk-form bk-danger-form" style={{ marginTop: 'auto' }}>
          <div className="form-field">
            <label htmlFor="bk-delete-pw">Senha mestra atual</label>
            <input
              id="bk-delete-pw"
              type="password"
              value={deletePassword}
              onChange={(e) => {
                setDeletePassword(e.target.value);
                setDeleteError(null);
              }}
              placeholder="Confirme com a senha deste cofre"
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
            <span>Entendo que isso apaga o cofre deste navegador e não pode ser desfeito.</span>
          </label>
          <button
            type="submit"
            className="bk-btn-danger"
            disabled={!deleteConfirmed || !deletePassword || deleting}
          >
            {deleting ? 'Conferindo a senha...' : 'Apagar este cofre definitivamente'}
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
            <span>Criptografia</span>
            <strong>AES-256-GCM</strong>
          </div>
        </div>
        <div className={`bk-status-item ${backupIsStale ? 'warn' : 'ok'}`}>
          {backupIsStale ? <AlertTriangle size={18} /> : <CheckCircle2 size={18} />}
          <div>
            <span>Último backup</span>
            <strong>{describeBackupAge(backupDays)}</strong>
          </div>
        </div>
        <div className="bk-status-item">
          <Clock size={18} />
          <div>
            <span>Auto-bloqueio</span>
            <strong>{autoLockMinutes < 60 ? `${autoLockMinutes} min` : '1 hora'}</strong>
          </div>
        </div>
        <div className={`bk-status-item ${storageStatus === 'persisted' ? 'ok' : 'warn'}`}>
          {storageStatus === 'persisted' ? <HardDrive size={18} /> : <AlertTriangle size={18} />}
          <div>
            <span>Armazenamento</span>
            <strong>
              {desktopVaultPath
                ? 'Arquivo local'
                : storageStatus === 'persisted'
                ? 'Persistente'
                : storageStatus === 'unsupported'
                ? 'Sem garantia'
                : 'Pode ser apagado'}
            </strong>
            {desktopVaultPath && (
              <span className="mono" title={desktopVaultPath} style={{ fontSize: '0.72rem', opacity: 0.78, wordBreak: 'break-all' }}>
                {desktopVaultPath}
              </span>
            )}
            {!desktopVaultPath && storageStatus === 'not-persisted' && (
              <button type="button" className="bk-status-action" onClick={onRequestPersist}>
                Pedir ao navegador
              </button>
            )}
          </div>
        </div>
        <div className="bk-status-item">
          <Fingerprint size={18} />
          <div>
            <span>Impressão da chave</span>
            <strong className="mono">{envelope?.keyFingerprint ?? '—'}</strong>
          </div>
        </div>
      </section>

      <nav className="bk-tabs" aria-label="Categorias de configurações">
        <button
          type="button"
          className={`bk-tab-btn ${activeConfigTab === 'all' ? 'active' : ''}`}
          onClick={() => setActiveConfigTab('all')}
        >
          <SlidersHorizontal size={14} /> Todas as Opções
        </button>
        <button
          type="button"
          className={`bk-tab-btn ${activeConfigTab === 'mcp' ? 'active' : ''}`}
          onClick={() => setActiveConfigTab('mcp')}
        >
          <Bot size={14} /> Assistente IA (MCP)
        </button>
        <button
          type="button"
          className={`bk-tab-btn ${activeConfigTab === 'currency' ? 'active' : ''}`}
          onClick={() => setActiveConfigTab('currency')}
        >
          <Coins size={14} /> Câmbio ({allRates.length})
        </button>
        <button
          type="button"
          className={`bk-tab-btn ${activeConfigTab === 'security' ? 'active' : ''}`}
          onClick={() => setActiveConfigTab('security')}
        >
          <ShieldCheck size={14} /> Segurança & Acesso
        </button>
        <button
          type="button"
          className={`bk-tab-btn ${activeConfigTab === 'backups' ? 'active' : ''}`}
          onClick={() => setActiveConfigTab('backups')}
        >
          <Download size={14} /> Backups & Arquivos
        </button>
        <button
          type="button"
          className={`bk-tab-btn ${activeConfigTab === 'danger' ? 'active' : ''}`}
          onClick={() => setActiveConfigTab('danger')}
        >
          <Terminal size={14} /> Auditoria & Avançado
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
                <h4>Auditoria Técnica & Zona de Perigo</h4>
              </div>
              <span className="bk-section-desc">Inspeção no armazenamento local e opções destrutivas</span>
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
