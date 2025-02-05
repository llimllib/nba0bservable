---
theme: cotton
title: EPM
toc: false
---

# EPM data

```js
import { epmDiamond } from "./lib/epmdiamond.js"
import { teams } from "./lib/teams.js"
import { label } from "./lib/labels.js"
import { sliceQuantile } from "./lib/util.js"
```

```js
// epm comes through as objects with keys.
// Feb 5 25: I just had to switch [1] to [2], I don't know why there are three
// objects, two of which are empty. If I have to do this more, could search for
// whichever one is non-empty
const epmEnvelope = (await FileAttachment("data/epm.json").json())[2].data
const epm = epmEnvelope.stats
const epmUpdated = epmEnvelope.date
// seasonEPM uses an updated format where seasonEPM[1].data.stats is an array
// of arrays without keys; the keys are in seasonEPM[1].data.k
// 1/3/25: recently this moved into [2] instead of [1], I don't know why; the
// first two are empty
const seasonEPMEnvelope = (
  await FileAttachment("./data/epm_season.json").json()
)[2].data
const seasonEPMrows = seasonEPMEnvelope.stats
const seasonEPMKeys = seasonEPMEnvelope.k
const keys = Object.entries(seasonEPMKeys)
  .sort((x, y) => x[1] > y[1])
  .map(x => x[0])
const seasonEPM = seasonEPMrows.map(row => {
  const obj = {}
  row.forEach((value, index) => {
    obj[keys[index]] = value
  })
  return obj
})
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
display(
  epmDiamond(epm, {
    by: "p_mp_48",
    selectedTeams: ts,
    percentile,
    showBackground,
    size: 600,
    title: "Prescriptive EPM",
  }),
)
```

```js
const ts = selectedTeams.map(d => d.abbreviation)
display(
  epmDiamond(seasonEPM, {
    by: "mp",
    selectedTeams: ts,
    percentile,
    showBackground,
    size: 600,
    title: "Season EPM",
  }),
)
```
