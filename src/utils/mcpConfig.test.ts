import { describe, expect, it } from 'vitest';
import { buildMcpSetupInfo } from './mcpConfig';

describe('buildMcpSetupInfo', () => {
  it('gera configuração direta com caminho empacotado no Desktop', () => {
    const info = buildMcpSetupInfo({
      desktopMcpPath: '/opt/MyFBox/resources/app.asar.unpacked/mcp/server.mjs',
      isDesktop: true,
      hostname: '',
      origin: 'file://',
    });

    expect(info.environment).toBe('desktop');
    expect(info.appOrigin).toBeNull();
    const parsed = JSON.parse(info.mcpConfigJson);
    expect(parsed).toEqual({
      mcpServers: {
        myfbox: {
          command: 'node',
          args: ['/opt/MyFBox/resources/app.asar.unpacked/mcp/server.mjs'],
        },
      },
    });
    expect(info.claudeCliCommand).toBe(
      'claude mcp add myfbox -- node /opt/MyFBox/resources/app.asar.unpacked/mcp/server.mjs',
    );
  });

  it('inclui aspas no comando CLI quando o caminho Desktop tem espaços', () => {
    const info = buildMcpSetupInfo({
      desktopMcpPath: 'C:\\Program Files\\MyFBox\\resources\\mcp\\server.mjs',
      isDesktop: true,
    });

    expect(info.claudeCliCommand).toBe(
      'claude mcp add myfbox -- node "C:\\Program Files\\MyFBox\\resources\\mcp\\server.mjs"',
    );
  });

  it('inclui MYFBOX_APP_URL na versão Web remota', () => {
    const info = buildMcpSetupInfo({
      desktopMcpPath: null,
      isDesktop: false,
      hostname: 'thiegocarvalho.github.io',
      origin: 'https://thiegocarvalho.github.io',
    });

    expect(info.environment).toBe('web-remote');
    expect(info.appOrigin).toBe('https://thiegocarvalho.github.io');
    const parsed = JSON.parse(info.mcpConfigJson);
    expect(parsed).toEqual({
      mcpServers: {
        myfbox: {
          command: 'node',
          args: ['/CAMINHO/ABSOLUTO/MyFBox/mcp/server.mjs'],
          env: {
            MYFBOX_APP_URL: 'https://thiegocarvalho.github.io',
          },
        },
      },
    });
    expect(info.claudeCliCommand).toBe(
      'claude mcp add myfbox -e MYFBOX_APP_URL=https://thiegocarvalho.github.io -- node /CAMINHO/ABSOLUTO/MyFBox/mcp/server.mjs',
    );
  });

  it('omite MYFBOX_APP_URL em localhost', () => {
    const info = buildMcpSetupInfo({
      desktopMcpPath: null,
      isDesktop: false,
      hostname: 'localhost',
      origin: 'http://localhost:41730',
    });

    expect(info.environment).toBe('local');
    expect(info.appOrigin).toBeNull();
    const parsed = JSON.parse(info.mcpConfigJson);
    expect(parsed.mcpServers.myfbox.env).toBeUndefined();
  });
});
