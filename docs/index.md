---
theme: cotton
title: NBA Graphics
toc: false
sql:
  players: ./data/playerstats.parquet
---

# NBA graphics

```sql id=players
SELECT * FROM players WHERE year=2025
```

<!-- https://duckdb.org/docs/sql/functions/aggregates.html -->

```sql id=metadata display
-- parquet metadata functions are missing, see:
-- https://github.com/observablehq/framework/discussions/1813
-- select * from parquet_file_metadata('https://raw.githubusercontent.com/llimllib/nba_data/refs/heads/main/data/playerstats.parquet');
```

```sql show
DESCRIBE players
```
