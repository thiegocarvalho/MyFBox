import React, { useMemo, useState, useEffect } from 'react';
import {
  Wallet,
  Plus,
  Trash2,
  Edit3,
  Check,
  ArrowLeftRight,
  AlertTriangle,
  X,
  Landmark,
  TrendingUp,
  Shield,
  PiggyBank,
  CreditCard,
  ArrowDownLeft,
  ArrowUpRight,
  Coins,
  Clock,
  Activity,
} from 'lucide-react';
import type { Account, AccountType, Currency, Transaction } from '../types/finance';
import { generateEntityId } from '../domain/id';
import { formatMoney, localTodayStr } from '../utils/formatters';
import {
  accountCurrency,
  computeAccountBalance,
  convertAmount,
  endOfMonthDate,
  parseDecimalInput,
} from '../utils/money';
import {
  POPULAR_CURRENCIES,
  getCurrencySymbol,
  getCurrencyFlag,
  type ExchangeRateSource,
} from '../services/currencyService';

interface AccountsViewProps {
  accounts: Account[];
  transactions: Transaction[];
  hideValues: boolean;
  usdToBrlRate?: number;
  rateSource?: ExchangeRateSource;
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
  reserve: 'Reserva',
  investment: 'Investimento',
  checking: 'Conta Corrente',
  credit: 'Cartão',
  wallet: 'Carteira',
  savings: 'Poupança',
};

const ACCOUNT_TYPE_ICONS: Record<
  AccountType,
  React.ComponentType<{ size?: number; className?: string; style?: React.CSSProperties }>
> = {
  reserve: Shield,
  investment: TrendingUp,
  checking: Landmark,
  credit: CreditCard,
  wallet: Wallet,
  savings: PiggyBank,
};

const COLORS = ['#C8FF00', '#38BDF8', '#F59E0B', '#10B981', '#8B5CF6', '#F43F5E'];

export const AccountsView: React.FC<AccountsViewProps> = ({
  accounts,
  transactions,
  hideValues,
  usdToBrlRate,
  rateSource,
  selectedYearMonth,
  onAddAccount,
  onUpdateAccount,
  onDeleteAccount,
  onTransferBetweenAccounts,
}) => {
  const effectiveRates = rateSource ?? usdToBrlRate;

  const [accountToEdit, setAccountToEdit] = useState<Account | null>(null);
  const [editName, setEditName] = useState('');
  const [editColor, setEditColor] = useState(COLORS[0]);

  const handleOpenEdit = (acc: Account) => {
    setAccountToEdit(acc);
    setEditName(acc.name);
    setEditColor(acc.color || COLORS[0]);
  };

  const handleSaveEdit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!accountToEdit || !editName.trim()) return;
    onUpdateAccount({
      ...accountToEdit,
      name: editName.trim(),
      color: editColor,
    });
    setAccountToEdit(null);
  };

  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [name, setName] = useState('');
  const [type, setType] = useState<AccountType>('reserve');
  const [currency, setCurrency] = useState<Currency>('BRL');
  const [initialBalanceStr, setInitialBalanceStr] = useState('0');
  const [color, setColor] = useState(COLORS[0]);

  const [isTransferModalOpen, setIsTransferModalOpen] = useState(false);
  const [fromAcc, setFromAcc] = useState(accounts[0]?.id || '');
  const [toAcc, setToAcc] = useState(accounts[1]?.id || accounts[0]?.id || '');
  const [transferAmount, setTransferAmount] = useState('');
  const [transferDate, setTransferDate] = useState(() => localTodayStr());
  const [transferNote, setTransferNote] = useState('Transferência entre contas');

  const handleOpenTransferModal = (preferredFromAccId?: string) => {
    if (accounts.length >= 2) {
      const fromId =
        preferredFromAccId || (accounts.some((a) => a.id === fromAcc) ? fromAcc : accounts[0].id);
      const toId = accounts.some((a) => a.id === toAcc && a.id !== fromId)
        ? toAcc
        : accounts.find((a) => a.id !== fromId)?.id || accounts[1]?.id || accounts[0].id;
      setFromAcc(fromId);
      setToAcc(toId);
    }
    setIsTransferModalOpen(true);
  };

  const [accountToDelete, setAccountToDelete] = useState<Account | null>(null);

  useEffect(() => {
    if (!accountToDelete && !isAddModalOpen && !isTransferModalOpen && !accountToEdit) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setAccountToDelete(null);
        setIsAddModalOpen(false);
        setIsTransferModalOpen(false);
        setAccountToEdit(null);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [accountToDelete, isAddModalOpen, isTransferModalOpen, accountToEdit]);

  const accountsWithMetrics = useMemo(() => {
    const asOf = endOfMonthDate(selectedYearMonth);
    return accounts.map((acc) => ({
      acc,
      ...computeAccountBalance(acc, transactions, effectiveRates, asOf),
    }));
  }, [accounts, transactions, effectiveRates, selectedYearMonth]);

  const handleCreate = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;
    const initBal = parseDecimalInput(initialBalanceStr) || 0;
    onAddAccount({
      id: generateEntityId('acc'),
      name: name.trim(),
      type,
      currency,
      initialBalance: initBal,
      color,
    });
    setName('');
    setType('reserve');
    setCurrency('BRL');
    setInitialBalanceStr('0');
    setIsAddModalOpen(false);
  };

  const handleTransfer = (e: React.FormEvent) => {
    e.preventDefault();
    const val = parseDecimalInput(transferAmount);
    if (!fromAcc || !toAcc || fromAcc === toAcc || Number.isNaN(val) || val <= 0) return;
    onTransferBetweenAccounts(fromAcc, toAcc, val, transferDate, transferNote);
    setTransferAmount('');
    setIsTransferModalOpen(false);
  };

  return (
    <div className="accounts-view-stack">
      <section className="accounts-header-banner">
        <div>
          <span className="eyebrow">ESTRUTURA PATRIMONIAL</span>
          <h2>Contas & Carteiras ({accounts.length})</h2>
        </div>

        <div className="accounts-top-actions">
          <button
            type="button"
            className="btn-secondary"
            onClick={() => handleOpenTransferModal()}
            title="Transferir valor entre contas"
          >
            <ArrowLeftRight size={15} />
            Transferir Saldo
          </button>

          <button
            type="button"
            className="btn-primary"
            onClick={() => setIsAddModalOpen(true)}
          >
            <Plus size={16} />
            Nova Conta
          </button>
        </div>
      </section>

      <div className="budgets-cards-grid">
        {accountsWithMetrics.map((item) => {
          const IconComp = ACCOUNT_TYPE_ICONS[item.acc.type] || Wallet;
          const curr = item.acc.currency || 'BRL';
          const flag = getCurrencyFlag(curr);

          const netFlow = item.monthPaidInflows - item.monthPaidOutflows;
          const totalFlow = item.monthPaidInflows + item.monthPaidOutflows;
          const inflowPct = totalFlow > 0 ? (item.monthPaidInflows / totalFlow) * 100 : 0;
          const outflowPct = totalFlow > 0 ? (item.monthPaidOutflows / totalFlow) * 100 : 0;
          const pendingDelta = item.projectedBalance - item.currentBalance;

          return (
            <article
              key={item.acc.id}
              className="panel-card account-detail-card"
              style={{ borderTop: `3px solid ${item.acc.color}` }}
            >
              <header className="account-card-header">
                <div className="account-identity">
                  <div
                    className="account-icon-avatar"
                    style={{
                      backgroundColor: `${item.acc.color}15`,
                      border: `1px solid ${item.acc.color}45`,
                      color: item.acc.color,
                    }}
                    title={`Tipo: ${ACCOUNT_TYPE_LABELS[item.acc.type] || item.acc.type}`}
                  >
                    <IconComp size={18} />
                  </div>

                  <div className="account-title-area">
                    <strong title={item.acc.name}>{item.acc.name}</strong>

                    <div className="account-badge-row">
                      <span className="acc-type-pill">
                        {ACCOUNT_TYPE_LABELS[item.acc.type] || item.acc.type}
                      </span>
                      <span className="acc-curr-pill">
                        {flag ? `${flag} ` : ''}
                        {curr}
                      </span>
                      <span className="acc-count-pill" title="Lançamentos vinculados a esta conta">
                        {item.txCount} {item.txCount === 1 ? 'mov.' : 'movs.'}
                      </span>
                    </div>
                  </div>
                </div>

                <div className="row-actions">
                  <button
                    type="button"
                    className="icon-btn-sm"
                    onClick={() => handleOpenTransferModal(item.acc.id)}
                    title={`Transferir a partir de ${item.acc.name}`}
                  >
                    <ArrowLeftRight size={14} />
                  </button>
                  <button
                    type="button"
                    className="icon-btn-sm"
                    onClick={() => handleOpenEdit(item.acc)}
                    title="Editar conta"
                  >
                    <Edit3 size={14} />
                  </button>
                  {accounts.length > 1 && (
                    <button
                      type="button"
                      className="icon-btn-sm danger"
                      onClick={() => setAccountToDelete(item.acc)}
                      title="Remover conta"
                    >
                      <Trash2 size={14} />
                    </button>
                  )}
                </div>
              </header>

              <div className="account-balance-hero mono">
                <div className="account-balance-top">
                  <span className="account-status-indicator">
                    <span
                      className="account-status-dot"
                      style={{
                        backgroundColor: item.acc.color,
                        boxShadow: `0 0 6px ${item.acc.color}`,
                      }}
                    />
                    SALDO ATUAL
                  </span>
                  {item.acc.institution && (
                    <span className="account-inst-badge" title="Instituição">
                      {item.acc.institution}
                    </span>
                  )}
                </div>

                <div
                  className={`account-big-number ${
                    item.currentBalance >= 0 ? 'positive' : 'negative'
                  }`}
                >
                  {formatMoney(item.currentBalance, curr, hideValues)}
                </div>

                <div className="account-hero-footer">
                  {totalFlow > 0 ? (
                    netFlow > 0 ? (
                      <span
                        className="account-delta-badge positive"
                        title="Entradas superaram saídas no mês"
                      >
                        <ArrowUpRight size={13} />+{formatMoney(netFlow, curr, hideValues)} no mês
                      </span>
                    ) : netFlow < 0 ? (
                      <span
                        className="account-delta-badge negative"
                        title="Saídas superaram entradas no mês"
                      >
                        <ArrowDownLeft size={13} />-{formatMoney(Math.abs(netFlow), curr, hideValues)}{' '}
                        no mês
                      </span>
                    ) : (
                      <span className="account-delta-badge neutral">
                        <Activity size={12} />
                        Saldo estável no mês
                      </span>
                    )
                  ) : (
                    <span className="account-delta-badge neutral">
                      <Activity size={12} />
                      Sem movimentações no mês
                    </span>
                  )}

                  {(() => {
                    const from = accountCurrency(item.acc);
                    const other = from === 'BRL' ? 'USD' : 'BRL';
                    const converted = convertAmount(
                      item.currentBalance,
                      from,
                      other,
                      effectiveRates
                    );
                    return converted !== null ? (
                      <span className="account-converted-sub">
                        ≈ {formatMoney(converted, other, hideValues)}
                      </span>
                    ) : null;
                  })()}
                </div>
              </div>

              <div className="account-flow-meter">
                <div className="account-flow-labels mono">
                  <span>FLUXO DO MÊS</span>
                  {totalFlow > 0 ? (
                    <span className="account-flow-ratio">
                      <span style={{ color: '#10b981' }}>{inflowPct.toFixed(0)}% ent.</span>
                      <span style={{ opacity: 0.35 }}>•</span>
                      <span style={{ color: 'var(--color-coral)' }}>
                        {outflowPct.toFixed(0)}% saí.
                      </span>
                    </span>
                  ) : (
                    <span style={{ opacity: 0.6 }}>0 movimentações no mês</span>
                  )}
                </div>

                <div className="account-flow-bar-track">
                  {totalFlow > 0 ? (
                    <>
                      <div
                        className="account-flow-bar-inflow"
                        style={{ width: `${inflowPct}%` }}
                        title={`Entradas pagas no mês: ${inflowPct.toFixed(1)}%`}
                      />
                      <div
                        className="account-flow-bar-outflow"
                        style={{ width: `${outflowPct}%` }}
                        title={`Saídas pagas no mês: ${outflowPct.toFixed(1)}%`}
                      />
                    </>
                  ) : (
                    <div className="account-flow-bar-empty" />
                  )}
                </div>
              </div>

              <div className="account-stats-tiles mono">
                <div className="acc-stat-tile">
                  <div className="acc-stat-tile-header">
                    <Coins size={12} style={{ color: 'var(--text-muted)' }} />
                    <span>Saldo Inicial</span>
                  </div>
                  <div className="acc-stat-tile-val">
                    {formatMoney(item.acc.initialBalance, curr, hideValues)}
                  </div>
                  <span className="acc-stat-tile-sub">Base inicial</span>
                </div>

                <div className="acc-stat-tile">
                  <div className="acc-stat-tile-header">
                    <ArrowDownLeft size={12} style={{ color: '#10b981' }} />
                    <span>Entradas</span>
                  </div>
                  <div className="acc-stat-tile-val inflow">
                    +{formatMoney(item.monthPaidInflows, curr, hideValues)}
                  </div>
                  <span className="acc-stat-tile-sub">Pagas no mês</span>
                </div>

                <div className="acc-stat-tile">
                  <div className="acc-stat-tile-header">
                    <ArrowUpRight size={12} style={{ color: 'var(--color-coral)' }} />
                    <span>Saídas</span>
                  </div>
                  <div className="acc-stat-tile-val outflow">
                    -{formatMoney(item.monthPaidOutflows, curr, hideValues)}
                  </div>
                  <span className="acc-stat-tile-sub">Pagas no mês</span>
                </div>

                <div className="acc-stat-tile">
                  <div className="acc-stat-tile-header">
                    <Clock size={12} style={{ color: '#38bdf8' }} />
                    <span>Previsão Fim Mês</span>
                  </div>
                  <div className="acc-stat-tile-val">
                    {formatMoney(item.projectedBalance, curr, hideValues)}
                  </div>
                  <span className="acc-stat-tile-sub">
                    {pendingDelta > 0 ? (
                      <span style={{ color: '#10b981' }}>
                        +{formatMoney(pendingDelta, curr, hideValues)} a entrar
                      </span>
                    ) : pendingDelta < 0 ? (
                      <span style={{ color: 'var(--color-coral)' }}>
                        -{formatMoney(Math.abs(pendingDelta), curr, hideValues)} a sair
                      </span>
                    ) : (
                      <span>Liquidado</span>
                    )}
                  </span>
                </div>
              </div>
            </article>
          );
        })}
      </div>

      {isAddModalOpen && (
        <div className="modal-backdrop" onClick={() => setIsAddModalOpen(false)}>
          <div
            className="modal-card"
            onClick={(e) => e.stopPropagation()}
            role="dialog"
            aria-modal="true"
            aria-labelledby="new-acc-modal-title"
            style={{ maxWidth: 540 }}
          >
            <header className="modal-header">
              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <Wallet size={18} style={{ color: 'var(--color-accent)' }} />
                <h2 id="new-acc-modal-title">Adicionar Nova Conta</h2>
              </div>
              <button
                type="button"
                className="icon-action-btn"
                onClick={() => setIsAddModalOpen(false)}
                title="Fechar (Esc)"
              >
                <X size={16} />
              </button>
            </header>

            <form onSubmit={handleCreate}>
              <div
                className="modal-body"
                style={{
                  padding: '22px 24px',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: 16,
                }}
              >
                <div className="form-field">
                  <label>Nome da Conta</label>
                  <input
                    type="text"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="Ex: Reserva de Emergência, Carteira Principal..."
                    required
                    autoFocus
                  />
                </div>

                <div className="form-grid-3">
                  <div className="form-field">
                    <label>Tipo</label>
                    <select
                      value={type}
                      onChange={(e) => setType(e.target.value as AccountType)}
                    >
                      <option value="reserve">Reserva</option>
                      <option value="investment">Investimento</option>
                      <option value="checking">Conta Corrente</option>
                      <option value="savings">Poupança</option>
                      <option value="credit">Cartão</option>
                      <option value="wallet">Carteira</option>
                    </select>
                  </div>

                  <div className="form-field">
                    <label>Moeda Principal</label>
                    <select
                      value={currency}
                      onChange={(e) => setCurrency(e.target.value as Currency)}
                    >
                      {POPULAR_CURRENCIES.map((c) => (
                        <option key={c.code} value={c.code}>
                          {c.flag} {c.code} — {c.name} ({c.symbol})
                        </option>
                      ))}
                    </select>
                  </div>

                  <div className="form-field">
                    <label>Saldo Inicial ({getCurrencySymbol(currency)})</label>
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
              </div>

              <footer
                className="modal-footer"
                style={{
                  padding: '16px 24px',
                  display: 'flex',
                  justifyContent: 'flex-end',
                  gap: 10,
                }}
              >
                <button
                  type="button"
                  className="btn-secondary"
                  onClick={() => setIsAddModalOpen(false)}
                >
                  Cancelar
                </button>
                <button type="submit" className="btn-primary">
                  <Plus size={16} /> Adicionar Conta
                </button>
              </footer>
            </form>
          </div>
        </div>
      )}

      {isTransferModalOpen && (
        <div className="modal-backdrop" onClick={() => setIsTransferModalOpen(false)}>
          <div
            className="modal-card"
            onClick={(e) => e.stopPropagation()}
            role="dialog"
            aria-modal="true"
            aria-labelledby="transfer-modal-title"
            style={{ maxWidth: 540 }}
          >
            <header className="modal-header">
              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <ArrowLeftRight size={18} style={{ color: '#38BDF8' }} />
                <h2 id="transfer-modal-title">Transferir Saldo entre Contas</h2>
              </div>
              <button
                type="button"
                className="icon-action-btn"
                onClick={() => setIsTransferModalOpen(false)}
                title="Fechar (Esc)"
              >
                <X size={16} />
              </button>
            </header>

            {accounts.length < 2 ? (
              <div>
                <div className="modal-body" style={{ padding: '32px 24px', textAlign: 'center' }}>
                  <div
                    style={{
                      width: 52,
                      height: 52,
                      margin: '0 auto 16px',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      background: 'rgba(56, 189, 248, 0.1)',
                      border: '1px solid rgba(56, 189, 248, 0.3)',
                      color: '#38BDF8',
                    }}
                  >
                    <ArrowLeftRight size={24} />
                  </div>
                  <h3 style={{ fontSize: 16, marginBottom: 8, color: 'var(--text-main)' }}>
                    Pelo menos 2 contas necessárias
                  </h3>
                  <p
                    style={{
                      color: 'var(--text-secondary)',
                      fontSize: 13,
                      maxWidth: 380,
                      margin: '0 auto 20px',
                      lineHeight: 1.5,
                    }}
                  >
                    Para transferir saldo entre contas, você precisa de uma conta de origem e outra de
                    destino. Atualmente você possui apenas{' '}
                    {accounts.length === 1 ? '1 conta cadastrada' : 'nenhuma conta'}.
                  </p>
                  <button
                    type="button"
                    className="btn-primary"
                    style={{ margin: '0 auto' }}
                    onClick={() => {
                      setIsTransferModalOpen(false);
                      setIsAddModalOpen(true);
                    }}
                  >
                    <Plus size={16} /> Cadastrar Nova Conta
                  </button>
                </div>
                <footer
                  className="modal-footer"
                  style={{ padding: '14px 24px', display: 'flex', justifyContent: 'flex-end' }}
                >
                  <button
                    type="button"
                    className="btn-secondary"
                    onClick={() => setIsTransferModalOpen(false)}
                  >
                    Fechar
                  </button>
                </footer>
              </div>
            ) : (
              <form onSubmit={handleTransfer}>
                <div
                  className="modal-body"
                  style={{
                    padding: '22px 24px',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: 16,
                  }}
                >
                  <div className="form-grid-2">
                    <div className="form-field">
                      <label>Conta de Origem (Saída)</label>
                      <select
                        value={fromAcc}
                        onChange={(e) => {
                          const newFrom = e.target.value;
                          setFromAcc(newFrom);
                          if (toAcc === newFrom) {
                            const other = accounts.find((a) => a.id !== newFrom);
                            if (other) setToAcc(other.id);
                          }
                        }}
                      >
                        {accounts.map((a) => (
                          <option key={a.id} value={a.id}>
                            {a.name} ({getCurrencySymbol(a.currency || 'BRL')})
                          </option>
                        ))}
                      </select>
                    </div>

                    <div className="form-field">
                      <label>Conta de Destino (Entrada)</label>
                      <select
                        value={toAcc}
                        onChange={(e) => {
                          const newTo = e.target.value;
                          setToAcc(newTo);
                          if (fromAcc === newTo) {
                            const other = accounts.find((a) => a.id !== newTo);
                            if (other) setFromAcc(other.id);
                          }
                        }}
                      >
                        {accounts.map((a) => (
                          <option key={a.id} value={a.id}>
                            {a.name} ({getCurrencySymbol(a.currency || 'BRL')})
                          </option>
                        ))}
                      </select>
                    </div>
                  </div>

                  <div className="form-grid-2">
                    <div className="form-field">
                      <label>
                        Valor (
                        {getCurrencySymbol(
                          accountCurrency(accounts.find((a) => a.id === fromAcc) ?? {})
                        )}
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
                        autoFocus
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
                </div>

                <footer
                  className="modal-footer"
                  style={{
                    padding: '16px 24px',
                    display: 'flex',
                    justifyContent: 'flex-end',
                    gap: 10,
                  }}
                >
                  <button
                    type="button"
                    className="btn-secondary"
                    onClick={() => setIsTransferModalOpen(false)}
                  >
                    Cancelar
                  </button>
                  <button
                    type="submit"
                    className="btn-primary"
                    disabled={fromAcc === toAcc || !transferAmount}
                  >
                    <ArrowLeftRight size={15} /> Executar Transferência
                  </button>
                </footer>
              </form>
            )}
          </div>
        </div>
      )}

      {accountToEdit && (
        <div className="modal-backdrop" onClick={() => setAccountToEdit(null)}>
          <div
            className="modal-card"
            onClick={(e) => e.stopPropagation()}
            role="dialog"
            aria-modal="true"
            aria-labelledby="edit-acc-modal-title"
            style={{ maxWidth: 540 }}
          >
            <header className="modal-header">
              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <Edit3 size={18} style={{ color: 'var(--color-accent)' }} />
                <h2 id="edit-acc-modal-title">Editar Conta</h2>
              </div>
              <button
                type="button"
                className="icon-action-btn"
                onClick={() => setAccountToEdit(null)}
                title="Fechar (Esc)"
              >
                <X size={16} />
              </button>
            </header>

            <form onSubmit={handleSaveEdit}>
              <div
                className="modal-body"
                style={{
                  padding: '22px 24px',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: 16,
                }}
              >
                <div className="edit-acc-readonly-info mono">
                  <div>
                    <span className="sub-label">TIPO</span>
                    <strong>{ACCOUNT_TYPE_LABELS[accountToEdit.type] || accountToEdit.type}</strong>
                  </div>
                  <div>
                    <span className="sub-label">MOEDA</span>
                    <strong>{accountToEdit.currency || 'BRL'}</strong>
                  </div>
                  <div>
                    <span className="sub-label">SALDO INICIAL</span>
                    <strong>
                      {formatMoney(accountToEdit.initialBalance, accountToEdit.currency || 'BRL')}
                    </strong>
                  </div>
                </div>

                <div className="form-field">
                  <label>Nome da Conta</label>
                  <input
                    type="text"
                    value={editName}
                    onChange={(e) => setEditName(e.target.value)}
                    placeholder="Ex: Reserva de Emergência, Carteira Principal..."
                    required
                    autoFocus
                  />
                </div>

                <div className="form-field">
                  <label>Cor Identificadora</label>
                  <div className="color-swatches-row">
                    {COLORS.map((c) => (
                      <button
                        type="button"
                        key={c}
                        className={`color-swatch-btn ${editColor === c ? 'selected' : ''}`}
                        style={{ backgroundColor: c }}
                        onClick={() => setEditColor(c)}
                      />
                    ))}
                  </div>
                </div>
              </div>

              <footer
                className="modal-footer"
                style={{
                  padding: '16px 24px',
                  display: 'flex',
                  justifyContent: 'flex-end',
                  gap: 10,
                }}
              >
                <button
                  type="button"
                  className="btn-secondary"
                  onClick={() => setAccountToEdit(null)}
                >
                  Cancelar
                </button>
                <button type="submit" className="btn-primary">
                  <Check size={16} /> Salvar Alterações
                </button>
              </footer>
            </form>
          </div>
        </div>
      )}

      {accountToDelete && (() => {
        const linkedCount = transactions.filter((t) => t.accountId === accountToDelete.id).length;

        return (
          <div className="modal-backdrop" onClick={() => setAccountToDelete(null)}>
            <div
              className="modal-card modal-delete-confirm"
              onClick={(e) => e.stopPropagation()}
              role="dialog"
              aria-modal="true"
              aria-labelledby="delete-acc-title"
            >
              <header className="modal-header">
                <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                  <AlertTriangle size={18} style={{ color: 'var(--color-coral)' }} />
                  <h2 id="delete-acc-title">Excluir Conta</h2>
                </div>
                <button
                  type="button"
                  className="icon-action-btn"
                  onClick={() => setAccountToDelete(null)}
                  title="Fechar (Esc)"
                >
                  <X size={16} />
                </button>
              </header>

              <div className="modal-body" style={{ padding: '22px 24px' }}>
                <div className="delete-confirm-box">
                  <div className="delete-confirm-cat-preview">
                    <span
                      className="account-color-bar"
                      style={{ backgroundColor: accountToDelete.color, width: 8, height: 16 }}
                    />
                    <strong>{accountToDelete.name}</strong>
                    <span className="curr-badge" style={{ marginLeft: 'auto' }}>
                      {accountToDelete.currency || 'BRL'}
                    </span>
                  </div>

                  <p className="delete-confirm-desc">
                    Tem certeza de que deseja excluir a conta{' '}
                    <strong>{accountToDelete.name}</strong>?
                  </p>

                  <div className="delete-confirm-impact">
                    {linkedCount > 0 ? (
                      <p>
                        ⚠️ Esta conta possui{' '}
                        <strong>
                          {linkedCount}{' '}
                          {linkedCount === 1 ? 'lançamento vinculado' : 'lançamentos vinculados'}
                        </strong>
                        . Seus dados não serão perdidos: os lançamentos serão automaticamente
                        transferidos para outra conta de mesma moeda.
                      </p>
                    ) : (
                      <p>
                        ✓ Nenhum lançamento está vinculado a esta conta. Ela será removida com
                        segurança.
                      </p>
                    )}
                  </div>
                </div>
              </div>

              <footer className="modal-footer" style={{ padding: '16px 24px' }}>
                <button
                  type="button"
                  className="btn-secondary"
                  onClick={() => setAccountToDelete(null)}
                >
                  Cancelar
                </button>
                <button
                  type="button"
                  className="btn-danger"
                  onClick={() => {
                    onDeleteAccount(accountToDelete.id);
                    setAccountToDelete(null);
                  }}
                  autoFocus
                >
                  <Trash2 size={14} /> Confirmar Exclusão
                </button>
              </footer>
            </div>
          </div>
        );
      })()}
    </div>
  );
};
