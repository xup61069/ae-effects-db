export function itemDate(item) {
  const value = item?.updated || item?.released || "";
  return /^\d{4}-\d{2}-\d{2}$/.test(value) ? value : "";
}

function compareNames(a, b, locale) {
  return String(a?.name || "").localeCompare(String(b?.name || ""), locale) ||
    String(a?.id || "").localeCompare(String(b?.id || ""), locale);
}

export function sortMatches(matches, {
  mode = "popular",
  hasTerms = false,
  locale = "zh-Hant",
  categoryLabels = {},
  sourceOrder = [],
  popularity = () => ({total:0}),
} = {}) {
  const sourceRank = item => {
    const index = sourceOrder.indexOf(item?._src);
    return index < 0 ? 999 : index;
  };
  const sourceCmp = (a, b) => sourceRank(a) - sourceRank(b) ||
    (a?._rank ?? 9999) - (b?._rank ?? 9999) || compareNames(a, b, locale);
  const popularCmp = (a, b) => popularity(b).total - popularity(a).total || sourceCmp(a, b);
  const compareDates = (a, b) => {
    const da = itemDate(a), db = itemDate(b);
    if (da && db) {
      if (da < db) return 1;
      if (da > db) return -1;
    }
    if (da) return -1;
    if (db) return 1;
    return 0;
  };
  const categoryLabel = item => categoryLabels[item?.cat] || item?.cat || "";
  return [...matches].sort((a, b) => {
    const ai = a.item || a, bi = b.item || b;
    if (mode === "name") return compareNames(ai, bi, locale);
    if (mode === "category") return categoryLabel(ai).localeCompare(categoryLabel(bi), locale) || compareNames(ai, bi, locale);
    if (mode === "source") return sourceCmp(ai, bi);
    if (mode === "latest") return compareDates(ai, bi) || popularCmp(ai, bi);
    if (mode === "relevance" && hasTerms) return (b.score || 0) - (a.score || 0) || compareNames(ai, bi, locale);
    return popularCmp(ai, bi);
  });
}
