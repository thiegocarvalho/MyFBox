import type { EncryptedVaultEnvelope } from '../types/finance';

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

export async function loadEncryptedEnvelopeFromDisk(): Promise<EncryptedVaultEnvelope | null> {
  if (window.myfboxDesktop?.vault) {
    return window.myfboxDesktop.vault.load();
  }
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

export async function saveEncryptedEnvelopeToDisk(
  envelope: EncryptedVaultEnvelope
): Promise<void> {
  if (window.myfboxDesktop?.vault) {
    await window.myfboxDesktop.vault.save(envelope);
    return;
  }
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
  if (window.myfboxDesktop?.vault) {
    await window.myfboxDesktop.vault.delete();
    return;
  }
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
