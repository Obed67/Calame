import type { AppMode, Bootstrap, DisplayInfo, Settings, ToolState } from './types'

export interface SaveResult {
  ok: boolean
  canceled?: boolean
  path?: string
}

export interface SettingsResult {
  settings: Settings
  failed: string[]
}

export interface MagnifierSource {
  sourceId: string
  width: number
  height: number
}

export interface SmokeResult {
  ok: boolean
  pixels: number
}

export interface AnnotBridge {
  getBootstrap: () => Promise<Bootstrap>
  setMode: (mode: AppMode) => void
  onMode: (callback: (mode: AppMode) => void) => () => void
  onClear: (callback: () => void) => () => void
  onUndo: (callback: () => void) => () => void
  onRedo: (callback: () => void) => () => void
  setTool: (patch: Partial<ToolState>) => void
  onTool: (callback: (state: ToolState) => void) => () => void
  setSettings: (patch: Partial<Settings>) => Promise<SettingsResult>
  onSettings: (callback: (settings: Settings) => void) => () => void
  setDisplay: (id: number) => void
  onDisplay: (callback: (display: DisplayInfo) => void) => () => void
  onCapture: (callback: () => void) => () => void
  getScreenPng: () => Promise<Uint8Array>
  savePng: (bytes: Uint8Array) => Promise<SaveResult>
  magnifierSource: () => Promise<MagnifierSource | null>
  watchMagnifier: (active: boolean) => void
  onMagnifierFrame: (callback: (bytes: Uint8Array) => void) => () => void
  onVisibility: (callback: (visible: boolean) => void) => () => void
  resizeToolbar: (width: number, height: number) => void
  setCollapsed: (collapsed: boolean) => void
  requestUndo: () => void
  requestRedo: () => void
  requestClear: () => void
  requestCapture: () => void
  grabScreen: () => Promise<Uint8Array>
  holdShortcuts: (hold: boolean) => void
  openSettings: () => void
  closeSettings: () => void
  smokeResult: (result: SmokeResult) => void
}
