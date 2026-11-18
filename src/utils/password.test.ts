import { describe, expect, it } from 'vitest';
import { formatCrackTime, passwordStrength } from './password';

describe('utils/password', () => {
  it('classifica senhas fracas e fortes com estimativa de entropia', () => {
    const weak = passwordStrength('123456');
    expect(weak.score).toBeLessThan(3);

    const strong = passwordStrength('M!nhaS3nha#MuitoLonga2026');
    expect(strong.score).toBeGreaterThanOrEqual(3);
    expect(strong.crackTimeSeconds).toBeGreaterThan(3600);
    expect(strong.checks.hasSymbol).toBe(true);
  });

  it('formata tempos de quebra de forma legível', () => {
    expect(formatCrackTime(0.5)).toBe('Instantâneo');
    expect(formatCrackTime(120)).toContain('min');
  });
});
