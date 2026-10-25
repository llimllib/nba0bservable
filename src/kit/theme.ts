// The design rules from docs/plans/2026-10-25-newspaper-design.md, as values.
// Color has three jobs: identity (team colors, see teams.ts), value
// (positive/negative) and voice (annotations only)
export const color = {
  bg: "#f2efe6",
  ink: "#141414",
  muted: "#5c5a55",
  faint: "#9a968c",
  grid: "#dcd7ca",
  zero: "#141414",
  // the ends of ColorBrewer's RdBu, which is colorblind-safe. Green/red read
  // as one olive to red-green colorblind readers
  pos: "#2166ac",
  neg: "#b2182b",
  voice: "#e8471c",
}

// Three voices, plus the hand for annotations
export const font = {
  // headlines, and data text inside charts
  head: `"Barlow Condensed", "Arial Narrow", sans-serif`,
  // agate: datelines, labels, legends, sources
  agate: `"JetBrains Mono", ui-monospace, monospace`,
  // reading text, and the chart's deck
  serif: `"Source Serif 4", Georgia, serif`,
  hand: "Caveat, cursive",
}

// The two subsets every face ships in. Player names need Latin Extended
// (Şengün, Jokić), and a glyph that falls back to a system font in an
// exported PNG depends on the machine that exported it
const latin =
  "U+0000-00FF,U+0131,U+0152-0153,U+02BB-02BC,U+02C6,U+02DA,U+02DC,U+0304,U+0308,U+0329,U+2000-206F,U+20AC,U+2122,U+2191,U+2193,U+2212,U+2215,U+FEFF,U+FFFD"
const latinExt =
  "U+0100-02BA,U+02BD-02C5,U+02C7-02CC,U+02CE-02D7,U+02DD-02FF,U+0304,U+0308,U+0329,U+1D00-1DBF,U+1E00-1E9F,U+1EF2-1EFF,U+2020,U+20A0-20C0,U+2113,U+2C60-2C7F,U+A720-A7FF"

export interface FontFile {
  family: string
  weight: string
  style?: "italic"
  range?: string
  url: string
}

const subsets = (f: Omit<FontFile, "url" | "range">, name: string) => [
  { ...f, range: latin, url: `fonts/${name}.woff2` },
  { ...f, range: latinExt, url: `fonts/${name}-ext.woff2` },
]

// Font files, for the page's @font-face rules and so exported PNGs can embed
// them
export const fontFiles: FontFile[] = [
  ...["500", "600", "700"].flatMap(w =>
    subsets({ family: "Barlow Condensed", weight: w }, `barlow-condensed-${w}`),
  ),
  ...subsets({ family: "JetBrains Mono", weight: "100 800" }, "jetbrains-mono"),
  ...subsets({ family: "Source Serif 4", weight: "200 900" }, "source-serif-4"),
  ...subsets(
    { family: "Source Serif 4", weight: "200 900", style: "italic" },
    "source-serif-4-italic",
  ),
  { family: "Caveat", weight: "600", url: "fonts/caveat.woff2" },
]

export function fontFace(f: FontFile, src: string) {
  return [
    `@font-face{font-family:"${f.family}"`,
    `font-weight:${f.weight}`,
    `font-style:${f.style ?? "normal"}`,
    `font-display:swap`,
    f.range && `unicode-range:${f.range}`,
    `src:url(${src}) format("woff2")}`,
  ]
    .filter(Boolean)
    .join(";")
}

export const type = {
  title: { size: 44, weight: 700 },
  deck: { size: 17 },
  agate: { size: 11 },
  label: { size: 15, weight: 600 },
  sub: { size: 12.5, weight: 500 },
  tick: { size: 14, weight: 500 },
  note: { size: 30 },
}

export const SITE = "billmill.org/nba"
