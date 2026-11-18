import { contextBridge } from 'electron'

contextBridge.exposeInMainWorld('myfboxDesktop', {
  isDesktop: true as const,
  platform: process.platform,
})
