---
theme: cotton
title: Team Net Points Distribution
toc: false
sql:
  players: ./data/espn.players.parquet
---

# Team Net Points Distribution

```js
const CURRENT_SEASON = 2026
```

```js
const availableSeasons = [2026, 2025, 2024, 2023, 2022, 2021, 2020, 2019]

function getFromHash(param, defaultVal) {
  const hash = window.location.hash.slice(1)
  if (!hash) return defaultVal
  try {
    const params = new URLSearchParams(hash)
    const val = params.get(param)
    if (!val) return defaultVal
    return val
  } catch (e) {
    return defaultVal
  }
}

const seasonSelect = Inputs.select(availableSeasons, {
  value:
    parseInt(getFromHash("season", String(CURRENT_SEASON))) || CURRENT_SEASON,
  format: d => `${String(d - 1)}-${String(d).slice(2)}`,
  label: "Season:",
})

const selectedSeason = Generators.input(seasonSelect)
```

```js
const nPlayersInput = Inputs.range([5, 15], {
  value: parseInt(getFromHash("n", "10")) || 10,
  step: 1,
  label: "Top N players by minutes:",
})

const nPlayers = Generators.input(nPlayersInput)
```

```js
// Update URL hash
{
  const params = new URLSearchParams()
  if (selectedSeason !== CURRENT_SEASON) params.set("season", selectedSeason)
  if (nPlayers !== 10) params.set("n", nPlayers)
  const newHash = params.toString()
  history.replaceState(
    null,
    "",
    newHash ? `#${newHash}` : window.location.pathname,
  )
}
```

```js
// Aggregate to one row per player per team: total tNetPts, total minutes
const playerAgg = await sql`
  SELECT
    name,
    team,
    player_id,
    count(*) as games,
    sum(tNetPts) as tNetPts,
    sum(
      CAST(SPLIT_PART(minutes_played, ':', 1) AS FLOAT) +
      CAST(SPLIT_PART(minutes_played, ':', 2) AS FLOAT) / 60
    ) as totalMinutes
  FROM players
  WHERE season = ${selectedSeason}
    AND played = 1
    AND (game_id LIKE '002%' OR game_id LIKE '003%')
  GROUP BY name, team, player_id
`
```

```js
// For each team, take the top N players by total minutes
const byTeam = new Map()
for (const row of playerAgg) {
  if (!byTeam.has(row.team)) byTeam.set(row.team, [])
  byTeam.get(row.team).push(row)
}

const topPlayers = []
for (const [team, players] of byTeam) {
  players.sort((a, b) => b.totalMinutes - a.totalMinutes)
  const top = players.slice(0, nPlayers)
  // Assign rank by minutes (1 = most minutes)
  top.forEach((p, i) => {
    topPlayers.push({ ...p, minutesRank: i + 1 })
  })
}

// Sort teams by median tNetPts of their top N
const teamMedians = new Map()
for (const [team] of byTeam) {
  const vals = topPlayers
    .filter(p => p.team === team)
    .map(p => p.tNetPts)
    .sort((a, b) => a - b)
  if (vals.length > 0) {
    teamMedians.set(team, vals[Math.floor(vals.length / 2)])
  }
}

const teamOrder = [...teamMedians.entries()]
  .sort((a, b) => b[1] - a[1])
  .map(([team]) => team)

// ESPN CDN logo URL mapping
const logoAbbrev = { BRK: "bkn", SAN: "sas", UTA: "utah" }
function logoUrl(team) {
  const slug = logoAbbrev[team] || team.toLowerCase()
  return `https://a.espncdn.com/i/teamlogos/nba/500/${slug}.png`
}
```

<div class="card">
  <div style="display: flex; gap: 20px; flex-wrap: wrap; align-items: end;">
    <div>${seasonSelect}</div>
    <div>${nPlayersInput}</div>
  </div>
</div>

```js
display(
  Plot.plot({
    title: `Season Total Net Points — Top ${nPlayers} Players by Minutes`,
    subtitle: `${selectedSeason - 1}-${String(selectedSeason).slice(2)} season · Each dot is a player's season total · Sorted by team median`,
    caption: html`Data: espnanalytics.com · Chart: billmill.org/nba`,
    width: 500,
    height: 1000,
    marginLeft: 40,
    marginRight: 20,
    x: {
      label: "Total Net Points (season)",
      grid: true,
      nice: true,
    },
    y: {
      label: null,
      domain: teamOrder,
      axis: null,
    },
    marks: [
      Plot.ruleX([0], { stroke: "#ccc", strokeWidth: 1 }),
      // Team logos as y-axis labels
      Plot.image(teamOrder.map(team => ({ team, url: logoUrl(team) })), {
        y: "team",
        src: "url",
        width: 28,
        height: 28,
        frameAnchor: "left",
        dx: -20,
      }),
      // Horizontal bar from min to max
      Plot.ruleY(
        teamOrder.map(team => {
          const vals = topPlayers
            .filter(p => p.team === team)
            .map(p => p.tNetPts)
          return { team, min: Math.min(...vals), max: Math.max(...vals) }
        }),
        {
          y: "team",
          x1: "min",
          x2: "max",
          stroke: "#999",
          strokeWidth: 2,
        },
      ),
      // Vertical tick at min
      Plot.tickX(
        teamOrder.map(team => {
          const vals = topPlayers
            .filter(p => p.team === team)
            .map(p => p.tNetPts)
          return { team, value: Math.min(...vals) }
        }),
        {
          x: "value",
          y: "team",
          stroke: "#999",
          strokeWidth: 2,
        },
      ),
      // Vertical tick at median
      Plot.tickX(
        teamMedians
          .entries()
          .toArray()
          .map(([team, median]) => ({
            team,
            value: median,
          })),
        {
          x: "value",
          y: "team",
          stroke: "#333",
          strokeWidth: 1,
        },
      ),
      // Vertical tick at max
      Plot.tickX(
        teamOrder.map(team => {
          const vals = topPlayers
            .filter(p => p.team === team)
            .map(p => p.tNetPts)
          return { team, value: Math.max(...vals) }
        }),
        {
          x: "value",
          y: "team",
          stroke: "#999",
          strokeWidth: 2,
        },
      ),
      // Player dots
      Plot.dot(topPlayers, {
        x: "tNetPts",
        y: "team",
        fill: d => (d.tNetPts >= 0 ? "#008348" : "#A73832"),
        fillOpacity: 0.5,
        r: 4,
        tip: true,
        title: d =>
          `${d.name} (${d.team})\nTotal Net Points: ${d.tNetPts.toFixed(1)}\nMinutes: ${Math.round(d.totalMinutes)}\nGames: ${d.games}\nMinutes rank: #${d.minutesRank}`,
      }),
    ],
  }),
)
```
