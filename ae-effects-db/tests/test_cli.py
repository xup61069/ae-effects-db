import json
import subprocess
import sys
import unittest
from pathlib import Path


ROOT = Path(__file__).resolve().parents[1]


def run_json(*arguments: str) -> dict:
    result = subprocess.run(
        [sys.executable, "search.py", *arguments, "--json"], cwd=ROOT,
        check=True, capture_output=True, text=True, encoding="utf-8",
    )
    return json.loads(result.stdout)


class CliSearchContractTests(unittest.TestCase):
    def test_single_argv_multiword_query_matches_separate_arguments(self):
        quoted = run_json("keying audio", "--lang", "en")
        separate = run_json("keying", "audio", "--lang", "en")
        self.assertEqual(["keying", "audio"], quoted["used_terms"])
        self.assertEqual("or", quoted["fallback"])
        self.assertEqual(
            [row["id"] for row in separate["results"]],
            [row["id"] for row in quoted["results"]],
        )

    def test_json_explain_and_language_contract(self):
        payload = run_json("glwo", "--lang", "ja", "--explain", "--top", "1")
        self.assertEqual("corrected", payload["fallback"])
        self.assertEqual(["glow"], payload["used_terms"])
        self.assertEqual(["glow"], payload["suggestions"]["glwo"])
        self.assertIn("score", payload["results"][0])
        self.assertIn("match_reasons", payload["results"][0])
        self.assertTrue(payload["results"][0]["description"])

    def test_suite_filter_matches_the_source_name_shown_to_users(self):
        payload = run_json("supercomp", "--suite", "VFX Suite")
        self.assertEqual(1, payload["total"])
        self.assertEqual("red-giant-supercomp", payload["results"][0]["id"])
        self.assertEqual("VFX Suite", payload["results"][0]["source"])

    def test_category_listing_honors_filters(self):
        payload = run_json("--list-cats", "--kind", "script")
        self.assertEqual(1014, payload["total"])
        self.assertEqual(payload["total"], sum(payload["categories"].values()))

    def test_json_reports_limit_and_rejects_non_positive_top(self):
        payload = run_json("glow", "--top", "2")
        self.assertEqual(2, payload["limit"])
        self.assertEqual(2, payload["returned"])
        self.assertEqual(2, len(payload["results"]))
        self.assertGreater(payload["total"], payload["returned"])

        result = subprocess.run(
            [sys.executable, "search.py", "glow", "--top", "-1", "--json"], cwd=ROOT,
            capture_output=True, text=True, encoding="utf-8",
        )
        self.assertEqual(2, result.returncode)
        self.assertIn("positive integer", result.stderr)
        self.assertEqual("", result.stdout)


if __name__ == "__main__":
    unittest.main()
