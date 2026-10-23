---
theme: cotton
title: Player trailing efficiency
toc: false
sql:
  playerlogs: ./data/player_game_logs.parquet
---

```js
import { teams } from "./lib/teams.js"
import { CURRENT_SEASON } from "./lib/season.js"
import { label } from "./lib/labels.js"
import { sliceQuantile } from "./lib/util.js"
```

```js
const seasons = d3.range(2015, CURRENT_SEASON + 1)
const season = view(
  Inputs.select(seasons, {
    value: CURRENT_SEASON,
    label: "year",
    format: y => `${y - 1}-${String(y).slice(2)}`,
  }),
)
```

<!-- uncomment to show a table of all available stats
```sql id=all
SELECT * FROM playerlogs
WHERE season=${season}
ORDER BY game_date
```

```js
Inputs.table(all)
```
-->

```sql id=players
-- TODO: it would be cool to show a player's career progress through their
-- whole career
SELECT game_date, player_name, pts, fgm, fga, fta, ftm, oreb, dreb, stl, ast,
  blk, pf, tov, usg_pct, ts_pct
FROM playerlogs
WHERE season=${season}
ORDER BY game_date
```

```js
const player = view(
  Inputs.select(
    new Set(
      players
        .toArray()
        .map(p => p.player_name)
        .sort(),
    ),
    { value: "Jayson Tatum", label: "player" },
  ),
)
```

<!-- uncomment to show the raw player logs for the season
```sql id=playerraw
SELECT *
FROM playerlogs
WHERE season=${season}
```

```js
Inputs.table(playerraw)
```
-->

```js
const plogs = players
  .toArray()
  .filter(p => p.player_name == player)
  .map(p => {
    // the sql query results in proxy objects we can't add an attribute to
    p = { ...p }
    p.game_date = new Date(p.game_date)
    // Hollinger game score:
    // PTS + 0.4 * FG - 0.7 * FGA - 0.4*(FTA - FT) + 0.7 * ORB + 0.3 * DRB +
    // STL + 0.7 * AST + 0.7 * BLK - 0.4 * PF - TOV
    p.gamescore =
      p.pts +
      0.4 * p.fgm -
      0.7 * p.fga -
      0.4 * (p.fta - p.ftm) +
      0.7 * p.oreb +
      0.3 * p.dreb +
      p.stl +
      0.7 * p.ast +
      0.7 * p.blk -
      0.4 * p.pf -
      p.tov
    return p
  })
// display(Inputs.table(plogs))
```

```js
const k = view(
  Inputs.range([2, 15], {
    value: "5",
    label: "size of window",
    step: 1,
  }),
)
```

```js
const x = "game_date"
const y = "gamescore"

display(
  Plot.plot({
    title: `Game scores for ${player}`,
    subtitle: `${k}-game rolling window`,
    grid: true,
    x: {
      nice: true,
      label: "game date",
    },
    y: {
      nice: true,
      ticks: 5,
      zero: true,
      label: "game score",
    },
    marks: [
      // Plot.areaY(plogs, {
      //   x,
      //   y: Plot.windowY(
      //     {
      //       k,
      //       anchor: "end",
      //       reduce: values => {
      //         const mean = values.reduce((a, b) => a + b, 0) / values.length
      //         const variance =
      //           values.reduce((a, b) => a + Math.pow(b - mean, 2), 0) /
      //           values.length
      //         return mean - Math.sqrt(variance)
      //       },
      //     },
      //     { x, y },
      //   ),
      //   //y2: Plot.windowY(
      //   //  {
      //   //    k,
      //   //    anchor: "end",
      //   //    reduce: values => {
      //   //      const mean = values.reduce((a, b) => a + b, 0) / values.length
      //   //      const variance =
      //   //        values.reduce((a, b) => a + Math.pow(b - mean, 2), 0) /
      //   //        values.length
      //   //      return mean + Math.sqrt(variance)
      //   //    },
      //   //  },
      //   //  { x, y },
      //   //),
      //   fill: "green",
      //   fillOpacity: 0.2,
      //   stroke: null,
      // }),
      Plot.dot(plogs, {
        x: "game_date",
        y: "gamescore",
        fill: "green",
        stroke: null,
      }),
      Plot.lineY(plogs, Plot.windowY({ k, anchor: "end" }, { x, y })),
      // Plot.lineY(
      //   plogs,
      //   Plot.windowY({ k: n, anchor: "end", reduce: "variance" }, { x, y }),
      // ),
      Plot.tip(
        plogs,
        Plot.pointer({
          x,
          y,
          // TODO: formate game date and gamescore
          title: d => `${x}: ${d[x]}\n${y}: ${d[y]}`,
        }),
      ),
    ],
  }),
)
```

```js
const x = "game_date"
const y = "usg_pct"
display(
  Plot.plot({
    title: `Usage for ${player}`,
    subtitle: `${k}-game rolling window`,
    grid: true,
    x: {
      nice: true,
      label: "game date",
    },
    y: {
      nice: true,
      ticks: 5,
      zero: true,
      label: "usage",
    },
    marks: [
      Plot.dot(plogs, {
        x,
        y,
        fill: "green",
        stroke: null,
      }),
      Plot.lineY(plogs, Plot.windowY({ k, anchor: "end" }, { x, y })),
      Plot.tip(
        plogs,
        Plot.pointer({
          x,
          y,
          // TODO: formate game date and gamescore
          title: d => `${x}: ${d[x]}\n${y}: ${d[y]}`,
        }),
      ),
    ],
  }),
)
```

```js
const x = "game_date"
const y = "ts_pct"
display(
  Plot.plot({
    title: `True Shooting for ${player}`,
    subtitle: `${k}-game rolling window`,
    grid: true,
    x: {
      nice: true,
      label: "game date",
    },
    y: {
      nice: true,
      ticks: 5,
      zero: true,
      label: "usage",
    },
    marks: [
      Plot.dot(plogs, {
        x,
        y,
        fill: "green",
        stroke: null,
      }),
      Plot.lineY(plogs, Plot.windowY({ k, anchor: "end" }, { x, y })),
      Plot.tip(
        plogs,
        Plot.pointer({
          x,
          y,
          // TODO: formate game date and gamescore
          title: d => `${x}: ${d[x]}\n${y}: ${d[y]}`,
        }),
      ),
    ],
  }),
)
```
