// The frame every chart renders into, and the thing that gets exported: a
// header band (headline, deck, logo box) in the team's color or ink, a
// legend strip, the chart body, and a footer with the source and the URL of
// this exact view. See docs/plans/2026-10-25-newspaper-design.md
import { create, rgb, type Selection } from "d3"
import { teams } from "./teams"
import { color, font, type } from "./theme"
import type { Body, Description, LegendItem } from "./tool"

export const sizes = {
  auto: { width: 720, height: undefined, label: "Fit" },
  square: { width: 720, height: 720, label: "Square" },
  wide: { width: 800, height: 450, label: "16:9" },
  tall: { width: 720, height: 900, label: "4:5" },
} as const
export type Size = keyof typeof sizes

const pad = 28
const stripHeight = 34
const footerHeight = 40

export interface Frame {
  svg: SVGSVGElement
  body: Body
  // offset of the body within the frame
  bx: number
  by: number
  title: SVGTextElement
  context: SVGTextElement
}

// WCAG relative luminance and contrast ratio
function luminance(c: string) {
  const { r, g, b } = rgb(c)
  const [R, G, B] = [r, g, b].map(v => {
    const s = v / 255
    return s <= 0.03928 ? s / 12.92 : ((s + 0.055) / 1.055) ** 2.4
  })
  return 0.2126 * R + 0.7152 * G + 0.0722 * B
}
export function contrast(a: string, b: string) {
  const [hi, lo] = [luminance(a), luminance(b)].sort((x, y) => y - x)
  return (hi + 0.05) / (lo + 0.05)
}

// The band's color and the text color that reads on it, whichever of white
// and ink contrasts more. When neither reaches WCAG's 4.5:1 (Portland's red),
// the band darkens until white does
export function bandColors(abbrev?: string) {
  const team = abbrev ? teams.get(abbrev) : undefined
  if (!team) return { band: color.ink, text: color.bg, team }
  let band = team.colors[0]
  if (contrast(band, color.ink) >= 4.5) return { band, text: color.ink, team }
  while (contrast(band, "#fff") < 4.5) band = rgb(band).darker(0.1).formatHex()
  return { band, text: "#fff", team }
}

// ESPN's logo CDN uses the NBA abbreviation, except for these two. (Not the
// abbreviations in ESPN's analytics data: that's BRK, SAN)
const logoCodes: Record<string, string> = { NOP: "no", UTA: "utah" }
export const logoUrl = (abbrev: string) =>
  `https://a.espncdn.com/i/teamlogos/nba/500/${logoCodes[abbrev] ?? abbrev.toLowerCase()}.png`

// Load the faces frames draw with before the first render: text is measured
// as it's laid out, and a face still loading measures as its fallback
export function fontsReady() {
  const faces = [
    ...["500", "600", "700"].map(w => `${w} 16px "Barlow Condensed"`),
    `400 16px "JetBrains Mono"`,
    `600 16px "JetBrains Mono"`,
    `400 16px "Source Serif 4"`,
  ]
  return Promise.all(faces.map(f => document.fonts.load(f)))
}

// Break text into lines no wider than `width`, measuring with `probe`
function wrap(probe: SVGTextElement, text: string, width: number) {
  const lines: string[] = []
  let line = ""
  for (const word of text.split(/\s+/)) {
    const next = line ? `${line} ${word}` : word
    probe.textContent = next
    if (line && probe.getComputedTextLength() > width) {
      lines.push(line)
      line = word
    } else line = next
  }
  if (line) lines.push(line)
  probe.textContent = ""
  return lines
}

type G = Selection<SVGGElement, undefined, null, undefined>

// Agate: small mono caps, for anything that's metadata (axis titles, legend,
// source). Use with selection.call(agate)
export function agate(s: Selection<any, any, any, any>) {
  s.attr("font-family", font.agate)
    .attr("font-size", type.agate.size)
    .attr("font-weight", 400)
    .attr("letter-spacing", "0.04em")
    .attr("fill", color.muted)
    .style("text-transform", "uppercase")
}

function drawLegend(g: G, items: LegendItem[], y: number) {
  let x = 0
  const cy = y - type.agate.size * 0.35
  for (const item of items) {
    // the symbol's width, so the text after it lines up
    let w = 10
    if (item.symbol === "dot")
      g.append("circle")
        .attr("cx", x + 5)
        .attr("cy", cy)
        .attr("r", 4.5)
        .attr("fill", item.color)
    else if (item.symbol === "dash") {
      // a reference line, drawn as the chart draws it
      w = 22
      g.append("line")
        .attr("x1", x)
        .attr("x2", x + w)
        .attr("y1", cy)
        .attr("y2", cy)
        .attr("stroke", item.color)
        .attr("stroke-width", 1.25)
        .attr("stroke-dasharray", "5 4")
    } else if (item.symbol === "tick")
      g.append("line")
        .attr("x1", x + 5)
        .attr("x2", x + 5)
        .attr("y1", cy - 7)
        .attr("y2", cy + 7)
        .attr("stroke", item.color)
        .attr("stroke-width", 2.5)
    else {
      // a small bar, with its label inside as on the chart's own bars
      const rect = g
        .append("rect")
        .attr("y", cy - 8)
        .attr("height", 16)
        .attr("fill", item.color)
      const label = g
        .append("text")
        .attr("y", cy + 4)
        .attr("text-anchor", "middle")
        .attr("font-family", font.head)
        .attr("font-size", 12)
        .attr("font-weight", 600)
        .attr("fill", color.bg)
        .text(item.label ?? "")
      w = Math.max(label.node()!.getComputedTextLength() + 10, 16)
      rect.attr("x", x).attr("width", w)
      label.attr("x", x + w / 2)
    }
    const t = g
      .append("text")
      .attr("x", x + w + 6)
      .attr("y", y)
      .text(item.text)
    x += w + 6 + t.node()!.getComputedTextLength() + 18
  }
  return x - 18
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
    .attr("font-family", font.head)
    .attr("fill", color.ink)
    .style("font-variant-numeric", "tabular-nums")
  // attach first, so text can be measured
  container.replaceChildren(svg.node()!)

  const bg = svg.append("rect").attr("fill", color.bg)

  // --- the band: headline and deck on the left, the logo box on the right
  const { band, text: onBand, team } = bandColors(desc.team)
  const bandRect = svg.append("rect").attr("fill", band).attr("width", width)
  // short frames (16:9) get a smaller band, so the chart keeps its room
  const compact = height !== undefined && height < 600
  const deckSize = compact ? 15 : type.deck.size
  const deckLine = deckSize * 1.3
  const titleTop = pad - 4
  const title = svg
    .append("text")
    .attr("class", "frame-title")
    .attr("x", pad)
    .attr("font-family", font.head)
    .attr("font-weight", type.title.weight)
    .attr("fill", onBand)
    .style("text-transform", "uppercase")
    .text(desc.title)

  // the logo box is a fixed width at the band's right end, as tall as the
  // band
  const box = compact ? 92 : 116
  const textWidth = width - pad * 2 - box
  // the headline shrinks to fit on one line
  let titleSize = compact ? 32 : type.title.size
  title.attr("font-size", titleSize)
  const tw = title.node()!.getComputedTextLength()
  if (tw > textWidth) {
    titleSize = Math.max(24, (titleSize * textWidth) / tw)
    title.attr("font-size", titleSize)
  }
  title.attr("y", titleTop + titleSize * 0.82)

  const context = svg
    .append("text")
    .attr("class", "frame-context")
    .attr("font-family", font.serif)
    .attr("font-size", deckSize)
    .attr("fill", onBand)
  const lines = wrap(context.node()!, desc.context, textWidth)
  const deckTop = titleTop + titleSize * 0.82 + 8 + deckSize
  context.attr("data-text", desc.context)
  lines.forEach((l, i) =>
    context
      .append("tspan")
      .attr("x", pad)
      .attr("y", deckTop + i * deckLine)
      .text(l),
  )
  const bandHeight = Math.max(
    box,
    deckTop + (lines.length - 1) * deckLine + pad - 6,
  )
  bandRect.attr("height", bandHeight)

  // the logo box: newsprint, so every logo reads whatever the band color
  const bx0 = width - box
  svg
    .append("rect")
    .attr("x", bx0)
    .attr("width", box)
    .attr("height", bandHeight)
    .attr("fill", color.bg)
  svg
    .append("line")
    .attr("x1", bx0)
    .attr("x2", bx0)
    .attr("y2", bandHeight)
    .attr("stroke", color.ink)
    .attr("stroke-width", 2)
  if (team) {
    const s = box - 24
    svg
      .append("image")
      .attr("href", logoUrl(team.abbreviation))
      .attr("x", bx0 + 12)
      .attr("y", (bandHeight - s) / 2)
      .attr("width", s)
      .attr("height", s)
  } else {
    // views about no one team carry the wordmark instead
    const words = ["STEP", "BACK", "CLUB"]
    const ws = (box - 26) / 3
    const top = (bandHeight - ws * 3) / 2
    words.forEach((w, i) =>
      svg
        .append("text")
        .attr("x", bx0 + box / 2)
        .attr("y", top + ws * (i + 0.86))
        .attr("text-anchor", "middle")
        .attr("font-size", ws * 1.08)
        .attr("font-weight", 700)
        .text(w),
    )
  }

  // --- the legend strip: what the marks mean, and the counts
  const strip = svg.append("g").call(agate)
  const stripY = bandHeight + stripHeight / 2 + type.agate.size * 0.35
  const legend = strip.append("g").attr("transform", `translate(${pad},0)`)
  const legendWidth = drawLegend(legend, desc.legend ?? [], stripY)
  let stripBottom = bandHeight + stripHeight
  if (desc.counts) {
    const counts = strip
      .append("text")
      .attr("x", width - pad)
      .attr("y", stripY)
      .attr("text-anchor", "end")
      .text(desc.counts)
    // when both don't fit on one line, the counts get their own
    if (
      legendWidth + counts.node()!.getComputedTextLength() + 24 >
      width - pad * 2
    ) {
      counts.attr("y", stripY + stripHeight - 12)
      stripBottom += stripHeight - 12
    }
  }
  svg
    .append("line")
    .attr("x2", width)
    .attr("y1", stripBottom)
    .attr("y2", stripBottom)
    .attr("stroke", color.ink)

  // --- the body
  const headerHeight = stripBottom + 18
  const g = svg
    .append("g")
    .attr("class", "frame-body")
    .attr("transform", `translate(${pad},${headerHeight})`)
  const bodyHeight = height && height - headerHeight - footerHeight
  const body = renderBody(g.node()!, {
    width: width - pad * 2,
    height: bodyHeight,
  })

  // --- the footer: a rule, the source, and the URL, which keeps its case so
  // it can be typed
  const total = height ?? headerHeight + body.height + footerHeight
  const ruleY = total - footerHeight + 6
  svg
    .append("line")
    .attr("x1", pad)
    .attr("x2", width - pad)
    .attr("y1", ruleY)
    .attr("y2", ruleY)
    .attr("stroke", color.ink)
  const footerY = ruleY + 20
  svg
    .append("text")
    .attr("x", pad)
    .attr("y", footerY)
    .call(agate)
    .text(desc.source)
  svg
    .append("text")
    .attr("x", width - pad)
    .attr("y", footerY)
    .attr("text-anchor", "end")
    .attr("font-family", font.agate)
    .attr("font-size", type.agate.size)
    .attr("font-weight", 600)
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
