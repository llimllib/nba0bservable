---
theme: cotton
title: Rebounding
toc: false
sql:
  players: ./data/playerstats.parquet
---

# Rebounding

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
const percentile = view(
  Inputs.range([5, 100], {
    value: "15",
    label: "top x% in minutes",
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
const allPlayers = await sql([
  `SELECT player_name, team_abbreviation, min, oreb, dreb, oreb_pct, dreb_pct
       FROM players
      WHERE year=${year}`,
])
const selectedAbbrev = selectedTeams.map(t => t.abbreviation)
const active = allPlayers
  .toArray()
  .filter(d =>
    selectedAbbrev.length > 0
      ? selectedAbbrev.includes(d.team_abbreviation)
      : true,
  )
```

```js
const x = "dreb"
const y = "oreb"
const data = sliceQuantile(active, "min", (100 - percentile) / 100)
// Used if the "show rest of NBA" option is selected, to show the rest of the
// league as background data
const background = sliceQuantile(
  allPlayers.toArray(),
  "min",
  (100 - percentile) / 100,
)
const [xMin, xMax] = d3.extent(showBackground ? background : data, d => d[x])
const [yMin, yMax] = d3.extent(showBackground ? background : data, d => d[y])

// common options for the explanatory text font
const fontOptions = {
  fontSize: 20,
  fontStyle: "italic",
  //stroke: "black",
  fill: "red",
  opacity: 0.2,
}
const graph = Plot.plot({
  width: 800,
  height: 800,
  title: "Rebounding",
  subtitle: `top ${percentile}% by minutes`,
  marginRight: 40,
  grid: true,
  x: {
    nice: true,
    ticks: 5,
    label: "Defensive rebounds",
    labelAnchor: "center",
    labelOffset: 40,
  },
  y: {
    nice: true,
    ticks: 5,
    label: "Offensive rebounds",
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
  .style("padding-bottom", "20px")
  .select("svg")
  .style("overflow", "visible")
  .select('g[aria-label="x-axis label"]')
  .style("font-size", "16px")
d3.select(graph)
  .select('g[aria-label="y-axis label"]')
  .style("font-size", "16px")
display(graph)
```

```js
const x = "dreb_pct"
const y = "oreb_pct"
const data = sliceQuantile(active, "min", (100 - percentile) / 100)
// Used if the "show rest of NBA" option is selected, to show the rest of the
// league as background data
const background = sliceQuantile(
  allPlayers.toArray(),
  "min",
  (100 - percentile) / 100,
)
const [xMin, xMax] = d3.extent(showBackground ? background : data, d => d[x])
const [yMin, yMax] = d3.extent(showBackground ? background : data, d => d[y])

// common options for the explanatory text font
const fontOptions = {
  fontSize: 20,
  fontStyle: "italic",
  //stroke: "black",
  fill: "red",
  opacity: 0.2,
}
const graph = Plot.plot({
  width: 800,
  height: 800,
  title: "Rebounding percentages",
  subtitle: `top ${percentile}% by minutes`,
  marginRight: 40,
  grid: true,
  x: {
    nice: true,
    ticks: 5,
    label: "defensive rebound %",
    labelAnchor: "center",
    labelOffset: 40,
  },
  y: {
    nice: true,
    ticks: 5,
    label: "offensive rebound %",
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
  .style("padding-bottom", "20px")
  .select("svg")
  .style("overflow", "visible")
  .select('g[aria-label="x-axis label"]')
  .style("padding-top", "15px")
  .style("font-size", "16px")
d3.select(graph)
  .select('g[aria-label="y-axis label"]')
  .style("font-size", "16px")
display(graph)
```
