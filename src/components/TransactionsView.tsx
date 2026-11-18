import React, { useMemo, useState, useEffect } from 'react';
import {
  Search,
  CheckCircle2,
  Clock,
  Edit3,
  Trash2,
  Copy,
  Calendar,
  TrendingUp,
  TrendingDown,
  Scale,
  PieChart,
  ChevronDown,
  ChevronUp,
  X,
  Filter,
  AlertTriangle,
} from 'lucide-react';
import type {
  Account,
  Category,
  Transaction,
  TransactionStatus,
  TransactionType,
} from '../types/finance';
import {
  formatBRL,
  formatFullDateBR,
  formatMoney,
  formatMonthYearLabel,
  formatShortDate,
  getCurrentYearMonth,
  shiftYearMonth,
} from '../utils/formatters';
import { txAmountInBrl } from '../utils/money';
import type { ExchangeRateSource } from '../services/currencyService';
import { useI18n } from '../i18n/useI18n';

export type ScopeMode = 'month' | 'year' | 'all' | 'custom';

const PAGE_SIZE = 100;

const MONTH_NUMBERS = [
  '01',
  '02',
  '03',
  '04',
  '05',
  '06',
  '07',
  '08',
  '09',
  '10',
  '11',
  '12',
] as const;

interface TransactionsViewProps {
  selectedYearMonth: string;
  onSelectYearMonth?: (ym: string) => void;
  transactions: Transaction[];
  categories: Category[];
  accounts: Account[];
  hideValues: boolean;
  usdToBrlRate?: number;
  rateSource?: ExchangeRateSource;
  onOpenNewTransaction: (type: TransactionType) => void;
  onEditTransaction: (tx: Transaction) => void;
  onDuplicateTransaction: (tx: Transaction) => void;
  onDeleteTransaction: (txId: string) => void;
  onToggleTransactionStatus: (txId: string) => void;
}

export const TransactionsView: React.FC<TransactionsViewProps> = ({
  selectedYearMonth,
  onSelectYearMonth,
  transactions,
  categories,
  accounts,
  hideValues,
  usdToBrlRate,
  rateSource,
  onOpenNewTransaction,
  onEditTransaction,
  onDuplicateTransaction,
  onDeleteTransaction,
  onToggleTransactionStatus,
}) => {
  const { t } = useI18n();
  const effectiveRates = rateSource ?? usdToBrlRate;

  const [scopeMode, setScopeMode] = useState<ScopeMode>('month');
  const selectedYear = selectedYearMonth.slice(0, 4);

  const [customStartDate, setCustomStartDate] = useState(`${selectedYearMonth}-01`);
  const [customEndDate, setCustomEndDate] = useState(`${selectedYearMonth}-28`);

  const [searchQuery, setSearchQuery] = useState('');
  const [typeFilter, setTypeFilter] = useState<'all' | TransactionType>('all');
  const [statusFilter, setStatusFilter] = useState<'all' | TransactionStatus>('all');
  const [categoryFilter, setCategoryFilter] = useState<string>('all');
  const [accountFilter, setAccountFilter] = useState<string>('all');
  const [showMobileFilters, setShowMobileFilters] = useState(false);
  const [paginationState, setPaginationState] = useState<{ key: string; count: number }>({
    key: '',
    count: PAGE_SIZE,
  });

  const filterKey = `${scopeMode}|${selectedYearMonth}|${customStartDate}|${customEndDate}|${searchQuery}|${typeFilter}|${statusFilter}|${categoryFilter}|${accountFilter}`;
  const visibleCount = paginationState.key === filterKey ? paginationState.count : PAGE_SIZE;

  const [txToDelete, setTxToDelete] = useState<Transaction | null>(null);

  useEffect(() => {
    if (!txToDelete) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setTxToDelete(null);
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [txToDelete]);

  const activeFiltersCount = useMemo(() => {
    let count = 0;
    if (typeFilter !== 'all') count++;
    if (statusFilter !== 'all') count++;
    if (categoryFilter !== 'all') count++;
    if (accountFilter !== 'all') count++;
    return count;
  }, [typeFilter, statusFilter, categoryFilter, accountFilter]);

  const handleClearAllFilters = () => {
    setTypeFilter('all');
    setStatusFilter('all');
    setCategoryFilter('all');
    setAccountFilter('all');
    setSearchQuery('');
  };

  const [showCategoryBreakdown, setShowCategoryBreakdown] = useState(false);

  const catMap = useMemo(() => new Map(categories.map((c) => [c.id, c])), [categories]);
  const accMap = useMemo(() => new Map(accounts.map((a) => [a.id, a])), [accounts]);
  const showAccount = accounts.length > 1;

  const monthsWithTransactions = useMemo(() => {
    const set = new Set<string>();
    for (const t of transactions) {
      if (t.date.startsWith(selectedYear)) {
        set.add(t.date.slice(5, 7));
      }
    }
    return set;
  }, [transactions, selectedYear]);

  const activeScopeLabel = useMemo(() => {
    switch (scopeMode) {
      case 'month':
        return formatMonthYearLabel(selectedYearMonth).toUpperCase();
      case 'year':
        return t('tx.scope.yearLabel', { year: selectedYear });
      case 'all':
        return t('tx.scope.allLabel');
      case 'custom':
        return t('tx.scope.customLabel', {
          start: formatShortDate(customStartDate),
          end: formatShortDate(customEndDate),
        });
    }
  }, [scopeMode, selectedYearMonth, selectedYear, customStartDate, customEndDate, t]);

  const filteredTransactions = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    return transactions
      .filter((tx) => {
        if (scopeMode === 'month') {
          if (!tx.date.startsWith(selectedYearMonth)) return false;
        } else if (scopeMode === 'year') {
          if (!tx.date.startsWith(selectedYear)) return false;
        } else if (scopeMode === 'custom') {
          if (customStartDate && tx.date < customStartDate) return false;
          if (customEndDate && tx.date > customEndDate) return false;
        }

        if (typeFilter !== 'all' && tx.type !== typeFilter) return false;
        if (statusFilter !== 'all' && tx.status !== statusFilter) return false;
        if (categoryFilter !== 'all' && tx.categoryId !== categoryFilter) return false;
        if (accountFilter !== 'all' && tx.accountId !== accountFilter) return false;

        if (q) {
          const catName = catMap.get(tx.categoryId)?.name.toLowerCase() || '';
          const accName = accMap.get(tx.accountId)?.name.toLowerCase() || '';
          const matchDesc = tx.description.toLowerCase().includes(q);
          const matchNotes = (tx.notes || '').toLowerCase().includes(q);
          if (!matchDesc && !matchNotes && !catName.includes(q) && !accName.includes(q)) {
            return false;
          }
        }
        return true;
      })
      .sort((a, b) => b.date.localeCompare(a.date) || b.createdAt.localeCompare(a.createdAt));
  }, [
    transactions,
    scopeMode,
    selectedYearMonth,
    selectedYear,
    customStartDate,
    customEndDate,
    typeFilter,
    statusFilter,
    categoryFilter,
    accountFilter,
    searchQuery,
    catMap,
    accMap,
  ]);

  const consolidated = useMemo(() => {
    let incBrlTotal = 0;
    let incBrlPaid = 0;
    let incBrlPending = 0;

    let expBrlTotal = 0;
    let expBrlPaid = 0;
    let expBrlPending = 0;

    let incUsdTotal = 0;
    let incUsdPaid = 0;
    let incUsdPending = 0;

    let expUsdTotal = 0;
    let expUsdPaid = 0;
    let expUsdPending = 0;

    let paidCount = 0;
    let pendingCount = 0;
    let expenseCount = 0;

    const categoryExpenseMap = new Map<string, { total: number; count: number }>();

    for (const tx of filteredTransactions) {
      const isUsd = tx.currency === 'USD';
      const isPaid = tx.status === 'paid';
      const brlAmount = txAmountInBrl(tx, effectiveRates);

      if (isPaid) paidCount++;
      else pendingCount++;

      if (tx.type === 'income') {
        if (isUsd) {
          incUsdTotal += tx.amount;
          if (isPaid) incUsdPaid += tx.amount;
          else incUsdPending += tx.amount;
        }
        if (brlAmount !== null) {
          incBrlTotal += brlAmount;
          if (isPaid) incBrlPaid += brlAmount;
          else incBrlPending += brlAmount;
        }
      } else {
        expenseCount++;
        if (isUsd) {
          expUsdTotal += tx.amount;
          if (isPaid) expUsdPaid += tx.amount;
          else expUsdPending += tx.amount;
        }
        if (brlAmount !== null) {
          expBrlTotal += brlAmount;
          if (isPaid) expBrlPaid += brlAmount;
          else expBrlPending += brlAmount;

          const current = categoryExpenseMap.get(tx.categoryId) || { total: 0, count: 0 };
          categoryExpenseMap.set(tx.categoryId, {
            total: current.total + brlAmount,
            count: current.count + 1,
          });
        }
      }
    }

    const netBrlTotal = incBrlTotal - expBrlTotal;
    const netBrlPaid = incBrlPaid - expBrlPaid;
    const netBrlPending = incBrlPending - expBrlPending;

    const netUsdTotal = incUsdTotal - expUsdTotal;
    const hasUsd = incUsdTotal > 0 || expUsdTotal > 0;

    const totalCount = filteredTransactions.length;
    const settlementRate = totalCount > 0 ? Math.round((paidCount / totalCount) * 100) : 0;
    const savingsRate =
      incBrlTotal > 0 ? ((incBrlTotal - expBrlTotal) / incBrlTotal) * 100 : null;
    const avgExpense = expenseCount > 0 ? expBrlTotal / expenseCount : 0;

    const topExpenseCategories = Array.from(categoryExpenseMap.entries())
      .map(([catId, data]) => ({
        category: catMap.get(catId),
        total: data.total,
        count: data.count,
        percentage: expBrlTotal > 0 ? Math.round((data.total / expBrlTotal) * 100) : 0,
      }))
      .sort((a, b) => b.total - a.total);

    return {
      count: totalCount,
      incBrlTotal,
      incBrlPaid,
      incBrlPending,
      expBrlTotal,
      expBrlPaid,
      expBrlPending,
      netBrlTotal,
      netBrlPaid,
      netBrlPending,
      incUsdTotal,
      incUsdPaid,
      incUsdPending,
      expUsdTotal,
      expUsdPaid,
      expUsdPending,
      netUsdTotal,
      hasUsd,
      paidCount,
      pendingCount,
      settlementRate,
      savingsRate,
      avgExpense,
      topExpenseCategories,
    };
  }, [filteredTransactions, catMap, effectiveRates]);

  const visibleTransactions = useMemo(
    () => filteredTransactions.slice(0, visibleCount),
    [filteredTransactions, visibleCount]
  );

  return (
    <div className="ledger-view-stack">
      <section className="panel-card brutalist-scope-banner">
        <div className="scope-banner-top">
          <div className="scope-title-meta">
            <span className="scope-eyebrow">{t('tx.eyebrow')}</span>
            <div className="scope-heading-row">
              {scopeMode === 'month' && onSelectYearMonth ? (
                <div className="scope-inline-nav">
                  <button
                    type="button"
                    className="scope-nav-btn"
                    onClick={() => onSelectYearMonth(shiftYearMonth(selectedYearMonth, -1))}
                    title={t('tx.nav.prevMonth')}
                    aria-label={t('tx.nav.prevMonth')}
                  >
                    &lt;&lt;
                  </button>
                  <h2 className="scope-heading">{activeScopeLabel}</h2>
                  <button
                    type="button"
                    className="scope-nav-btn"
                    onClick={() => onSelectYearMonth(shiftYearMonth(selectedYearMonth, 1))}
                    title={t('tx.nav.nextMonth')}
                    aria-label={t('tx.nav.nextMonth')}
                  >
                    &gt;&gt;
                  </button>
                  {selectedYearMonth !== getCurrentYearMonth() && (
                    <button
                      type="button"
                      className="scope-today-btn"
                      onClick={() => onSelectYearMonth(getCurrentYearMonth())}
                      title={t('tx.nav.backToCurrentMonth')}
                    >
                      <Calendar size={12} />
                      <span>{t('tx.nav.currentMonth')}</span>
                    </button>
                  )}
                </div>
              ) : scopeMode === 'year' && onSelectYearMonth ? (
                <div className="scope-inline-nav">
                  <button
                    type="button"
                    className="scope-nav-btn"
                    onClick={() => {
                      const prevY = String(Number(selectedYear) - 1);
                      onSelectYearMonth(`${prevY}-${selectedYearMonth.slice(5, 7)}`);
                    }}
                    title={t('tx.nav.prevYear')}
                    aria-label={t('tx.nav.prevYear')}
                  >
                    &lt;&lt;
                  </button>
                  <h2 className="scope-heading">{activeScopeLabel}</h2>
                  <button
                    type="button"
                    className="scope-nav-btn"
                    onClick={() => {
                      const nextY = String(Number(selectedYear) + 1);
                      onSelectYearMonth(`${nextY}-${selectedYearMonth.slice(5, 7)}`);
                    }}
                    title={t('tx.nav.nextYear')}
                    aria-label={t('tx.nav.nextYear')}
                  >
                    &gt;&gt;
                  </button>
                  {selectedYear !== getCurrentYearMonth().slice(0, 4) && (
                    <button
                      type="button"
                      className="scope-today-btn"
                      onClick={() => onSelectYearMonth(getCurrentYearMonth())}
                      title={t('tx.nav.backToCurrentYear')}
                    >
                      <Calendar size={12} />
                      <span>{t('tx.nav.currentYear')}</span>
                    </button>
                  )}
                </div>
              ) : (
                <h2 className="scope-heading">{activeScopeLabel}</h2>
              )}
            </div>
          </div>

          <div className="scope-actions-right">
            <div className="scope-button-group" role="radiogroup" aria-label={t('tx.scope.aria')}>
              <button
                type="button"
                role="radio"
                aria-checked={scopeMode === 'month'}
                className={`scope-pill-btn ${scopeMode === 'month' ? 'active' : ''}`}
                onClick={() => setScopeMode('month')}
              >
                {t('tx.scope.month')}
              </button>
              <button
                type="button"
                role="radio"
                aria-checked={scopeMode === 'year'}
                className={`scope-pill-btn ${scopeMode === 'year' ? 'active' : ''}`}
                onClick={() => setScopeMode('year')}
              >
                {t('tx.scope.year', { year: selectedYear })}
              </button>
              <button
                type="button"
                role="radio"
                aria-checked={scopeMode === 'all'}
                className={`scope-pill-btn ${scopeMode === 'all' ? 'active' : ''}`}
                onClick={() => setScopeMode('all')}
              >
                {t('tx.scope.all')}
              </button>
              <button
                type="button"
                role="radio"
                aria-checked={scopeMode === 'custom'}
                className={`scope-pill-btn ${scopeMode === 'custom' ? 'active' : ''}`}
                onClick={() => setScopeMode('custom')}
              >
                {t('tx.scope.custom')}
              </button>
            </div>
          </div>
        </div>

        {scopeMode === 'month' && onSelectYearMonth && (
          <div className="month-quick-strip" role="group" aria-label={t('tx.monthsStrip.aria')}>
            <div className="strip-year-label">
              <Calendar size={12} />
              <span>{selectedYear}</span>
            </div>
            <div className="strip-months-list">
              {MONTH_NUMBERS.map((num) => {
                const monthLabel = t(`tx.month.${num}`);
                const isSelected = selectedYearMonth === `${selectedYear}-${num}`;
                const isCurrentCalendar = getCurrentYearMonth() === `${selectedYear}-${num}`;
                const hasTxs = monthsWithTransactions.has(num);

                return (
                  <button
                    key={num}
                    type="button"
                    className={`strip-month-btn ${isSelected ? 'active' : ''} ${
                      isCurrentCalendar ? 'is-calendar-current' : ''
                    }`}
                    onClick={() => onSelectYearMonth(`${selectedYear}-${num}`)}
                    title={
                      hasTxs
                        ? t('tx.monthsStrip.titleWithTx', { month: monthLabel, year: selectedYear })
                        : t('tx.monthsStrip.titleEmpty', { month: monthLabel, year: selectedYear })
                    }
                    aria-current={isSelected ? 'date' : undefined}
                  >
                    <span className="strip-month-name">{monthLabel}</span>
                    {hasTxs && !isSelected && <span className="strip-month-dot" />}
                  </button>
                );
              })}
            </div>
          </div>
        )}

        {scopeMode === 'custom' && (
          <div className="custom-date-range-bar">
            <span className="range-label">
              <Calendar size={13} /> {t('tx.customRange.label')}
            </span>
            <div className="range-inputs">
              <label htmlFor="custom-start">{t('tx.customRange.from')}</label>
              <input
                id="custom-start"
                type="date"
                value={customStartDate}
                onChange={(e) => setCustomStartDate(e.target.value)}
              />
              <label htmlFor="custom-end">{t('tx.customRange.to')}</label>
              <input
                id="custom-end"
                type="date"
                value={customEndDate}
                onChange={(e) => setCustomEndDate(e.target.value)}
              />
            </div>
          </div>
        )}
      </section>

      <section className="kpi-grid-3" aria-label={t('tx.kpi.aria')}>
        <article className="kpi-card">
          <div className="kpi-card-top">
            <span className="kpi-label">{t('tx.kpi.incomeTitle')}</span>
            <TrendingUp size={17} className="kpi-icon green" />
          </div>
          <div className="kpi-value mono positive">
            +{formatBRL(consolidated.incBrlTotal, hideValues)}
          </div>
          <div className="kpi-sub">
            <span>{t('tx.kpi.received', { amount: formatBRL(consolidated.incBrlPaid, hideValues) })}</span>
          </div>
          {consolidated.incBrlPending > 0 && (
            <div className="kpi-sub">
              <span className="pending-tag">
                {t('tx.kpi.toReceive', { amount: formatBRL(consolidated.incBrlPending, hideValues) })}
              </span>
            </div>
          )}
          {consolidated.incUsdTotal > 0 && (
            <div className="kpi-sub kpi-usd-line">
              {t('tx.kpi.includesIncome', { amount: formatMoney(consolidated.incUsdTotal, 'USD', hideValues) })}
            </div>
          )}
        </article>

        <article className="kpi-card">
          <div className="kpi-card-top">
            <span className="kpi-label">{t('tx.kpi.expenseTitle')}</span>
            <TrendingDown size={17} className="kpi-icon coral" />
          </div>
          <div className="kpi-value mono negative">
            -{formatBRL(consolidated.expBrlTotal, hideValues)}
          </div>
          <div className="kpi-sub">
            <span>{t('tx.kpi.paid', { amount: formatBRL(consolidated.expBrlPaid, hideValues) })}</span>
          </div>
          {consolidated.expBrlPending > 0 && (
            <div className="kpi-sub">
              <span className="pending-tag">
                {t('tx.kpi.toPay', { amount: formatBRL(consolidated.expBrlPending, hideValues) })}
              </span>
            </div>
          )}
          {consolidated.expUsdTotal > 0 && (
            <div className="kpi-sub kpi-usd-line">
              {t('tx.kpi.includesExpense', { amount: formatMoney(consolidated.expUsdTotal, 'USD', hideValues) })}
            </div>
          )}
        </article>

        <article className="kpi-card">
          <div className="kpi-card-top">
            <span className="kpi-label">
              {consolidated.netBrlTotal >= 0 ? t('tx.kpi.balanceTitle') : t('tx.kpi.deficitTitle')}
            </span>
            <Scale
              size={17}
              className={`kpi-icon ${consolidated.netBrlTotal >= 0 ? 'brass' : 'coral'}`}
            />
          </div>
          <div
            className={`kpi-value mono ${
              consolidated.netBrlTotal >= 0 ? 'positive' : 'negative'
            }`}
          >
            {consolidated.netBrlTotal >= 0 ? '+' : ''}
            {formatBRL(consolidated.netBrlTotal, hideValues)}
          </div>
          <div className="kpi-sub">
            <span>
              {t('tx.kpi.settled', { amount: formatBRL(consolidated.netBrlPaid, hideValues) })}
              {consolidated.savingsRate !== null
                ? t('tx.kpi.marginSuffix', { rate: consolidated.savingsRate.toFixed(1) })
                : ''}
            </span>
          </div>
          {consolidated.hasUsd && (
            <div className="kpi-sub kpi-usd-line">
              {t('tx.kpi.usdShare')} {consolidated.netUsdTotal >= 0 ? '+' : ''}
              {formatMoney(consolidated.netUsdTotal, 'USD', hideValues)}
              {usdToBrlRate ? (
                <span title={t('tx.kpi.usdRateTitle', { rate: usdToBrlRate.toFixed(2) })}>
                  {' '}
                  (≈ {formatBRL(consolidated.netUsdTotal * usdToBrlRate, hideValues)})
                </span>
              ) : null}
            </div>
          )}
        </article>
      </section>

      {consolidated.topExpenseCategories.length > 0 && (
        <section className="panel-card brutalist-category-drawer">
          <button
            type="button"
            className="category-drawer-toggle"
            onClick={() => setShowCategoryBreakdown((v) => !v)}
            aria-expanded={showCategoryBreakdown}
          >
            <div className="drawer-title-row">
              <PieChart size={15} />
              <span>{t('tx.categories.breakdownTitle')}</span>
              <span className="drawer-badge">
                {t('tx.categories.activeCount', { count: consolidated.topExpenseCategories.length })}
              </span>
            </div>
            <div className="drawer-toggle-icon">
              {showCategoryBreakdown ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
            </div>
          </button>

          {showCategoryBreakdown && (
            <div className="category-drawer-content">
              <div className="category-bars-grid">
                {consolidated.topExpenseCategories.slice(0, 6).map((item) => (
                  <div key={item.category?.id || 'outros'} className="category-bar-row">
                    <div className="cat-bar-header">
                      <div className="cat-bar-name">
                        <span
                          className="cat-color-dot"
                          style={{ backgroundColor: item.category?.color || '#94A3B8' }}
                        />
                        <strong>{item.category?.name || t('tx.categories.other')}</strong>
                        <span className="cat-count">({item.count}×)</span>
                      </div>
                      <div className="cat-bar-values mono">
                        <span className="cat-total">{formatBRL(item.total, hideValues)}</span>
                        <span className="cat-pct">{item.percentage}%</span>
                      </div>
                    </div>
                    <div className="cat-progress-track">
                      <div
                        className="cat-progress-fill"
                        style={{
                          width: `${item.percentage}%`,
                          backgroundColor: item.category?.color || 'var(--color-accent)',
                        }}
                      />
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </section>
      )}

      <section className="panel-card ledger-toolbar-card">
        <div className="ledger-toolbar-search-row">
          <div className="search-input-wrap">
            <Search size={15} />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder={t('tx.search.placeholder')}
            />
            {searchQuery && (
              <button
                type="button"
                className="search-clear-btn"
                onClick={() => setSearchQuery('')}
                title={t('tx.search.clear')}
              >
                <X size={13} />
              </button>
            )}
          </div>

          <button
            type="button"
            className={`mobile-filter-toggle-btn ${activeFiltersCount > 0 ? 'has-active' : ''} ${
              showMobileFilters ? 'is-open' : ''
            }`}
            onClick={() => setShowMobileFilters((v) => !v)}
            aria-expanded={showMobileFilters}
            aria-label={t('tx.filters.toggleAria')}
          >
            <Filter size={14} />
            <span className="filter-btn-text">{t('tx.filters.button')}</span>
            {activeFiltersCount > 0 && (
              <span className="filter-badge-count">{activeFiltersCount}</span>
            )}
            <span className="filter-chevron-indicator">
              {showMobileFilters ? <ChevronUp size={13} /> : <ChevronDown size={13} />}
            </span>
          </button>
        </div>

        {activeFiltersCount > 0 && (
          <div className="active-filters-chips-row" aria-label={t('tx.filters.activeAria')}>
            <span className="active-filters-label">{t('tx.filters.activeLabel')}</span>
            {typeFilter !== 'all' && (
              <button
                type="button"
                className="active-filter-chip"
                onClick={() => setTypeFilter('all')}
                title={t('tx.filters.removeType')}
              >
                <span>
                  {typeFilter === 'income' ? t('tx.filters.typeIncome') : t('tx.filters.typeExpense')}
                </span>
                <X size={11} />
              </button>
            )}
            {statusFilter !== 'all' && (
              <button
                type="button"
                className="active-filter-chip"
                onClick={() => setStatusFilter('all')}
                title={t('tx.filters.removeStatus')}
              >
                <span>
                  {statusFilter === 'paid'
                    ? t('tx.filters.statusPaid')
                    : t('tx.filters.statusPending')}
                </span>
                <X size={11} />
              </button>
            )}
            {categoryFilter !== 'all' && (
              <button
                type="button"
                className="active-filter-chip"
                onClick={() => setCategoryFilter('all')}
                title={t('tx.filters.removeCategory')}
              >
                <span>{catMap.get(categoryFilter)?.name || t('tx.filters.categoryFallback')}</span>
                <X size={11} />
              </button>
            )}
            {accountFilter !== 'all' && (
              <button
                type="button"
                className="active-filter-chip"
                onClick={() => setAccountFilter('all')}
                title={t('tx.filters.removeAccount')}
              >
                <span>{accMap.get(accountFilter)?.name || t('tx.filters.accountFallback')}</span>
                <X size={11} />
              </button>
            )}
            <button
              type="button"
              className="active-filters-clear-all"
              onClick={handleClearAllFilters}
              title={t('tx.filters.clearAllTitle')}
            >
              {t('tx.filters.clearAll')}
            </button>
          </div>
        )}

        <div className={`ledger-secondary-filters ${showMobileFilters ? 'mobile-expanded' : ''}`}>
          <div className="segmented-filter" role="radiogroup" aria-label={t('tx.filters.byTypeAria')}>
            <button
              type="button"
              role="radio"
              aria-checked={typeFilter === 'all'}
              className={typeFilter === 'all' ? 'active' : ''}
              onClick={() => setTypeFilter('all')}
            >
              {t('tx.filters.typeAll')}
            </button>
            <button
              type="button"
              role="radio"
              aria-checked={typeFilter === 'income'}
              className={typeFilter === 'income' ? 'active' : ''}
              onClick={() => setTypeFilter('income')}
            >
              {t('tx.filters.typeIncome')}
            </button>
            <button
              type="button"
              role="radio"
              aria-checked={typeFilter === 'expense'}
              className={typeFilter === 'expense' ? 'active' : ''}
              onClick={() => setTypeFilter('expense')}
            >
              {t('tx.filters.typeExpense')}
            </button>
          </div>

          <div
            className="segmented-filter"
            role="radiogroup"
            aria-label={t('tx.filters.byStatusAria')}
          >
            <button
              type="button"
              role="radio"
              aria-checked={statusFilter === 'all'}
              className={statusFilter === 'all' ? 'active' : ''}
              onClick={() => setStatusFilter('all')}
            >
              {t('tx.filters.statusAll')}
            </button>
            <button
              type="button"
              role="radio"
              aria-checked={statusFilter === 'paid'}
              className={statusFilter === 'paid' ? 'active' : ''}
              onClick={() => setStatusFilter('paid')}
            >
              {t('tx.filters.statusPaid')}
            </button>
            <button
              type="button"
              role="radio"
              aria-checked={statusFilter === 'pending'}
              className={statusFilter === 'pending' ? 'active' : ''}
              onClick={() => setStatusFilter('pending')}
            >
              {t('tx.filters.statusPending')}
            </button>
          </div>

          <select
            className="filter-select"
            value={categoryFilter}
            onChange={(e) => setCategoryFilter(e.target.value)}
            aria-label={t('tx.filters.byCategoryAria')}
          >
            <option value="all">{t('tx.filters.allCategories')}</option>
            {categories.map((c) => (
              <option key={c.id} value={c.id}>
                {c.type === 'income' ? '↑ ' : '↓ '}
                {c.name}
              </option>
            ))}
          </select>

          <select
            className="filter-select"
            value={accountFilter}
            onChange={(e) => setAccountFilter(e.target.value)}
            aria-label={t('tx.filters.byAccountAria')}
          >
            <option value="all">{t('tx.filters.allAccounts')}</option>
            {accounts.map((a) => (
              <option key={a.id} value={a.id}>
                {a.name}
              </option>
            ))}
          </select>
        </div>
      </section>

      <section className="panel-card ledger-table-card">
        {filteredTransactions.length === 0 ? (
          <div className="empty-state-box">
            <p>{t('tx.empty.message')}</p>
            <div className="empty-state-actions">
              <button
                type="button"
                className="btn-Quick-expense"
                onClick={() => onOpenNewTransaction('expense')}
              >
                {t('tx.empty.addExpense')}
              </button>
              <button
                type="button"
                className="btn-Quick-income"
                onClick={() => onOpenNewTransaction('income')}
              >
                {t('tx.empty.addIncome')}
              </button>
            </div>
          </div>
        ) : (
          <div className="ledger-table-scroll">
            <table className="ledger-table">
              <thead>
                <tr>
                  <th>{t('tx.table.date')}</th>
                  <th>{t('tx.table.description')}</th>
                  <th>{t('tx.table.category')}</th>
                  {showAccount && <th>{t('tx.table.account')}</th>}
                  <th>{t('tx.table.status')}</th>
                  <th className="align-right">{t('tx.table.amount')}</th>
                  <th className="align-right">{t('tx.table.actions')}</th>
                </tr>
              </thead>
              <tbody>
                {visibleTransactions.map((tx) => {
                  const cat = catMap.get(tx.categoryId);
                  const acc = accMap.get(tx.accountId);
                  return (
                    <tr key={tx.id}>
                      <td className="mono date-cell td-date">{formatFullDateBR(tx.date)}</td>
                      <td className="td-desc">
                        <div className="tx-desc-cell">
                          <strong>{tx.description}</strong>
                          {tx.notes && <span className="tx-note-sub">{tx.notes}</span>}
                        </div>
                      </td>
                      <td className="td-cat">
                        <span className="cat-pill">
                          <i
                            className="cat-color-dot"
                            style={{ backgroundColor: cat?.color || '#94A3B8' }}
                          />
                          {cat?.name || t('tx.table.categoryFallback')}
                        </span>
                      </td>
                      {showAccount && (
                        <td className="td-acc">
                          <span className="acc-pill">
                            {acc?.name || t('tx.filters.accountFallback')}
                          </span>
                        </td>
                      )}
                      <td className="td-status">
                        <button
                          type="button"
                          className={`status-badge-btn ${tx.status}`}
                          onClick={() => onToggleTransactionStatus(tx.id)}
                          title={t('tx.table.toggleStatusTitle')}
                        >
                          {tx.status === 'paid' ? (
                            <>
                              <CheckCircle2 size={13} />{' '}
                              {tx.type === 'income' ? t('tx.status.received') : t('tx.status.paid')}
                            </>
                          ) : (
                            <>
                              <Clock size={13} /> {t('tx.status.pending')}
                            </>
                          )}
                        </button>
                        {tx.status === 'paid' && tx.paidAt && tx.paidAt !== tx.date && (
                          <span className="paid-at-hint">
                            {t('tx.table.paidAt', { date: formatShortDate(tx.paidAt) })}
                          </span>
                        )}
                      </td>
                      <td
                        className={`mono align-right amount-cell td-amount ${
                          tx.type === 'income' ? 'positive' : 'negative'
                        }`}
                      >
                        <div className="amount-main-line">
                          <span className="amount-val">
                            {tx.type === 'income' ? '+' : '-'}
                            {formatMoney(tx.amount, tx.currency || 'BRL', hideValues)}
                          </span>
                          {tx.currency && tx.currency !== 'BRL' && (
                            <span className="currency-pill-inline">{tx.currency}</span>
                          )}
                        </div>
                        {tx.currency && tx.currency !== 'BRL' && tx.exchangeRate && (
                          <div className="amount-fx-sub mono">
                            ≈ {formatBRL(tx.amount * tx.exchangeRate, hideValues)}{' '}
                            <span className="rate-hint">(R$ {tx.exchangeRate.toFixed(2)})</span>
                          </div>
                        )}
                      </td>
                      <td className="align-right td-actions">
                        <div className="row-actions">
                          <button
                            type="button"
                            className="icon-btn-sm"
                            onClick={() => onEditTransaction(tx)}
                            title={t('tx.actions.editTitle')}
                            aria-label={t('tx.actions.editAria', { description: tx.description })}
                          >
                            <Edit3 size={14} />
                          </button>
                          <button
                            type="button"
                            className="icon-btn-sm"
                            onClick={() => onDuplicateTransaction(tx)}
                            title={t('tx.actions.duplicateTitle')}
                            aria-label={t('tx.actions.duplicateAria', {
                              description: tx.description,
                            })}
                          >
                            <Copy size={14} />
                          </button>
                          <button
                            type="button"
                            className="icon-btn-sm danger"
                            onClick={() => setTxToDelete(tx)}
                            title={t('tx.actions.deleteTitle')}
                            aria-label={t('tx.actions.deleteAria', {
                              description: tx.description,
                            })}
                          >
                            <Trash2 size={14} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>

            {filteredTransactions.length > visibleCount && (
              <div
                style={{
                  padding: '14px 20px',
                  display: 'flex',
                  justifyContent: 'center',
                  borderTop: '1px solid var(--border-card)',
                }}
              >
                <button
                  type="button"
                  className="btn-secondary"
                  onClick={() =>
                    setPaginationState({
                      key: filterKey,
                      count: visibleCount + PAGE_SIZE,
                    })
                  }
                >
                  {t('tx.pagination.loadMore', {
                    count: filteredTransactions.length - visibleCount,
                  })}
                </button>
              </div>
            )}
          </div>
        )}
      </section>

      {txToDelete && (() => {
        const cat = catMap.get(txToDelete.categoryId);
        const acc = accMap.get(txToDelete.accountId);
        const isExpense = txToDelete.type === 'expense';

        return (
          <div className="modal-backdrop" onClick={() => setTxToDelete(null)}>
            <div
              className="modal-card modal-delete-confirm"
              onClick={(e) => e.stopPropagation()}
              role="dialog"
              aria-modal="true"
              aria-labelledby="delete-tx-title"
            >
              <header className="modal-header">
                <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                  <AlertTriangle size={18} style={{ color: 'var(--color-coral)' }} />
                  <h2 id="delete-tx-title">{t('tx.delete.title')}</h2>
                </div>
                <button
                  type="button"
                  className="icon-action-btn"
                  onClick={() => setTxToDelete(null)}
                  title={t('tx.common.closeEsc')}
                >
                  <X size={16} />
                </button>
              </header>

              <div className="modal-body" style={{ padding: '22px 24px' }}>
                <div className="delete-confirm-box">
                  <div className="delete-confirm-cat-preview">
                    {cat && (
                      <span
                        className="cat-color-square"
                        style={{ backgroundColor: cat.color, width: 14, height: 14 }}
                      />
                    )}
                    <strong>{txToDelete.description}</strong>
                    <span
                      className={`budget-status-chip ${isExpense ? 'danger' : 'ok'}`}
                      style={{ marginLeft: 'auto' }}
                    >
                      {formatMoney(txToDelete.amount, txToDelete.currency || 'BRL', hideValues)}
                    </span>
                  </div>

                  <p className="delete-confirm-desc">{t('tx.delete.confirmQuestion')}</p>

                  <div className="delete-confirm-impact">
                    <p>
                      <strong>{t('tx.delete.dateLabel')}</strong> {formatFullDateBR(txToDelete.date)}{' '}
                      <br />
                      <strong>{t('tx.delete.categoryLabel')}</strong>{' '}
                      {cat?.name || t('tx.delete.noCategory')} <br />
                      <strong>{t('tx.delete.accountLabel')}</strong>{' '}
                      {acc?.name || t('tx.delete.defaultAccount')} <br />
                      <strong>{t('tx.delete.statusLabel')}</strong>{' '}
                      {txToDelete.status === 'paid'
                        ? t('tx.delete.statusPaid')
                        : t('tx.status.pending')}
                    </p>
                    <p style={{ marginTop: 8, fontSize: '11.5px', color: 'var(--color-coral)' }}>
                      {t('tx.delete.warning')}
                    </p>
                  </div>
                </div>
              </div>

              <footer className="modal-footer" style={{ padding: '16px 24px' }}>
                <button
                  type="button"
                  className="btn-secondary"
                  onClick={() => setTxToDelete(null)}
                >
                  {t('tx.common.cancel')}
                </button>
                <button
                  type="button"
                  className="btn-danger"
                  onClick={() => {
                    onDeleteTransaction(txToDelete.id);
                    setTxToDelete(null);
                  }}
                  autoFocus
                >
                  <Trash2 size={14} /> {t('tx.delete.confirmButton')}
                </button>
              </footer>
            </div>
          </div>
        );
      })()}
    </div>
  );
};
