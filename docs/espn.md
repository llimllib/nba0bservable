---
theme: cotton
title: Net Points
toc: false
sql:
  players: ./data/player_box.parquet
  gamelogs: ./data/team_game_logs.parquet
---

# Net Points

```js
import { espnDiamond } from "./lib/espndiamond.js"
import { teams } from "./lib/teams.js"
```

```sql id=alldata
SELECT * from players
where season=2026
and game_type = 'regular_season'
-- limit to playoffs:
-- and game_type = 'playoffs'
;
```

```js
// display(Inputs.table(alldata))
```

```sql id=agg
SELECT
  player_name,
  team_abbrev,
  count(*) n,
  sum(o_net_pts) o_net_pts,
  sum(d_net_pts) d_net_pts,
  sum(t_net_pts) t_net_pts,
  sum(o_net_pts) / count(*) o_net_pts_per_g,
  sum(d_net_pts) / count(*) d_net_pts_per_g,
  sum(t_net_pts) / count(*) t_net_pts_per_g,
  sum(seconds_played) / 60 AS minutes,
  sum(seconds_played) / 60 / count(*) AS minutes_per_g,
from players
where season=2026
and game_type = 'regular_season'
-- playoffs
-- and game_type = 'playoffs'
group by player_id, player_name, team_abbrev
-- eventually, require a higher n. Maybe set this to something like 10% of the
-- max games value or something?
having n > 0
order by t_net_pts desc
```

```js
// display(Inputs.table(agg))
```

```js
const year = view(
  Inputs.range([2026, 2026], { value: "2026", label: "year", step: 1 }),
)

// console.log("year", (await year.next()).value);
const percentile = view(
  Inputs.range([5, 100], {
    value: "15",
    label: "top x% by minutes played",
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

```js
const ts = selectedTeams.map(d => d.abbreviation)
```

```js
display(
  espnDiamond(agg.toArray(), {
    by: "minutes",
    selectedTeams: ts,
    percentile,
    showBackground,
    size: 600,
    title: "Net Points",
  }),
)
```

```js
display(
  espnDiamond(agg.toArray(), {
    by: "minutes_per_g",
    selectedTeams: ts,
    percentile,
    showBackground,
    size: 600,
    title: "Net Points per game",
    x: "o_net_pts_per_g",
    y: "d_net_pts_per_g",
    extraSubtitle: " per game",
  }),
)
```

# single-player charts

```js
const selectedPlayer = view(
  Inputs.select(
    agg
      .toArray()
      .map(p => p.player_name)
      .sort(),
    {
      value: "Derrick White",
      label: "player",
    },
  ),
)
```

```js
const data = alldata
  .toArray()
  .map(p => ({ ...p }))
  .filter(x => x.player_name == selectedPlayer)
  .sort((a, b) => a.game_id > b.game_id)
let i = 1
data.forEach(pt => {
  pt.gameN = i++
})
console.log("single player data", data)
const exploded = data
  .map(pg => {
    return [
      {
        name: pg.player_name,
        gameN: pg.gameN,
        val: pg.d_net_pts,
        tot: pg.t_net_pts,
        type: "defensive net points",
      },
      {
        name: pg.player_name,
        gameN: pg.gameN,
        val: pg.o_net_pts,
        tot: pg.t_net_pts,
        type: "offensive net points",
      },
    ]
  })
  .flat()
view(
  Plot.plot({
    title: `Net points for ${selectedPlayer}`,
    color: { legend: true, scheme: "BuRd" },
    y: { axis: null },
    facet: { label: "game" },
    marks: [
      Plot.barX(exploded, {
        x: "val",
        y: 1,
        fy: "gameN",
        fill: "type", // d => (d.type === "off" ? "#1f78b4" : "#33a02c"),
      }),
      Plot.ruleX(data, { x: "t_net_pts", fy: "gameN" }),
    ],
  }),
)
```

```js
const oNetColor = "#01cdfe"
const dNetColor = "#b967ff"
const tNetColor = "#ff71ce"
const movingColor = "#05ffa1"
const componentOpacity = 0.9
view(
  Plot.plot({
    title: `Net points for ${selectedPlayer}`,
    x: { axis: null, inset: 10 },
    // How to make a custom legend is intentionally (!) not documented. Fil
    // tells us how to do it here:
    // https://github.com/observablehq/plot/discussions/2007#discussioncomment-8623183
    color: {
      legend: true,
      domain: [oNetColor, dNetColor, tNetColor, movingColor],
      range: [oNetColor, dNetColor, tNetColor, movingColor],
      tickFormat: d => {
        switch (d) {
          case oNetColor:
            return "Offensive Net Points"
          case dNetColor:
            return "Defensive"
          case tNetColor:
            return "Total"
          case movingColor:
            return "Moving Total Average"
        }
      },
    },
    marks: [
      Plot.ruleY([0]),
      // total points
      Plot.ruleX(data, {
        x: "gameN",
        y: "t_net_pts",
        stroke: tNetColor,
        strokeOpacity: 1,
        strokeWidth: 10,
      }),
      // o_net_pts
      Plot.ruleY(data, {
        x1: "gameN",
        x2: "gameN",
        // dx: -2,
        y: "o_net_pts",
        stroke: oNetColor,
        strokeOpacity: componentOpacity,
        strokeWidth: 5,
        insetRight: 4,
        insetLeft: 4,
      }),
      // d_net_pts
      Plot.dot(data, {
        x: "gameN",
        y: "d_net_pts",
        dx: 2,
        // manual stacking implementation, if we represent them as bars
        // y2: d =>
        //   d.o_net_pts > 0 && d.d_net_pts > 0 ? d.d_net_pts + d.o_net_pts : d.d_net_pts,
        // y1: d => (d.o_net_pts > 0 && d.d_net_pts > 0 ? d.o_net_pts : 0),
        fill: dNetColor,
        fillOpacity: componentOpacity,
        insetRight: 10,
        insetLeft: 10,
      }),
      // moving average line
      Plot.lineY(
        data,
        Plot.windowY(5, {
          x: "gameN",
          y: "t_net_pts",
          stroke: movingColor,
        }),
      ),
    ],
  }),
)
```

```sql id=delta
SELECT
  p.game_id,
  p.player_id,
  p.player_name,
  p.team_abbrev,
  p.o_net_pts,
  p.d_net_pts,
  p.t_net_pts,
  g.team_abbrev || CASE WHEN g.home THEN ' vs. ' ELSE ' @ ' END || g.opp_team_abbrev AS matchup,
  strftime(p.game_date, '%b %d') as game_date,
  abs(o_net_pts-d_net_pts) delta,
from players p
left join gamelogs g ON g.game_id = p.game_id AND g.team_id = p.team_id
where p.season=2026
and p.game_type = 'regular_season'
order by delta desc
```

```js
Inputs.table(delta)
```

```js
const top10 = delta.toArray().slice(0, 10)

// Color scales for offensive and defensive net points
// const oExtent = d3.extent(top10, d => d.o_net_pts)
// const dExtent = d3.extent(top10, d => d.d_net_pts)
const oExtent = [-5, 20]
const dExtent = [-10, 1]

// Green for positive, red for negative
const oColorScale = d3
  .scaleLinear()
  .domain([Math.min(oExtent[0], 0), 0, Math.max(oExtent[1], 0)])
  .range([
    d3.interpolatePRGn(0.2),
    d3.interpolatePRGn(0.5),
    d3.interpolatePRGn(0.8),
  ])

const dColorScale = d3
  .scaleLinear()
  .domain([Math.min(dExtent[0], 0), 0, Math.max(dExtent[1], 0)])
  .range([
    d3.interpolatePRGn(0.2),
    d3.interpolatePRGn(0.5),
    d3.interpolatePRGn(0.8),
  ])

const container = d3
  .create("div")
  .style("font-family", "system-ui, sans-serif")
  .style("max-width", "1000px")

container
  .append("h3")
  .style("margin-top", "40px")
  .style("margin-bottom", "4px")
  .style("font-size", "24px")
  .style("font-weight", "700")
  .text("Top 10 Offensive/Defensive split games")

// Subtitle
container
  .append("p")
  .style("margin-top", "0")
  .style("margin-bottom", "0px")
  .style("font-size", "14px")
  .style("color", "#666")
  .style("font-weight", "600")
  .text("2025-26 season, data via espnanalytics.com")

const table = container
  .append("table")
  .style("width", "100%")
  .style("border-collapse", "collapse")
  .style("margin-top", "0px")

// Header
const thead = table.append("thead")
thead
  .append("tr")
  .selectAll("th")
  .data([
    "Player",
    "Offensive Net Points",
    "Defensive Net Points",
    "Difference",
  ])
  .join("th")
  .style("text-align", (d, i) => (i === 0 ? "left" : "center"))
  .style("padding", "12px")
  .style("border-bottom", "2px solid #333")
  .style("font-weight", "600")
  .text(d => d)

// Body
const tbody = table.append("tbody")
const rows = tbody
  .selectAll("tr")
  .data(top10)
  .join("tr")
  .style("border-bottom", "1px solid #ddd")

// Column 1: Player info with image
rows
  .append("td")
  .style("padding", "12px")
  .style("display", "flex")
  .style("align-items", "center")
  .style("gap", "12px")
  .html(d => {
    // ESPN player image URL pattern - you may need to adjust this
    const playerImg = `https://cdn.nba.com/headshots/nba/latest/260x190/${d.player_id}.png`
    return `
      <img src="${playerImg}"
           width="50"
           height="50"
           style="border-radius: 4px; object-fit: cover;"
           onerror="this.style.display='none'">
      <div>
        <div style="font-weight: 600; font-size: 14px;">${d.player_name}</div>
        <div style="font-size: 12px; color: #666;">${d.game_date} • ${d.matchup}</div>
      </div>
    `
  })

// Column 2: Offensive Net Points
rows
  .append("td")
  .style("padding", "12px")
  .style("text-align", "center")
  .style("font-weight", "600")
  .style("font-size", "16px")
  .style("background-color", d => oColorScale(d.o_net_pts))
  .style("vertical-align", "middle")
  .style("color", d => "#333")
  .text(d => d.o_net_pts.toFixed(1))

// Column 3: Defensive Net Points
rows
  .append("td")
  .style("padding", "12px")
  .style("text-align", "center")
  .style("font-weight", "600")
  .style("font-size", "16px")
  .style("background-color", d => dColorScale(d.d_net_pts))
  .style("vertical-align", "middle")
  .style("color", d => "#333")
  .text(d => d.d_net_pts.toFixed(1))

// Column 4: Delta
rows
  .append("td")
  .style("padding", "12px")
  .style("text-align", "center")
  .style("font-weight", "700")
  .style("font-size", "16px")
  .style("vertical-align", "middle")
  .text(d => d.delta.toFixed(1))

display(container.node())
```

```sql id=delta2
SELECT
  p.game_id,
  p.player_id,
  p.player_name,
  p.team_abbrev,
  p.o_net_pts,
  p.d_net_pts,
  p.t_net_pts,
  g.team_abbrev || CASE WHEN g.home THEN ' vs. ' ELSE ' @ ' END || g.opp_team_abbrev AS matchup,
  strftime(p.game_date, '%b %d') as game_date,
  abs(o_net_pts-d_net_pts) delta,
from players p
left join gamelogs g ON g.game_id = p.game_id AND g.team_id = p.team_id
where p.season=2026
and d_net_pts > o_net_pts
and p.game_type = 'regular_season'
order by delta desc
```

```js
Inputs.table(delta2)
```

```js
const top10 = delta2.toArray().slice(0, 10)

// Color scales for offensive and defensive net points
// const oExtent = d3.extent(top10, d => d.o_net_pts)
// const dExtent = d3.extent(top10, d => d.d_net_pts)
const oExtent = [-15, 5]
const dExtent = [1, 10]

// Green for positive, red for negative
const oColorScale = d3
  .scaleLinear()
  .domain([Math.min(oExtent[0], 0), 0, Math.max(oExtent[1], 0)])
  .range([
    d3.interpolatePRGn(0.2),
    d3.interpolatePRGn(0.5),
    d3.interpolatePRGn(0.8),
  ])

const dColorScale = d3
  .scaleLinear()
  .domain([Math.min(dExtent[0], 0), 0, Math.max(dExtent[1], 0)])
  .range([
    d3.interpolatePRGn(0.2),
    d3.interpolatePRGn(0.5),
    d3.interpolatePRGn(0.8),
  ])

const container = d3
  .create("div")
  .style("font-family", "system-ui, sans-serif")
  .style("max-width", "1000px")

container
  .append("h3")
  .style("margin-top", "40px")
  .style("margin-bottom", "4px")
  .style("font-size", "24px")
  .style("font-weight", "700")
  .text("Top 10 Offensive/Defensive split games")

// Subtitle
container
  .append("p")
  .style("margin-top", "0")
  .style("margin-bottom", "0px")
  .style("font-size", "14px")
  .style("color", "#666")
  .style("font-weight", "600")
  .text("Defense > offense only, 2025-26 season, data via espnanalytics.com")

const table = container
  .append("table")
  .style("width", "100%")
  .style("border-collapse", "collapse")
  .style("margin-top", "0px")

// Header
const thead = table.append("thead")
thead
  .append("tr")
  .selectAll("th")
  .data([
    "Player",
    "Offensive Net Points",
    "Defensive Net Points",
    "Difference",
  ])
  .join("th")
  .style("text-align", (d, i) => (i === 0 ? "left" : "center"))
  .style("padding", "12px")
  .style("border-bottom", "2px solid #333")
  .style("font-weight", "600")
  .text(d => d)

// Body
const tbody = table.append("tbody")
const rows = tbody
  .selectAll("tr")
  .data(top10)
  .join("tr")
  .style("border-bottom", "1px solid #ddd")

// Column 1: Player info with image
rows
  .append("td")
  .style("padding", "12px")
  .style("display", "flex")
  .style("align-items", "center")
  .style("gap", "12px")
  .html(d => {
    // ESPN player image URL pattern - you may need to adjust this
    const playerImg = `https://cdn.nba.com/headshots/nba/latest/260x190/${d.player_id}.png`
    return `
      <img src="${playerImg}"
           width="50"
           height="50"
           style="border-radius: 4px; object-fit: cover;"
           onerror="this.style.display='none'">
      <div>
        <div style="font-weight: 600; font-size: 14px;">${d.player_name}</div>
        <div style="font-size: 12px; color: #666;">${d.game_date} • ${d.matchup}</div>
      </div>
    `
  })

// Column 2: Offensive Net Points
rows
  .append("td")
  .style("padding", "12px")
  .style("text-align", "center")
  .style("font-weight", "600")
  .style("font-size", "16px")
  .style("background-color", d => oColorScale(d.o_net_pts))
  .style("vertical-align", "middle")
  .style("color", d => "#333")
  .text(d => d.o_net_pts.toFixed(1))

// Column 3: Defensive Net Points
rows
  .append("td")
  .style("padding", "12px")
  .style("text-align", "center")
  .style("font-weight", "600")
  .style("font-size", "16px")
  .style("background-color", d => dColorScale(d.d_net_pts))
  .style("vertical-align", "middle")
  .style("color", d => "#333")
  .text(d => d.d_net_pts.toFixed(1))

// Column 4: Delta
rows
  .append("td")
  .style("padding", "12px")
  .style("text-align", "center")
  .style("font-weight", "700")
  .style("font-size", "16px")
  .style("vertical-align", "middle")
  .text(d => d.delta.toFixed(1))

display(container.node())
```

```sql id=delta3
SELECT
  p.game_id,
  p.player_id,
  p.player_name,
  p.team_abbrev,
  p.o_net_pts,
  p.d_net_pts,
  p.t_net_pts,
  g.team_abbrev || CASE WHEN g.home THEN ' vs. ' ELSE ' @ ' END || g.opp_team_abbrev AS matchup,
  strftime(p.game_date, '%b %d') as game_date,
  abs(o_net_pts-d_net_pts) delta,
from players p
left join gamelogs g ON g.game_id = p.game_id AND g.team_id = p.team_id
where p.season=2026
and abs(o_net_pts) > 4 and abs(d_net_pts) > 4
and (d_net_pts <0 or o_net_pts < 0)
and p.game_type = 'regular_season'
order by delta desc
```

```js
Inputs.table(delta3)
```

```js
const top10 = delta3.toArray().slice(0, 10)

// Color scales for offensive and defensive net points
// const oExtent = d3.extent(top10, d => d.o_net_pts)
// const dExtent = d3.extent(top10, d => d.d_net_pts)
const oExtent = [-11, 11]
const dExtent = [-11, 11]

// Green for positive, red for negative
const oColorScale = d3
  .scaleLinear()
  .domain([Math.min(oExtent[0], 0), 0, Math.max(oExtent[1], 0)])
  .range([
    d3.interpolatePRGn(0.2),
    d3.interpolatePRGn(0.5),
    d3.interpolatePRGn(0.8),
  ])

const dColorScale = d3
  .scaleLinear()
  .domain([Math.min(dExtent[0], 0), 0, Math.max(dExtent[1], 0)])
  .range([
    d3.interpolatePRGn(0.2),
    d3.interpolatePRGn(0.5),
    d3.interpolatePRGn(0.8),
  ])

const container = d3
  .create("div")
  .style("font-family", "system-ui, sans-serif")
  .style("max-width", "1000px")

container
  .append("h3")
  .style("margin-top", "40px")
  .style("margin-bottom", "4px")
  .style("font-size", "24px")
  .style("font-weight", "700")
  .text("Top 10 Offensive/Defensive split games")

// Subtitle
container
  .append("p")
  .style("margin-top", "0")
  .style("margin-bottom", "0px")
  .style("font-size", "14px")
  .style("color", "#666")
  .style("font-weight", "600")
  .text("2025-26 season, data via espnanalytics.com")

const table = container
  .append("table")
  .style("width", "100%")
  .style("border-collapse", "collapse")
  .style("margin-top", "0px")

// Header
const thead = table.append("thead")
thead
  .append("tr")
  .selectAll("th")
  .data([
    "Player",
    "Offensive Net Points",
    "Defensive Net Points",
    "Difference",
  ])
  .join("th")
  .style("text-align", (d, i) => (i === 0 ? "left" : "center"))
  .style("padding", "12px")
  .style("border-bottom", "2px solid #333")
  .style("font-weight", "600")
  .text(d => d)

// Body
const tbody = table.append("tbody")
const rows = tbody
  .selectAll("tr")
  .data(top10)
  .join("tr")
  .style("border-bottom", "1px solid #ddd")

// Column 1: Player info with image
rows
  .append("td")
  .style("padding", "12px")
  .style("display", "flex")
  .style("align-items", "center")
  .style("gap", "12px")
  .html(d => {
    // ESPN player image URL pattern - you may need to adjust this
    const playerImg = `https://cdn.nba.com/headshots/nba/latest/260x190/${d.player_id}.png`
    return `
      <img src="${playerImg}"
           width="50"
           height="50"
           style="border-radius: 4px; object-fit: cover;"
           onerror="this.style.display='none'">
      <div>
        <div style="font-weight: 600; font-size: 14px;">${d.player_name}</div>
        <div style="font-size: 12px; color: #666;">${d.game_date} • ${d.matchup}</div>
      </div>
    `
  })

// Column 2: Offensive Net Points
rows
  .append("td")
  .style("padding", "12px")
  .style("text-align", "center")
  .style("font-weight", "600")
  .style("font-size", "16px")
  .style("background-color", d => oColorScale(d.o_net_pts))
  .style("vertical-align", "middle")
  .style("color", d => "#333")
  .text(d => d.o_net_pts.toFixed(1))

// Column 3: Defensive Net Points
rows
  .append("td")
  .style("padding", "12px")
  .style("text-align", "center")
  .style("font-weight", "600")
  .style("font-size", "16px")
  .style("background-color", d => dColorScale(d.d_net_pts))
  .style("vertical-align", "middle")
  .style("color", d => "#333")
  .text(d => d.d_net_pts.toFixed(1))

// Column 4: Delta
rows
  .append("td")
  .style("padding", "12px")
  .style("text-align", "center")
  .style("font-weight", "700")
  .style("font-size", "16px")
  .style("vertical-align", "middle")
  .text(d => d.delta.toFixed(1))

display(container.node())
```
