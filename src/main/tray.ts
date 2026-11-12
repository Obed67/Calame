import { existsSync } from 'fs'
import { app, Menu, Tray, nativeImage } from 'electron'
import { join } from 'path'
import type { AppMode } from '../shared/types'

export interface TrayActions {
  mode: AppMode
  visible: boolean
  onToggleVisible: () => void
  onToggleMode: () => void
  onClear: () => void
  onSettings: () => void
  onQuit: () => void
}

let tray: Tray | null = null

function iconImage() {
  const candidates = [
    join(process.resourcesPath, 'tray.png'),
    join(app.getAppPath(), 'build', 'tray.png'),
    join(process.cwd(), 'build', 'tray.png')
  ]
  const file = candidates.find((candidate) => existsSync(candidate))
  const image = file ? nativeImage.createFromPath(file) : nativeImage.createEmpty()
  if (image.isEmpty()) {
    return nativeImage.createFromDataURL(
      'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAACAAAAAgCAYAAABzenr0AAAANElEQVR4nO3OMQEAIAzAsP7/0h4l0QGcxTgHcBbgLMBZgLMAZwHOApwFOAtwFuAs4L4BfwYd7S1k1n0AAAAASUVORK5CYII='
    )
  }
  return image.resize({ width: 16, height: 16 })
}

export function createTray(actions: TrayActions): Tray {
  if (tray && !tray.isDestroyed()) tray.destroy()
  tray = new Tray(iconImage())
  tray.setToolTip('Calame — annotation d’écran')
  updateTray(actions)
  tray.on('click', actions.onToggleMode)
  return tray
}

export function updateTray(actions: TrayActions): void {
  if (!tray || tray.isDestroyed()) return
  const menu = Menu.buildFromTemplate([
    {
      label: actions.visible ? 'Masquer les annotations' : 'Afficher les annotations',
      click: actions.onToggleVisible
    },
    {
      label: actions.mode === 'draw' ? 'Passer en mode souris' : 'Passer en mode dessin',
      click: actions.onToggleMode
    },
    { type: 'separator' },
    { label: 'Tout effacer', click: actions.onClear },
    { label: 'Réglages', click: actions.onSettings },
    { type: 'separator' },
    { label: 'Quitter', click: actions.onQuit }
  ])
  tray.setContextMenu(menu)
}

export function destroyTray(): void {
  if (tray && !tray.isDestroyed()) tray.destroy()
  tray = null
}
