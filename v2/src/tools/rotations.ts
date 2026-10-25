// A team's rotation in one game: one row per player, one bar per stint on the
// game clock, colored and labeled by the score margin while they were on
import { max, scaleLinear, select, sum } from "d3"
import { lookups, read, type Row as DataRow } from "../kit/data"
import { color, type } from "../kit/theme"
import type { Body, Mark, Tool } from "../kit/tool"

const seasons = [2027, 2026, 2025]

// game is a game id; empty means the team's latest game
const defaults = { season: seasons[0], team: "BOS", game: "" }
type P = typeof defaults

interface Stint {
  player_id: string
  in: number
  out: number
  pts: number
  pm: number
}

interface Game {
  game_id: string
  date: Date
  // "vs NYK" or "@ NYK"
  where: string
  // "Finals G7", "Preseason", ... empty for the regular season
  kind: string
  opp_team_id: string
  opp: string
  pts: number
  opp_pts: number
}

interface D {
  season: number
  // NBA teams with rotation data, by abbreviation
  teams: Map<string, { team_id: string; name: string }>
  // each team's games, latest first
  games: Map<string, Game[]>
  // stints by `${game_id}:${team_id}`
  stints: Map<string, Stint[]>
  names: Map<string, string>
}

interface Row {
  player_id: string
  name: string
  stints: Stint[]
  min: number
  pm: number
}

const fmtSeason = (s: number) => `${s - 1}–${String(s).slice(2)}`
const fmtDate = (d: Date, year = false) =>
  d.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: year ? "numeric" : undefined,
    timeZone: "UTC",
  })
const signed = (v: number) => (v > 0 ? `+${v}` : v < 0 ? `−${-v}` : "0")
const mmss = (s: number) =>
  `${Math.floor(s / 60)}:${String(Math.floor(s % 60)).padStart(2, "0")}`
const result = (g: Game) =>
  `${g.pts > g.opp_pts ? "W" : "L"} ${g.pts}–${g.opp_pts}`

const rounds = ["", "Round 1", "Round 2", "Conf. finals", "Finals"]

// Periods are 12 minutes, overtimes 5, as seconds from the start of the game
const periodStart = (n: number) =>
  n <= 4 ? (n - 1) * 720 : 2880 + (n - 5) * 300
const periodName = (n: number) =>
  n <= 4 ? `Q${n}` : n === 5 ? "OT" : `${n - 4}OT`

// The game clock at a time, as a period and the time left in it. An out time
// on a period's last second is the end of that period, not the start of the next
function clock(t: number, isOut = false) {
  const u = isOut ? t - 0.05 : t
  let n = 1
  while (periodStart(n + 1) <= u) n++
  return { period: periodName(n), left: periodStart(n + 1) - t }
}

// A stint on the game clock: "Q1 7:12–2:40", "Q1 2:40–Q2 9:00", or
// "Q2 8:35–end of Q3"
function span(s: Stint) {
  const a = clock(s.in)
  const b = clock(s.out, true)
  const end =
    b.left < 0.05
      ? `end of ${b.period}`
      : b.period === a.period
        ? mmss(b.left)
        : `${b.period} ${mmss(b.left)}`
  return `${a.period} ${mmss(a.left)}–${end}`
}

// Substitutions: every check-in after the opening tip, between periods
// included, except a player shown leaving and re-entering at the same moment
function substitutions(stints: Stint[]) {
  const outs = new Set(stints.map(s => `${s.player_id}:${s.out}`))
  return stints.filter(s => s.in > 0 && !outs.has(`${s.player_id}:${s.in}`))
    .length
}

function rows(d: D, p: P): Row[] {
  const team = d.teams.get(p.team)
  const byPlayer = new Map<string, Stint[]>()
  for (const s of d.stints.get(`${p.game}:${team?.team_id}`) ?? [])
    byPlayer.set(s.player_id, [...(byPlayer.get(s.player_id) ?? []), s])
  const out = [...byPlayer].map(([player_id, stints]) => ({
    player_id,
    name: d.names.get(player_id) ?? player_id,
    stints: stints.sort((a, b) => a.in - b.in),
    min: sum(stints, s => s.out - s.in) / 60,
    pm: sum(stints, s => s.pm),
  }))
  // starters by minutes, then the bench in the order they came in
  const starter = (r: Row) => r.stints[0].in === 0
  return out.sort((a, b) =>
    starter(a) !== starter(b)
      ? starter(a)
        ? -1
        : 1
      : starter(a)
        ? b.min - a.min
        : a.stints[0].in - b.stints[0].in,
  )
}

export const rotations: Tool<P, D> = {
  id: "rotations",
  name: "Rotations",
  defaults,

  async load(p) {
    const [rot, lk] = await Promise.all([
      read("stats", "game_rotations", p.season, [
        "game_id",
        "team_id",
        "player_id",
        "in_time",
        "out_time",
        "pts",
        "plus_minus",
        "matches_box_score",
      ]),
      lookups(p.season),
    ])
    // games whose stints don't add up to the box score have a missed
    // substitution or similar, so they're left out. The ones that do add up
    // have every point scored, so they also give the final score
    const stints = new Map<string, Stint[]>()
    const teamPts = new Map<string, Map<string, number>>()
    for (const r of rot) {
      if (!r.matches_box_score) continue
      const key = `${r.game_id}:${r.team_id}`
      if (!stints.has(key)) stints.set(key, [])
      stints.get(key)!.push({
        player_id: r.player_id,
        in: r.in_time,
        out: r.out_time,
        pts: r.pts,
        pm: r.plus_minus,
      })
      if (!teamPts.has(r.game_id)) teamPts.set(r.game_id, new Map())
      const pts = teamPts.get(r.game_id)!
      pts.set(r.team_id, (pts.get(r.team_id) ?? 0) + r.pts)
    }
    const games = new Map<string, Game[]>()
    for (const [game_id, pts] of teamPts) {
      const g = lk.games.get(game_id)
      if (!g) continue
      const kind =
        g.game_type === "playoffs"
          ? `${rounds[g.playoff_round]} G${g.series_game}`
          : g.game_type === "play_in"
            ? "Play-in"
            : g.game_type === "preseason"
              ? "Preseason"
              : g.game_type === "cup_final"
                ? "Cup final"
                : ""
      for (const [team_id, own] of pts) {
        const [opp_id, opp_pts] = [...pts].find(([id]) => id !== team_id) ?? []
        if (!opp_id) continue
        if (!games.has(team_id)) games.set(team_id, [])
        games.get(team_id)!.push({
          game_id,
          date: g.game_date,
          // neutral-site games have no home team, and read "vs"
          where: `${g.away_team_id === team_id ? "@" : "vs"} ${lk.teams.get(opp_id)?.nba_abbrev ?? ""}`,
          opp_team_id: opp_id,
          opp: lk.teams.get(opp_id)?.nba_abbrev ?? "",
          kind,
          pts: own,
          opp_pts: opp_pts!,
        })
      }
    }
    for (const gs of games.values())
      gs.sort((a, b) => +b.date - +a.date || b.game_id.localeCompare(a.game_id))
    const teams = new Map(
      [...games.keys()]
        .map(id => lk.teams.get(id))
        // a team missing from team_seasons is a lookup that's behind the
        // rotations, so skip it rather than fail
        .filter((t): t is DataRow => Boolean(t?.is_nba))
        .sort((a, b) => a.full_name.localeCompare(b.full_name))
        .map(t => [t.nba_abbrev, { team_id: t.team_id, name: t.full_name }]),
    )
    return { season: p.season, teams, games, stints, names: lk.players }
  },

  normalize(d, p) {
    const team = d.teams.has(p.team) ? p.team : [...d.teams.keys()][0]
    const games = d.games.get(d.teams.get(team)!.team_id)!
    const game = games.some(g => g.game_id === p.game)
      ? p.game
      : games[0].game_id
    return { ...p, team, game }
  },

  controls(d, p) {
    const games = d.games.get(d.teams.get(p.team)!.team_id)!
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
        key: "game",
        label: "Game",
        kind: "select",
        options: games.map(g => ({
          value: g.game_id,
          label: [fmtDate(g.date), g.where, g.kind, result(g)]
            .filter(Boolean)
            .join(" · "),
        })),
      },
    ]
  },

  describe(d, p) {
    const team = d.teams.get(p.team)!
    const g = d.games.get(team.team_id)!.find(gm => gm.game_id === p.game)!
    return {
      title: `${team.name} rotation`,
      context: [
        g.where,
        fmtDate(g.date, true),
        g.kind,
        result(g),
        `${substitutions(d.stints.get(`${g.game_id}:${team.team_id}`)!)} subs (${g.opp} ${substitutions(d.stints.get(`${g.game_id}:${g.opp_team_id}`)!)})`,
      ]
        .filter(Boolean)
        .join(" · "),
      legend: [
        { symbol: "bar", color: color.pos, label: "+1", text: "won the stint" },
        {
          symbol: "bar",
          color: color.neg,
          label: "−1",
          text: "lost the stint",
        },
      ],
      source: "Data: NBA.com play-by-play",
    }
  },

  render(node, d, p, size): Body {
    const rs = rows(d, p)
    const g = select(node)
    const topHeight = 22
    const axisHeight = 40
    const rowH = size.height
      ? Math.max(
          16,
          Math.min(
            44,
            (size.height - topHeight - axisHeight) / Math.max(rs.length, 1),
          ),
        )
      : 30
    const plotH = rs.length * rowH
    const height = size.height ?? topHeight + plotH + axisHeight
    const barH = Math.min(rowH * 0.66, 24)

    const measure = g
      .append("text")
      .attr("font-size", type.label.size)
      .attr("font-weight", 600)
    const nameWidth = max(rs, r =>
      measure.text(r.name).node()!.getComputedTextLength(),
    )
    measure.remove()
    const labelWidth = (nameWidth ?? 0) + 12
    // minutes and plus-minus columns on the right
    const colW = 44
    const statsWidth = colW * 2

    // the game runs to the end of its last period, overtimes included
    const last = max(
      [...d.stints]
        .filter(([k]) => k.startsWith(`${p.game}:`))
        .flatMap(([, ss]) => ss.map(s => s.out)),
    )!
    let periods = 4
    while (periodStart(periods + 1) < last) periods++
    const end = periodStart(periods + 1)
    const x = scaleLinear()
      .domain([0, end])
      .range([labelWidth, size.width - statsWidth - 8])

    const plot = g.append("g").attr("transform", `translate(0,${topHeight})`)

    // period boundaries, with the period names above
    const bounds = Array.from({ length: periods + 1 }, (_, i) =>
      periodStart(i + 1),
    )
    plot
      .append("g")
      .selectAll("line")
      .data(bounds)
      .join("line")
      .attr("x1", t => x(t))
      .attr("x2", t => x(t))
      .attr("y1", -4)
      .attr("y2", plotH + 4)
      .attr("stroke", t => (t === 0 || t === 1440 ? color.faint : color.grid))
    plot
      .append("g")
      .selectAll("text")
      .data(bounds.slice(0, -1))
      .join("text")
      .attr("x", (t, i) => (x(t) + x(bounds[i + 1])) / 2)
      .attr("y", -9)
      .attr("text-anchor", "middle")
      .attr("font-size", type.tick.size)
      .attr("font-weight", 600)
      .attr("fill", color.muted)
      .text((_, i) => periodName(i + 1))
    for (const [i, label] of ["MIN", "+/−"].entries())
      plot
        .append("text")
        .attr("x", size.width - colW * (1 - i))
        .attr("y", -9)
        .attr("text-anchor", "end")
        .attr("font-size", type.tick.size)
        .attr("font-weight", 600)
        .attr("fill", color.muted)
        .text(label)

    // minutes elapsed, beneath
    const axis = plot
      .append("g")
      .attr("transform", `translate(0,${plotH + 18})`)
    axis
      .selectAll("text")
      .data(bounds)
      .join("text")
      .attr("x", t => x(t))
      .attr("text-anchor", "middle")
      .attr("font-size", type.tick.size)
      .attr("fill", color.muted)
      .text(t => t / 60)
    axis
      .append("text")
      .attr("x", x(end / 2))
      .attr("y", 18)
      .attr("text-anchor", "middle")
      .attr("font-size", type.tick.size)
      .attr("font-weight", 600)
      .attr("fill", color.muted)
      .text("minutes")

    const marks: Mark[] = []
    rs.forEach((r, i) => {
      const cy = i * rowH + rowH / 2
      const row = plot.append("g").attr("transform", `translate(0,${cy})`)
      row
        .append("text")
        .attr("x", 0)
        .attr("y", 4.5)
        .attr("font-size", type.label.size)
        .attr("font-weight", 600)
        .text(r.name)
      row
        .append("text")
        .attr("x", size.width - colW)
        .attr("y", 4.5)
        .attr("text-anchor", "end")
        .attr("font-size", type.label.size)
        .text(mmss(r.min * 60))
      row
        .append("text")
        .attr("x", size.width)
        .attr("y", 4.5)
        .attr("text-anchor", "end")
        .attr("font-size", type.label.size)
        .attr("font-weight", 600)
        .attr("fill", r.pm > 0 ? color.pos : r.pm < 0 ? color.neg : color.ink)
        .text(signed(r.pm))

      for (const s of r.stints) {
        const x0 = x(s.in)
        const w = Math.max(x(s.out) - x0, 1.5)
        const fill = s.pm > 0 ? color.pos : s.pm < 0 ? color.neg : color.grid
        const bar = row.append("g")
        bar
          .append("rect")
          .attr("x", x0)
          .attr("y", -barH / 2)
          .attr("width", w)
          .attr("height", barH)
          .attr("rx", 2)
          .attr("fill", fill)
          // a hairline gap between stints that end and start at once
          .attr("stroke", color.bg)
          .attr("stroke-width", 0.75)
        const text = signed(s.pm)
        // label the bar when the number fits inside it
        if (w >= text.length * 7 + 6)
          bar
            .append("text")
            .attr("x", x0 + w / 2)
            .attr("y", 4)
            .attr("text-anchor", "middle")
            .attr("font-size", 11)
            .attr("font-weight", 600)
            .attr("fill", s.pm === 0 ? color.muted : color.bg)
            .attr("pointer-events", "none")
            .text(text)
        bar
          .append("title")
          .text(
            `${r.name}: ${span(s)} (${mmss(s.out - s.in)})\n` +
              `${signed(s.pm)} margin, ${s.pts} pts`,
          )
        marks.push({
          key: `${r.player_id}:${s.in}`,
          x: x0 + w / 2,
          y: cy + topHeight,
          r: barH / 2,
          w: w / 2,
          label: `${signed(s.pm)}, ${span(s)}`,
        })
      }
    })

    return {
      height,
      marks,
      // a note's position: a time in the game, in a player's row
      invert(px, py) {
        const i = Math.floor((py - topHeight) / rowH)
        if (i < 0 || i >= rs.length) return undefined
        return {
          x: Math.round(x.invert(px)),
          p: rs[i].player_id,
          f: +((py - topHeight) / rowH - i).toFixed(3),
        }
      },
      project(pos) {
        const { x: t, p: id, f } = pos as { x: number; p: string; f: number }
        const i = rs.findIndex(r => r.player_id === id)
        return i < 0 ? undefined : [x(t), topHeight + (i + f) * rowH]
      },
    }
  },
}
