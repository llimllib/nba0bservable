#!/bin/bash

DATA="docs/.observablehq/cache/data/espn.players.parquet"
GAME_FILTER="game_id LIKE '002%' OR game_id LIKE '003%' OR game_id LIKE '004%'"

# Top 100 players by total net points
career_total() {
  duckdb -table -c "
    SELECT 
      ROW_NUMBER() OVER (ORDER BY SUM(tNetPts) DESC) as rank,
      name,
      COUNT(*) as games,
      ROUND(SUM(tNetPts), 1) as total_net_pts
    FROM '$DATA'
    WHERE $GAME_FILTER
    GROUP BY name
    ORDER BY total_net_pts DESC
    LIMIT 100
  "
}

# Top 100 by net points per game (min 100 games)
career_ppg() {
  duckdb -table -c "
    SELECT
      ROW_NUMBER() OVER (ORDER BY SUM(tNetPts) / COUNT(*) DESC) as rank,
      name,
      COUNT(*) as games,
      ROUND(SUM(tNetPts), 1) as total_net_pts,
      ROUND(SUM(tNetPts) / COUNT(*), 2) as net_ppg
    FROM '$DATA'
    WHERE $GAME_FILTER
    GROUP BY name
    HAVING COUNT(*) > 100
    ORDER BY net_ppg DESC
    LIMIT 100
  "
}

# Top 50 by net ppg with bar chart (colorized)
career_ppg_bar() {
  duckdb -list -noheader -c "
    SELECT
      ROW_NUMBER() OVER (ORDER BY SUM(tNetPts) / COUNT(*) DESC) as rank,
      name,
      COUNT(*) as games,
      ROUND(SUM(tNetPts) / COUNT(*), 2) as net_ppg,
      BAR(SUM(tNetPts) / COUNT(*), 0, 7, 20) as bar
    FROM '$DATA'
    WHERE $GAME_FILTER
    GROUP BY name
    HAVING COUNT(*) > 100
    ORDER BY net_ppg DESC
    LIMIT 50
  " | while IFS='|' read -r rank name games ppg bar; do
    printf "%2s  %-25s %4s  %5s  \e[36m%s\e[0m\n" "$rank" "$name" "$games" "$ppg" "$bar"
  done
}

# Top 50 by net ppg with season sparklines
career_spark() {
  duckdb -list -noheader -c "
    WITH player_seasons AS (
      SELECT 
        name,
        season,
        ROUND(AVG(tNetPts), 2) as season_avg
      FROM '$DATA'
      WHERE $GAME_FILTER
      GROUP BY name, season
    ),
    player_totals AS (
      SELECT
        name,
        COUNT(*) as games,
        ROUND(SUM(tNetPts), 1) as total_net_pts,
        ROUND(SUM(tNetPts) / COUNT(*), 2) as net_ppg
      FROM '$DATA'
      WHERE $GAME_FILTER
      GROUP BY name
      HAVING games > 100
    ),
    player_sparks AS (
      SELECT 
        name,
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
      GROUP BY name
    )
    SELECT
      ROW_NUMBER() OVER (ORDER BY net_ppg DESC) as rank,
      t.name,
      t.games,
      t.net_ppg,
      s.spark
    FROM player_totals t
    JOIN player_sparks s ON t.name = s.name
    ORDER BY net_ppg DESC
    LIMIT 50
  " | while IFS='|' read -r rank name games ppg spark; do
    printf "%2s  %-25s %4s  %5s  \e[33m%s\e[0m\n" "$rank" "$name" "$games" "$ppg" "$spark"
  done
}

# List available queries
list_queries() {
  echo "Available queries:"
  echo "  career_total   - Top 100 players by total net points"
  echo "  career_ppg     - Top 100 by net points per game (min 100 games)"
  echo "  career_ppg_bar - Top 50 by net ppg with bar chart"
  echo "  career_spark   - Top 50 by net ppg with season sparklines"
}

# Main dispatcher
if [ $# -eq 0 ]; then
  list_queries
  exit 0
fi

case "$1" in
  career_total|career_ppg|career_ppg_bar|career_spark)
    "$1"
    ;;
  *)
    echo "Unknown query: $1"
    echo
    list_queries
    exit 1
    ;;
esac
