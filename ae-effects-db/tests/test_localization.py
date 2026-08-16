import json
import unittest
from pathlib import Path
from urllib.parse import urlparse


ROOT = Path(__file__).resolve().parents[1]


class LocalizationContractTests(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        cls.manifest = json.loads((ROOT / "curation" / "localization.json").read_text(encoding="utf-8"))
        cls.rows = []
        for path in (ROOT / "data").glob("*.jsonl"):
            cls.rows.extend(json.loads(line) for line in path.read_text(encoding="utf-8").splitlines() if line.strip())
        cls.official_urls = {
            value
            for row in cls.rows
            for value in (row.get("url"), row.get("date_url"))
            if value
        }

    def test_localized_urls_are_explicit_official_mappings(self):
        mappings = self.manifest["localized_urls"]
        self.assertGreaterEqual(len(mappings), 100)
        for original, locales in mappings.items():
            self.assertIn(original, self.official_urls)
            self.assertEqual(set(locales), {"ja"})
            source, target = urlparse(original), urlparse(locales["ja"])
            self.assertEqual(source.hostname, target.hostname)
            self.assertNotEqual(original, locales["ja"])
            if target.hostname == "helpx.adobe.com":
                self.assertTrue(target.path.startswith("/jp/"))
            elif target.hostname == "www.maxon.net":
                self.assertTrue(target.path.startswith("/ja/"))
            else:
                self.fail(f"unapproved localized host: {target.hostname}")

        color_url = "https://helpx.adobe.com/after-effects/desktop/apply-effects-and-animation-presets/list-of-effects/color-correction-effects.html"
        matte_url = "https://helpx.adobe.com/after-effects/desktop/apply-effects-and-animation-presets/list-of-effects/matte-effects.html"
        self.assertNotIn(color_url, mappings, "Adobe's current Japanese Color Correction page returns HTTP 404")
        self.assertNotIn(matte_url, mappings, "Adobe's current Japanese Matte Effects page returns HTTP 404")

    def test_adobe_categories_have_official_english_and_japanese_labels(self):
        rules = self.manifest["official_category_rules"]
        self.assertEqual(len({rule["id"] for rule in rules}), len(rules))
        self.assertTrue({"blur-sharpen", "color-correction", "distort", "generate", "immersive-video"}.issubset({rule["id"] for rule in rules}))
        for rule in rules:
            self.assertTrue(rule["patterns"])
            self.assertTrue(rule["labels"]["en"])
            self.assertTrue(rule["labels"]["ja"])

    def test_adobe_effect_name_map_covers_every_actual_effect(self):
        categories = self.manifest["official_categories"]
        mappings = self.manifest["official_effect_categories"]
        exclusions = self.manifest["official_category_exclusions"]
        builtins = {row["name"] for row in self.rows if row["kind"] == "builtin"}
        self.assertEqual(278, len(mappings))
        self.assertEqual({"Smart Mask Interpolation", "Time-Reverse Keyframes"}, set(exclusions))
        self.assertEqual(builtins, set(mappings) | set(exclusions))
        self.assertTrue(set(mappings.values()).issubset(categories))
        self.assertEqual("keying", mappings["Keylight"])
        self.assertEqual("stylize", mappings["CC Burn Film"])
        self.assertEqual("boris-fx-mocha", mappings["Mocha AE"])
        self.assertEqual("cinema-4d", mappings["CINEWARE"])

    def test_site_taxonomy_is_declared_separately_from_vendor_categories(self):
        policy = self.manifest["policy"]
        self.assertIn("site-defined", policy["taxonomy"])
        self.assertIn("Official product spelling", policy["product_names"])
        self.assertIn("Traditional Chinese", policy["descriptions"])

    def test_localized_descriptions_are_complete_and_actually_translated(self):
        translated = [row for row in self.rows if row.get("desc_en") or row.get("desc_ja")]
        self.assertGreaterEqual(len(translated), 40)
        for row in translated:
            self.assertTrue(row.get("desc_en"), f"{row['name']} 缺 desc_en")
            self.assertTrue(row.get("desc_ja"), f"{row['name']} 缺 desc_ja")
            self.assertNotEqual(row["desc_en"], row["desc"], f"{row['name']} desc_en 未翻譯")
            self.assertNotEqual(row["desc_ja"], row["desc"], f"{row['name']} desc_ja 未翻譯")
            if row.get("look"):
                self.assertTrue(row.get("look_en"), f"{row['name']} 缺 look_en")
                self.assertTrue(row.get("look_ja"), f"{row['name']} 缺 look_ja")


if __name__ == "__main__":
    unittest.main()
