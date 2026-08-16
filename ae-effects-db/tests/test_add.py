import unittest

from tools.add import duplicate_name_location


class AddToolDeduplicationTests(unittest.TestCase):
    def test_different_kind_and_url_may_share_an_official_name(self):
        existing = [{
            "loc": "universe.jsonl:71",
            "kind": "plugin",
            "url": "https://www.maxon.net/en/product-detail/red-giant/universe/transitions",
        }]
        candidate = {
            "name": "Warp",
            "kind": "builtin",
            "url": "https://helpx.adobe.com/after-effects/using/distort-effects.html",
        }
        self.assertIsNone(duplicate_name_location(candidate, existing))

    def test_same_kind_or_same_url_remains_a_duplicate(self):
        existing = [{
            "loc": "third-party.jsonl:1",
            "kind": "plugin",
            "url": "https://vendor.example/tool",
        }]
        self.assertEqual(
            "third-party.jsonl:1",
            duplicate_name_location({"kind": "plugin", "url": "https://other.example/tool"}, existing),
        )
        self.assertEqual(
            "third-party.jsonl:1",
            duplicate_name_location({"kind": "script", "url": "https://vendor.example/tool/"}, existing),
        )


if __name__ == "__main__":
    unittest.main()
