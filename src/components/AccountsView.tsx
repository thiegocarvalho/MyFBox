import React, { useMemo, useState } from 'react';
import { Wallet, Plus, Trash2, Edit3, Check, ArrowLeftRight } from 'lucide-react';
import type { Account, AccountType, Currency, Transaction } from '../types/finance';
import { formatMoney } from '../utils/formatters';
import {
  accountCurrency,
  computeAccountBalance,
  convertAmount,
  endOfMonthDate,
  parseDecimalInput,
} from '../utils/money';

interface AccountsViewProps {
  accounts: Account[];
  transactions: Transaction[];
  hideValues: boolean;
  usdToBrlRate?: number;
  selectedYearMonth: string;
  onAddAccount: (acc: Account) => void;
  onUpdateAccount: (acc: Account) => void;
  onDeleteAccount: (accId: string) => void;
  onTransferBetweenAccounts: (
    fromAccId: string,
    toAccId: string,
    amount: number,
    date: string,
    description: string
  ) => void;
}

const ACCOUNT_TYPE_LABELS: Record<AccountType, string> = {
  checking: 'Conta Corrente',
  savings: 'Poupança',
  investment: 'Reserva / Investimento',
  wallet: 'Carteira Física / Pix',
  credit: 'Cartão / Outros',
};

const COLORS = ['#C8FF00', '#38BDF8', '#F59E0B', '#10B981', '#8B5CF6', '#F43F5E'];

export const AccountsView: React.FC<AccountsViewProps> = ({
  accounts,
  transactions,
  hideValues,
  usdToBrlRate,
  selectedYearMonth,
  onAddAccount,
  onUpdateAccount,
  onDeleteAccount,
  onTransferBetweenAccounts,
}) => {
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editName, setEditName] = useState('');
  const [editInitial, setEditInitial] = useState('0');
  const [editInst, setEditInst] = useState('');

  // Form Nova Conta
  const [name, setName] = useState('');
  const [institution, setInstitution] = useState('');
  const [type, setType] = useState<AccountType>('checking');
  const [currency, setCurrency] = useState<Currency>('BRL');
  const [initialBalanceStr, setInitialBalanceStr] = useState('0');
  const [color, setColor] = useState(COLORS[0]);

  // Form Transferência entre Contas
  const [fromAcc, setFromAcc] = useState(accounts[0]?.id || '');
  const [toAcc, setToAcc] = useState(accounts[1]?.id || accounts[0]?.id || '');
  const [transferAmount, setTransferAmount] = useState('');
  const [transferDate, setTransferDate] = useState(() => new Date().toISOString().slice(0, 10));
  const [transferNote, setTransferNote] = useState('Transferência entre contas');

  const accountsWithMetrics = useMemo(() => {
    return accounts.map((acc) => {
      const { paidInflows, paidOutflows, currentBalance, projectedBalance, txCount } =
        computeAccountBalance(acc, transactions, usdToBrlRate, endOfMonthDate(selectedYearMonth));
      return {
        acc,
        paidInflows,
        paidOutflows,
        currentBalance,
        projectedBalance,
        txCount,
      };
    });
  }, [accounts, transactions, usdToBrlRate, selectedYearMonth]);

  const handleCreate = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;
    const initBal = parseDecimalInput(initialBalanceStr) || 0;
    onAddAccount({
      id: `acc_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
      name: name.trim(),
      institution: institution.trim() || undefined,
      type,
      currency,
      initialBalance: initBal,
      color,
    });
    setName('');
    setInstitution('');
    setInitialBalanceStr('0');
  };

  const handleTransfer = (e: React.FormEvent) => {
    e.preventDefault();
    const val = parseDecimalInput(transferAmount);
    if (!fromAcc || !toAcc || fromAcc === toAcc || Number.isNaN(val) || val <= 0) return;
    onTransferBetweenAccounts(fromAcc, toAcc, val, transferDate, transferNote);
    setTransferAmount('');
  };

  return (
    <div className="accounts-view-stack">
      <div className="budgets-cards-grid">
        {accountsWithMetrics.map((item) => {
          const isEditing = editingId === item.acc.id;

          return (
            <article key={item.acc.id} className="panel-card account-detail-card">
              <header className="budget-cat-header">
                <div className="budget-cat-title">
                  <span
                    className="account-color-bar"
                    style={{ backgroundColor: item.acc.color }}
                  />
                  <div>
                    {isEditing ? (
                      <input
                        type="text"
                        className="inline-edit-input"
                        value={editName}
                        onChange={(e) => setEditName(e.target.value)}
                      />
                    ) : (
                      <strong>{item.acc.name}</strong>
                    )}
                    <span className="account-inst-sub">
                      {ACCOUNT_TYPE_LABELS[item.acc.type]} •{' '}
                      {item.acc.institution || 'Custódia Própria'} •{' '}
                      <span className="curr-badge">{item.acc.currency || 'BRL'}</span>
                    </span>
                  </div>
                </div>

                <div className="row-actions">
                  {isEditing ? (
                    <button
                      type="button"
                      className="btn-settle-xs"
                      onClick={() => {
                        onUpdateAccount({
                          ...item.acc,
                          name: editName.trim() || item.acc.name,
                          institution: editInst.trim() || item.acc.institution,
                          initialBalance:
                            parseDecimalInput(editInitial) || 0,
                        });
                        setEditingId(null);
                      }}
                    >
                      <Check size={13} /> Salvar
                    </button>
                  ) : (
                    <button
                      type="button"
                      className="icon-btn-sm"
                      onClick={() => {
                        setEditingId(item.acc.id);
                        setEditName(item.acc.name);
                        setEditInst(item.acc.institution || '');
                        setEditInitial(String(item.acc.initialBalance));
                      }}
                    >
                      <Edit3 size={14} />
                    </button>
                  )}
                  {accounts.length > 1 && (
                    <button
                      type="button"
                      className="icon-btn-sm danger"
                      onClick={() => onDeleteAccount(item.acc.id)}
                      title="Remover conta"
                    >
                      <Trash2 size={14} />
                    </button>
                  )}
                </div>
              </header>

              <div className="account-balance-hero mono">
                <span className="sub-label">SALDO ATUAL LIQUIDADO</span>
                <div
                  className={`account-big-number ${
                    item.currentBalance >= 0 ? 'positive' : 'negative'
                  }`}
                >
                  {formatMoney(item.currentBalance, item.acc.currency || 'BRL', hideValues)}
                </div>
                {(() => {
                  const from = accountCurrency(item.acc);
                  const other = from === 'USD' ? 'BRL' : 'USD';
                  const converted = convertAmount(item.currentBalance, from, other, usdToBrlRate);
                  return converted !== null ? (
                    <span className="sub-label">≈ {formatMoney(converted, other, hideValues)}</span>
                  ) : null;
                })()}
              </div>

              <div className="account-stats-grid mono">
                <div>
                  <span>Saldo Inicial</span>
                  {isEditing ? (
                    <input
                      type="number"
                      step="0.01"
                      className="inline-budget-input mono"
                      value={editInitial}
                      onChange={(e) => setEditInitial(e.target.value)}
                    />
                  ) : (
                    <strong>{formatMoney(item.acc.initialBalance, item.acc.currency || 'BRL', hideValues)}</strong>
                  )}
                </div>
                <div>
                  <span>Entradas Pagas</span>
                  <strong className="positive">
                    +{formatMoney(item.paidInflows, item.acc.currency || 'BRL', hideValues)}
                  </strong>
                </div>
                <div>
                  <span>Saídas Pagas</span>
                  <strong className="negative">
                    -{formatMoney(item.paidOutflows, item.acc.currency || 'BRL', hideValues)}
                  </strong>
                </div>
                <div>
                  <span>Previsão fim do mês</span>
                  <strong>{formatMoney(item.projectedBalance, item.acc.currency || 'BRL', hideValues)}</strong>
                </div>
              </div>
            </article>
          );
        })}
      </div>

      <div className="dashboard-bottom-grid">
        {/* Formulário Nova Conta */}
        <section className="panel-card">
          <header className="panel-header">
            <div>
              <span className="eyebrow">ESTRUTURA PATRIMONIAL</span>
              <h3>Adicionar Nova Conta ou Carteira</h3>
            </div>
            <Wallet size={18} style={{ color: 'var(--color-accent)' }} />
          </header>

          <form onSubmit={handleCreate} className="compact-stack-form">
            <div className="form-grid-2">
              <div className="form-field">
                <label>Nome da Conta</label>
                <input
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Ex: Conta Internacional, Cofre Espécie..."
                  required
                />
              </div>

              <div className="form-field">
                <label>Instituição / Banco</label>
                <input
                  type="text"
                  value={institution}
                  onChange={(e) => setInstitution(e.target.value)}
                  placeholder="Ex: Itaú, Bradesco, Nubank, BTG..."
                />
              </div>
            </div>

            <div className="form-grid-3">
              <div className="form-field">
                <label>Modalidade</label>
                <select
                  value={type}
                  onChange={(e) => setType(e.target.value as AccountType)}
                >
                  <option value="checking">Conta Corrente</option>
                  <option value="investment">Reserva / Investimento</option>
                  <option value="savings">Poupança</option>
                  <option value="wallet">Carteira Física / Pix</option>
                  <option value="credit">Cartão / Outros</option>
                </select>
              </div>

              <div className="form-field">
                <label>Moeda Principal</label>
                <select
                  value={currency}
                  onChange={(e) => setCurrency(e.target.value as Currency)}
                >
                  <option value="BRL">Real Brasileiro (R$ BRL)</option>
                  <option value="USD">Dólar Americano ($ USD)</option>
                </select>
              </div>

              <div className="form-field">
                <label>Saldo Inicial ({currency === 'USD' ? 'US$' : 'R$'})</label>
                <input
                  type="number"
                  step="0.01"
                  className="mono"
                  value={initialBalanceStr}
                  onChange={(e) => setInitialBalanceStr(e.target.value)}
                />
              </div>
            </div>

            <div className="form-field">
              <label>Cor Identificadora</label>
              <div className="color-swatches-row">
                {COLORS.map((c) => (
                  <button
                    type="button"
                    key={c}
                    className={`color-swatch-btn ${color === c ? 'selected' : ''}`}
                    style={{ backgroundColor: c }}
                    onClick={() => setColor(c)}
                  />
                ))}
              </div>
            </div>

            <button type="submit" className="btn-primary">
              <Plus size={16} /> Adicionar Conta ao Cofre
            </button>
          </form>
        </section>

        {/* Transferência Interna entre Contas */}
        <section className="panel-card">
          <header className="panel-header">
            <div>
              <span className="eyebrow">MOVIMENTAÇÃO INTERNA</span>
              <h3>Transferir Saldo entre Contas</h3>
            </div>
            <ArrowLeftRight size={18} style={{ color: '#38BDF8' }} />
          </header>

          <form onSubmit={handleTransfer} className="compact-stack-form">
            <div className="form-grid-2">
              <div className="form-field">
                <label>Conta de Origem (Saída)</label>
                <select value={fromAcc} onChange={(e) => setFromAcc(e.target.value)}>
                  {accounts.map((a) => (
                    <option key={a.id} value={a.id}>
                      {a.name}
                    </option>
                  ))}
                </select>
              </div>

              <div className="form-field">
                <label>Conta de Destino (Entrada)</label>
                <select value={toAcc} onChange={(e) => setToAcc(e.target.value)}>
                  {accounts.map((a) => (
                    <option key={a.id} value={a.id}>
                      {a.name}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div className="form-grid-2">
              <div className="form-field">
                <label>
                  Valor da Transferência (
                  {accountCurrency(accounts.find((a) => a.id === fromAcc) ?? {}) === 'USD' ? 'US$' : 'R$'}
                  {' na origem'})
                </label>
                <input
                  type="number"
                  step="0.01"
                  min="0.01"
                  className="mono"
                  value={transferAmount}
                  onChange={(e) => setTransferAmount(e.target.value)}
                  placeholder="0,00"
                  required
                />
              </div>

              <div className="form-field">
                <label>Data</label>
                <input
                  type="date"
                  className="mono"
                  value={transferDate}
                  onChange={(e) => setTransferDate(e.target.value)}
                  required
                />
              </div>
            </div>

            <div className="form-field">
              <label>Descrição</label>
              <input
                type="text"
                value={transferNote}
                onChange={(e) => setTransferNote(e.target.value)}
              />
            </div>

            <button
              type="submit"
              className="btn-secondary"
              disabled={fromAcc === toAcc || !transferAmount}
            >
              <ArrowLeftRight size={15} /> Executar Transferência
            </button>
          </form>
        </section>
      </div>
    </div>
  );
};
