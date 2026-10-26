# Team efficiency tool: design

Offensive and defensive efficiency for every team, replacing v1's diamonds
(`docs/diamond.md`, `docs/ctg_diamond.md`) and building on its sortable
table (`docs/sortable_table.md`). Written 2026-10-25 from a design
conversation.

## Why not a diamond or a scatter

The diamond puts net rating straight up, which is right, but most readers
find it confusing. A scatter of offense against defense (Hollinger's
"efficiency landscape") reads height as better, so whichever rating is on y
looks more important: a team that's +8 on offense and −2 on defense looks
better than one that's −2 and +8, though both are +6.

So the vertical is a ranking, not a scale, and a strip beside it shows the
gaps a ranking hides.

## The chart

A table, one row per team, sorted by net, offense or defense:

- **Columns**: net, offense, defense. Each cell is a small bar from a strong
  zero line and a signed number. All three share one scale and positive is
  always better than average, so offense and defense bars add up to the net
  bar. Bars are `pos`/`neg`; the sign and the side of zero carry the value.
- **Relative to average**: every number is points per 100 possessions
  better or worse than the average of the teams shown (for the playoffs,
  the playoff teams). The average is the plain mean of the teams' ratings,
  as CTG publishes no possessions; with it, offense + defense = net
  exactly. Raw ratings may come back: this is the first thing to look at.
- **The strip**: a column on the right with each team's logo at its value
  in the sorted column, on a true scale, nudged sideways where logos
  collide. It shows tiers: OKC alone at the top, BOS and DEN side by side.
  The average is its zero line.
- The sorted column's header gets a ▼, so an exported image says how it's
  sorted.

## Controls

Five, the most allowed:

- **Season**
- **Source**: NBA.com or Cleaning the Glass. They're the same chart over a
  different definition (CTG removes garbage time), so one tool; switching
  between them shows which teams garbage time flatters.
- **Playoffs**: a toggle. Playoffs include the play-in, as CTG's do.
- **Games**: each source's own windows, reset to its default (the whole
  season) when the source changes:
  - NBA: a slider in steps of 5 games (each team's last 5, 10, 15, …),
    up to the most games any team has played, with the whole season at
    the right end. NBA ratings are summed over the window: 100 × points ÷
    possessions, with points allowed as `pts − plus_minus`.
  - CTG: the season or the last two weeks; just the season in the
    playoffs.
  - Stored as `?last=10` or `?last=2wk`; empty is the season.
- **Sort**: net, offense or defense.

## Data

- NBA: `stats/team_game_logs` with `stats/games` for the game type and
  `stats/team_seasons` for abbreviations, 2010 on.
- CTG: `ctg/ctg_team_summary`, 2010 on.

## Later

- Clicking a column header to sort. The tool contract has no way for a
  chart to set a param yet.
