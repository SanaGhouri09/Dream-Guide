// node merge.js <drap_rows.json> <dawa-check/data/prices.js>  -> writes prices.js (union, then clean-prices keeps newest) + report.json
const fs = require("fs");
const [, , rowsF, pricesF] = process.argv;
const fresh = JSON.parse(fs.readFileSync(rowsF, "utf8")).filter(r => r[4] > 0);
const src = fs.readFileSync(pricesF, "utf8");
const header = src.slice(0, src.indexOf("const PRICES"));
const old = new Function(src.slice(src.indexOf("const PRICES")) + ";return PRICES")();
const norm = x => String(x).toLowerCase().replace(/\s+/g, " ").trim();
const key = r => [r[0], r[3], r[6]].map(norm).join("|");
const when = s => { const d = new Date(String(s).replace(",", "")); return isNaN(d) ? 0 : +d; };
const oldBy = new Map(old.map(r => [key(r), r]));
const freshBy = new Map();
for (const r of fresh) { const k = key(r), c = freshBy.get(k); if (!c || when(r[5]) > when(c[5])) freshBy.set(k, r); }
const added = [], changed = [];
for (const [k, r] of freshBy) {
  const o = oldBy.get(k);
  if (!o) added.push(r);
  else if (Math.abs(o[4] - r[4]) > 0.004 && when(r[5]) >= when(o[5])) changed.push([o, r]);
}
const gone = old.filter(r => !freshBy.has(key(r)));
fs.writeFileSync(pricesF, header + "const PRICES = " + JSON.stringify(fresh.concat(old)) + ";\n");
fs.writeFileSync(rowsF.replace(/[^/]+$/, "report.json"), JSON.stringify({ fresh: freshBy.size, old: old.length, added, changed, gone }, null, 1));
console.log(`DRAP rows: ${fresh.length} (${freshBy.size} unique packs) · ours: ${old.length} · new packs: ${added.length} · price changes: ${changed.length} · ours but not on DRAP now: ${gone.length}`);
