---
theme: cotton
title: Game logs
toc: false
sql:
  gamelogs: ./data/gamelogs.parquet
---

# Assists to turnovers

```js
import { teams } from "./lib/teams.js";
import { label } from "./lib/labels.js";
import { sliceQuantile } from "./lib/util.js";
```

```js
const seasons = [...Array(11).keys()].map(
  (x) => String(x + 2014) + "-" + String(x + 15),
);
const season_year = view(
  Inputs.select(seasons, { value: "2025", label: "year" }),
);
```

```sql echo display
SELECT *
FROM gamelogs
WHERE season_year=${season_year}
ORDER BY game_date desc;
```

```sql echo display
SELECT a.game_id, a.team_name team_a, a.pts pts_a, b.team_name team_b, b.pts pts_b
FROM gamelogs a
INNER JOIN gamelogs b
  ON a.game_id = b.game_id and a.team_id < b.team_id
WHERE a.season_year=${season_year}
ORDER BY a.game_id desc;
```
