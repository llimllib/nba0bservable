# Scores: a day's games at a glance

Written 2026-10-29 from a design conversation. Update it when a decision
changes.

## What

A page, `/scores`, with a small box score for every game on one day:
yesterday by default, any day by a date picker. It's for reading on the
site and taking the night in at a glance, not for posting, so it's a plain
HTML page, not a tool: no frame, no export, no annotations. Details live
elsewhere: each game links to its rotations, and later to a full box score.

## Decisions

- **Plain HTML, not a tool.** Exporting a whole night as one image was
  considered and rejected: it isn't something to post, and a 12-game night
  doesn't fit a 4:5 frame.
- **Name and place.** "Scores", a fourth nav item: `NOW · SCORES · TOOLS ·
  NOTES`. Not in the Tools catalog. The headline is the date in condensed
  caps ("TUESDAY, OCT 28"), like a sports section's agate page.
- **One game is about five lines of agate**, under 44 characters wide so it
  fits a 390px phone:

  ```
  MIA 129  ATL 117                  ROTATIONS →
         EFG%   TOV%  OREB%   FTR
  MIA    58.9   15.0   31.6   .17
  ATL    56.3   14.3   19.6   .09
  BY 12: SHOOT +3 · TOV 0 · REB +7 · FT +2
  ```

  The winner comes first and in bold. `ROTATIONS →` opens the game in the
  rotations tool.
- **Four factors from the NBA's `team_game_logs`**: eFG%, TOV% (turnovers
  per possession), OREB% (against the opponent's defensive rebounds) and
  FT rate (FTA/FGA). The better value in each column is bold, so it reads
  without color.
- **Why the winner won, from ESPN's `team_box`.** Each team's factor net
  points (`shooting_net_pts`, `turnover_net_pts`, `rebound_net_pts`,
  `freethrow_net_pts`) mean little alone (turnover net points are always
  negative), but the winner's minus the loser's, factor by factor, sums to
  the final margin exactly: MIA 129, ATL 117 is shooting +2.7, turnovers 0,
  rebounding +7.0, free throws +2.4. The line is signed from the winner's
  side; the biggest factor is underlined.
- **A newspaper grid**: one column on phones, two or three on desktop, rules
  between games.

## Dates

- `?date=2026-10-28`. Without it, the page shows yesterday in US Eastern
  time, the NBA's game dates. The default isn't written into the URL, so a
  bookmark keeps meaning "yesterday".
- Controls: `← PREV · [date input] · NEXT →`. Prev and next jump to the
  nearest day with games. Changing the date updates `?date=` without a
  reload.
- The season comes from the date: August on is the next season. The date
  input's range comes from `metadata.json`.

## Missing data

`games` lists only games that have been played and loaded; there's no
schedule. So the page can't tell an off day from a night not loaded yet,
and its messages say only what it knows.

| Case | The page shows |
|---|---|
| The default date has no games yet | The latest day with games: "No games in for Wed, Oct 29 yet; showing Tue, Oct 28." |
| A picked date has no games | "No games on Thu, Oct 30," with links to the nearest game days before and after |
| A season the bucket doesn't have | The same "no games", not an error |
| NBA logs, but no ESPN yet | The games, with the last line `NET POINTS NOT IN YET` |
| A read fails | "Couldn't load games for Oct 28," with a retry link; the date controls still work |
| Loading | The date heading, and "Loading…" under it |

ESPN is read apart from the NBA logs, so a slow or missing ESPN file never
holds up the scores.

## Code

- `src/pages/scores.astro`: the shell (headline, controls, an empty grid)
  and its script.
- `src/scores/load.ts`: data, no DOM. A day's games, each team's four
  factors, ESPN's factor differences (or `null`), the nearest game days.
- `src/scores/render.ts`: plain DOM, a `<table>` per game.
- `global.css`: the grid and the agate tables. Rules, no boxes.

## Testing

- `npm run shot -- "scores?date=2026-10-28" --dom` at 1100px and 390px: the
  grid folds, and nothing scrolls sideways on a phone.
- An off day, a future date, a season the bucket doesn't have, the default,
  and ESPN missing.
- For every game on Oct 28, the factor differences sum to the margin; one
  game's four factors match DuckDB.
- `npx astro check`, `npm run build`.
