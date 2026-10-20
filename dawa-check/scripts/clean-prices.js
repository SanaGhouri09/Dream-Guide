#!/usr/bin/env node
/* Cleans data/prices.js in place:
   - keeps only the newest price when the same pack (name + pack size + reg. no.) appears more than once
   - drops rows with no usable price (0 or missing)
   - flattens line breaks and double spaces inside names, packs and makers
   Run after replacing data/prices.js with a fresh DRAP export:  node scripts/clean-prices.js */
const fs = require("fs"), path = require("path");
const file = path.join(__dirname, "..", "data", "prices.js");
const src = fs.readFileSync(file, "utf8");
const header = src.slice(0, src.indexOf("const PRICES"));
const PRICES = new Function(src.slice(src.indexOf("const PRICES")) + ";return PRICES")();
// flatten line breaks and repeated spaces inside text fields (they split brands in the search pages)
for (const r of PRICES) for (let i = 0; i < r.length; i++) if (typeof r[i] === "string") r[i] = r[i].replace(/\s+/g, " ").trim();
const when = s => { const d = new Date(String(s).replace(",", "")); return isNaN(d) ? 0 : +d; };
const key = r => [r[0], r[3], r[6]].map(x => String(x).toLowerCase().replace(/\s+/g, " ").trim()).join("|");

const newest = new Map();
let zero = 0;
for (const r of PRICES) {
  if (!(r[4] > 0)) { zero++; continue; }
  const k = key(r), cur = newest.get(k);
  if (!cur || when(r[5]) > when(cur[5])) newest.set(k, r);
}
const out = PRICES.filter(r => newest.get(key(r)) === r);
fs.writeFileSync(file, header + "const PRICES = " + JSON.stringify(out) + ";\n");
const today = Date.now(), future = out.filter(r => when(r[5]) > today);
console.log(`rows in: ${PRICES.length}  out: ${out.length}  older duplicates removed: ${PRICES.length - zero - out.length}  zero-price removed: ${zero}`);
if (future.length) console.log("starts in the future (check against DRAP):", future.map(r => `${r[0]} ${r[3]} Rs ${r[4]} from ${r[5]}`).join("; "));
