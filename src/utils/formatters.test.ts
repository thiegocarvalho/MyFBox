import { describe, it, expect, beforeEach } from 'vitest';
import { setActiveLanguage } from '../i18n';
import {
  formatFullDateBR,
  formatMoney,
  formatMonthYearLabel,
  formatShortDate,
} from './formatters';

describe('regional formatters across supported locales', () => {
  beforeEach(() => {
    setActiveLanguage('pt-BR');
  });

  it('formats month/year label according to active language', () => {
    setActiveLanguage('pt-BR');
    expect(formatMonthYearLabel('2026-03').toLowerCase()).toContain('mar');

    setActiveLanguage('en-GB');
    expect(formatMonthYearLabel('2026-03').toLowerCase()).toContain('march');

    setActiveLanguage('es');
    expect(formatMonthYearLabel('2026-03').toLowerCase()).toContain('marzo');

    setActiveLanguage('zh-CN');
    expect(formatMonthYearLabel('2026-03')).toMatch(/2026.*3/);
  });

  it('formats short and full dates according to active language', () => {
    setActiveLanguage('pt-BR');
    expect(formatFullDateBR('2026-05-09')).toBe('09/05/2026');
    expect(formatShortDate('2026-05-09').toLowerCase()).toContain('mai');

    setActiveLanguage('en-GB');
    expect(formatFullDateBR('2026-05-09')).toBe('09/05/2026');
    expect(formatShortDate('2026-05-09').toLowerCase()).toContain('may');

    setActiveLanguage('zh-CN');
    expect(formatFullDateBR('2026-05-09')).toMatch(/2026.*5.*9/);
  });

  it('formats money with locale-appropriate separators', () => {
    setActiveLanguage('pt-BR');
    expect(formatMoney(1234.5, 'BRL')).toContain('1.234,50');

    setActiveLanguage('en-GB');
    expect(formatMoney(1234.5, 'GBP')).toContain('1,234.50');

    setActiveLanguage('pt-BR');
    expect(formatMoney(1234.5, 'USD', true)).toBe('US$ •••••');
  });
});
