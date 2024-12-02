import type { Team } from "./teams.js"

import { extent } from "d3-array"
import { create, select } from "d3-selection"
import { interpolatePRGn } from "d3-scale-chromatic"
import * as Plot from "@observablehq/plot"

import { teams } from "./teams.js"
import { label } from "./labels.js"
import { sliceQuantile } from "./util.js"

function getTeam(abbrev: string): Team {
  const team = teams.get(abbrev)
  if (!team) {
    throw new Error(`unable to get team ${abbrev}`)
  }
  return team
}

export function epmDiamond(
  epm: { team_alias: string; p_mp_48: number }[],
  options: {
    by: string
    percentile: number
    selectedTeams: string[]
    showBackground: boolean
    size?: number
    title: string
  },
) {
  options.size ||= 600
  const { by, selectedTeams, percentile, showBackground, size, title } = options
  console.log(options, selectedTeams)

  const x = "off"
  const y = "def"

  let data = sliceQuantile(epm, by, (100 - percentile) / 100)
  if (selectedTeams?.length > 0) {
    data = data.filter(d => selectedTeams.includes(d.team_alias))
  }

  // Used if the "show rest of NBA" option is selected, to show the rest of the
  // league as background data
  const background = sliceQuantile(epm, by, (100 - percentile) / 100)

  const width = options.size ?? 800
  const height = options.size ?? 800

  console.log(data, "data", epm)

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
        label: "player_name",
        padding: 10,
        minCellSize: 2000,
        rotate: 45,
      }),
      showBackground
        ? Plot.dot(background, { x, y, fill: "grey", fillOpacity: 0.1, r: 8 })
        : null,
      Plot.dot(data, {
        x,
        y,
        fill: d => getTeam(d.team_alias).colors[0],
        stroke: d => getTeam(d.team_alias).colors[1],
        r: 8,
      }),
    ],
  })

  select(epmplot)
    .attr("transform", "rotate(-45)")
    .style("padding-left", `${size * 0.15}px`)
  // .style("padding-top", `${size * 0.2}px`);

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
    .html(`Top ${percentile}% by minutes<br>Data by dunksandthrees.com`)
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
    console.log(offset, pct, grad(pct))
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

  // TODO: add title back
  // title: "Predictive EPM",
  // subtitle: `Data by dunksandthrees.com. top ${percentile}% by predicted minutes played`,
  // select(epmplot)
  //   .style("transform", "rotate(-45deg)")
  //   .style("padding-top", `${size * 0.2}px`);
  // .style("padding", "140px");

  return container.node()
}
