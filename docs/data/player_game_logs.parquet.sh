#!/usr/bin/env bash
# One row per player per game played, every game type, from the nba_data v2
# catalog with names, abbreviations and the game type joined in.
# Columns are described in
# https://github.com/llimllib/nba_data/blob/main/docs/DATA_DICTIONARY.md
set -eu
TMP=$(mktemp)
trap 'rm -f "$TMP"' EXIT

duckdb -c "
ATTACH 'https://basketball-data.billmill.org/nba/nba.duckdb' AS nba;
COPY (
  SELECT l.*,
    p.name AS player_name,
    t.nba_abbrev AS team_abbrev,
    o.nba_abbrev AS opp_team_abbrev,
    g.game_type
  FROM nba.player_game_logs l
  JOIN nba.games g USING (season, game_id)
  LEFT JOIN nba.players p USING (player_id)
  LEFT JOIN nba.team_seasons t ON t.season = l.season AND t.team_id = l.team_id
  LEFT JOIN nba.team_seasons o ON o.season = l.season AND o.team_id = l.opp_team_id
) TO '$TMP' (FORMAT parquet, COMPRESSION zstd)" >&2

cat "$TMP"
