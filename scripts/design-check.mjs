// Design checks that need the browser: every team's band text passes WCAG
// 4.5:1, and a frame about no one team gets the ink band. Needs the dev
// server (`npm run dev`).
//
//   node scripts/design-check.mjs
//
// Prints each team's band and text colors, and saves shots/ink-band.png
import { chromium } from "playwright"
const server = process.env.SHOT_SERVER ?? "http://localhost:4321/nba/"
const out = "shots/ink-band.png"
const b = await chromium.launch()
const p = await b.newPage({ deviceScaleFactor: 2 })
await p.goto(server + "tools")
const rows = await p.evaluate(async () => {
  const { bandColors, contrast } = await import("/src/kit/frame.ts")
  const { teams } = await import("/src/kit/teams.ts")
  return [...teams.values()]
    .filter(t => !t.years || t.years.length === 1)
    .map(t => {
      const { band, text } = bandColors(t.abbreviation)
      return [t.abbreviation, band, text, contrast(band, text).toFixed(2)]
    })
})
for (const r of rows) console.log(r.join("\t"), +r[3] < 4.5 ? "FAIL" : "")
const failed = rows.filter(r => +r[3] < 4.5).length
if (failed) process.exitCode = 1
await p.evaluate(async () => {
  const { buildFrame } = await import("/src/kit/frame.ts")
  const host = document.createElement("div")
  host.id = "ink"
  document.body.prepend(host)
  buildFrame(
    host,
    "square",
    {
      title: "League leaders",
      context:
        "Net points per 100 possessions in the 2025–26 regular season, minimum 1,000 minutes",
      legend: [{ symbol: "dot", color: "#2166ac", text: "one player" }],
      counts: "30 teams · 412 players",
      source: "Data: ESPN Analytics",
    },
    "billmill.org/nba/leaders?season=2026",
    () => ({
      height: 200,
      marks: [],
      invert: () => undefined,
      project: () => undefined,
    }),
  )
})
await p.locator("#ink svg").screenshot({ path: out })
await b.close()
console.log(failed ? `${failed} teams fail` : "all teams pass", "·", out)
