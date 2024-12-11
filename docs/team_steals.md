---
theme: cotton
title: Team steals
toc: false
---

```js
import { teams } from "./lib/teams.js"
```

```js
const bbref = await FileAttachment("data/bbref_2025.json").json()
// display(bbref)
const dd = bbref.advanced.map(t =>
  Object.assign({}, t, bbref.perPoss.filter(tt => tt.team == t.team)[0]),
)
display(dd)
```

```js echo
const x = "stl"
const y = "def_rtg"
const graph = Plot.plot({
  title: "Steals vs defensive efficiency",
  grid: true,
  y: { neat: true, reverse: true, ticks: 3, label: "defensive rating" },
  x: { neat: true, ticks: 5, label: "steals per possession" },
  marks: [
    Plot.image(dd, {
      x,
      y,
      width: 40,
      height: 40,
      src: d => {
        console.log(d.team, teams.get(d.team))
        return `https://llimllib.github.io/nbastats/logos/${teams.get(d.team)?.name}.svg`
      },
    }),
    Plot.tip(
      dd,
      Plot.pointer({
        x,
        y,
        title: d => `${d.team}\n${x}: ${d[x]}\n${y}: ${d[y]}`,
      }),
    ),
  ],
})
display(graph)
```
