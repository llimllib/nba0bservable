---
theme: cotton
title: Career Cumulative Stats
toc: false
sql:
  players: ./data/player_box.parquet
---

# Career Cumulative Stats

```js
import { lineEndLabels } from "./lib/lineEndLabels.js"
import { CURRENT_SEASON, seasonLabel } from "./lib/season.js"
```

```js
// Define available metrics for the select box
const metricLabels = {
  // Overall Net Points
  t_net_pts: "Total Net Points",
  o_net_pts: "Offensive Net Points",
  d_net_pts: "Defensive Net Points",

  // Win Probability Added
  t_wpa: "Total Win Probability Added",
  o_wpa: "Offensive Win Probability Added",
  d_wpa: "Defensive Win Probability Added",

  // Traditional Box Score Stats
  pts: "Points Scored",
  plus_minus: "Plus/Minus",
  fgm: "Field Goals Made",
  fga: "Field Goals Attempted",
  fg3m: "3-Pointers Made",
  fg3a: "3-Pointers Attempted",
  ftm: "Free Throws Made",
  fta: "Free Throws Attempted",
  reb: "Total Rebounds",
  oreb: "Offensive Rebounds",
  dreb: "Defensive Rebounds",
  ast: "Assists",
  stl: "Steals",
  blk: "Blocks",
  tov: "Turnovers",
}

const metricKeys = Object.keys(metricLabels)

// Get metric from URL hash
function getMetricFromHash() {
  const hash = window.location.hash.slice(1)
  if (!hash) return "t_net_pts"
  try {
    const params = new URLSearchParams(hash)
    const metric = params.get("metric")
    return metricKeys.includes(metric) ? metric : "t_net_pts"
  } catch (e) {
    return "t_net_pts"
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
  if (selectedMetric && selectedMetric !== "t_net_pts") {
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

```js
// Season range picker
const availableSeasons = d3.range(2019, CURRENT_SEASON + 1)

function getSeasonFromHash(param, defaultVal) {
  const hash = window.location.hash.slice(1)
  if (!hash) return defaultVal
  try {
    const params = new URLSearchParams(hash)
    const val = parseInt(params.get(param))
    return availableSeasons.includes(val) ? val : defaultVal
  } catch (e) {
    return defaultVal
  }
}

const startSeasonSelect = Inputs.select(availableSeasons, {
  value: getSeasonFromHash("startSeason", 2019),
  format: seasonLabel,
  label: "From:",
})

const endSeasonSelect = Inputs.select(availableSeasons, {
  value: getSeasonFromHash("endSeason", CURRENT_SEASON),
  format: seasonLabel,
  label: "To:",
})

const startSeason = Generators.input(startSeasonSelect)
const endSeason = Generators.input(endSeasonSelect)
```

```js
// Update URL when seasons change
{
  const params = new URLSearchParams(window.location.hash.slice(1))
  if (startSeason && startSeason !== 2018) {
    params.set("startSeason", startSeason)
  } else {
    params.delete("startSeason")
  }
  if (endSeason && endSeason !== CURRENT_SEASON) {
    params.set("endSeason", endSeason)
  } else {
    params.delete("endSeason")
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
FROM players
WHERE game_type IN ('regular_season', 'playoffs')
-- game_id is NOT chronological, so sort by date
ORDER BY game_date
;
```

```js
// Pre-process: build a Map from player name -> sorted array of their games
// This is done once and reused for any player selection
const playerGamesMap = new Map()
// The query sorts by game_date, so each player's games are in order
for (const row of alldata) {
  const name = row.player_name
  if (!playerGamesMap.has(name)) {
    playerGamesMap.set(name, [])
  }
  playerGamesMap.get(name).push(row)
}
```

```sql id=agg
SELECT
  player_name,
  player_id,
  count(*) n,
  sum(t_net_pts) t_net_pts,
  min(season) first_season,
  max(season) last_season,
FROM players
WHERE game_type IN ('regular_season', 'playoffs')
GROUP BY player_id, player_name
HAVING n > 0
ORDER BY t_net_pts DESC
```

```js
// Get the metric column dynamically from the data
function getMetricValue(row, metric) {
  return row[metric] ?? 0
}
```

```js
const allPlayerNames = agg
  .toArray()
  .map(p => p.player_name)
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
// Fuzzy search: matches if all search terms appear in the player name,
// ignoring case and accents
// e.g., "ron holland" matches "Ronald Holland II", "jokic" matches "Nikola Jokić"
const fold = s =>
  s
    .normalize("NFD")
    .replace(/\p{Diacritic}/gu, "")
    .toLowerCase()

function fuzzyMatch(search, name) {
  const searchLower = fold(search)
  const nameLower = fold(name)

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
  label: "Title",
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
  label: "Subtitle",
  placeholder: "Add a subtitle...",
  value: getSubtitleFromHash(),
  width: 300,
})

const subtitle = Generators.input(subtitleInput)

const showDotsCheckbox = Inputs.toggle({
  label: "Show game dots",
  value: false,
})

const showDots = Generators.input(showDotsCheckbox)
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
  <p style="color: var(--theme-foreground-muted); margin-bottom: 15px;">Career stats from 2018-19 season onwards (regular season + playoffs)</p>
  <div style="display: flex; gap: 10px; align-items: center; margin-bottom: 15px;">
    ${searchContainer}
    <button onclick=${clearAll} style="margin-left: 20px;padding: 5px 10px; cursor: pointer;">Clear All</button>
  </div>
  
  <div id="selected-chips" style="display: flex; flex-wrap: wrap; gap: 8px; min-height: 32px;">
    ${chips}
  </div>

  <div style="margin-top: 15px; display: flex; gap: 20px; flex-wrap: wrap; align-items: end;">
    <div>${metricSelect}</div>
    <div style="display: flex; gap: 10px; align-items: end;">
      ${startSeasonSelect}
      ${endSeasonSelect}
    </div>
    <div>${showDotsCheckbox}</div>
    <div style="width: 100%">${titleInput}</div>
    <div>${subtitleInput}</div>
  </div>
</div>

```js
// Ensure valid season range (swap if needed)
const effectiveStartSeason = Math.min(startSeason, endSeason)
const effectiveEndSeason = Math.max(startSeason, endSeason)
```

```js
// Calculate cumulative stats for each player using the selected metric
// filtered by season range
// Uses pre-built playerGamesMap for fast lookups
const cumulativeData = []

for (const name of selectedPlayers) {
  const allGames = playerGamesMap.get(name)
  if (!allGames) continue
  
  // Filter games by season range
  const games = allGames.filter(g => g.season >= effectiveStartSeason && g.season <= effectiveEndSeason)
  if (games.length === 0) continue
  
  // Add starting point at zero
  cumulativeData.push({
    name,
    gameN: 0,
    cumValue: 0,
    gameDate: null,
    gameValue: 0,
    season: null,
  })
  
  let cumValue = 0
  let gameN = 0
  for (const pt of games) {
    const metricValue = pt[selectedMetric] ?? 0
    gameN += 1
    cumValue += metricValue
    
    cumulativeData.push({
      name,
      gameN,
      cumValue,
      gameDate: new Date(pt.game_date),
      gameValue: metricValue,
      season: pt.season,
    })
  }
}

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
          Select players above to see their career cumulative stats.
        </p>
      </div>`
    : (() => {
        // Format values - use decimals for floating point metrics, integers for counts
        // All net points and WPA metrics are floats
        const isFloatMetric =
          selectedMetric.includes("net_pts") || selectedMetric.includes("wpa")
        const formatValue = v => (isFloatMetric ? v.toFixed(1) : Math.round(v))

        const plot = Plot.plot({
          title: customTitle || selectedMetricLabel,
          subtitle: subtitle || undefined,
          caption: html`Data: espnanalytics.com<br />Chart: billmill.org/nba`,
          width: 928,
          height: 500,
          marginRight: 120,
          x: { label: "Career Games Played", labelAnchor: "center", nice: true },
          y: { label: null, nice: true, grid: true },
          color: {
            type: "categorical",
            domain: selectedPlayers,
            // Custom range that avoids yellow early (hard to see on linen background)
            range: [
              "#4269d0", // blue
              "#ff725c", // red-orange
              "#6cc5b0", // teal
              "#a463f2", // purple
              "#ff8ab7", // pink
              "#97bbf5", // light blue
              "#9c6b4e", // brown
              "#3ca951", // green
              "#efb118", // yellow/gold (moved to end)
              "#9498a0", // gray
            ],
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
                `${d.name}\nGame ${d.gameN} (${d.season - 1}-${String(d.season).slice(2)})\nCumulative: ${formatValue(d.cumValue)}\nThis game: ${formatValue(d.gameValue)}`,
            }),
            showDots
              ? Plot.dot(
                  cumulativeData.filter(d => d.gameN > 0),
                  {
                    x: "gameN",
                    y: "gameValue",
                    fill: "name",
                    r: 2.5,
                    fillOpacity: 0.5,
                  },
                )
              : null,
            lineEndLabels(cumulativeData, {
              x: "gameN",
              y: "cumValue",
              z: "name",
              label: "name",
              padding: 5,
              lineHeight: 12,
            }),
          ],
        })

        return plot
      })(),
)
```
