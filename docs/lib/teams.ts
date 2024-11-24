export interface Team {
  abbreviation: string;
  name: string;
  colors: string[];
  comment?: string;
  // a pair representing the years the team were active, [start, end]
  // Inclusive, and use the end year of a season, so the 2014-15 season would
  // be "2015". If a team is currently active, a single year represents the
  // year they started playing
  years?: [string, string] | [string];
}
export const teams: Map<string, Team> = new Map([
  [
    "ATL",
    {
      abbreviation: "ATL",
      name: "Atlanta Hawks",
      colors: ["#C8102E", "#FDB927", "#000000", "#9EA2A2"],
    },
  ],
  [
    "BOS",
    {
      abbreviation: "BOS",
      name: "Boston Celtics",
      colors: ["#008348", "#BB9753", "#000000", "#A73832", "#FFFFFF"],
    },
  ],
  [
    "BKN",
    {
      abbreviation: "BKN",
      name: "Brooklyn Nets",
      colors: ["#000000", "#FFFFFF", "#707271"],
    },
  ],
  // In the data on nba,
  [
    "CHAB",
    {
      abbreviation: "CHA",
      name: "Charlotte Bobcats",
      colors: ["#f26532", "#2f598c", "#959da0"],
      years: ["2005", "2014"],
    },
  ],
  [
    "CHI",
    {
      abbreviation: "CHI",
      name: "Chicago Bulls",
      colors: ["#CE1141", "#000000"],
    },
  ],
  [
    "CHA",
    {
      abbreviation: "CHA",
      name: "Charlotte Hornets",
      colors: ["#00788C", "#1D1160", "#A1A1A4", "#FFFFFF"],
    },
  ],
  [
    "CLE",
    {
      abbreviation: "CLE",
      name: "Cleveland Cavaliers",
      colors: ["#6F263D", "#FFB81C", "#041E42", "#000000"],
    },
  ],
  [
    "DAL",
    {
      abbreviation: "DAL",
      name: "Dallas Mavericks",
      colors: ["#0064B1", "#00285E", "#BBC4CA", "#000000"],
    },
  ],
  [
    "DEN",
    {
      abbreviation: "DEN",
      name: "Denver Nuggets",
      colors: ["#0E2240", "#FEC524", "#8B2131", "#244289"],
    },
  ],
  [
    "DET",
    {
      abbreviation: "DET",
      name: "Detroit Pistons",
      colors: ["#1D428A", "#C8102E", "#BEC0C2", "#000000", "#FFFFFF"],
    },
  ],
  [
    "GSW",
    {
      abbreviation: "GSW",
      name: "Golden State Warriors",
      colors: ["#1D428A", "#FDB927"],
    },
  ],
  [
    "HOU",
    {
      abbreviation: "HOU",
      name: "Houston Rockets",
      colors: ["#CE1141", "#9EA2A2", "#000000", "#373A36", "#FFFFFF"],
    },
  ],
  [
    "IND",
    {
      abbreviation: "IND",
      name: "Indiana Pacers",
      colors: ["#BEC0C2", "#FDBB30", "#002D62"],
    },
  ],
  [
    "LAC",
    {
      abbreviation: "LAC",
      name: "Los Angeles Clippers",
      colors: ["#C8102E", "#1D428A", "#000000", "#BEC0C2", "#FFFFFF"],
    },
  ],
  [
    "LAL",
    {
      abbreviation: "LAL",
      name: "Los Angeles Lakers",
      colors: ["#552583", "#FDB927", "#000000"],
    },
  ],
  [
    "MEM",
    {
      abbreviation: "MEM",
      name: "Memphis Grizzlies",
      colors: ["#5D76A9", "#12173F", "#707271", "#F5B112"],
    },
  ],
  [
    "MIA",
    {
      abbreviation: "MIA",
      name: "Miami Heat",
      colors: ["#000000", "#98002E", "#F9A01B"],
    },
  ],
  [
    "MIL",
    {
      abbreviation: "MIL",
      name: "Milwaukee Bucks",
      // moved secondary to tertiary bc it matches the bg
      colors: ["#00471B", "#0077C0", "#EEE1C6", "#000000", "#FFFFFF"],
    },
  ],
  [
    "MIN",
    {
      abbreviation: "MIN",
      name: "Minnesota Timberwolves",
      colors: ["#0C2340", "#78BE20", "#236192", "#9EA2A2", "#FFFFFF"],
    },
  ],
  [
    "NJN",
    {
      abbreviation: "NJN",
      name: "New Jersey Nets",
      colors: ["#000000", "#FFFFFF", "#707271"],
    },
  ],
  [
    "NOH",
    {
      abbreviation: "NOH",
      name: "New Orleans Hornets",
      colors: ["#00788C", "#1D1160", "#A1A1A4", "#FFFFFF"],
      years: ["2003", "2014"],
    },
  ],
  [
    "NOP",
    {
      abbreviation: "NOP",
      name: "New Orleans Pelicans",
      colors: ["#0A2240", "#8C734B", "#CE0E2D"],
      years: ["2014"],
    },
  ],
  [
    "NYK",
    {
      abbreviation: "NYK",
      name: "New York Knicks",
      colors: ["#006BB6", "#F58426", "#BEC0C2", "#000000", "#FFFFFF"],
    },
  ],
  [
    "OKC",
    {
      abbreviation: "OKC",
      name: "Oklahoma City Thunder",
      colors: ["#007AC1", "#EF3B24", "#FDBB30", "#002D62"],
    },
  ],
  [
    "ORL",
    {
      abbreviation: "ORL",
      name: "Orlando Magic",
      colors: ["#0077C0", "#000000", "#C4CED4"],
    },
  ],
  [
    "PHI",
    {
      abbreviation: "PHI",
      name: "Philadelphia 76ers",
      colors: [
        "#006BB6",
        "#C4CED4",
        "#ED174C",
        "#000000",
        "#002B5C",
        "#FFFFFF",
      ],
    },
  ],
  [
    "PHX",
    {
      abbreviation: "PHX",
      name: "Phoenix Suns",
      colors: ["#1D1160", "#E56020", "#000000", "#63727A", "#F9A01B"],
    },
  ],
  [
    "POR",
    {
      abbreviation: "POR",
      name: "Portland Trailblazers",
      colors: ["#E03A3E", "#FFFFFF", "#000000"],
    },
  ],
  [
    "SAC",
    {
      abbreviation: "SAC",
      name: "Sacramento Kings",
      colors: ["#5A2B81", "#63727A", "#000000"],
    },
  ],
  [
    "SAS",
    {
      abbreviation: "SAS",
      name: "San Antonio Spurs",
      colors: ["#000000", "#C4CED4"],
    },
  ],
  [
    "TOR",
    {
      abbreviation: "TOR",
      name: "Toronto Raptors",
      colors: ["#CE1141", "#000000", "#393A96", "#B4975A", "#FFFFFF"],
    },
  ],
  [
    "TOT",
    {
      abbreviation: "TOT",
      name: "Season Total",
      comment:
        "bbref uses TOT to indicate a player's season total if they were on more than one team",
      colors: ["#888888", "#888888"],
    },
  ],
  [
    "UTA",
    {
      abbreviation: "UTA",
      name: "Utah Jazz",
      colors: ["#F9A01B", "#00471B", "#002B5C"],
    },
  ],
  [
    "WAS",
    {
      abbreviation: "WAS",
      name: "Washington Wizards",
      colors: ["#002B5C", "#E31837", "#C4CED4", "#FFFFFF"],
    },
  ],
]);
