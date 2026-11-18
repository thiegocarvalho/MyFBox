import { describe, expect, it } from 'vitest';
import {
  assertValidEnvelope,
  MAX_PBKDF2_ITERATIONS,
  MIN_PBKDF2_ITERATIONS,
  sanitizeVaultPayload,
} from './validation';
import type { EncryptedVaultEnvelope } from '../types/finance';

function validEnvelope(): EncryptedVaultEnvelope {
  return {
    app: 'MyFBox',
    formatVersion: 1,
    createdAt: '2026-11-18T12:00:00Z',
    updatedAt: '2026-11-18T12:00:00Z',
    kdf: {
      algorithm: 'PBKDF2-HMAC-SHA256',
      iterations: 600_000,
      saltBase64: 'c2FsdA==',
    },
    cipher: {
      algorithm: 'AES-256-GCM',
      ivBase64: 'aXY=',
      ciphertextBase64: 'Y2lwaGVy',
    },
    verifier: {
      ivBase64: 'dml2',
      ciphertextBase64: 'dmVy',
    },
    keyFingerprint: '1234abcd',
  };
}

describe('domain/validation', () => {
  it('valida envelope correto e rejeita parâmetros KDF/cipher inválidos', () => {
    expect(() => assertValidEnvelope(validEnvelope())).not.toThrow();
    expect(() => assertValidEnvelope(null)).toThrow(/inválido/);
    expect(() => assertValidEnvelope({ ...validEnvelope(), app: 'Other' })).toThrow(/inválido/);
    expect(() =>
      assertValidEnvelope({
        ...validEnvelope(),
        kdf: { algorithm: 'PBKDF2-HMAC-SHA256', iterations: MIN_PBKDF2_ITERATIONS - 1, saltBase64: 'x' },
      })
    ).toThrow(/limites/);
    expect(() =>
      assertValidEnvelope({
        ...validEnvelope(),
        kdf: { algorithm: 'PBKDF2-HMAC-SHA256', iterations: MAX_PBKDF2_ITERATIONS + 1, saltBase64: 'x' },
      })
    ).toThrow(/limites/);
    expect(() =>
      assertValidEnvelope({
        ...validEnvelope(),
        cipher: { algorithm: 'AES-128-CBC', ivBase64: 'a', ciphertextBase64: 'b' },
      })
    ).toThrow(/criptográfico/);
  });

  it('rejeita payload sem estrutura ou coleções obrigatórias', () => {
    expect(() => sanitizeVaultPayload(null)).toThrow(/inválida/);
    expect(() => sanitizeVaultPayload({ accounts: [] })).toThrow(/ausentes/);
  });

  it('sanitiza contas, categorias e lançamentos corrompidos preservando os válidos', () => {
    const { payload, changed } = sanitizeVaultPayload({
      accounts: [
        { id: '', name: 'Inválida' },
        { id: 'acc-1', name: ' Nubank ', type: 'checking', initialBalance: 500, currency: 'brl' },
        { id: 'acc-2', name: '', type: 'unknown', initialBalance: Number.NaN },
      ],
      categories: [
        { id: 'cat-1', name: 'Mercado', type: 'expense', color: '#ff0000' },
      ],
      transactions: [
        {
          id: 'tx-1',
          type: 'expense',
          amount: 120.5,
          description: 'Compras',
          date: '2026-11-18',
          categoryId: 'cat-1',
          accountId: 'acc-1',
          status: 'paid',
        },
        { id: 'tx-bad', amount: -5 },
      ],
      settings: { autoLockMinutes: 15 },
    });

    expect(changed).toBe(true);
    expect(payload.accounts).toHaveLength(2);
    expect(payload.accounts[0].name).toBe('Nubank');
    expect(payload.accounts[0].currency).toBe('BRL');
    expect(payload.accounts[1].type).toBe('checking');
    expect(payload.accounts[1].initialBalance).toBe(0);
    expect(payload.transactions).toHaveLength(1);
    expect(payload.transactions[0].id).toBe('tx-1');
  });
});
