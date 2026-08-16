#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""AE Effects Database command-line search.

Examples:
    python search.py 發光
    python search.py glow bloom
    python search.py --any glow bloom
    python search.py --kind script --lang ja 字幕
    python search.py --json --explain particlar
"""

from __future__ import annotations

import argparse
import glob
import json
import os
import sys

from search_core import (
    ALIASES,
    SIMPLIFIED_TO_TRADITIONAL,
    correct_terms,
    correction_suggestions,
    damerau_levenshtein,
    haystack,
    local_field,
    match_details,
    normalize_text,
    parse_terms,
    ranked as ranked_detailed,
    search_with_fallback,
    score,
    segment,
    split_words,
    term_groups,
    vocabulary,
)
from tools.common import derive_src


try:
    sys.stdout.reconfigure(encoding="utf-8")
except Exception:
    pass


DATA_DIR = os.path.join(os.path.dirname(os.path.abspath(__file__)), "data")


def load() -> list[dict]:
    rows: list[dict] = []
    for path in sorted(glob.glob(os.path.join(DATA_DIR, "*.jsonl"))):
        file_src = os.path.splitext(os.path.basename(path))[0]
        with open(path, encoding="utf-8") as handle:
            for raw in handle:
                if not raw.strip():
                    continue
                try:
                    item = json.loads(raw)
                except json.JSONDecodeError:
                    continue
                item["_src"] = derive_src(file_src, item.get("url", ""))
                rows.append(item)
    return rows


def ranked(rows, terms, require_all=True, lang="zh"):
    """Backward-compatible two-tuple result API used by existing consumers."""
    return [(value, row) for value, row, _ in ranked_detailed(rows, terms, require_all, lang)]


def levenshtein(a, b):
    """Compatibility alias; transpositions now count as one edit."""
    return damerau_levenshtein(a, b)


def re_split(value):
    return split_words(value)


def _result_payload(value: int, row: dict, reasons: list[str], lang: str, explain: bool) -> dict:
    payload = {
        "id": row.get("id"),
        "name": row.get("name"),
        "kind": row.get("kind"),
        "cat": row.get("cat"),
        "source": row.get("suite") or row.get("vendor") or row.get("_src"),
        "description": local_field(row, "desc", lang),
        "url": row.get("url"),
    }
    if explain:
        payload.update(score=value, match_reasons=reasons)
    return payload


def _search(rows: list[dict], terms: list[str], require_all: bool, lang: str):
    outcome = search_with_fallback(rows, terms, require_all=require_all, lang=lang)
    return outcome["matches"], outcome["fallback"], outcome["used_terms"], outcome["suggestions"]


def _positive_int(value: str) -> int:
    try:
        parsed = int(value)
    except ValueError as error:
        raise argparse.ArgumentTypeError("must be a positive integer") from error
    if parsed < 1:
        raise argparse.ArgumentTypeError("must be a positive integer")
    return parsed


def _filter_rows(rows: list[dict], *, suite=None, cat=None, kind=None) -> list[dict]:
    pool = rows
    if suite:
        needle = suite.casefold()
        pool = [
            row for row in pool
            if any(needle in str(row.get(field, "")).casefold() for field in ("_src", "suite", "vendor"))
        ]
    if cat:
        pool = [row for row in pool if row.get("cat", "").casefold() == cat.casefold()]
    if kind:
        pool = [row for row in pool if row.get("kind") == kind]
    return pool


def main() -> None:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("terms", nargs="*", help="關鍵字（中英日皆可，多個預設為 AND）")
    parser.add_argument("--any", action="store_true", help="多個關鍵字改用 OR")
    parser.add_argument("--cat", help="限定分類")
    parser.add_argument("--kind", choices=("plugin", "script", "builtin", "recipe"), help="限定工具型態")
    parser.add_argument("--suite", help="限定來源")
    parser.add_argument("--top", type=_positive_int, default=15, help="顯示前 N 筆（正整數）")
    parser.add_argument("--list-cats", action="store_true", help="列出分類與筆數")
    parser.add_argument("--json", action="store_true", help="輸出機器可讀 JSON")
    parser.add_argument("--explain", action="store_true", help="顯示分數與命中原因")
    parser.add_argument("--lang", choices=("zh", "en", "ja"), default="zh", help="說明語言")
    args = parser.parse_args()

    rows = load()
    pool = _filter_rows(rows, suite=args.suite, cat=args.cat, kind=args.kind)
    if args.list_cats:
        from collections import Counter

        counts = Counter(row.get("cat", "?") for row in pool)
        if args.json:
            print(json.dumps({"total": len(pool), "categories": dict(counts.most_common())}, ensure_ascii=False, indent=2))
        else:
            for category, count in counts.most_common():
                print(f"{count:4d}  {category}")
            print(f"\n總計 {len(pool)} 筆 / {len(set(row['_src'] for row in pool))} 個來源檔")
        return
    if not args.terms:
        parser.print_help()
        return

    parsed_terms = list(dict.fromkeys(term for raw in args.terms for term in parse_terms(raw)))
    results, fallback, used_terms, suggestions = _search(pool, parsed_terms, not args.any, args.lang)
    if args.json:
        output = {
            "query": args.terms,
            "used_terms": used_terms,
            "fallback": fallback,
            "suggestions": suggestions,
            "total": len(results),
            "limit": args.top,
            "returned": min(len(results), args.top),
            "results": [
                _result_payload(value, row, reasons, args.lang, args.explain)
                for value, row, reasons in results[:args.top]
            ],
        }
        print(json.dumps(output, ensure_ascii=False, indent=2))
        return

    if fallback == "or":
        print("沒有同時符合全部關鍵字，改顯示符合任一關鍵字。\n")
    elif fallback == "segmented":
        print(f"找不到「{' '.join(args.terms)}」，已自動拆詞：{'、'.join(used_terms)}\n")
    elif fallback == "corrected":
        print(f"找不到「{' '.join(args.terms)}」，已修正為：{'、'.join(used_terms)}\n")

    if not results:
        if suggestions:
            options = "、".join(dict.fromkeys(value for values in suggestions.values() for value in values))
            print(f"找不到相符效果。你是不是要找：{options}？")
        else:
            print("找不到相符效果，換個關鍵字或用 --list-cats 看分類。")
        return

    for value, row, reasons in results[:args.top]:
        origin = row.get("suite") or row.get("vendor") or row["_src"]
        print(f"[{row.get('kind','?'):7}/{row.get('cat','?'):10}] {row['name']}  ({origin})")
        print(f"            {local_field(row, 'desc', args.lang)}")
        if args.explain:
            print(f"            score={value} · {', '.join(reasons)}")
        variants = row.get("variants")
        if isinstance(variants, dict):
            sample = list(variants.items())[:6]
            print("            變體: " + " | ".join(f"{key}={label}" for key, label in sample) + (" …" if len(variants) > 6 else ""))
    if len(results) > args.top:
        print(f"\n… 另有 {len(results) - args.top} 筆，用 --top 調整或加關鍵字縮小。")


if __name__ == "__main__":
    main()
