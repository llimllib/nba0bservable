// The tools, for the pages that list them
export const catalog = [
  {
    href: "shooting",
    name: "Shooting by usage",
    blurb:
      "True shooting against usage rate for the players who take the most shots.",
    takes: ["Season", "Games", "Team", "Top %"],
  },
  {
    href: "playoffs",
    name: "Playoff net points",
    blurb: "Every player's net points in every playoff game, by team.",
    takes: ["Season", "Team", "Min. MPG"],
  },
  {
    href: "cumulative",
    name: "Cumulative stats",
    blurb:
      "The running total of a stat, game by game, for players over a season or a career.",
    takes: ["Seasons", "Playoffs", "Stat", "Players"],
  },
  {
    href: "efficiency",
    name: "Team efficiency",
    blurb:
      "Every team's offense and defense against the average, ranked, with the gaps to scale.",
    takes: ["Season", "Source", "Playoffs", "Games", "Sort"],
  },
  {
    href: "rotations",
    name: "Rotations",
    blurb:
      "Who played when in a game for both teams, the score margin in each stint, and the game's margin between them.",
    takes: ["Season", "Team", "Game"],
  },
]
