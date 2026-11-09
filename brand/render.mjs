// npm run render → profile, banner, link preview and kit sheets, all at 2×.
// Uses the installed Edge (or CHROME_PATH). The repo root is served so sources can use the site's images.
import { createServer } from 'node:http'
import { readFile } from 'node:fs/promises'
import { extname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import puppeteer from 'puppeteer-core'

const root = fileURLToPath(new URL('../', import.meta.url))
const types = { '.html': 'text/html', '.css': 'text/css', '.svg': 'image/svg+xml', '.png': 'image/png' }
const server = createServer(async (req, res) => {
  const path = decodeURIComponent(new URL(req.url, 'http://x').pathname)
  const body = await readFile(join(root, path)).catch(() => null)
  if (!body) return res.writeHead(404).end()
  res.writeHead(200, { 'content-type': types[extname(path)] ?? 'application/octet-stream' }).end(body)
}).listen(0)
const base = `http://localhost:${server.address().port}/brand/source/`

const browser = await puppeteer.launch({
  executablePath: process.env.CHROME_PATH ?? 'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe',
  headless: true,
})
for (const [page, out, w, h] of [
  ['profile.html', 'x-profile.png', 400, 400],
  ['banner.html', 'x-banner.png', 1500, 500],
  ['og.html', '../site/public/og.png', 1200, 630],
  ['kit.html?logo', 'kit/wildjury-kit-logo.png', 1600, 1000],
  ['kit.html?colour', 'kit/wildjury-kit-colour.png', 1600, 1000],
  ['kit.html?type', 'kit/wildjury-kit-type.png', 1600, 1000],
]) {
  const tab = await browser.newPage()
  await tab.setViewport({ width: w, height: h, deviceScaleFactor: page.startsWith('og') ? 1 : 2 })
  await tab.goto(base + page, { waitUntil: 'networkidle0' })
  await tab.evaluate(() => document.fonts.ready)
  await tab.screenshot({ path: fileURLToPath(new URL(out, import.meta.url)) })
  await tab.close()
  console.log('wrote', out)
}
await browser.close()
server.close()
