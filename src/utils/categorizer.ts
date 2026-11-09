import type { Category, Transaction, TransactionType } from '../types/finance';

function normalizeText(text: string): string {
  return text
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .trim();
}

const RAW_KEYWORD_MAP: Record<string, readonly string[]> = {
  cat_housing: [
    'aluguel',
    'condominio',
    'iptu',
    'luz',
    'enel',
    'cpfl',
    'cemig',
    'sabesp',
    'agua',
    'gas',
    'imobiliaria',
  ],
  cat_groceries: [
    'mercado',
    'supermercado',
    'pao de acucar',
    'carrefour',
    'assai',
    'atacadao',
    'hortifruti',
    'feira',
    'sacolao',
    'acougue',
    'padaria',
    'dia',
  ],
  cat_dining: [
    'ifood',
    'restaurante',
    'almoco',
    'jantar',
    'lanche',
    'mcdonald',
    'burger',
    'pizza',
    'pizzaria',
    'sushi',
    'cafe',
    'bar',
    'choperia',
    'churrascaria',
    'subway',
    'starbucks',
  ],
  cat_transport: [
    'uber',
    '99',
    'gasolina',
    'combustivel',
    'posto',
    'ipva',
    'estacionamento',
    'pedagio',
    'oficina',
    'mecanico',
    'metro',
    'onibus',
    'bilhete',
    'shell',
    'ipiranga',
    'br distribuidora',
  ],
  cat_health: [
    'farmacia',
    'drogasil',
    'raia',
    'droga raia',
    'pacheco',
    'drogaria',
    'medico',
    'consulta',
    'exame',
    'dentista',
    'hospital',
    'terapia',
    'psicologo',
    'laboratorio',
  ],
  cat_subs: [
    'netflix',
    'spotify',
    'amazon prime',
    'youtube',
    'icloud',
    'google',
    'chatgpt',
    'openai',
    'github',
    'aws',
    'digitalocean',
    'cloudflare',
    'internet',
    'fibra',
    'vivo',
    'claro',
    'tim',
    'hbo',
    'max',
    'disney',
  ],
  cat_leisure: [
    'cinema',
    'livro',
    'livraria',
    'viagem',
    'hotel',
    'airbnb',
    'passagem',
    'ingresso',
    'show',
    'teatro',
    'parque',
    'jogos',
    'steam',
    'playstation',
  ],
  cat_salary: [
    'salario',
    'remuneracao',
    'folha',
    'pro-labore',
    'adiantamento',
    '13',
    'decimo',
    'ferias',
    'ted salario',
  ],
  cat_freelance: [
    'freela',
    'freelance',
    'consultoria',
    'projeto',
    'desenvolvimento',
    'nf',
    'servico',
    'honorarios',
  ],
  cat_dividends: [
    'rendimento',
    'dividendo',
    'dividendos',
    'jcp',
    'cdb',
    'selic',
    'tesouro',
    'fii',
    'renda fixa',
    'lucro',
  ],
};

const NORMALIZED_KEYWORD_ENTRIES: ReadonlyArray<{
  categoryId: string;
  keywords: readonly string[];
}> = Object.entries(RAW_KEYWORD_MAP).map(([categoryId, keywords]) => ({
  categoryId,
  keywords: keywords.map(normalizeText),
}));

export function predictCategory(
  description: string,
  type: TransactionType,
  categories: readonly Category[],
  pastTransactions: readonly Transaction[] = []
): { categoryId: string; categoryName: string; confidence: 'history' | 'keyword' } | null {
  const normDesc = normalizeText(description);
  if (!normDesc || normDesc.length < 3) return null;

  const sameTypeCategories = categories.filter((c) => c.type === type);
  const validCategories = new Set(sameTypeCategories.map((c) => c.id));
  const catMap = new Map(sameTypeCategories.map((c) => [c.id, c]));

  const historyFrequency = new Map<string, number>();
  for (const tx of pastTransactions) {
    if (tx.type !== type || !validCategories.has(tx.categoryId)) continue;
    const txNorm = normalizeText(tx.description);
    if (txNorm === normDesc || txNorm.includes(normDesc) || normDesc.includes(txNorm)) {
      historyFrequency.set(tx.categoryId, (historyFrequency.get(tx.categoryId) ?? 0) + 1);
    }
  }

  let bestHistCatId: string | null = null;
  let maxHistCount = 0;
  for (const [catId, count] of historyFrequency.entries()) {
    if (count > maxHistCount) {
      maxHistCount = count;
      bestHistCatId = catId;
    }
  }

  if (bestHistCatId && catMap.has(bestHistCatId)) {
    return {
      categoryId: bestHistCatId,
      categoryName: catMap.get(bestHistCatId)!.name,
      confidence: 'history',
    };
  }

  const normalizedCategoryNames = sameTypeCategories.map((c) => ({
    cat: c,
    normName: normalizeText(c.name),
  }));

  for (const { categoryId: keyCatId, keywords } of NORMALIZED_KEYWORD_ENTRIES) {
    const matchedKeyword = keywords.find((kw) => normDesc.includes(kw));
    if (!matchedKeyword) continue;

    let matchedCat = catMap.get(keyCatId);
    if (!matchedCat) {
      matchedCat = normalizedCategoryNames.find(({ normName }) =>
        keywords.some((kw) => normName.includes(kw))
      )?.cat;
    }

    if (matchedCat) {
      return {
        categoryId: matchedCat.id,
        categoryName: matchedCat.name,
        confidence: 'keyword',
      };
    }
  }

  return null;
}
