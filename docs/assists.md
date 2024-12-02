---
theme: cotton
title: Assists to turnovers
toc: false
sql:
  players: ./data/playerstats.parquet
---

# Assists to turnovers

```js
import { teams } from "./lib/teams.js"
import { label } from "./lib/labels.js"
import { sliceQuantile } from "./lib/util.js"
```

```js
const year = view(
  Inputs.range([2014, 2025], { value: "2025", label: "year", step: 1 }),
)
const percentile = view(
  Inputs.range([5, 100], {
    value: "15",
    label: "top x% in minutes",
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

```sql id=assists
SELECT player_name, team_abbreviation, ast, tov, min
FROM players
WHERE year=${year};
```

```js
const x = "tov"
const y = "ast"
const selectedAbbrev = selectedTeams.map(t => t.abbreviation)
const active = sliceQuantile(assists.toArray(), "min", (100 - percentile) / 100)
display(active)
const data = active.filter(d =>
  selectedAbbrev.length > 0
    ? selectedAbbrev.includes(d.team_abbreviation)
    : true,
)
const title = "Assists to Turnovers"
const maxX = d3.max(active, d => d[x])
const maxY = d3.max(active, d => d[y])
const fontOptions = {
  fontSize: 20,
  fontStyle: "italic",
  //stroke: "black",
  fill: "red",
  opacity: 0.4,
}
display(
  Plot.plot({
    width: 800,
    height: 800,
    title: title,
    subtitle: `top ${percentile}% in minutes played`,
    marginRight: 40,
    grid: true,
    x: {
      domain: [0, maxX],
      nice: true,
      ticks: 5,
      zero: true,
      label: "turnovers",
    },
    y: {
      domain: [0, maxY],
      nice: true,
      ticks: 5,
      zero: true,
      label: "assists",
    },
    marks: [
      Plot.text([[maxX - 5, maxX - 2]], { text: ["1:1"], ...fontOptions }),
      Plot.text([[maxX - 5, 2 * maxX - 5]], { text: ["2:1"], ...fontOptions }),
      Plot.text([[maxX - 5, 3 * maxX - 10]], {
        text: ["3:1"],
        ...fontOptions,
      }),
      Plot.line(
        [
          { x: 0, y: 0 },
          { x: maxX, y: maxX },
        ],
        { x: "x", y: "y", strokeOpacity: 0.3 },
      ),
      Plot.line(
        [
          { x: 0, y: 0 },
          { x: maxX, y: 2 * maxX },
        ],
        { x: "x", y: "y", strokeOpacity: 0.3 },
      ),
      // the 3x here would extend the line vertically, so I use
      // explicit domains above to constrain it
      Plot.line(
        [
          { x: 0, y: 0 },
          { x: maxX, y: 3 * maxX },
        ],
        { x: "x", y: "y", strokeOpacity: 0.3 },
      ),
      showBackground
        ? Plot.dot(active, { x, y, fill: "grey", fillOpacity: 0.15, r: 8 })
        : null,
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
        fill: d => teams.get(d.team_abbreviation).colors[0],
        stroke: d => teams.get(d.team_abbreviation).colors[1],
        r: 8,
      }),
      Plot.tip(
        data,
        Plot.pointer({
          x,
          y,
          title: d => `${d.player_name}\n${x}: ${d[x]}\n${y}: ${d[y]}`,
        }),
      ),
    ],
  }),
)
```
