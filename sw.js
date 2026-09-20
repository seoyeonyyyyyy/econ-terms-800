// 앱을 고치면 사용자에게 바로 닿아야 한다.
// 전부 캐시 우선으로 두면 새 코드를 배포해도 옛 화면이 계속 나온다(실측).
// 그래서 코드·화면은 네트워크 우선, 덩치 크고 잘 안 바뀌는 용어 데이터만 캐시 우선으로 둔다.
const VERSION = "v4";
const CACHE = `econ-${VERSION}`;

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
  const req = e.request;
  if (req.method !== "GET") return;

  // 용어 데이터는 1MB가 넘으니 캐시를 먼저 내주되, 뒤에서 새로 받아 갱신한다.
  // 캐시만 쓰면 데이터를 고쳐도 영영 옛것이 나온다(실측: 지운 영문명이 화면에 남았다).
  if (new URL(req.url).pathname.endsWith("terms.json")) {
    e.respondWith(
      caches.match(req).then((hit) => {
        const fresh = fetch(req)
          .then((res) => {
            const copy = res.clone();
            caches.open(CACHE).then((c) => c.put(req, copy)).catch(() => {});
            return res;
          })
          .catch(() => hit);
        return hit || fresh;
      })
    );
    return;
  }

  // 나머지는 네트워크 우선. 끊겼을 때만 캐시로 돌아간다
  e.respondWith(
    fetch(req)
      .then((res) => {
        const copy = res.clone();
        caches.open(CACHE).then((c) => c.put(req, copy)).catch(() => {});
        return res;
      })
      .catch(() => caches.match(req).then((hit) => hit || Response.error()))
  );
});
