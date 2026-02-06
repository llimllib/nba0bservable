---
theme: cotton
title: Cumulative Net Points
toc: false
sql:
  players: ./data/espn.players.parquet
  gamelogs_raw: ./data/gamelogs.parquet
---

# Cumulative Net Points

```js
import { teams } from "./lib/teams.js"
```

```sql id=alldata
SELECT *
from players
where season=2025
and game_id LIKE '002%' or game_id LIKE '003%'
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
  history.replaceState(null, "", newHash ? `#${newHash}` : window.location.pathname)
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
const searchContainer = html`<div style="position: relative; flex: 1; max-width: 300px;">
  <input
    type="text"
    placeholder="Search for a player..."
    style="width: 100%; padding: 6px 10px; font-size: 14px; border: 1px solid var(--theme-foreground-fainter); border-radius: 4px;"
  />
  <div class="dropdown-container" style="position: absolute; top: 100%; left: 0; right: 0; z-index: 1000;"></div>
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
    div.style.cssText = "padding: 8px 12px; cursor: pointer; border-bottom: 1px solid var(--theme-foreground-faintest);"
    div.onmouseenter = () => div.style.background = "var(--theme-foreground-faintest)"
    div.onmouseleave = () => div.style.background = "transparent"
    div.onmousedown = () => {
      addPlayer(name)
      searchInput.value = ""
      dropdownEl.innerHTML = ""
    }
    return div
  })
  
  const container = document.createElement("div")
  container.style.cssText = "max-height: 250px; overflow-y: auto; background: var(--theme-background); border: 1px solid var(--theme-foreground-fainter); border-radius: 4px; box-shadow: 0 4px 12px rgba(0,0,0,0.15); margin-top: 2px;"
  items.forEach(item => container.appendChild(item))
  
  if (filtered.length > 20) {
    const more = document.createElement("div")
    more.style.cssText = "padding: 8px 12px; color: var(--theme-foreground-muted); font-style: italic;"
    more.textContent = `...and ${filtered.length - 20} more`
    container.appendChild(more)
  }
  
  dropdownEl.innerHTML = ""
  dropdownEl.appendChild(container)
}

searchInput.oninput = updateDropdown

searchInput.onkeydown = (e) => {
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
  setTimeout(() => { dropdownEl.innerHTML = "" }, 150)
}

searchInput.onfocus = () => {
  if (searchInput.value) updateDropdown()
}
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

// Update URL when subtitle changes
{
  const params = new URLSearchParams(window.location.hash.slice(1))
  if (subtitle) {
    params.set("subtitle", subtitle)
  } else {
    params.delete("subtitle")
  }
  const newHash = params.toString()
  history.replaceState(null, "", newHash ? `#${newHash}` : window.location.pathname)
}
```

```js
// Reactively update chips
const chips = selectedPlayers.length === 0
  ? html`<span style="color: var(--theme-foreground-muted); font-style: italic;">No players selected. Search above to add players.</span>`
  : html`${selectedPlayers.map(name => html`<span style="display: inline-flex; align-items: center; gap: 5px; background: var(--theme-foreground-faintest); border: 1px solid var(--theme-foreground-fainter); border-radius: 16px; padding: 4px 8px 4px 12px; font-size: 14px;">
      ${name}
      <button
        onclick=${() => removePlayer(name)}
        style="background: none; border: none; cursor: pointer; padding: 2px 4px; font-size: 16px; line-height: 1; border-radius: 50%; display: flex; align-items: center; justify-content: center;"
        title="Remove ${name}"
      >×</button>
    </span>`)}`
```

<div class="card">
  <h2>Select Players</h2>
  <div style="display: flex; gap: 10px; align-items: center; margin-bottom: 15px;">
    ${searchContainer}
    <button onclick=${clearAll} style="padding: 5px 10px; cursor: pointer;">Clear All</button>
  </div>
  
  <div id="selected-chips" style="display: flex; flex-wrap: wrap; gap: 8px; min-height: 32px;">
    ${chips}
  </div>

  <div style="margin-top: 15px;">
    <label style="font-size: 14px; margin-right: 8px;">Chart subtitle:</label>
    ${subtitleInput}
  </div>
</div>

```js
// Calculate cumulative net points for each player
const cumulativeData = []
const playerCumulatives = new Map()

const sortedForCumulative = alldata
  .toArray()
  .map(p => ({ ...p }))
  .filter(x => selectedPlayers.includes(x.name))
  .sort((a, b) => {
    if (a.name !== b.name) return a.name.localeCompare(b.name)
    return a.game_id.localeCompare(b.game_id)
  })

sortedForCumulative.forEach(pt => {
  if (!playerCumulatives.has(pt.name)) {
    playerCumulatives.set(pt.name, { gameN: 0, cumNetPts: 0 })
    // Add starting point at zero
    cumulativeData.push({
      name: pt.name,
      gameN: 0,
      cumNetPts: 0,
      gameDate: null,
      tNetPts: 0,
    })
  }
  const state = playerCumulatives.get(pt.name)
  state.gameN += 1
  state.cumNetPts += pt.tNetPts

  cumulativeData.push({
    name: pt.name,
    gameN: state.gameN,
    cumNetPts: state.cumNetPts,
    gameDate: dates.get(pt.game_id),
    tNetPts: pt.tNetPts,
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
          Select players above to see their cumulative net points over the
          season.
        </p>
      </div>`
    : (() => {
        const plot = Plot.plot({
          title: `Cumulative Net Points`,
          subtitle: subtitle || undefined,
          caption: "Data from espnanalytics.com",
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
              y: "cumNetPts",
              stroke: "name",
              strokeWidth: 2,
              curve: "catmull-rom",
              tip: true,
              title: d =>
                `${d.name}\nGame ${d.gameN}\nCumulative: ${d.cumNetPts.toFixed(1)}\nThis game: ${d.tNetPts.toFixed(1)}`,
            }),
            Plot.text(
              cumulativeData.filter(d => {
                const playerData = cumulativeData.filter(p => p.name === d.name)
                return d.gameN === Math.max(...playerData.map(p => p.gameN))
              }),
            {
              x: "gameN",
              y: "cumNetPts",
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
