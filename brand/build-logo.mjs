// npm run logo → logo/*.svg. The mark is built from isometric geometry, the wordmark from Geist Bold's outlines.
import { readFileSync, writeFileSync, mkdirSync } from 'node:fs'
import opentype from 'opentype.js'

const out = (f, s) => writeFileSync(new URL(`./logo/${f}`, import.meta.url), s.trim() + '\n')
mkdirSync(new URL('./logo/', import.meta.url), { recursive: true })
const r = (n) => Math.round(n * 100) / 100
const pts = (a) => a.map(([x, y]) => `${r(x)},${r(y)}`).join(' ')

/* ── The gavel ───────────────────────────────────────────────────────────────
   An isometric gavel head cut into slices, like ballots stacked on a spike.
   The front block and three slices agree; the last slice stands up in amber: the dissent. */
const c = Math.cos(Math.PI / 6)
const s = 0.5
// Screen vectors (y down): X runs down-right, Y down-left, Z up.
const project = ([x, y, z]) => [x * c - y * c, x * s + y * s - z]

const W = 2 // head width (x)
const H = 2 // head height (z)
const GAP = 0.13
// [length along y, colour, lift]; listed back (up-right) to front (down-left).
const SLICES = [
  [0.56, '#FFB547', 0.34],
  [0.56, '#11A8A0', 0],
  [0.56, '#1FC29E', 0],
  [0.56, '#3FE08A', 0],
  [1.55, '#C8FF4D', 0],
]
const HANDLE = { x0: 0.7, x1: 1.3, z0: 0.22, z1: 0.82, len: 1.25 }

const shade = (hex, k) => {
  const n = parseInt(hex.slice(1), 16)
  const ch = (v) => Math.max(0, Math.min(255, Math.round(v * k)))
  return `#${[(n >> 16) & 255, (n >> 8) & 255, n & 255].map((v) => ch(v).toString(16).padStart(2, '0')).join('')}`
}

// A box's three visible faces: right (x = x1), top (z = z1), front (y = y1).
function box([x0, x1], [y0, y1], [z0, z1], color, mono) {
  const P = (x, y, z) => project([x, y, z])
  const f = (k, o) => (mono ? `fill="currentColor" fill-opacity="${o}"` : `fill="${shade(color, k)}"`)
  return [
    `<polygon points="${pts([P(x1, y0, z0), P(x1, y1, z0), P(x1, y1, z1), P(x1, y0, z1)])}" ${f(0.72, 0.55)}/>`,
    `<polygon points="${pts([P(x0, y0, z1), P(x1, y0, z1), P(x1, y1, z1), P(x0, y1, z1)])}" ${f(1.12, 1)}/>`,
    `<polygon points="${pts([P(x0, y1, z0), P(x1, y1, z0), P(x1, y1, z1), P(x0, y1, z1)])}" ${f(0.84, 0.8)}/>`,
  ].join('')
}

function gavel(mono = false) {
  const parts = []
  const corners = []
  let y = 0
  for (const [len, color, lift] of SLICES) {
    parts.push(box([0, W], [y, y + len], [lift, H + lift], color, mono))
    for (const x of [0, W]) for (const yy of [y, y + len]) for (const z of [lift, H + lift]) corners.push(project([x, yy, z]))
    y += len + GAP
  }
  const front = y - GAP
  parts.push(box([HANDLE.x0, HANDLE.x1], [front, front + HANDLE.len], [HANDLE.z0, HANDLE.z1], '#C8FF4D', mono))
  for (const x of [HANDLE.x0, HANDLE.x1]) for (const z of [HANDLE.z0, HANDLE.z1]) corners.push(project([x, front + HANDLE.len, z]))
  // Fit everything into a 120 box with even margins.
  const xs = corners.map((p) => p[0])
  const ys = corners.map((p) => p[1])
  const [minX, maxX, minY, maxY] = [Math.min(...xs), Math.max(...xs), Math.min(...ys), Math.max(...ys)]
  const k = 104 / Math.max(maxX - minX, maxY - minY)
  const tx = (120 - (maxX - minX) * k) / 2 - minX * k
  const ty = (120 - (maxY - minY) * k) / 2 - minY * k
  return `<g transform="translate(${r(tx)} ${r(ty)}) scale(${r(k)})">${parts.join('')}</g>`
}

const markSvg = (body, extra = '') => `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 120 120"${extra}>${body}</svg>`
out('wildjury-mark.svg', markSvg(gavel(), ' role="img" aria-label="Wildjury"'))
out('wildjury-mark-mono.svg', markSvg(gavel(true), ' role="img" aria-label="Wildjury"'))
out('wildjury-mark-tile.svg', markSvg(`<rect width="120" height="120" rx="27" fill="#070908"/><g transform="translate(16 16) scale(.733)">${gavel()}</g>`))

/* ── The wordmark ────────────────────────────────────────────────────────────
   "wildjury" in Geist Bold, tracked tight, outlined so it never depends on a font. */
const font = opentype.parse(readFileSync(new URL('./source/fonts/Geist-Bold.ttf', import.meta.url)).buffer)
const SIZE = 100
const TRACK = -0.055 * SIZE
let x = 0
const d = []
for (const ch of 'wildjury') {
  const g = font.charToGlyph(ch)
  d.push(g.getPath(x, 0, SIZE).toPathData(2))
  x += g.advanceWidth * (SIZE / font.unitsPerEm) + TRACK
}
const width = x - TRACK
const asc = (font.ascender / font.unitsPerEm) * SIZE
const desc = (-font.descender / font.unitsPerEm) * SIZE
const top = asc * 0.82 // trim the empty ascender headroom
const vb = `0 ${r(-top)} ${r(width)} ${r(top + desc)}`
const path = (fill) => `<path d="${d.join(' ')}" fill="${fill}"/>`
const wordSvg = (fill) => `<svg xmlns="http://www.w3.org/2000/svg" viewBox="${vb}" role="img" aria-label="wildjury">${path(fill)}</svg>`

out('wildjury-wordmark.svg', wordSvg('#C8FF4D'))
out('wildjury-wordmark-paper.svg', wordSvg('#E9F2EA'))
out('wildjury-wordmark-ink.svg', wordSvg('#070908'))
out('wildjury-wordmark-mono.svg', wordSvg('currentColor'))

// Lockup: the mark a touch taller than the type, one bowl of air between.
const markH = (top + desc) * 1.02
const gap = SIZE * 0.26
const lock = (fill) =>
  `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 ${r(-top)} ${r(markH + gap + width)} ${r(top + desc)}" role="img" aria-label="Wildjury">
  <g transform="translate(0 ${r(-top - (markH - top - desc) / 2)}) scale(${r(markH / 120)})">${gavel()}</g>
  <g transform="translate(${r(markH + gap)} 0)">${path(fill)}</g></svg>`
out('wildjury-lockup.svg', lock('#C8FF4D'))
out('wildjury-lockup-paper.svg', lock('#E9F2EA'))
out('wildjury-lockup-ink.svg', lock('#070908'))
console.log('logo written')
