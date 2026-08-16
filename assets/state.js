export function readUrlState(url = new URL(location.href)) {
  const params = url.searchParams;
  const parseSet = key => new Set((params.get(key) || "").split(",").filter(Boolean));
  let compare = [];
  try {
    const parsed = JSON.parse(params.get("compare") || "[]");
    if (Array.isArray(parsed)) compare = parsed.slice(0, 4);
  } catch (_) {}
  return {
    query:params.get("q") || "",
    categories:parseSet("cat"), sources:parseSet("src"), kinds:parseSet("kind"),
    sort:params.get("sort") || "popular", lang:["en", "ja"].includes(params.get("lang")) ? params.get("lang") : "zh",
    favoritesOnly:params.get("fav") === "1", compare, item:params.get("item") || "",
  };
}

export function writeUrlState(state, {push = false} = {}) {
  const url = new URL(location.href);
  const set = (key, value) => value ? url.searchParams.set(key, value) : url.searchParams.delete(key);
  set("q", state.query?.trim());
  set("cat", [...state.categories].join(","));
  set("src", [...state.sources].join(","));
  set("kind", [...state.kinds].join(","));
  set("sort", state.sort === "popular" ? "" : state.sort);
  set("lang", state.lang === "zh" ? "" : state.lang);
  set("fav", state.favoritesOnly ? "1" : "");
  set("compare", state.compare?.size ? JSON.stringify([...state.compare]) : "");
  set("item", state.item || "");
  history[push ? "pushState" : "replaceState"](null, "", url);
}

export function resolveKey(value, byId, legacyMap) {
  if (!value) return null;
  if (byId.has(value)) return value;
  return legacyMap.get(value) || null;
}

export function restoreResolvedState(raw, byId, legacyMap) {
  return {
    ...raw,
    compare:new Set(raw.compare.map(value => resolveKey(value, byId, legacyMap)).filter(Boolean).slice(0, 4)),
    item:resolveKey(raw.item, byId, legacyMap) || "",
  };
}
