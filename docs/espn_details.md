---
theme: cotton
title: ESPN Player Details
toc: false
sql:
  player_details: ./data/player_details.parquet
  player_box: ./data/player_box.parquet
---

```js
import { label } from "./lib/labels.js"
import { teams } from "./lib/teams.js"
import { sliceQuantile } from "./lib/util.js"
import { CURRENT_SEASON } from "./lib/season.js"
```

```js
const year = view(
  Inputs.range([2019, CURRENT_SEASON], {
    value: CURRENT_SEASON,
    label: "year",
    step: 1,
  }),
)
const percentile = view(
  Inputs.range([5, 100], {
    value: "15",
    label: "top x% in fga/g",
    step: 5,
  }),
)
```

```sql id=twos_vs_threes
WITH shooting AS (
  SELECT game_id,
    player_id,
    any_value(o_net_pts) FILTER (WHERE action_type = '2pt') AS twos,
    any_value(o_net_pts) FILTER (WHERE action_type = '3pt') AS threes
  FROM player_details
  WHERE season = ${year}
  GROUP BY game_id, player_id
)
SELECT b.player_name,
  b.team_abbrev,
  avg(s.twos) AS twos,
  avg(s.threes) AS threes,
  avg(b.fga) AS fga
FROM player_box b
JOIN shooting s USING (game_id, player_id)
WHERE b.season = ${year}
  AND b.game_type = 'regular_season'
GROUP BY b.player_id, b.player_name, b.team_abbrev
```

```js
const x = "twos"
const y = "threes"
const data = sliceQuantile(
  twos_vs_threes.toArray(),
  "fga",
  (100 - percentile) / 100,
)
display(
  Plot.plot({
    grid: true,
    width: 700,
    height: 700,
    x: {
      label: "2PT Net Points per game",
      nice: true,
      ticks: 3,
      inset: 50,
    },
    y: {
      label: "3PT Net Points per game",
      nice: true,
      ticks: 5,
      inset: 0,
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
        fill: d => teams.get(d.team_abbrev).colors[0],
        stroke: d => teams.get(d.team_abbrev).colors[1],
        r: 8,
      }),
      Plot.tip(
        data,
        Plot.pointer({
          x,
          y,
          title: d =>
            `${d.player_name}\n${d.team_abbrev}\n${x}: ${d[x].toFixed(1)}\n${y}: ${d[y].toFixed(1)}`,
        }),
      ),
    ],
  }),
)
```
