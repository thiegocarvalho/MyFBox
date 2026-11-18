import type { AppLanguage } from '../i18n/types';

export type { AppLanguage };
export type Currency = string;
export type TransactionType = 'income' | 'expense';
export type TransactionStatus = 'paid' | 'pending';
export type ExchangeRateOrigin = 'manual' | 'agent' | 'mcp';

export type AccountType =
  | 'reserve'
  | 'investment'
  | 'checking'
  | 'credit'
  | 'wallet'
  | 'savings';

export interface Account {
  id: string;
  name: string;
  type: AccountType;
  initialBalance: number;
  color: string;
  currency?: Currency;
  institution?: string;
}

export interface InitialAccountData {
  name: string;
  type: AccountType;
  color: string;
  initialBalance: number;
  currency?: Currency;
}

export interface Category {
  id: string;
  name: string;
  type: TransactionType;
  color: string;
  icon: string;
  monthlyBudget?: number;
  budgetCurrency?: Currency;
  isSystem?: boolean;
}

export interface Transaction {
  id: string;
  description: string;
  amount: number;
  currency?: Currency;
  exchangeRate?: number;
  type: TransactionType;
  status: TransactionStatus;
  date: string;
  paidAt?: string;
  categoryId: string;
  accountId: string;
  notes?: string;
  tags?: string[];
  recurrenceGroupId?: string;
  installmentIndex?: number;
  installmentTotal?: number;
  createdAt: string;
}

export interface ExchangeRate {
  from: Currency;
  to: Currency;
  rate: number;
  updatedAt: string;
  source?: ExchangeRateOrigin;
}

export interface VaultSettings {
  currency: Currency;
  autoLockMinutes: number;
  hideValuesByDefault: boolean;
  vaultName: string;
  usdToBrlRate?: number;
  usdRateUpdatedAt?: string;
  exchangeRates?: ExchangeRate[];
  lastBackupAt?: string;
  mcpEnabled?: boolean;
  mcpToken?: string;
  mcpPort?: number;
  language?: AppLanguage;
}

export interface MonthInsight {
  month: string;
  title: string;
  body: string;
  highlights?: string[];
  author: 'agent' | 'user';
  createdAt: string;
  updatedAt: string;
  dataSignature: string;
}

export interface VaultPayload {
  version: number;
  updatedAt: string;
  accounts: Account[];
  categories: Category[];
  transactions: Transaction[];
  settings: VaultSettings;
  insights?: MonthInsight[];
}

import type { EncryptedVaultEnvelope } from './vaultEnvelope';
export type { EncryptedVaultEnvelope };

export interface CryptoSession {
  key: CryptoKey;
  salt: Uint8Array;
  iterations: number;
  keyFingerprint: string;
  unlockedAt: number;
  createdAt: string;
}
