---
theme: cotton
title: Player Comparison
toc: false
sql:
  player_details: ./data/espn.player_details.parquet
  espn_players: ./data/espn.players.parquet
---

# Player Comparison

Compare two players' net points impact by play type.

```js
import { normalizeESPN, teams } from "./lib/teams.js"
```

```sql id=playerList
SELECT DISTINCT
  pd.playerId,
  pd.name,
  pd.team,
  count(*) as games
FROM player_details pd
WHERE pd.season = 2026
  AND (pd.gameId LIKE '002%' OR pd.gameId LIKE '006%')
GROUP BY pd.playerId, pd.name, pd.team
HAVING games >= 10
ORDER BY pd.name
```

```js
const playerOptions = playerList.toArray()
const playerMap = new Map(
  playerOptions.map(d => [`${d.name} (${d.team})`, d]),
)
const playerIdMap = new Map(
  playerOptions.map(d => [String(d.playerId), d]),
)

// Read initial state from URL hash
function getHashParams() {
  const hash = window.location.hash.slice(1)
  if (!hash) return {}
  try {
    return Object.fromEntries(new URLSearchParams(hash))
  } catch (e) {
    return {}
  }
}

const initParams = getHashParams()
const initPlayer1 = playerIdMap.get(initParams.p1)
  ?? playerOptions.find(d => d.name === "Shai Gilgeous-Alexander")
const initPlayer2 = playerIdMap.get(initParams.p2)
  ?? playerOptions.find(d => d.name === "Nikola Jokic")
const initPer36 = initParams.per36 === "1"
const initShowAll = initParams.allCats === "1"

function playerSearch(label, defaultPlayer) {
  const defaultLabel = defaultPlayer
    ? `${defaultPlayer.name} (${defaultPlayer.team})`
    : ""

  const id = `datalist-${label.replace(/\s/g, "-")}`
  const input = htl.html`<div style="display:flex;align-items:baseline;gap:0.5rem">
    <label style="font-weight:500;white-space:nowrap">${label}</label>
    <input type="text" value="${defaultLabel}" list="${id}"
      placeholder="Type a player name…"
      style="width:300px;padding:4px 8px;font-size:inherit;border:1px solid #ccc;border-radius:4px">
    <datalist id="${id}">
      ${playerOptions.map(d => htl.html`<option value="${d.name} (${d.team})">`)}
    </datalist>
  </div>`

  const textInput = input.querySelector("input")
  input.value = defaultPlayer

  textInput.addEventListener("input", () => {
    const match = playerMap.get(textInput.value)
    if (match) {
      input.value = match
      input.dispatchEvent(new Event("input", { bubbles: true }))
    }
  })

  return input
}

const player1 = view(playerSearch("Player 1", initPlayer1))
const player2 = view(playerSearch("Player 2", initPlayer2))
```

```js
const per36 = view(Inputs.toggle({ label: "Per 36 minutes", value: initPer36 }))
const showAll = view(
  Inputs.toggle({ label: "Show shot-type breakdowns", value: initShowAll }),
)
```

```js
// Update URL hash when inputs change
{
  const params = new URLSearchParams()
  params.set("p1", player1.playerId)
  params.set("p2", player2.playerId)
  if (per36) params.set("per36", "1")
  if (showAll) params.set("allCats", "1")
  history.replaceState(null, "", `#${params.toString()}`)
}
```

```js
// Core: matches ESPN Analytics top-level categories
const coreCategories = [
  "offense",
  "defense",
  "2ptShooting",
  "3ptShooting",
  "assist",
  "rebound",
  "turnover",
  "foul",
  "freethrow",
  "fastbreak",
  "putback",
]

// All: adds shot-type sub-breakdowns
const allCategories = [
  "offense",
  "defense",
  "2ptShooting",
  "3ptShooting",
  "assist",
  "rebound",
  "turnover",
  "foul",
  "freethrow",
  "fastbreak",
  "putback",
  "rim",
  "mid",
  "layup",
  "dunk",
  "corner",
  "atb",
  "driving",
  "cutting",
  "floating",
  "fade",
  "hook",
  "bank",
  "badpass",
  "grenade",
]

const categoryLabels = {
  offense: "Offense",
  defense: "Defense",
  "2ptShooting": "2pt Shooting",
  "3ptShooting": "3pt Shooting",
  assist: "Passing",
  rebound: "Rebounding",
  turnover: "Turnovers Committed",
  foul: "Fouls",
  freethrow: "Free Throws",
  fastbreak: "Fast-Break",
  putback: "Put-Backs",
  rim: "Rim Shooting",
  mid: "Mid-Range",
  layup: "Layups",
  dunk: "Dunks",
  corner: "Corner 3s",
  atb: "Above the Break 3s",
  driving: "Driving",
  cutting: "Cutting",
  floating: "Floater",
  fade: "Fadeaway",
  hook: "Hook Shot",
  bank: "Bank Shot",
  badpass: "Bad Pass",
  grenade: "Grenade",
}
```

```js
// Build the SQL to aggregate both players
const ids = [player1.playerId, player2.playerId]
const activeCats = showAll ? allCategories : coreCategories
const regularCats = activeCats.filter(c => c !== "offense" && c !== "defense")
const catCols = [
  // offense/defense are derived from total_oNetPts/total_dNetPts
  `sum(total_oNetPts) as offense_total`,
  `sum(total_dNetPts) as defense_total`,
  ...regularCats.map(
    c =>
      `sum("${c}_tNetPts") as "${c}_total", sum("${c}_oNetPts") as "${c}_o", sum("${c}_dNetPts") as "${c}_d"`,
  ),
].join(",\n  ")

const detailQuery = `
SELECT
  pd.playerId,
  pd.name,
  pd.team,
  count(*) as games,
  ${catCols},
  sum(total_tNetPts) as total_tNetPts
FROM player_details pd
WHERE pd.season = 2026
  AND (pd.gameId LIKE '002%' OR pd.gameId LIKE '006%')
  AND pd.playerId IN (${ids.join(",")})
GROUP BY pd.playerId, pd.name, pd.team
`
const detailRows = await sql([detailQuery])

// Get minutes for per-36 calc
const minutesQuery = `
SELECT
  player_id,
  sum(
    CAST(SPLIT_PART(minutes_played, ':', 1) AS FLOAT) +
    CAST(SPLIT_PART(minutes_played, ':', 2) AS FLOAT) / 60
  ) AS total_minutes
FROM espn_players
WHERE season = 2026
  AND (game_id LIKE '002%' OR game_id LIKE '006%')
  AND player_id IN (${ids.join(",")})
GROUP BY player_id
`
const minutesRows = await sql([minutesQuery])
const minutesMap = new Map(
  minutesRows.toArray().map(r => [r.player_id, r.total_minutes]),
)
```

```js
const categories = showAll ? allCategories : coreCategories

function getVal(row, cat) {
  const raw = row[`${cat}_total`] ?? 0
  if (!per36) return raw
  const mins = minutesMap.get(row.playerId) ?? 1
  return (raw / mins) * 36
}

// For the summary, total is offense + defense
function getTotal(row) {
  return (row?.offense_total ?? 0) + (row?.defense_total ?? 0)
}

const p1row = detailRows.toArray().find(r => r.playerId === player1.playerId)
const p2row = detailRows.toArray().find(r => r.playerId === player2.playerId)

// Build comparison data
const comparisonData = categories.flatMap(cat => {
  const v1 = p1row ? getVal(p1row, cat) : 0
  const v2 = p2row ? getVal(p2row, cat) : 0
  return [
    {
      category: categoryLabels[cat] || cat,
      player: p1row?.name ?? player1.name,
      value: v1,
    },
    {
      category: categoryLabels[cat] || cat,
      player: p2row?.name ?? player2.name,
      value: v2,
    },
  ]
})
```

```js
const headshotUrl = id =>
  `https://cdn.nba.com/headshots/nba/latest/260x190/${id}.png`

// Parse hex color to RGB
function hexToRgb(hex) {
  const h = hex.replace("#", "")
  return [
    parseInt(h.slice(0, 2), 16),
    parseInt(h.slice(2, 4), 16),
    parseInt(h.slice(4, 6), 16),
  ]
}

// Perceived color distance (weighted Euclidean, accounts for human perception)
function colorDistance(c1, c2) {
  const [r1, g1, b1] = hexToRgb(c1)
  const [r2, g2, b2] = hexToRgb(c2)
  const rMean = (r1 + r2) / 2
  const dr = r1 - r2
  const dg = g1 - g2
  const db = b1 - b2
  return Math.sqrt(
    (2 + rMean / 256) * dr * dr +
      4 * dg * dg +
      (2 + (255 - rMean) / 256) * db * db,
  )
}

// Pick colors for the two players, swapping to secondary if primaries are too similar
function pickColors(t1, t2) {
  const p1 = t1?.colors?.[0] ?? "#1f77b4"
  const p2 = t2?.colors?.[0] ?? "#ff7f0e"
  const s1 = t1?.colors?.[1] ?? p1
  const s2 = t2?.colors?.[1] ?? p2

  if (colorDistance(p1, p2) > 150) return [p1, p2]

  // primaries are too close — try swapping one to secondary
  const d1sec = colorDistance(s1, p2)
  const d2sec = colorDistance(p1, s2)

  // pick whichever swap creates the most contrast
  if (d1sec >= d2sec && d1sec > 150) return [s1, p2]
  if (d2sec > 150) return [p1, s2]

  // both secondaries help — pick the best
  if (d1sec >= d2sec) return [s1, p2]
  return [p1, s2]
}

const p1team = teams.get(normalizeESPN(player1.team))
const p2team = teams.get(normalizeESPN(player2.team))
const [p1color, p2color] = pickColors(p1team, p2team)

const p1name = p1row?.name ?? player1.name
const p2name = p2row?.name ?? player2.name
const p1games = p1row?.games ?? 0
const p2games = p2row?.games ?? 0
const p1mins = minutesMap.get(player1.playerId) ?? 0
const p2mins = minutesMap.get(player2.playerId) ?? 0

const unit = per36 ? "per 36 min" : "season total"
```

<div id="comparison-container"><div id="loading-indicator" style="display:flex;align-items:center;justify-content:center;gap:0.5rem;padding:3rem;color:#999;font-size:1.1rem"><span class="loading-spinner"></span> Loading player data…</div></div>

<style>
.loading-spinner {
  width: 20px;
  height: 20px;
  border: 3px solid #ddd;
  border-top-color: #999;
  border-radius: 50%;
  animation: spin 0.8s linear infinite;
  display: inline-block;
}
@keyframes spin {
  to { transform: rotate(360deg); }
}
</style>

```js
const container = document.getElementById("comparison-container")
container.innerHTML = ""

// --- Header with headshots ---
const header = d3.select(container).append("div").style("display", "flex").style("justify-content", "center").style("align-items", "stretch").style("margin-bottom", "1rem").style("gap", "4rem")

function playerCard(parent, name, color, id, games, mins, align) {
  const card = parent
    .append("div")
    .style("display", "flex")
    .style("flex-direction", "column")
    .style("align-items", "center")

  const frame = card
    .append("div")
    .style("width", "120px")
    .style("height", "72px")
    .style("border", `3px solid ${color}`)
    .style("border-radius", "8px")
    .style("overflow", "visible")
    .style("position", "relative")

  frame
    .append("img")
    .attr("src", headshotUrl(id))
    .attr("alt", name)
    .style("width", "120px")
    .style("height", "88px")
    .style("object-fit", "cover")
    .style("object-position", "top")
    .style("position", "absolute")
    .style("bottom", "0")

  card
    .append("div")
    .style("font-size", "1.2rem")
    .style("font-weight", "bold")
    .style("margin-top", "0.4rem")
    .text(name)

  card
    .append("div")
    .style("font-size", "0.85rem")
    .style("color", "#666")
    .text(`${games} games · ${Math.round(mins)} min`)
}

playerCard(header, p1name, p1color, player1.playerId, p1games, p1mins, "left")
playerCard(header, p2name, p2color, player2.playerId, p2games, p2mins, "right")

// --- Grouped bar chart ---
const chartHeight = categories.length * 56 + 80

const chart = Plot.plot({
  width: 800,
  height: chartHeight,
  marginLeft: 140,
  marginRight: 20,
  x: {
    label: `Net Points (${unit})`,
    grid: true,
    insetLeft: 20,
  },
  fy: {
    label: null,
    domain: categories.map(c => categoryLabels[c] || c),
    padding: 0.12,
  },
  y: {
    axis: null,
    domain: [p1name, p2name],
    padding: 0.1,
  },
  color: {
    domain: [p1name, p2name],
    range: [p1color, p2color],
    legend: false,
  },
  marks: [
    Plot.ruleX([0]),
    Plot.barX(comparisonData, {
      x: "value",
      fy: "category",
      y: "player",
      fill: "player",
      tip: true,
    }),
  ],
})

d3.select(container).append(() => chart)

// --- Summary ---
const p1raw = getTotal(p1row)
const p2raw = getTotal(p2row)
const p1total = p1row
  ? per36
    ? ((p1raw / p1mins) * 36).toFixed(1)
    : p1raw.toFixed(1)
  : "0"
const p2total = p2row
  ? per36
    ? ((p2raw / p2mins) * 36).toFixed(1)
    : p2raw.toFixed(1)
  : "0"

const summary = d3
  .select(container)
  .append("div")
  .style("display", "flex")
  .style("justify-content", "space-between")
  .style("margin-top", "0.5rem")
  .style("padding", "0.5rem 1rem")
  .style("background", "#f5f5f5")
  .style("border-radius", "6px")
  .style("font-size", "0.95rem")

summary
  .append("span")
  .html(
    `<strong>${p1name}</strong> total: <strong>${p1total >= 0 ? "+" : ""}${p1total}</strong> net points`,
  )
summary
  .append("span")
  .html(
    `<strong>${p2name}</strong> total: <strong>${p2total >= 0 ? "+" : ""}${p2total}</strong> net points`,
  )

d3.select(container)
  .append("div")
  .style("margin-top", "0.5rem")
  .style("font-size", "0.75rem")
  .style("color", "#999")
  .html(`Data: <a href="https://espnanalytics.com" style="color:#999">espnanalytics.com</a> · Chart: <a href="https://billmill.org/nba" style="color:#999">billmill.org/nba</a>`)
```

<style>
#comparison-container {
  max-width: 850px;
  margin: 0 auto;
}
</style>
