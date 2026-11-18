🇧🇷 [Português (Brasil)](../../SECURITY.md) · 🇬🇧 [English (UK)](SECURITY.en-GB.md) · 🇪🇸 [Español](SECURITY.es.md) · 🇨🇳 [简体中文](SECURITY.zh-CN.md)

# MyFBox Security

## Threat model

**MyFBox protects against:**

- Anyone obtaining the **backup file** (`.myfbox.json`) or a copy of the browser's **IndexedDB**: without the master password, the contents are unreadable (AES-256-GCM).
- Reading of your data by **third parties over the network**: there is no app server and **no calls to external APIs** (100% sovereign offline; currency exchange rates are stored locally). The only existing network connection is optional: the local MCP Mode bridge on `127.0.0.1`.
- Execution of third-party scripts in the production build: the **Content Security Policy** only permits the app's own code and local WebSockets on loopback (`127.0.0.1`).

**MyFBox does not protect against:**

- **Malware or malicious extensions** on the computer/browser while the vault is **unlocked** (data is decrypted in the tab's memory).
- Someone with physical access to the computer while the vault is open. Use auto-lock (Backups › Security) and lock the app when stepping away.
- **Weak passwords.** Key derivation increases the cost of every guess, but cannot rescue a short or common password. Use a long, unique password.
- **Forgotten password**: there is no recovery, by design.

## Cryptography

| Item | Choice |
|---|---|
| Cipher | AES-256-GCM (WebCrypto), random 96-bit IV on every write |
| Key derivation | PBKDF2-HMAC-SHA256, **600,000 iterations**, random 128-bit salt |
| Key in memory | Non-extractable `CryptoKey`; raw derived bytes are zeroed after use |
| Password verification | "verifier" block encrypted with the same key (distinguishes wrong password from a corrupted file) |
| Key fingerprint | 32 bits of `SHA-256("MYFBOX_KEY_FINGERPRINT_V2" ‖ derived key)`, for visual confirmation only |

The envelope stores the algorithm, iteration count, and salt, allowing cryptographic parameters to evolve in future versions.

## Local MCP mode

- **Off by default.** Only turns on after the user authorises pairing in the interface.
- The server listens **only on `127.0.0.1`**, checks the `Origin` header (`localhost`, `127.0.0.1`, or `MYFBOX_APP_URL` only), and requires a **pairing secret** compared in constant time.
- The secret is stored in `~/.config/myfbox/mcp.json` (permissions 600) and, inside the app, within the encrypted vault. The pairing link carries the secret in the fragment (`#`), which is never sent to servers, and the app strips it from the address bar upon reading. The dialogue displays a short code (SHA-256 of the secret) to match against what the assistant showed.
- The server **never receives the password or the key**: actions run in the browser and only the results are returned. Backups via MCP deliver only the already-encrypted envelope (`AES-256-GCM`).
- **Operations blocked in MCP (exclusive to the user in the UI)**: MCP cannot create a vault, delete/destroy the vault, change the master password, restore backups, or create unencrypted backups (CSV spreadsheet export is exclusive to the user directly through the UI).
- Locking the app (manually or via auto-lock) drops the bridge; MCP actions do not count as activity towards auto-lock.
- Any local process that holds the secret can read and modify the unlocked vault. Treat the computer where MCP Mode is enabled as trusted, or switch the mode off.

## Other safeguards

- CSV export neutralises formulae (`=`, `+`, `-`, `@`) in text fields ("CSV injection").
- Fonts served locally (no Google Fonts) and `referrer` disabled.
- Development server bound strictly to `127.0.0.1`.

## Desktop App (Electron) and IPC

- **Renderer isolation:** `BrowserWindow` configured with `contextIsolation: true`, `nodeIntegration: false`, `sandbox: true`, `webSecurity: true`, and `allowRunningInsecureContent: false`.
- **Navigation and permission lockdown:** `setWindowOpenHandler` denies pop-ups/new windows; `will-navigate` restricts navigation to the app origin; `will-attach-webview` and `setPermissionRequestHandler` block webviews and device permissions.
- **Minimal, validated IPC:** `electron/preload.ts` exposes only `vault.{load, save, delete, info}` and `mcp.info` (no generic access to `fs` or `ipcRenderer`). The main process fully validates the `EncryptedVaultEnvelope` structure (PBKDF2-HMAC-SHA256 + AES-256-GCM, 20 MB limit) before writing.
- **Atomic disk persistence:** the encrypted vault is written via temporary file + `rename` at `app.getPath('userData')/vault.myfbox.json` with `0600` permissions (POSIX) — no decrypted data ever traverses IPC or touches disk.
- **Single instance:** `app.requestSingleInstanceLock()` prevents two concurrent windows from writing to the same vault.

## Reporting a vulnerability

Do not open a public issue. Use the repository's **private Security Advisory** feature (*Security › Report a vulnerability* tab) with a description, steps to reproduce, and impact. You will receive a response as soon as possible.
