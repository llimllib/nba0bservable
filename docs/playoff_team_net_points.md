---
theme: cotton
title: Playoff Net Points by Player
toc: false
sql:
  players: ./data/espn.players.parquet
---

# Playoff Net Points by Player

```js
import { teams, normalizeESPN } from "./lib/teams.js"
import { label } from "./lib/labels.js"
```

```sql id=playoffPlayers
SELECT
  player_id,
  name,
  team,
  COUNT(DISTINCT game_id) AS games,
  SUM(oNetPts) AS oNetPts,
  SUM(dNetPts) AS dNetPts,
  SUM(tNetPts) AS tNetPts,
  SUM(oNetPts) / COUNT(DISTINCT game_id) AS oNetPtsPerG,
  SUM(dNetPts) / COUNT(DISTINCT game_id) AS dNetPtsPerG,
  SUM(tNetPts) / COUNT(DISTINCT game_id) AS tNetPtsPerG,
  SUM(
    CAST(SPLIT_PART(minutes_played, ':', 1) AS FLOAT) +
    CAST(SPLIT_PART(minutes_played, ':', 2) AS FLOAT) / 60
  ) AS minutes
FROM players
WHERE season = 2026
  AND game_id LIKE '004%'
  AND played
GROUP BY player_id, name, team
HAVING games > 0
```

```js
const allPlayers = playoffPlayers.toArray().map(d => ({
  player_id: d.player_id,
  name: d.name,
  team: d.team,
  games: Number(d.games),
  oNetPts: Number(d.oNetPts),
  dNetPts: Number(d.dNetPts),
  tNetPts: Number(d.tNetPts),
  oNetPtsPerG: Number(d.oNetPtsPerG),
  dNetPtsPerG: Number(d.dNetPtsPerG),
  tNetPtsPerG: Number(d.tNetPtsPerG),
  minutes: Number(d.minutes),
  minutesPerG: Number(d.minutes) / Number(d.games),
}))

const teamOptions = [...new Set(allPlayers.map(p => p.team))]
  .map(espnAbbrev => {
    const nba = normalizeESPN(espnAbbrev)
    const t = teams.get(nba)
    return { espnAbbrev, abbrev: nba, name: t.name, colors: t.colors }
  })
  .sort((a, b) => a.name.localeCompare(b.name))
```

```js
const selectedTeam = view(
  Inputs.select(teamOptions, {
    label: "team",
    format: t => t.name,
  }),
)
const perGame = view(Inputs.toggle({ label: "per game", value: true }))
const minMinutes = view(
  Inputs.range([0, 40], {
    label: "min minutes / game",
    value: 10,
    step: 1,
  }),
)
```

```js
const data = allPlayers.filter(
  p => p.team === selectedTeam.espnAbbrev && p.minutesPerG >= minMinutes,
)
const x = perGame ? "dNetPtsPerG" : "dNetPts"
const y = perGame ? "oNetPtsPerG" : "oNetPts"
const fmt = v => (Math.round(v * 10) / 10).toFixed(1)
const fill = selectedTeam.colors[0]
const stroke = selectedTeam.colors[1] ?? "black"

display(
  Plot.plot({
    width: 500,
    height: 500,
    title: `${selectedTeam.name} — 2025–26 playoffs`,
    subtitle: `net points per game, min ${minMinutes} minutes`,
    grid: true,
    marginLeft: 60,
    marginBottom: 50,
    x: {
      label: `Defensive net points${perGame ? " / game" : ""}`,
      labelAnchor: "center",
      nice: true,
      ticks: 3,
    },
    y: {
      label: `Offensive net points${perGame ? " / game" : ""}`,
      labelAnchor: "center",
      nice: true,
      ticks: 3,
    },
    marks: [
      Plot.ruleX([0], { stroke: "#bbb" }),
      Plot.ruleY([0], { stroke: "#bbb" }),
      label(data, {
        x,
        y,
        label: "name",
        padding: 10,
        minCellSize: 1500,
      }),
      Plot.dot(data, {
        x,
        y,
        r: 6,
        fill,
        stroke,
        strokeWidth: 1.5,
        fillOpacity: 0.85,
      }),
      Plot.tip(
        data,
        Plot.pointer({
          x,
          y,
          title: d =>
            `${d.name}\nGames: ${d.games}  Min: ${fmt(d.minutes)}\nOff net: ${fmt(d.oNetPts)} (${fmt(d.oNetPtsPerG)}/g)\nDef net: ${fmt(d.dNetPts)} (${fmt(d.dNetPtsPerG)}/g)\nTotal: ${fmt(d.tNetPts)} (${fmt(d.tNetPtsPerG)}/g)`,
        }),
      ),
    ],
  }),
)
```

Each dot is a player on the selected team across the 2025–26 playoffs so far. Dot size is total minutes played; up-and-right is good. Source: ESPN per-game net points (`oNetPts`, `dNetPts`).

```sql id=playoffGames
SELECT
  player_id,
  name,
  team,
  game_id,
  oNetPts,
  dNetPts,
  tNetPts,
  CAST(SPLIT_PART(minutes_played, ':', 1) AS FLOAT) +
    CAST(SPLIT_PART(minutes_played, ':', 2) AS FLOAT) / 60 AS minutesPlayed
FROM players
WHERE season = 2026
  AND game_id LIKE '004%'
  AND played
```

```js
const allGames = playoffGames.toArray().map(d => ({
  player_id: d.player_id,
  name: d.name,
  team: d.team,
  game_id: d.game_id,
  tNetPts: Number(d.tNetPts),
  oNetPts: Number(d.oNetPts),
  dNetPts: Number(d.dNetPts),
  minutesPlayed: Number(d.minutesPlayed),
}))
```

```js
const filteredIds = new Set(data.map(d => String(d.player_id)))
const games = allGames.filter(
  g =>
    g.team === selectedTeam.espnAbbrev && filteredIds.has(String(g.player_id)),
)
const orderedPlayers = data
  .slice()
  .sort((a, b) => b.tNetPtsPerG - a.tNetPtsPerG)
const playerOrder = orderedPlayers.map(p => p.name)

display(
  Plot.plot({
    width: 720,
    marginLeft: 180,
    marginRight: 30,
    height: Math.max(180, orderedPlayers.length * 44),
    title: `${selectedTeam.name}`,
    subtitle: `net points per playoff game`,
    y: {
      domain: playerOrder,
      padding: 0.5,
      label: null,
      axis: null,
    },
    x: { label: "Total net points (per game)", grid: true, nice: true },
    marks: [
      Plot.ruleX([0], { stroke: "#bbb" }),
      Plot.dot(games, {
        y: "name",
        x: "tNetPts",
        fill,
        stroke,
        strokeWidth: 1,
        r: 5,
        fillOpacity: 0.75,
      }),
      Plot.tickX(orderedPlayers, {
        y: "name",
        x: "tNetPtsPerG",
        stroke: "red",
        strokeWidth: 2,
      }),
      Plot.image(orderedPlayers, {
        y: "name",
        frameAnchor: "left",
        dx: -150,
        src: d =>
          `https://cdn.nba.com/headshots/nba/latest/260x190/${d.player_id}.png`,
        width: 44,
        height: 32,
        clip: false,
      }),
      Plot.text(orderedPlayers, {
        y: "name",
        frameAnchor: "left",
        dx: -120,
        textAnchor: "start",
        text: "name",
        fontSize: 12,
        clip: false,
      }),
      Plot.tip(
        games,
        Plot.pointer({
          y: "name",
          x: "tNetPts",
          title: d =>
            `${d.name}\nNet pts: ${fmt(d.tNetPts)} (O ${fmt(d.oNetPts)} / D ${fmt(d.dNetPts)})\nMinutes: ${fmt(d.minutesPlayed)}`,
        }),
      ),
    ],
  }),
)
display(html`<div style="margin-top:0.5rem;font-size:0.75rem;color:#999">Data: <a href="https://espnanalytics.com" style="color:#999">espnanalytics.com</a> · Chart: <a href="https://billmill.org/nba" style="color:#999">billmill.org/nba</a></div>`)
```
