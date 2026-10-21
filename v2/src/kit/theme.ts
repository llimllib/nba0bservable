// The design rules from docs/plans/2026-10-10-site-v2-design.md, as values.
// Color has three jobs: identity (team colors, see teams.ts), value
// (positive/negative) and voice (annotations only)
export const color = {
  bg: "#f3f0ea",
  ink: "#1d1d1f",
  muted: "#6b6862",
  faint: "#a8a49c",
  grid: "#e2ddd3",
  zero: "#3a3834",
  pos: "#3f8f5f",
  neg: "#c0504a",
  voice: "#e8471c",
}

export const font = {
  sans: "Inter, system-ui, sans-serif",
  hand: "Caveat, cursive",
}

// Font files, so exported PNGs can embed them
export const fontFiles = [
  { family: "Inter", weight: "100 900", url: "fonts/inter.woff2" },
  { family: "Caveat", weight: "600", url: "fonts/caveat.woff2" },
]

export const type = {
  title: { size: 26, weight: 700 },
  context: { size: 15, weight: 400 },
  label: { size: 13, weight: 500 },
  tick: { size: 12, weight: 400 },
  footer: { size: 12, weight: 400 },
  note: { size: 30 },
}

export const SITE = "billmill.org/nba"
