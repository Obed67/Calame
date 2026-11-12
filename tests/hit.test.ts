import { hits } from '../src/shared/hit.ts'
import type { Item } from '../src/shared/items.ts'
import assert from 'node:assert/strict'
import { test } from 'node:test'

const line: Item = {
  kind: 'shape',
  id: 1,
  tool: 'line',
  color: '#000000',
  width: 2,
  a: { x: 0, y: 0, p: 0 },
  b: { x: 100, y: 0, p: 0 }
}

test('une ligne est touchée près de son segment', () => {
  assert.equal(hits(line, 40, 3, 4), true)
  assert.equal(hits(line, 40, 30, 4), false)
})

test('un rectangle est touché sur son contour', () => {
  const rect: Item = {
    kind: 'shape',
    id: 2,
    tool: 'rect',
    color: '#000000',
    width: 2,
    a: { x: 10, y: 10, p: 0 },
    b: { x: 80, y: 50, p: 0 }
  }
  assert.equal(hits(rect, 10, 30, 4), true)
  assert.equal(hits(rect, 8, 30, 0), true)
  assert.equal(hits(rect, 40, 30, 4), false)
  assert.equal(hits(rect, 6, 30, 0), false)
})

const stroke = (tool: 'pen' | 'fade' | 'highlighter', id: number): Item => ({
  kind: 'ink',
  id,
  tool,
  color: '#000000',
  width: 10,
  points: [
    { x: 0, y: 0, p: 0.5 },
    { x: 100, y: 0, p: 0.5 }
  ],
  born: 0,
  stylus: false
})

test('le stylo et le fade sont touchés sur toute leur épaisseur', () => {
  for (const item of [stroke('pen', 3), stroke('fade', 4)]) {
    assert.equal(hits(item, 50, 9, 0), true)
    assert.equal(hits(item, 50, 11, 0), false)
  }
})

test('le surligneur couvre son diamètre visible', () => {
  const marker = stroke('highlighter', 5)
  assert.equal(hits(marker, 50, 27, 0), true)
  assert.equal(hits(marker, 50, 29, 0), false)
})
