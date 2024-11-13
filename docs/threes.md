---
theme: cotton
title: Three-point shooting
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

```sql id=threepoints
SELECT player_name, team_abbreviation, fg3m, fg3a, fg3a_per36, fg3_pct
FROM players
WHERE year=${year};
```

```js
const x = "fg3a_per36";
const y = "fg3_pct";
const data = sliceQuantile(threepoints.toArray(), "fg3a", 0.85);
display(
  Plot.plot({
    width: 800,
    height: 800,
    title: "three-point shooting percentage by rate",
    marginRight: 40,
    grid: true,
    x: {
      nice: true,
      ticks: 5,
      label: "3 point field goals attempted per 36 minutes",
    },
    y: { nice: true, ticks: 5, label: "3-point field goal %" },
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

```js
const x = "fg3a";
const y = "fg3m";
const data = threepoints;
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
