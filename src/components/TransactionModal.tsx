import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  X,
  ArrowUpCircle,
  ArrowDownCircle,
  Repeat,
  CheckCircle2,
  Clock,
  Sparkles,
  Plus,
} from 'lucide-react';
import type {
  Account,
  Category,
  Currency,
  Transaction,
  TransactionStatus,
  TransactionType,
} from '../types/finance';
import { addMonthsToDateStr, formatBRL } from '../utils/formatters';
import { predictCategory } from '../utils/categorizer';

interface TransactionModalProps {
  initialType?: TransactionType;
  editingTransaction?: Transaction | null;
  categories: Category[];
  accounts: Account[];
  transactions?: Transaction[];
  defaultYearMonth: string;
  usdToBrlRate?: number;
  onSave: (transactionsToSave: Transaction[], isEdit: boolean) => void;
  onClose: () => void;
}

export const TransactionModal: React.FC<TransactionModalProps> = ({
  initialType = 'expense',
  editingTransaction,
  categories,
  accounts,
  transactions = [],
  defaultYearMonth,
  usdToBrlRate,
  onSave,
  onClose,
}) => {
  const isEdit = Boolean(editingTransaction);

  const [type, setType] = useState<TransactionType>(editingTransaction?.type || initialType);
  const [description, setDescription] = useState(editingTransaction?.description || '');
  const [amountStr, setAmountStr] = useState(
    editingTransaction ? String(editingTransaction.amount) : ''
  );

  const [date, setDate] = useState(() => {
    if (editingTransaction) return editingTransaction.date;
    const nowStr = new Date().toISOString().slice(0, 10);
    return nowStr.startsWith(defaultYearMonth) ? nowStr : `${defaultYearMonth}-10`;
  });

  const [status, setStatus] = useState<TransactionStatus>(editingTransaction?.status || 'paid');

  const [accountId, setAccountId] = useState(
    editingTransaction?.accountId || accounts[0]?.id || ''
  );

  const [currency, setCurrency] = useState<Currency>(() => {
    if (editingTransaction?.currency) return editingTransaction.currency;
    const initialAcc = accounts.find((a) => a.id === (editingTransaction?.accountId || accounts[0]?.id));
    return initialAcc?.currency || 'BRL';
  });

  const [customExchangeRate, setCustomExchangeRate] = useState<number | undefined>(
    editingTransaction?.exchangeRate
  );
  const effectiveExchangeRate = customExchangeRate ?? usdToBrlRate ?? 5.5;

  const filteredCategories = useMemo(
    () => categories.filter((c) => c.type === type),
    [categories, type]
  );

  const [categoryId, setCategoryId] = useState(
    editingTransaction?.categoryId || filteredCategories[0]?.id || ''
  );
  const [userSelectedCategoryManually, setUserSelectedCategoryManually] = useState(isEdit);
  const [suggestedCategoryName, setSuggestedCategoryName] = useState<string | null>(null);
  const [notes, setNotes] = useState(editingTransaction?.notes || '');
  const [repeatMonths, setRepeatMonths] = useState<number>(1);
  const [error, setError] = useState<string | null>(null);

  const amountInputRef = useRef<HTMLInputElement>(null);

  // Auto-foco no valor ao abrir
  useEffect(() => {
    amountInputRef.current?.focus();
  }, []);

  // Ao alternar o tipo (Despesa / Receita)
  const handleTypeSwitch = (newType: TransactionType) => {
    setType(newType);
    setUserSelectedCategoryManually(false);
    setSuggestedCategoryName(null);
    const matchingCats = categories.filter((c) => c.type === newType);
    if (!matchingCats.some((c) => c.id === categoryId)) {
      setCategoryId(matchingCats[0]?.id || '');
    }
  };

  // Sugestão preditiva de categoria ao digitar a descrição
  const handleDescriptionChange = (newDesc: string) => {
    setDescription(newDesc);
    setError(null);

    if (!userSelectedCategoryManually && !isEdit) {
      const prediction = predictCategory(newDesc, type, categories, transactions);
      if (prediction && prediction.categoryId !== categoryId) {
        setCategoryId(prediction.categoryId);
        setSuggestedCategoryName(prediction.categoryName);
      } else if (!prediction) {
        setSuggestedCategoryName(null);
      }
    }
  };

  const handleSelectCategory = (catId: string) => {
    setCategoryId(catId);
    setUserSelectedCategoryManually(true);
    setSuggestedCategoryName(null);
  };

  const handleAccountChange = (newAccId: string) => {
    setAccountId(newAccId);
    const targetAcc = accounts.find((a) => a.id === newAccId);
    if (targetAcc?.currency && !isEdit) {
      setCurrency(targetAcc.currency);
    }
  };

  const setQuickDate = (offsetDays: number) => {
    const d = new Date();
    d.setDate(d.getDate() + offsetDays);
    setDate(d.toISOString().slice(0, 10));
  };

  const executeSave = (andKeepOpen: boolean = false): boolean => {
    const normalizedAmount = parseFloat(amountStr.replace(',', '.'));
    if (Number.isNaN(normalizedAmount) || normalizedAmount <= 0) {
      setError('Informe um valor monetário válido maior que zero.');
      amountInputRef.current?.focus();
      return false;
    }
    if (!description.trim()) {
      setError('Informe a descrição do lançamento.');
      return false;
    }
    if (!categoryId || !accountId) {
      setError('Selecione uma categoria e uma conta.');
      return false;
    }

    const nowIso = new Date().toISOString();
    const rateToSave = currency === 'USD' ? effectiveExchangeRate : undefined;

    if (isEdit && editingTransaction) {
      const updated: Transaction = {
        ...editingTransaction,
        description: description.trim(),
        amount: normalizedAmount,
        currency,
        exchangeRate: rateToSave,
        type,
        status,
        date,
        categoryId,
        accountId,
        notes: notes.trim() || undefined,
      };
      onSave([updated], true);
      return true;
    }

    const totalRepeats = Math.max(1, Math.min(36, repeatMonths));
    const recurrenceGroupId = totalRepeats > 1 ? `rec_${Date.now()}` : undefined;
    const createdList: Transaction[] = [];

    for (let i = 0; i < totalRepeats; i++) {
      const itemDate = i === 0 ? date : addMonthsToDateStr(date, i);
      const itemStatus: TransactionStatus = i === 0 ? status : 'pending';
      const itemDesc =
        totalRepeats > 1
          ? `${description.trim()} (${i + 1}/${totalRepeats})`
          : description.trim();

      createdList.push({
        id: `tx_${Date.now()}_${i}_${Math.random().toString(36).slice(2, 6)}`,
        description: itemDesc,
        amount: normalizedAmount,
        currency,
        exchangeRate: rateToSave,
        type,
        status: itemStatus,
        date: itemDate,
        categoryId,
        accountId,
        notes: notes.trim() || undefined,
        recurrenceGroupId,
        installmentIndex: totalRepeats > 1 ? i + 1 : undefined,
        installmentTotal: totalRepeats > 1 ? totalRepeats : undefined,
        createdAt: nowIso,
      });
    }

    onSave(createdList, false);

    if (andKeepOpen) {
      // Limpa os dados para o próximo lançamento mantendo data, conta e tipo
      setDescription('');
      setAmountStr('');
      setNotes('');
      setUserSelectedCategoryManually(false);
      setSuggestedCategoryName(null);
      setError(null);
      amountInputRef.current?.focus();
      return true;
    }

    return true;
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    executeSave(false);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') {
      e.preventDefault();
      executeSave(false);
    }
  };

  return (
    <div className="modal-backdrop" onClick={onClose} onKeyDown={handleKeyDown}>
      <div className="modal-card" onClick={(e) => e.stopPropagation()}>
        <header className="modal-header">
          <h2>{isEdit ? 'Editar Lançamento' : 'Novo Lançamento'}</h2>
          <button type="button" className="icon-btn" onClick={onClose} title="Fechar (Esc)">
            <X size={18} />
          </button>
        </header>

        <form onSubmit={handleSubmit} className="modal-body">
          {error && <div className="vault-alert-error">{error}</div>}

          {/* Toggle Despesa vs Receita */}
          <div className="type-toggle-row">
            <button
              type="button"
              className={`type-pill expense ${type === 'expense' ? 'active' : ''}`}
              onClick={() => handleTypeSwitch('expense')}
            >
              <ArrowDownCircle size={18} />
              <strong>Despesa</strong>
            </button>
            <button
              type="button"
              className={`type-pill income ${type === 'income' ? 'active' : ''}`}
              onClick={() => handleTypeSwitch('income')}
            >
              <ArrowUpCircle size={18} />
              <strong>Receita</strong>
            </button>
          </div>

          {/* Valor e Data com Atalhos Rápidos */}
          <div className="form-grid-2">
            <div className="form-field">
              <div className="label-with-quick-actions">
                <label htmlFor="tx-amount">Valor</label>
                <div className="currency-selector-pills">
                  <button
                    type="button"
                    className={`curr-pill ${currency === 'BRL' ? 'active' : ''}`}
                    onClick={() => setCurrency('BRL')}
                  >
                    R$ BRL
                  </button>
                  <button
                    type="button"
                    className={`curr-pill ${currency === 'USD' ? 'active' : ''}`}
                    onClick={() => setCurrency('USD')}
                  >
                    US$ USD
                  </button>
                </div>
              </div>
              <div className="amount-input-wrap">
                <span className="currency-prefix mono">{currency === 'USD' ? 'US$' : 'R$'}</span>
                <input
                  ref={amountInputRef}
                  id="tx-amount"
                  type="text"
                  inputMode="decimal"
                  className="mono amount-input-lg"
                  value={amountStr}
                  onChange={(e) => {
                    setError(null);
                    setAmountStr(e.target.value);
                  }}
                  placeholder="0,00"
                  required
                />
              </div>
              {currency === 'USD' && (
                <div className="amount-usd-rate-row">
                  <div className="amount-fx-hint mono">
                    ≈ {(() => {
                      const numeric = parseFloat(amountStr.replace(',', '.'));
                      return !isNaN(numeric) && numeric > 0 ? formatBRL(numeric * effectiveExchangeRate) : 'R$ 0,00';
                    })()}
                  </div>
                  <div className="inline-fx-rate-picker">
                    <label htmlFor="tx-fx-rate" title="Cotação USD/BRL fixada para este lançamento">
                      Cotação:
                    </label>
                    <div className="fx-rate-input-wrap">
                      <span className="mono fx-prefix">R$</span>
                      <input
                        id="tx-fx-rate"
                        type="number"
                        step="0.0001"
                        min="0.01"
                        className="mono fx-rate-input"
                        value={customExchangeRate ?? (usdToBrlRate || '')}
                        onChange={(e) => {
                          const val = parseFloat(e.target.value);
                          setCustomExchangeRate(isNaN(val) ? undefined : val);
                        }}
                        placeholder="5.50"
                        title="Cotação fixada no momento (AwesomeAPI por padrão)"
                      />
                    </div>
                  </div>
                </div>
              )}
            </div>

            <div className="form-field">
              <div className="label-with-quick-actions">
                <label htmlFor="tx-date">Data</label>
                <div className="quick-date-group">
                  <button
                    type="button"
                    className="quick-date-btn"
                    onClick={() => setQuickDate(0)}
                  >
                    Hoje
                  </button>
                  <button
                    type="button"
                    className="quick-date-btn"
                    onClick={() => setQuickDate(-1)}
                  >
                    Ontem
                  </button>
                </div>
              </div>
              <input
                id="tx-date"
                type="date"
                className="mono"
                value={date}
                onChange={(e) => setDate(e.target.value)}
                required
              />
            </div>
          </div>

          {/* Descrição com Auto-Categorização */}
          <div className="form-field">
            <div className="label-with-quick-actions">
              <label htmlFor="tx-desc">Descrição do Lançamento</label>
              {suggestedCategoryName && (
                <span className="category-suggestion-badge">
                  <Sparkles size={12} /> Sugerido: {suggestedCategoryName}
                </span>
              )}
            </div>
            <input
              id="tx-desc"
              type="text"
              value={description}
              onChange={(e) => handleDescriptionChange(e.target.value)}
              placeholder={
                type === 'expense'
                  ? 'Ex: Supermercado Assaí, Aluguel, Farmácia Raia, Almoço...'
                  : 'Ex: Salário Mensal, Consultoria, Rendimentos CDB...'
              }
              required
            />
          </div>

          {/* Seletor Visual de Categorias com Pills Coloridos */}
          <div className="form-field">
            <div className="label-with-quick-actions">
              <label>Categoria de {type === 'expense' ? 'Despesa' : 'Receita'}</label>
              <span className="sub-helper">Clique para escolher rapidamente</span>
            </div>

            <div className="category-pills-selector">
              {filteredCategories.map((c) => {
                const isSelected = c.id === categoryId;
                return (
                  <button
                    type="button"
                    key={c.id}
                    className={`category-pill-btn ${isSelected ? 'selected' : ''}`}
                    onClick={() => handleSelectCategory(c.id)}
                    style={{
                      borderColor: isSelected ? c.color : undefined,
                    }}
                  >
                    <span
                      className="category-pill-dot"
                      style={{ backgroundColor: c.color }}
                    />
                    <span>{c.name}</span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Conta e Situação (Pago / Pendente) */}
          <div className="form-grid-2">
            <div className="form-field">
              <label htmlFor="tx-acc">Conta / Carteira</label>
              <select
                id="tx-acc"
                value={accountId}
                onChange={(e) => handleAccountChange(e.target.value)}
              >
                {accounts.map((a) => (
                  <option key={a.id} value={a.id}>
                    {a.name} ({a.currency || 'BRL'})
                  </option>
                ))}
              </select>
            </div>

            <div className="form-field">
              <label>Situação / Liquidação</label>
              <div className="status-toggle-group">
                <button
                  type="button"
                  className={`status-btn paid ${status === 'paid' ? 'active' : ''}`}
                  onClick={() => setStatus('paid')}
                >
                  <CheckCircle2 size={15} /> {type === 'income' ? 'Já Recebido' : 'Já Pago'}
                </button>
                <button
                  type="button"
                  className={`status-btn pending ${status === 'pending' ? 'active' : ''}`}
                  onClick={() => setStatus('pending')}
                >
                  <Clock size={15} /> Pendente
                </button>
              </div>
            </div>
          </div>

          {/* Observações e Parcelamento (se novo) */}
          <div className="form-grid-2">
            {!isEdit ? (
              <div className="form-field">
                <label htmlFor="tx-repeat">
                  <Repeat size={13} style={{ display: 'inline', marginRight: 4 }} />
                  Repetir / Parcelar
                </label>
                <select
                  id="tx-repeat"
                  value={repeatMonths}
                  onChange={(e) => setRepeatMonths(Number(e.target.value))}
                >
                  <option value={1}>Lançamento Único (1x)</option>
                  <option value={2}>2 parcelas mensais</option>
                  <option value={3}>3 parcelas mensais</option>
                  <option value={4}>4 parcelas mensais</option>
                  <option value={6}>6 parcelas (Semestral)</option>
                  <option value={10}>10 parcelas</option>
                  <option value={12}>12 parcelas (Anual / Recorrente)</option>
                </select>
              </div>
            ) : null}

            <div className="form-field" style={{ gridColumn: isEdit ? '1 / -1' : undefined }}>
              <label htmlFor="tx-notes">Observações (Opcional)</label>
              <input
                id="tx-notes"
                type="text"
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="Ex: Nota fiscal, tags, comprovante..."
              />
            </div>
          </div>

          <footer className="modal-footer">
            <button type="button" className="btn-secondary" onClick={onClose}>
              Cancelar
            </button>

            {!isEdit && (
              <button
                type="button"
                className="btn-secondary"
                onClick={() => executeSave(true)}
                title="Salva este lançamento e abre espaço para o próximo sem fechar a janela"
              >
                <Plus size={15} /> Salvar e Novo
              </button>
            )}

            <button type="submit" className="btn-primary">
              {isEdit
                ? 'Salvar Alterações'
                : repeatMonths > 1
                ? `Gerar ${repeatMonths} Lançamentos`
                : 'Registrar no Cofre'}
            </button>
          </footer>
        </form>
      </div>
    </div>
  );
};
