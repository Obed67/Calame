import type { AnnotBridge } from '../shared/bridge'

declare global {
  interface Window {
    annot: AnnotBridge
    __annotSmoke?: () => Promise<{ ok: boolean; pixels: number }>
    __annotCheck?: () => {
      ok: boolean
      afterPen: number
      afterErase: number
      open: boolean
      texts: number
    }
  }
}

export {}
