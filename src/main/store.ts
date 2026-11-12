import { app, BrowserWindow, screen } from 'electron'
import { mkdirSync, readFileSync, writeFileSync } from 'fs'
import { join } from 'path'
import { defaultSettings, hexColor } from '../shared/defaults'
import type { BoardMode, Settings, ShortcutMap, ToolId, WidthId } from '../shared/types'

const TOOLS: ToolId[] = [
  'pen',
  'highlighter',
  'line',
  'arrow',
  'rect',
  'ellipse',
  'text',
  'eraser',
  'laser',
  'fade',
  'spotlight',
  'magnifier'
]

const WIDTHS: WidthId[] = ['thin', 'medium', 'thick']
const BOARDS: BoardMode[] = ['none', 'white', 'black']

function file(): string {
  return join(app.getPath('userData'), 'settings.json')
}

function asShortcuts(value: unknown, fallback: ShortcutMap): ShortcutMap {
  const source = value && typeof value === 'object' ? (value as Partial<ShortcutMap>) : {}
  const next = { ...fallback }
  for (const key of Object.keys(fallback) as (keyof ShortcutMap)[]) {
    const candidate = source[key]
    if (typeof candidate === 'string' && candidate.length > 0 && candidate.length < 80) {
      next[key] = candidate
    }
  }
  return next
}

export function normalizeSettings(value: unknown): Settings {
  const source = value && typeof value === 'object' ? (value as Partial<Settings>) : {}
  const palette = Array.isArray(source.palette)
    ? source.palette.map((color, index) => hexColor(color, defaultSettings.palette[index] ?? '#E15A3A')).slice(0, 8)
    : []
  while (palette.length < 8) palette.push(defaultSettings.palette[palette.length])

  return {
    tool: TOOLS.includes(source.tool as ToolId) ? (source.tool as ToolId) : defaultSettings.tool,
    color: hexColor(source.color, defaultSettings.color),
    customColor: hexColor(source.customColor, defaultSettings.customColor),
    palette,
    width: WIDTHS.includes(source.width as WidthId) ? (source.width as WidthId) : defaultSettings.width,
    shortcuts: asShortcuts(source.shortcuts, defaultSettings.shortcuts),
    fadeMs: clamp(source.fadeMs, 2000, 3000, defaultSettings.fadeMs),
    spotlightRadius: clamp(source.spotlightRadius, 60, 320, defaultSettings.spotlightRadius),
    magnifierZoom: clamp(source.magnifierZoom, 1.5, 4, defaultSettings.magnifierZoom),
    board: BOARDS.includes(source.board as BoardMode) ? (source.board as BoardMode) : 'none',
    displayId: typeof source.displayId === 'number' ? source.displayId : null,
    toolbarCollapsed: source.toolbarCollapsed === true,
    toolbarX: finite(source.toolbarX),
    toolbarY: finite(source.toolbarY)
  }
}

function finite(value: unknown): number | null {
  return typeof value === 'number' && Number.isFinite(value) ? value : null
}

function clamp(value: unknown, min: number, max: number, fallback: number): number {
  const number = typeof value === 'number' && Number.isFinite(value) ? value : fallback
  return Math.min(max, Math.max(min, number))
}

export function loadSettings(): Settings {
  try {
    return normalizeSettings(JSON.parse(readFileSync(file(), 'utf8')))
  } catch {
    return structuredClone(defaultSettings)
  }
}

export function saveSettings(settings: Settings): void {
  const dir = app.getPath('userData')
  mkdirSync(dir, { recursive: true })
  writeFileSync(file(), JSON.stringify(settings, null, 2), 'utf8')
}

export function listDisplays(): ReturnType<typeof screen.getAllDisplays> {
  return screen.getAllDisplays()
}

export function activeDisplay(settings: Settings) {
  const displays = screen.getAllDisplays()
  return (
    displays.find((display) => display.id === settings.displayId) ??
    screen.getPrimaryDisplay() ??
    displays[0]
  )
}

export function isOurWindow(win: BrowserWindow | null): win is BrowserWindow {
  return !!win && !win.isDestroyed()
}
