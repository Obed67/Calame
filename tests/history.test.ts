import { Board } from '../src/shared/history.ts'
import assert from 'node:assert/strict'
import { test } from 'node:test'

const sample = [
  { x: 0, y: 0, p: 0.5 },
  { x: 10, y: 4, p: 0.7 },
  { x: 20, y: 1, p: 0.4 }
]

test('un trait engagé peut être annulé puis rétabli', () => {
  const board = new Board()
  const stroke = board.commit({ tool: 'pen', color: '#E15A3A', width: 6, points: sample })
  assert.ok(stroke)
  assert.equal(board.items.length, 1)
  board.undo()
  assert.equal(board.items.length, 0)
  assert.equal(board.canRedo, true)
  board.redo()
  assert.equal(board.items.length, 1)
  assert.equal(board.items[0].kind === 'ink' && board.items[0].color, '#E15A3A')
})

test('annuler retire seulement le dernier trait', () => {
  const board = new Board()
  board.commit({ tool: 'pen', color: '#111111', width: 3, points: sample })
  board.commit({ tool: 'pen', color: '#222222', width: 3, points: sample })
  board.undo()
  assert.equal(board.items.length, 1)
  assert.equal(board.items[0].kind === 'ink' && board.items[0].color, '#111111')
})

test('tout effacer se rétablit en une étape', () => {
  const board = new Board()
  board.commit({ tool: 'pen', color: '#111111', width: 3, points: sample })
  board.commitShape({
    tool: 'rect',
    color: '#222222',
    width: 3,
    a: { x: 0, y: 0, p: 0 },
    b: { x: 30, y: 20, p: 0 }
  })
  board.clear()
  assert.equal(board.items.length, 0)
  board.undo()
  assert.equal(board.items.length, 2)
})

test('un trait vide est ignoré', () => {
  const board = new Board()
  assert.equal(board.commit({ tool: 'pen', color: '#111111', width: 3, points: [] }), null)
  assert.equal(board.canUndo, false)
})

test("les points sont copiés à l'engagement", () => {
  const board = new Board()
  const points = [{ x: 1, y: 2, p: 0.5 }]
  board.commit({ tool: 'pen', color: '#111111', width: 3, points })
  points[0].x = 99
  const item = board.items[0]
  assert.equal(item.kind === 'ink' && item.points[0].x, 1)
})

test("l'encre éphémère disparaît sans commande d'annulation", () => {
  const board = new Board()
  board.commit({ tool: 'fade', color: '#111111', width: 3, points: sample, born: 1_000, fadeMs: 500 })
  board.commit({ tool: 'pen', color: '#222222', width: 3, points: sample, born: 1_000 })
  assert.equal(board.expire(1_600), true)
  assert.equal(board.items.length, 1)
  assert.equal(board.items[0].kind === 'ink' && board.items[0].tool, 'pen')
  board.undo()
  assert.equal(board.items.length, 0)
})

test('la gomme retire le trait touché et l’annulation le remet en place', () => {
  const board = new Board()
  board.commit({
    tool: 'pen',
    color: '#111111',
    width: 4,
    points: [
      { x: 0, y: 0, p: 0.5 },
      { x: 20, y: 0, p: 0.5 }
    ]
  })
  board.commitShape({
    tool: 'ellipse',
    color: '#333333',
    width: 2,
    a: { x: 200, y: 200, p: 0 },
    b: { x: 260, y: 240, p: 0 }
  })
  board.beginErase()
  assert.equal(board.eraseAt(10, 1, 8), true)
  board.endErase()
  assert.equal(board.items.length, 1)
  assert.equal(board.items[0].kind, 'shape')
  board.undo()
  assert.equal(board.items.length, 2)
  assert.equal(board.items[0].kind, 'ink')
})

test('un trait de quatre points coupé au milieu laisse deux bouts', () => {
  const board = new Board()
  board.commit({
    tool: 'pen',
    color: '#111111',
    width: 2,
    points: [
      { x: 0, y: 0, p: 0.5 },
      { x: 10, y: 0, p: 0.5 },
      { x: 40, y: 0, p: 0.5 },
      { x: 50, y: 0, p: 0.5 }
    ]
  })
  board.commitShape({
    tool: 'rect',
    color: '#333333',
    width: 2,
    a: { x: 200, y: 200, p: 0 },
    b: { x: 260, y: 240, p: 0 }
  })
  board.beginErase()
  assert.equal(board.eraseAt(25, 0, 6), true)
  board.endErase()
  assert.equal(board.items.length, 3)
  const [left, right, shape] = board.items
  assert.equal(left.kind, 'ink')
  assert.equal(right.kind, 'ink')
  assert.equal(shape.kind, 'shape')
  if (left.kind === 'ink' && right.kind === 'ink') {
    assert.deepEqual(
      left.points.map((point) => point.x),
      [0, 10]
    )
    assert.deepEqual(
      right.points.map((point) => point.x),
      [40, 50]
    )
  }
  board.undo()
  assert.equal(board.items.length, 2)
  const restored = board.items[0]
  assert.equal(restored.kind, 'ink')
  if (restored.kind === 'ink') {
    assert.deepEqual(
      restored.points.map((point) => point.x),
      [0, 10, 40, 50]
    )
  }
  assert.equal(board.items[1].kind, 'shape')
  board.redo()
  assert.equal(board.items.length, 3)
  assert.equal(board.items[2].kind, 'shape')
})

test('frotter plus loin dans le même geste reste une seule annulation', () => {
  const board = new Board()
  board.commit({
    tool: 'pen',
    color: '#111111',
    width: 2,
    points: [
      { x: 0, y: 0, p: 0.5 },
      { x: 10, y: 0, p: 0.5 },
      { x: 40, y: 0, p: 0.5 },
      { x: 50, y: 0, p: 0.5 }
    ]
  })
  board.beginErase()
  assert.equal(board.eraseAt(25, 0, 6), true)
  assert.equal(board.eraseAt(0, 0, 6), true)
  board.endErase()
  assert.equal(board.items.length, 1)
  const kept = board.items[0]
  assert.equal(kept.kind === 'ink' && kept.points.map((point) => point.x).join(','), '40,50')
  board.undo()
  assert.equal(board.items.length, 1)
  const restored = board.items[0]
  assert.equal(restored.kind === 'ink' && restored.points.length, 4)
  board.undo()
  assert.equal(board.items.length, 0)
})

test('un texte mémorise sa largeur et son recadrage s’annule', () => {
  const board = new Board()
  assert.equal(board.commitText({ color: '#111111', size: 22, x: 4, y: 6, text: '   ' }), null)
  const text = board.commitText({ color: '#111111', size: 22, x: 4, y: 6, text: 'Bonjour', boxWidth: 40 })
  assert.ok(text)
  assert.equal(text.boxWidth, 80)
  assert.equal(board.update(text, { x: 18, y: 20, size: 200, boxWidth: 140 }), true)
  assert.equal(text.x, 18)
  assert.equal(text.y, 20)
  assert.equal(text.size, 96)
  assert.equal(text.boxWidth, 140)
  board.undo()
  assert.equal(text.x, 4)
  assert.equal(text.size, 22)
  assert.equal(text.boxWidth, 80)
  board.redo()
  assert.equal(text.size, 96)
  assert.equal(text.boxWidth, 140)
  assert.equal(board.update(text, { text: '  ' }), true)
  assert.equal(
    board.items.some((item) => item.kind === 'text'),
    false
  )
  board.undo()
  const restored = board.items.find((item) => item.kind === 'text')
  assert.equal(restored?.kind === 'text' && restored.text, 'Bonjour')
})

test('un rectangle disparaît quand la gomme traverse son contour', () => {
  const board = new Board()
  board.commitShape({
    tool: 'rect',
    color: '#333333',
    width: 4,
    a: { x: 0, y: 0, p: 0 },
    b: { x: 100, y: 60, p: 0 }
  })
  board.beginErase()
  assert.equal(board.eraseAt(50, 30, 6), false)
  assert.equal(board.eraseAt(-8, 30, 6), true)
  board.endErase()
  assert.equal(board.items.length, 0)
  board.undo()
  assert.equal(board.items.length, 1)
  assert.equal(board.items[0].kind, 'shape')
})
