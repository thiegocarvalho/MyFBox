/**
 * Cliente da ponte do Modo MCP local (lado do navegador).
 *
 * O app (aberto e desbloqueado) conecta em ws://127.0.0.1:<porta> onde o servidor
 * MCP local (`mcp/server.mjs`) escuta, autentica com o código de pareamento e passa
 * a executar as chamadas de ferramenta recebidas. Nada sai da máquina, e a chave do
 * cofre nunca deixa o navegador: o servidor só vê os resultados das ações.
 *
 * Protocolo (JSON por mensagem):
 *   app → servidor: { type: 'hello', token, app: 'MyFBox', protocol: 1 }
 *   servidor → app: { type: 'welcome' }
 *   servidor → app: { type: 'call', id, action, args }
 *   app → servidor: { type: 'result', id, ok: true, data } | { type: 'result', id, ok: false, error }
 */

export type McpBridgeStatus = 'off' | 'connecting' | 'connected' | 'error';

export interface McpBridgeOptions {
  port: number;
  token: string;
  onCall: (action: string, args: Record<string, unknown>) => Promise<unknown>;
  onStatus: (status: McpBridgeStatus, detail?: string) => void;
}

const RETRY_MS = 3000;

/** Abre a ponte e reconecta sozinha enquanto estiver ativa. Retorna a função de encerrar. */
export function startMcpBridge(opts: McpBridgeOptions): () => void {
  let socket: WebSocket | null = null;
  let stopped = false;
  let retryTimer: number | undefined;

  const connect = () => {
    if (stopped) return;
    opts.onStatus('connecting');
    try {
      socket = new WebSocket(`ws://127.0.0.1:${opts.port}`);
    } catch (err) {
      opts.onStatus('error', err instanceof Error ? err.message : 'Falha ao abrir conexão');
      scheduleRetry();
      return;
    }

    socket.onopen = () => {
      socket?.send(JSON.stringify({ type: 'hello', token: opts.token, app: 'MyFBox', protocol: 1 }));
    };

    socket.onmessage = async (event) => {
      let msg: { type?: string; id?: string; action?: string; args?: Record<string, unknown> };
      try {
        msg = JSON.parse(String(event.data));
      } catch {
        return;
      }
      if (msg.type === 'welcome') {
        opts.onStatus('connected');
        return;
      }
      if (msg.type === 'call' && msg.id && msg.action) {
        try {
          const data = await opts.onCall(msg.action, msg.args ?? {});
          socket?.send(JSON.stringify({ type: 'result', id: msg.id, ok: true, data }));
        } catch (err) {
          socket?.send(
            JSON.stringify({
              type: 'result',
              id: msg.id,
              ok: false,
              error: err instanceof Error ? err.message : String(err),
            })
          );
        }
      }
    };

    socket.onclose = (event) => {
      socket = null;
      if (stopped) return;
      if (event.code === 4401) {
        // Código de pareamento recusado: não insiste até o usuário corrigir
        opts.onStatus('error', 'Código de pareamento recusado pelo servidor MCP.');
        return;
      }
      opts.onStatus('error', 'Servidor MCP local não encontrado. Ele está rodando?');
      scheduleRetry();
    };
  };

  const scheduleRetry = () => {
    if (stopped) return;
    window.clearTimeout(retryTimer);
    retryTimer = window.setTimeout(connect, RETRY_MS);
  };

  connect();

  return () => {
    stopped = true;
    window.clearTimeout(retryTimer);
    socket?.close(1000, 'MCP desativado');
    socket = null;
    opts.onStatus('off');
  };
}

export interface McpPairingRequest {
  token: string;
  port: number;
}

/**
 * Lê um link de pareamento (`#mcp-pair=<código>&port=<porta>`) e remove o segredo da
 * barra de endereço imediatamente, para não ficar no histórico nem ser copiado junto.
 */
export function takePairingFromLocation(): McpPairingRequest | null {
  const hash = window.location.hash.replace(/^#/, '');
  if (!hash.includes('mcp-pair=')) return null;
  const params = new URLSearchParams(hash);
  const token = params.get('mcp-pair') ?? '';
  const port = Number(params.get('port')) || 4777;
  history.replaceState(null, '', window.location.pathname + window.location.search);
  if (!/^mfb_[A-Za-z0-9_-]{16,}$/.test(token) || port < 1024 || port > 65535) return null;
  return { token, port };
}

/** Código curto de conferência (igual ao mostrado pelo servidor MCP): SHA-256 do segredo. */
export async function mcpShortCode(token: string): Promise<string> {
  const digest = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(token));
  const hex = Array.from(new Uint8Array(digest))
    .slice(0, 4)
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('')
    .toUpperCase();
  return `${hex.slice(0, 4)}-${hex.slice(4)}`;
}
