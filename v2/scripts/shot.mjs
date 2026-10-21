// Render a tool view to a PNG, so you (or an agent) can see a chart without
// opening a browser. Needs the dev server running (`npm run dev:local`).
//
//   npm run shot -- "playoffs?team=BOS&season=2026"
//   npm run shot -- "playoffs?team=BOS" --dom   # screenshot the page instead
//
// By default it clicks Export PNG, so the image is exactly what gets posted.
// Output goes to shots/<name>.png
import { chromium } from "playwright"
import fs from "node:fs"
import path from "node:path"

const args = process.argv.slice(2)
const view = args.find(a => !a.startsWith("--")) ?? "playoffs"
const dom = args.includes("--dom")
const server = process.env.SHOT_SERVER ?? "http://localhost:4321/nba/"

const name = view.replace(/[^a-z0-9]+/gi, "-").replace(/-+$/, "")
const out = path.resolve("shots", `${name}${dom ? "-dom" : ""}.png`)
fs.mkdirSync(path.dirname(out), { recursive: true })

const browser = await chromium.launch()
const page = await browser.newPage({
  deviceScaleFactor: 2,
  viewport: { width: 1100, height: 1000 },
})
page.on("console", m => {
  if (m.type() === "error" || m.type() === "warning")
    console.error(`[browser ${m.type()}] ${m.text()}`)
})
page.on("pageerror", e => console.error(`[page error] ${e.message}`))

const t0 = Date.now()
await page.goto(server + view)
await page.waitForSelector("svg.frame", { timeout: 30_000 })
console.error(`chart rendered in ${Date.now() - t0}ms`)

if (dom) {
  await page.locator("#tool").screenshot({ path: out })
} else {
  const [download] = await Promise.all([
    page.waitForEvent("download"),
    page.click("button.export"),
  ])
  await download.saveAs(out)
  const status = await page.locator(".status").textContent()
  if (status) console.error(status)
}
console.log(out)
await browser.close()
