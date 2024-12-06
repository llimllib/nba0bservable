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
