import * as Plot from "@observablehq/plot"
import { label } from "./labels.js"
import { teams } from "./teams.js"

interface Player {
  team_abbreviation: string
}

export function nbascatter(
  x: string,
  y: string,
  data: Player[],
  overrides: any,
) {
  return Plot.plot({
    width: 800,
    height: 800,
    title: "three-point shooting percentage by rate",
    marginRight: 40,
    grid: true,
    x: {
      nice: true,
      ticks: 5,
      label: "3 point field goals attempted per 36 minutes",
    },
    y: {
      nice: true,
      ticks: 5,
      label: "3-point field goal %",
    },
    marks: [
      label(data, {
        x,
        y,
        label: "player_name",
        padding: 10,
        minCellSize: 2000,
      }),
      Plot.dot(data, {
        x,
        y,
        fill: d => teams.get(d.team_abbreviation)?.colors[0],
        stroke: d => teams.get(d.team_abbreviation)?.colors[1],
        r: 8,
      }),
      Plot.tip(
        data,
        Plot.pointer({
          x,
          y,
          title: d => `${d.player_name}\n${x}: ${d[x]}\n${y}: ${d[y]}`,
        }),
      ),
    ],
  })
}
