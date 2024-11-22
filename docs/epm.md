---
theme: cotton
title: EPM
toc: false
---

# EPM data

```js
import { teams } from "./lib/teams.js";
import { label } from "./lib/labels.js";
import { sliceQuantile } from "./lib/util.js";
```

```js
// epm comes through as objects with keys
const epmEnvelope = (await FileAttachment("data/epm.json").json())[1].data;
const epm = epmEnvelope.stats;
const epmUpdated = epmEnvelope.date;
display(epm);
// seasonEPM uses an updated format where seasonEPM[1].data.stats is an array
// of arrays without keys; the keys are in seasonEPM[1].data.k
const seasonEPMEnvelope = (
  await FileAttachment("./data/epm_season.json").json()
)[1].data;
const seasonEPMrows = seasonEPMEnvelope.stats;
const seasonEPMKeys = seasonEPMEnvelope.k;
const keys = Object.entries(seasonEPMKeys)
  .sort((x, y) => x[1] > y[1])
  .map((x) => x[0]);
const seasonEPM = seasonEPMrows.map((row) => {
  const obj = {};
  row.forEach((value, index) => {
    obj[keys[index]] = value;
  });
  return obj;
});
display(seasonEPM);
```

```js
const year = view(
  Inputs.range([2025, 2025], { value: "2025", label: "year", step: 1 }),
);
// console.log("year", (await year.next()).value);
const percentile = view(
  Inputs.range([5, 100], {
    value: "15",
    label: "top x% by predicted minutes played",
    step: 5,
  }),
);
const showBackground = view(Inputs.toggle({ label: "Show rest of NBA" }));
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
  .filter((t) => t.abbreviation != "TOT")
  .filter(
    (t) =>
      !t.years || (year >= t.years[0] && (!t.years[1] || year <= t.years[1])),
  );
const selectedTeams = view(
  Inputs.select(teamArr, {
    value: teamArr[0].name,
    label: "team filter",
    format: (t) => t.name,
    multiple: true,
  }),
);
```

```js
const x = "off";
const y = "def";
// TODO: filter by selected teams
const data = sliceQuantile(epm, "p_mp_48", (100 - percentile) / 100);
// .filter(whatever yo)
// Used if the "show rest of NBA" option is selected, to show the rest of the
// league as background data
const background = sliceQuantile(epm, "p_mp_48", (100 - percentile) / 100);
const [xMin, xMax] = d3.extent(showBackground ? background : data, (d) => d[x]);
const [yMin, yMax] = d3.extent(showBackground ? background : data, (d) => d[y]);

// common options for the explanatory text font
const fontOptions = {
  fontSize: 20,
  fontStyle: "italic",
  //stroke: "black",
  fill: "red",
  opacity: 0.2,
};
display(
  Plot.plot({
    width: 800,
    height: 800,
    title: "Predictive EPM",
    subtitle: `Data by dunksandthrees.com. top ${percentile}% by predicted minutes played`,
    marginRight: 40,
    grid: true,
    x: {
      nice: true,
      ticks: 5,
      label: "Offensive EPM",
      labelAnchor: "center",
    },
    y: {
      nice: true,
      ticks: 5,
      label: "Defensive EPM",
      labelAnchor: "center",
    },
    marks: [
      label(data, {
        x,
        y,
        label: "player_name",
        padding: 10,
        minCellSize: 2000,
      }),
      showBackground
        ? Plot.dot(background, { x, y, fill: "grey", fillOpacity: 0.15, r: 8 })
        : null,
      Plot.dot(data, {
        x,
        y,
        fill: (d) => teams.get(d.team_alias).colors[0],
        stroke: (d) => teams.get(d.team_alias).colors[1],
        r: 8,
      }),
      Plot.tip(
        data,
        Plot.pointer({
          x,
          y,
          title: (d) =>
            `${d.player_name}\n${d.team_abbreviation}\n${x}: ${d[x]}\n${y}: ${d[y]}`,
        }),
      ),
    ],
  }),
);
```

```js
const x = "off";
const y = "def";
// TODO: filter by selected teams
const data = sliceQuantile(seasonEPM, "mp", (100 - percentile) / 100);
// .filter(whatever yo)
// Used if the "show rest of NBA" option is selected, to show the rest of the
// league as background data
const background = sliceQuantile(seasonEPM, "mp", (100 - percentile) / 100);
const [xMin, xMax] = d3.extent(showBackground ? background : data, (d) => d[x]);
const [yMin, yMax] = d3.extent(showBackground ? background : data, (d) => d[y]);

// common options for the explanatory text font
const fontOptions = {
  fontSize: 20,
  fontStyle: "italic",
  //stroke: "black",
  fill: "red",
  opacity: 0.2,
};
display(
  Plot.plot({
    width: 800,
    height: 800,
    title: "Season EPM",
    subtitle: `Data by dunksandthrees.com. top ${percentile}% by minutes played`,
    marginRight: 40,
    grid: true,
    x: {
      nice: true,
      ticks: 5,
      label: "Offensive EPM",
      labelAnchor: "center",
    },
    y: {
      nice: true,
      ticks: 5,
      label: "Defensive EPM",
      labelAnchor: "center",
    },
    marks: [
      label(data, {
        x,
        y,
        label: "player_name",
        padding: 10,
        minCellSize: 2000,
      }),
      showBackground
        ? Plot.dot(background, { x, y, fill: "grey", fillOpacity: 0.15, r: 8 })
        : null,
      Plot.dot(data, {
        x,
        y,
        fill: (d) => teams.get(d.team_alias).colors[0],
        stroke: (d) => teams.get(d.team_alias).colors[1],
        r: 8,
      }),
      Plot.tip(
        data,
        Plot.pointer({
          x,
          y,
          title: (d) =>
            `${d.player_name}\n${d.team_abbreviation}\n${x}: ${d[x]}\n${y}: ${d[y]}`,
        }),
      ),
    ],
  }),
);
```
