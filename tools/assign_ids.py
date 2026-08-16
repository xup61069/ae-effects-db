#!/usr/bin/env python3
"""Assign stable IDs to repository JSONL rows without reordering other fields."""

from __future__ import annotations

import argparse
import glob
import json
import os

from common import ID_PATTERN, derive_src, make_stable_id


ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
DATA = os.path.join(ROOT, "data")


def migrated_rows() -> tuple[dict[str, list[dict]], list[str]]:
    files: dict[str, list[dict]] = {}
    used: set[str] = set()
    changes: list[str] = []
    for path in sorted(glob.glob(os.path.join(DATA, "*.jsonl"))):
        source = os.path.splitext(os.path.basename(path))[0]
        rows: list[dict] = []
        with open(path, encoding="utf-8") as handle:
            for line_no, raw in enumerate(handle, 1):
                if not raw.strip():
                    continue
                item = json.loads(raw)
                existing = item.get("id")
                if existing:
                    if not isinstance(existing, str) or not ID_PATTERN.fullmatch(existing):
                        raise ValueError(f"{path}:{line_no} invalid id: {existing!r}")
                    if existing in used:
                        raise ValueError(f"{path}:{line_no} duplicate id: {existing}")
                    stable_id = existing
                else:
                    stable_id = make_stable_id(item, derive_src(source, item.get("url", "")), used)
                    item = {"id": stable_id, **item}
                    changes.append(f"{os.path.basename(path)}:{line_no} -> {stable_id}")
                used.add(stable_id)
                rows.append(item)
        files[path] = rows
    return files, changes


def main() -> None:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--check", action="store_true", help="Fail if any row still needs an ID")
    args = parser.parse_args()
    files, changes = migrated_rows()
    if args.check:
        if changes:
            print(f"{len(changes)} rows need stable IDs")
            raise SystemExit(1)
        print("All rows have valid unique stable IDs")
        return
    for path, rows in files.items():
        with open(path, "w", encoding="utf-8", newline="\n") as handle:
            for item in rows:
                handle.write(json.dumps(item, ensure_ascii=False) + "\n")
    print(f"Assigned {len(changes)} stable IDs")


if __name__ == "__main__":
    main()
