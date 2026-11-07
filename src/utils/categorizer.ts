import type { Category, Transaction, TransactionType } from '../types/finance';

const KEYWORD_MAP: Record<string, string[]> = {
  // Moradia
  cat_housing: [
    'aluguel',
    'condominio',
    'condomínio',
    'iptu',
    'luz',
    'enel',
    'cpfl',
    'cemig',
    'sabesp',
    'agua',
    'água',
    'gas',
    'gás',
    'imobiliaria',
    'imobiliária',
  ],
  // Supermercado
  cat_groceries: [
    'mercado',
    'supermercado',
    'pao de acucar',
    'pão de açúcar',
    'carrefour',
    'assai',
    'assaí',
    'atacadão',
    'atacadao',
    'hortifruti',
    'feira',
    'sacolao',
    'sacolão',
    'acougue',
    'açougue',
    'padaria',
    'dia',
  ],
  // Restaurantes & Delivery
  cat_dining: [
    'ifood',
    'restaurante',
    'almoco',
    'almoço',
    'jantar',
    'lanche',
    'mcdonald',
    'burger',
    'pizza',
    'pizzaria',
    'sushi',
    'cafe',
    'café',
    'bar',
    'choperia',
    'churrascaria',
    'subway',
    'starbucks',
  ],
  // Transporte
  cat_transport: [
    'uber',
    '99',
    'gasolina',
    'combustivel',
    'combustível',
    'posto',
    'ipva',
    'estacionamento',
    'pedagio',
    'pedágio',
    'oficina',
    'mecanico',
    'mecânico',
    'metro',
    'metrô',
    'onibus',
    'ônibus',
    'bilhete',
    'shell',
    'ipiranga',
    'br distribuidora',
  ],
  // Saúde
  cat_health: [
    'farmacia',
    'farmácia',
    'drogasil',
    'raia',
    'droga raia',
    'pacheco',
    'drogaria',
    'medico',
    'médico',
    'consulta',
    'exame',
    'dentista',
    'hospital',
    'terapia',
    'psicologo',
    'psicólogo',
    'laboratorio',
    'laboratório',
  ],
  // Assinaturas & Nuvem
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
  // Lazer
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
  // Receitas - Salário
  cat_salary: [
    'salario',
    'salário',
    'remuneracao',
    'remuneração',
    'folha',
    'pro-labore',
    'pró-labore',
    'adiantamento',
    '13',
    'decimo',
    'décimo',
    'ferias',
    'férias',
    'ted salario',
  ],
  // Receitas - Freelance
  cat_freelance: [
    'freela',
    'freelance',
    'consultoria',
    'projeto',
    'desenvolvimento',
    'nf',
    'servico',
    'serviço',
    'honorarios',
    'honorários',
  ],
  // Receitas - Rendimentos
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

function normalizeText(text: string): string {
  return text
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .trim();
}

export function predictCategory(
  description: string,
  type: TransactionType,
  categories: Category[],
  pastTransactions: Transaction[] = []
): { categoryId: string; categoryName: string; confidence: 'history' | 'keyword' } | null {
  const normDesc = normalizeText(description);
  if (!normDesc || normDesc.length < 3) return null;

  const validCategories = new Set(categories.filter((c) => c.type === type).map((c) => c.id));
  const catMap = new Map(categories.map((c) => [c.id, c]));

  // 1. Procurar em lançamentos anteriores (exato ou substring)
  const historyFrequency: Record<string, number> = {};
  for (const tx of pastTransactions) {
    if (tx.type !== type || !validCategories.has(tx.categoryId)) continue;
    const txNorm = normalizeText(tx.description);
    if (txNorm === normDesc || txNorm.includes(normDesc) || normDesc.includes(txNorm)) {
      historyFrequency[tx.categoryId] = (historyFrequency[tx.categoryId] || 0) + 1;
    }
  }

  let bestHistCatId: string | null = null;
  let maxHistCount = 0;
  for (const [catId, count] of Object.entries(historyFrequency)) {
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

  // 2. Procurar no dicionário de palavras-chave
  for (const [keyCatId, keywords] of Object.entries(KEYWORD_MAP)) {
    // Procura por ID padrão ou por nome semelhante
    let matchedCat = categories.find((c) => c.id === keyCatId && c.type === type);
    if (!matchedCat) {
      // Se a categoria foi renomeada ou criada pelo usuário, tenta casar pelo nome
      const categoryKeywords = keywords;
      for (const kw of categoryKeywords) {
        if (normDesc.includes(normalizeText(kw))) {
          matchedCat = categories.find(
            (c) => c.type === type && normalizeText(c.name).includes(normalizeText(kw))
          );
          if (matchedCat) break;
        }
      }
    }

    if (matchedCat && validCategories.has(matchedCat.id)) {
      for (const kw of keywords) {
        if (normDesc.includes(normalizeText(kw))) {
          return {
            categoryId: matchedCat.id,
            categoryName: matchedCat.name,
            confidence: 'keyword',
          };
        }
      }
    }
  }

  return null;
}
