import type { InkTool, Point, ShapeTool } from './types'

export interface InkItem {
  kind: 'ink'
  id: number
  tool: InkTool
  color: string
  width: number
  points: Point[]
  born: number
  fadeMs?: number
  stylus: boolean
}

export interface ShapeItem {
  kind: 'shape'
  id: number
  tool: ShapeTool
  color: string
  width: number
  a: Point
  b: Point
}

export interface TextItem {
  kind: 'text'
  id: number
  color: string
  size: number
  x: number
  y: number
  text: string
  /** Largeur du cadre en pixels CSS. Le texte se répartit dans cette largeur. */
  boxWidth: number
}

export type Item = InkItem | ShapeItem | TextItem
