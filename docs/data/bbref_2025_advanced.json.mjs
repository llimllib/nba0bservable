const res = await fetch(
  "https://www.basketball-reference.com/leagues/NBA_2025.html",
);
const data = await res.text();
const table = data.match(/<table.*id="advanced-team".*?<\/table>/)[0];
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
  .filter((t) => t.team?.match(/\/teams\//));
// clean up the data a bit
tabledata.forEach((t) => {
  t.team = t.team.match(/\/teams\/(.*?)\//)[1];
  delete t.DUMMY;
  Object.keys(t).forEach((k) => {
    const val = Number(t[k].replaceAll(",", ""));
    if (isNaN(val)) return;
    t[k] = val;
  });
});
console.log(JSON.stringify(tabledata));
