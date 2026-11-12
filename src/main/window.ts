import { BrowserWindow, screen, type Display } from 'electron'
import { join } from 'path'
import type { AppMode } from '../shared/types'

export function rendererTarget(page: string): { url?: string; file?: string } {
  const devUrl = process.env['ELECTRON_RENDERER_URL']
  if (devUrl) return { url: `${devUrl}/${page}` }
  return { file: join(__dirname, '../renderer', page) }
}

export async function loadPage(win: BrowserWindow, page: string): Promise<void> {
  const target = rendererTarget(page)
  if (target.url) await win.loadURL(target.url)
  else if (target.file) await win.loadFile(target.file)
}

export function securePreferences(preload: string) {
  return {
    preload,
    contextIsolation: true,
    nodeIntegration: false,
    sandbox: true,
    backgroundThrottling: false,
    spellcheck: false
  } as const
}

export function preloadPath(): string {
  return join(__dirname, '../preload/index.js')
}

export function harden(win: BrowserWindow): void {
  win.webContents.setWindowOpenHandler(() => ({ action: 'deny' }))
  win.webContents.on('will-navigate', (event) => event.preventDefault())
}

export function fitOverlay(win: BrowserWindow, display: Display): void {
  const { x, y, width, height } = display.bounds
  win.setBounds({ x, y, width, height })
}

export function applyPassthrough(win: BrowserWindow, mode: AppMode): void {
  if (win.isDestroyed()) return
  if (mode === 'mouse') {
    win.setIgnoreMouseEvents(true, { forward: true })
    win.setFocusable(false)
    return
  }
  win.setFocusable(true)
  win.setIgnoreMouseEvents(false)
  win.focus()
  setTimeout(() => {
    if (!win.isDestroyed()) win.setIgnoreMouseEvents(false)
  }, 40)
}

export function displayLabel(display: Display, index: number): string {
  const name = display.label?.trim()
  const size = `${display.size.width}×${display.size.height}`
  return name ? `${name} · ${size}` : `Écran ${index + 1} · ${size}`
}

export function primaryOrFirst(): Display {
  return screen.getPrimaryDisplay()
}
