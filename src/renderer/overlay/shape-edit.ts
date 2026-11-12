import type { Board } from '../../shared/history'
import { hits } from '../../shared/hit'
import type { Item, ShapeItem } from '../../shared/items'
import type { Point, ToolId } from '../../shared/types'

/** Zone cliquable d'une poignée, un peu plus large que le carré dessiné. */
const HANDLE_SLOP = 10

type HandleKind = 'a' | 'b' | 'ax' | 'bx'

interface ShapeDrag {
  item: ShapeItem
  kind: HandleKind | 'move'
  origin: Point
  a: Point
  b: Point
  /** Dernière géométrie posée par le glisser, pour ne pas écraser un Ctrl+Z. */
  appliedA: Point
  appliedB: Point
}

let selectedId: number | null = null
let drag: ShapeDrag | null = null
let detachPointer: (() => void) | null = null
let watchInstalled = false

function handlePoints(shape: ShapeItem): { kind: HandleKind; x: number; y: number }[] {
  const points: { kind: HandleKind; x: number; y: number }[] = [
    { kind: 'a', x: shape.a.x, y: shape.a.y },
    { kind: 'b', x: shape.b.x, y: shape.b.y }
  ]
  if (shape.tool === 'rect' || shape.tool === 'ellipse') {
    points.push(
      { kind: 'ax', x: shape.a.x, y: shape.b.y },
      { kind: 'bx', x: shape.b.x, y: shape.a.y }
    )
  }
  return points
}

function containsBody(shape: ShapeItem, x: number, y: number): boolean {
  const left = Math.min(shape.a.x, shape.b.x)
  const right = Math.max(shape.a.x, shape.b.x)
  const top = Math.min(shape.a.y, shape.b.y)
  const bottom = Math.max(shape.a.y, shape.b.y)
  if (shape.tool === 'rect' && x >= left && x <= right && y >= top && y <= bottom) return true
  if (shape.tool === 'ellipse') {
    const rx = Math.max(1, (right - left) / 2)
    const ry = Math.max(1, (bottom - top) / 2)
    const nx = (x - (left + right) / 2) / rx
    const ny = (y - (top + bottom) / 2) / ry
    if (nx * nx + ny * ny <= 1) return true
  }
  return hits(shape, x, y, 6)
}

function locateShape(items: Item[], x: number, y: number): { item: ShapeItem; handle: HandleKind | null } | null {
  for (let index = items.length - 1; index >= 0; index--) {
    const item = items[index]
    if (item.kind !== 'shape') continue
    let nearest: { kind: HandleKind; distance: number } | null = null
    for (const handle of handlePoints(item)) {
      const distance = Math.hypot(handle.x - x, handle.y - y)
      if (distance <= HANDLE_SLOP && (!nearest || distance < nearest.distance)) {
        nearest = { kind: handle.kind, distance }
      }
    }
    if (nearest) return { item, handle: nearest.kind }
    if (containsBody(item, x, y)) return { item, handle: null }
  }
  return null
}

function shifted(base: Point, dx: number, dy: number, moveX: boolean, moveY: boolean): Point {
  return {
    x: base.x + (moveX ? dx : 0),
    y: base.y + (moveY ? dy : 0),
    p: base.p
  }
}

function applyDrag(cursor: Point): void {
  if (!drag) return
  const dx = cursor.x - drag.origin.x
  const dy = cursor.y - drag.origin.y
  if (drag.kind === 'move') {
    drag.item.a = shifted(drag.a, dx, dy, true, true)
    drag.item.b = shifted(drag.b, dx, dy, true, true)
  } else if (drag.kind === 'a') {
    drag.item.a = shifted(drag.a, dx, dy, true, true)
    drag.item.b = { ...drag.b }
  } else if (drag.kind === 'b') {
    drag.item.a = { ...drag.a }
    drag.item.b = shifted(drag.b, dx, dy, true, true)
  } else if (drag.kind === 'ax') {
    drag.item.a = shifted(drag.a, dx, dy, true, false)
    drag.item.b = shifted(drag.b, dx, dy, false, true)
  } else {
    drag.item.a = shifted(drag.a, dx, dy, false, true)
    drag.item.b = shifted(drag.b, dx, dy, true, false)
  }
  drag.appliedA = { ...drag.item.a }
  drag.appliedB = { ...drag.item.b }
}

function commitDrag(board: Board): void {
  if (!drag) return
  const current = drag
  drag = null
  board.updateShape(current.item.id, current.item.a, current.item.b, { a: current.a, b: current.b })
}

function cancelDrag(): void {
  if (!drag) return
  drag.item.a = { ...drag.a }
  drag.item.b = { ...drag.b }
  drag = null
}

function releasePointer(): void {
  detachPointer?.()
  detachPointer = null
}

function settleDrag(board: Board): void {
  releasePointer()
  if (drag) commitDrag(board)
}

function armPointer(surface: HTMLElement, board: Board, redraw: () => void): void {
  releasePointer()
  const stop = (): void => {
    surface.removeEventListener('pointerup', onUp, true)
    surface.removeEventListener('pointercancel', onCancel, true)
    if (detachPointer === stop) detachPointer = null
  }
  const onUp = (): void => {
    stop()
    commitDrag(board)
  }
  const onCancel = (): void => {
    stop()
    cancelDrag()
    redraw()
  }
  detachPointer = stop
  surface.addEventListener('pointerup', onUp, true)
  surface.addEventListener('pointercancel', onCancel, true)
}

function dismiss(board: Board, redraw: () => void, keep: boolean): void {
  const active = selectedId !== null || drag !== null
  releasePointer()
  if (drag) {
    if (keep) commitDrag(board)
    else cancelDrag()
  }
  selectedId = null
  if (active) redraw()
}

function ensureWatch(tool: ToolId, board: Board, redraw: () => void): void {
  if (watchInstalled) return
  watchInstalled = true
  let toolSeen: ToolId | null = tool
  window.addEventListener('keydown', (event) => {
    if (event.key !== 'Escape') return
    dismiss(board, redraw, false)
  })
  window.annot.onTool((state) => {
    const changed = toolSeen !== null && state.tool !== toolSeen
    toolSeen = state.tool
    if (changed) dismiss(board, redraw, true)
  })
  window.annot.onMode((next) => {
    if (next !== 'draw') dismiss(board, redraw, false)
  })
  const afterHistory = (): void => {
    if (drag) {
      const item = drag.item
      const untouched =
        item.a.x === drag.appliedA.x &&
        item.a.y === drag.appliedA.y &&
        item.b.x === drag.appliedB.x &&
        item.b.y === drag.appliedB.y
      releasePointer()
      if (untouched) commitDrag(board)
      else drag = null
    }
    if (selectedId !== null && !board.items.some((item) => item.kind === 'shape' && item.id === selectedId)) {
      selectedId = null
    }
  }
  window.annot.onUndo(afterHistory)
  window.annot.onRedo(afterHistory)
  window.annot.onClear(() => {
    releasePointer()
    drag = null
    selectedId = null
  })
}

/** Forme dont le cadre est affiché, ou null. */
export function selectedShape(items: Item[]): ShapeItem | null {
  if (selectedId === null) return null
  for (let index = items.length - 1; index >= 0; index--) {
    const item = items[index]
    if (item.kind === 'shape' && item.id === selectedId) return item
  }
  return null
}

/**
 * Pointeur appuyé avec un outil de forme.
 * true : une forme existante est sélectionnée (et suivra le glisser).
 * false : le vide — l'appelant commence une forme neuve.
 */
export function claimShapePointer(
  board: Board,
  cursor: Point,
  surface: HTMLElement,
  tool: ToolId,
  redraw: () => void
): boolean {
  ensureWatch(tool, board, redraw)
  settleDrag(board)
  const pick = locateShape(board.items, cursor.x, cursor.y)
  if (!pick) {
    selectedId = null
    return false
  }
  selectedId = pick.item.id
  drag = {
    item: pick.item,
    kind: pick.handle ?? 'move',
    origin: { ...cursor },
    a: { ...pick.item.a },
    b: { ...pick.item.b },
    appliedA: { ...pick.item.a },
    appliedB: { ...pick.item.b }
  }
  armPointer(surface, board, redraw)
  return true
}

/** Met à jour la forme en cours de glisser. true s'il y a un geste actif. */
export function dragShape(cursor: Point): boolean {
  if (!drag) return false
  applyDrag(cursor)
  return true
}
