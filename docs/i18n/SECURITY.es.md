🇧🇷 [Português (Brasil)](../../SECURITY.md) · 🇬🇧 [English (UK)](SECURITY.en-GB.md) · 🇪🇸 [Español](SECURITY.es.md) · 🇨🇳 [简体中文](SECURITY.zh-CN.md)

# Seguridad de MyFBox

## Modelo de amenazas

**MyFBox protege contra:**

- Alguien que obtenga el **archivo de copia de seguridad** (`.myfbox.json`) o una copia del **IndexedDB** del navegador: sin la contraseña maestra, el contenido es ilegible (AES-256-GCM).
- Lectura de tus datos por **terceros en la red**: no hay servidor de la aplicación y **ninguna llamada a APIs externas** (100% sin conexión y soberano; los tipos de cambio se registran localmente). La única conexión de red existente es opcional: el puente local del Modo MCP en `127.0.0.1`.
- Ejecución de scripts de terceros en el build de producción: la **Content Security Policy** solo permite código de la propia aplicación y WebSockets locales en loopback (`127.0.0.1`).

**MyFBox no protege contra:**

- **Malware o extensiones maliciosas** en el ordenador/navegador mientras la bóveda está **desbloqueada** (los datos están descifrados en la memoria de la pestaña).
- Alguien con acceso físico al ordenador con la bóveda abierta. Usa el bloqueo automático (Copias › Seguridad) y bloquea la app al ausentarte.
- **Contraseñas débiles.** La derivación de clave encarece cada intento, pero no salva una contraseña corta o común. Usa una contraseña larga y única.
- **Pérdida de la contraseña**: no existe recuperación, por diseño.

## Criptografía

| Elemento | Elección |
|---|---|
| Cifrado | AES-256-GCM (WebCrypto), IV aleatorio de 96 bits en cada escritura |
| Derivación de clave | PBKDF2-HMAC-SHA256, **600.000 iteraciones**, sal aleatoria de 128 bits |
| Clave en memoria | `CryptoKey` no extraíble; los bytes sin procesar derivados se ponen a cero tras su uso |
| Verificación de contraseña | Bloque "verifier" cifrado con la misma clave (distingue contraseña incorrecta de archivo dañado) |
| Huella de la clave | 32 bits de `SHA-256("MYFBOX_KEY_FINGERPRINT_V2" ‖ clave derivada)`, solo para comprobación visual |

El sobre guarda el algoritmo, el número de iteraciones y la sal, lo que permite evolucionar los parámetros criptográficos en futuras versiones.

## Modo MCP local

- **Desactivado por defecto.** Solo se enciende después de que el usuario autorice un emparejamiento en la interfaz.
- El servidor escucha **únicamente en `127.0.0.1`**, comprueba la cabecera `Origin` (solo `localhost`, `127.0.0.1` o `MYFBOX_APP_URL`) y exige un **secreto de emparejamiento** comparado en tiempo constante.
- El secreto se guarda en `~/.config/myfbox/mcp.json` (permisos 600) y, en la app, dentro de la bóveda cifrada. El enlace de emparejamiento lleva el secreto en el fragmento (`#`), que no se envía a servidores, y la app lo elimina de la barra de direcciones al leerlo. El diálogo muestra un código corto (SHA-256 del secreto) para contrastarlo con el que mostró el asistente.
- El servidor **nunca recibe la contraseña ni la clave**: las acciones se ejecutan en el navegador y solo se devuelven los resultados. La copia de seguridad vía MCP entrega únicamente el sobre ya cifrado (`AES-256-GCM`).
- **Operaciones bloqueadas en MCP (exclusivas del usuario en la interfaz)**: el MCP no puede crear bóveda, borrar/destruir la bóveda, cambiar la contraseña maestra, restaurar copias de seguridad ni hacer copias sin cifrado (exportar hoja CSV es exclusivo del usuario directamente desde la UI).
- Bloquear la app (manualmente o por bloqueo automático) corta el puente; las acciones del MCP no cuentan como actividad para el bloqueo automático.
- Cualquier proceso local que posea el secreto puede leer y modificar la bóveda abierta. Trata el ordenador donde el Modo MCP está activado como de confianza, o desactiva el modo.

## Otras medidas

- La exportación CSV neutraliza fórmulas (`=`, `+`, `-`, `@`) en campos de texto ("CSV injection").
- Fuentes servidas localmente (sin Google Fonts) y `referrer` desactivado.
- Servidor de desarrollo enlazado únicamente a `127.0.0.1`.

## App Desktop (Electron) e IPC

- **Aislamiento del renderer:** `BrowserWindow` configurado con `contextIsolation: true`, `nodeIntegration: false`, `sandbox: true`, `webSecurity: true` y `allowRunningInsecureContent: false`.
- **Bloqueo de navegación y permisos:** `setWindowOpenHandler` deniega ventanas emergentes/nuevas ventanas; `will-navigate` restringe la navegación al origen de la app; `will-attach-webview` y `setPermissionRequestHandler` bloquean webviews y permisos de dispositivo.
- **IPC mínimo y validado:** `electron/preload.ts` expone solo `vault.{load, save, delete, info}` y `mcp.info` (sin acceso genérico a `fs` ni `ipcRenderer`). El proceso principal valida íntegramente la estructura de `EncryptedVaultEnvelope` (PBKDF2-HMAC-SHA256 + AES-256-GCM, límite de 20 MB) antes de escribir.
- **Persistencia atómica en disco:** la bóveda cifrada se escribe mediante archivo temporal + `rename` en `app.getPath('userData')/vault.myfbox.json` con permisos `0600` (POSIX) — ningún dato descifrado circula por IPC ni toca el disco.
- **Instancia única:** `app.requestSingleInstanceLock()` evita que dos ventanas concurrentes escriban en la misma bóveda.

## Reportar una vulnerabilidad

No abras un issue público. Utiliza la función de **Security Advisory privado** del repositorio (pestaña *Security › Report a vulnerability*) con la descripción, los pasos para reproducirla y el impacto. Recibirás una respuesta lo antes posible.
