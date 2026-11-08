/**
 * Armazenamento persistente: sem isso, o navegador pode apagar o IndexedDB do app
 * (onde fica o cofre cifrado) quando o disco fica cheio. Com `persist()` concedido,
 * os dados só saem se o usuário limpar os dados do site.
 */
export type StoragePersistStatus = 'persisted' | 'not-persisted' | 'unsupported';

export async function getStoragePersistStatus(): Promise<StoragePersistStatus> {
  if (!navigator.storage?.persisted) return 'unsupported';
  try {
    return (await navigator.storage.persisted()) ? 'persisted' : 'not-persisted';
  } catch {
    return 'unsupported';
  }
}

/** Pede ao navegador para não apagar os dados. Alguns navegadores perguntam ao usuário. */
export async function requestPersistentStorage(): Promise<StoragePersistStatus> {
  const current = await getStoragePersistStatus();
  if (current !== 'not-persisted' || !navigator.storage?.persist) return current;
  try {
    return (await navigator.storage.persist()) ? 'persisted' : 'not-persisted';
  } catch {
    return 'not-persisted';
  }
}
