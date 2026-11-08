#!/usr/bin/env node
/**
 * Servidor MCP local do MyFBox.
 *
 * Fala MCP com o cliente (ex.: Claude Code) via stdio e abre uma ponte WebSocket
 * SOMENTE em 127.0.0.1. O app MyFBox — aberto, desbloqueado e com o "Modo MCP local"
 * ligado na aba Backups — conecta nessa ponte com o código de pareamento e executa
 * as ferramentas. Este processo nunca vê a senha nem a chave do cofre; só recebe o
 * resultado de cada ação.
 *
 * Pareamento por link (como o login do Claude Code): na primeira vez o servidor gera
 * um código secreto e o guarda em ~/.config/myfbox/mcp.json (permissão 600). Enquanto
 * o app não estiver pareado, as ferramentas devolvem um link
 *   <MYFBOX_APP_URL>/#mcp-pair=<código>&port=<porta>
 * que o usuário abre; o app pede confirmação mostrando um código curto (ex.: 3F9A-12C4)
 * igual ao exibido aqui. O segredo vai no fragmento (#), que não é enviado a servidores.
 *
 * Variáveis de ambiente (todas opcionais):
 *   MYFBOX_APP_URL              endereço do app (padrão http://localhost:41730)
 *   MYFBOX_MCP_PORT             porta da ponte (padrão 4777)
 *   MYFBOX_MCP_TOKEN            força um código específico em vez do arquivo de configuração
 *   MYFBOX_BACKUP_DIR           pasta dos backups cifrados (padrão <projeto>/vaults, fora do git)
 *   MYFBOX_MCP_ALLOWED_ORIGINS  origens extras permitidas, separadas por vírgula
 *                               (localhost, 127.0.0.1 e a origem de MYFBOX_APP_URL já são aceitas)
 */
import { timingSafeEqual, randomUUID, randomBytes, createHash } from 'node:crypto';
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

/** Código secreto de pareamento: variável de ambiente, ou arquivo local, ou gera e salva. */
function loadOrCreateToken() {
  const fromEnv = process.env.MYFBOX_MCP_TOKEN?.trim();
  if (fromEnv) return fromEnv;
  try {
    const saved = JSON.parse(readFileSync(CONFIG_FILE, 'utf8'));
    if (typeof saved.token === 'string' && saved.token.startsWith('mfb_')) return saved.token;
  } catch {
    // primeiro uso: ainda não existe
  }
  const token = `mfb_${randomBytes(18).toString('base64url')}`;
  mkdirSync(CONFIG_DIR, { recursive: true, mode: 0o700 });
  writeFileSync(CONFIG_FILE, JSON.stringify({ token }, null, 2), { mode: 0o600 });
  chmodSync(CONFIG_FILE, 0o600);
  return token;
}

const TOKEN = loadOrCreateToken();
/** Código curto para conferência visual (mesmo cálculo do app: SHA-256 do segredo) */
const SHORT_CODE = (() => {
  const hex = createHash('sha256').update(TOKEN).digest('hex').slice(0, 8).toUpperCase();
  return `${hex.slice(0, 4)}-${hex.slice(4)}`;
})();
const PAIR_LINK = `${APP_URL}/#mcp-pair=${encodeURIComponent(TOKEN)}&port=${PORT}`;

const EXTRA_ORIGINS = [
  ...(process.env.MYFBOX_MCP_ALLOWED_ORIGINS || '').split(',').map((o) => o.trim()),
  (() => {
    try {
      return new URL(APP_URL).origin;
    } catch {
      return '';
    }
  })(),
].filter(Boolean);
const CALL_TIMEOUT_MS = 20_000;
const HELLO_TIMEOUT_MS = 5_000;

const log = (...args) => console.error('[myfbox-mcp]', ...args); // stdout é do protocolo MCP

// ---------------------------------------------------------------------------
// Ponte WebSocket com o app
// ---------------------------------------------------------------------------
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
  if (!origin) return false; // só navegadores (o app) conectam
  if (EXTRA_ORIGINS.includes(origin)) return true;
  try {
    const { protocol, hostname } = new URL(origin);
    return (protocol === 'http:' || protocol === 'https:') && (hostname === 'localhost' || hostname === '127.0.0.1');
  } catch {
    return false;
  }
}

const wss = new WebSocketServer({
  host: '127.0.0.1',
  port: PORT,
  maxPayload: 64 * 1024 * 1024, // o backup cifrado passa por aqui; cofres grandes passam de 1 MB
  verifyClient: ({ origin }) => {
    const ok = originAllowed(origin);
    if (!ok) log(`conexão recusada da origem "${origin ?? '(sem origem)'}"`);
    return ok;
  },
});

wss.on('listening', () => log(`ponte ouvindo em ws://127.0.0.1:${PORT}`));
wss.on('error', (err) => {
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

// ---------------------------------------------------------------------------
// Ferramentas MCP
// ---------------------------------------------------------------------------
const server = new McpServer({ name: 'myfbox', version: '1.0.0' });

const ymd = z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'use AAAA-MM-DD');
const ym = z.string().regex(/^\d{4}-\d{2}$/, 'use AAAA-MM');
const txType = z.enum(['income', 'expense']);
const txStatus = z.enum(['paid', 'pending']);
const currency = z.enum(['BRL', 'USD']);

function tool(name, description, inputSchema, { readOnly = false, destructive = false } = {}) {
  server.registerTool(
    name,
    {
      description,
      inputSchema,
      annotations: { readOnlyHint: readOnly, destructiveHint: destructive, openWorldHint: false },
    },
    async (args) => {
      try {
        const data = await callApp(name, args ?? {});
        return { content: [{ type: 'text', text: JSON.stringify(data, null, 2) }] };
      } catch (err) {
        return { isError: true, content: [{ type: 'text', text: err instanceof Error ? err.message : String(err) }] };
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

tool('list_accounts', 'Lista as contas do cofre com moeda, saldo confirmado e saldo previsto.', {}, { readOnly: true });

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
    currency: currency.optional().describe('Padrão: moeda da conta'),
    exchangeRate: z.number().positive().optional().describe('Cotação USD→BRL a fixar (só quando há dólar)'),
    notes: z.string().optional(),
    repeatMonths: z.number().int().min(1).max(36).optional(),
  }
);

tool(
  'update_transaction',
  'Altera campos de um lançamento existente (pelo id). Só os campos enviados mudam. Use status "paid" para dar baixa.',
  {
    id: z.string(),
    description: z.string().min(1).optional(),
    amount: z.number().positive().optional(),
    type: txType.optional(),
    date: ymd.optional(),
    status: txStatus.optional(),
    categoryId: z.string().optional(),
    categoryName: z.string().optional(),
    accountId: z.string().optional(),
    accountName: z.string().optional(),
    currency: currency.optional(),
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
    body: z.string().min(1).max(4000).describe('Análise em português; parágrafos separados por linha em branco'),
    highlights: z.array(z.string().min(1).max(160)).max(6).optional().describe('Até 6 pontos curtos'),
  }
);

tool(
  'delete_insight',
  'Remove o insight de um mês (não mexe em lançamentos).',
  { month: ym },
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
      return { isError: true, content: [{ type: 'text', text: err instanceof Error ? err.message : String(err) }] };
    }
  }
);

await server.connect(new StdioServerTransport());
log(`servidor MCP pronto — código ${SHORT_CODE}; link de pareamento: ${PAIR_LINK}`);

const shutdown = () => {
  wss.close();
  process.exit(0);
};
process.on('SIGINT', shutdown);
process.on('SIGTERM', shutdown);
process.stdin.on('close', shutdown);
