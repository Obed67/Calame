import { getStroke } from 'perfect-freehand'
import type { Item } from '../../shared/items'
import type { Point } from '../../shared/types'

function pressureOf(event: PointerEvent): number {
  if (event.pointerType === 'pen' || event.pointerType === 'touch') {
    return event.pressure > 0 ? event.pressure : 0.5
  }
  return 0.5
}

export function pointerPoint(event: PointerEvent, surface: HTMLElement): Point {
  const rect = surface.getBoundingClientRect()
  return {
    x: event.clientX - rect.left,
    y: event.clientY - rect.top,
    p: pressureOf(event)
  }
}

export function fillOutline(ctx: CanvasRenderingContext2D, outline: number[][]): void {
  if (outline.length < 2) return
  ctx.beginPath()
  ctx.moveTo(outline[0][0], outline[0][1])
  for (let i = 0; i < outline.length - 1; i++) {
    const [x0, y0] = outline[i]
    const [x1, y1] = outline[i + 1]
    ctx.quadraticCurveTo(x0, y0, (x0 + x1) / 2, (y0 + y1) / 2)
  }
  ctx.closePath()
  ctx.fill()
}

let scratch: HTMLCanvasElement | null = null

function scratchContext(source: CanvasRenderingContext2D): CanvasRenderingContext2D | null {
  if (!scratch) scratch = document.createElement('canvas')
  if (scratch.width !== source.canvas.width || scratch.height !== source.canvas.height) {
    scratch.width = source.canvas.width
    scratch.height = source.canvas.height
  }
  const off = scratch.getContext('2d')
  if (!off) return null
  off.setTransform(1, 0, 0, 1, 0, 0)
  off.clearRect(0, 0, scratch.width, scratch.height)
  off.setTransform(source.getTransform())
  return off
}

export function drawInk(
  ctx: CanvasRenderingContext2D,
  stroke: { tool: string; color: string; width: number; points: Point[]; stylus?: boolean },
  complete: boolean,
  alpha = 1
): void {
  if (stroke.points.length === 0 || alpha <= 0) return
  const highlighter = stroke.tool === 'highlighter'
  const stylus = stroke.stylus === true && !highlighter
  const outline = getStroke(
    stroke.points.map((point) => [point.x, point.y, point.p]),
    {
      size: highlighter ? stroke.width * 2.8 : stroke.width,
      thinning: stylus ? 0.55 : 0.25,
      smoothing: 0.62,
      streamline: 0.5,
      simulatePressure: !stylus,
      easing: (t) => Math.sin((t * Math.PI) / 2),
      start: { taper: stylus ? 8 : 0, cap: true },
      end: { taper: stylus ? 8 : 0, cap: true },
      last: complete
    }
  )
  ctx.save()
  if (highlighter) {
    const off = scratchContext(ctx)
    if (!off || !scratch) {
      ctx.restore()
      return
    }
    off.fillStyle = stroke.color
    fillOutline(off, outline)
    ctx.globalAlpha = 0.38 * alpha
    ctx.setTransform(1, 0, 0, 1, 0, 0)
    ctx.drawImage(scratch, 0, 0)
  } else {
    ctx.globalAlpha = alpha
    ctx.fillStyle = stroke.color
    fillOutline(ctx, outline)
  }
  ctx.restore()
}

export function drawShape(
  ctx: CanvasRenderingContext2D,
  shape: { tool: string; color: string; width: number; a: Point; b: Point }
): void {
  ctx.save()
  ctx.strokeStyle = shape.color
  ctx.fillStyle = shape.color
  ctx.lineWidth = shape.width
  ctx.lineCap = 'round'
  ctx.lineJoin = 'round'
  ctx.beginPath()
  if (shape.tool === 'line' || shape.tool === 'arrow') {
    ctx.moveTo(shape.a.x, shape.a.y)
    ctx.lineTo(shape.b.x, shape.b.y)
    ctx.stroke()
    if (shape.tool === 'arrow') {
      const angle = Math.atan2(shape.b.y - shape.a.y, shape.b.x - shape.a.x)
      const length = 14 + shape.width * 1.4
      ctx.beginPath()
      ctx.moveTo(shape.b.x, shape.b.y)
      ctx.lineTo(shape.b.x - length * Math.cos(angle - 0.42), shape.b.y - length * Math.sin(angle - 0.42))
      ctx.moveTo(shape.b.x, shape.b.y)
      ctx.lineTo(shape.b.x - length * Math.cos(angle + 0.42), shape.b.y - length * Math.sin(angle + 0.42))
      ctx.stroke()
    }
  } else if (shape.tool === 'rect') {
    const x = Math.min(shape.a.x, shape.b.x)
    const y = Math.min(shape.a.y, shape.b.y)
    ctx.strokeRect(x, y, Math.abs(shape.b.x - shape.a.x), Math.abs(shape.b.y - shape.a.y))
  } else {
    const x = Math.min(shape.a.x, shape.b.x)
    const y = Math.min(shape.a.y, shape.b.y)
    const rx = Math.max(0.5, Math.abs(shape.b.x - shape.a.x) / 2)
    const ry = Math.max(0.5, Math.abs(shape.b.y - shape.a.y) / 2)
    ctx.ellipse(x + rx, y + ry, rx, ry, 0, 0, Math.PI * 2)
    ctx.stroke()
  }
  ctx.restore()
}

export function drawText(
  ctx: CanvasRenderingContext2D,
  item: { color: string; size: number; x: number; y: number; text: string; boxWidth?: number }
): void {
  const box = textBox(ctx, item)
  ctx.save()
  ctx.fillStyle = item.color
  ctx.font = `600 ${item.size}px Outfit, 'Segoe UI', sans-serif`
  ctx.textBaseline = 'top'
  box.lines.forEach((line, index) => {
    ctx.fillText(line, item.x, item.y + index * item.size * 1.25)
  })
  ctx.restore()
  if (textFramed(item)) drawTextFrame(ctx, box)
}

export function drawItem(ctx: CanvasRenderingContext2D, item: Item, now = Date.now()): void {
  if (item.kind === 'ink') {
    let alpha = 1
    if (item.fadeMs) {
      const left = item.fadeMs - (now - item.born)
      if (left <= 0) return
      if (left < 450) alpha = left / 450
    }
    drawInk(ctx, item, true, alpha)
    return
  }
  if (item.kind === 'shape') drawShape(ctx, item)
  else drawText(ctx, item)
}

export function drawLaser(ctx: CanvasRenderingContext2D, points: { x: number; y: number; t: number }[], now: number): void {
  for (const point of points) {
    const age = (now - point.t) / 700
    if (age >= 1) continue
    ctx.save()
    ctx.fillStyle = `rgba(225, 90, 58, ${0.85 * (1 - age)})`
    ctx.beginPath()
    ctx.arc(point.x, point.y, 7 * (1 - age * 0.4), 0, Math.PI * 2)
    ctx.fill()
    ctx.restore()
  }
}

export function drawSpotlight(ctx: CanvasRenderingContext2D, x: number, y: number, radius: number): void {
  ctx.save()
  ctx.fillStyle = 'rgba(12, 10, 8, 0.62)'
  ctx.fillRect(0, 0, window.innerWidth, window.innerHeight)
  ctx.globalCompositeOperation = 'destination-out'
  const glow = ctx.createRadialGradient(x, y, radius * 0.45, x, y, radius)
  glow.addColorStop(0, 'rgba(0,0,0,1)')
  glow.addColorStop(1, 'rgba(0,0,0,0)')
  ctx.fillStyle = glow
  ctx.beginPath()
  ctx.arc(x, y, radius, 0, Math.PI * 2)
  ctx.fill()
  ctx.restore()
}

export function drawMagnifier(
  ctx: CanvasRenderingContext2D,
  source: ImageBitmap | null,
  x: number,
  y: number,
  radius: number,
  zoom: number
): void {
  const ready = !!source && source.width > 0 && source.height > 0
  ctx.save()
  ctx.beginPath()
  ctx.arc(x, y, radius, 0, Math.PI * 2)
  if (ready && source) {
    ctx.save()
    ctx.clip()
    const scaleX = source.width / window.innerWidth
    const scaleY = source.height / window.innerHeight
    const sw = ((radius * 2) / zoom) * scaleX
    const sh = ((radius * 2) / zoom) * scaleY
    ctx.drawImage(source, x * scaleX - sw / 2, y * scaleY - sh / 2, sw, sh, x - radius, y - radius, radius * 2, radius * 2)
    ctx.restore()
  } else {
    ctx.fillStyle = 'rgba(28, 25, 21, 0.28)'
    ctx.fill()
  }
  ctx.restore()
  ctx.save()
  ctx.strokeStyle = '#D4A054'
  ctx.lineWidth = 3
  ctx.beginPath()
  ctx.arc(x, y, radius, 0, Math.PI * 2)
  ctx.stroke()
  ctx.restore()
}

export function fitCanvas(canvas: HTMLCanvasElement): CanvasRenderingContext2D {
  const dpr = Math.min(window.devicePixelRatio || 1, 2)
  const width = window.innerWidth
  const height = window.innerHeight
  const pixelWidth = Math.max(1, Math.round(width * dpr))
  const pixelHeight = Math.max(1, Math.round(height * dpr))
  if (canvas.width !== pixelWidth || canvas.height !== pixelHeight) {
    canvas.width = pixelWidth
    canvas.height = pixelHeight
    canvas.style.width = `${width}px`
    canvas.style.height = `${height}px`
  }
  const ctx = canvas.getContext('2d')
  if (!ctx) throw new Error('Canvas indisponible')
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0)
  return ctx
}

export function clearCanvas(ctx: CanvasRenderingContext2D): void {
  ctx.clearRect(0, 0, window.innerWidth, window.innerHeight)
}

const TEXT_FRAME = Symbol.for('annot.textFrame')

function textFramed(item: object): boolean {
  return (item as Record<symbol, boolean>)[TEXT_FRAME] === true
}

export interface TextBox {
  x: number
  y: number
  width: number
  height: number
  lines: string[]
}

function textFont(size: number): string {
  return `600 ${size}px Outfit, 'Segoe UI', sans-serif`
}

function piecesWithin(ctx: CanvasRenderingContext2D, word: string, boxWidth: number): string[] {
  if (!word || ctx.measureText(word).width <= boxWidth + 0.5) return [word]
  const parts: string[] = []
  let chunk = ''
  for (const char of word) {
    const trial = chunk + char
    if (chunk && ctx.measureText(trial).width > boxWidth + 0.5) {
      parts.push(chunk)
      chunk = char
    } else chunk = trial
  }
  if (chunk) parts.push(chunk)
  return parts.length > 0 ? parts : ['']
}

function wrapParagraph(ctx: CanvasRenderingContext2D, paragraph: string, boxWidth: number): string[] {
  if (!paragraph) return ['']
  const lines: string[] = []
  let current = ''
  for (const word of paragraph.split(' ')) {
    const pieces = piecesWithin(ctx, word, boxWidth)
    for (let index = 0; index < pieces.length; index++) {
      const piece = pieces[index]
      const trial = current ? `${current} ${piece}` : piece
      if (!current || ctx.measureText(trial).width <= boxWidth + 0.5) current = trial
      else {
        lines.push(current)
        current = piece
      }
      if (index < pieces.length - 1 && current) {
        lines.push(current)
        current = ''
      }
    }
  }
  if (current || lines.length === 0) lines.push(current)
  return lines
}

/** Cadre et lignes d'un texte. Sans boxWidth, la largeur mesurée (minimum 80). */
export function textBox(
  ctx: CanvasRenderingContext2D,
  item: { size: number; x: number; y: number; text: string; boxWidth?: number }
): TextBox {
  ctx.save()
  ctx.font = textFont(item.size)
  const natural = Math.max(
    80,
    Math.ceil(Math.max(0, ...item.text.split('\n').map((line) => ctx.measureText(line).width)))
  )
  const width = item.boxWidth && item.boxWidth > 0 ? Math.max(8, item.boxWidth) : natural
  const lines = item.text.split('\n').flatMap((paragraph) => wrapParagraph(ctx, paragraph, width))
  ctx.restore()
  return {
    x: item.x,
    y: item.y,
    width,
    height: Math.max(1, lines.length) * item.size * 1.25,
    lines: lines.length > 0 ? lines : ['']
  }
}

/** Cadre en pointillés laiton et poignées de recadrage. */
export function drawTextFrame(ctx: CanvasRenderingContext2D, box: { x: number; y: number; width: number; height: number }): void {
  const { x, y, width, height } = box
  ctx.save()
  ctx.strokeStyle = '#D4A054'
  ctx.lineWidth = 1.25
  ctx.setLineDash([5, 4])
  ctx.strokeRect(x, y, width, height)
  ctx.setLineDash([])
  const spots: Array<[number, number]> = [
    [x, y],
    [x + width, y],
    [x, y + height],
    [x + width, y + height],
    [x, y + height / 2],
    [x + width, y + height / 2]
  ]
  for (const [hx, hy] of spots) {
    ctx.beginPath()
    ctx.rect(hx - 4, hy - 4, 8, 8)
    ctx.fillStyle = '#F7F4EE'
    ctx.fill()
    ctx.lineWidth = 1.5
    ctx.strokeStyle = '#D4A054'
    ctx.stroke()
  }
  ctx.restore()
}

/** Cadre laiton et poignées d'une forme sélectionnée (extrémités, ou les quatre coins). */
export function drawShapeHandles(
  ctx: CanvasRenderingContext2D,
  shape: { tool: string; a: Point; b: Point }
): void {
  const open = shape.tool === 'line' || shape.tool === 'arrow'
  ctx.save()
  ctx.strokeStyle = '#D4A054'
  ctx.lineWidth = 1.25
  ctx.setLineDash([5, 4])
  ctx.beginPath()
  if (open) {
    ctx.moveTo(shape.a.x, shape.a.y)
    ctx.lineTo(shape.b.x, shape.b.y)
  } else {
    const x = Math.min(shape.a.x, shape.b.x)
    const y = Math.min(shape.a.y, shape.b.y)
    ctx.rect(x, y, Math.abs(shape.b.x - shape.a.x), Math.abs(shape.b.y - shape.a.y))
  }
  ctx.stroke()
  ctx.setLineDash([])
  const points = open
    ? [shape.a, shape.b]
    : [shape.a, shape.b, { x: shape.a.x, y: shape.b.y }, { x: shape.b.x, y: shape.a.y }]
  for (const point of points) {
    ctx.beginPath()
    ctx.rect(point.x - 4, point.y - 4, 8, 8)
    ctx.fillStyle = '#F7F4EE'
    ctx.fill()
    ctx.lineWidth = 1.5
    ctx.strokeStyle = '#D4A054'
    ctx.stroke()
  }
  ctx.restore()
}
