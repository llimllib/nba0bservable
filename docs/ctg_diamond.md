---
theme: cotton
title: Cleaning the glass team efficiency
toc: false
---

```js
import { teams } from "./lib/teams.js"
const data = await FileAttachment("data/cleantheglass_teams.json").json()
```

```js
const last2weeks = view(Inputs.toggle({ label: "last 2 weeks only" }))
```

```js
const tooltip = d3
  .select("body")
  .append("div")
  .attr("class", "toolTip")
  .style("position", "absolute")
  .style("display", "none")
  .style("min-width", "30px")
  .style("max-width", "240px")
  .style("border-radius", "4px")
  .style("height", "auto")
  .style("background", "rgba(250,250,250, 0.9)")
  .style("border", "1px solid #DDD")
  .style("padding", "4px 8px")
  .style("font-size", ".85rem")
  .style("text-align", "left")
  .style("z-index", "1000")
function handleTooltip(plot) {
  d3.select(plot)
    .selectAll("image")
    .on("mousemove", (evt, d) => {
      // The <title> element and our tooltip will fight to display over one
      // another, so remove the <title> element and save its contents to the __title
      // attribute on the image
      const t = d3.select(evt.target)
      if (!t.attr("__title")) {
        const title = t.select("title")
        t.attr("__title", title.html())
        title.remove()
      }
      const text = t.attr("__title")
      tooltip
        .style("left", evt.pageX + 8 + "px")
        .style("top", evt.pageY + 8 + "px")
        .style("display", "block")
        .html(text.replaceAll("\n", "<br>"))
    })
    .on("mouseout", evt => {
      tooltip.style("display", "none")
    })
  return plot
}
```

```js
function getName(s) {
  return teams.values().find(x => x.ctgName == s).name
}

const [xMin, xMax] = d3.extent(data, d =>
  last2weeks ? d.offense_last2wk : d.offense,
)
const [yMin, yMax] = d3.extent(data, d =>
  last2weeks ? d.defense_last2wk : d.defense,
)
const xMid = xMin + (xMax - xMin) / 2
const yMid = yMin + (yMax - yMin) / 2
const rects = [
  [xMin, yMin, xMid, yMid],
  [xMid, yMin, xMax, yMid],
  [xMin, yMid, xMax, yMax],
  [xMid, yMid, xMax, yMax],
]
const size = 600
const diamond3 = Plot.plot({
  width: size,
  height: size,
  x: { inset: 5 },
  y: { inset: 5, reverse: true },
  marks: [
    Plot.rect(rects, {
      x1: "0",
      y1: "1",
      x2: "2",
      y2: "3",
      fill: ["#fbe8c8", "#e2e6cf", "#f8d9d4", "#fbe8c8"],
    }),
    Plot.axisX({ anchor: "bottom", label: null, ticks: 4, tickRotate: 45 }),
    Plot.gridX({ ticks: 4 }),
    Plot.axisY({ anchor: "left", label: null, ticks: 4, tickRotate: 45 }),
    Plot.gridY({ ticks: 4 }),
    Plot.text([[xMin * 1.01, yMax * 0.99]], {
      text: ["Bad O\nBad D"],
      fill: "grey",
      fontSize: 16,
      opacity: 0.5,
      rotate: 45,
      stroke: "black",
      strokeWidth: 0.5,
    }),
    Plot.text([[xMax * 0.99, yMax * 0.99]], {
      text: ["Good O\nBad D"],
      fill: "grey",
      fontSize: 16,
      opacity: 0.5,
      rotate: 45,
      stroke: "black",
      strokeWidth: 0.5,
    }),
    Plot.text([[xMin * 1.01, yMin * 1.01]], {
      text: ["Bad O\nGood D"],
      fontSize: 16,
      fill: "grey",
      opacity: 0.5,
      rotate: 45,
      stroke: "black",
      strokeWidth: 0.5,
    }),
    Plot.text([[xMax * 0.99, yMin * 1.01]], {
      text: ["Good O\nGood D"],
      fill: "grey",
      fontSize: 16,
      opacity: 0.5,
      rotate: 45,
      stroke: "black",
      strokeWidth: 0.5,
    }),
    Plot.image(data, {
      x: last2weeks ? "offense_last2wk" : "offense",
      y: last2weeks ? "defense_last2wk" : "defense",
      width: 40,
      height: 40,
      rotate: 45,
      src: d =>
        `https://llimllib.github.io/nbastats/logos/${getName(d.team)}.svg`,
      title: d =>
        `${d.team}
Record: ${last2weeks ? d.w_last2wk : d.w} - ${last2weeks ? d.l_last2wk : d.l}
Offensive rating: ${last2weeks ? d.offense_last2wk : d.offense}
Defensive rating: ${last2weeks ? d.defense_last2wk : d.defense}`,
    }),
  ],
})
handleTooltip(diamond3)

const container = d3
  .create("figure")
  .style("position", "relative")
  .style("max-width", "1000px")

d3.select(diamond3)
  .selectAll("text")
  // .filter(function filt() {
  //   console.log(
  //     "text",
  //     d3.select(this).text(),
  //     d3.select(this).text() == "Good O, Good D",
  //   );
  //   return d3.select(this).text() == "Good O, Good D";
  // })
  .each(function each_(d, i) {
    console.log("each", d3.select(this), d, i)
    const bbox = this.getBBox()
    console.log("bbox", bbox)
  })

// Title and subtitle
container
  .append("h1")
  .text("Team Efficiency")
  .style("position", "relative")
  .style("top", "70px")
  .style("left", "10px")
container
  .append("h3")
  .style("position", "relative")
  .style("top", "70px")
  .style("left", "10px")
  .html(
    `${last2weeks ? "last 2 weeks only" : "full season"}<p style="margin-top:3px">data per cleaning the glass`,
  )

// add the graph
container
  .append(() => diamond3)
  .style("overflow", "visible")
  .style("transform", "rotate(-45deg)")
  .style("padding", "90px")

display(container.node())
```
