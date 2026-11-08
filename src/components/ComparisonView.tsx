import React, { useMemo, useState } from 'react';
import { Sparkles, TriangleAlert, X, ArrowUpRight, ArrowDownRight, Bot } from 'lucide-react';
import type { Category, MonthInsight, Transaction } from '../types/finance';
import { formatBRL, formatMonthYearLabel } from '../utils/formatters';
import { buildMonthComparison, type MonthComparison } from '../utils/comparison';

interface ComparisonViewProps {
  selectedYearMonth: string;
  transactions: Transaction[];
  categories: Category[];
  insights: MonthInsight[];
  hideValues: boolean;
  usdToBrlRate?: number;
  onDeleteInsight: (month: string) => void;
}

const RANGE_OPTIONS = [6, 12];
const SHORT_MONTHS = ['Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun', 'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez'];

function shortMonth(ym: string): string {
  const [y, m] = ym.split('-');
  return `${SHORT_MONTHS[Number(m) - 1]}/${y.slice(2)}`;
}

function formatDateTime(iso: string): string {
  const d = new Date(iso);
  return Number.isNaN(d.getTime())
    ? ''
    : d.toLocaleString('pt-BR', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' });
}

/** Variação com sinal e seta; `goodWhenUp` define a cor (ex.: saídas subindo é ruim). */
const Delta: React.FC<{ value: number; goodWhenUp: boolean; hideValues: boolean; suffix?: string }> = ({
  value,
  goodWhenUp,
  hideValues,
  suffix,
}) => {
  if (value === 0) return <span className="cmp-delta neutral">= {suffix ?? 'igual'}</span>;
  const up = value > 0;
  const good = up === goodWhenUp;
  return (
    <span className={`cmp-delta ${good ? 'good' : 'bad'}`}>
      {up ? <ArrowUpRight size={13} /> : <ArrowDownRight size={13} />}
      {up ? '+' : '−'}
      {formatBRL(Math.abs(value), hideValues)}
      {suffix ? ` ${suffix}` : ''}
    </span>
  );
};

export const ComparisonView: React.FC<ComparisonViewProps> = ({
  selectedYearMonth,
  transactions,
  categories,
  insights,
  hideValues,
  usdToBrlRate,
  onDeleteInsight,
}) => {
  const [range, setRange] = useState(6);

  const rows = useMemo(
    () => buildMonthComparison(transactions, categories, selectedYearMonth, range, usdToBrlRate),
    [transactions, categories, selectedYearMonth, range, usdToBrlRate]
  );
  const insightByMonth = useMemo(() => new Map(insights.map((i) => [i.month, i])), [insights]);
  const maxValue = Math.max(1, ...rows.flatMap((r) => [r.income.total, r.expense.total]));
  // Cartões só para meses com lançamentos; os vazios viram uma linha compacta
  const recentFirst = [...rows].reverse().filter((r) => r.transactionCount > 0);
  const emptyMonths = rows.filter((r) => r.transactionCount === 0).map((r) => r.month);

  return (
    <div className="cmp-stack">
      {/* Visão geral do período */}
      <section className="panel-card">
        <header className="panel-header">
          <div>
            <span className="eyebrow">COMPARATIVOS</span>
            <h3>Mês a mês até {formatMonthYearLabel(selectedYearMonth)}</h3>
          </div>
          <div className="seg-group cmp-range" role="radiogroup" aria-label="Período">
            {RANGE_OPTIONS.map((n) => (
              <button
                key={n}
                type="button"
                role="radio"
                aria-checked={range === n}
                className={`seg-btn ${range === n ? 'active' : ''}`}
                onClick={() => setRange(n)}
              >
                {n} meses
              </button>
            ))}
          </div>
        </header>

        <div className="cmp-chart" role="img" aria-label="Entradas e saídas por mês">
          {rows.map((r) => (
            <div key={r.month} className={`cmp-chart-col ${r.month === selectedYearMonth ? 'current' : ''}`}>
              <span className={`cmp-chart-net ${r.net >= 0 ? 'pos' : 'neg'}`}>
                {r.transactionCount === 0
                  ? '—'
                  : hideValues
                  ? '•••'
                  : `${r.net >= 0 ? '+' : '−'}${(Math.abs(r.net) / 1000).toFixed(1)}k`}
              </span>
              <div className="cmp-chart-bars">
                <span
                  className="cmp-bar income"
                  style={{ height: `${(r.income.total / maxValue) * 100}%` }}
                  title={`Entradas: ${formatBRL(r.income.total)}`}
                />
                <span
                  className="cmp-bar expense"
                  style={{ height: `${(r.expense.total / maxValue) * 100}%` }}
                  title={`Saídas: ${formatBRL(r.expense.total)}`}
                />
              </div>
              <span className="cmp-chart-label">{shortMonth(r.month)}</span>
            </div>
          ))}
        </div>
        <div className="cmp-legend">
          <span><i className="income" /> Entradas</span>
          <span><i className="expense" /> Saídas</span>
          <span className="cmp-legend-note">Totais do mês, pagos e pendentes</span>
        </div>
      </section>

      {emptyMonths.length > 0 && (
        <p className="cmp-empty-months">
          Sem lançamentos em {emptyMonths.map((m) => shortMonth(m)).join(', ')}.
        </p>
      )}

      {/* Um cartão por mês com dados, do mais recente ao mais antigo */}
      <div className="cmp-months">
        {recentFirst.map((r: MonthComparison, idx) => {
          const insight = insightByMonth.get(r.month);
          const outdated = insight && insight.dataSignature !== r.signature;
          return (
            <article
              key={r.month}
              className={`panel-card cmp-month ${r.month === selectedYearMonth ? 'current' : ''}`}
            >
              <header className="cmp-month-header">
                <span className="bk-num">.{String(idx + 1).padStart(2, '0')}</span>
                <div>
                  <h3>{formatMonthYearLabel(r.month)}</h3>
                  <span className="field-hint">
                    {`${r.transactionCount} lançamento${r.transactionCount === 1 ? '' : 's'}`}
                  </span>
                </div>
              </header>

              <div className="cmp-figures">
                <div>
                  <span>Entradas</span>
                  <strong className="positive">{formatBRL(r.income.total, hideValues)}</strong>
                  {r.income.pending > 0 && (
                    <em>{formatBRL(r.income.pending, hideValues)} a receber</em>
                  )}
                  {r.vsPrevious && (
                    <Delta value={r.vsPrevious.income} goodWhenUp hideValues={hideValues} />
                  )}
                </div>
                <div>
                  <span>Saídas</span>
                  <strong className="negative">{formatBRL(r.expense.total, hideValues)}</strong>
                  {r.expense.pending > 0 && (
                    <em>{formatBRL(r.expense.pending, hideValues)} a pagar</em>
                  )}
                  {r.vsPrevious && (
                    <Delta value={r.vsPrevious.expense} goodWhenUp={false} hideValues={hideValues} />
                  )}
                </div>
                <div>
                  <span>Resultado</span>
                  <strong className={r.net >= 0 ? '' : 'negative'}>
                    {r.net >= 0 ? '+' : '−'}
                    {formatBRL(Math.abs(r.net), hideValues)}
                  </strong>
                  {r.vsPrevious && <Delta value={r.vsPrevious.net} goodWhenUp hideValues={hideValues} />}
                </div>
              </div>

              {r.topChanges.length > 0 && (
                <div className="cmp-changes">
                  <span className="eyebrow">O QUE MAIS MUDOU NAS SAÍDAS</span>
                  <ul>
                    {r.topChanges.map((c) => (
                      <li key={c.categoryId}>
                        <span className="chip-dot" style={{ backgroundColor: c.color }} />
                        <span className="cmp-change-name">{c.name}</span>
                        <Delta value={c.delta} goodWhenUp={false} hideValues={hideValues} />
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              {/* Insight do assistente */}
              {insight ? (
                <div className={`cmp-insight ${outdated ? 'outdated' : ''}`}>
                  <div className="cmp-insight-head">
                    <Sparkles size={15} />
                    <strong>{insight.title}</strong>
                    <button
                      type="button"
                      className="cmp-insight-delete"
                      onClick={() => onDeleteInsight(insight.month)}
                      aria-label={`Remover o insight de ${formatMonthYearLabel(insight.month)}`}
                      title="Remover insight"
                    >
                      <X size={14} />
                    </button>
                  </div>
                  {insight.body.split(/\n\s*\n/).map((para, i) => (
                    <p key={i}>{para}</p>
                  ))}
                  {insight.highlights && insight.highlights.length > 0 && (
                    <ul className="cmp-insight-highlights">
                      {insight.highlights.map((h, i) => (
                        <li key={i}>{h}</li>
                      ))}
                    </ul>
                  )}
                  <footer>
                    <Bot size={13} /> Escrito pelo assistente · atualizado em {formatDateTime(insight.updatedAt)}
                    {outdated && (
                      <span className="cmp-outdated">
                        <TriangleAlert size={13} /> Os lançamentos do mês mudaram depois deste insight
                      </span>
                    )}
                  </footer>
                </div>
              ) : (
                <div className="cmp-insight empty">
                  <Sparkles size={15} />
                  <span>
                    Sem insight. Peça ao assistente (MCP):{' '}
                    <q>gere o insight de {formatMonthYearLabel(r.month).toLowerCase()}</q>.
                  </span>
                </div>
              )}
            </article>
          );
        })}
      </div>
    </div>
  );
};
