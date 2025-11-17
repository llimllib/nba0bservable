---
theme: cotton
title: Game logs
toc: false
sql:
  gamelogs: ./data/gamelogs.parquet
  playerlogs: ./data/playerlogs.parquet
---

# Game logs

```js
import { teams } from "./lib/teams.js"
import { label } from "./lib/labels.js"
import { sliceQuantile } from "./lib/util.js"
```

```js
const seasons = [...Array(12).keys()].map(
  x => String(x + 2014) + "-" + String(x + 15),
)
const season_year = view(
  Inputs.select(seasons, { value: "2025-26", label: "year" }),
)
```

```sql id=gamelist
SELECT a.game_id,
    strftime(strptime(a.game_date, '%Y-%m-%dT%H:%M:%S'), '%B %d, %Y') as game_date,
    a.team_id team_id_a,
    a.team_name team_a,
    a.pts pts_a,
    a.off_rating off_rtg_a,
    b.team_id team_id_b,
    b.team_name team_b,
    b.pts pts_b,
    b.off_rating off_rtg_b
FROM gamelogs a
INNER JOIN gamelogs b
  ON a.game_id = b.game_id and a.pts > b.pts
WHERE a.season_year=${season_year}
ORDER BY a.game_date desc;
```

```js
const gameIDs = gamelist
  .toArray()
  .map(g => `'${g.game_id}'`)
  .join(",")
const plogs = (
  await sql([
    `
SELECT gameId, teamId, firstName, familyName, nameI, fieldGoalsMade fg,
    fieldGoalsAttempted fga, freeThrowsMade ft, freeThrowsAttempted fta,
    reboundsOffensive orb, reboundsDefensive drb, assists, steals, blocks,
    turnovers tov, foulsPersonal pf, points
  FROM playerlogs
 WHERE gameId IN (${gameIDs})`,
  ])
)
  .toArray()
  .map(p => {
    // the sql query results in proxy objects we can't add an attribute to
    p = { ...p }
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

// now for each game and each team, have a sorted list of players by gamescore
const teamgames = {}
// TODO: this is where I am; I want an index games[game_id][team_id] that
// returns a list of player logs for that game-team pair sorted by gamescore XXX
```

```js
const div = d3.create("div")
const games = gamelist.toArray()
const gamesByDate = d3.group(games, g => g.game_date)

// Right now I have to pad the values of off_rtg because black text isn't
// readable against the darkest green or purple. It would be better to choose a
// contrasting text color in that case, but I haven't yet figured out how to do so
const pad =
  n =>
  ([a, b]) => {
    const pad = (b - a) * n
    return [a - pad, b + pad]
  }
const colorScale = d3
  .scaleSequential(d3.interpolatePRGn)
  .domain(pad(0.2)(d3.extent(games.flatMap(g => [g.off_rtg_a, g.off_rtg_b]))))

// Create a table for each game
div
  .selectAll("div")
  .data(gamesByDate)
  .enter()
  .append("div")
  .each(function (gamesOnDate) {
    const dateDiv = d3.select(this)
    const date = gamesOnDate[0]

    // Add the date header
    dateDiv.append("h3").text(`${date}`)

    // Add a table for each game on this date
    dateDiv
      .selectAll("div")
      .data(gamesOnDate[1])
      .enter()
      .append("div")
      .append("table")
      .html(
        game => `
          <tr>
            <td width="130" style="text-align: center">${game.team_a}</td>
            <td width="30" style="text-align: center">${game.pts_a}</td>
            <td width="40" style="text-align: center; background-color: ${colorScale(game.off_rtg_a)}; color: black">${game.off_rtg_a}</td>
            <td width="40" style="text-align: center; background-color: ${colorScale(game.off_rtg_b)}; color: black">${game.off_rtg_b}</td>
            <td width="30" style="text-align: center">${game.pts_b}</td>
            <td width="130" style="text-align: center">${game.team_b}</td>
          </tr>
        `,
      )
      .style("margin-bottom", "10px")
  })

display(div.node())
```
