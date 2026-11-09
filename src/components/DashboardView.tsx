import React, { useMemo, useState } from 'react';
import {
  TrendingUp,
  TrendingDown,
  Wallet,
  Scale,
  CheckCircle2,
  Calendar,
  X,
  ArrowRight,
} from 'lucide-react';
import type { Account, Category, Transaction, TransactionType } from '../types/finance';
import {
  formatBRL,
  formatMoney,
  formatMonthYearLabel,
  getCurrentYearMonth,
  localTodayStr,
} from '../utils/formatters';
import {
  computeAccountBalance,
  convertAmount,
  computeNetWorth,
  endOfMonthDate,
  summarizeTransactions,
  txAmountInBrl,
} from '../utils/money';
import type { ExchangeRateSource } from '../services/currencyService';

const PENDING_PREVIEW = 6;
const MONTHS_SHORT = [
  'Jan',
  'Fev',
  'Mar',
  'Abr',
  'Mai',
  'Jun',
  'Jul',
  'Ago',
  'Set',
  'Out',
  'Nov',
  'Dez',
];

function daysBetween(from: string, to: string): number {
  const [y1, m1, d1] = from.split('-').map(Number);
  const [y2, m2, d2] = to.split('-').map(Number);
  return Math.round((Date.UTC(y2, m2 - 1, d2) - Date.UTC(y1, m1 - 1, d1)) / 86_400_000);
}

interface DashboardViewProps {
  selectedYearMonth: string;
  onSelectYearMonth: (ym: string) => void;
  transactions: Transaction[];
  categories: Category[];
  accounts: Account[];
  hideValues: boolean;
  usdToBrlRate?: number;
  rateSource?: ExchangeRateSource;
  onSettleTransaction: (txId: string, paidAt: string) => void;
  onOpenNewTransaction: (type: TransactionType) => void;
  onNavigateTab: (tab: 'transactions' | 'budgets' | 'accounts') => void;
}

export const DashboardView: React.FC<DashboardViewProps> = ({
  selectedYearMonth,
  onSelectYearMonth,
  transactions,
  categories,
  accounts,
  hideValues,
  usdToBrlRate,
  rateSource,
  onSettleTransaction,
  onOpenNewTransaction,
  onNavigateTab,
}) => {
  const effectiveRates = rateSource ?? usdToBrlRate;
  const catMap = useMemo(() => new Map(categories.map((c) => [c.id, c])), [categories]);
  const accMap = useMemo(() => new Map(accounts.map((a) => [a.id, a])), [accounts]);
  const todayStr = localTodayStr();

  const [settlingTransaction, setSettlingTransaction] = useState<Transaction | null>(null);
  const [paidOn, setPaidOn] = useState(todayStr);

  const handleOpenSettleModal = (tx: Transaction) => {
    setPaidOn(todayStr);
    setSettlingTransaction(tx);
  };

  const handleCloseSettleModal = () => {
    setSettlingTransaction(null);
  };

  const handleConfirmSettle = () => {
    if (!settlingTransaction || !paidOn || paidOn > todayStr) return;
    onSettleTransaction(settlingTransaction.id, paidOn);
    setSettlingTransaction(null);
  };

  const actualCurrentYearMonth = useMemo(() => getCurrentYearMonth(), []);

  const monthTransactions = useMemo(
    () => transactions.filter((t) => t.date.startsWith(selectedYearMonth)),
    [transactions, selectedYearMonth]
  );

  const metrics = useMemo(
    () => summarizeTransactions(monthTransactions, effectiveRates),
    [monthTransactions, effectiveRates]
  );
  const projectionUntil = endOfMonthDate(selectedYearMonth);

  const accountBalances = useMemo(() => {
    return accounts.map((acc) => {
      const { currency, currentBalance, projectedBalance } = computeAccountBalance(
        acc,
        transactions,
        effectiveRates,
        projectionUntil
      );
      return {
        ...acc,
        currency,
        currentBalance,
        projectedBalance,
      };
    });
  }, [accounts, transactions, effectiveRates, projectionUntil]);

  const netWorth = useMemo(
    () => computeNetWorth(accounts, transactions, effectiveRates, projectionUntil),
    [accounts, transactions, effectiveRates, projectionUntil]
  );

  const overdue = useMemo(() => {
    const monthStart = `${selectedYearMonth}-01`;
    let income = 0;
    let expense = 0;
    for (const tx of transactions) {
      if (tx.status !== 'pending' || tx.date >= monthStart) continue;
      const value = txAmountInBrl(tx, effectiveRates);
      if (tx.type === 'income') income += value;
      else expense += value;
    }
    return { income, expense };
  }, [transactions, selectedYearMonth, effectiveRates]);

  const pendingIncome = metrics.incomePending.brl + overdue.income;
  const hasAnyPending = metrics.hasPending || overdue.income > 0 || overdue.expense > 0;
  const monthName = formatMonthYearLabel(selectedYearMonth).split(' ')[0].toLowerCase();
  const lastDayLabel = (() => {
    const [y, m] = selectedYearMonth.split('-').map(Number);
    const last = new Date(y, m, 0).getDate();
    return `${String(last).padStart(2, '0')}/${String(m).padStart(2, '0')}`;
  })();
  const usdText = (value: number | null) =>
    value === null ? 'US$ — (sem cotação)' : formatMoney(value, 'USD', hideValues);

  const twelveMonthSeries = useMemo(() => {
    const [year] = selectedYearMonth.split('-');
    const buckets = Array.from({ length: 12 }, (_, i) => ({
      ym: `${year}-${String(i + 1).padStart(2, '0')}`,
      label: MONTHS_SHORT[i],
      income: 0,
      expense: 0,
      net: 0,
    }));

    for (const tx of transactions) {
      if (!tx.date.startsWith(year)) continue;
      const monthIdx = Number(tx.date.slice(5, 7)) - 1;
      if (monthIdx < 0 || monthIdx >= 12) continue;
      const valueBrl = txAmountInBrl(tx, effectiveRates);
      if (tx.type === 'income') buckets[monthIdx].income += valueBrl;
      else buckets[monthIdx].expense += valueBrl;
    }

    for (const b of buckets) {
      b.net = b.income - b.expense;
    }

    return buckets;
  }, [transactions, selectedYearMonth, effectiveRates]);

  const maxChartValue = useMemo(() => {
    return Math.max(100, ...twelveMonthSeries.flatMap((s) => [s.income, s.expense]));
  }, [twelveMonthSeries]);

  const categoryBreakdown = useMemo(() => {
    const map = new Map<string, { paid: number; pending: number; total: number }>();
    let totalExpenseAllBrl = 0;
    for (const tx of monthTransactions) {
      if (tx.type !== 'expense') continue;
      const valueBrl = txAmountInBrl(tx, effectiveRates);
      const cur = map.get(tx.categoryId) || { paid: 0, pending: 0, total: 0 };
      if (tx.status === 'paid') cur.paid += valueBrl;
      else cur.pending += valueBrl;
      cur.total += valueBrl;
      totalExpenseAllBrl += valueBrl;
      map.set(tx.categoryId, cur);
    }

    return Array.from(map.entries())
      .map(([categoryId, stats]) => {
        const cat = catMap.get(categoryId);
        const budget = cat?.monthlyBudget || 0;
        const pctOfExpense =
          totalExpenseAllBrl > 0 ? (stats.total / totalExpenseAllBrl) * 100 : 0;
        const pctOfBudget = budget > 0 ? (stats.total / budget) * 100 : 0;
        return {
          categoryId,
          name: cat?.name || 'Outros',
          color: cat?.color || '#94A3B8',
          ...stats,
          budget,
          pctOfExpense,
          pctOfBudget,
        };
      })
      .sort((a, b) => b.total - a.total);
  }, [monthTransactions, catMap, effectiveRates]);

  const pendingTransactions = useMemo(() => {
    return monthTransactions
      .filter((t) => t.status === 'pending')
      .sort((a, b) => a.date.localeCompare(b.date));
  }, [monthTransactions]);

  const h1Series = useMemo(() => twelveMonthSeries.slice(0, 6), [twelveMonthSeries]);
  const h2Series = useMemo(() => twelveMonthSeries.slice(6, 12), [twelveMonthSeries]);

  const h1Net = useMemo(() => h1Series.reduce((sum, m) => sum + m.net, 0), [h1Series]);
  const h2Net = useMemo(() => h2Series.reduce((sum, m) => sum + m.net, 0), [h2Series]);

  const renderCashflowMonth = (item: (typeof twelveMonthSeries)[number]) => {
    const incHeight = Math.max(4, Math.round((item.income / maxChartValue) * 100));
    const expHeight = Math.max(4, Math.round((item.expense / maxChartValue) * 100));
    const isSelected = item.ym === selectedYearMonth;
    const isActualCurrent = item.ym === actualCurrentYearMonth;

    return (
      <button
        type="button"
        key={item.ym}
        className={`cashflow-col-btn ${isSelected ? 'selected' : ''} ${
          isActualCurrent ? 'is-actual-current' : ''
        }`}
        onClick={() => onSelectYearMonth(item.ym)}
        aria-pressed={isSelected}
      >
        <div className="cf-tooltip" role="tooltip" aria-hidden="true">
          <div className="cf-tooltip-header">
            <span className="cf-tooltip-title">{formatMonthYearLabel(item.ym)}</span>
            {isActualCurrent && <span className="cf-tooltip-badge">Atual</span>}
            {isSelected && <span className="cf-tooltip-badge focal">Foco</span>}
          </div>
          <div className="cf-tooltip-body">
            <div className="cf-tooltip-row pos">
              <span className="cf-tooltip-label">
                <i className="cf-tooltip-dot income" /> Receitas
              </span>
              <span className="mono">{formatBRL(item.income, hideValues)}</span>
            </div>
            <div className="cf-tooltip-row neg">
              <span className="cf-tooltip-label">
                <i className="cf-tooltip-dot expense" /> Despesas
              </span>
              <span className="mono">{formatBRL(item.expense, hideValues)}</span>
            </div>
            <div className="cf-tooltip-divider" />
            <div className={`cf-tooltip-row net ${item.net >= 0 ? 'pos' : 'neg'}`}>
              <span className="cf-tooltip-label">Saldo</span>
              <strong className="mono">
                {item.net > 0 ? '+' : ''}
                {formatBRL(item.net, hideValues)}
              </strong>
            </div>
          </div>
        </div>

        <div className="cf-col-badge-wrapper">
          {isActualCurrent ? (
            <span className="cf-col-badge-current">ATUAL</span>
          ) : isSelected ? (
            <span className="cf-col-badge-selected">FOCO</span>
          ) : (
            <span className="cf-col-badge-spacer" />
          )}
        </div>

        <div
          className={`cashflow-col-net mono ${isSelected ? 'is-selected' : ''} ${
            item.net > 0 ? 'pos' : item.net < 0 ? 'neg' : ''
          }`}
        >
          {item.net === 0
            ? '—'
            : `${item.net > 0 ? '+' : ''}${Math.round(item.net / 100) / 10}k`}
        </div>

        <div className="cashflow-bars-pair">
          <div
            className="cf-bar income"
            style={{ height: `${item.income > 0 ? incHeight : 3}px` }}
            title={`Receitas: ${formatBRL(item.income, hideValues)}`}
          />
          <div
            className="cf-bar expense"
            style={{ height: `${item.expense > 0 ? expHeight : 3}px` }}
            title={`Despesas: ${formatBRL(item.expense, hideValues)}`}
          />
        </div>

        <div className="cashflow-col-bottom">
          <span className={`cashflow-col-label mono ${isSelected ? 'selected-pill' : ''}`}>
            {item.label}
          </span>
        </div>
      </button>
    );
  };

  return (
    <div className="dashboard-stack">
      <section className="kpi-grid-4">
        <article className="kpi-card">
          <div className="kpi-card-top">
            <span className="kpi-label">SALDO HOJE</span>
            <Wallet size={17} className="kpi-icon teal" />
          </div>
          <div className="kpi-value mono">{formatBRL(netWorth.current.brl, hideValues)}</div>
          <div className="kpi-sub">
            <span>Só o que já foi pago ou recebido</span>
          </div>
          {netWorth.current.usd !== null && (
            <div className="kpi-sub kpi-usd-line">≈ {usdText(netWorth.current.usd)}</div>
          )}
        </article>

        <article className="kpi-card">
          <div className="kpi-card-top">
            <span className="kpi-label">ENTRADAS DO MÊS</span>
            <TrendingUp size={17} className="kpi-icon green" />
          </div>
          <div className="kpi-value mono positive">
            {formatBRL(metrics.incomePaid.brl, hideValues)}
          </div>
          <div className="kpi-sub">
            <span>Recebido em {monthName}</span>
          </div>
          {pendingIncome > 0 && (
            <div className="kpi-sub">
              <span className="pending-tag">
                + {formatBRL(pendingIncome, hideValues)} a receber
              </span>
            </div>
          )}
        </article>

        <article className="kpi-card">
          <div className="kpi-card-top">
            <span className="kpi-label">SAÍDAS DO MÊS</span>
            <TrendingDown size={17} className="kpi-icon coral" />
          </div>
          <div className="kpi-value mono negative">
            {formatBRL(metrics.expensePaid.brl, hideValues)}
          </div>
          <div className="kpi-sub">
            <span>Pago em {monthName}</span>
          </div>
          {metrics.expensePending.brl > 0 && (
            <div className="kpi-sub">
              <span className="pending-tag">
                + {formatBRL(metrics.expensePending.brl, hideValues)} a pagar até {lastDayLabel}
              </span>
            </div>
          )}
          {overdue.expense > 0 && (
            <div className="kpi-sub">
              <span className="overdue-tag">
                + {formatBRL(overdue.expense, hideValues)} em atraso de meses anteriores
              </span>
            </div>
          )}
        </article>

        <article className="kpi-card">
          <div className="kpi-card-top">
            <span className="kpi-label">SALDO PREVISTO</span>
            <Scale size={17} className="kpi-icon brass" />
          </div>
          <div className={`kpi-value mono ${netWorth.projected.brl >= 0 ? '' : 'negative'}`}>
            {formatBRL(netWorth.projected.brl, hideValues)}
          </div>
          <div className="kpi-sub">
            <span>
              {hasAnyPending
                ? `Em ${lastDayLabel}, depois de pagar e receber o que está pendente`
                : `Em ${lastDayLabel} · nada pendente`}
            </span>
          </div>
          {netWorth.projected.usd !== null && (
            <div className="kpi-sub kpi-usd-line">≈ {usdText(netWorth.projected.usd)}</div>
          )}
        </article>
      </section>

      <div className="dashboard-main-grid">
        <section className="panel-card cashflow-panel-card">
          <header className="panel-header cashflow-panel-header">
            <div>
              <span className="eyebrow">HISTÓRICO E PROJEÇÃO</span>
              <div className="cashflow-title-row">
                <h3>Fluxo de Caixa Comparativo (12 Meses)</h3>
                {selectedYearMonth === actualCurrentYearMonth ? (
                  <span className="cf-current-pill" title="Visualizando o mês atual do calendário">
                    <span className="cf-pulse-dot" />
                    Mês Atual
                  </span>
                ) : (
                  <button
                    type="button"
                    className="cf-current-quick-btn"
                    onClick={() => onSelectYearMonth(actualCurrentYearMonth)}
                    title="Voltar visualização para o mês atual"
                  >
                    <Calendar size={13} />
                    Ir para Mês Atual
                  </button>
                )}
              </div>
            </div>
            <div className="chart-legend-inline">
              <span>
                <i className="legend-swatch income" /> Receitas
              </span>
              <span>
                <i className="legend-swatch expense" /> Despesas
              </span>
            </div>
          </header>

          <div className="cashflow-2row-stage">
            <div className="cf-semester-block">
              <div className="cf-semester-header">
                <div className="cf-semester-title-wrap">
                  <span className="cf-semester-tag">1º Semestre</span>
                  <span className="cf-semester-meta">Jan – Jun</span>
                </div>
                <div className="cf-semester-summary mono">
                  <span className="cf-sem-label">Saldo Semestral:</span>
                  <strong className={h1Net >= 0 ? 'pos' : 'neg'}>
                    {h1Net > 0 ? '+' : ''}
                    {formatBRL(h1Net, hideValues)}
                  </strong>
                </div>
              </div>
              <div className="cashflow-bars-stage">{h1Series.map(renderCashflowMonth)}</div>
            </div>

            <div className="cf-semester-block">
              <div className="cf-semester-header">
                <div className="cf-semester-title-wrap">
                  <span className="cf-semester-tag">2º Semestre</span>
                  <span className="cf-semester-meta">Jul – Dez</span>
                </div>
                <div className="cf-semester-summary mono">
                  <span className="cf-sem-label">Saldo Semestral:</span>
                  <strong className={h2Net >= 0 ? 'pos' : 'neg'}>
                    {h2Net > 0 ? '+' : ''}
                    {formatBRL(h2Net, hideValues)}
                  </strong>
                </div>
              </div>
              <div className="cashflow-bars-stage">{h2Series.map(renderCashflowMonth)}</div>
            </div>
          </div>
        </section>

        <section className="panel-card">
          <header className="panel-header">
            <div>
              <span className="eyebrow">LIQUIDAÇÃO RÁPIDA</span>
              <h3>Pendentes neste Mês ({pendingTransactions.length})</h3>
            </div>
            <button
              type="button"
              className="panel-header-action"
              onClick={() => onNavigateTab('transactions')}
            >
              <span>Ver todos os lançamentos</span>
              <ArrowRight size={13} className="action-arrow" aria-hidden />
            </button>
          </header>

          {pendingTransactions.length === 0 ? (
            <div className="empty-state-compact">
              <CheckCircle2 size={22} style={{ color: 'var(--color-accent)' }} />
              <p>
                Todos os lançamentos de {formatMonthYearLabel(selectedYearMonth)} estão quitados.
              </p>
            </div>
          ) : (
            <>
              <ul className="pending-quick-list">
                {pendingTransactions.slice(0, PENDING_PREVIEW).map((tx) => {
                  const cat = catMap.get(tx.categoryId);
                  const acc = accMap.get(tx.accountId);
                  const daysLate = daysBetween(tx.date, todayStr);
                  const [, mm, dd] = tx.date.split('-');
                  return (
                    <li key={tx.id} className={`pq-item ${daysLate > 0 ? 'late' : ''}`}>
                      <span className="pq-date" aria-hidden>
                        <span className="pq-day">{dd}</span>
                        <span className="pq-month">{MONTHS_SHORT[Number(mm) - 1]}</span>
                      </span>
                      <div className="pq-info">
                        <strong className="pq-title">{tx.description}</strong>
                        <span className="pq-meta">
                          {daysLate > 0 && (
                            <span className="pq-late">
                              {daysLate === 1 ? 'Venceu ontem' : `Venceu há ${daysLate} dias`}
                            </span>
                          )}
                          {daysLate === 0 && <span className="pq-today">Vence hoje</span>}
                          <span>{cat?.name || 'Geral'}</span>
                          {accounts.length > 1 && <span>{acc?.name || 'Conta'}</span>}
                        </span>
                      </div>
                      <span
                        className={`mono pq-amount ${tx.type === 'income' ? 'positive' : 'negative'}`}
                      >
                        {tx.type === 'income' ? '+' : '−'}
                        {formatMoney(tx.amount, tx.currency || 'BRL', hideValues)}
                      </span>
                      <button
                        type="button"
                        className="pq-action"
                        onClick={() => handleOpenSettleModal(tx)}
                        aria-label={`${tx.type === 'income' ? 'Receber' : 'Quitar'}: ${tx.description}`}
                      >
                        <CheckCircle2 size={15} aria-hidden />
                        {tx.type === 'income' ? 'Receber' : 'Quitar'}
                      </button>
                    </li>
                  );
                })}
              </ul>
              {pendingTransactions.length > PENDING_PREVIEW && (
                <button
                  type="button"
                  className="btn-link-sm pq-more"
                  onClick={() => onNavigateTab('transactions')}
                >
                  <span>Ver mais {pendingTransactions.length - PENDING_PREVIEW} pendentes</span>
                  <ArrowRight size={13} className="action-arrow" aria-hidden />
                </button>
              )}
            </>
          )}
        </section>
      </div>

      <div className="dashboard-bottom-grid">
        <section className="panel-card">
          <header className="panel-header">
            <div>
              <span className="eyebrow">DISTRIBUIÇÃO DE GASTOS</span>
              <h3>Despesas por Categoria no Mês</h3>
            </div>
            <button
              type="button"
              className="panel-header-action"
              onClick={() => onNavigateTab('budgets')}
            >
              <span>Configurar Metas</span>
              <ArrowRight size={13} className="action-arrow" aria-hidden />
            </button>
          </header>

          {categoryBreakdown.length === 0 ? (
            <div className="empty-state-compact">
              <p>Nenhuma despesa registrada em {formatMonthYearLabel(selectedYearMonth)}.</p>
              <button
                type="button"
                className="btn-secondary-sm"
                onClick={() => onOpenNewTransaction('expense')}
              >
                + Registrar primeira despesa
              </button>
            </div>
          ) : (
            <div className="category-breakdown-list">
              {categoryBreakdown.map((item) => {
                const overBudget = item.budget > 0 && item.total > item.budget;
                const warnBudget = item.budget > 0 && !overBudget && item.pctOfBudget >= 80;

                return (
                  <div key={item.categoryId} className="cat-row-item">
                    <div className="cat-row-top">
                      <div className="cat-row-title">
                        <span className="cat-color-dot" style={{ backgroundColor: item.color }} />
                        <strong>{item.name}</strong>
                        <span className="cat-share-badge mono">
                          {item.pctOfExpense.toFixed(0)}%
                        </span>
                        {overBudget && (
                          <span className="budget-alert-chip danger">Acima da meta</span>
                        )}
                        {warnBudget && (
                          <span className="budget-alert-chip warning">80%+ da meta</span>
                        )}
                      </div>
                      <div className="cat-row-figures mono">
                        <strong>{formatBRL(item.total, hideValues)}</strong>
                        {item.budget > 0 && (
                          <span className="cat-budget-ref">
                            / {formatBRL(item.budget, hideValues)}
                          </span>
                        )}
                      </div>
                    </div>
                    <div className="cat-progress-track">
                      <div
                        className="cat-progress-fill"
                        style={{
                          width: `${Math.min(
                            100,
                            item.budget > 0 ? item.pctOfBudget : item.pctOfExpense
                          )}%`,
                          backgroundColor: overBudget
                            ? '#F43F5E'
                            : warnBudget
                              ? '#F59E0B'
                              : item.color,
                        }}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </section>

        <section className="panel-card">
          <header className="panel-header">
            <div>
              <span className="eyebrow">PATRIMÔNIO DISPONÍVEL</span>
              <h3>Saldos por Conta / Carteira</h3>
            </div>
            <button
              type="button"
              className="panel-header-action"
              onClick={() => onNavigateTab('accounts')}
            >
              <span>Gerenciar Contas</span>
              <ArrowRight size={13} className="action-arrow" aria-hidden />
            </button>
          </header>

          <div className="accounts-mini-list">
            {accountBalances.map((acc) => (
              <div key={acc.id} className="account-mini-row">
                <div className="account-mini-info">
                  <span className="account-color-bar" style={{ backgroundColor: acc.color }} />
                  <div>
                    <strong>{acc.name}</strong>
                    <span className="account-inst-sub">
                      {acc.institution || 'Carteira Local'}
                    </span>
                  </div>
                </div>
                <div
                  className={`account-mini-bal mono ${acc.currentBalance >= 0 ? 'pos' : 'neg'}`}
                >
                  {formatMoney(acc.currentBalance, acc.currency, hideValues)}
                  {acc.currency !== 'BRL' && <span className="badge-usd-sm">{acc.currency}</span>}
                  {(() => {
                    const other = acc.currency === 'BRL' ? 'USD' : 'BRL';
                    const converted = convertAmount(
                      acc.currentBalance,
                      acc.currency,
                      other,
                      effectiveRates
                    );
                    return (
                      <span className="account-inst-sub">
                        {converted !== null && <>≈ {formatMoney(converted, other, hideValues)} · </>}
                        Previsão: {formatMoney(acc.projectedBalance, acc.currency, hideValues)}
                      </span>
                    );
                  })()}
                </div>
              </div>
            ))}
          </div>
        </section>
      </div>

      {settlingTransaction && (
        <div
          className="modal-backdrop"
          onClick={handleCloseSettleModal}
          onKeyDown={(e) => {
            if (e.key === 'Escape') handleCloseSettleModal();
          }}
        >
          <div
            className="modal-card settle-modal-card"
            role="dialog"
            aria-modal="true"
            aria-labelledby="settle-title"
            onClick={(e) => e.stopPropagation()}
          >
            <header className="modal-header">
              <h2 id="settle-title">
                {settlingTransaction.type === 'income'
                  ? 'Confirmar Recebimento'
                  : 'Confirmar Quitação'}
              </h2>
              <button
                type="button"
                className="icon-btn"
                onClick={handleCloseSettleModal}
                aria-label="Fechar"
              >
                <X size={18} />
              </button>
            </header>

            <form
              className="modal-body"
              onSubmit={(e) => {
                e.preventDefault();
                handleConfirmSettle();
              }}
            >
              <div className="settle-modal-summary">
                <div className="settle-modal-main">
                  <span className="eyebrow">
                    {settlingTransaction.type === 'income'
                      ? 'RECEITA A RECEBER'
                      : 'DESPESA A QUITAR'}
                  </span>
                  <h3 className="settle-modal-title">{settlingTransaction.description}</h3>
                  <div
                    className={`settle-modal-amount mono ${
                      settlingTransaction.type === 'income' ? 'positive' : 'negative'
                    }`}
                  >
                    {settlingTransaction.type === 'income' ? '+' : '−'}
                    {formatMoney(
                      settlingTransaction.amount,
                      settlingTransaction.currency || 'BRL',
                      hideValues
                    )}
                  </div>
                </div>

                <div className="settle-modal-meta">
                  <span className="settle-modal-meta-item">
                    <span
                      className="cat-color-dot"
                      style={{
                        backgroundColor:
                          catMap.get(settlingTransaction.categoryId)?.color || '#94A3B8',
                      }}
                    />
                    {catMap.get(settlingTransaction.categoryId)?.name || 'Geral'}
                  </span>
                  <span className="settle-modal-meta-item">
                    {accMap.get(settlingTransaction.accountId)?.name || 'Conta principal'}
                  </span>
                  <span className="settle-modal-meta-item">
                    Vencimento: {settlingTransaction.date.split('-').reverse().join('/')}
                  </span>
                </div>
              </div>

              <div className="form-field">
                <label htmlFor="settle-paid-on">
                  {settlingTransaction.type === 'income'
                    ? 'Data do recebimento'
                    : 'Data do pagamento'}
                </label>
                <input
                  id="settle-paid-on"
                  type="date"
                  value={paidOn}
                  max={todayStr}
                  onChange={(e) => setPaidOn(e.target.value)}
                  required
                  autoFocus
                />
                <span className="field-hint">
                  A data não pode ser futura. Padrão: hoje (
                  {todayStr.split('-').reverse().join('/')}).
                </span>
              </div>

              <footer className="modal-footer">
                <button
                  type="button"
                  className="btn-secondary"
                  onClick={handleCloseSettleModal}
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="btn-primary"
                  disabled={!paidOn || paidOn > todayStr}
                >
                  <CheckCircle2 size={15} />
                  {settlingTransaction.type === 'income'
                    ? 'Confirmar Recebimento'
                    : 'Confirmar Quitação'}
                </button>
              </footer>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
