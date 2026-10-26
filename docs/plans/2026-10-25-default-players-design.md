# Default players and the deck's "who": design

Revises the Players control in `2026-10-25-cumulative-design.md`. Written
2026-10-25 from a design conversation.

## The problem

With no players picked, cumulative stats shows the five leaders in the stat.
Two things went wrong:

- Nothing said so. The leaders looked like anyone's picks, and the deck
  didn't mention them.
- `normalize` wrote the leaders into the URL as picks. To build your own
  chart you removed four chips, added yours, and removed the fifth.
  Removing all five brought them back.

## Players

- An empty `players` stays empty in the URL. It means "the leaders in the
  stat over the span", which stays true as a season goes on.
- The `players` control takes a `fallback`: a label and the ids shown when
  nothing is picked. They're drawn as muted chips under "Leaders in net
  points, until you add a player".
- Adding a player replaces the leaders. Removing a leader keeps the other
  four as picks, for "these leaders but not him".

## The deck's who

A chart that's posted as an image has no controls, so the deck says who's
on it.

- `Description.who` is an optional sentence in front of the deck. With no
  players picked, cumulative's is "The five leaders in net points."; with
  players picked, it's empty, as their names are on the chart.
- A tool that sets `who`, even to "", gets a who edit: a click on the deck
  edits only that sentence, kept as `?who=` in the URL. The rest of the
  deck stays generated, so it follows the seasons and the stat. "The top
  five of the 2024 draft class" stays put when you change seasons.
- Clear resets it, as it does a custom headline. Tools without `who` keep
  editing the whole deck.

## Finding the edits

The headline and deck didn't look editable. On hover they're underlined
and say "Click to rewrite", and the hint under the actions leads with it.
The edit box also opened at twice the deck's size on a two-line deck; it
now matches the deck and wraps like it.
