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

```js
const datas = data.map(d => ({
  ...d,
  net: d.offense - d.defense,
  bias: d.offense + d.defense,
}))
const [minX, maxX] = d3.extent(datas, d => d.bias)
const medianX = d3.median(datas, d => d.bias)
// center the x-axis on the median
const domainX =
  medianX - minX > maxX - medianX
    ? [minX, medianX + (medianX - minX)]
    : [medianX - (maxX - medianX), maxX]
const [minY, maxY] = d3.extent(datas, d => d.net)

// Create diagonal lines for offensive efficiency
const offenseLines = [100, 110, 120].flatMap(o => [
  { x: domainX[0], y: 2 * o - domainX[0], offense: o },
  { x: domainX[1], y: 2 * o - domainX[1], offense: o },
])
const defenseLines = [100, 110, 120].flatMap(d => [
  { x: domainX[0], y: domainX[0] - 2 * d, defense: d },
  { x: domainX[1], y: domainX[1] - 2 * d, defense: d },
])
display(
  Plot.plot({
    width: 500,
    height: 500,
    margin: 20,
    title: "Net Ratings",
    x: { axis: null, inset: 20, domain: domainX },
    y: {
      domain: [minY - 1, maxY + 1],
      inset: 20,
      grid: true,
      // label: "net rating",
      // labelAnchor: "bottom",
      ticks: 5,
    },
    marks: [
      Plot.line(offenseLines, {
        x: "x",
        y: "y",
        z: "offense",
        stroke: "lightgray",
        strokeDasharray: "2,2",
        strokeWidth: 1,
      }),
      Plot.line(defenseLines, {
        x: "x",
        y: "y",
        z: "defense",
        stroke: "lightgray",
        strokeDasharray: "2,2",
        strokeWidth: 1,
      }),
      Plot.ruleX([medianX], { stroke: "gray", strokeDasharray: "4,4" }),
      Plot.text([[medianX - 2, minY - 4]], {
        text: ["← Defensive"],
        fill: "gray",
        fontSize: 12,
        textAnchor: "end",
      }),
      Plot.text([[medianX + 2, minY - 4]], {
        text: ["Offensive →"],
        fill: "gray",
        fontSize: 12,
        textAnchor: "start",
      }),
      Plot.image(datas, {
        x: "bias",
        y: "net",
        src: d =>
          `https://llimllib.github.io/nbastats/logos/${getName(d.team)}.svg`,
        width: 30,
        opacity: 0.9,
      }),
      Plot.tip(
        datas,
        Plot.pointer({
          x: "bias",
          y: "net",
          title: team =>
            `${team.team}\nNet rating: ${d3.format(".1f")(team.net)}\nOffensive rating: ${team.offense}\nDefensive rating: ${team.defense}`,
        }),
      ),
      Plot.text([[domainX[1] + 2, maxY + 3]], {
        text: ["data: Cleaning the Glass"],
        fontSize: 12,
        fill: "gray",
        textAnchor: "end",
      }),
    ],
  }),
)
```

```js
// Prepare data for the table with net ratings
const tableData = datas
  .map(d => ({
    team: d.team,
    name: getName(d.team),
    offense: d.offense,
    defense: d.defense,
    net: d.net,
    bias: d.bias,
  }))
  .sort((a, b) => b.net - a.net) // Sort by net rating descending

// Calculate table height based on number of rows (approximate)
const rowHeight = 33
const headerHeight = 40
const tableHeight = tableData.length * rowHeight + headerHeight

// Create the graph (similar to the second plot)
const sideGraph = Plot.plot({
  width: 400,
  height: tableHeight,
  marginLeft: 0,
  marginRight: 20,
  marginTop: 40,
  marginBottom: 30,
  x: { axis: null, domain: domainX, inset: 20, label: null },
  y: {
    domain: [minY - 1, maxY + 1],
    axis: null,
    grid: false,
    label: null,
    labelAnchor: "top",
  },
  marks: [
    Plot.ruleX([medianX], { stroke: "gray", strokeDasharray: "4,4" }),
    Plot.ruleY([0], { stroke: "black", strokeWidth: 1 }),
    Plot.image(datas, {
      x: "bias",
      y: "net",
      src: d =>
        `https://llimllib.github.io/nbastats/logos/${getName(d.team)}.svg`,
      width: 25,
      opacity: 0.9,
    }),
    Plot.tip(
      datas,
      Plot.pointer({
        x: "bias",
        y: "net",
        title: team =>
          `${team.team}\nNet: ${d3.format(".1f")(team.net)}\nOff: ${team.offense}\nDef: ${team.defense}`,
      }),
    ),
  ],
})

const netScale = d3
  .scaleSequential(d3.interpolatePRGn)
  .domain([
    d3.min(tableData, d => d.net) * 2.0,
    d3.max(tableData, d => d.net) * 1.8,
  ])

const offenseScale = d3
  .scaleSequential(d3.interpolatePRGn)
  .domain([
    d3.min(tableData, d => d.offense) * 0.8,
    d3.max(tableData, d => d.offense) * 1.2,
  ])

const defenseScale = d3
  .scaleSequential(d3.interpolatePRGn)
  .domain([
    d3.max(tableData, d => d.defense) * 1.2,
    d3.min(tableData, d => d.defense) * 0.8,
  ]) // Reversed: lower is better

// Create the table with HTML
const tableContainer = d3
  .create("div")
  .style("flex", "0 0 auto")
  .style("overflow-y", "auto")
  .style("max-height", tableHeight + "px")

const table = tableContainer
  .append("table")
  .style("border-collapse", "collapse")
  .style("font-size", "14px")
  .style("width", "100%")

// Table header
// TODO: make table sortable
const thead = table.append("thead")
const headerRow = thead
  .append("tr")
  .style("position", "sticky")
  .style("top", "0")
  .style("z-index", "10")

headerRow
  .append("th")
  .text("")
  .style("padding", "8px")
  .style("text-align", "left")
  .style("font-weight", "600")

headerRow
  .append("th")
  .text("Offensive rating")
  .style("padding", "8px")
  .style("text-align", "right")
  .style("font-weight", "600")

headerRow
  .append("th")
  .text("Defensive rating")
  .style("padding", "8px")
  .style("text-align", "right")
  .style("font-weight", "600")

headerRow
  .append("th")
  .text("Net")
  .style("padding", "8px")
  .style("text-align", "right")
  .style("font-weight", "600")

// Table body
const tbody = table.append("tbody")
const rows = tbody
  .selectAll("tr")
  .data(tableData)
  .join("tr")
  .style("border-bottom", "1px solid #aaa")

// Team name + logo column
rows
  .append("td")
  // .style("padding", "6px 8px")
  .style("display", "flex")
  .style("align-items", "center")
  .style("gap", "8px")
  .html(
    d => `
    <img src="https://llimllib.github.io/nbastats/logos/${d.name}.svg" 
         width="24" height="24" style="display: block;">
    <span>${d.team}</span>
  `,
  )

// Offensive efficiency
rows
  .append("td")
  .text(d => d3.format(".1f")(d.offense))
  .style("padding", "6px 8px")
  .style("text-align", "right")
  .style("background-color", d => offenseScale(d.offense))

// Defensive efficiency
rows
  .append("td")
  .text(d => d3.format(".1f")(d.defense))
  .style("padding", "6px 8px")
  .style("text-align", "right")
  .style("background-color", d => defenseScale(d.defense))

// Net efficiency
rows
  .append("td")
  .text(d => d3.format(".1f")(d.net))
  .style("padding", "6px 8px")
  .style("text-align", "right")
  .style("font-weight", "600")
  .style("background-color", d => netScale(d.net))

// Create flex container
const flexContainer = d3
  .create("div")
  .style("display", "flex")
  .style("align-items", "flex-start")
  .style("gap", "20px")
  .style("margin", "20px 0")

flexContainer.append(() => tableContainer.node())
flexContainer.append(() => sideGraph)

display(flexContainer.node())
```
