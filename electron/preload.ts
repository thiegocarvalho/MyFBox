import { contextBridge, ipcRenderer } from 'electron'

contextBridge.exposeInMainWorld('myfboxDesktop', {
  isDesktop: true as const,
  platform: process.platform,
  setLanguage: (lang: string): Promise<void> => ipcRenderer.invoke('myfbox:set-language', lang),
  i18n: {
    setLanguage: (lang: string): Promise<void> => ipcRenderer.invoke('myfbox:set-language', lang),
  },
  vault: {
    load: () => ipcRenderer.invoke('vault:load'),
    save: (envelope: unknown) => ipcRenderer.invoke('vault:save', envelope),
    delete: () => ipcRenderer.invoke('vault:delete'),
    info: () => ipcRenderer.invoke('vault:info'),
  },
  mcp: {
    info: () => ipcRenderer.invoke('mcp:info'),
  },
})
