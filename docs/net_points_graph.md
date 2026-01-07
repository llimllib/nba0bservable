---
theme: cotton
title: Net Points Graph
toc: false
sql:
  players: ./data/espn.players.parquet
  gamelogs_raw: ./data/gamelogs.parquet
---

# Net Points

```js
import { teams } from "./lib/teams.js"
```

```sql id=alldata
SELECT *
from players
-- ESPN data uses the start year not end year; 2025 -> 25-26
where season=2025
-- regular season and cup
and game_id LIKE '002%' or game_id LIKE '003%'
-- limit to playoffs:
-- and game_id LIKE '004%'
;
```

```sql id=gamelogs
select game_id, game_date from gamelogs_raw where season_year='2025-26'
```

```js
const dates = new Map(
  gamelogs.toArray().map(row => [row.game_id, new Date(row.game_date)]),
)
display(dates)
display(gamelogs.toArray())
```

```sql id=agg
SELECT
  name,
  team,
  count(*) n,
  sum(oNetPts) oNetPts,
  sum(dNetPts) dNetPts,
  sum(tNetPts) tNetPts,
  sum(oNetPts) / count(*) oNetPtsPerG,
  sum(dNetPts) / count(*) dNetPtsPerG,
  sum(tNetPts) / count(*) tNetPtsPerG,
  sum(
    CAST(SPLIT_PART(minutes_played, ':', 1) AS FLOAT) +
    CAST(SPLIT_PART(minutes_played, ':', 2) AS FLOAT) / 60
  ) AS minutes,
  sum(
    CAST(SPLIT_PART(minutes_played, ':', 1) AS FLOAT) +
    CAST(SPLIT_PART(minutes_played, ':', 2) AS FLOAT) / 60
  ) / count(*) AS minutesPerG,
from players
where season=2025
-- preseason: 001
-- regular season and cup (I think it's 003?)
and game_id LIKE '002%' or game_id LIKE '003%'
-- playoffs
-- and game_id LIKE '004%'
group by player_id, name, team
-- eventually, require a higher n. Maybe set this to something like 10% of the
-- max games value or something?
having n > 0
order by tNetPts desc
```

```js
const selectedPlayer = view(
  Inputs.select(
    agg
      .toArray()
      .map(p => p.name)
      .sort(),
    {
      value: "Derrick White",
      label: "player",
    },
  ),
)
```

I started with a stacked bar chart, aligned vertically with time along the y axis

```js
const data = alldata
  .toArray()
  .map(p => ({ ...p }))
  .filter(x => x.name == selectedPlayer)
  .sort((a, b) => a.game_id > b.game_id)
console.log("data", Array.from(data))
let i = 1
data.forEach(pt => {
  pt.gameN = i++
  pt.gameDate = dates.get(pt.game_id)
})
display(data)
const exploded = data
  .map(pg => {
    return [
      {
        name: pg.name,
        gameN: pg.gameN,
        val: pg.dNetPts,
        tot: pg.tNetPts,
        type: "defensive net points",
      },
      {
        name: pg.name,
        gameN: pg.gameN,
        val: pg.oNetPts,
        tot: pg.tNetPts,
        type: "offensive net points",
      },
    ]
  })
  .flat()
view(
  Plot.plot({
    title: `Net points for ${selectedPlayer}`,
    color: { legend: true, scheme: "BuRd" },
    fy: { axis: null, padding: 0 },
    y: { axis: null },
    x: { label: "net points" },
    marks: [
      Plot.barX(exploded, {
        x: "val",
        y: 1,
        fy: "gameN",
        fill: "type", // d => (d.type === "off" ? "#1f78b4" : "#33a02c"),
        insetTop: 5,
        insetBottom: 5,
      }),
      Plot.ruleX(data, { x: "tNetPts", fy: "gameN", strokeWidth: 4 }),
      Plot.ruleX([0], { inset: 0 }),
    ],
  }),
)
```

After drawing a bit, I decided that it made sense to align the graph horizontally rather than vertically:

- People are much more used to reading graphs where the time axis goes later along the x axis
- The downside is that given a graph width, the bars will compress as time progresses, where it's easier to add vertical height to the graph

When people read the graph, I want the _net points_ to be the value that jumps out at them, but also I want them to be able to interpret:

- The offensive and defensive components
- The moving average as the season progresses - it's hard to tell given the net varying widely between games

For my next attempt, I tried with a fun vaporwave color scheme

```js
const oNetColor = "#01cdfe"
const dNetColor = "#b967ff"
const tNetColor = "#ff71ce"
const movingColor = "#05ffa1"
const componentOpacity = 0.9
view(
  Plot.plot({
    title: `Net points for ${selectedPlayer}`,
    y: { label: "net points" },
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
        y: "tNetPts",
        stroke: tNetColor,
        strokeOpacity: 1,
        strokeWidth: 10,
      }),
      // oNetPts
      Plot.dot(data, {
        x: "gameN",
        dx: -2,
        y: "oNetPts",
        fill: oNetColor,
        r: 4,
        insetRight: 10,
        insetLeft: 10,
      }),
      // dNetPts
      Plot.dot(data, {
        x: "gameN",
        y: "dNetPts",
        dx: 2,
        r: 4,
        // manual stacking implementation, if we represent them as bars
        // y2: d =>
        //   d.oNetPts > 0 && d.dNetPts > 0 ? d.dNetPts + d.oNetPts : d.dNetPts,
        // y1: d => (d.oNetPts > 0 && d.dNetPts > 0 ? d.oNetPts : 0),
        fill: dNetColor,
        fillOpacity: componentOpacity,
        insetRight: 10,
        insetLeft: 10,
      }),
      // moving average line
      Plot.lineY(
        data,
        Plot.windowY(5, {
          anchor: "end",
          x: "gameN",
          y: "tNetPts",
          stroke: movingColor,
        }),
      ),
    ],
  }),
)
```

In this one, the O and D components are represented as possibly-overlapping bars, with a large mark at the total value rather than the bar representing the total

```js
// copied color scheme colors from:
// https://observablehq.com/@d3/color-schemes
// ["#1f77b4","#ff7f0e","#2ca02c","#d62728","#9467bd","#8c564b","#e377c2","#7f7f7f","#bcbd22","#17becf"]
const opacity = "22"
const oColor = "#d62728" + opacity
const dColor = "#1f77b4" + opacity
const movingColor2 = "black"
view(
  Plot.plot({
    title: `Net points for ${selectedPlayer}`,
    // How to make a custom legend is intentionally (!) not documented. Fil
    // tells us how to do it here:
    // https://github.com/observablehq/plot/discussions/2007#discussioncomment-8623183
    color: {
      legend: true,
      domain: [oColor, dColor, tColor, movingColor2],
      range: [oColor, dColor, tColor, movingColor2],
      tickFormat: d => {
        switch (d) {
          case oColor:
            return "Offensive Net Points"
          case dColor:
            return "Defensive"
          case tColor:
            return "Total"
          case movingColor2:
            return "Moving Total Average"
        }
      },
    },
    x: { axis: null },
    y: { label: "net points" },
    facet: { label: "game" },
    marks: [
      Plot.barY(data, {
        x: "gameN",
        y: "oNetPts",
        fill: oColor,
        insetLeft: 5,
        insetRight: 5,
      }),
      Plot.barY(data, {
        x: "gameN",
        y: "dNetPts",
        fill: dColor,
        insetLeft: 5,
        insetRight: 5,
      }),
      // Plot.ruleY(data, {
      //   x1: "gameN",
      //   x2: "gameN",
      //   y: "tNetPts",
      //   fill: "black",
      //   strokeWidth: 10,
      // }),
      Plot.dot(data, {
        x: "gameN",
        y: "tNetPts",
        fill: "black",
        r: 4,
      }),
      Plot.lineY(
        data,
        Plot.windowY(5, {
          anchor: "end",
          curve: "basis",
          x: "gameN",
          y: "tNetPts",
          stroke: movingColor2,
        }),
      ),
      Plot.ruleY([0]),
    ],
  }),
)
```

```js
// copied color scheme colors from:
// https://observablehq.com/@d3/color-schemes
// ["#1f77b4","#ff7f0e","#2ca02c","#d62728","#9467bd","#8c564b","#e377c2","#7f7f7f","#bcbd22","#17becf"]
const faceted = data.flatMap(d => [
  { ...d, type: "Offensive", netPts: d.oNetPts },
  { ...d, type: "Defensive", netPts: d.dNetPts },
])
const opacity = "66"
const oColor = "#d62728" + opacity
const dColor = "#1f77b4" + opacity
const tColor = "black"

// this graph uses facets to express dual bar graphs, but that prevents us from
// doing anything like drawing a moving average, or otherwise doing something
// along the whole graph. I think a non-faceted approach may be better, but
// I haven't found a good way to do the side-by-side bar graphs oethrwise
view(
  Plot.plot({
    title: `Net points for ${selectedPlayer}`,
    // How to make a custom legend is intentionally (!) not documented. Fil
    // tells us how to do it here:
    // https://github.com/observablehq/plot/discussions/2007#discussioncomment-8623183
    color: {
      legend: true,
      domain: [oColor, dColor, tColor],
      range: [oColor, dColor, tColor],
      tickFormat: d => {
        switch (d) {
          case oColor:
            return "Offensive Net Points"
          case dColor:
            return "Defensive"
          case tColor:
            return "Total"
        }
      },
    },
    x: { axis: null },
    y: { label: "net points" },
    fx: { axis: null },
    marks: [
      Plot.barY(data, {
        fx: "gameN",
        y: "tNetPts",
        fill: "#00000022",
      }),
      Plot.barY(faceted, {
        fx: "gameN",
        x: "type",
        y: "netPts",
        fill: d => (d.type === "Offensive" ? oColor : dColor),
      }),
      Plot.ruleY(data, {
        fx: "gameN",
        y: "tNetPts",
        stroke: "black",
        strokeWidth: 5,
      }),
      // I don't think we can make the moving average graph work when the graph is faceted; it gets repeated across each facet, as per the docs:
      // You can mix-and-match faceted and non-faceted marks within the same plot. The non-faceted marks will be repeated across all facets.
      // https://observablehq.com/plot/features/facets
      //
      // Plot.lineY(
      //   data,
      //   Plot.windowY(5, {
      //     anchor: "end",
      //     fx: "gameN",
      //     x: "gameN",
      //     y: "tNetPts",
      //     stroke: movingColor,
      //   }),
      // ),
      Plot.ruleY([0]),
    ],
  }),
)
console.log(faceted.filter(d => d.type === "Offensive"))
```

Let's try an expirement using svg pattern fills:

```js
// based on:
// https://observablehq.com/@ateliercartographie/motif
function hachure(id, options = {}) {
  const {
    stroke = "currentColor",
    strokeWidth = 1,
    opacity = 1,
    spacing = 8,
    rotate = 45,
  } = options
  const size = 10
  return svg.fragment`<pattern
    id="${id}"
    patternUnits="userSpaceOnUse"
    width="${size}"
    height="${spacing}"
    patternTransform="rotate(${rotate - 90})"
  >
    <line
      x1="0"
      x2="${size}"
      stroke="${stroke}"
      stroke-width="${strokeWidth * 2}"
      opacity="${opacity}"
    />
  </pattern>`
}

const patternDefs = [
  {
    id: "hach1",
    options: { opacity: 0.5, strokeWidth: 0.6, spacing: 3, rotate: 90 },
  },
  {
    id: "hach2",
    options: { opacity: 0.5, strokeWidth: 1, spacing: 6, rotate: 45 },
  },
  {
    id: "hach3",
    options: { opacity: 0.5, strokeWidth: 1.6, spacing: 6, rotate: 90 },
  },
  {
    id: "hach4",
    options: { opacity: 0.5, strokeWidth: 1.2, spacing: 5, rotate: 0 },
  },
  {
    id: "hach5",
    options: { opacity: 0.5, strokeWidth: 1, spacing: 6, rotate: -45 },
  },
  {
    id: "hach6",
    options: { opacity: 0.5, strokeWidth: 1.2, spacing: 6, rotate: 0 },
  },
]
// Generate the SVG pattern definitions.
const patterns = patternDefs.map(({ id, options }) => hachure(id, options))

const plot = Plot.plot({
  title: `Net points for ${selectedPlayer}`,
  color: {
    legend: true,
    domain: [`url(#hach2)`, `url(#hach5)`, "black"],
    range: [`url(#hach2)`, `url(#hach5)`, "black"],
    tickFormat: d => {
      switch (d) {
        case `url(#hach2)`:
          return "defensive net points"
        case `url(#hach5)`:
          return "offensive net points"
        case `black`:
          return "total net points"
      }
    },
  },
  x: { axis: null, label: null },
  marks: [
    Plot.rectY(data, {
      x: "gameN",
      y: "dNetPts",
      fill: "url(#hach2)",
      stroke: "currentColor",
      strokeWidth: 0,
    }),
    Plot.rectY(data, {
      x: "gameN",
      y: "oNetPts",
      fill: "url(#hach5)",
      stroke: "currentColor",
      strokeWidth: 0,
    }),
    Plot.ruleY(data, {
      x1: "gameN",
      x2: "gameN",
      y: "tNetPts",
      stroke: "black",
      strokeWidth: 5,
    }),
    Plot.lineY(
      data,
      Plot.windowY(5, {
        anchor: "end",
        curve: "basis",
        x: "gameN",
        y: "tNetPts",
        stroke: movingColor2,
      }),
    ),
  ],
})
display(html`<svg width="0" height="0"><defs>${patterns}</defs></svg>${plot}`)
```

After looking at them a bunch, I think that the moving average might actually be the most interesting/important thing about this graph? What if we emphasized it, gave the O and D nets as dots, and didn't list the total at all?

- I've given up on getting plot to show the symbols with color, very annoying
- What if we gave up on showing the total net points, and just showed the components?

```js
// This time I'm going to try and figure out how to properly really work with observable plot, but it's damned frustrating. Links:
//
// > But rather than supplying literal values, it is more semantic to provide
// > abstract values and use scales. In addition to centralizing the encoding
// > definition (if used by multiple marks), it allows Plot to generate a legend.
// - https://observablehq.com/plot/features/legends
//
// Lesson: you need to use an arrow function to return a string literal and
// have it work correctly. A static string doesn't work
//
// Now, how to have the symbol legend be accurate?
//
// > When an ordinal color scale is used redundantly with a symbol scale, the
// > symbol legend will incorporate the color encoding. This is more accessible than
// > using color alone, particularly for readers with color vision deficiency.
// - https://observablehq.com/plot/features/legends
//
// but I can't manage to make it work so far
display(
  Plot.plot({
    title: `Net points for ${selectedPlayer}`,
    x: { axis: null, label: null, padding: 10 },
    color: {
      type: "ordinal",
      domain: ["offense", "defense"],
      scheme: "Observable10",
    },
    symbol: {
      type: "ordinal",
      legend: true,
      domain: ["offense", "defense"],
    },
    // symbol: { legend: true },

    marks: [
      Plot.lineY(
        data,
        Plot.windowY(5, {
          anchor: "end",
          curve: "basis",
          x: "gameN",
          y: "tNetPts",
          stroke: movingColor2,
          strokeWidth: 3,
        }),
      ),
      Plot.dot(data, {
        x: "gameN",
        y: "dNetPts",
        fill: () => "defense",
        symbol: () => "defense",
        r: 4,
      }),
      Plot.dot(data, {
        x: "gameN",
        y: "oNetPts",
        fill: () => "offense",
        symbol: () => "offense",
        r: 4,
      }),
      Plot.ruleY([0]),
    ],
  }),
)
```

It's still really hard to read that, what if we gave up on showing individual points entirely (for now, maybe it will come back?) and showed only the trend line

```js
const k = view(
  Inputs.range([1, 15], { step: 1, label: "window size", value: 5 }),
)
```

```js
// ["#4269d0","#efb118","#ff725c","#6cc5b0","#3ca951","#ff8ab7","#a463f2","#97bbf5","#9c6b4e","#9498a0"]
// ["#1f77b4","#ff7f0e","#2ca02c","#d62728","#9467bd","#8c564b","#e377c2","#7f7f7f","#bcbd22","#17becf"]
display(
  Plot.plot({
    title: `Net points for ${selectedPlayer}`,
    subtitle: `${k} games window`,
    x: { axis: null, label: null, padding: 10 },
    color: {
      type: "ordinal",
      domain: ["total", "offense", "defense"],
      legend: true,
      // viridis endpoints https://observablehq.com/@d3/color-schemes
      range: ["black", "#1f77b466", "#ff7f0e66"],
    },
    marks: [
      Plot.lineY(
        data,
        Plot.windowY(k, {
          anchor: "end",
          curve: "basis",
          x: "gameN",
          y: "tNetPts",
          stroke: () => "total",
          strokeWidth: 3,
        }),
      ),
      Plot.lineY(
        data,
        Plot.windowY(k, {
          anchor: "end",
          curve: "basis",
          x: "gameN",
          y: "dNetPts",
          stroke: () => "offense",
          strokeWidth: 3,
        }),
      ),
      Plot.lineY(
        data,
        Plot.windowY(k, {
          anchor: "end",
          curve: "basis",
          x: "gameN",
          y: "oNetPts",
          stroke: () => "defense",
          strokeWidth: 3,
        }),
      ),
      Plot.ruleY([0]),
    ],
  }),
)
```

```js
const players = view(
  Inputs.select(
    agg
      .toArray()
      .map(p => p.name)
      .sort(),
    {
      multiple: true,
      label: "players",
    },
  ),
)
```

```js
const datas = alldata
  .toArray()
  .map(p => ({ ...p }))
  .filter(x => players.includes(x.name))

// Add gameN for each player separately
const playerGameCounts = new Map()
datas.forEach(pt => {
  if (!playerGameCounts.has(pt.name)) {
    playerGameCounts.set(pt.name, 1)
  }
  pt.gameN = playerGameCounts.get(pt.name)
  playerGameCounts.set(pt.name, pt.gameN + 1)
  pt.gameDate = dates.get(pt.game_id)
})
datas.sort((a, b) => a.gameDate > b.gameDate)

const title = d => `${d3.utcFormat("%b %e")(d.gameDate)}\n,
Total net: ${d.tNetPts}
O net: ${d.oNetPts}
D net: ${d.dNetPts}`

// TODO: align the games by date instead of arbitrary game #
display(
  Plot.plot({
    title: `Net points`,
    subtitle: `${k} game rolling average`,
    x: { axis: null, label: null, padding: 10 },
    y: { label: "net points", nice: true, grid: true },
    fy: { label: null },
    facet: { axis: null },
    color: {
      type: "ordinal",
      domain: ["total", "offense", "defense"],
      legend: true,
      range: ["black", "#1f77b466", "#ff7f0e66"],
    },
    marks: [
      Plot.frame(),
      Plot.lineY(
        datas,
        Plot.windowY(k, {
          anchor: "end",
          curve: "basis",
          fy: "name",
          x: "gameDate",
          y: "tNetPts",
          stroke: () => "total",
          strokeWidth: 3,
        }),
      ),
      Plot.lineY(
        datas,
        Plot.windowY(k, {
          anchor: "end",
          curve: "basis",
          fy: "name",
          x: "gameDate",
          y: "dNetPts",
          stroke: () => "defense",
          strokeWidth: 3,
        }),
      ),
      Plot.lineY(
        datas,
        Plot.windowY(k, {
          anchor: "end",
          curve: "basis",
          fy: "name",
          x: "gameDate",
          y: "oNetPts",
          stroke: () => "offense",
          strokeWidth: 3,
        }),
      ),
      Plot.dot(datas, {
        fy: "name",
        r: 2,
        fill: "#00000055",
        stroke: null,
        symbol: "cross",
        tip: true,
        title,
        x: "gameDate",
        y: "tNetPts",
      }),
      // This doesn't work great, because you have to pick only one chart to bind it to
      //       Plot.tip(
      //         datas,
      //         Plot.pointer({
      //           x: "gameDate",
      //           fy: "name",
      //           y: "oNetPts",
      //           title: d =>
      //             `${d.name} ${d3.utcFormat("%b %e")(d.gameDate)}\n,
      // Total net: ${d.tNetPts}
      // O net: ${d.oNetPts}
      // D net: ${d.dNetPts}`,
      //         }),
      //       ),
      // Add player names at the bottom of each facet
      Plot.text(Array.from(new Set(datas.map(d => d.name))), {
        fy: d => d,
        frameAnchor: "bottom",
        text: d => d,
        dy: -5,
      }),
    ],
  }),
)
```
