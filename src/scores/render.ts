// The scores page's game blocks: a score line, the four factors for both
// teams, and the net points line saying how the winner won. Plain DOM; the
// data is load.ts's
import { roundToSum, type Factors, type Game, type TeamLine } from "./load"

const pct = (v: number) => (v * 100).toFixed(1)
// a rate under 1, as box scores print it: .17
const rate = (v: number) => v.toFixed(2).replace(/^0/, "")
const signed = (v: number) => (v > 0 ? `+${v}` : v < 0 ? `−${-v}` : "0")

// The four factors, and which way is better
const columns: {
  head: string
  title: string
  key: keyof TeamLine
  fmt: (v: number) => string
  higher: boolean
}[] = [
  { head: "eFG%", title: "Effective field goal percentage", key: "efg", fmt: pct, higher: true },
  { head: "TOV%", title: "Turnovers per 100 possessions", key: "tov", fmt: pct, higher: false },
  { head: "OREB%", title: "Offensive rebound percentage", key: "oreb", fmt: pct, higher: true },
  { head: "FTR", title: "Free throw rate: free throws made per shot", key: "ftr", fmt: rate, higher: true },
]

const factorNames: [keyof Factors, string][] = [
  ["shooting", "Shoot"],
  ["turnovers", "TOV"],
  ["rebounding", "Reb"],
  ["freethrows", "FT"],
]

function el<K extends keyof HTMLElementTagNameMap>(
  tag: K,
  props: Partial<HTMLElementTagNameMap[K]> = {},
  ...children: (Node | string)[]
) {
  const e = Object.assign(document.createElement(tag), props)
  e.append(...children)
  return e
}

export function gameBlock(g: Game, base: string) {
  const [w, l] = g.teams
  const score = (t: TeamLine) =>
    el("abbr", { title: t.name }, `${t.abbrev} ${t.pts}`)

  const head = el(
    "tr",
    {},
    el("th", {}),
    ...columns.map(c => el("th", { scope: "col", title: c.title }, c.head)),
  )
  const row = (t: TeamLine, o: TeamLine) =>
    el(
      "tr",
      {},
      el("th", { scope: "row" }, el("abbr", { title: t.name }, t.abbrev)),
      ...columns.map(c => {
        const [v, ov] = [t[c.key] as number, o[c.key] as number]
        // the better of the two is bold, so it reads without color. Compare
        // what's printed, so a tie in print isn't bold on one side
        const [p, op] = [c.fmt(v), c.fmt(ov)]
        const better = p !== op && (c.higher ? v > ov : v < ov)
        return el("td", {}, better ? el("b", {}, p) : p)
      }),
    )

  const rotations = `${base}rotations?season=${g.season}&team=${w.abbrev}&game=${g.game_id}`
  return el(
    "article",
    { className: "game" },
    el(
      "p",
      { className: "status" },
      [g.status, g.kind].filter(Boolean).join(" · "),
    ),
    el(
      "h2",
      { className: "score" },
      el("b", {}, score(w)),
      el("span", {}, score(l)),
    ),
    el(
      "table",
      { className: "box" },
      el("thead", {}, head),
      el("tbody", {}, row(w, l), row(l, w)),
    ),
    el("p", { className: "why" }, "Net points…"),
    el("a", { className: "more", href: rotations }, "Rotations →"),
  )
}

// How the winner won, from ESPN: each factor's net points over the loser's,
// the biggest underlined. Without
// ESPN's numbers, say they're not in yet
export function setFactors(block: Element, g: Game, f: Factors | undefined) {
  const why = block.querySelector(".why")!
  if (!f) {
    why.replaceChildren("Net points not in yet")
    why.classList.add("missing")
    return
  }
  const values = roundToSum(factorNames.map(([k]) => f[k]))
  const top = values.indexOf(Math.max(...values))
  const margin = g.teams[0].pts - g.teams[1].pts
  why.classList.remove("missing")
  why.replaceChildren(
    `By ${margin}: `,
    ...factorNames.flatMap(([, name], i) => {
      const text = `${name} ${signed(values[i])}`
      return [i ? " · " : "", i === top ? el("u", {}, text) : text]
    }),
  )
}
