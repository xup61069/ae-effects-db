#!/usr/bin/env node
"use strict";

const fs = require("fs");
const path = require("path");

const ROOT = path.resolve(__dirname, "..");
const DATA_DIR = path.join(ROOT, "data");
const OUTPUT = path.join(ROOT, "curation", "localization.json");
const VERIFY_DATE = new Date().toISOString().slice(0, 10);
const USER_AGENT = "ae-effects-db localization verifier/1.0 (+https://github.com/xup61069/ae-effects-db)";

const OFFICIAL_CATEGORY_RULES = [
  {id:"3d-channel",patterns:["/3d-channel-effects.html"],labels:{en:"3D Channel",ja:"3D チャンネル"}},
  {id:"audio",patterns:["/audio-effects.html"],labels:{en:"Audio",ja:"オーディオ"}},
  {id:"blur-sharpen",patterns:["/blur-sharpen-effects.html","/blur-and-sharpen-effects.html"],labels:{en:"Blur & Sharpen",ja:"ブラー＆シャープ"}},
  {id:"channel",patterns:["/channel-effects.html"],labels:{en:"Channel",ja:"チャンネル"}},
  {id:"color-correction",patterns:["/color-correction-effects.html"],labels:{en:"Color Correction",ja:"カラー補正"}},
  {id:"distort",patterns:["/distort-effects.html","/detail-preserving-upscale-effect.html"],labels:{en:"Distort",ja:"ディストーション"}},
  {id:"expression-controls",patterns:["/expression-controls-effects.html"],labels:{en:"Expression Controls",ja:"エクスプレッション制御"}},
  {id:"generate",patterns:["/generate-effects.html"],labels:{en:"Generate",ja:"描画"}},
  {id:"immersive-video",patterns:["/immersive-video-effects.html","/vr-effects.html"],labels:{en:"Immersive Video",ja:"イマーシブビデオ"}},
  {id:"keying",patterns:["/keying-effects.html"],labels:{en:"Keying",ja:"キーイング"}},
  {id:"matte",patterns:["/matte-effects.html"],labels:{en:"Matte",ja:"マット"}},
  {id:"noise-grain",patterns:["/noise-grain-effects.html","/noise-and-grain-effects.html"],labels:{en:"Noise & Grain",ja:"ノイズ＆グレイン"}},
  {id:"perspective",patterns:["/perspective-effects.html"],labels:{en:"Perspective",ja:"遠近"}},
  {id:"simulation",patterns:["/simulation-effects.html"],labels:{en:"Simulation",ja:"シミュレーション"}},
  {id:"stylize",patterns:["/stylize-effects.html"],labels:{en:"Stylize",ja:"スタイライズ"}},
  {id:"text",patterns:["/text-effects.html"],labels:{en:"Text",ja:"テキスト"}},
  {id:"time",patterns:["/time-effects.html"],labels:{en:"Time",ja:"時間"}},
  {id:"transition",patterns:["/transition-effects.html"],labels:{en:"Transition",ja:"トランジション"}},
  {id:"utility",patterns:["/utility-effects.html"],labels:{en:"Utility",ja:"ユーティリティ"}}
];

const OFFICIAL_CATEGORIES = Object.fromEntries(OFFICIAL_CATEGORY_RULES.map(rule => [rule.id, rule.labels]));
Object.assign(OFFICIAL_CATEGORIES, {
  "boris-fx-mocha":{en:"Boris FX Mocha",ja:"Boris FX Mocha"},
  "cinema-4d":{en:"CINEMA 4D",ja:"Cinema 4D"},
  obsolete:{en:"Obsolete",ja:"旧バージョン"}
});

const ADOBE_TABLE_CATEGORY_IDS = {
  "3D Channel":"3d-channel",Audio:"audio","Blur & Sharpen":"blur-sharpen","Boris FX Mocha":"boris-fx-mocha",
  Channel:"channel","CINEMA 4D":"cinema-4d","Color Correction":"color-correction",Distort:"distort",
  "Expression Controls":"expression-controls",Generate:"generate","Immersive Video":"immersive-video",Keying:"keying",
  Matte:"matte","Noise & Grain":"noise-grain",Obsolete:"obsolete",Perspective:"perspective",Simulation:"simulation",
  Stylize:"stylize",Text:"text",Time:"time",Transition:"transition",Utility:"utility"
};

const ADOBE_EFFECT_ALIASES = {
  "Curves / Tint / Tritone":{category:"color-correction"},
  Keylight:{official:"Keylight (1.2)"},
  "Warp Stabilizer VFX":{official:"Warp Stabilizer"},
  "Linear/Radial Wipe":{category:"transition"},
  "CC Burn Film":{official:"CC Burn Flim"},
  "Box Blur":{official:"Fast Box Blur"},
  "CC Radial Scale Wipe":{official:"CC Radial ScaleWipe"},
  "VR Projection":{category:"immersive-video"},
  "ProEXR (EXtractoR / IDentifier)":{category:"3d-channel"},
  "VR / 沉浸式視訊效果組":{category:"immersive-video"},
  "CC Rain":{official:"CC Rainfall"},
  "CC Snow":{official:"CC Snowfall"}
};

const OFFICIAL_CATEGORY_EXCLUSIONS = {
  "Smart Mask Interpolation":"Adobe mask interpolation panel/tool, not an effect-menu entry.",
  "Time-Reverse Keyframes":"Adobe keyframe command, not an effect-menu entry."
};

const JAPANESE_CANONICAL_OVERRIDES = {
  "https://helpx.adobe.com/after-effects/desktop/apply-effects-and-animation-presets/list-of-effects.html":"https://helpx.adobe.com/jp/after-effects/using/effect-list.html",
  "https://helpx.adobe.com/after-effects/desktop/apply-effects-and-animation-presets/list-of-effects/blur-and-sharpen-effects.html":"https://helpx.adobe.com/jp/after-effects/desktop/apply-effects-and-animation-presets/list-of-effects/blur-sharpen-effects.html",
  "https://helpx.adobe.com/after-effects/desktop/apply-effects-and-animation-presets/list-of-effects/color-correction-effects.html":"https://helpx.adobe.com/jp/after-effects/using/color-correction-effects.html",
  "https://helpx.adobe.com/after-effects/desktop/apply-effects-and-animation-presets/list-of-effects/keying-effects.html":"https://helpx.adobe.com/jp/after-effects/using/keying-effects.html",
  "https://helpx.adobe.com/after-effects/desktop/apply-effects-and-animation-presets/list-of-effects/matte-effects.html":"https://helpx.adobe.com/jp/after-effects/using/matte-effects.html",
  "https://helpx.adobe.com/after-effects/desktop/apply-effects-and-animation-presets/list-of-effects/noise-and-grain-effects.html":"https://helpx.adobe.com/jp/after-effects/desktop/apply-effects-and-animation-presets/list-of-effects/noise-grain-effects.html"
};

function readRows() {
  const rows = [];
  for (const file of fs.readdirSync(DATA_DIR).filter(name => name.endsWith(".jsonl"))) {
    const lines = fs.readFileSync(path.join(DATA_DIR, file), "utf8").split(/\r?\n/).filter(Boolean);
    for (const line of lines) rows.push(JSON.parse(line));
  }
  return rows;
}

function localizedCandidate(value) {
  if (JAPANESE_CANONICAL_OVERRIDES[value]) return JAPANESE_CANONICAL_OVERRIDES[value];
  let url;
  try { url = new URL(value); } catch (_) { return null; }
  if (url.hostname === "helpx.adobe.com" && !/^\/(?:jp|tw|cn)\//.test(url.pathname)) {
    url.pathname = `/jp${url.pathname}`;
    return url.href;
  }
  if (url.hostname === "www.maxon.net" && url.pathname.startsWith("/en/")) {
    url.pathname = `/ja/${url.pathname.slice(4)}`;
    return url.href;
  }
  return null;
}

function decodeHtml(value) {
  return value.replace(/<[^>]+>/g, " ")
    .replace(/&nbsp;|&#160;/gi, " ").replace(/&amp;/gi, "&").replace(/&quot;/gi, '"')
    .replace(/&#x([0-9a-f]+);/gi, (_, hex) => String.fromCodePoint(parseInt(hex, 16)))
    .replace(/&#(\d+);/g, (_, number) => String.fromCodePoint(Number(number)))
    .replace(/\s+/g, " ").trim();
}

function normalizeEffectName(value) {
  return String(value).normalize("NFKC").toLowerCase().replace(/[®™]/g, "")
    .replace(/[‐‑‒–—]/g, "-").replace(/\s+/g, " ").trim();
}

function parseAdobeEffectTable(html) {
  const effects = new Map();
  for (const table of html.matchAll(/<table\b[^>]*>([\s\S]*?)<\/table>/gi)) {
    const rows = [...table[1].matchAll(/<tr\b[^>]*>([\s\S]*?)<\/tr>/gi)];
    if (rows.length < 2) continue;
    const firstCells = [...rows[1][1].matchAll(/<t[hd]\b[^>]*>([\s\S]*?)<\/t[hd]>/gi)].map(cell => decodeHtml(cell[1]));
    const categoryId = ADOBE_TABLE_CATEGORY_IDS[firstCells[0]];
    if (!categoryId) continue;
    for (let index = 1; index < rows.length; index++) {
      const cells = [...rows[index][1].matchAll(/<t[hd]\b[^>]*>([\s\S]*?)<\/t[hd]>/gi)].map(cell => decodeHtml(cell[1]));
      const effectName = index === 1 ? cells[1] : cells[0];
      if (effectName) effects.set(normalizeEffectName(effectName), {name:effectName,category:categoryId});
    }
  }
  return effects;
}

async function fetchAdobeEffectCategories() {
  const source = "https://helpx.adobe.com/after-effects/desktop/apply-effects-and-animation-presets/effects-and-animation-presets/effect-list.html";
  const response = await fetch(source, {headers:{"User-Agent":USER_AGENT,"Accept-Language":"en"},redirect:"follow"});
  if (!response.ok) throw new Error(`Adobe effect list returned HTTP ${response.status}`);
  const officialEffects = parseAdobeEffectTable(await response.text());
  if (officialEffects.size < 280) throw new Error(`Adobe effect list parser found only ${officialEffects.size} effects`);
  const builtinRows = fs.readFileSync(path.join(DATA_DIR, "builtin-ae.jsonl"), "utf8").split(/\r?\n/).filter(Boolean).map(JSON.parse);
  const categories = {};
  for (const row of builtinRows) {
    if (OFFICIAL_CATEGORY_EXCLUSIONS[row.name]) continue;
    const alias = ADOBE_EFFECT_ALIASES[row.name] || {};
    const match = alias.official ? officialEffects.get(normalizeEffectName(alias.official)) : officialEffects.get(normalizeEffectName(row.name));
    const category = alias.category || match?.category;
    if (category) categories[row.name] = category;
  }
  const expectedCount = builtinRows.filter(row => !OFFICIAL_CATEGORY_EXCLUSIONS[row.name]).length;
  if (Object.keys(categories).length !== expectedCount) throw new Error(`Mapped only ${Object.keys(categories).length}/${expectedCount} actual built-in effects to Adobe categories`);
  return Object.fromEntries(Object.entries(categories).sort(([a],[b]) => a.localeCompare(b)));
}

function normalizedPath(value) {
  const url = new URL(value);
  return url.pathname.replace(/\/$/, "");
}

function documentName(value) {
  const pathname = new URL(value).pathname.replace(/\/$/, "");
  return pathname.slice(pathname.lastIndexOf("/") + 1);
}

async function verifyJapanesePage(candidate) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 30000);
  try {
    const response = await fetch(candidate, {
      headers:{"User-Agent":USER_AGENT,"Accept-Language":"ja,en;q=0.5"},
      redirect:"follow",
      signal:controller.signal
    });
    const finalUrl = new URL(response.url);
    const requested = new URL(candidate);
    if (!response.ok) return {ok:false,reason:`HTTP ${response.status}`};
    if (finalUrl.hostname !== requested.hostname) return {ok:false,reason:`redirected to ${finalUrl.hostname}`};
    if (normalizedPath(finalUrl.href) !== normalizedPath(candidate) && documentName(finalUrl.href) !== documentName(candidate)) {
      return {ok:false,reason:`redirected to different document ${finalUrl.pathname}`};
    }
    const html = await response.text();
    const lang = html.match(/<html[^>]*\blang=["']([^"']+)/i)?.[1]?.toLowerCase() || "";
    const japaneseCharacters = (html.match(/[\u3040-\u30ff]/g) || []).length;
    const title = html.match(/<title[^>]*>([\s\S]*?)<\/title>/i)?.[1] || "";
    if (!lang.startsWith("ja")) return {ok:false,reason:`html lang is ${lang || "missing"}`};
    if (japaneseCharacters < 20) return {ok:false,reason:"page has too little Japanese text"};
    if (/\b(?:404|page not found)\b/i.test(title)) return {ok:false,reason:"not-found page"};
    if (requested.hash && !finalUrl.hash) finalUrl.hash = requested.hash;
    return {ok:true,url:finalUrl.href};
  } catch (error) {
    return {ok:false,reason:error.name === "AbortError" ? "timeout" : error.message};
  } finally {
    clearTimeout(timer);
  }
}

function baseManifest(localizedUrls, officialEffectCategories) {
  return {
    version:2,
    verified_at:VERIFY_DATE,
    policy:{
      taxonomy:"The 42 categories are site-defined functional discovery categories, not vendor menu labels.",
      product_names:"Official product spelling is preserved in every language.",
      descriptions:"Curated Traditional Chinese originals are shown in every language until a reviewed translation exists.",
      localized_urls:"Only locale-specific official pages that pass an HTTP and language check are listed; all other links keep the original official URL."
    },
    sources:{
      adobe_effect_categories_en:"https://helpx.adobe.com/after-effects/desktop/apply-effects-and-animation-presets/effects-and-animation-presets/effect-list.html",
      adobe_effect_categories_ja:"https://helpx.adobe.com/jp/after-effects/desktop/apply-effects-and-animation-presets/effects-and-animation-presets/effect-list.html",
      adobe_after_effects_languages:"https://helpx.adobe.com/jp/after-effects/system-requirements/2024.html",
      maxon_red_giant_ja:"https://www.maxon.net/ja/red-giant"
    },
    official_categories:OFFICIAL_CATEGORIES,
    official_category_rules:OFFICIAL_CATEGORY_RULES,
    official_effect_categories:officialEffectCategories,
    official_category_exclusions:OFFICIAL_CATEGORY_EXCLUSIONS,
    localized_urls:localizedUrls
  };
}

async function mapWithConcurrency(values, limit, operation) {
  const results = new Array(values.length);
  let next = 0;
  async function worker() {
    while (next < values.length) {
      const index = next++;
      results[index] = await operation(values[index], index);
    }
  }
  await Promise.all(Array.from({length:Math.min(limit, values.length)}, worker));
  return results;
}

async function build() {
  let previous = {verified_at:"",localized_urls:{}};
  try { previous = JSON.parse(fs.readFileSync(OUTPUT, "utf8")); } catch (_) {}
  const originals = [...new Set(readRows().flatMap(row => [row.url, row.date_url]).filter(Boolean))]
    .map(original => ({original,candidate:localizedCandidate(original)}))
    .filter(item => item.candidate)
    .sort((a,b) => a.original.localeCompare(b.original));
  console.log(`Checking ${originals.length} candidate official URLs...`);
  const checked = await mapWithConcurrency(originals, 6, async (item, index) => {
    const cached = previous.verified_at === VERIFY_DATE && previous.localized_urls?.[item.original]?.ja;
    if (cached) {
      const cachedUrl = new URL(cached), originalHash = new URL(item.original).hash;
      if (originalHash && !cachedUrl.hash) cachedUrl.hash = originalHash;
      console.log(`[${index + 1}/${originals.length}] CACHED ${cachedUrl.href}`);
      return {...item,ok:true,url:cachedUrl.href};
    }
    const result = await verifyJapanesePage(item.candidate);
    console.log(`[${index + 1}/${originals.length}] ${result.ok ? "OK" : "SKIP"} ${item.candidate}${result.ok ? "" : ` (${result.reason})`}`);
    return {...item,...result};
  });
  const localizedUrls = {};
  for (const item of checked.filter(item => item.ok)) localizedUrls[item.original] = {ja:item.url};
  const officialEffectCategories = await fetchAdobeEffectCategories();
  fs.writeFileSync(OUTPUT, `${JSON.stringify(baseManifest(localizedUrls, officialEffectCategories), null, 2)}\n`, "utf8");
  console.log(`Wrote ${path.relative(ROOT, OUTPUT)} with ${Object.keys(localizedUrls).length} verified URLs and ${Object.keys(officialEffectCategories).length} Adobe effect categories.`);
}

async function check() {
  const manifest = JSON.parse(fs.readFileSync(OUTPUT, "utf8"));
  const entries = Object.entries(manifest.localized_urls || {}).map(([original,locales]) => ({original,candidate:locales.ja}));
  const checked = await mapWithConcurrency(entries, 6, async item => ({...item,...await verifyJapanesePage(item.candidate)}));
  const mayRetainRateLimited = manifest.verified_at === VERIFY_DATE;
  const rateLimited = checked.filter(item => !item.ok && item.reason === "HTTP 429" && mayRetainRateLimited);
  const failures = checked.filter(item => !item.ok && (item.reason !== "HTTP 429" || !mayRetainRateLimited));
  for (const item of rateLimited) console.warn(`RATE LIMITED ${item.candidate}: retaining today's verified mapping`);
  for (const failure of failures) console.error(`FAIL ${failure.candidate}: ${failure.reason}`);
  if (failures.length) process.exitCode = 1;
  else console.log(`${entries.length - rateLimited.length} localized official URLs passed live verification; ${rateLimited.length} same-day verified mappings were retained after HTTP 429 rate limiting.`);
}

const mode = process.argv[2];
if (mode === "--write") build().catch(error => { console.error(error); process.exitCode = 1; });
else if (mode === "--check") check().catch(error => { console.error(error); process.exitCode = 1; });
else {
  console.log("Usage: node tools/build_localization.js --write|--check");
  process.exitCode = 2;
}
