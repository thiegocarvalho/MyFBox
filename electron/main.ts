import fs from 'node:fs/promises'
import path from 'node:path'
import { pathToFileURL } from 'node:url'
import { app, BrowserWindow, ipcMain, session } from 'electron'

const DEV_SERVER_URL = 'http://127.0.0.1:41730'
const VAULT_FILENAME = 'vault.myfbox.json'
const MAX_VAULT_BYTES = 20 * 1024 * 1024
const isDev = process.argv.includes('--dev')

let mainWindow: BrowserWindow | null = null

interface EncryptedVaultEnvelope {
  app: 'MyFBox'
  formatVersion: 1
  createdAt: string
  updatedAt: string
  kdf: {
    algorithm: 'PBKDF2-HMAC-SHA256'
    iterations: number
    saltBase64: string
  }
  cipher: {
    algorithm: 'AES-256-GCM'
    ivBase64: string
    ciphertextBase64: string
  }
  verifier: {
    ivBase64: string
    ciphertextBase64: string
  }
  keyFingerprint: string
}

function isNonEmptyString(value: unknown): value is string {
  return typeof value === 'string' && value.length > 0
}

function assertValidEnvelope(data: unknown): asserts data is EncryptedVaultEnvelope {
  if (!data || typeof data !== 'object' || Array.isArray(data)) {
    throw new Error('Envelope de cofre inválido.')
  }
  const obj = data as Record<string, unknown>
  if (obj.app !== 'MyFBox' || obj.formatVersion !== 1) {
    throw new Error('Formato de cofre não suportado.')
  }
  if (!isNonEmptyString(obj.createdAt) || !isNonEmptyString(obj.updatedAt) || !isNonEmptyString(obj.keyFingerprint)) {
    throw new Error('Metadados do cofre inválidos.')
  }
  const kdf = obj.kdf as Record<string, unknown> | undefined
  if (
    !kdf ||
    typeof kdf !== 'object' ||
    kdf.algorithm !== 'PBKDF2-HMAC-SHA256' ||
    typeof kdf.iterations !== 'number' ||
    !Number.isInteger(kdf.iterations) ||
    kdf.iterations <= 0 ||
    !isNonEmptyString(kdf.saltBase64)
  ) {
    throw new Error('Parâmetros KDF do cofre inválidos.')
  }
  const cipher = obj.cipher as Record<string, unknown> | undefined
  if (
    !cipher ||
    typeof cipher !== 'object' ||
    cipher.algorithm !== 'AES-256-GCM' ||
    !isNonEmptyString(cipher.ivBase64) ||
    !isNonEmptyString(cipher.ciphertextBase64)
  ) {
    throw new Error('Payload cifrado do cofre inválido.')
  }
  const verifier = obj.verifier as Record<string, unknown> | undefined
  if (
    !verifier ||
    typeof verifier !== 'object' ||
    !isNonEmptyString(verifier.ivBase64) ||
    !isNonEmptyString(verifier.ciphertextBase64)
  ) {
    throw new Error('Verificador do cofre inválido.')
  }
}

function getVaultFilePath(): string {
  return path.join(app.getPath('userData'), VAULT_FILENAME)
}

async function fileExists(filePath: string): Promise<boolean> {
  try {
    await fs.access(filePath)
    return true
  } catch {
    return false
  }
}

function registerVaultIpcHandlers(): void {
  ipcMain.handle('vault:info', async () => {
    const filePath = getVaultFilePath()
    return {
      storage: 'native' as const,
      filePath,
      exists: await fileExists(filePath),
    }
  })

  ipcMain.handle('vault:load', async () => {
    const filePath = getVaultFilePath()
    let raw: string
    try {
      raw = await fs.readFile(filePath, 'utf8')
    } catch (err) {
      if ((err as NodeJS.ErrnoException).code === 'ENOENT') {
        return null
      }
      throw err
    }
    const parsed: unknown = JSON.parse(raw)
    assertValidEnvelope(parsed)
    return parsed
  })

  ipcMain.handle('vault:save', async (_event, envelope: unknown) => {
    assertValidEnvelope(envelope)
    const serialized = JSON.stringify(envelope)
    if (Buffer.byteLength(serialized, 'utf8') > MAX_VAULT_BYTES) {
      throw new Error('Cofre excede o tamanho máximo permitido.')
    }

    const filePath = getVaultFilePath()
    const dir = path.dirname(filePath)
    await fs.mkdir(dir, { recursive: true, mode: 0o700 })

    const tmpPath = `${filePath}.tmp.${process.pid}.${Date.now()}`
    try {
      await fs.writeFile(tmpPath, serialized, { encoding: 'utf8', mode: 0o600 })
      if (process.platform !== 'win32') {
        await fs.chmod(tmpPath, 0o600)
      }
      await fs.rename(tmpPath, filePath)
    } catch (err) {
      await fs.unlink(tmpPath).catch(() => {})
      throw err
    }
  })

  ipcMain.handle('vault:delete', async () => {
    const filePath = getVaultFilePath()
    try {
      await fs.unlink(filePath)
    } catch (err) {
      if ((err as NodeJS.ErrnoException).code !== 'ENOENT') {
        throw err
      }
    }
  })
}

function isAllowedNavigation(targetUrl: string, prodIndexUrl: string): boolean {
  try {
    const parsed = new URL(targetUrl)
    if (isDev) {
      return parsed.origin === DEV_SERVER_URL
    }
    return parsed.protocol === 'file:' && targetUrl.split('#')[0] === prodIndexUrl
  } catch {
    return false
  }
}

function createMainWindow(): BrowserWindow {
  const distIndexPath = path.join(__dirname, '..', 'dist', 'index.html')
  const prodIndexUrl = pathToFileURL(distIndexPath).toString()

  const win = new BrowserWindow({
    width: 1280,
    height: 840,
    minWidth: 380,
    minHeight: 600,
    backgroundColor: '#101010',
    show: false,
    title: 'MyFBox • My Financial Box',
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: true,
      webSecurity: true,
      allowRunningInsecureContent: false,
    },
  })

  win.once('ready-to-show', () => {
    win.show()
  })

  win.webContents.setWindowOpenHandler(() => ({ action: 'deny' }))

  win.webContents.on('will-navigate', (event, url) => {
    if (!isAllowedNavigation(url, prodIndexUrl)) {
      event.preventDefault()
    }
  })

  win.webContents.on('will-attach-webview', (event) => {
    event.preventDefault()
  })

  if (isDev) {
    void win.loadURL(DEV_SERVER_URL)
  } else {
    void win.loadFile(distIndexPath)
  }

  win.on('closed', () => {
    if (mainWindow === win) {
      mainWindow = null
    }
  })

  return win
}

app.whenReady().then(() => {
  session.defaultSession.setPermissionRequestHandler((_webContents, _permission, callback) => {
    callback(false)
  })

  registerVaultIpcHandlers()
  mainWindow = createMainWindow()

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      mainWindow = createMainWindow()
    }
  })
})

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit()
  }
})
