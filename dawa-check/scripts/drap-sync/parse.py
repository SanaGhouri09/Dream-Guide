"""Turns the downloaded pages into <out>/drap_rows.json in the same row format as data/prices.js:
   [name, composition, company, pack, price, effective since, reg no].   python3 parse.py <out-dir>"""
import sys, os, re, json, html, glob

D = sys.argv[1]
txt = lambda s: re.sub(r"\s+", " ", html.unescape(re.sub(r"<[^>]+>", " ", s))).strip()
rows = []
for f in sorted(glob.glob(os.path.join(D, "pages", "*.html"))):
    for r in open(f).read().split('<tr class="hover:bg-emerald-50">')[1:]:
        tds = re.findall(r"<td[^>]*>(.*?)</td>", r.split("</tr>")[0], re.S)
        if len(tds) < 7:
            continue
        divs = [x for x in (txt(d) for d in re.findall(r"<div[^>]*>([^<]*)</div>", tds[0])) if x]
        maker = [txt(d) for d in re.findall(r"<div[^>]*>(.*?)</div>", tds[2], re.S)]
        try:
            price = round(float(txt(tds[5]).replace("Rs", "").replace(",", "").strip()), 2)
        except ValueError:
            price = 0
        rows.append([divs[0] if divs else txt(tds[0]), divs[1] if len(divs) > 1 else "",
                     maker[0] if maker else txt(tds[2]), txt(tds[4]), price, txt(tds[6]), txt(tds[1])])
json.dump(rows, open(os.path.join(D, "drap_rows.json"), "w"))
print("rows:", len(rows))
