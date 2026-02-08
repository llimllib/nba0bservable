import { create, select } from "d3-selection"
import * as Plot from "@observablehq/plot"

/**
 * LineEndLabels - A Plot mark that places labels at the end of lines
 * with collision detection to prevent overlapping text.
 *
 * Usage:
 *   lineEndLabels(data, {
 *     x: "gameN",
 *     y: "cumValue",
 *     z: "name",        // grouping variable (which line)
 *     label: "name",    // field to use for label text
 *     padding: 5,       // horizontal offset from point
 *     lineHeight: 14,   // approximate height of each label for collision detection
 *   })
 */

interface LineEndLabelsOptions {
  x: string
  y: string
  z: string // grouping variable - identifies which line each point belongs to
  label: string
  padding?: number
  lineHeight?: number
  fill?: string
}

interface LabelData {
  x: number
  y: number
  originalY: number
  text: string
  color: string
  data: any
}

export class LineEndLabels extends Plot.Mark {
  data: any[]
  xField: string
  yField: string
  zField: string
  labelField: string
  padding: number
  lineHeight: number
  fill: string

  constructor(data: any[], options: LineEndLabelsOptions) {
    super(
      // @ts-expect-error the typing is not right for super()
      data,
      [
        { name: "x", value: options.x, scale: "x", optional: true },
        { name: "y", value: options.y, scale: "y", optional: true },
        { name: "z", value: options.z, optional: true },
        { name: "label", value: options.label },
      ],
      options,
    )
    // @ts-expect-error handle Observable SQL results
    this.data = Array.isArray(data) ? data : data.toArray()
    this.xField = options.x
    this.yField = options.y
    this.zField = options.z
    this.labelField = options.label
    this.padding = options.padding ?? 5
    this.lineHeight = options.lineHeight ?? 14
    this.fill = options.fill ?? "currentColor"
  }

  render(_index: any, scales: any, _point: any, style: any): any {
    // Find the last point for each group (line)
    const lastPoints = this.findLastPoints()

    // Convert to screen coordinates
    const colorScale = scales.color
    const labels: LabelData[] = lastPoints.map(d => ({
      x: scales.x(d[this.xField]),
      y: scales.y(d[this.yField]),
      originalY: scales.y(d[this.yField]),
      text: d[this.labelField],
      color: colorScale ? colorScale(d[this.zField]) : "currentColor",
      data: d,
    }))

    // Sort by y position for collision detection
    labels.sort((a, b) => a.y - b.y)

    // Resolve collisions
    this.resolveCollisions(labels, 0, style.height)

    // Render the labels with background for better visibility
    const g = create("svg:g")
    const node = g.node()
    const selection = select(node).style("font", "10px sans-serif")

    // Create a group for each label containing background + text
    const labelGroups = selection
      .selectAll("g")
      .data(labels)
      .join("g")
      .attr("transform", d => `translate(${d.x + this.padding}, ${d.y})`)

    // Add placeholder rects (will be sized after DOM attachment)
    labelGroups
      .append("rect")
      .attr("class", "label-bg")
      .attr("fill", "white")
      .attr("fill-opacity", 0.65)
      .attr("rx", 2)
      .attr("ry", 2)

    // Add colored dot to match line color
    labelGroups
      .append("circle")
      .attr("cx", 4)
      .attr("cy", 0)
      .attr("r", 3)
      .attr("fill", d => d.color)

    // Add the text (offset to account for dot)
    labelGroups
      .append("text")
      .attr("x", 10)
      .attr("dy", "0.35em")
      .attr("text-anchor", "start")
      .attr("fill", this.fill)
      .text(d => d.text)

    // Use requestAnimationFrame to measure text after DOM attachment
    requestAnimationFrame(() => {
      labelGroups.each(function () {
        const group = select(this)
        const text = group.select("text")
        const rect = group.select("rect.label-bg")
        const textBbox = (text.node() as SVGTextElement).getBBox()

        // Background covers dot + text
        rect
          .attr("x", -1)
          .attr("y", textBbox.y - 1)
          .attr("width", textBbox.x + textBbox.width + 3)
          .attr("height", textBbox.height + 2)
      })
    })

    return node
  }

  /**
   * Find the last (rightmost) point for each unique value of the z field
   */
  private findLastPoints(): any[] {
    const groups = new Map<string, any>()

    for (const d of this.data) {
      const key = d[this.zField]
      const existing = groups.get(key)
      if (!existing || d[this.xField] > existing[this.xField]) {
        groups.set(key, d)
      }
    }

    return Array.from(groups.values())
  }

  /**
   * Iteratively resolve label collisions by pushing overlapping labels apart
   */
  private resolveCollisions(
    labels: LabelData[],
    minY: number,
    maxY: number,
  ): void {
    const maxIterations = 100
    const minSpacing = this.lineHeight

    for (let iter = 0; iter < maxIterations; iter++) {
      let hasCollision = false

      // Sort by current y position
      labels.sort((a, b) => a.y - b.y)

      // Check each adjacent pair for collisions
      for (let i = 0; i < labels.length - 1; i++) {
        const current = labels[i]
        const next = labels[i + 1]
        const overlap = current.y + minSpacing - next.y

        if (overlap > 0) {
          hasCollision = true
          // Push labels apart, splitting the difference
          const shift = overlap / 2 + 0.5
          current.y -= shift
          next.y += shift
        }
      }

      // Clamp to bounds
      for (const label of labels) {
        label.y = Math.max(minY + minSpacing / 2, label.y)
        label.y = Math.min(maxY - minSpacing / 2, label.y)
      }

      if (!hasCollision) break
    }
  }
}

/**
 * Create a LineEndLabels mark
 */
export function lineEndLabels(
  data: any[],
  options: LineEndLabelsOptions,
): LineEndLabels {
  return new LineEndLabels(data, options)
}
