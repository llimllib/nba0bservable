# Moving the notebook to nba_data v2

Handoff notes for switching this project's data loaders from nba_data's v1
files (gh-pages and raw GitHub URLs) to the v2 dataset. This is
[llimllib/nba_data#49](https://github.com/llimllib/nba_data/issues/49); the
v2 plan and decisions are in nba_data's
[docs/v2.md](https://github.com/llimllib/nba_data/blob/main/docs/v2.md), and
every table and column is documented in
[docs/DATA_DICTIONARY.md](https://github.com/llimllib/nba_data/blob/main/docs/DATA_DICTIONARY.md)
(sections "v2 Schema Conventions", "v2 Catalog", "v2 NBA Stats Data" and
"v2 ESPN Data"). A local checkout is at `~/code/nba_data`.

**Done when:** the notebook builds and publishes with no dependency on
`llimllib.github.io/nba_data` or `raw.githubusercontent.com/.../nba_data`.

## What v2 is

nba_data no longer commits data to git. A GitHub Actions workflow
(`update.yml`, every 4 hours at :30) writes one parquet file per dataset per
season to the DigitalOcean Space `basketball-data`, served by its CDN at:

    https://basketball-data.billmill.org

with a catalog, a small DuckDB database containing only views over those
files:

    https://basketball-data.billmill.org/nba/nba.duckdb

`ATTACH` it and every dataset is a table name, covering every season:

```sql
ATTACH 'https://basketball-data.billmill.org/nba/nba.duckdb' AS nba;
SELECT * FROM nba.metadata;   -- datasets, season ranges, update times
```

Live and verified: NBA stats 2010-2027 (2027 is preseason so far), ESPN
2019-2026 (ESPN's 2027 data starts Oct 15). The files allow CORS and range
requests, so DuckDB-wasm in the browser can read them too, but loading the
catalog in the browser is a later milestone; for now, keep data loaders.

Files are also readable directly, e.g.
`https://basketball-data.billmill.org/nba/stats/games/2026.parquet`, but the
catalog is easier: it unions the seasons and its URL list is rebuilt every
run.

## Tables in the catalog

| Table | One row per | Replaces (v1) |
|-------|-------------|---------------|
| `player_season_stats` | season, `season_type` (`regular_season`/`playoffs`), player. **Totals only** | `playerstats.parquet`, `playerstats_playoffs.parquet` |
| `player_season_stats_per_game`, `_per_36`, `_per_100` | same, with counting stats scaled | the `*_pergame`, `*_per36`, `*_per100possessions` columns |
| `player_game_logs` | game, player | `player_game_logs.parquet` |
| `team_game_logs` | game, team | `gamelogs.parquet` |
| `player_box`, `team_box` | ESPN, game x player / game x team | `espn/player_box.parquet` |
| `player_details` | ESPN, game x player x `action_type` (long, not wide) | `espn/player_details.parquet` |
| `four_factors` | ESPN, game x team x `action_type` | |
| `games` | game: date, `game_type`, home/away team, playoff round | |
| `team_seasons` | season, team: `nba_abbrev`, `full_name` | |
| `player_seasons`, `players` | player (per season / latest `name`) | |

`team_summary.json` (used by `eff_vs_pace.md` and
`team_field_goal_efficiency.md`) has no v2 equivalent; it was a derived
file. Compute what those pages need from `team_game_logs` in the loader.

## Schema differences that will break page code

- **No names or abbreviations in data tables.** Join `team_seasons` on
  `(season, team_id)` for `nba_abbrev`/`full_name`, and `players` (or
  `player_seasons` on `(season, player_id)`) for `name`. v1 columns like
  `player_name`, `team_abbreviation`, `team_name`, `teamTricode`,
  `firstName`/`familyName`, ESPN's `name`/`team` are gone. A loader can join
  them back in so page code changes less.
- **Ids are strings** (`player_id`, `team_id`, `game_id` VARCHAR) everywhere.
  `docs/lib/teams.ts` may key on abbreviations or numeric ids; check.
- **`season` is the end year** everywhere (2026 = 2025-26). v1 used `year`,
  `season_year` ("2025-26") or nothing.
- **snake_case NBA names.** v1's `player_game_logs.parquet` had camelCase
  (`personId`, `points`, `reboundsTotal`, ...); v2's has the same names as
  the team logs (`player_id`, `pts`, `reb`, ...). ESPN columns are renamed
  too (`oNetPts` -> `o_net_pts`, `plyrID` -> `player_id`, `fgaplyr` -> `fga`;
  full mapping in the data dictionary).
- **ESPN `player_details` is long:** one row per `action_type` with
  `o_net_pts`/`d_net_pts`/`t_net_pts`. To get v1's wide shape
  (`2pt_oNetPts`, ...): `PIVOT nba.player_details ON action_type USING
  first(o_net_pts) ...`, or change the page queries.
- **No `*_rank` columns;** use `rank() OVER (...)`.
- **Per-mode stats:** the `_per_game`/`_per_36`/`_per_100` views have the
  same column names as the totals (`pts`, not `pts_pergame`). Rates and
  `gp` aren't scaled; `min` is only scaled per game.
- Booleans are BOOLEAN (`home`, `win`, `starter`); `game_date` is a DATE.
- Game logs cover every game type (preseason through finals, All-Star).
  Filter with `games.game_type` or `left(game_id, 3) = '002'` for regular
  season; v1's game logs were mostly regular season only.
- Team `plus_minus` is computed as the margin (the NBA's was wrong in a few
  preseason games).

## Suggested approach

Replace each `curl` loader with a DuckDB CLI query against the catalog,
writing parquet to stdout, e.g. `docs/data/playerstats.parquet.sh`:

```sh
#!/usr/bin/env bash
duckdb -c "
ATTACH 'https://basketball-data.billmill.org/nba/nba.duckdb' AS nba;
COPY (
  SELECT s.*, p.name AS player_name, t.nba_abbrev AS team_abbreviation
  FROM nba.player_season_stats s
  JOIN nba.players p USING (player_id)
  JOIN nba.team_seasons t USING (season, team_id)
  WHERE s.season_type = 'regular_season'
) TO '/dev/stdout' (FORMAT parquet)"
```

Loaders to change, and the pages that use them:

| Loader | Pages |
|--------|-------|
| `playerstats.parquet.sh` | assists, efficiency, espn_details, fta_per_fga, index, mip, rebounds, steals, table, team_field_goal_efficiency, threes, twos |
| `playerstats_playoffs.parquet.sh` | playoff_efficiency |
| `gamelogs.parquet.sh` | career_cumulative, cumulative_net_points, espn, gamelogs, net_points_graph, players, tovpct |
| `playerlogs.parquet.sh` | gamelogs, players, tovpct |
| `espn.players.parquet.sh` | career_cumulative, compare, cumulative_net_points, espn, net_points_graph, playoff_team_net_points, swarm, team_swarm |
| `espn.player_details.parquet.sh` | compare, cumulative_net_points, espn_details |
| `team_summary.json.sh` | eff_vs_pace, team_field_goal_efficiency |

Two ways to handle the schema changes; pick per loader:

1. **Shim in the loader:** select v2 data with v1's column names, so pages
   don't change. Fastest, and a good first pass.
2. **Update the pages** to v2 names. Cleaner long-term, and needed later
   when pages read the catalog in the browser.

Start with one simple page (e.g. `threes.md` via `playerstats.parquet.sh`),
get it rendering, then do the rest. `make clear` (or `npm run clean`) wipes
cached loader output; check every page in `npm run dev`, then
`npm run build`.

## Notes

- Loader output size: `player_details` is 6.4M rows across all seasons;
  filter to the seasons pages actually use if the output is too big.
- The catalog's CDN cache TTL is an hour; the update workflow purges it
  after each run.
- If something looks wrong in the data itself, it belongs in nba_data's
  issues, not a workaround here.
