import React, { useEffect, useRef, useState } from 'react';
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
} from 'lucide-react';
import type {
  Account,
  Category,
  EncryptedVaultEnvelope,
  Transaction,
} from '../types/finance';
import {
  exportTransactionsToCSV,
  parseCSVContent,
  parseOFXContent,
  type ParsedImportItem,
} from '../services/importExport';
import { formatBRL, formatFullDateBR } from '../utils/formatters';
import { passwordStrength } from '../utils/password';
import { mcpShortCode, type McpBridgeStatus } from '../services/mcpBridge';
import type { VaultSettings } from '../types/finance';
import type { StoragePersistStatus } from '../services/storagePersistence';

const MCP_STATUS_LABEL: Record<McpBridgeStatus, string> = {
  off: 'Desligado',
  connecting: 'Procurando o servidor...',
  connected: 'Conectado',
  error: 'Sem conexão',
};

const AUTO_LOCK_OPTIONS = [5, 15, 30, 60];
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

interface BackupSecurityViewProps {
  envelope: EncryptedVaultEnvelope | null;
  transactions: Transaction[];
  categories: Category[];
  accounts: Account[];
  autoLockMinutes: number;
  onUpdateAutoLockMinutes: (mins: number) => void;
  onImportTransactions: (newTxs: Transaction[]) => void;
  onChangeMasterPassword: (newPassword: string) => Promise<void>;
  onRestoreBackupEnvelope: (envelope: EncryptedVaultEnvelope, password: string) => Promise<void>;
  lastBackupAt?: string;
  onDownloadBackup: () => void;
  onDeleteVault: (password: string) => Promise<void>;
  storageStatus: StoragePersistStatus;
  onRequestPersist: () => void;
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
}

export const BackupSecurityView: React.FC<BackupSecurityViewProps> = ({
  envelope,
  transactions,
  categories,
  accounts,
  autoLockMinutes,
  onUpdateAutoLockMinutes,
  onImportTransactions,
  onChangeMasterPassword,
  onRestoreBackupEnvelope,
  lastBackupAt,
  onDownloadBackup,
  onDeleteVault,
  storageStatus,
  onRequestPersist,
  mcp,
  onUpdateMcpSettings,
}) => {
  // Apagar este cofre (zona de perigo)
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

  // Código curto de conferência do pareamento atual (calculado de forma assíncrona)
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
  const [dragTarget, setDragTarget] = useState<'backup' | 'statement' | null>(null);
  const [restoring, setRestoring] = useState(false);
  const [defaultImportAccount, setDefaultImportAccount] = useState(accounts[0]?.id || '');
  const [parsedItems, setParsedItems] = useState<ParsedImportItem[]>([]);
  const [importSourceLabel, setImportSourceLabel] = useState('');
  const [feedback, setFeedback] = useState<{ type: 'ok' | 'err'; text: string } | null>(null);

  // Alterar Senha Mestra
  const [newPassword, setNewPassword] = useState('');
  const [confirmNewPassword, setConfirmNewPassword] = useState('');
  const [changingPw, setChangingPw] = useState(false);

  // Restaurar Backup .myfbox
  const [backupToRestore, setBackupToRestore] = useState<EncryptedVaultEnvelope | null>(null);
  const [backupFileName, setBackupFileName] = useState('');
  const [backupPassword, setBackupPassword] = useState('');

  const statementFileInputRef = useRef<HTMLInputElement>(null);
  const backupFileInputRef = useRef<HTMLInputElement>(null);

  const handleStatementFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (file) void loadStatementFile(file);
  };

  const loadStatementFile = async (file: File) => {
    setFeedback(null);

    try {
      const content = await file.text();
      const lowerName = file.name.toLowerCase();
      let items: ParsedImportItem[] = [];

      if (lowerName.endsWith('.ofx') || content.includes('<OFX>') || content.includes('<STMTTRN>')) {
        items = parseOFXContent(content, categories, defaultImportAccount || accounts[0]?.id || '');
      } else {
        items = parseCSVContent(content, categories, defaultImportAccount || accounts[0]?.id || '');
      }

      if (items.length === 0) {
        setFeedback({
          type: 'err',
          text: 'Nenhum lançamento válido encontrado no arquivo selecionado.',
        });
        return;
      }

      setParsedItems(items);
      setImportSourceLabel(`${file.name} (${items.length} lançamentos identificados)`);
    } catch (err) {
      setFeedback({
        type: 'err',
        text: err instanceof Error ? err.message : 'Falha ao ler o arquivo.',
      });
    }
  };

  const handleLoadSampleOFX = () => {
    const ym = new Date().toISOString().slice(0, 7).replace('-', '');
    const sampleOfx = `OFXHEADER:100
<OFX>
<BANKMSGSRSV1>
<STMTTRNRS>
<STMTRS>
<BANKTRANLIST>
<STMTTRN>
<TRNTYPE>DEBIT
<DTPOSTED>${ym}08120000
<TRNAMT>-142.80
<FITID>20261108001
<MEMO>Supermercado Pao de Acucar
</STMTTRN>
<STMTTRN>
<TRNTYPE>DEBIT
<DTPOSTED>${ym}09120000
<TRNAMT>-54.90
<FITID>20261109002
<MEMO>Uber Viagem Aeroporto
</STMTTRN>
<STMTTRN>
<TRNTYPE>CREDIT
<DTPOSTED>${ym}10120000
<TRNAMT>850.00
<FITID>20261110003
<MEMO>Pix Recebido Reembolso Projeto
</STMTTRN>
</BANKTRANLIST>
</STMTRS>
</STMTTRNRS>
</BANKMSGSRSV1>
</OFX>`;

    const items = parseOFXContent(
      sampleOfx,
      categories,
      defaultImportAccount || accounts[0]?.id || ''
    );
    setParsedItems(items);
    setImportSourceLabel('extrato-exemplo-banco.ofx (Demonstração OFX)');
    setFeedback(null);
  };

  const handleConfirmStatementImport = () => {
    const selected = parsedItems.filter((i) => i.selected);
    if (selected.length === 0) return;

    const nowIso = new Date().toISOString();
    const created: Transaction[] = selected.map((item, idx) => ({
      id: `tx_imp_${Date.now()}_${idx}_${Math.random().toString(36).slice(2, 6)}`,
      description: item.description,
      amount: item.amount,
      type: item.type,
      status: item.status,
      date: item.date,
      categoryId: item.categoryId,
      accountId: item.accountId,
      notes: `Importado via ${importSourceLabel.split(' ')[0]}`,
      createdAt: nowIso,
    }));

    onImportTransactions(created);
    setParsedItems([]);
    setFeedback({
      type: 'ok',
      text: `${created.length} lançamentos importados e criptografados no cofre com sucesso!`,
    });
  };

  const handlePasswordChangeSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (newPassword.length < 6) {
      setFeedback({ type: 'err', text: 'A nova senha mestra deve ter pelo menos 6 caracteres.' });
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

  const dropProps = (target: 'backup' | 'statement', onFile: (f: File) => void) => ({
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
  const pwStrength = passwordStrength(newPassword);
  const pwMatches = confirmNewPassword.length > 0 && confirmNewPassword === newPassword;

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

      {/* Faixa de status do cofre */}
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
              {storageStatus === 'persisted'
                ? 'Persistente'
                : storageStatus === 'unsupported'
                ? 'Sem garantia'
                : 'Pode ser apagado'}
            </strong>
            {storageStatus === 'not-persisted' && (
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

      <div className="bk-grid">
        {/* .01 Backup */}
        <section className="panel-card bk-card">
          <header className="bk-card-header">
            <span className="bk-num">.01</span>
            <div>
              <h3>Fazer backup</h3>
              <p>
                O arquivo <code>.myfbox.json</code> guarda o cofre inteiro cifrado. Pode ir para a
                nuvem ou um pen-drive: sem a senha mestra, ninguém lê.
              </p>
            </div>
          </header>

          {backupIsStale && (
            <div className="bk-callout warn">
              <AlertTriangle size={15} />
              <span>
                {backupDays === null
                  ? 'Você ainda não fez nenhum backup. Se este navegador perder os dados, o cofre se perde junto.'
                  : `Seu último backup tem ${backupDays} dias. Lançamentos recentes não estão nele.`}
              </span>
            </div>
          )}

          <div className="bk-actions">
            <button
              type="button"
              className="btn-primary bk-btn-lg"
              disabled={!envelope}
              onClick={onDownloadBackup}
            >
              <Download size={16} /> Baixar backup cifrado
            </button>
            <button
              type="button"
              className="btn-secondary"
              onClick={() => exportTransactionsToCSV(transactions, categories, accounts)}
              title="Planilha sem criptografia, para usar no Excel ou Google Sheets"
            >
              <FileSpreadsheet size={16} /> Exportar planilha (.csv)
            </button>
          </div>
          <span className="field-hint">
            A planilha .csv sai <strong>sem criptografia</strong>. Guarde com cuidado.
          </span>
        </section>

        {/* .02 Restaurar */}
        <section className="panel-card bk-card">
          <header className="bk-card-header">
            <span className="bk-num">.02</span>
            <div>
              <h3>Restaurar backup</h3>
              <p>Abre um arquivo .myfbox.json e substitui o cofre deste navegador.</p>
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
                  cofre atual antes, se quiser mantê-lo.
                </span>
              </div>
              <div className="form-field">
                <label htmlFor="bk-restore-pw">Senha do backup</label>
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

        {/* .03 Importar extrato */}
        <section className="panel-card bk-card bk-wide">
          <header className="bk-card-header">
            <span className="bk-num">.03</span>
            <div>
              <h3>Importar extrato bancário</h3>
              <p>
                Arquivos .ofx ou .csv do seu banco. Tudo é lido aqui no navegador, com categoria
                sugerida para cada lançamento. Você revisa antes de salvar.
              </p>
            </div>
          </header>

          <div className="bk-import-row">
            <div className="form-field">
              <label id="bk-import-acc">Lançar na conta</label>
              <div className="chip-grid" role="radiogroup" aria-labelledby="bk-import-acc">
                {accounts.map((a) => (
                  <button
                    key={a.id}
                    type="button"
                    role="radio"
                    aria-checked={defaultImportAccount === a.id}
                    className={`chip ${defaultImportAccount === a.id ? 'active' : ''}`}
                    onClick={() => setDefaultImportAccount(a.id)}
                  >
                    <span className="chip-dot" style={{ backgroundColor: a.color }} />
                    {a.name}
                  </button>
                ))}
              </div>
            </div>

            <input
              ref={statementFileInputRef}
              type="file"
              accept=".ofx,.csv,.txt"
              onChange={handleStatementFileUpload}
              hidden
            />
            <div
              className={`gate-dropzone bk-dropzone-wide ${dragTarget === 'statement' ? 'drag' : ''}`}
              role="button"
              tabIndex={0}
              onClick={() => statementFileInputRef.current?.click()}
              onKeyDown={(e) => {
                if (e.key === 'Enter' || e.key === ' ') {
                  e.preventDefault();
                  statementFileInputRef.current?.click();
                }
              }}
              {...dropProps('statement', (f) => void loadStatementFile(f))}
            >
              <span className="gate-dropzone-icon">
                <Upload size={20} />
              </span>
              <strong>Arraste o extrato aqui</strong>
              <span>
                ou <u>clique para selecionar</u> · <code>.ofx</code> ou <code>.csv</code>
              </span>
            </div>
          </div>

          <button type="button" className="bk-link" onClick={handleLoadSampleOFX}>
            Testar com um extrato de exemplo (3 lançamentos)
          </button>
        </section>
      </div>

      {/* Pré-visualização da importação */}
      {parsedItems.length > 0 && (
        <section className="panel-card">
          <header className="panel-header">
            <div>
              <span className="eyebrow">REVISE ANTES DE SALVAR</span>
              <h3>{importSourceLabel}</h3>
            </div>
            <div className="row-actions">
              <button type="button" className="btn-secondary" onClick={() => setParsedItems([])}>
                Cancelar
              </button>
              <button
                type="button"
                className="btn-primary"
                onClick={handleConfirmStatementImport}
                disabled={parsedItems.every((i) => !i.selected)}
              >
                Importar {parsedItems.filter((i) => i.selected).length} lançamentos
              </button>
            </div>
          </header>

          <div className="ledger-table-scroll">
            <table className="ledger-table">
              <thead>
                <tr>
                  <th>
                    <input
                      type="checkbox"
                      aria-label="Selecionar todos"
                      checked={parsedItems.every((i) => i.selected)}
                      onChange={(e) =>
                        setParsedItems(parsedItems.map((i) => ({ ...i, selected: e.target.checked })))
                      }
                    />
                  </th>
                  <th>DATA</th>
                  <th>DESCRIÇÃO</th>
                  <th>CATEGORIA SUGERIDA</th>
                  <th>CONTA</th>
                  <th className="align-right">VALOR</th>
                </tr>
              </thead>
              <tbody>
                {parsedItems.map((item, idx) => (
                  <tr key={item.tempId} className={item.selected ? '' : 'bk-row-off'}>
                    <td>
                      <input
                        type="checkbox"
                        aria-label={`Importar ${item.description}`}
                        checked={item.selected}
                        onChange={(e) => {
                          const next = [...parsedItems];
                          next[idx] = { ...item, selected: e.target.checked };
                          setParsedItems(next);
                        }}
                      />
                    </td>
                    <td className="mono">{formatFullDateBR(item.date)}</td>
                    <td>
                      <input
                        type="text"
                        className="inline-edit-input"
                        value={item.description}
                        onChange={(e) => {
                          const next = [...parsedItems];
                          next[idx] = { ...item, description: e.target.value };
                          setParsedItems(next);
                        }}
                      />
                    </td>
                    <td>
                      <select
                        className="filter-select"
                        value={item.categoryId}
                        onChange={(e) => {
                          const next = [...parsedItems];
                          next[idx] = { ...item, categoryId: e.target.value };
                          setParsedItems(next);
                        }}
                      >
                        {categories
                          .filter((c) => c.type === item.type)
                          .map((c) => (
                            <option key={c.id} value={c.id}>
                              {c.name}
                            </option>
                          ))}
                      </select>
                    </td>
                    <td>
                      <select
                        className="filter-select"
                        value={item.accountId}
                        onChange={(e) => {
                          const next = [...parsedItems];
                          next[idx] = { ...item, accountId: e.target.value };
                          setParsedItems(next);
                        }}
                      >
                        {accounts.map((a) => (
                          <option key={a.id} value={a.id}>
                            {a.name}
                          </option>
                        ))}
                      </select>
                    </td>
                    <td
                      className={`mono align-right ${
                        item.type === 'income' ? 'positive' : 'negative'
                      }`}
                    >
                      {item.type === 'income' ? '+' : '-'}
                      {formatBRL(item.amount)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      )}

      <div className="bk-grid">
        {/* .04 Segurança */}
        <section className="panel-card bk-card">
          <header className="bk-card-header">
            <span className="bk-num">.04</span>
            <div>
              <h3>Segurança</h3>
              <p>Quando o cofre tranca sozinho e qual senha abre ele.</p>
            </div>
          </header>

          <div className="form-field">
            <label id="bk-autolock">Trancar após inatividade</label>
            <div className="seg-group" role="radiogroup" aria-labelledby="bk-autolock">
              {AUTO_LOCK_OPTIONS.map((m) => (
                <button
                  key={m}
                  type="button"
                  role="radio"
                  aria-checked={autoLockMinutes === m}
                  className={`seg-btn ${autoLockMinutes === m ? 'active' : ''}`}
                  onClick={() => onUpdateAutoLockMinutes(m)}
                >
                  {m < 60 ? `${m} min` : '1 hora'}
                </button>
              ))}
            </div>
          </div>

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
                placeholder="Mínimo 6 caracteres"
                autoComplete="new-password"
                required
              />
            </div>
            {newPassword && (
              <div className="gate-strength" data-score={pwStrength.score}>
                <div className="gate-strength-bars">
                  {[1, 2, 3, 4].map((i) => (
                    <span key={i} className={i <= pwStrength.score ? 'on' : ''} />
                  ))}
                </div>
                <span className="gate-strength-label">{pwStrength.label}</span>
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
              {changingPw ? 'Recifrando o cofre...' : 'Trocar senha e recifrar o cofre'}
            </button>
            <span className="field-hint">
              Backups antigos continuam abrindo só com a senha antiga.
            </span>
          </form>
        </section>

        {/* .05 Auditoria */}
        <section className="panel-card bk-card">
          <header className="bk-card-header">
            <span className="bk-num">.05</span>
            <div>
              <h3>O que está no disco</h3>
              <p>A prova de que este navegador guarda só dados cifrados, nada em texto aberto.</p>
            </div>
          </header>

          {envelope ? (
            <details className="bk-audit">
              <summary>
                <Terminal size={15} /> Ver o envelope cifrado no IndexedDB
                <ChevronDown size={15} className="bk-audit-chevron" />
              </summary>
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
            </details>
          ) : (
            <span className="field-hint">Nenhum envelope gravado ainda.</span>
          )}
        </section>

        {/* .06 Modo MCP local */}
        <section className="panel-card bk-card bk-wide">
          <header className="bk-card-header">
            <span className="bk-num">.06</span>
            <div>
              <h3>Modo MCP local</h3>
              <p>
                Deixa um assistente como o Claude Code consultar e registrar lançamentos neste
                cofre, só nesta máquina (127.0.0.1). Funciona apenas com o app aberto e
                desbloqueado. A senha e a chave nunca saem do navegador.
              </p>
            </div>
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
          </header>

          {mcp.enabled && (
            <>
              <div className={`bk-mcp-status ${mcp.token ? mcp.status : 'waiting'}`} role="status">
                <Bot size={16} />
                {mcp.token ? (
                  <>
                    <strong>{MCP_STATUS_LABEL[mcp.status]}</strong>
                    {mcp.status !== 'connected' && mcp.detail && <span>{mcp.detail}</span>}
                    {mcp.status === 'connected' && (
                      <span>O assistente pode ler e alterar o cofre enquanto ele estiver aberto.</span>
                    )}
                  </>
                ) : (
                  <>
                    <strong>Aguardando pareamento</strong>
                    <span>Peça ao assistente para se conectar ao MyFBox.</span>
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

              <div className="bk-mcp-howto">
                <span className="eyebrow">COMO CONECTAR</span>
                <ol>
                  <li>
                    Abra o Claude Code na pasta do projeto (o <code>.mcp.json</code> já registra o
                    servidor <code>myfbox</code>).
                  </li>
                  <li>Peça: “conecte ao MyFBox”. Ele mostra um link de pareamento e um código.</li>
                  <li>Abra o link aqui, confira o código e clique em Autorizar.</li>
                </ol>
                <span className="field-hint">
                  Depois é só pedir, por exemplo: “registre um almoço de R$ 42 hoje” ou “quanto gastei
                  em mercado este mês?”. Cada ação do assistente aparece aqui como aviso.
                </span>
              </div>
            </>
          )}
        </section>

        {/* .07 Apagar este cofre */}
        <section className="panel-card bk-card bk-wide bk-danger">
          <header className="bk-card-header">
            <span className="bk-num">.07</span>
            <div>
              <h3>Apagar este cofre e criar outro</h3>
              <p>
                Remove o cofre cifrado deste navegador (contas, lançamentos, categorias, metas,
                insights e o pareamento MCP) e volta para a tela de criar um cofre novo. Não dá para
                desfazer: só um backup traz os dados de volta.
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
              <span>Último backup: {describeBackupAge(backupDays).toLowerCase()}. Confira se ele está guardado antes de apagar.</span>
            </div>
          )}

          <form onSubmit={handleDeleteVaultSubmit} className="bk-form bk-danger-form">
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
              {deleting ? 'Conferindo a senha...' : 'Apagar este cofre'}
            </button>
          </form>
        </section>
      </div>
    </div>
  );
};
