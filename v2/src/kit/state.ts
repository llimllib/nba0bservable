// URL state. Tool params live in a readable query string, so the URL printed
// on an exported image means something; annotations are long and live in a
// compressed #a= hash

export type ParamValue = string | number | boolean
export type Params = Record<string, ParamValue>

export function readParams<P extends Params>(defaults: P): P {
  const q = new URLSearchParams(location.search)
  const out: Params = { ...defaults }
  for (const [k, d] of Object.entries(defaults)) {
    const v = q.get(k)
    if (v === null) continue
    if (typeof d === "number") out[k] = Number.isFinite(+v) ? +v : d
    else if (typeof d === "boolean") out[k] = v === "1"
    else out[k] = v
  }
  // free-form framing params that aren't tool-specific
  for (const k of ["title", "sub", "size"]) {
    const v = q.get(k)
    if (v !== null) out[k] = v
  }
  return out as P
}

// Encode params as a query string, leaving out values equal to the default
export function queryString(params: Params, defaults: Params) {
  const q = new URLSearchParams()
  for (const [k, v] of Object.entries(params)) {
    if (v === undefined || v === "" || v === defaults[k]) continue
    q.set(k, typeof v === "boolean" ? (v ? "1" : "0") : String(v))
  }
  const s = q.toString()
  return s ? `?${s}` : ""
}

export function writeParams(params: Params, defaults: Params, hash: string) {
  history.replaceState(
    null,
    "",
    location.pathname + queryString(params, defaults) + hash,
  )
}

async function pipe(bytes: Uint8Array, stream: GenericTransformStream) {
  const out = new Blob([bytes as BlobPart]).stream().pipeThrough(stream)
  return new Uint8Array(await new Response(out).arrayBuffer())
}

export async function encodeHash(value: unknown): Promise<string> {
  const json = new TextEncoder().encode(JSON.stringify(value))
  const bytes = await pipe(json, new CompressionStream("deflate-raw"))
  let bin = ""
  for (const b of bytes) bin += String.fromCharCode(b)
  return btoa(bin).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "")
}

export async function decodeHash<T>(s: string): Promise<T | undefined> {
  try {
    const bin = atob(s.replace(/-/g, "+").replace(/_/g, "/"))
    const bytes = Uint8Array.from(bin, c => c.charCodeAt(0))
    const json = await pipe(bytes, new DecompressionStream("deflate-raw"))
    return JSON.parse(new TextDecoder().decode(json))
  } catch {
    return undefined
  }
}
