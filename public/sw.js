// 셔틀랭크 PWA 서비스워커 — 설치 가능 요건(fetch 핸들러) + 오프라인 폴백.
// 네트워크 우선(network-first): 온라인이면 항상 최신, 오프라인이면 마지막 캐시 제공.
const CACHE = "shuttlerank-v1";

self.addEventListener("install", () => self.skipWaiting());

self.addEventListener("activate", (e) => {
  e.waitUntil(
    caches.keys().then((keys) => Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k)))).then(() => self.clients.claim())
  );
});

self.addEventListener("fetch", (e) => {
  const req = e.request;
  if (req.method !== "GET" || new URL(req.url).origin !== self.location.origin) return;
  e.respondWith(
    fetch(req)
      .then((res) => {
        const copy = res.clone();
        caches.open(CACHE).then((c) => c.put(req, copy)).catch(() => {});
        return res;
      })
      .catch(() => caches.match(req).then((m) => m || (req.mode === "navigate" ? caches.match("/") : undefined)))
  );
});
