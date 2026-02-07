---
theme: cotton
title: Cumulative Stats
toc: false
sql:
  players: ./data/espn.players.parquet
  gamelogs_raw: ./data/gamelogs.parquet
  player_details: ./data/espn.player_details.parquet
---

# Cumulative Stats

```js
import { teams } from "./lib/teams.js"
```

```js
// Define available metrics for the select box
const metricLabels = {
  // Overall Net Points
  tNetPts: "Total Net Points",
  oNetPts: "Offensive Net Points",
  dNetPts: "Defensive Net Points",
  
  // Win Probability Added
  tWPA: "Total Win Probability Added",
  oWPA: "Offensive Win Probability Added",
  dWPA: "Defensive Win Probability Added",
  
  // Detailed Net Points Breakdowns (from player_details)
  "3pt_tNetPts": "3PT Total Net Points",
  "3pt_oNetPts": "3PT Offensive Net Points",
  "3pt_dNetPts": "3PT Defensive Net Points",
  "2pt_tNetPts": "2PT Total Net Points",
  "2pt_oNetPts": "2PT Offensive Net Points",
  "2pt_dNetPts": "2PT Defensive Net Points",
  "rim_tNetPts": "Rim Total Net Points",
  "rim_oNetPts": "Rim Offensive Net Points",
  "rim_dNetPts": "Rim Defensive Net Points",
  "mid_tNetPts": "Mid-Range Total Net Points",
  "mid_oNetPts": "Mid-Range Offensive Net Points",
  "mid_dNetPts": "Mid-Range Defensive Net Points",
  "corner_tNetPts": "Corner Total Net Points",
  "corner_oNetPts": "Corner Offensive Net Points",
  "corner_dNetPts": "Corner Defensive Net Points",
  "freethrow_tNetPts": "Free Throw Total Net Points",
  "freethrow_oNetPts": "Free Throw Offensive Net Points",
  "freethrow_dNetPts": "Free Throw Defensive Net Points",
  "layup_tNetPts": "Layup Total Net Points",
  "layup_oNetPts": "Layup Offensive Net Points",
  "layup_dNetPts": "Layup Defensive Net Points",
  "dunk_tNetPts": "Dunk Total Net Points",
  "dunk_oNetPts": "Dunk Offensive Net Points",
  "dunk_dNetPts": "Dunk Defensive Net Points",
  "driving_tNetPts": "Driving Total Net Points",
  "driving_oNetPts": "Driving Offensive Net Points",
  "driving_dNetPts": "Driving Defensive Net Points",
  "cutting_tNetPts": "Cutting Total Net Points",
  "cutting_oNetPts": "Cutting Offensive Net Points",
  "cutting_dNetPts": "Cutting Defensive Net Points",
  "floating_tNetPts": "Floater Total Net Points",
  "floating_oNetPts": "Floater Offensive Net Points",
  "floating_dNetPts": "Floater Defensive Net Points",
  "hook_tNetPts": "Hook Shot Total Net Points",
  "hook_oNetPts": "Hook Shot Offensive Net Points",
  "hook_dNetPts": "Hook Shot Defensive Net Points",
  "fade_tNetPts": "Fadeaway Total Net Points",
  "fade_oNetPts": "Fadeaway Offensive Net Points",
  "fade_dNetPts": "Fadeaway Defensive Net Points",
  "bank_tNetPts": "Bank Shot Total Net Points",
  "bank_oNetPts": "Bank Shot Offensive Net Points",
  "bank_dNetPts": "Bank Shot Defensive Net Points",
  "assist_tNetPts": "Assist Total Net Points",
  "assist_oNetPts": "Assist Offensive Net Points",
  "assist_dNetPts": "Assist Defensive Net Points",
  "rebound_tNetPts": "Rebound Total Net Points",
  "rebound_oNetPts": "Rebound Offensive Net Points",
  "rebound_dNetPts": "Rebound Defensive Net Points",
  "putback_tNetPts": "Putback Total Net Points",
  "putback_oNetPts": "Putback Offensive Net Points",
  "putback_dNetPts": "Putback Defensive Net Points",
  "turnover_tNetPts": "Turnover Total Net Points",
  "turnover_oNetPts": "Turnover Offensive Net Points",
  "turnover_dNetPts": "Turnover Defensive Net Points",
  "badpass_tNetPts": "Bad Pass Total Net Points",
  "badpass_oNetPts": "Bad Pass Offensive Net Points",
  "badpass_dNetPts": "Bad Pass Defensive Net Points",
  "foul_tNetPts": "Foul Total Net Points",
  "foul_oNetPts": "Foul Offensive Net Points",
  "foul_dNetPts": "Foul Defensive Net Points",
  "fastbreak_tNetPts": "Fastbreak Total Net Points",
  "fastbreak_oNetPts": "Fastbreak Offensive Net Points",
  "fastbreak_dNetPts": "Fastbreak Defensive Net Points",
  
  // Traditional Box Score Stats
  pts: "Points Scored",
  plusMinusPoints: "Plus/Minus",
  fgmplyr: "Field Goals Made",
  fgaplyr: "Field Goals Attempted",
  fg3mplyr: "3-Pointers Made",
  fg3aplyr: "3-Pointers Attempted",
  ftmplyr: "Free Throws Made",
  ftaplyr: "Free Throws Attempted",
  rebounder: "Total Rebounds",
  orebounder: "Offensive Rebounds",
  drebounder: "Defensive Rebounds",
  assister: "Assists",
  stlr: "Steals",
  blockplyr: "Blocks",
  tov1: "Turnovers",
  dfoulplyr: "Defensive Fouls",
  ofoulplyr: "Offensive Fouls",
}

const metricKeys = Object.keys(metricLabels)

// Get metric from URL hash
function getMetricFromHash() {
  const hash = window.location.hash.slice(1)
  if (!hash) return "tNetPts"
  try {
    const params = new URLSearchParams(hash)
    const metric = params.get("metric")
    return metricKeys.includes(metric) ? metric : "tNetPts"
  } catch (e) {
    return "tNetPts"
  }
}

const metricSelect = Inputs.select(metricKeys, {
  value: getMetricFromHash(),
  format: d => metricLabels[d],
  label: "Stat to chart:",
})

const selectedMetric = Generators.input(metricSelect)
```

```js
// Update URL when metric changes (separate block so selectedMetric is resolved)
const selectedMetricLabel = metricLabels[selectedMetric]
{
  const params = new URLSearchParams(window.location.hash.slice(1))
  if (selectedMetric && selectedMetric !== "tNetPts") {
    params.set("metric", selectedMetric)
  } else {
    params.delete("metric")
  }
  const newHash = params.toString()
  history.replaceState(
    null,
    "",
    newHash ? `#${newHash}` : window.location.pathname,
  )
}
```

```sql id=alldata
SELECT *
from players
where season=2025
and game_id LIKE '002%' or game_id LIKE '003%'
;
```

```sql id=details
SELECT *
from player_details
where season=2025
and gameId LIKE '002%' or gameId LIKE '003%'
;
```

```sql id=gamelogs
select game_id, game_date from gamelogs_raw where season_year='2025-26'
```

```js
const dates = new Map(
  gamelogs.toArray().map(row => [row.game_id, new Date(row.game_date)]),
)
```

```sql id=agg
SELECT
  name,
  team,
  count(*) n,
  sum(tNetPts) tNetPts,
from players
where season=2025
and game_id LIKE '002%' or game_id LIKE '003%'
group by player_id, name, team
having n > 0
order by tNetPts desc
```

```js
// Get the metric column dynamically from the data
function getMetricValue(row, metric) {
  return row[metric] ?? 0
}

// Metrics that come from player_details (have underscore in name like "3pt_tNetPts")
const detailMetrics = new Set(Object.keys(metricLabels).filter(k => k.includes("_")))
function isDetailMetric(metric) {
  return detailMetrics.has(metric)
}
```

```js
const allPlayerNames = agg
  .toArray()
  .map(p => p.name)
  .sort()
```

```js
// Initialize from URL hash on page load (using URLSearchParams for multiple values)
function getPlayersFromHash() {
  const hash = window.location.hash.slice(1)
  if (!hash) return []
  try {
    const params = new URLSearchParams(hash)
    const playersParam = params.get("players")
    if (!playersParam) return []
    const names = playersParam.split(",").filter(n => n.trim())
    return names.filter(n => allPlayerNames.includes(n))
  } catch (e) {
    return []
  }
}

function updateHash(players) {
  const params = new URLSearchParams(window.location.hash.slice(1))
  if (players.length === 0) {
    params.delete("players")
  } else {
    params.set("players", players.join(","))
  }
  const newHash = params.toString()
  history.replaceState(
    null,
    "",
    newHash ? `#${newHash}` : window.location.pathname,
  )
}

// Reactive state for selected players, initialized from URL
const selectedPlayers = Mutable(getPlayersFromHash())

function addPlayer(name) {
  if (name && !selectedPlayers.value.includes(name)) {
    const newPlayers = [...selectedPlayers.value, name]
    selectedPlayers.value = newPlayers
    updateHash(newPlayers)
  }
}

function removePlayer(name) {
  const newPlayers = selectedPlayers.value.filter(p => p !== name)
  selectedPlayers.value = newPlayers
  updateHash(newPlayers)
}

function clearAll() {
  selectedPlayers.value = []
  updateHash([])
}
```

```js
// Fuzzy search: matches if all search terms appear in the player name
// e.g., "ron holland" matches "Ronald Holland II"
function fuzzyMatch(search, name) {
  const searchLower = search.toLowerCase()
  const nameLower = name.toLowerCase()

  // Split search into terms
  const terms = searchLower.split(/\s+/).filter(t => t.length > 0)

  // Check if each term appears somewhere in the name
  return terms.every(term => nameLower.includes(term))
}

function getFilteredPlayers(search) {
  if (!search || search.trim() === "") return []
  return allPlayerNames.filter(name => fuzzyMatch(search, name))
}
```

```js
// Build the entire search UI imperatively to avoid Observable reactivity issues
const searchContainer = html`<div
  style="position: relative; flex: 1; max-width: 300px;"
>
  <input
    type="text"
    placeholder="Search for a player..."
    style="width: 100%; padding: 6px 10px; font-size: 14px; border: 1px solid var(--theme-foreground-fainter); border-radius: 4px;"
  />
  <div
    class="dropdown-container"
    style="position: absolute; top: 100%; left: 0; right: 0; z-index: 1000;"
  ></div>
</div>`

const searchInput = searchContainer.querySelector("input")
const dropdownEl = searchContainer.querySelector(".dropdown-container")

function updateDropdown() {
  const searchText = searchInput.value
  const filtered = getFilteredPlayers(searchText)

  if (searchText.length === 0) {
    dropdownEl.innerHTML = ""
    return
  }

  if (filtered.length === 0) {
    dropdownEl.innerHTML = `<div style="padding: 8px 12px; background: var(--theme-background); border: 1px solid var(--theme-foreground-fainter); border-radius: 4px; box-shadow: 0 4px 12px rgba(0,0,0,0.15); color: var(--theme-foreground-muted); font-style: italic; margin-top: 2px;">No players found</div>`
    return
  }

  const items = filtered.slice(0, 20).map(name => {
    const div = document.createElement("div")
    div.textContent = name
    div.style.cssText =
      "padding: 8px 12px; cursor: pointer; border-bottom: 1px solid var(--theme-foreground-faintest);"
    div.onmouseenter = () =>
      (div.style.background = "var(--theme-foreground-faintest)")
    div.onmouseleave = () => (div.style.background = "transparent")
    div.onmousedown = () => {
      addPlayer(name)
      searchInput.value = ""
      dropdownEl.innerHTML = ""
    }
    return div
  })

  const container = document.createElement("div")
  container.style.cssText =
    "max-height: 250px; overflow-y: auto; background: var(--theme-background); border: 1px solid var(--theme-foreground-fainter); border-radius: 4px; box-shadow: 0 4px 12px rgba(0,0,0,0.15); margin-top: 2px;"
  items.forEach(item => container.appendChild(item))

  if (filtered.length > 20) {
    const more = document.createElement("div")
    more.style.cssText =
      "padding: 8px 12px; color: var(--theme-foreground-muted); font-style: italic;"
    more.textContent = `...and ${filtered.length - 20} more`
    container.appendChild(more)
  }

  dropdownEl.innerHTML = ""
  dropdownEl.appendChild(container)
}

searchInput.oninput = updateDropdown

searchInput.onkeydown = e => {
  if (e.key === "Enter") {
    const filtered = getFilteredPlayers(searchInput.value)
    if (filtered.length >= 1) {
      addPlayer(filtered[0])
      searchInput.value = ""
      dropdownEl.innerHTML = ""
    }
    e.preventDefault()
  } else if (e.key === "Escape") {
    dropdownEl.innerHTML = ""
  }
}

searchInput.onblur = () => {
  setTimeout(() => {
    dropdownEl.innerHTML = ""
  }, 150)
}

searchInput.onfocus = () => {
  if (searchInput.value) updateDropdown()
}
```

```js
// Title input with URL persistence
function getTitleFromHash() {
  const hash = window.location.hash.slice(1)
  if (!hash) return ""
  try {
    const params = new URLSearchParams(hash)
    return params.get("title") || ""
  } catch (e) {
    return ""
  }
}

const titleInput = Inputs.text({
  placeholder: "Override title...",
  value: getTitleFromHash(),
  width: 300,
})

const customTitle = Generators.input(titleInput)
```

```js
// Subtitle input with URL persistence
function getSubtitleFromHash() {
  const hash = window.location.hash.slice(1)
  if (!hash) return ""
  try {
    const params = new URLSearchParams(hash)
    return params.get("subtitle") || ""
  } catch (e) {
    return ""
  }
}

const subtitleInput = Inputs.text({
  placeholder: "Add a subtitle...",
  value: getSubtitleFromHash(),
  width: 300,
})

const subtitle = Generators.input(subtitleInput)
```

```js
// Update URL when title or subtitle changes (separate block so they are resolved)
{
  const params = new URLSearchParams(window.location.hash.slice(1))
  if (customTitle) {
    params.set("title", customTitle)
  } else {
    params.delete("title")
  }
  if (subtitle) {
    params.set("subtitle", subtitle)
  } else {
    params.delete("subtitle")
  }
  const newHash = params.toString()
  history.replaceState(
    null,
    "",
    newHash ? `#${newHash}` : window.location.pathname,
  )
}
```

```js
// Reactively update chips
const chips =
  selectedPlayers.length === 0
    ? html`<span
        style="color: var(--theme-foreground-muted); font-style: italic;"
        >No players selected. Search above to add players.</span
      >`
    : html`${selectedPlayers.map(
        name =>
          html`<span
            style="display: inline-flex; align-items: center; gap: 5px; background: var(--theme-foreground-faintest); border: 1px solid var(--theme-foreground-fainter); border-radius: 16px; padding: 4px 8px 4px 12px; font-size: 14px;"
          >
            ${name}
            <button
              onclick=${() => removePlayer(name)}
              style="background: none; border: none; cursor: pointer; padding: 2px 4px; font-size: 16px; line-height: 1; border-radius: 50%; display: flex; align-items: center; justify-content: center;"
              title="Remove ${name}"
            >
              ×
            </button>
          </span>`,
      )}`
```

<div class="card">
  <h2>Select Players & Stat</h2>
  <div style="display: flex; gap: 10px; align-items: center; margin-bottom: 15px;">
    ${searchContainer}
    <button onclick=${clearAll} style="padding: 5px 10px; cursor: pointer;">Clear All</button>
  </div>
  
  <div id="selected-chips" style="display: flex; flex-wrap: wrap; gap: 8px; min-height: 32px;">
    ${chips}
  </div>

  <div style="margin-top: 15px; display: flex; gap: 20px; flex-wrap: wrap; align-items: end;">
    <div>${metricSelect}</div>
    <div>
      <label style="font-size: 14px; margin-right: 8px;">Chart title:</label>
      ${titleInput}
    </div>
    <div>
      <label style="font-size: 14px; margin-right: 8px;">Chart subtitle:</label>
      ${subtitleInput}
    </div>
  </div>
</div>

```js
// Calculate cumulative stats for each player using the selected metric
const cumulativeData = []
const playerCumulatives = new Map()

// Choose data source based on metric type
// player_details uses "gameId" and "playerId", players uses "game_id" and "player_id"
const useDetails = isDetailMetric(selectedMetric)
const dataSource = useDetails ? details : alldata
const gameIdField = useDetails ? "gameId" : "game_id"

const sortedForCumulative = dataSource
  .toArray()
  .map(p => ({ ...p }))
  .filter(x => selectedPlayers.includes(x.name))
  .sort((a, b) => {
    if (a.name !== b.name) return a.name.localeCompare(b.name)
    return a[gameIdField].localeCompare(b[gameIdField])
  })

sortedForCumulative.forEach(pt => {
  const metricValue = getMetricValue(pt, selectedMetric)
  const gameId = pt[gameIdField]

  if (!playerCumulatives.has(pt.name)) {
    playerCumulatives.set(pt.name, { gameN: 0, cumValue: 0 })
    // Add starting point at zero
    cumulativeData.push({
      name: pt.name,
      gameN: 0,
      cumValue: 0,
      gameDate: null,
      gameValue: 0,
    })
  }
  const state = playerCumulatives.get(pt.name)
  state.gameN += 1
  state.cumValue += metricValue

  cumulativeData.push({
    name: pt.name,
    gameN: state.gameN,
    cumValue: state.cumValue,
    gameDate: dates.get(gameId),
    gameValue: metricValue,
  })
})

// Find the max game number for x-axis padding
const maxGameN =
  cumulativeData.length > 0 ? Math.max(...cumulativeData.map(d => d.gameN)) : 0
```

```js
display(
  selectedPlayers.length === 0
    ? html`<div
        class="card"
        style="text-align: center; padding: 40px; color: var(--theme-foreground-muted);"
      >
        <p>
          Select players above to see their cumulative stats over the season.
        </p>
      </div>`
    : (() => {
        // Format values - use decimals for floating point metrics, integers for counts
        // All NetPts and WPA metrics are floats (including detail breakdowns)
        const isFloatMetric = selectedMetric.includes("NetPts") || selectedMetric.includes("WPA")
        const formatValue = v => (isFloatMetric ? v.toFixed(1) : Math.round(v))

        const plot = Plot.plot({
          title: customTitle || selectedMetricLabel,
          subtitle: subtitle || undefined,
          caption: html`Data: espnanalytics.com<br>Chart: billmill.org/nba`,
          width: 928,
          height: 500,
          marginRight: 60,
          x: { label: "Game Played", nice: true },
          y: { label: null, nice: true, grid: true },
          color: {
            type: "categorical",
            domain: selectedPlayers,
          },
          marks: [
            Plot.ruleY([0], { stroke: "#ccc" }),
            Plot.line(cumulativeData, {
              x: "gameN",
              y: "cumValue",
              stroke: "name",
              strokeWidth: 2,
              curve: "catmull-rom",
              tip: true,
              title: d =>
                `${d.name}\nGame ${d.gameN}\nCumulative: ${formatValue(d.cumValue)}\nThis game: ${formatValue(d.gameValue)}`,
            }),
            Plot.text(
              cumulativeData.filter(d => {
                const playerData = cumulativeData.filter(p => p.name === d.name)
                return d.gameN === Math.max(...playerData.map(p => p.gameN))
              }),
              {
                x: "gameN",
                y: "cumValue",
                text: "name",
                dx: 5,
                textAnchor: "start",
                fill: "black",
              },
            ),
          ],
        })

        return plot
      })(),
)
```
