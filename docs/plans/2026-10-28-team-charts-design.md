# Team charts: design

One team stat against another, every team's logo at its values for one
season: the team counterpart of Player charts (`src/tools/scatter.ts`).
It brings back v1's team scatters (`eff_vs_pace`, `team_steals`,
`team_field_goal_efficiency`, `srs`, `tovpct`, the diamonds) and adds the
opponent's side of the ball, which a player chart can't show. Written
2026-10-28 from a design conversation.

## The chart

A separate tool and page, `/teams`, "Team charts". Pairs are data, as in
Player charts. Sixteen, grouped in the Stats menu:

- **Offense and defense**: offensive by defensive rating; pace by
  offensive rating; luck (wins over expected by net rating); schedule (net
  rating by strength of schedule)
- **Shooting**: threes (3P% by 3PA per 100); twos; opponent threes;
  opponent twos; eFG% by opponent eFG%; FT rate by opponent FT rate; shot
  volume by shotmaking (points per shot by shots per 100); shot profile
  (rim share by 3-point share)
- **Playmaking**: assists by turnovers per 100
- **Four factors** (added 2026-10-30): Dean Oliver's four, each the
  team's against its opponents', with diagonals of the margin: eFG%,
  turnovers per 100 (forced on x, so x − y stays the margin), OREB%
  (replacing OREB% by DREB%, the same data, whose margin is a sum), and
  free throws made per shot attempt, Oliver's definition and the scores
  page's (it was attempts). eFG% and FT rate moved here from Shooting
- **Defense**: defensive rating by forced turnover rate; opponents' FG% at
  the rim by blocks per 100

**Marks.** Each team is a small dot at its exact value, in its colors, and
its logo as a callout: on the dot where there's room, otherwise moved to
the nearest clear spot with a thin leader line back to the dot. Position
is the value; logos never shrink or vanish, and every team gets one. The
logo is the team's name, so there are no text labels; each team is still a
`Mark`, so a click adds its abbreviation and notes and arrows attach to
it. A tooltip gives the team and both values.

Overlap was the open problem. Logos left on their values overlap in every
dense middle; shrinking them to fit lets one tight cluster shrink all 30;
halos still bury a team. The callout keeps position exact. If it doesn't
read, revisit here.

**Reversed axes.** A rate where lower is better (defensive rating, the
opponent's shooting) runs its axis backwards and says so in its title, so
up and right are better. Volume axes (opponent 3PA) aren't reversed: they
describe a style. Turnovers in assists-to-turnovers aren't either, as its
ratio lines start at zero.

**Guides**, from the kit, as in Player charts: dashed league averages and
named corners; ratio lines for assists to turnovers; and for a pair of a
side and its opposite (ratings, eFG%, FT rate), diagonals of constant
difference, the net, over the averages.

**League averages** come from the league's totals (its points over its
possessions), not the mean of 30 teams' rates.

## Controls

Four:

- **Stats**
- **Season**
- **Playoffs**: a toggle; playoffs include the play-in, as in the
  efficiency tool. Game-log pairs only, and only once there are playoff
  games
- **Games**: the efficiency tool's slider, each team's last 5, 10, … games
  or the season. Game-log pairs only

No team control: a note or an arrow points at a team.

## Data

Each pair names its source, as Player charts' stats do.

- **Game logs** (`stats/team_game_logs`, with `stats/games` for the game
  type and `stats/team_seasons` for abbreviations): each row joins its
  opponent's on `game_id`, so every column has an `opp_` twin. A team's
  games in the window are summed, then rates are taken from the sums
  (OREB% is oreb ÷ (oreb + opp dreb)), so a long game counts by its
  possessions. Thirteen pairs.
- **basketball-reference** (`bbref/bbref_team_stats`): one row per team,
  regular season only. Shot profile, rim protection and strength of
  schedule need it. Its shares are turned back into counts (rim attempts
  are `pct_fga_00_03 × fga`) so the league's average is from totals too.
  For these pairs `load` reports no playoffs and no windows, so those
  controls don't show and the deck says "regular season".

A stat is `get(totals)`; the league's value is the same `get` over the
league's totals.

## Code

- `src/kit/scatter.ts`: the plot Player charts drew for itself, moved to
  the kit: scales (reversible), grid, axes and their titles, average,
  ratio, sum and difference guides, corner names, the boxes labels avoid,
  and `invert`/`project` for notes. Each tool draws its own marks. Player
  charts moves first, in its own commit, checked by exporting a few pairs
  before and after.
- `src/kit/labels.ts`: `placeLogos`, beside `placeLabels`: places logo
  boxes by Voronoi cell and collision, as labels are, but never skips one.
- `src/tools/teams.ts` and `src/pages/teams.astro`; the catalog lists it.

## Later

- One season over a faint cloud of every past team-season, for pairs where
  history matters (pace, threes): the chosen season's logos in front.
- Cleaning the Glass as a source for the ratings pair, as in the
  efficiency tool.
