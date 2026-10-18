/* Offline copy of the site. Bump VERSION whenever data/*.js or any page changes. */
const VERSION = "dc-2026-10-18c";
const FILES = [
  "./", "index.html", "privacy.html", "terms.html", "cookies.html", "how-we-verify.html", "feedback.html", "404.html",
  "assets/site.css", "assets/site.js", "data/alerts.js", "data/prices.js",
  "manifest.webmanifest", "icons/icon-192.png", "icons/favicon-32.png"
];
self.addEventListener("install", e => {
  e.waitUntil(caches.open(VERSION).then(c => c.addAll(FILES)).then(() => self.skipWaiting()));
});
self.addEventListener("activate", e => {
  e.waitUntil(caches.keys().then(keys => Promise.all(keys.filter(k => k !== VERSION).map(k => caches.delete(k)))).then(() => self.clients.claim()));
});
self.addEventListener("fetch", e => {
  const url = new URL(e.request.url);
  if (e.request.method !== "GET" || url.origin !== location.origin) return;
  // Pages: network first so updates show up; files: cache first for speed.
  if (e.request.mode === "navigate") {
    e.respondWith(fetch(e.request).then(r => { const c = r.clone(); caches.open(VERSION).then(x => x.put(e.request, c)); return r; })
      .catch(() => caches.match(e.request).then(r => r || caches.match("index.html"))));
    return;
  }
  e.respondWith(caches.match(e.request).then(r => r || fetch(e.request)));
});
