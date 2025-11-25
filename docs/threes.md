---
theme: cotton
title: Three-point shooting
toc: false
sql:
  players: ./data/playerstats.parquet
---

# Three Point Shooting

```js
import { sql } from "npm:@observablehq/duckdb"

import { teams } from "./lib/teams.js"
import { label } from "./lib/labels.js"
import { sliceQuantile } from "./lib/util.js"
```

```js
const year = view(
  Inputs.range([2014, 2026], { value: "2026", label: "year", step: 1 }),
)
// console.log("year", (await year.next()).value);
const percentile = view(
  Inputs.range([5, 100], {
    value: "15",
    label: "top x% in 3pa",
    step: 5,
  }),
)
const showBackground = view(Inputs.toggle({ label: "Show rest of NBA" }))
```

```js
// I don't like the gap that this makes but I can't figure out how to get the
// value of `year` when the page starts up; this logs it after it changes:
// console.log("year", (await year.next()).value);
// but now when the page starts up

// teams that were active in the given year
const teamArr = teams
  .values()
  .toArray()
  .filter(t => t.abbreviation != "TOT")
  .filter(
    t =>
      !t.years || (year >= t.years[0] && (!t.years[1] || year <= t.years[1])),
  )
const selectedTeams = view(
  Inputs.select(teamArr, {
    value: teamArr[0].name,
    label: "team filter",
    format: t => t.name,
    multiple: true,
  }),
)
```

```js
const activeTeams = selectedTeams.map(t => t.abbreviation)
const allPlayers = (
  await sql([
    `SELECT player_name, team_abbreviation, fg3m, fg3a, fg3a_per36, fg3_pct
       FROM players
      WHERE year=${year}`,
  ])
).toArray()
console.log(activeTeams, "act")
const threepoints = allPlayers.filter(p =>
  activeTeams.length > 0 ? activeTeams.includes(p.team_abbreviation) : true,
)

const x = "fg3a_per36"
const y = "fg3_pct"
const data = sliceQuantile(threepoints, "fg3a", (100 - percentile) / 100)
const background = sliceQuantile(allPlayers, "fg3a", (100 - percentile) / 100)
const graph = Plot.plot({
  width: 800,
  height: 800,
  title: "three-point shooting percentage by rate",
  subtitle: `top ${percentile}% by 3pfga`,
  marginRight: 40,
  grid: true,
  x: {
    nice: true,
    ticks: 5,
    label: "3 point field goals attempted per 36 minutes",
    labelAnchor: "center",
    labelOffset: 50,
  },
  y: {
    nice: true,
    ticks: 5,
    label: "3-point field goal %",
    labelAnchor: "center",
    labelOffset: 50,
  },
  marks: [
    label(data, {
      x,
      y,
      label: "player_name",
      padding: 10,
      minCellSize: 2000,
    }),
    showBackground
      ? Plot.dot(background, { x, y, fill: "grey", fillOpacity: 0.15, r: 8 })
      : null,
    Plot.dot(data, {
      x,
      y,
      fill: d => teams.get(d.team_abbreviation).colors[0],
      stroke: d => teams.get(d.team_abbreviation).colors[1],
      r: 8,
    }),
    Plot.tip(
      data,
      Plot.pointer({
        x,
        y,
        title: d =>
          `${d.player_name}\n${d.team_abbreviation}\n${x}: ${d[x]}\n${y}: ${d[y]}`,
      }),
    ),
  ],
})

d3.select(graph)
  .select("svg")
  .style("padding-bottom", "40px")
  .style("overflow", "visible")
  .select('g[aria-label="x-axis label"]')
  .style("font-size", "14px")
d3.select(graph)
  .select('g[aria-label="y-axis label"]')
  .style("font-size", "14px")
display(graph)
```

```js
const x = "fg3a"
const y = "fg3m"
const data = threepoints
display(
  Plot.plot({
    width: 800,
    height: 800,
    title: "three-point shooting aggregate",
    marginRight: 40,
    grid: true,
    x: { nice: true, ticks: 5, zero: true },
    y: { nice: true, ticks: 5, zero: true },
    marks: [
      label(data, {
        x,
        y,
        label: "player_name",
        padding: 10,
        minCellSize: 2000,
      }),
      Plot.dot(data, {
        x,
        y,
        fill: d => teams.get(d.team_abbreviation).colors[0],
        stroke: d => teams.get(d.team_abbreviation).colors[1],
        r: 8,
      }),
      Plot.tip(
        data,
        Plot.pointer({
          x,
          y,
          title: d => `${d.player_name}\n${x}: ${d[x]}\n${y}: ${d[y]}`,
        }),
      ),
    ],
  }),
)
```

```sql id=higher_volume
SELECT p1.player_id,
  p1.player_name,
  p2.team_abbreviation,
  p1.fg3a_per36 as fg3a_per36_prev,
  p2.fg3a_per36 as fg3a_per36_curr,
  p1.fg3a as fg3a_prev,
  p2.fg3a as fg3a_curr,
  p1.fg3_pct as fg3_pct_prev,
  p2.fg3_pct as fg3_pct_curr,
  p2.fg3a_per36 - p1.fg3a_per36 as fg3a_change,
  ((p2.fg3a_per36 - p1.fg3a_per36) / p1.fg3a_per36) * 100 as fg3a_percent_change,
  p2.fg3_pct - p1.fg3_pct as fg3_pct_change
FROM players p1, players p2
WHERE p1.player_id=p2.player_id
  AND p1.year=${year - 1}
  AND p2.year=${year}
  AND p2.fg3a_per36 > p1.fg3a_per36 * 1.1
  AND p1.fg3a > 250
  AND p2.fg3a > 50
ORDER BY fg3a_change DESC
```

```js
display(Inputs.table(higher_volume))
```

```js
const volumeData = [...higher_volume].filter(p =>
  activeTeams.length > 0 ? activeTeams.includes(p.team_abbreviation) : true,
)

const volumeGraph = Plot.plot({
  width: 800,
  height: 600,
  title: `Players shooting 10%+ more 3s per 36 (${year - 1} → ${year})`,
  subtitle:
    "Change in 3P% vs. change in 3PA per 36 (min: 250 3PA '25, 50 3PA '26)",
  marginRight: 40,
  marginBottom: 60,
  grid: true,
  x: {
    label: "Increase in 3PA per 36 minutes",
    labelAnchor: "center",
    labelOffset: 40,
    inset: 90,
    ticks: 5,
    tickSize: 0,
  },
  y: {
    label: "Change in 3 point %",
    labelAnchor: "center",
    labelOffset: 60,
    tickFormat: d => `${(d * 100).toFixed(1)}%`,
    ticks: 5,
    tickSize: 0,
  },
  marks: [
    label(volumeData, {
      x: "fg3a_change",
      y: "fg3_pct_change",
      label: "player_name",
      padding: 10,
      minCellSize: 2000,
    }),
    Plot.dot(volumeData, {
      x: "fg3a_change",
      y: "fg3_pct_change",
      fill: d => teams.get(d.team_abbreviation).colors[0],
      stroke: d => teams.get(d.team_abbreviation).colors[1],
      r: 8,
    }),
    Plot.tip(
      volumeData,
      Plot.pointer({
        x: "fg3a_change",
        y: "fg3_pct_change",
        title: d =>
          `${d.player_name} (${d.team_abbreviation})
${year - 1}: ${d.fg3a_per36_prev.toFixed(1)} 3PA/36, ${(d.fg3_pct_prev * 100).toFixed(1)}%
${year}: ${d.fg3a_per36_curr.toFixed(1)} 3PA/36, ${(d.fg3_pct_curr * 100).toFixed(1)}%
Change: +${d.fg3a_change.toFixed(1)} 3PA/36 (+${d.fg3a_percent_change.toFixed(1)}%)
        ${d.fg3_pct_change >= 0 ? "+" : ""}${(d.fg3_pct_change * 100).toFixed(1)}% in 3P%`,
      }),
    ),
  ],
})

d3.select(volumeGraph)
  .select("svg")
  .style("padding-bottom", "40px")
  .style("overflow", "visible")

display(volumeGraph)
```
