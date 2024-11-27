const res = await fetch(
  "https://www.basketball-reference.com/contracts/players.html",
);
const data = await res.text();

// download the web page and uncomment this for debugging
// import fs from "node:fs";
// const data = fs.readFileSync("players.html").toString();

const table = data.match(/<table.*id="player-contracts".*?<\/table>/ms)[0];
const rows = [...table.matchAll(/<tr.*?<\/tr>/g)];
const tabledata = rows
  .map((row) => {
    return Object.fromEntries(
      [
        ...row[0].matchAll(
          /<(?:td|th).*?data-stat="(.*?)".*?>(.*?)<\/(?:td|th)>/g,
        ),
      ].map((res) => [res[1], res[2]]),
    );
  })
  .filter((t) => t.team_id?.match(/\/contracts\//));

// clean up the data a bit
tabledata.forEach((t) => {
  // "player": "<a href=\"/players/f/freemja01.html\"><a href='/players/f/freemja01.html'>Javon Freeman-Liberty</a></a>",
  const [, playerId, player] = t.player.match(
    /\/players\/.*?\/(.*?).html.*?>.*?>(.*?)</,
  );
  t.player_id = playerId;
  t.player = player;
  t.team_id = t.team_id.match(/\/contracts\/(.*?).html/)[1];
  delete t.DUMMY;
  Object.keys(t).forEach((k) => {
    const val = Number(t[k].replaceAll(",", "").replaceAll("$", ""));
    if (isNaN(val)) return;
    t[k] = val;
  });
});

console.log(JSON.stringify(tabledata));
