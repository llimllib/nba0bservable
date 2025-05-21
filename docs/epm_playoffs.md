---
theme: cotton
title: EPM Playoffs
toc: false
---

```js
import { epmDiamond, netPointsDiamond } from "./lib/epmdiamond.js"
import { teams } from "./lib/teams.js"
```

# EPM Playoffs data

```js
const epmEnvelope = (await FileAttachment("data/epm_playoffs.json").json())[2]
const epmRows = epmEnvelope.data.stats
const epmKeys = epmEnvelope.data.k
const keys = Object.entries(epmKeys)
  .sort((x, y) => x[1] > y[1])
  .map(x => x[0])
const epm = epmRows.map(row => {
  const obj = {}
  row.forEach((value, index) => {
    obj[keys[index]] = value
  })
  return obj
})
display(epm)
```

```js
const year = view(
  Inputs.range([2025, 2025], { value: "2025", label: "year", step: 1 }),
)
// console.log("year", (await year.next()).value);
const percentile = view(
  Inputs.range([5, 100], {
    value: "15",
    label: "top x% by predicted minutes played",
    step: 5,
  }),
)
const showBackground = view(Inputs.toggle({ label: "Show rest of NBA" }))
```

```js
// I don't like the gap that this makes but I can't figure out how to get the
// value of `year` when the page starts up; this logs it after it changes:
// console.log("year", (await year.next()).value);
// but now when the page starts up

// teams that were active in the given year
const teamArr = teams
  .values()
  .toArray()
  .filter(t => t.abbreviation != "TOT")
  .filter(
    t =>
      !t.years || (year >= t.years[0] && (!t.years[1] || year <= t.years[1])),
  )
const selectedTeams = view(
  Inputs.select(teamArr, {
    value: teamArr[0].name,
    label: "team filter",
    format: t => t.name,
    multiple: true,
  }),
)
```

```js
const ts = selectedTeams.map(d => d.abbreviation)
```

```js
display(
  epmDiamond(epm, {
    by: "mp",
    selectedTeams: ts,
    percentile,
    showBackground,
    size: 600,
    title: "Playoffs EPM",
  }),
)
```
