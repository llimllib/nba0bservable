---
theme: cotton
title: ESPN Player Details
toc: false
sql:
  player_details: ./data/espn.player_details.parquet
  players: ./data/playerstats.parquet
---

```js
import { label } from "./lib/labels.js"
import { normalizeESPN, teams } from "./lib/teams.js"
import { sliceQuantile } from "./lib/util.js"
```

```js
// console.log("year", (await year.next()).value);
const percentile = view(
  Inputs.range([5, 100], {
    value: "15",
    label: "top x% in fga/g",
    step: 5,
  }),
)
const year = 2025
```

```sql id=twos_vs_threes
select pd.name,
  pd.team,
  sum(pd."2pt_oNetPts") / count(pd."2pt_oNetPts") as twos,
  sum(pd."3pt_oNetPts") / count(pd."3pt_oNetPts") as threes,
  p.fga / count(pd."2pt_oNetPts") fga
from player_details pd, players p
where (pd.gameId LIKE '00225%' or pd.gameId LIKE '00325%')
  and p.year = '2026'
  and pd.playerId = p.player_id
group by playerId, name, team, fga
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
        label: "name",
        padding: 10,
        minCellSize: 2000,
      }),
      Plot.dot(data, {
        x,
        y,
        fill: d => teams.get(normalizeESPN(d.team)).colors[0],
        stroke: d => teams.get(normalizeESPN(d.team)).colors[1],
        r: 8,
      }),
      Plot.tip(
        data,
        Plot.pointer({
          x,
          y,
          title: d =>
            `${d.name}\n${d.team}\n${x}: ${d[x].toFixed(1)}\n${y}: ${d[y].toFixed(1)}`,
        }),
      ),
    ],
  }),
)
```
