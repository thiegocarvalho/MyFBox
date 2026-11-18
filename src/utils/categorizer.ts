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
    // pt-BR
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
    'moradia',
    // en-GB
    'rent',
    'mortgage',
    'council tax',
    'service charge',
    'electricity',
    'water bill',
    'utility',
    'utilities',
    'housing',
    'landlord',
    // es
    'alquiler',
    'renta',
    'hipoteca',
    'vivienda',
    'gastos comunes',
    'comunidad',
    'electricidad',
    'inmobiliaria',
    // zh-CN
    '房租',
    '租金',
    '房贷',
    '物业',
    '水费',
    '电费',
    '燃气',
    '水电',
    '住房',
  ],
  cat_groceries: [
    // pt-BR
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
    // en-GB
    'supermarket',
    'groceries',
    'grocery',
    'tesco',
    'sainsbury',
    'asda',
    'waitrose',
    'aldi',
    'lidl',
    'morrisons',
    'bakery',
    'butcher',
    // es
    'super',
    'mercadona',
    'fruteria',
    'carniceria',
    'panaderia',
    'abarrotes',
    'despensa',
    'alimentacion',
    // zh-CN
    '超市',
    '生鲜',
    '买菜',
    '菜市场',
    '水果',
    '面包房',
    '盒马',
    '山姆',
    '永辉',
  ],
  cat_dining: [
    // pt-BR
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
    // en-GB
    'restaurant',
    'dining',
    'takeaway',
    'deliveroo',
    'ubereats',
    'just eat',
    'lunch',
    'dinner',
    'breakfast',
    'coffee',
    'pub',
    'pret',
    'nandos',
    // es
    'almuerzo',
    'cena',
    'comida',
    'desayuno',
    'cafeteria',
    'rappi',
    'pedidosya',
    'glovo',
    'cerveceria',
    // zh-CN
    '餐厅',
    '饭店',
    '外卖',
    '美团',
    '饿了么',
    '午饭',
    '晚饭',
    '咖啡',
    '奶茶',
    '火锅',
    '烧烤',
    '餐饮',
  ],
  cat_transport: [
    // pt-BR
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
    'transporte',
    // en-GB
    'transport',
    'petrol',
    'fuel',
    'diesel',
    'parking',
    'toll',
    'tube',
    'underground',
    'oyster',
    'train',
    'bus',
    'taxi',
    'garage',
    'mot',
    // es
    'nafta',
    'combustible',
    'estacionamiento',
    'peaje',
    'taller',
    'autobus',
    'colectivo',
    'subte',
    'tren',
    'cabify',
    // zh-CN
    '打车',
    '滴滴',
    '出租车',
    '地铁',
    '公交',
    '加油',
    '汽油',
    '停车',
    '高速费',
    '高铁',
    '交通',
  ],
  cat_health: [
    // pt-BR
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
    'saude',
    // en-GB
    'pharmacy',
    'chemist',
    'boots',
    'doctor',
    'gp',
    'clinic',
    'dentist',
    'therapy',
    'health',
    'prescription',
    'optician',
    // es
    'salud',
    'clinica',
    'farmacias',
    'psicologo',
    'analisis',
    // zh-CN
    '药店',
    '药房',
    '医院',
    '门诊',
    '挂号',
    '体检',
    '牙医',
    '看病',
    '医疗',
  ],
  cat_subs: [
    // pt-BR
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
    'assinatura',
    // en-GB
    'subscription',
    'broadband',
    'mobile',
    'apple',
    'microsoft',
    'adobe',
    'vodafone',
    'ee',
    // es
    'suscripcion',
    'movistar',
    'orange',
    'nube',
    // zh-CN
    '订阅',
    '会员',
    '宽带',
    '话费',
    '流量',
    '云服务',
    '网费',
  ],
  cat_leisure: [
    // pt-BR
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
    'lazer',
    // en-GB
    'leisure',
    'book',
    'bookshop',
    'travel',
    'flight',
    'ticket',
    'concert',
    'theatre',
    'games',
    'nintendo',
    'xbox',
    'holiday',
    // es
    'ocio',
    'cine',
    'libro',
    'libreria',
    'viaje',
    'vuelo',
    'entrada',
    'teatro',
    'juegos',
    'vacaciones',
    // zh-CN
    '电影',
    '影院',
    '书店',
    '买书',
    '旅行',
    '旅游',
    '酒店',
    '机票',
    '门票',
    '游戏',
    '休闲',
  ],
  cat_salary: [
    // pt-BR
    'salario',
    'remuneracao',
    'folha',
    'pro-labore',
    'adiantamento',
    '13',
    'decimo',
    'ferias',
    'ted salario',
    // en-GB
    'salary',
    'payroll',
    'wages',
    'paycheck',
    'payslip',
    'bonus',
    'director pay',
    // es
    'sueldo',
    'nomina',
    'aguinaldo',
    'remuneracion',
    'paga',
    // zh-CN
    '工资',
    '薪资',
    '薪酬',
    '奖金',
    '年终奖',
    '发薪',
  ],
  cat_freelance: [
    // pt-BR
    'freela',
    'freelance',
    'consultoria',
    'projeto',
    'desenvolvimento',
    'nf',
    'servico',
    'honorarios',
    // en-GB
    'consulting',
    'contractor',
    'project',
    'invoice',
    'retainer',
    // es
    'consultoria',
    'proyecto',
    'desarrollo',
    'factura',
    'servicio',
    // zh-CN
    '兼职',
    '外包',
    '咨询',
    '项目款',
    '设计费',
    '开发费',
  ],
  cat_dividends: [
    // pt-BR
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
    // en-GB
    'dividend',
    'dividends',
    'interest',
    'yield',
    'returns',
    'isa',
    'etf',
    // es
    'rendimiento',
    'intereses',
    'ganancia',
    'plazo fijo',
    // zh-CN
    '分红',
    '股息',
    '利息',
    '理财收益',
    '基金收益',
    '分红派息',
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
  const hasCjk = /[\u4e00-\u9fff]/.test(normDesc);
  if (!normDesc || normDesc.length < (hasCjk ? 2 : 3)) return null;

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
