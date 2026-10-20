#!/usr/bin/env node
/* Builds the search pages from data/prices.js and data/alerts.js:
 *   medicine/<brand>.html   one page per brand: every DRAP pack price, alerts, FAQ
 *   medicines/index.html    A-Z index + popular brands, medicines/<letter>.html
 *   fake-medicines.html     every DRAP fake / substandard alert in one table
 *   sitemap.xml, llms.txt   and the FAQPage JSON-LD in index.html
 * Run from anywhere: node dawa-check/scripts/build-seo.js   (re-run after every data refresh)
 */
const fs = require("fs");
const path = require("path");
const vm = require("vm");

const ROOT = path.join(__dirname, "..");
const SITE = "https://dawacheck.pk";
const ctx = {};
vm.createContext(ctx);
for (const f of ["data/prices.js", "data/alerts.js"])
  vm.runInContext(fs.readFileSync(path.join(ROOT, f), "utf8").replace(/^const (\w+)/gm, "this.$1"), ctx);
const { PRICES, ALERTS } = ctx;
const INDEX = fs.readFileSync(path.join(ROOT, "index.html"), "utf8");
const META = JSON.parse(INDEX.match(/const META = (\{.*?\});/)[1]);
const TODAY = new Date().toISOString().slice(0, 10);
const LOGO = INDEX.match(/<svg width="40" height="40" viewBox="0 0 100 100" aria-hidden="true">.*?<\/svg>/)[0];

/* ---------------------------------------------------------------- helpers (same rules as the price tool) */
const esc = s => String(s ?? "").replace(/[&<>"]/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]));
const low = s => (s || "").toLowerCase().replace(/[^a-z0-9]+/g, " ").trim();
const slug = s => s.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "");
const tcase = s => s.toLowerCase().replace(/(^|\s|-|\()([a-z])/g, (m, a, b) => a + b.toUpperCase());
const nice = s => { s = s.replace(/^[*\s]+/, "").replace(/\s+/g, " ").trim(); return s === s.toUpperCase() || s === s.toLowerCase() ? tcase(s) : s; };
const rs = n => "Rs " + n.toLocaleString("en-PK", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
function baseOf(b) {
  let s = b.replace(/^[*\s]+/, "").replace(/[®™]/g, "").replace(/\(.*?\)/g, " ");
  s = s.replace(/\s*\d+(?:\.\d+)?\s*(?:mg|mcg|µg|gm|g|ml|iu|%)\b.*$/i, "");
  s = s.replace(/\s(?:tablets?|tabs?|caplets?|capsules?|caps?|syrup|suspension|susp|elixir|drops?|injection|inj|infusion|cream|ointment|gel|lotion|sachets?|granules|powder|ds|forte|plus|xr|sr|er|mr|cr|dt|extra|extend|max|kids?|junior|pediatric|paediatric|liquid|retard|i\.?v\.?|\d+)(?:\b|\s|$).*$/i, "");
  s = s.replace(/\s+(?:for|of|and|with|in|&)$/i, "").replace(/[-.,]+$/, "").trim();
  return s || b.split(/\s+/)[0];
}
const cleanComp = c => (c || "").replace(/\s+/g, " ").replace(/[.…]{2,}/g, " ").trim();

/* ---------------------------------------------------------------- group packs by brand */
const brands = new Map();
const seen = new Set();
for (const r of PRICES) {
  const base = baseOf(r[0]), s = slug(base);
  if (s.length < 2 || !/[a-z]/.test(s)) continue;
  const dk = low(r[0]) + "|" + low(r[3]) + "|" + r[4];
  if (seen.has(dk)) continue;
  seen.add(dk);
  if (!brands.has(s)) brands.set(s, { slug: s, names: new Map(), rows: [] });
  const b = brands.get(s);
  b.rows.push(r);
  const n = nice(base);
  b.names.set(n, (b.names.get(n) || 0) + 1);
}
for (const b of brands.values()) {
  b.name = [...b.names.entries()].sort((x, y) => y[1] - x[1])[0][0];
  b.rows.sort((x, y) => nice(x[0]).localeCompare(nice(y[0]), undefined, { numeric: true }) || x[4] - y[4]);
  b.makers = [...new Set(b.rows.map(r => nice(r[2])))];
  b.min = Math.min(...b.rows.map(r => r[4]));
  b.max = Math.max(...b.rows.map(r => r[4]));
  const re = new RegExp("\\b" + b.name.toLowerCase().replace(/[.*+?^${}()|[\]\\]/g, "\\$&") + "\\b");
  b.alerts = b.name.length >= 4 ? ALERTS.filter(a => re.test((a.p || "").toLowerCase())) : [];
}
const all = [...brands.values()].sort((x, y) => x.name.localeCompare(y.name, undefined, { numeric: true, sensitivity: "base" }));
const byMaker = new Map();
for (const b of all) for (const m of b.makers) { if (!byMaker.has(m)) byMaker.set(m, []); byMaker.get(m).push(b); }
const letterOf = b => (/^[a-z]/.test(b.slug) ? b.slug[0] : "0-9");
const LETTERS = [..."abcdefghijklmnopqrstuvwxyz", "0-9"];

/* ---------------------------------------------------------------- page shell */
function page({ title, desc, canonical, depth, body, ld, ogTitle }) {
  const up = depth ? "../" : "";
  return `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover">
<title>${esc(title)}</title>
<meta name="description" content="${esc(desc)}">
<link rel="canonical" href="${canonical}">
<meta property="og:type" content="website">
<meta property="og:site_name" content="DawaCheck">
<meta property="og:title" content="${esc(ogTitle || title)}">
<meta property="og:description" content="${esc(desc)}">
<meta property="og:url" content="${canonical}">
<meta property="og:image" content="${SITE}/icons/og.png">
<meta name="twitter:card" content="summary_large_image">
<meta name="theme-color" content="#4B2BB8">
<link rel="icon" type="image/png" sizes="32x32" href="${up}icons/favicon-32.png">
<link rel="apple-touch-icon" href="${up}icons/apple-touch-icon.png">
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link href="https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@400;500;600;700;800&family=Bricolage+Grotesque:opsz,wght@12..96,800&display=swap" rel="stylesheet">
<link rel="stylesheet" href="${up}assets/site.css">
<link rel="stylesheet" href="${up}assets/med.css">
${ld ? `<script type="application/ld+json">${JSON.stringify(ld)}</script>` : ""}
</head>
<body data-page="med" data-base="${up}">
<a class="skip" href="#main">Skip to content</a>
<div class="wrap">
<header class="top">
  <a class="brand" href="${up}index.html" aria-label="DawaCheck home">${LOGO}<span class="wm"><span class="w-dawa">dawa</span><span class="w-check">check</span></span></a>
</header>
<main id="main" class="doc">
${body}
</main>
</div>
<footer class="site-foot" id="site-foot"></footer>
<script src="${up}assets/site.js"></script>
</body>
</html>
`;
}
const crumbs = items => `<nav class="crumbs" aria-label="Breadcrumb">${items.map(([n, h]) => (h ? `<a href="${h}">${esc(n)}</a>` : esc(n))).join(" › ")}</nav>`;
const crumbLd = items => ({ "@type": "BreadcrumbList", itemListElement: items.map(([n, u], i) => ({ "@type": "ListItem", position: i + 1, name: n, item: u })) });
const faqLd = qa => ({ "@type": "FAQPage", mainEntity: qa.map(([q, a]) => ({ "@type": "Question", name: q, acceptedAnswer: { "@type": "Answer", text: a } })) });
const faqHtml = qa => qa.map(([q, a]) => `<h3>${esc(q)}</h3>\n<p>${esc(a)}</p>`).join("\n");
const KIND = { fake: ["Fake (spurious)", "kind-fake"], substandard: ["Failed lab test", "kind-sub"], recall: ["Recalled", "kind-sub"], unregistered: ["Unregistered", "kind-fake"] };
const kindOf = k => KIND[k] || [k ? k[0].toUpperCase() + k.slice(1) : "Alert", "kind-sub"];
const fmtD = d => { const x = new Date(d + "T00:00:00Z"); return isNaN(x) ? d : x.toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric", timeZone: "UTC" }); };
const alertRows = list => list.map(a => { const [kn, kc] = kindOf(a.k); return `<tr><td>${esc(a.p)}<br><small>${esc(a.m || "")}</small></td><td><b>${esc(a.b || "All batches")}</b></td><td class="${kc}">${kn}</td><td>${fmtD(a.d)}</td><td>${a.l ? `<a href="${esc(a.l)}" rel="nofollow noopener" target="_blank">DRAP</a>` : ""}</td></tr>`; }).join("");
const alertTable = list => `<div class="tw"><table class="ptbl"><thead><tr><th>Product</th><th>Batch</th><th>Finding</th><th>Alert date</th><th>Source</th></tr></thead><tbody>${alertRows(list)}</tbody></table></div>`;
const out = (rel, html) => { const p = path.join(ROOT, rel); fs.mkdirSync(path.dirname(p), { recursive: true }); fs.writeFileSync(p, html); };

/* ---------------------------------------------------------------- brand pages */
fs.rmSync(path.join(ROOT, "medicine"), { recursive: true, force: true });
fs.rmSync(path.join(ROOT, "medicines"), { recursive: true, force: true });
const nAlerts = ALERTS.length.toLocaleString("en");
for (const b of all) {
  const url = `${SITE}/medicine/${b.slug}`;
  const n = b.rows.length, ex = b.rows[0];
  const range = b.min === b.max ? rs(b.min) : `${rs(b.min)} to ${rs(b.max)}`;
  const comp = cleanComp(ex[1]);
  const answer = `DRAP's official price for ${nice(ex[0])} (${ex[3]}) is ${rs(ex[4])}, in effect since ${ex[5]}.` +
    (n > 1 ? ` Across all ${n} ${b.name} packs on the DRAP list, prices run from ${range}.` : "");
  const qa = [
    [`What is the price of ${b.name} in Pakistan?`, answer + ` These are DRAP's maximum retail prices, last checked against the DRAP list on ${META.updated}.`],
    [`What if the pharmacy charges more than this for ${b.name}?`, `Show the pharmacist the DRAP price first. If they won't correct it, call the DRAP helpline on 0800-03727 or file a complaint with DRAP or the Pakistan Citizen's Portal. The price check on dawacheck.pk works out how much extra you paid and drafts the complaint for you.`],
    [`How do I know if my ${b.name} is fake?`, b.alerts.length
      ? `DRAP has issued ${b.alerts.length} alert${b.alerts.length > 1 ? "s" : ""} that name ${b.name}; they're listed on this page with the batch numbers. Compare the batch number printed on your box, or type it into the batch check on dawacheck.pk.`
      : `None of the ${nAlerts} DRAP fake and substandard alerts in our list names ${b.name}. That doesn't prove any one box is genuine, so check the batch number printed on your box with the batch check on dawacheck.pk.`],
  ];
  const sameMaker = (byMaker.get(b.makers[0]) || []).filter(x => x !== b).slice(0, 12);
  const i = all.indexOf(b), near = all.slice(Math.max(0, i - 4), i).concat(all.slice(i + 1, i + 5));
  const L = letterOf(b);
  const crumbItems = [["Home", "../index.html"], ["Medicines A-Z", "../medicines/"], [L.toUpperCase(), `../medicines/${L}`], [b.name, ""]];
  const body = `${crumbs(crumbItems)}
<p class="eyebrow">DRAP official price</p>
<h1>${esc(b.name)} price in Pakistan</h1>
<p class="updated">${n} pack${n > 1 ? "s" : ""} · DRAP list last checked ${esc(META.updated)}</p>
<p class="answer">${esc(answer)}</p>
<div class="khulasa"><b>Asaan lafzon mein</b><p>${esc(b.name)} ki DRAP official qeemat ${range.replace(" to ", " se ")}${b.min === b.max ? "" : " tak"} hai, pack ke hisaab se. Pharmacy is se zyada maange to pehle yeh qeemat dikhayein, phir complaint karein.</p></div>
<div class="ctas"><a href="../index.html?q=${encodeURIComponent(b.name)}#check">Check what you paid</a><a class="alt" href="../index.html#batch">Check a batch number</a></div>
<h2>All ${esc(b.name)} packs and prices</h2>
<div class="tw"><table class="ptbl"><thead><tr><th>Medicine</th><th>Pack</th><th>DRAP price</th><th>Since</th></tr></thead><tbody>
${b.rows.map(r => `<tr><td>${esc(nice(r[0]))}<br><small>${esc(nice(r[2]))}${r[6] ? " · Reg. No. " + esc(r[6]) : ""}</small></td><td>${esc(r[3])}</td><td class="p">${rs(r[4])}</td><td>${esc(r[5])}</td></tr>`).join("\n")}
</tbody></table></div>
${comp ? `<p class="note">Composition (as listed by DRAP): ${esc(comp.slice(0, 220))}</p>` : ""}
<h2>DRAP fake and failed batch alerts for ${esc(b.name)}</h2>
${b.alerts.length ? alertTable(b.alerts) : `<p>No DRAP alert in our list of ${nAlerts} names ${esc(b.name)}. That isn't a guarantee for any single box. Check the batch number on yours with the <a href="../index.html#batch">batch check</a>.</p>`}
<h2>Questions</h2>
${faqHtml(qa)}
${sameMaker.length ? `<h2>More from ${esc(b.makers[0])}</h2>\n<ul class="linkgrid">${sameMaker.map(x => `<li><a href="${x.slug}">${esc(x.name)}</a></li>`).join("")}</ul>` : ""}
<h2>Nearby in the A-Z</h2>
<ul class="linkgrid">${near.map(x => `<li><a href="${x.slug}">${esc(x.name)}</a></li>`).join("")}</ul>
<p class="note">Prices come from DRAP's public price list and are the maximum a pharmacy may charge. DawaCheck is free and isn't part of DRAP or the government. See <a href="../how-we-verify.html">how we verify</a>.</p>`;
  const ld = {
    "@context": "https://schema.org",
    "@graph": [
      { "@type": "WebPage", "@id": url, url, name: `${b.name} price in Pakistan`, inLanguage: "en", dateModified: TODAY, isPartOf: { "@id": `${SITE}/#website` }, publisher: { "@id": `${SITE}/#org` },
        about: { "@type": "Drug", name: b.name, ...(comp ? { activeIngredient: comp.slice(0, 160) } : {}), manufacturer: b.makers.slice(0, 3).map(m => ({ "@type": "Organization", name: m })) } },
      crumbLd([["Home", `${SITE}/`], ["Medicines A-Z", `${SITE}/medicines/`], [L.toUpperCase(), `${SITE}/medicines/${L}`], [b.name, url]]),
      faqLd(qa),
    ],
  };
  const title = `${b.name} price in Pakistan (DRAP official 2026) | DawaCheck`;
  const desc = `${b.name}: DRAP official price ${range}${n > 1 ? ` across ${n} packs` : ""}. Every pack, the date each price was set, and DRAP fake batch alerts. Free, no login.`;
  out(`medicine/${b.slug}.html`, page({ title, desc, canonical: url, depth: 1, body, ld }));
}

/* ---------------------------------------------------------------- A-Z */
const POPULAR = ["panadol", "brufen", "calpol", "augmentin", "risek", "flagyl", "ponstan", "disprin", "amoxil", "velosef", "motilium", "gravinate", "nexum", "omeprazole", "paracetamol", "ibuprofen", "glucophage", "lipiget", "concor", "norvasc", "zyrtec", "softin", "surbex", "caflam", "ventolin", "klaricid", "septran", "ciproxin", "loprin", "xavor"]
  .map(s => brands.get(s)).filter(Boolean);
const letterNav = cur => `<nav class="letters" aria-label="Letters">${LETTERS.map(l => (l === cur ? `<a aria-current="page" href="${l}" style="background:var(--rx);color:#fff">${l.toUpperCase()}</a>` : `<a href="${l}">${l.toUpperCase()}</a>`)).join("")}</nav>`;
for (const L of LETTERS) {
  const list = all.filter(b => letterOf(b) === L);
  const url = `${SITE}/medicines/${L}`;
  const body = `${crumbs([["Home", "../index.html"], ["Medicines A-Z", "./"], [L.toUpperCase(), ""]])}
<p class="eyebrow">Medicines A-Z</p>
<h1>Medicine prices in Pakistan: ${L.toUpperCase()}</h1>
<p class="updated">${list.length} brands · DRAP list last checked ${esc(META.updated)}</p>
${letterNav(L)}
<ul class="linkgrid">${list.map(b => `<li><a href="../medicine/${b.slug}">${esc(b.name)}</a></li>`).join("")}</ul>`;
  out(`medicines/${L}.html`, page({ title: `Medicine prices in Pakistan starting with ${L.toUpperCase()} | DawaCheck`, desc: `DRAP official prices for ${list.length} medicine brands starting with ${L.toUpperCase()}, from ${list[0]?.name || ""} to ${list.at(-1)?.name || ""}. Free, no login.`, canonical: url, depth: 1, body, ld: { "@context": "https://schema.org", ...crumbLd([["Home", `${SITE}/`], ["Medicines A-Z", `${SITE}/medicines/`], [L.toUpperCase(), url]]) } }));
}
{
  const url = `${SITE}/medicines/`;
  const body = `${crumbs([["Home", "../index.html"], ["Medicines A-Z", ""]])}
<p class="eyebrow">Medicines A-Z</p>
<h1>Medicine prices in Pakistan</h1>
<p class="updated">${all.length.toLocaleString("en")} brands · ${PRICES.length.toLocaleString("en")} packs · DRAP list last checked ${esc(META.updated)}</p>
<p class="answer">Every medicine price here is the maximum retail price set by the Drug Regulatory Authority of Pakistan (DRAP). Pick a letter, or open a brand to see each pack, the date its price was set and any DRAP fake batch alerts.</p>
<div class="khulasa"><b>Asaan lafzon mein</b><p>Pakistan mein har dawa ki government (DRAP) qeemat yahan hai. Harf chunein ya dawa ka naam kholein.</p></div>
<div class="ctas"><a href="../index.html#check">Search a medicine</a><a class="alt" href="../fake-medicines">Fake medicine list</a></div>
<h2>Browse by letter</h2>
<nav class="letters" aria-label="Letters">${LETTERS.map(l => `<a href="${l}">${l.toUpperCase()}</a>`).join("")}</nav>
<h2>Popular medicines</h2>
<ul class="linkgrid">${POPULAR.map(b => `<li><a href="../medicine/${b.slug}">${esc(b.name)} price</a></li>`).join("")}</ul>`;
  out("medicines/index.html", page({ title: "Medicine prices in Pakistan A-Z (DRAP official 2026) | DawaCheck", desc: `DRAP official prices for ${all.length.toLocaleString("en")} medicine brands and ${PRICES.length.toLocaleString("en")} packs sold in Pakistan, A to Z. Free, no login.`, canonical: url, depth: 1, body, ld: { "@context": "https://schema.org", ...crumbLd([["Home", `${SITE}/`], ["Medicines A-Z", url]]) } }));
}

/* ---------------------------------------------------------------- fake medicine list */
{
  const url = `${SITE}/fake-medicines`;
  const sorted = [...ALERTS].sort((a, b) => (b.d || "").localeCompare(a.d || ""));
  const nf = ALERTS.filter(a => a.k === "fake").length, ns = ALERTS.filter(a => a.k === "substandard").length;
  const qa = [
    ["How many fake medicines has DRAP found in Pakistan?", `DawaCheck's list holds ${nAlerts} DRAP recall and rapid alerts from ${META.range}: ${nf} for fake (spurious) batches and ${ns} for batches that failed lab tests. Every alert links to DRAP's own notice.`],
    ["How do I check if my medicine batch is fake?", "Find the batch number on the box or strip (often marked B. No. or Lot), then type it into the batch check on dawacheck.pk. It matches the number against every DRAP alert here. A batch that isn't listed hasn't been flagged by DRAP, which isn't the same as proof it's genuine."],
    ["What should I do if my medicine is on this list?", "Stop using it, keep the box and receipt, and report it to DRAP on 0800-03727 or through the Pakistan Citizen's Portal. Talk to your doctor about a replacement."],
  ];
  const body = `${crumbs([["Home", "index.html"], ["Fake medicine list", ""]])}
<p class="eyebrow">DRAP alerts</p>
<h1>Fake and substandard medicine list, Pakistan</h1>
<p class="updated">${nAlerts} alerts · ${esc(META.range)} · last checked ${esc(META.updated)}</p>
<p class="answer">DRAP has flagged ${nf} fake (spurious) batches and ${ns} batches that failed lab tests in the alerts we track. Newest first below. Each row links to DRAP's own notice.</p>
<div class="khulasa"><b>Asaan lafzon mein</b><p>Yeh DRAP ki naqli aur lab test mein fail dawaon ki list hai. Apne dibbe ka batch number yahan dhoondein, ya batch check mein daal kar dekhein.</p></div>
<div class="ctas"><a href="index.html#batch">Check your batch number</a><a class="alt" href="medicines/">Medicine prices A-Z</a></div>
<h2>All alerts</h2>
${alertTable(sorted)}
<h2>Questions</h2>
${faqHtml(qa)}
<p class="note">Source: DRAP recall and rapid alerts. DawaCheck isn't part of DRAP or the government.</p>`;
  out("fake-medicines.html", page({ title: "Fake medicine list Pakistan 2026 (DRAP alerts) | DawaCheck", desc: `${nf} fake and ${ns} substandard medicine batches flagged by DRAP, with batch numbers and links to each DRAP notice. Check your batch free.`, canonical: url, depth: 0, body, ld: { "@context": "https://schema.org", "@graph": [crumbLd([["Home", `${SITE}/`], ["Fake medicine list", url]]), faqLd(qa)] } }));
}

/* ---------------------------------------------------------------- homepage FAQ JSON-LD (English copy of the on-page FAQ) */
{
  const en = INDEX.slice(INDEX.indexOf('en:{a0:'));
  const pick = k => { const m = en.match(new RegExp(`\\b${k}:"((?:[^"\\\\]|\\\\.)*)"`)); return m ? JSON.parse(`"${m[1]}"`) : null; };
  const fill = s => s.replace("__RANGE__", META.range).replace("__N__", nAlerts).replace("__P__", PRICES.length.toLocaleString("en")).replace("__U__", META.updated)
    .replace("__S__", ALERTS.filter(a => a.k === "substandard").length.toLocaleString("en")).replace(/<[^>]+>/g, "");
  const qa = [];
  for (let i = 0; i < 30; i++) { const q = pick("q" + i), a = pick("a" + i); if (!q || !a) break; qa.push([fill(q), fill(a)]); }
  const tag = `<script type="application/ld+json" id="faq-ld">${JSON.stringify({ "@context": "https://schema.org", ...faqLd(qa) })}</script>`;
  let html = fs.readFileSync(path.join(ROOT, "index.html"), "utf8");
  html = /<script type="application\/ld\+json" id="faq-ld">.*?<\/script>/.test(html)
    ? html.replace(/<script type="application\/ld\+json" id="faq-ld">.*?<\/script>/, tag)
    : html.replace("</head>", tag + "\n</head>");
  fs.writeFileSync(path.join(ROOT, "index.html"), html);
  console.log("homepage FAQ entries:", qa.length);
}

/* ---------------------------------------------------------------- sitemap + llms.txt */
const urls = [[`${SITE}/`, "1.0"], [`${SITE}/medicines/`, "0.9"], [`${SITE}/fake-medicines`, "0.9"],
  ...["feedback", "how-we-verify", "privacy", "terms", "cookies"].map(p => [`${SITE}/${p}.html`, "0.3"]),
  ...LETTERS.map(l => [`${SITE}/medicines/${l}`, "0.6"]),
  ...all.map(b => [`${SITE}/medicine/${b.slug}`, POPULAR.includes(b) ? "0.8" : "0.6"])];
out("sitemap.xml", `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${urls.map(([u, p]) => `  <url><loc>${u}</loc><lastmod>${TODAY}</lastmod><priority>${p}</priority></url>`).join("\n")}
</urlset>
`);
out("llms.txt", `# DawaCheck (dawacheck.pk)

> Free website for Pakistan that shows the official DRAP (Drug Regulatory Authority of Pakistan) retail price of every registered medicine pack, and checks medicine batch numbers against DRAP's fake (spurious) and substandard alerts. No login. Roman Urdu and English.

- Data: ${PRICES.length.toLocaleString("en")} DRAP price entries across ${all.length.toLocaleString("en")} brands; ${nAlerts} DRAP recall and rapid alerts (${META.range}). Last checked against DRAP on ${META.updated}.
- Prices are DRAP's maximum retail prices. Charging more is a complaint to DRAP (helpline 0800-03727) or the Pakistan Citizen's Portal.
- A batch that isn't in DRAP's alerts hasn't been flagged; that isn't proof it's genuine.
- DawaCheck is independent and not part of DRAP or the government.

## Pages

- [Price and batch check](${SITE}/): search a medicine, enter what you paid, see if you were overcharged; check a batch number.
- [Medicine prices A-Z](${SITE}/medicines/): one page per brand, e.g. ${SITE}/medicine/panadol
- [Fake medicine list](${SITE}/fake-medicines): every DRAP fake and substandard alert with batch numbers and source links.
- [How we verify](${SITE}/how-we-verify.html)
`);
console.log(`brand pages: ${all.length}, letters: ${LETTERS.length}, sitemap urls: ${urls.length}`);
