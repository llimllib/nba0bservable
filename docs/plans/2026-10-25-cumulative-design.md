# Cumulative stats tool: design

Ports v1's "Cumulative Stats" (`docs/cumulative_net_points.md`) and "Career
Cumulative Stats" (`docs/career_cumulative.md`) as one tool. Written
2026-10-25 from a design conversation.

## The chart

A running total of one stat for a few players: x is games played, y the
sum so far, one line per player, names at the right edge. A season and a
career are the same chart over a different span of seasons, so they're
one tool.

## Controls

Four question controls:

- **Seasons**: one two-handle slider, `?from=2020&to=2026`. Both handles
  on one season is a season chart. A new `span` control kind in the kit,
  after hyzer.cloud's slider (two range inputs on one track, pointer events
  only on the thumbs), with square thumbs.
- **Include playoffs**: a toggle, off by default. On adds play-in and
  playoff games. The NBA Cup final is never counted, as the NBA leaves it
  out of regular-season stats.
- **Stat**: net points (T/O/D), WPA (T/O/D) and box score counts, all from
  ESPN's `player_box`, so a nine-season view reads a few MB. v1's play-type
  breakdowns (`player_details`, ~6 MB a season) are left out for now.
- **Players**: a new `players` control kind: search with chips, matched
  without case or accents ("jokic" finds Jokić). Stored as player ids
  (`players=203999,1628983`). Empty means the five leaders in the stat
  over the span, so the default view and any embed have something to show.

Dropped from v1: the per-team split for traded players ("Name (BOS)",
"Name (TOT)"), the "show game dots" toggle (a rendering knob), and the
title/subtitle inputs (the frame already edits those in place).

## Drawing

- Straight segments, not catmull-rom, which overshoots between games.
- Identity colors, not value colors: Okabe-Ito without vermilion (too
  close to the voice color) and yellow (unreadable on newsprint). Players
  past the sixth reuse colors with a dashed line. Names are direct labels
  in a right gutter, dodged so they don't overlap, so color is never the
  only way to tell lines apart; a line that ends early gets a dotted leader
  to its name.
- Zero is the strongest line; signed stats get signed ticks.
- Every game is an annotation mark (`<player>:<game>`), so a click labels
  it ("G41 · +212.4 · Jan 5") and arrows can point at it. Notes sit at
  `{g, v}`: games played and value.
