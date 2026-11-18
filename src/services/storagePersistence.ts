export type StoragePersistStatus = 'persisted' | 'not-persisted' | 'unsupported';

export async function getStoragePersistStatus(): Promise<StoragePersistStatus> {
  if (window.myfboxDesktop?.vault) return 'persisted';
  if (!navigator.storage?.persisted) return 'unsupported';
  try {
    return (await navigator.storage.persisted()) ? 'persisted' : 'not-persisted';
  } catch {
    return 'unsupported';
  }
}

export async function requestPersistentStorage(): Promise<StoragePersistStatus> {
  const current = await getStoragePersistStatus();
  if (current !== 'not-persisted' || !navigator.storage?.persist) return current;
  try {
    return (await navigator.storage.persist()) ? 'persisted' : 'not-persisted';
  } catch {
    return 'not-persisted';
  }
}
