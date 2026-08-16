import re
import unittest
from pathlib import Path


ROOT = Path(__file__).resolve().parents[1]


class DocumentationContractTests(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        cls.readme = (ROOT / "README.md").read_text(encoding="utf-8")
        cls.agents = (ROOT / "AGENTS.md").read_text(encoding="utf-8")
        cls.expansion = (ROOT / "EXPANSION.md").read_text(encoding="utf-8")
        cls.prompt = (ROOT / "PROMPT.md").read_text(encoding="utf-8")
        cls.skill = (ROOT / "skill" / "find-effect" / "SKILL.md").read_text(encoding="utf-8")
        cls.llms = (ROOT / "llms.txt").read_text(encoding="utf-8")
        cls.html = (ROOT / "index.html").read_text(encoding="utf-8")

    def test_ai_entrypoints_are_discoverable(self):
        for name in ("AGENTS.md", "EXPANSION.md", "PROMPT.md", "llms.txt"):
            self.assertIn(name, self.readme)
        for url in (
            "dist/index.txt",
            "dist/all.jsonl",
            "schema/effect.schema.json",
            "AGENTS.md",
        ):
            self.assertIn(url, self.llms)
        self.assertIn('rel="alternate" type="text/plain" href="llms.txt"', self.html)

    def test_root_markdown_relative_links_resolve(self):
        missing = []
        for path in ROOT.glob("*.md"):
            for target in re.findall(r"(?<!!)\[[^\]]*\]\(([^)]+)\)", path.read_text(encoding="utf-8")):
                target = target.strip().split("#", 1)[0]
                if not target or target.startswith(("http://", "https://", "mailto:", "#")):
                    continue
                if not (path.parent / target).resolve().exists():
                    missing.append(f"{path.name}: {target}")
        self.assertEqual([], missing)

    def test_new_unverified_candidates_are_not_encouraged(self):
        self.assertIn("新候選若無法從官方來源確認功能，直接略過", self.agents)
        self.assertIn("新候選不得用 unverified:true 湊數", self.prompt)

    def test_search_semantics_match_cli(self):
        self.assertIn("多詞預設 AND", self.skill)
        self.assertIn("--any", self.skill)
        self.assertNotIn("空格分隔＝OR", self.skill)

    def test_expansion_uses_current_deployment_verification(self):
        self.assertNotIn("?v=2", self.expansion)
        for command in (
            "python validate.py --strict",
            "python tools/audit.py --strict",
            "python tools/build_index.py",
            "gh run list --commit <sha>",
        ):
            self.assertIn(command, self.expansion)


if __name__ == "__main__":
    unittest.main()
