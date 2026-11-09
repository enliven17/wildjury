// npm run logo → logo/*.svg. The mark and wordmark are built from geometry and Geist's outlines, never typed.
import { readFileSync, writeFileSync, mkdirSync } from 'node:fs'
import opentype from 'opentype.js'

const out = (f, s) => writeFileSync(new URL(`./logo/${f}`, import.meta.url), s.trim() + '\n')
mkdirSync(new URL('./logo/', import.meta.url), { recursive: true })
const r = (n) => Math.round(n * 100) / 100
const pts = (a) => a.map(([x, y]) => `${r(x)},${r(y)}`).join(' ')

/* ── The jury cube ───────────────────────────────────────────────────────────
   An isometric cube. Its top is a 3×3 bench of seats; eight agree.
   One seat sits raised in amber: the dissent, kept on the record. */
const C = [60, 62] // centre vertex
const S = 46 // edge length in px
const dx = S * Math.cos(Math.PI / 6)
const dy = S / 2
const add = (p, q, k = 1) => [p[0] + q[0] * k, p[1] + q[1] * k]
const U = [dx, -dy] // to the right-back
const V = [-dx, -dy] // to the left-back
const D = [0, S] // down
const GAP = 0.11
const DISSENT = [2, 1] // top face, right edge, middle seat
const LIFT = 11

// A seat on a face spanned from `o` by vectors a, b; cells i, j of 3.
const seat = (o, a, b, i, j) => {
  const u0 = i / 3 + GAP / 2, u1 = (i + 1) / 3 - GAP / 2, v0 = j / 3 + GAP / 2, v1 = (j + 1) / 3 - GAP / 2
  const p = (u, v) => add(add(o, a, u), b, v)
  return [p(u0, v0), p(u1, v0), p(u1, v1), p(u0, v1)]
}

function cube({ mono = false } = {}) {
  const fill = (f) => (mono ? 'currentColor' : f)
  const op = (o) => (mono ? ` fill-opacity="${o}"` : '')
  const top = [], left = [], right = []
  for (let i = 0; i < 3; i++)
    for (let j = 0; j < 3; j++) {
      // Top face: origin at the centre vertex, spanning back-right and back-left.
      if (!(i === DISSENT[0] && j === DISSENT[1])) top.push(seat(C, U, V, i, j))
    }
  // The body is solid: the verdict. Only the top is a bench of seats.
  const body = (a) => [C, add(C, a), add(add(C, a), D), add(C, D)]
  left.push(body(V))
  right.push(body(U))
  const poly = (q, f, extra = '') => `<polygon points="${pts(q)}" fill="${f}"${extra}/>`
  const d = seat(C, U, V, ...DISSENT)
  const up = d.map(([x, y]) => [x, y - LIFT])
  // The raised seat's two visible walls, then its top.
  const wallR = [d[1], d[2], up[2], up[1]]
  const wallL = [d[2], d[3], up[3], up[2]]
  const plate = [C, add(C, U), add(add(C, U), V), add(C, V)]
  const rim = (a) => `<polyline points="${pts([add(C, a), C])}" fill="none" stroke="${mono ? 'currentColor' : '#E6FF7A'}" stroke-width="1.2" stroke-linecap="round" opacity="${mono ? 0.5 : 0.85}"/>`
  return `
  ${poly(plate, mono ? 'currentColor' : 'url(#wj-plate)', op(0.14))}
  ${top.map((q) => poly(q, fill('url(#wj-top)'))).join('')}
  ${left.map((q) => poly(q, fill('url(#wj-left)'), op(0.62))).join('')}
  ${right.map((q) => poly(q, fill('url(#wj-right)'), op(0.38))).join('')}
  ${rim(U)}${rim(V)}
  ${poly(wallR, mono ? 'currentColor' : '#C9741A', op(0.5))}${poly(wallL, mono ? 'currentColor' : '#E08A22', op(0.75))}
  ${poly(up, mono ? 'currentColor' : 'url(#wj-amber)', op(0.2))}`
}

const defs = `<defs>
  <linearGradient id="wj-top" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#E6FF7A"/><stop offset="1" stop-color="#9BF25A"/></linearGradient>
  <linearGradient id="wj-left" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#4BE38F"/><stop offset="1" stop-color="#1FB37E"/></linearGradient>
  <linearGradient id="wj-right" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#17A49B"/><stop offset="1" stop-color="#0C6E6A"/></linearGradient>
  <linearGradient id="wj-plate" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#1C4A2E"/><stop offset="1" stop-color="#0E2F28"/></linearGradient>
  <linearGradient id="wj-amber" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#FFD27A"/><stop offset="1" stop-color="#FFA63D"/></linearGradient>
</defs>`

const markSvg = (body, extra = '') => `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 120 120"${extra}>${body}</svg>`
out('wildjury-mark.svg', markSvg(defs + cube(), ' role="img" aria-label="Wildjury"'))
out('wildjury-mark-mono.svg', markSvg(cube({ mono: true }), ' role="img" aria-label="Wildjury"'))
out('wildjury-mark-tile.svg', markSvg(`${defs}<rect width="120" height="120" rx="27" fill="#070908"/><g transform="translate(14 13) scale(.77)">${cube()}</g>`))

/* ── The wordmark ────────────────────────────────────────────────────────────
   "wildjury" in Geist Medium, tightened. The tittles on i and j become seats: lime on the i, amber on the j. */
const font = opentype.parse(readFileSync(new URL('./source/fonts/Geist-Medium.ttf', import.meta.url)).buffer)
const SIZE = 100
const TRACK = -0.045 * SIZE
const word = 'wildjury'

// Split a glyph path into closed contours, so the dot can be dropped.
function contours(path) {
  const all = []
  let cur = []
  // Each contour starts with a move; this font's outlines leave the close implicit.
  for (const c of path.commands) {
    if (c.type === 'M' && cur.length) {
      all.push([...cur, { type: 'Z' }])
      cur = []
    }
    if (c.type !== 'Z') cur.push(c)
  }
  if (cur.length) all.push([...cur, { type: 'Z' }])
  return all
}
const bbox = (cmds) => {
  const p = new opentype.Path()
  p.commands = cmds
  return p.getBoundingBox()
}
const toD = (cmds) => {
  const p = new opentype.Path()
  p.commands = cmds
  return p.toPathData(2)
}

let x = 0
const parts = []
const dots = []
for (const ch of word) {
  const g = font.charToGlyph(ch)
  const cs = contours(g.getPath(x, 0, SIZE))
  if (ch === 'i' || ch === 'j') {
    // The tittle is the contour that sits highest.
    const top = cs.reduce((a, b) => (bbox(b).y1 < bbox(a).y1 ? b : a))
    const b = bbox(top)
    dots.push({ ch, cx: (b.x1 + b.x2) / 2, cy: (b.y1 + b.y2) / 2, w: b.x2 - b.x1 })
    cs.splice(cs.indexOf(top), 1)
  }
  parts.push(...cs.map(toD))
  x += g.advanceWidth * (SIZE / font.unitsPerEm) + TRACK
}
const width = x - TRACK
const asc = (font.ascender / font.unitsPerEm) * SIZE
const desc = (-font.descender / font.unitsPerEm) * SIZE
const seatSq = (d, fill) => {
  const s = d.w * 1.12
  return `<rect x="${r(d.cx - s / 2)}" y="${r(d.cy - s / 2 - 2)}" width="${r(s)}" height="${r(s)}" rx="${r(s * 0.22)}" fill="${fill}"/>`
}
const vb = `0 ${r(-asc)} ${r(width)} ${r(asc + desc)}`
const wordBody = (ink, iDot, jDot) =>
  `<path d="${parts.join(' ')}" fill="${ink}"/>${seatSq(dots[0], iDot)}${seatSq(dots[1], jDot)}`
const wordSvg = (ink, iDot, jDot) =>
  `<svg xmlns="http://www.w3.org/2000/svg" viewBox="${vb}" role="img" aria-label="wildjury">${defs}${wordBody(ink, iDot, jDot)}</svg>`

out('wildjury-wordmark.svg', wordSvg('#E9F2EA', 'url(#wj-top)', 'url(#wj-amber)'))
out('wildjury-wordmark-ink.svg', wordSvg('#070908', '#3FE08A', '#F59A2A'))
out('wildjury-wordmark-mono.svg', wordSvg('currentColor', 'currentColor', 'currentColor'))

// Lockup: mark at cap height ×1.9, one stem-gap of air.
const markH = asc * 1.12
const gap = SIZE * 0.32
const lock = (ink) => {
  const total = markH + gap + width
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 ${r(-asc * 1.02)} ${r(total)} ${r(asc * 1.02 + desc)}" role="img" aria-label="Wildjury">${defs}
  <g transform="translate(0 ${r(-asc * 1.02 + (asc * 1.02 + desc - markH) / 2 - 2)}) scale(${r(markH / 120)})">${cube()}</g>
  <g transform="translate(${r(markH + gap)} 0)">${wordBody(ink, 'url(#wj-top)', 'url(#wj-amber)')}</g></svg>`
}
out('wildjury-lockup.svg', lock('#E9F2EA'))
out('wildjury-lockup-ink.svg', lock('#070908'))
console.log('logo written; wordmark', r(width), '×', r(asc + desc))
