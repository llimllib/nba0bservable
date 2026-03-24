import * as Plot from "@observablehq/plot"
import * as d3 from "d3"

interface TeamData {
  team: string
  [key: string]: number | string
}

interface FourFactorPlotOptions {
  data: TeamData[]
  logoUrl: (team: string) => string
  logoWidth?: (d: TeamData) => number
  xCol: string
  yCol: string
  title: string
  xLabel: string
  yLabel: string
  xReverse?: boolean
  yReverse?: boolean
  yPad?: number
  isoSpacing?: number
}

export function fourFactorPlot({
  data,
  logoUrl,
  logoWidth = () => 36,
  xCol,
  yCol,
  title,
  xLabel,
  yLabel,
  xReverse = false,
  yReverse = false,
  yPad = 0,
  isoSpacing = 5,
}: FourFactorPlotOptions) {
  // Compute tight domains from the data, then generate iso lines within them
  const xVals = data.map(d => d[xCol] as number)
  const yVals = data.map(d => d[yCol] as number)
  const xDomain = d3.nice(...(d3.extent(xVals) as [number, number]), 4)
  const yDomain = d3.nice(...(d3.extent(yVals) as [number, number]), 4)
  yDomain[0] -= yPad
  yDomain[1] += yPad

  // Iso lines: parallel lines with data slope of -1, showing where
  // "1 unit on x = 1 unit on y". When domains are equal these appear 45°;
  // when one axis is stretched, the tilt reveals the distortion.
  // Each line: y = -sign*x + c. Spaced by isoSpacing along x for even spacing.
  const sign = (xReverse ? -1 : 1) * (yReverse ? -1 : 1)
  const cMid =
    (yDomain[0] + yDomain[1]) / 2 + sign * ((xDomain[0] + xDomain[1]) / 2)
  const isoData = d3
    .range(cMid - 30 * isoSpacing, cMid + 30 * isoSpacing + 1, isoSpacing)
    .map(c => ({
      x1: xDomain[0] - 20,
      y1: c - sign * (xDomain[0] - 20),
      x2: xDomain[1] + 20,
      y2: c - sign * (xDomain[1] + 20),
    }))

  return Plot.plot({
    width: 540,
    height: 540,
    title,
    clip: true,
    style: { fontSize: "14px" },
    x: {
      domain: xDomain,
      label: xLabel,
      labelAnchor: "center",
      labelOffset: 40,
      labelArrow: "none",
      reverse: xReverse,
      ticks: 4,
    },
    y: {
      domain: yDomain,
      label: yLabel,
      labelAnchor: "center",
      labelOffset: 50,
      labelArrow: "none",
      reverse: yReverse,
      ticks: 4,
    },
    marks: [
      Plot.link(isoData, {
        x1: "x1",
        y1: "y1",
        x2: "x2",
        y2: "y2",
        stroke: "#bbb",
        strokeWidth: 0.75,
      }),
      Plot.image(data, {
        x: xCol,
        y: yCol,
        src: (d: TeamData) => logoUrl(d.team),
        width: logoWidth,
        title: (d: TeamData) =>
          `${d.team}\n${xLabel}: ${d[xCol]}%\n${yLabel}: ${d[yCol]}%`,
      }),
      Plot.tip(
        data,
        Plot.pointer({
          x: xCol,
          y: yCol,
          title: (d: TeamData) =>
            `${d.team}\n${xLabel}: ${d[xCol]}%\n${yLabel}: ${d[yCol]}%`,
        }),
      ),
    ],
  })
}
