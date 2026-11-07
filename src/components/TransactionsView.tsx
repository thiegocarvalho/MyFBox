import React, { useMemo, useState } from 'react';
import {
  Search,
  CheckCircle2,
  Clock,
  Edit3,
  Trash2,
  Copy,
  Download,
  Filter,
} from 'lucide-react';
import type {
  Account,
  Category,
  Transaction,
  TransactionStatus,
  TransactionType,
} from '../types/finance';
import { formatBRL, formatFullDateBR, formatMoney } from '../utils/formatters';
import { exportTransactionsToCSV } from '../services/importExport';

interface TransactionsViewProps {
  selectedYearMonth: string;
  transactions: Transaction[];
  categories: Category[];
  accounts: Account[];
  hideValues: boolean;
  onOpenNewTransaction: (type: TransactionType) => void;
  onEditTransaction: (tx: Transaction) => void;
  onDuplicateTransaction: (tx: Transaction) => void;
  onDeleteTransaction: (txId: string) => void;
  onToggleTransactionStatus: (txId: string) => void;
}

export const TransactionsView: React.FC<TransactionsViewProps> = ({
  selectedYearMonth,
  transactions,
  categories,
  accounts,
  hideValues,
  onOpenNewTransaction,
  onEditTransaction,
  onDuplicateTransaction,
  onDeleteTransaction,
  onToggleTransactionStatus,
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [typeFilter, setTypeFilter] = useState<'all' | TransactionType>('all');
  const [statusFilter, setStatusFilter] = useState<'all' | TransactionStatus>('all');
  const [categoryFilter, setCategoryFilter] = useState<string>('all');
  const [accountFilter, setAccountFilter] = useState<string>('all');
  const [scopeAllMonths, setScopeAllMonths] = useState<boolean>(false);

  const catMap = useMemo(() => new Map(categories.map((c) => [c.id, c])), [categories]);
  const accMap = useMemo(() => new Map(accounts.map((a) => [a.id, a])), [accounts]);

  const filteredTransactions = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    return transactions
      .filter((tx) => {
        if (!scopeAllMonths && !tx.date.startsWith(selectedYearMonth)) return false;
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
    selectedYearMonth,
    scopeAllMonths,
    typeFilter,
    statusFilter,
    categoryFilter,
    accountFilter,
    searchQuery,
    catMap,
    accMap,
  ]);

  const summary = useMemo(() => {
    let incBrl = 0;
    let expBrl = 0;
    let incUsd = 0;
    let expUsd = 0;
    for (const tx of filteredTransactions) {
      const isUsd = tx.currency === 'USD';
      if (tx.type === 'income') {
        if (isUsd) incUsd += tx.amount;
        else incBrl += tx.amount;
      } else {
        if (isUsd) expUsd += tx.amount;
        else expBrl += tx.amount;
      }
    }
    return {
      incBrl,
      expBrl,
      netBrl: incBrl - expBrl,
      incUsd,
      expUsd,
      netUsd: incUsd - expUsd,
      hasUsd: incUsd > 0 || expUsd > 0,
      count: filteredTransactions.length,
    };
  }, [filteredTransactions]);

  return (
    <div className="ledger-view-stack">
      {/* Barra de Ferramentas e Filtros */}
      <section className="panel-card ledger-toolbar-card">
        <div className="ledger-toolbar-top">
          <div className="search-input-wrap">
            <Search size={15} />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Buscar lançamento, nota ou categoria..."
            />
          </div>

          <div className="segmented-filter">
            <button
              type="button"
              className={typeFilter === 'all' ? 'active' : ''}
              onClick={() => setTypeFilter('all')}
            >
              Todos
            </button>
            <button
              type="button"
              className={typeFilter === 'income' ? 'active' : ''}
              onClick={() => setTypeFilter('income')}
            >
              Entradas
            </button>
            <button
              type="button"
              className={typeFilter === 'expense' ? 'active' : ''}
              onClick={() => setTypeFilter('expense')}
            >
              Saídas
            </button>
          </div>

          <div className="segmented-filter">
            <button
              type="button"
              className={statusFilter === 'all' ? 'active' : ''}
              onClick={() => setStatusFilter('all')}
            >
              Status
            </button>
            <button
              type="button"
              className={statusFilter === 'paid' ? 'active' : ''}
              onClick={() => setStatusFilter('paid')}
            >
              Quitados
            </button>
            <button
              type="button"
              className={statusFilter === 'pending' ? 'active' : ''}
              onClick={() => setStatusFilter('pending')}
            >
              Pendentes
            </button>
          </div>

          <select
            className="filter-select"
            value={categoryFilter}
            onChange={(e) => setCategoryFilter(e.target.value)}
          >
            <option value="all">Todas as Categorias</option>
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
          >
            <option value="all">Todas as Contas</option>
            {accounts.map((a) => (
              <option key={a.id} value={a.id}>
                {a.name}
              </option>
            ))}
          </select>

          <button
            type="button"
            className={`btn-chip-toggle ${scopeAllMonths ? 'active' : ''}`}
            onClick={() => setScopeAllMonths((v) => !v)}
            title="Alternar entre mês selecionado ou histórico completo"
          >
            <Filter size={13} />
            {scopeAllMonths ? 'Todo o Histórico' : 'Mês Selecionado'}
          </button>

          <button
            type="button"
            className="icon-action-btn"
            onClick={() =>
              exportTransactionsToCSV(
                filteredTransactions,
                categories,
                accounts,
                `myfbox-${scopeAllMonths ? 'historico' : selectedYearMonth}`
              )
            }
            title={`Exportar ${filteredTransactions.length} lançamentos para CSV`}
          >
            <Download size={15} />
          </button>
        </div>

        <div className="ledger-summary-bar mono">
          <span>{summary.count} lançamentos</span>
          <span>•</span>
          <span className="positive">Entradas: +{formatBRL(summary.incBrl, hideValues)}</span>
          <span>•</span>
          <span className="negative">Saídas: -{formatBRL(summary.expBrl, hideValues)}</span>
          <span>•</span>
          <span>
            Saldo:{' '}
            <strong className={summary.netBrl >= 0 ? 'positive' : 'negative'}>
              {summary.netBrl >= 0 ? '+' : ''}
              {formatBRL(summary.netBrl, hideValues)}
            </strong>
          </span>
          {summary.hasUsd && (
            <>
              <span className="summary-usd-sep">|</span>
              <span className="badge-usd-sm">USD</span>
              <span className="positive">+{formatMoney(summary.incUsd, 'USD', hideValues)}</span>
              <span>•</span>
              <span className="negative">-{formatMoney(summary.expUsd, 'USD', hideValues)}</span>
              <span>•</span>
              <span>
                <strong className={summary.netUsd >= 0 ? 'positive' : 'negative'}>
                  {summary.netUsd >= 0 ? '+' : ''}
                  {formatMoney(summary.netUsd, 'USD', hideValues)}
                </strong>
              </span>
            </>
          )}
        </div>
      </section>

      {/* Tabela de Lançamentos */}
      <section className="panel-card ledger-table-card">
        {filteredTransactions.length === 0 ? (
          <div className="empty-state-box">
            <p>Nenhum lançamento encontrado para os filtros selecionados.</p>
            <div className="empty-state-actions">
              <button
                type="button"
                className="btn-Quick-expense"
                onClick={() => onOpenNewTransaction('expense')}
              >
                + Adicionar Despesa
              </button>
              <button
                type="button"
                className="btn-Quick-income"
                onClick={() => onOpenNewTransaction('income')}
              >
                + Adicionar Receita
              </button>
            </div>
          </div>
        ) : (
          <div className="ledger-table-scroll">
            <table className="ledger-table">
              <thead>
                <tr>
                  <th>DATA</th>
                  <th>DESCRIÇÃO</th>
                  <th>CATEGORIA</th>
                  <th>CONTA / CARTEIRA</th>
                  <th>STATUS</th>
                  <th className="align-right">VALOR</th>
                  <th className="align-right">AÇÕES</th>
                </tr>
              </thead>
              <tbody>
                {filteredTransactions.map((tx) => {
                  const cat = catMap.get(tx.categoryId);
                  const acc = accMap.get(tx.accountId);
                  return (
                    <tr key={tx.id}>
                      <td className="mono date-cell">{formatFullDateBR(tx.date)}</td>
                      <td>
                        <div className="tx-desc-cell">
                          <strong>{tx.description}</strong>
                          {tx.notes && <span className="tx-note-sub">{tx.notes}</span>}
                        </div>
                      </td>
                      <td>
                        <span className="cat-pill">
                          <i
                            className="cat-color-dot"
                            style={{ backgroundColor: cat?.color || '#94A3B8' }}
                          />
                          {cat?.name || 'Geral'}
                        </span>
                      </td>
                      <td>
                        <span className="acc-pill">{acc?.name || 'Conta'}</span>
                      </td>
                      <td>
                        <button
                          type="button"
                          className={`status-badge-btn ${tx.status}`}
                          onClick={() => onToggleTransactionStatus(tx.id)}
                          title="Clique para alternar entre Pago/Recebido e Pendente"
                        >
                          {tx.status === 'paid' ? (
                            <>
                              <CheckCircle2 size={13} />{' '}
                              {tx.type === 'income' ? 'Recebido' : 'Pago'}
                            </>
                          ) : (
                            <>
                              <Clock size={13} /> Pendente
                            </>
                          )}
                        </button>
                      </td>
                      <td
                        className={`mono align-right amount-cell ${
                          tx.type === 'income' ? 'positive' : 'negative'
                        }`}
                      >
                        <div className="amount-main-line">
                          <span className="amount-val">
                            {tx.type === 'income' ? '+' : '-'}
                            {formatMoney(tx.amount, tx.currency || 'BRL', hideValues)}
                          </span>
                          {tx.currency === 'USD' && (
                            <span className="currency-pill-inline">USD</span>
                          )}
                        </div>
                        {tx.currency === 'USD' && tx.exchangeRate && (
                          <div className="amount-fx-sub mono">
                            ≈ {formatBRL(tx.amount * tx.exchangeRate, hideValues)}{' '}
                            <span className="rate-hint">(R$ {tx.exchangeRate.toFixed(2)})</span>
                          </div>
                        )}
                      </td>
                      <td className="align-right">
                        <div className="row-actions">
                          <button
                            type="button"
                            className="icon-btn-sm"
                            onClick={() => onEditTransaction(tx)}
                            title="Editar lançamento"
                          >
                            <Edit3 size={14} />
                          </button>
                          <button
                            type="button"
                            className="icon-btn-sm"
                            onClick={() => onDuplicateTransaction(tx)}
                            title="Duplicar lançamento"
                          >
                            <Copy size={14} />
                          </button>
                          <button
                            type="button"
                            className="icon-btn-sm danger"
                            onClick={() => onDeleteTransaction(tx.id)}
                            title="Excluir lançamento"
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
          </div>
        )}
      </section>
    </div>
  );
};
