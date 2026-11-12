import { prettyShortcut, shortcutLabels, toolLabels } from '../../shared/labels'
import type { Settings, ShortcutMap, ToolId } from '../../shared/types'

const TOOLS = Object.keys(toolLabels) as ToolId[]
const KEYS = Object.keys(shortcutLabels) as (keyof ShortcutMap)[]

const NAMED: Record<string, string> = {
  Escape: 'Escape',
  ' ': 'Space',
  ArrowUp: 'Up',
  ArrowDown: 'Down',
  ArrowLeft: 'Left',
  ArrowRight: 'Right',
  Enter: 'Enter',
  Backspace: 'Backspace',
  Delete: 'Delete',
  Tab: 'Tab'
}

function acceleratorFromEvent(event: KeyboardEvent): string | null {
  const named = NAMED[event.key]
  const key = named ?? (/^F\d{1,2}$/.test(event.key) ? event.key : event.key.length === 1 ? event.key.toUpperCase() : '')
  if (!key || ['Control', 'Shift', 'Alt', 'Meta'].includes(key)) return null
  const parts: string[] = []
  if (event.ctrlKey || event.metaKey) parts.push('CommandOrControl')
  if (event.altKey) parts.push('Alt')
  if (event.shiftKey && key !== 'Escape') parts.push('Shift')
  parts.push(key)
  return parts.join('+')
}

const tool = document.querySelector<HTMLSelectElement>('#tool')!
const fade = document.querySelector<HTMLInputElement>('#fade')!
const spot = document.querySelector<HTMLInputElement>('#spot')!
const zoom = document.querySelector<HTMLInputElement>('#zoom')!
const display = document.querySelector<HTMLSelectElement>('#display')!
const list = document.querySelector<HTMLUListElement>('#shortcuts')!
const error = document.querySelector<HTMLParagraphElement>('#error')!
const fadeValue = document.querySelector<HTMLElement>('#fade-value')!
const spotValue = document.querySelector<HTMLElement>('#spot-value')!
const zoomValue = document.querySelector<HTMLElement>('#zoom-value')!
const close = document.querySelector<HTMLButtonElement>('#close')!

let current: Settings | null = null
let armed: keyof ShortcutMap | null = null

function showError(failed: string[]): void {
  if (failed.length === 0) {
    error.hidden = true
    error.textContent = ''
    return
  }
  const names = failed.map((key) => shortcutLabels[key as keyof ShortcutMap] ?? key)
  error.hidden = false
  error.textContent = `Déjà utilisé : ${names.join(', ')}.`
}

function render(): void {
  if (!current) return
  tool.value = current.tool
  fade.value = String(current.fadeMs)
  spot.value = String(current.spotlightRadius)
  zoom.value = String(current.magnifierZoom)
  fadeValue.textContent = `${(current.fadeMs / 1000).toFixed(1)} s`
  spotValue.textContent = `${current.spotlightRadius} px`
  zoomValue.textContent = `×${current.magnifierZoom}`
  for (const row of list.querySelectorAll<HTMLElement>('kbd')) {
    const key = row.dataset.key as keyof ShortcutMap
    row.textContent = armed === key ? 'Appuyez…' : prettyShortcut(current.shortcuts[key])
    row.dataset.armed = String(armed === key)
  }
}

async function save(patch: Partial<Settings>): Promise<void> {
  const result = await window.annot.setSettings(patch)
  current = result.settings
  showError(result.failed)
  render()
}

tool.replaceChildren(
  ...TOOLS.map((id) => {
    const option = document.createElement('option')
    option.value = id
    option.textContent = toolLabels[id]
    return option
  })
)

list.replaceChildren(
  ...KEYS.map((key) => {
    const row = document.createElement('li')
    const name = document.createElement('span')
    name.textContent = shortcutLabels[key]
    const kbd = document.createElement('kbd')
    kbd.tabIndex = 0
    kbd.dataset.key = key
    kbd.title = 'Cliquer pour modifier'
    kbd.addEventListener('click', () => {
      armed = key
      void window.annot.holdShortcuts(true)
      kbd.focus()
      render()
    })
    kbd.addEventListener('keydown', (event) => {
      if (armed !== key) return
      event.preventDefault()
      event.stopPropagation()
      if (event.key === 'Escape' && key !== 'mouse') {
        armed = null
        void window.annot.holdShortcuts(false)
        render()
        return
      }
      const accelerator = acceleratorFromEvent(event)
      if (!accelerator || !current) return
      const shortcuts = { ...current.shortcuts, [key]: accelerator }
      armed = null
      void window.annot.holdShortcuts(false)
      void save({ shortcuts })
    })
    row.append(name, kbd)
    return row
  })
)

tool.addEventListener('change', () => void save({ tool: tool.value as ToolId }))
fade.addEventListener('input', () => {
  fadeValue.textContent = `${(Number(fade.value) / 1000).toFixed(1)} s`
})
fade.addEventListener('change', () => void save({ fadeMs: Number(fade.value) }))
spot.addEventListener('input', () => {
  spotValue.textContent = `${spot.value} px`
})
spot.addEventListener('change', () => void save({ spotlightRadius: Number(spot.value) }))
zoom.addEventListener('input', () => {
  zoomValue.textContent = `×${zoom.value}`
})
zoom.addEventListener('change', () => void save({ magnifierZoom: Number(zoom.value) }))
display.addEventListener('change', () => window.annot.setDisplay(Number(display.value)))
close.addEventListener('click', () => {
  armed = null
  void window.annot.holdShortcuts(false)
  window.annot.closeSettings()
})

async function boot(): Promise<void> {
  const bootstrap = await window.annot.getBootstrap()
  current = bootstrap.settings
  display.replaceChildren(
    ...bootstrap.displays.map((item) => {
      const option = document.createElement('option')
      option.value = String(item.id)
      option.textContent = item.label
      option.selected = item.id === bootstrap.activeDisplayId
      return option
    })
  )
  render()
  window.annot.onSettings((next) => {
    current = next
    render()
  })
  window.annot.onDisplay((item) => {
    display.value = String(item.id)
  })
}

void boot()
