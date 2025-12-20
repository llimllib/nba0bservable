---
theme: cotton
title: Player Timeseries
toc: false
sql:
  players: ./data/espn.players.parquet
  gamelogs: ./data/gamelogs.parquet
---

```sql id=alldata
SELECT *
FROM players
WHERE game_id LIKE '002%' or game_id LIKE '003%'
ORDER by game_id asc
-- ESPN data uses the start year not end year; 2025 -> 25-26
-- where season=2025
-- regular season and cup
-- limit to playoffs:
-- and game_id LIKE '004%'
;
```

```js
// display(Inputs.table(alldata))
```

```sql id=agg
SELECT
  name,
  team,
  count(*) n,
  sum(oNetPts) oNetPts,
  sum(dNetPts) dNetPts,
  sum(tNetPts) tNetPts,
  -- Q: should I add 'and minutes_played != 0? Are we getting incorrect
  --    per-game stats?
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

_TODO_: display a table of all players with this year's total net?

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
