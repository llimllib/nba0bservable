---
theme: cotton
title: Team Shooting Efficiency
toc: false
sql:
  players: ./data/playerstats.parquet
---

# Team Shooting Efficiency

```js
import { sql } from "npm:@observablehq/duckdb"
import { teams } from "./lib/teams.js"
```

```js
// Get all available years
const yearsResult = await sql([
  `SELECT DISTINCT year FROM players ORDER BY year DESC`,
])
const years = yearsResult.toArray().map(d => d.year)
```

```js
const year = view(
  Inputs.select(years, {
    value: years[0],
    label: "Season",
    format: y => `${y - 1}-${String(y).slice(2)}`,
  }),
)
```

```js
// Aggregate player stats to team level
const teamStats = await sql([
  `SELECT 
    team_abbreviation as team,
    SUM(pts) as pts,
    SUM(fga) as fga,
    SUM(fgm) as fgm,
    SUM(tov) as tov,
    SUM(oreb) as oreb,
    SUM(fta) as fta,
    -- Possessions estimate: FGA + 0.44*FTA + TOV - OREB
    SUM(fga) + 0.44 * SUM(fta) + SUM(tov) - SUM(oreb) as possessions,
    -- Points per FGA
    ROUND(SUM(pts) * 1.0 / SUM(fga), 3) as pts_per_fga,
    -- FGA per possession
    ROUND(SUM(fga) * 1.0 / (SUM(fga) + 0.44 * SUM(fta) + SUM(tov) - SUM(oreb)), 3) as fga_per_poss,
    -- Offensive rating (points per 100 possessions)
    ROUND(SUM(pts) * 100.0 / (SUM(fga) + 0.44 * SUM(fta) + SUM(tov) - SUM(oreb)), 1) as off_rating,
    -- Turnover percentage (turnovers per possession)
    SUM(tov) * 1.0 / (SUM(fga) + 0.44 * SUM(fta) + SUM(tov) - SUM(oreb)) as tov_pct,
    -- Offensive rebound percentage (offensive rebounds / missed shots)
    SUM(oreb) * 1.0 / (SUM(fga) - SUM(fgm)) as oreb_pct,
    -- Free throw rate (FTA per FGA)
    SUM(fta) * 1.0 / SUM(fga) as ftr
  FROM players
  WHERE year = ${year}
    AND team_abbreviation != 'TOT'
  GROUP BY team_abbreviation`,
])

const data = teamStats.toArray()
```

```js
function getName(abbrev) {
  const team = teams.get(abbrev)
  return team ? team.name : abbrev
}

const x = "pts_per_fga"
const y = "fga_per_poss"

// Calculate league averages
const avgX = d3.mean(data, d => d[x])
const avgY = d3.mean(data, d => d[y])

// Scale for dot size based on offensive rating
const [minRating, maxRating] = d3.extent(data, d => d.off_rating)
const sizeScale = d3.scaleSqrt().domain([minRating, maxRating]).range([20, 45])

const graph = Plot.plot({
  width: 600,
  height: 600,
  title: `The Celtics are winning the possession battle`,
  subtitle: "Logo size scaled by offensive rating",
  x: {
    label: "Points per FGA →",
    labelAnchor: "center",
    nice: true,
    ticks: 5,
  },
  y: {
    label: "FGA per Possession",
    labelAnchor: "center",
    nice: true,
    ticks: 5,
  },
  marginLeft: 60,
  marks: [
    // annotations for a published graph, but doesn't apply for all years
    // Plot.text(
    //   data.filter(d => d.team === "BOS"),
    //   {
    //     x,
    //     y,
    //     text: ["Below-average shooting,\nelite possession efficiency"],
    //     dx: 55,
    //     fontSize: 14,
    //     textAnchor: "start",
    //   },
    // ),
    // Plot.arrow(
    //   data.filter(d => d.team === "BOS"),
    //   {
    //     x1: d => d[x] + 0.02,
    //     y1: y,
    //     x2: d => d[x] + 0.009,
    //     y2: y,
    //     stroke: "currentColor",
    //     insetEnd: 0,
    //   },
    // ),
    // Plot.text(
    //   data.filter(d => d.team === "DEN"),
    //   {
    //     x,
    //     y,
    //     text: ["Elite shooting, below-average\npossession efficiency"],
    //     dx: -50,
    //     dy: -50,
    //     fontSize: 14,
    //     lineAnchor: "bottom",
    //     textAnchor: "middle",
    //   },
    // ),
    // Plot.arrow(
    //   data.filter(d => d.team === "DEN"),
    //   {
    //     x1: d => d[x] - 0.012,
    //     y1: d => d[y] + 0.008,
    //     x2: d => d[x] - 0.004,
    //     y2: d => d[y] + 0.004,
    //     stroke: "currentColor",
    //     insetEnd: 0,
    //   },
    // ),
    Plot.image(data, {
      x,
      y,
      width: d => sizeScale(d.off_rating),
      height: d => sizeScale(d.off_rating),
      src: d =>
        `https://llimllib.github.io/nbastats/logos/${getName(d.team)}.svg`,
      title: d =>
        `${getName(d.team)}
Points/FGA: ${d.pts_per_fga}
FGA/Poss: ${d.fga_per_poss}
Off Rating: ${d.off_rating}`,
    }),
    Plot.tip(
      data,
      Plot.pointer({
        x,
        y,
        title: d =>
          `${getName(d.team)}
Points/FGA: ${d.pts_per_fga}
FGA/Poss: ${d.fga_per_poss}
Off Rating: ${d.off_rating}`,
      }),
    ),
    Plot.ruleX([avgX], { stroke: "grey", strokeDasharray: "4,4" }),
    Plot.ruleY([avgY], { stroke: "grey", strokeDasharray: "4,4" }),
  ],
})

display(graph)
```

<div class="note">

**How to read this chart:**

- **X-axis (Points per FGA):** How efficiently a team converts field goal attempts into points. Higher = better shot selection/execution.
- **Y-axis (FGA per Possession):** How often a team takes a field goal attempt per possession. Higher = fewer turnovers and free throw trips.
- **Dot size:** Scaled by offensive rating (points per 100 possessions). Larger = better offense overall.

Teams in the upper-right are both efficient shooters AND take lots of shots (few turnovers/FT trips).

</div>

```js
// Second graph: Components of possession efficiency
const x2 = "tov_pct"
const y2 = "oreb_pct"

// Calculate league averages for second graph
const avgX2 = d3.mean(data, d => d[x2])
const avgY2 = d3.mean(data, d => d[y2])

// Scale for dot size based on free throw rate
const [minFTR, maxFTR] = d3.extent(data, d => d.ftr)
const ftrSizeScale = d3.scaleSqrt().domain([minFTR, maxFTR]).range([20, 45])

const graph2 = Plot.plot({
  width: 600,
  height: 600,
  title: "Components of Possession Efficiency",
  subtitle: "Free throw rate excluded",
  x: {
    label: "Turnover % →",
    labelAnchor: "center",
    nice: true,
    ticks: 5,
    reverse: true,
    tickFormat: d => `${(d * 100).toFixed(0)}%`,
  },
  y: {
    label: "Offensive Rebound %",
    labelAnchor: "center",
    nice: true,
    ticks: 5,
    tickFormat: d => `${(d * 100).toFixed(0)}%`,
  },
  marginLeft: 60,
  marks: [
    Plot.ruleX([avgX2], { stroke: "grey", strokeDasharray: "4,4" }),
    Plot.ruleY([avgY2], { stroke: "grey", strokeDasharray: "4,4" }),
    Plot.text(
      data.filter(d => d.team === "HOU"),
      {
        x: x2,
        y: y2,
        text: ["Many offensive rebounds,\nmany turnovers"],
        dx: 50,
        dy: 40,
        fontSize: 14,
        textAnchor: "start",
      },
    ),
    Plot.arrow(
      data.filter(d => d.team === "HOU"),
      {
        x1: d => d[x2] - 0.006,
        y1: d => d[y2] - 0.006,
        x2: d => d[x2] - 0.0015,
        y2: d => d[y2],
        stroke: "currentColor",
        bend: -30,
      },
    ),
    Plot.text(
      data.filter(d => d.team === "BOS"),
      {
        x: x2,
        y: y2,
        text: ["Above-average offensive rebounds,\nvery few turnovers"],
        dx: -0,
        dy: -80,
        fontSize: 14,
        textAnchor: "end",
      },
    ),
    Plot.arrow(
      data.filter(d => d.team === "BOS"),
      {
        x1: d => d[x2] + 0.006,
        y1: d => d[y2] + 0.02,
        x2: d => d[x2] + 0.0015,
        y2: d => d[y2],
        stroke: "currentColor",
        bend: -30,
      },
    ),
    Plot.text(
      data.filter(d => d.team === "OKC"),
      {
        x: x2,
        y: y2,
        text: ["few offensive rebounds,\nvery few turnovers"],
        dx: -70,
        dy: 20,
        fontSize: 14,
        textAnchor: "end",
      },
    ),
    Plot.arrow(
      data.filter(d => d.team === "OKC"),
      {
        x1: d => d[x2] + 0.0055,
        y1: d => d[y2] - 0.005,
        x2: d => d[x2] + 0.0015,
        y2: d => d[y2],
        stroke: "currentColor",
        bend: -30,
      },
    ),
    Plot.image(data, {
      x: x2,
      y: y2,
      width: 30, // d => ftrSizeScale(d.ftr),
      height: 30, //d => ftrSizeScale(d.ftr),
      src: d =>
        `https://llimllib.github.io/nbastats/logos/${getName(d.team)}.svg`,
      title: d =>
        `${getName(d.team)}
TOV%: ${(d.tov_pct * 100).toFixed(1)}%
OREB%: ${(d.oreb_pct * 100).toFixed(1)}%
FT Rate: ${d.ftr.toFixed(3)}`,
    }),
    Plot.tip(
      data,
      Plot.pointer({
        x: x2,
        y: y2,
        title: d =>
          `${getName(d.team)}
TOV%: ${(d.tov_pct * 100).toFixed(1)}%
OREB%: ${(d.oreb_pct * 100).toFixed(1)}%
FT Rate: ${d.ftr.toFixed(3)}`,
      }),
    ),
  ],
})

display(graph2)
```

<div class="note">

**How to read this chart:**

- **X-axis (Turnover %):** Percentage of possessions ending in a turnover. Lower (right) = better.
- **Y-axis (Offensive Rebound %):** Percentage of missed shots rebounded by the offense. Higher = more second chances.
- **Logo size:** Scaled by free throw rate (FTA/FGA). Larger = more free throws per shot attempt.

Teams in the upper-right take care of the ball AND crash the offensive glass.

</div>

```js
// Show the data table
const tableData = data
  .map(d => ({
    Team: getName(d.team),
    "Pts/FGA": d.pts_per_fga,
    "FGA/Poss": d.fga_per_poss,
    "Off Rating": d.off_rating,
    Points: d.pts,
    FGA: d.fga,
    Possessions: Math.round(d.possessions),
  }))
  .sort((a, b) => b["Off Rating"] - a["Off Rating"])

display(Inputs.table(tableData))
```
