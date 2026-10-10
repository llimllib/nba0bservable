// A DuckDB-wasm client with the nba_data v2 catalog attached. Framework pins
// DuckDB-wasm 1.29 (DuckDB 1.1.1), so this imports a newer version directly
import * as duckdb from "npm:@duckdb/duckdb-wasm@1.32.0"

const CATALOG = "https://basketball-data.billmill.org/nba/nba.duckdb"

const bundles = {
  mvp: {
    mainModule: import.meta.resolve(
      "npm:@duckdb/duckdb-wasm@1.32.0/dist/duckdb-mvp.wasm",
    ),
    mainWorker: import.meta.resolve(
      "npm:@duckdb/duckdb-wasm@1.32.0/dist/duckdb-browser-mvp.worker.js",
    ),
  },
  eh: {
    mainModule: import.meta.resolve(
      "npm:@duckdb/duckdb-wasm@1.32.0/dist/duckdb-eh.wasm",
    ),
    mainWorker: import.meta.resolve(
      "npm:@duckdb/duckdb-wasm@1.32.0/dist/duckdb-browser-eh.worker.js",
    ),
  },
}

let conn: Promise<duckdb.AsyncDuckDBConnection> | undefined

async function connect() {
  const bundle = await duckdb.selectBundle(bundles)
  const worker = new Worker(bundle.mainWorker!)
  const db = new duckdb.AsyncDuckDB(
    new duckdb.ConsoleLogger(duckdb.LogLevel.WARNING),
    worker,
  )
  await db.instantiate(bundle.mainModule, bundle.pthreadWorker)
  await db.open({ query: { castBigIntToDouble: true } })
  const c = await db.connect()
  await c.query(`ATTACH '${CATALOG}' AS nba (READ_ONLY)`)
  return c
}

// Run a query against the catalog, returning an array of row objects
export async function query(sql: string) {
  conn ??= connect()
  const table = await (await conn).query(sql)
  return table.toArray().map(row => row.toJSON())
}

export async function version() {
  return (await query("SELECT version() AS v"))[0].v
}
