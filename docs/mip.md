---
theme: cotton
title: Most Improved Player
toc: false
sql:
  players: ./data/playerstats.parquet
---

# Most Improved Player

```js
import { sql } from "npm:@observablehq/duckdb"

import { teams } from "./lib/teams.js"
import { label } from "./lib/labels.js"
import { sliceQuantile } from "./lib/util.js"
```

```js
const year = view(
  Inputs.range([2015, 2026], { value: "2026", label: "year", step: 1 }),
)
const percentile = view(
  Inputs.range([5, 100], {
    value: "15",
    label: "top x% in min",
    step: 5,
  }),
)
```

```js
const allPlayers = (
  await sql([
    `SELECT p.player_id, p.player_name, p.team_abbreviation,
            -- the season we're looking at
            p.fga fga_a, p.ts_pct ts_pct_a, p.usg_pct usg_pct_a,
            p.pts_per36 pts_per36_a, p.ast_per36 ast_per36_a,
            p.min min_a, p.year year_a,
            -- the previous season
            q.fga fga_b, q.ts_pct ts_pct_b, q.usg_pct usg_pct_b,
            q.pts_per36 pts_per36_b, q.ast_per36 ast_per36_b,
            q.min min_b, q.year year_b,
            -- differences
            (p.pts_per36 - q.pts_per36) pt_diff,
            (p.ast_per36 - q.ast_per36) ast_diff,
            (p.reb_per36 - q.reb_per36) reb_diff,
            (p.ts_pct - q.ts_pct)       ts_diff,
            (p.usg_pct - q.usg_pct)     usg_diff,
            -- attempt at a summary stat: ts + reb% + ast%
            ((p.ts_pct + p.reb_pct + p.ast_pct) - (q.ts_pct + q.reb_pct + q.ast_pct)) sum_diff,
            ((p.reb_pct + p.ast_pct) - (q.reb_pct + q.ast_pct)) reb_ast_diff,
       FROM players p
       JOIN players q
         ON p.player_id = q.player_id
        AND p.year=${year}
        AND q.year=${year - 1};`,
  ])
).toArray()
// display(allPlayers);
```

```js
const x = "ast_diff"
const y = "pt_diff"
const data = sliceQuantile(
  allPlayers,
  "min_a",
  (100 - percentile) / 100,
).filter(d => d[x] > 0 && d[y] > 0)
const graph = Plot.plot({
  width: 800,
  height: 800,
  title: "Points per 36 and Assists per 36 change",
  subtitle: `difference between ${year} and ${year - 1}. Top ${percentile}% by minutes`,
  x: {
    inset: 50,
    nice: true,
    ticks: 5,
    label: "Difference in assists per 36",
    labelAnchor: "center",
  },
  y: {
    nice: true,
    ticks: 5,
    label: "Difference in points per 36",
    labelAnchor: "center",
    labelOffset: 38,
  },
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
        title: d =>
          `${d.player_name}\n${d.team_abbreviation}\n${x}: ${d[x]}\n${y}: ${d[y]}`,
      }),
    ),
  ],
})
display(graph)
```

```js
const x = "reb_diff"
const y = "pt_diff"
const data = sliceQuantile(
  allPlayers,
  "min_a",
  (100 - percentile) / 100,
).filter(d => d[x] > 0 && d[y] > 0 && d[x] + d[y] > 2)
const graph = Plot.plot({
  width: 800,
  height: 800,
  title: "Points per 36 and Rebounds per 36 change",
  subtitle: `difference between ${year} and ${year - 1}. Top ${percentile}% by minutes, improvements only`,
  x: {
    inset: 50,
    nice: true,
    ticks: 5,
    label: "Difference in rebounds per 36",
    labelAnchor: "center",
  },
  y: {
    nice: true,
    ticks: 5,
    label: "Difference in points per 36",
    labelAnchor: "center",
    labelOffset: 38,
  },
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
        title: d =>
          `${d.player_name}\n${d.team_abbreviation}\n${x}: ${d[x]}\n${y}: ${d[y]}`,
      }),
    ),
  ],
})
display(graph)
```

```js
const x = "usg_diff"
const y = "ts_diff"
const data = sliceQuantile(
  allPlayers,
  "min_a",
  (100 - percentile) / 100,
).filter(d => d[x] > 0 && d[y] > 0 && d[x] + d[y] > 0.04)
const graph = Plot.plot({
  width: 800,
  height: 800,
  marginLeft: 50,
  title: "Who's scoring more efficiently?",
  subtitle: `Usage and TS% increase ${year} -> ${year - 1}. Top ${percentile}% by minutes, positive only`,
  x: {
    inset: 50,
    nice: true,
    ticks: 5,
    label: "Increase in usage",
    labelAnchor: "center",
  },
  y: {
    nice: true,
    ticks: 5,
    label: "Increase true shooting %",
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
display(graph)
```

```js
const x = "usg_diff"
const y = "sum_diff"
const data = sliceQuantile(allPlayers, "min_a", (100 - percentile) / 100)
const graph = Plot.plot({
  width: 800,
  height: 800,
  title: "change in true shooting % + rebound % + assist %",
  subtitle: `difference between ${year} and ${year - 1}. Top ${percentile}% by minutes`,
  x: {
    inset: 50,
    nice: true,
    ticks: 5,
    label: "Difference in usage",
    labelAnchor: "center",
  },
  y: {
    nice: true,
    ticks: 5,
    label: "Difference in ts% + reb% + ast%",
    labelAnchor: "center",
    labelOffset: 38,
  },
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
        title: d =>
          `${d.player_name}\n${d.team_abbreviation}\n${x}: ${d[x]}\n${y}: ${d[y]}`,
      }),
    ),
  ],
})
display(graph)
```

```js
const x = "usg_diff"
const y = "sum_diff"
const data = sliceQuantile(
  allPlayers,
  "min_a",
  (100 - percentile) / 100,
).filter(d => d.usg_diff > 0.01 && d.sum_diff > 0.01)
const graph = Plot.plot({
  width: 400,
  height: 400,
  title: "change in true shooting % + rebound % + assist %",
  subtitle: `difference between ${year} and ${year - 1}. Top ${percentile}% by minutes, >1% improvement only`,
  grid: true,
  x: {
    insetLeft: 80,
    nice: true,
    ticks: 5,
    label: "Difference in usage",
    labelAnchor: "center",
  },
  y: {
    nice: true,
    ticks: 5,
    label: "Difference in ts% + reb% + ast%",
    labelAnchor: "center",
    labelOffset: 40,
  },
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
        title: d =>
          `${d.player_name}\n${d.team_abbreviation}\n${x}: ${d[x]}\n${y}: ${d[y]}`,
      }),
    ),
  ],
})
display(graph)
```

```js
const x = "ts_diff"
const y = "reb_ast_diff"
const data = sliceQuantile(
  allPlayers,
  "min_a",
  (100 - percentile) / 100,
).filter(p => p.ts_diff > -0.05 && p.reb_ast_diff > -0.05)
const graph = Plot.plot({
  grid: true,
  width: 800,
  height: 800,
  title: "change in true shooting vs change in rebound % + assist %",
  subtitle: `difference between ${year} and ${year - 1}. Top ${percentile}% by minutes`,
  x: {
    inset: 50,
    nice: true,
    ticks: 5,
    label: "Difference in true shooting",
    labelAnchor: "center",
    labelOffset: 40,
  },
  y: {
    nice: true,
    ticks: 5,
    label: "Difference in reb% + ast%",
    labelAnchor: "center",
    labelOffset: 48,
  },
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
const salaries = await FileAttachment("data/bbref_salaries.json").json()
const salPlayers = []
for (const player of allPlayers.filter(p => p.year_a == Number(year))) {
  const match = salaries.find(s => s.player === player.player_name)
  const p = { ...player }
  if (match) {
    p.salaries = match
    salPlayers.push(p)
  }
  salPlayers.push(p)
}
display(salPlayers)
const lowSal = salPlayers.filter(
  p => p.salaries?.remain_gtd < 30_000_000 || !p.salaries,
)
const x = "ts_diff"
const y = "reb_ast_diff"
const data = sliceQuantile(lowSal, "min_a", (100 - percentile) / 100)
const graph = Plot.plot({
  grid: true,
  width: 800,
  height: 800,
  title: "change in true shooting vs change in rebound % + assist %",
  subtitle: `difference between ${year} and ${year - 1}. Top ${percentile}% by minutes, among players with <$30mil guaranteed contract`,
  x: {
    inset: 50,
    nice: true,
    ticks: 5,
    label: "Difference in true shooting",
    labelAnchor: "center",
    labelOffset: 40,
  },
  y: {
    nice: true,
    ticks: 5,
    label: "Difference in reb% + ast%",
    labelAnchor: "center",
    labelOffset: 48,
  },
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
