const V1_KEY = "ae-effects-db:favorites:v1";
const V2_KEY = "ae-effects-db:favorites:v2";

function safeParse(value, fallback) {
  try { return JSON.parse(value); } catch (_) { return fallback; }
}

export function loadFavorites(resolveLegacy) {
  const currentRaw = localStorage.getItem(V2_KEY);
  const current = safeParse(currentRaw || "[]", []);
  const currentValues = Array.isArray(current) ? current : (Array.isArray(current?.favorites) ? current.favorites : []);
  const ids = new Set(currentValues.filter(value => typeof value === "string").map(resolveLegacy).filter(Boolean));
  const legacyRaw = localStorage.getItem(V1_KEY);
  const legacy = safeParse(legacyRaw || "[]", []);
  for (const value of Array.isArray(legacy) ? legacy : []) {
    const id = resolveLegacy(value);
    if (id) ids.add(id);
  }
  const normalized = [...ids];
  const currentIsCanonical = Array.isArray(current) && current.length === normalized.length && current.every((value, index) => value === normalized[index]);
  if ((currentRaw !== null && !currentIsCanonical) || legacyRaw !== null) {
    if (saveFavorites(ids) && legacyRaw !== null) localStorage.removeItem(V1_KEY);
  }
  return ids;
}

export function saveFavorites(ids) {
  try { localStorage.setItem(V2_KEY, JSON.stringify([...ids])); return true; } catch (_) { return false; }
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
  const next = new Set(target);
  for (const value of values) {
    if (typeof value !== "string") continue;
    const id = resolveLegacy(value);
    if (id) next.add(id);
  }
  const added = next.size - target.size;
  if (!saveFavorites(next)) throw new Error("favorites storage unavailable");
  target.clear();
  for (const id of next) target.add(id);
  return added;
}
