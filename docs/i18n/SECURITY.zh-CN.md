🇧🇷 [Português (Brasil)](../../SECURITY.md) · 🇬🇧 [English (UK)](SECURITY.en-GB.md) · 🇪🇸 [Español](SECURITY.es.md) · 🇨🇳 [简体中文](SECURITY.zh-CN.md)

# MyFBox 安全性

## 威胁模型

**MyFBox 可防范：**

- 他人获取**备份文件**（`.myfbox.json`）或浏览器 **IndexedDB** 副本：没有主密码时，内容完全不可读（AES-256-GCM）。
- **网络第三方**读取您的数据：应用没有服务器，也**不会发起任何外部 API 请求**（100% 离线自主；货币汇率均在本地维护）。唯一存在的网络连接是可选的：位于 `127.0.0.1` 的本地 MCP 模式桥接。
- 生产构建中执行第三方脚本：**Content Security Policy** 仅允许应用自身代码及本地回环地址（`127.0.0.1`）的 WebSocket。

**MyFBox 无法防范：**

- 当保险库处于**已解锁状态**时，计算机或浏览器中的**恶意软件或恶意扩展程序**（此时数据以明文形式存在于标签页内存中）。
- 在保险库打开状态下对计算机拥有物理访问权限的人员。请启用自动锁定（备份 › 安全），并在离开时锁定应用。
- **弱密码。** 密钥派生会提高每次猜测的成本，但无法挽救过短或常见的密码。请使用长度充足且唯一的密码。
- **密码丢失**：按设计不提供密码找回功能。

## 密码学

| 项目 | 方案 |
|---|---|
| 加密算法 | AES-256-GCM (WebCrypto)，每次写入均使用随机 96 位 IV |
| 密钥派生 | PBKDF2-HMAC-SHA256，**600,000 次迭代**，随机 128 位盐值 |
| 内存中的密钥 | 不可导出的 `CryptoKey`；派生出的原始字节在使用后立即清零 |
| 密码校验 | 使用同一密钥加密的“verifier”块（用于区分密码错误与文件损坏） |
| 密钥指纹 | `SHA-256("MYFBOX_KEY_FINGERPRINT_V2" ‖ 派生密钥)` 的 32 位，仅用于可视化核对 |

加密信封会保存算法、迭代次数和盐值，以便在未来版本中演进加密参数。

## 本地 MCP 模式

- **默认关闭。** 仅在用户在界面中授权配对后才会开启。
- 服务器**仅监听 `127.0.0.1`**，校验 `Origin` 请求头（仅限 `localhost`、`127.0.0.1` 或 `MYFBOX_APP_URL`），并要求以恒定时间比对**配对密钥**。
- 密钥保存在 `~/.config/myfbox/mcp.json`（权限 600）中，并在应用内保存于加密保险库中。配对链接将密钥放在 URL 片段（`#`）中，不会发送给服务器，应用读取后会立即将其从地址栏移除。对话框会显示一个短验证码（密钥的 SHA-256），供您与助手显示的内容核对。
- 服务器**永远不会收到密码或密钥**：所有操作均在浏览器中执行，仅返回结果。通过 MCP 进行的备份仅输出已加密的信封（`AES-256-GCM`）。
- **MCP 中禁止的操作（仅限用户在界面中直接执行）**：MCP 无法创建保险库、删除/销毁保险库、更改主密码、恢复备份或执行未加密备份（导出 CSV 表格仅限用户直接在界面中操作）。
- 锁定应用（手动或自动锁定）会立即断开桥接；MCP 操作不会计入自动锁定的活跃计时。
- 任何持有该密钥的本地进程都可以读取和修改已解锁的保险库。请将开启了 MCP 模式的计算机视为受信任环境，或在不用时关闭该模式。

## 其他安全措施

- CSV 导出会对文本字段中的公式前缀（`=`、`+`、`-`、`@`）进行中和处理（防止“CSV 注入”）。
- 字体由本地提供（不使用 Google Fonts），并禁用 `referrer`。
- 开发服务器仅绑定在 `127.0.0.1`。

## 桌面应用 (Electron) 与 IPC

- **渲染进程隔离：** `BrowserWindow` 配置了 `contextIsolation: true`、`nodeIntegration: false`、`sandbox: true`、`webSecurity: true` 和 `allowRunningInsecureContent: false`。
- **导航与权限封锁：** `setWindowOpenHandler` 拒绝弹窗/新窗口；`will-navigate` 将导航限制在应用源内；`will-attach-webview` 和 `setPermissionRequestHandler` 阻止 webview 与设备权限请求。
- **最小化且经校验的 IPC：** `electron/preload.ts` 仅暴露 `vault.{load, save, delete, info}` 与 `mcp.info`（不提供对 `fs` 或 `ipcRenderer` 的通用访问）。主进程在写入前会完整校验 `EncryptedVaultEnvelope` 结构（PBKDF2-HMAC-SHA256 + AES-256-GCM，上限 20 MB）。
- **磁盘原子持久化：** 加密保险库通过临时文件 + `rename` 写入 `app.getPath('userData')/vault.myfbox.json`，权限为 `0600`（POSIX）——任何明文数据都不会经过 IPC 或写入磁盘。
- **单实例锁定：** `app.requestSingleInstanceLock()` 可防止两个并发窗口同时写入同一个保险库。

## 报告安全漏洞

请勿提交公开 Issue。请使用仓库的**私有 Security Advisory** 功能（*Security › Report a vulnerability* 标签页），附上漏洞描述、复现步骤和影响范围。我们会尽快回复。
