const V1_KEY = "ae-effects-db:favorites:v1";
const V2_KEY = "ae-effects-db:favorites:v2";

function safeParse(value, fallback) {
  try { return JSON.parse(value); } catch (_) { return fallback; }
}

export function loadFavorites(resolveLegacy) {
  const current = safeParse(localStorage.getItem(V2_KEY) || "[]", []);
  const ids = new Set((Array.isArray(current) ? current : current.favorites || []).filter(value => typeof value === "string").map(resolveLegacy).filter(Boolean));
  const legacy = safeParse(localStorage.getItem(V1_KEY) || "[]", []);
  let migrated = false;
  for (const value of Array.isArray(legacy) ? legacy : []) {
    const id = resolveLegacy(value);
    if (id && !ids.has(id)) { ids.add(id); migrated = true; }
  }
  if (migrated || legacy.length) {
    saveFavorites(ids);
    localStorage.removeItem(V1_KEY);
  }
  return ids;
}

export function saveFavorites(ids) {
  try { localStorage.setItem(V2_KEY, JSON.stringify([...ids])); } catch (_) {}
}

export function exportPayload(ids) {
  return {version:2, exported:new Date().toISOString(), favorites:[...ids]};
}

export function downloadFavorites(ids) {
  const href = URL.createObjectURL(new Blob([JSON.stringify(exportPayload(ids), null, 2)], {type:"application/json"}));
  const link = document.createElement("a");
  link.href = href;
  link.download = "ae-effects-favorites-v2.json";
  link.click();
  setTimeout(() => URL.revokeObjectURL(href), 1000);
}

export async function importFavorites(file, resolveLegacy, target) {
  const parsed = safeParse(await file.text(), null);
  const values = Array.isArray(parsed) ? parsed : parsed?.favorites;
  if (!Array.isArray(values)) throw new Error("favorites array missing");
  let added = 0;
  for (const value of values) {
    if (typeof value !== "string") continue;
    const id = resolveLegacy(value);
    if (id && !target.has(id)) { target.add(id); added += 1; }
  }
  saveFavorites(target);
  return added;
}
