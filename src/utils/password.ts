/**
 * Medição de força e tempo estimado de quebra de senha (força bruta / ataque offline).
 * Considera derivação com PBKDF2 (600.000 iterações HMAC-SHA256) do cofre MyFBox.
 */

export interface PasswordStrengthResult {
  score: number; // 0 (Muito fraca) a 4 (Forte)
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

/**
 * Converte segundos estimados de força bruta em texto legível e amigável em português.
 */
export function formatCrackTime(seconds: number): string {
  if (!Number.isFinite(seconds)) {
    return 'Bilhões de anos';
  }
  if (seconds <= 1) {
    return 'Instantâneo';
  }
  if (seconds < 60) {
    return `~${Math.max(1, Math.round(seconds))} s`;
  }

  const minutes = Math.round(seconds / 60);
  if (minutes < 60) {
    return `~${minutes} min`;
  }

  const hours = Math.round(seconds / 3600);
  if (hours < 24) {
    return `~${hours} h`;
  }

  const days = Math.round(seconds / 86400);
  if (days < 30) {
    return `~${days} ${days === 1 ? 'dia' : 'dias'}`;
  }

  const months = Math.round(seconds / (86400 * 30.44));
  if (months < 12) {
    return `~${months} ${months === 1 ? 'mês' : 'meses'}`;
  }

  const years = Math.round(seconds / (86400 * 365.25));
  if (years < 100) {
    return `~${years} ${years === 1 ? 'ano' : 'anos'}`;
  }
  if (years < 1000) {
    return 'Centenas de anos';
  }
  if (years < 10_000) {
    return `~${Math.round(years / 1000)} mil anos`;
  }
  if (years < 1_000_000) {
    return 'Centenas de milhares de anos';
  }
  if (years < 1_000_000_000) {
    return 'Milhões de anos';
  }
  return 'Bilhões de anos';
}

/**
 * Avalia a força da senha mestra e estima o tempo que um ataque de força bruta
 * levaria para descobri-la, considerando uma taxa agressiva de ataque offline.
 */
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

  // Detecção de padrões óbvios e fáceis
  const isRepetition = /^(.)\1+$/.test(pw);
  const isNumericSequence = /^(0123456789|123456789|9876543210|123456|654321)$/.test(pw);
  const isCommon = COMMON_WEAK_PASSWORDS.has(normalized);

  if (isRepetition || isNumericSequence || isCommon) {
    return {
      score: 0,
      label: 'Muito fraca',
      crackTimeText: 'Instantâneo',
      crackTimeSeconds: 0.1,
      tip: 'Evite sequências ou senhas muito comuns.',
      checks,
    };
  }

  // Tamanho do conjunto de caracteres (charset pool)
  let poolSize = 0;
  if (lower) poolSize += 26;
  if (upper) poolSize += 26;
  if (number) poolSize += 10;
  if (symbol) poolSize += 32;
  if (poolSize === 0) poolSize = 10;

  // Taxa de ataque: ~100.000 palpites/segundo
  // (equivalente a cluster de GPUs tentando quebrar PBKDF2-HMAC-SHA256 de 600.000 iterações)
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

  // Se tiver menos de 6 caracteres, é considerada muito fraca para a segurança do cofre
  if (pw.length < 6) {
    return {
      score: 0,
      label: 'Muito fraca',
      crackTimeText: formatCrackTime(seconds),
      crackTimeSeconds: seconds,
      tip: 'A senha precisa de pelo menos 6 caracteres.',
      checks,
    };
  }

  // Atribuição de Score (0 a 4) e rótulo
  // 0: < 60s (Muito fraca)
  // 1: < 2 dias (Fraca)
  // 2: < 5 anos (Razoável)
  // 3: < 10.000 anos (Boa)
  // 4: >= 10.000 anos (Forte)
  let score = 0;
  let label = 'Muito fraca';

  if (seconds < 60) {
    score = 0;
    label = 'Muito fraca';
  } else if (seconds < 86400 * 2) {
    score = 1;
    label = 'Fraca';
  } else if (seconds < 86400 * 365.25 * 5) {
    score = 2;
    label = 'Razoável';
  } else if (seconds < 86400 * 365.25 * 10_000) {
    score = 3;
    label = 'Boa';
  } else {
    score = 4;
    label = 'Forte';
  }

  // Dica contextual para orientar o usuário a fortalecer
  let tip = '';
  if (pw.length < 8) {
    tip = 'Recomendado usar pelo menos 8 a 12 caracteres.';
  } else if (pw.length < 12) {
    tip = 'Boa combinação! Com 12+ caracteres ela se torna virtualmente impossível de quebrar.';
  } else {
    tip = 'Excelente! Senha altamente resistente a ataques de força bruta.';
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
