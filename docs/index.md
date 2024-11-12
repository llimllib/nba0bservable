---
theme: parchment
title: NBA Graphics
toc: false
sql:
  players: ./data/playerstats.parquet
---

```js
import { teams } from "./lib/teams.js";
import { label } from "./lib/labels.ts";
```

```sql id=players display echo
SELECT * FROM players WHERE year=2025
```

```js
const x = "fg3m";
const y = "fg3a";
display(
  Plot.plot({
    width: 800,
    height: 800,
    title: "three-point shooting",
    marks: [
      Plot.dot(players, {
        x,
        y,
        fill: (d) => teams.get(d.team_abbreviation).colors[0],
        stroke: (d) => teams.get(d.team_abbreviation).colors[1],
        r: 100,
      }),
      Plot.tip(
        players,
        Plot.pointer({
          x,
          y,
          title: (d) => `${d.player_name}\n${x}: ${d[x]}\n${y}: ${d[y]}`,
        }),
      ),
      label(players, {
        x,
        y,
        label: "player_name",
        padding: 10,
        minCellSize: 3000,
      }),
    ],
  }),
);
```
