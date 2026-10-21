# AGENTS.md (v2)

The Step Back Club rewrite: Astro + a small D3/SVG chart kit, reading nba_data
v2 parquet directly in the browser. The design and its reasons are in
`docs/plans/2026-10-10-site-v2-design.md`; read it before adding a tool.

## Commands

- `npm run dev:local`: dev server reading parquet from `../../nba_data/out`
  (override with `NBA_DATA_DIR`). `npm run dev` reads the CDN instead
- Astro 7's dev server is a **background daemon**. `pkill` doesn't stop it;
  use `npx astro dev stop`. If code changes don't show up, a stale daemon is
  the likely cause
- `npm run shot -- "playoffs?team=BOS&season=2026"`: clicks Export PNG and
  saves the result to `shots/`, so you can look at what you built. `--dom`
  screenshots the page instead
- `node scripts/annotate-test.mjs`: drives labels, notes and arrows, reloads
  from the URL hash, and exports `shots/annotated.png`
- `npx astro check`: type check

## Layout

- `src/kit/`: shared by every tool
  - `tool.ts`: the tool contract (`load`, `controls`, `describe`, `render`)
  - `frame.ts`: title, context line + legend, body, footer with the URL
  - `annotate.ts`: labels on marks (data typography) and notes/arrows
    (hand-drawn, voice color)
  - `mount.ts`: wires a tool to the page, URL state and export
  - `data.ts`: hyparquet reads of `nba/<source>/<dataset>/season=<n>/data.parquet`
  - `theme.ts`: colors, type scale, fonts
- `src/tools/`: one module per tool
- `src/pages/`: one page per tool, plus Now / Tools / Notes

## Rules

- Question controls only (season, team, metric): five at most. No rendering
  knobs; fix the kit instead
- Color: team colors for identity, `pos`/`neg` for value, `voice` only for
  annotations
- Zero is the strongest line on a signed axis
- Data reference: `~/code/nba_data/docs/DATA_DICTIONARY.md`

## Known issues

- `cdn.nba.com` headshots send no CORS headers, so exports drop them. ESPN
  logos (`a.espncdn.com`) allow CORS. Fix: mirror headshots in nba_data's
  bucket
