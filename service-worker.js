const MANIFEST_URL = "dist/web/asset-manifest.json";
const CACHE_PREFIX = "ae-effects-db-";
const BUILD_VERSION = "98bb61e01b4c4562";

async function installVersion() {
  const manifestResponse = await fetch(MANIFEST_URL, {cache:"no-store"});
  if (!manifestResponse.ok) throw new Error(`asset manifest: ${manifestResponse.status}`);
  const manifest = await manifestResponse.clone().json();
  if (manifest.version !== BUILD_VERSION) throw new Error(`asset version mismatch: ${manifest.version}`);
  const cache = await caches.open(`${CACHE_PREFIX}${manifest.version}`);
  const base = self.registration.scope;
  const urls = [...new Set(["./", MANIFEST_URL, ...(manifest.shell || []), ...(manifest.data || [])])]
    .map(path => new URL(path, base).href);
  await cache.addAll(urls.filter(url => url !== new URL(MANIFEST_URL, base).href));
  await cache.put(new URL(MANIFEST_URL, base), manifestResponse);
}

self.addEventListener("install", event => event.waitUntil(installVersion()));

self.addEventListener("message", event => {
  if (event.data?.type === "SKIP_WAITING") self.skipWaiting();
});

self.addEventListener("activate", event => {
  event.waitUntil((async () => {
    const names = await caches.keys();
    const currentName = `${CACHE_PREFIX}${BUILD_VERSION}`;
    await Promise.all(names.filter(name => name.startsWith(CACHE_PREFIX) && name !== currentName).map(name => caches.delete(name)));
    await self.clients.claim();
  })());
});

self.addEventListener("fetch", event => {
  const request = event.request;
  if (request.method !== "GET") return;
  const url = new URL(request.url);
  if (url.origin !== self.location.origin) return;
  event.respondWith((async () => {
    const cached = await caches.match(request, {ignoreSearch:true});
    if (cached) return cached;
    try {
      const response = await fetch(request);
      if (response.ok) {
        const currentName = `${CACHE_PREFIX}${BUILD_VERSION}`;
        if ((await caches.has(currentName))) (await caches.open(currentName)).put(request, response.clone());
      }
      return response;
    } catch (error) {
      if (request.mode === "navigate") return (await caches.match(new URL("./", self.registration.scope))) || Response.error();
      throw error;
    }
  })());
});
