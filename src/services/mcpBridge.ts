import { tDomainMcp } from '../i18n/modules/domainMcp';

export type McpBridgeStatus = 'off' | 'connecting' | 'connected' | 'error';

export interface McpBridgeOptions {
  port: number;
  token: string;
  onCall: (action: string, args: Record<string, unknown>) => Promise<unknown>;
  onStatus: (status: McpBridgeStatus, detail?: string) => void;
}

const RETRY_MS = 3000;

export function startMcpBridge(opts: McpBridgeOptions): () => void {
  let socket: WebSocket | null = null;
  let stopped = false;
  let retryTimer: number | undefined;

  const scheduleRetry = () => {
    if (stopped) return;
    window.clearTimeout(retryTimer);
    retryTimer = window.setTimeout(connect, RETRY_MS);
  };

  const connect = () => {
    if (stopped) return;
    opts.onStatus('connecting');
    try {
      socket = new WebSocket(`ws://127.0.0.1:${opts.port}`);
    } catch (err) {
      opts.onStatus(
        'error',
        err instanceof Error ? err.message : tDomainMcp('domainMcp.mcpBridge.openError')
      );
      scheduleRetry();
      return;
    }

    socket.onopen = () => {
      socket?.send(
        JSON.stringify({ type: 'hello', token: opts.token, app: 'MyFBox', protocol: 1 })
      );
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
        opts.onStatus('error', tDomainMcp('domainMcp.mcpBridge.pairRejected'));
        return;
      }
      opts.onStatus('error', tDomainMcp('domainMcp.mcpBridge.serverNotFound'));
      scheduleRetry();
    };
  };

  connect();

  return () => {
    stopped = true;
    window.clearTimeout(retryTimer);
    socket?.close(1000, tDomainMcp('domainMcp.mcpBridge.closeReason'));
    socket = null;
    opts.onStatus('off');
  };
}

export interface McpPairingRequest {
  token: string;
  port: number;
}

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

export async function mcpShortCode(token: string): Promise<string> {
  const digest = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(token));
  const hex = Array.from(new Uint8Array(digest))
    .slice(0, 4)
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('')
    .toUpperCase();
  return `${hex.slice(0, 4)}-${hex.slice(4)}`;
}
