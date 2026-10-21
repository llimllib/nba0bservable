// Reads nba_data v2's parquet files directly from the browser. Each dataset
// is one file per season at nba/<source>/<dataset>/season=<season>/data.parquet;
// see ~/code/nba_data/docs/DATA_DICTIONARY.md
import {
  asyncBufferFromUrl,
  cachedAsyncBuffer,
  parquetReadObjects,
} from "hyparquet"
import { compressors } from "hyparquet-compressors"

const BASE =
  import.meta.env.PUBLIC_DATA_BASE ?? "https://basketball-data.billmill.org"

export type Row = Record<string, any>

export function datasetUrl(source: string, dataset: string, season: number) {
  return `${BASE}/nba/${source}/${dataset}/season=${season}/data.parquet`
}

const cache = new Map<string, Promise<Row[]>>()

// Read the given columns of one season of a dataset. Results are cached for
// the life of the page, so tools can call this freely when params change
export function read(
  source: string,
  dataset: string,
  season: number,
  columns: string[],
): Promise<Row[]> {
  const url = datasetUrl(source, dataset, season)
  const key = `${url}|${columns.join(",")}`
  let rows = cache.get(key)
  if (!rows) {
    rows = (async () => {
      const file = cachedAsyncBuffer(await asyncBufferFromUrl({ url }))
      return parquetReadObjects({ file, columns, compressors })
    })()
    rows.catch(() => cache.delete(key))
    cache.set(key, rows)
  }
  return rows
}

// The lookup tables, which every tool needs to turn ids into names
export async function lookups(season: number) {
  const [teams, players, games] = await Promise.all([
    read("stats", "team_seasons", season, [
      "team_id",
      "nba_abbrev",
      "full_name",
      "is_nba",
    ]),
    read("stats", "player_seasons", season, ["player_id", "name"]),
    read("stats", "games", season, [
      "game_id",
      "game_date",
      "game_type",
      "playoff_round",
      "series_game",
      "home_team_id",
      "away_team_id",
    ]),
  ])
  return {
    teams: new Map(teams.map(t => [t.team_id, t])),
    players: new Map(players.map(p => [p.player_id, p.name as string])),
    games: new Map(games.map(g => [g.game_id, g])),
  }
}

export function headshotUrl(playerId: string) {
  return `https://cdn.nba.com/headshots/nba/latest/260x190/${playerId}.png`
}
