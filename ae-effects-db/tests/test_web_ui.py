import json
import unittest
from pathlib import Path


ROOT = Path(__file__).resolve().parents[1]
HTML = (ROOT / "index.html").read_text(encoding="utf-8")
I18N = (ROOT / "i18n.js").read_text(encoding="utf-8")
APP = (ROOT / "assets" / "app.js").read_text(encoding="utf-8")
SEARCH = (ROOT / "assets" / "search.js").read_text(encoding="utf-8")
STATE = (ROOT / "assets" / "state.js").read_text(encoding="utf-8")
FAVORITES = (ROOT / "assets" / "favorites.js").read_text(encoding="utf-8")
RENDER = (ROOT / "assets" / "render.js").read_text(encoding="utf-8")
CSS = (ROOT / "assets" / "styles.css").read_text(encoding="utf-8")
SW = (ROOT / "service-worker.js").read_text(encoding="utf-8")


class WebUiContractTests(unittest.TestCase):
    def test_native_module_shell_and_sort_modes(self):
        self.assertIn('type="module" src="assets/app.js"', HTML)
        self.assertNotIn("<style>", HTML)
        for value in ("popular", "relevance", "name", "category", "source", "latest"):
            self.assertIn(f'<option value="{value}"', HTML)
        self.assertIn('if (mode === "relevance" && hasTerms)', APP)
        self.assertIn('writeUrlState', APP)
        self.assertIn('set("sort"', STATE)
        self.assertIn("SORT_MODES.has(raw.sort)", STATE)
        self.assertIn("knownValues(raw.categories", STATE)
        self.assertIn("adoptHistoryState(restored)", APP)

    def test_favorites_v1_migrate_and_v2_export(self):
        self.assertIn('id="favBtn"', HTML)
        self.assertIn('ae-effects-db:favorites:v1', FAVORITES)
        self.assertIn('ae-effects-db:favorites:v2', FAVORITES)
        self.assertIn('localStorage.removeItem(V1_KEY)', FAVORITES)
        self.assertIn('version:2', FAVORITES)
        self.assertIn('Array.isArray(current?.favorites)', FAVORITES)
        self.assertIn('if (!saveFavorites(next)) throw', FAVORITES)
        self.assertIn('id="favExport"', HTML)
        self.assertIn('id="favImport"', HTML)

    def test_detail_compare_recommendations_and_legacy_urls(self):
        for element_id in ("compareTray", "compareDialog", "detailDialog"):
            self.assertIn(f'id="{element_id}"', HTML)
        self.assertIn('data-detail="${escapeHtml(item.id)}"', RENDER)
        self.assertIn('url.searchParams.set("item"', APP)
        self.assertIn("legacyMap.get(value)", STATE)
        self.assertIn('t("similarTools")', RENDER)
        self.assertIn('t("builtinRecommendations")', RENDER)
        self.assertIn('t("relatedRecipes")', RENDER)

    def test_compact_localized_index_and_mobile_performance(self):
        self.assertIn("dist/web/catalog.json", APP)
        self.assertIn("dist/web/locales/${lang}.json", APP)
        self.assertIn("dist/web-index.json", APP)
        self.assertIn("content-visibility:auto", CSS)
        self.assertIn("IntersectionObserver", APP)
        self.assertIn('id="mq"', HTML)
        self.assertIn('id="mobileFilterToggle"', HTML)
        self.assertIn('dialog.filterdialog', CSS)

    def test_search_weights_aliases_corrections_and_facets(self):
        for contract in ("normalizeText", "termGroups", "damerauLevenshtein", "correctTerms", "autocomplete"):
            self.assertIn(f"function {contract}", SEARCH)
        self.assertIn("syncFilterCounts", APP)
        self.assertIn("matchedBy", I18N)
        self.assertIn("didYouMean", I18N)

    def test_cards_keep_distinct_kind_colors_and_focus(self):
        for kind in ("plugin", "script", "builtin", "recipe"):
            self.assertIn(f".card.kind-{kind}", CSS)
            self.assertIn(f".kindbadge.kind-{kind}", CSS)
        self.assertIn(":focus-visible", CSS)
        self.assertIn("prefers-reduced-motion:reduce", CSS)
        self.assertIn('matchMedia("(prefers-reduced-motion: reduce)")', APP)
        self.assertNotIn('behavior:"smooth"}));', APP)
        self.assertIn(".langswitch button{flex:none;min-width:44px", CSS)
        self.assertIn(".updatebanner button{min-width:44px;min-height:44px", CSS)
        self.assertIn("min-height:44px", CSS)

    def test_complete_shareable_locales(self):
        self.assertIn('src="i18n.js"', HTML)
        self.assertIn('data-lang="en"', HTML)
        self.assertIn('data-lang="ja"', HTML)
        self.assertIn('set("lang"', STATE)
        self.assertIn('htmlLang:"en"', I18N)
        self.assertIn('htmlLang:"ja"', I18N)
        self.assertIn('AE エフェクトデータベース', I18N)
        self.assertIn('AE Effects Database', I18N)

    def test_ask_ai_is_local_only_and_composes_prompt(self):
        self.assertIn('id="askAiInput"', HTML)
        self.assertIn("navigator.clipboard.writeText(prompt)", APP)
        self.assertIn("aiPrompt", APP)
        self.assertIn('t("askAiEmpty")', APP)
        self.assertIn("askAiPrompt", APP)
        self.assertIn("promptFallback(prompt)", APP)
        self.assertNotIn("FormData", APP)
        self.assertNotIn("fetch(ai", APP)
        self.assertNotIn("URL.createObjectURL", APP)
        self.assertNotIn("visualDialog", APP)
        self.assertNotIn("VISUAL_FEATURES", APP)

    def test_pwa_version_is_atomic_and_user_activated(self):
        manifest = json.loads((ROOT / "manifest.webmanifest").read_text(encoding="utf-8"))
        self.assertEqual("standalone", manifest["display"])
        self.assertIn("asset-manifest.json", SW)
        self.assertIn("BUILD_VERSION", SW)
        self.assertIn('updateViaCache:"none"', (ROOT / "assets" / "pwa.js").read_text(encoding="utf-8"))
        self.assertIn('new Request(url, {cache:"no-store"})', SW)
        self.assertIn("const currentCacheName = () =>", SW)
        self.assertIn("const cache = await caches.open(currentCacheName())", SW)
        self.assertIn("cacheManifestAssets", SW)
        self.assertIn("fetchVerifiedAsset", SW)
        self.assertIn("asset integrity mismatch", SW)
        self.assertNotIn("await caches.match(request", SW)
        self.assertNotIn("await caches.match(new URL", SW)
        self.assertIn("SKIP_WAITING", SW)

    def test_category_autocomplete_uses_stable_facet_keys(self):
        app = (ROOT / "assets" / "app.js").read_text(encoding="utf-8")
        search = (ROOT / "assets" / "search.js").read_text(encoding="utf-8")
        self.assertIn('data-suggestion-type="${escapeHtml(value.type)}"', app)
        self.assertIn('suggestion.dataset.suggestionType === "category"', app)
        self.assertIn('state.categories.add(suggestion.dataset.suggestion)', app)
        self.assertIn('add(key, "category", label)', search)
        self.assertNotIn("skipWaiting();\nself.addEventListener(\"install\"", SW)
        self.assertIn("onUpdate", (ROOT / "assets" / "pwa.js").read_text(encoding="utf-8"))


if __name__ == "__main__":
    unittest.main()
