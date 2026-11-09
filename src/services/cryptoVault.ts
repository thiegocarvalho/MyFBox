import { assertValidEnvelope, sanitizeVaultPayload } from '../domain/validation';
import type { CryptoSession, EncryptedVaultEnvelope, VaultPayload } from '../types/finance';

export {
  deleteEncryptedVaultFromDisk,
  loadEncryptedEnvelopeFromDisk,
  saveEncryptedEnvelopeToDisk,
} from './vaultStorage';

export const PBKDF2_ITERATIONS = 600_000;
const VERIFIER_PLAINTEXT = 'MYFBOX_VAULT_VERIFIER_V1_OK';
const FINGERPRINT_DOMAIN = 'MYFBOX_KEY_FINGERPRINT_V2';
const SALT_BYTE_LENGTH = 16;
const GCM_IV_BYTE_LENGTH = 12;

function bytesToBase64(bytes: Uint8Array): string {
  let binary = '';
  const chunkSize = 0x8000;
  for (let i = 0; i < bytes.length; i += chunkSize) {
    const chunk = bytes.subarray(i, i + chunkSize);
    binary += String.fromCharCode(...chunk);
  }
  return btoa(binary);
}

function base64ToBytes(base64: string): Uint8Array {
  const binary = atob(base64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) {
    bytes[i] = binary.charCodeAt(i);
  }
  return bytes;
}

function toArrayBuffer(bytes: Uint8Array): ArrayBuffer {
  return bytes.buffer.slice(bytes.byteOffset, bytes.byteOffset + bytes.byteLength) as ArrayBuffer;
}

export async function deriveAesGcmKey(
  password: string,
  salt: Uint8Array,
  iterations: number = PBKDF2_ITERATIONS
): Promise<{ key: CryptoKey; keyFingerprint: string }> {
  const encoder = new TextEncoder();
  const baseKey = await crypto.subtle.importKey(
    'raw',
    encoder.encode(password),
    { name: 'PBKDF2' },
    false,
    ['deriveBits']
  );

  const bits = new Uint8Array(
    await crypto.subtle.deriveBits(
      { name: 'PBKDF2', salt: toArrayBuffer(salt), iterations, hash: 'SHA-256' },
      baseKey,
      256
    )
  );

  try {
    const key = await crypto.subtle.importKey(
      'raw',
      toArrayBuffer(bits),
      { name: 'AES-GCM', length: 256 },
      false,
      ['encrypt', 'decrypt']
    );

    const domain = encoder.encode(FINGERPRINT_DOMAIN);
    const fpInput = new Uint8Array(domain.length + bits.length);
    fpInput.set(domain, 0);
    fpInput.set(bits, domain.length);
    const digest = new Uint8Array(await crypto.subtle.digest('SHA-256', toArrayBuffer(fpInput)));
    fpInput.fill(0);
    const hex = Array.from(digest.slice(0, 4))
      .map((b) => b.toString(16).padStart(2, '0').toUpperCase())
      .join('');
    return { key, keyFingerprint: `${hex.slice(0, 4)}·${hex.slice(4, 8)}` };
  } finally {
    bits.fill(0);
  }
}

export function needsKdfUpgrade(session: CryptoSession): boolean {
  return session.iterations < PBKDF2_ITERATIONS;
}

export async function encryptPayloadToEnvelope(
  payload: VaultPayload,
  session: CryptoSession
): Promise<EncryptedVaultEnvelope> {
  const encoder = new TextEncoder();
  const iv = crypto.getRandomValues(new Uint8Array(GCM_IV_BYTE_LENGTH));
  const verifierIv = crypto.getRandomValues(new Uint8Array(GCM_IV_BYTE_LENGTH));

  const plaintextBytes = encoder.encode(JSON.stringify(payload));
  const ciphertextBuffer = await crypto.subtle.encrypt(
    { name: 'AES-GCM', iv: toArrayBuffer(iv) },
    session.key,
    toArrayBuffer(plaintextBytes)
  );

  const verifierBytes = encoder.encode(VERIFIER_PLAINTEXT);
  const verifierCipherBuffer = await crypto.subtle.encrypt(
    { name: 'AES-GCM', iv: toArrayBuffer(verifierIv) },
    session.key,
    toArrayBuffer(verifierBytes)
  );

  const now = new Date().toISOString();

  return {
    app: 'MyFBox',
    formatVersion: 1,
    createdAt: session.createdAt || now,
    updatedAt: now,
    kdf: {
      algorithm: 'PBKDF2-HMAC-SHA256',
      iterations: session.iterations,
      saltBase64: bytesToBase64(session.salt),
    },
    cipher: {
      algorithm: 'AES-256-GCM',
      ivBase64: bytesToBase64(iv),
      ciphertextBase64: bytesToBase64(new Uint8Array(ciphertextBuffer)),
    },
    verifier: {
      ivBase64: bytesToBase64(verifierIv),
      ciphertextBase64: bytesToBase64(new Uint8Array(verifierCipherBuffer)),
    },
    keyFingerprint: session.keyFingerprint,
  };
}

export async function unlockEnvelopeWithPassword(
  envelope: EncryptedVaultEnvelope,
  password: string
): Promise<{ payload: VaultPayload; session: CryptoSession; normalized: boolean }> {
  assertValidEnvelope(envelope);

  const salt = base64ToBytes(envelope.kdf.saltBase64);
  if (salt.byteLength < SALT_BYTE_LENGTH) {
    throw new Error('Sal criptográfico inválido no envelope.');
  }

  const iterations = envelope.kdf.iterations;
  const { key, keyFingerprint } = await deriveAesGcmKey(password, salt, iterations);
  const decoder = new TextDecoder();

  try {
    const verifierIv = base64ToBytes(envelope.verifier.ivBase64);
    if (verifierIv.byteLength !== GCM_IV_BYTE_LENGTH) {
      throw new Error('IV do verificador inválido.');
    }
    const verifierCipher = base64ToBytes(envelope.verifier.ciphertextBase64);
    const verifierPlainBuffer = await crypto.subtle.decrypt(
      { name: 'AES-GCM', iv: toArrayBuffer(verifierIv) },
      key,
      toArrayBuffer(verifierCipher)
    );
    const verifierText = decoder.decode(verifierPlainBuffer);
    if (verifierText !== VERIFIER_PLAINTEXT) {
      throw new Error('Verificador de chave inválido.');
    }
  } catch {
    throw new Error('Senha mestra incorreta ou dados de autenticação inválidos.');
  }

  try {
    const cipherIv = base64ToBytes(envelope.cipher.ivBase64);
    if (cipherIv.byteLength !== GCM_IV_BYTE_LENGTH) {
      throw new Error('IV do bloco de dados inválido.');
    }
    const ciphertext = base64ToBytes(envelope.cipher.ciphertextBase64);
    const plainBuffer = await crypto.subtle.decrypt(
      { name: 'AES-GCM', iv: toArrayBuffer(cipherIv) },
      key,
      toArrayBuffer(ciphertext)
    );
    const jsonText = decoder.decode(plainBuffer);
    const parsed = JSON.parse(jsonText) as unknown;
    const { payload, changed } = sanitizeVaultPayload(parsed);

    return {
      payload,
      normalized: changed,
      session: {
        key,
        salt,
        iterations,
        keyFingerprint,
        unlockedAt: Date.now(),
        createdAt: envelope.createdAt,
      },
    };
  } catch {
    throw new Error('Falha ao descriptografar o cofre financeiro (AES-256-GCM tag mismatch).');
  }
}

export async function createNewCryptoSession(password: string): Promise<CryptoSession> {
  const salt = crypto.getRandomValues(new Uint8Array(SALT_BYTE_LENGTH));
  const { key, keyFingerprint } = await deriveAesGcmKey(password, salt, PBKDF2_ITERATIONS);
  return {
    key,
    salt,
    iterations: PBKDF2_ITERATIONS,
    keyFingerprint,
    unlockedAt: Date.now(),
    createdAt: new Date().toISOString(),
  };
}
