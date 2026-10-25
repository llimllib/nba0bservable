# nba_data: publish `nba/metadata.json`

A brief for a session in `~/code/nba_data`. Written 2026-10-24 from the
Step Back Club v2 side; nothing in nba_data has been changed yet.

## Why

The v2 site (`nba0bservable/v2`) reads the bucket in the browser with
hyparquet, one parquet file per dataset per season (see "Data" in
`v2/docs/plans/2026-10-10-site-v2-design.md`). It needs to know which
seasons each dataset has, to build its season controls, so a new season
shows up without a code change. Today every tool hard-codes its list
(`[2027, 2026, 2025]` in the rotations tool).

The catalog already has this, in its `metadata` table, but that's inside
`nba/nba.duckdb`, which only DuckDB can read. Loading DuckDB-wasm (about
8 MB gzipped) to read one small table defeats the point of hyparquet.
Guessing seasons by requesting files (HEAD per season) is slow and still
needs a range to probe.

## What to build

Write the `metadata` table as JSON next to the catalog, in the same
run, from the same rows:

```
nba/nba.duckdb
nba/metadata.json    new
```

Shape: the table's columns, keyed by dataset. ISO 8601 timestamps in UTC.

```json
{
  "datasets": {
    "game_rotations": {
      "source": "stats",
      "first_season": 2025,
      "last_season": 2027,
      "seasons": 3,
      "updated": "2026-10-24T14:42:21Z"
    },
    "games": {
      "source": "stats",
      "first_season": 2010,
      "last_season": 2027,
      "seasons": 18,
      "updated": "..."
    }
  }
}
```

Keep it the same data as the table, not a superset, so the two can't
disagree. `seasons` is a count, as in the table; a dataset with a gap is
one where `seasons < last_season - first_season + 1` (none have one
today).

## Where it goes

- **Code:** `pipeline/catalog.py`. `build()` creates the `metadata` table
  from `datasets` (around the `CREATE TABLE metadata` statement); write the
  JSON from the same list in the same function, so a catalog and its
  metadata are always built together. A failed integrity check already
  stops the build, so a bad run publishes neither
- **Path:** next to the catalog: `<out>/nba/metadata.json` with
  `--bucket`. For the local build (no `--bucket`), either skip it or write
  `<out>/metadata.local.json`, matching `nba.local.duckdb`, so a local
  build can never be uploaded by `aws s3 sync`. The sync steps exclude
  `*.local.duckdb` today; check the exclude covers whatever name you pick
- **Upload:** both workflows upload the catalog with its own
  `aws s3 cp out/nba/nba.duckdb ...` after the parquet sync
  (`.github/workflows/update.yml` "Build and upload the catalog" and
  `sources.yml`, same step name). Add a `cp` for `metadata.json` right
  after it, with `--acl public-read` and
  `--content-type application/json`. The "Purge the CDN again, for the
  catalog" step that follows already covers it: it purges `nba/*`
- **College:** `--league ncaam` builds `ncaam/ncaam.duckdb` with the same
  code. Writing `ncaam/metadata.json` too is probably free; nothing needs it
  yet

## Things to check

- **CORS:** the site fetches this from `billmill.org` in the browser. The
  bucket sends `access-control-allow-origin: *` for every key (checked on
  `nba/nba.duckdb`), so it should just work; confirm with
  `curl -I -H "Origin: https://billmill.org"` on the uploaded file
- **Caching:** the CDN sends `max-age=3600` for everything. Fine: the site
  is at most an hour behind on a new season, same as the data itself
- **`updated`:** with `--bucket` it's the newest file's `LastModified` from
  the bucket listing (`max(f.modified ...)`); that's the right meaning,
  "when this dataset last changed in the bucket"

## Docs to update

- `docs/DATA_DICTIONARY.md`: the "v2 Catalog" section lists `metadata` as a
  table; add `nba/metadata.json` beside it, and to the layout block
- `docs/v2.md`: the layout and the `pipeline/catalog.py` row
- `CLAUDE.md`: the `pipeline.catalog` command description mentions what it
  writes

## Done when

- `https://basketball-data.billmill.org/nba/metadata.json` exists after a
  workflow run, matches `SELECT * FROM nba.metadata`, and is fetchable
  cross-origin
- `mise run test` and `mise run lint` pass, with a test that the JSON and
  the table agree

Then, in this repo: add a `seasons(dataset)` helper to `v2/src/kit/data.ts`
that reads `metadata.json`, and replace the hard-coded season lists in
`src/tools/playoffs.ts` and `src/tools/rotations.ts`.
