const CACHE = "econ-v1";
const ASSETS = [
  "./", "./index.html", "./css/style.css",
  "./js/app.js", "./js/store.js", "./js/filter.js", "./js/list.js",
  "./js/session.js", "./js/quiz.js", "./js/quiz-ui.js", "./js/stats.js",
  "./data/terms.json", "./manifest.json",
];

self.addEventListener("install", (e) => {
  e.waitUntil(caches.open(CACHE).then((c) => c.addAll(ASSETS)));
  self.skipWaiting();
});

self.addEventListener("activate", (e) => {
  e.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k))))
  );
  self.clients.claim();
});

self.addEventListener("fetch", (e) => {
  e.respondWith(caches.match(e.request).then((hit) => hit || fetch(e.request)));
});
