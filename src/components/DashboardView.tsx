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
import {
  computeAccountBalance,
  convertAmount,
  computeNetWorth,
  endOfMonthDate,
  summarizeTransactions,
  txAmountInBrl,
} from '../utils/money';

interface DashboardViewProps {
  selectedYearMonth: string;
  onSelectYearMonth: (ym: string) => void;
  transactions: Transaction[];
  categories: Category[];
  accounts: Account[];
  hideValues: boolean;
  usdToBrlRate?: number;
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
  usdToBrlRate,
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

  // Realizado = só lançamentos pagos; Previsto = realizado + pendentes do mês
  const metrics = useMemo(
    () => summarizeTransactions(monthTransactions, usdToBrlRate),
    [monthTransactions, usdToBrlRate]
  );
  const projectionUntil = endOfMonthDate(selectedYearMonth);

  // Saldo confirmado por conta (só lançamentos pagos) + previsão até o fim do mês
  const accountBalances = useMemo(() => {
    return accounts.map((acc) => {
      const { currency, currentBalance, projectedBalance } = computeAccountBalance(
        acc,
        transactions,
        usdToBrlRate,
        projectionUntil
      );
      return {
        ...acc,
        currency,
        currentBalance,
        projectedBalance,
      };
    });
  }, [accounts, transactions, usdToBrlRate, projectionUntil]);

  const netWorth = useMemo(
    () => computeNetWorth(accounts, transactions, usdToBrlRate, projectionUntil),
    [accounts, transactions, usdToBrlRate, projectionUntil]
  );
  // Pendentes de meses anteriores (em atraso): entram no saldo previsto, então aparecem nos cards
  const overdue = useMemo(() => {
    const monthStart = `${selectedYearMonth}-01`;
    let income = 0;
    let expense = 0;
    for (const tx of transactions) {
      if (tx.status !== 'pending' || tx.date >= monthStart) continue;
      const value = txAmountInBrl(tx, usdToBrlRate);
      if (tx.type === 'income') income += value;
      else expense += value;
    }
    return { income, expense };
  }, [transactions, selectedYearMonth, usdToBrlRate]);
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
          const valueBrl = txAmountInBrl(tx, usdToBrlRate);
          if (tx.type === 'income') inc += valueBrl;
          else exp += valueBrl;
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
  }, [transactions, selectedYearMonth, usdToBrlRate]);

  const maxChartValue = useMemo(() => {
    const m = Math.max(
      100,
      ...sixMonthSeries.flatMap((s) => [s.income, s.expense])
    );
    return m;
  }, [sixMonthSeries]);

  // Despesas por categoria no mês selecionado
  const categoryBreakdown = useMemo(() => {
    // Todos os valores convertidos para BRL (orçamentos e percentuais são em R$)
    const map = new Map<string, { paid: number; pending: number; total: number }>();
    let totalExpenseAllBrl = 0;
    for (const tx of monthTransactions) {
      if (tx.type !== 'expense') continue;
      const valueBrl = txAmountInBrl(tx, usdToBrlRate);
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
  }, [monthTransactions, catMap, usdToBrlRate]);

  // Próximos lançamentos pendentes no mês
  const pendingTransactions = useMemo(() => {
    return monthTransactions
      .filter((t) => t.status === 'pending')
      .sort((a, b) => a.date.localeCompare(b.date));
  }, [monthTransactions]);

  return (
    <div className="dashboard-stack">
      {/* 4 Cards: saldo hoje − saídas a pagar + entradas a receber = saldo previsto */}
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
                  {(() => {
                    const other = acc.currency === 'USD' ? 'BRL' : 'USD';
                    const converted = convertAmount(acc.currentBalance, acc.currency, other, usdToBrlRate);
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
              <CheckCircle2 size={22} style={{ color: 'var(--color-accent)' }} />
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
