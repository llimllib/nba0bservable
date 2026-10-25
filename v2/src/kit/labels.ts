// Automatic labels for scatter plots, carried over from v1's lib/labels.ts:
// each point's label goes on the side of the point facing the open space of
// its Voronoi cell. Points are labeled in priority order, and a label is
// skipped when its cell is too small or it would cover another label, a dot,
// or an obstacle (a reference line, a note)
import { Delaunay, polygonArea, polygonCentroid, select } from "d3"

export interface LabelPoint {
  x: number
  y: number
  r: number
  text: string
  // higher is labeled first
  priority: number
  // label it whatever its cell size
  always?: boolean
}

type Side = "right" | "top" | "left" | "bottom"
export interface Box {
  x0: number
  y0: number
  x1: number
  y1: number
}

const overlaps = (a: Box, b: Box) =>
  a.x0 < b.x1 && b.x0 < a.x1 && a.y0 < b.y1 && b.y0 < a.y1

// does a circle intersect a box
function hits(b: Box, x: number, y: number, r: number) {
  const dx = x - Math.max(b.x0, Math.min(x, b.x1))
  const dy = y - Math.max(b.y0, Math.min(y, b.y1))
  return dx * dx + dy * dy < r * r
}

export function placeLabels(
  node: SVGGElement,
  points: LabelPoint[],
  bounds: { width: number; height: number },
  opts: { size: number; pad?: number; minCell?: number; avoid?: Box[] },
) {
  const { size, pad = 4, minCell = 1500, avoid = [] } = opts
  if (!points.length) return
  const g = select(node)
  const voronoi = Delaunay.from(
    points,
    p => p.x,
    p => p.y,
  ).voronoi([0, 0, bounds.width, bounds.height])

  const measure = g.append("text").attr("font-size", size)
  const width = (s: string) => measure.text(s).node()!.getComputedTextLength()

  const box = (p: LabelPoint, side: Side, w: number): Box => {
    const h = size
    const d = p.r + pad
    if (side === "right")
      return { x0: p.x + d, y0: p.y - h / 2, x1: p.x + d + w, y1: p.y + h / 2 }
    if (side === "left")
      return { x0: p.x - d - w, y0: p.y - h / 2, x1: p.x - d, y1: p.y + h / 2 }
    if (side === "top")
      return { x0: p.x - w / 2, y0: p.y - d - h, x1: p.x + w / 2, y1: p.y - d }
    return { x0: p.x - w / 2, y0: p.y + d, x1: p.x + w / 2, y1: p.y + d + h }
  }

  const placed: Box[] = [...avoid]
  const order = points
    .map((_, i) => i)
    .sort((a, b) => points[b].priority - points[a].priority)
  for (const i of order) {
    const p = points[i]
    const cell = voronoi.cellPolygon(i)
    // coincident points have no cell
    if (!cell) continue
    if (!p.always && -polygonArea(cell) < minCell) continue
    // the side facing the cell's centroid first, then the others
    const [cx, cy] = polygonCentroid(cell)
    const sides: Side[] = ["right", "bottom", "left", "top"]
    const k =
      (Math.round((Math.atan2(cy - p.y, cx - p.x) / Math.PI) * 2) + 4) % 4
    const tries = [sides[k], ...sides.filter((_, j) => j !== k)]
    const w = width(p.text)
    const inBounds = (b: Box) =>
      b.x0 >= 0 && b.x1 <= bounds.width && b.y0 >= 0 && b.y1 <= bounds.height
    const clear = (b: Box) =>
      inBounds(b) &&
      !placed.some(o => overlaps(b, o)) &&
      !points.some((q, j) => j !== i && hits(b, q.x, q.y, q.r))
    // a label that must show takes the first side in bounds when none is
    // clear: overlapping beats a highlighted player with no name
    const b =
      tries.map(side => box(p, side, w)).find(clear) ??
      (p.always ? tries.map(side => box(p, side, w)).find(inBounds) : undefined)
    if (!b) continue
    placed.push(b)
    g.append("text")
      .attr("x", (b.x0 + b.x1) / 2)
      .attr("y", b.y1 - size * 0.18)
      .attr("text-anchor", "middle")
      .attr("font-size", size)
      .text(p.text)
  }
  measure.remove()
}
