---
theme: cotton
title: NBA Graphics
toc: false
sql:
  players: ./data/playerstats.parquet
---

# NBA graphics

```js
import { teams } from "./lib/teams.js";
import { label } from "./lib/labels.js";
import { sliceQuantile } from "./lib/util.js";
```

```sql id=players
SELECT * FROM players WHERE year=2025
```

<!-- https://duckdb.org/docs/sql/functions/aggregates.html -->

```sql id=threepoints
SELECT player_name, team_abbreviation, fg3m, fg3a, fg3a_per36, fg3_pct
FROM players
WHERE year=2025;
  -- AND fg3a + fg3m >= (
  --   SELECT PERCENTILE_CONT(0.75) WITHIN GROUP (ORDER BY fg3a) +
  --          PERCENTILE_CONT(0.75) WITHIN GROUP (ORDER BY fg3m)
  --   FROM players
  --   WHERE year=2025
  -- );
```

```sql id=metadata display
-- parquet metadata functions are missing, see:
-- https://github.com/observablehq/framework/discussions/1813
-- select * from parquet_file_metadata('https://raw.githubusercontent.com/llimllib/nba_data/refs/heads/main/data/playerstats.parquet');
```

```js
const x = "fg3a";
const y = "fg3m";
const data = threepoints;
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
    x: { nice: true, ticks: 5 },
    y: { nice: true, ticks: 5 },
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

```sql id=assists
SELECT player_name, team_abbreviation, ast, tov
FROM players
WHERE year=2025;
```

```js
const x = "ast";
const y = "tov";
const data = assists.toArray().filter((d) => d.ast > 20);
const title = "Assists to Turnovers";
display(
  Plot.plot({
    width: 800,
    height: 800,
    title: title,
    marginRight: 40,
    grid: true,
    x: { nice: true, ticks: 5, zero: true },
    y: { nice: true, ticks: 5, zero: true },
    marks: [
      Plot.line(
        [
          { x: 0, y: 0 },
          { x: d3.max(data, (d) => d[x]), y: d3.max(data, (d) => d[y]) },
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

```sql id=steals
SELECT player_name, team_abbreviation, stl, blk
FROM players
WHERE year=2025
  AND (stl >= (
    SELECT PERCENTILE_CONT(0.85) WITHIN GROUP (order by stl)
    FROM players
    WHERE year=2025)
  OR blk >= (
    SELECT PERCENTILE_CONT(0.85) WITHIN GROUP (order by blk)
    FROM players
    WHERE year=2025))
```

```js
const x = "stl";
const y = "blk";
const data = steals.toArray();
const title = "Steals and Blocks";
display(
  Plot.plot({
    width: 800,
    height: 800,
    title: title,
    marginRight: 40,
    grid: true,
    x: { nice: true, ticks: 5, zero: true },
    y: { nice: true, ticks: 5, zero: true },
    marks: [
      Plot.line(
        [
          { x: 0, y: 0 },
          { x: d3.max(data, (d) => d[x]), y: d3.max(data, (d) => d[y]) },
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

```sql show
DESCRIBE players
```
