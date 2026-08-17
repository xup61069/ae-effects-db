const MANIFEST_URL = "dist/web/asset-manifest.json";
const CACHE_PREFIX = "ae-effects-db-";
const BUILD_VERSION = "6d85f7f3c16b13d5";
const currentCacheName = () => `${CACHE_PREFIX}${BUILD_VERSION}`;

async function sha256(response) {
  const bytes = await response.clone().arrayBuffer();
  const normalized = new TextEncoder().encode(new TextDecoder().decode(bytes).replace(/\r\n/g, "\n"));
  const digest = await crypto.subtle.digest("SHA-256", normalized);
  return [...new Uint8Array(digest)].map(value => value.toString(16).padStart(2, "0")).join("");
}

async function fetchVerifiedAsset(path, url, expected) {
  if (!/^[0-9a-f]{64}$/.test(expected || "")) throw new Error(`asset integrity missing: ${path}`);
  const response = await fetch(new Request(url, {cache:"no-store"}));
  if (!response.ok) throw new Error(`asset fetch: ${path} (${response.status})`);
  const actual = await sha256(response);
  if (actual !== expected) throw new Error(`asset integrity mismatch: ${path}`);
  return [url, response];
}

async function cacheManifestAssets(manifestResponse) {
  const manifest = await manifestResponse.clone().json();
  if (manifest.version !== BUILD_VERSION) throw new Error(`asset version mismatch: ${manifest.version}`);
  const cache = await caches.open(currentCacheName());
  const base = self.registration.scope;
  const paths = [...new Set(["./", ...(manifest.shell || []), ...(manifest.data || [])])]
    .filter(path => path !== MANIFEST_URL);
  const missing = [];
  for (const path of paths) {
    const url = new URL(path, base).href;
    if (!(await cache.match(url, {ignoreSearch:true}))) missing.push([path, url]);
  }
  const verified = await Promise.all(
    missing.map(([path, url]) => fetchVerifiedAsset(path, url, manifest.integrity?.[path]))
  );
  await Promise.all(verified.map(([url, response]) => cache.put(url, response)));
  await cache.put(new URL(MANIFEST_URL, base), manifestResponse);
}

async function installVersion() {
  const manifestResponse = await fetch(MANIFEST_URL, {cache:"no-store"});
  if (!manifestResponse.ok) throw new Error(`asset manifest: ${manifestResponse.status}`);
  await cacheManifestAssets(manifestResponse);
}

self.addEventListener("install", event => event.waitUntil(installVersion()));

self.addEventListener("message", event => {
  if (event.data?.type === "SKIP_WAITING") self.skipWaiting();
});

self.addEventListener("activate", event => {
  event.waitUntil((async () => {
    const names = await caches.keys();
    const currentName = currentCacheName();
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
    const cache = await caches.open(currentCacheName());
    const cached = await cache.match(request, {ignoreSearch:true});
    const manifestUrl = new URL(MANIFEST_URL, self.registration.scope);
    const isManifest = url.pathname === manifestUrl.pathname;
    if (cached) {
      if (isManifest) await cacheManifestAssets(cached.clone()).catch(() => {});
      return cached;
    }
    try {
      const response = await fetch(request);
      if (response.ok) {
        if (isManifest) await cacheManifestAssets(response.clone());
        else await cache.put(request, response.clone());
      }
      return response;
    } catch (error) {
      if (request.mode === "navigate") return (await cache.match(new URL("./", self.registration.scope))) || Response.error();
      throw error;
    }
  })());
});
