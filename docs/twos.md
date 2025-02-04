---
theme: cotton
title: two-point shooting
toc: false
sql:
  players: ./data/playerstats.parquet
---

# two Point Shooting

```js
import { sql } from "npm:@observablehq/duckdb"

import { teams } from "./lib/teams.js"
import { label } from "./lib/labels.js"
import { sliceQuantile } from "./lib/util.js"
```

```js
const year = view(
  Inputs.range([2014, 2025], { value: "2025", label: "year", step: 1 }),
)
// console.log("year", (await year.next()).value);
const percentile = view(
  Inputs.range([5, 100], {
    value: "15",
    label: "top x% in 2pa",
    step: 5,
  }),
)
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
console.log(selectedTeams)
const teamFilter =
  selectedTeams.length > 0
    ? `AND team_abbreviation in (${selectedTeams.map(t => `'${t.abbreviation}'`).join(",")});`
    : ""
console.log("teamFilter", teamFilter)
```

```js
console.log(
  `SELECT player_name, team_abbreviation, fg2m, fg2a, fg2a_frequency, fg2_pct, (fg2a/min)*36 as fg2a_per36
       FROM players
      WHERE year=${year}
        ${teamFilter}`,
)
const twopoints = await sql([
  `SELECT player_name, team_abbreviation, fg2m, fg2a, fg2a_frequency, fg2_pct, (fg2a/min)*36 as fg2a_per36
       FROM players
      WHERE year=${year}
        ${teamFilter}`,
])

const x = "fg2a_per36"
const y = "fg2_pct"
const data = sliceQuantile(
  twopoints.toArray(),
  "fg2a",
  (100 - percentile) / 100,
)
display(
  Plot.plot({
    width: 800,
    height: 800,
    title: "two-point shooting percentage by rate",
    subtitle: `top ${percentile}% by 2pfga`,
    marginRight: 40,
    grid: true,
    x: {
      nice: true,
      ticks: 5,
      label: "2 point field goals per 36",
      labelAnchor: "center",
    },
    y: {
      nice: true,
      ticks: 5,
      label: "2-point field goal %",
      labelAnchor: "center",
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
  }),
)
```

```js
const x = "fg2a"
const y = "fg2m"
const data = twopoints
display(
  Plot.plot({
    width: 800,
    height: 800,
    title: "two-point shooting aggregate",
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
