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
│   │   ├── *.parquet.sh         # Shell data loaders that query the nba_data catalog
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
- Reference data loaders via `FileAttachment("./data/player_box.parquet")` or the `sql` front-matter for DuckDB
- Use `@observablehq/plot` and D3 for visualization

## Data Sources and Loaders

Data loaders live in `docs/data/`. Observable Framework runs these on demand and caches results in `docs/.observablehq/cache/data/`. The file extension convention determines the output format (e.g., `foo.parquet.sh` produces a parquet file).

### Querying data locally

**Always use the cached parquet files** for ad-hoc queries and analysis. They live in `docs/.observablehq/cache/data/` and can be queried directly with DuckDB:

```sh
duckdb -c "SELECT * FROM 'docs/.observablehq/cache/data/player_box.parquet' LIMIT 5"
```

If the cache is empty, run the data loaders first: `npm run dev` (which triggers loaders on demand) or run the loader script directly (e.g. `bash docs/data/player_box.parquet.sh > docs/.observablehq/cache/data/player_box.parquet`). **Do not curl data sources directly** — always use the cached files or the loader scripts.

### Data sources

| Source | Loader files | What it provides |
|---|---|---|
| **[llimllib/nba_data](https://github.com/llimllib/nba_data)** v2 (sister repo; a DuckDB catalog at `https://basketball-data.billmill.org/nba/nba.duckdb`) | `player_season_stats.parquet.sh`, `player_game_logs.parquet.sh`, `team_game_logs.parquet.sh`, `player_box.parquet.sh`, `player_details.parquet.sh` | Player season stats, player and team game logs, ESPN box scores (including **net points** and WPA) |
| **[dunksandthrees.com](https://dunksandthrees.com)** | `epm.json.sh`, `epm.json.js`, `epm_season.json.js`, `epm_playoffs.json.sh` | EPM (Estimated Plus-Minus) data — scraped from HTML |
| **[cleaningtheglass.com](https://cleaningtheglass.com)** | `cleantheglass_teams.json.js` | Team summary stats — scraped from HTML |
| **[basketball-reference.com](https://www.basketball-reference.com)** | `bbref_2025.json.mjs`, `bbref_2026.json.mjs`, `bbref_salaries.json.mjs` | Team stats by season, player salary data — scraped from HTML |
| **ESPN Analytics** (S3 bucket) | `netpoints.json.sh` | Pre-aggregated net points per 100 possessions by player/season (same ESPN net points data as `player_box.parquet`, but pre-aggregated). Uses ESPN team abbreviations (`BRK`, `NOR`, `PHO`, `SAN`); `normalizeESPN` in `lib/teams.ts` converts them |

### nba_data v2 datasets

Each nba_data loader queries the v2 catalog with the DuckDB CLI (installed in CI by the publish workflow) and writes one v2 table, unchanged, plus lookup columns joined in: `player_name`, `team_abbrev` (NBA-style: `BKN`, `NOP`, `PHX`, `SAS`), and for game-level tables `game_date` and `game_type`. Every column is documented in nba_data's [DATA_DICTIONARY.md](https://github.com/llimllib/nba_data/blob/main/docs/DATA_DICTIONARY.md) ("v2" sections). Conventions:

- **Season:** `season` is an INTEGER, the ending year of the NBA season (`2026` = the 2025-26 season). The data runs through the current season, so pages that default to the latest season pick up a new one as soon as it starts
- **Ids are strings:** `player_id`, `team_id`, `game_id` are VARCHAR. Quote them in SQL (`player_id IN ('203999')`)
- **Game types:** filter on `game_type` (`preseason`, `regular_season`, `all_star`, `playoffs`, `play_in`, `cup_final`) rather than `game_id` prefixes. The NBA Cup final is not `regular_season`
- **Names** are the NBA's, with accents (`Nikola Jokić`), and a player has the same name in every season
- ⚠️ **`game_id` is NOT chronological.** Games on the same night can have non-sequential IDs. Sort by `game_date`
- Stats are totals; compute rates on the page (`fg3a / min * 36`, `tov / poss * 100`)

#### `player_season_stats.parquet` — Season totals per player (from NBA.com)
- **One row per player per `season_type`** (`regular_season` or `playoffs`). A player traded mid-season has one row, with `team_id` their last team, so don't sum players to get team totals; use `team_game_logs`
- Standard and advanced stats, 2-point shooting, and bio data

#### `player_game_logs.parquet` / `team_game_logs.parquet` — Game logs (from NBA.com)
- **One row per player (or team) per game**, every game type. Only players who played are listed
- `team_game_logs` has `team_name`, `opp_team_abbrev`, `home` and `win`. Season team stats come from summing it: ratings are `100 * sum(pts) / sum(poss)` and pace is `48 * sum(poss) / sum(min)`

#### `player_box.parquet` — ESPN per-game box scores with net points
- **One row per player per game.** `o_net_pts`, `d_net_pts`, `t_net_pts` (net points, positive = good), `o_wpa`, `d_wpa`, `t_wpa` (win probability added), `seconds_played`, and box score counts (`fgm`, `fga`, `ast`, `reb`, `stl`, `blk`, `tov`, `plus_minus`, ...)

#### `player_details.parquet` — ESPN net points by play type
- **One row per player, game and `action_type`** (`2pt`, `3pt`, `2ptShooting`, `assist`, `rim`, `layup`, `foul`, `freethrow`, `turnover`, `total`, ... 31 in all), with `o_net_pts`, `d_net_pts`, `t_net_pts`
- Get one column per action type with `sum(t_net_pts) FILTER (WHERE action_type = '3pt')`. Join `player_box` on `(game_id, player_id)` for names, teams and dates

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
- Data loaders write to stdout — shell scripts use `duckdb` or `curl`, JS scripts use `console.log(JSON.stringify(...))`
- Pages use Observable's reactive `js` fenced code blocks
- **Prefer DuckDB over Python** for querying and transforming parquet data. Use DuckDB CLI in shell data loaders or DuckDB WASM in the browser via `sql` front-matter. Avoid writing Python scripts for data processing when DuckDB can accomplish the same task.

## CI/CD

A single GitHub Actions workflow (`.github/workflows/publish.yml`) handles building and deploying the site:

- **Triggers:** pushes to `main`, a cron schedule every 4 hours (`7 0,4,8,12,16,20 * * *`), and manual `workflow_dispatch`
- **Build:** checks out the repo, sets up Node 24, runs `npm ci`, installs the DuckDB CLI (used by the data loaders), and runs `npm run build`
- **Deploy to DigitalOcean Spaces:** syncs `dist/` to an S3-compatible DO Space using `aws s3 sync`, then purges the DigitalOcean CDN cache (GitHub Pages deployment is also configured but currently broken)
- **Failure notification:** on build failure, opens a GitHub issue (or comments on an existing open one) to avoid an avalanche of duplicate notifications
- **Secrets required:** `DO_SPACES_ACCESS_KEY`, `DO_SPACES_SECRET`, `DO_CDN_API_KEY`, `DO_NBA_SPACES_ID`

## Transcripts

The `transcripts/` directory holds AI coding session transcripts (HTML and Markdown) documenting how features were built.
