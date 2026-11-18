import { tDomainMcp } from '../i18n/modules/domainMcp';
import type { Category, TransactionType } from '../types/finance';

const OTHER_CATEGORY_NAMES = new Set(['outros', 'other', 'otros', '其他']);

export function isProtectedCategory(cat: {
  id?: string;
  name?: string;
  isSystem?: boolean;
}): boolean {
  if (cat.isSystem) return true;
  if (cat.id === 'cat_other_expense' || cat.id === 'cat_other_income') return true;
  return OTHER_CATEGORY_NAMES.has((cat.name || '').trim().toLowerCase());
}

export function findOrCreateOutrosCategory(
  categories: Category[],
  type: TransactionType
): { target: Category; categories: Category[]; created: boolean } {
  let found =
    categories.find((c) => c.type === type && c.isSystem) ??
    categories.find((c) => c.type === type && c.id === `cat_other_${type}`) ??
    categories.find((c) => c.type === type && OTHER_CATEGORY_NAMES.has(c.name.trim().toLowerCase()));

  if (found) {
    if (!found.isSystem) {
      const updated: Category = { ...found, isSystem: true };
      const nextCats = categories.map((c) => (c.id === found.id ? updated : c));
      return { target: updated, categories: nextCats, created: false };
    }
    return { target: found, categories, created: false };
  }

  const newOutros: Category = {
    id: `cat_other_${type}`,
    name: tDomainMcp('domainMcp.categories.other'),
    type,
    color: '#737373',
    icon: 'Tag',
    isSystem: true,
  };

  return {
    target: newOutros,
    categories: [...categories, newOutros],
    created: true,
  };
}

export function ensureSystemCategories(categories: Category[]): {
  categories: Category[];
  changed: boolean;
} {
  let changed = false;
  let currentList = [...categories];

  for (const type of ['expense', 'income'] as const) {
    const res = findOrCreateOutrosCategory(currentList, type);
    if (res.categories !== currentList) {
      currentList = res.categories;
      changed = true;
    }
  }

  return { categories: currentList, changed };
}

export function getDefaultCategory(
  categories: Category[],
  type: TransactionType
): Category {
  return findOrCreateOutrosCategory(categories, type).target;
}

export function getDefaultCategoryId(
  categories: Category[],
  type: TransactionType
): string {
  return getDefaultCategory(categories, type).id;
}
