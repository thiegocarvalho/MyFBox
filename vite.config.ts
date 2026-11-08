import react from '@vitejs/plugin-react'
import { defineConfig, type Plugin } from 'vite'

// Porta FIXA de propósito: o cofre fica no IndexedDB, que é separado por endereço
// (origem). Se o app abrir em outra porta, o cofre "some" (continua salvo na porta
// antiga). strictPort faz o Vite falhar em vez de escolher outra porta sozinho.
const APP_PORT = 41730

/**
 * Content Security Policy do build de produção. O app só pode:
 * - carregar código, estilos e fontes de si mesmo;
 * - buscar a cotação USD/BRL (AwesomeAPI) e falar com a ponte MCP local (127.0.0.1).
 * Estilos inline são necessários para cores dinâmicas de categorias/contas (style={{...}}).
 * Em desenvolvimento a CSP não é aplicada: o Vite injeta scripts inline para o HMR.
 */
const CONTENT_SECURITY_POLICY = [
  "default-src 'self'",
  "script-src 'self'",
  "style-src 'self' 'unsafe-inline'",
  "font-src 'self'",
  "img-src 'self' data: blob:",
  "connect-src 'self' https://economia.awesomeapi.com.br ws://127.0.0.1:*",
  "object-src 'none'",
  "base-uri 'self'",
  "form-action 'none'",
].join('; ')

function contentSecurityPolicy(): Plugin {
  return {
    name: 'myfbox-csp',
    apply: 'build',
    transformIndexHtml: () => [
      {
        tag: 'meta',
        attrs: { 'http-equiv': 'Content-Security-Policy', content: CONTENT_SECURITY_POLICY },
        injectTo: 'head-prepend',
      },
    ],
  }
}

// https://vite.dev/config/
export default defineConfig({
  plugins: [react(), contentSecurityPolicy()],
  server: {
    port: APP_PORT,
    strictPort: true,
    host: '127.0.0.1',
  },
  preview: {
    port: APP_PORT,
    strictPort: true,
    host: '127.0.0.1',
  },
})
