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
  Inputs.select(seasons, { value: "2024-25", label: "year" }),
);
```

```sql echo display
SELECT *
FROM gamelogs
WHERE season_year=${season_year}
ORDER BY game_date desc;
```

```sql echo id=gamelist
SELECT a.game_id, a.team_name team_a, a.pts pts_a, a.off_rating off_rtg_a, b.team_name team_b, b.pts pts_b, b.off_rating off_rtg_b
FROM gamelogs a
INNER JOIN gamelogs b
  ON a.game_id = b.game_id and a.team_id < b.team_id
WHERE a.season_year=${season_year}
ORDER BY a.game_id desc;
```

```js
function displayGames(gameList, targetDiv) {
  const div = d3.create("div");

  // Helper function to determine color based on offensive rating
  const colorScale = d3
    .scaleLinear()
    .domain(
      d3.extent(gameList.toArray().flatMap((g) => [g.off_rtg_a, g.off_rtg_b])),
    )
    .range(["purple", "green"]);

  // Create a table for each game
  div
    .selectAll("table")
    .data(gameList)
    .enter()
    .append("table")
    .html(
      (game) => `
      <tr>
        <th colspan="3">${game.team_a} vs ${game.team_b}</th>
      </tr>
      <tr>
        <td>${game.team_a}</td>
        <td>${game.pts_a}</td>
        <td style="color: ${colorScale(game.off_rtg_a)};">${game.off_rtg_a}</td>
      </tr>
      <tr>
        <td>${game.team_b}</td>
        <td>${game.pts_b}</td>
        <td style="color: ${colorScale(game.off_rtg_b)};">${game.off_rtg_b}</td>
      </tr>
    `,
    )
    .style("border", "1px solid black")
    .style("margin-bottom", "10px");

  return div.node();
}
display(displayGames(gamelist));
```
