#!/usr/bin/env bash
# Player season stats from the nba_data v2 catalog, shimmed into the shape of
# v1's playerstats.parquet: `year`, `player_name`, `team_abbreviation`, and the
# scaled stats as `*_pergame`, `*_per36` and `*_per100possessions` columns.
# Scaled stats are rounded to one decimal like v1's; full precision doubles
# triple the file size
set -euo pipefail

SCALED='^(min|fgm|fga|fg3m|fg3a|ftm|fta|oreb|dreb|reb|ast|tov|stl|blk|blka|pf|pfd|pts|plus_minus|nba_fantasy_pts|opp_pts_off_tov|opp_pts_2nd_chance|opp_pts_fb|opp_pts_paint|def_ws)$'
SEASON_TYPE=${SEASON_TYPE:-regular_season}
TMP=$(mktemp -t playerstats.XXXXXX)
trap 'rm -f "$TMP"' EXIT

# printf, not echo: Observable runs loaders with sh, whose echo turns \0 into
# a NUL byte
scaled() {
  printf '%s' "SELECT season, season_type, player_id,
    round(COLUMNS('$SCALED'), 1) AS '\0_$2'
    FROM nba.$1 WHERE season_type = '$SEASON_TYPE'"
}

duckdb -c "
ATTACH 'https://basketball-data.billmill.org/nba/nba.duckdb' AS nba;
COPY (
  WITH pg AS ($(scaled player_season_stats_per_game pergame)),
    p36 AS ($(scaled player_season_stats_per_36 per36)),
    p100 AS ($(scaled player_season_stats_per_100 per100possessions))
  SELECT s.season AS year,
    s.*,
    p.name AS player_name,
    t.nba_abbrev AS team_abbreviation,
    lt.nba_abbrev AS player_last_team_abbreviation,
    pg.* EXCLUDE (season, season_type, player_id),
    p36.* EXCLUDE (season, season_type, player_id),
    p100.* EXCLUDE (season, season_type, player_id)
  FROM nba.player_season_stats s
  JOIN pg USING (season, season_type, player_id)
  JOIN p36 USING (season, season_type, player_id)
  JOIN p100 USING (season, season_type, player_id)
  JOIN nba.players p USING (player_id)
  JOIN nba.team_seasons t ON t.season = s.season AND t.team_id = s.team_id
  LEFT JOIN nba.team_seasons lt
    ON lt.season = s.season AND lt.team_id = s.player_last_team_id
  WHERE s.season_type = '$SEASON_TYPE'
) TO '$TMP' (FORMAT parquet, COMPRESSION zstd)" >&2

cat "$TMP"
