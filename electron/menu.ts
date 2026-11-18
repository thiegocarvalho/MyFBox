import { Menu } from 'electron'

/**
 * Configura o menu nativo mínimo:
 * - macOS: roles padrão (Editar/Janela) sem interceptar atalhos globais do app.
 * - Windows/Linux: sem barra de menu para evitar conflitos com atalhos do MyFBox.
 */
export function configureNativeMenu(): void {
  if (process.platform !== 'darwin') {
    Menu.setApplicationMenu(null)
    return
  }

  const template: Electron.MenuItemConstructorOptions[] = [
    { role: 'appMenu' },
    {
      label: 'Editar',
      submenu: [
        { role: 'undo' },
        { role: 'redo' },
        { type: 'separator' },
        { role: 'cut' },
        { role: 'copy' },
        { role: 'paste' },
        { role: 'selectAll' },
      ],
    },
    {
      label: 'Janela',
      submenu: [{ role: 'minimize' }, { role: 'zoom' }, { role: 'close' }],
    },
  ]

  Menu.setApplicationMenu(Menu.buildFromTemplate(template))
}
