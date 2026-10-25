// Shooting efficiency by usage: true shooting against usage rate, one dot per
// player, for the players who take the most shots. The first weeks of a
// season are noisy, and that's part of the fun
import { extent, max, quantile, scaleLinear, select, sum } from "d3"
import { lookups, metadata, read } from "../kit/data"
import { agate } from "../kit/frame"
import { placeLabels, type Box } from "../kit/labels"
import { teams } from "../kit/teams"
import { color, type } from "../kit/theme"
import type { Body, Mark, Tool } from "../kit/tool"

// season 0 is the latest season the data has; load resolves it
const defaults = { season: 0, kind: "regular_season", team: "", top: 25 }
type P = typeof defaults

interface Player {
  player_id: string
  name: string
  team: string
  gp: number
  fga: number
  usg: number
  ts: number
}

interface D {
  season: number
  seasons: number[]
  kind: string
  kinds: string[]
  players: Player[]
  // league-wide true shooting, from every player's totals
  leagueTs: number
  teams: Map<string, string>
  lastDate?: Date
}

// a player on the floor uses a fifth of his team's possessions
const AVG_USAGE = 0.2

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
const pct = (v: number) => `${Math.round(v * 100)}%`

// a team's primary and secondary colors, for a dot's fill and outline
function teamColors(abbrev: string): [string, string] {
  const c = teams.get(abbrev)?.colors ?? []
  return [c[0] ?? color.ink, c[1] ?? color.bg]
}

// The view's two headline facts, for a caption: who uses the most of his
// team's offense, and who's most efficient among those who use more than
// average
export function leaders(d: D, p: P) {
  const ps = shown(d, p)
  const busiest = max(ps, pl => pl.usg)
  const usage = ps.find(pl => pl.usg === busiest)
  const heavy = ps.filter(pl => pl.usg > AVG_USAGE)
  const best = max(heavy, pl => pl.ts)
  const efficient = heavy.find(pl => pl.ts === best)
  return { usage, efficient, games: max(d.players, pl => pl.gp) ?? 0 }
}

// the players who take the most shots: the top `top` percent by attempts
function shown(d: D, p: P) {
  const cut = quantile(d.players, 1 - p.top / 100, pl => pl.fga) ?? 0
  return d.players.filter(pl => pl.fga >= cut && pl.fga > 0)
}

export const shooting: Tool<P, D> = {
  id: "shooting",
  name: "Shooting by usage",
  defaults,

  async load(p) {
    const meta = await metadata()
    const { first_season, last_season } = meta.player_season_stats
    const season = p.season || last_season
    const [stats, lk] = await Promise.all([
      read("stats", "player_season_stats", season, [
        "player_id",
        "team_id",
        "season_type",
        "gp",
        "pts",
        "fga",
        "fta",
        "usg_pct",
        "ts_pct",
      ]),
      lookups(season),
    ])
    const kinds = [...new Set(stats.map(s => s.season_type as string))].sort()
    const kind = kinds.includes(p.kind) ? p.kind : kinds[0]
    const rows = stats.filter(s => s.season_type === kind)
    const players = rows
      .filter(s => s.usg_pct != null && s.ts_pct != null)
      .map(s => ({
        player_id: s.player_id,
        name: lk.players.get(s.player_id) ?? s.player_id,
        team: lk.teams.get(s.team_id)?.nba_abbrev ?? "",
        gp: s.gp,
        fga: s.fga,
        usg: s.usg_pct,
        ts: s.ts_pct,
      }))
    const leagueTs =
      sum(rows, s => s.pts) /
      (2 * (sum(rows, s => s.fga) + 0.44 * sum(rows, s => s.fta)))
    const teams = new Map(
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
    return { season, seasons, kind, kinds, players, leagueTs, teams, lastDate }
  },

  normalize(d, p) {
    return {
      ...p,
      season: d.season,
      kind: d.kind,
      team: d.teams.has(p.team) ? p.team : "",
    }
  },

  controls(d) {
    return [
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
        label: "Top % by shot attempts",
        kind: "range",
        min: 5,
        max: 100,
        step: 5,
      },
    ]
  },

  describe(d, p) {
    const ps = shown(d, p)
    const team = d.teams.get(p.team)
    const games = max(d.players, pl => pl.gp) ?? 0
    const through = d.lastDate ? `, through ${fmtDate(d.lastDate)}` : ""
    return {
      title: team ?? "Shooting by usage",
      context: `True shooting by usage rate in the ${fmtSeason(d.season)} ${kindNames[d.kind] ?? d.kind}${through}. The top ${p.top}% of players by shot attempts`,
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
        {
          symbol: "dash",
          color: color.muted,
          text: `league avg: ${pct(d.leagueTs)} TS, 20% usage`,
        },
      ],
      counts: `${games} games · ${ps.length} players`,
      source: "Data: NBA.com",
      team: p.team || undefined,
    }
  },

  render(node, d, p, size): Body {
    const ps = shown(d, p)
    const g = select(node)
    const left = 46
    const bottom = 48
    const top = 20
    const plotW = size.width - left
    const height = size.height ?? Math.round(plotW * 0.82) + top + bottom
    const plotH = height - top - bottom
    const r = 5

    const [x0, x1] = extent([...ps.map(pl => pl.usg), AVG_USAGE]) as [
      number,
      number,
    ]
    const [y0, y1] = extent([...ps.map(pl => pl.ts), d.leagueTs]) as [
      number,
      number,
    ]
    const x = scaleLinear()
      .domain([x0, x1])
      .nice()
      .range([r + 2, plotW - r - 2])
    const y = scaleLinear()
      .domain([y0, y1])
      .nice()
      .range([plotH - r - 2, r + 2])
    const plot = g.append("g").attr("transform", `translate(${left},${top})`)

    // grid
    const grid = plot.append("g").attr("stroke", color.grid)
    for (const t of x.ticks(6))
      grid.append("line").attr("x1", x(t)).attr("x2", x(t)).attr("y2", plotH)
    for (const t of y.ticks(6))
      grid.append("line").attr("y1", y(t)).attr("y2", y(t)).attr("x2", plotW)

    // the reference lines that make the quadrants mean something: league
    // average true shooting, and average usage
    const ref = plot
      .append("g")
      .attr("stroke", color.muted)
      .attr("stroke-width", 1.25)
      .attr("stroke-dasharray", "5 4")
    ref
      .append("line")
      .attr("y1", y(d.leagueTs))
      .attr("y2", y(d.leagueTs))
      .attr("x2", plotW)
    ref
      .append("line")
      .attr("x1", x(AVG_USAGE))
      .attr("x2", x(AVG_USAGE))
      .attr("y2", plotH)

    // the quadrants, named in their corners. These are guideposts: drawn
    // first and faint, so dots and names write over them when they need to
    const corners: [string, number, number, "start" | "end"][] = [
      ["Low usage · efficient", 6, 14, "start"],
      ["High usage · efficient", plotW - 6, 14, "end"],
      ["Low usage · inefficient", 6, plotH - 8, "start"],
      ["High usage · inefficient", plotW - 6, plotH - 8, "end"],
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
    // names keep off the reference lines
    const avoid: Box[] = [
      { x0: x(AVG_USAGE) - 1, x1: x(AVG_USAGE) + 1, y0: 0, y1: plotH },
      { x0: 0, x1: plotW, y0: y(d.leagueTs) - 1, y1: y(d.leagueTs) + 1 },
    ]

    // axes: ticks, and titles beside them
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
        .text(pct(t))
    for (const t of y.ticks(6))
      axis
        .append("text")
        .attr("x", -8)
        .attr("y", y(t) + 4.5)
        .attr("text-anchor", "end")
        .text(pct(t))
    plot
      .append("text")
      .attr("x", plotW / 2)
      .attr("y", plotH + 40)
      .attr("text-anchor", "middle")
      .call(agate)
      .text("Usage rate →")
    plot
      .append("text")
      .attr("x", -left)
      .attr("y", -8)
      .call(agate)
      .text("↑ True shooting")

    // dots in team colors, or a team's players over a faded league. The color
    // is identity, not value: names and position carry the reading
    const mine = (pl: Player) => !p.team || pl.team === p.team
    const order = [...ps].sort((a, b) => Number(mine(a)) - Number(mine(b)))
    const marks: Mark[] = []
    for (const pl of order) {
      const cx = x(pl.usg)
      const cy = y(pl.ts)
      plot
        .append("circle")
        .attr("cx", cx)
        .attr("cy", cy)
        .attr("r", r)
        .attr("fill", mine(pl) ? teamColors(pl.team)[0] : color.faint)
        .attr("fill-opacity", mine(pl) ? 1 : 0.45)
        .attr("stroke", mine(pl) ? teamColors(pl.team)[1] : color.bg)
        .attr("stroke-width", mine(pl) ? 1.5 : 0.75)
        .append("title")
        .text(
          `${pl.name} (${pl.team})\n${pct(pl.usg)} usage · ${(pl.ts * 100).toFixed(1)}% TS · ${pl.fga} FGA`,
        )
      marks.push({
        key: pl.player_id,
        x: cx + left,
        y: cy + top,
        r,
        label: `${pl.name} ${(pl.ts * 100).toFixed(1)}%`,
      })
    }

    // names: the busiest shooters first, and all of a highlighted team's
    placeLabels(
      plot.append("g").attr("font-weight", type.label.weight).node()!,
      ps
        .map(pl => ({
          x: x(pl.usg),
          y: y(pl.ts),
          r,
          text: pl.name,
          priority: (mine(pl) ? 1e6 : 0) + pl.fga,
          always: Boolean(p.team) && mine(pl),
        }))
        .filter(lp => !p.team || lp.always),
      { width: plotW, height: plotH },
      { size: 12.5, minCell: 1800, avoid },
    )

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
      // a note's position: usage and true shooting
      invert(px, py) {
        const [u, v] = [px - left, py - top]
        if (u < 0 || u > plotW || v < 0 || v > plotH) return undefined
        return { u: +x.invert(u).toFixed(4), t: +y.invert(v).toFixed(4) }
      },
      project(pos) {
        const { u, t } = pos as { u: number; t: number }
        return [x(u) + left, y(t) + top]
      },
    }
  },
}
