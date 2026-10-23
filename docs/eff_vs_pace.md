---
theme: cotton
title: Team efficiency vs pace
toc: false
sql:
  team_game_logs: ./data/team_game_logs.parquet
---

```js
import { teams } from "./lib/teams.js"
import { CURRENT_SEASON, seasonLabel } from "./lib/season.js"
```

```sql id=seasons
-- Each team's regular season, from its game logs: ratings are points per 100
-- possessions, and pace is possessions per 48 minutes
SELECT g.season,
  g.team_abbrev,
  any_value(g.team_name) AS team_name,
  ROUND(48 * SUM(g.poss) / SUM(g.min), 1) AS pace,
  ROUND(100 * SUM(g.pts) / SUM(g.poss), 1) AS off_rating,
  ROUND(100 * SUM(o.pts) / SUM(o.poss), 1) AS def_rating,
  ROUND(100 * SUM(g.pts) / SUM(g.poss) - 100 * SUM(o.pts) / SUM(o.poss), 1) AS net_rating
FROM team_game_logs g
JOIN team_game_logs o ON o.game_id = g.game_id AND o.team_id = g.opp_team_id
WHERE g.game_type = 'regular_season'
GROUP BY g.season, g.team_abbrev
ORDER BY g.season, g.team_abbrev
```

```js
const data = seasons.toArray().map(d => ({ ...d }))
// a few games into a season, its ratings are mostly noise, so compare against
// completed seasons only
const history = data.filter(d => d.season < CURRENT_SEASON)
const current = data.filter(d => d.season == CURRENT_SEASON)
const [firstSeason, lastSeason] = d3.extent(history, d => d.season)
display(data)
```

Pace has no discernable effect on net rating

```js
Plot.plot({
  marks: [
    Plot.dot(history, {
      x: "pace",
      y: "net_rating",
      title: d => `${d.season} ${d.team_name}`,
    }),
  ],
})
```

But a clear positive effect on offensive efficiency

```js
const x = "pace"
const y = "off_rating"
const graph = Plot.plot({
  marks: [
    Plot.dot(history, {
      x,
      y,
      title: d => `${d.season} ${d.team_name}`,
    }),
    Plot.tip(
      history,
      Plot.pointer({
        x,
        y,
        title: d => `${d.season} ${d.team_name}`,
      }),
    ),
    Plot.linearRegressionY(history, { x, y, stroke: "blue" }),
  ],
})
display(graph)
```

```js
const x = "pace"
const y = "off_rating"
const graph = Plot.plot({
  grid: true,
  title: "Pace vs offensive efficiency",
  subtitle: `${firstSeason}-${lastSeason}. This season's teams shown as logos`,
  y: {
    label: "Offensive Efficiency",
    labelAnchor: "center",
    labelOffset: 40,
    ticks: 3,
    tickSize: 0,
  },
  x: {
    label: "Pace",
    labelAnchor: "center",
    ticks: 5,
    tickSize: 0,
  },
  marks: [
    Plot.linearRegressionY(history, { x, y, stroke: "blue" }),
    Plot.dot(
      history,
      {
        x,
        y,
        fill: "grey",
        fillOpacity: 0.3,
        title: d =>
          `${d.season} ${d.team_name}\npace: ${d.pace}\noff. eff: ${d.off_rating}`,
      },
    ),
    Plot.image(
      current,
      {
        x,
        y,
        width: 24,
        height: 24,
        src: d =>
          `https://llimllib.github.io/nbastats/logos/${d.team_name}.svg`,
      },
    ),
    Plot.tip(
      data,
      Plot.pointer({
        x,
        y,
        title: d => `${d.season} ${d.team_name}`,
      }),
    ),
  ],
})
display(graph)
```

```js
const x = "pace"
const y = "off_rating"
const graph = Plot.plot({
  grid: true,
  title: "Pace vs offensive efficiency",
  y: {
    label: "Offensive Efficiency",
    labelAnchor: "center",
    labelOffset: 40,
    ticks: 3,
    tickSize: 0,
  },
  x: {
    label: "Pace",
    labelAnchor: "center",
    ticks: 5,
    tickSize: 0,
  },
  marks: [
    Plot.image(
      current,
      {
        x,
        y,
        width: 24,
        height: 24,
        src: d =>
          `https://llimllib.github.io/nbastats/logos/${d.team_name}.svg`,
      },
    ),
    Plot.tip(
      current,
      Plot.pointer({
        x,
        y,
        title: d => `${d.season} ${d.team_name}`,
      }),
    ),
  ],
})
display(graph)
```

```js
const x = "pace"
const y = "off_rating"
// three seasons per row
const fx = d => (d.season - firstSeason) % 3
const fy = d => Math.floor((d.season - firstSeason) / 3)
const graph = Plot.plot({
  grid: true,
  title: "Pace vs offensive efficiency",
  subtitle: `${firstSeason}-${lastSeason}`,
  y: {
    label: "Offensive Efficiency",
    labelAnchor: "center",
    labelOffset: 40,
    ticks: 3,
    tickSize: 0,
  },
  x: {
    label: "Pace",
    labelAnchor: "center",
    ticks: 5,
    tickSize: 0,
  },
  fx: { axis: null },
  fy: { axis: null },
  marks: [
    Plot.linearRegressionY(history, {
      x,
      y,
      stroke: "blue",
      fx,
      fy,
    }),
    Plot.dot(history, {
      x,
      y,
      fill: "grey",
      fillOpacity: 0.3,
      fx,
      fy,
      title: d =>
        `${d.season} ${d.team_name}\npace: ${d.pace}\noff. eff: ${d.off_rating}`,
    }),
    Plot.text(history, {
      text: d => String(d.season),
      fx,
      fy,
      frameAnchor: "top-left",
      dx: 6,
      dy: 6,
    }),
    Plot.tip(
      history,
      Plot.pointer({
        x,
        y,
        fx,
        fy,
        title: d => `${d.season} ${d.team_name}`,
      }),
    ),
    Plot.frame(),
  ],
})
display(graph)
```

```js
const y = "season"
const x = "off_rating"
const graph = Plot.plot({
  title: "Best and worst offenses",
  subtitle: `Offensive Efficiency ${seasonLabel(firstSeason)} through ${seasonLabel(lastSeason)}`,
  height: 640,
  marginLeft: 50,
  y: {
    label: null,
    labelAnchor: "center",
    labelOffset: 48,
    ticks: 3,
    tickSize: 0,
    tickFormat: "d",
    type: "point",
  },
  x: {
    inset: 20,
    label: "Offensive rating",
    labelAnchor: "center",
    labelArrow: "right",
    labelOffset: 30,
    ticks: 5,
    tickSize: 0,
  },
  marks: [
    Plot.dot(history, { x, y, fill: "grey", fillOpacity: 0.4 }),
    // make the best team each year have an image
    Plot.image(
      new Set(history.map(d => d.season)).values().map(year =>
        d3.least(
          history.filter(d => d.season === year),
          d => d[x],
        ),
      ),
      {
        x,
        y,
        width: 35,
        height: 35,
        src: d =>
          `https://llimllib.github.io/nbastats/logos/${d.team_name}.svg`,
      },
    ),
    // and the worst
    Plot.image(
      new Set(history.map(d => d.season)).values().map(year =>
        d3.greatest(
          history.filter(d => d.season === year),
          d => d[x],
        ),
      ),
      {
        x,
        y,
        width: 35,
        height: 35,
        src: d =>
          `https://llimllib.github.io/nbastats/logos/${d.team_name}.svg`,
      },
    ),
    Plot.tip(
      history,
      Plot.pointer({
        x,
        y,
        title: d => `${d.season} ${d.team_name}`,
      }),
    ),
  ],
})
display(graph)
```

```js
const y = "season"
const x = "def_rating"
const graph = Plot.plot({
  title: "Best and worst defenses",
  subtitle: `${seasonLabel(firstSeason)} through ${seasonLabel(lastSeason)}; lower defensive rating is better`,
  height: 640,
  marginLeft: 50,
  y: {
    label: null,
    labelAnchor: "center",
    labelOffset: 48,
    ticks: 3,
    tickSize: 0,
    tickFormat: "d",
    type: "point",
  },
  x: {
    inset: 20,
    label: "Defensive rating",
    labelAnchor: "center",
    labelArrow: "right",
    labelOffset: 30,
    reverse: true,
    ticks: 5,
    tickSize: 0,
  },
  marks: [
    Plot.dot(history, { x, y, fill: "grey", fillOpacity: 0.4 }),
    // make the best team each year have an image
    Plot.image(
      new Set(history.map(d => d.season)).values().map(year =>
        d3.least(
          history.filter(d => d.season === year),
          d => d[x],
        ),
      ),
      {
        x,
        y,
        width: 35,
        height: 35,
        src: d =>
          `https://llimllib.github.io/nbastats/logos/${d.team_name}.svg`,
      },
    ),
    // and the worst
    Plot.image(
      new Set(history.map(d => d.season)).values().map(year =>
        d3.greatest(
          history.filter(d => d.season === year),
          d => d[x],
        ),
      ),
      {
        x,
        y,
        width: 35,
        height: 35,
        src: d =>
          `https://llimllib.github.io/nbastats/logos/${d.team_name}.svg`,
      },
    ),
    Plot.tip(
      history,
      Plot.pointer({
        x,
        y,
        title: d => `${d.season} ${d.team_name}`,
      }),
    ),
  ],
})
display(graph)
```
