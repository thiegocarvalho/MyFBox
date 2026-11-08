import React, { useMemo, useState } from 'react';
import {
  Target,
  Plus,
  Check,
  AlertTriangle,
  CheckCircle2,
  Trash2,
  Edit3,
  X,
} from 'lucide-react';
import type { Category, Transaction, TransactionType } from '../types/finance';
import { formatBRL, formatMonthYearLabel } from '../utils/formatters';
import { parseDecimalInput, txAmountInBrl } from '../utils/money';

interface BudgetsViewProps {
  selectedYearMonth: string;
  categories: Category[];
  transactions: Transaction[];
  hideValues: boolean;
  usdToBrlRate?: number;
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

export const BudgetsView: React.FC<BudgetsViewProps> = ({
  selectedYearMonth,
  categories,
  transactions,
  hideValues,
  usdToBrlRate,
  onUpdateCategory,
  onAddCategory,
  onDeleteCategory,
}) => {
  const [editingCatId, setEditingCatId] = useState<string | null>(null);
  const [budgetDraft, setBudgetDraft] = useState<string>('');
  const [nameDraft, setNameDraft] = useState<string>('');

  // Form para nova categoria
  const [newCatName, setNewCatName] = useState('');
  const [newCatType, setNewCatType] = useState<TransactionType>('expense');
  const [newCatBudget, setNewCatBudget] = useState('500');
  const [newCatColor, setNewCatColor] = useState(PRESET_COLORS[0]);

  const monthTransactions = useMemo(
    () => transactions.filter((t) => t.date.startsWith(selectedYearMonth)),
    [transactions, selectedYearMonth]
  );

  const expenseCategoriesWithStats = useMemo(() => {
    const expCats = categories.filter((c) => c.type === 'expense');
    return expCats.map((cat) => {
      let paid = 0;
      let pending = 0;
      let count = 0;
      for (const tx of monthTransactions) {
        if (tx.categoryId === cat.id && tx.type === 'expense') {
          // Orçamentos são em R$: gastos em US$ entram convertidos
          const valueBrl = txAmountInBrl(tx, usdToBrlRate);
          if (tx.status === 'paid') paid += valueBrl;
          else pending += valueBrl;
          count++;
        }
      }
      const totalSpent = paid + pending;
      const limit = cat.monthlyBudget || 0;
      const remaining = limit - totalSpent;
      const pct = limit > 0 ? (totalSpent / limit) * 100 : 0;

      return {
        cat,
        paid,
        pending,
        totalSpent,
        limit,
        remaining,
        pct,
        count,
      };
    });
  }, [categories, monthTransactions, usdToBrlRate]);

  const incomeCategories = useMemo(
    () => categories.filter((c) => c.type === 'income'),
    [categories]
  );

  const totals = useMemo(() => {
    // Só categorias com meta entram no comparativo planejado vs. gasto
    const withGoal = expenseCategoriesWithStats.filter((i) => i.limit > 0);
    const totalBudget = withGoal.reduce((acc, i) => acc + i.limit, 0);
    const totalSpent = withGoal.reduce((acc, i) => acc + i.totalSpent, 0);
    const overCount = expenseCategoriesWithStats.filter(
      (i) => i.limit > 0 && i.totalSpent > i.limit
    ).length;
    return {
      totalBudget,
      totalSpent,
      remaining: totalBudget - totalSpent,
      pct: totalBudget > 0 ? (totalSpent / totalBudget) * 100 : 0,
      overCount,
    };
  }, [expenseCategoriesWithStats]);

  const startEditing = (cat: Category) => {
    setEditingCatId(cat.id);
    setNameDraft(cat.name);
    setBudgetDraft(String(cat.monthlyBudget || 0));
  };

  const saveEditing = (cat: Category) => {
    const parsedBudget = Math.max(0, parseDecimalInput(budgetDraft) || 0);
    onUpdateCategory({
      ...cat,
      name: nameDraft.trim() || cat.name,
      monthlyBudget: cat.type === 'expense' && parsedBudget > 0 ? parsedBudget : undefined,
    });
    setEditingCatId(null);
  };

  // Remove só a meta (teto); a categoria continua existindo para os lançamentos
  const removeGoal = (cat: Category) => {
    onUpdateCategory({ ...cat, monthlyBudget: undefined });
    if (editingCatId === cat.id) setEditingCatId(null);
  };

  const handleCreateCategory = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newCatName.trim()) return;
    const parsedBudget = Math.max(0, parseDecimalInput(newCatBudget) || 0);
    const created: Category = {
      id: `cat_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
      name: newCatName.trim(),
      type: newCatType,
      color: newCatColor,
      icon: 'Tag',
      monthlyBudget: newCatType === 'expense' ? parsedBudget : undefined,
    };
    onAddCategory(created);
    setNewCatName('');
    setNewCatBudget('500');
  };

  return (
    <div className="budgets-view-stack">
      {/* Resumo Global das Metas do Mês (só quando há alguma meta) */}
      {totals.totalBudget > 0 && (
      <section className="panel-card budget-overview-banner">
        <div className="budget-overview-top">
          <div>
            <span className="eyebrow">
              TETO DE GASTOS • {formatMonthYearLabel(selectedYearMonth).toUpperCase()}
            </span>
            <h3>Orçamento Planejado vs. Despesas Comprometidas</h3>
          </div>
          <div className="budget-overview-kpis mono">
            <div>
              <span>Orçamento Total:</span>
              <strong>{formatBRL(totals.totalBudget, hideValues)}</strong>
            </div>
            <div>
              <span>Gasto no Mês:</span>
              <strong className={totals.totalSpent > totals.totalBudget ? 'negative' : ''}>
                {formatBRL(totals.totalSpent, hideValues)} ({totals.pct.toFixed(0)}%)
              </strong>
            </div>
            <div>
              <span>Margem Restante:</span>
              <strong className={totals.remaining >= 0 ? 'positive' : 'negative'}>
                {formatBRL(totals.remaining, hideValues)}
              </strong>
            </div>
          </div>
        </div>

        <div className="horizon-bar-track">
          <div
            className="horizon-segment"
            style={{
              width: `${Math.min(100, totals.pct)}%`,
              backgroundColor:
                totals.pct > 100 ? '#F43F5E' : totals.pct >= 80 ? '#F59E0B' : 'var(--color-accent)',
            }}
          />
        </div>
      </section>
      )}

      {/* Grid de Metas: só categorias com meta, com gasto no mês ou em edição */}
      {(() => {
        const visibleIds = new Set(
          expenseCategoriesWithStats
            .filter((i) => i.limit > 0 || i.totalSpent > 0 || editingCatId === i.cat.id)
            .map((i) => i.cat.id)
        );
        const withoutGoal = expenseCategoriesWithStats.filter((i) => !visibleIds.has(i.cat.id));
        return (
          <>
            {visibleIds.size === 0 && (
              <section className="panel-card budgets-empty">
                <Target size={20} />
                <div>
                  <strong>Nenhuma meta definida</strong>
                  <span>
                    {withoutGoal.length > 0
                      ? 'Escolha uma categoria abaixo para definir um teto mensal de gastos.'
                      : 'Crie uma categoria de despesa abaixo e defina um teto mensal.'}
                  </span>
                </div>
              </section>
            )}

            {withoutGoal.length > 0 && (
              <section className="panel-card budgets-no-goal">
                <span className="eyebrow">SEM META</span>
                <div className="chip-grid">
                  {withoutGoal.map((i) => (
                    <button
                      key={i.cat.id}
                      type="button"
                      className="chip chip-ghost"
                      onClick={() => startEditing(i.cat)}
                      title="Definir teto mensal para esta categoria"
                    >
                      <span className="chip-dot" style={{ backgroundColor: i.cat.color }} />
                      {i.cat.name}
                      <Plus size={13} />
                    </button>
                  ))}
                </div>
              </section>
            )}

      <div className="budgets-cards-grid">
        {expenseCategoriesWithStats.filter((i) => visibleIds.has(i.cat.id)).map((item) => {
          const isEditing = editingCatId === item.cat.id;
          const isOver = item.limit > 0 && item.totalSpent > item.limit;
          const isWarn = item.limit > 0 && !isOver && item.pct >= 80;

          return (
            <article
              key={item.cat.id}
              className={`panel-card budget-cat-card ${
                isOver ? 'border-danger' : isWarn ? 'border-warn' : ''
              }`}
            >
              <header className="budget-cat-header">
                <div className="budget-cat-title">
                  <span
                    className="cat-color-dot lg"
                    style={{ backgroundColor: item.cat.color }}
                  />
                  {isEditing ? (
                    <input
                      type="text"
                      className="inline-edit-input"
                      value={nameDraft}
                      onChange={(e) => setNameDraft(e.target.value)}
                    />
                  ) : (
                    <strong>{item.cat.name}</strong>
                  )}
                </div>

                <div className="row-actions">
                  {isEditing ? (
                    <>
                      <button
                        type="button"
                        className="btn-settle-xs"
                        onClick={() => saveEditing(item.cat)}
                      >
                        <Check size={13} /> Salvar
                      </button>
                      <button
                        type="button"
                        className="icon-btn-sm danger"
                        onClick={() => onDeleteCategory(item.cat.id)}
                        title="Excluir a categoria (os lançamentos vão para outra categoria de despesa)"
                      >
                        <Trash2 size={14} />
                      </button>
                    </>
                  ) : (
                    <>
                      <button
                        type="button"
                        className="icon-btn-sm"
                        onClick={() => startEditing(item.cat)}
                        title="Editar meta mensal ou nome"
                      >
                        <Edit3 size={14} />
                      </button>
                      {item.limit > 0 && (
                        <button
                          type="button"
                          className="icon-btn-sm danger"
                          onClick={() => removeGoal(item.cat)}
                          title="Remover meta (a categoria continua existindo)"
                        >
                          <X size={14} />
                        </button>
                      )}
                    </>
                  )}
                </div>
              </header>

              <div className="budget-cat-numbers mono">
                <div>
                  <span className="sub-label">Utilizado ({item.count} lanç.)</span>
                  <strong className="spent-val">
                    {formatBRL(item.totalSpent, hideValues)}
                  </strong>
                  {item.pending > 0 && (
                    <span className="sub-label">
                      Pago {formatBRL(item.paid, hideValues)} · a vencer{' '}
                      {formatBRL(item.pending, hideValues)}
                    </span>
                  )}
                </div>

                <div className="align-right">
                  <span className="sub-label">Teto Mensal (Meta)</span>
                  {isEditing ? (
                    <input
                      type="number"
                      step="10"
                      min="0"
                      className="inline-budget-input mono"
                      value={budgetDraft}
                      onChange={(e) => setBudgetDraft(e.target.value)}
                      autoFocus
                    />
                  ) : (
                    <strong
                      className="limit-val clickable"
                      onClick={() => startEditing(item.cat)}
                      title="Clique para ajustar o teto mensal"
                    >
                      {item.limit > 0 ? formatBRL(item.limit, hideValues) : 'Sem limite'}
                    </strong>
                  )}
                </div>
              </div>

              <div className="cat-progress-track lg">
                <div
                  className="cat-progress-fill"
                  style={{
                    width: `${Math.min(100, item.pct)}%`,
                    backgroundColor: isOver
                      ? '#F43F5E'
                      : isWarn
                      ? '#F59E0B'
                      : item.cat.color,
                  }}
                />
              </div>

              <footer className="budget-cat-footer">
                {item.limit === 0 ? (
                  <span className="status-note muted">
                    Clique no lápis para definir uma meta mensal
                  </span>
                ) : isOver ? (
                  <span className="status-note danger">
                    <AlertTriangle size={13} /> Excedido em{' '}
                    <strong className="mono">
                      {formatBRL(Math.abs(item.remaining), hideValues)}
                    </strong>{' '}
                    ({item.pct.toFixed(0)}%)
                  </span>
                ) : isWarn ? (
                  <span className="status-note warn">
                    <AlertTriangle size={13} /> Atenção: restam{' '}
                    <strong className="mono">{formatBRL(item.remaining, hideValues)}</strong> (
                    {item.pct.toFixed(0)}%)
                  </span>
                ) : (
                  <span className="status-note ok">
                    <CheckCircle2 size={13} /> Disponível:{' '}
                    <strong className="mono">{formatBRL(item.remaining, hideValues)}</strong> (
                    {item.pct.toFixed(0)}%)
                  </span>
                )}
              </footer>
            </article>
          );
        })}
      </div>
          </>
        );
      })()}

      {/* Seção Inferior: Nova Categoria + Categorias de Receita */}
      <div className="dashboard-bottom-grid">
        <section className="panel-card">
          <header className="panel-header">
            <div>
              <span className="eyebrow">PERSONALIZAÇÃO</span>
              <h3>Nova Categoria & Meta</h3>
            </div>
            <Target size={18} style={{ color: 'var(--color-accent)' }} />
          </header>

          <form onSubmit={handleCreateCategory} className="compact-stack-form">
            <div className="form-grid-2">
              <div className="form-field">
                <label>Nome da Categoria</label>
                <input
                  type="text"
                  value={newCatName}
                  onChange={(e) => setNewCatName(e.target.value)}
                  placeholder="Ex: Educação, Pets, Impostos..."
                  required
                />
              </div>

              <div className="form-field">
                <label>Tipo</label>
                <select
                  value={newCatType}
                  onChange={(e) => setNewCatType(e.target.value as TransactionType)}
                >
                  <option value="expense">Despesa (com Meta Mensal)</option>
                  <option value="income">Receita / Entrada</option>
                </select>
              </div>
            </div>

            <div className="form-grid-2">
              {newCatType === 'expense' && (
                <div className="form-field">
                  <label>Meta Mensal (R$)</label>
                  <input
                    type="number"
                    step="10"
                    min="0"
                    className="mono"
                    value={newCatBudget}
                    onChange={(e) => setNewCatBudget(e.target.value)}
                  />
                </div>
              )}

              <div className="form-field">
                <label>Cor Identificadora</label>
                <div className="color-swatches-row">
                  {PRESET_COLORS.map((color) => (
                    <button
                      type="button"
                      key={color}
                      className={`color-swatch-btn ${newCatColor === color ? 'selected' : ''}`}
                      style={{ backgroundColor: color }}
                      onClick={() => setNewCatColor(color)}
                    />
                  ))}
                </div>
              </div>
            </div>

            <button type="submit" className="btn-primary">
              <Plus size={16} /> Criar Categoria
            </button>
          </form>
        </section>

        <section className="panel-card">
          <header className="panel-header">
            <div>
              <span className="eyebrow">FONTES DE ENTRADA</span>
              <h3>Categorias de Receita ({incomeCategories.length})</h3>
            </div>
          </header>

          <div className="accounts-mini-list">
            {incomeCategories.map((cat) => (
              <div key={cat.id} className="account-mini-row">
                <div className="account-mini-info">
                  <span
                    className="cat-color-dot lg"
                    style={{ backgroundColor: cat.color }}
                  />
                  <strong>{cat.name}</strong>
                </div>
                <button
                  type="button"
                  className="icon-btn-sm danger"
                  onClick={() => onDeleteCategory(cat.id)}
                  title="Excluir categoria"
                >
                  <Trash2 size={14} />
                </button>
              </div>
            ))}
          </div>
        </section>
      </div>
    </div>
  );
};
