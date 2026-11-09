# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project

MyFBox is a local-first, client-only personal finance app (React 19 + TypeScript + Vite). There is no backend: all data lives in the browser, encrypted. UI text, comments, toasts, and commit messages are in Brazilian Portuguese (commits follow Conventional Commits, e.g. `feat(currency): ...`).

## Commands

- `npm run dev` — Vite dev server with HMR on the **fixed** port 41730 (`strictPort`). Don't change the port: the vault lives in per-origin IndexedDB
- `npm run build` — type-check (`tsc -b`, project references in `tsconfig.app.json` / `tsconfig.node.json`) then production build to `dist/`
- `npm run lint` — oxlint (config in `.oxlintrc.json`; `react/rules-of-hooks` is an error)
- `npm run preview` — serve the built `dist/` (same fixed port)
- `npm run mcp` — starts the local MCP server (`mcp/server.mjs`); normally Claude Code spawns it via `.mcp.json`

There is no test framework configured. Verify changes with `npm run build` (type errors fail the build) and `npm run lint`.

## Architecture

### Encrypted vault (the core invariant)
- The entire app state is a single `VaultPayload` (`src/types/finance.ts`): `accounts`, `categories`, `transactions`, `settings`.
- `src/services/cryptoVault.ts` serializes the payload to JSON and encrypts it with AES-256-GCM using a key derived from the master password via PBKDF2-SHA256 (600k iterations, stored in the envelope). The key comes from a single `deriveBits` (byte-identical to the old `deriveKey`, so old files still open), and the displayed key fingerprint is a hash of that strong key. Never derive anything cheaper from the password. Vaults with fewer iterations are re-encrypted with the current default on unlock/restore (`needsKdfUpgrade`). The result is an `EncryptedVaultEnvelope` that also carries a "verifier" ciphertext used to distinguish a wrong password from corrupted data.
- The envelope is stored in IndexedDB (`myfbox_encrypted_vault_db` / `vault_store` / key `primary_vault`) via `src/services/vaultStorage.ts` (`readEncryptedEnvelope` / `writeEncryptedEnvelope`). Plaintext data is never persisted — only kept in React state while unlocked. The `CryptoKey` is non-extractable and lives in the `CryptoSession`.
- Encrypted backups (`.myfbox.json`) are just the envelope downloaded as a file (`src/services/importExport.ts`); restoring re-encrypts with a fresh IV.
- The MCP tool `export_backup` writes that same encrypted envelope to `vaults/` (mode 600, gitignored along with `*.myfbox.json`). The app hands over only ciphertext, and the agent gets just the file path.
- The app asks for persistent storage (`navigator.storage.persist()`, `src/services/storagePersistence.ts`) when the vault is opened. IndexedDB is per-origin, so changing the dev server port makes the vault "disappear" (it is still stored under the old origin). Migrate with backup + restore.

### State flow
- `src/App.tsx` is the single owner of state (`envelope`, `session`, `vault`) and all mutation handlers. There is no state library or context: views receive data and callbacks as props.
- **Every mutation must go through `persistVaultUpdate(nextVault)`**, which stamps `updatedAt`, updates state, re-encrypts with a new IV, and writes to IndexedDB. Writes are serialized through `writeChainRef` so fast consecutive edits can't land out of order. Don't call `setVault` directly for data changes.
- Locking (manual or auto-lock after `settings.autoLockMinutes` of inactivity) clears `session` and `vault` from memory. Without an envelope on disk, `VaultLockScreen` shows the create flow; otherwise the unlock flow.
- Tabs (`dashboard | transactions | compare | budgets | accounts | security`) map to components in `src/components/*View.tsx`; `TransactionModal` handles create/edit including installments/recurrences (`recurrenceGroupId`, `installmentIndex/Total`). Global shortcut `N` opens a new expense.

### Domain rules worth knowing
- Pure domain use cases live in `src/domain/vaultUseCases.ts`, runtime envelope/payload validation in `src/domain/validation.ts`, and cryptographically secure ID generation (`generateEntityId`) in `src/domain/id.ts`.
- `Transaction.amount` is always positive; sign comes from `type` (`income`/`expense`). Dates are `YYYY-MM-DD` strings; month navigation uses `YYYY-MM` helpers in `src/utils/formatters.ts`.
- Transfers between accounts (`transferBetweenAccountsInVault`) are modeled as a paired expense + income transaction (with automatic multi-currency conversion and rate freezing).
- Deleting a category reassigns its transactions to another category of the same type (creating an "Outros" one if needed). Deleting an account prefers a remaining account with the same currency. The last account cannot be deleted.
- Entity IDs are generated via `generateEntityId(prefix)` using `crypto.randomUUID()`; default categories/accounts use fixed IDs (`cat_housing`, `acc_main`, …) defined in `src/services/defaultData.ts`, and `src/utils/categorizer.ts`'s keyword map depends on those category IDs.
- Auto-categorization (`predictCategory`) first matches past transaction descriptions (accent-insensitive), then falls back to the keyword map.

### Multi-currency (Offline exchange rates & 16 popular currencies)
- `currency` on `Account` and `Transaction` is optional; absent means `'BRL'` (keeps older vaults compatible). Totals are generally shown per currency (BRL + USD side by side) rather than silently converted.
- The app is **100% offline**: there are NO external API calls for exchange rates. Exchange rates are stored in the encrypted vault (`settings.exchangeRates` and legacy `settings.usdToBrlRate`), managed directly by the user in Settings or by the AI agent via MCP (`set_exchange_rate`, `list_exchange_rates`, `delete_exchange_rate`). Supported currencies are a curated list of the world's 16 most popular fiat and crypto currencies: BRL, USD, EUR, GBP, JPY, CHF, CAD, AUD, CNY, ARS, CLP, UYU, MXN, BTC, ETH, USDT. `findExchangeRate` in `src/services/currencyService.ts` resolves direct pairs, inverse pairs (`1 / rate`), and two-hop triangulation via `BRL` and `USD` pivots.
- Format money via `formatMoney(value, currency, hideValues)`; `hideValues` masks amounts globally.

### Local MCP mode
- Off by default; the user turns it on in **Backups › Modo MCP local** (settings `mcpEnabled`/`mcpToken`/`mcpPort` live inside the encrypted vault).
- `mcp/server.mjs` speaks MCP over stdio and opens a WebSocket bridge **only on 127.0.0.1** (default port 4777). The open, unlocked app connects to it (`src/services/mcpBridge.ts`) and executes tool calls; the server never sees the password or key.
- Pairing is by link, like a device login: the server keeps a secret in `~/.config/myfbox/mcp.json` (0600) and its tools return `<MYFBOX_APP_URL>/#mcp-pair=<secret>&port=<port>` until paired. The app reads the fragment, strips it from the URL, and asks the user to confirm a short SHA-256 code (`McpPairDialog`). The bridge also checks the Origin header and compares the secret in constant time.
- Tool logic is pure and lives in `src/services/mcpActions.ts` (`runMcpAction`). `App.tsx` runs calls through a queue and writes via `persistVaultUpdate`. `vaultRef` is updated synchronously on every write so queued calls never read a stale vault. Locking the app (manual or auto-lock) tears down the bridge, and MCP activity does not reset the inactivity timer.
- **Hard MCP security boundaries**: MCP can never create a vault, delete/destroy a vault, change the master password, restore a backup, or export unencrypted backups/CSV (CSV export is strictly user-only via the browser UI; MCP `export_backup` only writes the AES-256-GCM encrypted `.myfbox.json` envelope).
- Project skills: `.claude/skills/myfbox/SKILL.md` (tools + recipes) and `.claude/skills/myfbox-insights/SKILL.md` (how the agent writes monthly insights). Keep them in sync when tools change.

### Comparativos & insights
- The "Comparativos" tab (`ComparisonView`) and the MCP tool `get_month_comparison` share one pure function, `buildMonthComparison` in `src/utils/comparison.ts`. Month totals use accrual (paid + pending), in BRL.
- Monthly insights are written by the agent via MCP (`save_insight`) and stored encrypted in `VaultPayload.insights` (optional field). Each insight stores a `dataSignature` of the month's numbers, and the UI flags it as outdated when the current signature differs.

### Payload compatibility
Vaults persist across app versions, so new fields on `VaultPayload` types should be optional (or defaulted on load) — existing encrypted vaults and backups won't have them.

### Styling
Plain CSS, no framework. Visual direction is a dark neon-brutalist look: palette `#101010` / `#FFFFFF` / `#C8FF00`, square corners, 1px borders, `Unbounded` display font in uppercase for headings, solid offset shadows instead of soft ones. Design tokens are CSS custom properties in `src/index.css` (`--color-teal`/`--color-emerald` are legacy names that now resolve to the lime accent; prefer `--color-accent`). Component/layout styles are in `src/App.css`, and the brutalist overrides live in the "CAMADA BRUTALISTA" block at the end of it. Dark theme only. Icons from `lucide-react`. Fonts are self-hosted via `@fontsource` (latin subsets, imported in `main.tsx`); don't add Google Fonts or other third-party requests.

### Security hardening
- Production builds get a Content Security Policy via the `myfbox-csp` plugin in `vite.config.ts` (allows only self and `ws://127.0.0.1:*`). It isn't applied in dev because Vite injects inline scripts. The app makes zero external network calls.
- CSV export neutralizes formula injection (`safeCsvText`). See `SECURITY.md` for the threat model.
