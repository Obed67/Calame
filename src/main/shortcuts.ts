import { globalShortcut } from 'electron'
import type { ShortcutMap } from '../shared/types'

type Handlers = {
  toggleDraw: () => void
  clear: () => void
  undo: () => void
  redo: () => void
  laser: () => void
  capture: () => void
  quit: () => void
  mouse: () => void
}

const ALWAYS: (keyof ShortcutMap)[] = ['toggleDraw', 'clear', 'laser', 'capture', 'quit']
const WHILE_DRAWING: (keyof ShortcutMap)[] = ['undo', 'redo', 'mouse']

let current: ShortcutMap | null = null
let handlers: Handlers | null = null
let drawing = false
let paused = false
const held = new Set<string>()

function register(accelerator: string, run: () => void): boolean {
  try {
    if (globalShortcut.isRegistered(accelerator)) globalShortcut.unregister(accelerator)
    const ok = globalShortcut.register(accelerator, run)
    if (ok) held.add(accelerator)
    return ok
  } catch {
    return false
  }
}

function unregister(accelerator: string): void {
  if (!accelerator) return
  try {
    globalShortcut.unregister(accelerator)
  } catch {
    /* raccourci déjà libéré */
  }
  held.delete(accelerator)
}

export function bindShortcuts(shortcuts: ShortcutMap, next: Handlers): string[] {
  releaseShortcuts()
  current = shortcuts
  handlers = next
  const failed: string[] = []
  for (const name of [...ALWAYS, ...WHILE_DRAWING]) {
    if (!register(shortcuts[name], next[name])) failed.push(name)
  }
  applyDrawingKeys()
  return failed
}

export function syncDrawingShortcuts(active: boolean): void {
  drawing = active
  applyDrawingKeys()
}

export function holdDrawingKeys(hold: boolean): void {
  paused = hold
  applyDrawingKeys()
}

function applyDrawingKeys(): void {
  if (!current || !handlers) return
  const enabled = drawing && !paused
  for (const name of WHILE_DRAWING) {
    const accelerator = current[name]
    if (enabled) register(accelerator, handlers[name])
    else unregister(accelerator)
  }
}

export function releaseShortcuts(): void {
  for (const accelerator of [...held]) unregister(accelerator)
  held.clear()
}

export function shortcutRegistered(accelerator: string): boolean {
  return globalShortcut.isRegistered(accelerator)
}
