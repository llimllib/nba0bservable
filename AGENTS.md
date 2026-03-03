# AGENTS.md

## Project Overview

This is **Step Back Club**, an [Observable Framework](https://observablehq.com/framework) project that presents NBA data visualizations. It uses Observable's Markdown-based notebook format with D3 and Observable Plot for charting.

## Development

- **Dev server:** `npm run dev` — starts a local preview at http://localhost:3000
- **Build:** `npm run build` — generates a static site in `dist/`
- **Deploy:** `npm run deploy` — deploys to Observable
- **Clear data cache:** `make clear` — removes cached data loader outputs from `docs/.observablehq/cache/data/`
- **Clean cache (alt):** `npm run clean` — also clears the Observable cache
- **Node requirement:** >=18 (project uses Node 24)

## Repository Structure

```
.
├── docs/                        # Source root — all pages and data live here
│   ├── index.md                 # Home page
│   ├── *.md                     # Individual visualization pages (one per chart/topic)
│   ├── data/                    # Data loaders (shell scripts, JS, MJS)
│   │   ├── *.parquet.sh         # Shell data loaders that fetch parquet files
│   │   ├── *.json.sh            # Shell data loaders that fetch/produce JSON
│   │   ├── *.json.js            # Node.js data loaders that scrape and transform data
│   │   ├── *.json.mjs           # Node.js (ESM) data loaders
│   │   └── events.json          # Static data file
│   ├── lib/                     # Shared TypeScript modules (imported by pages)
│   │   ├── teams.ts             # Team metadata/colors
│   │   ├── labels.ts            # Label utilities
│   │   ├── util.ts              # General utilities (e.g. sliceQuantile)
│   │   ├── scatter.ts           # Scatter plot component
│   │   ├── lineEndLabels.ts     # Line chart end-label component
│   │   ├── sortable_table.ts    # Sortable table component
│   │   ├── espndiamond.ts       # ESPN diamond chart component
│   │   └── epmdiamond.ts        # EPM diamond chart component
│   └── .observablehq/cache/     # Cached data loader outputs (gitignored)
├── dist/                        # Built static site (gitignored)
├── transcripts/                 # AI coding session transcripts
├── observablehq.config.ts       # Observable Framework config (title, sidebar, interpreters)
├── queries.sh                   # Ad-hoc DuckDB queries against cached ESPN parquet data
├── Makefile                     # `make clear` to wipe data cache
├── package.json
└── tsconfig.json
```

## Pages

Each `.md` file in `docs/` is a page. Observable Framework uses file-based routing — `docs/efficiency.md` is served at `/efficiency`. Pages contain Markdown interspersed with fenced JavaScript code blocks that run in the browser. Pages can:

- Import shared modules from `docs/lib/` (e.g., `import { teams } from "./lib/teams.js"`)
- Reference data loaders via `FileAttachment("./data/playerstats.parquet")` or the `sql` front-matter for DuckDB
- Use `@observablehq/plot` and D3 for visualization

## Data Sources and Loaders

Data loaders live in `docs/data/`. Observable Framework runs these on demand and caches results in `docs/.observablehq/cache/data/`. The file extension convention determines the output format (e.g., `foo.parquet.sh` produces a parquet file).

### Querying data locally

**Always use the cached parquet files** for ad-hoc queries and analysis. They live in `docs/.observablehq/cache/data/` and can be queried directly with DuckDB:

```sh
duckdb -c "SELECT * FROM 'docs/.observablehq/cache/data/espn.players.parquet' LIMIT 5"
```

If the cache is empty, run the data loaders first: `npm run dev` (which triggers loaders on demand) or run the loader script directly (e.g. `bash docs/data/espn.players.parquet.sh > docs/.observablehq/cache/data/espn.players.parquet`). **Do not curl data sources directly** — always use the cached files or the loader scripts.

### Data sources

| Source | Loader files | What it provides |
|---|---|---|
| **[llimllib/nba_data](https://github.com/llimllib/nba_data)** (sister repo, served via GitHub Pages) | `playerstats.parquet.sh`, `playerstats_playoffs.parquet.sh`, `playerlogs.parquet.sh`, `gamelogs.parquet.sh`, `espn.players.parquet.sh`, `espn.player_details.parquet.sh`, `team_summary.json.sh` | Player stats, game logs, ESPN box scores (including **net points** and WPA), team summaries |
| **[dunksandthrees.com](https://dunksandthrees.com)** | `epm.json.sh`, `epm.json.js`, `epm_season.json.js`, `epm_playoffs.json.sh` | EPM (Estimated Plus-Minus) data — scraped from HTML |
| **[cleaningtheglass.com](https://cleaningtheglass.com)** | `cleantheglass_teams.json.js` | Team summary stats — scraped from HTML |
| **[basketball-reference.com](https://www.basketball-reference.com)** | `bbref_2025.json.mjs`, `bbref_2026.json.mjs`, `bbref_salaries.json.mjs` | Team stats by season, player salary data — scraped from HTML |
| **ESPN Analytics** (S3 bucket) | `netpoints.json.sh` | Pre-aggregated net points per 100 possessions by player/season (same ESPN net points data as `espn.players.parquet`, but pre-aggregated) |

### Key parquet datasets

#### `espn.players.parquet` — Per-game player box scores with net points (from ESPN)
- **One row per player per game.** Contains ESPN's net points metrics and play-type event counts.
- **Key columns:** `season`, `game_id`, `player_id`, `team`, `name`, `played`, `minutes_played` (string, format `"MM:SS"`), `starter`, `pts`, `plusMinusPoints`
- **Net points columns:** `oNetPts` (offensive), `dNetPts` (defensive), `tNetPts` (total) — per-game values, positive = good
- **WPA columns:** `oWPA`, `dWPA`, `tWPA` — win probability added
- **Play-type event counts:** `assister`, `rebounder`, `stlr`, `blkr`, `tov1`, `fgmplyr`, `fgaplyr`, `fg3mplyr`, `ftmplyr`, `ftaplyr`, `orebounder`, etc.
- **Season convention:** `season` is the ending year of the NBA season (e.g. `2026` = the 2025-26 season)
- **Team abbreviations:** ESPN-style — notably `BRK` (not BKN), `NOR` (not NOP), `PHO` (not PHX), `SAN` (not SAS)

#### `espn.player_details.parquet` — Per-game net points broken down by play type
- **One row per player per game.** Same grain as `espn.players.parquet`.
- **Key columns:** `playerId`, `gameId`, `name`, `team`, `season`
- **Play-type net points:** columns follow the pattern `{playtype}_{side}NetPts` where play types include `2pt`, `2ptShooting`, `3pt`, `3ptShooting`, `assist`, `block`, `foul`, `freeThrow`, `rebound`, `rim`, `turnover`, `fastbreak`, `putback`, `stoppage`, `timeout`; and side is `o` (offensive), `d` (defensive), `t` (total)
- **Totals:** `total_oNetPts`, `total_dNetPts`, `total_tNetPts`
- ⚠️ Note: join key columns are named differently from `espn.players.parquet` — `playerId` (not `player_id`), `gameId` (not `game_id`)

#### `gamelogs.parquet` — Team-level game logs (from NBA.com)
- **One row per team per game.** Standard box score stats plus advanced stats.
- **Key columns:** `season_year` (string like `"2025-26"`), `game_id`, `game_date` (ISO datetime string), `team_id`, `team_abbreviation`, `team_name`, `matchup`, `wl`, `min`
- **Important:** This is the only dataset with `game_date`. To get dates for ESPN player games, join on `game_id`.
- **Team abbreviations:** NBA.com-style — `BKN`, `NOP`, `PHX`, `SAS` (different from ESPN data)
- ⚠️ **`game_id` is NOT chronological.** Games on the same night can have non-sequential IDs. Always join to `gamelogs.parquet` for `game_date` when you need chronological ordering.

#### `playerstats.parquet` — Season-aggregated player stats (from NBA.com)
- **One row per player per team per season** (players traded mid-season have one row per team plus a `TOT` total row). 235 columns.
- **Key columns:** `player_id`, `player_name`, `team_abbreviation`, `team_count` (>1 if traded), `player_last_team_abbreviation`, `gp`, `min`, `pts`, `ast`, `reb`, etc.
- **Includes:** standard stats, advanced stats (off/def rating, usage, etc.), shooting splits, and demographic info (height, weight, college, draft info)
- **Team abbreviations:** NBA.com-style

### Team abbreviation mapping (ESPN ↔ NBA.com)

| ESPN | NBA.com |
|------|---------|
| BRK  | BKN     |
| NOR  | NOP     |
| PHO  | PHX     |
| SAN  | SAS     |

### Refreshing data

To force data loaders to re-run, clear the cache:

```sh
make clear
# or
npm run clean
```

Then restart the dev server or rebuild. Loaders will re-execute and re-fetch.

## Shared Libraries

TypeScript modules in `docs/lib/` are shared across pages. Pages import them with `.js` extensions (Observable compiles TS automatically):

```js
import { teams } from "./lib/teams.js"
import { sliceQuantile } from "./lib/util.js"
```

## Key Technologies

- **Observable Framework** — Markdown-based reactive notebook platform
- **Observable Plot** / **D3** — charting and data visualization
- **DuckDB (WASM)** — SQL queries against parquet files in the browser (via `sql` front-matter)
- **Prettier** — code formatting (no semicolons, avoid parens on single arrow params)

## Style Conventions

- No semicolons (Prettier config: `"semi": false`)
- Arrow function parens avoided for single params (`"arrowParens": "avoid"`)
- Data loaders write to stdout — shell scripts use `curl`, JS scripts use `console.log(JSON.stringify(...))`
- Pages use Observable's reactive `js` fenced code blocks
- **Prefer DuckDB over Python** for querying and transforming parquet data. Use DuckDB CLI in shell data loaders or DuckDB WASM in the browser via `sql` front-matter. Avoid writing Python scripts for data processing when DuckDB can accomplish the same task.

## CI/CD

A single GitHub Actions workflow (`.github/workflows/publish.yml`) handles building and deploying the site:

- **Triggers:** pushes to `main`, a cron schedule every 4 hours (`7 0,4,8,12,16,20 * * *`), and manual `workflow_dispatch`
- **Build:** checks out the repo, sets up Node 24, runs `npm ci` and `npm run build`
- **Deploy to DigitalOcean Spaces:** syncs `dist/` to an S3-compatible DO Space using `aws s3 sync`, then purges the DigitalOcean CDN cache (GitHub Pages deployment is also configured but currently broken)
- **Failure notification:** on build failure, opens a GitHub issue (or comments on an existing open one) to avoid an avalanche of duplicate notifications
- **Secrets required:** `DO_SPACES_ACCESS_KEY`, `DO_SPACES_SECRET`, `DO_CDN_API_KEY`, `DO_NBA_SPACES_ID`

## Transcripts

The `transcripts/` directory holds AI coding session transcripts (HTML and Markdown) documenting how features were built.
