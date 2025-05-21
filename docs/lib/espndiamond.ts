import type { Selection } from "d3-selection"
import type { Team } from "./teams.js"

import { extent } from "d3-array"
import { create, select } from "d3-selection"
import { interpolatePRGn } from "d3-scale-chromatic"
import * as Plot from "@observablehq/plot"

import { teams } from "./teams.js"
import { label } from "./labels.js"
import { sliceQuantile } from "./util.js"

function getTeam(abbrev: string): Team {
  // if there's an espnName that matches, use it
  const eteam = Array.from(teams.values()).filter(t => t.espnName == abbrev)
  if (eteam.length > 0) return eteam[0]

  // otherwise match on the key name
  const team = teams.get(abbrev)
  if (!team) {
    throw new Error(`unable to get team ${abbrev}`)
  }
  return team
}

function handleTooltip(
  tooltip: Selection<any, unknown, any, undefined>,
  plot: any,
) {
  select(plot)
    .selectAll("circle")
    .on("mousemove", (evt, d) => {
      // The <title> element and our tooltip will fight to display over one
      // another, so remove the <title> element and save its contents to the __title
      // attribute on the image
      const t = select(evt.target)
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

export function espnDiamond(
  espnData: {
    name: string
    oNetPts: number
    dNetPts: number
    tNetPts: number
    n: number
    minutes: number
  }[],
  options: {
    by: string
    percentile: number
    selectedTeams: string[]
    showBackground: boolean
    size?: number
    title: string
    x: string
    y: string
    extraSubtitle: string
  },
) {
  options.size ||= 600
  const { by, selectedTeams, percentile, showBackground, size, title } = options

  const x = options.x || "oNetPts"
  const y = options.y || "dNetPts"

  let data = sliceQuantile(espnData, by, (100 - percentile) / 100)
  if (selectedTeams?.length > 0) {
    data = data.filter(d => selectedTeams.includes(d.team))
  }

  // Used if the "show rest of NBA" option is selected, to show the rest of the
  // league as background data
  const background = sliceQuantile(espnData, by, (100 - percentile) / 100)

  const width = options.size ?? 800
  const height = options.size ?? 800

  const epmplot = Plot.plot({
    width: width,
    height: height,
    marginRight: 40,
    grid: true,
    x: {
      nice: true,
      ticks: 5,
      tickRotate: 45,
      label: null,
    },
    y: {
      nice: true,
      ticks: 5,
      tickRotate: 45,
      label: null,
    },
    marks: [
      label(data, {
        x,
        y,
        label: "name",
        padding: 10,
        minCellSize: 2000,
        rotate: 45,
      }),
      showBackground
        ? Plot.dot(background, {
          x,
          y,
          fill: "grey",
          fillOpacity: 0.1,
          r: 8,
          title: d => `${d.name}\n${d.team}\n${x}: ${d[x]}\n${y}: ${d[y]}`,
        })
        : null,
      Plot.dot(data, {
        x,
        y,
        fill: d => getTeam(d.team).colors[0],
        stroke: d => getTeam(d.team).colors[1],
        title: d => `${d.name}\n${d.team}\n${x}: ${d[x]}\n${y}: ${d[y]}`,
        r: 8,
      }),
    ],
  })

  select(epmplot)
    .attr("transform", "rotate(-45)")
    .style("padding-left", `${size * 0.15}px`)
    .style("overflow", "visible")

  const container = create("figure")
    .style("margin-bottom", "80px")
    .style("margin-top", "80px")
  container
    .insert("h1", ":first-child")
    .style("position", "relative")
    .style("top", "60px")
    .style("left", "10px")
    .text(title)
  container
    .append("h3")
    .style("position", "relative")
    .style("top", "60px")
    .style("left", "10px")
    .html(
      `Top ${percentile}% by minutes${options.extraSubtitle}<br>Data by espnanalytics.com`,
    )
  container
    .append("div")
    .text("← Better defense")
    .style("position", "relative")
    .style("top", "710px")
    .style("left", "20px")
    .style("transform", "rotate(45deg)")
  container
    .append("div")
    .text("Better offense →")
    .style("position", "relative")
    .style("top", "330px")
    .style("left", "480px")
    .style("transform", "rotate(-45deg)")

  container.node()?.appendChild(epmplot)

  const gradient = select(epmplot)
    .append("defs")
    .append("linearGradient")
    .attr("id", "myGradient")
    .attr("x1", "0%")
    .attr("y1", "100%")
    .attr("x2", "100%")
    .attr("y2", "0%")

  const grad = interpolatePRGn
  const gradStops = [
    [0, 0.2],
    [30, 0.5],
    [70, 0.5],
    [100, 0.8],
  ]
  gradStops.forEach(([offset, pct]) => {
    return gradient
      .append("stop")
      .attr("offset", `${offset}%`)
      .attr("stop-color", grad(pct))
  })

  // Background gradient rectangle
  const margin = 40
  select(epmplot)
    .insert("rect", ":first-child")
    .attr("x", margin)
    .attr("y", margin)
    .attr("width", width - 2 * margin)
    .attr("height", height - 2 * margin)
    .attr("fill", "url(#myGradient)")
    .attr("fill-opacity", 0.4)

  if (!document.querySelector(".toolTip")) {
    console.log("appending tooltip")
    const tooltip = select("body")
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
    handleTooltip(tooltip, epmplot)
  }
  handleTooltip(select(".toolTip"), epmplot)

  return container.node()
}
