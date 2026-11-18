import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { afterEach, describe, expect, it } from 'vitest';
import { assertValidEnvelope, NativeVaultStore } from './vaultStore';
import type { EncryptedVaultEnvelope } from '../src/types/vaultEnvelope';

function makeValidEnvelope(): EncryptedVaultEnvelope {
  return {
    app: 'MyFBox',
    formatVersion: 1,
    createdAt: '2026-11-18T12:00:00.000Z',
    updatedAt: '2026-11-18T12:00:00.000Z',
    kdf: {
      algorithm: 'PBKDF2-HMAC-SHA256',
      iterations: 600000,
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
    keyFingerprint: 'abcd1234',
  };
}

describe('electron/vaultStore', () => {
  const tempDirs: string[] = [];

  afterEach(async () => {
    await Promise.all(tempDirs.map((dir) => fs.rm(dir, { recursive: true, force: true })));
    tempDirs.length = 0;
  });

  it('rejeita envelopes inválidos', () => {
    expect(() => assertValidEnvelope(null)).toThrow();
    expect(() => assertValidEnvelope({ app: 'Outro', formatVersion: 1 })).toThrow();
    expect(() =>
      assertValidEnvelope({ ...makeValidEnvelope(), kdf: { algorithm: 'MD5', iterations: 1, saltBase64: 'x' } })
    ).toThrow();
  });

  it('salva, lê, informa e apaga o cofre atomicamente com permissão 0600', async () => {
    const dir = await fs.mkdtemp(path.join(os.tmpdir(), 'myfbox-vault-test-'));
    tempDirs.push(dir);
    const store = new NativeVaultStore(dir);

    expect(await store.load()).toBeNull();
    expect((await store.info()).exists).toBe(false);

    const envelope = makeValidEnvelope();
    await store.save(envelope);

    const info = await store.info();
    expect(info.exists).toBe(true);
    expect(await store.load()).toEqual(envelope);

    if (process.platform !== 'win32') {
      const stat = await fs.stat(info.filePath);
      expect(stat.mode & 0o777).toBe(0o600);
    }

    await store.delete();
    expect(await store.load()).toBeNull();
  });
});
