import { dialog, Menu, type BrowserWindow } from 'electron'
import {
  DEFAULT_ELECTRON_LANGUAGE,
  getElectronDictionary,
  type ElectronLanguage,
} from './i18n'

export interface NativeMenuHandlers {
  readonly onOpenVault?: () => void
  readonly onSaveVault?: () => void
  readonly onAbout?: () => void
}

function getVaultFileFilters(language: ElectronLanguage): Electron.FileFilter[] {
  const { dialogs } = getElectronDictionary(language)
  return [
    { name: dialogs.vaultFilterName, extensions: ['myfbox.json', 'json'] },
    { name: dialogs.allFilesFilterName, extensions: ['*'] },
  ]
}

export async function showOpenVaultDialog(
  parentWindow: BrowserWindow | null,
  language: ElectronLanguage = DEFAULT_ELECTRON_LANGUAGE,
): Promise<Electron.OpenDialogReturnValue> {
  const { dialogs } = getElectronDictionary(language)
  const options: Electron.OpenDialogOptions = {
    title: dialogs.openTitle,
    properties: ['openFile'],
    filters: getVaultFileFilters(language),
  }
  return parentWindow
    ? dialog.showOpenDialog(parentWindow, options)
    : dialog.showOpenDialog(options)
}

export async function showSaveVaultDialog(
  parentWindow: BrowserWindow | null,
  language: ElectronLanguage = DEFAULT_ELECTRON_LANGUAGE,
  defaultPath = 'vault.myfbox.json',
): Promise<Electron.SaveDialogReturnValue> {
  const { dialogs } = getElectronDictionary(language)
  const options: Electron.SaveDialogOptions = {
    title: dialogs.saveTitle,
    defaultPath,
    filters: getVaultFileFilters(language),
  }
  return parentWindow
    ? dialog.showSaveDialog(parentWindow, options)
    : dialog.showSaveDialog(options)
}

export async function showConfirmReplaceVaultDialog(
  parentWindow: BrowserWindow | null,
  language: ElectronLanguage = DEFAULT_ELECTRON_LANGUAGE,
): Promise<boolean> {
  const { dialogs } = getElectronDictionary(language)
  const options: Electron.MessageBoxOptions = {
    type: 'warning',
    title: dialogs.confirmReplaceTitle,
    message: dialogs.confirmReplaceMessage,
    detail: dialogs.confirmReplaceDetail,
    buttons: [dialogs.confirm, dialogs.cancel],
    defaultId: 1,
    cancelId: 1,
    noLink: true,
  }
  const result = parentWindow
    ? await dialog.showMessageBox(parentWindow, options)
    : await dialog.showMessageBox(options)
  return result.response === 0
}

export async function showVaultErrorDialog(
  parentWindow: BrowserWindow | null,
  language: ElectronLanguage = DEFAULT_ELECTRON_LANGUAGE,
  kind: 'open' | 'save' = 'open',
  detail?: string,
): Promise<void> {
  const { dialogs } = getElectronDictionary(language)
  const options: Electron.MessageBoxOptions = {
    type: 'error',
    title: dialogs.errorTitle,
    message: kind === 'open' ? dialogs.openErrorMessage : dialogs.saveErrorMessage,
    detail,
  }
  if (parentWindow) {
    await dialog.showMessageBox(parentWindow, options)
  } else {
    await dialog.showMessageBox(options)
  }
}

export async function showAboutDialog(
  parentWindow: BrowserWindow | null,
  language: ElectronLanguage = DEFAULT_ELECTRON_LANGUAGE,
): Promise<void> {
  const { dialogs } = getElectronDictionary(language)
  const options: Electron.MessageBoxOptions = {
    type: 'info',
    title: dialogs.aboutTitle,
    message: dialogs.aboutMessage,
  }
  if (parentWindow) {
    await dialog.showMessageBox(parentWindow, options)
  } else {
    await dialog.showMessageBox(options)
  }
}

export function buildNativeMenuTemplate(
  language: ElectronLanguage = DEFAULT_ELECTRON_LANGUAGE,
  handlers: NativeMenuHandlers = {},
): Electron.MenuItemConstructorOptions[] {
  const { menu } = getElectronDictionary(language)
  const isMac = process.platform === 'darwin'

  const fileSubmenu: Electron.MenuItemConstructorOptions[] = [
    ...(handlers.onOpenVault
      ? [{ label: menu.openVault, accelerator: 'CmdOrCtrl+O', click: handlers.onOpenVault }]
      : []),
    ...(handlers.onSaveVault
      ? [{ label: menu.saveVault, accelerator: 'CmdOrCtrl+S', click: handlers.onSaveVault }]
      : []),
    ...(handlers.onOpenVault || handlers.onSaveVault ? [{ type: 'separator' as const }] : []),
    isMac
      ? { role: 'close', label: menu.close }
      : { role: 'quit', label: menu.quit },
  ]

  const template: Electron.MenuItemConstructorOptions[] = [
    ...(isMac ? [{ role: 'appMenu' as const }] : []),
    {
      label: menu.file,
      submenu: fileSubmenu,
    },
    {
      label: menu.edit,
      submenu: [
        { role: 'undo', label: menu.undo },
        { role: 'redo', label: menu.redo },
        { type: 'separator' },
        { role: 'cut', label: menu.cut },
        { role: 'copy', label: menu.copy },
        { role: 'paste', label: menu.paste },
        { role: 'selectAll', label: menu.selectAll },
      ],
    },
    {
      label: menu.view,
      submenu: [
        { role: 'reload', label: menu.reload },
        { role: 'toggleDevTools', label: menu.toggleDevTools },
        { type: 'separator' },
        { role: 'resetZoom', label: menu.resetZoom },
        { role: 'zoomIn', label: menu.zoomIn },
        { role: 'zoomOut', label: menu.zoomOut },
        { type: 'separator' },
        { role: 'togglefullscreen', label: menu.toggleFullscreen },
      ],
    },
    {
      label: menu.window,
      submenu: [
        { role: 'minimize', label: menu.minimize },
        ...(isMac ? [{ role: 'zoom' as const, label: menu.zoom }] : []),
        { role: 'close', label: menu.close },
      ],
    },
    {
      role: 'help',
      label: menu.help,
      submenu: [
        ...(handlers.onAbout
          ? [{ label: menu.about, click: handlers.onAbout }]
          : []),
      ],
    },
  ]

  return template
}

/**
 * Configura e atualiza o menu nativo da aplicação com o idioma ativo.
 */
export function configureNativeMenu(
  language: ElectronLanguage = DEFAULT_ELECTRON_LANGUAGE,
  handlers: NativeMenuHandlers = {},
): void {
  const template = buildNativeMenuTemplate(language, handlers)
  Menu.setApplicationMenu(Menu.buildFromTemplate(template))
}
