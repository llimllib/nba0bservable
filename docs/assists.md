---
theme: cotton
title: Assists to turnovers
toc: false
sql:
  players: ./data/playerstats.parquet
---

# Assists to turnovers

```js
import { teams } from "./lib/teams.js";
import { label } from "./lib/labels.js";
import { sliceQuantile } from "./lib/util.js";
```

```js
const year = view(
  Inputs.range([2014, 2025], { value: "2025", label: "year", step: 1 }),
);
```

```sql id=assists
SELECT player_name, team_abbreviation, ast, tov
FROM players
WHERE year=${year};
```

```js
const x = "tov";
const y = "ast";
const data = assists.toArray().filter((d) => d.ast > 20);
const title = "Assists to Turnovers";
const maxX = d3.max(data, (d) => d[x]);
const maxY = d3.max(data, (d) => d[y]);
display(
  Plot.plot({
    width: 800,
    height: 800,
    title: title,
    marginRight: 40,
    grid: true,
    x: {
      domain: [0, maxX],
      nice: true,
      ticks: 5,
      zero: true,
      label: "turnovers",
    },
    y: {
      domain: [0, maxY],
      nice: true,
      ticks: 5,
      zero: true,
      label: "assists",
    },
    marks: [
      Plot.line(
        [
          { x: 0, y: 0 },
          { x: maxX, y: maxX },
        ],
        { x: "x", y: "y", strokeOpacity: 0.3 },
      ),
      Plot.line(
        [
          { x: 0, y: 0 },
          { x: maxX, y: 2 * maxX },
        ],
        { x: "x", y: "y", strokeOpacity: 0.3 },
      ),
      // the 3x here would extend the line vertically, so I use
      // explicit domains above to constrain it
      Plot.line(
        [
          { x: 0, y: 0 },
          { x: maxX, y: 3 * maxX },
        ],
        { x: "x", y: "y", strokeOpacity: 0.3 },
      ),
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
        fill: (d) => teams.get(d.team_abbreviation).colors[0],
        stroke: (d) => teams.get(d.team_abbreviation).colors[1],
        r: 8,
      }),
      Plot.tip(
        data,
        Plot.pointer({
          x,
          y,
          title: (d) => `${d.player_name}\n${x}: ${d[x]}\n${y}: ${d[y]}`,
        }),
      ),
    ],
  }),
);
```
