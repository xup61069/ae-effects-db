#!/usr/bin/env python3
"""Build backward-compatible AI indexes and compact locale-aware web assets."""

from __future__ import annotations

import collections
import glob
import hashlib
import json
import math
import os
import sys

try:
    from tools.common import derive_src, make_stable_id
except ModuleNotFoundError:  # python tools/build_index.py
    from common import derive_src, make_stable_id

sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
from search_core import normalize_text  # noqa: E402


try:
    sys.stdout.reconfigure(encoding="utf-8")
except Exception:
    pass


ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
DATA = os.path.join(ROOT, "data")
DIST = os.path.join(ROOT, "dist")
WEB_DIST = os.path.join(DIST, "web")
LOCALE_DIST = os.path.join(WEB_DIST, "locales")
SRC_LABEL = {
    "red-giant": "Red Giant", "universe": "Universe", "sapphire": "Sapphire",
    "continuum": "Continuum", "builtin-ae": "AE內建", "aescripts": "aescripts",
    "third-party": "第三方", "booth": "BOOTH", "gumroad": "Gumroad",
    "installed": "未驗證", "recipes": "配方",
}
LOCALE_FIELDS = {
    "zh": ("desc", "look"),
    "en": ("desc_en", "look_en"),
    "ja": ("desc_ja", "look_ja"),
}
DISPLAY_FIELDS = {"desc", "look", "desc_en", "desc_ja", "look_en", "look_ja"}
GENERIC_TAGS = {
    "after effects", "ae", "plugin", "script", "effect", "effects", "preset",
    "adobe", "adobe after effects", "aescripts", "boris fx", "maxon", "red giant",
    "sapphire", "continuum", "universe", "gumroad", "booth", "外掛", "腳本", "內建", "效果",
}


def search_text(item: dict) -> str:
    parts = [
        item.get("name", ""), item.get("kind", ""), item.get("cat", ""),
        item.get("desc", ""), item.get("look", ""), item.get("suite", ""),
        item.get("vendor", ""), " ".join(item.get("tags", [])), " ".join(item.get("stack", [])),
        item.get("desc_en", ""), item.get("desc_ja", ""), item.get("look_en", ""), item.get("look_ja", ""),
    ]
    variants = item.get("variants")
    if isinstance(variants, dict):
        parts.extend((" ".join(variants), " ".join(map(str, variants.values()))))
    return normalize_text(" ".join(parts))


def load_rows() -> list[dict]:
    rows: list[dict] = []
    used_ids: set[str] = set()
    for path in sorted(glob.glob(os.path.join(DATA, "*.jsonl"))):
        file_src = os.path.splitext(os.path.basename(path))[0]
        with open(path, encoding="utf-8") as handle:
            for rank, raw in enumerate(handle):
                if not raw.strip():
                    continue
                item = json.loads(raw)
                source = derive_src(file_src, item.get("url", ""))
                stable_id = item.get("id") or make_stable_id(item, source, used_ids)
                if stable_id in used_ids:
                    raise ValueError(f"duplicate stable id: {stable_id}")
                used_ids.add(stable_id)
                item["id"] = stable_id
                item["_src"] = source
                item["_rank"] = rank
                rows.append(item)
    return rows


def normalized_tags(item: dict) -> set[str]:
    return {
        value for tag in item.get("tags", [])
        if (value := normalize_text(tag)) and value not in GENERIC_TAGS and len(value) > 1
    }


def related_indexes(rows: list[dict]) -> dict[str, dict[str, list[str]]]:
    tag_sets = {item["id"]: normalized_tags(item) for item in rows}
    frequency = collections.Counter(tag for values in tag_sets.values() for tag in values)
    by_category: dict[str, list[dict]] = collections.defaultdict(list)
    builtins = [item for item in rows if item.get("kind") == "builtin"]
    recipes = [item for item in rows if item.get("kind") == "recipe"]
    try:
        with open(os.path.join(ROOT, "curation", "popularity.json"), encoding="utf-8") as handle:
            popularity = json.load(handle)
    except (FileNotFoundError, json.JSONDecodeError):
        popularity = {"featured": [], "source_weights": {}}
    featured = {value: index for index, value in enumerate(popularity.get("featured", []))}
    source_weights = popularity.get("source_weights", {})
    for item in rows:
        by_category[item.get("cat", "")].append(item)

    def scored(item: dict, candidate: dict, category_bonus: bool = True) -> float:
        if item["id"] == candidate["id"]:
            return -1
        shared = tag_sets[item["id"]] & tag_sets[candidate["id"]]
        overlap = sum(math.log((len(rows) + 1) / (frequency[tag] + 1)) + 1 for tag in shared)
        value = overlap * 8
        if category_bonus and item.get("cat") == candidate.get("cat"):
            value += 22
        if item.get("kind") == candidate.get("kind"):
            value += 3
        if item.get("_src") != candidate.get("_src"):
            value += 1
        legacy_key = f"{candidate.get('_src')}:{candidate.get('name')}"
        if legacy_key in featured:
            value += max(2, 8 - featured[legacy_key] / 10)
        value += min(2, source_weights.get(candidate.get("_src"), 0) / 10)
        return value

    def top(item: dict, candidates: list[dict], count: int, category_bonus: bool = True) -> list[str]:
        ranked = [
            (scored(item, candidate, category_bonus), candidate)
            for candidate in candidates if candidate["id"] != item["id"]
        ]
        ranked = [pair for pair in ranked if pair[0] > 0]
        ranked.sort(key=lambda pair: (-pair[0], pair[1].get("_rank", 9999), pair[1].get("name", "")))
        return [candidate["id"] for _, candidate in ranked[:count]]

    output = {}
    for item in rows:
        same_category = by_category[item.get("cat", "")]
        builtin_pool = same_category if item.get("cat") != "recipe" else builtins
        output[item["id"]] = {
            "similar": top(item, same_category, 6),
            "builtin": [] if item.get("kind") == "builtin" else top(item, [row for row in builtin_pool if row.get("kind") == "builtin"], 3),
            "recipes": top(item, recipes, 3, category_bonus=False),
        }
    return output


def write_json(path: str, value: object, *, pretty: bool = False) -> None:
    os.makedirs(os.path.dirname(path), exist_ok=True)
    with open(path, "w", encoding="utf-8", newline="\n") as handle:
        json.dump(value, handle, ensure_ascii=False, indent=2 if pretty else None, separators=None if pretty else (",", ":"))
        handle.write("\n")


def file_digest(paths: list[str]) -> str:
    digest = hashlib.sha256()
    for path in paths:
        with open(path, "rb") as handle:
            digest.update(handle.read())
    return digest.hexdigest()[:16]


def main() -> None:
    rows = load_rows()
    relations = related_indexes(rows)
    os.makedirs(DIST, exist_ok=True)
    os.makedirs(LOCALE_DIST, exist_ok=True)

    all_path = os.path.join(DIST, "all.jsonl")
    index_path = os.path.join(DIST, "index.txt")
    legacy_web_path = os.path.join(DIST, "web-index.json")
    catalog_path = os.path.join(WEB_DIST, "catalog.json")

    with open(all_path, "w", encoding="utf-8", newline="\n") as handle:
        for row in rows:
            public = {key: value for key, value in row.items() if not key.startswith("_")}
            public["src"] = SRC_LABEL.get(row["_src"], row["_src"])
            handle.write(json.dumps(public, ensure_ascii=False) + "\n")

    legacy_rows = []
    catalog = []
    for row in rows:
        public = {key: value for key, value in row.items() if not key.startswith("_")}
        legacy_rows.append({**public, "_src": row["_src"], "_rank": row["_rank"], "_search": search_text(row)})
        base = {key: value for key, value in public.items() if key not in DISPLAY_FIELDS}
        base.update(_src=row["_src"], _rank=row["_rank"], _legacy=f"{row['_src']}:{row['name']}", _related=relations[row["id"]])
        catalog.append(base)
    write_json(legacy_web_path, legacy_rows)
    write_json(catalog_path, catalog)

    locale_paths = []
    for lang, (desc_field, look_field) in LOCALE_FIELDS.items():
        values = {}
        for row in rows:
            desc = row.get(desc_field) or row.get("desc", "")
            look = row.get(look_field) or row.get("look", "")
            fallback = lang != "zh" and not row.get(desc_field)
            values[row["id"]] = [desc, look, 1 if fallback else 0]
        path = os.path.join(LOCALE_DIST, f"{lang}.json")
        write_json(path, values)
        locale_paths.append(path)

    header = (
        "# After Effects 特效／外掛索引（繁體中文）\n"
        f"# 共 {len(rows)} 筆　格式：名稱｜來源｜型態｜分類｜說明｜官方連結\n"
        "# 完整資料（含中英搜尋標籤、外觀描述）：dist/all.jsonl\n"
        "# 線上搜尋：https://xup61069.github.io/ae-effects-db/\n"
    )
    with open(index_path, "w", encoding="utf-8", newline="\n") as handle:
        handle.write(header)
        for row in rows:
            handle.write(f"{row['name']}｜{SRC_LABEL.get(row['_src'], row['_src'])}｜{row.get('kind','')}｜{row.get('cat','')}｜{row.get('desc','')}｜{row.get('url','')}\n")

    data_paths = [catalog_path, *locale_paths]
    shell = [
        "./", "index.html", "i18n.js", "assets/styles.css", "assets/app.js", "assets/search.js",
        "assets/state.js", "assets/favorites.js", "assets/render.js", "assets/pwa.js", "assets/icon.svg",
        "manifest.webmanifest", "service-worker.js",
        "curation/popularity.json", "curation/localization.json", "curation/search.json", "curation/search-aliases.ja.json",
    ]
    shell_paths = [os.path.join(ROOT, value) for value in shell if value != "./"]
    manifest = {
        "version": file_digest([*data_paths, *shell_paths]),
        "data": ["dist/web/catalog.json", *[f"dist/web/locales/{lang}.json" for lang in LOCALE_FIELDS]],
        "shell": shell,
    }
    write_json(os.path.join(WEB_DIST, "asset-manifest.json"), manifest, pretty=True)

    print(f"✅ dist/all.jsonl（{len(rows)} 筆，{os.path.getsize(all_path)/1024:.0f} KB）")
    print(f"✅ dist/index.txt（{os.path.getsize(index_path)/1024:.0f} KB）")
    print(f"✅ dist/web-index.json（向後相容，{os.path.getsize(legacy_web_path)/1024:.0f} KB）")
    print(f"✅ dist/web/catalog.json（{os.path.getsize(catalog_path)/1024:.0f} KB）＋3 個語系分片")


if __name__ == "__main__":
    main()
