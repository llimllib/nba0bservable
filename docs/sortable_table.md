---
theme: cotton
title: Sortable table
toc: false
---

```js
import { createSortableTable } from "./lib/sortable_table.js"
import { teams } from "./lib/teams.js"
const data = await FileAttachment("data/cleantheglass_teams.json").json()
```

```js
function getName(s) {
  return teams.values().find(x => x.ctgName == s).name
}
```

```js
const datas = data.map(d => ({
  ...d,
  net: d.offense - d.defense,
  bias: d.offense + d.defense,
}))

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

function expandDomain(values, paddingPercent = 0.9) {
  const min = d3.min(values)
  const max = d3.max(values)
  const range = max - min
  const padding = range * paddingPercent
  return [min - padding, max + padding]
}

const netScale = d3
  .scaleSequential(d3.interpolatePRGn)
  .domain(expandDomain(tableData.map(d => d.net)))

const offenseScale = d3
  .scaleSequential(d3.interpolatePRGn)
  .domain(expandDomain(tableData.map(d => d.offense)))

const defenseScale = d3
  .scaleSequential(d3.interpolatePRGn)
  .domain(expandDomain(tableData.map(d => d.defense)).reverse())
```

```js
const container = createSortableTable({
  data: tableData,
  columns: [
    {
      key: "team",
      label: "",
      align: "left",
      sortable: false,
      render: d => `
        <img src="https://llimllib.github.io/nbastats/logos/${d.name}.svg" 
             width="24" height="24" style="display: block;">
        <span>${d.team}</span>
      `,
      style: {
        display: "flex",
        "align-items": "center",
        gap: "8px",
      },
    },
    {
      key: "offense",
      label: "Offensive rating",
      format: d3.format(".1f"),
      colorScale: offenseScale,
      style: {
        padding: "6px 8px",
        "text-align": "right",
      },
    },
    {
      key: "defense",
      label: "Defensive rating",
      format: d3.format(".1f"),
      colorScale: defenseScale,
      defaultSort: "asc", // Lower is better
      style: {
        padding: "6px 8px",
        "text-align": "right",
      },
    },
    {
      key: "net",
      label: "Net",
      format: d3.format(".1f"),
      colorScale: netScale,
      defaultSort: "desc",
      style: {
        padding: "6px 8px",
        "text-align": "right",
        "font-weight": "600",
      },
    },
  ],
  visualize: ({
    container,
    data,
    allData,
    sortColumn,
    sortDirection,
    dimensions,
    transitionDuration,
  }) => {
    const { width, height, rowHeight } = dimensions
    const margin = { top: 20, right: 20, bottom: 20, left: 20 }
    const innerWidth = width - margin.left - margin.right
    const innerHeight = height - margin.top - margin.bottom

    // Get or create SVG
    let svg = container.select("svg")
    if (svg.empty()) {
      svg = container
        .append("svg")
        .attr("width", width)
        .attr("height", height)
        .attr("viewBox", [0, 0, width, height])

      svg
        .append("g")
        .attr("class", "main-group")
        .attr("transform", `translate(${margin.left},${margin.top})`)
    }

    const g = svg.select(".main-group")

    // Create y scale
    let yScale = g.selectAll(".y-scale").data([0])
    if (yScale.empty()) {
      yScale = d3.scaleLinear().range([innerHeight, 0])
    } else {
      yScale = yScale.datum()
    }

    // Calculate domain based on sort column and direction
    let yDomain, yAccessor, medianValue
    const [min, max] = d3.extent(allData, d => d[sortColumn])

    if (sortColumn === "net" || sortColumn === "offense") {
      yDomain =
        sortDirection === "desc"
          ? [min - 1, max + 1] // High values at top
          : [max + 1, min - 1] // Low values at top
      yAccessor = d => d[sortColumn]
      medianValue = d3.median(allData, d => d[sortColumn])
    } else {
      // defense
      yDomain =
        sortDirection === "asc"
          ? [max + 1, min - 1] // Low values at top (best defense first)
          : [min - 1, max + 1] // High values at top (worst defense first)
      yAccessor = d => d[sortColumn]
      medianValue = d3.median(allData, d => d[sortColumn])
    }

    yScale.domain(yDomain).range([innerHeight, 0])

    // Function to calculate x positions to avoid overlap
    function calculateXPositions(data, yAccessor, currentYScale) {
      const logoSize = 25
      const minSpacing = logoSize + 2

      const sorted = [...data].sort((a, b) => yAccessor(a) - yAccessor(b))

      const positions = sorted.map((d, i) => ({
        data: d,
        y: yAccessor(d),
        x: innerWidth / 2,
        index: i,
      }))

      for (let iteration = 0; iteration < 50; iteration++) {
        let moved = false
        for (let i = 0; i < positions.length; i++) {
          for (let j = i + 1; j < positions.length; j++) {
            const dy = Math.abs(
              currentYScale(positions[i].y) - currentYScale(positions[j].y),
            )
            if (dy < minSpacing) {
              const dx = positions[i].x - positions[j].x
              const distance = Math.sqrt(dx * dx + dy * dy)
              if (distance < minSpacing) {
                const angle = Math.atan2(dy, dx || 0.01)
                const targetDistance = minSpacing
                const pushX =
                  (Math.cos(angle) * (targetDistance - distance)) / 2

                positions[i].x += pushX
                positions[j].x -= pushX
                moved = true
              }
            }
          }
          positions[i].x += (innerWidth / 2 - positions[i].x) * 0.1
          positions[i].x = Math.max(
            15,
            Math.min(innerWidth - 15, positions[i].x),
          )
        }
        if (!moved) break
      }

      return new Map(positions.map(p => [p.data.team, p.x]))
    }

    const xPositions = calculateXPositions(allData, yAccessor, yScale)

    // Create or update median line
    let medianLine = g.selectAll(".median-line").data([medianValue])
    medianLine = medianLine
      .join("line")
      .attr("class", "median-line")
      .attr("x1", 0)
      .attr("x2", innerWidth)
      .attr("stroke", "gray")
      .attr("stroke-width", 1)
      .attr("stroke-dasharray", "4,4")
      .transition()
      .duration(transitionDuration)
      .attr("y1", d => yScale(d))
      .attr("y2", d => yScale(d))
      .style("opacity", 1)

    // Create tooltip if it doesn't exist
    let graphTooltip = d3.select("body").select(".graph-tooltip")
    if (graphTooltip.empty()) {
      graphTooltip = d3
        .select("body")
        .append("div")
        .attr("class", "graph-tooltip")
        .style("position", "absolute")
        .style("display", "none")
        .style("background", "rgba(250,250,250, 0.95)")
        .style("border", "1px solid #DDD")
        .style("border-radius", "4px")
        .style("padding", "8px")
        .style("font-size", "13px")
        .style("pointer-events", "none")
        .style("z-index", "1000")
    }

    // Update images
    const images = g.selectAll("image").data(allData, d => d.team)

    images
      .join("image")
      .attr(
        "href",
        d => `https://llimllib.github.io/nbastats/logos/${getName(d.team)}.svg`,
      )
      .attr("width", 25)
      .attr("height", 25)
      .style("opacity", 0.9)
      .style("cursor", "pointer")
      .on("mouseover", function (evt, d) {
        const value = yAccessor(d)
        const label =
          sortColumn === "net"
            ? `Net: ${d3.format(".1f")(value)}`
            : sortColumn === "offense"
              ? `Off: ${d3.format(".1f")(value)}`
              : `Def: ${d3.format(".1f")(value)}`

        graphTooltip
          .style("display", "block")
          .html(`<strong>${d.team}</strong><br/>${label}`)
        d3.select(this).style("opacity", 1)
      })
      .on("mousemove", function (evt) {
        graphTooltip
          .style("left", evt.pageX + 10 + "px")
          .style("top", evt.pageY + 10 + "px")
      })
      .on("mouseout", function () {
        graphTooltip.style("display", "none")
        d3.select(this).style("opacity", 0.9)
      })
      .transition()
      .duration(transitionDuration)
      .attr("x", d => xPositions.get(d.team) - 12.5)
      .attr("y", d => yScale(yAccessor(d)) - 12.5)
  },
  options: {
    rowHeight: 33,
    graphWidth: 100,
    transitionDuration: 750,
    initialSort: "net",
  },
})

display(container)
```
