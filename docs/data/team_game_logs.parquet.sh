#!/usr/bin/env bash
# One row per team per game, every game type, from the nba_data v2 catalog
# with team names, abbreviations and the game type joined in.
# Columns are described in
# https://github.com/llimllib/nba_data/blob/main/docs/DATA_DICTIONARY.md
set -eu
TMP=$(mktemp)
trap 'rm -f "$TMP"' EXIT

duckdb -c "
ATTACH 'https://basketball-data.billmill.org/nba/nba.duckdb' AS nba;
COPY (
  SELECT l.*,
    t.nba_abbrev AS team_abbrev,
    t.full_name AS team_name,
    o.nba_abbrev AS opp_team_abbrev,
    g.game_type
  FROM nba.team_game_logs l
  JOIN nba.games g USING (season, game_id)
  LEFT JOIN nba.team_seasons t ON t.season = l.season AND t.team_id = l.team_id
  LEFT JOIN nba.team_seasons o ON o.season = l.season AND o.team_id = l.opp_team_id
) TO '$TMP' (FORMAT parquet, COMPRESSION zstd)" >&2

cat "$TMP"
