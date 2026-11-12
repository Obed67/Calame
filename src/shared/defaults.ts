import type { Settings, ShortcutMap, WidthId } from './types'

export const PALETTE = [
  '#F4EFE6',
  '#1C1915',
  '#E15A3A',
  '#D4A054',
  '#3E7C6A',
  '#3D6FBF',
  '#C43B6E',
  '#F2E14A'
] as const

export const WIDTHS: Record<WidthId, number> = {
  thin: 3,
  medium: 6,
  thick: 12
}

export const defaultShortcuts: ShortcutMap = {
  toggleDraw: 'CommandOrControl+Shift+D',
  clear: 'CommandOrControl+Shift+C',
  undo: 'CommandOrControl+Z',
  redo: 'CommandOrControl+Y',
  laser: 'CommandOrControl+Shift+L',
  capture: 'CommandOrControl+Shift+S',
  quit: 'CommandOrControl+Shift+Q',
  mouse: 'Escape'
}

export const defaultSettings: Settings = {
  tool: 'pen',
  color: '#E15A3A',
  customColor: '#6E8BFF',
  palette: [...PALETTE],
  width: 'medium',
  shortcuts: { ...defaultShortcuts },
  fadeMs: 2500,
  spotlightRadius: 140,
  magnifierZoom: 2,
  board: 'none',
  displayId: null,
  toolbarCollapsed: false,
  toolbarX: null,
  toolbarY: null
}

export function hexColor(value: unknown, fallback: string): string {
  return typeof value === 'string' && /^#[0-9a-fA-F]{6}$/.test(value) ? value : fallback
}
