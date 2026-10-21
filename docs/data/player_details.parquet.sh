#!/usr/bin/env bash
# ESPN's net points per player, game and action_type (2pt, rim, assist,
# total, ...), from the nba_data v2 catalog. Join player_box on (game_id,
# player_id) for names and dates. Net points are rounded to 3 decimals, which
# cuts the file from 47MB to 33MB.
# Columns are described in
# https://github.com/llimllib/nba_data/blob/main/docs/DATA_DICTIONARY.md
set -euo pipefail
TMP=$(mktemp)
trap 'rm -f "$TMP"' EXIT

duckdb -c "
ATTACH 'https://basketball-data.billmill.org/nba/nba.duckdb' AS nba;
COPY (
  SELECT * REPLACE (
    round(o_net_pts, 3) AS o_net_pts,
    round(d_net_pts, 3) AS d_net_pts,
    round(t_net_pts, 3) AS t_net_pts
  )
  FROM nba.player_details
) TO '$TMP' (FORMAT parquet, COMPRESSION zstd)" >&2

cat "$TMP"
