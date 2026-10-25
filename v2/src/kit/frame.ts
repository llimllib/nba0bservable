// The frame every chart renders into, and the thing that gets exported:
// title, context line with an inline legend, the chart body, and a footer
// with the source and the URL of this exact view
import { create } from "d3"
import { color, font, type } from "./theme"
import type { Body, Description } from "./tool"

export const sizes = {
  auto: { width: 720, height: undefined, label: "Fit" },
  square: { width: 720, height: 720, label: "Square" },
  wide: { width: 800, height: 450, label: "16:9" },
  tall: { width: 720, height: 900, label: "4:5" },
} as const
export type Size = keyof typeof sizes

const pad = 28
const baseHeaderHeight = pad + type.title.size + 8 + type.context.size + 22
const footerHeight = 18 + type.footer.size + pad - 6

export interface Frame {
  svg: SVGSVGElement
  body: Body
  // offset of the body within the frame
  bx: number
  by: number
  title: SVGTextElement
  context: SVGTextElement
}

export function buildFrame(
  container: HTMLElement,
  size: Size,
  desc: Description,
  url: string,
  renderBody: (
    g: SVGGElement,
    size: { width: number; height?: number },
  ) => Body,
): Frame {
  const { width, height } = sizes[size]
  const svg = create("svg")
    .attr("xmlns", "http://www.w3.org/2000/svg")
    .attr("class", "frame")
    .attr("font-family", font.sans)
    .attr("fill", color.ink)
    .style("font-variant-numeric", "tabular-nums")
  // attach first, so text can be measured
  container.replaceChildren(svg.node()!)

  const bg = svg.append("rect").attr("fill", color.bg)

  const title = svg
    .append("text")
    .attr("class", "frame-title")
    .attr("x", pad)
    .attr("y", pad + type.title.size - 4)
    .attr("font-size", type.title.size)
    .attr("font-weight", type.title.weight)
    .attr("letter-spacing", "-0.01em")
    .text(desc.title)

  const contextY = pad + type.title.size + 8 + type.context.size - 2
  const context = svg
    .append("text")
    .attr("class", "frame-context")
    .attr("x", pad)
    .attr("y", contextY)
    .attr("font-size", type.context.size)
    .attr("fill", color.muted)
    .text(desc.context)

  // the legend continues the context line, or goes on its own line below it
  // when it doesn't fit. It's drawn from x = 0, then moved into place
  const legend = svg.append("g").attr("class", "frame-legend")
  let lx = 0
  for (const item of desc.legend ?? []) {
    const cy = contextY - type.context.size * 0.33
    // the symbol's width, so the text after it lines up
    let w = 10
    if (item.symbol === "dot")
      legend
        .append("circle")
        .attr("cx", lx + 5)
        .attr("cy", cy)
        .attr("r", 4.5)
        .attr("fill", item.color)
    else if (item.symbol === "tick")
      legend
        .append("line")
        .attr("x1", lx + 5)
        .attr("x2", lx + 5)
        .attr("y1", cy - 7)
        .attr("y2", cy + 7)
        .attr("stroke", item.color)
        .attr("stroke-width", 2.5)
    else {
      // a small bar, with its label inside as on the chart's own bars
      const rect = legend
        .append("rect")
        .attr("y", cy - 9)
        .attr("height", 18)
        .attr("rx", 2)
        .attr("fill", item.color)
      const label = legend
        .append("text")
        .attr("y", cy + 4)
        .attr("text-anchor", "middle")
        .attr("font-size", 11)
        .attr("font-weight", 600)
        .attr("fill", color.bg)
        .text(item.label ?? "")
      w = Math.max(label.node()!.getComputedTextLength() + 12, 16)
      rect.attr("x", lx).attr("width", w)
      label.attr("x", lx + w / 2)
    }
    const t = legend
      .append("text")
      .attr("x", lx + w + 5)
      .attr("y", contextY)
      .attr("font-size", type.context.size)
      .attr("fill", color.muted)
      .text(item.text)
    lx += w + 5 + t.node()!.getComputedTextLength() + 16
  }
  const inlineX = pad + context.node()!.getComputedTextLength() + 14
  const wraps = desc.legend?.length && inlineX + lx - 16 > width - pad
  const legendLine = type.context.size + 12
  legend.attr(
    "transform",
    wraps ? `translate(${pad},${legendLine})` : `translate(${inlineX},0)`,
  )
  const headerHeight = baseHeaderHeight + (wraps ? legendLine : 0)

  const g = svg
    .append("g")
    .attr("class", "frame-body")
    .attr("transform", `translate(${pad},${headerHeight})`)
  const bodyHeight = height && height - headerHeight - footerHeight
  const body = renderBody(g.node()!, {
    width: width - pad * 2,
    height: bodyHeight,
  })

  const total = height ?? headerHeight + body.height + footerHeight
  const footerY = total - pad + 6
  svg
    .append("text")
    .attr("x", pad)
    .attr("y", footerY)
    .attr("font-size", type.footer.size)
    .attr("fill", color.faint)
    .text(desc.source)
  svg
    .append("text")
    .attr("x", width - pad)
    .attr("y", footerY)
    .attr("text-anchor", "end")
    .attr("font-size", type.footer.size)
    .attr("font-weight", 500)
    .attr("fill", color.muted)
    .text(url)

  svg
    .attr("width", width)
    .attr("height", total)
    .attr("viewBox", `0 0 ${width} ${total}`)
  bg.attr("width", width).attr("height", total)

  return {
    svg: svg.node()!,
    body,
    bx: pad,
    by: headerHeight,
    title: title.node()!,
    context: context.node()!,
  }
}
