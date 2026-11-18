import { describe, expect, it } from 'vitest';
import { buildMcpSetupInfo } from './mcpConfig';

describe('buildMcpSetupInfo', () => {
  it('gera configuração direta com caminho empacotado no Desktop (Linux/macOS)', () => {
    const info = buildMcpSetupInfo({
      desktopMcpPath: '/opt/MyFBox/resources/mcp/server.mjs',
      isDesktop: true,
      hostname: '',
      origin: 'file://',
    });

    expect(info.environment).toBe('desktop');
    expect(info.appUrl).toBeNull();
    expect(JSON.parse(info.mcpConfigJson)).toEqual({
      mcpServers: {
        myfbox: {
          command: 'node',
          args: ['/opt/MyFBox/resources/mcp/server.mjs'],
        },
      },
    });
    expect(info.claudeCliCommand).toBe(
      'claude mcp add myfbox -- node /opt/MyFBox/resources/mcp/server.mjs',
    );
  });

  it('escapa espaços no comando CLI no Desktop (Windows/macOS)', () => {
    const info = buildMcpSetupInfo({
      desktopMcpPath: 'C:\\Program Files\\MyFBox\\resources\\mcp\\server.mjs',
      isDesktop: true,
    });

    expect(JSON.parse(info.mcpConfigJson)).toEqual({
      mcpServers: {
        myfbox: {
          command: 'node',
          args: ['C:\\Program Files\\MyFBox\\resources\\mcp\\server.mjs'],
        },
      },
    });
    expect(info.claudeCliCommand).toBe(
      'claude mcp add myfbox -- node "C:\\Program Files\\MyFBox\\resources\\mcp\\server.mjs"',
    );
  });

  it('usa npx e MYFBOX_APP_URL com subpath completo na versão Web remota', () => {
    const info = buildMcpSetupInfo({
      desktopMcpPath: null,
      isDesktop: false,
      hostname: 'thiegocarvalho.github.io',
      origin: 'https://thiegocarvalho.github.io',
      pathname: '/MyFBox/app/',
    });

    expect(info.environment).toBe('web-remote');
    expect(info.appUrl).toBe('https://thiegocarvalho.github.io/MyFBox/app');
    expect(JSON.parse(info.mcpConfigJson)).toEqual({
      mcpServers: {
        myfbox: {
          command: 'npx',
          args: ['-y', 'github:thiegocarvalho/MyFBox'],
          env: {
            MYFBOX_APP_URL: 'https://thiegocarvalho.github.io/MyFBox/app',
          },
        },
      },
    });
    expect(info.claudeCliCommand).toBe(
      'claude mcp add myfbox -e MYFBOX_APP_URL=https://thiegocarvalho.github.io/MyFBox/app -- npx -y github:thiegocarvalho/MyFBox',
    );
  });

  it('omite MYFBOX_APP_URL e usa script local em localhost', () => {
    const info = buildMcpSetupInfo({
      desktopMcpPath: null,
      isDesktop: false,
      hostname: 'localhost',
      origin: 'http://localhost:41730',
      pathname: '/',
    });

    expect(info.environment).toBe('local');
    expect(info.appUrl).toBeNull();
    expect(JSON.parse(info.mcpConfigJson)).toEqual({
      mcpServers: {
        myfbox: {
          command: 'node',
          args: ['/CAMINHO/ABSOLUTO/MyFBox/mcp/server.mjs'],
        },
      },
    });
  });
});
