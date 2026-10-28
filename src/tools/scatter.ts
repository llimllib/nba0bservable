// Player scatter: one stat against another, one dot per player, for a
// curated list of pairs. A pair is data, not code: two stats, the volume stat
// that ranks players for "Top %", and its reference lines and quadrant names.
// A chart that needs a new kind of mark is a new tool. See issue #29 and the
// "Player scatter" milestone
import { extent, format, max, quantile, scaleLinear, select, sum } from "d3"
import { lookups, metadata, read, type Row } from "../kit/data"
import { agate } from "../kit/frame"
import { placeLabels, type Box } from "../kit/labels"
import { teams } from "../kit/teams"
import { color, type } from "../kit/theme"
import type { Body, LegendItem, Mark, Tool } from "../kit/tool"

// season 0 is the latest season the data has; load resolves it
const defaults = {
  pair: "ast-tov",
  season: 0,
  kind: "regular_season",
  team: "",
  top: 25,
}
type P = typeof defaults

// A stat, read from player_season_stats. `get` is a player's value and
// `league` the league's, computed from totals rather than as a mean of the
// players' rates. `pct` ticks are percentages, and others take the scale's
// format; `tip` writes the value in a tooltip and the legend
interface Stat {
  label: string
  short: string
  cols: string[]
  get(r: Row): number | null
  league(rows: Row[]): number
  pct?: boolean
  tip(v: number): string
}

const pct = (v: number) => `${Math.round(v * 100)}%`
const pct1 = (v: number) => `${(v * 100).toFixed(1)}%`
const num = format(",")
const num1 = (v: number) => v.toFixed(1)
const minutes = (rows: Row[]) => sum(rows, r => r.min)

// a season total, as counted
const total = (col: string, label: string, short: string): Stat => ({
  label,
  short,
  cols: [col],
  get: r => r[col],
  league: rows => sum(rows, r => r[col]),
  tip: num,
})

// a total per 36 minutes
const per36 = (col: string, label: string, short: string): Stat => ({
  label: `${label} per 36 minutes`,
  short: `${short}/36`,
  cols: [col],
  get: r => (r.min > 0 ? (r[col] / r.min) * 36 : null),
  league: rows => (sum(rows, r => r[col]) / minutes(rows)) * 36,
  tip: num1,
})

// a share of the plays while the player is on the court, like rebound
// percentage: the league's is the mean over minutes played
const rate = (col: string, label: string, short: string): Stat => ({
  label,
  short,
  cols: [col],
  get: r => r[col],
  league: rows =>
    sum(rows, r => (r[col] == null ? 0 : r[col] * r.min)) /
    sum(rows, r => (r[col] == null ? 0 : r.min)),
  pct: true,
  tip: pct1,
})

// a shooting percentage: the league's is its makes over its attempts
const shooting = (
  col: string,
  made: string,
  att: string,
  label: string,
  short: string,
): Stat => ({
  label,
  short,
  cols: [col, made, att],
  get: r => (r[att] > 0 ? r[col] : null),
  league: rows => sum(rows, r => r[made]) / sum(rows, r => r[att]),
  pct: true,
  tip: pct1,
})

const stats: Record<string, Stat> = {
  ast: total("ast", "Assists", "AST"),
  tov: total("tov", "Turnovers", "TOV"),
  fga: total("fga", "Field goal attempts", "FGA"),
  fta: total("fta", "Free throw attempts", "FTA"),
  oreb_pct: rate("oreb_pct", "Offensive rebound %", "OREB%"),
  dreb_pct: rate("dreb_pct", "Defensive rebound %", "DREB%"),
  stl36: per36("stl", "Steals", "STL"),
  blk36: per36("blk", "Blocks", "BLK"),
  fg3a36: per36("fg3a", "3-point attempts", "3PA"),
  fg3_pct: shooting("fg3_pct", "fg3m", "fg3a", "3-point %", "3P%"),
  fg2a36: per36("fg2a", "2-point attempts", "2PA"),
  fg2_pct: shooting("fg2_pct", "fg2m", "fg2a", "2-point %", "2P%"),
  // a player on the floor uses a fifth of his team's possessions
  usg_pct: { ...rate("usg_pct", "Usage rate", "USG"), league: () => 0.2 },
  ts_pct: {
    label: "True shooting",
    short: "TS",
    cols: ["ts_pct", "pts", "fga", "fta"],
    get: r => r.ts_pct,
    league: rows =>
      sum(rows, r => r.pts) /
      (2 * (sum(rows, r => r.fga) + 0.44 * sum(rows, r => r.fta))),
    pct: true,
    tip: pct1,
  },
}

// Corners name the quadrants the league averages make: top left, top right,
// bottom left, bottom right. A pair with `ratios` instead draws lines of
// constant y:x through zero, and the league's ratio, dashed
interface Pair {
  name: string
  group: string
  x: string
  y: string
  // the column that ranks players for Top %, and its name in the deck
  volume: string
  volumeName: string
  // the deck's phrase for what's plotted
  deck: string
  corners?: [string, string, string, string]
  ratios?: number[]
  // the league's ratio, in words, for the legend
  ratioText?: (k: number) => string
}

const pairs: Record<string, Pair> = {
  "usg-ts": {
    name: "Shooting by usage",
    group: "Shooting",
    x: "usg_pct",
    y: "ts_pct",
    volume: "fga",
    volumeName: "shot attempts",
    deck: "True shooting by usage rate",
    corners: [
      "Low usage · efficient",
      "High usage · efficient",
      "Low usage · inefficient",
      "High usage · inefficient",
    ],
  },
  threes: {
    name: "Three-point shooting",
    group: "Shooting",
    x: "fg3a36",
    y: "fg3_pct",
    volume: "fg3a",
    volumeName: "3-point attempts",
    deck: "3-point percentage by 3-point attempts per 36 minutes",
    corners: [
      "Few threes · accurate",
      "Many threes · accurate",
      "Few threes · inaccurate",
      "Many threes · inaccurate",
    ],
  },
  twos: {
    name: "Two-point shooting",
    group: "Shooting",
    x: "fg2a36",
    y: "fg2_pct",
    volume: "fg2a",
    volumeName: "2-point attempts",
    deck: "2-point percentage by 2-point attempts per 36 minutes",
    corners: [
      "Few twos · accurate",
      "Many twos · accurate",
      "Few twos · inaccurate",
      "Many twos · inaccurate",
    ],
  },
  "fta-fga": {
    name: "Free throw rate",
    group: "Shooting",
    x: "fga",
    y: "fta",
    volume: "fga",
    volumeName: "shot attempts",
    deck: "Free throw attempts by field goal attempts",
    ratios: [1 / 2, 1 / 4, 1 / 8],
    ratioText: k => `league: ${k.toFixed(2)} FTA per FGA`,
  },
  "ast-tov": {
    name: "Assists to turnovers",
    group: "Playmaking",
    x: "tov",
    y: "ast",
    volume: "min",
    volumeName: "minutes",
    deck: "Assists by turnovers",
    ratios: [1, 2, 3, 4],
    ratioText: k => `league: ${k.toFixed(1)} assists per turnover`,
  },
  rebounding: {
    name: "Rebounding",
    group: "Rebounding",
    x: "dreb_pct",
    y: "oreb_pct",
    volume: "min",
    volumeName: "minutes",
    deck: "Offensive by defensive rebound percentage",
    corners: [
      "Offensive glass",
      "Both glasses",
      "Neither glass",
      "Defensive glass",
    ],
  },
  "stl-blk": {
    name: "Steals and blocks",
    group: "Defense",
    x: "stl36",
    y: "blk36",
    volume: "min",
    volumeName: "minutes",
    deck: "Blocks by steals per 36 minutes",
    corners: ["Blocks", "Steals and blocks", "Neither", "Steals"],
  },
}

interface Player {
  // player_id:season, so a span of seasons can hold a player more than once
  key: string
  player_id: string
  season: number
  name: string
  team: string
  gp: number
  volume: number
  x: number
  y: number
}

interface D {
  pair: string
  season: number
  seasons: number[]
  kind: string
  kinds: string[]
  players: Player[]
  // the league's x and y, from every player's totals
  league: { x: number; y: number }
  teams: Map<string, string>
  lastDate?: Date
}

const kindNames: Record<string, string> = {
  regular_season: "regular season",
  playoffs: "playoffs",
}
const fmtSeason = (s: number) => `${s - 1}–${String(s).slice(2)}`
const fmtDate = (d: Date) =>
  d.toLocaleDateString("en-US", {
    month: "long",
    day: "numeric",
    timeZone: "UTC",
  })
// a ratio as y:x, in whole numbers: 2 is 2:1 and 0.25 is 1:4
const fmtRatio = (k: number) =>
  k >= 1 ? `${+k.toFixed(1)}:1` : `1:${+(1 / k).toFixed(1)}`

// a team's primary and secondary colors, for a dot's fill and outline
function teamColors(abbrev: string): [string, string] {
  const c = teams.get(abbrev)?.colors ?? []
  return [c[0] ?? color.ink, c[1] ?? color.bg]
}

const pairOf = (id: string) => pairs[id] ?? pairs[defaults.pair]

// the players with the most volume: the top `top` percent of those with any
function shown(d: D, p: P) {
  const some = d.players.filter(pl => pl.volume > 0)
  const cut = quantile(some, 1 - p.top / 100, pl => pl.volume) ?? 0
  return some.filter(pl => pl.volume >= cut)
}

export const scatter: Tool<P, D> = {
  id: "scatter",
  name: "Player scatter",
  defaults,

  async load(p) {
    const meta = await metadata()
    const { first_season, last_season } = meta.player_season_stats
    const season = p.season || last_season
    const id = pairs[p.pair] ? p.pair : defaults.pair
    const pair = pairs[id]
    const [sx, sy] = [stats[pair.x], stats[pair.y]]
    const cols = new Set([
      "player_id",
      "team_id",
      "season_type",
      "gp",
      "min",
      pair.volume,
      ...sx.cols,
      ...sy.cols,
    ])
    const [all, lk] = await Promise.all([
      read("stats", "player_season_stats", season, [...cols]),
      lookups(season),
    ])
    const kinds = [...new Set(all.map(s => s.season_type as string))].sort()
    const kind = kinds.includes(p.kind) ? p.kind : kinds[0]
    const rows = all.filter(s => s.season_type === kind)
    const players: Player[] = []
    for (const r of rows) {
      const [x, y] = [sx.get(r), sy.get(r)]
      if (x == null || y == null || !isFinite(x) || !isFinite(y)) continue
      players.push({
        key: `${r.player_id}:${season}`,
        player_id: r.player_id,
        season,
        name: lk.players.get(r.player_id) ?? r.player_id,
        team: lk.teams.get(r.team_id)?.nba_abbrev ?? "",
        gp: r.gp,
        volume: r[pair.volume] ?? 0,
        x,
        y,
      })
    }
    const names = new Map(
      [...lk.teams.values()]
        .filter(t => t.is_nba)
        .sort((a, b) => a.full_name.localeCompare(b.full_name))
        .map(t => [t.nba_abbrev as string, t.full_name as string]),
    )
    const lastDate = max(
      [...lk.games.values()].filter(g => g.game_type === kind),
      g => g.game_date as Date,
    )
    const seasons = []
    for (let s = last_season; s >= first_season; s--) seasons.push(s)
    return {
      pair: id,
      season,
      seasons,
      kind,
      kinds,
      players,
      league: { x: sx.league(rows), y: sy.league(rows) },
      teams: names,
      lastDate,
    }
  },

  normalize(d, p) {
    return {
      ...p,
      pair: d.pair,
      season: d.season,
      kind: d.kind,
      team: d.teams.has(p.team) ? p.team : "",
    }
  },

  controls(d) {
    return [
      {
        key: "pair",
        label: "Stats",
        kind: "select",
        options: Object.entries(pairs).map(([id, pr]) => ({
          value: id,
          label: pr.name,
          group: pr.group,
        })),
      },
      {
        key: "season",
        label: "Season",
        kind: "select",
        options: d.seasons.map(s => ({ value: s, label: fmtSeason(s) })),
      },
      {
        key: "kind",
        label: "Games",
        kind: "select",
        options: d.kinds.map(k => ({ value: k, label: kindNames[k] ?? k })),
      },
      {
        key: "team",
        label: "Team",
        kind: "select",
        options: [
          { value: "", label: "All teams" },
          ...[...d.teams].map(([abbrev, name]) => ({
            value: abbrev,
            label: name,
          })),
        ],
      },
      {
        key: "top",
        label: "Top %",
        kind: "range",
        min: 5,
        max: 100,
        step: 5,
      },
    ]
  },

  describe(d, p) {
    const pair = pairOf(d.pair)
    const [sx, sy] = [stats[pair.x], stats[pair.y]]
    const ps = shown(d, p)
    const team = d.teams.get(p.team)
    const games = max(d.players, pl => pl.gp) ?? 0
    const through = d.lastDate ? `, through ${fmtDate(d.lastDate)}` : ""
    const reference: LegendItem = pair.ratios
      ? {
          symbol: "dash",
          color: color.muted,
          text: pair.ratioText!(d.league.y / d.league.x),
        }
      : {
          symbol: "dash",
          color: color.muted,
          text: `league avg: ${sx.tip(d.league.x)} ${sx.short}, ${sy.tip(d.league.y)} ${sy.short}`,
        }
    return {
      title: team ?? pair.name,
      context: `${pair.deck} in the ${fmtSeason(d.season)} ${kindNames[d.kind] ?? d.kind}${through}. The top ${p.top}% of players by ${pair.volumeName}`,
      legend: [
        {
          symbol: "dot",
          color: team ? teamColors(p.team)[0] : color.ink,
          text: team ? `${p.team} player` : "one player, in team colors",
        },
        ...(team
          ? [
              {
                symbol: "dot" as const,
                color: color.faint,
                text: "rest of league",
              },
            ]
          : []),
        reference,
      ],
      counts: `${games} games · ${ps.length} players`,
      source: "Data: NBA.com",
      team: p.team || undefined,
    }
  },

  render(node, d, p, size): Body {
    const pair = pairOf(d.pair)
    const [sx, sy] = [stats[pair.x], stats[pair.y]]
    const ps = shown(d, p)
    const g = select(node)
    const left = 46
    const bottom = 48
    const top = 20
    // a ratio pair names its lines in a gutter on the right
    const right = pair.ratios ? 30 : 0
    const plotW = size.width - left - right
    const height = size.height ?? Math.round(plotW * 0.82) + top + bottom
    const plotH = height - top - bottom
    const r = 5

    // a ratio pair starts at zero, where its lines meet; an average pair
    // shows its averages
    const ratio = pair.ratios ? d.league.y / d.league.x : 0
    const xs = ps.map(pl => pl.x)
    const ys = ps.map(pl => pl.y)
    const [x0, x1] = extent(pair.ratios ? [0, ...xs] : [...xs, d.league.x])
    const [y0, y1] = extent(pair.ratios ? [0, ...ys] : [...ys, d.league.y])
    const x = scaleLinear()
      .domain([x0 ?? 0, x1 ?? 1])
      .nice()
      .range([r + 2, plotW - r - 2])
    const y = scaleLinear()
      .domain([y0 ?? 0, y1 ?? 1])
      .nice()
      .range([plotH - r - 2, r + 2])
    const plot = g.append("g").attr("transform", `translate(${left},${top})`)

    // grid
    const grid = plot.append("g").attr("stroke", color.grid)
    for (const t of x.ticks(6))
      grid.append("line").attr("x1", x(t)).attr("x2", x(t)).attr("y2", plotH)
    for (const t of y.ticks(6))
      grid.append("line").attr("y1", y(t)).attr("y2", y(t)).attr("x2", plotW)

    // names keep off the reference lines
    const avoid: Box[] = []
    const guides = plot.append("g")
    const ref = plot
      .append("g")
      .attr("stroke", color.muted)
      .attr("stroke-width", 1.25)
      .attr("stroke-dasharray", "5 4")
    if (pair.ratios) {
      // lines of constant ratio from zero to the plot's edge, faint and
      // named outside it, where they leave it, so no dot covers a name. The
      // league's is dashed, like an average
      const [dx, dy] = [x.domain()[1], y.domain()[1]]
      const end = (k: number): [number, number] =>
        k * dx > dy ? [dy / k, dy] : [dx, k * dx]
      for (const k of pair.ratios) {
        const [ex, ey] = end(k)
        guides
          .append("line")
          .attr("x1", x(0))
          .attr("y1", y(0))
          .attr("x2", x(ex))
          .attr("y2", y(ey))
          .attr("stroke", color.grid)
          .attr("stroke-width", 1.5)
        const atTop = k * dx > dy
        guides
          .append("text")
          .attr("x", atTop ? x(ex) : plotW + 4)
          .attr("y", atTop ? -6 : y(ey) + 4)
          .attr("text-anchor", atTop ? "middle" : "start")
          .call(agate)
          .attr("fill", color.faint)
          .text(fmtRatio(k))
      }
      const [ex, ey] = end(ratio)
      ref
        .append("line")
        .attr("x1", x(0))
        .attr("y1", y(0))
        .attr("x2", x(ex))
        .attr("y2", y(ey))
    } else {
      ref
        .append("line")
        .attr("y1", y(d.league.y))
        .attr("y2", y(d.league.y))
        .attr("x2", plotW)
      ref
        .append("line")
        .attr("x1", x(d.league.x))
        .attr("x2", x(d.league.x))
        .attr("y2", plotH)
      avoid.push(
        { x0: x(d.league.x) - 1, x1: x(d.league.x) + 1, y0: 0, y1: plotH },
        { x0: 0, x1: plotW, y0: y(d.league.y) - 1, y1: y(d.league.y) + 1 },
      )
    }

    // the quadrants, named in their corners. These are guideposts: drawn
    // first and faint, so dots and names write over them when they need to
    if (pair.corners) {
      const [tl, tr, bl, br] = pair.corners
      const corners: [string, number, number, "start" | "end"][] = [
        [tl, 6, 14, "start"],
        [tr, plotW - 6, 14, "end"],
        [bl, 6, plotH - 8, "start"],
        [br, plotW - 6, plotH - 8, "end"],
      ]
      for (const [text, cx, cy, anchor] of corners)
        plot
          .append("text")
          .attr("x", cx)
          .attr("y", cy)
          .attr("text-anchor", anchor)
          .call(agate)
          .attr("fill", color.faint)
          .text(text)
    }

    // axes: ticks, and titles beside them
    const xFmt = sx.pct ? pct : x.tickFormat(6, ",~f")
    const yFmt = sy.pct ? pct : y.tickFormat(6, ",~f")
    const axis = plot
      .append("g")
      .attr("font-size", type.tick.size)
      .attr("fill", color.muted)
    for (const t of x.ticks(6))
      axis
        .append("text")
        .attr("x", x(t))
        .attr("y", plotH + 18)
        .attr("text-anchor", "middle")
        .text(xFmt(t))
    for (const t of y.ticks(6))
      axis
        .append("text")
        .attr("x", -8)
        .attr("y", y(t) + 4.5)
        .attr("text-anchor", "end")
        .text(yFmt(t))
    plot
      .append("text")
      .attr("x", plotW / 2)
      .attr("y", plotH + 40)
      .attr("text-anchor", "middle")
      .call(agate)
      .text(`${sx.label} →`)
    plot
      .append("text")
      .attr("x", -left)
      .attr("y", -8)
      .call(agate)
      .text(`↑ ${sy.label}`)

    // dots in team colors, or a team's players over a faded league. The color
    // is identity, not value: names and position carry the reading
    const mine = (pl: Player) => !p.team || pl.team === p.team
    const order = [...ps].sort((a, b) => Number(mine(a)) - Number(mine(b)))
    for (const pl of order) {
      plot
        .append("circle")
        .attr("cx", x(pl.x))
        .attr("cy", y(pl.y))
        .attr("r", r)
        .attr("fill", mine(pl) ? teamColors(pl.team)[0] : color.faint)
        .attr("fill-opacity", mine(pl) ? 1 : 0.45)
        .attr("stroke", mine(pl) ? teamColors(pl.team)[1] : color.bg)
        .attr("stroke-width", mine(pl) ? 1.5 : 0.75)
        .append("title")
        .text(
          `${pl.name} (${pl.team})\n${sx.tip(pl.x)} ${sx.short} · ${sy.tip(pl.y)} ${sy.short} · ${pl.gp} games`,
        )
    }

    // names: the players with the most volume first, and all of a
    // highlighted team's. A click on a dot toggles its name
    const labelSize = 12.5
    const labeled = placeLabels(
      plot.append("g").attr("font-weight", type.label.weight).node()!,
      ps
        .map(pl => ({
          x: x(pl.x),
          y: y(pl.y),
          r,
          text: pl.name,
          priority: (mine(pl) ? 1e9 : 0) + pl.volume,
          always: Boolean(p.team) && mine(pl),
          key: pl.key,
        }))
        .filter(lp => !p.team || lp.always),
      { width: plotW, height: plotH },
      { size: labelSize, minCell: 1800, avoid },
    )
    const marks: Mark[] = ps.map(pl => ({
      key: pl.key,
      x: x(pl.x) + left,
      y: y(pl.y) + top,
      r,
      label: pl.name,
      labeled: labeled.has(pl.key),
      labelSize,
    }))

    if (!ps.length)
      plot
        .append("text")
        .attr("x", plotW / 2)
        .attr("y", plotH / 2)
        .attr("text-anchor", "middle")
        .attr("fill", color.muted)
        .text("No players yet")

    return {
      height,
      marks,
      // a note's position: the pair's two stats
      invert(px, py) {
        const [u, v] = [px - left, py - top]
        if (u < 0 || u > plotW || v < 0 || v > plotH) return undefined
        return {
          x: +x.invert(u).toPrecision(5),
          y: +y.invert(v).toPrecision(5),
        }
      },
      project(pos) {
        const { x: u, y: v } = pos as { x: number; y: number }
        return [x(u) + left, y(v) + top]
      },
    }
  },
}
