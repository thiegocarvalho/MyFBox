export type McpEnvironment = 'desktop' | 'web-remote' | 'local';

export interface McpSetupInfo {
  environment: McpEnvironment;
  appOrigin: string | null;
  serverPath: string;
  mcpConfigJson: string;
  claudeCliCommand: string;
  cloneCommand: string;
}

export interface McpSetupContext {
  desktopMcpPath: string | null;
  isDesktop?: boolean;
  hostname?: string;
  origin?: string;
}

const DEFAULT_SERVER_PATH = '/CAMINHO/ABSOLUTO/MyFBox/mcp/server.mjs';
const CLONE_COMMAND =
  'git clone https://github.com/thiegocarvalho/MyFBox.git && cd MyFBox && npm install';

/**
 * Monta o JSON `mcp.json` e comandos de instalação adaptados ao ambiente atual
 * (Desktop Electron empacotado, Web remota como GitHub Pages, ou localhost).
 */
export function buildMcpSetupInfo(ctx: McpSetupContext): McpSetupInfo {
  const isDesktop =
    ctx.isDesktop ??
    (Boolean(ctx.desktopMcpPath) ||
      (typeof window !== 'undefined' && Boolean(window.myfboxDesktop?.isDesktop)));
  const hostname =
    ctx.hostname ?? (typeof window !== 'undefined' ? window.location.hostname : 'localhost');
  const origin = ctx.origin ?? (typeof window !== 'undefined' ? window.location.origin : '');

  const isLocalHost = hostname === '127.0.0.1' || hostname === 'localhost' || hostname === '';
  const environment: McpEnvironment = isDesktop
    ? 'desktop'
    : isLocalHost
      ? 'local'
      : 'web-remote';

  const appOrigin = environment === 'web-remote' && origin ? origin : null;
  const serverPath = ctx.desktopMcpPath?.trim() || DEFAULT_SERVER_PATH;

  const mcpConfigObject = {
    mcpServers: {
      myfbox: {
        command: 'node',
        args: [serverPath],
        ...(appOrigin ? { env: { MYFBOX_APP_URL: appOrigin } } : {}),
      },
    },
  };

  const quotedPath = serverPath.includes(' ') ? `"${serverPath}"` : serverPath;
  const claudeCliCommand = appOrigin
    ? `claude mcp add myfbox -e MYFBOX_APP_URL=${appOrigin} -- node ${quotedPath}`
    : `claude mcp add myfbox -- node ${quotedPath}`;

  return {
    environment,
    appOrigin,
    serverPath,
    mcpConfigJson: JSON.stringify(mcpConfigObject, null, 2),
    claudeCliCommand,
    cloneCommand: CLONE_COMMAND,
  };
}
