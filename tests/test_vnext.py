import gzip
import json
import re
import subprocess
import unittest
from pathlib import Path

import search
from search_core import parse_terms, ranked as ranked_detailed, search_with_fallback
from tools.build_index import load_rows, normalized_tags, related_indexes


ROOT = Path(__file__).resolve().parents[1]


class StableIdAndAssetTests(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        cls.rows = search.load()

    def test_all_rows_have_unique_url_safe_stable_ids(self):
        ids = [row.get("id", "") for row in self.rows]
        self.assertEqual(len(ids), len(set(ids)))
        self.assertTrue(all(re.fullmatch(r"[a-z0-9]+(?:-[a-z0-9]+)*", value) for value in ids))

    def test_compact_initial_payload_beats_legacy_by_at_least_30_percent(self):
        legacy = gzip.compress((ROOT / "dist" / "web-index.json").read_bytes())
        initial_paths = [
            ROOT / "dist" / "web" / "catalog.json", ROOT / "dist" / "web" / "locales" / "zh.json",
            ROOT / "curation" / "popularity.json", ROOT / "curation" / "localization.json",
            ROOT / "curation" / "search.json", ROOT / "curation" / "search-aliases.ja.json",
        ]
        initial = b"".join(gzip.compress(path.read_bytes()) for path in initial_paths)
        self.assertLessEqual(len(initial), int(len(legacy) * 0.70))

    def test_asset_manifest_is_complete_and_versioned(self):
        manifest = json.loads((ROOT / "dist" / "web" / "asset-manifest.json").read_text(encoding="utf-8"))
        self.assertRegex(manifest["version"], r"^[0-9a-f]{16}$")
        worker = (ROOT / "service-worker.js").read_text(encoding="utf-8")
        self.assertIn(f'const BUILD_VERSION = "{manifest["version"]}";', worker)
        for relative in [*manifest["data"], *manifest["shell"]]:
            if relative == "./":
                continue
            self.assertTrue((ROOT / relative).is_file(), relative)


class CrossRuntimeSearchTests(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        cls.rows = search.load()
        cls.cases = json.loads((ROOT / "tests" / "search_cases.json").read_text(encoding="utf-8"))
        result = subprocess.run(
            ["node", "tests/search_parity.mjs"], cwd=ROOT, check=True, capture_output=True, text=True, encoding="utf-8"
        )
        cls.javascript = json.loads(result.stdout)

    def test_python_and_javascript_top_25_ranking_match(self):
        for case in self.cases:
            key = f"{case['lang']}:{case['query']}:{str(case['require_all']).lower()}"
            python = [
                [row["id"], score, row["name"]]
                for score, row, _ in ranked_detailed(
                    self.rows, parse_terms(case["query"]), require_all=case["require_all"], lang=case["lang"]
                )[:25]
            ]
            self.assertEqual(python, self.javascript[key], case["query"])

    def test_curated_search_expectations_and_unambiguous_typos(self):
        for case in self.cases:
            key = f"{case['lang']}:{case['query']}:{str(case['require_all']).lower()}"
            names = [result[2] for result in self.javascript[key]]
            if expected := case.get("expected_first"):
                self.assertEqual(expected, names[0])
            if expected := case.get("expected_contains"):
                self.assertTrue(any(expected.casefold() in name.casefold() for name in names), case["query"])
        self.assertEqual(["glow"], self.javascript["corrections"]["glwo"])
        self.assertEqual(["particular"], self.javascript["corrections"]["particlar"])
        self.assertEqual(["glow"], self.javascript["suggestions"]["glwo"])
        self.assertEqual(["particular"], self.javascript["suggestions"]["particlar"])

    def test_python_and_javascript_fallback_flow_match(self):
        expected = {
            "en:keying audio": "or", "zh:粒子發光": "segmented",
            "zh:glwo": "corrected", "en:zzzz": None,
        }
        for key, fallback in expected.items():
            lang, query = key.split(":", 1)
            python = search_with_fallback(self.rows, parse_terms(query), lang=lang)
            javascript = self.javascript["fallbacks"][key]
            self.assertEqual(fallback, python["fallback"], key)
            self.assertEqual(python["fallback"], javascript["fallback"], key)
            self.assertEqual(python["used_terms"], javascript["usedTerms"], key)
            self.assertEqual(python["suggestions"], javascript["suggestions"], key)
            self.assertEqual([row["id"] for _, row, _ in python["matches"][:25]], javascript["ids"], key)


class RecommendationTests(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        cls.rows = load_rows()
        cls.related = related_indexes(cls.rows)

    def test_platform_and_brand_labels_do_not_create_similarity(self):
        self.assertEqual(
            {"glow"},
            normalized_tags({"tags": [
                "After Effects plugin", "ScriptUI panel", "FxFactory Pro",
                "Noise Industries", "Continuum Transitions", "glow",
            ]}),
        )

    def test_alternatives_require_functional_tag_evidence(self):
        self.assertEqual([], self.related["third-party-atom"]["recipes"])
        self.assertEqual([], self.related["third-party-soundly"]["builtin"])
        self.assertIn(
            "recipes-e905fc52a1",
            self.related["aescripts-quick-chromatic-aberration-3"]["recipes"],
        )
        self.assertIn("builtin-ae-glow", self.related["aescripts-deep-glow-2"]["builtin"])

    def test_every_recommendation_has_meaningful_tag_evidence(self):
        by_id = {row["id"]: row for row in self.rows}
        for item in self.rows:
            item_tags = normalized_tags(item)
            for section, candidate_ids in self.related[item["id"]].items():
                for candidate_id in candidate_ids:
                    with self.subTest(item=item["id"], section=section, candidate=candidate_id):
                        self.assertTrue(item_tags & normalized_tags(by_id[candidate_id]))

    def test_broad_category_does_not_backfill_unrelated_popular_tools(self):
        self.assertEqual([], self.related["aescripts-ae-gpt"]["similar"])
        self.assertNotIn(
            "third-party-fx-console",
            self.related["gumroad-3d-to-2d"]["similar"],
        )
        self.assertIn(
            "red-giant-optical-glow",
            self.related["aescripts-deep-glow-2"]["similar"],
        )


if __name__ == "__main__":
    unittest.main()
