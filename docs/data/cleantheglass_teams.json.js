try {
  const res = await fetch("https://cleaningtheglass.com/stats/league/summary")
} catch (e) {
  console.error(
    "failed to fetch https://cleaningtheglass.com/stats/league/summary",
  )
  process.exit(0)
}
const data = await res.text()

// download the web page and uncomment this for debugging
// import fs from "node:fs";
// const data = fs.readFileSync("ctg.html").toString();

function tryNumber(n) {
  if (n.match(/%$/)) {
    return Number(n.slice(0, n.length - 2)) / 100
  }
  const val = Number(n.replaceAll(",", ""))
  return isNaN(val) ? n : val
}

const table = data.match(/<table.*id="league_summary".*?<\/table>/ms)[0]
const rows = [...table.matchAll(/<tr.*?<\/tr>/gms)].map(x => x[0]).slice(1)
const headers = [...rows[0].matchAll(/<th.*?>(.*?)<\/th>/g)]
  .filter(x => x[1])
  .map((x, i) => (i < 11 ? x[1] : `${x[1]}_last2wk`))
  .map(x => x.toLowerCase())
const tabledata = rows
  .slice(2)
  .map(row =>
    Object.fromEntries(
      [...row.matchAll(/<td.*?(?:value|team_name).*?>(.*?)<\/td>/g)].map(
        (x, i) => [headers[i], tryNumber(x[1])],
      ),
    ),
  )

tabledata.forEach(t => {
  t.team = t.team.match(/a href.*?>(.*?)</)[1]
})

console.log(JSON.stringify(tabledata))
