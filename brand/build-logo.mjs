// node build-logo.mjs → logo/*.svg. The mark is one generated stroke, the wordmark Geist Bold's outlines.
import { readFileSync, writeFileSync, mkdirSync } from 'node:fs'
import opentype from 'opentype.js'

const out = (f, s) => writeFileSync(new URL(`./logo/${f}`, import.meta.url), s.trim() + '\n')
mkdirSync(new URL('./logo/', import.meta.url), { recursive: true })
const r = (n) => Math.round(n * 100) / 100
const pts = (a) => a.map(([x, y]) => `${r(x)},${r(y)}`).join(' ')

/* ── The mark ────────────────────────────────────────────────────────────────
   A W drawn in one stroke, like a signature on a verdict: a thin lead-in, a heavy middle, a fast thin exit.
   A Catmull-Rom centreline is widened by a pressure profile; the dark fold under the heavy middle gives it depth. */
const P = [[10,132],[58,128],[100,110],[128,74],[146,60],[156,92],[164,148],[180,124],[198,90],[210,104],[218,136],[238,104],[286,24]]
const cr = (p0, p1, p2, p3, t) => {
  const t2 = t * t, t3 = t2 * t
  return [0, 1].map((k) => 0.5 * (2 * p1[k] + (-p0[k] + p2[k]) * t + (2 * p0[k] - 5 * p1[k] + 4 * p2[k] - p3[k]) * t2 + (-p0[k] + 3 * p1[k] - 3 * p2[k] + p3[k]) * t3))
}
const line = []
const ext = [P[0], ...P, P[P.length - 1]]
for (let i = 0; i < P.length - 1; i++) for (let k = 0; k < 24; k++) line.push(cr(ext[i], ext[i + 1], ext[i + 2], ext[i + 3], k / 24))
line.push(P[P.length - 1])
const n = line.length
// Pressure: builds through the lead-in, holds through the W, lifts off on the exit stroke.
const press = (u) => (u < 0.38 ? 1 + 25 * Math.pow(u / 0.38, 1.8) : u < 0.7 ? 26 - (4 * (u - 0.38)) / 0.32 : 22 * Math.pow(Math.max(0, 1 - (u - 0.7) / 0.3), 1.1) + 1.4)
const L = [], R = []
line.forEach((p, i) => {
  const a = line[Math.max(0, i - 1)], b = line[Math.min(n - 1, i + 1)]
  let dx = b[0] - a[0], dy = b[1] - a[1]
  const l = Math.hypot(dx, dy) || 1
  dx /= l
  dy /= l
  const w = press(i / (n - 1)) / 2
  L.push([p[0] - dy * w, p[1] + dx * w])
  R.push([p[0] + dy * w, p[1] - dx * w])
})
const ribbon = (a, b) => 'M' + [...L.slice(a, b), ...R.slice(a, b).reverse()].map((p) => `${r(p[0])} ${r(p[1])}`).join(' L') + ' Z'
const STROKE = ribbon(0, n)
const FOLD = ribbon(Math.floor(n * 0.36), Math.floor(n * 0.78))
const FOLD_OFFSET = [3, 7]
const all = [...L, ...R].concat(L.map(([x, y]) => [x + FOLD_OFFSET[0], y + FOLD_OFFSET[1]]))
const box = { x: Math.min(...all.map((p) => p[0])), y: Math.min(...all.map((p) => p[1])), X: Math.max(...all.map((p) => p[0])), Y: Math.max(...all.map((p) => p[1])) }
const MW = box.X - box.x, MH = box.Y - box.y

// The stroke, fitted into a square of side `size` at (0,0).
function gavel(mono = false, size = 120) {
  const k = (size * 0.88) / MW
  const tx = (size - MW * k) / 2 - box.x * k
  const ty = (size - MH * k) / 2 - box.y * k
  const fold = mono ? 'currentColor" fill-opacity="0.45' : '#0E6B52'
  const ink = mono ? 'currentColor' : '#C8FF4D'
  return `<g transform="translate(${r(tx)} ${r(ty)}) scale(${r(k)})"><path d="${FOLD}" fill="${fold}" transform="translate(${FOLD_OFFSET})"/><path d="${STROKE}" fill="${ink}"/></g>`
}
// The stroke at its own aspect, for lockups: height h.
const strokeAt = (h, ink = '#C8FF4D', foldInk = '#0E6B52') => {
  const k = h / MH
  return { w: MW * k, svg: `<g transform="scale(${r(k)}) translate(${r(-box.x)} ${r(-box.y)})"><path d="${FOLD}" fill="${foldInk}" transform="translate(${FOLD_OFFSET})"/><path d="${STROKE}" fill="${ink}"/></g>` }
}

const markSvg = (body, extra = '') => `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 120 120"${extra}>${body}</svg>`
out('wildjury-mark.svg', markSvg(gavel(), ' role="img" aria-label="Wildjury"'))
out('wildjury-mark-mono.svg', markSvg(gavel(true), ' role="img" aria-label="Wildjury"'))
out('wildjury-mark-tile.svg', markSvg(`<rect width="120" height="120" rx="27" fill="#070908"/>${gavel(false, 120)}`))

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

// Lockup: the stroke sits on the baseline and rises past the x-height, one bowl of air before the type.
const H_MARK = (top + desc) * 0.95
const gap = SIZE * 0.2
const lock = (fill, mk = strokeAt(H_MARK)) =>
  `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 ${r(-top)} ${r(mk.w + gap + width)} ${r(top + desc)}" role="img" aria-label="Wildjury">
  <g transform="translate(0 ${r(-top + (top + desc) * 0.02)})">${mk.svg}</g>
  <g transform="translate(${r(mk.w + gap)} 0)">${path(fill)}</g></svg>`
out('wildjury-lockup.svg', lock('#C8FF4D'))
out('wildjury-lockup-paper.svg', lock('#E9F2EA'))
out('wildjury-lockup-ink.svg', lock('#070908', strokeAt(H_MARK, '#1FB37E', '#0B3B2F')))
console.log('logo written')
