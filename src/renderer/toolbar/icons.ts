import type { ToolId } from '../../shared/types'

const stroke = 'fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round"'

export const toolIcons: Record<ToolId, string> = {
  pen: `<path ${stroke} d="M14.5 4.5l5 5M4 20l1.2-4.2L16.2 4.8a1.6 1.6 0 0 1 2.3 0l.7.7a1.6 1.6 0 0 1 0 2.3L7.2 19.8 4 20z"/>`,
  highlighter: `<path ${stroke} d="M5 16l8-8 4 4-8 8H5v-4zM13 8l3-3 4 4-3 3"/>`,
  line: `<path ${stroke} d="M5 19L19 5"/>`,
  arrow: `<path ${stroke} d="M5 19L19 5M19 5v6M19 5h-6"/>`,
  rect: `<rect ${stroke} x="5" y="6" width="14" height="12" rx="1.5"/>`,
  ellipse: `<ellipse ${stroke} cx="12" cy="12" rx="7.5" ry="5.5"/>`,
  text: `<path ${stroke} d="M6 6h12M12 6v13M9 19h6"/>`,
  eraser: `<path ${stroke} d="M4.5 14.5l7-7a2 2 0 0 1 2.8 0l3.2 3.2a2 2 0 0 1 0 2.8l-5.2 5.2H8.2zM8 18.5h11"/>`,
  laser: `<path ${stroke} d="M12 8.5a3.5 3.5 0 1 0 0 7 3.5 3.5 0 0 0 0-7zM12 3.5v2M12 18.5v2M3.5 12h2M18.5 12h2"/>`,
  fade: `<path ${stroke} d="M4 16c2-6 4-6 6 0s4 6 6 0 4-6 4 0"/><path ${stroke} d="M18 7.5h.01M20.5 10h.01"/>`,
  spotlight: `<circle ${stroke} cx="12" cy="12" r="3.2"/><circle ${stroke} cx="12" cy="12" r="7.2"/>`,
  magnifier: `<circle ${stroke} cx="11" cy="11" r="5.5"/><path ${stroke} d="M15.2 15.2L20 20"/>`
}

export function icon(name: ToolId): string {
  return `<svg viewBox="0 0 24 24" aria-hidden="true">${toolIcons[name]}</svg>`
}

export const actionIcons = {
  undo: `<svg viewBox="0 0 24 24" aria-hidden="true"><path ${stroke} d="M8 8H5V5M5.2 8.2A7.5 7.5 0 1 1 6 16"/></svg>`,
  redo: `<svg viewBox="0 0 24 24" aria-hidden="true"><path ${stroke} d="M16 8h3V5M18.8 8.2A7.5 7.5 0 1 0 18 16"/></svg>`,
  clear: `<svg viewBox="0 0 24 24" aria-hidden="true"><path ${stroke} d="M5 7h14M9 7V5h6v2M8 7l.8 12h6.4L16 7"/></svg>`,
  capture: `<svg viewBox="0 0 24 24" aria-hidden="true"><path ${stroke} d="M8 7l1.2-2h5.6L16 7h3v11H5V7h3z"/><circle ${stroke} cx="12" cy="12.5" r="3"/></svg>`,
  white: `<svg viewBox="0 0 24 24" aria-hidden="true"><rect ${stroke} x="5" y="5" width="14" height="14" rx="2" fill="currentColor" fill-opacity="0.15"/></svg>`,
  black: `<svg viewBox="0 0 24 24" aria-hidden="true"><rect x="5" y="5" width="14" height="14" rx="2" fill="currentColor"/></svg>`,
  screen: `<svg viewBox="0 0 24 24" aria-hidden="true"><rect ${stroke} x="3.5" y="5" width="17" height="11" rx="1.5"/><path ${stroke} d="M8 19.5h8M12 16v3.5"/></svg>`,
  gear: `<svg viewBox="0 0 24 24" aria-hidden="true"><circle ${stroke} cx="12" cy="12" r="3"/><path ${stroke} d="M12 4.5v2M12 17.5v2M4.5 12h2M17.5 12h2M6.4 6.4l1.4 1.4M16.2 16.2l1.4 1.4M17.6 6.4l-1.4 1.4M7.8 16.2l-1.4 1.4"/></svg>`,
  fold: `<svg viewBox="0 0 24 24" aria-hidden="true"><path ${stroke} d="M7 10l5 5 5-5"/></svg>`
}
