import { useEffect, useRef } from 'react'

// Ported from my cankatui dot-grid-spotlight, trimmed to what this page uses.
export default function DotGrid({ spacing = 18, radius = 0.9, glow = 2.2, reach = 160 }) {
  const ref = useRef<HTMLCanvasElement>(null)

  useEffect(() => {
    const canvas = ref.current!
    const ctx = canvas.getContext('2d')!
    const host = canvas.parentElement!
    const mouse = { x: -1e4, y: -1e4 }
    let w = 0
    let h = 0
    let frame = 0

    const draw = () => {
      frame = 0
      ctx.clearRect(0, 0, w, h)
      const ox = (w % spacing) / 2
      const oy = (h % spacing) / 2
      for (let x = ox; x <= w; x += spacing) {
        for (let y = oy; y <= h; y += spacing) {
          const d = Math.hypot(x - mouse.x, y - mouse.y)
          const f = d < reach ? 1 - d / reach : 0
          ctx.globalAlpha = 0.07 + f * 0.75
          ctx.fillStyle = f ? '#C8FF4D' : '#FFFFFF'
          ctx.beginPath()
          ctx.arc(x, y, radius + (glow - radius) * f, 0, Math.PI * 2)
          ctx.fill()
        }
      }
      ctx.globalAlpha = 1
    }
    const queue = () => {
      if (!frame) frame = requestAnimationFrame(draw)
    }
    const resize = () => {
      const dpr = Math.min(window.devicePixelRatio || 1, 2)
      w = host.clientWidth
      h = host.clientHeight
      canvas.width = w * dpr
      canvas.height = h * dpr
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0)
      draw()
    }
    const move = (e: PointerEvent) => {
      const r = canvas.getBoundingClientRect()
      mouse.x = e.clientX - r.left
      mouse.y = e.clientY - r.top
      queue()
    }
    const leave = () => {
      mouse.x = mouse.y = -1e4
      queue()
    }
    const ro = new ResizeObserver(resize)
    ro.observe(host)
    host.addEventListener('pointermove', move)
    host.addEventListener('pointerleave', leave)
    return () => {
      ro.disconnect()
      host.removeEventListener('pointermove', move)
      host.removeEventListener('pointerleave', leave)
      cancelAnimationFrame(frame)
    }
  }, [spacing, radius, glow, reach])

  return <canvas ref={ref} className="dotgrid" aria-hidden="true" />
}
