/**
 * Serviço de Câmbio USD/BRL via AwesomeAPI (Economia)
 * Endpoint oficial, gratuito, sem API key e com CORS habilitado.
 */

export interface UsdRateInfo {
  rate: number;
  bid: number;
  ask: number;
  high: number;
  low: number;
  pctChange: number;
  updatedAt: string;
}

const AWESOME_API_URL = 'https://economia.awesomeapi.com.br/last/USD-BRL';
const CACHE_STORAGE_KEY = 'myfbox_usd_rate_cache_v1';
const CACHE_TTL_MS = 15 * 60 * 1000; // 15 minutos

interface CachedRate {
  info: UsdRateInfo;
  cachedAt: number;
}

export async function fetchLiveUsdRate(forceRefresh: boolean = false): Promise<UsdRateInfo | null> {
  // 1. Tentar do cache local se não for forçado
  if (!forceRefresh) {
    try {
      const cached = localStorage.getItem(CACHE_STORAGE_KEY);
      if (cached) {
        const parsed: CachedRate = JSON.parse(cached);
        const age = Date.now() - parsed.cachedAt;
        if (age < CACHE_TTL_MS && parsed.info?.rate > 0) {
          return parsed.info;
        }
      }
    } catch {
      // Ignorar erro de leitura do localStorage
    }
  }

  // 2. Buscar da AwesomeAPI
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 6000);

  try {
    const response = await fetch(AWESOME_API_URL, {
      signal: controller.signal,
      headers: {
        Accept: 'application/json',
      },
    });

    clearTimeout(timeoutId);

    if (!response.ok) {
      throw new Error(`AwesomeAPI HTTP ${response.status}`);
    }

    const data = await response.json();
    const item = data?.USDBRL;

    if (!item || !item.bid) {
      throw new Error('Formato inesperado na resposta da AwesomeAPI');
    }

    const bid = parseFloat(item.bid);
    const ask = parseFloat(item.ask || item.bid);
    const high = parseFloat(item.high || item.bid);
    const low = parseFloat(item.low || item.bid);
    const pctChange = parseFloat(item.pctChange || '0');

    // Usamos o bid (compra comercial de mercado) como cotação padrão de referência
    const rate = Math.round(bid * 10000) / 10000;

    const info: UsdRateInfo = {
      rate,
      bid,
      ask,
      high,
      low,
      pctChange,
      updatedAt: item.create_date || new Date().toISOString(),
    };

    // Salvar cache
    try {
      const payload: CachedRate = {
        info,
        cachedAt: Date.now(),
      };
      localStorage.setItem(CACHE_STORAGE_KEY, JSON.stringify(payload));
    } catch {
      // localStorage pode estar desativado/cheio
    }

    return info;
  } catch (err) {
    clearTimeout(timeoutId);
    console.warn('[AwesomeAPI] Não foi possível atualizar a cotação USD/BRL:', err);

    // Se falhar a rede, tenta devolver o último cache mesmo vencido
    try {
      const cached = localStorage.getItem(CACHE_STORAGE_KEY);
      if (cached) {
        const parsed: CachedRate = JSON.parse(cached);
        if (parsed.info?.rate > 0) {
          return parsed.info;
        }
      }
    } catch {
      // noop
    }

    return null;
  }
}
