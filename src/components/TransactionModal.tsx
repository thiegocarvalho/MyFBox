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
  Check,
  ChevronDown,
} from 'lucide-react';
import type {
  Account,
  Category,
  Currency,
  Transaction,
  TransactionStatus,
  TransactionType,
} from '../types/finance';
import { generateEntityId } from '../domain/id';
import {
  addMonthsToDateStr,
  formatBRL,
  formatMoney,
  formatMonthYearLabel,
  localTodayStr,
} from '../utils/formatters';
import { predictCategory } from '../utils/categorizer';
import { getDefaultCategoryId } from '../utils/categories';
import { accountCurrency, isValidRate, parseDecimalInput } from '../utils/money';
import {
  POPULAR_CURRENCIES,
  getCurrencyName,
  findExchangeRate,
  getCurrencySymbol,
  type ExchangeRateSource,
} from '../services/currencyService';
import { useI18n } from '../i18n/useI18n';

const REPEAT_OPTIONS = [1, 2, 3, 6, 12];
const NEW_CATEGORY_COLORS = [
  '#C8FF00',
  '#7DD3FC',
  '#FFB020',
  '#B794FF',
  '#FF4D3D',
  '#F472B6',
  '#34D399',
];

interface TransactionModalProps {
  initialType?: TransactionType;
  editingTransaction?: Transaction | null;
  duplicatingTransaction?: Transaction | null;
  categories: Category[];
  accounts: Account[];
  transactions?: Transaction[];
  defaultYearMonth: string;
  usdToBrlRate?: number;
  rateSource?: ExchangeRateSource;
  onCreateCategory?: (category: Category) => Promise<void> | void;
  onSave: (transactionsToSave: Transaction[], isEdit: boolean) => void;
  onClose: () => void;
}

export const TransactionModal: React.FC<TransactionModalProps> = ({
  initialType = 'expense',
  editingTransaction,
  duplicatingTransaction,
  categories,
  accounts,
  transactions = [],
  defaultYearMonth,
  usdToBrlRate,
  rateSource,
  onCreateCategory,
  onSave,
  onClose,
}) => {
  const { t } = useI18n();
  const isEdit = Boolean(editingTransaction);
  const isDuplicate = !isEdit && Boolean(duplicatingTransaction);
  const baseTransaction = editingTransaction || duplicatingTransaction;
  const effectiveRates = rateSource ?? usdToBrlRate;

  const [type, setType] = useState<TransactionType>(baseTransaction?.type || initialType);
  const [description, setDescription] = useState(baseTransaction?.description || '');
  const [amountStr, setAmountStr] = useState(
    baseTransaction ? String(baseTransaction.amount) : ''
  );

  const [date, setDate] = useState(() => {
    if (baseTransaction) return baseTransaction.date;
    const nowStr = localTodayStr(0);
    return nowStr.startsWith(defaultYearMonth) ? nowStr : `${defaultYearMonth}-10`;
  });

  const [status, setStatus] = useState<TransactionStatus>(
    baseTransaction?.status || (date > localTodayStr(0) ? 'pending' : 'paid')
  );
  const [statusChosenManually, setStatusChosenManually] = useState(Boolean(baseTransaction));

  const [accountId, setAccountId] = useState(
    baseTransaction?.accountId || accounts[0]?.id || ''
  );

  const [currency, setCurrency] = useState<Currency>(() => {
    if (baseTransaction?.currency) return baseTransaction.currency;
    const initialAcc = accounts.find(
      (a) => a.id === (baseTransaction?.accountId || accounts[0]?.id)
    );
    return accountCurrency(initialAcc ?? {});
  });

  const selectedAccountCurrency = accountCurrency(
    accounts.find((a) => a.id === accountId) ?? {}
  );
  const needsRate = currency !== 'BRL' || selectedAccountCurrency !== 'BRL';
  const foreignCurrency: Currency = currency !== 'BRL' ? currency : selectedAccountCurrency;
  const defaultForeignToBrlRate = useMemo(() => {
    if (!needsRate) return undefined;
    return findExchangeRate(effectiveRates, foreignCurrency, 'BRL');
  }, [needsRate, effectiveRates, foreignCurrency]);

  const [rateInput, setRateInput] = useState<string | null>(
    baseTransaction?.exchangeRate ? String(baseTransaction.exchangeRate) : null
  );
  const rateFieldValue =
    rateInput ?? (isValidRate(defaultForeignToBrlRate) ? String(defaultForeignToBrlRate) : '');
  const parsedRate = rateFieldValue.trim() ? parseDecimalInput(rateFieldValue) : undefined;
  const effectiveExchangeRate = isValidRate(parsedRate) ? parsedRate : undefined;

  const filteredCategories = useMemo(
    () => categories.filter((c) => c.type === type),
    [categories, type]
  );

  const [categoryId, setCategoryId] = useState(
    baseTransaction?.categoryId || getDefaultCategoryId(categories, type)
  );
  const [userSelectedCategoryManually, setUserSelectedCategoryManually] = useState(
    Boolean(baseTransaction)
  );
  const [suggestedCategoryName, setSuggestedCategoryName] = useState<string | null>(null);
  const [notes, setNotes] = useState(baseTransaction?.notes || '');
  const [repeatMonths, setRepeatMonths] = useState<number>(1);
  const [newCategoryName, setNewCategoryName] = useState('');
  const [creatingCategory, setCreatingCategory] = useState(false);
  const parsedAmount = parseDecimalInput(amountStr);
  const amountIsValid = Number.isFinite(parsedAmount) && parsedAmount > 0;
  const [error, setError] = useState<string | null>(null);

  const amountInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    amountInputRef.current?.focus();
  }, []);

  const handleTypeSwitch = (newType: TransactionType) => {
    setType(newType);
    setUserSelectedCategoryManually(false);
    setSuggestedCategoryName(null);
    const matchingCats = categories.filter((c) => c.type === newType);
    if (!matchingCats.some((c) => c.id === categoryId)) {
      setCategoryId(getDefaultCategoryId(categories, newType));
    }
  };

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
        const defaultCatId = getDefaultCategoryId(categories, type);
        if (categoryId !== defaultCatId) {
          setCategoryId(defaultCatId);
        }
      }
    }
  };

  const handleCreateCategory = async () => {
    const name = newCategoryName.trim();
    if (!name || !onCreateCategory) return;
    const existing = filteredCategories.find(
      (c) => c.name.toLowerCase() === name.toLowerCase()
    );
    if (existing) {
      handleSelectCategory(existing.id);
    } else {
      const newCat: Category = {
        id: generateEntityId('cat'),
        name,
        type,
        color: NEW_CATEGORY_COLORS[categories.length % NEW_CATEGORY_COLORS.length],
        icon: 'Tag',
      };
      await onCreateCategory(newCat);
      handleSelectCategory(newCat.id);
    }
    setNewCategoryName('');
    setCreatingCategory(false);
    setError(null);
  };

  const handleSelectCategory = (catId: string) => {
    setCategoryId(catId);
    setUserSelectedCategoryManually(true);
    setSuggestedCategoryName(null);
  };

  const handleAccountChange = (newAccId: string) => {
    setAccountId(newAccId);
    const targetAcc = accounts.find((a) => a.id === newAccId);
    if (targetAcc && !isEdit) {
      setCurrency(accountCurrency(targetAcc));
    }
  };

  const handleDateChange = (newDate: string) => {
    setDate(newDate);
    if (!statusChosenManually && newDate) {
      setStatus(newDate > localTodayStr(0) ? 'pending' : 'paid');
    }
  };

  const handleStatusChange = (next: TransactionStatus) => {
    setStatus(next);
    setStatusChosenManually(true);
  };

  const quickDates = [
    { label: t('tx.modal.yesterday'), value: localTodayStr(-1) },
    { label: t('tx.modal.today'), value: localTodayStr(0) },
    { label: t('tx.modal.tomorrow'), value: localTodayStr(1) },
  ];

  const currencySymbol = getCurrencySymbol(currency);

  const executeSave = (andKeepOpen: boolean = false): boolean => {
    const normalizedAmount = Math.round(parsedAmount * 100) / 100;
    if (!amountIsValid) {
      setError(t('tx.validation.invalidAmount'));
      amountInputRef.current?.focus();
      return false;
    }
    if (!description.trim()) {
      setError(t('tx.validation.missingDescription'));
      return false;
    }
    if (!categoryId || !categories.some((c) => c.id === categoryId && c.type === type)) {
      setError(
        filteredCategories.length === 0
          ? type === 'expense'
            ? t('tx.validation.createExpenseCategory')
            : t('tx.validation.createIncomeCategory')
          : t('tx.validation.selectCategory')
      );
      return false;
    }
    if (!accountId) {
      setError(t('tx.validation.selectAccount'));
      return false;
    }

    if (needsRate && parsedRate !== undefined && !isValidRate(parsedRate)) {
      setError(t('tx.validation.invalidRate', { currency: foreignCurrency }));
      return false;
    }

    const nowIso = new Date().toISOString();
    const rateFor = (itemStatus: TransactionStatus) =>
      needsRate && (rateInput !== null || itemStatus === 'paid')
        ? effectiveExchangeRate
        : undefined;
    const rateToSave = rateFor(status);

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
    const recurrenceGroupId = totalRepeats > 1 ? generateEntityId('rec') : undefined;
    const createdList: Transaction[] = [];

    for (let i = 0; i < totalRepeats; i++) {
      const itemDate = i === 0 ? date : addMonthsToDateStr(date, i);
      const itemStatus: TransactionStatus = i === 0 ? status : 'pending';
      const itemDesc =
        totalRepeats > 1
          ? `${description.trim()} (${i + 1}/${totalRepeats})`
          : description.trim();

      createdList.push({
        id: generateEntityId('tx'),
        description: itemDesc,
        amount: normalizedAmount,
        currency,
        exchangeRate: i === 0 ? rateFor(itemStatus) : undefined,
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
    if ((e.ctrlKey || e.metaKey) && e.shiftKey && e.key === 'Enter') {
      e.preventDefault();
      executeSave(!isEdit);
    } else if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') {
      e.preventDefault();
      executeSave(false);
    } else if (e.altKey && (e.key === 'n' || e.key === 'N')) {
      e.preventDefault();
      executeSave(!isEdit);
    } else if (
      (e.altKey && (e.key === '1' || e.key === 'd' || e.key === 'D')) ||
      ((e.ctrlKey || e.metaKey) && e.key === 'ArrowDown')
    ) {
      e.preventDefault();
      handleTypeSwitch('expense');
    } else if (
      (e.altKey && (e.key === '2' || e.key === 'r' || e.key === 'R')) ||
      ((e.ctrlKey || e.metaKey) && e.key === 'ArrowUp')
    ) {
      e.preventDefault();
      handleTypeSwitch('income');
    } else if (e.key === 'Escape') {
      e.preventDefault();
      onClose();
    }
  };

  return (
    <div className="modal-backdrop" onClick={onClose} onKeyDown={handleKeyDown}>
      <div className="modal-card" onClick={(e) => e.stopPropagation()}>
        <header className="modal-header">
          <h2>
            {isEdit
              ? t('tx.modal.editTitle')
              : isDuplicate
                ? t('tx.modal.duplicateTitle')
                : t('tx.newTransaction')}
          </h2>
          <button
            type="button"
            className="icon-btn"
            onClick={onClose}
            title={t('tx.common.closeEsc')}
          >
            <X size={18} />
          </button>
        </header>

        <form onSubmit={handleSubmit} className="modal-body">
          {error && <div className="vault-alert-error">{error}</div>}

          <div className="seg-group seg-lg" role="radiogroup" aria-label={t('tx.modal.typeAria')}>
            <button
              type="button"
              role="radio"
              aria-checked={type === 'expense'}
              className={`seg-btn tone-danger ${type === 'expense' ? 'active' : ''}`}
              onClick={() => handleTypeSwitch('expense')}
              title={t('tx.modal.switchToExpenseTitle')}
            >
              <ArrowDownCircle size={18} /> {t('tx.modal.expense')}
            </button>
            <button
              type="button"
              role="radio"
              aria-checked={type === 'income'}
              className={`seg-btn ${type === 'income' ? 'active' : ''}`}
              onClick={() => handleTypeSwitch('income')}
              title={t('tx.modal.switchToIncomeTitle')}
            >
              <ArrowUpCircle size={18} /> {t('tx.modal.income')}
            </button>
          </div>

          <div className="form-field">
            <label htmlFor="tx-amount">{t('tx.modal.amountLabel')}</label>
            <div className="amount-field">
              <div className="amount-currency">
                <div className="amount-currency-display" aria-hidden="true">
                  <span className="amount-currency-symbol">{currencySymbol}</span>
                  {currencySymbol !== currency && (
                    <span className="amount-currency-code">{currency}</span>
                  )}
                  <ChevronDown size={14} className="amount-currency-chevron" />
                </div>
                <select
                  id="tx-currency"
                  aria-label={t('tx.modal.currencyAria')}
                  className="amount-currency-select"
                  value={currency}
                  onChange={(e) => setCurrency(e.target.value as Currency)}
                  title={t('tx.modal.currencyTitle')}
                >
                  {POPULAR_CURRENCIES.map((c) => (
                    <option key={c.code} value={c.code}>
                      {c.flag} {c.code} — {getCurrencyName(c.code)} ({c.symbol})
                    </option>
                  ))}
                  {!POPULAR_CURRENCIES.some((c) => c.code === currency) && (
                    <option value={currency}>{currency}</option>
                  )}
                </select>
              </div>
              <input
                ref={amountInputRef}
                id="tx-amount"
                type="text"
                inputMode="decimal"
                autoComplete="off"
                className="amount-input-xl"
                value={amountStr}
                onChange={(e) => {
                  setError(null);
                  setAmountStr(e.target.value);
                }}
                placeholder={t('tx.modal.amountPlaceholder')}
                aria-describedby="tx-amount-hint"
                required
              />
            </div>
            <span id="tx-amount-hint" className="field-hint">
              {amountIsValid
                ? `${formatMoney(parsedAmount, currency)}${
                    repeatMonths > 1 && !isEdit
                      ? t('tx.modal.monthsMultiplier', { count: repeatMonths })
                      : ''
                  }`
                : t('tx.modal.amountHint')}
            </span>

            {needsRate && (
              <div className="fx-row">
                <span className="fx-equivalent">
                  {(() => {
                    if (!effectiveExchangeRate) return t('tx.modal.noRateDefined');
                    const value = amountIsValid ? parsedAmount : 0;
                    return currency === 'BRL'
                      ? t('tx.modal.fxInAccount', {
                          amount: formatMoney(
                            value / effectiveExchangeRate,
                            selectedAccountCurrency
                          ),
                        })
                      : `≈ ${formatBRL(value * effectiveExchangeRate)}`;
                  })()}
                </span>
                <label htmlFor="tx-fx-rate" className="fx-label">
                  {t('tx.modal.fxLabel', { symbol: getCurrencySymbol(foreignCurrency) })}
                </label>
                <div className="fx-input">
                  <span>R$</span>
                  <input
                    id="tx-fx-rate"
                    type="text"
                    inputMode="decimal"
                    value={rateFieldValue}
                    onChange={(e) => {
                      setError(null);
                      setRateInput(e.target.value);
                    }}
                    placeholder={t('tx.modal.fxPlaceholder')}
                    title={t('tx.modal.fxTitle')}
                  />
                </div>
              </div>
            )}
          </div>

          <div className="form-field">
            <div className="label-with-quick-actions">
              <label htmlFor="tx-desc">{t('tx.modal.descriptionLabel')}</label>
              {suggestedCategoryName && (
                <span className="category-suggestion-badge">
                  <Sparkles size={12} />{' '}
                  {t('tx.modal.suggestedCategory', { name: suggestedCategoryName })}
                </span>
              )}
            </div>
            <input
              id="tx-desc"
              type="text"
              autoComplete="off"
              value={description}
              onChange={(e) => handleDescriptionChange(e.target.value)}
              placeholder={
                type === 'expense'
                  ? t('tx.modal.descriptionPlaceholderExpense')
                  : t('tx.modal.descriptionPlaceholderIncome')
              }
              required
            />
          </div>

          <div className="form-field">
            <label id="tx-cat-label">{t('tx.modal.categoryLabel')}</label>
            <div className="chip-grid" role="radiogroup" aria-labelledby="tx-cat-label">
              {filteredCategories.map((c) => {
                const isSelected = c.id === categoryId;
                return (
                  <button
                    type="button"
                    key={c.id}
                    role="radio"
                    aria-checked={isSelected}
                    className={`chip ${isSelected ? 'active' : ''}`}
                    onClick={() => handleSelectCategory(c.id)}
                  >
                    <span className="chip-dot" style={{ backgroundColor: c.color }} />
                    <span>{c.name}</span>
                    {isSelected && <Check size={14} className="chip-check" />}
                  </button>
                );
              })}
              {onCreateCategory &&
                (creatingCategory || filteredCategories.length === 0 ? (
                  <div className="chip-create">
                    <input
                      type="text"
                      value={newCategoryName}
                      onChange={(e) => setNewCategoryName(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') {
                          e.preventDefault();
                          void handleCreateCategory();
                        } else if (e.key === 'Escape' && filteredCategories.length > 0) {
                          e.stopPropagation();
                          setCreatingCategory(false);
                        }
                      }}
                      placeholder={
                        type === 'expense'
                          ? t('tx.modal.newExpenseCategoryPlaceholder')
                          : t('tx.modal.newIncomeCategoryPlaceholder')
                      }
                      aria-label={t('tx.modal.newCategoryAria')}
                      autoFocus={creatingCategory}
                    />
                    <button
                      type="button"
                      onClick={() => void handleCreateCategory()}
                      disabled={!newCategoryName.trim()}
                    >
                      <Plus size={14} /> {t('tx.modal.createCategoryBtn')}
                    </button>
                  </div>
                ) : (
                  <button
                    type="button"
                    className="chip chip-ghost"
                    onClick={() => setCreatingCategory(true)}
                  >
                    <Plus size={14} /> {t('tx.modal.newCategoryBtn')}
                  </button>
                ))}
            </div>
            {filteredCategories.length === 0 && (
              <span className="field-hint">
                {type === 'expense'
                  ? t('tx.modal.noExpenseCategoriesHint')
                  : t('tx.modal.noIncomeCategoriesHint')}
              </span>
            )}
          </div>

          <div className="form-grid-2">
            <div className="form-field">
              <label htmlFor="tx-date">{t('tx.modal.dateLabel')}</label>
              <div className="seg-group">
                {quickDates.map((q) => (
                  <button
                    key={q.value}
                    type="button"
                    className={`seg-btn ${date === q.value ? 'active' : ''}`}
                    onClick={() => handleDateChange(q.value)}
                  >
                    {q.label}
                  </button>
                ))}
              </div>
              <input
                id="tx-date"
                type="date"
                value={date}
                onChange={(e) => handleDateChange(e.target.value)}
                required
              />
            </div>

            <div className="form-field">
              <label id="tx-status-label">{t('tx.modal.statusLabel')}</label>
              <div
                className="seg-group seg-stack"
                role="radiogroup"
                aria-labelledby="tx-status-label"
              >
                <button
                  type="button"
                  role="radio"
                  aria-checked={status === 'paid'}
                  className={`seg-btn ${status === 'paid' ? 'active' : ''}`}
                  onClick={() => handleStatusChange('paid')}
                >
                  <CheckCircle2 size={15} />{' '}
                  {type === 'income' ? t('tx.modal.alreadyReceived') : t('tx.modal.alreadyPaid')}
                </button>
                <button
                  type="button"
                  role="radio"
                  aria-checked={status === 'pending'}
                  className={`seg-btn tone-warn ${status === 'pending' ? 'active' : ''}`}
                  onClick={() => handleStatusChange('pending')}
                >
                  <Clock size={15} />{' '}
                  {type === 'income' ? t('tx.modal.toReceive') : t('tx.modal.toPay')}
                </button>
              </div>
              {!statusChosenManually && date > localTodayStr(0) && (
                <span className="field-hint">{t('tx.modal.futureDateHint')}</span>
              )}
            </div>
          </div>

          <div className="form-field">
            <label id="tx-acc-label" htmlFor={accounts.length > 4 ? 'tx-acc' : undefined}>
              {t('tx.modal.accountLabel')}
            </label>
            {accounts.length > 4 ? (
              <select
                id="tx-acc"
                value={accountId}
                onChange={(e) => handleAccountChange(e.target.value)}
              >
                {accounts.map((a) => (
                  <option key={a.id} value={a.id}>
                    {a.name} ({accountCurrency(a)})
                  </option>
                ))}
              </select>
            ) : (
              <div className="chip-grid" role="radiogroup" aria-labelledby="tx-acc-label">
                {accounts.map((a) => {
                  const isSelected = a.id === accountId;
                  return (
                    <button
                      key={a.id}
                      type="button"
                      role="radio"
                      aria-checked={isSelected}
                      className={`chip ${isSelected ? 'active' : ''}`}
                      onClick={() => handleAccountChange(a.id)}
                    >
                      <span className="chip-dot" style={{ backgroundColor: a.color }} />
                      <span>{a.name}</span>
                      <span className="chip-tag">{accountCurrency(a)}</span>
                    </button>
                  );
                })}
              </div>
            )}
          </div>

          {!isEdit && (
            <div className="form-field">
              <label id="tx-repeat-label">
                <Repeat size={13} style={{ display: 'inline', marginRight: 4 }} />
                {t('tx.modal.repeatLabel')}
              </label>
              <div className="seg-group" role="radiogroup" aria-labelledby="tx-repeat-label">
                {REPEAT_OPTIONS.map((n) => (
                  <button
                    key={n}
                    type="button"
                    role="radio"
                    aria-checked={repeatMonths === n}
                    className={`seg-btn ${repeatMonths === n ? 'active' : ''}`}
                    onClick={() => setRepeatMonths(n)}
                  >
                    {n === 1 ? t('tx.modal.noRepeat') : `${n}×`}
                  </button>
                ))}
                <input
                  type="number"
                  min={2}
                  max={36}
                  className={`seg-input ${!REPEAT_OPTIONS.includes(repeatMonths) ? 'active' : ''}`}
                  value={REPEAT_OPTIONS.includes(repeatMonths) ? '' : repeatMonths}
                  onChange={(e) => {
                    const n = Math.max(1, Math.min(36, Number(e.target.value) || 1));
                    setRepeatMonths(n);
                  }}
                  placeholder={t('tx.modal.repeatOtherPlaceholder')}
                  aria-label={t('tx.modal.repeatOtherAria')}
                />
              </div>
              {repeatMonths > 1 && (
                <span className="field-hint">
                  {amountIsValid
                    ? t('tx.modal.repeatSummaryWithAmount', {
                        count: repeatMonths,
                        amount: formatMoney(parsedAmount, currency),
                        lastMonth: formatMonthYearLabel(
                          addMonthsToDateStr(date, repeatMonths - 1).slice(0, 7)
                        ),
                      })
                    : t('tx.modal.repeatSummary', {
                        count: repeatMonths,
                        lastMonth: formatMonthYearLabel(
                          addMonthsToDateStr(date, repeatMonths - 1).slice(0, 7)
                        ),
                      })}
                </span>
              )}
            </div>
          )}

          <div className="form-field">
            <label htmlFor="tx-notes">
              {t('tx.modal.notesLabel')}{' '}
              <span className="label-optional">{t('tx.modal.optional')}</span>
            </label>
            <input
              id="tx-notes"
              type="text"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder={t('tx.modal.notesPlaceholder')}
            />
          </div>

          <footer className="modal-footer">
            <button type="button" className="btn-secondary" onClick={onClose}>
              {t('tx.common.cancel')}
            </button>

            <button type="submit" className="btn-primary">
              {isEdit
                ? t('tx.modal.saveChanges')
                : repeatMonths > 1
                  ? t('tx.modal.generateMultiple', { count: repeatMonths })
                  : t('tx.modal.saveSingle')}
            </button>
          </footer>
        </form>
      </div>
    </div>
  );
};
