export interface MyFBoxDesktopBridge {
  readonly isDesktop: true
  readonly platform: string
}

declare global {
  interface Window {
    myfboxDesktop?: MyFBoxDesktopBridge
  }
}
