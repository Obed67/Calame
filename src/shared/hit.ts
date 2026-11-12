import type { Item } from './items'
import type { Point } from './types'

export function segmentDistance(a: Point, b: Point, x: number, y: number): number {
  const dx = b.x - a.x
  const dy = b.y - a.y
  const length = dx * dx + dy * dy
  if (length === 0) return Math.hypot(x - a.x, y - a.y)
  const t = Math.max(0, Math.min(1, ((x - a.x) * dx + (y - a.y) * dy) / length))
  return Math.hypot(x - (a.x + t * dx), y - (a.y + t * dy))
}

/** Rayon de gomme + diamètre visible (perfect-freehand : stylo et fade = width, surligneur = width × 2,8). */
export function inkReach(item: { tool: string; width: number }, radius: number): number {
  return radius + item.width * (item.tool === 'highlighter' ? 2.8 : 1)
}

export function hits(item: Item, x: number, y: number, radius: number): boolean {
  if (item.kind === 'ink') {
    const reach = inkReach(item, radius)
    return item.points.some((point, index) => {
      if (Math.hypot(point.x - x, point.y - y) <= reach) return true
      if (index === 0) return false
      return segmentDistance(item.points[index - 1], point, x, y) <= reach
    })
  }
  if (item.kind === 'text') {
    const lines = item.text.split('\n')
    const width = Math.max(1, ...lines.map((line) => line.length)) * item.size * 0.56
    const height = lines.length * item.size * 1.25
    return x >= item.x - radius && x <= item.x + width + radius && y >= item.y - radius && y <= item.y + height + radius
  }
  const reach = radius + item.width
  if (item.tool === 'line' || item.tool === 'arrow') {
    return segmentDistance(item.a, item.b, x, y) <= reach
  }
  const left = Math.min(item.a.x, item.b.x)
  const right = Math.max(item.a.x, item.b.x)
  const top = Math.min(item.a.y, item.b.y)
  const bottom = Math.max(item.a.y, item.b.y)
  if (item.tool === 'rect') {
    const nearX = x >= left - reach && x <= right + reach
    const nearY = y >= top - reach && y <= bottom + reach
    const vertical = (Math.abs(x - left) <= reach || Math.abs(x - right) <= reach) && nearY
    const horizontal = (Math.abs(y - top) <= reach || Math.abs(y - bottom) <= reach) && nearX
    return vertical || horizontal
  }
  const rx = Math.max(1, (right - left) / 2)
  const ry = Math.max(1, (bottom - top) / 2)
  const nx = (x - (left + right) / 2) / rx
  const ny = (y - (top + bottom) / 2) / ry
  return Math.abs(Math.hypot(nx, ny) - 1) <= reach / Math.min(rx, ry)
}
