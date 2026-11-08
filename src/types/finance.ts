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
  exchangeRate?: number; // Cotação de conversão fixada no momento do lançamento (ex: USD -> BRL)
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
  lastBackupAt?: string; // Data do último download do backup cifrado
  mcpEnabled?: boolean; // Modo MCP local — desligado por padrão
  mcpToken?: string; // Código de pareamento com o servidor MCP local
  mcpPort?: number; // Porta do servidor MCP local (127.0.0.1)
}

export interface VaultPayload {
  version: number;
  updatedAt: string;
  accounts: Account[];
  categories: Category[];
  transactions: Transaction[];
  settings: VaultSettings;
  insights?: MonthInsight[]; // Insights mensais escritos pelo assistente (opcional: cofres antigos não têm)
}

/** Análise de um mês, escrita pelo assistente via MCP (skill myfbox-insights). */
export interface MonthInsight {
  month: string; // AAAA-MM
  title: string;
  body: string; // texto em português, parágrafos separados por linha em branco
  highlights?: string[]; // pontos curtos (até ~5)
  author: 'agent' | 'user';
  createdAt: string;
  updatedAt: string;
  /** Assinatura dos números do mês no momento da escrita (detecta insight desatualizado) */
  dataSignature: string;
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
