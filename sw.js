/* Offline-Cache für die App-Dateien. Produktabfragen (Open Food Facts) laufen immer übers Netz. */
const CACHE = "haut-cockpit-v16";
const FILES = ["./", "index.html", "style.css", "data.js", "tips.js", "core.js", "analysis.js", "ui1.js", "wissen.js", "fotos.js", "ui2.js", "manifest.webmanifest", "icon-192.png", "icon-512.png"];
/* Beim Installieren frisch vom Server holen (cache: "reload"), damit keine alten Dateien in den neuen Cache geraten */
self.addEventListener("install", e => { e.waitUntil(caches.open(CACHE).then(c => c.addAll(FILES.map(f => new Request(f, { cache: "reload" })))).then(() => self.skipWaiting())); });
self.addEventListener("activate", e => {
  e.waitUntil(caches.keys().then(ks => Promise.all(ks.filter(k => k !== CACHE).map(k => caches.delete(k)))).then(() => self.clients.claim()));
});
self.addEventListener("fetch", e => {
  const u = new URL(e.request.url);
  if (e.request.method !== "GET" || u.origin !== location.origin) return;
  // Netz zuerst (damit Updates ankommen), Cache als Rückfall offline
  e.respondWith(fetch(e.request, { cache: "no-cache" }).then(r => { const copy = r.clone(); caches.open(CACHE).then(c => c.put(e.request, copy)); return r; }).catch(() => caches.match(e.request).then(m => m || caches.match("index.html"))));
});
