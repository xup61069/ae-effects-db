import {
  autocomplete, configureSearch, normalizeText, parseTerms, searchWithFallback,
} from "./search.js";
import {sortMatches} from "./sort.js";
import {readUrlState, resolveKey, restoreResolvedState, writeUrlState} from "./state.js";
import {downloadFavorites, importFavorites, loadFavorites, saveFavorites} from "./favorites.js";
import {cardMarkup, compareMarkup, detailMarkup, escapeHtml} from "./render.js";
import {registerPwa} from "./pwa.js";

const FILES = ["red-giant", "universe", "sapphire", "continuum", "builtin-ae", "aescripts", "third-party", "booth", "gumroad", "installed", "recipes"];
const SOURCE_ORDER = [...FILES];

let DATA = [];
let BY_ID = new Map();
let LEGACY = new Map();
let FAVORITES = new Set();
let state;
let visibleLimit = 60;
let loadMoreObserver = null;
let searchTimer = null;
let currentResults = [];
let localeCache = new Map();
let localeLoads = new Map();
let appliedLang = "zh";
let localeLoadError = null;
let POPULARITY = {featured:[], source_weights:{}, maximum_points:{featured:56, source:20, quality:10, recency:4, curated_order:10}};
let LOCALIZATION = {localized_urls:{}, official_categories:{}, official_category_rules:[], official_effect_categories:{}};
let POPULAR_INDEX = new Map();
let filters = {};
let allowedState = {};

const localeData = () => globalThis.AE_I18N.locales[state?.lang || "zh"] || globalThis.AE_I18N.locales.zh;
function t(key, variables = {}) {
  let value = localeData().messages[key] ?? globalThis.AE_I18N.locales.zh.messages[key] ?? key;
  return String(value).replace(/\{(\w+)\}/g, (_, name) => variables[name] ?? "");
}

const officialUrl = value => LOCALIZATION.localized_urls?.[value]?.[state.lang] || value;
function officialCategory(item) {
  if (item.kind !== "builtin") return null;
  const categoryId = LOCALIZATION.official_effect_categories?.[item.name];
  const direct = categoryId ? LOCALIZATION.official_categories?.[categoryId] : null;
  if (direct) return {label:direct.labels?.[state.lang] || direct.labels?.en || categoryId, source:direct.source || item.url};
  let path = "";
  try { path = new URL(item.url).pathname.toLowerCase(); } catch (_) {}
  const rule = (LOCALIZATION.official_category_rules || []).find(entry => (entry.patterns || []).some(pattern => path.includes(pattern.toLowerCase())));
  return rule ? {label:rule.labels?.[state.lang] || rule.labels?.en || rule.id, source:rule.source || item.url} : null;
}

function popularity(item) {
  const featured = POPULAR_INDEX.get(item.id) ?? POPULAR_INDEX.get(item._legacy);
  const max = POPULARITY.maximum_points || {};
  const featuredCount = Math.max(1, (POPULARITY.featured || []).length - 1);
  const featuredScore = featured === undefined ? 0 : Math.round((max.featured || 56) - (featured / featuredCount) * 20);
  const source = Math.min(max.source || 20, POPULARITY.source_weights?.[item._src] || 0);
  const quality = (item.url ? 2 : 0) + (item._look ? 2 : 0) + ((item._desc || "").length >= 30 ? 2 : 1) + ((item.tags || []).length >= 8 ? 2 : 1) + (item.unverified ? 0 : 2);
  const date = item.updated || item.released;
  const age = date ? Math.max(0, (Date.now() - Date.parse(`${date}T00:00:00Z`)) / (365.25 * 86400000)) : Infinity;
  const recency = Number.isFinite(age) ? Math.max(0, Math.round((max.recency || 4) - age)) : 0;
  const curatedOrder = Math.max(0, (max.curated_order || 10) - Math.floor(Math.min(item._rank ?? 500, 500) / 50));
  return {featured:featuredScore, source, quality, recency, curatedOrder, total:Math.min(100, featuredScore + source + quality + recency + curatedOrder)};
}

async function fetchJson(path, version = "") {
  const response = await fetch(`${path}${version ? `?v=${encodeURIComponent(version)}` : ""}`);
  if (!response.ok) throw new Error(`${path}: HTTP ${response.status}`);
  return response.json();
}

async function loadLocale(lang, version) {
  let values = localeCache.get(lang);
  if (!values) {
    let request = localeLoads.get(lang);
    if (!request) {
      request = fetchJson(`dist/web/locales/${lang}.json`, version).then(result => {
        localeCache.set(lang, result); localeLoads.delete(lang); return result;
      }, error => { localeLoads.delete(lang); throw error; });
      localeLoads.set(lang, request);
    }
    values = await request;
  }
  if (state?.lang !== lang) return false;
  DATA.forEach(item => {
    const localized = values[item.id] || [item.desc || "", item.look || "", 0];
    item._desc = localized[0] || "";
    item._look = localized[1] || "";
    item._original = Boolean(localized[2]);
  });
  return true;
}

function resolveLegacy(value) { return resolveKey(value, BY_ID, LEGACY); }

async function boot() {
  const rawState = readUrlState();
  state = {...rawState, compare:new Set()};
  let manifest = {version:""};
  try { manifest = await fetchJson("dist/web/asset-manifest.json"); } catch (_) {}
  const [catalogResult, popularityResult, localizationResult, baseSearchResult, jaSearchResult] = await Promise.allSettled([
    fetchJson("dist/web/catalog.json", manifest.version), fetchJson("curation/popularity.json", manifest.version),
    fetchJson("curation/localization.json", manifest.version), fetchJson("curation/search.json", manifest.version),
    fetchJson("curation/search-aliases.ja.json", manifest.version),
  ]);
  if (catalogResult.status === "fulfilled") DATA = catalogResult.value;
  else {
    const legacy = await fetchJson("dist/web-index.json");
    DATA = legacy.map(item => ({...item, _legacy:`${item._src}:${item.name}`, _related:{similar:[], builtin:[], recipes:[]}}));
    localeCache.set("zh", Object.fromEntries(DATA.map(item => [item.id, [item.desc || "", item.look || "", 0]])));
    localeCache.set("en", Object.fromEntries(DATA.map(item => [item.id, [item.desc_en || item.desc || "", item.look_en || item.look || "", item.desc_en ? 0 : 1]])));
    localeCache.set("ja", Object.fromEntries(DATA.map(item => [item.id, [item.desc_ja || item.desc || "", item.look_ja || item.look || "", item.desc_ja ? 0 : 1]])));
  }
  if (popularityResult.status === "fulfilled") POPULARITY = popularityResult.value;
  if (localizationResult.status === "fulfilled") LOCALIZATION = localizationResult.value;
  configureSearch(baseSearchResult.value || {}, jaSearchResult.value || {});
  BY_ID = new Map(DATA.map(item => [item.id, item]));
  LEGACY = new Map(DATA.map(item => [item._legacy, item.id]));
  allowedState = {
    categories:new Set(DATA.map(item => item.cat).filter(Boolean)),
    sources:new Set(DATA.map(item => item._src).filter(Boolean)),
    kinds:new Set(DATA.map(item => item.kind).filter(Boolean)),
  };
  state = restoreResolvedState(rawState, BY_ID, LEGACY, allowedState);
  try {
    await loadLocale(state.lang, manifest.version);
  } catch (error) {
    localeLoadError = error;
    state.lang = "zh";
    await loadLocale("zh", manifest.version);
  }
  FAVORITES = loadFavorites(resolveLegacy);
  POPULAR_INDEX = new Map((POPULARITY.featured || []).map((key, index) => [LEGACY.get(key) || key, index]));
  buildFilters();
  applyLanguage();
  appliedLang = state.lang;
  bindEvents(manifest.version);
  render();
  if (localeLoadError) showToast(t("loadLocaleError", {error:localeLoadError.message}));
  if (state.item) openDetail(state.item, {write:false});
  setupResponsiveFilters();
  registerPwa({onUpdate:activate => showUpdate(activate), onOfflineReady:() => showToast(t("offlineReady"))}).catch(() => {});
}

function filterDefinition(id, set, labelKey, keyOf, labelOf, sortByCount = false) {
  const button = document.getElementById(`${id}Btn`), panel = document.getElementById(`${id}Panel`);
  const keys = [...new Set(DATA.map(keyOf).filter(Boolean))];
  keys.sort(sortByCount ? (a, b) => DATA.filter(item => keyOf(item) === b).length - DATA.filter(item => keyOf(item) === a).length || a.localeCompare(b) : (a, b) => SOURCE_ORDER.indexOf(a) - SOURCE_ORDER.indexOf(b));
  panel.innerHTML = `<button type="button" class="c clr" data-clear="1">✕ ${escapeHtml(t("clear"))}</button>${keys.map(key => `<button type="button" class="c" data-k="${escapeHtml(key)}" aria-pressed="false"><span class="label">${escapeHtml(labelOf(key))}</span><span class="n">0</span></button>`).join("")}`;
  panel.addEventListener("click", event => {
    const option = event.target.closest(".c"); if (!option) return;
    if (option.dataset.clear) set.clear(); else set.has(option.dataset.k) ? set.delete(option.dataset.k) : set.add(option.dataset.k);
    commitState(); render();
  });
  button.addEventListener("click", event => {
    event.stopPropagation(); const open = panel.hidden; closePanels(); panel.hidden = !open; button.setAttribute("aria-expanded", String(open));
  });
  return {id, set, labelKey, keyOf, labelOf, keys, button, panel};
}

function buildFilters() {
  filters = {
    cat:filterDefinition("cat", state.categories, "category", item => item.cat, key => localeData().categories[key] || key, true),
    src:filterDefinition("src", state.sources, "source", item => item._src, key => localeData().sources[key] || key),
    kind:filterDefinition("kind", state.kinds, "kind", item => item.kind, key => localeData().kinds[key] || key, true),
  };
}

function selectedBy(item, omitted = "") {
  return (omitted === "cat" || !state.categories.size || state.categories.has(item.cat)) &&
    (omitted === "src" || !state.sources.size || state.sources.has(item._src)) &&
    (omitted === "kind" || !state.kinds.size || state.kinds.has(item.kind)) &&
    (!state.favoritesOnly || FAVORITES.has(item.id));
}

function syncFilterCounts(queryMatches) {
  for (const filter of Object.values(filters)) {
    const counts = {};
    queryMatches.filter(match => selectedBy(match.item, filter.id)).forEach(match => { const key = filter.keyOf(match.item); counts[key] = (counts[key] || 0) + 1; });
    filter.panel.querySelectorAll("[data-k]").forEach(option => {
      const count = counts[option.dataset.k] || 0, selected = filter.set.has(option.dataset.k);
      option.querySelector(".label").textContent = filter.labelOf(option.dataset.k);
      option.querySelector(".n").textContent = count;
      option.classList.toggle("on", selected); option.setAttribute("aria-pressed", String(selected)); option.disabled = !count && !selected;
    });
    const label = t(filter.labelKey); filter.button.textContent = filter.set.size ? `${label} (${filter.set.size}) ▾` : `${label} ▾`;
    filter.button.classList.toggle("active", filter.set.size > 0);
  }
}

function searchResults() {
  const terms = parseTerms(state.query);
  const outcome = searchWithFallback(DATA, terms, {requireAll:true});
  let {matches, usedTerms} = outcome;
  const sortOptions = {
    mode:state.sort,
    hasTerms:terms.length > 0,
    locale:localeData().locale,
    categoryLabels:localeData().categories,
    sourceOrder:SOURCE_ORDER,
    popularity,
  };
  const corrections = [...new Set(Object.values(outcome.suggestions).flat())];
  const note = outcome.fallback === "or" ? t("noAnd")
    : outcome.fallback === "segmented" ? t("segmented", {query:state.query, terms:usedTerms.join("、")})
    : outcome.fallback === "corrected" ? t("corrected", {query:state.query, terms:usedTerms.join("、")}) : "";
  const queryMatches = matches;
  syncFilterCounts(queryMatches);
  matches = matches.filter(match => selectedBy(match.item));
  return {matches:sortMatches(matches, sortOptions), note, usedTerms, corrections, queryMatches};
}

function reasonLabel(reason = "") {
  if (reason.startsWith("alias:")) return t("matchAlias");
  if (reason.includes("name")) return t("matchName");
  if (reason === "tag") return t("matchTag");
  if (reason === "variant") return t("matchVariant");
  return t("matchDescription");
}

function render(preserveLimit = false) {
  if (!preserveLimit) visibleLimit = 60;
  const {matches, note, usedTerms, corrections} = searchResults();
  currentResults = matches;
  const summaryCounts = matches.reduce((output, match) => ({...output, [match.item.kind]:(output[match.item.kind] || 0) + 1}), {});
  const browsing = !(state.query || state.categories.size || state.sources.size || state.kinds.size || state.favoritesOnly);
  const summary = Object.entries(summaryCounts).map(([kind, count]) => {
    const on = state.kinds.has(kind);
    return `<button type="button" class="kindchip kind-${escapeHtml(kind)}${on ? " on" : ""}" data-kind-filter="${escapeHtml(kind)}" aria-pressed="${on ? "true" : "false"}">${escapeHtml(localeData().kinds[kind] || kind)} ${count}</button>`;
  }).join("");
  const lead = `<button type="button" class="countbrowse${browsing ? " on" : ""}" data-clear-all="1" aria-pressed="${browsing ? "true" : "false"}">${escapeHtml(browsing ? t("browsingAll", {count:matches.length}) : t("results", {count:matches.length}))}</button>`;
  document.getElementById("count").innerHTML = `${lead}${note ? ` <span>· ${escapeHtml(note)}</span>` : ""}<span class="summary">${summary}</span>`;
  renderActiveFilters(); syncFavoriteButton(); syncCompareTray(); syncInputs(); writeUrlState(state);
  const box = document.getElementById("results");
  box.setAttribute("aria-busy", "false");
  if (!matches.length) {
    const suggestionButtons = corrections.map(value => `<button type="button" data-q="${escapeHtml(value)}">${escapeHtml(value)}</button>`).join("");
    const filtered = state.categories.size || state.sources.size || state.kinds.size || state.favoritesOnly;
    box.innerHTML = `<div class="empty"><p>${escapeHtml(t(filtered ? "emptyFiltered" : "emptySearch"))}</p>${suggestionButtons ? `<div class="emptySuggestions"><span>${escapeHtml(t("didYouMean"))}</span>${suggestionButtons}</div>` : ""}<button type="button" data-clear-all="1">${escapeHtml(t("clearAll"))}</button></div>`;
    return;
  }
  const context = {t, kindLabels:localeData().kinds, categoryLabels:localeData().categories, sourceLabels:localeData().sources, favoriteIds:FAVORITES, compareIds:state.compare, terms:usedTerms, officialUrl, officialCategory, popularity, reasonLabel, activeKinds:state.kinds, activeCats:state.categories};
  box.innerHTML = matches.slice(0, visibleLimit).map(match => cardMarkup(match.item, {...context, reasons:match.reasons})).join("") + (matches.length > visibleLimit ? `<button id="loadMore" class="more" type="button">${escapeHtml(t("showMore", {count:matches.length - visibleLimit}))}</button>` : "");
  const more = document.getElementById("loadMore");
  more?.addEventListener("click", () => { visibleLimit += 60; render(true); });
  loadMoreObserver?.disconnect();
  if (more && "IntersectionObserver" in window) { loadMoreObserver = new IntersectionObserver(entries => { if (entries.some(entry => entry.isIntersecting)) { loadMoreObserver.disconnect(); visibleLimit += 60; render(true); } }, {rootMargin:"500px"}); loadMoreObserver.observe(more); }
}

function renderActiveFilters() {
  const values = [];
  for (const filter of Object.values(filters)) for (const key of filter.set) values.push(`<button class="a" type="button" data-filter="${filter.id}" data-value="${escapeHtml(key)}">${escapeHtml(filter.labelOf(key))}<span aria-hidden="true">×</span></button>`);
  if (state.favoritesOnly) values.push(`<button class="a" type="button" data-filter="fav">${escapeHtml(t("favoritesOnly"))}<span aria-hidden="true">×</span></button>`);
  if (values.length) values.push(`<button class="allclr" type="button" data-clear-all="1">${escapeHtml(t("clearAll"))}</button>`);
  document.getElementById("activeFilters").innerHTML = values.join("");
}

function syncInputs() {
  for (const id of ["q", "mq"]) { const input = document.getElementById(id); if (input && input.value !== state.query) input.value = state.query; }
  document.getElementById("clearQ").hidden = !state.query; document.getElementById("clearMq").hidden = !state.query;
  document.getElementById("sort").value = state.sort;
}
function syncFavoriteButton() {
  const button = document.getElementById("favBtn"); button.classList.toggle("active", state.favoritesOnly); button.setAttribute("aria-pressed", String(state.favoritesOnly));
  button.innerHTML = `${state.favoritesOnly ? "★" : "☆"} ${escapeHtml(t("favoritesOnly"))}<span class="n">${FAVORITES.size}</span>`;
}
function syncCompareTray() {
  const tray = document.getElementById("compareTray"); tray.hidden = state.compare.size === 0;
  document.getElementById("compareTrayText").textContent = t("compareTray", {count:state.compare.size}); document.getElementById("compareOpen").disabled = state.compare.size < 2;
}
function commitState() { writeUrlState(state, {push:true}); }
function scrollToPageTop() { scrollTo({top:0, behavior:matchMedia("(prefers-reduced-motion: reduce)").matches ? "auto" : "smooth"}); }
function adoptHistoryState(next) {
  for (const key of ["categories", "sources", "kinds"]) {
    const current = state[key];
    current.clear();
    for (const value of next[key]) current.add(value);
    next[key] = current;
  }
  state = next;
}
function clearAll() { state.categories.clear(); state.sources.clear(); state.kinds.clear(); state.favoritesOnly = false; state.query = ""; commitState(); render(); }
function goHome() {
  state.query = ""; state.categories.clear(); state.sources.clear(); state.kinds.clear(); state.favoritesOnly = false;
  state.compare.clear(); state.item = ""; state.sort = "latest"; visibleLimit = 60;
  writeUrlState(state);
  render();
}
function closePanels() { document.querySelectorAll(".catpanel").forEach(panel => panel.hidden = true); document.querySelectorAll("[aria-expanded]").forEach(button => button.setAttribute("aria-expanded", "false")); hideSuggestions(); }
let lastCardOpener = null;

function openDetail(id, {write = true} = {}) {
  const item = BY_ID.get(id); if (!item) return;
  state.item = id; document.getElementById("detailTitle").textContent = item.name;
  document.getElementById("detailBody").innerHTML = detailMarkup(item, {t, kindLabels:localeData().kinds, categoryLabels:localeData().categories, sourceLabels:localeData().sources, byId:BY_ID, favoriteIds:FAVORITES, compareIds:state.compare, officialUrl, officialCategory, popularity});
  const dialog = document.getElementById("detailDialog"); if (!dialog.open) dialog.showModal();
  if (write) writeUrlState(state, {push:true});
}
function closeDetail({write = true} = {}) { const dialog = document.getElementById("detailDialog"); if (dialog.open) dialog.close(); state.item = ""; if (write) writeUrlState(state); }
function toggleCompare(id) { if (state.compare.has(id)) state.compare.delete(id); else if (state.compare.size < 4) state.compare.add(id); else { showToast(t("compareMax")); return; } commitState(); render(true); if (document.getElementById("detailDialog").open) openDetail(id, {write:false}); }
function openCompare() { const items = [...state.compare].map(id => BY_ID.get(id)).filter(Boolean); if (items.length < 2) return; document.getElementById("compareBody").innerHTML = compareMarkup(items, {t, kindLabels:localeData().kinds, categoryLabels:localeData().categories, sourceLabels:localeData().sources, officialUrl, popularity}); document.getElementById("compareDialog").showModal(); }

function applyLanguage() {
  const messages = localeData().messages;
  document.documentElement.lang = localeData().htmlLang; document.title = messages.pageTitle;
  const text = (id, value) => { const element = document.getElementById(id); if (element) element.textContent = value; };
  text("siteTitle", messages.siteTitle); text("siteSubtitle", messages.subtitle); text("favManageBtn", messages.favoritesManage); text("aiBtn", messages.aiButton);
  text("filterDialogTitle", messages.filtersTitle); text("filterClose", messages.close); text("mobileFilterToggle", messages.filtersTitle);
  text("compareTitle", messages.compareTitle); text("compareOpen", messages.compare); text("compareClear", messages.clear);
  text("favoritesDialogTitle", messages.favoritesManage); text("favoritesHelp", messages.favoritesHelp);
  text("favExport", messages.exportFavorites); text("favImport", messages.importFavorites); text("favClearAll", messages.clearFavorites);
  text("reportMissingLink", messages.reportMissing); text("contributeLink", messages.contribute); text("githubLink", messages.github);
  const attrs = (id, values) => { const element = document.getElementById(id); if (element) Object.entries(values).forEach(([key, value]) => element.setAttribute(key, value)); };
  attrs("q", {placeholder:messages.searchPlaceholder, "aria-label":messages.searchAria}); attrs("mq", {placeholder:messages.mobileSearchPlaceholder, "aria-label":messages.searchAria});
  attrs("clearQ", {"aria-label":messages.clearSearch}); attrs("clearMq", {"aria-label":messages.clearSearch}); attrs("sort", {"aria-label":messages.sortTitle});
  attrs("kindLegend", {"aria-label":messages.kindLegend});
  document.querySelectorAll("#languageSwitch [data-lang]").forEach(button => { const active = button.dataset.lang === state.lang; button.classList.toggle("on", active); button.setAttribute("aria-pressed", String(active)); });
  document.querySelectorAll("[data-close]").forEach(button => button.setAttribute("aria-label", messages.close));
  const sort = document.getElementById("sort"), sortLabelByMode = {
    latest:"sortLatest", popular:"sortPopular", relevance:"sortRelevance",
    name:"sortName", category:"sortCategory", source:"sortSource",
  };
  [...sort.options].forEach(option => { option.textContent = messages[sortLabelByMode[option.value]]; });
  document.getElementById("kindLegend").innerHTML = `<span><i class="plugin"></i>${escapeHtml(localeData().kinds.plugin)}</span><span><i class="script"></i>${escapeHtml(localeData().kinds.script)}</span><span><i class="builtin"></i>${escapeHtml(localeData().kinds.builtin)}</span><span><i class="recipe"></i>${escapeHtml(localeData().kinds.recipe)}</span>`;
  document.getElementById("hintBox").innerHTML = `${escapeHtml(messages.try)} ${localeData().hints.map(value => `<button type="button" data-q="${escapeHtml(value)}">${escapeHtml(value)}</button>`).join(" · ")}`;
  document.getElementById("footerSummary").innerHTML = `${escapeHtml(t("footerTotal", {count:DATA.length}))} · ${escapeHtml(messages.footerOfficial)} · ${escapeHtml(messages.footerImage)}`;
  for (const filter of Object.values(filters)) { filter.labelOf = filter.id === "cat" ? key => localeData().categories[key] || key : filter.id === "src" ? key => localeData().sources[key] || key : key => localeData().kinds[key] || key; }
}

function renderSuggestions(input) {
  const list = document.getElementById(input.id === "mq" ? "mobileSuggestions" : "suggestions");
  const values = autocomplete(DATA, input.value, localeData().categories);
  list.innerHTML = values.map(value => `<button type="button" role="option" tabindex="-1" aria-selected="false" data-suggestion="${escapeHtml(value.value)}" data-suggestion-type="${escapeHtml(value.type)}"><span>${escapeHtml(value.label)}</span><small>${escapeHtml(t(`suggestion_${value.type}`))}</small></button>`).join("");
  list.hidden = !values.length; input.setAttribute("aria-expanded", String(values.length > 0));
}
function focusSuggestion(list, index) {
  const options = [...list.querySelectorAll('[role="option"]')];
  if (!options.length) return false;
  const target = options[Math.max(0, Math.min(index, options.length - 1))];
  options.forEach(option => option.setAttribute("aria-selected", String(option === target)));
  target.focus(); return true;
}
function selectSuggestion(suggestion) {
  const input = document.getElementById(suggestion.closest("#mobileSuggestions") ? "mq" : "q");
  if (suggestion.dataset.suggestionType === "category") {
    state.query = ""; state.categories.clear(); state.categories.add(suggestion.dataset.suggestion);
  } else state.query = suggestion.dataset.suggestion;
  hideSuggestions(); commitState(); render(); input.focus();
}
function bindSuggestionKeyboard(input, list) {
  input.addEventListener("keydown", event => {
    if (event.key === "ArrowDown" || event.key === "ArrowUp") {
      if (list.hidden) renderSuggestions(input);
      const options = list.querySelectorAll('[role="option"]');
      if (options.length) { event.preventDefault(); focusSuggestion(list, event.key === "ArrowDown" ? 0 : options.length - 1); }
    } else if (event.key === "Escape") hideSuggestions();
  });
  list.addEventListener("focusin", event => {
    const option = event.target.closest?.('[role="option"]');
    if (option) list.querySelectorAll('[role="option"]').forEach(value => value.setAttribute("aria-selected", String(value === option)));
  });
  list.addEventListener("keydown", event => {
    const option = event.target.closest?.('[role="option"]'); if (!option) return;
    const options = [...list.querySelectorAll('[role="option"]')], index = options.indexOf(option);
    if (event.key === "ArrowDown") { event.preventDefault(); focusSuggestion(list, index === options.length - 1 ? 0 : index + 1); }
    else if (event.key === "ArrowUp") { event.preventDefault(); if (index === 0) { option.setAttribute("aria-selected", "false"); input.focus(); } else focusSuggestion(list, index - 1); }
    else if (event.key === "Home") { event.preventDefault(); focusSuggestion(list, 0); }
    else if (event.key === "End") { event.preventDefault(); focusSuggestion(list, options.length - 1); }
    else if (event.key === "Escape") { event.preventDefault(); hideSuggestions(); input.focus(); }
    else if (event.key === "Enter" || event.key === " ") { event.preventDefault(); selectSuggestion(option); }
  });
}
function hideSuggestions() { for (const id of ["suggestions", "mobileSuggestions"]) { const list = document.getElementById(id); list.hidden = true; list.querySelectorAll('[role="option"]').forEach(option => option.setAttribute("aria-selected", "false")); } for (const id of ["q", "mq"]) document.getElementById(id).setAttribute("aria-expanded", "false"); }
function scheduleSearch(value) { state.query = value; clearTimeout(searchTimer); searchTimer = setTimeout(() => render(), 70); }

function setupResponsiveFilters() {
  const media = matchMedia("(max-width:640px)"), dialog = document.getElementById("filterDialog");
  const sync = () => {
    if (media.matches) { if (dialog.open && !dialog.matches(":modal")) dialog.close(); }
    else { if (dialog.matches(":modal")) dialog.close(); if (!dialog.open) dialog.setAttribute("open", ""); }
  };
  media.addEventListener("change", sync); sync();
}

async function switchLanguage(lang, version) {
  if (lang === state.lang) return;
  state.lang = lang;
  try {
    if (!await loadLocale(lang, version)) return;
  } catch (error) {
    if (state.lang === lang) {
      state.lang = appliedLang;
      showToast(t("loadLocaleError", {error:error.message}));
    }
    return;
  }
  applyLanguage();
  appliedLang = lang;
  commitState();
  render();
  if (state.item) openDetail(state.item, {write:false});
}

function bindEvents(version) {
  for (const id of ["q", "mq"]) {
    const input = document.getElementById(id), list = document.getElementById(id === "mq" ? "mobileSuggestions" : "suggestions");
    input.addEventListener("input", event => { scheduleSearch(event.target.value); renderSuggestions(input); });
    bindSuggestionKeyboard(input, list);
  }
  document.getElementById("clearQ").addEventListener("click", () => { scheduleSearch(""); document.getElementById("q").focus(); });
  document.getElementById("clearMq").addEventListener("click", () => { scheduleSearch(""); document.getElementById("mq").focus(); });
  document.getElementById("siteTitle").addEventListener("click", event => { event.preventDefault(); goHome(); });
  document.getElementById("sort").addEventListener("change", event => { state.sort = event.target.value; commitState(); render(); });
  document.getElementById("favBtn").addEventListener("click", () => { state.favoritesOnly = !state.favoritesOnly; commitState(); render(); });
  document.getElementById("favManageBtn").addEventListener("click", () => document.getElementById("favoritesDialog").showModal());
  document.getElementById("favExport").addEventListener("click", () => downloadFavorites(FAVORITES));
  document.getElementById("favImport").addEventListener("click", () => document.getElementById("favImportFile").click());
  document.getElementById("favImportFile").addEventListener("change", async event => { if (!event.target.files[0]) return; try { const added = await importFavorites(event.target.files[0], resolveLegacy, FAVORITES); document.getElementById("favManageMsg").textContent = t("imported", {added, count:FAVORITES.size}); render(true); } catch (error) { document.getElementById("favManageMsg").textContent = t("importFailed", {error:error.message}); } event.target.value = ""; });
  document.getElementById("favClearAll").addEventListener("click", () => { if (FAVORITES.size && confirm(t("clearConfirm", {count:FAVORITES.size}))) { FAVORITES.clear(); saveFavorites(FAVORITES); state.favoritesOnly = false; document.getElementById("favManageMsg").textContent = t("cleared"); render(); } });
  document.getElementById("languageSwitch").addEventListener("click", event => { const button = event.target.closest("[data-lang]"); if (button) switchLanguage(button.dataset.lang, version); });
  document.getElementById("compareOpen").addEventListener("click", openCompare); document.getElementById("compareClear").addEventListener("click", () => { state.compare.clear(); commitState(); render(true); });
  document.getElementById("backTop").addEventListener("click", scrollToPageTop); window.addEventListener("scroll", () => { document.getElementById("backTop").hidden = scrollY < 700; }, {passive:true});
  document.getElementById("detailDialog").addEventListener("close", () => { if (state.item) { state.item = ""; writeUrlState(state); } if (lastCardOpener) { const opener = lastCardOpener; lastCardOpener = null; requestAnimationFrame(() => opener.focus?.({preventScroll:true})); } });
  for (const d of document.querySelectorAll("dialog.modal")) d.addEventListener("click", e => { if (e.target === d) { if (d.id === "detailDialog") closeDetail(); else d.close(); } });
  document.getElementById("mobileFilterToggle").addEventListener("click", () => document.getElementById("filterDialog").showModal()); document.getElementById("filterClose").addEventListener("click", () => document.getElementById("filterDialog").close());
  document.getElementById("aiBtn").addEventListener("click", async () => {
    const prompt = localeData().aiPrompt;
    const dialog = document.getElementById("filterDialog");
    if (dialog.matches(":modal")) dialog.close();
    showToast((await copyText(prompt)) ? t("aiCopied") : t("aiCopyFailed"));
  });
  document.addEventListener("click", delegatedClick); document.addEventListener("keydown", event => { if (event.key === "/" && !/INPUT|TEXTAREA|SELECT/.test(document.activeElement.tagName)) { event.preventDefault(); document.getElementById(matchMedia("(max-width:640px)").matches ? "mq" : "q").focus(); } else if (event.key === "Escape") closePanels(); });
  window.addEventListener("popstate", () => { const restored = restoreResolvedState(readUrlState(), BY_ID, LEGACY, allowedState); adoptHistoryState(restored); const lang = state.lang; loadLocale(lang, version).then(applied => { if (!applied) return; applyLanguage(); appliedLang = lang; render(); if (state.item) openDetail(state.item, {write:false}); else closeDetail({write:false}); }).catch(error => { if (state.lang === lang) { state.lang = appliedLang; writeUrlState(state); showToast(t("loadLocaleError", {error:error.message})); } }); });
}

function delegatedClick(event) {
  const close = event.target.closest?.("[data-close]"); if (close) { const dialog = document.getElementById(close.dataset.close); if (close.dataset.close === "detailDialog") closeDetail(); else dialog?.close(); return; }
  const detail = event.target.closest?.("[data-detail]"); if (detail) { openDetail(detail.dataset.detail); return; }
  const compare = event.target.closest?.("[data-compare]"); if (compare) { toggleCompare(compare.dataset.compare); return; }
  const favorite = event.target.closest?.("[data-favorite]"); if (favorite) { const id = favorite.dataset.favorite; FAVORITES.has(id) ? FAVORITES.delete(id) : FAVORITES.add(id); saveFavorites(FAVORITES); render(true); if (state.item) openDetail(id, {write:false}); return; }
  const share = event.target.closest?.("[data-share-detail]"); if (share) { const url = new URL(location.href); url.searchParams.set("item", share.dataset.shareDetail); navigator.clipboard?.writeText(String(url)).then(() => { share.textContent = t("copied"); }).catch(() => prompt(t("copyUrl"), url)); return; }
  const query = event.target.closest?.("[data-q]"); if (query) { state.query = query.dataset.q; commitState(); render(); scrollToPageTop(); return; }
  const kindFilter = event.target.closest?.("[data-kind-filter]"); if (kindFilter) { state.kinds.has(kindFilter.dataset.kindFilter) ? state.kinds.delete(kindFilter.dataset.kindFilter) : state.kinds.add(kindFilter.dataset.kindFilter); commitState(); render(); scrollToPageTop(); return; }
  const catFilter = event.target.closest?.("[data-cat-filter]"); if (catFilter) { state.categories.has(catFilter.dataset.catFilter) ? state.categories.delete(catFilter.dataset.catFilter) : state.categories.add(catFilter.dataset.catFilter); commitState(); render(); scrollToPageTop(); return; }
  const suggestion = event.target.closest?.("[data-suggestion]"); if (suggestion) { selectSuggestion(suggestion); return; }
  const active = event.target.closest?.("[data-filter]"); if (active) { if (active.dataset.filter === "fav") state.favoritesOnly = false; else filters[active.dataset.filter]?.set.delete(active.dataset.value); commitState(); render(); return; }
  if (event.target.closest?.("[data-clear-all]")) { event.preventDefault(); clearAll(); scrollToPageTop(); return; }
  const cardOpen = event.target.closest?.("[data-open-detail]"); if (cardOpen) { openDetail(cardOpen.dataset.openDetail); return; }
  const card = event.target.closest?.(".card"); if (card && !event.target.closest?.("a, button, input, select, textarea, label")) { lastCardOpener = event.target.closest?.("[tabindex]") || card; openDetail(card.dataset.id); return; }
  if (!event.target.closest?.(".dd")) closePanels();
}

async function copyText(text) {
  try { await navigator.clipboard.writeText(text); return true; } catch (_) {}
  const area = document.createElement("textarea");
  area.value = text;
  area.setAttribute("readonly", "");
  area.style.position = "fixed";
  area.style.left = "-9999px";
  document.body.appendChild(area);
  area.focus(); area.select();
  let copied = false;
  try { copied = document.execCommand("copy"); } catch (_) {}
  area.remove();
  return copied;
}
function showToast(message) { const box = document.getElementById("toast"); box.textContent = message; box.hidden = false; clearTimeout(showToast.timer); showToast.timer = setTimeout(() => { box.hidden = true; }, 5000); }
function showUpdate(activate) { const banner = document.getElementById("updateBanner"); banner.hidden = false; banner.querySelector("span").textContent = t("updateAvailable"); const button = banner.querySelector("button"); button.textContent = t("updateNow"); button.onclick = activate; }

boot().catch(error => { document.getElementById("results").innerHTML = `<div class="empty">${escapeHtml(t("loadFilesError", {count:1, errors:error.message}))}</div>`; console.error(error); });
