// After a merge: moves the data date to today, refreshes the pack count in page copy, bumps the service worker cache.
// node finish.js   (run from anywhere)
const fs = require("fs"), path = require("path");
const R = path.join(__dirname, "..", "..");
const rd = f => fs.readFileSync(path.join(R, f), "utf8"), wr = (f, s) => fs.writeFileSync(path.join(R, f), s);
const P = new Function(rd("data/prices.js").replace(/^[\s\S]*?const PRICES/, "const PRICES") + ";return PRICES")();
const n = P.length.toLocaleString("en");
const now = new Date();
const short = now.toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric", timeZone: "Asia/Karachi" });
const long = now.toLocaleDateString("en-GB", { day: "numeric", month: "long", year: "numeric", timeZone: "Asia/Karachi" });
let s = rd("index.html").replace(/("updated": ")[^"]*(")/, `$1${short}$2`).replace(/\d{1,2},\d{3} packs/g, `${n} packs`);
wr("index.html", s);
wr("assets/site.js", rd("assets/site.js").replace(/(updated:")\d[^"]*(")/, `$1${short}$2`));
s = rd("how-we-verify.html").replace(/\d{1,2},\d{3} packs/g, `${n} packs`).replace(/Last updated \d+ \w+ \d{4}/, `Last updated ${long}`);
wr("how-we-verify.html", s);
wr("README.md", rd("README.md").replace(/\(\d{1,2},\d{3} packs\)/, `(${n} packs)`));
wr("sw.js", rd("sw.js").replace(/const VERSION = "[^"]*"/, `const VERSION = "dc-${now.toISOString().slice(0, 10)}-sync"`));
console.log(`packs: ${n} · data date: ${short}`);
