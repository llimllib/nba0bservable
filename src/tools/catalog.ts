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
    href: "rotations",
    name: "Rotations",
    blurb: "Who played when in a game, and the score margin in each stint.",
    takes: ["Season", "Team", "Game"],
  },
]
