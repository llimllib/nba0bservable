---
theme: cotton
title: How to Make a Diamond Chart in Observable Plot
toc: false
---

# How to Make a Diamond Chart in Observable Plot

&nbsp;

## Download the data

```js echo
const { teams, updated } = await d3.json(
  "https://nba-data.sfo3.cdn.digitaloceanspaces.com/team_summary_2026.json",
)
const stats = Object.values(teams)
display(stats)
display(`updated date: ${updated}`)
```

## Make a scatterplot

```js echo
display(
  Plot.plot({
    marks: [Plot.dot(stats, { x: "OFF_RATING", y: "DEF_RATING" })],
  }),
)
```

## Add some plot features

- Add a title
- Add a grid
- reverse the defensive efficiency axis
- remove the default axis titles
- Make it square
- Add tooltips
- use team logos instead of dots

```js echo
display(
  Plot.plot({
    title: "Team efficiency",
    width: 600,
    height: 600,
    grid: true,
    x: {
      label: null,
    },
    y: {
      reverse: true,
      label: null,
    },
    marks: [
      Plot.image(stats, {
        x: "OFF_RATING",
        y: "DEF_RATING",
        width: 40,
        height: 40,
        src: d =>
          `https://llimllib.github.io/nbastats/logos/${d.TEAM_NAME}.svg`,
      }),
      Plot.tip(
        stats,
        Plot.pointer({
          x: "OFF_RATING",
          y: "DEF_RATING",
          title: team =>
            `${team.TEAM_NAME}\nOffensive rating: ${team.OFF_RATING}\nDefensive rating: ${team.DEF_RATING}`,
        }),
      ),
    ],
  }),
)
```

## Add colored squares

- Calculate the extent of the data being graphed and the midpoints
- draw four rectangles
- make the x axis and y axis explicit marks, so that they get drawn over top of the rectangles

```js echo
const [xMin, xMax] = d3.extent(stats, d => d.OFF_RATING)
const [yMin, yMax] = d3.extent(stats, d => d.DEF_RATING)
const xMid = xMin + (xMax - xMin) / 2
const yMid = yMin + (yMax - yMin) / 2
const rects = [
  [xMin, yMin, xMid, yMid],
  [xMid, yMin, xMax, yMid],
  [xMin, yMid, xMax, yMax],
  [xMid, yMid, xMax, yMax],
]
display(
  Plot.plot({
    title: "Team efficiency",
    width: 600,
    height: 600,
    y: { reverse: true },
    marks: [
      Plot.rect(rects, {
        x1: "0",
        y1: "1",
        x2: "2",
        y2: "3",
        fill: ["#fbe8c8", "#e2e6cf", "#f8d9d4", "#fbe8c8"],
      }),
      Plot.axisX({ anchor: "bottom", grid: true, label: null, ticks: 4 }),
      Plot.gridX({ ticks: 4 }),
      Plot.axisY({ anchor: "left", grid: true, label: null, ticks: 4 }),
      Plot.gridY({ ticks: 4 }),
      Plot.image(stats, {
        x: "OFF_RATING",
        y: "DEF_RATING",
        width: 40,
        height: 40,
        src: d =>
          `https://llimllib.github.io/nbastats/logos/${d.TEAM_NAME}.svg`,
      }),
      Plot.tip(
        stats,
        Plot.pointer({
          x: "OFF_RATING",
          y: "DEF_RATING",
          title: team =>
            `${team.TEAM_NAME}\nOffensive rating: ${team.OFF_RATING}\nDefensive rating: ${team.DEF_RATING}`,
        }),
      ),
    ],
  }),
)
```

## Rotate the plot

- rotate the whole plot
  - plot doesn't have a `rotate` option on the top-level plot, so we use CSS to rotate the SVG node
- rotate the images
- rotate the axis ticks
- remove the tooltip mark, because it doesn't rotate
  - use an SVG title element instead

```js echo
const diamond = Plot.plot({
  width: 600,
  height: 600,
  grid: true,
  y: {
    reverse: true,
  },
  marks: [
    Plot.rect(rects, {
      x1: "0",
      y1: "1",
      x2: "2",
      y2: "3",
      fill: ["#fbe8c8", "#e2e6cf", "#f8d9d4", "#fbe8c8"],
    }),
    Plot.axisX({ anchor: "bottom", label: null, ticks: 4, tickRotate: 45 }),
    Plot.gridX({ ticks: 4 }),
    Plot.axisY({ anchor: "left", label: null, ticks: 4, tickRotate: 45 }),
    Plot.gridY({ ticks: 4 }),
    Plot.image(stats, {
      x: "OFF_RATING",
      y: "DEF_RATING",
      width: 40,
      height: 40,
      rotate: 45,
      src: d => `https://llimllib.github.io/nbastats/logos/${d.TEAM_NAME}.svg`,
      title: d =>
        `${d.TEAM_NAME}\nRecord: ${d.W} - ${d.L}\nOffensive rating: ${d.OFF_RATING}\nDefensive rating: ${d.DEF_RATING}`,
    }),
  ],
})
display(
  d3
    .select(diamond)
    .style("transform", "rotate(-45deg)")
    .style("padding", "80px")
    .node(),
)
```

## Add an HTML tooltip

- The SVG title element is OK, but it takes a long time to display
- We can replace it with an HTML box that we keep hidden unless somebody mouses over an image

```js echo
const tooltip = d3
  .select("body")
  .append("div")
  .attr("class", "toolTip")
  .style("position", "absolute")
  .style("display", "none")
  .style("min-width", "30px")
  .style("max-width", "240px")
  .style("border-radius", "4px")
  .style("height", "auto")
  .style("background", "rgba(250,250,250, 0.9)")
  .style("border", "1px solid #DDD")
  .style("padding", "4px 8px")
  .style("font-size", ".85rem")
  .style("text-align", "left")
  .style("z-index", "1000")
```

The `title` attribute we've been using with plot adds a `<title>` SVG element that is a child of the `<image>` showing the team logo. This title would display over the top of our tooltip box, so in the mouseover handler, we'll check to see if there is a title element and convert it into a `__title` attribute on the `<image>` instead.

```js echo
function handleTooltip(plot) {
  d3.select(plot)
    .selectAll("image")
    .on("mousemove", (evt, d) => {
      // The <title> element and our tooltip will fight to display over one
      // another, so remove the <title> element and save its contents to the __title
      // attribute on the image
      const t = d3.select(evt.target)
      if (!t.attr("__title")) {
        const title = t.select("title")
        t.attr("__title", title.html())
        title.remove()
      }
      const text = t.attr("__title")
      tooltip
        .style("left", evt.pageX + 8 + "px")
        .style("top", evt.pageY + 8 + "px")
        .style("display", "block")
        .html(text.replaceAll("\n", "<br>"))
    })
    .on("mouseout", evt => {
      tooltip.style("display", "none")
    })
  return plot
}
```

Now we'll create our plot, add the tooltip handler, and rotate it with CSS

```js echo
const diamond2 = Plot.plot({
  width: 600,
  height: 600,
  y: { reverse: true },
  marks: [
    Plot.rect(rects, {
      x1: "0",
      y1: "1",
      x2: "2",
      y2: "3",
      fill: ["#fbe8c8", "#e2e6cf", "#f8d9d4", "#fbe8c8"],
      fillOpacity: 0.5,
    }),
    Plot.axisX({ anchor: "bottom", label: null, ticks: 4, tickRotate: 45 }),
    Plot.gridX({ ticks: 4 }),
    Plot.axisY({ anchor: "left", label: null, ticks: 4, tickRotate: 45 }),
    Plot.gridY({ ticks: 4 }),
    Plot.image(stats, {
      x: "OFF_RATING",
      y: "DEF_RATING",
      width: 40,
      height: 40,
      rotate: 45,
      src: d => `https://llimllib.github.io/nbastats/logos/${d.TEAM_NAME}.svg`,
      title: d =>
        `${d.TEAM_NAME}
Record: ${d.W} - ${d.L}
Offensive rating: ${d.OFF_RATING}
Defensive rating: ${d.DEF_RATING}`,
    }),
  ],
})
handleTooltip(diamond2)
display(
  d3
    .select(diamond2)
    .style("transform", "rotate(-45deg)")
    .style("padding", "80px")
    .node(),
)
```

## Add explanatory labels

- Add a title in HTML, since putting it in the plot would have it rotated 45°
- Add the updated date as a subtitle
- Add quadrant labels
  - I haven't found a great way to do this other than positioning them by hand

```js echo
const size = 600
const diamond3 = Plot.plot({
  width: size,
  height: size,
  y: { reverse: true },
  marks: [
    Plot.rect(rects, {
      x1: "0",
      y1: "1",
      x2: "2",
      y2: "3",
      fill: ["#fbe8c8", "#e2e6cf", "#f8d9d4", "#fbe8c8"],
    }),
    Plot.axisX({ anchor: "bottom", label: null, ticks: 4, tickRotate: 45 }),
    Plot.gridX({ ticks: 4 }),
    Plot.axisY({ anchor: "left", label: null, ticks: 4, tickRotate: 45 }),
    Plot.gridY({ ticks: 4 }),
    Plot.text([[xMin, yMax]], {
      text: ["Bad O, Bad D"],
      fontSize: 16,
      rotate: 45,
    }),
    Plot.text([[xMax, yMax]], {
      text: ["Good O, Bad D"],
      fontSize: 16,
      rotate: 45,
    }),
    Plot.text([[xMin, yMin]], {
      text: ["Bad O, Good D"],
      fontSize: 16,
      rotate: 45,
    }),
    Plot.text([[xMax, yMin]], {
      text: ["Good O, Good D"],
      fontSize: 16,
      rotate: 45,
    }),
    Plot.image(stats, {
      x: "OFF_RATING",
      y: "DEF_RATING",
      width: 40,
      height: 40,
      rotate: 45,
      src: d => `https://llimllib.github.io/nbastats/logos/${d.TEAM_NAME}.svg`,
      title: d =>
        `${d.TEAM_NAME}
Record: ${d.W} - ${d.L}
Offensive rating: ${d.OFF_RATING}
Defensive rating: ${d.DEF_RATING}`,
    }),
  ],
})
handleTooltip(diamond3)

const container = d3
  .create("figure")
  .style("position", "relative")
  .style("max-width", "1000px")

d3.select(diamond3)
  .selectAll("text")
  // .filter(function filt() {
  //   console.log(
  //     "text",
  //     d3.select(this).text(),
  //     d3.select(this).text() == "Good O, Good D",
  //   );
  //   return d3.select(this).text() == "Good O, Good D";
  // })
  .each(function each_(d, i) {
    console.log("each", d3.select(this), d, i)
    const bbox = this.getBBox()
    console.log("bbox", bbox)
  })

// Title and subtitle
container
  .append("h1")
  .text("Team Efficiency")
  .style("position", "relative")
  .style("top", "70px")
  .style("left", "10px")
container
  .append("h3")
  .style("position", "relative")
  .style("top", "70px")
  .style("left", "10px")
  .text(
    `as of ${new Date(updated).toLocaleString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
    })}`,
  )

// add the graph
container
  .append(() => diamond3)
  .style("overflow", "visible")
  .style("transform", "rotate(-45deg)")
  .style("padding", "90px")

// Quadrant labels
// container
//   .append("span")
//   .style("position", "absolute")
//   .style("top", "70px")
//   .style("left", `${size / 2 + 20}px`)
//   .style("background-color", "#9fc3b588")
//   .style("padding", "10px")
//   .style("border-radius", "5px")
//   .text("Good O and D");
// container
//   .append("span")
//   .style("position", "absolute")
//   .style("top", `${size / 1.45}px`)
//   .style("left", `-30px`)
//   .style("background-color", "#f1cb9a88")
//   .style("padding", "10px")
//   .style("border-radius", "5px")
//   .text("Bad O, Good D");
// container
//   .append("span")
//   .style("position", "absolute")
//   .style("top", `${size / 1.45}px`)
//   .style("left", `${size * 1.17}px`)
//   .style("background-color", "#f1cb9a88")
//   .style("padding", "10px")
//   .style("border-radius", "5px")
//   .text("Good O, Bad D");
// container
//   .append("span")
//   .style("position", "absolute")
//   .style("top", `${size * 1.33}px`)
//   .style("left", `${size / 2 + 27}px`)
//   .style("background-color", "#eca5aa88")
//   .style("padding", "10px")
//   .style("border-radius", "5px")
//   .text("Bad O, Bad D");
display(container.node())
```
