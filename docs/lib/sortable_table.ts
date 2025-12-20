import * as d3 from "d3"

export interface Column<T = any> {
  key: string
  label: string
  align?: "left" | "right" | "center"
  sortable?: boolean
  defaultSort?: "asc" | "desc"
  format?: (value: any) => string
  render?: (datum: T) => string
  style?: Record<string, string | ((datum: T) => string)>
  colorScale?: (value: any) => string
}

export interface VisualizeParams<T = any> {
  container: d3.Selection<HTMLDivElement, undefined, null, undefined>
  data: T[]
  allData: T[]
  sortColumn: string
  sortDirection: "asc" | "desc"
  dimensions: {
    width: number
    height: number
    rowHeight: number
  }
  transitionDuration: number
}

export interface SortableTableOptions {
  rowHeight?: number
  headerHeight?: number
  initialSort?: string
  graphWidth?: number
  transitionDuration?: number
  formatValue?: (n: number) => string
}

export interface SortableTableParams<T = any> {
  data: T[]
  columns: Column<T>[]
  visualize?: (params: VisualizeParams<T>) => void
  options?: SortableTableOptions
}

/**
 * Creates a sortable table with an accompanying visualization
 * @param data - Array of data objects
 * @param columns - Column definitions
 * @param visualize - Optional function to render side visualization
 * @param options - Optional configuration
 * @returns The container element
 */
export function createSortableTable<T extends Record<string, any>>({
  data,
  columns,
  visualize,
  options = {},
}: SortableTableParams<T>): HTMLElement {
  const {
    rowHeight = 33,
    headerHeight = 40,
    graphWidth = 100,
    transitionDuration = 750,
    initialSort,
  } = options

  const tableHeight = data.length * rowHeight + headerHeight

  // State
  let sortColumn: string
  if (initialSort) {
    sortColumn = initialSort
  } else {
    sortColumn = columns.find(c => c.defaultSort)?.key || columns[0].key
  }
  const initialColumn = columns.find(c => c.key === sortColumn)
  let sortDirection: "asc" | "desc" = initialColumn?.defaultSort || "desc"

  // Create main container
  const flexContainer = d3
    .create("div")
    .style("display", "flex")
    .style("align-items", "flex-start")
    .style("gap", "20px")
    .style("margin", "20px 0")

  // Create table container
  const tableContainer = d3
    .create("div")
    .style("flex", "0 0 auto")
    .style("overflow-y", "auto")
    .style("max-height", tableHeight + "px")

  const table = tableContainer
    .append("table")
    .style("border-collapse", "collapse")
    .style("font-size", "14px")
    .style("width", "100%")

  // Create visualization container
  const vizContainer = d3
    .create("div")
    .style("flex", "0 0 " + graphWidth + "px")

  // Table header
  const thead = table.append("thead")
  const headerRow = thead
    .append("tr")
    .style("position", "sticky")
    .style("top", "0")
    .style("z-index", "10")
    .style("background", "transparent")
    .style("backdrop-filter", "blur(4px)")

  // Create headers
  columns.forEach(col => {
    const th = headerRow
      .append("th")
      .text(col.label)
      .style("padding", "8px")
      .style("text-align", col.align || "right")
      .style("font-weight", "600")

    if (col.sortable !== false) {
      th.style("cursor", "pointer")
        .style("user-select", "none")
        .style("transition", "background-color 0.2s")
        .on("mouseenter", function () {
          d3.select(this).style("background-color", "rgba(245, 245, 245, 0.8)")
        })
        .on("mouseleave", function () {
          d3.select(this).style("background-color", "transparent")
        })
        .on("click", () => {
          if (sortColumn === col.key) {
            sortDirection = sortDirection === "desc" ? "asc" : "desc"
          } else {
            sortColumn = col.key
            sortDirection = col.defaultSort || "desc"
          }
          updateHeaderArrows()
          updateVisualization()
        })
    }
  })

  const tbody = table.append("tbody")

  function updateHeaderArrows(): void {
    headerRow.selectAll("th").each(function (_, i) {
      const col = columns[i]
      if (col.sortable === false) return

      const header = d3.select(this)
      if (col.key === sortColumn) {
        const arrow = sortDirection === "desc" ? "▼" : "▲"
        header.html(`${col.label} <span style="opacity: 1">${arrow}</span>`)
      } else {
        header.html(`${col.label} <span style="opacity: 0">▼</span>`)
      }
    })
  }

  function updateVisualization(): void {
    // Sort data
    const sorted = [...data].sort((a, b) => {
      const aVal = a[sortColumn]
      const bVal = b[sortColumn]
      return sortDirection === "desc" ? bVal - aVal : aVal - bVal
    })

    // Update table rows
    const rows = tbody
      .selectAll<HTMLTableRowElement, T>("tr")
      .data(sorted, (d: T) => (d as any).id || JSON.stringify(d))
      .join("tr")
      .style("border-bottom", "1px solid #aaa")

    rows.selectAll("td").remove()

    // Render each column
    columns.forEach(col => {
      const cell = rows.append("td")

      if (col.render) {
        cell.html(d => col.render!(d))
      } else {
        cell.text(d => (col.format ? col.format(d[col.key]) : d[col.key]))
      }

      if (col.style) {
        Object.entries(col.style).forEach(([key, value]) => {
          if (typeof value === "function") {
            cell.style(key, d => (value as (d: T) => string)(d))
          } else {
            cell.style(key, value)
          }
        })
      }

      if (col.colorScale) {
        cell.style("background-color", d => col.colorScale!(d[col.key]))
      }
    })

    // Update visualization
    if (visualize) {
      visualize({
        container: vizContainer,
        data: sorted,
        allData: data,
        sortColumn,
        sortDirection,
        dimensions: {
          width: graphWidth,
          height: tableHeight,
          rowHeight,
        },
        transitionDuration,
      })
    }
  }

  // Initial render
  updateHeaderArrows()
  updateVisualization()

  flexContainer.append(() => tableContainer.node()!)
  flexContainer.append(() => vizContainer.node()!)

  return flexContainer.node()!
}
