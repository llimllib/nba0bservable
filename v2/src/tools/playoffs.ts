// Playoff net points by player: one row per player on a team, one dot per
// playoff game, and a tick at the player's average
import { extent, max, mean, scaleLinear, select } from "d3"
import { headshotUrl, lookups, read } from "../kit/data"
import { agate } from "../kit/frame"
import { color, type } from "../kit/theme"
import type { Body, Mark, Tool } from "../kit/tool"

const seasons = [2026, 2025, 2024, 2023, 2022, 2021, 2020, 2019]

const defaults = { season: seasons[0], team: "BOS", mpg: 10 }
type P = typeof defaults

interface Game {
  game_id: string
  player_id: string
  team_id: string
  minutes: number
  o: number
  d: number
  t: number
  opp: string
  series_game: number | null
}

interface Player {
  player_id: string
  name: string
  games: Game[]
  avg: number
  mpg: number
}

interface D {
  season: number
  // NBA teams that played in the playoffs, by abbreviation
  teams: Map<string, { team_id: string; name: string }>
  games: Game[]
  names: Map<string, string>
  lastDate: Date
}

const fmtSeason = (s: number) => `${s - 1}–${String(s).slice(2)}`
const fmtDate = (d: Date, month: "short" | "long" = "short") =>
  d.toLocaleDateString("en-US", {
    month,
    day: "numeric",
    timeZone: "UTC",
  })
const signed = (v: number) =>
  (v > 0 ? "+" : v < 0 ? "−" : "") + Math.abs(v).toFixed(1)

function players(d: D, p: P): Player[] {
  const team = d.teams.get(p.team)
  const byPlayer = new Map<string, Game[]>()
  for (const g of d.games) {
    if (g.team_id !== team?.team_id) continue
    byPlayer.set(g.player_id, [...(byPlayer.get(g.player_id) ?? []), g])
  }
  return [...byPlayer]
    .map(([player_id, games]) => ({
      player_id,
      name: d.names.get(player_id) ?? player_id,
      games,
      avg: mean(games, g => g.t)!,
      mpg: mean(games, g => g.minutes)!,
    }))
    .filter(pl => pl.mpg >= p.mpg)
    .sort((a, b) => b.avg - a.avg)
}

// Spread dots that would overlap within a row: each dot takes the offset
// nearest the row's center that doesn't collide with a dot already placed
function dodge(xs: number[], r: number): number[] {
  const placed: [number, number][] = []
  return xs.map(x => {
    for (let i = 0; ; i++) {
      const y = (i % 2 ? -1 : 1) * Math.ceil(i / 2) * r * 1.1
      if (placed.every(([px, py]) => Math.hypot(px - x, py - y) >= r * 2.05)) {
        placed.push([x, y])
        return y
      }
    }
  })
}

export const playoffs: Tool<P, D> = {
  id: "playoffs",
  name: "Playoff net points",
  defaults,

  async load(p) {
    const [box, lk] = await Promise.all([
      read("espn", "player_box", p.season, [
        "game_id",
        "player_id",
        "team_id",
        "seconds_played",
        "o_net_pts",
        "d_net_pts",
        "t_net_pts",
      ]),
      lookups(p.season),
    ])
    const games: Game[] = []
    let lastDate = new Date(0)
    const teamIds = new Set<string>()
    for (const b of box) {
      const g = lk.games.get(b.game_id)
      if (g?.game_type !== "playoffs") continue
      if (g.game_date > lastDate) lastDate = g.game_date
      teamIds.add(b.team_id)
      const opp = b.team_id === g.home_team_id ? g.away_team_id : g.home_team_id
      games.push({
        game_id: b.game_id,
        player_id: b.player_id,
        team_id: b.team_id,
        minutes: (b.seconds_played ?? 0) / 60,
        o: b.o_net_pts,
        d: b.d_net_pts,
        t: b.t_net_pts,
        opp: lk.teams.get(opp)?.nba_abbrev ?? "",
        series_game: g.series_game,
      })
    }
    const teams = new Map(
      [...teamIds]
        .map(id => lk.teams.get(id)!)
        .sort((a, b) => a.full_name.localeCompare(b.full_name))
        .map(t => [t.nba_abbrev, { team_id: t.team_id, name: t.full_name }]),
    )
    return { season: p.season, teams, games, names: lk.players, lastDate }
  },

  normalize(d, p) {
    return d.teams.has(p.team) ? p : { ...p, team: [...d.teams.keys()][0] }
  },

  controls(d) {
    return [
      {
        key: "season",
        label: "Season",
        kind: "select",
        options: seasons.map(s => ({ value: s, label: fmtSeason(s) })),
      },
      {
        key: "team",
        label: "Team",
        kind: "select",
        options: [...d.teams].map(([abbrev, t]) => ({
          value: abbrev,
          label: t.name,
        })),
      },
      {
        key: "mpg",
        label: "Min. minutes per game",
        kind: "range",
        min: 0,
        max: 36,
        step: 1,
      },
    ]
  },

  describe(d, p) {
    const team = d.teams.get(p.team)!
    const n = new Set(
      d.games.filter(g => g.team_id === team.team_id).map(g => g.game_id),
    ).size
    return {
      title: team.name,
      context: `Net points per game in the ${fmtSeason(d.season)} playoffs, through ${fmtDate(d.lastDate, "long")}`,
      counts: `${n} games · ${players(d, p).length} players`,
      legend: [
        { symbol: "dot", color: color.pos, text: "one game" },
        { symbol: "tick", color: color.zero, text: "average" },
      ],
      source: "Data: ESPN Analytics",
      team: p.team,
    }
  },

  render(node, d, p, size): Body {
    const rows = players(d, p)
    const g = select(node)
    const axisHeight = 44
    const rowH = size.height
      ? Math.max(
          22,
          Math.min(80, (size.height - axisHeight) / Math.max(rows.length, 1)),
        )
      : 46
    const height = size.height ?? rows.length * rowH + axisHeight
    const plotH = rows.length * rowH
    const r = Math.max(2.5, Math.min(5.5, rowH / 8))

    // the label column fits the longest name, beside the headshot
    const imgH = Math.min(rowH - 4, 34)
    const tx = imgH * (260 / 190) + 8
    const measure = g
      .append("text")
      .attr("font-size", type.label.size)
      .attr("font-weight", 600)
    const nameWidth = max(rows, pl =>
      measure.text(pl.name).node()!.getComputedTextLength(),
    )
    measure.remove()
    const labelWidth = tx + Math.max(nameWidth ?? 0, 140) + 16

    const all = rows.flatMap(pl => pl.games.map(gm => gm.t))
    const [lo, hi] = extent([...all, 0]) as [number, number]
    const x = scaleLinear()
      .domain([lo, hi])
      .nice()
      .range([labelWidth + r + 2, size.width - r - 2])

    // grid, then the zero line, which is the strongest line on the chart
    const ticks = x.ticks(8)
    g.append("g")
      .selectAll("line")
      .data(ticks.filter(t => t !== 0))
      .join("line")
      .attr("x1", t => x(t))
      .attr("x2", t => x(t))
      .attr("y1", 0)
      .attr("y2", plotH)
      .attr("stroke", color.grid)
    g.append("line")
      .attr("x1", x(0))
      .attr("x2", x(0))
      .attr("y1", -4)
      .attr("y2", plotH + 4)
      .attr("stroke", color.zero)
      .attr("stroke-width", 1.5)

    // x axis: tick labels, then the axis title beneath them
    const axis = g.append("g").attr("transform", `translate(0,${plotH + 18})`)
    axis
      .selectAll("text")
      .data(ticks)
      .join("text")
      .attr("x", t => x(t))
      .attr("text-anchor", "middle")
      .attr("font-size", type.tick.size)
      .attr("fill", color.muted)
      .text(t => (t > 0 ? `+${t}` : t < 0 ? `−${-t}` : "0"))
    axis
      .append("text")
      .attr("x", x(0))
      .attr("y", 20)
      .attr("text-anchor", "middle")
      .call(agate)
      .text("← worse · net points in one game · better →")

    const marks: Mark[] = []
    rows.forEach((pl, i) => {
      const cy = i * rowH + rowH / 2
      const row = g.append("g").attr("transform", `translate(0,${cy})`)
      row
        .append("image")
        .attr("href", headshotUrl(pl.player_id))
        .attr("x", 0)
        .attr("y", -imgH / 2)
        .attr("width", imgH * (260 / 190))
        .attr("height", imgH)
      row
        .append("text")
        .attr("x", tx)
        .attr("y", rowH > 34 ? -2 : 4)
        .attr("font-size", type.label.size)
        .attr("font-weight", 600)
        .text(pl.name)
      if (rowH > 34)
        row
          .append("text")
          .attr("x", tx)
          .attr("y", 13)
          .attr("font-size", type.sub.size)
          .attr("font-weight", type.sub.weight)
          .attr("fill", color.muted)
          .text(
            `${signed(pl.avg)} avg · ${pl.games.length} g · ${Math.round(pl.mpg)} mpg`,
          )

      const games = [...pl.games].sort((a, b) => a.t - b.t)
      const dys = dodge(
        games.map(gm => x(gm.t)),
        r,
      )
      const maxDy = max(dys, Math.abs) ?? 0
      const squeeze = maxDy > rowH / 2 - r ? (rowH / 2 - r) / maxDy : 1
      games.forEach((gm, j) => {
        const cx = x(gm.t)
        const dy = dys[j] * squeeze
        row
          .append("circle")
          .attr("cx", cx)
          .attr("cy", dy)
          .attr("r", r)
          .attr("fill", gm.t >= 0 ? color.pos : color.neg)
          .attr("fill-opacity", 0.85)
          .attr("stroke", color.bg)
          .attr("stroke-width", 0.75)
          .append("title")
          .text(
            `${pl.name} vs ${gm.opp}${gm.series_game ? `, game ${gm.series_game}` : ""}\n` +
              `Net ${signed(gm.t)} (O ${signed(gm.o)}, D ${signed(gm.d)}) in ${Math.round(gm.minutes)} min`,
          )
        marks.push({
          key: `${pl.player_id}:${gm.game_id}`,
          x: cx,
          y: cy + dy,
          r,
          label: `${signed(gm.t)} vs ${gm.opp}${gm.series_game ? ` G${gm.series_game}` : ""}`,
        })
      })
      row
        .append("line")
        .attr("x1", x(pl.avg))
        .attr("x2", x(pl.avg))
        .attr("y1", -rowH * 0.3)
        .attr("y2", rowH * 0.3)
        .attr("stroke", color.zero)
        .attr("stroke-width", 2.5)
        .attr("stroke-linecap", "round")
    })

    if (!rows.length)
      g.append("text")
        .attr("x", size.width / 2)
        .attr("y", 40)
        .attr("text-anchor", "middle")
        .attr("fill", color.muted)
        .text("No players meet the minutes filter")

    return {
      height,
      marks,
      // a note's position: a value on the x scale, in a player's row
      invert(px, py) {
        const i = Math.floor(py / rowH)
        if (py < 0 || i >= rows.length) return undefined
        return {
          x: +x.invert(px).toFixed(2),
          p: rows[i].player_id,
          f: +(py / rowH - i).toFixed(3),
        }
      },
      project(pos) {
        const { x: v, p: id, f } = pos as { x: number; p: string; f: number }
        const i = rows.findIndex(pl => pl.player_id === id)
        return i < 0 ? undefined : [x(v), (i + f) * rowH]
      },
    }
  },
}
