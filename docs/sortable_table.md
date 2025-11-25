---
theme: cotton
title: Sortable table
toc: false
---

```js
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
const [minX, maxX] = d3.extent(datas, d => d.bias)
const medianX = d3.median(datas, d => d.bias)
// center the x-axis on the median
const domainX =
  medianX - minX > maxX - medianX
    ? [minX, medianX + (medianX - minX)]
    : [medianX - (maxX - medianX), maxX]
const [minY, maxY] = d3.extent(datas, d => d.net)

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

const graphWidth = 100
const graphHeight = tableHeight - 40
const graphMargin = { top: 20, right: 20, bottom: 20, left: 20 }

const svg = d3
  .create("svg")
  .attr("width", graphWidth)
  .attr("height", graphHeight)
  .attr("viewBox", [0, 0, graphWidth, graphHeight])

const g = svg
  .append("g")
  .attr("transform", `translate(${graphMargin.left},${graphMargin.top})`)

const graphInnerWidth = graphWidth - graphMargin.left - graphMargin.right
const graphInnerHeight = graphHeight - graphMargin.top - graphMargin.bottom

// Create y scale (initialize with correct domain for initial sort: net desc)
const yScale = d3
  .scaleLinear()
  .domain([minY - 1, maxY + 1]) // High values at top for desc sort
  .range([graphInnerHeight, 0])

// Add median line
g.append("line")
  .attr("class", "median-line")
  .attr("x1", 0)
  .attr("x2", graphInnerWidth)
  .attr("y1", graphInnerHeight / 2)
  .attr("y2", graphInnerHeight / 2)
  .attr("stroke", "gray")
  .attr("stroke-width", 1)
  .attr("stroke-dasharray", "4,4")
  .style("opacity", 1)

// Create tooltip
const graphTooltip = d3
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

// Function to calculate x positions to avoid overlap
function calculateXPositions(data, yAccessor, currentYScale) {
  const logoSize = 25
  const minSpacing = logoSize + 2 // minimum vertical spacing to avoid overlap

  // Sort by y position
  const sorted = [...data].sort((a, b) => yAccessor(a) - yAccessor(b))

  // Assign x positions using force-directed approach
  const positions = sorted.map((d, i) => ({
    data: d,
    y: yAccessor(d),
    x: graphInnerWidth / 2,
    index: i,
  }))

  // Simple overlap resolution - push apart overlapping logos
  for (let iteration = 0; iteration < 50; iteration++) {
    let moved = false
    for (let i = 0; i < positions.length; i++) {
      for (let j = i + 1; j < positions.length; j++) {
        const dy = Math.abs(
          currentYScale(positions[i].y) - currentYScale(positions[j].y),
        )
        if (dy < minSpacing) {
          // They overlap, push them apart horizontally
          const dx = positions[i].x - positions[j].x
          const distance = Math.sqrt(dx * dx + dy * dy)
          if (distance < minSpacing) {
            const angle = Math.atan2(dy, dx || 0.01) // avoid division by zero
            const targetDistance = minSpacing
            const pushX = (Math.cos(angle) * (targetDistance - distance)) / 2

            positions[i].x += pushX
            positions[j].x -= pushX
            moved = true
          }
        }
      }
      // Pull back toward center
      positions[i].x += (graphInnerWidth / 2 - positions[i].x) * 0.1

      // Keep within bounds
      positions[i].x = Math.max(
        15,
        Math.min(graphInnerWidth - 15, positions[i].x),
      )
    }
    if (!moved) break
  }

  return new Map(positions.map(p => [p.data.team, p.x]))
}

// Add team logos
const images = g
  .selectAll("image")
  .data(datas, d => d.team)
  .join("image")
  .attr(
    "href",
    d => `https://llimllib.github.io/nbastats/logos/${getName(d.team)}.svg`,
  )
  .attr("width", 25)
  .attr("height", 25)
  .attr("x", graphInnerWidth / 2 - 12.5)
  .attr("y", d => yScale(d.net) - 12.5)
  .style("opacity", 0.9)
  .style("cursor", "pointer")

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

// State for sorting
let sortColumn = "net"
let sortDirection = "desc"

function updateVisualization() {
  // Sort the data
  const sorted = [...tableData].sort((a, b) => {
    const aVal = a[sortColumn]
    const bVal = b[sortColumn]
    return sortDirection === "desc" ? bVal - aVal : aVal - bVal
  })

  // Update table rows
  const rows = tbody
    .selectAll("tr")
    .data(sorted, d => d.team)
    .join("tr")
    .style("border-bottom", "1px solid #aaa")

  // Clear existing cells
  rows.selectAll("td").remove()

  // Team name + logo column
  rows
    .append("td")
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

  // Determine y domain and accessor based on sortColumn
  let yDomain, yAccessor, medianValue

  if (sortColumn === "net") {
    const [min, max] = d3.extent(tableData, d => d.net)
    yDomain =
      sortDirection === "desc"
        ? [min - 1, max + 1] // High values at top
        : [max + 1, min - 1] // Low values at top
    yAccessor = d => d.net
    medianValue = d3.median(tableData, d => d.net)
  } else if (sortColumn === "offense") {
    const [min, max] = d3.extent(tableData, d => d.offense)
    yDomain =
      sortDirection === "desc"
        ? [min - 1, max + 1] // High values at top
        : [max + 1, min - 1] // Low values at top
    yAccessor = d => d.offense
    medianValue = d3.median(tableData, d => d.offense)
  } else {
    // defense
    const [min, max] = d3.extent(tableData, d => d.defense)
    yDomain =
      sortDirection === "asc"
        ? [max + 1, min - 1] // Low values at top (best defense first)
        : [min - 1, max + 1] // High values at top (worst defense first)
    yAccessor = d => d.defense
    medianValue = d3.median(tableData, d => d.defense)
  }

  // Update y scale with consistent range
  yScale.domain(yDomain).range([graphInnerHeight, 0])

  // Calculate x positions to avoid overlap
  const xPositions = calculateXPositions(datas, yAccessor, yScale)

  // Update median line position (show for all columns)
  g.select(".median-line")
    .transition()
    .duration(750)
    .attr("y1", yScale(medianValue))
    .attr("y2", yScale(medianValue))
    .style("opacity", 1)

  // Transition images to new positions
  g.selectAll("image")
    .data(datas, d => d.team)
    .transition()
    .duration(750)
    .attr("x", d => xPositions.get(d.team) - 12.5)
    .attr("y", d => yScale(yAccessor(d)) - 12.5)

  // Update tooltip handler for current sort
  g.selectAll("image")
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
}

// Table header
const thead = table.append("thead")
const headerRow = thead
  .append("tr")
  .style("position", "sticky")
  .style("top", "0")
  .style("z-index", "10")
  .style("background", "transparent")
  .style("backdrop-filter", "blur(4px)")

headerRow
  .append("th")
  .text("")
  .style("padding", "8px")
  .style("text-align", "left")
  .style("font-weight", "600")

const createSortableHeader = (text, column) => {
  const th = headerRow
    .append("th")
    .style("padding", "8px")
    .style("text-align", "right")
    .style("font-weight", "600")
    .style("cursor", "pointer")
    .style("user-select", "none")
    .style("transition", "background-color 0.2s")
    .on("mouseenter", function () {
      d3.select(this).style("background-color", "rgba(245, 245, 245, 0.8)")
    })
    .on("mouseleave", function () {
      d3.select(this).style("background-color", "transparent")
    })
    .on("click", () => {
      if (sortColumn === column) {
        sortDirection = sortDirection === "desc" ? "asc" : "desc"
      } else {
        sortColumn = column
        sortDirection = column === "defense" ? "asc" : "desc" // defense: lower is better
      }

      // Update all headers to show/hide arrows
      updateHeaderArrows()

      updateVisualization()
    })

  return th
}

function updateHeaderArrows() {
  const headers = [
    { text: "Offensive rating", column: "offense" },
    { text: "Defensive rating", column: "defense" },
    { text: "Net", column: "net" },
  ]

  headerRow.selectAll("th").each(function (d, i) {
    if (i === 0) return // Skip the first empty header

    const header = d3.select(this)
    const headerInfo = headers[i - 1]

    if (headerInfo.column === sortColumn) {
      const arrow = sortDirection === "desc" ? "▼" : "▲"
      header.html(`${headerInfo.text} <span style="opacity: 1">${arrow}</span>`)
    } else {
      // Reserve space with invisible arrow
      header.html(`${headerInfo.text} <span style="opacity: 0">▼</span>`)
    }
  })
}

createSortableHeader("Offensive rating", "offense")
createSortableHeader("Defensive rating", "defense")
createSortableHeader("Net", "net")

// Table body
const tbody = table.append("tbody")

// initial arrow state
updateHeaderArrows()

// Initial render
updateVisualization()

// Create flex container
const flexContainer = d3
  .create("div")
  .style("display", "flex")
  .style("align-items", "flex-start")
  .style("gap", "20px")
  .style("margin", "20px 0")

flexContainer.append(() => tableContainer.node())
flexContainer.append(() => svg.node())

display(flexContainer.node())
```
