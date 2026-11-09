import { getCurrencySymbol } from '../services/currencyService';
import type { Currency } from '../types/finance';

const MONTHS_SHORT = [
  'Jan',
  'Fev',
  'Mar',
  'Abr',
  'Mai',
  'Jun',
  'Jul',
  'Ago',
  'Set',
  'Out',
  'Nov',
  'Dez',
] as const;

const MONTHS_FULL = [
  'Janeiro',
  'Fevereiro',
  'Março',
  'Abril',
  'Maio',
  'Junho',
  'Julho',
  'Agosto',
  'Setembro',
  'Outubro',
  'Novembro',
  'Dezembro',
] as const;

export function formatMoney(
  value: number,
  currency: Currency = 'BRL',
  hideValues: boolean = false
): string {
  if (hideValues) {
    const sym = getCurrencySymbol(currency) || currency;
    return `${sym} •••••`;
  }
  try {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency,
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(value);
  } catch {
    const sym = getCurrencySymbol(currency) || currency;
    return `${sym} ${value.toLocaleString('pt-BR', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    })}`;
  }
}

export function formatBRL(value: number, hideValues: boolean = false): string {
  return formatMoney(value, 'BRL', hideValues);
}

export function formatShortDate(dateStr: string): string {
  if (!dateStr || !/^\d{4}-\d{2}-\d{2}/.test(dateStr)) return dateStr;
  const [, month, day] = dateStr.split('-');
  const mIndex = parseInt(month, 10) - 1;
  return `${day} ${MONTHS_SHORT[mIndex] || month}`;
}

export function formatFullDateBR(dateStr: string): string {
  if (!dateStr || !/^\d{4}-\d{2}-\d{2}/.test(dateStr)) return dateStr;
  const [year, month, day] = dateStr.split('-');
  return `${day}/${month}/${year}`;
}

export function formatMonthYearLabel(yearMonth: string): string {
  const [year, month] = yearMonth.split('-').map(Number);
  return `${MONTHS_FULL[(month || 1) - 1]} ${year}`;
}

export function shiftYearMonth(yearMonth: string, deltaMonths: number): string {
  const [year, month] = yearMonth.split('-').map(Number);
  const d = new Date(year, month - 1 + deltaMonths, 1);
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  return `${y}-${m}`;
}

export function getCurrentYearMonth(): string {
  const now = new Date();
  const y = now.getFullYear();
  const m = String(now.getMonth() + 1).padStart(2, '0');
  return `${y}-${m}`;
}

export function localTodayStr(offsetDays: number = 0): string {
  const d = new Date();
  if (offsetDays !== 0) {
    d.setDate(d.getDate() + offsetDays);
  }
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

export function addMonthsToDateStr(dateStr: string, monthsToAdd: number): string {
  const [y, m, d] = dateStr.split('-').map(Number);
  const targetMonthDate = new Date(y, m - 1 + monthsToAdd, 1);
  const maxDayInTargetMonth = new Date(
    targetMonthDate.getFullYear(),
    targetMonthDate.getMonth() + 1,
    0
  ).getDate();
  const clampedDay = Math.min(d, maxDayInTargetMonth);
  const finalY = targetMonthDate.getFullYear();
  const finalM = String(targetMonthDate.getMonth() + 1).padStart(2, '0');
  const finalD = String(clampedDay).padStart(2, '0');
  return `${finalY}-${finalM}-${finalD}`;
}
