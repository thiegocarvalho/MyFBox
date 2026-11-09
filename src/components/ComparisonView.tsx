import React, { useEffect, useMemo, useState } from 'react';
import {
  Sparkles,
  TriangleAlert,
  X,
  ArrowUpRight,
  ArrowDownRight,
  Bot,
} from 'lucide-react';
import type { Category, MonthInsight, Transaction } from '../types/finance';
import { formatBRL, formatMonthYearLabel } from '../utils/formatters';
import { buildMonthComparison, type MonthComparison } from '../utils/comparison';
import { InsightAudioPlayer } from './InsightAudioPlayer';

interface ComparisonViewProps {
  selectedYearMonth: string;
  transactions: Transaction[];
  categories: Category[];
  insights: MonthInsight[];
  hideValues: boolean;
  usdToBrlRate?: number;
  onDeleteInsight?: (month: string) => void | Promise<void>;
}

const RANGE_OPTIONS = [6, 12];
const SHORT_MONTHS = ['Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun', 'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez'];

function shortMonth(ym: string): string {
  const [y, m] = ym.split('-');
  return `${SHORT_MONTHS[Number(m) - 1]}/${y.slice(2)}`;
}

const CATEGORY_LIMIT = 4;

/** Maiores categorias de saída do mês (cada informação aparece uma única vez no cartão). */
function expenseCategories(r: MonthComparison) {
  return r.categories.filter((c) => c.type === 'expense').slice(0, CATEGORY_LIMIT);
}

function hiddenCategories(r: MonthComparison): number {
  return Math.max(0, r.categories.filter((c) => c.type === 'expense').length - CATEGORY_LIMIT);
}

/**
 * Só faz sentido mostrar a variação se o mês anterior tinha valor: quando era zero, a
 * variação é igual ao total e só repetiria o número.
 */
function hadPrevious(current: number, delta: number): boolean {
  return Math.abs(current - delta) > 0.004;
}

/** Leitura curta do resultado: quanto das entradas sobra (ou quanto falta). */
function resultNote(r: MonthComparison): string | null {
  if (r.income.total <= 0) return r.expense.total > 0 ? 'Sem entradas no mês' : null;
  const pct = Math.round((r.net / r.income.total) * 100);
  return r.net >= 0 ? `Sobram ${pct}% das entradas` : `Faltam ${Math.abs(pct)}% das entradas`;
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
}) => {
  const [range, setRange] = useState(6);
  const [readingInsightMonth, setReadingInsightMonth] = useState<string | null>(null);
  const [readingSegmentIndex, setReadingSegmentIndex] = useState<number | null>(null);

  const rows = useMemo(
    () => buildMonthComparison(transactions, categories, selectedYearMonth, range, usdToBrlRate),
    [transactions, categories, selectedYearMonth, range, usdToBrlRate]
  );
  const insightByMonth = useMemo(() => new Map(insights.map((i) => [i.month, i])), [insights]);
  const maxValue = Math.max(1, ...rows.flatMap((r) => [r.income.total, r.expense.total]));
  // Cartões só para meses com lançamentos; os vazios viram uma linha compacta
  const recentFirst = [...rows].reverse().filter((r) => r.transactionCount > 0);
  const emptyMonths = rows.filter((r) => r.transactionCount === 0).map((r) => r.month);

  const activeInsight = readingInsightMonth ? insightByMonth.get(readingInsightMonth) : null;
  const activeRow = activeInsight ? rows.find((r) => r.month === activeInsight.month) : null;
  const isActiveOutdated = Boolean(
    activeInsight && activeRow && activeInsight.dataSignature !== activeRow.signature
  );

  const handleOpenInsight = (month: string) => {
    setReadingSegmentIndex(null);
    setReadingInsightMonth(month);
  };

  const handleCloseInsight = () => {
    setReadingSegmentIndex(null);
    setReadingInsightMonth(null);
  };

  useEffect(() => {
    if (!readingInsightMonth) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        handleCloseInsight();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [readingInsightMonth]);

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
                  {r.vsPrevious && hadPrevious(r.income.total, r.vsPrevious.income) && (
                    <Delta value={r.vsPrevious.income} goodWhenUp hideValues={hideValues} />
                  )}
                </div>
                <div>
                  <span>Saídas</span>
                  <strong className="negative">{formatBRL(r.expense.total, hideValues)}</strong>
                  {r.expense.pending > 0 && (
                    <em>{formatBRL(r.expense.pending, hideValues)} a pagar</em>
                  )}
                  {r.vsPrevious && hadPrevious(r.expense.total, r.vsPrevious.expense) && (
                    <Delta value={r.vsPrevious.expense} goodWhenUp={false} hideValues={hideValues} />
                  )}
                </div>
                <div>
                  <span>Resultado</span>
                  <strong className={r.net >= 0 ? '' : 'negative'}>
                    {r.net >= 0 ? '+' : '−'}
                    {formatBRL(Math.abs(r.net), hideValues)}
                  </strong>
                  {resultNote(r) && <em className="cmp-result-note">{resultNote(r)}</em>}
                  {r.vsPrevious && hadPrevious(r.net, r.vsPrevious.net) && (
                    <Delta value={r.vsPrevious.net} goodWhenUp hideValues={hideValues} />
                  )}
                </div>
              </div>

              {expenseCategories(r).length > 0 && (
                <div className="cmp-cats">
                  <span className="eyebrow">SAÍDAS POR CATEGORIA</span>
                  <ul>
                    {expenseCategories(r).map((c) => (
                      <li key={c.categoryId}>
                        <span className="chip-dot" style={{ backgroundColor: c.color }} />
                        <span className="cmp-cat-name">{c.name}</span>
                        <span className="cmp-cat-share">{Math.round(c.share ?? 0)}%</span>
                        <span className="cmp-cat-total">{formatBRL(c.total, hideValues)}</span>
                        <span className="cmp-cat-delta">
                          {c.delta !== null && c.delta !== undefined &&
                            (hadPrevious(c.total, c.delta) ? (
                              <Delta value={c.delta} goodWhenUp={false} hideValues={hideValues} />
                            ) : (
                              <span className="cmp-new">novo</span>
                            ))}
                        </span>
                        <span className="cmp-cat-bar" aria-hidden>
                          <i style={{ width: `${Math.min(100, c.share ?? 0)}%`, backgroundColor: c.color }} />
                        </span>
                      </li>
                    ))}
                  </ul>
                  {hiddenCategories(r) > 0 && (
                    <span className="field-hint">
                      {hiddenCategories(r) === 1
                        ? '+ 1 categoria menor'
                        : `+ ${hiddenCategories(r)} categorias menores`}
                    </span>
                  )}
                </div>
              )}

              {/* Insight da IA: resumo compacto com abertura de modal */}
              {insight && (
                <div className={`cmp-insight-trigger ${outdated ? 'outdated' : ''}`}>
                  <button
                    type="button"
                    className="cmp-insight-trigger-btn"
                    onClick={() => handleOpenInsight(r.month)}
                    title={`Ler análise completa de ${formatMonthYearLabel(r.month)}`}
                  >
                    <div className="cmp-insight-trigger-badge">
                      <Sparkles size={13} />
                      <span>INSIGHT DA IA</span>
                      {outdated && (
                        <span className="cmp-outdated-tag">
                          <TriangleAlert size={10} /> Desatualizado
                        </span>
                      )}
                    </div>
                    <strong className="cmp-insight-trigger-title">{insight.title}</strong>
                    <span className="cmp-insight-trigger-cta">
                      Ler análise completa &rarr;
                    </span>
                  </button>
                </div>
              )}
            </article>
          );
        })}
      </div>

      {/* Modal de Leitura do Insight da IA */}
      {activeInsight && (
        <div
          className="modal-backdrop"
          onClick={(e) => {
            if (e.target === e.currentTarget) handleCloseInsight();
          }}
        >
          <div
            className="modal-card cmp-insight-modal"
            role="dialog"
            aria-modal="true"
            aria-labelledby="cmp-insight-modal-title"
          >
            <header className="modal-header cmp-insight-modal-header">
              <div className="cmp-insight-modal-title-wrap">
                <div className="cmp-insight-modal-eyebrow">
                  <Sparkles size={13} />
                  <span>INSIGHT DA IA</span>
                  <span className="cmp-insight-modal-dot">•</span>
                  <span>{formatMonthYearLabel(activeInsight.month)}</span>
                </div>
                <h2 id="cmp-insight-modal-title">{activeInsight.title}</h2>
              </div>
              <button
                type="button"
                className="icon-btn"
                onClick={handleCloseInsight}
                aria-label="Fechar"
                title="Fechar (Esc)"
              >
                <X size={18} />
              </button>
            </header>

            <div className="modal-body cmp-insight-modal-body">
              {/* Player de áudio Web Speech API */}
              <InsightAudioPlayer
                title={activeInsight.title}
                paragraphs={activeInsight.body.split(/\n\s*\n/).filter(Boolean)}
                highlights={activeInsight.highlights}
                monthLabel={formatMonthYearLabel(activeInsight.month)}
                currentReadingIndex={readingSegmentIndex ?? undefined}
                onReadingIndexChange={setReadingSegmentIndex}
              />

              {isActiveOutdated && (
                <div className="cmp-modal-outdated-alert">
                  <TriangleAlert size={16} />
                  <div>
                    <strong>Lançamentos do mês foram alterados</strong>
                    <p>
                      Esta análise foi elaborada com dados anteriores de {formatMonthYearLabel(activeInsight.month)}. Os totais ou percentuais podem não refletir o estado atual do cofre.
                    </p>
                  </div>
                </div>
              )}

              <div className="cmp-modal-paragraphs">
                {activeInsight.body
                  .split(/\n\s*\n/)
                  .filter(Boolean)
                  .map((para, i) => {
                    const isReading = readingSegmentIndex === i + 1;
                    return (
                      <p key={i} className={isReading ? 'cmp-para-reading' : ''}>
                        {para}
                      </p>
                    );
                  })}
              </div>

              {activeInsight.highlights && activeInsight.highlights.length > 0 && (
                <div
                  className={`cmp-modal-highlights ${
                    readingSegmentIndex ===
                    activeInsight.body.split(/\n\s*\n/).filter(Boolean).length + 1
                      ? 'cmp-para-reading'
                      : ''
                  }`}
                >
                  <span className="eyebrow">PONTOS DE DESTAQUE</span>
                  <ul>
                    {activeInsight.highlights.map((h, i) => (
                      <li key={i}>{h}</li>
                    ))}
                  </ul>
                </div>
              )}

              <div className="cmp-modal-meta">
                <Bot size={14} />
                <span>
                  Análise gerada pelo assistente local via MCP · Atualizada em {formatDateTime(activeInsight.updatedAt || activeInsight.createdAt)}
                </span>
              </div>
            </div>

            <footer className="modal-footer cmp-insight-modal-footer">
              <button
                type="button"
                className="btn-primary"
                onClick={handleCloseInsight}
              >
                Fechar
              </button>
            </footer>
          </div>
        </div>
      )}
    </div>
  );
};
