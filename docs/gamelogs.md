---
theme: cotton
title: Game logs
toc: false
sql:
  gamelogs: ./data/gamelogs.parquet
---

# Game logs

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

<!-- turn this on when you want to see the game log table for dev
```sql echo display
SELECT *
FROM gamelogs
WHERE season_year=${season_year}
ORDER BY game_date desc;
```
-->

```sql id=gamelist
SELECT a.game_id,
    strftime(strptime(a.game_date, '%Y-%m-%dT%H:%M:%S'), '%B %d, %Y') as game_date,
    a.team_name team_a,
    a.pts pts_a,
    a.off_rating off_rtg_a,
    b.team_name team_b,
    b.pts pts_b,
    b.off_rating off_rtg_b
FROM gamelogs a
INNER JOIN gamelogs b
  ON a.game_id = b.game_id and a.pts > b.pts
WHERE a.season_year=${season_year}
ORDER BY a.game_id desc;
```

```js
const div = d3.create("div");
const games = gamelist.toArray();
const gamesByDate = d3.group(games, (g) => g.game_date);

// Right now I have to pad the values of off_rtg because black text isn't
// readable against the darkest green or purple. It would be better to choose a
// contrasting text color in that case, but I haven't yet figured out how to do so
const pad =
  (n) =>
  ([a, b]) => [a * n, b * (1 + (1 - n))];
const colorScale = d3
  //.scaleLinear()
  // .scaleDiverging(d3.interpolatePRGn)
  .scaleSequential(d3.interpolatePRGn)
  .domain(
    pad(0.8)(d3.extent(games.flatMap((g) => [g.off_rtg_a, g.off_rtg_b]))),
  );
// .range(["purple", "green"]);

// Create a table for each game
div
  .selectAll("div")
  .data(gamesByDate)
  .enter()
  .append("div")
  .each(function (gamesOnDate) {
    const dateDiv = d3.select(this);
    const date = gamesOnDate[0];

    // Add the date header
    dateDiv.append("h3").text(`${date}`);

    // Add a table for each game on this date
    dateDiv
      .selectAll("table")
      .data(gamesOnDate[1])
      .enter()
      .append("table")
      .html(
        (game) => `
          <tr>
            <td width="130" style="text-align: center">${game.team_a}</td>
            <td width="30" style="text-align: center">${game.pts_a}</td>
            <td width="50" style="text-align: center; background-color: ${colorScale(game.off_rtg_a)}; color: black">${game.off_rtg_a}</td>
            <td width="50" style="text-align: center; background-color: ${colorScale(game.off_rtg_b)}; color: black">${game.off_rtg_b}</td>
            <td width="30" style="text-align: center">${game.pts_b}</td>
            <td width="130" style="text-align: center">${game.team_b}</td>
          </tr>
        `,
      )
      .style("margin-bottom", "10px");
  });

display(div.node());
```
