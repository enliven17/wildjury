import * as THREE from 'three'

/**
 * Twelve jurors as cubes, rendered small with three.js and redrawn as coloured ASCII.
 * One number, `progress` (0→1, from scroll), tells the story:
 * seated in the box → spread out to think alone → each casts a vote, one dissents → the majority fuses into a verdict.
 */
const N = 12
const DISSENT = 11
const RAMP = ' .:-=+*#%@'
// Faces land mid-ramp (+ * #), edges at the dense end, so cubes read as solid blocks.
const SCRAMBLE = '01<>/\\{}[]'
const FONT_PX = 12
const CELL_W = FONT_PX * 0.6
const CELL_H = FONT_PX * 1.1
const lerp = THREE.MathUtils.lerp
const clamp01 = (x: number) => Math.min(1, Math.max(0, x))
const ease = (x: number) => {
  const t = clamp01(x)
  return t * t * (3 - 2 * t)
}

const vert = /* glsl */ `
  varying vec3 vLocal; varying vec3 vN;
  void main() {
    vLocal = position;
    vN = normalize(mat3(modelMatrix) * normal);
    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
  }`

// Opaque, lit faces with bright edges, so each cube reads as a cube once it is only characters.
const frag = /* glsl */ `
  uniform float uLit; uniform float uAmber;
  varying vec3 vLocal; varying vec3 vN;
  void main() {
    vec3 lime = vec3(0.84, 1.0, 0.36), green = vec3(0.25, 0.88, 0.54), teal = vec3(0.07, 0.6, 0.55);
    float h = clamp(vLocal.y + 0.5, 0.0, 1.0);
    vec3 col = mix(teal, mix(green, lime, smoothstep(0.4, 1.0, h)), smoothstep(0.0, 0.55, h));
    col = mix(col, mix(vec3(1.0, 0.45, 0.1), vec3(1.0, 0.75, 0.32), h), uAmber);
    float diff = max(dot(normalize(vN), normalize(vec3(-0.4, 0.9, 0.55))), 0.0);
    vec3 a = abs(vLocal) * 2.0;
    float e = (a.x > 0.9 ? 1.0 : 0.0) + (a.y > 0.9 ? 1.0 : 0.0) + (a.z > 0.9 ? 1.0 : 0.0);
    float edge = step(1.5, e);
    float lum = (0.42 + 0.48 * diff) * (0.45 + 0.55 * uLit) + edge * (0.25 + 0.3 * uLit);
    gl_FragColor = vec4(col * lum, 1.0);
  }`

type Juror = { group: THREE.Mesh; mat: THREE.ShaderMaterial; box: THREE.Vector3; scatter: THREE.Vector3; spin: THREE.Vector3; phase: number }

export function createJuryScene(canvas: HTMLCanvasElement) {
  const ctx = canvas.getContext('2d')!
  const gl = new THREE.WebGLRenderer({ antialias: false, alpha: false })
  gl.setPixelRatio(1)
  gl.setClearColor(0x000000, 1)
  const scene = new THREE.Scene()
  const camera = new THREE.PerspectiveCamera(30, 1, 0.1, 100)
  const rig = new THREE.Group()
  scene.add(rig)
  let target = new THREE.WebGLRenderTarget(1, 1)
  let buf = new Uint8Array(4)
  let cols = 1
  let rows = 1
  let dpr = 1

  const geo = new THREE.BoxGeometry(1, 1, 1)
  const rand = mulberry(7)
  const jurors: Juror[] = []
  for (let i = 0; i < N; i++) {
    const row = i < 6 ? 0 : 1
    const col = i % 6
    const mat = new THREE.ShaderMaterial({ vertexShader: vert, fragmentShader: frag, uniforms: { uLit: { value: 0.3 }, uAmber: { value: 0 } } })
    const group = new THREE.Mesh(geo, mat)
    rig.add(group)
    const box = new THREE.Vector3((col - 2.5) * 1.45 + (row ? 0.3 : 0), row ? -0.6 : 0.75, row ? 1.0 : -0.6)
    const a = rand() * Math.PI * 2
    const r = 3.4 + rand() * 2.2
    const scatter = new THREE.Vector3(Math.cos(a) * r * 1.35, (rand() - 0.5) * 3.4, Math.sin(a) * r * 0.5 - 0.5)
    jurors.push({ group, mat, box, scatter, spin: new THREE.Vector3(rand() - 0.5, rand() - 0.5, rand() - 0.5).multiplyScalar(4), phase: rand() * 10 })
  }
  const vMat = new THREE.ShaderMaterial({ vertexShader: vert, fragmentShader: frag, uniforms: { uLit: { value: 1 }, uAmber: { value: 0 } } })
  const verdict = new THREE.Mesh(geo, vMat)
  rig.add(verdict)

  const state = { progress: 0, mx: 0, my: 0, tx: 0, ty: 0, px: -1e4, py: -1e4 }
  const clock = new THREE.Clock()
  const palette = new Map<number, string>()
  let raf = 0
  let running = false

  function resize() {
    const w = canvas.clientWidth
    const h = canvas.clientHeight
    if (!w || !h) return
    dpr = Math.min(window.devicePixelRatio || 1, 2)
    canvas.width = w * dpr
    canvas.height = h * dpr
    cols = Math.ceil(w / CELL_W)
    rows = Math.ceil(h / CELL_H)
    target.dispose()
    target = new THREE.WebGLRenderTarget(cols, rows)
    buf = new Uint8Array(cols * rows * 4)
    gl.setSize(cols, rows, false)
    camera.aspect = w / h
    camera.position.set(0, 1.4, w < h ? 26 : 15)
    camera.lookAt(0, -0.2, 0)
    camera.updateProjectionMatrix()
  }

  function pose(t: number) {
    const p = state.progress
    const spread = ease(p / 0.32)
    const vote = clamp01((p - 0.3) / 0.3)
    const fuse = ease((p - 0.64) / 0.3)
    state.mx += (state.tx - state.mx) * 0.05
    state.my += (state.ty - state.my) * 0.05
    rig.rotation.y = state.mx * 0.3 + p * 0.9
    rig.rotation.x = state.my * 0.15 + 0.1
    rig.position.y = -0.9 + spread * 0.6
    jurors.forEach((j, i) => {
      const dissent = i === DISSENT
      const pos = j.box.clone().lerp(j.scatter, spread)
      pos.y += Math.sin(t * 1.1 + j.phase) * 0.08 * (1 + spread * 2)
      const cast = ease((vote - (dissent ? 0.98 : i / N) * 0.85) / 0.15)
      pos.lerp(dissent ? new THREE.Vector3(4.8, -1.2, 1.4) : new THREE.Vector3(0, 0.3, 0), fuse)
      j.group.position.copy(pos)
      j.group.scale.setScalar(dissent ? lerp(1, 0.85, fuse) : Math.max(1 - fuse * 1.05, 0.0001))
      j.group.rotation.set(0.5 + j.spin.x * spread + t * 0.06 * spread, 0.65 + j.spin.y * spread + t * 0.09 * spread, j.spin.z * spread * 0.4)
      j.mat.uniforms.uLit.value = 0.3 + cast * 0.7
      j.mat.uniforms.uAmber.value = dissent ? cast : 0
    })
    verdict.scale.setScalar(Math.max(ease((fuse - 0.3) / 0.7) * 3, 0.0001))
    verdict.position.y = 0.3 + Math.sin(t * 0.9) * 0.1
    verdict.rotation.set(0.6, 0.78 + t * 0.25, 0)
  }

  function colour(r: number, g: number, b: number) {
    // Quantize so the canvas switches fillStyle rarely.
    const key = ((r >> 4) << 8) | ((g >> 4) << 4) | (b >> 4)
    let c = palette.get(key)
    if (!c) {
      c = `rgb(${(r >> 4) * 17},${(g >> 4) * 17},${(b >> 4) * 17})`
      palette.set(key, c)
    }
    return c
  }

  function draw(t: number) {
    pose(t)
    gl.setRenderTarget(target)
    gl.render(scene, camera)
    gl.readRenderTargetPixels(target, 0, 0, cols, rows, buf)
    gl.setRenderTarget(null)

    ctx.setTransform(dpr, 0, 0, dpr, 0, 0)
    ctx.clearRect(0, 0, canvas.width, canvas.height)
    ctx.font = `500 ${FONT_PX}px "Geist Mono", ui-monospace, monospace`
    ctx.textBaseline = 'top'
    const tick = Math.floor(t * 10)
    const reach = 110
    let last = ''
    for (let y = 0; y < rows; y++) {
      const src = (rows - 1 - y) * cols // pixels come back bottom-up
      const cy = y * CELL_H
      for (let x = 0; x < cols; x++) {
        const k = (src + x) * 4
        let r = buf[k], g = buf[k + 1], b = buf[k + 2]
        let lum = Math.max(r, g, b) / 255
        const cx = x * CELL_W
        const d = Math.hypot(cx - state.px, cy - state.py)
        const near = d < reach ? 1 - d / reach : 0
        if (lum < 0.05) {
          if (!near || hash(x, y, tick) > near * 0.35) continue
          r = 200; g = 255; b = 77; lum = 0.3 * near
        }
        let ch = RAMP[Math.min(RAMP.length - 1, Math.max(1, Math.round(lum * (RAMP.length - 1))))]
        // A few glyphs flicker on their own; under the pointer they scramble.
        if (hash(x, y, tick) < 0.012 + near * 0.6) ch = SCRAMBLE[(x * 7 + y * 13 + tick) % SCRAMBLE.length]
        const lift = 1 + near * 0.6
        const c = colour(Math.min(255, r * lift + near * 40), Math.min(255, g * lift + near * 40), Math.min(255, b * lift))
        if (c !== last) {
          ctx.fillStyle = c
          last = c
        }
        ctx.fillText(ch, cx, cy)
      }
    }
  }

  function loop() {
    draw(clock.getElapsedTime())
    if (running) raf = requestAnimationFrame(loop)
  }

  const onMove = (e: PointerEvent) => {
    const r = canvas.getBoundingClientRect()
    state.tx = (e.clientX / window.innerWidth) * 2 - 1
    state.ty = (e.clientY / window.innerHeight) * 2 - 1
    state.px = e.clientX - r.left
    state.py = e.clientY - r.top
  }
  const ro = new ResizeObserver(() => {
    resize()
    if (!running) draw(clock.getElapsedTime())
  })
  ro.observe(canvas)
  window.addEventListener('pointermove', onMove)
  resize()

  return {
    setProgress(p: number) {
      state.progress = p
      if (!running) draw(clock.getElapsedTime())
    },
    play() {
      if (running) return
      running = true
      raf = requestAnimationFrame(loop)
    },
    pause() {
      running = false
      cancelAnimationFrame(raf)
    },
    dispose() {
      running = false
      cancelAnimationFrame(raf)
      ro.disconnect()
      window.removeEventListener('pointermove', onMove)
      target.dispose()
      gl.dispose()
      geo.dispose()
    },
  }
}

const hash = (x: number, y: number, t: number) => {
  const s = Math.sin(x * 127.1 + y * 311.7 + t * 74.7) * 43758.5453
  return s - Math.floor(s)
}

function mulberry(a: number) {
  return () => {
    a |= 0
    a = (a + 0x6d2b79f5) | 0
    let t = Math.imul(a ^ (a >>> 15), 1 | a)
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}
