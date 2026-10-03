// 最小のサービスワーカー(docs/design/2026-10-03-closed-beta-design.md 6-2)。
// ページを開こうとして通信が失敗したときだけ、保存した「つながらないよ」の画面を返す。
// API・画像・音などの通信には一切さわらない(古い画面が残らないように、ほかは何も保存しない)。
const CACHE = "spra-offline-v1";
const OFFLINE_URL = "/offline.html";

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches
      .open(CACHE)
      .then((cache) => cache.addAll([OFFLINE_URL, "/icons/icon-192.png"]))
      .then(() => self.skipWaiting()),
  );
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) => Promise.all(keys.filter((key) => key !== CACHE).map((key) => caches.delete(key))))
      .then(() => self.clients.claim()),
  );
});

self.addEventListener("fetch", (event) => {
  if (event.request.mode !== "navigate") return;
  event.respondWith(fetch(event.request).catch(() => caches.match(OFFLINE_URL)));
});
