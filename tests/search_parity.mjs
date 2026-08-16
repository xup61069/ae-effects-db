import fs from "node:fs";
import path from "node:path";
import {fileURLToPath} from "node:url";
import {configureSearch, correctTerms, parseTerms, rankedMatches} from "../assets/search.js";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const readJson = relative => JSON.parse(fs.readFileSync(path.join(root, relative), "utf8"));
const catalog = readJson("dist/web/catalog.json");
configureSearch(readJson("curation/search.json"), readJson("curation/search-aliases.ja.json"));
const cases = readJson("tests/search_cases.json");
const locales = Object.fromEntries(["zh", "en", "ja"].map(lang => [lang, readJson(`dist/web/locales/${lang}.json`)]));
const output = {};
for (const test of cases) {
  for (const item of catalog) {
    const localized = locales[test.lang][item.id] || ["", ""];
    item._desc = localized[0] || "";
    item._look = localized[1] || "";
  }
  const terms = parseTerms(test.query);
  output[`${test.lang}:${test.query}:${test.require_all}`] = rankedMatches(catalog, terms, {requireAll:test.require_all})
    .slice(0, 25).map(result => [result.item.id, result.score, result.item.name]);
}
output.corrections = {
  glwo:correctTerms(catalog, ["glwo"]),
  particlar:correctTerms(catalog, ["particlar"]),
};
process.stdout.write(JSON.stringify(output));
