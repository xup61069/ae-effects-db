import os
import tempfile
import unittest

from validate import ROOT, scan_text_hygiene


class RepoHygieneTests(unittest.TestCase):
    def test_repo_text_files_are_clean_utf8(self):
        self.assertEqual([], scan_text_hygiene(ROOT))

    def test_nul_bytes_are_reported(self):
        with tempfile.TemporaryDirectory() as tmp:
            path = os.path.join(tmp, "bad.txt")
            with open(path, "wb") as handle:
                handle.write(b"ok\n\x00")
            problems = scan_text_hygiene(tmp)
        self.assertEqual(1, len(problems))
        self.assertIn("NUL", problems[0])

    def test_invalid_utf8_is_reported(self):
        with tempfile.TemporaryDirectory() as tmp:
            path = os.path.join(tmp, "bad.md")
            with open(path, "wb") as handle:
                handle.write(b"\xff\xfe")
            problems = scan_text_hygiene(tmp)
        self.assertEqual(1, len(problems))
        self.assertIn("UTF-8", problems[0])


if __name__ == "__main__":
    unittest.main()
