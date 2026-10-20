"""Downloads every page of DRAP's public price list into <out>/pages/.
   python3 fetch.py <out-dir>   (3 requests at a time, resumes where it stopped)"""
import sys, os, re, time, urllib.request, concurrent.futures as cf

OUT = os.path.join(sys.argv[1], "pages")
os.makedirs(OUT, exist_ok=True)
URL = "https://e.dra.gov.pk/public/price?page={}"
UA = {"User-Agent": "DawaCheck price sync (hello@dawacheck.pk)"}

def fetch(n):
    return urllib.request.urlopen(urllib.request.Request(URL.format(n), headers=UA), timeout=40).read().decode("utf8", "replace")

first = fetch(1)
last = max(int(x) for x in re.findall(r"public/price\?page=(\d+)", first))
print("pages:", last, flush=True)

def get(n):
    f = os.path.join(OUT, f"{n:05d}.html")
    if os.path.exists(f) and os.path.getsize(f) > 5000:
        return n, True
    for a in range(4):
        try:
            t = fetch(n)
            if "hover:bg-emerald-50" in t:
                open(f, "w").write(t)
                time.sleep(0.4)
                return n, True
        except Exception:
            pass
        time.sleep(2 * (a + 1))
    return n, False

bad = []
with cf.ThreadPoolExecutor(3) as ex:
    for n, ok in ex.map(get, range(1, last + 1)):
        if not ok:
            bad.append(n)
        if n % 100 == 0:
            print(n, flush=True)
print("failed:", bad)
sys.exit(1 if bad else 0)
