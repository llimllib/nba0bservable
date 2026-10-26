# Rotations: both teams, with the margin between

Written 2026-10-26 from a design conversation. Update it when a decision
changes.

## What

The rotations tool shows the selected team's rotation on top, its
opponent's below, and the game's score margin between them, all on one
game-clock x axis, so a run in the margin reads straight up and down to who
was on the floor.

## Decisions

- **Still the selected team's chart.** The band keeps the team's color and
  the headline stays "Boston Celtics rotation". The opponent is context.
  Picking the other team flips the chart. Controls and URL are unchanged.
- **Opponent stints are colored from the opponent's side**: blue still means
  that player's group won the stint.
- **Team heads above their rows**, in agate on a rule, each with its own MIN
  and +/− column heads. Putting the bottom team's head under the axis was
  considered, for a mirror. It was rejected because the axis would sit
  between the head and its rows, and a head under its rows reads like a
  caption.
- **The margin graph** is four rows tall, from the selected team's side.
  Zero is the heaviest line. The fill is RdBu's lighter blue (`#92c5de`) where the team
  led and lighter red (`#f4a582`) where it trailed, and the sides are
  labeled "BOS ahead" and "PHI ahead", so position reads without color. The
  final margin is printed signed at the line's end.
- **The margin comes from `game_scoring`**, one row per scoring play, read
  one game at a time (`readWhere` in `kit/data.ts`, about 50KB a game). The
  last score holds to the end of the game. The legend says "score margin".
- **The line is simplified, not smoothed.** Every basket is a tooth at
  this scale (a point is about 5px at full height), so the line drawn after
  every play was jagged. Ramer-Douglas-Peucker keeps the plays more than
  8px off the line through their neighbors, plus every lead change and each
  side's biggest lead, and a monotone curve joins them, so it never passes
  a point it joins. Every point drawn is a real score, and the final margin
  is exact. The tolerance is in pixels, so a small export smooths more
  points away than a tall one. Rejected: steps (a spike wherever a basket
  was answered seconds later), sampling once a minute (it lost Boston's
  only lead in the test game), and a moving average (it shaved the peaks
  and ended at −6 in a game lost by 9).
- **The line is drawn in the fill's own blue and red**, as its edge,
  rather than in ink, which made every tooth stand out.
- **Without `game_scoring`** (2025, or a season nba_data hasn't published
  yet; the read fails and the tool falls back), the margin comes from the
  stints. A stint's plus-minus is the change in margin across it, so from
  0–0 the stints give the exact margin at every substitution, and nothing
  between. That line draws a dot at each point, and the legend says
  "margin at each sub". Where the two teams' stints disagree on one clock
  tick (free throws credited to the players on for the foul), the selected
  team's side wins.
- **Fixed export sizes** shrink all rows together. The margin graph drops
  to three rows when rows would be under 18px, and rows go down to 11px,
  with the names and bars shrinking with them, so two 13-player rotations
  fit a square.
- **No 16:9.** The band and legend left about 150px of plot for twenty-odd
  rows, and 16:9 had never been used, so it was dropped from the site.
