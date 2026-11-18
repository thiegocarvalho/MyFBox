import { tDomainMcp } from '../i18n/modules/domainMcp';

export type McpEnvironment = 'desktop' | 'web-remote' | 'local';

export interface McpSetupInfo {
  environment: McpEnvironment;
  appUrl: string | null;
  serverPath: string;
  mcpConfigJson: string;
  claudeCliCommand: string;
  agentPrompt: string;
}

export interface McpSetupContext {
  desktopMcpPath: string | null;
  isDesktop?: boolean;
  hostname?: string;
  origin?: string;
  pathname?: string;
}

const DEFAULT_SERVER_PATH = '/CAMINHO/ABSOLUTO/MyFBox/mcp/server.mjs';
const GITHUB_NPX_PACKAGE = 'github:thiegocarvalho/MyFBox';

function normalizeAppUrl(origin: string, pathname: string): string {
  const cleanOrigin = origin.replace(/\/+$/, '');
  const cleanPath = pathname
    .replace(/\/index\.html$/i, '')
    .replace(/\/+$/, '');
  return `${cleanOrigin}${cleanPath}`;
}

/**
 * Monta o JSON `mcp.json` e o comando CLI adaptados ao ambiente atual:
 * - Desktop (Linux, Windows, macOS): aponta direto para o `server.mjs` empacotado.
 * - Web remota (ex.: GitHub Pages): usa `npx -y github:thiegocarvalho/MyFBox` com `MYFBOX_APP_URL` completa.
 * - Localhost: aponta para o `mcp/server.mjs` local.
 */
export function buildMcpSetupInfo(ctx: McpSetupContext): McpSetupInfo {
  const isDesktop =
    ctx.isDesktop ??
    (Boolean(ctx.desktopMcpPath) ||
      (typeof window !== 'undefined' && Boolean(window.myfboxDesktop?.isDesktop)));
  const hostname =
    ctx.hostname ?? (typeof window !== 'undefined' ? window.location.hostname : 'localhost');
  const origin = ctx.origin ?? (typeof window !== 'undefined' ? window.location.origin : '');
  const pathname = ctx.pathname ?? (typeof window !== 'undefined' ? window.location.pathname : '');

  const isLocalHost = hostname === '127.0.0.1' || hostname === 'localhost' || hostname === '';
  const environment: McpEnvironment = isDesktop
    ? 'desktop'
    : isLocalHost
      ? 'local'
      : 'web-remote';

  const appUrl = environment === 'web-remote' && origin ? normalizeAppUrl(origin, pathname) : null;
  const serverPath = ctx.desktopMcpPath?.trim() || DEFAULT_SERVER_PATH;

  const mcpConfigObject =
    environment === 'web-remote'
      ? {
          mcpServers: {
            myfbox: {
              command: 'npx',
              args: ['-y', GITHUB_NPX_PACKAGE],
              ...(appUrl ? { env: { MYFBOX_APP_URL: appUrl } } : {}),
            },
          },
        }
      : {
          mcpServers: {
            myfbox: {
              command: 'node',
              args: [serverPath],
            },
          },
        };

  const quotedPath = serverPath.includes(' ') ? `"${serverPath}"` : serverPath;
  const claudeCliCommand =
    environment === 'web-remote'
      ? `claude mcp add myfbox${appUrl ? ` -e MYFBOX_APP_URL=${appUrl}` : ''} -- npx -y ${GITHUB_NPX_PACKAGE}`
      : `claude mcp add myfbox -- node ${quotedPath}`;

  const agentPrompt =
    environment === 'web-remote'
      ? appUrl
        ? tDomainMcp('domainMcp.mcpConfig.agentPromptWebWithUrl', {
            package: GITHUB_NPX_PACKAGE,
            appUrl,
          })
        : tDomainMcp('domainMcp.mcpConfig.agentPromptWeb', {
            package: GITHUB_NPX_PACKAGE,
          })
      : tDomainMcp('domainMcp.mcpConfig.agentPromptLocal', {
          serverPath,
        });

  return {
    environment,
    appUrl,
    serverPath,
    mcpConfigJson: JSON.stringify(mcpConfigObject, null, 2),
    claudeCliCommand,
    agentPrompt,
  };
}
