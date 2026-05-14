const CACHE_NAME = "elysiaai-shell-v6";
const SHELL_URLS = [
  "/",
  "/stark-ops.html",
  "/native-lite.html",
  "/suit-hud.html",
  "/suit-viewer.html",
  "/pwa-register.js",
  "/assets/js/liquid-glass-webgl.js",
  "/pwa-shell.js",
  "/sw.js",
  "/service-worker.js",
  "/logo.png",
  "/icons/icon-192.png",
  "/icons/icon-512.png",
  "/manifest.json",
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
            .filter((name) => name !== CACHE_NAME)
            .map((name) => caches.delete(name))
        )
      )
      .then(() => self.clients.claim())
  );
});

async function rehydrateShell() {
  const cache = await caches.open(CACHE_NAME);
  await Promise.all(
    SHELL_URLS.map(async (url) => {
      try {
        const response = await fetch(new Request(url, { cache: "no-store" }));
        if (response.ok) {
          await cache.put(url, response.clone());
        }
      } catch {}
    })
  );
}

self.addEventListener("message", (event) => {
  if (event.data?.type !== "rehydrate") return;
  event.waitUntil(rehydrateShell());
});

function isLocalCoreRequest(pathname) {
  return (
    pathname === "/health" ||
    pathname.startsWith("/api/") ||
    pathname.startsWith("/auth/") ||
    pathname === "/elysia-love" ||
    pathname === "/feedback"
  );
}

self.addEventListener("fetch", (event) => {
  if (event.request.method !== "GET") return;

  const url = new URL(event.request.url);
  if (url.origin !== self.location.origin) return;

  if (isLocalCoreRequest(url.pathname)) {
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
