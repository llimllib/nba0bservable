---
theme: cotton
title: NBA Graphics
toc: false
sql:
  players: ./data/playerstats.parquet
---

# NBA graphics

```js
import { sql } from "npm:@observablehq/duckdb"

import { sliceQuantile } from "./lib/util.js"
import { teams } from "./lib/teams.js"
import { label } from "./lib/labels.js"
```

```js
const percentile = 25
const x = "usg_pct"
const y = "ts_pct"
const players = await sql(["SELECT * FROM players WHERE year=2026"])
const data = sliceQuantile(players.toArray(), "fga", (100 - percentile) / 100)
const [xMin, xMax] = d3.extent(data, d => d[x])
const [yMin, yMax] = d3.extent(data, d => d[y])
console.log([xMin, xMax])
console.log([yMin, yMax])

// common options for the explanatory text font
const fontOptions = {
  fontSize: 20,
  fontStyle: "italic",
  //stroke: "black",
  fill: "red",
  opacity: 0.2,
}
display(
  Plot.plot({
    width: 800,
    height: 800,
    title: "shooting efficiency by usage rate",
    subtitle: `top ${percentile}% by fga`,
    marginRight: 40,
    grid: true,
    x: {
      nice: true,
      ticks: 5,
      label: "Usage %",
      labelAnchor: "center",
    },
    y: {
      nice: true,
      ticks: 5,
      label: "True Shooting %",
      labelAnchor: "center",
    },
    marks: [
      // Here's how to draw a rectangle; note that this expands the domain out
      // to start at [0,0]. I might want to do a quadrant chart type thing here?
      // Plot.rect([{ x1: 0, y1: 0, x2: 0.25, y2: 0.6 }], {
      //   fill: "red",
      //   stroke: "black",
      //   x1: "x1",
      //   y1: "y1",
      //   x2: "x2",
      //   y2: "y2",
      // }),
      Plot.text([[xMin + 0.01, yMin]], {
        text: ["Low usage\nPoor efficiency"],
        ...fontOptions,
      }),
      Plot.text([[xMax - 0.01, yMin]], {
        text: ["High usage\nPoor efficiency"],
        ...fontOptions,
      }),
      Plot.text([[xMin + 0.01, yMax]], {
        text: ["Low usage\nGood efficiency"],
        ...fontOptions,
      }),
      Plot.text([[xMax - 0.01, yMax]], {
        text: ["High usage\nGood efficiency"],
        ...fontOptions,
      }),
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
Inputs.table(data, {
  columns: ["player_name", "usg_pct", "ts_pct", "fga"],
})
```
