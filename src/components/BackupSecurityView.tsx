import React, { useRef, useState } from 'react';
import {
  ShieldCheck,
  Download,
  Upload,
  FileSpreadsheet,
  KeyRound,
  Terminal,
  CheckCircle2,
  AlertTriangle,
} from 'lucide-react';
import type {
  Account,
  Category,
  EncryptedVaultEnvelope,
  Transaction,
} from '../types/finance';
import {
  downloadEncryptedBackupFile,
  exportTransactionsToCSV,
  parseCSVContent,
  parseOFXContent,
  type ParsedImportItem,
} from '../services/importExport';
import { formatBRL, formatFullDateBR } from '../utils/formatters';

interface BackupSecurityViewProps {
  vaultName: string;
  envelope: EncryptedVaultEnvelope | null;
  transactions: Transaction[];
  categories: Category[];
  accounts: Account[];
  autoLockMinutes: number;
  onUpdateAutoLockMinutes: (mins: number) => void;
  onImportTransactions: (newTxs: Transaction[]) => void;
  onChangeMasterPassword: (newPassword: string) => Promise<void>;
  onRestoreBackupEnvelope: (envelope: EncryptedVaultEnvelope, password: string) => Promise<void>;
}

export const BackupSecurityView: React.FC<BackupSecurityViewProps> = ({
  vaultName,
  envelope,
  transactions,
  categories,
  accounts,
  autoLockMinutes,
  onUpdateAutoLockMinutes,
  onImportTransactions,
  onChangeMasterPassword,
  onRestoreBackupEnvelope,
}) => {
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

  const handleStatementFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
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

  const handleSelectBackupFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
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
    try {
      await onRestoreBackupEnvelope(backupToRestore, backupPassword);
      setBackupToRestore(null);
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
    }
  };

  return (
    <div className="security-view-stack">
      {feedback && (
        <div className={feedback.type === 'ok' ? 'vault-alert-ok' : 'vault-alert-error'}>
          {feedback.type === 'ok' ? <CheckCircle2 size={16} /> : <AlertTriangle size={16} />}
          <span>{feedback.text}</span>
        </div>
      )}

      {/* Linha 1: Exportação de Backup Criptografado + Importação de Extratos OFX / CSV */}
      <div className="dashboard-main-grid">
        <section className="panel-card">
          <header className="panel-header">
            <div>
              <span className="eyebrow">PORTABILIDADE E CUSTÓDIA PRÓPRIA</span>
              <h3>Exportar Backup Criptografado & CSV</h3>
            </div>
            <ShieldCheck size={18} style={{ color: '#2DD4BF' }} />
          </header>

          <p className="panel-desc">
            O backup <code>.myfbox.json</code> contém todo o seu cofre cifrado com{' '}
            <strong>AES-256-GCM</strong>. Mesmo que você salve esse arquivo na nuvem ou pen-drive,
            ninguém poderá lê-lo sem a sua Senha Mestra.
          </p>

          <div className="export-buttons-stack">
            <button
              type="button"
              className="btn-primary"
              disabled={!envelope}
              onClick={() => envelope && downloadEncryptedBackupFile(envelope, vaultName)}
            >
              <Download size={16} /> Baixar Cofre Criptografado (.myfbox.json)
            </button>

            <button
              type="button"
              className="btn-secondary"
              onClick={() => exportTransactionsToCSV(transactions, categories, accounts)}
            >
              <FileSpreadsheet size={16} /> Exportar Todos os Lançamentos em Planilha (.CSV)
            </button>
          </div>

          <hr className="subtle-divider" />

          <div className="restore-inline-section">
            <span className="eyebrow">RESTAURAR DE ARQUIVO .MYFBOX</span>
            <input
              ref={backupFileInputRef}
              type="file"
              accept=".json,.myfbox"
              onChange={handleSelectBackupFile}
              style={{ display: 'none' }}
            />
            <div className="restore-inline-controls">
              <button
                type="button"
                className="btn-secondary-sm"
                onClick={() => backupFileInputRef.current?.click()}
              >
                <Upload size={14} />{' '}
                {backupFileName ? `Selecionado: ${backupFileName}` : 'Carregar arquivo .myfbox.json'}
              </button>
            </div>

            {backupToRestore && (
              <form onSubmit={handleRestoreBackupSubmit} className="restore-inline-form">
                <input
                  type="password"
                  value={backupPassword}
                  onChange={(e) => setBackupPassword(e.target.value)}
                  placeholder="Digite a senha mestra do backup..."
                  required
                />
                <button type="submit" className="btn-primary">
                  Restaurar Agora
                </button>
              </form>
            )}
          </div>
        </section>

        {/* Importador de Extratos Bancários OFX e CSV */}
        <section className="panel-card">
          <header className="panel-header">
            <div>
              <span className="eyebrow">INTEGRAÇÃO BANCÁRIA OFFLINE</span>
              <h3>Importar Extrato Bancário (.OFX ou .CSV)</h3>
            </div>
            <Upload size={18} style={{ color: '#38BDF8' }} />
          </header>

          <p className="panel-desc">
            Importe extratos do Nubank, Itaú, Bradesco, Inter, BB ou planilhas CSV. O processamento
            ocorre 100% localmente no navegador com categorização automática.
          </p>

          <div className="form-field" style={{ marginBottom: 12 }}>
            <label>Conta de Destino Padrão para o Extrato</label>
            <select
              value={defaultImportAccount}
              onChange={(e) => setDefaultImportAccount(e.target.value)}
            >
              {accounts.map((a) => (
                <option key={a.id} value={a.id}>
                  {a.name}
                </option>
              ))}
            </select>
          </div>

          <input
            ref={statementFileInputRef}
            type="file"
            accept=".ofx,.csv,.txt"
            onChange={handleStatementFileUpload}
            style={{ display: 'none' }}
          />

          <div className="export-buttons-stack">
            <button
              type="button"
              className="btn-primary"
              onClick={() => statementFileInputRef.current?.click()}
            >
              <Upload size={16} /> Selecionar Arquivo .OFX ou .CSV do Computador
            </button>
            <button
              type="button"
              className="btn-secondary-sm"
              onClick={handleLoadSampleOFX}
            >
              Testar com Extrato OFX de Exemplo (3 Lançamentos)
            </button>
          </div>
        </section>
      </div>

      {/* Pré-visualização de Importação OFX / CSV (quando houver itens carregados) */}
      {parsedItems.length > 0 && (
        <section className="panel-card">
          <header className="panel-header">
            <div>
              <span className="eyebrow">PRÉ-VISUALIZAÇÃO ANTES DE CRIPTOGRAFAR</span>
              <h3>{importSourceLabel}</h3>
            </div>
            <div className="row-actions">
              <button
                type="button"
                className="btn-secondary-sm"
                onClick={() => setParsedItems([])}
              >
                Cancelar
              </button>
              <button
                type="button"
                className="btn-primary"
                onClick={handleConfirmStatementImport}
              >
                Importar {parsedItems.filter((i) => i.selected).length} Lançamentos
              </button>
            </div>
          </header>

          <div className="ledger-table-scroll">
            <table className="ledger-table">
              <thead>
                <tr>
                  <th>IMPORTAR</th>
                  <th>DATA</th>
                  <th>DESCRIÇÃO</th>
                  <th>CATEGORIA SUGERIDA</th>
                  <th>CONTA</th>
                  <th className="align-right">VALOR</th>
                </tr>
              </thead>
              <tbody>
                {parsedItems.map((item, idx) => (
                  <tr key={item.tempId}>
                    <td>
                      <input
                        type="checkbox"
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

      {/* Linha 2: Alterar Senha Mestra & Auditoria do Envelope Criptográfico em Disco */}
      <div className="dashboard-bottom-grid">
        <section className="panel-card">
          <header className="panel-header">
            <div>
              <span className="eyebrow">ROTAÇÃO DE CHAVE E SEGURANÇA</span>
              <h3>Alterar Senha Mestra & Auto-Bloqueio</h3>
            </div>
            <KeyRound size={18} style={{ color: '#F59E0B' }} />
          </header>

          <div className="form-field" style={{ marginBottom: 16 }}>
            <label>Trancar Cofre Automaticamente por Inatividade</label>
            <select
              value={autoLockMinutes}
              onChange={(e) => onUpdateAutoLockMinutes(Number(e.target.value))}
            >
              <option value={5}>Após 5 minutos de inatividade</option>
              <option value={15}>Após 15 minutos de inatividade</option>
              <option value={30}>Após 30 minutos de inatividade</option>
              <option value={60}>Após 1 hora de inatividade</option>
            </select>
          </div>

          <form onSubmit={handlePasswordChangeSubmit} className="compact-stack-form">
            <div className="form-field">
              <label>Nova Senha Mestra</label>
              <input
                type="password"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                placeholder="Digite a nova senha mestra..."
                required
              />
            </div>

            <div className="form-field">
              <label>Confirmar Nova Senha Mestra</label>
              <input
                type="password"
                value={confirmNewPassword}
                onChange={(e) => setConfirmNewPassword(e.target.value)}
                placeholder="Repita a nova senha mestra..."
                required
              />
            </div>

            <button type="submit" className="btn-secondary" disabled={changingPw}>
              {changingPw
                ? 'Re-criptografando cofre...'
                : 'Rotacionar Chave e Re-Criptografar Cofre'}
            </button>
          </form>
        </section>

        {/* Auditoria Criptográfica em Tempo Real */}
        <section className="panel-card">
          <header className="panel-header">
            <div>
              <span className="eyebrow">AUDITORIA ZERO-KNOWLEDGE</span>
              <h3>Inspeção do Cofre Cifrado no IndexedDB</h3>
            </div>
            <Terminal size={18} style={{ color: '#2DD4BF' }} />
          </header>

          <p className="panel-desc">
            Abaixo está a prova real do que está gravado no disco do seu navegador neste exato
            instante — zero dados em texto plano:
          </p>

          {envelope && (
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
          )}
        </section>
      </div>
    </div>
  );
};
