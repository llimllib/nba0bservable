// Mount a tool on a page: question controls above the chart, the frame, the
// annotation layer, and the framing actions below it. All state round-trips
// through the URL
import { AnnotationLayer, type Annotation, type Mode } from "./annotate"
import { buildFrame, fontsReady, sizes, type Size } from "./frame"
import { download, toPng } from "./export"
import {
  decodeHash,
  encodeHash,
  readParams,
  writeParams,
  type Params,
} from "./state"
import { SITE } from "./theme"
import { controlElement } from "./controls"
import type { Control, Tool } from "./tool"

const framing = { title: "", sub: "", size: "auto" }

// the site root, for fetching fonts. BASE_URL has no trailing slash in dev,
// and without one, relative URLs resolve against the parent directory
const base = () =>
  new URL(import.meta.env.BASE_URL.replace(/\/?$/, "/"), location.href).href

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

  // question controls, the chart, then framing and export: a rail beside the
  // chart on wide screens, in that order down the page on narrow ones
  root.classList.add("tool")
  root.innerHTML = `
    <form class="controls"></form>
    <div class="chart-host"><div class="chart"></div><div class="status"></div></div>
    <div class="actions">
      <fieldset class="sizes"><legend>Size</legend>${Object.entries(sizes)
        .map(
          ([k, s]) =>
            `<button type="button" data-size="${k}">${s.label}</button>`,
        )
        .join("")}</fieldset>
      <fieldset class="modes"><legend>Annotate</legend>
        <button type="button" data-mode="text" title="Click the chart to add a note (N)">✎ Note</button>
        <button type="button" data-mode="arrow" title="Drag to draw an arrow (A)">↗ Arrow</button>
        <button type="button" class="clear">Clear</button>
      </fieldset>
      <button type="button" class="export">Export PNG</button>
      <p class="hint">Click a dot to label it. Drag labels and notes to move
      them; double-click a note to edit it; select one and press Delete to
      remove it. Click the headline or deck to rewrite it.</p>
    </div>`
  const controlsEl = root.querySelector<HTMLFormElement>(".controls")!
  const chartEl = root.querySelector<HTMLElement>(".chart")!
  const statusEl = root.querySelector<HTMLElement>(".status")!

  const save = () => writeParams(p, defaults, hash)

  async function saveAnnotations(next: Annotation[]) {
    anns = next
    hash = anns.length ? `#a=${await encodeHash(anns)}` : ""
    save()
  }

  function renderControls(controls: Control[]) {
    // a re-render replaces the controls, so keep the focus where it was:
    // adding players one after another shouldn't need a click each
    const focused = (
      document.activeElement as HTMLElement | null
    )?.closest<HTMLElement>(".controls [data-key]")?.dataset.key
    controlsEl.replaceChildren(
      ...controls.map(c => {
        const el = controlElement(c, p, patch => {
          p = { ...p, ...patch }
          update()
        })
        el.dataset.key = c.key
        return el
      }),
    )
    if (focused)
      controlsEl
        .querySelector<HTMLElement>(
          `[data-key="${focused}"] :is(input[type=search], input, select)`,
        )
        ?.focus()
  }

  function draw() {
    if (data === undefined) return
    const desc = tool.describe(data, p)
    if (p.title) desc.title = p.title
    if (p.sub) desc.context = p.sub
    // the printed URL names the tool, not the view: a reader types it in
    // from an image, and a query string is too long to type
    const url = `${SITE}/${tool.id}`
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
    // the deck is wrapped into lines, so its text is kept whole on the element
    input.value = target.dataset.text ?? target.textContent ?? ""
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
      const [loaded] = await Promise.all([tool.load(p), fontsReady()])
      data = loaded
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
    const { blob, missingImages } = await toPng(frame.svg, base())
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

// A tool's frame at preset params, without controls: for the front page
export async function embed<P extends Params, D>(
  root: HTMLElement,
  tool: Tool<P, D>,
  params: Partial<P> = {},
) {
  let p = { ...tool.defaults, ...params }
  const [data] = await Promise.all([tool.load(p), fontsReady()])
  p = { ...p, ...tool.normalize?.(data, p) }
  const url = `${SITE}/${tool.id}`
  buildFrame(root, "auto", tool.describe(data, p), url, (g, s) =>
    tool.render(g, data, p, s),
  )
  return { data, p }
}
