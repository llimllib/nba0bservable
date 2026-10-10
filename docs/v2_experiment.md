---
title: v2 experiment
---

# v2 in the browser

Run one approach per page load, e.g. `?approach=scoped&duckdb=new`, so request
counts are per approach.

```js
import * as duckdbNew from "npm:@duckdb/duckdb-wasm@1.32.0"
```

```js
const params = new URLSearchParams(location.search)
const approach = params.get("approach") ?? "scoped"
const which = params.get("duckdb") ?? "new"
const B = "https://basketball-data.billmill.org/nba"
const CATALOG = `${B}/nba.duckdb`

// a fresh connection on Framework's DuckDB-wasm (1.29 / DuckDB 1.1.1) or 1.32
async function connect() {
  if (which === "old") {
    const client = await DuckDBClient.of()
    return client._db.connect()
  }
  const bundle = await duckdbNew.selectBundle({
    mvp: {
      mainModule: import.meta.resolve("npm:@duckdb/duckdb-wasm@1.32.0/dist/duckdb-mvp.wasm"),
      mainWorker: import.meta.resolve("npm:@duckdb/duckdb-wasm@1.32.0/dist/duckdb-browser-mvp.worker.js"),
    },
    eh: {
      mainModule: import.meta.resolve("npm:@duckdb/duckdb-wasm@1.32.0/dist/duckdb-eh.wasm"),
      mainWorker: import.meta.resolve("npm:@duckdb/duckdb-wasm@1.32.0/dist/duckdb-browser-eh.worker.js"),
    },
  })
  const db = new duckdbNew.AsyncDuckDB(
    new duckdbNew.ConsoleLogger(duckdbNew.LogLevel.WARNING),
    new Worker(bundle.mainWorker),
  )
  await db.instantiate(bundle.mainModule, bundle.pthreadWorker)
  await db.open({ query: { castBigIntToDouble: true } })
  return db.connect()
}

const queries = {
  naive: `
    SELECT p.name, t.nba_abbrev, s.fg3a, p36.fg3a AS fg3a_per36, s.fg3_pct
    FROM nba.player_season_stats s
    JOIN nba.player_season_stats_per_36 p36 USING (season, season_type, player_id)
    JOIN nba.players p USING (player_id)
    JOIN nba.team_seasons t ON t.season = s.season AND t.team_id = s.team_id
    WHERE s.season = 2026 AND s.season_type = 'regular_season'`,
  scoped: `
    SELECT ps.name, t.nba_abbrev, s.fg3a, s.fg3a / nullif(s.min, 0) * 36 AS fg3a_per36, s.fg3_pct
    FROM nba.player_season_stats s
    JOIN nba.player_seasons ps ON ps.season = s.season AND ps.player_id = s.player_id
    JOIN nba.team_seasons t ON t.season = s.season AND t.team_id = s.team_id
    WHERE s.season = 2026 AND s.season_type = 'regular_season'`,
  macro: `
    SELECT ps.name, t.nba_abbrev, s.fg3a, s.fg3a / nullif(s.min, 0) * 36 AS fg3a_per36, s.fg3_pct
    FROM season_file('player_season_stats', 2026) s
    JOIN season_file('player_seasons', 2026) ps USING (player_id)
    JOIN season_file('team_seasons', 2026) t USING (team_id)
    WHERE s.season_type = 'regular_season'`,
  attachedmacro: `
    SELECT ps.name, t.nba_abbrev, s.fg3a, s.fg3a / nullif(s.min, 0) * 36 AS fg3a_per36, s.fg3_pct
    FROM nba.season_file('player_season_stats', 2026) s
    JOIN nba.season_file('player_seasons', 2026) ps USING (player_id)
    JOIN nba.season_file('team_seasons', 2026) t USING (team_id)
    WHERE s.season_type = 'regular_season'`,
  direct: `
    SELECT ps.name, t.nba_abbrev, s.fg3a, s.fg3a / nullif(s.min, 0) * 36 AS fg3a_per36, s.fg3_pct
    FROM '${B}/stats/player_season_stats/season=2026/data.parquet' s
    JOIN '${B}/stats/player_seasons/season=2026/data.parquet' ps USING (player_id)
    JOIN '${B}/stats/team_seasons/season=2026/data.parquet' t USING (team_id)
    WHERE s.season_type = 'regular_season'`,
}

let result
try {
  const t0 = performance.now()
  const c = await connect()
  const version = (await c.query("SELECT version() AS v")).get(0).v
  // workaround from duckdb/duckdb-wasm#2228: use the httpfs extension rather
  // than the built-in HTTP backend
  if (params.get("httpfs") === "1")
    await c.query(`SET builtin_httpfs = false; LOAD httpfs;`)
  const t1 = performance.now()
  if (approach === "macro")
    await c.query(`CREATE MACRO season_file(dataset, s) AS TABLE
      FROM read_parquet('${B}/stats/' || dataset || '/season=' || s || '/data.parquet')`)
  else if (approach === "attachedmacro")
    await c.query(`ATTACH 'http://127.0.0.1:8124/m.duckdb' AS nba (READ_ONLY)`)
  else if (approach !== "direct")
    await c.query(`ATTACH '${CATALOG}' AS nba (READ_ONLY)`)
  const t2 = performance.now()
  const r = await c.query(queries[approach])
  const t3 = performance.now()
  result = {
    approach,
    version,
    startupMs: Math.round(t1 - t0),
    attachMs: Math.round(t2 - t1),
    queryMs: Math.round(t3 - t2),
    totalDataMs: Math.round(t3 - t1),
    rows: r.numRows,
  }
} catch (e) {
  result = { approach, error: String(e).slice(0, 300) }
}
display(result)
```

```html
<pre id="result">${JSON.stringify(result)}</pre>
```
