let aliases = {};
let simplifiedMap = {};
let vocabularyCache = null;

export function configureSearch(baseConfig = {}, japaneseConfig = {}) {
  simplifiedMap = baseConfig.simplified_to_traditional || {};
  aliases = {...(baseConfig.aliases || {}), ...(japaneseConfig.aliases || {})};
  aliases = Object.fromEntries(Object.entries(aliases).map(([key, values]) => [normalizeText(key), values.map(normalizeText)]));
  vocabularyCache = null;
}

export function normalizeText(value) {
  return String(value ?? "").normalize("NFKC")
    .replace(/[\u3400-\u9fff]/g, character => simplifiedMap[character] || character)
    .toLocaleLowerCase().replace(/\s+/g, " ").trim();
}

export function parseTerms(raw) {
  const terms = [];
  const pattern = /"([^"]+)"|'([^']+)'|(\S+)/g;
  let match;
  while ((match = pattern.exec(raw))) terms.push(normalizeText(match[1] || match[2] || match[3]));
  return [...new Set(terms.filter(Boolean))];
}

export function termGroups(terms) {
  return terms.map(raw => {
    const term = normalizeText(raw);
    return [...new Set([term, ...(aliases[term] || [])])].filter(Boolean);
  });
}

export function itemHaystack(item) {
  const variants = item.variants ? `${Object.keys(item.variants).join(" ")} ${Object.values(item.variants).join(" ")}` : "";
  return normalizeText([
    item.name, item.kind, item.cat, item._desc, item._look, item.suite, item.vendor,
    ...(item.tags || []), ...(item.stack || []), variants,
  ].join(" "));
}

export function matchDetails(item, terms) {
  const name = normalizeText(item.name);
  const tags = (item.tags || []).map(normalizeText);
  const variants = normalizeText(Object.keys(item.variants || {}).join(" "));
  const description = normalizeText(`${item._desc || ""} ${item._look || ""}`);
  const text = itemHaystack(item);
  let score = 0;
  const reasons = [];
  termGroups(terms).forEach((group, index) => {
    const original = normalizeText(terms[index]);
    let best = [0, ""];
    for (const term of group) {
      const isAlias = term !== original;
      const candidates = [
        [name === term ? 50 : name.startsWith(term) ? 32 : name.includes(term) ? 20 : 0, "name"],
        [tags.includes(term) ? 14 : tags.some(tag => tag.includes(term)) ? 10 : 0, "tag"],
        [variants.includes(term) ? 10 : 0, "variant"],
        [description.includes(term) ? 4 : 0, "description"],
        [text.includes(term) ? 1 : 0, "text"],
      ].sort((a, b) => b[0] - a[0])[0];
      if (candidates[0] > best[0]) best = [candidates[0], isAlias ? `alias:${original}:${term}:${candidates[1]}` : candidates[1]];
    }
    score += best[0];
    if (best[1]) reasons.push(best[1]);
  });
  const phrase = terms.map(normalizeText).filter(Boolean).join(" ");
  if (phrase) {
    if (name === phrase) { score += 80; reasons.push("exact-name"); }
    else if (name.startsWith(phrase)) { score += 35; reasons.push("name-prefix"); }
    else if (name.includes(phrase)) { score += 20; reasons.push("name-phrase"); }
  }
  return {score, reasons:[...new Set(reasons)]};
}

export function rankedMatches(items, terms, {requireAll = true} = {}) {
  const groups = termGroups(terms);
  return items.map(item => {
    const text = itemHaystack(item);
    const matches = groups.map(group => group.some(term => text.includes(term)));
    const details = matchDetails(item, terms);
    return {...details, item, matches};
  }).filter(result => !terms.length || ((requireAll ? result.matches.every(Boolean) : result.matches.some(Boolean)) && result.score > 0))
    .sort((a, b) => {
      const names = [a.item.name.toLocaleLowerCase(), b.item.name.toLocaleLowerCase()];
      return b.score - a.score || (names[0] < names[1] ? -1 : names[0] > names[1] ? 1 : 0) || (a.item.id < b.item.id ? -1 : 1);
    });
}

const isCjk = value => /[\u3400-\u9fff]/.test(value);

export function segmentTerms(terms) {
  const output = [];
  for (const term of terms) {
    if (term.length < 3 || !isCjk(term)) continue;
    for (let index = 0; index < term.length - 1; index += 1) {
      const part = term.slice(index, index + 2);
      if (/^[\u3400-\u9fff]{2}$/.test(part) && !output.includes(part)) output.push(part);
    }
  }
  return output;
}

export function damerauLevenshtein(a, b) {
  const matrix = Array.from({length:a.length + 1}, () => Array(b.length + 1).fill(0));
  for (let index = 0; index <= a.length; index += 1) matrix[index][0] = index;
  for (let index = 0; index <= b.length; index += 1) matrix[0][index] = index;
  for (let i = 1; i <= a.length; i += 1) {
    for (let j = 1; j <= b.length; j += 1) {
      const cost = a[i - 1] === b[j - 1] ? 0 : 1;
      matrix[i][j] = Math.min(matrix[i - 1][j] + 1, matrix[i][j - 1] + 1, matrix[i - 1][j - 1] + cost);
      if (i > 1 && j > 1 && a[i - 1] === b[j - 2] && a[i - 2] === b[j - 1]) {
        matrix[i][j] = Math.min(matrix[i][j], matrix[i - 2][j - 2] + 1);
      }
    }
  }
  return matrix[a.length][b.length];
}

function vocabulary(items) {
  if (vocabularyCache) return vocabularyCache;
  const words = new Map();
  for (const item of items) {
    [item.name, ...(item.tags || [])].forEach((value, index) => {
      for (const word of normalizeText(value).split(/[^a-z0-9\u3400-\u9fff]+/).filter(word => word.length >= 3)) {
        words.set(word, (words.get(word) || 0) + (index === 0 ? 5 : 1));
      }
    });
  }
  vocabularyCache = words;
  return words;
}

export function correctionSuggestions(items, raw, limitResults = 3) {
  const term = normalizeText(raw);
  if (term.length < 4 || isCjk(term)) return [];
  const words = vocabulary(items);
  if (words.has(term)) return [];
  const limit = term.length >= 7 ? 2 : 1;
  return [...words.entries()].filter(([word]) => Math.abs(word.length - term.length) <= limit)
    .map(([word, frequency]) => [damerauLevenshtein(term, word), Math.abs(word.length - term.length), -frequency, word])
    .filter(([distance]) => distance <= limit)
    .sort((a, b) => a[0] - b[0] || a[1] - b[1] || a[2] - b[2] || a[3].localeCompare(b[3]))
    .slice(0, limitResults).map(item => item[3]);
}

export function correctTerms(items, terms) {
  let changed = false;
  const output = terms.map(raw => {
    const term = normalizeText(raw);
    const suggestions = correctionSuggestions(items, term);
    if (!suggestions.length) return term;
    if (suggestions.length > 1) {
      const key = word => [damerauLevenshtein(term, word), Math.abs(word.length - term.length)].join(":");
      if (key(suggestions[0]) === key(suggestions[1])) return term;
    }
    changed = changed || suggestions[0] !== term;
    return suggestions[0];
  });
  return changed ? output : [];
}

export function autocomplete(items, raw, labels = {}, limit = 8) {
  const query = normalizeText(raw);
  if (!query) return [];
  const output = [];
  const seen = new Set();
  const add = (value, type, label = value) => {
    const key = `${type}:${value}`;
    if (!seen.has(key)) { seen.add(key); output.push({value, type, label}); }
  };
  items.filter(item => normalizeText(item.name).includes(query)).sort((a, b) => {
    const aPrefix = normalizeText(a.name).startsWith(query) ? 0 : 1;
    const bPrefix = normalizeText(b.name).startsWith(query) ? 0 : 1;
    return aPrefix - bPrefix || a.name.localeCompare(b.name);
  }).slice(0, 5).forEach(item => add(item.name, "item"));
  Object.entries(labels).filter(([key, label]) => normalizeText(`${key} ${label}`).includes(query))
    .slice(0, 3).forEach(([key, label]) => add(label, "category", label));
  correctionSuggestions(items, query).forEach(value => add(value, "correction"));
  return output.slice(0, limit);
}
