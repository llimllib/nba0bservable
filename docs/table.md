---
theme: cotton
title: table-graph
toc: false
sql:
  players: ./data/playerstats.parquet
---

```js
import { sql } from "npm:@observablehq/duckdb"

import { espnAbbrev, teams } from "./lib/teams.js"
```

```js
const year = view(
  Inputs.range([2014, 2026], { value: "2026", label: "year", step: 1 }),
)
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
const filter = view(Inputs.text({ label: "filter" }))
```

```js
const activeTeams = selectedTeams.map(t => `'${t.abbreviation}'`).join(",")
const baseQuery =
  `SELECT player_name,
          team_abbreviation,
          gp,
          fgm,
          fga,
          fg_pct * 100 as fg_pct,
          fg3m AS "3pm",
          fg3a AS "3pa",
          fg3a_per36,
          fg3_pct * 100 AS "3p%",
          blk,
          ast
       FROM players
      WHERE year=${year}` +
  (activeTeams ? ` AND team_abbreviation in (${activeTeams})` : ``)

const query = `SELECT * FROM (\n  ${baseQuery}) as subquery`

let allPlayers
if (filter) {
  // display(`${query}\nWHERE ${filter}`)
  try {
    allPlayers = (await sql([`${query}\nWHERE ${filter}`])).toArray()
  } catch (e) {
    allPlayers = (await sql([baseQuery])).toArray()
  }
} else {
  allPlayers = (await sql([baseQuery])).toArray()
}
```

```js
// Define the columns you want to display
const columns = [
  { key: "player_name", label: "Player", type: "string" },
  { key: "team_abbreviation", label: "Team", type: "string" },
  { key: "gp", label: "GP", type: "ordinal" },
  { key: "fgm", label: "FGM", type: "ordinal" },
  { key: "fga", label: "FGA", type: "ordinal" },
  { key: "fg_pct", label: "FG%", type: "number" },
  { key: "3pm", label: "3PM", type: "ordinal" },
  { key: "3pa", label: "3PA", type: "ordinal" },
  { key: "3p%", label: "3P%", type: "number" },
]

// Create a mutable for sort state
const sortState = Mutable({ column: "fgm", direction: "desc" })
```

```js
// Function to create the table with background bars
function createSortableTable(data, columns, sortState) {
  const container = html`<div class="sortable-table"></div>`

  function render() {
    // Sort the data
    const sorted = [...data].sort((a, b) => {
      const aVal = a[sortState.column]
      const bVal = b[sortState.column]

      if (aVal == null) return 1
      if (bVal == null) return -1

      const comparison = aVal < bVal ? -1 : aVal > bVal ? 1 : 0
      return sortState.direction === "asc" ? comparison : -comparison
    })

    // Calculate max value for the sorted column (for numeric columns only)
    const sortedColumn = columns.find(c => c.key === sortState.column)
    const isNumeric = ["number", "ordinal"].includes(sortedColumn?.type)

    let maxValue = 1
    if (isNumeric) {
      maxValue = Math.max(
        ...sorted.map(d => d[sortState.column] || 0).filter(v => v > 0),
      )
    }

    container.innerHTML = `
  <style>
    .sortable-table {
      font-family: system-ui, -apple-system, sans-serif;
      font-size: 14px;
    }
    .sortable-table table {
      width: 100%;
      border-collapse: collapse;
      background: white;
    }
    .sortable-table th {
      background: #f3f4f6;
      padding: 12px 8px;
      text-align: left;
      font-weight: 600;
      cursor: pointer;
      user-select: none;
      border-bottom: 2px solid #e5e7eb;
      position: relative;
    }
    .sortable-table th:hover {
      background: #e5e7eb;
    }
    .sortable-table th.sorted {
      background: #dbeafe;
    }
    .sortable-table th .sort-indicator {
      margin-left: 4px;
      font-size: 10px;
    }
    .sortable-table td {
      padding: 10px 8px;
      border-bottom: 1px solid #f3f4f6;
    }
    .sortable-table tbody tr:hover {
      filter: brightness(0.97);
    }
    .sortable-table .number {
      text-align: right;
    }
    .sortable-table .player-cell {
      display: flex;
      align-items: center;
      gap: 8px;
    }
    .sortable-table .team-logo {
      width: 24px;
      height: 24px;
      object-fit: contain;
    }
  </style>
  <table>
    <thead>
      <tr>
        ${columns
          .map(
            col => `
          <th class="${col.key === sortState.column ? "sorted" : ""} ${col.type === "number" ? "number" : ""}"
              data-column="${col.key}">
            ${col.label}
            ${
              col.key === sortState.column
                ? `<span class="sort-indicator">${sortState.direction === "asc" ? "▲" : "▼"}</span>`
                : ""
            }
          </th>
        `,
          )
          .join("")}
      </tr>
    </thead>
    <tbody>
      ${sorted
        .map(row => {
          const value = row[sortState.column]
          const percentage =
            isNumeric && value != null && value > 0
              ? (value / maxValue) * 100
              : 0

          const backgroundStyle =
            percentage > 0
              ? `background: linear-gradient(90deg, rgba(59, 130, 246, 0.15) 0%, rgba(59, 130, 246, 0.15) ${percentage}%, transparent ${percentage}%);`
              : ""

          return `
          <tr style="${backgroundStyle}">
            ${columns
              .map(col => {
                let displayValue = row[col.key]
                if (col.type === "number" && displayValue != null) {
                  displayValue =
                    typeof displayValue === "number"
                      ? displayValue.toFixed(1)
                      : displayValue
                } else if (col.type === "ordinal" && displayValue != null) {
                  displayValue =
                    typeof displayValue === "number"
                      ? displayValue.toFixed(0)
                      : displayValue
                }

                // Add team logo for player name column
                if (col.key === "player_name") {
                  const logoUrl = `https://a.espncdn.com/i/teamlogos/nba/500/${espnAbbrev(row.team_abbreviation)}.png`
                  return `<td><div class="player-cell"><img src="${logoUrl}" class="team-logo" alt="${row.team_abbreviation}" /><span>${displayValue ?? "-"}</span></div></td>`
                }

                return `<td class="${col.type === "number" ? "number" : ""}">${displayValue ?? "-"}</td>`
              })
              .join("")}
          </tr>
        `
        })
        .join("")}
    </tbody>
  </table>
`
    // Add click handlers for sorting
    container.querySelectorAll("th[data-column]").forEach(th => {
      th.addEventListener("click", () => {
        const column = th.dataset.column
        if (sortState.column === column) {
          sortState.direction = sortState.direction === "asc" ? "desc" : "asc"
        } else {
          sortState.column = column
          sortState.direction = "desc"
        }
        render()
      })
    })
  }

  render()
  return container
}
```

```js
display(createSortableTable(allPlayers, columns, sortState))
```
