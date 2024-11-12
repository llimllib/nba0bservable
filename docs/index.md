---
theme: parchment
title: NBA Graphics
toc: false
sql:
  players: ./data/playerstats.parquet
---

```js
import { teams } from "./lib/teams.js";
import { label } from "./lib/labels.js";
```

```sql id=players
SELECT * FROM players WHERE year=2025
```

<!-- https://duckdb.org/docs/sql/functions/aggregates.html -->

```sql id=players2 echo
SELECT *
FROM players
WHERE year=2025
  AND fg3a + fg3m >= (
    SELECT PERCENTILE_CONT(0.75) WITHIN GROUP (ORDER BY fg3a) +
           PERCENTILE_CONT(0.75) WITHIN GROUP (ORDER BY fg3m)
    FROM players
    WHERE year=2025
  );
```

```js
const x = "fg3m";
const y = "fg3a";
display(
  Plot.plot({
    width: 800,
    height: 800,
    title: "three-point shooting",
    marginRight: 40,
    grid: true,
    x: { nice: true, ticks: 5, zero: true },
    y: { nice: true, ticks: 5, zero: true },
    marks: [
      label(players2, {
        x,
        y,
        label: "player_name",
        padding: 10,
        minCellSize: 2000,
      }),
      Plot.dot(players2, {
        x,
        y,
        fill: (d) => teams.get(d.team_abbreviation).colors[0],
        stroke: (d) => teams.get(d.team_abbreviation).colors[1],
        r: 8,
      }),
      Plot.tip(
        players2,
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
