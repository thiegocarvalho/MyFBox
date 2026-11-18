import react from '@vitejs/plugin-react'
import { defineConfig, type Plugin } from 'vite'

// Porta FIXA de propósito: o cofre fica no IndexedDB, que é separado por endereço
// (origem). Se o app abrir em outra porta, o cofre "some" (continua salvo na porta
// antiga). strictPort faz o Vite falhar em vez de escolher outra porta sozinho.
const APP_PORT = 41730

/**
 * Content Security Policy do build de produção. O app é 100% offline:
 * - só pode carregar código, estilos e fontes de si mesmo;
 * - só pode falar com a ponte MCP local (127.0.0.1);
 * - nenhuma requisição externa a APIs de terceiros é permitida.
 * Estilos inline são necessários para cores dinâmicas de categorias/contas (style={{...}}).
 * Em desenvolvimento a CSP não é aplicada: o Vite injeta scripts inline para o HMR.
 */
const CONTENT_SECURITY_POLICY = [
  "default-src 'self'",
  "script-src 'self'",
  "style-src 'self' 'unsafe-inline'",
  "font-src 'self'",
  "img-src 'self' data: blob:",
  "connect-src 'self' ws://127.0.0.1:*",
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

/**
 * Pré-carrega as fontes da primeira tela (título em Unbounded 800 e texto em Plus Jakarta
 * 400), que definem o LCP: sem isso a tela pinta com a fonte reserva e repinta depois.
 */
const PRELOAD_FONTS = [/unbounded-latin-800-normal-[\w-]+\.woff2$/, /plus-jakarta-sans-latin-400-normal-[\w-]+\.woff2$/]

function preloadCriticalFonts(): Plugin {
  return {
    name: 'myfbox-preload-fonts',
    apply: 'build',
    transformIndexHtml: (_html, ctx) => {
      const files = Object.keys(ctx.bundle ?? {})
      return PRELOAD_FONTS.flatMap((pattern) => {
        const file = files.find((f) => pattern.test(f))
        return file
          ? [
              {
                tag: 'link',
                attrs: { rel: 'preload', href: `./${file}`, as: 'font', type: 'font/woff2', crossorigin: '' },
                injectTo: 'head' as const,
              },
            ]
          : []
      })
    },
  }
}

// https://vite.dev/config/
export default defineConfig({
  base: './',
  plugins: [react(), contentSecurityPolicy(), preloadCriticalFonts()],
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
