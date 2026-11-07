import React, { useMemo } from 'react';
import {
  TrendingUp,
  TrendingDown,
  Wallet,
  Scale,
  CheckCircle2,
  ArrowUpRight,
  ArrowDownRight,
  Clock,
} from 'lucide-react';
import type { Account, Category, Transaction, TransactionType } from '../types/finance';
import {
  formatBRL,
  formatMoney,
  formatMonthYearLabel,
  formatShortDate,
  shiftYearMonth,
} from '../utils/formatters';

interface DashboardViewProps {
  selectedYearMonth: string;
  onSelectYearMonth: (ym: string) => void;
  transactions: Transaction[];
  categories: Category[];
  accounts: Account[];
  hideValues: boolean;
  onToggleTransactionStatus: (txId: string) => void;
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
  onToggleTransactionStatus,
  onOpenNewTransaction,
  onNavigateTab,
}) => {
  const catMap = useMemo(() => new Map(categories.map((c) => [c.id, c])), [categories]);
  const accMap = useMemo(() => new Map(accounts.map((a) => [a.id, a])), [accounts]);

  const monthTransactions = useMemo(
    () => transactions.filter((t) => t.date.startsWith(selectedYearMonth)),
    [transactions, selectedYearMonth]
  );

  const metrics = useMemo(() => {
    let incomePaidBrl = 0;
    let incomePendingBrl = 0;
    let expensePaidBrl = 0;
    let expensePendingBrl = 0;

    let incomePaidUsd = 0;
    let incomePendingUsd = 0;
    let expensePaidUsd = 0;
    let expensePendingUsd = 0;

    for (const tx of monthTransactions) {
      const isUsd = tx.currency === 'USD';
      if (tx.type === 'income') {
        if (tx.status === 'paid') {
          if (isUsd) incomePaidUsd += tx.amount;
          else incomePaidBrl += tx.amount;
        } else {
          if (isUsd) incomePendingUsd += tx.amount;
          else incomePendingBrl += tx.amount;
        }
      } else {
        if (tx.status === 'paid') {
          if (isUsd) expensePaidUsd += tx.amount;
          else expensePaidBrl += tx.amount;
        } else {
          if (isUsd) expensePendingUsd += tx.amount;
          else expensePendingBrl += tx.amount;
        }
      }
    }

    const totalIncomeBrl = incomePaidBrl + incomePendingBrl;
    const totalExpenseBrl = expensePaidBrl + expensePendingBrl;
    const netResultBrl = totalIncomeBrl - totalExpenseBrl;
    const savingsRateBrl =
      totalIncomeBrl > 0 ? ((totalIncomeBrl - totalExpenseBrl) / totalIncomeBrl) * 100 : 0;

    const totalIncomeUsd = incomePaidUsd + incomePendingUsd;
    const totalExpenseUsd = expensePaidUsd + expensePendingUsd;
    const netResultUsd = totalIncomeUsd - totalExpenseUsd;

    const hasUsd = totalIncomeUsd > 0 || totalExpenseUsd > 0;

    return {
      incomePaidBrl,
      incomePendingBrl,
      totalIncomeBrl,
      expensePaidBrl,
      expensePendingBrl,
      totalExpenseBrl,
      netResultBrl,
      savingsRateBrl,

      incomePaidUsd,
      incomePendingUsd,
      totalIncomeUsd,
      expensePaidUsd,
      expensePendingUsd,
      totalExpenseUsd,
      netResultUsd,
      hasUsd,
    };
  }, [monthTransactions]);

  // Saldo líquido real por conta (considerando todos os lançamentos pagos até hoje)
  const accountBalances = useMemo(() => {
    return accounts.map((acc) => {
      let balance = acc.initialBalance;
      const accCurrency = acc.currency || 'BRL';
      for (const tx of transactions) {
        if (tx.accountId === acc.id && tx.status === 'paid') {
          balance += tx.type === 'income' ? tx.amount : -tx.amount;
        }
      }
      return {
        ...acc,
        currency: accCurrency,
        currentBalance: balance,
      };
    });
  }, [accounts, transactions]);

  const netWorth = useMemo(() => {
    let brl = 0;
    let usd = 0;
    for (const acc of accountBalances) {
      if (acc.currency === 'USD') usd += acc.currentBalance;
      else brl += acc.currentBalance;
    }
    return {
      brl,
      usd,
      hasUsd: usd !== 0,
    };
  }, [accountBalances]);

  // Evolução de Fluxo de Caixa (6 meses centrados/terminando no mês selecionado)
  const sixMonthSeries = useMemo(() => {
    const months = [-4, -3, -2, -1, 0, 1].map((offset) =>
      shiftYearMonth(selectedYearMonth, offset)
    );
    return months.map((ym) => {
      let inc = 0;
      let exp = 0;
      for (const tx of transactions) {
        if (tx.date.startsWith(ym)) {
          if (tx.type === 'income') inc += tx.amount;
          else exp += tx.amount;
        }
      }
      const [, mStr] = ym.split('-');
      const shortLabels = [
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
      return {
        ym,
        label: shortLabels[parseInt(mStr, 10) - 1] || ym,
        income: inc,
        expense: exp,
        net: inc - exp,
      };
    });
  }, [transactions, selectedYearMonth]);

  const maxChartValue = useMemo(() => {
    const m = Math.max(
      100,
      ...sixMonthSeries.flatMap((s) => [s.income, s.expense])
    );
    return m;
  }, [sixMonthSeries]);

  // Despesas por categoria no mês selecionado
  const categoryBreakdown = useMemo(() => {
    const map = new Map<string, { paid: number; pending: number; total: number }>();
    for (const tx of monthTransactions) {
      if (tx.type !== 'expense') continue;
      const cur = map.get(tx.categoryId) || { paid: 0, pending: 0, total: 0 };
      if (tx.status === 'paid') cur.paid += tx.amount;
      else cur.pending += tx.amount;
      cur.total += tx.amount;
      map.set(tx.categoryId, cur);
    }

    return Array.from(map.entries())
      .map(([categoryId, stats]) => {
        const cat = catMap.get(categoryId);
        const budget = cat?.monthlyBudget || 0;
        const pctOfExpense =
          metrics.totalExpenseBrl > 0 ? (stats.total / metrics.totalExpenseBrl) * 100 : 0;
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
  }, [monthTransactions, catMap, metrics.totalExpenseBrl]);

  // Próximos lançamentos pendentes no mês
  const pendingTransactions = useMemo(() => {
    return monthTransactions
      .filter((t) => t.status === 'pending')
      .sort((a, b) => a.date.localeCompare(b.date));
  }, [monthTransactions]);

  return (
    <div className="dashboard-stack">
      {/* 4 Cards Principais de Indicadores */}
      <section className="kpi-grid-4">
        <article className="kpi-card">
          <div className="kpi-card-top">
            <span className="kpi-label">SALDO ACUMULADO EM CONTAS</span>
            <Wallet size={17} className="kpi-icon teal" />
          </div>
          <div className="kpi-value mono">{formatBRL(netWorth.brl, hideValues)}</div>
          <div className="kpi-sub">
            {netWorth.hasUsd ? (
              <span className="kpi-usd-breakdown">
                + {formatMoney(netWorth.usd, 'USD', hideValues)} USD • {accounts.length} contas
              </span>
            ) : (
              <span>Soma de {accounts.length} contas/carteiras (liquidado)</span>
            )}
          </div>
        </article>

        <article className="kpi-card">
          <div className="kpi-card-top">
            <span className="kpi-label">GANHOS / RECEITAS DO MÊS</span>
            <TrendingUp size={17} className="kpi-icon green" />
          </div>
          <div className="kpi-value mono positive">
            {formatBRL(metrics.totalIncomeBrl, hideValues)}
          </div>
          <div className="kpi-sub mono">
            {metrics.hasUsd && metrics.totalIncomeUsd > 0 ? (
              <span className="kpi-usd-breakdown">
                + {formatMoney(metrics.totalIncomeUsd, 'USD', hideValues)} USD
              </span>
            ) : (
              <>
                <span>Recebido: {formatBRL(metrics.incomePaidBrl, hideValues)}</span>
                {metrics.incomePendingBrl > 0 && (
                  <span className="pending-tag">
                    +{formatBRL(metrics.incomePendingBrl, hideValues)} pend.
                  </span>
                )}
              </>
            )}
          </div>
        </article>

        <article className="kpi-card">
          <div className="kpi-card-top">
            <span className="kpi-label">GASTOS / DESPESAS DO MÊS</span>
            <TrendingDown size={17} className="kpi-icon coral" />
          </div>
          <div className="kpi-value mono negative">
            {formatBRL(metrics.totalExpenseBrl, hideValues)}
          </div>
          <div className="kpi-sub mono">
            {metrics.hasUsd && metrics.totalExpenseUsd > 0 ? (
              <span className="kpi-usd-breakdown">
                + {formatMoney(metrics.totalExpenseUsd, 'USD', hideValues)} USD
              </span>
            ) : (
              <>
                <span>Pago: {formatBRL(metrics.expensePaidBrl, hideValues)}</span>
                {metrics.expensePendingBrl > 0 && (
                  <span className="pending-tag">
                    +{formatBRL(metrics.expensePendingBrl, hideValues)} pend.
                  </span>
                )}
              </>
            )}
          </div>
        </article>

        <article className="kpi-card">
          <div className="kpi-card-top">
            <span className="kpi-label">RESULTADO LÍQUIDO & POUPANÇA</span>
            <Scale size={17} className="kpi-icon brass" />
          </div>
          <div
            className={`kpi-value mono ${metrics.netResultBrl >= 0 ? 'positive' : 'negative'}`}
          >
            {metrics.netResultBrl >= 0 ? '+' : ''}
            {formatBRL(metrics.netResultBrl, hideValues)}
          </div>
          <div className="kpi-sub">
            {metrics.hasUsd ? (
              <span className="kpi-usd-breakdown">
                USD:{' '}
                <strong className={metrics.netResultUsd >= 0 ? 'positive' : 'negative'}>
                  {metrics.netResultUsd >= 0 ? '+' : ''}
                  {formatMoney(metrics.netResultUsd, 'USD', hideValues)}
                </strong>{' '}
                • Taxa BRL: {metrics.savingsRateBrl.toFixed(0)}%
              </span>
            ) : (
              <span
                className={`savings-pill ${
                  metrics.savingsRateBrl >= 20
                    ? 'good'
                    : metrics.savingsRateBrl >= 0
                    ? 'neutral'
                    : 'deficit'
                }`}
              >
                Taxa de poupança: {metrics.savingsRateBrl.toFixed(1)}%
              </span>
            )}
          </div>
        </article>
      </section>

      {/* Grid Principal: Evolução do Fluxo de Caixa (6 Meses) + Despesas por Categoria */}
      <div className="dashboard-main-grid">
        {/* Gráfico de Fluxo de Caixa Comparativo */}
        <section className="panel-card">
          <header className="panel-header">
            <div>
              <span className="eyebrow">HISTÓRICO E PROJEÇÃO</span>
              <h3>Fluxo de Caixa Comparativo (6 Meses)</h3>
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

          <div className="cashflow-bars-stage">
            {sixMonthSeries.map((item) => {
              const incHeight = Math.max(4, Math.round((item.income / maxChartValue) * 150));
              const expHeight = Math.max(4, Math.round((item.expense / maxChartValue) * 150));
              const isCurrent = item.ym === selectedYearMonth;

              return (
                <button
                  type="button"
                  key={item.ym}
                  className={`cashflow-col-btn ${isCurrent ? 'selected' : ''}`}
                  onClick={() => onSelectYearMonth(item.ym)}
                  title={`${item.ym}: Receitas ${formatBRL(item.income)} | Despesas ${formatBRL(
                    item.expense
                  )}`}
                >
                  <div className="cashflow-col-net mono">
                    {item.net === 0
                      ? '—'
                      : `${item.net > 0 ? '+' : ''}${Math.round(item.net / 100) / 10}k`}
                  </div>
                  <div className="cashflow-bars-pair">
                    <div
                      className="cf-bar income"
                      style={{ height: `${item.income > 0 ? incHeight : 3}px` }}
                    />
                    <div
                      className="cf-bar expense"
                      style={{ height: `${item.expense > 0 ? expHeight : 3}px` }}
                    />
                  </div>
                  <span className="cashflow-col-label mono">{item.label}</span>
                </button>
              );
            })}
          </div>
        </section>

        {/* Despesas por Categoria e Status das Metas */}
        <section className="panel-card">
          <header className="panel-header">
            <div>
              <span className="eyebrow">DISTRIBUIÇÃO DE GASTOS</span>
              <h3>Despesas por Categoria no Mês</h3>
            </div>
            <button
              type="button"
              className="btn-link-sm"
              onClick={() => onNavigateTab('budgets')}
            >
              Configurar Metas →
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
                const warnBudget =
                  item.budget > 0 && !overBudget && item.pctOfBudget >= 80;

                return (
                  <div key={item.categoryId} className="cat-row-item">
                    <div className="cat-row-top">
                      <div className="cat-row-title">
                        <span
                          className="cat-color-dot"
                          style={{ backgroundColor: item.color }}
                        />
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
      </div>

      {/* Linha Inferior: Contas & Carteiras + Pendências do Mês */}
      <div className="dashboard-bottom-grid">
        {/* Saldos por Conta */}
        <section className="panel-card">
          <header className="panel-header">
            <div>
              <span className="eyebrow">PATRIMÔNIO DISPONÍVEL</span>
              <h3>Saldos por Conta / Carteira</h3>
            </div>
            <button
              type="button"
              className="btn-link-sm"
              onClick={() => onNavigateTab('accounts')}
            >
              Gerenciar Contas →
            </button>
          </header>

          <div className="accounts-mini-list">
            {accountBalances.map((acc) => (
              <div key={acc.id} className="account-mini-row">
                <div className="account-mini-info">
                  <span
                    className="account-color-bar"
                    style={{ backgroundColor: acc.color }}
                  />
                  <div>
                    <strong>{acc.name}</strong>
                    <span className="account-inst-sub">
                      {acc.institution || 'Carteira Local'}
                    </span>
                  </div>
                </div>
                <div
                  className={`account-mini-bal mono ${
                    acc.currentBalance >= 0 ? 'pos' : 'neg'
                  }`}
                >
                  {formatMoney(acc.currentBalance, acc.currency, hideValues)}
                  {acc.currency === 'USD' && <span className="badge-usd-sm">USD</span>}
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* Compromissos Pendentes no Mês */}
        <section className="panel-card">
          <header className="panel-header">
            <div>
              <span className="eyebrow">LIQUIDAÇÃO RÁPIDA</span>
              <h3>Pendentes neste Mês ({pendingTransactions.length})</h3>
            </div>
            <button
              type="button"
              className="btn-link-sm"
              onClick={() => onNavigateTab('transactions')}
            >
              Ver todos os lançamentos →
            </button>
          </header>

          {pendingTransactions.length === 0 ? (
            <div className="empty-state-compact">
              <CheckCircle2 size={22} style={{ color: '#2DD4BF' }} />
              <p>Todos os lançamentos de {formatMonthYearLabel(selectedYearMonth)} estão quitados.</p>
            </div>
          ) : (
            <div className="pending-quick-list">
              {pendingTransactions.slice(0, 6).map((tx) => {
                const cat = catMap.get(tx.categoryId);
                const acc = accMap.get(tx.accountId);
                return (
                  <div key={tx.id} className="pending-item-row">
                    <div className="pending-item-left">
                      <span className="pending-date-chip mono">
                        <Clock size={12} /> {formatShortDate(tx.date)}
                      </span>
                      <div>
                        <strong>{tx.description}</strong>
                        <span className="pending-meta-sub">
                          {cat?.name || 'Geral'} • {acc?.name || 'Conta'}
                        </span>
                      </div>
                    </div>

                    <div className="pending-item-right">
                      <span
                        className={`mono pending-amt ${
                          tx.type === 'income' ? 'positive' : 'negative'
                        }`}
                      >
                        {tx.type === 'income' ? (
                          <ArrowUpRight size={14} />
                        ) : (
                          <ArrowDownRight size={14} />
                        )}
                        {formatMoney(tx.amount, tx.currency || 'BRL', hideValues)}
                        {tx.currency === 'USD' && <span className="badge-usd-sm">USD</span>}
                      </span>
                      <button
                        type="button"
                        className="btn-settle-xs"
                        onClick={() => onToggleTransactionStatus(tx.id)}
                        title="Marcar como Pago / Recebido"
                      >
                        <CheckCircle2 size={13} />{' '}
                        {tx.type === 'income' ? 'Receber' : 'Quitar'}
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </section>
      </div>
    </div>
  );
};
