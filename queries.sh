#!/bin/bash

DATA="docs/.observablehq/cache/data/player_box.parquet"
GAME_FILTER="game_type IN ('regular_season', 'playoffs')"

# Top 100 players by total net points
career_total() {
  duckdb -table -c "
    SELECT 
      ROW_NUMBER() OVER (ORDER BY SUM(t_net_pts) DESC) as rank,
      player_name,
      COUNT(*) as games,
      ROUND(SUM(t_net_pts), 1) as total_net_pts
    FROM '$DATA'
    WHERE $GAME_FILTER
    GROUP BY player_name
    ORDER BY total_net_pts DESC
    LIMIT 100
  "
}

# Top 100 by net points per game (min 100 games)
career_ppg() {
  duckdb -table -c "
    SELECT
      ROW_NUMBER() OVER (ORDER BY SUM(t_net_pts) / COUNT(*) DESC) as rank,
      player_name,
      COUNT(*) as games,
      ROUND(SUM(t_net_pts), 1) as total_net_pts,
      ROUND(SUM(t_net_pts) / COUNT(*), 2) as net_ppg
    FROM '$DATA'
    WHERE $GAME_FILTER
    GROUP BY player_name
    HAVING COUNT(*) > 100
    ORDER BY net_ppg DESC
    LIMIT 100
  "
}

# Top 50 by net ppg with bar chart (colorized)
career_ppg_bar() {
  duckdb -list -noheader -c "
    SELECT
      ROW_NUMBER() OVER (ORDER BY SUM(t_net_pts) / COUNT(*) DESC) as rank,
      player_name,
      COUNT(*) as games,
      ROUND(SUM(t_net_pts) / COUNT(*), 2) as net_ppg,
      BAR(SUM(t_net_pts) / COUNT(*), 0, 7, 20) as bar
    FROM '$DATA'
    WHERE $GAME_FILTER
    GROUP BY player_name
    HAVING COUNT(*) > 100
    ORDER BY net_ppg DESC
    LIMIT 50
  " | while IFS='|' read -r rank player_name games ppg bar; do
    printf "%2s  %-25s %4s  %5s  \e[36m%s\e[0m\n" "$rank" "$player_name" "$games" "$ppg" "$bar"
  done
}

# Top 50 by net ppg with season sparklines
career_spark() {
  duckdb -list -noheader -c "
    WITH player_seasons AS (
      SELECT 
        player_name,
        season,
        ROUND(AVG(t_net_pts), 2) as season_avg
      FROM '$DATA'
      WHERE $GAME_FILTER
      GROUP BY player_name, season
    ),
    player_totals AS (
      SELECT
        player_name,
        COUNT(*) as games,
        ROUND(SUM(t_net_pts), 1) as total_net_pts,
        ROUND(SUM(t_net_pts) / COUNT(*), 2) as net_ppg
      FROM '$DATA'
      WHERE $GAME_FILTER
      GROUP BY player_name
      HAVING games > 100
    ),
    player_sparks AS (
      SELECT 
        player_name,
        STRING_AGG(
          REPEAT(
            CASE 
              WHEN season_avg < 0 THEN '▁'
              WHEN season_avg < 1 THEN '▂'
              WHEN season_avg < 2 THEN '▃'
              WHEN season_avg < 3 THEN '▄'
              WHEN season_avg < 4 THEN '▅'
              WHEN season_avg < 5 THEN '▆'
              WHEN season_avg < 6 THEN '▇'
              ELSE '█'
            END, 
            3
          ), '' ORDER BY season
        ) as spark
      FROM player_seasons
      GROUP BY player_name
    )
    SELECT
      ROW_NUMBER() OVER (ORDER BY net_ppg DESC) as rank,
      t.player_name,
      t.games,
      t.net_ppg,
      s.spark
    FROM player_totals t
    JOIN player_sparks s ON t.player_name = s.player_name
    ORDER BY net_ppg DESC
    LIMIT 50
  " | while IFS='|' read -r rank player_name games ppg spark; do
    printf "%2s  %-25s %4s  %5s  \e[33m%s\e[0m\n" "$rank" "$player_name" "$games" "$ppg" "$spark"
  done
}

# Top 50 by net ppg with braille sparklines (quarter-season resolution)
career_spark_braille() {
  duckdb -list -noheader -c "
    WITH numbered_games AS (
      SELECT 
        player_name,
        season,
        t_net_pts,
        ROW_NUMBER() OVER (PARTITION BY player_name, season ORDER BY game_date) as game_num,
        COUNT(*) OVER (PARTITION BY player_name, season) as season_games
      FROM '$DATA'
      WHERE $GAME_FILTER
    ),
    player_quarters AS (
      SELECT 
        player_name,
        season,
        FLOOR((game_num - 1) * 4.0 / season_games) as quarter,
        ROUND(AVG(t_net_pts), 2) as quarter_avg
      FROM numbered_games
      GROUP BY player_name, season, quarter
    ),
    player_totals AS (
      SELECT
        player_name,
        COUNT(*) as games,
        ROUND(SUM(t_net_pts) / COUNT(*), 2) as net_ppg
      FROM '$DATA'
      WHERE $GAME_FILTER
      GROUP BY player_name
      HAVING games > 100
    ),
    player_sparks AS (
      SELECT 
        player_name,
        LIST(quarter_avg ORDER BY season, quarter) as avgs
      FROM player_quarters
      GROUP BY player_name
    )
    SELECT
      ROW_NUMBER() OVER (ORDER BY net_ppg DESC) as rank,
      t.player_name,
      t.games,
      t.net_ppg,
      s.avgs
    FROM player_totals t
    JOIN player_sparks s ON t.player_name = s.player_name
    ORDER BY net_ppg DESC
    LIMIT 50
  " | while IFS='|' read -r rank player_name games ppg avgs; do
    # Parse the array and convert to braille using python for unicode handling
    spark=$(echo "$avgs" | python3 -c '
import sys
vals = [float(x) for x in sys.stdin.read().strip().strip("[]").split(", ") if x]

def height(v):
    # Map to 0-4 range (4 dot heights per column)
    if v < 0: return 0
    if v < 2: return 1
    if v < 4: return 2
    if v < 6: return 3
    return 4

# Braille patterns for vertical bars (bottom to top)
# Left column: dots 7,3,2,1 (bits 6,2,1,0)
# Right column: dots 8,6,5,4 (bits 7,5,4,3)
left_patterns = [0, 0x40, 0x44, 0x46, 0x47]
right_patterns = [0, 0x80, 0xA0, 0xB0, 0xB8]

result = ""
for i in range(0, len(vals), 2):
    l = height(vals[i])
    r = height(vals[i+1]) if i+1 < len(vals) else 0
    code = 0x2800 + left_patterns[l] + right_patterns[r]
    result += chr(code)
print(result)
')
    printf "%2s  %-25s %4s  %5s  \e[33m%s\e[0m\n" "$rank" "$player_name" "$games" "$ppg" "$spark"
  done
}

# List available queries
list_queries() {
  echo "Available queries:"
  echo "  career_total         - Top 100 players by total net points"
  echo "  career_ppg           - Top 100 by net points per game (min 100 games)"
  echo "  career_ppg_bar       - Top 50 by net ppg with bar chart"
  echo "  career_spark         - Top 50 by net ppg with season sparklines"
  echo "  career_spark_braille - Top 50 by net ppg with braille sparklines"
}

# Main dispatcher
if [ $# -eq 0 ]; then
  list_queries
  exit 0
fi

case "$1" in
  career_total|career_ppg|career_ppg_bar|career_spark|career_spark_braille)
    "$1"
    ;;
  *)
    echo "Unknown query: $1"
    echo
    list_queries
    exit 1
    ;;
esac
