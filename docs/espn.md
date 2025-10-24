---
theme: cotton
title: Net Points
toc: false
sql:
  players: ./data/espn.players.parquet
---

# Net Points

```js
import { espnDiamond } from "./lib/espndiamond.js"
import { teams } from "./lib/teams.js"
```

```sql id=alldata
SELECT * from players
where season=2025
-- regular season and cup
and game_id LIKE '002%' or game_id LIKE '003%'
-- limit to playoffs:
-- and game_id LIKE '004%'
;
```

```js
display(Inputs.table(alldata))
```

```sql id=agg
SELECT
  name,
  team,
  count(*) n,
  sum(oNetPts) oNetPts,
  sum(dNetPts) dNetPts,
  sum(tNetPts) tNetPts,
  sum(oNetPts) / count(*) oNetPtsPerG,
  sum(dNetPts) / count(*) dNetPtsPerG,
  sum(tNetPts) / count(*) tNetPtsPerG,
  sum(
    CAST(SPLIT_PART(minutes_played, ':', 1) AS FLOAT) +
    CAST(SPLIT_PART(minutes_played, ':', 2) AS FLOAT) / 60
  ) AS minutes,
  sum(
    CAST(SPLIT_PART(minutes_played, ':', 1) AS FLOAT) +
    CAST(SPLIT_PART(minutes_played, ':', 2) AS FLOAT) / 60
  ) / count(*) AS minutesPerG,
from players
where season=2025
-- preseason: 001
-- regular season and cup (I think it's 003?)
and game_id LIKE '002%' or game_id LIKE '003%'
-- playoffs
-- and game_id LIKE '004%'
group by player_id, name, team
-- eventually, require a higher n. Maybe set this to something like 10% of the
-- max games value or something?
having n > 0
order by tNetPts desc
```

```js
display(Inputs.table(agg))
```

```js
const year = view(
  Inputs.range([2026, 2026], { value: "2025", label: "year", step: 1 }),
)

// console.log("year", (await year.next()).value);
const percentile = view(
  Inputs.range([5, 100], {
    value: "15",
    label: "top x% by minutes played",
    step: 5,
  }),
)

const showBackground = view(Inputs.toggle({ label: "Show rest of NBA" }))
```

```js
// I don't like the gap that this makes but I can't figure out how to get the
// value of `year` when the page starts up; this logs it after it changes:
// console.log("year", (await year.next()).value);
// but now when the page starts up

// teams that were active in the given year
const teamArr = teams
  .values()
  .toArray()
  .filter(t => t.abbreviation != "TOT")
  .filter(
    t =>
      !t.years || (year >= t.years[0] && (!t.years[1] || year <= t.years[1])),
  )
const selectedTeams = view(
  Inputs.select(teamArr, {
    value: teamArr[0].name,
    label: "team filter",
    format: t => t.name,
    multiple: true,
  }),
)
```

```js
const ts = selectedTeams.map(d => d.espnName || d.abbreviation)
```

```js
display(
  espnDiamond(agg.toArray(), {
    by: "minutes",
    selectedTeams: ts,
    percentile,
    showBackground,
    size: 600,
    title: "Net Points",
  }),
)
```

```js
display(
  espnDiamond(agg.toArray(), {
    by: "minutesPerG",
    selectedTeams: ts,
    percentile,
    showBackground,
    size: 600,
    title: "Net Points per game",
    x: "oNetPtsPerG",
    y: "dNetPtsPerG",
    extraSubtitle: " per game",
  }),
)
```

# single-player charts

```js
const selectedPlayer = view(
  Inputs.select(
    agg
      .toArray()
      .map(p => p.name)
      .sort(),
    {
      value: "AJ Green", // why this not working
      label: "player",
    },
  ),
)
```

```js
const data = alldata
  .toArray()
  .map(p => ({ ...p }))
  .filter(x => x.name == selectedPlayer)
  .sort((a, b) => a.game_id > b.game_id)
let i = 1
data.forEach(pt => {
  pt.gameN = i++
})
console.log(data)
const exploded = data
  .map(pg => {
    return [
      {
        name: pg.name,
        gameN: pg.gameN,
        val: pg.dNetPts,
        tot: pg.tNetPts,
        type: "defensive net points",
      },
      {
        name: pg.name,
        gameN: pg.gameN,
        val: pg.oNetPts,
        tot: pg.tNetPts,
        type: "offensive net points",
      },
    ]
  })
  .flat()
console.log(exploded)
view(
  Plot.plot({
    title: `Postseason net points for ${selectedPlayer}`,
    color: { legend: true, scheme: "BuRd" },
    y: { axis: null },
    facet: { label: "game" },
    marks: [
      Plot.barX(exploded, {
        x: "val",
        y: 1,
        fy: "gameN",
        fill: "type", // d => (d.type === "off" ? "#1f78b4" : "#33a02c"),
      }),
      Plot.ruleX(data, { x: "tNetPts", fy: "gameN" }),
    ],
  }),
)
```
