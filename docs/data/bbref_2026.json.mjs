const res = await fetch(
  "https://www.basketball-reference.com/leagues/NBA_2026.html",
)
const data = await res.text()

function parseTable(name) {
  const table = data.match(`<table.*id="${name}".*?<\/table>`)[0]
  const rows = [...table.matchAll(/<tr.*?<\/tr>/g)]
  const tabledata = rows
    .map(row => {
      return Object.fromEntries(
        [
          ...row[0].matchAll(
            /<(?:td|th).*?data-stat="(.*?)".*?>(.*?)<\/(?:td|th)>/g,
          ),
        ].map(res => [res[1], res[2]]),
      )
    })
    .filter(t => t.team?.match(/\/teams\//))

  // clean up the data a bit
  tabledata.forEach(t => {
    t.team = t.team.match(/\/teams\/(.*?)\//)[1]
    delete t.DUMMY
    Object.keys(t).forEach(k => {
      const val = Number(t[k].replaceAll(",", ""))
      if (isNaN(val)) return
      t[k] = val
    })
  })

  return tabledata
}

const tables = {
  advanced: parseTable("advanced-team"),
  perGame: parseTable("per_game-team"),
  perPoss: parseTable("per_poss-team"),
  shooting: parseTable("shooting-team"),
  totals: parseTable("totals-team"),
}

console.log(JSON.stringify(tables))
