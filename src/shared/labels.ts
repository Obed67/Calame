import type { ShortcutMap, ToolId } from './types'

export const toolLabels: Record<ToolId, string> = {
  pen: 'Stylo',
  highlighter: 'Surligneur',
  line: 'Ligne',
  arrow: 'Flèche',
  rect: 'Rectangle',
  ellipse: 'Ellipse',
  text: 'Texte',
  eraser: 'Gomme',
  laser: 'Pointeur laser',
  fade: 'Encre éphémère',
  spotlight: 'Projecteur',
  magnifier: 'Loupe'
}

export const shortcutLabels: Record<keyof ShortcutMap, string> = {
  toggleDraw: 'Mode dessin',
  clear: 'Tout effacer',
  undo: 'Annuler',
  redo: 'Rétablir',
  laser: 'Pointeur laser',
  capture: 'Capture',
  quit: 'Quitter',
  mouse: 'Mode souris'
}

export function prettyShortcut(accelerator: string): string {
  return accelerator.replaceAll('CommandOrControl', 'Ctrl').replaceAll('Control', 'Ctrl').replaceAll('Escape', 'Échap')
}
