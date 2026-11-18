🇧🇷 [Português (Brasil)](CONTRIBUTING.md) · 🇬🇧 [English (UK)](docs/i18n/CONTRIBUTING.en-GB.md) · 🇪🇸 [Español](docs/i18n/CONTRIBUTING.es.md) · 🇨🇳 [简体中文](docs/i18n/CONTRIBUTING.zh-CN.md)

# Como contribuir com o MyFBox

Obrigado pelo interesse em contribuir com o MyFBox! Este guia resume o fluxo de trabalho, os padrões de código e as verificações obrigatórias antes de abrir um Pull Request.

## Princípios inegociáveis do projeto

- **100% offline e local-first:** nenhuma requisição a APIs externas, CDNs, fontes remotas ou telemetria.
- **Segurança do cofre:** nenhum dado descriptografado deve tocar disco, logs ou IPC; a CSP de produção permanece restrita a `'self'` e `ws://127.0.0.1:*`.
- **Clean Architecture:** `src/domain/` contém apenas regras puras e não importa `src/services/`, `src/components/` nem APIs de browser.
- **Landing Page isolada:** `landing/` é exclusiva do GitHub Pages e nunca deve ser empacotada no app Electron.

## Setup local

Requisitos: Node.js `^20.19` ou `>=22.12`.

```bash
npm install
npm run dev          # versão web em http://127.0.0.1:41730
npm run electron:dev # janela desktop Electron em modo dev
```

## Verificações antes do Pull Request

Rode todos os checks locais (os mesmos executados no CI):

```bash
npm run lint
npm test
npm run build
npm run electron:build
npm run test:e2e
```

## Fluxo de contribuição

1. Crie uma branch a partir da `main` (ex.: `feat/minha-melhoria` ou `fix/correcao-x`).
2. Use mensagens de commit no padrão **Conventional Commits** (ex.: `feat(vault): ...`, `fix(ui): ...`, `test(domain): ...`).
3. Adicione testes unitários (Vitest) ou E2E (Playwright) para novas regras de negócio ou correções de bugs.
4. Abra o Pull Request preenchendo o template padrão.

## Reporte de vulnerabilidades

**Não abra issues públicas para falhas de segurança.** Siga as instruções em [SECURITY.md](SECURITY.md).

## Licença

Ao contribuir, você concorda que suas contribuições serão licenciadas sob a **GNU AGPL-3.0-or-later** (veja [LICENSE](LICENSE)).
