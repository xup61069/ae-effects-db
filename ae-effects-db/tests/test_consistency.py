import unittest

import search
from tools.audit import dedicated_product_roots, homepage_only_candidates, popular_keys
from tools.classify_kind import classify


class DatabaseConsistencyTests(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        cls.rows = search.load()
        cls.by_name = {row["name"]: row for row in cls.rows}

    def test_every_popular_key_points_to_a_real_row(self):
        keys = popular_keys()
        available = {f"{row['_src']}:{row['name']}" for row in self.rows}
        self.assertGreater(len(keys), 30, "熱門清單不應為空或意外縮水")
        self.assertEqual(len(keys), len(set(keys)), "POPULAR_KEYS 不應重複")
        self.assertEqual([], [key for key in keys if key not in available])

    def test_dedicated_product_roots_are_curated_not_reported_as_homepages(self):
        roots = dedicated_product_roots()
        self.assertEqual(
            {"https://freqreact.com", "https://www.voukoder.org"},
            roots,
        )
        rows = [(f"{row['_src']}.jsonl", row) for row in self.rows]
        self.assertEqual([], homepage_only_candidates(rows))

    def test_multi_term_search_prefers_exact_product(self):
        results = search.ranked(self.rows, ["fx", "console"], require_all=True)
        self.assertTrue(results)
        self.assertEqual("FX Console", results[0][1]["name"])

    def test_chinese_fallback_segmentation(self):
        self.assertEqual(["煙霧", "霧模", "模擬"], search.segment(["煙霧模擬"]))

    def test_simplified_chinese_and_aliases_are_searchable(self):
        simplified = search.ranked(self.rows, ["发光"], require_all=True)
        self.assertTrue(simplified)
        self.assertTrue(any("Glow" in row["name"] for _, row in simplified[:10]))
        slowmo = search.ranked(self.rows, ["slowmo"], require_all=True)
        self.assertTrue(any(row["name"] == "Twixtor" for _, row in slowmo[:10]))

    def test_common_english_typo_can_be_corrected(self):
        corrected = search.correct_terms(self.rows, ["particlar"])
        self.assertEqual(["particular"], corrected)
        self.assertEqual("Particular", search.ranked(self.rows, corrected)[0][1]["name"])

    def test_prominent_scripts_and_plugins_are_classified_correctly(self):
        expected = {
            "AfterCodecs": "plugin",
            "Auto Crop 3": "plugin",
            "BAO Boa": "plugin",
            "Plexus 3": "plugin",
            "Beauty Box Video": "plugin",
            "Buena Depth Cue Camera Mapper": "plugin",
            "Flicker Free 3": "plugin",
            "Fluid": "plugin",
            "FxFactory Pro Trackable PiP": "plugin",
            "Jlitch": "plugin",
            "LayerRender": "plugin",
            "Modulation 2": "plugin",
            "Newton 4": "plugin",
            "Plumebus": "plugin",
            "Ray Projector": "plugin",
            "Stardust": "plugin",
            "3D Flip Book": "script",
            "Blob it!": "script",
            "Command Frame": "script",
            "Ease and Wizz": "script",
            "KBar3": "script",
            "Motion Studio": "script",
            "ParticleShapes": "script",
            "Voukoder Pro 2026": "plugin",
        }
        self.assertEqual(expected, {name: self.by_name[name]["kind"] for name in expected})

    def test_kind_classifier_agrees_with_curated_data(self):
        disagreements = []
        for row in self.rows:
            predicted = classify(f"{row['_src']}.jsonl", row)
            if predicted != row["kind"]:
                disagreements.append((row["name"], row["kind"], predicted))
        self.assertEqual([], disagreements)

    def test_bundles_and_discontinued_tools_stay_excluded(self):
        self.assertNotIn("Blacklight Composite Suite", self.by_name)
        self.assertNotIn("Polyline", self.by_name)


if __name__ == "__main__":
    unittest.main()
