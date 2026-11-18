import path from 'node:path'
import { pathToFileURL } from 'node:url'
import { app, BrowserWindow, session } from 'electron'

const DEV_SERVER_URL = 'http://127.0.0.1:41730'
const isDev = process.argv.includes('--dev')

let mainWindow: BrowserWindow | null = null

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
