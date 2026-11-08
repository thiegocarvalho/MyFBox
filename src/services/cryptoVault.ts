import type { CryptoSession, EncryptedVaultEnvelope, VaultPayload } from '../types/finance';

const DB_NAME = 'myfbox_encrypted_vault_db';
const DB_VERSION = 1;
const STORE_NAME = 'vault_store';
const PRIMARY_VAULT_KEY = 'primary_vault';
// OWASP (2023+) recomenda >= 600.000 iterações para PBKDF2-HMAC-SHA256.
// O número fica gravado no envelope, então cofres antigos (310.000) continuam abrindo.
export const PBKDF2_ITERATIONS = 600_000;
const VERIFIER_PLAINTEXT = 'MYFBOX_VAULT_VERIFIER_V1_OK';

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

/**
 * Deriva a chave AES-256-GCM da senha com UMA derivação PBKDF2 (deriveBits) e calcula
 * a "impressão da chave" a partir dessa mesma saída forte.
 *
 * Compatibilidade: deriveBits(256) + importKey('raw', AES-GCM) produz exatamente a mesma
 * chave que deriveKey(PBKDF2 → AES-GCM 256) usado nas versões anteriores, então cofres e
 * backups antigos continuam abrindo. Só o valor exibido da impressão muda.
 *
 * Segurança: versões antigas calculavam a impressão com uma derivação separada de apenas
 * 10 mil iterações e a gravavam no envelope, o que permitia testar senhas offline ~31x mais
 * rápido. Agora a impressão é SHA-256(domínio || chave derivada), sem atalho.
 */
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
      false, // chave não extraível em memória
      ['encrypt', 'decrypt']
    );

    const domain = encoder.encode('MYFBOX_KEY_FINGERPRINT_V2');
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
    bits.fill(0); // não deixa a chave bruta na memória além do necessário
  }
}

/** Cofres com menos iterações que o padrão atual devem ser recifrados no desbloqueio. */
export function needsKdfUpgrade(session: CryptoSession): boolean {
  return session.iterations < PBKDF2_ITERATIONS;
}

export async function encryptPayloadToEnvelope(
  payload: VaultPayload,
  session: CryptoSession
): Promise<EncryptedVaultEnvelope> {
  const encoder = new TextEncoder();
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const verifierIv = crypto.getRandomValues(new Uint8Array(12));

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
): Promise<{ payload: VaultPayload; session: CryptoSession }> {
  if (!envelope || envelope.app !== 'MyFBox' || !envelope.kdf || !envelope.cipher) {
    throw new Error('Formato de cofre inválido ou corrompido.');
  }

  const salt = base64ToBytes(envelope.kdf.saltBase64);
  const iterations = envelope.kdf.iterations || PBKDF2_ITERATIONS;
  const { key, keyFingerprint } = await deriveAesGcmKey(password, salt, iterations);

  const decoder = new TextDecoder();

  // First verify the verifier block
  try {
    const verifierIv = base64ToBytes(envelope.verifier.ivBase64);
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

  // Now decrypt the actual financial vault payload
  try {
    const cipherIv = base64ToBytes(envelope.cipher.ivBase64);
    const ciphertext = base64ToBytes(envelope.cipher.ciphertextBase64);
    const plainBuffer = await crypto.subtle.decrypt(
      { name: 'AES-GCM', iv: toArrayBuffer(cipherIv) },
      key,
      toArrayBuffer(ciphertext)
    );
    const jsonText = decoder.decode(plainBuffer);
    const payload = JSON.parse(jsonText) as VaultPayload;

    return {
      payload,
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
  const salt = crypto.getRandomValues(new Uint8Array(16));
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

// IndexedDB Persistence Layer
function openVaultDB(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);
    request.onupgradeneeded = () => {
      const db = request.result;
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        db.createObjectStore(STORE_NAME);
      }
    };
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

export async function loadEncryptedEnvelopeFromDisk(): Promise<EncryptedVaultEnvelope | null> {
  const db = await openVaultDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, 'readonly');
    const store = tx.objectStore(STORE_NAME);
    const req = store.get(PRIMARY_VAULT_KEY);
    req.onsuccess = () => {
      db.close();
      resolve((req.result as EncryptedVaultEnvelope) || null);
    };
    req.onerror = () => {
      db.close();
      reject(req.error);
    };
  });
}

export async function saveEncryptedEnvelopeToDisk(envelope: EncryptedVaultEnvelope): Promise<void> {
  const db = await openVaultDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, 'readwrite');
    const store = tx.objectStore(STORE_NAME);
    store.put(envelope, PRIMARY_VAULT_KEY);
    tx.oncomplete = () => {
      db.close();
      resolve();
    };
    tx.onerror = () => {
      db.close();
      reject(tx.error);
    };
  });
}

export async function deleteEncryptedVaultFromDisk(): Promise<void> {
  const db = await openVaultDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, 'readwrite');
    const store = tx.objectStore(STORE_NAME);
    store.delete(PRIMARY_VAULT_KEY);
    tx.oncomplete = () => {
      db.close();
      resolve();
    };
    tx.onerror = () => {
      db.close();
      reject(tx.error);
    };
  });
}
