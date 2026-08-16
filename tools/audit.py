#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""產生 AE 特效資料庫的唯讀品質盤點報告。"""

from __future__ import annotations

import argparse
import collections
import glob
import json
import os
import re
import sys
from urllib.parse import urlparse

try:
    sys.stdout.reconfigure(encoding="utf-8")
except Exception:
    pass

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
DATA = os.path.join(ROOT, "data")
DISCONTINUED = re.compile(
    r"(?:已停售|已下架|停止販售|discontinued|no longer available)", re.I
)


def canonical_url(value: str) -> str:
    return value.strip().rstrip("/").casefold()


def popular_keys() -> list[str]:
    path = os.path.join(ROOT, "curation", "popularity.json")
    with open(path, encoding="utf-8") as handle:
        config = json.load(handle)
    keys = config.get("featured")
    if not isinstance(keys, list) or not all(isinstance(key, str) for key in keys):
        raise ValueError("curation/popularity.json 的 featured 必須是字串陣列")
    if not keys:
        raise ValueError("curation/popularity.json 的 featured 不應為空")
    return keys


def dedicated_product_roots() -> set[str]:
    path = os.path.join(ROOT, "curation", "audit.json")
    with open(path, encoding="utf-8") as handle:
        config = json.load(handle)
    values = config.get("dedicated_product_roots")
    if not isinstance(values, list) or not all(isinstance(value, str) for value in values):
        raise ValueError("curation/audit.json 的 dedicated_product_roots 必須是字串陣列")
    normalized = {canonical_url(value) for value in values}
    if len(normalized) != len(values):
        raise ValueError("curation/audit.json 的 dedicated_product_roots 不應重複")
    if any(urlparse(value).path not in {"", "/"} for value in normalized):
        raise ValueError("dedicated_product_roots 只能列出網站根網址")
    return normalized


def homepage_only_candidates(rows: list[tuple[str, dict]]) -> list[str]:
    allowed = dedicated_product_roots()
    available = {canonical_url(item.get("url", "")) for _, item in rows}
    missing = allowed - available
    if missing:
        raise ValueError(f"dedicated_product_roots 未對應資料：{', '.join(sorted(missing))}")
    return [
        item["name"]
        for _, item in rows
        if urlparse(item.get("url", "")).path in {"", "/"}
        and canonical_url(item.get("url", "")) not in allowed
    ]


def main() -> None:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument(
        "--strict",
        action="store_true",
        help="熱門鍵、重複商品頁或重複 tags 出錯時回傳非零狀態",
    )
    args = parser.parse_args()

    rows: list[tuple[str, dict]] = []
    for path in sorted(glob.glob(os.path.join(DATA, "*.jsonl"))):
        filename = os.path.basename(path)
        with open(path, encoding="utf-8") as handle:
            for raw in handle:
                if raw.strip():
                    rows.append((filename, json.loads(raw)))

    by_file = collections.Counter(filename for filename, _ in rows)
    by_kind = collections.Counter(item.get("kind", "(missing)") for _, item in rows)
    by_cat = collections.Counter(item.get("cat", "(missing)") for _, item in rows)
    by_host = collections.Counter(urlparse(item.get("url", "")).netloc for _, item in rows)
    names: dict[str, list[str]] = collections.defaultdict(list)
    aescripts_pages: dict[str, list[str]] = collections.defaultdict(list)
    name_urls: dict[tuple[str, str], list[str]] = collections.defaultdict(list)
    available_popular: set[str] = set()

    for filename, item in rows:
        name = item.get("name", "").strip()
        normalized_name = name.casefold()
        normalized_url = canonical_url(item.get("url", ""))
        names[normalized_name].append(filename)
        name_urls[(normalized_name, normalized_url)].append(filename)
        if urlparse(normalized_url).netloc in {"aescripts.com", "www.aescripts.com"}:
            aescripts_pages[normalized_url].append(name)
        available_popular.add(f"{os.path.splitext(filename)[0]}:{name}")

    duplicate_aescripts = [
        f"{url} → {' / '.join(names)}"
        for url, names in aescripts_pages.items()
        if len(set(name.casefold() for name in names)) > 1
    ]
    cross_file_exact = [
        name
        for (name, _), files in name_urls.items()
        if len(files) > 1 and len(set(files)) > 1
    ]
    duplicate_tags = [
        item["name"]
        for _, item in rows
        if len({tag.strip().casefold() for tag in item.get("tags", [])})
        != len(item.get("tags", []))
    ]
    missing_popular = [key for key in popular_keys() if key not in available_popular]
    root_urls = homepage_only_candidates(rows)

    checks = {
        "缺少 URL": [item["name"] for _, item in rows if not item.get("url")],
        "tags 少於 5 個": [item["name"] for _, item in rows if len(item.get("tags", [])) < 5],
        "重複 tags": duplicate_tags,
        "desc 少於 18 字": [item["name"] for _, item in rows if len(item.get("desc", "")) < 18],
        "仍標示 unverified": [item["name"] for _, item in rows if item.get("unverified")],
        "停售／下架文字": [
            item["name"] for _, item in rows if DISCONTINUED.search(item.get("desc", ""))
        ],
        "排列組合式配方": [
            item["name"]
            for _, item in rows
            if item.get("kind") == "recipe" and "・" in item.get("name", "")
        ],
        "同檔重複名稱": [
            name
            for name, files in names.items()
            if any(count > 1 for count in collections.Counter(files).values())
        ],
        "跨檔同名同網址": cross_file_exact,
        "aescripts 商品頁重複": duplicate_aescripts,
        "熱門排序鍵失效": missing_popular,
        "只連官方首頁": root_urls,
    }

    print(f"總筆數：{len(rows):,}（{len(by_file)} 個資料檔）")
    print("型態：" + " / ".join(f"{key} {value:,}" for key, value in by_kind.most_common()))
    print("\n資料檔：")
    for key, value in by_file.most_common():
        print(f"  {key:<22} {value:>5,}")
    print("\n前 12 大分類：")
    print("  " + " / ".join(f"{key} {value:,}" for key, value in by_cat.most_common(12)))
    print("\n前 10 大官方網域：")
    for key, value in by_host.most_common(10):
        print(f"  {key:<34} {value:>5,}")
    print("\n品質檢查：")
    for label, items in checks.items():
        suffix = "" if not items else " — " + "、".join(items[:5]) + ("…" if len(items) > 5 else "")
        print(f"  {label}: {len(items)}{suffix}")

    blockers = duplicate_tags + duplicate_aescripts + cross_file_exact + missing_popular
    if args.strict and blockers:
        raise SystemExit(1)


if __name__ == "__main__":
    main()
