import type { Category, TransactionType } from '../types/finance';

/**
 * Verifica se uma categoria é protegida pelo sistema (ex: "Outros")
 * e não pode ser excluída nem renomeada.
 */
export function isProtectedCategory(cat: {
  id?: string;
  name?: string;
  isSystem?: boolean;
}): boolean {
  if (cat.isSystem) return true;
  if (cat.id === 'cat_other_expense' || cat.id === 'cat_other_income') return true;
  const norm = (cat.name || '').trim().toLowerCase();
  return norm === 'outros';
}

/**
 * Localiza a categoria "Outros" para o tipo especificado,
 * ou cria uma se ela ainda não existir na lista.
 */
export function findOrCreateOutrosCategory(
  categories: Category[],
  type: TransactionType
): { target: Category; categories: Category[]; created: boolean } {
  // 1. Procura categoria explicitamente marcada como do sistema
  let found = categories.find((c) => c.type === type && c.isSystem);

  // 2. Procura pelo ID padrão
  if (!found) {
    found = categories.find((c) => c.type === type && c.id === `cat_other_${type}`);
  }

  // 3. Procura pelo nome "Outros"
  if (!found) {
    found = categories.find((c) => c.type === type && c.name.trim().toLowerCase() === 'outros');
  }

  if (found) {
    if (!found.isSystem) {
      const updated: Category = { ...found, isSystem: true };
      const nextCats = categories.map((c) => (c.id === found!.id ? updated : c));
      return { target: updated, categories: nextCats, created: false };
    }
    return { target: found, categories, created: false };
  }

  // Se não existir, cria a categoria Outros do sistema
  const newOutros: Category = {
    id: `cat_other_${type}`,
    name: 'Outros',
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

/**
 * Garante que tanto para despesa quanto para receita a categoria
 * "Outros" protegida exista na lista de categorias do cofre.
 */
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

/**
 * Retorna a categoria padrão ("Outros") para o tipo informado.
 */
export function getDefaultCategory(
  categories: Category[],
  type: TransactionType
): Category {
  return findOrCreateOutrosCategory(categories, type).target;
}

/**
 * Retorna o ID da categoria padrão ("Outros") para o tipo informado.
 */
export function getDefaultCategoryId(
  categories: Category[],
  type: TransactionType
): string {
  return getDefaultCategory(categories, type).id;
}

