---
theme: cotton
title: Sweet 16 Four Factors
toc: false
---

# Sweet 16: Four Factors

```js
import { fourFactorPlot } from "./lib/fourFactorPlot.js"

const raw = await FileAttachment("data/barttorvik.fourfactors.csv").csv({
  typed: true,
})
```

```js
// The CSV has duplicate "Rk" column names, so csv() auto-renames them.
// Map the columns we need based on position in the original header:
// TeamName, eFG%, Rk, eFG% Def, Rk, FTR, Rk, FTR Def, Rk, OR%, Rk, DR%, Rk, TO%, Rk, TO% Def., Rk
const columns = raw.columns
const data = raw.map(d => ({
  team: d[columns[0]],
  efg_off: d[columns[1]],
  efg_def: d[columns[3]],
  ftr_off: d[columns[5]],
  ftr_def: d[columns[7]],
  or_pct: d[columns[9]],
  dr_pct: d[columns[11]],
  tov_off: d[columns[13]],
  tov_def: d[columns[15]],
}))

const espnIds = {
  Michigan: 130,
  Arizona: 12,
  Duke: 150,
  Houston: 248,
  Illinois: 356,
  "Iowa St.": 66,
  Purdue: 2509,
  Connecticut: 41,
  "St. John's": 2599,
  "Michigan St.": 127,
  Tennessee: 2633,
  Nebraska: 158,
  Arkansas: 8,
  Iowa: 2294,
  Alabama: 333,
  Texas: 251,
}

const sweet16 = data.filter(d => d.team in espnIds)
const logoUrl = team =>
  `https://a.espncdn.com/i/teamlogos/ncaa/500/${espnIds[team]}.png`
const logoWidth = d => (d.team === "Texas" ? 43 : 36)
```

<div class="grid grid-cols-2">
<div class="card">

```js
display(
  fourFactorPlot({
    data: sweet16,
    isoSpacing: 4,
    logoUrl,
    logoWidth,
    xCol: "efg_def",
    yCol: "efg_off",
    title: "Effective FG%",
    xLabel: "Defensive eFG%",
    yLabel: "eFG%",
    xReverse: true,
  }),
)
```

</div>
<div class="card">

```js
display(
  fourFactorPlot({
    data: sweet16,
    isoSpacing: 5,
    logoUrl,
    logoWidth,
    xCol: "tov_def",
    yCol: "tov_off",
    title: "Turnover %",
    xLabel: "Defensive TO%",
    yLabel: "Offensive TO%",
    yReverse: true,
  }),
)
```

</div>
<div class="card">

```js
display(
  fourFactorPlot({
    data: sweet16,
    isoSpacing: 9,
    logoUrl,
    logoWidth,
    xCol: "dr_pct",
    yCol: "or_pct",
    title: "Rebound %",
    xLabel: "Defensive Reb%",
    yLabel: "Offensive Reb%",
    yPad: 2,
  }),
)
```

</div>
<div class="card">

```js
display(
  fourFactorPlot({
    data: sweet16,
    isoSpacing: 15,
    logoUrl,
    logoWidth,
    xCol: "ftr_def",
    yCol: "ftr_off",
    title: "Free Throw Rate",
    xLabel: "Defensive FTR",
    yLabel: "Offensive FTR",
    xReverse: true,
    yPad: 2,
  }),
)
```

</div>
</div>

Data from [Bart Torvik](https://barttorvik.com). Four factors: eFG%, turnover %, offensive rebound %, and free throw rate (FTA/FGA). Upper-right is best in all four charts.
