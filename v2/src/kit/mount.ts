// Mount a tool on a page: question controls above the chart, the frame, the
// annotation layer, and the framing actions below it. All state round-trips
// through the URL
import { AnnotationLayer, type Annotation, type Mode } from "./annotate"
import { buildFrame, sizes, type Size } from "./frame"
import { download, toPng } from "./export"
import {
  decodeHash,
  encodeHash,
  queryString,
  readParams,
  writeParams,
  type Params,
} from "./state"
import { SITE } from "./theme"
import type { Control, Tool } from "./tool"

const framing = { title: "", sub: "", size: "auto" }

export async function mount<P extends Params, D>(
  root: HTMLElement,
  tool: Tool<P, D>,
) {
  const defaults = { ...framing, ...tool.defaults } as Params
  let p = readParams(defaults) as P & typeof framing
  const hashA = new URLSearchParams(location.hash.slice(1)).get("a")
  let anns: Annotation[] = (hashA && (await decodeHash(hashA))) || []
  let hash = hashA ? `#a=${hashA}` : ""
  let mode: Mode = "select"
  let data: D | undefined
  let layer: AnnotationLayer | undefined
  let frame: ReturnType<typeof buildFrame> | undefined

  root.innerHTML = `
    <form class="controls"></form>
    <div class="chart-host"><div class="chart"></div><div class="status"></div></div>
    <div class="actions">
      <div class="seg sizes">${Object.entries(sizes)
        .map(
          ([k, s]) =>
            `<button type="button" data-size="${k}">${s.label}</button>`,
        )
        .join("")}</div>
      <div class="seg modes">
        <button type="button" data-mode="text" title="Click the chart to add a note (N)">✎ Note</button>
        <button type="button" data-mode="arrow" title="Drag to draw an arrow (A)">↗ Arrow</button>
      </div>
      <button type="button" class="clear">Clear</button>
      <button type="button" class="export primary">Export PNG</button>
    </div>
    <p class="hint">Click a dot to label it. Drag labels and notes to move them;
    double-click a note to edit it; select one and press Delete to remove it.
    Click the title or subtitle to rewrite it.</p>`
  const controlsEl = root.querySelector<HTMLFormElement>(".controls")!
  const chartEl = root.querySelector<HTMLElement>(".chart")!
  const statusEl = root.querySelector<HTMLElement>(".status")!

  const save = () => writeParams(p, defaults, hash)
  const toolParams = () => {
    const q: Params = {}
    for (const k of Object.keys(tool.defaults)) q[k] = p[k]
    return q
  }

  async function saveAnnotations(next: Annotation[]) {
    anns = next
    hash = anns.length ? `#a=${await encodeHash(anns)}` : ""
    save()
  }

  function renderControls(controls: Control[]) {
    controlsEl.replaceChildren(
      ...controls.map(c => {
        const label = document.createElement("label")
        label.append(c.label)
        const value = p[c.key]
        let input: HTMLInputElement | HTMLSelectElement
        if (c.kind === "select") {
          input = document.createElement("select")
          for (const o of c.options) {
            const opt = new Option(o.label, String(o.value))
            opt.selected = o.value === value
            input.add(opt)
          }
        } else if (c.kind === "range") {
          input = document.createElement("input")
          Object.assign(input, {
            type: "range",
            min: c.min,
            max: c.max,
            step: c.step,
            value,
          })
          const out = document.createElement("output")
          out.value = String(value)
          input.addEventListener("input", () => (out.value = input.value))
          label.append(input, out)
        } else {
          input = document.createElement("input")
          input.type = "checkbox"
          input.checked = Boolean(value)
        }
        if (!input.parentElement) label.append(input)
        input.addEventListener("change", () => {
          const d = tool.defaults[c.key]
          const v =
            c.kind === "toggle"
              ? (input as HTMLInputElement).checked
              : typeof d === "number"
                ? Number(input.value)
                : input.value
          p = { ...p, [c.key]: v }
          update()
        })
        return label
      }),
    )
  }

  function draw() {
    if (data === undefined) return
    const desc = tool.describe(data, p)
    if (p.title) desc.title = p.title
    if (p.sub) desc.context = p.sub
    // always spell out every param: the printed URL has to stand on its own,
    // even after the defaults change
    const url = `${SITE}/${tool.id}${queryString(toolParams(), {})}`
    const size = (p.size in sizes ? p.size : "auto") as Size
    frame = buildFrame(chartEl, size, desc, url, (g, s) =>
      tool.render(g, data!, p, s),
    )
    layer = new AnnotationLayer(frame, anns, mode, saveAnnotations, showMode)
    frame.title.addEventListener("click", () => editFraming("title"))
    frame.context.addEventListener("click", () => editFraming("sub"))
    for (const b of root.querySelectorAll<HTMLButtonElement>("[data-size]"))
      b.classList.toggle("on", b.dataset.size === size)
    showMode(mode)
  }

  function showMode(m: Mode) {
    mode = m
    for (const b of root.querySelectorAll<HTMLButtonElement>("[data-mode]"))
      b.classList.toggle("on", b.dataset.mode === m)
  }

  // Rewrite the title or subtitle in place. Empty restores the generated one
  function editFraming(key: "title" | "sub") {
    if (!frame || mode !== "select") return
    const target = key === "title" ? frame.title : frame.context
    const r = target.getBoundingClientRect()
    const host = chartEl.parentElement!.getBoundingClientRect()
    const input = document.createElement("input")
    input.className = `framing-input framing-${key}`
    input.value = target.textContent ?? ""
    const cs = getComputedStyle(target)
    Object.assign(input.style, {
      left: `${r.left - host.left - 4}px`,
      top: `${r.top - host.top - 4}px`,
      width: `${Math.max(r.width + 40, 300)}px`,
      fontSize: `${r.height * 0.82}px`,
      fontWeight: cs.fontWeight,
    })
    chartEl.parentElement!.appendChild(input)
    input.focus()
    input.select()
    const generated = () => {
      const d = tool.describe(data!, p)
      return key === "title" ? d.title : d.context
    }
    let done = false
    const finish = (commit: boolean) => {
      if (done) return
      done = true
      input.remove()
      if (!commit) return
      const v = input.value.trim()
      p = { ...p, [key]: v === generated() ? "" : v }
      save()
      draw()
    }
    input.addEventListener("keydown", e => {
      if (e.key === "Enter") finish(true)
      if (e.key === "Escape") finish(false)
    })
    input.addEventListener("blur", () => finish(true))
  }

  async function update() {
    statusEl.textContent = "Loading…"
    root.classList.add("loading")
    try {
      data = await tool.load(p)
      p = { ...p, ...tool.normalize?.(data, p) }
      renderControls(tool.controls(data, p))
      save()
      draw()
      statusEl.textContent = ""
    } catch (e) {
      console.error(e)
      statusEl.textContent = `Couldn't load data: ${e}`
    } finally {
      root.classList.remove("loading")
    }
  }

  root.querySelector(".sizes")!.addEventListener("click", e => {
    const size = (e.target as HTMLElement).closest("button")?.dataset.size
    if (!size) return
    p = { ...p, size }
    save()
    draw()
  })
  const setMode = (m: Mode) => {
    const next = mode === m ? "select" : m
    if (layer) layer.setMode(next)
    else showMode(next)
  }
  root.querySelector(".modes")!.addEventListener("click", e => {
    const m = (e.target as HTMLElement).closest("button")?.dataset.mode
    if (m) setMode(m as Mode)
  })
  root.querySelector(".clear")!.addEventListener("click", () => {
    p = { ...p, title: "", sub: "" }
    saveAnnotations([])
    draw()
  })
  root.querySelector(".export")!.addEventListener("click", async () => {
    if (!frame) return
    statusEl.textContent = "Exporting…"
    const base = new URL(import.meta.env.BASE_URL, location.href).href
    const { blob, missingImages } = await toPng(frame.svg, base)
    const name = (frame.title.textContent || tool.id)
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
    download(blob, `${name}.png`)
    statusEl.textContent = missingImages
      ? `Exported, but ${missingImages} images couldn't be embedded (no CORS)`
      : ""
  })
  document.addEventListener("keydown", e => {
    if ((e.target as HTMLElement).matches("input, textarea, select")) return
    if (e.key === "Delete" || e.key === "Backspace") {
      if (layer?.deleteSelected()) e.preventDefault()
    } else if (e.key === "Escape") setMode("select")
    else if (e.key === "n") setMode("text")
    else if (e.key === "a") setMode("arrow")
  })

  await update()
}
