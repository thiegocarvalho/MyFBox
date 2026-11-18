import { generateEntityId } from '../domain/id';
import { tDomainMcp } from '../i18n/modules/domainMcp';
import type { Account, Category, InitialAccountData, VaultPayload } from '../types/finance';
import { ensureSystemCategories } from '../utils/categories';

function getEmptyAccounts(): Account[] {
  return [
    {
      id: 'acc_main',
      name: tDomainMcp('domainMcp.defaultData.mainAccount'),
      type: 'checking',
      initialBalance: 0,
      color: '#C8FF00',
      currency: 'BRL',
      institution: tDomainMcp('domainMcp.defaultData.mainBank'),
    },
  ];
}

function getDefaultCategories(): Category[] {
  return [
    {
      id: 'cat_salary',
      name: tDomainMcp('domainMcp.defaultData.cat.salary'),
      type: 'income',
      color: '#10B981',
      icon: 'Briefcase',
    },
    {
      id: 'cat_freelance',
      name: tDomainMcp('domainMcp.defaultData.cat.freelance'),
      type: 'income',
      color: '#C8FF00',
      icon: 'Code',
    },
    {
      id: 'cat_dividends',
      name: tDomainMcp('domainMcp.defaultData.cat.dividends'),
      type: 'income',
      color: '#38BDF8',
      icon: 'TrendingUp',
    },
    {
      id: 'cat_other_inc',
      name: tDomainMcp('domainMcp.defaultData.cat.otherInc'),
      type: 'income',
      color: '#A78BFA',
      icon: 'PlusCircle',
    },
    {
      id: 'cat_housing',
      name: tDomainMcp('domainMcp.defaultData.cat.housing'),
      type: 'expense',
      color: '#F43F5E',
      icon: 'Home',
    },
    {
      id: 'cat_groceries',
      name: tDomainMcp('domainMcp.defaultData.cat.groceries'),
      type: 'expense',
      color: '#F59E0B',
      icon: 'ShoppingCart',
    },
    {
      id: 'cat_dining',
      name: tDomainMcp('domainMcp.defaultData.cat.dining'),
      type: 'expense',
      color: '#FB923C',
      icon: 'Utensils',
    },
    {
      id: 'cat_transport',
      name: tDomainMcp('domainMcp.defaultData.cat.transport'),
      type: 'expense',
      color: '#38BDF8',
      icon: 'Car',
    },
    {
      id: 'cat_health',
      name: tDomainMcp('domainMcp.defaultData.cat.health'),
      type: 'expense',
      color: '#EC4899',
      icon: 'HeartPulse',
    },
    {
      id: 'cat_subs',
      name: tDomainMcp('domainMcp.defaultData.cat.subs'),
      type: 'expense',
      color: '#8B5CF6',
      icon: 'Cpu',
    },
    {
      id: 'cat_leisure',
      name: tDomainMcp('domainMcp.defaultData.cat.leisure'),
      type: 'expense',
      color: '#14B8A6',
      icon: 'Compass',
    },
  ];
}

export function createInitialVaultPayload(
  vaultName: string = tDomainMcp('domainMcp.defaultData.vaultName'),
  initialAccount?: InitialAccountData
): VaultPayload {
  const defaultMainAccName = tDomainMcp('domainMcp.defaultData.mainAccount');
  const accounts: Account[] = initialAccount
    ? [
        {
          id: generateEntityId('acc'),
          name: initialAccount.name.trim() || defaultMainAccName,
          type: initialAccount.type || 'checking',
          initialBalance: initialAccount.initialBalance ?? 0,
          color: initialAccount.color || '#C8FF00',
          currency: initialAccount.currency || 'BRL',
        },
      ]
    : getEmptyAccounts();

  const { categories } = ensureSystemCategories(getDefaultCategories());

  return {
    version: 1,
    updatedAt: new Date().toISOString(),
    accounts,
    categories,
    transactions: [],
    settings: {
      currency: initialAccount?.currency || 'BRL',
      autoLockMinutes: 15,
      hideValuesByDefault: false,
      vaultName: vaultName.trim() || tDomainMcp('domainMcp.defaultData.vaultName'),
    },
  };
}
