---
theme: cotton
title: Cumulative Stats
toc: false
sql:
  players: ./data/player_box.parquet
  player_details: ./data/player_details.parquet
---

# Cumulative Stats

```js
import { lineEndLabels } from "./lib/lineEndLabels.js"

const CURRENT_SEASON = 2026
```

```js
// Season selector
const availableSeasons = [2026, 2025, 2024, 2023, 2022, 2021, 2020, 2019]

function getSeasonFromHash() {
  const hash = window.location.hash.slice(1)
  if (!hash) return CURRENT_SEASON
  try {
    const params = new URLSearchParams(hash)
    const season = parseInt(params.get("season"))
    return availableSeasons.includes(season) ? season : CURRENT_SEASON
  } catch (e) {
    return CURRENT_SEASON
  }
}

const seasonSelect = Inputs.select(availableSeasons, {
  value: getSeasonFromHash(),
  format: d => `${String(d - 1)}-${String(d).slice(2)}`,
  label: "Season:",
})

const selectedSeason = Generators.input(seasonSelect)
```

```js
// Update URL when season changes
{
  const params = new URLSearchParams(window.location.hash.slice(1))
  if (selectedSeason && selectedSeason !== CURRENT_SEASON) {
    params.set("season", selectedSeason)
  } else {
    params.delete("season")
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

  // Detailed Net Points Breakdowns (from player_details), named
  // {action_type}_{side}_net_pts
  "3pt_t_net_pts": "3PT Total Net Points",
  "3pt_o_net_pts": "3PT Offensive Net Points",
  "3pt_d_net_pts": "3PT Defensive Net Points",
  "2pt_t_net_pts": "2PT Total Net Points",
  "2pt_o_net_pts": "2PT Offensive Net Points",
  "2pt_d_net_pts": "2PT Defensive Net Points",
  rim_t_net_pts: "Rim Total Net Points",
  rim_o_net_pts: "Rim Offensive Net Points",
  rim_d_net_pts: "Rim Defensive Net Points",
  mid_t_net_pts: "Mid-Range Total Net Points",
  mid_o_net_pts: "Mid-Range Offensive Net Points",
  mid_d_net_pts: "Mid-Range Defensive Net Points",
  corner_t_net_pts: "Corner Total Net Points",
  corner_o_net_pts: "Corner Offensive Net Points",
  corner_d_net_pts: "Corner Defensive Net Points",
  freethrow_t_net_pts: "Free Throw Total Net Points",
  freethrow_o_net_pts: "Free Throw Offensive Net Points",
  freethrow_d_net_pts: "Free Throw Defensive Net Points",
  layup_t_net_pts: "Layup Total Net Points",
  layup_o_net_pts: "Layup Offensive Net Points",
  layup_d_net_pts: "Layup Defensive Net Points",
  dunk_t_net_pts: "Dunk Total Net Points",
  dunk_o_net_pts: "Dunk Offensive Net Points",
  dunk_d_net_pts: "Dunk Defensive Net Points",
  driving_t_net_pts: "Driving Total Net Points",
  driving_o_net_pts: "Driving Offensive Net Points",
  driving_d_net_pts: "Driving Defensive Net Points",
  cutting_t_net_pts: "Cutting Total Net Points",
  cutting_o_net_pts: "Cutting Offensive Net Points",
  cutting_d_net_pts: "Cutting Defensive Net Points",
  floating_t_net_pts: "Floater Total Net Points",
  floating_o_net_pts: "Floater Offensive Net Points",
  floating_d_net_pts: "Floater Defensive Net Points",
  hook_t_net_pts: "Hook Shot Total Net Points",
  hook_o_net_pts: "Hook Shot Offensive Net Points",
  hook_d_net_pts: "Hook Shot Defensive Net Points",
  fade_t_net_pts: "Fadeaway Total Net Points",
  fade_o_net_pts: "Fadeaway Offensive Net Points",
  fade_d_net_pts: "Fadeaway Defensive Net Points",
  bank_t_net_pts: "Bank Shot Total Net Points",
  bank_o_net_pts: "Bank Shot Offensive Net Points",
  bank_d_net_pts: "Bank Shot Defensive Net Points",
  assist_t_net_pts: "Assist Total Net Points",
  assist_o_net_pts: "Assist Offensive Net Points",
  assist_d_net_pts: "Assist Defensive Net Points",
  rebound_t_net_pts: "Rebound Total Net Points",
  rebound_o_net_pts: "Rebound Offensive Net Points",
  rebound_d_net_pts: "Rebound Defensive Net Points",
  putback_t_net_pts: "Putback Total Net Points",
  putback_o_net_pts: "Putback Offensive Net Points",
  putback_d_net_pts: "Putback Defensive Net Points",
  turnover_t_net_pts: "Turnover Total Net Points",
  turnover_o_net_pts: "Turnover Offensive Net Points",
  turnover_d_net_pts: "Turnover Defensive Net Points",
  badpass_t_net_pts: "Bad Pass Total Net Points",
  badpass_o_net_pts: "Bad Pass Offensive Net Points",
  badpass_d_net_pts: "Bad Pass Defensive Net Points",
  foul_t_net_pts: "Foul Total Net Points",
  foul_o_net_pts: "Foul Offensive Net Points",
  foul_d_net_pts: "Foul Defensive Net Points",
  fastbreak_t_net_pts: "Fastbreak Total Net Points",
  fastbreak_o_net_pts: "Fastbreak Offensive Net Points",
  fastbreak_d_net_pts: "Fastbreak Defensive Net Points",

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
  def_fouls: "Defensive Fouls",
  off_fouls: "Offensive Fouls",
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
// Metrics that come from player_details are named
// {action_type}_{side}_net_pts, like "3pt_t_net_pts"
function detailMetric(metric) {
  const m = metric.match(/^(.+)_([odt])_net_pts$/)
  return m ? { action: m[1], column: `${m[2]}_net_pts` } : null
}

// Get the metric column dynamically from the data
function getMetricValue(row, metric) {
  return row[metric] ?? 0
}
```

```js
// Dynamic data loading based on selected season and metric. player_details
// has one row per action_type, so load just the selected one, with the
// player's name, team and game date from player_box
const detail = detailMetric(selectedMetric)
const alldata = detail
  ? await sql([
      `SELECT b.game_id, b.player_name, b.team_abbrev, b.game_date,
        d.${detail.column} AS "${selectedMetric}"
      FROM players b
      LEFT JOIN player_details d
        ON d.season = b.season
        AND d.game_id = b.game_id
        AND d.player_id = b.player_id
        AND d.action_type = '${detail.action}'
      WHERE b.season = ${selectedSeason}
        AND b.game_type = 'regular_season'`,
    ])
  : await sql`
SELECT *
from players
where season=${selectedSeason}
and game_type = 'regular_season'
`
```

```js
const agg = await sql`
SELECT
  player_name,
  team_abbrev,
  count(*) n,
  sum(t_net_pts) t_net_pts
from players
where season=${selectedSeason}
and game_type = 'regular_season'
group by player_id, player_name, team_abbrev
having n > 0
order by t_net_pts desc
`
```

```js
// Build player options including team-specific entries for traded players
// For players on multiple teams, we create "Name (TEAM)" entries plus "Name (TOT)"
const aggArray = agg.toArray()

// Group by player name to find multi-team players
const playerTeams = new Map()
aggArray.forEach(p => {
  if (!playerTeams.has(p.player_name)) {
    playerTeams.set(p.player_name, [])
  }
  playerTeams.get(p.player_name).push(p.team_abbrev)
})

// Build the list of selectable player options
// Format: { displayName, name, team } where team is null for TOT
const playerOptions = []
playerTeams.forEach((teams, name) => {
  if (teams.length > 1) {
    // Multi-team player: add team-specific and TOT entries
    teams.forEach(team => {
      playerOptions.push({ displayName: `${name} (${team})`, name, team })
    })
    playerOptions.push({ displayName: `${name} (TOT)`, name, team: null })
  } else {
    // Single-team player: just use their name
    playerOptions.push({ displayName: name, name, team: teams[0] })
  }
})

// Sort by display name
playerOptions.sort((a, b) => a.displayName.localeCompare(b.displayName))

const allPlayerNames = playerOptions.map(p => p.displayName)

// Map from displayName to { name, team } for filtering data
const playerLookup = new Map(
  playerOptions.map(p => [p.displayName, { name: p.name, team: p.team }]),
)
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
  <div style="display: flex; gap: 10px; align-items: center; margin-bottom: 15px;">
    ${searchContainer}
    <button onclick=${clearAll} style="margin-left: 20px;padding: 5px 10px; cursor: pointer;">Clear All</button>
  </div>
  
  <div id="selected-chips" style="display: flex; flex-wrap: wrap; gap: 8px; min-height: 32px;">
    ${chips}
  </div>

  <div style="margin-top: 15px; display: flex; gap: 20px; flex-wrap: wrap; align-items: end;">
    <div>${seasonSelect}</div>
    <div>${metricSelect}</div>
    <div>${showDotsCheckbox}</div>
    <div style="width: 100%">${titleInput}</div>
    <div>${subtitleInput}</div>
  </div>
</div>

```js
// Calculate cumulative stats for each player using the selected metric
const cumulativeData = []
const playerCumulatives = new Map()

// Filter data based on selected players (which may include team constraints)
const selectedPlayerInfo = selectedPlayers
  .map(dp => ({
    displayName: dp,
    ...playerLookup.get(dp),
  }))
  .filter(p => p.name) // filter out any that weren't found

const sortedForCumulative = alldata
  .toArray()
  .map(p => ({ ...p, game_date: new Date(p.game_date) }))
  .filter(row => {
    // Check if this row matches any selected player
    return selectedPlayerInfo.some(sel => {
      if (row.player_name !== sel.name) return false
      // If team is null (TOT), include all teams; otherwise match team
      if (sel.team === null) return true
      return row.team_abbrev === sel.team
    })
  })
  .map(row => {
    // Add displayName to each row for grouping
    const match = selectedPlayerInfo.find(sel => {
      if (row.player_name !== sel.name) return false
      if (sel.team === null) return true
      return row.team_abbrev === sel.team
    })
    return { ...row, displayName: match?.displayName || row.player_name }
  })
  .sort((a, b) => {
    if (a.displayName !== b.displayName)
      return a.displayName.localeCompare(b.displayName)
    // Sort by game_date (not game_id, which is NOT chronological)
    return a.game_date - b.game_date
  })

sortedForCumulative.forEach(pt => {
  const metricValue = getMetricValue(pt, selectedMetric)
  const key = pt.displayName

  if (!playerCumulatives.has(key)) {
    playerCumulatives.set(key, { gameN: 0, cumValue: 0 })
    // Add starting point at zero
    cumulativeData.push({
      name: key,
      gameN: 0,
      cumValue: 0,
      gameDate: null,
      gameValue: 0,
    })
  }
  const state = playerCumulatives.get(key)
  state.gameN += 1
  state.cumValue += metricValue

  cumulativeData.push({
    name: key,
    gameN: state.gameN,
    cumValue: state.cumValue,
    gameDate: pt.game_date,
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
        // All net points and WPA metrics are floats (including detail breakdowns)
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
          x: { label: "Game Played", nice: true, labelAnchor: "center" },
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
                `${d.name}\nGame ${d.gameN}\nCumulative: ${formatValue(d.cumValue)}\nThis game: ${formatValue(d.gameValue)}`,
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
