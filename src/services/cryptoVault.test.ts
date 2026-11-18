import { describe, expect, it } from 'vitest';
import {
  createNewCryptoSession,
  encryptPayloadToEnvelope,
  needsKdfUpgrade,
  PBKDF2_ITERATIONS,
  unlockEnvelopeWithPassword,
} from './cryptoVault';
import type { VaultPayload } from '../types/finance';

function samplePayload(): VaultPayload {
  return {
    version: 1,
    updatedAt: '2026-11-18T12:00:00Z',
    accounts: [{ id: 'acc-1', name: 'Conta', type: 'checking', initialBalance: 100, currency: 'BRL', color: '#3b82f6' }],
    categories: [
      { id: 'cat-1', name: 'Outros', type: 'expense', color: '#888888', icon: 'tag', isSystem: true },
      { id: 'cat-2', name: 'Outros', type: 'income', color: '#888888', icon: 'tag', isSystem: true },
    ],
    transactions: [],
    settings: { currency: 'BRL', hideValuesByDefault: false, vaultName: 'Teste', autoLockMinutes: 15 },
  };
}

describe('services/cryptoVault', () => {
  it('cifra e decifra um cofre com AES-256-GCM + PBKDF2-HMAC-SHA256', async () => {
    const session = await createNewCryptoSession('SenhaForte!2026');
    expect(session.iterations).toBe(PBKDF2_ITERATIONS);
    expect(needsKdfUpgrade(session)).toBe(false);

    const payload = samplePayload();
    const envelope = await encryptPayloadToEnvelope(payload, session);
    expect(envelope.app).toBe('MyFBox');
    expect(envelope.cipher.algorithm).toBe('AES-256-GCM');
    expect(envelope.kdf.iterations).toBe(PBKDF2_ITERATIONS);

    const unlocked = await unlockEnvelopeWithPassword(envelope, 'SenhaForte!2026');
    expect(unlocked.payload.accounts[0].name).toBe('Conta');
    expect(unlocked.session.keyFingerprint).toBe(session.keyFingerprint);
  }, 15_000);

  it('rejeita senha mestra incorreta ao tentar abrir o cofre', async () => {
    const session = await createNewCryptoSession('SenhaCerta#123');
    const envelope = await encryptPayloadToEnvelope(samplePayload(), session);

    await expect(unlockEnvelopeWithPassword(envelope, 'SenhaErrada#999')).rejects.toThrow();
  }, 15_000);
});
