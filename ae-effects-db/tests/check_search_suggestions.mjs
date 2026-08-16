import assert from "node:assert/strict";
import fs from "node:fs";
import "../i18n.js";
import {autocomplete, configureSearch} from "../assets/search.js";

const root = new URL("../", import.meta.url);
const read = relative => JSON.parse(fs.readFileSync(new URL(relative, root), "utf8"));
const catalog = read("dist/web/catalog.json");
configureSearch(read("curation/search.json"), read("curation/search-aliases.ja.json"));

for (const [language, category] of [["zh", "vr"], ["ja", "blur-glow"], ["ja", "film"], ["ja", "recipe"], ["ja", "vr"]]) {
  const labels = globalThis.AE_I18N.locales[language].categories;
  const option = autocomplete(catalog, labels[category], labels).find(value => value.type === "category" && value.value === category);
  assert(option, `${language}:${category} must remain a selectable category suggestion`);
  assert.equal(option.label, labels[category]);
}

console.log("Localized category suggestions retain stable facet keys.");
