/* KFA offline support: keep the member's QR page working with zero signal.
   - member pages (/m/<token>): network-first, fall back to the last cached copy
   - static assets (_next/static, icons, brand): cache-first
   - everything else (API, dashboard, videos): network only */

const PAGE_CACHE = "kfa-pages-v1";
const STATIC_CACHE = "kfa-static-v1";

self.addEventListener("install", () => {
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    (async () => {
      const keys = await caches.keys();
      await Promise.all(
        keys
          .filter((k) => ![PAGE_CACHE, STATIC_CACHE].includes(k))
          .map((k) => caches.delete(k))
      );
      await self.clients.claim();
    })()
  );
});

self.addEventListener("fetch", (event) => {
  const req = event.request;
  if (req.method !== "GET") return;
  const url = new URL(req.url);
  if (url.origin !== self.location.origin) return;

  // Member page navigations: network-first with offline fallback.
  if (req.mode === "navigate" && url.pathname.startsWith("/m/")) {
    event.respondWith(
      (async () => {
        try {
          const fresh = await fetch(req);
          if (fresh.ok) {
            const cache = await caches.open(PAGE_CACHE);
            cache.put(url.pathname, fresh.clone());
          }
          return fresh;
        } catch {
          const cached = await caches.match(url.pathname, {
            cacheName: PAGE_CACHE,
          });
          return (
            cached ||
            new Response(
              "<h1 style='font-family:sans-serif;color:#d4a017;background:#0a0908;height:100vh;display:flex;align-items:center;justify-content:center;margin:0'>Offline — open once with signal first</h1>",
              { headers: { "Content-Type": "text/html" } }
            )
          );
        }
      })()
    );
    return;
  }

  // Static assets: cache-first (they're content-hashed or stable).
  if (
    url.pathname.startsWith("/_next/static/") ||
    url.pathname.startsWith("/icons/") ||
    url.pathname.startsWith("/brand/") ||
    url.pathname.startsWith("/api/avatar/")
  ) {
    event.respondWith(
      (async () => {
        const cached = await caches.match(req, { cacheName: STATIC_CACHE });
        if (cached) return cached;
        const fresh = await fetch(req);
        if (fresh.ok) {
          const cache = await caches.open(STATIC_CACHE);
          cache.put(req, fresh.clone());
        }
        return fresh;
      })()
    );
  }
});
