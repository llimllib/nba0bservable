---
theme: cotton
title: Shooting Efficiency
toc: false
sql:
  players: ./data/playerstats.parquet
---

# Shooting Efficiency

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
    label: "top x% in fga",
    step: 5,
  }),
);
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
console.log(selectedTeams);
const teamFilter =
  selectedTeams.length > 0
    ? `AND team_abbreviation in (${selectedTeams.map((t) => `'${t.abbreviation}'`).join(",")});`
    : "";
console.log("teamFilter", teamFilter);
```

```js
console.log(
  `SELECT player_name, team_abbreviation, fga, ts_pct, usg_pct
       FROM players
      WHERE year=${year}
        ${teamFilter}`,
);
const efficiency = await sql([
  `SELECT player_name, team_abbreviation, fga, ts_pct, usg_pct
       FROM players
      WHERE year=${year}
        ${teamFilter}`,
]);

const x = "usg_pct";
const y = "ts_pct";
const data = sliceQuantile(
  efficiency.toArray(),
  "fga",
  (100 - percentile) / 100,
);
const [xMin, xMax] = d3.extent(data, (d) => d[x]);
const [yMin, yMax] = d3.extent(data, (d) => d[y]);
// common options for the explanatory text font
const fontOptions = {
  fontSize: 20,
  fontStyle: "italic",
  //stroke: "black",
  fill: "red",
  opacity: 0.2,
};
display(
  Plot.plot({
    width: 800,
    height: 800,
    title: "shooting efficiency by usage rate",
    subtitle: `top ${percentile}% by fga`,
    marginRight: 40,
    grid: true,
    x: {
      nice: true,
      ticks: 5,
      label: "Usage %",
      labelAnchor: "center",
    },
    y: {
      nice: true,
      ticks: 5,
      label: "True Shooting %",
      labelAnchor: "center",
    },
    marks: [
      // Here's how to draw a rectangle; note that this expands the domain out
      // to start at [0,0]. I might want to do a quadrant chart type thing here?
      // Plot.rect([{ x1: 0, y1: 0, x2: 0.25, y2: 0.6 }], {
      //   fill: "red",
      //   stroke: "black",
      //   x1: "x1",
      //   y1: "y1",
      //   x2: "x2",
      //   y2: "y2",
      // }),
      Plot.text([[xMin + 0.01, yMin]], {
        text: ["Low usage\nPoor efficiency"],
        ...fontOptions,
      }),
      Plot.text([[xMax - 0.01, yMin]], {
        text: ["High usage\nPoor efficiency"],
        ...fontOptions,
      }),
      Plot.text([[xMin + 0.01, yMax]], {
        text: ["Low usage\nGood efficiency"],
        ...fontOptions,
      }),
      Plot.text([[xMax - 0.01, yMax]], {
        text: ["High usage\nGood efficiency"],
        ...fontOptions,
      }),
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
          title: (d) =>
            `${d.player_name}\n${d.team_abbreviation}\n${x}: ${d[x]}\n${y}: ${d[y]}`,
        }),
      ),
    ],
  }),
);
```
