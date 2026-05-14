const CACHE_NAME = "elysiaai-shell-v3";
const API_CACHE_NAME = "elysiaai-api-v1";
const SHELL_URLS = [
  "/",
  "/stark-ops.html",
  "/native-lite.html",
  "/suit-hud.html",
  "/suit-viewer.html",
  "/pwa-shell.js",
  "/sw.js",
  "/service-worker.js",
  "/logo.png",
  "/icons/icon-192.png",
  "/icons/icon-512.png",
  "/manifest.webmanifest"
];

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches
      .open(CACHE_NAME)
      .then((cache) => cache.addAll(SHELL_URLS))
      .then(() => self.skipWaiting())
  );
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((names) =>
        Promise.all(
          names
            .filter((name) => name !== CACHE_NAME && name !== API_CACHE_NAME)
            .map((name) => caches.delete(name))
        )
      )
      .then(() => self.clients.claim())
  );
});

async function staleWhileRevalidate(request) {
  const cached = await caches.match(request);
  const cache = await caches.open(API_CACHE_NAME);
  const network = fetch(request).then((response) => {
    if (response.ok) cache.put(request, response.clone());
    return response;
  });

  return (
    cached ||
    network.catch(
      () =>
        new Response(JSON.stringify({ error: "offline", status: 503 }), {
          status: 503,
          headers: { "content-type": "application/json; charset=utf-8" }
        })
    )
  );
}

self.addEventListener("fetch", (event) => {
  if (event.request.method !== "GET") return;

  const url = new URL(event.request.url);
  if (url.origin !== self.location.origin) return;

  if (url.pathname.startsWith("/api/")) {
    event.respondWith(staleWhileRevalidate(event.request));
    return;
  }

  event.respondWith(
    fetch(event.request)
      .then((response) => {
        if (response.ok) {
          const copy = response.clone();
          caches.open(CACHE_NAME).then((cache) => cache.put(event.request, copy));
        }
        return response;
      })
      .catch(async () => {
        const cached = await caches.match(event.request);
        if (cached) return cached;
        if (event.request.mode === "navigate") {
          return caches.match("/stark-ops.html");
        }
        return Response.error();
      })
  );
});
