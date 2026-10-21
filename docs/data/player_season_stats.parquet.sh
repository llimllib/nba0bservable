#!/usr/bin/env bash
# Season totals, one row per player per season_type (regular_season or
# playoffs), from the nba_data v2 catalog with the player's name and team
# abbreviation joined in. Per-game and per-36 stats are computed by the pages.
# Columns are described in
# https://github.com/llimllib/nba_data/blob/main/docs/DATA_DICTIONARY.md
set -euo pipefail
TMP=$(mktemp)
trap 'rm -f "$TMP"' EXIT

duckdb -c "
ATTACH 'https://basketball-data.billmill.org/nba/nba.duckdb' AS nba;
COPY (
  SELECT s.*, p.name AS player_name, t.nba_abbrev AS team_abbrev
  FROM nba.player_season_stats s
  LEFT JOIN nba.players p USING (player_id)
  LEFT JOIN nba.team_seasons t USING (season, team_id)
) TO '$TMP' (FORMAT parquet, COMPRESSION zstd)" >&2

cat "$TMP"
