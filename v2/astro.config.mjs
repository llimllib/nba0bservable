import { defineConfig } from "astro/config"
import fs from "node:fs"
import path from "node:path"

// In dev, `npm run dev:local` reads parquet from a local nba_data checkout's
// out/ directory (laid out like the bucket) instead of the CDN
const dataDir = path.resolve(
  process.env.NBA_DATA_DIR ?? `${import.meta.dirname}/../../nba_data/out`,
)

// Serves dataDir at /data with HEAD and Range support, which hyparquet uses
// to read only the parts of a file it needs
function localData() {
  return {
    name: "local-data",
    configureServer(server) {
      server.middlewares.use("/data", (req, res, next) => {
        const file = path.join(
          dataDir,
          decodeURIComponent(req.url.split("?")[0]),
        )
        if (!file.startsWith(dataDir) || !fs.existsSync(file)) return next()
        const size = fs.statSync(file).size
        res.setHeader("Accept-Ranges", "bytes")
        const range = /bytes=(\d*)-(\d*)/.exec(req.headers.range ?? "")
        let start = 0
        let end = size - 1
        if (range) {
          start = range[1] ? Number(range[1]) : size - Number(range[2])
          end = range[1] && range[2] ? Number(range[2]) : size - 1
          res.statusCode = 206
          res.setHeader("Content-Range", `bytes ${start}-${end}/${size}`)
        }
        res.setHeader("Content-Length", end - start + 1)
        if (req.method === "HEAD") return res.end()
        fs.createReadStream(file, { start, end }).pipe(res)
      })
    },
  }
}

export default defineConfig({
  site: "https://billmill.org",
  base: "/nba",
  vite: {
    plugins: [localData()],
    // optimize these up front, or the first load after a restart can fail
    // with "504 Outdated Optimize Dep" while vite discovers them
    optimizeDeps: {
      include: ["d3", "roughjs", "hyparquet", "hyparquet-compressors"],
    },
  },
})
