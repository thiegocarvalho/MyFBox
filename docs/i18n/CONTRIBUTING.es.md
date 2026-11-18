🇧🇷 [Português (Brasil)](../../CONTRIBUTING.md) · 🇬🇧 [English (UK)](CONTRIBUTING.en-GB.md) · 🇪🇸 [Español](CONTRIBUTING.es.md) · 🇨🇳 [简体中文](CONTRIBUTING.zh-CN.md)

# Cómo contribuir con MyFBox

¡Gracias por tu interés en contribuir con MyFBox! Esta guía resume el flujo de trabajo, los estándares de código y las comprobaciones obligatorias antes de abrir un Pull Request.

## Principios innegociables del proyecto

- **100% sin conexión y local-first:** ninguna petición a APIs externas, CDNs, fuentes remotas ni telemetría.
- **Seguridad de la bóveda:** ningún dato descifrado debe tocar disco, logs o IPC; la CSP de producción permanece restringida a `'self'` y `ws://127.0.0.1:*`.
- **Clean Architecture:** `src/domain/` contiene solo reglas puras y no importa `src/services/`, `src/components/` ni APIs del navegador.
- **Landing Page aislada:** `landing/` es exclusiva de GitHub Pages y nunca debe empaquetarse en la app Electron.

## Configuración local

Requisitos: Node.js `^20.19` o `>=22.12`.

```bash
npm install
npm run dev          # versión web en http://127.0.0.1:41730
npm run electron:dev # ventana de escritorio Electron en modo dev
```

## Comprobaciones antes del Pull Request

Ejecuta todas las comprobaciones locales (las mismas que se ejecutan en CI):

```bash
npm run lint
npm test
npm run build
npm run electron:build
npm run test:e2e
```

## Flujo de contribución

1. Crea una rama a partir de `main` (ej.: `feat/mi-mejora` o `fix/correccion-x`).
2. Usa mensajes de commit en el estándar **Conventional Commits** (ej.: `feat(vault): ...`, `fix(ui): ...`, `test(domain): ...`).
3. Añade pruebas unitarias (Vitest) o E2E (Playwright) para nuevas reglas de negocio o correcciones de errores.
4. Abre el Pull Request rellenando la plantilla estándar.

## Reporte de vulnerabilidades

**No abras issues públicos para fallos de seguridad.** Sigue las instrucciones en [SECURITY.es.md](SECURITY.es.md).

## Licencia

Al contribuir, aceptas que tus contribuciones se licencien bajo la **GNU AGPL-3.0-or-later** (consulta [LICENSE](../../LICENSE)).
