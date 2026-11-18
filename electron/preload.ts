import { contextBridge, ipcRenderer } from 'electron'

contextBridge.exposeInMainWorld('myfboxDesktop', {
  isDesktop: true as const,
  platform: process.platform,
  vault: {
    load: () => ipcRenderer.invoke('vault:load'),
    save: (envelope: unknown) => ipcRenderer.invoke('vault:save', envelope),
    delete: () => ipcRenderer.invoke('vault:delete'),
    info: () => ipcRenderer.invoke('vault:info'),
  },
})
