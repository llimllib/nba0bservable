---
theme: cotton
title: Player trailing efficiency
toc: false
sql:
  gamelogs: ./data/gamelogs.parquet
  playerlogs: ./data/playerlogs.parquet
---

```js
import { teams } from "./lib/teams.js"
import { label } from "./lib/labels.js"
import { sliceQuantile } from "./lib/util.js"
```

```js
const seasons = [...Array(11).keys()].map(
  x => String(x + 2014) + "-" + String(x + 15),
)
const season_year = view(
  Inputs.select(seasons, { value: "2024-25", label: "year" }),
)
```

<!-- uncomment to show a table of all available stats
```sql id=all
SELECT * FROM playerlogs pl, gamelogs gl
WHERE pl.gameid=gl.game_id
  AND pl.teamTricode=gl.team_abbreviation
  AND gl.season_year=${season_year}
  AND pl.minutes != ''
ORDER BY game_date
```

```js
Inputs.table(all)
```
-->

```sql id=players
-- TODO: right now we only have 24-25 game logs; it would be cool to show a
-- player's career progress through their whole career
-- TODO: apparently Jakob Pöltl is in here with both Pöltl and Poetl, sigh
SELECT gl.game_date, pl.firstName ||' '|| pl.familyName as name, pl.points,
  pl.fieldGoalsMade fg, pl.fieldGoalsAttempted fga, pl.freeThrowsAttempted fta,
  pl.freeThrowsMade ft, pl.reboundsOffensive orb, pl.reboundsDefensive drb, pl.
  steals, pl.assists, pl.blocks, pl.foulsPersonal pf, pl.turnovers tov,
  pl.usagePercentage usage, pl.trueShootingPercentage ts_pct
FROM playerlogs pl, gamelogs gl
WHERE pl.gameid=gl.game_id
  AND pl.teamTricode=gl.team_abbreviation
  AND gl.season_year=${season_year}
  AND pl.minutes != ''
ORDER BY game_date
```

```js
const player = view(
  Inputs.select(
    new Set(
      players
        .toArray()
        .map(p => p.name)
        .sort(),
    ),
    { value: "Jayson Tatum", label: "player" },
  ),
)
```

```sql id=playerraw
SELECT *
FROM playerlogs
```

```js
// Inputs.table(playerraw)
```

```sql id=gamesraw
SELECT *
FROM gamelogs
```

```js
// Inputs.table(gamesraw)
```

```js
const plogs = players
  .toArray()
  .filter(p => p.name == player)
  .map(p => {
    // the sql query results in proxy objects we can't add an attribute to
    p = { ...p }
    p.game_date = new Date(p.game_date)
    // Hollinger game score:
    // PTS + 0.4 * FG - 0.7 * FGA - 0.4*(FTA - FT) + 0.7 * ORB + 0.3 * DRB +
    // STL + 0.7 * AST + 0.7 * BLK - 0.4 * PF - TOV
    p.gamescore =
      p.points +
      0.4 * p.fg -
      0.7 * p.fga -
      0.4 * (p.fta - p.ft) +
      0.7 * p.orb +
      0.3 * p.drb +
      p.steals +
      0.7 * p.assists +
      0.7 * p.blocks -
      0.4 * p.pf -
      p.tov
    return p
  })
// display(Inputs.table(plogs))
```

```js
const n = view(
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
    subtitle: `${n}-day rolling window`,
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
      Plot.dot(plogs, {
        x: "game_date",
        y: "gamescore",
        fill: "green",
        stroke: null,
      }),
      Plot.lineY(plogs, Plot.windowY({ k: n, anchor: "end" }, { x, y })),
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
const y = "usage"
display(
  Plot.plot({
    title: `Usage for ${player}`,
    subtitle: `${n}-day rolling window`,
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
      Plot.lineY(plogs, Plot.windowY({ k: n, anchor: "end" }, { x, y })),
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
    subtitle: `${n}-day rolling window`,
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
      Plot.lineY(plogs, Plot.windowY({ k: n, anchor: "end" }, { x, y })),
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
