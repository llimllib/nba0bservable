---
theme: cotton
title: Net rating by schedule difficulty
toc: false
---

# Net rating by schedule difficulty

```js
import { teams } from "./lib/teams.js";
import { label } from "./lib/labels.js";
import { sliceQuantile } from "./lib/util.js";
```

```js
const bbref = await FileAttachment("data/bbref_2025_advanced.json").json();
display(bbref);
const width = 640;
const height = 400;
const fontOptions = {
  fontSize: 16,
  // fontStyle: "italic",
  //stroke: "black",
  fill: "black",
  opacity: 0.8,
};
const sos = Plot.plot({
  title: "Net rating by strength of schedule",
  subtitle: "data from basketball-reference",
  height,
  width,
  x: {
    inset: 10,
    label: null,
  },
  y: {
    label: null,
    // nice: true,
    // ticks: 7,
    ticks: null,
    domain: [-3, 2.5],
    inset: 20,
  },
  marks: [
    Plot.image(bbref, {
      x: "net_rtg",
      y: "sos",
      width: 40,
      height: 40,
      src: (d) => {
        console.log(d.team, teams.get(d.team));
        return `https://llimllib.github.io/nbastats/logos/${teams.get(d.team)?.name}.svg`;
      },
    }),
    Plot.ruleY([0]),
    Plot.text([[-1, 2.8]], {
      text: ["↑ Harder Schedule"],
      ...fontOptions,
    }),
    Plot.text([[-11, -3]], {
      text: ["→ Net Rating"],
      ...fontOptions,
      fill: "black",
    }),
    Plot.tip(
      bbref,
      Plot.pointer({
        x: "net_rtg",
        y: "sos",
      }),
    ),
  ],
});

const gradient = d3
  .select(sos)
  .select("svg")
  .append("defs")
  .append("linearGradient")
  .attr("id", "myGradient")
  .attr("x1", "0%")
  .attr("y1", "0%")
  .attr("x2", "0%")
  .attr("y2", "100%");

const grad = d3.interpolatePRGn;
const gradStops = [
  [0, 0.2],
  [30, 0.5],
  [70, 0.5],
  [100, 0.8],
];
gradStops.forEach(([offset, pct]) => {
  console.log(offset, pct, grad(pct));
  return gradient
    .append("stop")
    .attr("offset", `${offset}%`)
    .attr("stop-color", grad(pct));
});
const margin = 30;
d3.select(sos)
  .select("svg")
  .insert("rect", ":first-child")
  .attr("x", margin)
  .attr("y", 0)
  .attr("width", width)
  .attr("height", height - margin)
  .attr("fill", "url(#myGradient)")
  .attr("fill-opacity", 0.4);

// couldn't figure out how to remove the y axis ticks without resorting to
// killing them later
d3.select(sos).select('g[aria-label="y-axis tick"]').remove();
d3.select(sos).select('g[aria-label="y-axis tick label"]').remove();
display(sos);
```
