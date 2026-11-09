import React, { useMemo, useState, useEffect } from 'react';
import {
  Target,
  Plus,
  Check,
  AlertTriangle,
  CheckCircle2,
  Trash2,
  Edit3,
  X,
  TrendingDown,
  ShieldCheck,
  Search,
  ArrowUpDown,
  Filter,
} from 'lucide-react';
import type { Category, Currency, Transaction, TransactionType } from '../types/finance';
import { generateEntityId } from '../domain/id';
import { isProtectedCategory } from '../utils/categories';
import { formatBRL, formatMoney, formatMonthYearLabel } from '../utils/formatters';
import {
  categoryBudgetCurrency,
  categoryBudgetInBrl,
  convertAmount,
  parseDecimalInput,
  txAmountInBrl,
} from '../utils/money';
import {
  getCurrencyInfo,
  getCurrencySymbol,
  normalizeCurrency,
  resolveExchangeRates,
  type ExchangeRateSource,
} from '../services/currencyService';

interface BudgetsViewProps {
  selectedYearMonth: string;
  categories: Category[];
  transactions: Transaction[];
  hideValues: boolean;
  usdToBrlRate?: number;
  rateSource?: ExchangeRateSource;
  onUpdateCategory: (updated: Category) => void;
  onAddCategory: (newCat: Category) => void;
  onDeleteCategory: (catId: string) => void;
}

const PRESET_COLORS = [
  '#C8FF00',
  '#10B981',
  '#38BDF8',
  '#8B5CF6',
  '#F59E0B',
  '#FB923C',
  '#F43F5E',
  '#EC4899',
];

type StatusFilter = 'all' | 'ok' | 'warn' | 'over' | 'no-goal';
type SortField = 'pct' | 'spent' | 'limit' | 'name';

export const BudgetsView: React.FC<BudgetsViewProps> = ({
  selectedYearMonth,
  categories,
  transactions,
  hideValues,
  usdToBrlRate,
  rateSource,
  onUpdateCategory,
  onAddCategory,
  onDeleteCategory,
}) => {
  const effectiveRates = rateSource ?? usdToBrlRate;
  const baseCurrency: Currency = 'BRL';

  const availableCurrencies = useMemo(() => {
    const codes = new Set<Currency>([baseCurrency]);
    for (const r of resolveExchangeRates(effectiveRates)) {
      if (r.from) codes.add(normalizeCurrency(r.from));
      if (r.to) codes.add(normalizeCurrency(r.to));
    }
    for (const c of categories) {
      if (c.budgetCurrency) {
        codes.add(normalizeCurrency(c.budgetCurrency));
      }
    }
    return Array.from(codes);
  }, [baseCurrency, effectiveRates, categories]);

  const formatCurrencyOptionLabel = (code: Currency) => {
    const info = getCurrencyInfo(code);
    const flag = info?.flag ? `${info.flag} ` : '';
    const symbol = getCurrencySymbol(code);
    const name = info?.name || code;
    if (code === baseCurrency) {
      return `${flag}${code} (${symbol}) — ${name} (Padrão)`;
    }
    return `${flag}${code} (${symbol}) — ${name}`;
  };

  const [editingCatId, setEditingCatId] = useState<string | null>(null);
  const [budgetDraft, setBudgetDraft] = useState<string>('');
  const [budgetCurrencyDraft, setBudgetCurrencyDraft] = useState<Currency>(baseCurrency);
  const [nameDraft, setNameDraft] = useState<string>('');
  const [colorDraft, setColorDraft] = useState<string>('');

  const [editingIncomeCatId, setEditingIncomeCatId] = useState<string | null>(null);
  const [incomeNameDraft, setIncomeNameDraft] = useState<string>('');
  const [incomeColorDraft, setIncomeColorDraft] = useState<string>('');

  const [categoryToDelete, setCategoryToDelete] = useState<Category | null>(null);
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);

  const [statusFilter, setStatusFilter] = useState<StatusFilter>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [sortBy, setSortBy] = useState<SortField>('pct');

  const [newCatName, setNewCatName] = useState('');
  const [newCatType, setNewCatType] = useState<TransactionType>('expense');
  const [newCatBudget, setNewCatBudget] = useState('');
  const [newCatCurrency, setNewCatCurrency] = useState<Currency>(baseCurrency);
  const [newCatColor, setNewCatColor] = useState(PRESET_COLORS[0]);

  useEffect(() => {
    if (!categoryToDelete && !isCreateModalOpen) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        if (categoryToDelete) setCategoryToDelete(null);
        else if (isCreateModalOpen) setIsCreateModalOpen(false);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [categoryToDelete, isCreateModalOpen]);

  const openCreateModal = (defaultType: TransactionType = 'expense') => {
    setNewCatType(defaultType);
    setNewCatName('');
    setNewCatBudget('');
    setNewCatCurrency(baseCurrency);
    setNewCatColor(PRESET_COLORS[categories.length % PRESET_COLORS.length]);
    setIsCreateModalOpen(true);
  };

  const monthStatsByCategory = useMemo(() => {
    const map = new Map<string, { paid: number; pending: number; count: number }>();
    for (const tx of transactions) {
      if (!tx.date.startsWith(selectedYearMonth)) continue;
      const valueBrl = txAmountInBrl(tx, effectiveRates);
      const entry = map.get(tx.categoryId) || { paid: 0, pending: 0, count: 0 };
      if (tx.status === 'paid') entry.paid += valueBrl;
      else entry.pending += valueBrl;
      entry.count++;
      map.set(tx.categoryId, entry);
    }
    return map;
  }, [transactions, selectedYearMonth, effectiveRates]);

  const expenseCategoriesWithStats = useMemo(() => {
    const expCats = categories.filter((c) => c.type === 'expense');
    return expCats.map((cat) => {
      const stats = monthStatsByCategory.get(cat.id) || { paid: 0, pending: 0, count: 0 };
      const totalSpent = stats.paid + stats.pending;
      const rawLimit = cat.monthlyBudget || 0;
      const budgetCurrency = categoryBudgetCurrency(cat);
      const limit = categoryBudgetInBrl(cat, effectiveRates);
      const remaining = limit - totalSpent;
      const pct = limit > 0 ? (totalSpent / limit) * 100 : 0;

      return {
        cat,
        paid: stats.paid,
        pending: stats.pending,
        totalSpent,
        rawLimit,
        budgetCurrency,
        limit,
        remaining,
        pct,
        count: stats.count,
      };
    });
  }, [categories, monthStatsByCategory, effectiveRates]);

  const incomeCategoriesWithStats = useMemo(() => {
    const incCats = categories.filter((c) => c.type === 'income');
    return incCats.map((cat) => {
      const stats = monthStatsByCategory.get(cat.id) || { paid: 0, pending: 0, count: 0 };
      return {
        cat,
        paid: stats.paid,
        pending: stats.pending,
        total: stats.paid + stats.pending,
        count: stats.count,
      };
    });
  }, [categories, monthStatsByCategory]);

  const totals = useMemo(() => {
    const withGoal = expenseCategoriesWithStats.filter((i) => i.limit > 0);
    const totalBudget = withGoal.reduce((acc, i) => acc + i.limit, 0);
    const totalSpent = withGoal.reduce((acc, i) => acc + i.totalSpent, 0);
    const paidTotal = withGoal.reduce((acc, i) => acc + i.paid, 0);
    const pendingTotal = withGoal.reduce((acc, i) => acc + i.pending, 0);
    const overCount = withGoal.filter((i) => i.totalSpent > i.limit).length;
    const warnCount = withGoal.filter((i) => i.totalSpent <= i.limit && i.pct >= 80).length;
    const okCount = withGoal.filter((i) => i.totalSpent <= i.limit && i.pct < 80).length;
    const withoutGoalCount = expenseCategoriesWithStats.filter((i) => i.limit === 0).length;
    const txCount = withGoal.reduce((acc, i) => acc + i.count, 0);

    return {
      totalBudget,
      totalSpent,
      paidTotal,
      pendingTotal,
      remaining: totalBudget - totalSpent,
      pct: totalBudget > 0 ? (totalSpent / totalBudget) * 100 : 0,
      overCount,
      warnCount,
      okCount,
      withGoalCount: withGoal.length,
      withoutGoalCount,
      allExpensesCount: expenseCategoriesWithStats.length,
      txCount,
    };
  }, [expenseCategoriesWithStats]);

  const startEditing = (cat: Category) => {
    setEditingCatId(cat.id);
    setNameDraft(cat.name);
    setBudgetDraft(cat.monthlyBudget ? String(cat.monthlyBudget) : '');
    setBudgetCurrencyDraft(categoryBudgetCurrency(cat));
    setColorDraft(cat.color || PRESET_COLORS[0]);
  };

  const cancelEditing = () => {
    setEditingCatId(null);
  };

  const saveEditing = (cat: Category) => {
    const parsedBudget = Math.max(0, parseDecimalInput(budgetDraft) || 0);
    const hasBudget = cat.type === 'expense' && parsedBudget > 0;
    onUpdateCategory({
      ...cat,
      name: nameDraft.trim() || cat.name,
      color: colorDraft || cat.color,
      monthlyBudget: hasBudget ? parsedBudget : undefined,
      budgetCurrency:
        hasBudget && budgetCurrencyDraft !== baseCurrency ? budgetCurrencyDraft : undefined,
    });
    setEditingCatId(null);
  };

  const removeGoal = (cat: Category) => {
    onUpdateCategory({ ...cat, monthlyBudget: undefined, budgetCurrency: undefined });
    if (editingCatId === cat.id) setEditingCatId(null);
  };

  const startEditingIncome = (cat: Category) => {
    setEditingIncomeCatId(cat.id);
    setIncomeNameDraft(cat.name);
    setIncomeColorDraft(cat.color || PRESET_COLORS[0]);
  };

  const cancelEditingIncome = () => {
    setEditingIncomeCatId(null);
  };

  const saveEditingIncome = (cat: Category) => {
    onUpdateCategory({
      ...cat,
      name: incomeNameDraft.trim() || cat.name,
      color: incomeColorDraft || cat.color,
    });
    setEditingIncomeCatId(null);
  };

  const handleCreateCategory = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newCatName.trim()) return;
    const parsedBudget = newCatBudget.trim()
      ? Math.max(0, parseDecimalInput(newCatBudget) || 0)
      : 0;
    const hasBudget = newCatType === 'expense' && parsedBudget > 0;
    const created: Category = {
      id: generateEntityId('cat'),
      name: newCatName.trim(),
      type: newCatType,
      color: newCatColor,
      icon: 'Tag',
      monthlyBudget: hasBudget ? parsedBudget : undefined,
      budgetCurrency:
        hasBudget && newCatCurrency !== baseCurrency ? newCatCurrency : undefined,
    };
    onAddCategory(created);
    setNewCatName('');
    setNewCatBudget('');
    setNewCatCurrency(baseCurrency);
    setIsCreateModalOpen(false);
  };

  const filteredExpenseCategories = useMemo(() => {
    let list = expenseCategoriesWithStats;

    if (statusFilter === 'ok') {
      list = list.filter(
        (i) => (i.limit > 0 && i.totalSpent <= i.limit && i.pct < 80) || editingCatId === i.cat.id
      );
    } else if (statusFilter === 'warn') {
      list = list.filter(
        (i) => (i.limit > 0 && i.totalSpent <= i.limit && i.pct >= 80) || editingCatId === i.cat.id
      );
    } else if (statusFilter === 'over') {
      list = list.filter((i) => (i.limit > 0 && i.totalSpent > i.limit) || editingCatId === i.cat.id);
    } else if (statusFilter === 'no-goal') {
      list = list.filter((i) => i.limit === 0 || editingCatId === i.cat.id);
    }

    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase().trim();
      list = list.filter((i) => i.cat.name.toLowerCase().includes(q));
    }

    return [...list].sort((a, b) => {
      if (sortBy === 'pct') return b.pct - a.pct;
      if (sortBy === 'spent') return b.totalSpent - a.totalSpent;
      if (sortBy === 'limit') return b.limit - a.limit;
      if (sortBy === 'name') return a.cat.name.localeCompare(b.cat.name);
      return 0;
    });
  }, [expenseCategoriesWithStats, statusFilter, searchQuery, sortBy, editingCatId]);

  return (
    <div className="budgets-view-stack">
      <section className="kpi-grid-4">
        <article className="kpi-card">
          <div className="kpi-card-top">
            <span className="kpi-label">TETO MENSAL TOTAL</span>
            <Target size={17} className="kpi-icon teal" />
          </div>
          <div className="kpi-value mono">{formatBRL(totals.totalBudget, hideValues)}</div>
          <div className="kpi-sub">
            <span>
              {totals.withGoalCount}{' '}
              {totals.withGoalCount === 1
                ? 'categoria com meta ativa'
                : 'categorias com meta ativa'}
            </span>
          </div>
        </article>

        <article className="kpi-card">
          <div className="kpi-card-top">
            <span className="kpi-label">TOTAL COMPROMETIDO</span>
            <TrendingDown
              size={17}
              className={`kpi-icon ${
                totals.totalSpent > totals.totalBudget && totals.totalBudget > 0 ? 'coral' : 'teal'
              }`}
            />
          </div>
          <div className="kpi-value mono">{formatBRL(totals.totalSpent, hideValues)}</div>
          <div className="kpi-sub">
            <span>
              {totals.totalBudget > 0
                ? `${totals.pct.toFixed(0)}% do orçamento estipulado`
                : 'Sem teto definido'}
            </span>
          </div>
        </article>

        <article className="kpi-card">
          <div className="kpi-card-top">
            <span className="kpi-label">MARGEM RESTANTE</span>
            <ShieldCheck
              size={17}
              className={`kpi-icon ${totals.remaining >= 0 ? 'green' : 'coral'}`}
            />
          </div>
          <div
            className={`kpi-value mono ${
              totals.remaining < 0 ? 'negative' : totals.remaining === 0 ? '' : 'positive'
            }`}
          >
            {formatBRL(totals.remaining, hideValues)}
          </div>
          <div className="kpi-sub">
            <span>
              {totals.totalBudget === 0
                ? 'Defina tetos nas categorias abaixo'
                : totals.remaining >= 0
                  ? 'Saldo disponível dentro do teto'
                  : `Excedido em ${formatBRL(Math.abs(totals.remaining), hideValues)}`}
            </span>
          </div>
        </article>

        <article className="kpi-card">
          <div className="kpi-card-top">
            <span className="kpi-label">SAÚDE DAS METAS</span>
            <AlertTriangle
              size={17}
              className={`kpi-icon ${
                totals.overCount > 0 ? 'coral' : totals.warnCount > 0 ? 'amber' : 'green'
              }`}
            />
          </div>
          <div className="kpi-value mono">
            {totals.overCount > 0
              ? `${totals.overCount} ESTOURADA${totals.overCount > 1 ? 'S' : ''}`
              : totals.warnCount > 0
                ? `${totals.warnCount} EM ALERTA`
                : '100% NO TETO'}
          </div>
          <div className="kpi-sub">
            <span>
              {totals.okCount} no teto · {totals.withoutGoalCount} sem meta definida
            </span>
          </div>
        </article>
      </section>

      {totals.totalBudget > 0 && (
        <section className="budget-execution-banner">
          <header className="budget-execution-header">
            <div>
              <span className="eyebrow">
                EXECUÇÃO ORÇAMENTÁRIA • {formatMonthYearLabel(selectedYearMonth).toUpperCase()}
              </span>
              <h3>Consumo Global do Teto de Gastos</h3>
            </div>

            <div>
              {totals.pct > 100 ? (
                <span className="budget-badge danger">
                  <AlertTriangle size={13} />
                  EXCEDIDO EM {formatBRL(Math.abs(totals.remaining), hideValues)} (
                  {totals.pct.toFixed(0)}%)
                </span>
              ) : totals.pct >= 80 ? (
                <span className="budget-badge warn">
                  <AlertTriangle size={13} />
                  ATENÇÃO: {totals.pct.toFixed(0)}% DO TETO ATINGIDO
                </span>
              ) : (
                <span className="budget-badge ok">
                  <CheckCircle2 size={13} />
                  NO TETO: {totals.pct.toFixed(0)}% CONSUMIDO
                </span>
              )}
            </div>
          </header>

          <div className="budget-track-wrap">
            <div className="budget-track">
              <div
                className={`budget-track-fill ${
                  totals.pct > 100 ? 'danger' : totals.pct >= 80 ? 'warn' : 'ok'
                }`}
                style={{ width: `${Math.min(100, Math.max(0, totals.pct))}%` }}
              />
              <span className="budget-track-marker marker-80" data-label="80% ALERTA" />
              <span className="budget-track-marker marker-100" data-label="100% LIMITE" />
            </div>
          </div>
        </section>
      )}

      <section className="budgets-toolbar">
        <div className="budgets-filter-tabs">
          <button
            type="button"
            className={`budget-filter-tab ${statusFilter === 'all' ? 'active' : ''}`}
            onClick={() => setStatusFilter('all')}
          >
            <Filter size={12} />
            <span>Todas</span>
            <span className="budget-filter-count">({expenseCategoriesWithStats.length})</span>
          </button>

          <button
            type="button"
            className={`budget-filter-tab ${statusFilter === 'ok' ? 'active' : ''}`}
            onClick={() => setStatusFilter('ok')}
          >
            <span>No Teto</span>
            <span className="budget-filter-count">({totals.okCount})</span>
          </button>

          <button
            type="button"
            className={`budget-filter-tab ${statusFilter === 'warn' ? 'active' : ''}`}
            onClick={() => setStatusFilter('warn')}
          >
            <span>Atenção 80%+</span>
            <span className="budget-filter-count">({totals.warnCount})</span>
          </button>

          <button
            type="button"
            className={`budget-filter-tab ${statusFilter === 'over' ? 'active' : ''}`}
            onClick={() => setStatusFilter('over')}
          >
            <span>Excedidas</span>
            <span className="budget-filter-count">({totals.overCount})</span>
          </button>

          <button
            type="button"
            className={`budget-filter-tab ${statusFilter === 'no-goal' ? 'active' : ''}`}
            onClick={() => setStatusFilter('no-goal')}
          >
            <span>Sem Meta</span>
            <span className="budget-filter-count">({totals.withoutGoalCount})</span>
          </button>
        </div>

        <div className="budgets-toolbar-actions">
          <div className="budget-search-box">
            <Search size={14} />
            <input
              type="text"
              placeholder="Buscar categoria..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
            {searchQuery && (
              <button
                type="button"
                className="icon-btn-xs"
                onClick={() => setSearchQuery('')}
                title="Limpar busca"
              >
                <X size={12} />
              </button>
            )}
          </div>

          <div className="budget-sort-wrap">
            <ArrowUpDown size={13} style={{ color: 'var(--text-muted)', marginRight: 4 }} />
            <select
              className="budget-sort-select"
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value as SortField)}
            >
              <option value="pct">% Consumido</option>
              <option value="spent">Maior Gasto</option>
              <option value="limit">Maior Teto</option>
              <option value="name">Ordem Alfabética</option>
            </select>
          </div>

          <button
            type="button"
            className="btn-primary budget-new-cat-btn"
            onClick={() => openCreateModal('expense')}
          >
            <Plus size={14} /> Nova Categoria
          </button>
        </div>
      </section>

      {filteredExpenseCategories.length === 0 ? (
        <section className="panel-card budgets-empty-panel">
          <Target size={28} style={{ color: 'var(--color-accent)' }} />
          <div>
            <h4>Nenhuma categoria encontrada</h4>
            <p>
              {searchQuery || statusFilter !== 'all'
                ? 'Nenhuma categoria corresponde aos filtros aplicados. Redefina a busca ou selecione "Todas".'
                : 'Crie sua primeira categoria de despesa e estipule um teto mensal.'}
            </p>
            {searchQuery || statusFilter !== 'all' ? (
              <button
                type="button"
                className="btn-secondary"
                style={{ marginTop: 10 }}
                onClick={() => {
                  setStatusFilter('all');
                  setSearchQuery('');
                }}
              >
                Limpar Filtros
              </button>
            ) : (
              <button
                type="button"
                className="btn-primary"
                style={{ marginTop: 10 }}
                onClick={() => openCreateModal('expense')}
              >
                <Plus size={14} /> Nova Categoria
              </button>
            )}
          </div>
        </section>
      ) : (
        <div className="budgets-cards-grid">
          {filteredExpenseCategories.map((item) => {
            const isEditing = editingCatId === item.cat.id;
            const isProtected = isProtectedCategory(item.cat);
            const hasLimit = item.limit > 0;
            const isOver = hasLimit && item.totalSpent > item.limit;
            const isWarn = hasLimit && !isOver && item.pct >= 80;

            return (
              <article
                key={item.cat.id}
                className={`budget-cat-card ${
                  isOver ? 'is-over' : isWarn ? 'is-warn' : hasLimit ? 'is-ok' : 'is-none'
                }`}
              >
                <header className="budget-cat-header">
                  <div className="budget-cat-title">
                    <span
                      className="cat-color-square"
                      style={{ backgroundColor: isEditing ? colorDraft : item.cat.color }}
                    />
                    <strong>{item.cat.name}</strong>
                    {isProtected && (
                      <span
                        className="budget-status-chip system-badge"
                        title="Categoria permanente do sistema (não pode ser excluída)"
                        style={{
                          fontSize: '9px',
                          padding: '1px 5px',
                          opacity: 0.75,
                          letterSpacing: '0.05em',
                        }}
                      >
                        SISTEMA
                      </span>
                    )}
                  </div>

                  <div className="row-actions">
                    {!isEditing ? (
                      <>
                        {hasLimit &&
                          (isOver ? (
                            <span className="budget-status-chip danger">
                              +{formatBRL(Math.abs(item.remaining), hideValues)}
                            </span>
                          ) : isWarn ? (
                            <span className="budget-status-chip warn">
                              {item.pct.toFixed(0)}%
                            </span>
                          ) : (
                            <span className="budget-status-chip ok">
                              {item.pct.toFixed(0)}%
                            </span>
                          ))}

                        <button
                          type="button"
                          className="icon-btn-sm"
                          onClick={() => startEditing(item.cat)}
                          title="Ajustar teto mensal ou dados"
                        >
                          <Edit3 size={13} />
                        </button>

                        {hasLimit && (
                          <button
                            type="button"
                            className="icon-btn-sm"
                            onClick={() => removeGoal(item.cat)}
                            title="Remover meta mensal (mantém os lançamentos)"
                          >
                            <X size={13} />
                          </button>
                        )}

                        {!isProtected ? (
                          <button
                            type="button"
                            className="icon-btn-sm danger"
                            onClick={() => setCategoryToDelete(item.cat)}
                            title="Excluir categoria"
                          >
                            <Trash2 size={13} />
                          </button>
                        ) : (
                          <span
                            className="icon-btn-sm disabled"
                            style={{
                              opacity: 0.35,
                              cursor: 'not-allowed',
                              display: 'inline-flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                            }}
                            title="Categoria do sistema permanente (não pode ser excluída)"
                          >
                            <ShieldCheck size={13} />
                          </span>
                        )}
                      </>
                    ) : null}
                  </div>
                </header>

                {isEditing ? (
                  <div className="budget-card-edit-box">
                    <div className="budget-edit-field">
                      <label>
                        Nome da Categoria{' '}
                        {isProtected && <span style={{ opacity: 0.6 }}>(Fixo)</span>}
                      </label>
                      <input
                        type="text"
                        value={isProtected ? item.cat.name : nameDraft}
                        onChange={(e) => setNameDraft(e.target.value)}
                        placeholder="Nome da categoria"
                        disabled={isProtected}
                        title={
                          isProtected
                            ? 'O nome da categoria do sistema é fixo ("Outros")'
                            : undefined
                        }
                        style={isProtected ? { opacity: 0.7, cursor: 'not-allowed' } : undefined}
                        autoFocus={!isProtected}
                      />
                    </div>

                    <div className="budget-edit-goal-row">
                      <div className="budget-edit-field">
                        <label>Moeda da Meta</label>
                        <select
                          value={budgetCurrencyDraft}
                          onChange={(e) => setBudgetCurrencyDraft(e.target.value as Currency)}
                        >
                          {availableCurrencies.map((code) => (
                            <option key={code} value={code}>
                              {formatCurrencyOptionLabel(code)}
                            </option>
                          ))}
                        </select>
                      </div>

                      <div className="budget-edit-field">
                        <label>Teto Mensal ({getCurrencySymbol(budgetCurrencyDraft)})</label>
                        <input
                          type="number"
                          step="0.01"
                          min="0"
                          className="mono"
                          value={budgetDraft}
                          onChange={(e) => setBudgetDraft(e.target.value)}
                          placeholder="Ex: 800"
                        />
                      </div>
                    </div>

                    {(() => {
                      const parsed = Math.max(0, parseDecimalInput(budgetDraft) || 0);
                      if (budgetCurrencyDraft === baseCurrency || parsed <= 0) return null;
                      const converted = convertAmount(
                        parsed,
                        budgetCurrencyDraft,
                        baseCurrency,
                        effectiveRates
                      );
                      return (
                        <div className="budget-currency-preview mono">
                          {converted !== null
                            ? `≈ ${formatBRL(converted, hideValues)} na cotação atual`
                            : `Sem cotação ${budgetCurrencyDraft}/${baseCurrency} cadastrada`}
                        </div>
                      );
                    })()}

                    <div className="budget-edit-field">
                      <label>Cor Identificadora</label>
                      <div className="color-swatches-grid">
                        {PRESET_COLORS.map((c) => (
                          <button
                            key={c}
                            type="button"
                            className={`color-swatch-box ${colorDraft === c ? 'selected' : ''}`}
                            style={{ backgroundColor: c }}
                            onClick={() => setColorDraft(c)}
                          />
                        ))}
                      </div>
                    </div>

                    <div className="budget-edit-actions">
                      <div className="budget-edit-actions-group">
                        <button
                          type="button"
                          className="btn-primary"
                          style={{ padding: '6px 14px', fontSize: '11px' }}
                          onClick={() => saveEditing(item.cat)}
                        >
                          <Check size={13} /> Salvar
                        </button>
                        <button
                          type="button"
                          className="btn-secondary"
                          style={{ padding: '6px 12px', fontSize: '11px' }}
                          onClick={cancelEditing}
                        >
                          Cancelar
                        </button>
                      </div>

                      {(hasLimit || !isProtected) && (
                        <div className="budget-edit-actions-group">
                          {hasLimit && (
                            <button
                              type="button"
                              className="btn-secondary"
                              style={{
                                padding: '6px 10px',
                                fontSize: '11px',
                                color: 'var(--text-secondary)',
                              }}
                              onClick={() => removeGoal(item.cat)}
                              title="Remover apenas o teto mensal"
                            >
                              Remover Meta
                            </button>
                          )}
                          {!isProtected && (
                            <button
                              type="button"
                              className="btn-secondary"
                              style={{
                                padding: '6px 10px',
                                fontSize: '11px',
                                color: 'var(--color-coral)',
                              }}
                              onClick={() => setCategoryToDelete(item.cat)}
                              title="Excluir categoria"
                            >
                              <Trash2 size={12} /> Excluir
                            </button>
                          )}
                        </div>
                      )}
                    </div>
                  </div>
                ) : (
                  <div className="budget-cat-body">
                    <div className="budget-cat-spend-hero">
                      <div className="budget-spend-top-row">
                        <span className="budget-spend-label">Gasto no Mês</span>
                        {hasLimit && (
                          <div
                            className="budget-cat-limit-tag clickable"
                            onClick={() => startEditing(item.cat)}
                            title="Clique para ajustar o teto desta categoria"
                          >
                            <span className="sub-tag">TETO:</span>
                            <strong className="mono">
                              {formatMoney(item.rawLimit, item.budgetCurrency, hideValues)}
                            </strong>
                            {item.budgetCurrency !== baseCurrency && (
                              <span className="budget-limit-converted mono">
                                (≈ {formatBRL(item.limit, hideValues)})
                              </span>
                            )}
                          </div>
                        )}
                      </div>

                      <div className="budget-spend-amount mono">
                        {formatBRL(item.totalSpent, hideValues)}
                      </div>
                    </div>

                    {hasLimit && (
                      <div className="budget-margin-block">
                        <div className="budget-margin-header">
                          <span className="budget-margin-label">Margem</span>
                          <strong
                            className={`budget-margin-val mono ${
                              item.remaining < 0 ? 'neg' : 'pos'
                            }`}
                          >
                            {item.remaining < 0
                              ? `-${formatBRL(Math.abs(item.remaining), hideValues)} (${item.pct.toFixed(0)}% do teto)`
                              : `+${formatBRL(item.remaining, hideValues)} livres (${(100 - item.pct).toFixed(0)}% livre)`}
                          </strong>
                        </div>

                        <div className="budget-margin-bar-track">
                          <div
                            className={`budget-margin-bar-fill ${
                              isOver ? 'danger' : isWarn ? 'warn' : 'ok'
                            }`}
                            style={{ width: `${Math.min(100, Math.max(0, item.pct))}%` }}
                          />
                        </div>
                      </div>
                    )}

                    {hasLimit && (
                      <footer className="budget-cat-footer">
                        {isOver ? (
                          <span className="status-note danger">
                            <AlertTriangle size={12} />
                            Teto estourado em {formatBRL(Math.abs(item.remaining), hideValues)}
                          </span>
                        ) : isWarn ? (
                          <span className="status-note warn">
                            <AlertTriangle size={12} />
                            Atenção: restam {formatBRL(item.remaining, hideValues)}
                          </span>
                        ) : (
                          <span className="status-note ok">
                            <CheckCircle2 size={12} />
                            Disponível: {formatBRL(item.remaining, hideValues)}
                          </span>
                        )}
                      </footer>
                    )}
                  </div>
                )}
              </article>
            );
          })}
        </div>
      )}

      <section className="panel-card">
        <header className="panel-header">
          <div>
            <span className="eyebrow">FONTES DE ENTRADA</span>
            <h3>Categorias de Receita ({incomeCategoriesWithStats.length})</h3>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
            <button
              type="button"
              className="btn-secondary budget-new-cat-btn"
              onClick={() => openCreateModal('income')}
            >
              <Plus size={14} /> Nova Receita
            </button>
            <TrendingDown
              size={18}
              style={{ color: 'var(--color-accent)', transform: 'rotate(180deg)' }}
            />
          </div>
        </header>

        <div className="accounts-mini-list">
          {incomeCategoriesWithStats.map((item) => {
            const isEditing = editingIncomeCatId === item.cat.id;
            const isProtected = isProtectedCategory(item.cat);

            return (
              <div key={item.cat.id} className={`account-mini-row ${isEditing ? 'is-editing' : ''}`}>
                <div className="account-mini-info" style={{ minWidth: 0, flex: 1 }}>
                  <span
                    className="cat-color-square"
                    style={{ backgroundColor: isEditing ? incomeColorDraft : item.cat.color }}
                  />
                  {isEditing ? (
                    <div className="income-cat-edit-fields">
                      <input
                        type="text"
                        value={isProtected ? item.cat.name : incomeNameDraft}
                        onChange={(e) => setIncomeNameDraft(e.target.value)}
                        placeholder="Nome da categoria"
                        disabled={isProtected}
                        title={
                          isProtected
                            ? 'O nome da categoria do sistema é fixo ("Outros")'
                            : undefined
                        }
                        style={{
                          padding: '4px 8px',
                          fontSize: '13px',
                          width: '100%',
                          minWidth: 0,
                          ...(isProtected ? { opacity: 0.7, cursor: 'not-allowed' } : {}),
                        }}
                      />
                      <div className="color-swatches-grid">
                        {PRESET_COLORS.map((c) => (
                          <button
                            key={c}
                            type="button"
                            className={`color-swatch-box ${incomeColorDraft === c ? 'selected' : ''}`}
                            style={{ backgroundColor: c, width: 18, height: 18 }}
                            onClick={() => setIncomeColorDraft(c)}
                          />
                        ))}
                      </div>
                    </div>
                  ) : (
                    <div style={{ display: 'flex', flexDirection: 'column', minWidth: 0, flex: 1 }}>
                      <div className="income-cat-title-row">
                        <strong>{item.cat.name}</strong>
                        {isProtected && (
                          <span
                            className="budget-status-chip system-badge"
                            title="Categoria permanente do sistema (não pode ser excluída)"
                            style={{
                              fontSize: '9px',
                              padding: '1px 5px',
                              opacity: 0.75,
                              letterSpacing: '0.05em',
                            }}
                          >
                            SISTEMA
                          </span>
                        )}
                      </div>
                      <span className="sub-label mono" style={{ fontSize: '11px' }}>
                        Recebido: {formatBRL(item.paid, hideValues)}
                        {item.pending > 0 &&
                          ` · A receber: ${formatBRL(item.pending, hideValues)}`}
                      </span>
                    </div>
                  )}
                </div>

                <div className="row-actions">
                  {isEditing ? (
                    <>
                      <button
                        type="button"
                        className="btn-primary"
                        style={{ padding: '4px 8px', fontSize: '11px' }}
                        onClick={() => saveEditingIncome(item.cat)}
                      >
                        <Check size={12} />
                      </button>
                      <button
                        type="button"
                        className="btn-secondary"
                        style={{ padding: '4px 8px', fontSize: '11px' }}
                        onClick={cancelEditingIncome}
                      >
                        <X size={12} />
                      </button>
                    </>
                  ) : (
                    <>
                      <button
                        type="button"
                        className="icon-btn-sm"
                        onClick={() => startEditingIncome(item.cat)}
                        title="Editar categoria de receita"
                      >
                        <Edit3 size={13} />
                      </button>
                      {!isProtected ? (
                        <button
                          type="button"
                          className="icon-btn-sm danger"
                          onClick={() => setCategoryToDelete(item.cat)}
                          title="Excluir categoria de receita"
                        >
                          <Trash2 size={13} />
                        </button>
                      ) : (
                        <span
                          className="icon-btn-sm disabled"
                          style={{
                            opacity: 0.35,
                            cursor: 'not-allowed',
                            display: 'inline-flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                          }}
                          title="Categoria do sistema permanente (não pode ser excluída)"
                        >
                          <ShieldCheck size={13} />
                        </span>
                      )}
                    </>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </section>

      {isCreateModalOpen && (
        <div className="modal-backdrop" onClick={() => setIsCreateModalOpen(false)}>
          <div
            className="modal-card"
            onClick={(e) => e.stopPropagation()}
            role="dialog"
            aria-modal="true"
            aria-labelledby="new-cat-modal-title"
            style={{ maxWidth: 520 }}
          >
            <header className="modal-header">
              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <Target size={18} style={{ color: 'var(--color-accent)' }} />
                <h2 id="new-cat-modal-title">Nova Categoria & Meta</h2>
              </div>
              <button
                type="button"
                className="icon-action-btn"
                onClick={() => setIsCreateModalOpen(false)}
                title="Fechar (Esc)"
              >
                <X size={16} />
              </button>
            </header>

            <form onSubmit={handleCreateCategory}>
              <div
                className="modal-body"
                style={{
                  padding: '22px 24px',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: 16,
                }}
              >
                <div className="form-type-toggle">
                  <button
                    type="button"
                    className={`form-type-tab ${newCatType === 'expense' ? 'active' : ''}`}
                    onClick={() => setNewCatType('expense')}
                  >
                    Despesa
                  </button>
                  <button
                    type="button"
                    className={`form-type-tab ${newCatType === 'income' ? 'active' : ''}`}
                    onClick={() => setNewCatType('income')}
                  >
                    Receita / Entrada
                  </button>
                </div>

                <div className="form-field">
                  <label>Nome da Categoria</label>
                  <input
                    type="text"
                    value={newCatName}
                    onChange={(e) => setNewCatName(e.target.value)}
                    placeholder={
                      newCatType === 'expense'
                        ? 'Ex: Transporte, Pets, Moradia, Assinaturas...'
                        : 'Ex: Salário, Dividendos, Freelance...'
                    }
                    required
                    autoFocus
                  />
                </div>

                {newCatType === 'expense' ? (
                  <>
                    <div className="budget-modal-goal-row">
                      <div className="form-field">
                        <label>Moeda da Meta</label>
                        <select
                          value={newCatCurrency}
                          onChange={(e) => setNewCatCurrency(e.target.value as Currency)}
                        >
                          {availableCurrencies.map((code) => (
                            <option key={code} value={code}>
                              {formatCurrencyOptionLabel(code)}
                            </option>
                          ))}
                        </select>
                      </div>

                      <div className="form-field">
                        <label>
                          Meta Mensal ({getCurrencySymbol(newCatCurrency)}){' '}
                          <span className="label-optional">opcional</span>
                        </label>
                        <input
                          type="number"
                          step="0.01"
                          min="0"
                          className="mono"
                          value={newCatBudget}
                          onChange={(e) => setNewCatBudget(e.target.value)}
                          placeholder="Sem meta (opcional)"
                        />
                      </div>
                    </div>

                    {(() => {
                      const parsed = Math.max(0, parseDecimalInput(newCatBudget) || 0);
                      if (newCatCurrency !== baseCurrency && parsed > 0) {
                        const converted = convertAmount(
                          parsed,
                          newCatCurrency,
                          baseCurrency,
                          effectiveRates
                        );
                        return (
                          <div className="budget-currency-preview mono">
                            {converted !== null
                              ? `≈ ${formatBRL(converted, hideValues)} na cotação atual`
                              : `Sem cotação ${newCatCurrency}/${baseCurrency} cadastrada`}
                          </div>
                        );
                      }
                      if (availableCurrencies.length === 1) {
                        return (
                          <span className="sub-label" style={{ fontSize: 11 }}>
                            Cadastre outras moedas em Configurações › Câmbio para definir metas em
                            moeda estrangeira.
                          </span>
                        );
                      }
                      return null;
                    })()}
                  </>
                ) : (
                  <div className="form-field">
                    <label>Finalidade</label>
                    <input
                      type="text"
                      disabled
                      value="Entradas & Salários (sem teto de gastos)"
                      style={{ opacity: 0.6 }}
                    />
                  </div>
                )}

                <div className="form-field">
                  <label>Cor Identificadora</label>
                  <div className="color-swatches-grid">
                    {PRESET_COLORS.map((color) => (
                      <button
                        type="button"
                        key={color}
                        className={`color-swatch-box ${newCatColor === color ? 'selected' : ''}`}
                        style={{ backgroundColor: color }}
                        onClick={() => setNewCatColor(color)}
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
                  onClick={() => setIsCreateModalOpen(false)}
                >
                  Cancelar
                </button>
                <button type="submit" className="btn-primary">
                  <Plus size={16} /> Criar Categoria
                </button>
              </footer>
            </form>
          </div>
        </div>
      )}

      {categoryToDelete && !isProtectedCategory(categoryToDelete) && (() => {
        const linkedCount = transactions.filter(
          (t) => t.categoryId === categoryToDelete.id
        ).length;
        const isExpense = categoryToDelete.type === 'expense';

        return (
          <div className="modal-backdrop" onClick={() => setCategoryToDelete(null)}>
            <div
              className="modal-card modal-delete-confirm"
              onClick={(e) => e.stopPropagation()}
              role="dialog"
              aria-modal="true"
              aria-labelledby="delete-cat-title"
            >
              <header className="modal-header">
                <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                  <AlertTriangle size={18} style={{ color: 'var(--color-coral)' }} />
                  <h2 id="delete-cat-title">Excluir Categoria</h2>
                </div>
                <button
                  type="button"
                  className="icon-action-btn"
                  onClick={() => setCategoryToDelete(null)}
                  title="Fechar (Esc)"
                >
                  <X size={16} />
                </button>
              </header>

              <div className="modal-body">
                <div className="delete-confirm-box">
                  <div className="delete-confirm-cat-preview">
                    <span
                      className="cat-color-square"
                      style={{ backgroundColor: categoryToDelete.color, width: 14, height: 14 }}
                    />
                    <strong>{categoryToDelete.name}</strong>
                    <span className="eyebrow" style={{ marginLeft: 'auto' }}>
                      {isExpense ? 'DESPESA' : 'RECEITA'}
                    </span>
                  </div>

                  <p className="delete-confirm-desc">
                    Tem certeza de que deseja excluir a categoria{' '}
                    <strong>{categoryToDelete.name}</strong>?
                  </p>

                  <div className="delete-confirm-impact">
                    {linkedCount > 0 ? (
                      <p>
                        ⚠️ Esta categoria possui{' '}
                        <strong>
                          {linkedCount}{' '}
                          {linkedCount === 1
                            ? 'lançamento associado'
                            : 'lançamentos associados'}
                        </strong>
                        . Seus dados não serão apagados: os lançamentos serão transferidos{' '}
                        <strong>obrigatoriamente para a categoria "Outros"</strong> (
                        {isExpense ? 'despesas' : 'receitas'}).
                      </p>
                    ) : (
                      <p>
                        ✓ Nenhum lançamento está vinculado a esta categoria. Ela será removida com
                        segurança.
                      </p>
                    )}
                  </div>
                </div>
              </div>

              <footer className="modal-footer">
                <button
                  type="button"
                  className="btn-secondary"
                  onClick={() => setCategoryToDelete(null)}
                >
                  Cancelar
                </button>
                <button
                  type="button"
                  className="btn-danger"
                  onClick={() => {
                    onDeleteCategory(categoryToDelete.id);
                    if (editingCatId === categoryToDelete.id) setEditingCatId(null);
                    if (editingIncomeCatId === categoryToDelete.id) setEditingIncomeCatId(null);
                    setCategoryToDelete(null);
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
