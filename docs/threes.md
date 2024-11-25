---
theme: cotton
title: Three-point shooting
toc: false
sql:
  players: ./data/playerstats.parquet
---

# Three Point Shooting

```js
import { sql } from "npm:@observablehq/duckdb";

import { teams } from "./lib/teams.js";
import { label } from "./lib/labels.js";
import { sliceQuantile } from "./lib/util.js";
```

```js
const year = view(
  Inputs.range([2014, 2025], { value: "2025", label: "year", step: 1 }),
);
// console.log("year", (await year.next()).value);
const percentile = view(
  Inputs.range([5, 100], {
    value: "15",
    label: "top x% in 3pa",
    step: 5,
  }),
);
const showBackground = view(Inputs.toggle({ label: "Show rest of NBA" }));
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
  .filter((t) => t.abbreviation != "TOT")
  .filter(
    (t) =>
      !t.years || (year >= t.years[0] && (!t.years[1] || year <= t.years[1])),
  );
const selectedTeams = view(
  Inputs.select(teamArr, {
    value: teamArr[0].name,
    label: "team filter",
    format: (t) => t.name,
    multiple: true,
  }),
);
```

```js
const activeTeams = selectedTeams.map((t) => t.abbreviation);
const allPlayers = (
  await sql([
    `SELECT player_name, team_abbreviation, fg3m, fg3a, fg3a_per36, fg3_pct
       FROM players
      WHERE year=${year}`,
  ])
).toArray();
console.log(activeTeams, "act");
const threepoints = allPlayers.filter((p) =>
  activeTeams.length > 0 ? activeTeams.includes(p.team_abbreviation) : true,
);

const x = "fg3a_per36";
const y = "fg3_pct";
const data = sliceQuantile(threepoints, "fg3a", (100 - percentile) / 100);
const background = sliceQuantile(allPlayers, "fg3a", (100 - percentile) / 100);
const graph = Plot.plot({
  width: 800,
  height: 800,
  title: "three-point shooting percentage by rate",
  subtitle: `top ${percentile}% by 3pfga`,
  marginRight: 40,
  grid: true,
  x: {
    nice: true,
    ticks: 5,
    label: "3 point field goals attempted per 36 minutes",
    labelAnchor: "center",
    labelOffset: 50,
  },
  y: {
    nice: true,
    ticks: 5,
    label: "3-point field goal %",
    labelAnchor: "center",
    labelOffset: 50,
  },
  marks: [
    label(data, {
      x,
      y,
      label: "player_name",
      padding: 10,
      minCellSize: 2000,
    }),
    showBackground
      ? Plot.dot(background, { x, y, fill: "grey", fillOpacity: 0.15, r: 8 })
      : null,
    Plot.dot(data, {
      x,
      y,
      fill: (d) => teams.get(d.team_abbreviation).colors[0],
      stroke: (d) => teams.get(d.team_abbreviation).colors[1],
      r: 8,
    }),
    Plot.tip(
      data,
      Plot.pointer({
        x,
        y,
        title: (d) =>
          `${d.player_name}\n${d.team_abbreviation}\n${x}: ${d[x]}\n${y}: ${d[y]}`,
      }),
    ),
  ],
});

d3.select(graph)
  .select("svg")
  .style("padding-bottom", "40px")
  .style("overflow", "visible")
  .select('g[aria-label="x-axis label"]')
  .style("font-size", "14px");
d3.select(graph)
  .select('g[aria-label="y-axis label"]')
  .style("font-size", "14px");
display(graph);
```

```js
const x = "fg3a";
const y = "fg3m";
const data = threepoints;
display(
  Plot.plot({
    width: 800,
    height: 800,
    title: "three-point shooting aggregate",
    marginRight: 40,
    grid: true,
    x: { nice: true, ticks: 5, zero: true },
    y: { nice: true, ticks: 5, zero: true },
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
        fill: (d) => teams.get(d.team_abbreviation).colors[0],
        stroke: (d) => teams.get(d.team_abbreviation).colors[1],
        r: 8,
      }),
      Plot.tip(
        data,
        Plot.pointer({
          x,
          y,
          title: (d) => `${d.player_name}\n${x}: ${d[x]}\n${y}: ${d[y]}`,
        }),
      ),
    ],
  }),
);
```
