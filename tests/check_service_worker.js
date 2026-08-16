const assert = require("assert");
const crypto = require("crypto");
const fs = require("fs");
const path = require("path");
const vm = require("vm");

const root = path.resolve(__dirname, "..");
const workerSource = fs.readFileSync(path.join(root, "service-worker.js"), "utf8");
const version = workerSource.match(/const BUILD_VERSION = "([0-9a-f]{16})";/)?.[1];
assert(version, "Service worker build version is missing");

const digest = value => crypto.createHash("sha256").update(value).digest("hex");

async function installWith({tampered = false} = {}) {
  const scope = "https://example.test/ae-effects-db/";
  const body = "<!doctype html>\r\n<title>verified shell</title>\r\n";
  const canonicalBody = body.replace(/\r\n/g, "\n");
  const manifest = {
    version,
    data: [],
    shell: ["./", "index.html"],
    integrity: {"./": digest(canonicalBody), "index.html": digest(canonicalBody)},
  };
  const handlers = {};
  const requests = [];
  const puts = [];
  const cache = {
    match: async () => undefined,
    put: async (key, response) => puts.push([String(key), await response.clone().text()]),
  };
  const context = {
    Request,
    Response,
    URL,
    Uint8Array,
    TextDecoder,
    TextEncoder,
    crypto: crypto.webcrypto,
    caches: {open: async () => cache},
    fetch: async (input, options) => {
      if (typeof input === "string") {
        assert.equal(input, "dist/web/asset-manifest.json");
        assert.equal(options.cache, "no-store");
        return new Response(JSON.stringify(manifest), {headers:{"Content-Type":"application/json"}});
      }
      requests.push(input);
      const isIndex = new URL(input.url).pathname.endsWith("/index.html");
      return new Response(tampered && isIndex ? `${body} stale` : body);
    },
    self: {
      registration: {scope},
      addEventListener: (name, handler) => { handlers[name] = handler; },
    },
  };
  vm.runInNewContext(workerSource, context, {filename:"service-worker.js"});
  let install;
  handlers.install({waitUntil: promise => { install = promise; }});
  await install;
  return {puts, requests};
}

(async () => {
  const installed = await installWith();
  assert.equal(installed.requests.length, 2);
  assert(installed.requests.every(request => request.cache === "no-store"));
  assert.equal(installed.puts.length, 3, "two verified assets and the manifest must be cached");

  await assert.rejects(() => installWith({tampered:true}), /asset integrity mismatch: index\.html/);
  console.log("Service worker verifies every newly cached asset and rejects stale content.");
})().catch(error => {
  console.error(error);
  process.exitCode = 1;
});
