export type Currency = 'BRL' | 'USD';
export type TransactionType = 'income' | 'expense';
export type TransactionStatus = 'paid' | 'pending';
export type AccountType = 'checking' | 'savings' | 'wallet' | 'investment' | 'credit';

export interface Account {
  id: string;
  name: string;
  type: AccountType;
  initialBalance: number;
  color: string;
  currency?: Currency; // 'BRL' | 'USD', default 'BRL'
  institution?: string;
}

export interface Category {
  id: string;
  name: string;
  type: TransactionType;
  color: string;
  icon: string;
  monthlyBudget?: number; // Orçamento teto mensal para categorias de despesa
}

export interface Transaction {
  id: string;
  description: string;
  amount: number; // valor positivo
  currency?: Currency; // 'BRL' | 'USD', default 'BRL'
  type: TransactionType;
  status: TransactionStatus;
  date: string; // YYYY-MM-DD
  categoryId: string;
  accountId: string;
  notes?: string;
  tags?: string[];
  recurrenceGroupId?: string;
  installmentIndex?: number;
  installmentTotal?: number;
  createdAt: string;
}

export interface VaultSettings {
  currency: string;
  autoLockMinutes: number;
  hideValuesByDefault: boolean;
  vaultName: string;
  usdToBrlRate?: number; // Cotação de conversão opcional
  usdRateUpdatedAt?: string;
}

export interface VaultPayload {
  version: number;
  updatedAt: string;
  accounts: Account[];
  categories: Category[];
  transactions: Transaction[];
  settings: VaultSettings;
}

export interface EncryptedVaultEnvelope {
  app: 'MyFBox';
  formatVersion: 1;
  createdAt: string;
  updatedAt: string;
  kdf: {
    algorithm: 'PBKDF2-HMAC-SHA256';
    iterations: number;
    saltBase64: string;
  };
  cipher: {
    algorithm: 'AES-256-GCM';
    ivBase64: string;
    ciphertextBase64: string;
  };
  verifier: {
    ivBase64: string;
    ciphertextBase64: string;
  };
  keyFingerprint: string;
}

export interface CryptoSession {
  key: CryptoKey;
  salt: Uint8Array;
  iterations: number;
  keyFingerprint: string;
  unlockedAt: number;
  createdAt: string;
}
