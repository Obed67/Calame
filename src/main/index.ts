import { app, BrowserWindow, desktopCapturer, dialog, ipcMain, screen, session, type Display } from 'electron'
import { IPC } from '../shared/ipc'
import type { AppMode, DisplayInfo, Settings, ToolState } from '../shared/types'
import { bindShortcuts, holdDrawingKeys, releaseShortcuts, shortcutRegistered, syncDrawingShortcuts } from './shortcuts'
import { defaultSettings } from '../shared/defaults'
import { activeDisplay, loadSettings, normalizeSettings, saveSettings } from './store'
import { createTray, destroyTray, updateTray } from './tray'
import { applyPassthrough, displayLabel, fitOverlay, harden, loadPage, preloadPath } from './window'

const smoke = process.env.ANNOT_SMOKE === '1'

let overlay: BrowserWindow | null = null
let toolbar: BrowserWindow | null = null
let settingsWindow: BrowserWindow | null = null
let settingsReady = false
let mode: AppMode = 'mouse'
let visible = true
let settings: Settings = structuredClone(defaultSettings)
let quitting = false

function toolState(): ToolState {
  return {
    tool: settings.tool,
    color: settings.color,
    width: settings.width,
    board: settings.board
  }
}

function describeDisplay(display: Display, index: number): DisplayInfo {
  return {
    id: display.id,
    label: displayLabel(display, index),
    bounds: display.bounds,
    scaleFactor: display.scaleFactor,
    primary: display.id === screen.getPrimaryDisplay().id
  }
}

function displays(): DisplayInfo[] {
  return screen.getAllDisplays().map(describeDisplay)
}

function broadcast(channel: string, payload?: unknown): void {
  for (const win of BrowserWindow.getAllWindows()) {
    if (!win.isDestroyed()) win.webContents.send(channel, payload)
  }
}

function liftChrome(): void {
  if (toolbar && !toolbar.isDestroyed() && toolbar.isVisible()) {
    toolbar.setAlwaysOnTop(true, 'screen-saver')
    toolbar.moveTop()
  }
  if (settingsWindow && !settingsWindow.isDestroyed() && settingsWindow.isVisible()) {
    settingsWindow.setAlwaysOnTop(true, 'screen-saver')
    settingsWindow.moveTop()
  }
}

function toolbarSize(): { width: number; height: number } {
  return settings.toolbarCollapsed ? { width: 78, height: 72 } : { width: 640, height: 104 }
}

function toolbarOrigin(display: Display, width: number, height: number): { x: number; y: number } {
  if (settings.toolbarX !== null && settings.toolbarY !== null) {
    return { x: Math.round(settings.toolbarX), y: Math.round(settings.toolbarY) }
  }
  return {
    x: Math.round(display.bounds.x + (display.bounds.width - width) / 2),
    y: Math.round(display.bounds.y + display.bounds.height - height - 28)
  }
}
function refreshTray(): void {
  updateTray({
    mode,
    visible,
    onToggleVisible: toggleVisible,
    onToggleMode: toggleMode,
    onClear: () => broadcast(IPC.clear),
    onSettings: () => openSettings(),
    onQuit: () => app.quit()
  })
}

function applyMode(next: AppMode): void {
  mode = next
  if (overlay && visible) applyPassthrough(overlay, mode)
  syncDrawingShortcuts(mode === 'draw' && visible)
  broadcast(IPC.modeChanged, mode)
  refreshTray()
  liftChrome()
}

function toggleMode(): void {
  if (!visible) showOverlay()
  applyMode(mode === 'draw' ? 'mouse' : 'draw')
}

function showOverlay(): void {
  if (!overlay) return
  visible = true
  const display = activeDisplay(settings)
  fitOverlay(overlay, display)
  overlay.showInactive()
  applyPassthrough(overlay, mode)
  if (toolbar && !toolbar.isDestroyed()) {
    toolbar.showInactive()
    liftChrome()
  }
  broadcast(IPC.visibilityChanged, true)
  refreshTray()
}

function hideOverlay(): void {
  if (!overlay) return
  visible = false
  if (mode === 'draw') applyMode('mouse')
  overlay.hide()
  if (toolbar && !toolbar.isDestroyed()) toolbar.hide()
  broadcast(IPC.visibilityChanged, false)
  refreshTray()
}

function toggleVisible(): void {
  if (visible) hideOverlay()
  else showOverlay()
}

async function openSettings(): Promise<void> {
  if (smoke) return
  if (!settingsWindow) {
    settingsWindow = new BrowserWindow({
      width: 440,
      height: 680,
      minWidth: 380,
      minHeight: 480,
      frame: false,
      show: false,
      backgroundColor: '#F3EEE4',
      autoHideMenuBar: true,
      title: 'Réglages — Calame',
      webPreferences: secureWeb()
    })
    harden(settingsWindow)
    settingsWindow.on('close', (event) => {
      if (quitting) return
      event.preventDefault()
      settingsWindow?.hide()
    })
  }
  if (!settingsReady && settingsWindow) {
    await loadPage(settingsWindow, 'settings/index.html')
    settingsReady = true
  }
  settingsWindow?.setAlwaysOnTop(true, 'screen-saver')
  settingsWindow?.show()
  settingsWindow?.focus()
  liftChrome()
}

function createToolbar(): BrowserWindow {
  const display = activeDisplay(settings)
  const size = toolbarSize()
  const origin = toolbarOrigin(display, size.width, size.height)
  const win = new BrowserWindow({
    x: origin.x,
    y: origin.y,
    width: size.width,
    height: size.height,
    frame: false,
    transparent: true,
    alwaysOnTop: true,
    skipTaskbar: true,
    resizable: false,
    movable: true,
    minimizable: false,
    maximizable: false,
    closable: true,
    hasShadow: false,
    thickFrame: false,
    roundedCorners: false,
    show: false,
    backgroundColor: '#00000000',
    parent: overlay ?? undefined,
    title: 'Calame',
    webPreferences: secureWeb()
  })
  win.setAlwaysOnTop(true, 'screen-saver')
  harden(win)
  win.on('close', (event) => {
    if (quitting) return
    event.preventDefault()
  })
  let moveTimer: ReturnType<typeof setTimeout> | null = null
  win.on('moved', () => {
    if (moveTimer) clearTimeout(moveTimer)
    moveTimer = setTimeout(() => {
      const bounds = win.getBounds()
      settings = { ...settings, toolbarX: bounds.x, toolbarY: bounds.y }
      saveSettings(settings)
    }, 200)
  })
  return win
}

function createOverlay(): BrowserWindow {
  const display = activeDisplay(settings)
  const win = new BrowserWindow({
    x: display.bounds.x,
    y: display.bounds.y,
    width: display.bounds.width,
    height: display.bounds.height,
    frame: false,
    transparent: true,
    alwaysOnTop: true,
    skipTaskbar: true,
    resizable: false,
    movable: false,
    minimizable: false,
    maximizable: false,
    hasShadow: false,
    thickFrame: false,
    roundedCorners: false,
    focusable: false,
    show: false,
    backgroundColor: '#00000000',
    title: 'Calame',
    webPreferences: secureWeb()
  })
  win.setAlwaysOnTop(true, 'screen-saver')
  win.setVisibleOnAllWorkspaces(true, { visibleOnFullScreen: true })
  harden(win)
  win.on('close', (event) => {
    if (quitting) return
    event.preventDefault()
    hideOverlay()
  })
  return win
}

function secureWeb() {
  return {
    preload: preloadPath(),
    contextIsolation: true as const,
    nodeIntegration: false as const,
    sandbox: true as const,
    backgroundThrottling: false,
    spellcheck: false
  }
}

function registerIpc(): void {
  ipcMain.handle(IPC.bootstrap, () => ({
    mode,
    settings,
    displays: displays(),
    activeDisplayId: activeDisplay(settings).id
  }))

  ipcMain.on(IPC.modeSet, (_event, next: AppMode) => {
    if (next !== 'mouse' && next !== 'draw') return
    if (!visible && next === 'draw') showOverlay()
    applyMode(next)
  })

  ipcMain.on(IPC.toolSet, (_event, patch: Partial<ToolState>) => {
    settings = normalizeSettings({ ...settings, ...patch })
    saveSettings(settings)
    broadcast(IPC.toolChanged, toolState())
  })

  ipcMain.handle(IPC.settingsSet, (_event, patch: Partial<Settings>) => {
    const previous = settings.shortcuts
    settings = normalizeSettings({ ...settings, ...patch })
    saveSettings(settings)
    let failed: string[] = []
    if (JSON.stringify(previous) !== JSON.stringify(settings.shortcuts)) {
      failed = bindShortcuts(settings.shortcuts, shortcutHandlers)
      syncDrawingShortcuts(mode === 'draw' && visible)
    }
    broadcast(IPC.settingsChanged, settings)
    broadcast(IPC.toolChanged, toolState())
    return { settings, failed }
  })

  ipcMain.on(IPC.displaySet, (_event, id: number) => {
    if (typeof id !== 'number') return
    const display = screen.getAllDisplays().find((item) => item.id === id)
    if (!display || !overlay) return
    settings = { ...settings, displayId: id }
    saveSettings(settings)
    fitOverlay(overlay, display)
    const index = screen.getAllDisplays().findIndex((item) => item.id === id)
    broadcast(IPC.displayChanged, describeDisplay(display, index))
  })

  ipcMain.handle(IPC.screenImage, () => captureScreen())
  ipcMain.handle(IPC.grabScreen, () => grabScreen())

  ipcMain.on(IPC.undoRequest, () => broadcast(IPC.undo))
  ipcMain.on(IPC.redoRequest, () => broadcast(IPC.redo))
  ipcMain.on(IPC.clearRequest, () => broadcast(IPC.clear))
  ipcMain.on(IPC.captureRequest, () => broadcast(IPC.capture))
  ipcMain.on(IPC.holdShortcuts, (_event, hold: boolean) => holdDrawingKeys(hold === true))
  ipcMain.on(IPC.settingsOpen, () => void openSettings())
  ipcMain.on(IPC.settingsClose, () => settingsWindow?.hide())
  ipcMain.on(IPC.toolbarCollapsed, (_event, collapsed: boolean) => {
    settings = { ...settings, toolbarCollapsed: collapsed === true }
    saveSettings(settings)
  })
  ipcMain.on(IPC.toolbarBounds, (_event, payload: { width?: number; height?: number }) => {
    if (!toolbar || !payload) return
    const width = Number(payload.width)
    const height = Number(payload.height)
    if (width < 48 || width > 1400 || height < 48 || height > 240) return
    const bounds = toolbar.getBounds()
    toolbar.setBounds({
      x: bounds.x,
      y: Math.round(bounds.y + bounds.height - height),
      width: Math.round(width),
      height: Math.round(height)
    })
    liftChrome()
  })

  ipcMain.handle(IPC.savePng, async (_event, bytes: Uint8Array) => {
    overlay?.setAlwaysOnTop(false)
    toolbar?.setAlwaysOnTop(false)
    const result = await dialog.showSaveDialog({
      title: 'Enregistrer la capture',
      defaultPath: `calame-${stamp()}.png`,
      filters: [{ name: 'PNG', extensions: ['png'] }]
    })
    overlay?.setAlwaysOnTop(true, 'screen-saver')
    toolbar?.setAlwaysOnTop(true, 'screen-saver')
    liftChrome()
    if (result.canceled || !result.filePath) return { ok: false, canceled: true }
    const { writeFile } = await import('fs/promises')
    await writeFile(result.filePath, Buffer.from(bytes))
    return { ok: true, path: result.filePath }
  })

  ipcMain.on(IPC.magnifierWatch, (_event, active: boolean) => {
    setMagnifierWatch(active === true)
  })

  ipcMain.handle(IPC.magnifierSource, async () => {
    const display = activeDisplay(settings)
    const sources = await desktopCapturer.getSources({ types: ['screen'] })
    const source =
      sources.find((item) => item.display_id === String(display.id)) ?? sources[0]
    if (!source) return null
    return {
      sourceId: source.id,
      width: display.size.width,
      height: display.size.height
    }
  })

  ipcMain.on('app:smoke', (_event, result: { ok: boolean; pixels: number }) => {
    console.log(`SMOKE ${JSON.stringify(result)}`)
    app.exit(result.ok ? 0 : 1)
  })
}

const shortcutHandlers = {
  toggleDraw: () => toggleMode(),
  clear: () => broadcast(IPC.clear),
  undo: () => broadcast(IPC.undo),
  redo: () => broadcast(IPC.redo),
  laser: () => {
    settings = normalizeSettings({ ...settings, tool: settings.tool === 'laser' ? 'pen' : 'laser' })
    saveSettings(settings)
    if (!visible) showOverlay()
    if (mode !== 'draw') applyMode('draw')
    broadcast(IPC.toolChanged, toolState())
  },
  capture: () => broadcast(IPC.capture),
  quit: () => app.quit(),
  mouse: () => {
    if (mode === 'draw') applyMode('mouse')
  }
}

async function captureScreen(maxEdge = 0): Promise<Buffer> {
  const display = activeDisplay(settings)
  let width = Math.max(1, Math.round(display.size.width * display.scaleFactor))
  let height = Math.max(1, Math.round(display.size.height * display.scaleFactor))
  if (maxEdge > 0) {
    const scale = Math.min(1, maxEdge / Math.max(width, height))
    width = Math.max(1, Math.round(width * scale))
    height = Math.max(1, Math.round(height * scale))
  }
  const sources = await desktopCapturer.getSources({
    types: ['screen'],
    thumbnailSize: { width, height }
  })
  const source = sources.find((item) => item.display_id === String(display.id)) ?? sources[0]
  return source ? source.thumbnail.toPNG() : Buffer.alloc(0)
}

let magnifierTimer: ReturnType<typeof setInterval> | null = null
let magnifierBusy = false

function setMagnifierWatch(active: boolean): void {
  if (magnifierTimer) {
    clearInterval(magnifierTimer)
    magnifierTimer = null
  }
  overlay?.setContentProtection(active)
  if (!active) return
  const tick = (): void => {
    if (magnifierBusy || !magnifierTimer) return
    magnifierBusy = true
    void captureScreen(1280)
      .then((png) => {
        if (png.length > 32 && magnifierTimer && overlay && !overlay.isDestroyed()) {
          overlay.webContents.send(IPC.magnifierFrame, png)
        }
      })
      .catch(() => undefined)
      .finally(() => {
        magnifierBusy = false
      })
  }
  magnifierTimer = setInterval(tick, 180)
  tick()
}

async function grabScreen(): Promise<Buffer> {
  const toolbarVisible = !!toolbar && !toolbar.isDestroyed() && toolbar.isVisible()
  overlay?.hide()
  toolbar?.hide()
  await new Promise((resolve) => setTimeout(resolve, 160))
  const png = await captureScreen()
  if (visible && overlay && !overlay.isDestroyed()) {
    overlay.showInactive()
    applyPassthrough(overlay, mode)
    if (toolbarVisible && toolbar && !toolbar.isDestroyed()) toolbar.showInactive()
    liftChrome()
  }
  return png
}

function stamp(): string {
  const now = new Date()
  const pad = (value: number) => String(value).padStart(2, '0')
  return `${now.getFullYear()}${pad(now.getMonth() + 1)}${pad(now.getDate())}-${pad(now.getHours())}${pad(now.getMinutes())}`
}

function watchDisplays(): void {
  const refit = (): void => {
    if (!overlay || !visible) return
    fitOverlay(overlay, activeDisplay(settings))
  }
  screen.on('display-metrics-changed', refit)
  screen.on('display-added', refit)
  screen.on('display-removed', refit)
}

async function boot(): Promise<void> {
  const allowCapture = (permission: string): boolean =>
    permission === 'media' || permission === 'display-capture' || permission === 'fullscreen'
  session.defaultSession.setPermissionCheckHandler((_contents, permission) => allowCapture(permission))
  session.defaultSession.setPermissionRequestHandler((_contents, permission, callback) => {
    callback(allowCapture(permission))
  })
  session.defaultSession.setDisplayMediaRequestHandler(async (_request, callback) => {
    const display = activeDisplay(settings)
    const sources = await desktopCapturer.getSources({ types: ['screen'] })
    const source = sources.find((item) => item.display_id === String(display.id)) ?? sources[0]
    callback(source ? { video: source } : null)
  })
  settings = loadSettings()
  registerIpc()
  bindShortcuts(settings.shortcuts, shortcutHandlers)
  overlay = createOverlay()
  await loadPage(overlay, 'overlay/index.html')
  showOverlay()
  applyMode('mouse')
  if (!smoke) {
    toolbar = createToolbar()
    await loadPage(toolbar, 'toolbar/index.html')
    toolbar.showInactive()
    liftChrome()
    createTray({
      mode,
      visible,
      onToggleVisible: toggleVisible,
      onToggleMode: toggleMode,
      onClear: () => broadcast(IPC.clear),
      onSettings: () => void openSettings(),
      onQuit: () => app.quit()
    })
  }
  watchDisplays()
  console.log(
    `Calame prêt écrans=${screen.getAllDisplays().length} dessus=${overlay.isAlwaysOnTop()} hors-barre=oui raccourci=${shortcutRegistered(settings.shortcuts.toggleDraw)}`
  )
  if (process.env.ANNOT_LOUPE === '1' && overlay) {
    overlay.setContentProtection(true)
    const png = await captureScreen(1280)
    const check = (await overlay.webContents.executeJavaScript(`
      new Promise((resolve) => {
        const start = Date.now()
        const tick = () => {
          if (document.body.dataset.tool) resolve(window.__annotCheck())
          else if (Date.now() - start > 4000) resolve({ ok: false, reason: 'timeout' })
          else setTimeout(tick, 40)
        }
        tick()
      })
    `)) as { ok: boolean }
    overlay.setContentProtection(false)
    console.log(`LOUPE octets=${png.length} outils=${JSON.stringify(check)}`)
    app.exit(png.length > 20000 && check.ok ? 0 : 1)
    return
  }
  if (smoke && overlay) {
    const result = (await overlay.webContents.executeJavaScript(
      'window.__annotSmoke && window.__annotSmoke()'
    )) as { ok: boolean; pixels: number } | undefined
    const policy = overlay.isAlwaysOnTop()
    console.log(`SMOKE ${JSON.stringify(result ?? { ok: false, pixels: 0 })} policy=${policy}`)
    app.exit(result?.ok && policy ? 0 : 1)
  }
}

app.setAppUserModelId('app.calame.desktop')

const locked = app.requestSingleInstanceLock()
if (!locked) {
  app.quit()
} else {
  app.on('second-instance', () => {
    showOverlay()
    toggleMode()
  })
  app.whenReady().then(boot).catch((error: unknown) => {
    console.error(error)
    app.exit(1)
  })
}

app.on('before-quit', () => {
  quitting = true
  setMagnifierWatch(false)
  releaseShortcuts()
  destroyTray()
})

app.on('window-all-closed', () => {
  /* L'application reste dans la zone de notification. */
})

app.on('will-quit', () => {
  releaseShortcuts()
})
