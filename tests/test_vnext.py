import gzip
import json
import re
import subprocess
import unittest
from pathlib import Path

import search
from search_core import parse_terms, ranked as ranked_detailed


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


if __name__ == "__main__":
    unittest.main()
