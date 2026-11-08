import type { Account, Category, VaultPayload } from '../types/finance';

const EMPTY_ACCOUNTS: Account[] = [
  {
    id: 'acc_main',
    name: 'Conta Principal',
    type: 'checking',
    initialBalance: 0,
    color: '#C8FF00',
    institution: 'Banco Principal',
  },
];

const DEFAULT_CATEGORIES: Category[] = [
  // Receitas
  {
    id: 'cat_salary',
    name: 'Salário & Pró-Labore',
    type: 'income',
    color: '#10B981',
    icon: 'Briefcase',
  },
  {
    id: 'cat_freelance',
    name: 'Projetos & Consultoria',
    type: 'income',
    color: '#C8FF00',
    icon: 'Code',
  },
  {
    id: 'cat_dividends',
    name: 'Rendimentos & Dividendos',
    type: 'income',
    color: '#38BDF8',
    icon: 'TrendingUp',
  },
  {
    id: 'cat_other_inc',
    name: 'Reembolsos & Outros',
    type: 'income',
    color: '#A78BFA',
    icon: 'PlusCircle',
  },

  // Despesas com Metas de Orçamento Mensal (Budgets)
  {
    id: 'cat_housing',
    name: 'Moradia & Condomínio',
    type: 'expense',
    color: '#F43F5E',
    icon: 'Home',
  },
  {
    id: 'cat_groceries',
    name: 'Supermercado & Feira',
    type: 'expense',
    color: '#F59E0B',
    icon: 'ShoppingCart',
  },
  {
    id: 'cat_dining',
    name: 'Restaurantes & Delivery',
    type: 'expense',
    color: '#FB923C',
    icon: 'Utensils',
  },
  {
    id: 'cat_transport',
    name: 'Transporte & Combustível',
    type: 'expense',
    color: '#38BDF8',
    icon: 'Car',
  },
  {
    id: 'cat_health',
    name: 'Saúde & Farmácia',
    type: 'expense',
    color: '#EC4899',
    icon: 'HeartPulse',
  },
  {
    id: 'cat_subs',
    name: 'Assinaturas, Nuvem & Internet',
    type: 'expense',
    color: '#8B5CF6',
    icon: 'Cpu',
  },
  {
    id: 'cat_leisure',
    name: 'Lazer, Livros & Viagens',
    type: 'expense',
    color: '#14B8A6',
    icon: 'Compass',
  },
];

/** Cofre novo: uma conta, categorias padrão (sem metas) e nenhum lançamento. */
export function createInitialVaultPayload(vaultName: string = 'Cofre Pessoal'): VaultPayload {
  return {
    version: 1,
    updatedAt: new Date().toISOString(),
    accounts: structuredClone(EMPTY_ACCOUNTS),
    categories: structuredClone(DEFAULT_CATEGORIES),
    transactions: [],
    settings: {
      currency: 'BRL',
      autoLockMinutes: 15,
      hideValuesByDefault: false,
      vaultName: vaultName.trim() || 'Cofre Pessoal',
    },
  };
}
