# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project

MyFBox is a local-first, client-only personal finance app (React 19 + TypeScript + Vite). There is no backend: all data lives in the browser, encrypted. UI text, comments, toasts, and commit messages are in Brazilian Portuguese (commits follow Conventional Commits, e.g. `feat(currency): ...`).

## Commands

- `npm run dev` — Vite dev server with HMR
- `npm run build` — type-check (`tsc -b`, project references in `tsconfig.app.json` / `tsconfig.node.json`) then production build to `dist/`
- `npm run lint` — oxlint (config in `.oxlintrc.json`; `react/rules-of-hooks` is an error)
- `npm run preview` — serve the built `dist/`

There is no test framework configured. Verify changes with `npm run build` (type errors fail the build) and `npm run lint`.

## Architecture

### Encrypted vault (the core invariant)
- The entire app state is a single `VaultPayload` (`src/types/finance.ts`): `accounts`, `categories`, `transactions`, `settings`.
- `src/services/cryptoVault.ts` serializes the payload to JSON and encrypts it with AES-256-GCM using a key derived from the master password via PBKDF2-SHA256 (310k iterations). The result is an `EncryptedVaultEnvelope` that also carries a "verifier" ciphertext used to distinguish a wrong password from corrupted data.
- The envelope is stored in IndexedDB (`myfbox_encrypted_vault_db` / `vault_store` / key `primary_vault`). Plaintext data is never persisted — only kept in React state while unlocked. The `CryptoKey` is non-extractable and lives in the `CryptoSession`.
- Encrypted backups (`.myfbox.json`) are just the envelope downloaded as a file (`src/services/importExport.ts`); restoring re-encrypts with a fresh IV.

### State flow
- `src/App.tsx` is the single owner of state (`envelope`, `session`, `vault`) and all mutation handlers. There is no state library or context: views receive data and callbacks as props.
- **Every mutation must go through `persistVaultUpdate(nextVault)`**, which stamps `updatedAt`, updates state, re-encrypts with a new IV, and writes to IndexedDB. Don't call `setVault` directly for data changes.
- Locking (manual or auto-lock after `settings.autoLockMinutes` of inactivity) clears `session` and `vault` from memory. Without an envelope on disk, `VaultLockScreen` shows the create flow; otherwise the unlock flow.
- Tabs (`dashboard | transactions | budgets | accounts | security`) map to components in `src/components/*View.tsx`; `TransactionModal` handles create/edit including installments/recurrences (`recurrenceGroupId`, `installmentIndex/Total`). Global shortcut `N` opens a new expense.

### Domain rules worth knowing
- `Transaction.amount` is always positive; sign comes from `type` (`income`/`expense`). Dates are `YYYY-MM-DD` strings; month navigation uses `YYYY-MM` helpers in `src/utils/formatters.ts`.
- Transfers between accounts are modeled as a paired expense + income transaction (no dedicated transfer type).
- Deleting a category/account reassigns its transactions to the first remaining one; the last account cannot be deleted.
- IDs are generated ad hoc as `tx_${Date.now()}_${random}`-style strings; default categories/accounts use fixed IDs (`cat_housing`, `acc_main`, …) defined in `src/services/defaultData.ts`, and `src/utils/categorizer.ts`'s keyword map depends on those category IDs.
- Auto-categorization (`predictCategory`) first matches past transaction descriptions (accent-insensitive), then falls back to the keyword map.

### Multi-currency (BRL/USD)
- `currency` on `Account` and `Transaction` is optional; absent means `'BRL'` (keeps older vaults compatible). Totals are generally shown per currency (BRL + USD side by side) rather than silently converted.
- `src/services/currencyService.ts` fetches the USD→BRL rate from AwesomeAPI (no key), caching it in `localStorage` for 15 min and falling back to stale cache on failure. The latest rate is also saved into the vault's `settings.usdToBrlRate`. This is the only network call in the app.
- Format money via `formatMoney(value, currency, hideValues)`; `hideValues` masks amounts globally.

### Payload compatibility
Vaults persist across app versions, so new fields on `VaultPayload` types should be optional (or defaulted on load) — existing encrypted vaults and backups won't have them.

### Styling
Plain CSS, no framework. Design tokens (colors, fonts, radii, shadows) are CSS custom properties in `src/index.css`; component/layout styles are in `src/App.css`. Dark theme only. Icons from `lucide-react`.
