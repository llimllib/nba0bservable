---
theme: cotton
title: Team efficiency vs pace
toc: false
---

```js
import { teams } from "./lib/teams.js"
const rawdata = await FileAttachment("data/team_summary.json").json()
```

```js
// append season to each team's data
const years = Object.keys(rawdata.data)
years.forEach(year =>
  Object.values(rawdata.data[year]).forEach(team => (team.year = year)),
)
const data = years.flatMap(year => Object.values(rawdata.data[year]))
display(data)
```

Pace has no discernable effect on net rating

```js
Plot.plot({
  marks: [
    Plot.dot(data, {
      x: "PACE",
      y: "NET_RATING",
      title: d => `${d.year} ${d.TEAM}`,
    }),
  ],
})
```

But a clear positive effect on offensive efficiency

```js
const x = "PACE"
const y = "OFF_RATING"
const graph = Plot.plot({
  marks: [
    Plot.dot(data, {
      x,
      y,
      title: d => `${d.year} ${d.TEAM_NAME}`,
    }),
    Plot.tip(
      data,
      Plot.pointer({
        x,
        y,
        title: d => `${d.year} ${d.TEAM_NAME}`,
      }),
    ),
    Plot.linearRegressionY(data, { x, y, stroke: "blue" }),
  ],
})
display(graph)
```

```js
const x = "PACE"
const y = "OFF_RATING"
const graph = Plot.plot({
  grid: true,
  title: "Pace vs offensive efficiency",
  subtitle: "2010-2025. This season's teams shown as logos",
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
    Plot.linearRegressionY(data, { x, y, stroke: "blue" }),
    Plot.dot(
      data.filter(d => d.year != "2025"),
      {
        x,
        y,
        fill: "grey",
        fillOpacity: 0.3,
        title: d =>
          `${d.year} ${d.TEAM_NAME}\npace: ${d.PACE}\noff. eff: ${d.OFF_RATING}`,
      },
    ),
    Plot.image(
      data.filter(d => d.year == "2025"),
      {
        x,
        y,
        width: 24,
        height: 24,
        src: d =>
          `https://llimllib.github.io/nbastats/logos/${d.TEAM_NAME}.svg`,
      },
    ),
    Plot.tip(
      data,
      Plot.pointer({
        x,
        y,
        title: d => `${d.year} ${d.TEAM_NAME}`,
      }),
    ),
  ],
})
display(graph)
```

```js
const x = "PACE"
const y = "OFF_RATING"
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
      data.filter(d => d.year == "2025"),
      {
        x,
        y,
        width: 24,
        height: 24,
        src: d =>
          `https://llimllib.github.io/nbastats/logos/${d.TEAM_NAME}.svg`,
      },
    ),
    Plot.tip(
      data.filter(d => d.year == "2025"),
      Plot.pointer({
        x,
        y,
        title: d => `${d.year} ${d.TEAM_NAME}`,
      }),
    ),
  ],
})
display(graph)
```

```js
const x = "PACE"
const y = "OFF_RATING"
const facet = {
  2010: [0, 0],
  2011: [0, 1],
  2012: [0, 2],
  2013: [1, 0],
  2014: [1, 1],
  2015: [1, 2],
  2016: [2, 0],
  2017: [2, 1],
  2018: [2, 2],
  2019: [3, 0],
  2020: [3, 1],
  2021: [3, 2],
  2022: [4, 0],
  2023: [4, 1],
  2024: [4, 2],
  2025: [5, 1],
}
const fx = d => facet[d.year][1]
const fy = d => facet[d.year][0]
const graph = Plot.plot({
  grid: true,
  title: "Pace vs offensive efficiency",
  subtitle: "2010-202",
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
  fx: {
    label: null,
    tickLabel: () => "",
  },
  fy: {
    label: null,
    tickLabel: () => "",
  },
  marks: [
    Plot.linearRegressionY(data, {
      x,
      y,
      stroke: "blue",
      fx,
      fy,
    }),
    Plot.dot(data, {
      x,
      y,
      fill: "grey",
      fillOpacity: 0.3,
      fx,
      fy,
      title: d =>
        `${d.year} ${d.TEAM_NAME}\npace: ${d.PACE}\noff. eff: ${d.OFF_RATING}`,
    }),
    Plot.text(data, {
      text: d => d.year,
      fx,
      fy,
      frameAnchor: "top-left",
      dx: 6,
      dy: 6,
    }),
    Plot.tip(
      data,
      Plot.pointer({
        x,
        y,
        fx,
        fy,
        title: d => `${d.year} ${d.TEAM_NAME}`,
      }),
    ),
    Plot.frame(),
  ],
})
display(graph)
```

```js echo
display(
  d3.least(
    data.filter(d => d.year === "2024"),
    d => d.DEF_RATING,
  ),
)
const y = "year"
const x = "DEF_RATING"
const graph = Plot.plot({
  title: "Best and worst defenses",
  subtitle: "2009-10 through 2024-25; lower defensive rating is better",
  height: 640,
  marginLeft: 50,
  y: {
    label: null,
    labelAnchor: "center",
    labelOffset: 48,
    ticks: 3,
    tickSize: 0,
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
    Plot.dot(data, { x, y, fill: "grey", fillOpacity: 0.4 }),
    // make the best team each year have an image
    Plot.image(
      new Set(data.map(d => d.year)).values().map(year =>
        d3.least(
          data.filter(d => d.year === year),
          d => d.DEF_RATING,
        ),
      ),
      {
        x,
        y,
        width: 35,
        height: 35,
        src: d =>
          `https://llimllib.github.io/nbastats/logos/${d.TEAM_NAME}.svg`,
      },
    ),
    // and the worst
    Plot.image(
      new Set(data.map(d => d.year)).values().map(year =>
        d3.greatest(
          data.filter(d => d.year === year),
          d => d.DEF_RATING,
        ),
      ),
      {
        x,
        y,
        width: 35,
        height: 35,
        src: d =>
          `https://llimllib.github.io/nbastats/logos/${d.TEAM_NAME}.svg`,
      },
    ),
    Plot.tip(
      data,
      Plot.pointer({
        x,
        y,
        title: d => `${d.year} ${d.TEAM_NAME}`,
      }),
    ),
  ],
})
display(graph)
```
