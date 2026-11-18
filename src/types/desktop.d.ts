import type { EncryptedVaultEnvelope } from './finance'

export interface DesktopVaultInfo {
  readonly storage: 'native'
  readonly filePath: string
  readonly exists: boolean
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
}

declare global {
  interface Window {
    myfboxDesktop?: MyFBoxDesktopBridge
  }
}
