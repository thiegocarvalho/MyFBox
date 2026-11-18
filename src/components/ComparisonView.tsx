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
import type { ExchangeRateSource } from '../services/currencyService';
import { InsightAudioPlayer } from './InsightAudioPlayer';
import { useI18n } from '../i18n/useI18n';
import type { I18nContextValue } from '../i18n/context';

interface ComparisonViewProps {
  selectedYearMonth: string;
  transactions: Transaction[];
  categories: Category[];
  insights: MonthInsight[];
  hideValues: boolean;
  usdToBrlRate?: number;
  rateSource?: ExchangeRateSource;
}

const RANGE_OPTIONS = [6, 12];
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

function shortMonth(ym: string, t: I18nContextValue['t']): string {
  const [y, m] = ym.split('-');
  return `${t(MONTH_KEYS[Number(m) - 1])}/${y.slice(2)}`;
}

const CATEGORY_LIMIT = 4;

function expenseCategories(r: MonthComparison) {
  return r.categories.filter((c) => c.type === 'expense').slice(0, CATEGORY_LIMIT);
}

function hiddenCategories(r: MonthComparison): number {
  return Math.max(0, r.categories.filter((c) => c.type === 'expense').length - CATEGORY_LIMIT);
}

function hadPrevious(current: number, delta: number): boolean {
  return Math.abs(current - delta) > 0.004;
}

function resultNote(r: MonthComparison, t: I18nContextValue['t']): string | null {
  if (r.income.total <= 0) {
    return r.expense.total > 0 ? t('analytics.comparison.noIncomeInMonth') : null;
  }
  const pct = Math.round((r.net / r.income.total) * 100);
  return r.net >= 0
    ? t('analytics.comparison.surplusPct', { pct })
    : t('analytics.comparison.deficitPct', { pct: Math.abs(pct) });
}

function formatDateTime(iso: string, language: string): string {
  const d = new Date(iso);
  return Number.isNaN(d.getTime())
    ? ''
    : d.toLocaleString(language, {
        day: '2-digit',
        month: '2-digit',
        hour: '2-digit',
        minute: '2-digit',
      });
}

const Delta: React.FC<{
  value: number;
  goodWhenUp: boolean;
  hideValues: boolean;
  suffix?: string;
}> = ({ value, goodWhenUp, hideValues, suffix }) => {
  const { t } = useI18n();
  if (value === 0) {
    return (
      <span className="cmp-delta neutral">
        = {suffix ?? t('analytics.comparison.equal')}
      </span>
    );
  }
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
  rateSource,
}) => {
  const { t, language } = useI18n();
  const effectiveRates = rateSource ?? usdToBrlRate;
  const [range, setRange] = useState(6);
  const [readingInsightMonth, setReadingInsightMonth] = useState<string | null>(null);
  const [readingSegmentIndex, setReadingSegmentIndex] = useState<number | null>(null);

  const rows = useMemo(
    () => buildMonthComparison(transactions, categories, selectedYearMonth, range, effectiveRates),
    [transactions, categories, selectedYearMonth, range, effectiveRates]
  );
  const insightByMonth = useMemo(() => new Map(insights.map((i) => [i.month, i])), [insights]);
  const maxValue = Math.max(1, ...rows.flatMap((r) => [r.income.total, r.expense.total]));
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
      <section className="panel-card">
        <header className="panel-header">
          <div>
            <span className="eyebrow">{t('analytics.comparison.eyebrow')}</span>
            <h3>
              {t('analytics.comparison.title', {
                month: formatMonthYearLabel(selectedYearMonth, language),
              })}
            </h3>
          </div>
          <div
            className="seg-group cmp-range"
            role="radiogroup"
            aria-label={t('analytics.comparison.rangeAria')}
          >
            {RANGE_OPTIONS.map((n) => (
              <button
                key={n}
                type="button"
                role="radio"
                aria-checked={range === n}
                className={`seg-btn ${range === n ? 'active' : ''}`}
                onClick={() => setRange(n)}
              >
                {t('analytics.comparison.rangeMonths', { count: n })}
              </button>
            ))}
          </div>
        </header>

        <div className="cmp-chart" role="img" aria-label={t('analytics.comparison.chartAria')}>
          {rows.map((r) => (
            <div
              key={r.month}
              className={`cmp-chart-col ${r.month === selectedYearMonth ? 'current' : ''}`}
            >
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
                  title={t('analytics.comparison.incomeTooltip', {
                    amount: formatBRL(r.income.total),
                  })}
                />
                <span
                  className="cmp-bar expense"
                  style={{ height: `${(r.expense.total / maxValue) * 100}%` }}
                  title={t('analytics.comparison.expenseTooltip', {
                    amount: formatBRL(r.expense.total),
                  })}
                />
              </div>
              <span className="cmp-chart-label">{shortMonth(r.month, t)}</span>
            </div>
          ))}
        </div>
        <div className="cmp-legend">
          <span>
            <i className="income" /> {t('analytics.comparison.income')}
          </span>
          <span>
            <i className="expense" /> {t('analytics.comparison.expense')}
          </span>
          <span className="cmp-legend-note">{t('analytics.comparison.legendNote')}</span>
        </div>
      </section>

      {emptyMonths.length > 0 && (
        <p className="cmp-empty-months">
          {t('analytics.comparison.emptyMonths', {
            months: emptyMonths.map((m) => shortMonth(m, t)).join(', '),
          })}
        </p>
      )}

      <div className="cmp-months">
        {recentFirst.map((r: MonthComparison, idx) => {
          const insight = insightByMonth.get(r.month);
          const outdated = insight && insight.dataSignature !== r.signature;
          const note = resultNote(r, t);
          return (
            <article
              key={r.month}
              className={`panel-card cmp-month ${r.month === selectedYearMonth ? 'current' : ''}`}
            >
              <header className="cmp-month-header">
                <span className="bk-num">.{String(idx + 1).padStart(2, '0')}</span>
                <div>
                  <h3>{formatMonthYearLabel(r.month, language)}</h3>
                  <span className="field-hint">
                    {r.transactionCount === 1
                      ? t('analytics.comparison.transactionCountOne', {
                          count: r.transactionCount,
                        })
                      : t('analytics.comparison.transactionCountMany', {
                          count: r.transactionCount,
                        })}
                  </span>
                </div>
              </header>

              <div className="cmp-figures">
                <div>
                  <span>{t('analytics.comparison.income')}</span>
                  <strong className="positive">{formatBRL(r.income.total, hideValues)}</strong>
                  {r.income.pending > 0 && (
                    <em>
                      {t('analytics.comparison.toReceive', {
                        amount: formatBRL(r.income.pending, hideValues),
                      })}
                    </em>
                  )}
                  {r.vsPrevious && hadPrevious(r.income.total, r.vsPrevious.income) && (
                    <Delta value={r.vsPrevious.income} goodWhenUp hideValues={hideValues} />
                  )}
                </div>
                <div>
                  <span>{t('analytics.comparison.expense')}</span>
                  <strong className="negative">{formatBRL(r.expense.total, hideValues)}</strong>
                  {r.expense.pending > 0 && (
                    <em>
                      {t('analytics.comparison.toPay', {
                        amount: formatBRL(r.expense.pending, hideValues),
                      })}
                    </em>
                  )}
                  {r.vsPrevious && hadPrevious(r.expense.total, r.vsPrevious.expense) && (
                    <Delta value={r.vsPrevious.expense} goodWhenUp={false} hideValues={hideValues} />
                  )}
                </div>
                <div>
                  <span>{t('analytics.comparison.result')}</span>
                  <strong className={r.net >= 0 ? '' : 'negative'}>
                    {r.net >= 0 ? '+' : '−'}
                    {formatBRL(Math.abs(r.net), hideValues)}
                  </strong>
                  {note && <em className="cmp-result-note">{note}</em>}
                  {r.vsPrevious && hadPrevious(r.net, r.vsPrevious.net) && (
                    <Delta value={r.vsPrevious.net} goodWhenUp hideValues={hideValues} />
                  )}
                </div>
              </div>

              {expenseCategories(r).length > 0 && (
                <div className="cmp-cats">
                  <span className="eyebrow">
                    {t('analytics.comparison.expensesByCategoryEyebrow')}
                  </span>
                  <ul>
                    {expenseCategories(r).map((c) => (
                      <li key={c.categoryId}>
                        <span className="chip-dot" style={{ backgroundColor: c.color }} />
                        <span className="cmp-cat-name">{c.name}</span>
                        <span className="cmp-cat-share">{Math.round(c.share ?? 0)}%</span>
                        <span className="cmp-cat-total">{formatBRL(c.total, hideValues)}</span>
                        <span className="cmp-cat-delta">
                          {c.delta !== null &&
                            c.delta !== undefined &&
                            (hadPrevious(c.total, c.delta) ? (
                              <Delta value={c.delta} goodWhenUp={false} hideValues={hideValues} />
                            ) : (
                              <span className="cmp-new">
                                {t('analytics.comparison.newCategory')}
                              </span>
                            ))}
                        </span>
                        <span className="cmp-cat-bar" aria-hidden>
                          <i
                            style={{
                              width: `${Math.min(100, c.share ?? 0)}%`,
                              backgroundColor: c.color,
                            }}
                          />
                        </span>
                      </li>
                    ))}
                  </ul>
                  {hiddenCategories(r) > 0 && (
                    <span className="field-hint">
                      {hiddenCategories(r) === 1
                        ? t('analytics.comparison.hiddenCategoryOne')
                        : t('analytics.comparison.hiddenCategoryMany', {
                            count: hiddenCategories(r),
                          })}
                    </span>
                  )}
                </div>
              )}

              {insight && (
                <div className={`cmp-insight-trigger ${outdated ? 'outdated' : ''}`}>
                  <button
                    type="button"
                    className="cmp-insight-trigger-btn"
                    onClick={() => handleOpenInsight(r.month)}
                    title={t('analytics.comparison.readFullInsightTitle', {
                      month: formatMonthYearLabel(r.month, language),
                    })}
                  >
                    <div className="cmp-insight-trigger-badge">
                      <Sparkles size={13} />
                      <span>{t('analytics.comparison.aiInsightBadge')}</span>
                      {outdated && (
                        <span className="cmp-outdated-tag">
                          <TriangleAlert size={10} /> {t('analytics.comparison.outdated')}
                        </span>
                      )}
                    </div>
                    <strong className="cmp-insight-trigger-title">{insight.title}</strong>
                    <span className="cmp-insight-trigger-cta">
                      {t('analytics.comparison.readFullInsightCta')} &rarr;
                    </span>
                  </button>
                </div>
              )}
            </article>
          );
        })}
      </div>

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
                  <span>{t('analytics.comparison.aiInsightBadge')}</span>
                  <span className="cmp-insight-modal-dot">•</span>
                  <span>{formatMonthYearLabel(activeInsight.month, language)}</span>
                </div>
                <h2 id="cmp-insight-modal-title">{activeInsight.title}</h2>
              </div>
              <button
                type="button"
                className="icon-btn"
                onClick={handleCloseInsight}
                aria-label={t('analytics.common.close')}
                title={t('analytics.comparison.closeWithEsc')}
              >
                <X size={18} />
              </button>
            </header>

            <div className="modal-body cmp-insight-modal-body">
              <InsightAudioPlayer
                title={activeInsight.title}
                paragraphs={activeInsight.body.split(/\n\s*\n/).filter(Boolean)}
                highlights={activeInsight.highlights}
                monthLabel={formatMonthYearLabel(activeInsight.month, language)}
                currentReadingIndex={readingSegmentIndex ?? undefined}
                onReadingIndexChange={setReadingSegmentIndex}
              />

              {isActiveOutdated && (
                <div className="cmp-modal-outdated-alert">
                  <TriangleAlert size={16} />
                  <div>
                    <strong>{t('analytics.comparison.outdatedAlertTitle')}</strong>
                    <p>
                      {t('analytics.comparison.outdatedAlertBody', {
                        month: formatMonthYearLabel(activeInsight.month, language),
                      })}
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
                  <span className="eyebrow">{t('analytics.comparison.highlightsEyebrow')}</span>
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
                  {t('analytics.comparison.generatedMeta', {
                    date: formatDateTime(
                      activeInsight.updatedAt || activeInsight.createdAt,
                      language
                    ),
                  })}
                </span>
              </div>
            </div>

            <footer className="modal-footer cmp-insight-modal-footer">
              <button type="button" className="btn-primary" onClick={handleCloseInsight}>
                {t('analytics.common.close')}
              </button>
            </footer>
          </div>
        </div>
      )}
    </div>
  );
};
