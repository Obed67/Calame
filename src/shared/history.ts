import { hits, inkReach, segmentDistance } from './hit'
import type { InkItem, Item, ShapeItem, TextItem } from './items'
import type { InkTool, Point, ShapeTool } from './types'

type TextSnapshot = Pick<TextItem, 'x' | 'y' | 'size' | 'boxWidth' | 'text' | 'color'>

interface EraseEdit {
  index: number
  item: Item
  pieces: Item[]
}

type Command =
  | { type: 'add'; item: Item }
  | { type: 'remove'; entries: { index: number; item: Item }[] }
  | { type: 'clear'; items: Item[] }
  | { type: 'update'; item: TextItem; before: TextSnapshot; after: TextSnapshot }
  | { type: 'erase'; edits: EraseEdit[] }
  | { type: 'reshape'; item: ShapeItem; before: { a: Point; b: Point }; after: { a: Point; b: Point } }

/** Découpe l'encre sous le disque. null = aucun contact. Moins de 2 points = bout supprimé. */
function splitInk(item: InkItem, x: number, y: number, radius: number): Point[][] | null {
  const reach = inkReach(item, radius)
  const { points } = item
  if (points.length === 0) return null
  const pointHit = points.map((point) => Math.hypot(point.x - x, point.y - y) <= reach)
  const segmentHit: boolean[] = []
  for (let index = 1; index < points.length; index++) {
    segmentHit.push(segmentDistance(points[index - 1], points[index], x, y) <= reach)
  }
  if (!pointHit.some(Boolean) && !segmentHit.some(Boolean)) return null
  const runs: Point[][] = []
  let run: Point[] = []
  const flush = (): void => {
    if (run.length >= 2) runs.push(run)
    run = []
  }
  for (let index = 0; index < points.length; index++) {
    if (pointHit[index]) {
      flush()
      continue
    }
    if (index > 0 && segmentHit[index - 1]) flush()
    run.push(points[index])
  }
  flush()
  return runs
}

interface InkInput {
  tool: InkTool
  color: string
  width: number
  points: Point[]
  born?: number
  fadeMs?: number
  stylus?: boolean
}

/** Historique des annotations : ajout, gomme, effacement, annuler et rétablir. */
export class Board {
  items: Item[] = []
  private undoStack: Command[] = []
  private redoStack: Command[] = []
  private nextId = 1
  private erasing: EraseEdit[] | null = null
  private pieceOf: Map<Item, EraseEdit> | null = null
  private origin: Item[] | null = null

  get canUndo(): boolean {
    return this.undoStack.length > 0
  }

  get canRedo(): boolean {
    return this.redoStack.length > 0
  }

  commit(input: InkInput): InkItem | null {
    if (input.points.length === 0) return null
    const item: InkItem = {
      kind: 'ink',
      id: this.nextId++,
      tool: input.tool,
      color: input.color,
      width: input.width,
      points: input.points.map((point) => ({ ...point })),
      born: input.born ?? Date.now(),
      fadeMs: input.fadeMs,
      stylus: input.stylus === true
    }
    this.push(item)
    return item
  }

  commitShape(input: { tool: ShapeTool; color: string; width: number; a: Point; b: Point }): ShapeItem | null {
    if (Math.hypot(input.b.x - input.a.x, input.b.y - input.a.y) < 2) return null
    const item: ShapeItem = {
      kind: 'shape',
      id: this.nextId++,
      tool: input.tool,
      color: input.color,
      width: input.width,
      a: { ...input.a },
      b: { ...input.b }
    }
    this.push(item)
    return item
  }

  commitText(input: {
    color: string
    size: number
    x: number
    y: number
    text: string
    boxWidth?: number
  }): TextItem | null {
    const text = input.text.trim()
    if (!text) return null
    const longest = Math.max(...text.split('\n').map((line) => line.length))
    const estimated = Math.max(80, Math.ceil(longest * input.size * 0.56))
    const requested =
      typeof input.boxWidth === 'number' && Number.isFinite(input.boxWidth) ? input.boxWidth : estimated
    const item: TextItem = {
      kind: 'text',
      id: this.nextId++,
      color: input.color,
      size: input.size,
      x: input.x,
      y: input.y,
      text,
      boxWidth: Math.max(80, Math.round(requested))
    }
    this.push(item)
    return item
  }

  /**
   * Recadre ou réécrit un texte en une seule étape d'annulation.
   * Un texte vidé est retiré ; Ctrl+Z le remet en place.
   */
  update(
    item: TextItem,
    patch: Partial<Pick<TextItem, 'color' | 'size' | 'x' | 'y' | 'boxWidth' | 'text'>>
  ): boolean {
    if (!this.items.includes(item)) return false
    if (patch.text !== undefined && patch.text.trim() === '') {
      const index = this.items.indexOf(item)
      this.items = this.items.filter((entry) => entry !== item)
      this.undoStack.push({ type: 'remove', entries: [{ index, item }] })
      this.redoStack = []
      return true
    }
    const before: TextSnapshot = {
      x: item.x,
      y: item.y,
      size: item.size,
      boxWidth: item.boxWidth,
      text: item.text,
      color: item.color
    }
    const size =
      typeof patch.size !== 'number' || !Number.isFinite(patch.size)
        ? item.size
        : Math.min(96, Math.max(12, Math.round(patch.size)))
    const boxWidth =
      typeof patch.boxWidth !== 'number' || !Number.isFinite(patch.boxWidth)
        ? item.boxWidth
        : Math.max(8, Math.round(patch.boxWidth))
    const after: TextSnapshot = {
      x: patch.x ?? item.x,
      y: patch.y ?? item.y,
      size,
      boxWidth,
      text: patch.text === undefined ? item.text : patch.text.trim(),
      color: patch.color ?? item.color
    }
    if (
      before.x === after.x &&
      before.y === after.y &&
      before.size === after.size &&
      before.boxWidth === after.boxWidth &&
      before.text === after.text &&
      before.color === after.color
    ) {
      return false
    }
    Object.assign(item, after)
    this.undoStack.push({ type: 'update', item, before, after })
    this.redoStack = []
    return true
  }

  beginErase(): void {
    this.erasing = []
    this.pieceOf = new Map()
    this.origin = this.items.slice()
  }

  eraseAt(x: number, y: number, radius: number): boolean {
    if (!this.erasing || !this.origin || !this.pieceOf) return false
    const pieceOf = this.pieceOf
    const erasing = this.erasing
    const origin = this.origin
    let changed = false
    const next: Item[] = []
    const spawn = (source: InkItem, points: Point[]): InkItem => ({
      kind: 'ink',
      id: this.nextId++,
      tool: source.tool,
      color: source.color,
      width: source.width,
      points: points.map((point) => ({ ...point })),
      born: source.born,
      fadeMs: source.fadeMs,
      stylus: source.stylus
    })
    for (const item of this.items) {
      if (item.kind === 'ink') {
        const runs = splitInk(item, x, y, radius)
        if (!runs) {
          next.push(item)
          continue
        }
        changed = true
        const pieces = runs.map((points) => spawn(item, points))
        const owner = pieceOf.get(item)
        if (owner) {
          const at = owner.pieces.indexOf(item)
          if (at >= 0) owner.pieces.splice(at, 1, ...pieces)
          else owner.pieces.push(...pieces)
          pieceOf.delete(item)
          for (const piece of pieces) pieceOf.set(piece, owner)
        } else {
          const edit: EraseEdit = { index: origin.indexOf(item), item, pieces }
          erasing.push(edit)
          for (const piece of pieces) pieceOf.set(piece, edit)
        }
        next.push(...pieces)
        continue
      }
      if (!hits(item, x, y, radius)) {
        next.push(item)
        continue
      }
      changed = true
      if (!erasing.some((edit) => edit.item === item)) {
        erasing.push({ index: origin.indexOf(item), item, pieces: [] })
      }
    }
    if (changed) this.items = next
    return changed
  }

  endErase(): void {
    if (this.erasing && this.erasing.length > 0) {
      this.undoStack.push({
        type: 'erase',
        edits: this.erasing.map((edit) => ({
          index: edit.index,
          item: edit.item,
          pieces: edit.pieces.slice()
        }))
      })
      this.redoStack = []
    }
    this.erasing = null
    this.pieceOf = null
    this.origin = null
  }

  undo(): void {
    const command = this.undoStack.pop()
    if (!command) return
    this.invert(command)
    this.redoStack.push(command)
  }

  redo(): void {
    const command = this.redoStack.pop()
    if (!command) return
    this.apply(command)
    this.undoStack.push(command)
  }

  clear(): void {
    if (this.items.length === 0) return
    const command: Command = { type: 'clear', items: this.items.slice() }
    this.apply(command)
    this.undoStack.push(command)
    this.redoStack = []
  }

  /** Retire l'encre éphémère échue, sans créer d'étape d'annulation. */
  expire(now: number): boolean {
    const dead = new Set(
      this.items.filter((item) => item.kind === 'ink' && item.fadeMs !== undefined && now - item.born >= item.fadeMs)
    )
    if (dead.size === 0) return false
    this.items = this.items.filter((item) => !dead.has(item))
    const drop = (command: Command): boolean => {
      if (command.type === 'add' || command.type === 'update') return dead.has(command.item)
      if (command.type === 'reshape') return false
      if (command.type === 'clear') {
        command.items = command.items.filter((item) => !dead.has(item))
        return command.items.length === 0
      }
      if (command.type === 'erase') {
        command.edits = command.edits.filter((edit) => !dead.has(edit.item))
        for (const edit of command.edits) {
          edit.pieces = edit.pieces.filter((piece) => !dead.has(piece))
        }
        return command.edits.length === 0
      }
      command.entries = command.entries.filter((entry) => !dead.has(entry.item))
      return command.entries.length === 0
    }
    this.undoStack = this.undoStack.filter((command) => !drop(command))
    this.redoStack = this.redoStack.filter((command) => !drop(command))
    return true
  }

  private push(item: Item): void {
    this.items.push(item)
    this.undoStack.push({ type: 'add', item })
    this.redoStack = []
  }

  private apply(command: Command): void {
    if (command.type === 'add') {
      this.items.push(command.item)
      return
    }
    if (command.type === 'update') {
      Object.assign(command.item, command.after)
      return
    }
    if (command.type === 'reshape') {
      command.item.a = { ...command.after.a }
      command.item.b = { ...command.after.b }
      return
    }
    if (command.type === 'clear') {
      this.items = []
      return
    }
    if (command.type === 'erase') {
      const next = this.items.slice()
      for (const edit of command.edits) {
        const at = next.indexOf(edit.item)
        if (at >= 0) next.splice(at, 1, ...edit.pieces)
      }
      this.items = next
      return
    }
    const gone = new Set(command.entries.map((entry) => entry.item))
    this.items = this.items.filter((item) => !gone.has(item))
  }

  private invert(command: Command): void {
    if (command.type === 'add') {
      this.items = this.items.filter((item) => item !== command.item)
      return
    }
    if (command.type === 'update') {
      Object.assign(command.item, command.before)
      return
    }
    if (command.type === 'reshape') {
      command.item.a = { ...command.before.a }
      command.item.b = { ...command.before.b }
      return
    }
    if (command.type === 'clear') {
      this.items = command.items.slice()
      return
    }
    if (command.type === 'erase') {
      const owner = new Map<Item, EraseEdit>()
      for (const edit of command.edits) {
        for (const piece of edit.pieces) owner.set(piece, edit)
      }
      const emitted = new Set<EraseEdit>()
      const next: Item[] = []
      for (const item of this.items) {
        const edit = owner.get(item)
        if (!edit) {
          next.push(item)
          continue
        }
        if (!emitted.has(edit)) {
          next.push(edit.item)
          emitted.add(edit)
        }
      }
      for (const edit of [...command.edits].filter((edit) => !emitted.has(edit)).sort((a, b) => a.index - b.index)) {
        next.splice(Math.max(0, Math.min(edit.index, next.length)), 0, edit.item)
      }
      this.items = next
      return
    }
    const next = this.items.slice()
    for (const entry of [...command.entries].sort((a, b) => a.index - b.index)) {
      next.splice(Math.max(0, Math.min(entry.index, next.length)), 0, entry.item)
    }
    this.items = next
  }

  /**
   * Déplace ou redimensionne une forme. Une seule étape d'annulation.
   * `previous` est la géométrie d'avant le geste si l'objet a déjà été modifié en direct.
   */
  updateShape(id: number, a: Point, b: Point, previous?: { a: Point; b: Point }): boolean {
    const item = this.items.find((entry): entry is ShapeItem => entry.kind === 'shape' && entry.id === id)
    if (!item) return false
    const before = {
      a: { ...(previous?.a ?? item.a) },
      b: { ...(previous?.b ?? item.b) }
    }
    const after = { a: { ...a }, b: { ...b } }
    item.a = after.a
    item.b = after.b
    if (before.a.x === after.a.x && before.a.y === after.a.y && before.b.x === after.b.x && before.b.y === after.b.y) {
      return false
    }
    this.undoStack.push({ type: 'reshape', item, before, after })
    this.redoStack = []
    return true
  }
}
