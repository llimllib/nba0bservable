import { create, select } from "d3-selection";
import { Delaunay } from "d3-delaunay";
import { polygonCentroid, polygonArea } from "d3-polygon";
import * as Plot from "@observablehq/plot";

// Derived from https://observablehq.com/@d3/voronoi-labels
// and
// https://observablehq.com/@fil/experimental-plot-tooltip-01
//
// An interesting approach that I may want to investigate is @Fil's voronoi labeller:
//
// https://observablehq.com/@fil/plot-voronoi-labels
//
// TODO: allow user to click to remove/add labels manually

interface LabelOptions {
  x: string;
  y: string;
  z?: string;
  label: string;
  padding: number;
  minCellSize: number;
  rotate?: number;
}

interface Point {
  x: number;
  y: number;
  z: number;
  content: any;
}

interface Style {
  width: number;
  height: number;
  marginTop: number;
  marginRight: number;
  marginBottom: number;
  marginLeft: number;
}

// How to type a d3 scale? I've marked it here as a function that accepts any
// and returns a number
interface Scales {
  x: (pt: any) => number;
  y: (pt: any) => number;
}

type Cell = [[number, number], any[], any];

// warning: if the data has been implicitly transformed, for example via
// "percent: true" on the root axis, this will not work because it receives the
// raw data and AFAICT does not have access to the transformed data. Avoid this
// for now by transforming the data before plotting. FIXME
export class Label extends Plot.Mark {
  data: any[];
  x: any;
  y: any;
  label: any;
  padding: number;
  minCellSize: number;
  rotate: number | undefined;

  constructor(data: any[], options: LabelOptions) {
    super(
      // https://github.com/observablehq/plot/pull/2229
      // @ts-expect-error the typing is not right for super()
      data,
      [
        { name: "x", value: options.x, scale: "x", optional: true },
        { name: "y", value: options.y, scale: "y", optional: true },
        { name: "z", value: options.z, optional: true },
        { name: "content", value: options.label },
      ],
      options,
    );
    // @ts-expect-error I did this so that we can accept the output of an
    // observable framework sql block - I'm not sure how to type that object,
    // so I just look for a non-array and guess that we can call toArray on it
    this.data = Array.isArray(data) ? data : data.toArray();
    this.x = options.x;
    this.y = options.y;
    this.label = options.label;
    this.padding = options.padding;
    this.minCellSize = options.minCellSize;
    this.rotate = options.rotate;
  }

  // This returns a "GElement", defined in the d3-selection type file but I
  // can't figure out how to reference that type so I have it returning "any"
  // for now
  render(index: any, scales: any, point: Point, style: Style): any {
    let cells = this.calcVoronoi(this.data, scales, style.width, style.height);

    // If two data points are coincident, we may get a null cell. I can't
    // think of anything better to do than to drop those labels, but I'm open
    // to ideas. I hate the idea that we may be masking mistakes here.
    cells = cells.filter(([_, cell, __]) => cell);

    const orient = {
      top: (text: any) =>
        text.attr("text-anchor", "middle").attr("y", -this.padding),
      right: (text: any) =>
        text
          .attr("text-anchor", "start")
          .attr("dy", "0.35em")
          .attr("x", this.padding),
      bottom: (text: any) =>
        text
          .attr("text-anchor", "middle")
          .attr("dy", "0.71em")
          .attr("y", this.padding),
      left: (text: any) =>
        text
          .attr("text-anchor", "end")
          .attr("dy", "0.35em")
          .attr("x", -this.padding),
    };

    const g = create("svg:g");
    select(g.node())
      .style("font", "10px sans-serif")
      .selectAll("text")
      .data(cells)
      .join("text")
      .each(function ([[x, y], cell, _]) {
        const [cx, cy] = polygonCentroid(cell);
        const angle =
          (Math.round((Math.atan2(cy - y, cx - x) / Math.PI) * 2) + 4) % 4;
        select(this).call(
          angle === 0
            ? orient.right
            : angle === 3
              ? orient.top
              : angle === 1
                ? orient.bottom
                : orient.left,
        );
      })
      .attr(
        "transform",
        ([d]) =>
          `translate(${d})` + (this.rotate ? ` rotate(${this.rotate})` : ""),
      )
      .attr("display", ([, cell]) =>
        -polygonArea(cell) > this.minCellSize ? null : "none",
      )
      .text((d: any, __: any) => d[2][this.label]);
    return g.node();
  }

  calcVoronoi(
    data: object[],
    scales: Scales,
    width: number,
    height: number,
  ): Cell[] {
    const delaunay = Delaunay.from(
      data,
      (d: any) => scales.x(d[this.x]),
      (d: any) => scales.y(d[this.y]),
    );
    const voronoi = delaunay.voronoi([-1, -1, width + 1, height + 1]);
    const cells = data.map(
      (d: any, i: number): Cell => [
        [scales.x(d[this.x]), scales.y(d[this.y])],
        voronoi.cellPolygon(i),
        d,
      ],
    );

    return cells;
  }
}

export function label(data: any[], options: LabelOptions): any {
  return new Label(data, options);
}
