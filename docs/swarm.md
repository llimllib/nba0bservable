---
theme: cotton
title: Net Points Swarm
toc: false
sql:
  players: ./data/espn.players.parquet
---

# Net Points Swarm

```js
const CURRENT_SEASON = 2026
```

```js
const availableSeasons = [2026, 2025, 2024, 2023, 2022, 2021, 2020, 2019]

function getFromHash(param, defaultVal, valid) {
  const hash = window.location.hash.slice(1)
  if (!hash) return defaultVal
  try {
    const params = new URLSearchParams(hash)
    const val = params.get(param)
    if (!val) return defaultVal
    if (valid && !valid.includes(val)) return defaultVal
    return val
  } catch (e) {
    return defaultVal
  }
}

const seasonSelect = Inputs.select(availableSeasons, {
  value: parseInt(getFromHash("season", String(CURRENT_SEASON))) || CURRENT_SEASON,
  format: d => `${String(d - 1)}-${String(d).slice(2)}`,
  label: "Season:",
})

const selectedSeason = Generators.input(seasonSelect)
```

```js
// Team selector — ESPN abbreviations
const teamAbbreviations = [
  "ATL", "BOS", "BRK", "CHA", "CHI", "CLE", "DAL", "DEN", "DET", "GSW",
  "HOU", "IND", "LAC", "LAL", "MEM", "MIA", "MIL", "MIN", "NOR", "NYK",
  "OKC", "ORL", "PHI", "PHO", "POR", "SAC", "SAN", "TOR", "UTA", "WAS"
]

const teamSelect = Inputs.select(teamAbbreviations, {
  value: getFromHash("team", "BOS", teamAbbreviations),
  label: "Team:",
})

const selectedTeam = Generators.input(teamSelect)
```

```js
// Metric selector
const metricLabels = {
  tNetPts: "Total Net Points",
  oNetPts: "Offensive Net Points",
  dNetPts: "Defensive Net Points",
  tWPA: "Total Win Probability Added",
  oWPA: "Offensive Win Probability Added",
  dWPA: "Defensive Win Probability Added",
  plusMinusPoints: "Plus/Minus",
}

const metricKeys = Object.keys(metricLabels)

const metricSelect = Inputs.select(metricKeys, {
  value: getFromHash("metric", "tNetPts", metricKeys),
  format: d => metricLabels[d],
  label: "Stat:",
})

const selectedMetric = Generators.input(metricSelect)
```

```js
const selectedMetricLabel = metricLabels[selectedMetric]
```

```js
// Min games filter
const minGamesInput = Inputs.range([1, 70], {
  value: parseInt(getFromHash("minGames", "20")) || 20,
  step: 1,
  label: "Min games played:",
})

const minGames = Generators.input(minGamesInput)
```

```js
// Update URL hash
{
  const params = new URLSearchParams()
  if (selectedSeason !== CURRENT_SEASON) params.set("season", selectedSeason)
  if (selectedTeam !== "BOS") params.set("team", selectedTeam)
  if (selectedMetric !== "tNetPts") params.set("metric", selectedMetric)
  if (minGames !== 20) params.set("minGames", minGames)
  const newHash = params.toString()
  history.replaceState(
    null,
    "",
    newHash ? `#${newHash}` : window.location.pathname,
  )
}
```

```js
const alldata = await sql`
  SELECT
    name,
    team,
    player_id,
    game_id,
    tNetPts,
    oNetPts,
    dNetPts,
    tWPA,
    oWPA,
    dWPA,
    plusMinusPoints,
    minutes_played,
    pts
  FROM players
  WHERE season = ${selectedSeason}
    AND team = ${selectedTeam}
    AND played = 1
    AND (game_id LIKE '002%' OR game_id LIKE '003%')
`
```

```js
// Compute per-player stats, filter by minGames, sort by median metric value
const playerGames = new Map()
for (const row of alldata) {
  if (!playerGames.has(row.name)) playerGames.set(row.name, [])
  playerGames.get(row.name).push(row)
}

const qualifiedPlayers = [...playerGames.entries()]
  .filter(([, games]) => games.length >= minGames)
  .map(([name, games]) => {
    const values = games.map(g => g[selectedMetric] ?? 0).sort((a, b) => a - b)
    const median = values[Math.floor(values.length / 2)]
    const total = values.reduce((s, v) => s + v, 0)
    return { name, median, total, n: games.length }
  })
  .sort((a, b) => b.median - a.median)

const playerOrder = qualifiedPlayers.map(p => p.name)
const qualifiedSet = new Set(playerOrder)

// Add a label field for fy faceting that includes game count
const playerLabels = new Map(
  qualifiedPlayers.map(p => [p.name, `${p.name} (${p.n}g)`])
)
const labelOrder = qualifiedPlayers.map(p => playerLabels.get(p.name))

// Build median data with same label
const medianData = qualifiedPlayers.map(p => ({
  ...p,
  label: playerLabels.get(p.name),
}))

const filteredData = alldata
  .toArray()
  .filter(row => qualifiedSet.has(row.name))
  .map(row => {
    const metricValue = row[selectedMetric] ?? 0
    const parts = (row.minutes_played || "0:00").split(":")
    const mins = parseFloat(parts[0]) + parseFloat(parts[1] || 0) / 60
    return {
      ...row,
      metricValue,
      mins,
      label: playerLabels.get(row.name),
    }
  })
```

<div class="card">
  <div style="display: flex; gap: 20px; flex-wrap: wrap; align-items: end;">
    <div>${teamSelect}</div>
    <div>${seasonSelect}</div>
    <div>${metricSelect}</div>
    <div>${minGamesInput}</div>
  </div>
</div>

```js
const isFloatMetric =
  selectedMetric.includes("NetPts") || selectedMetric.includes("WPA")
const formatValue = v => (isFloatMetric ? v.toFixed(1) : Math.round(v))

const facetHeight = 50
const chartHeight = Math.max(300, playerOrder.length * facetHeight + 80)

display(
  playerOrder.length === 0
    ? html`<div class="card" style="text-align: center; padding: 40px; color: var(--theme-foreground-muted);">
        <p>No players found with at least ${minGames} games. Try lowering the minimum.</p>
      </div>`
    : Plot.plot({
        title: `${selectedMetricLabel} per Game`,
        subtitle: `${selectedTeam} — ${selectedSeason - 1}-${String(selectedSeason).slice(2)} season · Black line = median · Sorted by median`,
        caption: html`Each dot is one game. Larger dots = more minutes played.<br>Data: espnanalytics.com · Chart: billmill.org/nba`,
        width: 928,
        height: chartHeight,
        marginLeft: 150,
        marginRight: 20,
        x: {
          label: selectedMetricLabel,
          grid: true,
          nice: true,
        },
        fy: {
          label: null,
          domain: labelOrder,
          padding: 0.15,
        },
        r: { range: [2, 5.5] },
        marks: [
          Plot.ruleX([0], { stroke: "#ccc", strokeWidth: 1 }),

          // Individual game dots — dodged vertically within each facet row
          Plot.dot(filteredData, Plot.dodgeY("middle", {
            x: "metricValue",
            fy: "label",
            r: "mins",
            fill: d => d.metricValue >= 0 ? "#008348" : "#A73832",
            fillOpacity: 0.55,
            stroke: d => d.metricValue >= 0 ? "#006838" : "#8B1A1A",
            strokeOpacity: 0.3,
            strokeWidth: 0.5,
            tip: true,
            title: d => `${d.name}\n${selectedMetricLabel}: ${formatValue(d.metricValue)}\nMinutes: ${d.minutes_played}\nPoints: ${d.pts}`,
          })),

          // Median tick mark
          Plot.ruleX(medianData, {
            x: "median",
            fy: "label",
            stroke: "black",
            strokeWidth: 2,
            strokeOpacity: 0.8,
          }),
        ],
      }),
)
```
