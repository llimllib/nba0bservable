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
- **The margin comes from `game_events`**, nba_data's play-by-play, read
  one game at a time (`readWhere` in `kit/data.ts`; its footer is about
  106KB, so the first read is 128KB). Its scoring plays (`pts > 0`) give the
  margin. The last score holds to the end of the game. The legend says
  "score margin". It replaced `game_scoring`.
- **Personal fouls are ink discs** hanging from the bottom edge of the
  player's bar, at the moment of the foul, numbered with the player's count
  (6 is fouling out). Ink keeps them apart from the blue and red values,
  and the digit means they don't rely on color. When bars are too short for
  a digit (under 16px, as in the square export), they're plain dots, so the
  legend is a plain dot, "personal foul", true at every size. A foul right
  after another is nudged along so both read. Foul trouble is the point:
  a starter benched with two early, or a stint cut short by a fifth.
- **Fouls are counted, not read from the description.** The description's
  count (`P4.T2`) is missing from some fouls (the NBA leaves the
  description as just "Shooting") and is repeated on technicals, which
  carry it without adding to it. The tool counts every `Foul` with a
  `person_id` except technicals, flopping, bench and defensive 3 seconds
  (a team technical that carries the player's id). In 2026-2027, 99.85% of
  player games match the box score's PF; in the misses checked, the
  play-by-play's own counts agree with the tool and the box score doesn't.
- **The line is a step after every scoring play.** The score changes only
  at a basket, so the margin holds flat until the next one, and every play
  is drawn. A basket answered seconds later leaves a thin spike, which is a
  real lead, however brief. This replaced a Ramer-Douglas-Peucker
  simplification joined by a monotone curve, whose diagonals and loops
  drew scores that never happened between the plays. Also rejected:
  sampling once a minute (it lost Boston's only lead in the test game) and
  a moving average (it shaved the peaks and ended at −6 in a game lost
  by 9).
- **The line is drawn in the fill's own blue and red**, as its edge,
  rather than in ink, which made every tooth stand out.
- **Without `game_events`** (a season nba_data hasn't published yet; the
  read fails and the tool falls back), there are no fouls and the legend
  leaves them out, and the margin comes from the
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
