// Run a command against a dev server that lives only as long as the command:
//
//   node scripts/with-dev.mjs npm run shot -- "scatter?pair=usg-ts&team=BOS"
//
// Astro 7 backgrounds `astro dev` when an agent runs it, and finds the daemon
// again through a lock file holding its pid. In a sandbox that can't see the
// daemon's pid, `astro dev stop` and `status` take the lock for stale and
// delete it, and every `npm run dev` leaves another server behind. So this
// starts a foreground server (`--ignore-lock`), hands its URL to the command
// as SHOT_SERVER, and stops it when the command finishes
import { spawn } from "node:child_process"

const cmd = process.argv.slice(2)
if (!cmd.length) {
  console.error("usage: node scripts/with-dev.mjs <command> [args...]")
  process.exit(2)
}

const astro = new URL("../node_modules/astro/bin/astro.mjs", import.meta.url)
const server = spawn(
  process.execPath,
  [astro.pathname, "dev", "--ignore-lock"],
  {
    stdio: ["ignore", "pipe", "pipe"],
  },
)
const stop = () => server.exitCode === null && server.kill("SIGTERM")
process.on("exit", stop)
for (const sig of ["SIGINT", "SIGTERM"])
  process.on(sig, () => {
    stop()
    process.exit(130)
  })

// the server prints its URL when it's ready, on whatever port was free
const url = await new Promise((resolve, reject) => {
  let out = ""
  const timer = setTimeout(
    () => reject(new Error(`dev server didn't start:\n${out}`)),
    60_000,
  )
  const read = chunk => {
    out += chunk
    const m = out.match(/http:\/\/localhost:\d+\/nba/)
    if (m) {
      clearTimeout(timer)
      resolve(`${m[0]}/`)
    }
  }
  server.stdout.on("data", read)
  server.stderr.on("data", read)
  server.on("exit", code => {
    clearTimeout(timer)
    reject(new Error(`dev server exited (${code}):\n${out}`))
  })
}).catch(e => {
  console.error(e.message)
  process.exit(1)
})
console.error(`[with-dev] ${url}`)

const child = spawn(cmd[0], cmd.slice(1), {
  stdio: "inherit",
  env: { ...process.env, SHOT_SERVER: url },
})
child.on("exit", code => process.exit(code ?? 1))
