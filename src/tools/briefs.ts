// The front page's live headlines: one finding from today's data per tool,
// and the view of the tool that shows it. Each reads little: efficiency's
// team game logs (which also give rotations its game) and one season of one
// player_box column
import { lookups, metadata, read } from "../kit/data"
import { cumulative } from "./cumulative"
import { efficiency } from "./efficiency"

export interface Brief {
  headline: string
  // the query string of the view that shows it, or "" for the defaults
  query: string
}

const signed = (v: number, digits = 1) =>
  `${v < 0 ? "−" : "+"}${Math.abs(v).toFixed(digits)}`

const fmtDate = (d: Date) =>
  d.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    timeZone: "UTC",
  })

// the best offense or defense, whichever is further from the average
export async function efficiencyBrief(): Promise<Brief | undefined> {
  const d = await efficiency.load(efficiency.defaults)
  const best = (k: "off" | "def") =>
    d.teams.reduce<(typeof d.teams)[number] | undefined>(
      (a, t) => (!a || t[k] > a[k] ? t : a),
      undefined,
    )
  const off = best("off")
  const def = best("def")
  if (!off || !def) return
  const [k, t] =
    off.off >= def.def ? (["off", off] as const) : (["def", def] as const)
  const side = k === "off" ? "offense" : "defense"
  return {
    headline: `Best ${side}: the ${t.name}, ${signed(t[k])} per 100 possessions`,
    query: `sort=${k}`,
  }
}

// the closest game on the latest day with games
export async function rotationsBrief(): Promise<Brief | undefined> {
  const meta = await metadata()
  const season = meta.team_game_logs.last_season
  // the columns efficiency reads, so this is the same read
  const [logs, games, lk] = await Promise.all([
    read("stats", "team_game_logs", season, [
      "game_id",
      "team_id",
      "game_date",
      "pts",
      "plus_minus",
      "poss",
    ]),
    read("stats", "games", season, ["game_id", "game_type"]),
    lookups(season),
  ])
  const type = new Map(games.map(g => [g.game_id, g.game_type as string]))
  const played = logs.filter(r => type.get(r.game_id) !== "preseason")
  const latest = Math.max(...played.map(r => +r.game_date))
  const day = played.filter(r => +r.game_date === latest && r.plus_minus > 0)
  const close = day.sort(
    (a, b) => a.plus_minus - b.plus_minus || b.pts - a.pts,
  )[0]
  if (!close) return
  const abbrev = (id: string) => lk.teams.get(id)?.nba_abbrev ?? ""
  const loser = played.find(
    r => r.game_id === close.game_id && r.team_id !== close.team_id,
  )
  if (!loser) return
  const w = abbrev(close.team_id)
  return {
    headline: `Closest game, ${fmtDate(close.game_date)}: ${w} ${close.pts}, ${abbrev(loser.team_id)} ${loser.pts}`,
    query: `season=${season}&team=${w}&game=${close.game_id}`,
  }
}

// the leader in net points this season
export async function cumulativeBrief(): Promise<Brief | undefined> {
  const d = await cumulative.load(cumulative.defaults)
  let top: { id: string; v: number; n: number } | undefined
  for (const [id, gs] of d.games) {
    const own = gs.filter(g => !g.playoff)
    const v = own.reduce((s, g) => s + g.v, 0)
    if (!top || v > top.v) top = { id, v, n: own.length }
  }
  if (!top) return
  const name = d.names.get(top.id) ?? top.id
  const games = top.n === 1 ? "1 game" : `${top.n} games`
  return {
    headline: `${name} leads the league in net points: ${signed(top.v)} in ${games}`,
    query: "",
  }
}
