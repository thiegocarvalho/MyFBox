import { t } from '../i18n';

export interface PasswordStrengthResult {
  score: number;
  label: string;
  crackTimeText: string;
  crackTimeSeconds: number;
  tip: string;
  checks: {
    minLength: boolean;
    hasLower: boolean;
    hasUpper: boolean;
    hasNumber: boolean;
    hasSymbol: boolean;
  };
}

const COMMON_WEAK_PASSWORDS = new Set([
  '123456',
  '12345678',
  '123456789',
  '12345',
  '1234567',
  'password',
  'senha',
  'senha123',
  'senhamestra',
  'admin',
  'admin123',
  'qwerty',
  '111111',
  '000000',
  'teste',
  'teste123',
  'brasil',
  'financeiro',
  'myfbox',
  'padrao',
  'master',
]);

export function formatCrackTime(seconds: number): string {
  if (!Number.isFinite(seconds)) return t('lock.crackTime.billionsYears');
  if (seconds <= 1) return t('lock.crackTime.instant');
  if (seconds < 60) return t('lock.crackTime.seconds', { count: Math.max(1, Math.round(seconds)) });

  const minutes = Math.round(seconds / 60);
  if (minutes < 60) return t('lock.crackTime.minutes', { count: minutes });

  const hours = Math.round(seconds / 3600);
  if (hours < 24) return t('lock.crackTime.hours', { count: hours });

  const days = Math.round(seconds / 86400);
  if (days < 30) {
    return t(days === 1 ? 'lock.crackTime.daySingular' : 'lock.crackTime.dayPlural', {
      count: days,
    });
  }

  const months = Math.round(seconds / (86400 * 30.44));
  if (months < 12) {
    return t(months === 1 ? 'lock.crackTime.monthSingular' : 'lock.crackTime.monthPlural', {
      count: months,
    });
  }

  const years = Math.round(seconds / (86400 * 365.25));
  if (years < 100) {
    return t(years === 1 ? 'lock.crackTime.yearSingular' : 'lock.crackTime.yearPlural', {
      count: years,
    });
  }
  if (years < 1000) return t('lock.crackTime.hundredsYears');
  if (years < 10_000) return t('lock.crackTime.thousandYears', { count: Math.round(years / 1000) });
  if (years < 1_000_000) return t('lock.crackTime.hundredThousandsYears');
  if (years < 1_000_000_000) return t('lock.crackTime.millionsYears');
  return t('lock.crackTime.billionsYears');
}

export function passwordStrength(pw: string): PasswordStrengthResult {
  const emptyChecks = {
    minLength: false,
    hasLower: false,
    hasUpper: false,
    hasNumber: false,
    hasSymbol: false,
  };

  if (!pw) {
    return {
      score: 0,
      label: '',
      crackTimeText: '',
      crackTimeSeconds: 0,
      tip: '',
      checks: emptyChecks,
    };
  }

  const lower = /[a-z]/.test(pw);
  const upper = /[A-Z]/.test(pw);
  const number = /\d/.test(pw);
  const symbol = /[^A-Za-z0-9]/.test(pw);
  const minLength = pw.length >= 8;

  const checks = {
    minLength,
    hasLower: lower,
    hasUpper: upper,
    hasNumber: number,
    hasSymbol: symbol,
  };

  const normalized = pw.trim().toLowerCase();
  const isRepetition = /^(.)\1+$/.test(pw);
  const isNumericSequence = /^(0123456789|123456789|9876543210|123456|654321)$/.test(pw);
  const isCommon = COMMON_WEAK_PASSWORDS.has(normalized);

  if (isRepetition || isNumericSequence || isCommon) {
    return {
      score: 0,
      label: t('lock.strength.0'),
      crackTimeText: t('lock.crackTime.instant'),
      crackTimeSeconds: 0.1,
      tip: t('lock.strength.tipCommon'),
      checks,
    };
  }

  let poolSize = 0;
  if (lower) poolSize += 26;
  if (upper) poolSize += 26;
  if (number) poolSize += 10;
  if (symbol) poolSize += 32;
  if (poolSize === 0) poolSize = 10;

  const GUESSES_PER_SEC = 100_000;
  const logCombos = pw.length * Math.log10(poolSize);
  const logGuessesPerSec = Math.log10(GUESSES_PER_SEC);
  const logSeconds = logCombos - logGuessesPerSec;

  let seconds = 0;
  if (logSeconds <= 0) {
    seconds = Math.max(0.1, Math.pow(10, logSeconds));
  } else if (logSeconds < 16) {
    seconds = Math.pow(10, logSeconds);
  } else {
    seconds = Infinity;
  }

  if (pw.length < 6) {
    return {
      score: 0,
      label: t('lock.strength.0'),
      crackTimeText: formatCrackTime(seconds),
      crackTimeSeconds: seconds,
      tip: t('lock.strength.tipMin6'),
      checks,
    };
  }

  let score = 0;
  let label = t('lock.strength.0');

  if (seconds < 60) {
    score = 0;
    label = t('lock.strength.0');
  } else if (seconds < 86400 * 2) {
    score = 1;
    label = t('lock.strength.1');
  } else if (seconds < 86400 * 365.25 * 5) {
    score = 2;
    label = t('lock.strength.2');
  } else if (seconds < 86400 * 365.25 * 10_000) {
    score = 3;
    label = t('lock.strength.3');
  } else {
    score = 4;
    label = t('lock.strength.4');
  }

  let tip = '';
  if (pw.length < 8) {
    tip = t('lock.strength.tipMin8');
  } else if (pw.length < 12) {
    tip = t('lock.strength.tipGood12');
  } else {
    tip = t('lock.strength.tipStrong');
  }

  return {
    score,
    label,
    crackTimeText: formatCrackTime(seconds),
    crackTimeSeconds: seconds,
    tip,
    checks,
  };
}
