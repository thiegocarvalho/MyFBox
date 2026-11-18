import type { AppLanguage } from '../i18n/types'
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
  readonly setLanguage?: (lang: AppLanguage) => Promise<void> | void
  readonly i18n?: {
    setLanguage: (lang: AppLanguage) => Promise<void> | void
  }
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
