# nba_data v2 catalog: results from nba0bservable

Notes from trying the v2 catalog (`https://basketball-data.billmill.org/nba/nba.duckdb`)
from the Step Back Club notebook, both in data loaders (native DuckDB 1.5.6)
and directly in the browser (DuckDB-wasm). Tested 2026-10-09/10.

## Summary

- **Native DuckDB (loaders): works well.** `playerstats.parquet.sh` was
  rewritten as one query against the catalog. All 12 pages that use it render
  unchanged, the data matches v1 exactly for 2026, and the output is smaller
  than v1's (1.85MB vs 2.44MB with scaled stats rounded to one decimal and
  zstd). It takes ~3s instead of ~0.5s for curl, which is fine at build time.
- **Browser (DuckDB-wasm): works, but slow.** A one-season query against the
  catalog takes 7-14s cold, vs ~0.5s reading the same season's parquet files
  directly. The cause is the catalog's layout, not the data: every view opens
  every season's file, and DuckDB-wasm does that serially and without range
  requests.

The main suggestion is #1 below. It's the one change that makes the catalog
usable from the browser, and it helps native readers too.

## Suggestions

### 1. Put the season in the file path so filters skip files

Every view is `read_parquet([<one URL per season>], union_by_name = true)`.
A query with `WHERE season = 2026` still has to open every file to find out
which seasons it holds.

- **Native DuckDB** handles it fine: a HEAD and a footer range read per file,
  in parallel, and parquet stats skip the other seasons. One season of
  `player_season_stats` cost 17 HEADs and 19 range GETs, 279KB in total.
- **DuckDB-wasm** sends a HEAD and then a **full GET** for every file, one at
  a time. A season-scoped `threes` query (`player_season_stats` joined to
  `player_seasons` and `team_seasons`) made 108 requests, about 65ms each,
  so roughly 7s.

Hive-style paths fix this:

    nba/stats/player_season_stats/season=2026/data.parquet

```sql
CREATE VIEW player_season_stats AS
FROM read_parquet([...explicit URL list...], hive_partitioning = true);
```

Verified natively with an explicit file list (no globbing, which HTTP can't
do anyway): `EXPLAIN ANALYZE ... WHERE season = 2026` reports
`Scanning Files: 1/7`, and the other files are never opened. I haven't
verified this in DuckDB-wasm yet, so it's worth a browser test before
committing to it.

Watch out:
- With hive partitioning, `season` comes from the path. If it's also a column
  in the file, the two must agree (or drop it from the file).
- Pruning only works for filters on the partition column. Queries filtered by
  `game_id` or `player_id` alone will still open every file.

### 2. Make `players` a real table/file

`players` is `arg_max(name, season) ... FROM player_seasons GROUP BY
player_id`, so any query that joins it reads every season of
`player_seasons`. With #1 that's still every partition, because there's no
season filter. A small precomputed `players.parquet`, rewritten each run,
would make it a single request.

The same applies to anything else that aggregates across seasons. In
general, a view that's handy from the CLI can be very expensive from a browser.

### 3. Qualify view-to-view references, or avoid them

Views reference other views unqualified (`player_season_stats_per_36` reads
from `player_season_stats`, and `players` from `player_seasons`). DuckDB 1.4+
resolves these within the attached database, but DuckDB 1.1.1 (still pinned by
Observable Framework's built-in DuckDB-wasm 1.29) resolves them against the
default database and fails:

    Catalog Error: Table with name player_season_stats does not exist!
    Did you mean "nba.player_season_stats"?

Workaround on the client: `USE nba` on the same connection. That breaks with
clients that open a new connection per query, like Framework's `sql`. Having
each derived view read the parquet URLs itself, or qualifying references,
would make the catalog work on older DuckDB too. Lower priority: the notebook
can import a newer DuckDB-wasm (1.32.0 / DuckDB 1.4.3) and avoid this.

### 4. Keep `storage_version` at v1.0.0+

The catalog reports `storage_version=v1.0.0+`, which is why DuckDB 1.1.1 can
open it at all. If the writer ever moves to a newer storage version, older
clients (including Framework's built-in DuckDB-wasm) won't be able to attach
it. Worth pinning explicitly when writing `nba.duckdb`.

### 5. `team_seasons` includes non-NBA teams

The 2026 `team_seasons` includes preseason opponents like `15016 MEL`
(Melbourne United) and `15018 GUA` (Guangzhou Loong-Lions). Joining on a
player's `team_id` is unaffected, but anything that lists teams from
`team_seasons` picks them up. A `league` / `is_nba` column, or filtering them
out, would help.

### 6. Minor

- Every `ATTACH` also requests `nba.duckdb.wal`, which gets a 403 (DO Spaces
  returns 403, not 404, for missing objects when listing isn't allowed).
  Harmless, but it's an extra round trip and shows up as an error in browser
  consoles.
- The per-mode views return full-precision doubles
  (`13.20481004041412`). That's correct, but it compresses badly: as raw
  doubles, v1's shape went from 1.85MB to 5.8MB. Consumers can round, but it
  might be worth documenting.

## Browser test details

- **CORS is fine** on both `basketball-data.billmill.org` and the
  `sfo3.cdn.digitaloceanspaces.com` host: `GET` is allowed, the `range`
  preflight is accepted, and `Content-Range`, `Content-Length`,
  `Accept-Ranges` and `ETag` are exposed. A `HEAD` with `Range: bytes=0-`
  from a page returns 206 with the right headers.
- **DuckDB-wasm still doesn't use range requests** against these files. With
  default settings it sends a plain HEAD, then a full GET. Setting
  `filesystem: { allowFullHTTPReads: false }` makes `ATTACH` fail with
  "database does not exist" before any network request goes out, and
  `reliableHeadRequests: true` changed nothing. I couldn't work out why in
  the time I spent, and it may be a DuckDB-wasm issue rather than anything
  here. The files are ~150KB, so full reads aren't a big deal in bytes; the
  request count is what hurts, which is what #1 fixes.

Timings for the `threes` query (582 rows, 2026 regular season), each in a
fresh DuckDB instance:

| Approach | DuckDB | Cold time |
|---|---|---|
| Loader-produced parquet via `FileAttachment` | 1.1.1 | ~0.7s |
| Catalog, using `players` and `_per_36` views | 1.1.1 | ~10s |
| Catalog, season-scoped joins | 1.1.1 | ~1.1s |
| Catalog, using `players` and `_per_36` views | 1.4.3 | 7-14s |
| Catalog, season-scoped joins | 1.4.3 | ~7s |
| Direct `2026.parquet` files, no catalog | 1.1.1 | ~0.45s |

I haven't explained the 1.1.1 vs 1.4.3 gap on the season-scoped query, and
didn't capture 1.1.1's request pattern.
