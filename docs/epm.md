---
theme: cotton
title: EPM
toc: false
---

# EPM data

```js
import { epmDiamond, netPointsDiamond } from "./lib/epmdiamond.js"
import { teams } from "./lib/teams.js"
```

```js
// epm comes through as objects with keys.
// Feb 5 25: I just had to switch [1] to [2], I don't know why there are three
// objects, two of which are empty. If I have to do this more, could search for
// whichever one is non-empty
const epmEnvelope = (await FileAttachment("data/epm.json").json()).data
const epm = epmEnvelope.stats
const epmUpdated = epmEnvelope.date
const seasonEPM = await FileAttachment("./data/epm_season.json").json()
```

```js
display(epm)
display(seasonEPM)
display(epmUpdated)
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
// TODO: the author added mpg_attr following mpg, which includes percentile.
// Perhaps we should use that?
display(
  epmDiamond(seasonEPM, {
    by: "mpg",
    selectedTeams: ts,
    percentile,
    showBackground,
    size: 600,
    title: "Season EPM",
  }),
)
```

```js
function norm(name) {
  return name
    .toLowerCase()
    .replace(/ö/g, "oe") // pöltl -> poeltl
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "") // Remove accents/diacritics
    .replace(/\./g, "")
    .trim()
}

// The stats for a given year in the net points data come where
// min_season = max_season = year
const netpoints = (await FileAttachment("data/netpoints.json").json()).filter(
  d => d.min_season === Number(year - 1) && d.max_season === Number(year - 1),
)

// netpoints doesn't have minutes played, let's try to filter the same way we
// filter on epm, by joining the players by name:
netpoints.forEach(p => {
  const matches = seasonEPM.filter(e => norm(e.player_name) === norm(p.full_nm))
  if (matches.length == 0) {
    // re-add if people are missing - this does show players but nobody of consequence
    // display(`unable to find ${p.full_nm}`)
    return
  }
  if (matches.length > 1) {
    display(`too many matches for ${p.full_nm}: ${matches}`)
    return
  }
  p.mp = matches[0].mp

  // normalize team abbreviations
  if (p.tm == "UTAH") p.tm = "UTA"
  if (p.tm == "NO") p.tm = "NOP"
  if (p.tm == "GS") p.tm = "GSW"
  if (p.tm == "WSH") p.tm = "WAS"
  if (p.tm == "SA") p.tm = "SAS"
  if (p.tm == "NY") p.tm = "NYK"
})

// remove the un-matched players
console.log(
  "unmatched:",
  netpoints.filter(p => !p.mp).map(p => p.full_nm),
)
const netpoints_matched = netpoints.filter(p => p.mp)

// display(Inputs.table(netpoints_matched))
// Why isn't it matching Mitchell Robinson? I dunno.
// display(Inputs.table(netpoints.filter(p => p.full_nm.match(/Mitchell Rob/))))
// display(
//   Inputs.table(seasonEPM.filter(p => p.player_name.match(/Mitchell Rob/))),
// )

display(
  netPointsDiamond(netpoints_matched, {
    by: "mp",
    selectedTeams: ts,
    percentile,
    showBackground,
    size: 600,
    title: "Net Points",
    x: "oNet100",
    y: "dNet100",
  }),
)
```
