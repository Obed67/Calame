import { contextBridge, ipcRenderer } from 'electron'
import { IPC } from '../shared/ipc'
import type { AppMode, Bootstrap, DisplayInfo, Settings, ToolState } from '../shared/types'
import type { SaveResult, SettingsResult } from '../shared/bridge'

function listen<T>(channel: string, callback: (payload: T) => void): () => void {
  const handler = (_event: unknown, payload: T): void => callback(payload)
  ipcRenderer.on(channel, handler)
  return () => ipcRenderer.removeListener(channel, handler)
}

const annot = {
  getBootstrap: (): Promise<Bootstrap> => ipcRenderer.invoke(IPC.bootstrap),
  setMode: (mode: AppMode): void => {
    ipcRenderer.send(IPC.modeSet, mode)
  },
  onMode: (callback: (mode: AppMode) => void): (() => void) => listen(IPC.modeChanged, callback),
  onClear: (callback: () => void): (() => void) => listen(IPC.clear, callback),
  onUndo: (callback: () => void): (() => void) => listen(IPC.undo, callback),
  onRedo: (callback: () => void): (() => void) => listen(IPC.redo, callback),
  setTool: (patch: Partial<ToolState>): void => {
    ipcRenderer.send(IPC.toolSet, patch)
  },
  onTool: (callback: (state: ToolState) => void): (() => void) => listen(IPC.toolChanged, callback),
  setSettings: (patch: Partial<Settings>): Promise<SettingsResult> => ipcRenderer.invoke(IPC.settingsSet, patch),
  onSettings: (callback: (settings: Settings) => void): (() => void) =>
    listen(IPC.settingsChanged, callback),
  setDisplay: (id: number): void => {
    ipcRenderer.send(IPC.displaySet, id)
  },
  onDisplay: (callback: (display: DisplayInfo) => void): (() => void) =>
    listen(IPC.displayChanged, callback),
  onCapture: (callback: () => void): (() => void) => listen(IPC.capture, callback),
  getScreenPng: (): Promise<Uint8Array> => ipcRenderer.invoke(IPC.screenImage),
  savePng: (bytes: Uint8Array): Promise<SaveResult> => ipcRenderer.invoke(IPC.savePng, bytes),
  magnifierSource: (): Promise<{ sourceId: string; width: number; height: number } | null> =>
    ipcRenderer.invoke(IPC.magnifierSource),
  watchMagnifier: (active: boolean): void => {
    ipcRenderer.send(IPC.magnifierWatch, active)
  },
  onMagnifierFrame: (callback: (bytes: Uint8Array) => void): (() => void) =>
    listen(IPC.magnifierFrame, callback),
  onVisibility: (callback: (visible: boolean) => void): (() => void) =>
    listen(IPC.visibilityChanged, callback),
  resizeToolbar: (width: number, height: number): void => {
    ipcRenderer.send(IPC.toolbarBounds, { width, height })
  },
  setCollapsed: (collapsed: boolean): void => {
    ipcRenderer.send(IPC.toolbarCollapsed, collapsed)
  },
  requestUndo: (): void => {
    ipcRenderer.send(IPC.undoRequest)
  },
  requestRedo: (): void => {
    ipcRenderer.send(IPC.redoRequest)
  },
  requestClear: (): void => {
    ipcRenderer.send(IPC.clearRequest)
  },
  requestCapture: (): void => {
    ipcRenderer.send(IPC.captureRequest)
  },
  grabScreen: (): Promise<Uint8Array> => ipcRenderer.invoke(IPC.grabScreen),
  holdShortcuts: (hold: boolean): void => {
    ipcRenderer.send(IPC.holdShortcuts, hold)
  },
  openSettings: (): void => {
    ipcRenderer.send(IPC.settingsOpen)
  },
  closeSettings: (): void => {
    ipcRenderer.send(IPC.settingsClose)
  },
  smokeResult: (result: { ok: boolean; pixels: number }): void => {
    ipcRenderer.send('app:smoke', result)
  }
}

contextBridge.exposeInMainWorld('annot', annot)

export type AnnotApi = typeof annot
