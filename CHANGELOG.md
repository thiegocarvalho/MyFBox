# Changelog

Todas as mudanças notáveis neste projeto serão documentadas neste arquivo.

O formato é baseado em [Keep a Changelog](https://keepachangelog.com/pt-BR/1.1.0/),
e este projeto adere ao [Versionamento Semântico](https://semver.org/lang/pt-BR/).

## [Não lançado]

## [0.1.0] - 2026-11-18

### Adicionado
- **Internacionalização completa (i18n)** com suporte a **Português (Brasil) `pt-BR`**, **English (UK) `en-GB`**, **Español `es`** e **简体中文 `zh-CN`**:
  - Motor de tradução tipado (`src/i18n/`) com mais de 1.000 chaves por idioma, persistência no cofre (`VaultSettings.language`) e `localStorage`, além de atualização dinâmica do atributo `lang` e manifests PWA localizados.
  - Seletor de idioma (`LanguageSelector`) disponível na tela de bloqueio, no cabeçalho do app e em Configurações.
  - Tradução de todas as telas, modais, mensagens de erro/validação, dados padrão (contas e categorias), cabeçalhos de exportação CSV e ponte/prompts MCP.
  - Categorizador automático inteligente expandido com vocabulário nos 4 idiomas.
  - Menus nativos e diálogos do Electron (`electron/i18n.ts`) sincronizados via IPC com o idioma escolhido.
  - Landing Page multilíngue com seletor de idioma, rotas estáticas SEO (`/en-gb/`, `/es/`, `/zh-cn/`) e `sitemap.xml` com `hreflang`.
  - Documentação do repositório traduzida (`README.en-GB.md`, `README.es.md`, `README.zh-CN.md`, `docs/i18n/*`) e templates de Issue/PR bilíngues.
  - Suíte automatizada de paridade de traduções e ortografia britânica (`src/i18n/i18n.test.ts`) e testes E2E multilíngues no Playwright (`e2e/i18n.spec.ts`).
- **Controle e experiência MCP**:
  - Indicador de status e atalho rápido do MCP no cabeçalho, com navegação direta para Configurações.
  - Exibição de `mcp.json`, atalho CLI (`npx`) e prompts prontos adaptados por ambiente (Desktop vs. Web).
- **Redesign da Landing Page**:
  - Layout em split 2 colunas acima da dobra com capturas reais do app, cena animada do chat MCP e marca padronizada `MYFBOX`.
  - Melhorias de SEO e performance (canonical, `og:image` absoluto, `sitemap.xml`, `FAQPage` e preload de LCP).

### Alterado
- Atualização dos workflows de CI/CD para Node 24 e runners fixados (`ubuntu-24.04` e `macos-15-intel`).
- Empacotamento Electron otimizado excluindo `node_modules` desnecessários do `app.asar` para reduzir o tamanho dos instaladores.
- Padronização visual do componente `MyFBoxBrand` entre app, tela de bloqueio e Landing Page.

### Corrigido
- Responsividade da Landing Page em telas móveis (`320px` e `375px`).
- Alinhamento e dimensionamento do logo na tela inicial.

### Removido
- Criptomoedas da lista de moedas suportadas (foco exclusivo em moedas fiduciárias globais).

## [0.0.1] - 2026-11-18

### Adicionado
- Versão inicial do **MyFBox** para Web (PWA) e Desktop (Electron — Windows, macOS e Linux).
- Arquitetura *local-first* com cofre cifrado no dispositivo via AES-256-GCM e PBKDF2-SHA256.
- Gestão completa de lançamentos, contas, transferências, metas/orçamentos, comparativos mensais e backup cifrado `.myfbox.json` / exportação CSV.
- Servidor MCP local (`mcp/server.mjs`) para integração segura com assistentes de IA.
- Suíte de testes unitários (Vitest), E2E (Playwright), auditoria de CVEs no CI e workflows de deploy no GitHub Pages e empacotamento Desktop.

[Não lançado]: https://github.com/thiegocarvalho/MyFBox/compare/v0.1.0...HEAD
[0.1.0]: https://github.com/thiegocarvalho/MyFBox/compare/0.0.1...v0.1.0
[0.0.1]: https://github.com/thiegocarvalho/MyFBox/releases/tag/0.0.1
