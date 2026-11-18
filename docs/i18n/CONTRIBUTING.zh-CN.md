🇧🇷 [Português (Brasil)](../../CONTRIBUTING.md) · 🇬🇧 [English (UK)](CONTRIBUTING.en-GB.md) · 🇪🇸 [Español](CONTRIBUTING.es.md) · 🇨🇳 [简体中文](CONTRIBUTING.zh-CN.md)

# 如何为 MyFBox 做贡献

感谢您有兴趣为 MyFBox 做出贡献！本指南总结了在提交 Pull Request 之前的工作流程、代码规范和强制检查项。

## 项目的不可妥协原则

- **100% 离线与本地优先 (local-first)：** 不得向外部 API、CDN、远程字体或遥测服务发起任何请求。
- **保险库安全：** 任何明文数据不得写入磁盘、日志或通过 IPC 传输；生产环境的 CSP 必须严格限制为 `'self'` 和 `ws://127.0.0.1:*`。
- **整洁架构 (Clean Architecture)：** `src/domain/` 仅包含纯业务规则，不得导入 `src/services/`、`src/components/` 或浏览器 API。
- **落地页隔离：** `landing/` 专用于 GitHub Pages，绝不能打包进 Electron 应用。

## 本地环境搭建

环境要求：Node.js `^20.19` 或 `>=22.12`。

```bash
npm install
npm run dev          # 在 http://127.0.0.1:41730 启动网页版
npm run electron:dev # 以开发模式打开 Electron 桌面窗口
```

## 提交 Pull Request 前的检查

运行所有本地检查（与 CI 中执行的检查完全一致）：

```bash
npm run lint
npm test
npm run build
npm run electron:build
npm run test:e2e
```

## 贡献流程

1. 基于 `main` 创建分支（例如 `feat/my-improvement` 或 `fix/bug-x`）。
2. 提交信息遵循 **Conventional Commits** 规范（例如 `feat(vault): ...`、`fix(ui): ...`、`test(domain): ...`）。
3. 为新的业务规则或缺陷修复补充单元测试（Vitest）或端到端测试（Playwright）。
4. 填写标准模板并提交 Pull Request。

## 报告安全漏洞

**请勿针对安全缺陷提交公开 Issue。** 请遵循 [SECURITY.zh-CN.md](SECURITY.zh-CN.md) 中的说明。

## 许可证

参与贡献即表示您同意您的贡献内容将以 **GNU AGPL-3.0-or-later** 许可证发布（请参阅 [LICENSE](../../LICENSE)）。
