// Player scatter: one stat against another, one dot per player, for a
// curated list of pairs. A pair is data, not code: two stats, the volume stat
// that ranks players for "Top %", and its reference lines and quadrant names.
// A chart that needs a new kind of mark is a new tool. See issue #29 and the
// "Player scatter" milestone
import {
  extent,
  format,
  max,
  min,
  quantile,
  scaleLinear,
  select,
  sum,
} from "d3"
import { lookups, metadata, read, type Row } from "../kit/data"
import { agate } from "../kit/frame"
import { placeLabels, type Box } from "../kit/labels"
import { teams } from "../kit/teams"
import { color, type } from "../kit/theme"
import type { Body, LegendItem, Mark, Tool } from "../kit/tool"

// seasons 0 are the latest season the data has; load resolves them
const defaults = {
  pair: "ast-tov",
  from: 0,
  to: 0,
  kind: "regular_season",
  team: "",
  top: 25,
}
type P = typeof defaults

// The datasets a stat can come from, whether they split the regular season
// from the playoffs, and who to credit. Every pair also reads
// player_season_stats, for teams, games and the volume behind Top %
const sources = {
  stats: {
    source: "stats",
    dataset: "player_season_stats",
    kinds: true,
    credit: "NBA.com",
  },
  net: {
    source: "espn",
    dataset: "net_pts_season",
    kinds: true,
    credit: "ESPN",
  },
  // fitted on the regular season and playoffs together
  rapm: {
    source: "openrapm",
    dataset: "openrapm",
    kinds: false,
    credit: "OpenRAPM",
  },
  epm: {
    source: "dunksandthrees",
    dataset: "epm",
    kinds: true,
    credit: "dunksandthrees.com",
  },
}
type Src = keyof typeof sources

// A stat: `get` is a player's value, from their row in the stat's dataset,
// and `league` the league's, computed from totals rather than as a mean of
// the players' rates. `pct` ticks are percentages, `signed` ones carry a
// sign, and others take the scale's format; `tip` writes the value in a
// tooltip and the legend
interface Stat {
  src?: Src
  label: string
  short: string
  cols: string[]
  get(r: Row): number | null
  league(rows: Row[]): number
  pct?: boolean
  signed?: boolean
  tip(v: number): string
}

const pct = (v: number) => `${Math.round(v * 100)}%`
const pct1 = (v: number) => `${(v * 100).toFixed(1)}%`
const num = format(",")
const num1 = (v: number) => v.toFixed(1)
const sign = (v: number) => (v > 0 ? "+" : v < 0 ? "−" : "")
const signed1 = (v: number) => `${sign(v)}${Math.abs(v).toFixed(1)}`
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

// a rating in points per 100 possessions, where zero is average
const rating = (src: Src, col: string, label: string, short: string): Stat => ({
  src,
  label,
  short,
  cols: [col],
  get: r => r[col],
  league: () => 0,
  signed: true,
  tip: signed1,
})

// ESPN's net points per 100 of the team's possessions on one side of the
// ball, as ESPN computes it
const netPer100 = (side: "o" | "d", label: string, short: string): Stat => ({
  src: "net",
  label,
  short,
  cols: [`${side}_net_pts`, `${side}_team_poss`],
  get: r =>
    r[`${side}_team_poss`] > 0
      ? (r[`${side}_net_pts`] / r[`${side}_team_poss`]) * 100
      : null,
  league: rows =>
    (sum(rows, r => r[`${side}_net_pts`]) /
      sum(rows, r => r[`${side}_team_poss`])) *
    100,
  signed: true,
  tip: signed1,
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
  o_net: netPer100("o", "Offensive net points per 100", "O-NET"),
  d_net: netPer100("d", "Defensive net points per 100", "D-NET"),
  o_rapm: rating("rapm", "o_rating", "Offensive RAPM", "O-RAPM"),
  d_rapm: rating("rapm", "d_rating", "Defensive RAPM", "D-RAPM"),
  o_epm: rating("epm", "o_epm", "Offensive EPM", "O-EPM"),
  d_epm: rating("epm", "d_epm", "Defensive EPM", "D-EPM"),
}
const srcOf = (s: Stat): Src => s.src ?? "stats"

// Corners name the quadrants the league averages make: top left, top right,
// bottom left, bottom right. A pair with `ratios` instead draws lines of
// constant y:x through zero, and the league's ratio, dashed. A `total` pair,
// offense against defense, quarters at zero (the league's average) and
// draws lines of constant x + y
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
  total?: boolean
}

const ends: [string, string, string, string] = [
  "Defense only",
  "Both ends",
  "Neither end",
  "Offense only",
]

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
  net: {
    name: "Net points",
    group: "Offense and defense",
    x: "o_net",
    y: "d_net",
    volume: "min",
    volumeName: "minutes",
    deck: "Defensive by offensive net points per 100 possessions",
    corners: ends,
    total: true,
  },
  rapm: {
    name: "RAPM",
    group: "Offense and defense",
    x: "o_rapm",
    y: "d_rapm",
    volume: "min",
    volumeName: "regular season minutes",
    deck: "Defensive by offensive RAPM, points per 100 possessions,",
    corners: ends,
    total: true,
  },
  epm: {
    name: "EPM",
    group: "Offense and defense",
    x: "o_epm",
    y: "d_epm",
    volume: "min",
    volumeName: "minutes",
    deck: "Defensive by offensive EPM, points per 100 possessions,",
    corners: ends,
    total: true,
  },
}

interface Player {
  // player_id:season, so a span of seasons can hold a player more than once
  key: string
  player_id: string
  season: number
  name: string
  // their last team, whose colors they wear
  team: string
  // every team they played for, in order: more than one for a player
  // traded during the season. Only filled in when a team is highlighted
  teams: string[]
  gp: number
  volume: number
  x: number
  y: number
}

interface D {
  pair: string
  from: number
  to: number
  // every season the pair's data has, oldest first
  seasons: number[]
  latest: number
  kind: string
  // empty for a pair whose data doesn't split the regular season from the
  // playoffs
  kinds: string[]
  players: Player[]
  // the league's x and y, from every player's totals
  league: { x: number; y: number }
  teams: Map<string, string>
  lastDate?: Date
  // the data's sources, for the footer
  credit: string
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
    const id = pairs[p.pair] ? p.pair : defaults.pair
    const pair = pairs[id]
    const [sx, sy] = [stats[pair.x], stats[pair.y]]
    const srcs = [...new Set<Src>(["stats", srcOf(sx), srcOf(sy)])]
    // the seasons every dataset the pair reads has, and the span nearest
    // the one asked for
    const meta = await metadata()
    const info = srcs.map(s => meta[sources[s].dataset])
    const first = max(info, m => m.first_season)!
    const last = min(info, m => m.last_season)!
    const clamp = (s: number) => Math.min(last, Math.max(first, s))
    const to = clamp(p.to || last)
    const from = clamp(p.from || to)
    const [lo, hi] = from <= to ? [from, to] : [to, from]
    const span: number[] = []
    for (let s = lo; s <= hi; s++) span.push(s)
    const split = srcs.every(s => sources[s].kinds)

    // each dataset's columns: its stats', and the stats dataset's own
    const cols = new Map<Src, Set<string>>(
      srcs.map(s => [
        s,
        new Set(["player_id", ...(sources[s].kinds ? ["season_type"] : [])]),
      ]),
    )
    for (const c of ["team_id", "team_count", "gp", "min", pair.volume])
      cols.get("stats")!.add(c)
    for (const st of [sx, sy])
      for (const c of st.cols) cols.get(srcOf(st))!.add(c)
    const tables = await Promise.all(
      span.map(season =>
        Promise.all([
          lookups(season),
          ...srcs.map(s =>
            read(sources[s].source, sources[s].dataset, season, [
              ...cols.get(s)!,
            ]),
          ),
        ]),
      ),
    )
    const lkTo = tables.at(-1)![0]
    const kinds = split
      ? [
          ...new Set(
            tables.flatMap(([, own]) =>
              own.map((r: Row) => r.season_type as string),
            ),
          ),
        ].sort()
      : []
    // a pair that doesn't split them takes its teams and minutes from the
    // regular season
    const kind = kinds.includes(p.kind)
      ? p.kind
      : (kinds[0] ?? "regular_season")

    const seasons = await Promise.all(
      span.map(async (season, i) => {
        const [lk, ...ts] = tables[i]
        const data = new Map(srcs.map((s, j) => [s, ts[j]]))
        // a franchise is one team across the span, under its latest
        // abbreviation
        const abbrev = (teamId: string) =>
          lkTo.teams.get(teamId)?.nba_abbrev ??
          lk.teams.get(teamId)?.nba_abbrev ??
          ""
        const rowsOf = (s: Src) =>
          sources[s].kinds
            ? data.get(s)!.filter(r => r.season_type === kind)
            : data.get(s)!
        const byPlayer = (s: Src) =>
          new Map(rowsOf(s).map(r => [r.player_id, r]))
        const [rx, ry] = [byPlayer(srcOf(sx)), byPlayer(srcOf(sy))]

        // with a team highlighted, every team each traded player played
        // for, so the team's highlight includes the players it traded away
        const own = rowsOf("stats")
        const teamsOf = new Map<string, string[]>()
        if (p.team && own.some(r => r.team_count > 1)) {
          const logs = await read("stats", "player_game_logs", season, [
            "player_id",
            "team_id",
            "game_id",
          ])
          const traded = new Set(
            own.filter(r => r.team_count > 1).map(r => r.player_id),
          )
          const games = logs
            .filter(
              g =>
                traded.has(g.player_id) &&
                lk.games.get(g.game_id)?.game_type === kind,
            )
            .sort(
              (a, b) =>
                +lk.games.get(a.game_id)!.game_date -
                +lk.games.get(b.game_id)!.game_date,
            )
          for (const g of games) {
            const ts = teamsOf.get(g.player_id) ?? []
            if (ts.at(-1) !== abbrev(g.team_id)) ts.push(abbrev(g.team_id))
            teamsOf.set(g.player_id, ts)
          }
        }

        const players: Player[] = []
        for (const r of own) {
          const [ox, oy] = [rx.get(r.player_id), ry.get(r.player_id)]
          const x = ox && sx.get(ox)
          const y = oy && sy.get(oy)
          if (x == null || y == null || !isFinite(x) || !isFinite(y)) continue
          players.push({
            key: `${r.player_id}:${season}`,
            player_id: r.player_id,
            season,
            name: lk.players.get(r.player_id) ?? r.player_id,
            team: abbrev(r.team_id),
            teams: teamsOf.get(r.player_id) ?? [abbrev(r.team_id)],
            gp: r.gp,
            volume: r[pair.volume] ?? 0,
            x,
            y,
          })
        }
        return { players, xs: rowsOf(srcOf(sx)), ys: rowsOf(srcOf(sy)) }
      }),
    )

    const names = new Map(
      [...lkTo.teams.values()]
        .filter(t => t.is_nba)
        .sort((a, b) => a.full_name.localeCompare(b.full_name))
        .map(t => [t.nba_abbrev as string, t.full_name as string]),
    )
    const lastDate = max(
      [...lkTo.games.values()].filter(g =>
        split ? g.game_type === kind : g.game_type !== "preseason",
      ),
      g => g.game_date as Date,
    )
    const all = []
    for (let s = first; s <= last; s++) all.push(s)
    return {
      pair: id,
      from: lo,
      to: hi,
      seasons: all,
      latest: last,
      kind,
      kinds,
      players: seasons.flatMap(s => s.players),
      // the league's, over every season in the span
      league: {
        x: sx.league(seasons.flatMap(s => s.xs)),
        y: sy.league(seasons.flatMap(s => s.ys)),
      },
      teams: names,
      lastDate,
      credit: srcs.map(s => sources[s].credit).join(", "),
    }
  },

  normalize(d, p) {
    return {
      ...p,
      pair: d.pair,
      from: d.from,
      to: d.to,
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
        key: "from",
        keyTo: "to",
        label: "Seasons",
        kind: "span",
        options: d.seasons.map(s => ({ value: s, label: fmtSeason(s) })),
      },
      ...(d.kinds.length
        ? [
            {
              key: "kind",
              label: "Games",
              kind: "select" as const,
              options: d.kinds.map(k => ({
                value: k,
                label: kindNames[k] ?? k,
              })),
            },
          ]
        : []),
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
    // a highlighted player who was traded wears another team's colors
    const traded = ps.some(
      pl => pl.teams.length > 1 && pl.teams.includes(p.team),
    )
    const one = d.from === d.to
    const games = max(d.players, pl => pl.gp) ?? 0
    const through =
      d.to === d.latest && d.lastDate ? `, through ${fmtDate(d.lastDate)}` : ""
    const reference: LegendItem = pair.ratios
      ? {
          symbol: "dash",
          color: color.muted,
          text: pair.ratioText!(d.league.y / d.league.x),
        }
      : pair.total
        ? {
            symbol: "line",
            color: color.faint,
            text: `diagonals: ${sx.short} + ${sy.short}`,
          }
        : {
            symbol: "dash",
            color: color.muted,
            text: `league avg: ${sx.tip(d.league.x)} ${sx.short}, ${sy.tip(d.league.y)} ${sy.short}`,
          }
    // a pair that doesn't split the season covers all of it
    const kind = d.kinds.length
      ? (kindNames[d.kind] ?? d.kind)
      : "regular season and playoffs"
    const when = one
      ? `in the ${fmtSeason(d.to)} ${kind}`
      : `over the ${fmtSeason(d.from)} to ${fmtSeason(d.to)} ${kind.replace("season", "seasons")}`
    return {
      title: team ?? pair.name,
      context: `${pair.deck} ${when}${through}. The top ${p.top}% of ${one ? "players" : "player-seasons"} by ${pair.volumeName}`,
      legend: [
        {
          symbol: "dot",
          color: team ? teamColors(p.team)[0] : color.ink,
          text: !team
            ? "one player, in team colors"
            : traded
              ? `played for ${p.team}`
              : `${p.team} player`,
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
      counts: one
        ? `${games} games · ${ps.length} players`
        : `${d.to - d.from + 1} seasons · ${ps.length} player-seasons`,
      source: `Data: ${d.credit}`,
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
    // a pair with lines across the plot names them in a gutter on the right
    const right = pair.ratios || pair.total ? 30 : 0
    const plotW = size.width - left - right
    const height = size.height ?? Math.round(plotW * 0.82) + top + bottom
    const plotH = height - top - bottom
    const r = 5

    // a ratio pair starts at zero, where its lines meet, and a total pair
    // shows zero, its average; an average pair shows its averages
    const ratio = pair.ratios ? d.league.y / d.league.x : 0
    const atZero = pair.ratios || pair.total
    const xs = ps.map(pl => pl.x)
    const ys = ps.map(pl => pl.y)
    const [x0, x1] = extent([...xs, atZero ? 0 : d.league.x])
    const [y0, y1] = extent([...ys, atZero ? 0 : d.league.y])
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
    const zero = plot
      .append("g")
      .attr("stroke", color.zero)
      .attr("stroke-width", 1.5)
    const [[X0, X1], [Y0, Y1]] = [x.domain(), y.domain()]

    // the y axis's title, which a name above the plot keeps clear of
    const yTitle = plot
      .append("text")
      .attr("x", -left)
      .attr("y", -8)
      .call(agate)
      .text(`↑ ${sy.label}`)
    const yTitleEnd = -left + yTitle.node()!.getComputedTextLength()

    // A faint line across the plot, named outside it where it leaves by the
    // right or the top, so no dot covers its name
    const near = (u: number, v: number, span: number) =>
      Math.abs(u - v) < span * 1e-9
    const guide = (a: [number, number], b: [number, number], name: string) => {
      guides
        .append("line")
        .attr("x1", x(a[0]))
        .attr("y1", y(a[1]))
        .attr("x2", x(b[0]))
        .attr("y2", y(b[1]))
        .attr("stroke", color.grid)
        .attr("stroke-width", 1.5)
      const right = [a, b].find(e => near(e[0], X1, X1 - X0))
      const top = [a, b].find(e => near(e[1], Y1, Y1 - Y0))
      const text = guides
        .append("text")
        .call(agate)
        .attr("fill", color.faint)
        .text(name)
      if (right) text.attr("x", plotW + 4).attr("y", y(right[1]) + 4)
      else if (top && x(top[0]) - 16 > yTitleEnd + 8)
        text.attr("x", x(top[0])).attr("y", -6).attr("text-anchor", "middle")
      else text.remove()
    }
    // where a line through zero with slope k leaves the plot
    const end = (k: number): [number, number] =>
      k * X1 > Y1 ? [Y1 / k, Y1] : [X1, k * X1]

    if (pair.ratios) {
      // lines of constant ratio from zero; the league's is dashed, like an
      // average
      for (const k of pair.ratios) guide([0, 0], end(k), fmtRatio(k))
      const [ex, ey] = end(ratio)
      ref
        .append("line")
        .attr("x1", x(0))
        .attr("y1", y(0))
        .attr("x2", x(ex))
        .attr("y2", y(ey))
    } else if (pair.total) {
      // lines of constant total, x + y, a step apart
      for (const c of scaleLinear()
        .domain([X0 + Y0, X1 + Y1])
        .ticks(6)) {
        const xa = Math.max(X0, c - Y1)
        const xb = Math.min(X1, c - Y0)
        if (xb - xa < (X1 - X0) / 20) continue
        guide([xa, c - xa], [xb, c - xb], `${sign(c)}${Math.abs(c)}`)
      }
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
    // zero is the strongest line on a signed axis
    if (sx.signed && X0 < 0 && X1 > 0) {
      zero.append("line").attr("x1", x(0)).attr("x2", x(0)).attr("y2", plotH)
      avoid.push({ x0: x(0) - 1, x1: x(0) + 1, y0: 0, y1: plotH })
    }
    if (sy.signed && Y0 < 0 && Y1 > 0) {
      zero.append("line").attr("y1", y(0)).attr("y2", y(0)).attr("x2", plotW)
      avoid.push({ x0: 0, x1: plotW, y0: y(0) - 1, y1: y(0) + 1 })
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
    const tickFmt = (st: Stat, sc: typeof x) => {
      if (st.pct) return pct
      const f = sc.tickFormat(6, ",~f")
      return st.signed ? (v: number) => `${sign(v)}${f(Math.abs(v))}` : f
    }
    const [xFmt, yFmt] = [tickFmt(sx, x), tickFmt(sy, y)]
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

    // dots in team colors, or a team's players over a faded league. The color
    // is identity, not value: names and position carry the reading
    const mine = (pl: Player) => !p.team || pl.teams.includes(p.team)
    // a traded player's name says so, as their numbers include their time
    // with other teams
    // over a span of seasons, a name says which season
    const named = (pl: Player) =>
      (d.from === d.to
        ? pl.name
        : `${pl.name} ’${String(pl.season).slice(2)}`) +
      (pl.teams.length > 1 ? ` (${pl.teams.join("→")})` : "")
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
          `${pl.name}, ${fmtSeason(pl.season)} (${pl.teams.join("→")})\n${sx.tip(pl.x)} ${sx.short} · ${sy.tip(pl.y)} ${sy.short} · ${pl.gp} games`,
        )
    }

    // names: the players with the most volume first, and all of a
    // highlighted team's. A click on a dot toggles its name
    const labelSize = 12.5
    // a team's few players are all named, overlapping if they must; a team
    // over many seasons is named where there's room
    const few = Boolean(p.team) && ps.filter(mine).length <= 20
    const labeled = placeLabels(
      plot.append("g").attr("font-weight", type.label.weight).node()!,
      ps
        .map(pl => ({
          x: x(pl.x),
          y: y(pl.y),
          r,
          text: named(pl),
          priority: (mine(pl) ? 1e9 : 0) + pl.volume,
          always: few && mine(pl),
          key: pl.key,
        }))
        .filter((_, i) => !p.team || mine(ps[i])),
      { width: plotW, height: plotH },
      { size: labelSize, minCell: 1800, avoid },
    )
    const marks: Mark[] = ps.map(pl => ({
      key: pl.key,
      x: x(pl.x) + left,
      y: y(pl.y) + top,
      r,
      label: named(pl),
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
