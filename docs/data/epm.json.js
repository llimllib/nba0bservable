#!/usr/bin/env node
const res = await fetch("https://dunksandthrees.com/epm")
if (!res.ok) {
  console.log(JSON.stringify({ error: "unable to fetch" }))
  process.exit(1)
}
const body = await res.text()

// for testing
// import fs from "node:fs";
//
// const body = fs.readFileSync("/tmp/epm.html").toString();

// Find the starting position
const startPattern = '{type:"data",data:{date'
const startIdx = body.indexOf(startPattern)

if (startIdx === -1) {
  console.log(JSON.stringify({ error: "Pattern not found" }))
  process.exit(1)
}

// Start after the opening bracket
let pos = startIdx + 1
let depth = 1

// Count brackets to find the matching closing bracket
while (pos < body.length && depth > 0) {
  if (body[pos] === "{") depth++
  else if (body[pos] === "}") depth--
  pos++
}

const extracted = body.slice(startIdx, pos)
console.log(eval(`JSON.stringify(${extracted})`))
