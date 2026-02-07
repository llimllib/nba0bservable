# Add Player Details Metrics and Title Override

## Summary

Added detailed Net Points breakdowns from `player_details.parquet` to the cumulative stats page, plus the ability to override the chart title.

## Changes

### New Data Source
- Added `player_details: ./data/espn.player_details.parquet` as a SQL data source

### New Metrics (60+ detailed breakdowns)
Added the following categories of detailed Net Points metrics:
- **Shot Type**: 3PT, 2PT, Rim, Mid-Range, Corner, Free Throw
- **Play Type**: Layup, Dunk, Driving, Cutting, Floater, Hook, Fadeaway, Bank Shot
- **Other**: Assist, Rebound, Putback, Turnover, Bad Pass, Foul, Fastbreak

Each category includes offensive, defensive, and total Net Points variants (e.g., `3pt_tNetPts`, `3pt_oNetPts`, `3pt_dNetPts`).

### Title Override
- Added a "Chart title" text input that allows overriding the default metric-based title
- Title is persisted in the URL hash parameter `title=`
- If no custom title is provided, falls back to the metric label

### Technical Changes
- Added `isDetailMetric()` helper to detect metrics from `player_details`
- Updated cumulative calculation to use correct data source and field names (`gameId` vs `game_id`)
- Updated float detection to handle all NetPts metrics: `selectedMetric.includes("NetPts")`

## Conversation

**User**: how do I get duckdb describe to not hide rows

**Assistant**: Explained `.maxrows -1` and other DuckDB display options.

**User**: player_details has broken down stats I'd like to add to @docs/cumulative_net_points.md. For example, I'd love to have 3pt_tNetPts

**Assistant**: Downloaded and examined `player_details.parquet` schema, then added all 60+ detailed metrics to the cumulative stats page with proper data source switching logic.

**User**: add the ability to override the title, similarly to the subtitle

**Assistant**: Added title input with URL persistence, similar to the existing subtitle functionality.
