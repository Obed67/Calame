export type AppMode = 'mouse' | 'draw'

export type ToolId =
  | 'pen'
  | 'highlighter'
  | 'line'
  | 'arrow'
  | 'rect'
  | 'ellipse'
  | 'text'
  | 'eraser'
  | 'laser'
  | 'fade'
  | 'spotlight'
  | 'magnifier'

export type WidthId = 'thin' | 'medium' | 'thick'

export type BoardMode = 'none' | 'white' | 'black'

export type InkTool = 'pen' | 'highlighter' | 'fade'

export type ShapeTool = 'line' | 'arrow' | 'rect' | 'ellipse'

export interface Point {
  x: number
  y: number
  /** Pression 0..1. La souris vaut 0,5. */
  p: number
}

export interface ShortcutMap {
  toggleDraw: string
  clear: string
  undo: string
  redo: string
  laser: string
  capture: string
  quit: string
  mouse: string
}

export interface Settings {
  tool: ToolId
  color: string
  customColor: string
  palette: string[]
  width: WidthId
  shortcuts: ShortcutMap
  fadeMs: number
  spotlightRadius: number
  magnifierZoom: number
  board: BoardMode
  displayId: number | null
  toolbarCollapsed: boolean
  toolbarX: number | null
  toolbarY: number | null
}

export interface DisplayInfo {
  id: number
  label: string
  bounds: { x: number; y: number; width: number; height: number }
  scaleFactor: number
  primary: boolean
}

export interface Bootstrap {
  mode: AppMode
  settings: Settings
  displays: DisplayInfo[]
  activeDisplayId: number
}

export interface ToolState {
  tool: ToolId
  color: string
  width: WidthId
  board: BoardMode
}
