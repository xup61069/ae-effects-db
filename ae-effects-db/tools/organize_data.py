#!/usr/bin/env python3
"""把有固定歸屬的型態搬到正確資料檔，並保持 JSONL 一行一筆。"""
import json
from collections import Counter
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
DATA = ROOT / "data"
DESTINATION = {"builtin": "builtin-ae.jsonl", "recipe": "recipes.jsonl"}

def main():
    files = sorted(DATA.glob("*.jsonl"))
    buckets = {path.name: [] for path in files}
    moved = Counter()
    total = 0

    for path in files:
        for line in path.read_text(encoding="utf-8").splitlines():
            row = json.loads(line)
            total += 1
            target = DESTINATION.get(row.get("kind"), path.name)
            buckets.setdefault(target, []).append(row)
            if target != path.name:
                moved[f"{path.name} -> {target}"] += 1

    for path in files:
        rows = buckets[path.name]
        names = [row["name"].strip().lower() for row in rows]
        if len(names) != len(set(names)):
            raise SystemExit(f"duplicate name would be created in {path.name}")
        path.write_text("".join(json.dumps(row, ensure_ascii=False) + "\n" for row in rows), encoding="utf-8", newline="\n")

    for route, count in sorted(moved.items()):
        print(f"{route}: {count}")
    print(f"organized {total} entries")

if __name__ == "__main__":
    main()
