import type { ToolId, ToolState, WidthId } from '../../shared/types'
import { toolLabels } from '../../shared/labels'
import { actionIcons, icon } from './icons'

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
const WIDTHS: { id: WidthId; label: string; weight: number }[] = [
  { id: 'thin', label: 'Fin', weight: 2 },
  { id: 'medium', label: 'Moyen', weight: 4 },
  { id: 'thick', label: 'Épais', weight: 7 }
]
const EXPANDED = { width: 640, height: 104 }
const COLLAPSED = { width: 78, height: 72 }

const tools = document.querySelector<HTMLDivElement>('#tools')!
const swatches = document.querySelector<HTMLDivElement>('#swatches')!
const widths = document.querySelector<HTMLDivElement>('#widths')!
const actions = document.querySelector<HTMLDivElement>('#actions')!
const custom = document.querySelector<HTMLInputElement>('#custom')!
const fold = document.querySelector<HTMLButtonElement>('#fold')!
const expand = document.querySelector<HTMLButtonElement>('#expand')!
const drag = document.querySelector<HTMLDivElement>('#drag')!
const frame = document.querySelector<HTMLDivElement>('.case')!

let palette: string[] = []
let state: ToolState | null = null
let collapsed = false
let displayLabel = '1'

function button(label: string, svg: string, className = 'icon'): HTMLButtonElement {
  const el = document.createElement('button')
  el.type = 'button'
  el.className = className
  el.title = label
  el.setAttribute('aria-label', label)
  el.innerHTML = svg
  return el
}

function paint(): void {
  if (!state) return
  document.body.dataset.collapsed = String(collapsed)
  for (const el of tools.querySelectorAll<HTMLButtonElement>('button')) {
    el.setAttribute('aria-pressed', String(el.dataset.tool === state.tool))
  }
  for (const el of swatches.querySelectorAll<HTMLButtonElement>('button')) {
    el.setAttribute('aria-pressed', String(el.dataset.color === state.color))
  }
  custom.value = state.color
  expand.style.background = state.color
  for (const el of widths.querySelectorAll<HTMLButtonElement>('button')) {
    el.setAttribute('aria-pressed', String(el.dataset.width === state.width))
  }
  actions.querySelector<HTMLButtonElement>('[data-board="white"]')?.setAttribute('aria-pressed', String(state.board === 'white'))
  actions.querySelector<HTMLButtonElement>('[data-board="black"]')?.setAttribute('aria-pressed', String(state.board === 'black'))
}

function choose(patch: Partial<ToolState>, draw = true): void {
  if (draw) window.annot.setMode('draw')
  window.annot.setTool(patch)
}

function build(): void {
  tools.replaceChildren(
    ...TOOLS.map((tool) => {
      const el = button(toolLabels[tool], icon(tool))
      el.dataset.tool = tool
      el.addEventListener('click', () => choose({ tool }))
      return el
    })
  )
  swatches.replaceChildren(
    ...palette.map((color) => {
      const el = document.createElement('button')
      el.type = 'button'
      el.dataset.color = color
      el.title = color
      el.setAttribute('aria-label', `Couleur ${color}`)
      el.style.background = color
      el.addEventListener('click', () => choose({ color }))
      return el
    })
  )
  widths.replaceChildren(
    ...WIDTHS.map((item) => {
      const el = document.createElement('button')
      el.type = 'button'
      el.dataset.width = item.id
      el.title = item.label
      el.setAttribute('aria-label', `Trait ${item.label.toLowerCase()}`)
      const mark = document.createElement('i')
      mark.style.height = `${item.weight}px`
      el.append(mark)
      el.addEventListener('click', () => choose({ width: item.id }, false))
      return el
    })
  )
  const specs: { label: string; svg: string; className?: string; run: () => void }[] = [
    { label: 'Annuler', svg: actionIcons.undo, run: () => window.annot.requestUndo() },
    { label: 'Rétablir', svg: actionIcons.redo, run: () => window.annot.requestRedo() },
    { label: 'Tout effacer', svg: actionIcons.clear, className: 'icon clear', run: () => window.annot.requestClear() },
    { label: 'Capture d’écran', svg: actionIcons.capture, className: 'icon shot', run: () => window.annot.requestCapture() },
    {
      label: 'Tableau blanc',
      svg: actionIcons.white,
      run: () => choose({ board: state?.board === 'white' ? 'none' : 'white' })
    },
    {
      label: 'Tableau noir',
      svg: actionIcons.black,
      run: () => choose({ board: state?.board === 'black' ? 'none' : 'black' })
    },
    { label: `Écran ${displayLabel}`, svg: actionIcons.screen, run: () => cycleDisplay() },
    { label: 'Réglages', svg: actionIcons.gear, run: () => window.annot.openSettings() }
  ]
  actions.replaceChildren(
    ...specs.map((spec) => {
      const el = button(spec.label, spec.svg, spec.className ?? 'icon')
      if (spec.label.startsWith('Tableau')) el.dataset.board = spec.label.includes('blanc') ? 'white' : 'black'
      if (spec.label.startsWith('Écran')) el.dataset.screen = 'true'
      el.addEventListener('click', spec.run)
      return el
    })
  )
  fold.innerHTML = actionIcons.fold
}

let displays: { id: number }[] = []
let activeDisplayId = 0

function cycleDisplay(): void {
  if (displays.length === 0) return
  const index = displays.findIndex((item) => item.id === activeDisplayId)
  const next = displays[(index + 1) % displays.length]
  window.annot.setDisplay(next.id)
}

function setCollapsed(next: boolean): void {
  collapsed = next
  document.body.dataset.collapsed = String(next)
  const size = next ? COLLAPSED : EXPANDED
  window.annot.resizeToolbar(size.width, size.height)
  window.annot.setCollapsed(next)
  fold.title = next ? 'Déplier' : 'Replier'
}

custom.addEventListener('input', () => choose({ color: custom.value }))
custom.addEventListener('change', () => {
  void window.annot.setSettings({ customColor: custom.value, color: custom.value })
})
fold.addEventListener('click', () => setCollapsed(true))
expand.addEventListener('click', () => setCollapsed(false))
drag.addEventListener('dblclick', () => setCollapsed(!collapsed))

let dragPointer: { id: number; originX: number; originY: number; startX: number; startY: number } | null = null

function onChrome(target: EventTarget | null): boolean {
  return target instanceof Element && Boolean(target.closest('button, input, label, a'))
}

frame.addEventListener('pointerdown', (event) => {
  if (event.button !== 0 || onChrome(event.target)) return
  dragPointer = {
    id: event.pointerId,
    originX: window.screenX,
    originY: window.screenY,
    startX: event.screenX,
    startY: event.screenY
  }
  frame.setPointerCapture(event.pointerId)
  frame.classList.add('dragging')
})

frame.addEventListener('pointermove', (event) => {
  if (!dragPointer || event.pointerId !== dragPointer.id) return
  window.annot.moveToolbar(
    Math.round(dragPointer.originX + event.screenX - dragPointer.startX),
    Math.round(dragPointer.originY + event.screenY - dragPointer.startY)
  )
})

function endDrag(event: PointerEvent): void {
  if (!dragPointer || event.pointerId !== dragPointer.id) return
  dragPointer = null
  frame.classList.remove('dragging')
}

frame.addEventListener('pointerup', endDrag)
frame.addEventListener('pointercancel', endDrag)

async function boot(): Promise<void> {
  const bootstrap = await window.annot.getBootstrap()
  palette = bootstrap.settings.palette
  state = {
    tool: bootstrap.settings.tool,
    color: bootstrap.settings.color,
    width: bootstrap.settings.width,
    board: bootstrap.settings.board
  }
  displays = bootstrap.displays
  activeDisplayId = bootstrap.activeDisplayId
  displayLabel = String(displays.findIndex((item) => item.id === activeDisplayId) + 1)
  collapsed = bootstrap.settings.toolbarCollapsed
  custom.value = bootstrap.settings.customColor
  build()
  paint()
  document.body.dataset.collapsed = String(collapsed)
  window.annot.onTool((next) => {
    state = next
    paint()
  })
  window.annot.onSettings((next) => {
    palette = next.palette
    state = { tool: next.tool, color: next.color, width: next.width, board: next.board }
    build()
    paint()
  })
  window.annot.onDisplay((display) => {
    activeDisplayId = display.id
    displayLabel = String(displays.findIndex((item) => item.id === display.id) + 1)
    const screen = actions.querySelector<HTMLButtonElement>('[data-screen]')
    if (screen) {
      screen.title = display.label
      screen.setAttribute('aria-label', display.label)
    }
  })
}

void boot()
