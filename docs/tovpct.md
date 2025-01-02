---
theme: cotton
title: Turnover % games
sql:
  gamelogs: ./data/gamelogs.parquet
  playerlogs: ./data/playerlogs.parquet
---

# Turnover percentages

```js
import { teams } from "./lib/teams.js"
```

```sql
SELECT * from gamelogs
```

```sql id=games
-- SELECT team_abbreviation, matchup, tm_tov_pct
-- FROM gamelogs
-- WHERE season_year='2024'
SELECT a.game_id,
    strftime(strptime(a.game_date, '%Y-%m-%dT%H:%M:%S'), '%B %d, %Y') as game_date,
    a.team_id team_id_a,
    a.team_abbreviation team_abb,
    a.team_name team,
    b.tm_tov_pct opp_tov_pct
FROM gamelogs a
INNER JOIN gamelogs b
  ON a.game_id = b.game_id and a.team_id!=b.team_id
WHERE a.season_year='2024-25'
ORDER BY opp_tov_pct desc
```

```js
display(Inputs.table(games))
```

```js
Plot.plot({
  width: 1024,
  marks: [Plot.dot(games, { y: "team", x: "opp_tov_pct" })],
})
```

Let's figure out how to sort the teams by median opp_tov_pct

```js echo
// https://observablehq.com/@d3/d3-groupsort
const teams_by_opp_tov = d3.groupSort(
  games,
  g => -d3.median(g, d => d.opp_tov_pct),
  d => d.team_abb,
)
```

```js
Plot.plot({
  title: "Opponent turnover percentage",
  subtitle: "As of 12/30",
  y: {
    domain: teams_by_opp_tov,
    label: null,
  },
  x: { inset: 10, label: "opponent turnover percentage", percent: true },
  marks: [
    Plot.boxX(games, {
      y: "team_abb",
      x: "opp_tov_pct",
      fill: d => teams.get(d.team_abb).colors[0],
      fillOpacity: 0.8,
      stroke: d => teams.get(d.team_abb).colors[0],
    }),
  ],
})
```

```sql id=thunder
-- SELECT team_abbreviation, matchup, tm_tov_pct
-- FROM gamelogs
-- WHERE season_year='2024'
SELECT
    strftime(strptime(a.game_date, '%Y-%m-%dT%H:%M:%S'), '%B %d, %Y') as game_date,
    a.team_abbreviation team_abb,
    b.team_abbreviation opp_abb,
    b.tm_tov_pct*100 opp_tov_pct,
FROM gamelogs a
INNER JOIN gamelogs b
  ON a.game_id = b.game_id and a.team_id!=b.team_id
WHERE a.season_year='2024-25' AND team_abb='OKC'
ORDER BY opp_tov_pct desc
```

```js
display(Inputs.table(thunder))
```
