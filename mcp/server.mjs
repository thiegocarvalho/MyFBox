#!/usr/bin/env node
import { timingSafeEqual, randomUUID, randomBytes, createHash } from 'node:crypto';
import { createServer } from 'node:http';
import { mkdirSync, readFileSync, writeFileSync, chmodSync } from 'node:fs';
import { homedir } from 'node:os';
import { join, dirname, relative } from 'node:path';
import { fileURLToPath } from 'node:url';
import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import { WebSocketServer } from 'ws';
import { z } from 'zod';

const PORT = Number(process.env.MYFBOX_MCP_PORT) || 4777;
const APP_URL = (process.env.MYFBOX_APP_URL || 'http://localhost:41730').replace(/\/+$/, '');
const CONFIG_DIR = join(process.env.XDG_CONFIG_HOME || join(homedir(), '.config'), 'myfbox');
const CONFIG_FILE = join(CONFIG_DIR, 'mcp.json');
const PROJECT_ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const BACKUP_DIR = process.env.MYFBOX_BACKUP_DIR || join(PROJECT_ROOT, 'vaults');
const MAX_HTTP_BODY_BYTES = 1_048_576;

function loadOrCreateToken() {
  const fromEnv = process.env.MYFBOX_MCP_TOKEN?.trim();
  if (fromEnv) return fromEnv;
  try {
    const saved = JSON.parse(readFileSync(CONFIG_FILE, 'utf8'));
    if (typeof saved.token === 'string' && saved.token.startsWith('mfb_')) return saved.token;
  } catch {}
  const token = `mfb_${randomBytes(18).toString('base64url')}`;
  mkdirSync(CONFIG_DIR, { recursive: true, mode: 0o700 });
  writeFileSync(CONFIG_FILE, JSON.stringify({ token }, null, 2), { mode: 0o600 });
  chmodSync(CONFIG_FILE, 0o600);
  return token;
}

const TOKEN = loadOrCreateToken();
const SHORT_CODE = (() => {
  const hex = createHash('sha256').update(TOKEN).digest('hex').slice(0, 8).toUpperCase();
  return `${hex.slice(0, 4)}-${hex.slice(4)}`;
})();
const PAIR_LINK = `${APP_URL}/#mcp-pair=${encodeURIComponent(TOKEN)}&port=${PORT}`;

function deriveAllowedOrigins() {
  const allowed = new Set([
    'http://localhost:41730',
    'http://127.0.0.1:41730',
    'http://localhost:5173',
    'http://127.0.0.1:5173',
  ]);
  try {
    const parsed = new URL(APP_URL);
    allowed.add(parsed.origin);
    if (parsed.hostname === 'localhost') {
      allowed.add(`${parsed.protocol}//127.0.0.1${parsed.port ? `:${parsed.port}` : ''}`);
    } else if (parsed.hostname === '127.0.0.1') {
      allowed.add(`${parsed.protocol}//localhost${parsed.port ? `:${parsed.port}` : ''}`);
    }
  } catch {}
  for (const extra of (process.env.MYFBOX_MCP_ALLOWED_ORIGINS || '').split(',')) {
    const trimmed = extra.trim();
    if (trimmed) allowed.add(trimmed);
  }
  return allowed;
}

const ALLOWED_ORIGINS = deriveAllowedOrigins();
const CALL_TIMEOUT_MS = 20_000;
const HELLO_TIMEOUT_MS = 5_000;

const log = (...args) => console.error('[myfbox-mcp]', ...args);

let appSocket = null;
let bridgeError = null;
const pending = new Map();

function tokenMatches(candidate) {
  if (!TOKEN || typeof candidate !== 'string') return false;
  const a = Buffer.from(candidate);
  const b = Buffer.from(TOKEN);
  return a.length === b.length && timingSafeEqual(a, b);
}

function originAllowed(origin) {
  if (!origin) return false;
  return ALLOWED_ORIGINS.has(origin);
}

function extractBearerToken(req) {
  const auth = req.headers.authorization;
  if (typeof auth !== 'string' || !auth.startsWith('Bearer ')) return null;
  return auth.slice(7).trim();
}

const httpServer = createServer(async (req, res) => {
  const origin = req.headers.origin;
  const fetchSite = req.headers['sec-fetch-site'];

  if (origin && !originAllowed(origin)) {
    res.writeHead(403, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ ok: false, error: 'Origem não autorizada.' }));
    return;
  }

  if (fetchSite && fetchSite !== 'same-origin' && fetchSite !== 'none') {
    res.writeHead(403, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ ok: false, error: 'Requisição cross-site bloqueada.' }));
    return;
  }

  if (origin && originAllowed(origin)) {
    res.setHeader('Access-Control-Allow-Origin', origin);
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  }

  if (req.method === 'OPTIONS') {
    res.writeHead(204).end();
    return;
  }

  const bearer = extractBearerToken(req);
  if (!tokenMatches(bearer)) {
    res.writeHead(401, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ ok: false, error: 'Token de autenticação MCP inválido ou ausente.' }));
    return;
  }

  if (req.method === 'GET' && req.url === '/status') {
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(
      JSON.stringify({
        connected: Boolean(appSocket),
        shortCode: SHORT_CODE,
        pairLink: PAIR_LINK,
      })
    );
    return;
  }

  if (req.method === 'POST' && req.url === '/call') {
    let body = '';
    let bodyBytes = 0;
    let aborted = false;

    req.on('data', (chunk) => {
      if (aborted) return;
      bodyBytes += chunk.length;
      if (bodyBytes > MAX_HTTP_BODY_BYTES) {
        aborted = true;
        res.writeHead(413, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ ok: false, error: 'Payload excede o limite permitido.' }));
        req.destroy();
        return;
      }
      body += chunk;
    });

    req.on('end', async () => {
      if (aborted) return;
      try {
        const { action, args } = JSON.parse(body || '{}');
        if (typeof action !== 'string' || !action) {
          throw new Error('Ação MCP inválida.');
        }
        const data = await callApp(action, args ?? {});
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ ok: true, data }));
      } catch (err) {
        res.writeHead(400, { 'Content-Type': 'application/json' });
        res.end(
          JSON.stringify({
            ok: false,
            error: err instanceof Error ? err.message : String(err),
          })
        );
      }
    });
    return;
  }

  res.writeHead(404).end();
});

const wss = new WebSocketServer({
  server: httpServer,
  maxPayload: 64 * 1024 * 1024,
  verifyClient: ({ origin }) => {
    const ok = originAllowed(origin);
    if (!ok) log(`conexão recusada da origem "${origin ?? '(sem origem)'}"`);
    return ok;
  },
});

httpServer.listen(PORT, '127.0.0.1', () => log(`ponte ouvindo em ws://127.0.0.1:${PORT}`));
httpServer.on('error', (err) => {
  bridgeError = err.code === 'EADDRINUSE' ? `A porta ${PORT} já está em uso.` : err.message;
  log('erro na ponte:', bridgeError);
});

wss.on('connection', (ws) => {
  let authenticated = false;
  const helloTimer = setTimeout(() => ws.close(4401, 'sem hello'), HELLO_TIMEOUT_MS);

  ws.on('message', (raw) => {
    let msg;
    try {
      msg = JSON.parse(raw.toString());
    } catch {
      return;
    }

    if (!authenticated) {
      clearTimeout(helloTimer);
      if (msg?.type !== 'hello' || !tokenMatches(msg.token)) {
        log('código de pareamento inválido; conexão encerrada');
        ws.close(4401, 'código de pareamento inválido');
        return;
      }
      authenticated = true;
      if (appSocket && appSocket !== ws) appSocket.close(4000, 'substituído por nova conexão');
      appSocket = ws;
      ws.send(JSON.stringify({ type: 'welcome' }));
      log('app MyFBox conectado');
      return;
    }

    if (msg?.type === 'result' && pending.has(msg.id)) {
      const { resolve, reject, timer } = pending.get(msg.id);
      clearTimeout(timer);
      pending.delete(msg.id);
      if (msg.ok) resolve(msg.data);
      else reject(new Error(msg.error || 'Falha ao executar a ação no app.'));
    }
  });

  ws.on('close', () => {
    clearTimeout(helloTimer);
    if (appSocket === ws) {
      appSocket = null;
      log('app MyFBox desconectado');
    }
  });
});

const pairingInstructions = () =>
  `O app MyFBox não está conectado. Mostre ao usuário este link para autorizar o acesso ` +
  `(ele abre o app, que pede confirmação com o código ${SHORT_CODE}):\n\n${PAIR_LINK}\n\n` +
  `O cofre precisa estar desbloqueado. Depois de autorizar, tente a ação de novo.`;

function callApp(action, args) {
  if (bridgeError) throw new Error(`Ponte local indisponível: ${bridgeError}`);
  if (!appSocket) throw new Error(pairingInstructions());
  const id = randomUUID();
  return new Promise((resolve, reject) => {
    const timer = setTimeout(() => {
      pending.delete(id);
      reject(new Error('O app não respondeu a tempo (o cofre pode ter sido trancado).'));
    }, CALL_TIMEOUT_MS);
    pending.set(id, { resolve, reject, timer });
    appSocket.send(JSON.stringify({ type: 'call', id, action, args }));
  });
}

const server = new McpServer({ name: 'myfbox', version: '1.0.0' });

const ymd = z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'use AAAA-MM-DD');
const ym = z.string().regex(/^\d{4}-\d{2}$/, 'use AAAA-MM');
const txType = z.enum(['income', 'expense']);
const txStatus = z.enum(['paid', 'pending']);
const popularCurrencyCodes = [
  'BRL',
  'USD',
  'EUR',
  'GBP',
  'JPY',
  'CHF',
  'CAD',
  'AUD',
  'CNY',
  'ARS',
  'CLP',
  'UYU',
  'MXN',
  'BTC',
  'ETH',
  'USDT',
];
const popularCurrency = z.enum(popularCurrencyCodes);

function tool(name, description, inputSchema, { readOnly = false, destructive = false } = {}) {
  server.registerTool(
    name,
    {
      description,
      inputSchema,
      annotations: {
        readOnlyHint: readOnly,
        destructiveHint: destructive,
        openWorldHint: false,
      },
    },
    async (args) => {
      try {
        const data = await callApp(name, args ?? {});
        return { content: [{ type: 'text', text: JSON.stringify(data, null, 2) }] };
      } catch (err) {
        return {
          isError: true,
          content: [{ type: 'text', text: err instanceof Error ? err.message : String(err) }],
        };
      }
    }
  );
}

server.registerTool(
  'connect_app',
  {
    description:
      'Verifica se o app MyFBox está conectado. Se não estiver, devolve o link de pareamento que o usuário deve abrir no navegador para autorizar (com um código curto de conferência). Use antes da primeira ação ou quando outra ferramenta disser que o app não está conectado.',
    inputSchema: {},
    annotations: { readOnlyHint: true, openWorldHint: false },
  },
  async () => ({
    content: [
      {
        type: 'text',
        text: appSocket
          ? `Conectado ao app MyFBox (código ${SHORT_CODE}). Pronto para usar as ferramentas.`
          : bridgeError
          ? `Ponte local indisponível: ${bridgeError}`
          : pairingInstructions(),
      },
    ],
  })
);

tool(
  'get_overview',
  'Resumo financeiro de um mês: saldo confirmado (só lançamentos pagos) e previsto até o fim do mês em BRL e USD, recebido/pago no mês, pendentes e saldo por conta. Valores em reais (BRL) salvo indicação.',
  { month: ym.optional().describe('Mês AAAA-MM; padrão: mês atual') },
  { readOnly: true }
);

tool(
  'list_accounts',
  'Lista as contas do cofre com moeda, saldo confirmado e saldo previsto.',
  {},
  { readOnly: true }
);

tool(
  'list_categories',
  'Lista as categorias (receita/despesa) com id, nome e meta mensal (monthlyBudget) quando houver.',
  { type: txType.optional().describe('Filtrar por income ou expense') },
  { readOnly: true }
);

tool(
  'list_transactions',
  'Lista lançamentos, do mais recente ao mais antigo, com filtros opcionais.',
  {
    month: ym.optional().describe('Mês AAAA-MM'),
    type: txType.optional(),
    status: txStatus.optional(),
    categoryId: z.string().optional(),
    accountId: z.string().optional(),
    search: z.string().optional().describe('Trecho da descrição ou das observações'),
    limit: z.number().int().min(1).max(500).optional().describe('Padrão 50'),
  },
  { readOnly: true }
);

tool(
  'create_category',
  'Cria uma categoria de receita ou despesa. Se já existir uma com o mesmo nome e tipo, devolve a existente sem duplicar.',
  {
    name: z.string().min(1),
    type: txType,
    monthlyBudget: z.number().min(0).optional().describe('Meta (teto) mensal em BRL; só para despesa'),
    color: z.string().regex(/^#[0-9a-fA-F]{6}$/).optional(),
  }
);

tool(
  'set_category_budget',
  'Define ou remove a meta (teto mensal em BRL) de uma categoria de despesa. Use null ou 0 para remover a meta sem apagar a categoria.',
  { categoryId: z.string(), monthlyBudget: z.number().min(0).nullable() }
);

tool(
  'create_transaction',
  'Registra um lançamento. amount é sempre positivo; type define se é receita ou despesa. Categoria: informe categoryId ou categoryName; sem nenhum dos dois, o app sugere pela descrição. Conta padrão: a primeira. Data padrão: hoje; data futura vira pendente. repeatMonths > 1 cria parcelas mensais (as seguintes ficam pendentes).',
  {
    description: z.string().min(1),
    amount: z.number().positive(),
    type: txType,
    date: ymd.optional(),
    categoryId: z.string().optional(),
    categoryName: z.string().optional(),
    accountId: z.string().optional(),
    accountName: z.string().optional(),
    status: txStatus.optional(),
    currency: popularCurrency.optional().describe('Padrão: moeda da conta'),
    exchangeRate: z
      .number()
      .positive()
      .optional()
      .describe('Cotação para BRL a fixar (quando envolve moeda estrangeira)'),
    notes: z.string().optional(),
    repeatMonths: z.number().int().min(1).max(36).optional(),
  }
);

tool(
  'update_transaction',
  'Altera campos de um lançamento existente (pelo id). Só os campos enviados mudam. Para dar baixa use status "paid" e, se foi em outro dia, paidAt (a data de vencimento não muda).',
  {
    id: z.string(),
    description: z.string().min(1).optional(),
    amount: z.number().positive().optional(),
    type: txType.optional(),
    date: ymd.optional().describe('Data de vencimento/competência'),
    status: txStatus.optional(),
    paidAt: ymd
      .optional()
      .describe('Quando foi pago/recebido (padrão: hoje ao dar baixa); não pode ser futuro'),
    categoryId: z.string().optional(),
    categoryName: z.string().optional(),
    accountId: z.string().optional(),
    accountName: z.string().optional(),
    currency: popularCurrency.optional(),
    notes: z.string().optional(),
  }
);

tool(
  'delete_transaction',
  'Exclui um lançamento pelo id. Irreversível (a não ser por um backup anterior): confirme com o usuário antes.',
  { id: z.string() },
  { destructive: true }
);

tool(
  'get_month_comparison',
  'Comparativo mês a mês terminando em `month` (padrão: mês atual): entradas, saídas e resultado (pagos + pendentes), quanto já foi pago, variação vs. mês anterior, categorias do mês, as 3 categorias de despesa que mais mudaram, e se o mês já tem insight (e se está desatualizado). Use antes de escrever um insight.',
  {
    month: ym.optional().describe('Último mês do comparativo, AAAA-MM'),
    months: z.number().int().min(1).max(24).optional().describe('Quantos meses (padrão 6)'),
  },
  { readOnly: true }
);

tool(
  'list_insights',
  'Lista os insights mensais já salvos no cofre (título, texto, destaques, datas).',
  { month: ym.optional() },
  { readOnly: true }
);

tool(
  'save_insight',
  'Cria ou atualiza (substitui) o insight de um mês, exibido na aba Comparativos do app. Grava junto a assinatura dos números atuais do mês para o app saber quando ele fica desatualizado.',
  {
    month: ym,
    title: z.string().min(1).max(120).describe('Frase curta com a conclusão principal'),
    body: z
      .string()
      .min(1)
      .max(4000)
      .describe('Análise em português; parágrafos separados por linha em branco'),
    highlights: z.array(z.string().min(1).max(160)).max(6).optional().describe('Até 6 pontos curtos'),
  }
);

tool(
  'delete_insight',
  'Remove o insight de um mês (não mexe em lançamentos).',
  { month: ym },
  { destructive: true }
);

tool(
  'list_exchange_rates',
  'Lista todas as cotações de moedas cadastradas no cofre (ex: USD/BRL, EUR/BRL, BTC/USD). O MyFBox é 100% offline e não busca dados em APIs externas.',
  {},
  { readOnly: true }
);

tool(
  'set_exchange_rate',
  'Adiciona ou atualiza a cotação de qualquer par entre as moedas mais populares no mundo (BRL, USD, EUR, GBP, JPY, CHF, CAD, AUD, CNY, ARS, CLP, UYU, MXN, BTC, ETH, USDT). 100% offline.',
  {
    from: popularCurrency.describe('Código da moeda de origem'),
    to: popularCurrency.describe('Código da moeda de destino'),
    rate: z.number().positive().describe('Taxa de câmbio: 1 [from] = rate [to] (número positivo)'),
  }
);

tool(
  'delete_exchange_rate',
  'Remove a cotação de um par de moedas do cofre.',
  {
    from: popularCurrency.describe('Código da moeda de origem'),
    to: popularCurrency.describe('Código da moeda de destino'),
  },
  { destructive: true }
);

server.registerTool(
  'export_backup',
  {
    description:
      'Salva um backup CIFRADO do cofre (.myfbox.json, AES-256-GCM) na pasta vaults/ do projeto, que fica fora do git. O app entrega o envelope já cifrado; abre com a senha mestra atual em Restaurar. Também atualiza "Último backup" no app.',
    inputSchema: {},
    annotations: { readOnlyHint: false, destructiveHint: false, openWorldHint: false },
  },
  async () => {
    try {
      const data = await callApp('export_backup', {});
      const env = data?.envelope;
      if (!env || env.app !== 'MyFBox' || !env.cipher?.ciphertextBase64 || !env.kdf) {
        throw new Error('O app devolveu um envelope inválido; nada foi gravado.');
      }
      const slug =
        String(data.vaultName || 'cofre')
          .normalize('NFD')
          .replace(/[\u0300-\u036f]/g, '')
          .toLowerCase()
          .replace(/[^a-z0-9_-]+/g, '-')
          .replace(/^-|-$/g, '') || 'cofre';
      const stamp = new Date().toISOString().replace(/[:T]/g, '-').slice(0, 19);
      mkdirSync(BACKUP_DIR, { recursive: true, mode: 0o700 });
      const file = join(BACKUP_DIR, `myfbox-${slug}-${stamp}.myfbox.json`);
      const json = JSON.stringify(env, null, 2);
      writeFileSync(file, json, { mode: 0o600, flag: 'wx' });
      const summary = {
        saved: true,
        file: relative(PROJECT_ROOT, file),
        absolutePath: file,
        bytes: Buffer.byteLength(json),
        encryption: `${env.cipher.algorithm} + ${env.kdf.algorithm} (${env.kdf.iterations} iterações)`,
        keyFingerprint: data.keyFingerprint,
        transactionCount: data.transactionCount,
        restoreWith: 'Senha mestra atual do cofre, em Restaurar (tela de login ou aba Backups).',
      };
      log(`backup cifrado salvo em ${file}`);
      return { content: [{ type: 'text', text: JSON.stringify(summary, null, 2) }] };
    } catch (err) {
      return {
        isError: true,
        content: [{ type: 'text', text: err instanceof Error ? err.message : String(err) }],
      };
    }
  }
);

await server.connect(new StdioServerTransport());
log(`servidor MCP pronto — código ${SHORT_CODE}; link de pareamento: ${PAIR_LINK}`);

const shutdown = () => {
  try {
    httpServer.close();
  } catch {}
  try {
    wss.close();
  } catch {}
  process.exit(0);
};
process.on('SIGINT', shutdown);
process.on('SIGTERM', shutdown);
if (process.env.MYFBOX_KEEP_ALIVE !== '1') {
  process.stdin.on('close', shutdown);
}
