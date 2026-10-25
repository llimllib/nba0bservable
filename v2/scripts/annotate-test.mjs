// Drive the annotation layer like a person would, then reload the URL and
// export, to check that annotations round-trip through the hash
import { chromium } from "playwright"

const server = process.env.SHOT_SERVER ?? "http://localhost:4321/nba/"
const browser = await chromium.launch()
const page = await browser.newPage({
  deviceScaleFactor: 2,
  viewport: { width: 1100, height: 1100 },
})
page.on("pageerror", e => console.error(`[page error] ${e.message}`))

await page.goto(server + "playoffs?team=BOS&season=2026")
await page.waitForSelector("svg.frame circle")

// the rightmost dot in Tatum's row (the first row)
const dot = await page.evaluate(() => {
  const row = document.querySelector(
    "svg.frame .frame-body circle",
  ).parentElement
  const c = [...row.querySelectorAll("circle")].sort(
    (a, b) => b.cx.baseVal.value - a.cx.baseVal.value,
  )[0]
  const r = c.getBoundingClientRect()
  return { x: r.x + r.width / 2, y: r.y + r.height / 2 }
})
await page.mouse.click(dot.x, dot.y)
console.log("labels:", await page.locator(".ann-label").count())

// drag the label up and left
const lb = await page.locator(".ann-label text").boundingBox()
await page.mouse.move(lb.x + 5, lb.y + 5)
await page.mouse.down()
await page.mouse.move(lb.x - 60, lb.y - 25, { steps: 5 })
await page.mouse.up()

// a note in the empty space on the left of Derrick White's row
const box = await page.locator("svg.frame").boundingBox()
await page.click("[data-mode=text]")
await page.mouse.click(box.x + box.width * 0.33, box.y + box.height * 0.86)
await page.keyboard.type("Rough series for White")
await page.keyboard.press("Enter")
console.log("notes:", await page.locator(".ann-text").count())

// an arrow from below the note's text to White's worst game
const worst = await page.evaluate(() => {
  const rows = [
    ...document.querySelectorAll("svg.frame .frame-body > g"),
  ].filter(g => g.querySelector("image"))
  const c = [...rows.at(-1).querySelectorAll("circle")].sort(
    (a, b) => a.cx.baseVal.value - b.cx.baseVal.value,
  )[0]
  const r = c.getBoundingClientRect()
  return { x: r.x + r.width / 2, y: r.y + r.height / 2 }
})
await page.click("[data-mode=arrow]")
await page.mouse.move(box.x + box.width * 0.36, box.y + box.height * 0.84)
await page.mouse.down()
await page.mouse.move(worst.x, worst.y, { steps: 8 })
await page.mouse.up()
console.log("arrows:", await page.locator(".ann-arrow").count())

await page.waitForTimeout(200)
const url = page.url()
console.log("url:", url)

// reload: annotations should come back from the hash
await page.goto("about:blank")
await page.goto(url)
await page.waitForSelector("svg.frame .ann-arrow")
console.log(
  "after reload:",
  await page.locator(".ann-label").count(),
  await page.locator(".ann-text").count(),
  await page.locator(".ann-arrow").count(),
)
const [download] = await Promise.all([
  page.waitForEvent("download"),
  page.click("button.export"),
])
await download.saveAs("shots/annotated.png")
console.log("shots/annotated.png")
await browser.close()
