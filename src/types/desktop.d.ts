import type { EncryptedVaultEnvelope } from './finance'

export interface DesktopVaultInfo {
  readonly storage: 'native'
  readonly filePath: string
  readonly exists: boolean
}

export interface DesktopMcpInfo {
  readonly serverPath: string
  readonly command: string
}

export interface MyFBoxDesktopBridge {
  readonly isDesktop: true
  readonly platform: string
  readonly vault?: {
    load: () => Promise<EncryptedVaultEnvelope | null>
    save: (envelope: EncryptedVaultEnvelope) => Promise<void>
    delete: () => Promise<void>
    info: () => Promise<DesktopVaultInfo>
  }
  readonly mcp?: {
    info: () => Promise<DesktopMcpInfo>
  }
}

declare global {
  interface Window {
    myfboxDesktop?: MyFBoxDesktopBridge
  }
}
