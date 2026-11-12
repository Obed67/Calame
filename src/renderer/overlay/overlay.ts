import { WIDTHS } from '../../shared/defaults'
import { Board } from '../../shared/history'
import type { InkItem, ShapeItem, TextItem } from '../../shared/items'
import { toolLabels } from '../../shared/labels'
import type { AppMode, InkTool, Point, Settings, ShapeTool, ToolId } from '../../shared/types'
import {
  clearCanvas,
  drawInk,
  drawItem,
  drawLaser,
  drawMagnifier,
  drawShape,
  drawShapeHandles,
  drawSpotlight,
  fitCanvas,
  pointerPoint,
  textBox
} from './paint'
import { claimShapePointer, dragShape, selectedShape } from './shape-edit'

const TEXT_SIZE = { thin: 22, medium: 34, thick: 52 }
const ERASER = { thin: 14, medium: 24, thick: 38 }
const INK_TOOLS = new Set<ToolId>(['pen', 'highlighter', 'fade'])
const SHAPE_TOOLS = new Set<ToolId>(['line', 'arrow', 'rect', 'ellipse'])
const FOLLOW_TOOLS = new Set<ToolId>(['laser', 'spotlight', 'magnifier'])

const ink = document.querySelector<HTMLCanvasElement>('#ink')!
const live = document.querySelector<HTMLCanvasElement>('#live')!
const writer = document.querySelector<HTMLTextAreaElement>('#writer')!
const toast = document.querySelector<HTMLParagraphElement>('#toast')!
const board = new Board()

let inkCtx = fitCanvas(ink)
let liveCtx = fitCanvas(live)
let mode: AppMode = 'mouse'
let settings: Settings | null = null
let draftInk: { tool: InkTool; points: Point[]; stylus: boolean } | null = null
let draftShape: { tool: ShapeTool; a: Point; b: Point } | null = null
let erasing = false
let editing = false
let writerGuard = 0
let textAnchor: Point | null = null
let loupe: ImageBitmap | null = null
let cursor: Point = { x: 80, y: 80, p: 0.5 }
let laser: { x: number; y: number; t: number }[] = []
let frame = 0
let toastTimer = 0

function showToast(message: string): void {
  toast.textContent = message
  toast.hidden = false
  toast.dataset.show = 'true'
  window.clearTimeout(toastTimer)
  toastTimer = window.setTimeout(() => {
    toast.dataset.show = 'false'
  }, 1500)
}

function redraw(): void {
  if (!settings) return
  inkCtx = fitCanvas(ink)
  if (settings.board === 'white') {
    inkCtx.fillStyle = '#F7F4EE'
    inkCtx.fillRect(0, 0, window.innerWidth, window.innerHeight)
  } else if (settings.board === 'black') {
    inkCtx.fillStyle = '#141210'
    inkCtx.fillRect(0, 0, window.innerWidth, window.innerHeight)
  } else {
    clearCanvas(inkCtx)
  }
  const now = Date.now()
  for (const item of board.items) drawItem(inkCtx, item, now)
  paintLive()
}

function paintLive(): void {
  liveCtx = fitCanvas(live)
  clearCanvas(liveCtx)
  if (!settings) return
  const drawing = mode === 'draw'
  if (drawing && settings.tool === 'spotlight') {
    drawSpotlight(liveCtx, cursor.x, cursor.y, settings.spotlightRadius)
  }
  if (drawing && settings.tool === 'magnifier') {
    drawMagnifier(liveCtx, loupe, cursor.x, cursor.y, 92, settings.magnifierZoom)
  }
  drawLaser(liveCtx, laser, performance.now())
  if (draftInk) drawInk(liveCtx, { ...draftInk, color: settings.color, width: WIDTHS[settings.width] }, false)
  if (draftShape) {
    drawShape(liveCtx, { ...draftShape, color: settings.color, width: WIDTHS[settings.width] })
  }
  const shapePick = selectedShape(board.items)
  if (shapePick) drawShapeHandles(liveCtx, shapePick)
  if (drawing && settings.tool === 'eraser') {
    liveCtx.save()
    liveCtx.strokeStyle = '#D4A054'
    liveCtx.lineWidth = 1.5
    liveCtx.beginPath()
    liveCtx.arc(cursor.x, cursor.y, ERASER[settings.width], 0, Math.PI * 2)
    liveCtx.stroke()
    liveCtx.restore()
  }
}

function needsFrame(): boolean {
  if (!settings) return false
  if (board.items.some((item) => item.kind === 'ink' && item.fadeMs)) return true
  if (laser.length > 0) return true
  return mode === 'draw' && (settings.tool === 'spotlight' || settings.tool === 'magnifier' || settings.tool === 'laser')
}

function loop(): void {
  const now = Date.now()
  laser = laser.filter((point) => performance.now() - point.t < 700)
  if (board.expire(now)) redraw()
  else paintLive()
  frame = needsFrame() ? requestAnimationFrame(loop) : 0
}

function ensureLoop(): void {
  if (!frame && needsFrame()) frame = requestAnimationFrame(loop)
}

function setMode(next: AppMode, announce = true): void {
  mode = next
  document.body.dataset.mode = next
  if (next === 'mouse') {
    textAnchor = null
    if (editing) commitWriter()
    finishGesture(false)
    stopMirror()
  } else if (settings?.tool === 'magnifier') {
    startMirror()
  }
  if (announce) showToast(next === 'draw' ? 'Mode dessin · Échap pour la souris' : 'Mode souris')
  ensureLoop()
  paintLive()
}

function applyTool(next: Settings): void {
  settings = next
  document.body.dataset.tool = next.tool
  if (next.tool !== 'magnifier') stopMirror()
  if (next.tool === 'magnifier' && mode === 'draw') startMirror()
  ensureLoop()
  redraw()
}

function startMirror(): void {
  window.annot.watchMagnifier(true)
}

function stopMirror(): void {
  window.annot.watchMagnifier(false)
  loupe?.close()
  loupe = null
}

function finishGesture(commit: boolean): void {
  if (draftInk && commit && settings) {
    board.commit({
      tool: draftInk.tool,
      color: settings.color,
      width: WIDTHS[settings.width],
      points: draftInk.points,
      stylus: draftInk.stylus,
      fadeMs: draftInk.tool === 'fade' ? settings.fadeMs : undefined
    })
  }
  if (draftShape && commit && settings) {
    board.commitShape({
      tool: draftShape.tool,
      color: settings.color,
      width: WIDTHS[settings.width],
      a: draftShape.a,
      b: draftShape.b
    })
  }
  if (erasing) board.endErase()
  draftInk = null
  draftShape = null
  erasing = false
  redraw()
}

function pointAt(event: PointerEvent): Point {
  return pointerPoint(event, ink)
}

const TEXT_FRAME = Symbol.for('annot.textFrame')
const TEXT_GRIP = 8

type TextHandle = 'move' | 'w' | 'e' | 'nw' | 'ne' | 'sw' | 'se'

let selectedText: TextItem | null = null
let textEditing: TextItem | null = null
let textWatching = false
let textGesture: { finish: (commit: boolean) => void } | null = null

function markTextFrame(item: TextItem, on: boolean): void {
  ;(item as unknown as Record<symbol, boolean>)[TEXT_FRAME] = on
}

function releaseTextSelection(paint: boolean): void {
  if (!selectedText) return
  markTextFrame(selectedText, false)
  selectedText = null
  if (paint) redraw()
}

function ensureTextWatch(): void {
  if (textWatching) return
  textWatching = true
  const drop = (): void => {
    if (!selectedText) return
    if (settings?.tool === 'text' && mode === 'draw') return
    finishTextGesture(true)
    releaseTextSelection(true)
  }
  new MutationObserver(drop).observe(document.body, {
    attributes: true,
    attributeFilter: ['data-tool', 'data-mode']
  })
  window.addEventListener('keydown', (event) => {
    if (event.key !== 'Escape' || editing || !selectedText) return
    finishTextGesture(true)
    releaseTextSelection(true)
  })
  const undo = board.undo.bind(board)
  const redo = board.redo.bind(board)
  const afterHistory = (): void => {
    if (selectedText && !board.items.includes(selectedText)) releaseTextSelection(false)
  }
  board.undo = () => {
    finishTextGesture(false)
    undo()
    afterHistory()
  }
  board.redo = () => {
    finishTextGesture(false)
    redo()
    afterHistory()
  }
  window.annot.onClear(() => {
    finishTextGesture(false)
    releaseTextSelection(false)
  })
}

function selectText(item: TextItem): void {
  if (!board.items.includes(item)) return
  if (selectedText && selectedText !== item) markTextFrame(selectedText, false)
  selectedText = item
  markTextFrame(item, true)
  ensureTextWatch()
  redraw()
}

function measuredWidth(text: string, size: number): number {
  const probe = text.trim()
  if (!probe) return 80
  inkCtx.save()
  inkCtx.font = `600 ${size}px Outfit, 'Segoe UI', sans-serif`
  let width = 0
  for (const line of probe.split('\n')) width = Math.max(width, inkCtx.measureText(line).width)
  inkCtx.restore()
  return Math.max(80, Math.ceil(width))
}

function textUnder(x: number, y: number): TextItem | null {
  for (let index = board.items.length - 1; index >= 0; index--) {
    const item = board.items[index]
    if (item.kind !== 'text') continue
    const box = textBox(inkCtx, item)
    if (
      x >= box.x - TEXT_GRIP &&
      x <= box.x + box.width + TEXT_GRIP &&
      y >= box.y - TEXT_GRIP &&
      y <= box.y + box.height + TEXT_GRIP
    ) {
      return item
    }
  }
  return null
}

function textHandle(box: { x: number; y: number; width: number; height: number }, x: number, y: number): TextHandle {
  const near = (hx: number, hy: number): boolean => Math.abs(x - hx) <= TEXT_GRIP && Math.abs(y - hy) <= TEXT_GRIP
  if (near(box.x, box.y)) return 'nw'
  if (near(box.x + box.width, box.y)) return 'ne'
  if (near(box.x, box.y + box.height)) return 'sw'
  if (near(box.x + box.width, box.y + box.height)) return 'se'
  const along = y >= box.y - TEXT_GRIP && y <= box.y + box.height + TEXT_GRIP
  if (Math.abs(x - box.x) <= TEXT_GRIP && along) return 'w'
  if (Math.abs(x - (box.x + box.width)) <= TEXT_GRIP && along) return 'e'
  return 'move'
}

function finishTextGesture(commit: boolean): void {
  const gesture = textGesture
  textGesture = null
  gesture?.finish(commit)
}

function beginTextGesture(item: TextItem, start: Point, pointerId: number): void {
  finishTextGesture(true)
  const box = textBox(inkCtx, item)
  const handle = textHandle(box, start.x, start.y)
  const origin = { x: item.x, y: item.y, size: item.size, boxWidth: item.boxWidth, height: box.height }
  const startX = start.x
  const startY = start.y
  const apply = (x: number, y: number): void => {
    item.x = origin.x
    item.y = origin.y
    item.size = origin.size
    item.boxWidth = origin.boxWidth
    if (handle === 'move') {
      item.x = origin.x + (x - startX)
      item.y = origin.y + (y - startY)
      return
    }
    if (handle === 'e' || handle === 'w') {
      const delta = x - startX
      const width = Math.min(4000, Math.max(80, Math.round(handle === 'e' ? origin.boxWidth + delta : origin.boxWidth - delta)))
      item.boxWidth = width
      item.x = handle === 'w' ? origin.x + origin.boxWidth - width : origin.x
      return
    }
    const east = handle === 'ne' || handle === 'se'
    const south = handle === 'sw' || handle === 'se'
    const ax = origin.x + (east ? 0 : origin.boxWidth)
    const ay = origin.y + (south ? 0 : origin.height)
    const sx = origin.x + (east ? origin.boxWidth : 0)
    const sy = origin.y + (south ? origin.height : 0)
    const startDist = Math.hypot(sx - ax, sy - ay) || 1
    const dist = Math.max(12, Math.hypot(x - ax, y - ay))
    const size = Math.min(96, Math.max(12, Math.round((origin.size * dist) / startDist)))
    const scale = size / origin.size
    const width = Math.min(8000, Math.max(8, Math.round(origin.boxWidth * scale)))
    item.size = size
    item.boxWidth = width
    item.x = east ? ax : ax - width
    item.y = south ? ay : ay - textBox(inkCtx, item).height
  }
  const detach = {
    up: (): void => undefined,
    cancel: (): void => undefined
  }
  let ended = false
  const onMove = (event: PointerEvent): void => {
    if (event.pointerId !== pointerId || ended) return
    const point = pointAt(event)
    apply(point.x, point.y)
    redraw()
  }
  const finish = (commit: boolean): void => {
    if (ended) return
    ended = true
    ink.removeEventListener('pointermove', onMove)
    ink.removeEventListener('pointerup', detach.up)
    ink.removeEventListener('pointercancel', detach.cancel)
    try {
      if (ink.hasPointerCapture(pointerId)) ink.releasePointerCapture(pointerId)
    } catch {
      /* pointeur déjà relâché */
    }
    const final = { x: item.x, y: item.y, size: item.size, boxWidth: item.boxWidth }
    item.x = origin.x
    item.y = origin.y
    item.size = origin.size
    item.boxWidth = origin.boxWidth
    const changed =
      Math.abs(final.x - origin.x) >= 1 ||
      Math.abs(final.y - origin.y) >= 1 ||
      final.size !== origin.size ||
      final.boxWidth !== origin.boxWidth
    if (commit && changed && board.items.includes(item)) board.update(item, final)
    redraw()
  }
  detach.up = (): void => {
    if (textGesture?.finish === finish) textGesture = null
    finish(true)
  }
  detach.cancel = (): void => {
    if (textGesture?.finish === finish) textGesture = null
    finish(false)
  }
  textGesture = { finish }
  ink.addEventListener('pointermove', onMove)
  ink.addEventListener('pointerup', detach.up)
  ink.addEventListener('pointercancel', detach.cancel)
  try {
    ink.setPointerCapture(pointerId)
  } catch {
    /* Un évènement synthétique n'a pas de pointeur actif. */
  }
}

function openWriter(point: Point, item?: TextItem): void {
  if (!settings) return
  if (editing) commitWriter()
  editing = true
  textEditing = item ?? null
  writerGuard = performance.now()
  writer.hidden = false
  writer.value = item?.text ?? ''
  const x = item ? item.x : Math.min(point.x, window.innerWidth - 180)
  const y = item ? item.y : Math.min(point.y, window.innerHeight - 64)
  writer.style.left = `${x}px`
  writer.style.top = `${y}px`
  writer.style.color = item?.color ?? settings.color
  writer.style.fontSize = `${item?.size ?? TEXT_SIZE[settings.width]}px`
  writer.style.width = item ? `${Math.max(80, Math.round(item.boxWidth))}px` : ''
  void window.annot.holdShortcuts(true)
  writer.focus()
}

function commitWriter(): void {
  if (!editing || !settings) return
  editing = false
  const text = writer.value
  const item = textEditing
  textEditing = null
  writer.hidden = true
  writer.style.width = ''
  void window.annot.holdShortcuts(false)
  if (item) {
    board.update(item, { text })
    if (board.items.includes(item)) selectText(item)
    else redraw()
    return
  }
  const size = TEXT_SIZE[settings.width]
  const created = board.commitText({
    color: settings.color,
    size,
    x: Number.parseFloat(writer.style.left),
    y: Number.parseFloat(writer.style.top),
    text,
    boxWidth: measuredWidth(text, size)
  })
  if (created) selectText(created)
  else redraw()
}

function cancelWriter(): void {
  if (!editing) return
  editing = false
  textEditing = null
  writer.value = ''
  writer.hidden = true
  writer.style.width = ''
  void window.annot.holdShortcuts(false)
}

ink.addEventListener('pointerdown', (event) => {
  if (mode !== 'draw' || !settings || event.button !== 0) return
  cursor = pointAt(event)
  if (settings.tool === 'text') {
    event.preventDefault()
    const hit = textUnder(cursor.x, cursor.y)
    if (hit && event.detail >= 2 && hit === selectedText) {
      finishTextGesture(true)
      const item = hit
      releaseTextSelection(true)
      openWriter(cursor, item)
      return
    }
    if (hit) {
      selectText(hit)
      beginTextGesture(hit, { x: cursor.x, y: cursor.y, p: cursor.p }, event.pointerId)
      return
    }
    finishTextGesture(false)
    releaseTextSelection(true)
    textAnchor = cursor
    return
  }
  if (FOLLOW_TOOLS.has(settings.tool)) return
  event.preventDefault()
  try {
    ink.setPointerCapture(event.pointerId)
  } catch {
    /* Un évènement synthétique n'a pas de pointeur actif. */
  }
  if (INK_TOOLS.has(settings.tool)) {
    draftInk = {
      tool: settings.tool as InkTool,
      stylus: event.pointerType === 'pen' || event.pointerType === 'touch',
      points: [cursor]
    }
  } else if (SHAPE_TOOLS.has(settings.tool)) {
    if (!claimShapePointer(board, cursor, ink, settings.tool, redraw)) {
      draftShape = { tool: settings.tool as ShapeTool, a: cursor, b: cursor }
    }
  } else if (settings.tool === 'eraser') {
    erasing = true
    board.beginErase()
    board.eraseAt(cursor.x, cursor.y, ERASER[settings.width])
    redraw()
  }
  paintLive()
})

ink.addEventListener('pointermove', (event) => {
  cursor = pointAt(event)
  const samples = typeof event.getCoalescedEvents === 'function' ? event.getCoalescedEvents() : [event]
  if (draftInk) {
    const previous = draftInk.points[draftInk.points.length - 1]
    if (!previous || previous.x !== cursor.x || previous.y !== cursor.y) draftInk.points.push(cursor)
  }
  if (dragShape(cursor)) redraw()
  else if (draftShape) draftShape.b = cursor
  if (erasing && settings) {
    const radius = ERASER[settings.width]
    board.eraseAt(cursor.x, cursor.y, radius)
    for (const sample of samples) {
      const point = pointAt(sample)
      if (Math.hypot(point.x - cursor.x, point.y - cursor.y) >= 80) continue
      board.eraseAt(point.x, point.y, radius)
    }
    redraw()
    return
  }
  if (mode === 'draw' && settings?.tool === 'laser') {
    laser.push({ x: cursor.x, y: cursor.y, t: performance.now() })
    if (laser.length > 48) laser.shift()
    ensureLoop()
  }
  if (draftInk || draftShape || (mode === 'draw' && settings && FOLLOW_TOOLS.has(settings.tool))) paintLive()
})

ink.addEventListener('pointerup', () => {
  if (textAnchor) {
    const at = textAnchor
    textAnchor = null
    openWriter(at)
    return
  }
  finishGesture(true)
})
ink.addEventListener('pointercancel', () => {
  textAnchor = null
  finishGesture(false)
})

writer.addEventListener('keydown', (event) => {
  if (event.key === 'Enter' && !event.shiftKey) {
    event.preventDefault()
    commitWriter()
  } else if (event.key === 'Escape') {
    event.preventDefault()
    cancelWriter()
  }
})
writer.addEventListener('blur', () => {
  if (!editing) return
  if (performance.now() - writerGuard < 500) {
    writer.focus()
    return
  }
  commitWriter()
})

window.addEventListener('resize', () => redraw())

async function capture(): Promise<void> {
  if (editing) commitWriter()
  redraw()
  showToast('Capture en cours…')
  try {
    const screenBytes = new Uint8Array(await window.annot.grabScreen())
    const bitmap = await createImageBitmap(new Blob([screenBytes]))
    const out = document.createElement('canvas')
    out.width = bitmap.width
    out.height = bitmap.height
    const ctx = out.getContext('2d')
    if (!ctx) return
    ctx.drawImage(bitmap, 0, 0)
    ctx.drawImage(ink, 0, 0, out.width, out.height)
    const blob = await new Promise<Blob | null>((resolve) => out.toBlob(resolve, 'image/png'))
    if (!blob) return
    const saved = await window.annot.savePng(new Uint8Array(await blob.arrayBuffer()))
    if (saved.canceled) showToast('Capture annulée')
    else if (saved.ok) showToast('Capture enregistrée')
    else showToast('La capture n’a pas pu être enregistrée')
  } catch {
    showToast('La capture n’a pas pu être enregistrée')
  }
}

window.__annotCheck = () => {
  if (!settings) return { ok: false, afterPen: 0, afterErase: 0, open: false, texts: 0 }
  mode = 'draw'
  board.clear()
  settings = { ...settings, tool: 'pen', width: 'medium', color: '#E15A3A' }
  const down = (type: string, x: number, y: number, id: number): void => {
    ink.dispatchEvent(
      new PointerEvent(type, {
        clientX: x,
        clientY: y,
        button: 0,
        buttons: type === 'pointerup' ? 0 : 1,
        pointerId: id,
        bubbles: true,
        pointerType: 'mouse'
      })
    )
  }
  down('pointerdown', 120, 120, 1)
  down('pointermove', 200, 160, 1)
  down('pointerup', 200, 160, 1)
  const afterPen = board.items.length
  settings = { ...settings, tool: 'eraser' }
  down('pointerdown', 160, 140, 2)
  down('pointermove', 170, 145, 2)
  down('pointerup', 170, 145, 2)
  const afterErase = board.items.length
  settings = { ...settings, tool: 'text' }
  down('pointerdown', 240, 240, 3)
  down('pointerup', 240, 240, 3)
  const open = editing && !writer.hidden
  writer.value = 'Bonjour'
  writer.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter', bubbles: true }))
  const texts = board.items.filter((item) => item.kind === 'text').length
  board.clear()
  settings = { ...settings, tool: 'pen' }
  mode = 'mouse'
  return { ok: afterPen === 1 && afterErase === 0 && open && texts === 1, afterPen, afterErase, open, texts }
}

window.__annotSmoke = async () => {
  const stroke: InkItem = {
    kind: 'ink',
    id: 1,
    tool: 'pen',
    color: '#E15A3A',
    width: 8,
    points: [
      { x: 40, y: 40, p: 0.5 },
      { x: 80, y: 70, p: 0.8 },
      { x: 140, y: 50, p: 0.4 },
      { x: 180, y: 90, p: 0.6 }
    ],
    born: Date.now(),
    stylus: false
  }
  const shape: ShapeItem = {
    kind: 'shape',
    id: 2,
    tool: 'rect',
    color: '#3D6FBF',
    width: 4,
    a: { x: 30, y: 30, p: 0 },
    b: { x: 160, y: 100, p: 0 }
  }
  inkCtx = fitCanvas(ink)
  clearCanvas(inkCtx)
  drawItem(inkCtx, stroke)
  drawItem(inkCtx, shape)
  const data = inkCtx.getImageData(0, 0, Math.min(ink.width, 500), Math.min(ink.height, 250))
  let pixels = 0
  for (let i = 3; i < data.data.length; i += 4) if (data.data[i] > 10) pixels += 1
  return { ok: pixels > 20, pixels }
}

async function boot(): Promise<void> {
  const bootstrap = await window.annot.getBootstrap()
  settings = bootstrap.settings
  document.body.dataset.tool = settings.tool
  setMode(bootstrap.mode, false)
  window.annot.onMode((next) => setMode(next))
  window.annot.onTool((state) => {
    if (!settings) return
    const previous = settings.tool
    applyTool({ ...settings, ...state })
    if (state.tool !== previous) showToast(toolLabels[state.tool])
  })
  window.annot.onSettings((next) => applyTool(next))
  window.annot.onClear(() => {
    if (editing) cancelWriter()
    board.clear()
    laser = []
    redraw()
    showToast('Annotations effacées')
  })
  window.annot.onUndo(() => {
    board.undo()
    redraw()
  })
  window.annot.onRedo(() => {
    board.redo()
    redraw()
  })
  window.annot.onMagnifierFrame((bytes) => {
    if (!bytes?.byteLength) return
    const copy = new Uint8Array(bytes.byteLength)
    copy.set(bytes)
    void createImageBitmap(new Blob([copy]))
      .then((bitmap) => {
        loupe?.close()
        loupe = bitmap
        paintLive()
      })
      .catch(() => undefined)
  })
  window.annot.onCapture(() => void capture())
  if (!new URLSearchParams(location.search).has('smoke')) {
    showToast('Calame est prêt · Ctrl+Shift+D pour dessiner')
  }
}

void boot()
