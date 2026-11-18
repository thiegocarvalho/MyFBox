🇧🇷 [Português (Brasil)](../../CONTRIBUTING.md) · 🇬🇧 [English (UK)](CONTRIBUTING.en-GB.md) · 🇪🇸 [Español](CONTRIBUTING.es.md) · 🇨🇳 [简体中文](CONTRIBUTING.zh-CN.md)

# Contributing to MyFBox

Thank you for your interest in contributing to MyFBox! This guide summarises the workflow, coding standards, and mandatory checks before opening a Pull Request.

## Non-negotiable project principles

- **100% offline and local-first:** no requests to external APIs, CDNs, remote fonts, or telemetry.
- **Vault security:** no decrypted data may touch disk, logs, or IPC; the production CSP remains restricted to `'self'` and `ws://127.0.0.1:*`.
- **Clean Architecture:** `src/domain/` contains pure rules only and must not import `src/services/`, `src/components/`, or browser APIs.
- **Isolated Landing Page:** `landing/` is exclusively for GitHub Pages and must never be packaged into the Electron app.

## Local setup

Requirements: Node.js `^20.19` or `>=22.12`.

```bash
npm install
npm run dev          # web version at http://127.0.0.1:41730
npm run electron:dev # Electron desktop window in dev mode
```

## Checks before opening a Pull Request

Run all local checks (the same ones executed in CI):

```bash
npm run lint
npm test
npm run build
npm run electron:build
npm run test:e2e
```

## Contribution workflow

1. Create a branch from `main` (e.g. `feat/my-improvement` or `fix/issue-x`).
2. Use commit messages following **Conventional Commits** (e.g. `feat(vault): ...`, `fix(ui): ...`, `test(domain): ...`).
3. Add unit tests (Vitest) or E2E tests (Playwright) for new business rules or bug fixes.
4. Open the Pull Request by filling out the standard template.

## Reporting vulnerabilities

**Do not open public issues for security flaws.** Follow the instructions in [SECURITY.en-GB.md](SECURITY.en-GB.md).

## Licence

By contributing, you agree that your contributions will be licensed under the **GNU AGPL-3.0-or-later** (see [LICENSE](../../LICENSE)).
