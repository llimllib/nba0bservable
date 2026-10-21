#!/usr/bin/env bash
# ESPN's per-game player box scores with net points and WPA, one row per
# player per game, from the nba_data v2 catalog with the player's name, team
# abbreviation, game date and game type joined in.
# Columns are described in
# https://github.com/llimllib/nba_data/blob/main/docs/DATA_DICTIONARY.md
set -euo pipefail
TMP=$(mktemp)
trap 'rm -f "$TMP"' EXIT

duckdb -c "
ATTACH 'https://basketball-data.billmill.org/nba/nba.duckdb' AS nba;
COPY (
  SELECT b.*,
    p.name AS player_name,
    t.nba_abbrev AS team_abbrev,
    g.game_date,
    g.game_type
  FROM nba.player_box b
  JOIN nba.games g USING (season, game_id)
  LEFT JOIN nba.players p USING (player_id)
  LEFT JOIN nba.team_seasons t ON t.season = b.season AND t.team_id = b.team_id
) TO '$TMP' (FORMAT parquet, COMPRESSION zstd)" >&2

cat "$TMP"
