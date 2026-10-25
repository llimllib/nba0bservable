// The contract every tool implements. A tool says what question controls it
// has, how to load data, and how to draw its chart into the body of a frame;
// the kit supplies the frame, URL state, annotations and export
import type { Params, ParamValue } from "./state"

export interface Option {
  value: ParamValue
  label: string
}

// Question controls only: season, team, metric, filter. Five at most; framing
// (title, labels, size) happens on the chart, and rendering knobs don't exist
export type Control =
  | { key: string; label: string; kind: "select"; options: Option[] }
  | {
      key: string
      label: string
      kind: "range"
      min: number
      max: number
      step: number
    }
  | { key: string; label: string; kind: "toggle" }
  // a two-handle slider over a list of values, writing two params
  | {
      key: string
      keyTo: string
      label: string
      kind: "span"
      options: Option[]
    }
  // pick several from a long list by searching: a comma-separated param
  | {
      key: string
      label: string
      kind: "players"
      options: Option[]
      // at most this many
      max: number
    }

// Something a label or arrow can attach to, in body coordinates
export interface Mark {
  key: string
  x: number
  y: number
  r: number
  // half the width of a bar-shaped mark, which is hit along its length
  w?: number
  label: string
}

export interface Body {
  height: number
  marks: Mark[]
  // Convert between body coordinates and a serializable data position, so
  // free annotations stay attached to the data when it changes
  invert(x: number, y: number): unknown | undefined
  project(pos: unknown): [number, number] | undefined
}

export interface LegendItem {
  symbol: "dot" | "tick" | "bar" | "dash"
  color: string
  // drawn inside a bar, so the legend doesn't rely on color alone
  label?: string
  text: string
}

export interface Description {
  // the headline: short
  title: string
  // the deck under it, written as a phrase ("Net points per game in the
  // 2025–26 playoffs, through June 13")
  context: string
  legend?: LegendItem[]
  // the right side of the legend strip ("7 games · 9 players")
  counts?: string
  source: string
  // the team the view is about: the band takes its color and logo
  team?: string
}

export interface Tool<P extends Params, D> {
  id: string
  name: string
  defaults: P
  load(p: P): Promise<D>
  // Fix up params that don't fit the data, e.g. a team with no playoff games
  normalize?(d: D, p: P): P
  controls(d: D, p: P): Control[]
  describe(d: D, p: P): Description
  render(
    g: SVGGElement,
    d: D,
    p: P,
    size: { width: number; height?: number },
  ): Body
}
