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

// Flat gavel, side on: the head is a lime block, three slices that agree and one amber slice standing up; the handle drops from its middle.
function gavel(mono = false) {
  const f = (hex, o = 1) => (mono ? `fill="currentColor"${o < 1 ? ` fill-opacity="${o}"` : ''}` : `fill="${hex}"`)
  const y0 = 30, h = 34, sw = 8, g = 5, block = 44
  const x0 = (120 - (block + 4 * (sw + g))) / 2
  const parts = [`<rect x="${x0}" y="${y0}" width="${block}" height="${h}" rx="7" ${f('#C8FF4D')}/>`]
  ;[['#3FE08A', 0.8], ['#1FC29E', 0.62], ['#11A8A0', 0.45]].forEach(([hex, o], i) => parts.push(`<rect x="${x0 + block + g + i * (sw + g)}" y="${y0}" width="${sw}" height="${h}" rx="3" ${f(hex, o)}/>`))
  parts.push(`<rect x="${x0 + block + g + 3 * (sw + g)}" y="${y0 - 9}" width="${sw}" height="${h}" rx="3" ${f('#FFB547', 0.3)}/>`)
  // The handle, centred under the head block.
  parts.push(`<rect x="${x0 + block / 2 - 5}" y="${y0 + h + 4}" width="10" height="${96 - (y0 + h + 4)}" rx="5" ${f('#C8FF4D')}/>`)
  return parts.join('')
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
