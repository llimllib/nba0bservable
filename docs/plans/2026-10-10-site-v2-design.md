# Step Back Club v2: design

The plan for replacing the Observable Framework site. Written 2026-10-10
from a design conversation; update it when a decision changes.

## What we're publishing

The site is mostly a **workbench** (Bill makes charts and posts them as
images on Bluesky), with some **current-season front page** for fans, and an
aspiration toward **writing** that has been hard to keep up.

So:

- **The image is the product.** The site is the factory and the link
  destination. Most people see a chart as a PNG in a feed, never the site.
- **Tools are the core.** A front page is a few tools at preset settings.
- **Writing must be nearly free.** Notes are a chart plus the take you'd
  have posted anyway, not essays.

Polish matches effort: these charts are sketches, not theses, and should
look like it where the take is concerned.

## Information architecture

Three sections:

- **Now**: four to six current-season charts, each a tool at a preset,
  each linking to its tool. No new chart types.
- **Tools**: six to eight chart tools. Candidates: player scatter (one tool
  with metric-pair presets, replacing ~12 copied pages), cumulative net
  points (season and career), player compare, player and team swarms, team
  diamond (ESPN / CTG / EPM), team shooting (four factors collapsed),
  playoff team net points. Not finalized; we'll find out by building.
- **Notes**: dated pages, each a chart (live tool state or a sketch, with
  frozen data) and a caption. The diamond tutorial and the net points design
  diary become the first two notes.

Cut or archive: table, sortable_table, players, tovpct, team_steals,
v2_experiment, epm_playoffs. College (four_factors) moves elsewhere.

URLs: tool state in readable query strings (`/playoffs?team=BOS&season=2026`)
so a shared link means something. Annotations, which are long and
unreadable anyway, go in a compressed `#a=` hash. The image prints only the
tool's URL (`billmill.org/nba/playoffs`): a reader types it in from a
picture, and a query string with player ids is too long to type
(decided 2026-10-25).

## Lessons from the predecessors

[nbastats](https://github.com/llimllib/nbastats) was a general scatterplot
builder with a filter language and shareable URLs. It got unwieldy: it
exposed rendering knobs (margins, ticks, label offsets) as options, and one
builder couldn't grow into other chart types. The Framework site overcorrected
into a page per chart and copied the scatter page twelve times.

Rules that follow:

1. **Three tiers of controls.**
   - _Question_ controls (season, team, metric preset, filter): a short bar
     above the chart, five at most. More means it's two tools.
   - _Framing_ (title, subtitle, labels, annotations, export size): done on
     the chart itself, not in a form.
   - _Rendering_ (margins, ticks, offsets): never exposed. If it looks
     wrong, fix the kit.
2. **A new chart type is new code, not a new option.** Each tool is a small
   module on a shared kit.
3. **The filter language comes back, in one place**: an advanced filter box
   on the player scatter, over a SQL `WHERE` when DuckDB is loaded.

## The frame

Every tool renders into one frame, which is what gets exported:

1. Header band: title (short, editable on the chart) and a generated deck
   ("Net points per game in the 2026 playoffs, through May 2"), in the
   team's color, with its logo.
2. Legend strip, for anything the chart can't explain itself, and counts.
3. The chart.
4. Footer: source, then the URL of the tool.

How it looks is in `2026-10-25-newspaper-design.md`.

Export sizes: square, 16:9, 4:5 portrait. PNG export in the browser
(SVG → canvas, fonts and images inlined).

## Visual design

Moved to `2026-10-25-newspaper-design.md`: newspaper-derived HTML
brutalism, with the color and annotation rules that were here.

## Rendering: a D3/SVG kit, not Plot

Plot makes simple charts fast but fights annotations, reference lines in
data coordinates, and rotated charts. Agents write the extra D3 verbosity
cheaply, so the kit is `d3-scale`, `d3-axis`, `d3-shape` and plain SVG:

- Each plot area has a `<clipPath>`; reference lines (ratio diagonals,
  quadrants) are drawn across the data domain and clipped.
- Diamonds rotate the data, not the SVG: project `(x, y)` to
  `((x − y)/√2, (x + y)/√2)` and draw unrotated, so labels and hit-testing
  work.
- Label placement carries over from `labels.ts`.

## Annotations

Built into every chart:

- Auto-placed labels by default. Click a mark to toggle its label; drag a
  label to move it (a leader line appears).
- Free text anywhere, and arrows from text to a point.
- Anchored to data: a label belongs to a `player_id`; free text sits in data
  coordinates. Annotations survive data refreshes and export-size changes.
- Serialized into the URL hash. The editor is public; publishing a note is
  local-only (writes JSON + Markdown into the repo).

## Architecture

- **Astro** for routing, static output and Markdown notes (no JS in Markdown;
  charts embedded by reference). Tools are TypeScript islands.
- **Tool contract**: a tool module exports `params` (typed schema; drives the
  control bar and URL state), `load(params)` and `render(rows, params,
  frame)`. Frame, export, annotations and URL state come free.
- **No data loaders.** Tools read nba_data's published parquet in the
  browser, so the site rebuilds only when code changes. See [Data](#data).
- **Notes freeze data**: a note stores tool state, the rows the chart used,
  and the caption, so it always shows what you saw when you posted.
- **Link previews**: Open Graph images generated at build time for tools and
  notes.

Risk: headshots (`cdn.nba.com`) and logos (ESPN) may not allow CORS, which
breaks canvas export. Fallback: nba_data mirrors them into the bucket.

## Data

Where data comes from, and how it gets updated. Settled 2026-10-24.

**One source: the published bucket.** Every tool reads nba_data v2 from
`https://basketball-data.billmill.org/nba/`, in production, in `npm run
dev`, in `npm run shot` and in tests. There is no local data mode: an
nba_data checkout's `out/` directory is half-built pipeline output, not a
published dataset, and reading it showed stale and mismatched data. The
bucket is coherent because nba_data checks every run (every key is in the
lookup tables) and publishes only if the checks pass. Data the checks
can't fix is flagged, not dropped: a tool filters on it, as the rotations
tool does with `matches_box_score`. Testing unpublished nba_data changes is nba_data's job, not
this site's.

**Read at run time, in the browser.** The site holds no data. A tool reads
the files it needs when the page loads, so a chart shows new data as soon
as nba_data publishes it, and the site rebuilds only when its code
changes. Pulling data at build time would bring back the Framework site's
rebuild-every-4-hours cron and its stale-until-rebuilt pages. The bucket
sends `max-age=3600`, so a browser can be up to an hour behind it. The
exception is notes, which freeze the rows they show on purpose.

**hyparquet by default; DuckDB-wasm only for SQL.** Each dataset is one
parquet file per season (`nba/<source>/<dataset>/season=<n>/data.parquet`),
and most tools want one season of two or three datasets. `kit/data.ts`
reads those with hyparquet (tens of KB of JS, ~0.45s per file measured),
only the columns asked for, with HTTP range requests.

The catalog, `nba/nba.duckdb`, holds no data: it's 290 KB of views over
the same parquet URLs, plus a `metadata` table. Querying it returns exactly
what hyparquet reads, so it's another way to query the one source, not a
second source. A tool that needs SQL (joins across seasons, the scatter
tool's filter language) loads DuckDB-wasm lazily and attaches the catalog.
The cost is why it isn't the default: about 8 MB gzipped plus the httpfs
extension, and ~1.7s for a cold one-season query.

**Joins happen in the tool.** Tools join datasets on their keys
(`game_id`, `player_id`, `team_id` with `season`) and get names from the
lookup tables (`team_seasons`, `player_seasons`, `games`), which
`lookups()` loads. Prefer deriving from fewer datasets when the data allows:
the rotations tool sums its stints for the final score rather than also
reading `team_game_logs`. If a join is too expensive in the browser,
nba_data publishes a small derived table for it.

**Seasons come from the data.** nba_data publishes `nba/metadata.json`,
the catalog's `metadata` table as JSON (per dataset: `first_season`,
`last_season`, `updated`), and the kit builds season controls from it,
so a new season appears without a code change. Until it exists, tools
list their seasons by hand.

## Working with agents

Two loops, neither exposed to visitors:

1. **Building tools**: you and an agent write tool modules in the repo. The
   repo supports this with the small tool contract, a template, a
   `npm run shot <tool>?<params>` command that renders a PNG (so the agent
   can see its output), access to the catalog via the DuckDB CLI, and
   AGENTS.md documenting the kit and these design rules.
2. **Exploring a question**: the agent writes a **sketch**, a one-file chart
   in `sketches/` on the same kit and frame. Sketches deploy unlisted and
   notes can embed them. A sketch you keep returning to gets promoted to a
   tool by adding a `params` schema.

question → sketch → (sometimes) tool.

## Prototype

Built in `v2/` on `main`, not pushed until it's worth keeping. Scope: one
tool end to end, **playoff team net points** (the chart actually posted),
with the frame, the annotation layer, PNG export and direct parquet reads.
It exercises the risky parts: export with cross-origin headshots, browser
data load time, label dragging, and the type and frame design.
