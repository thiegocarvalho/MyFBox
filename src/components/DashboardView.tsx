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
  categoryBudgetInBrl,
  computeAccountBalance,
  convertAmount,
  computeNetWorth,
  endOfMonthDate,
  summarizeTransactions,
  txAmountInBrl,
} from '../utils/money';
import type { ExchangeRateSource } from '../services/currencyService';
import { useI18n } from '../i18n/useI18n';

const PENDING_PREVIEW = 6;
const MONTH_KEYS = [
  'analytics.months.jan',
  'analytics.months.feb',
  'analytics.months.mar',
  'analytics.months.apr',
  'analytics.months.may',
  'analytics.months.jun',
  'analytics.months.jul',
  'analytics.months.aug',
  'analytics.months.sep',
  'analytics.months.oct',
  'analytics.months.nov',
  'analytics.months.dec',
] as const;

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
  onSettleTransaction: (txId: string, paidAt: string, accountId?: string) => void;
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
  const { t, language } = useI18n();
  const effectiveRates = rateSource ?? usdToBrlRate;
  const catMap = useMemo(() => new Map(categories.map((c) => [c.id, c])), [categories]);
  const accMap = useMemo(() => new Map(accounts.map((a) => [a.id, a])), [accounts]);
  const todayStr = localTodayStr();

  const [settlingTransaction, setSettlingTransaction] = useState<Transaction | null>(null);
  const [paidOn, setPaidOn] = useState(todayStr);
  const [settleAccountId, setSettleAccountId] = useState('');

  const handleOpenSettleModal = (tx: Transaction) => {
    setPaidOn(todayStr);
    const defaultAccId = accounts.some((a) => a.id === tx.accountId)
      ? tx.accountId
      : accounts[0]?.id || tx.accountId;
    setSettleAccountId(defaultAccId);
    setSettlingTransaction(tx);
  };

  const handleCloseSettleModal = () => {
    setSettlingTransaction(null);
  };

  const handleConfirmSettle = () => {
    if (!settlingTransaction || !paidOn || paidOn > todayStr) return;
    onSettleTransaction(
      settlingTransaction.id,
      paidOn,
      settleAccountId || settlingTransaction.accountId
    );
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

  const selectedSettleAccount = useMemo(
    () =>
      accountBalances.find((a) => a.id === settleAccountId) ??
      accountBalances.find((a) => a.id === settlingTransaction?.accountId) ??
      accountBalances[0],
    [accountBalances, settleAccountId, settlingTransaction]
  );

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
  const rawMonthName = formatMonthYearLabel(selectedYearMonth, language).split(' ')[0];
  const monthName = language === 'en-GB' ? rawMonthName : rawMonthName.toLowerCase();
  const lastDayLabel = (() => {
    const [y, m] = selectedYearMonth.split('-').map(Number);
    const last = new Date(y, m, 0).getDate();
    return `${String(last).padStart(2, '0')}/${String(m).padStart(2, '0')}`;
  })();
  const usdText = (value: number | null) =>
    value === null ? t('analytics.dashboard.noRate') : formatMoney(value, 'USD', hideValues);

  const twelveMonthSeries = useMemo(() => {
    const [year] = selectedYearMonth.split('-');
    const buckets = Array.from({ length: 12 }, (_, i) => ({
      ym: `${year}-${String(i + 1).padStart(2, '0')}`,
      label: t(MONTH_KEYS[i]),
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
  }, [transactions, selectedYearMonth, effectiveRates, t]);

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
        const budget = cat ? categoryBudgetInBrl(cat, effectiveRates) : 0;
        const pctOfExpense =
          totalExpenseAllBrl > 0 ? (stats.total / totalExpenseAllBrl) * 100 : 0;
        const pctOfBudget = budget > 0 ? (stats.total / budget) * 100 : 0;
        return {
          categoryId,
          name: cat?.name || t('analytics.dashboard.otherCategory'),
          color: cat?.color || '#94A3B8',
          ...stats,
          budget,
          pctOfExpense,
          pctOfBudget,
        };
      })
      .sort((a, b) => b.total - a.total);
  }, [monthTransactions, catMap, effectiveRates, t]);

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
            <span className="cf-tooltip-title">{formatMonthYearLabel(item.ym, language)}</span>
            {isActualCurrent && (
              <span className="cf-tooltip-badge">{t('analytics.dashboard.badgeCurrent')}</span>
            )}
            {isSelected && (
              <span className="cf-tooltip-badge focal">{t('analytics.dashboard.badgeFocus')}</span>
            )}
          </div>
          <div className="cf-tooltip-body">
            <div className="cf-tooltip-row pos">
              <span className="cf-tooltip-label">
                <i className="cf-tooltip-dot income" /> {t('analytics.dashboard.income')}
              </span>
              <span className="mono">{formatBRL(item.income, hideValues)}</span>
            </div>
            <div className="cf-tooltip-row neg">
              <span className="cf-tooltip-label">
                <i className="cf-tooltip-dot expense" /> {t('analytics.dashboard.expense')}
              </span>
              <span className="mono">{formatBRL(item.expense, hideValues)}</span>
            </div>
            <div className="cf-tooltip-divider" />
            <div className={`cf-tooltip-row net ${item.net >= 0 ? 'pos' : 'neg'}`}>
              <span className="cf-tooltip-label">{t('analytics.dashboard.balance')}</span>
              <strong className="mono">
                {item.net > 0 ? '+' : ''}
                {formatBRL(item.net, hideValues)}
              </strong>
            </div>
          </div>
        </div>

        <div className="cf-col-badge-wrapper">
          {isActualCurrent ? (
            <span className="cf-col-badge-current">
              {t('analytics.dashboard.badgeCurrentUpper')}
            </span>
          ) : isSelected ? (
            <span className="cf-col-badge-selected">
              {t('analytics.dashboard.badgeFocusUpper')}
            </span>
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
            title={t('analytics.dashboard.incomeTooltip', {
              amount: formatBRL(item.income, hideValues),
            })}
          />
          <div
            className="cf-bar expense"
            style={{ height: `${item.expense > 0 ? expHeight : 3}px` }}
            title={t('analytics.dashboard.expenseTooltip', {
              amount: formatBRL(item.expense, hideValues),
            })}
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
            <span className="kpi-label">{t('analytics.dashboard.kpiBalanceToday')}</span>
            <Wallet size={17} className="kpi-icon teal" />
          </div>
          <div className="kpi-value mono">{formatBRL(netWorth.current.brl, hideValues)}</div>
          <div className="kpi-sub">
            <span>{t('analytics.dashboard.kpiBalanceTodaySub')}</span>
          </div>
          {netWorth.current.usd !== null && (
            <div className="kpi-sub kpi-usd-line">≈ {usdText(netWorth.current.usd)}</div>
          )}
        </article>

        <article className="kpi-card">
          <div className="kpi-card-top">
            <span className="kpi-label">{t('analytics.dashboard.kpiMonthIncome')}</span>
            <TrendingUp size={17} className="kpi-icon green" />
          </div>
          <div className="kpi-value mono positive">
            {formatBRL(metrics.incomePaid.brl, hideValues)}
          </div>
          <div className="kpi-sub">
            <span>{t('analytics.dashboard.receivedInMonth', { month: monthName })}</span>
          </div>
          {pendingIncome > 0 && (
            <div className="kpi-sub">
              <span className="pending-tag">
                {t('analytics.dashboard.pendingToReceive', {
                  amount: formatBRL(pendingIncome, hideValues),
                })}
              </span>
            </div>
          )}
        </article>

        <article className="kpi-card">
          <div className="kpi-card-top">
            <span className="kpi-label">{t('analytics.dashboard.kpiMonthExpense')}</span>
            <TrendingDown size={17} className="kpi-icon coral" />
          </div>
          <div className="kpi-value mono negative">
            {formatBRL(metrics.expensePaid.brl, hideValues)}
          </div>
          <div className="kpi-sub">
            <span>{t('analytics.dashboard.paidInMonth', { month: monthName })}</span>
          </div>
          {metrics.expensePending.brl > 0 && (
            <div className="kpi-sub">
              <span className="pending-tag">
                {t('analytics.dashboard.pendingToPayUntil', {
                  amount: formatBRL(metrics.expensePending.brl, hideValues),
                  date: lastDayLabel,
                })}
              </span>
            </div>
          )}
          {overdue.expense > 0 && (
            <div className="kpi-sub">
              <span className="overdue-tag">
                {t('analytics.dashboard.overdueFromPreviousMonths', {
                  amount: formatBRL(overdue.expense, hideValues),
                })}
              </span>
            </div>
          )}
        </article>

        <article className="kpi-card">
          <div className="kpi-card-top">
            <span className="kpi-label">{t('analytics.dashboard.kpiProjectedBalance')}</span>
            <Scale size={17} className="kpi-icon brass" />
          </div>
          <div className={`kpi-value mono ${netWorth.projected.brl >= 0 ? '' : 'negative'}`}>
            {formatBRL(netWorth.projected.brl, hideValues)}
          </div>
          <div className="kpi-sub">
            <span>
              {hasAnyPending
                ? t('analytics.dashboard.projectedWithPending', { date: lastDayLabel })
                : t('analytics.dashboard.projectedNoPending', { date: lastDayLabel })}
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
              <span className="eyebrow">{t('analytics.dashboard.cashflowEyebrow')}</span>
              <div className="cashflow-title-row">
                <h3>{t('analytics.dashboard.cashflowTitle')}</h3>
                {selectedYearMonth === actualCurrentYearMonth ? (
                  <span
                    className="cf-current-pill"
                    title={t('analytics.dashboard.currentMonthPillTitle')}
                  >
                    <span className="cf-pulse-dot" />
                    {t('analytics.dashboard.currentMonthPill')}
                  </span>
                ) : (
                  <button
                    type="button"
                    className="cf-current-quick-btn"
                    onClick={() => onSelectYearMonth(actualCurrentYearMonth)}
                    title={t('analytics.dashboard.goToCurrentMonthTitle')}
                  >
                    <Calendar size={13} />
                    {t('analytics.dashboard.goToCurrentMonth')}
                  </button>
                )}
              </div>
            </div>
            <div className="chart-legend-inline">
              <span>
                <i className="legend-swatch income" /> {t('analytics.dashboard.income')}
              </span>
              <span>
                <i className="legend-swatch expense" /> {t('analytics.dashboard.expense')}
              </span>
            </div>
          </header>

          <div className="cashflow-2row-stage">
            <div className="cf-semester-block">
              <div className="cf-semester-header">
                <div className="cf-semester-title-wrap">
                  <span className="cf-semester-tag">{t('analytics.dashboard.semester1')}</span>
                  <span className="cf-semester-meta">
                    {t('analytics.dashboard.semester1Range')}
                  </span>
                </div>
                <div className="cf-semester-summary mono">
                  <span className="cf-sem-label">{t('analytics.dashboard.semesterBalance')}</span>
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
                  <span className="cf-semester-tag">{t('analytics.dashboard.semester2')}</span>
                  <span className="cf-semester-meta">
                    {t('analytics.dashboard.semester2Range')}
                  </span>
                </div>
                <div className="cf-semester-summary mono">
                  <span className="cf-sem-label">{t('analytics.dashboard.semesterBalance')}</span>
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
              <span className="eyebrow">{t('analytics.dashboard.quickSettleEyebrow')}</span>
              <h3>
                {t('analytics.dashboard.pendingThisMonthTitle', {
                  count: pendingTransactions.length,
                })}
              </h3>
            </div>
            <button
              type="button"
              className="panel-header-action"
              onClick={() => onNavigateTab('transactions')}
            >
              <span>{t('analytics.dashboard.viewAllTransactions')}</span>
              <ArrowRight size={13} className="action-arrow" aria-hidden />
            </button>
          </header>

          {pendingTransactions.length === 0 ? (
            <div className="empty-state-compact">
              <CheckCircle2 size={22} style={{ color: 'var(--color-accent)' }} />
              <p>
                {t('analytics.dashboard.allSettledForMonth', {
                  month: formatMonthYearLabel(selectedYearMonth, language),
                })}
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
                        <span className="pq-month">{t(MONTH_KEYS[Number(mm) - 1])}</span>
                      </span>
                      <div className="pq-info">
                        <strong className="pq-title">{tx.description}</strong>
                        <span className="pq-meta">
                          {daysLate > 0 && (
                            <span className="pq-late">
                              {daysLate === 1
                                ? t('analytics.dashboard.dueYesterday')
                                : t('analytics.dashboard.dueDaysAgo', { days: daysLate })}
                            </span>
                          )}
                          {daysLate === 0 && (
                            <span className="pq-today">{t('analytics.dashboard.dueToday')}</span>
                          )}
                          <span>{cat?.name || t('analytics.dashboard.generalCategory')}</span>
                          {accounts.length > 1 && (
                            <span>{acc?.name || t('analytics.dashboard.defaultAccount')}</span>
                          )}
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
                        aria-label={
                          tx.type === 'income'
                            ? t('analytics.dashboard.actionReceiveAria', {
                                description: tx.description,
                              })
                            : t('analytics.dashboard.actionSettleAria', {
                                description: tx.description,
                              })
                        }
                      >
                        <CheckCircle2 size={15} aria-hidden />
                        {tx.type === 'income'
                          ? t('analytics.dashboard.actionReceive')
                          : t('analytics.dashboard.actionSettle')}
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
                  <span>
                    {t('analytics.dashboard.viewMorePending', {
                      count: pendingTransactions.length - PENDING_PREVIEW,
                    })}
                  </span>
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
              <span className="eyebrow">
                {t('analytics.dashboard.spendingDistributionEyebrow')}
              </span>
              <h3>{t('analytics.dashboard.expensesByCategoryTitle')}</h3>
            </div>
            <button
              type="button"
              className="panel-header-action"
              onClick={() => onNavigateTab('budgets')}
            >
              <span>{t('analytics.dashboard.configureBudgets')}</span>
              <ArrowRight size={13} className="action-arrow" aria-hidden />
            </button>
          </header>

          {categoryBreakdown.length === 0 ? (
            <div className="empty-state-compact">
              <p>
                {t('analytics.dashboard.noExpensesInMonth', {
                  month: formatMonthYearLabel(selectedYearMonth, language),
                })}
              </p>
              <button
                type="button"
                className="btn-secondary-sm"
                onClick={() => onOpenNewTransaction('expense')}
              >
                {t('analytics.dashboard.registerFirstExpense')}
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
                          <span className="budget-alert-chip danger">
                            {t('analytics.dashboard.overBudget')}
                          </span>
                        )}
                        {warnBudget && (
                          <span className="budget-alert-chip warning">
                            {t('analytics.dashboard.warnBudget')}
                          </span>
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
              <span className="eyebrow">{t('analytics.dashboard.availableAssetsEyebrow')}</span>
              <h3>{t('analytics.dashboard.balancesByAccountTitle')}</h3>
            </div>
            <button
              type="button"
              className="panel-header-action"
              onClick={() => onNavigateTab('accounts')}
            >
              <span>{t('analytics.dashboard.manageAccounts')}</span>
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
                      {acc.institution || t('analytics.dashboard.localWallet')}
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
                        {t('analytics.dashboard.projectedAccountBalance', {
                          amount: formatMoney(acc.projectedBalance, acc.currency, hideValues),
                        })}
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
                  ? t('analytics.dashboard.confirmReceiveTitle')
                  : t('analytics.dashboard.confirmSettleTitle')}
              </h2>
              <button
                type="button"
                className="icon-btn"
                onClick={handleCloseSettleModal}
                aria-label={t('analytics.common.close')}
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
                      ? t('analytics.dashboard.incomeToReceiveEyebrow')
                      : t('analytics.dashboard.expenseToSettleEyebrow')}
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
                    {catMap.get(settlingTransaction.categoryId)?.name ||
                      t('analytics.dashboard.generalCategory')}
                  </span>
                  <span className="settle-modal-meta-item">
                    {t('analytics.dashboard.dueDateLabel', {
                      date: settlingTransaction.date.split('-').reverse().join('/'),
                    })}
                  </span>
                </div>
              </div>

              <div className="form-field">
                <label htmlFor={accountBalances.length > 1 ? 'settle-account' : undefined}>
                  {settlingTransaction.type === 'income'
                    ? t('analytics.dashboard.receivingAccountLabel')
                    : t('analytics.dashboard.payingAccountLabel')}
                </label>
                {accountBalances.length > 1 ? (
                  <select
                    id="settle-account"
                    value={selectedSettleAccount?.id || ''}
                    onChange={(e) => setSettleAccountId(e.target.value)}
                  >
                    {accountBalances.map((acc) => (
                      <option key={acc.id} value={acc.id}>
                        {t('analytics.dashboard.accountOptionBalance', {
                          name: acc.name,
                          balance: formatMoney(acc.currentBalance, acc.currency, hideValues),
                        })}
                      </option>
                    ))}
                  </select>
                ) : (
                  <div className="settle-single-account">
                    <span className="settle-single-account-info">
                      <span
                        className="cat-color-dot"
                        style={{
                          backgroundColor:
                            selectedSettleAccount?.color || 'var(--color-accent)',
                        }}
                      />
                      <strong>
                        {selectedSettleAccount?.name || t('analytics.dashboard.primaryAccount')}
                      </strong>
                    </span>
                    <span
                      className={`mono settle-single-account-balance ${
                        (selectedSettleAccount?.currentBalance ?? 0) >= 0 ? 'pos' : 'neg'
                      }`}
                    >
                      {t('analytics.dashboard.balanceLabel', {
                        balance: formatMoney(
                          selectedSettleAccount?.currentBalance ?? 0,
                          selectedSettleAccount?.currency || 'BRL',
                          hideValues
                        ),
                      })}
                    </span>
                  </div>
                )}
              </div>

              <div className="form-field">
                <label htmlFor="settle-paid-on">
                  {settlingTransaction.type === 'income'
                    ? t('analytics.dashboard.receiptDateLabel')
                    : t('analytics.dashboard.paymentDateLabel')}
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
                  {t('analytics.dashboard.dateHint', {
                    date: todayStr.split('-').reverse().join('/'),
                  })}
                </span>
              </div>

              <footer className="modal-footer">
                <button
                  type="button"
                  className="btn-secondary"
                  onClick={handleCloseSettleModal}
                >
                  {t('analytics.common.cancel')}
                </button>
                <button
                  type="submit"
                  className="btn-primary"
                  disabled={!paidOn || paidOn > todayStr}
                >
                  <CheckCircle2 size={15} />
                  {settlingTransaction.type === 'income'
                    ? t('analytics.dashboard.confirmReceiveTitle')
                    : t('analytics.dashboard.confirmSettleTitle')}
                </button>
              </footer>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
