import type { EncryptedVaultEnvelope } from '../types/finance';

export interface VaultStorageAdapter {
  load(): Promise<EncryptedVaultEnvelope | null>;
  save(envelope: EncryptedVaultEnvelope): Promise<void>;
  delete(): Promise<void>;
}

const DB_NAME = 'myfbox_encrypted_vault_db';
const DB_VERSION = 1;
const STORE_NAME = 'vault_store';
const PRIMARY_VAULT_KEY = 'primary_vault';

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

const indexedDbVaultStorageAdapter: VaultStorageAdapter = {
  async load() {
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
  },
  async save(envelope) {
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
  },
  async delete() {
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
  },
};

export function resolveVaultStorageAdapter(): VaultStorageAdapter {
  const desktopVault = typeof window !== 'undefined' ? window.myfboxDesktop?.vault : undefined;
  if (desktopVault) {
    return desktopVault;
  }
  return indexedDbVaultStorageAdapter;
}

export async function loadEncryptedEnvelopeFromDisk(): Promise<EncryptedVaultEnvelope | null> {
  return resolveVaultStorageAdapter().load();
}

export async function saveEncryptedEnvelopeToDisk(
  envelope: EncryptedVaultEnvelope
): Promise<void> {
  await resolveVaultStorageAdapter().save(envelope);
}

export async function deleteEncryptedVaultFromDisk(): Promise<void> {
  await resolveVaultStorageAdapter().delete();
}
