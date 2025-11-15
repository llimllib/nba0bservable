#!/usr/bin/env node
// const res = await fetch("https://dunksandthrees.com/epm/actual")
// if (!res.ok) {
//   console.log(JSON.stringify({ error: "unable to fetch" }))
//   process.exit(1)
// }
// const body = await res.text()

// for testing
import fs from "node:fs"

const body = fs.readFileSync("/tmp/epmseason.html").toString()

// Find the starting position
const startPattern = "data:{stats:["
const startIdx = body.indexOf(startPattern)

if (startIdx === -1) {
  console.log(JSON.stringify({ error: "Pattern not found" }))
  process.exit(1)
}

// Start after the opening bracket
let pos = startIdx + startPattern.length
let depth = 1 // We've already seen one opening bracket

// Count brackets to find the matching closing bracket
while (pos < body.length && depth > 0) {
  if (body[pos] === "[") depth++
  else if (body[pos] === "]") depth--
  pos++
}

// Extract the content (including the brackets)
const startOfBracket = startIdx + startPattern.length - 1
const extracted = body.slice(startOfBracket, pos)
const rawstats = eval(extracted)

// Find the starting position
const keysPattern = ",k:{"
const start = body.indexOf(keysPattern)

if (start === -1) {
  console.log(JSON.stringify({ error: "Pattern not found" }))
  process.exit(1)
}

// Start after the opening bracket
pos = start + startPattern.length
depth = 1 // We've already seen one opening bracket

// Count brackets to find the matching closing bracket
while (pos < body.length && depth > 0) {
  if (body[pos] === "{") depth++
  else if (body[pos] === "}") depth--
  pos++
}

const keys = eval(`JSON.parse(JSON.stringify(${body.slice(start + 3, pos)}))`)
// console.log(keys)

// convert the list of stats into a list of objects with the keys given by the
// keys object
const seasonEPM = rawstats.map(row =>
  Object.fromEntries(
    Object.entries(keys).map(([key, index]) => [key, row[index]]),
  ),
)
console.log(JSON.stringify(seasonEPM))
