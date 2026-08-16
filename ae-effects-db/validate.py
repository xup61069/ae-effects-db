#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""驗證 data/*.jsonl 的格式與策展品質。

用法：
    python validate.py
    python validate.py --strict

一般模式把品質問題列為警告；strict 模式會把警告視為錯誤，供 CI 使用。
"""

from __future__ import annotations

import collections
import datetime as dt
import glob
import json
import os
import re
import sys
from urllib.parse import urlparse

from tools.common import ID_PATTERN

try:
    sys.stdout.reconfigure(encoding="utf-8")
except Exception:
    pass

ROOT = os.path.dirname(os.path.abspath(__file__))
DATA_DIR = os.path.join(ROOT, "data")

KNOWN_CATS = {
    "glow", "blur-glow", "light", "flare", "particles", "stylize", "film",
    "color", "blur", "warp", "keying", "tracking", "restore", "time",
    "transition", "text", "generate", "3d", "draw", "paint", "art",
    "texture", "audio", "physics", "rigging", "workflow", "render",
    "expression", "animation", "preset", "utility", "distort", "mograph",
    "beauty", "edge", "emboss", "composite", "matte", "perspective",
    "kaleido", "vr", "recipe",
}
KNOWN_KINDS = {"plugin", "script", "builtin", "recipe"}
REQUIRED = ("name", "kind", "cat", "tags", "desc", "url")
OPTIONAL = {
    "id", "look", "variants", "stack", "builtin", "suite", "vendor",
    "released", "updated", "date_url", "unverified", "aex",
    "desc_en", "desc_ja", "look_en", "look_ja",
}
ALLOWED = set(REQUIRED) | OPTIONAL

CJK = re.compile(r"[\u3400-\u9fff]")
DISCONTINUED = re.compile(
    r"(?:已停售|已下架|停止販售|discontinued|no longer available)", re.I
)


def valid_url(value: object) -> bool:
    if not isinstance(value, str):
        return False
    parsed = urlparse(value)
    return parsed.scheme in {"http", "https"} and bool(parsed.netloc)


def canonical_url(value: str) -> str:
    """Normalize cosmetic URL differences without merging distinct product pages."""
    return value.strip().rstrip("/").casefold()


def parse_date(value: object) -> dt.date | None:
    if not isinstance(value, str):
        return None
    try:
        return dt.date.fromisoformat(value)
    except ValueError:
        return None


def quality_checks(rows: list[tuple[str, str, dict]]) -> tuple[list[str], list[str]]:
    warnings: list[str] = []
    soft: list[str] = []

    no_cjk = [loc for _, loc, item in rows if not any(CJK.search(str(t)) for t in item["tags"])]
    if no_cjk:
        sample = "、".join(no_cjk[:5])
        more = "…" if len(no_cjk) > 5 else ""
        warnings.append(f"{len(no_cjk)} 筆 tags 沒有中文搜尋詞：{sample}{more}")

    unverified = [loc for _, loc, item in rows if item.get("unverified")]
    if unverified:
        sample = "、".join(unverified[:5])
        more = "…" if len(unverified) > 5 else ""
        warnings.append(f"{len(unverified)} 筆仍標為 unverified：{sample}{more}")

    missing_ids = [loc for _, loc, item in rows if not item.get("id")]
    if missing_ids:
        warnings.append(f"{len(missing_ids)} 筆缺少穩定 id：" + "、".join(missing_ids[:5]))

    # 防止以「風格 × 動畫」笛卡兒積灌水；變體應收在單一條目的 variants。
    generated = [loc for _, loc, item in rows if item.get("kind") == "recipe" and "・" in item["name"]]
    if generated:
        warnings.append(
            f"{len(generated)} 筆配方名稱疑似排列組合產物，請改用 variants："
            + "、".join(generated[:5])
        )

    # 新條目必須附 released／updated（見 schema anyOf）；既有缺日期條目由
    # tools/backfill_dates.py 分批回補，回補完成前此檢查不進 strict。
    missing_dates = [
        loc for _, loc, item in rows if not (item.get("released") or item.get("updated"))
    ]
    if missing_dates:
        soft.append(f"{len(missing_dates)} 筆缺 released／updated（回補完成前不阻擋 strict）")

    return warnings, soft


def main() -> None:
    strict = "--strict" in sys.argv
    errors: list[str] = []
    warnings: list[str] = []
    rows: list[tuple[str, str, dict]] = []
    names: dict[str, list[str]] = collections.defaultdict(list)
    name_urls: dict[tuple[str, str], list[str]] = collections.defaultdict(list)
    aescripts_urls: dict[str, list[tuple[str, str]]] = collections.defaultdict(list)
    ids: dict[str, list[str]] = collections.defaultdict(list)
    total = 0
    stats = collections.Counter()

    data_files = sorted(glob.glob(os.path.join(DATA_DIR, "*.jsonl")))
    if not data_files:
        print("找不到 data/*.jsonl")
        raise SystemExit(1)

    for path in data_files:
        filename = os.path.basename(path)
        with open(path, encoding="utf-8") as handle:
            for line_no, raw in enumerate(handle, 1):
                if not raw.strip():
                    continue
                total += 1
                loc = f"{filename}:{line_no}"
                try:
                    item = json.loads(raw)
                except json.JSONDecodeError as exc:
                    errors.append(f"{loc} JSON 格式錯誤：{exc}")
                    continue
                if not isinstance(item, dict):
                    errors.append(f"{loc} 必須是 JSON 物件")
                    continue

                missing = [key for key in REQUIRED if key not in item]
                if missing:
                    errors.append(f"{loc} 缺少欄位：{', '.join(missing)}")
                unknown = sorted(set(item) - ALLOWED)
                if unknown:
                    errors.append(f"{loc} 未知欄位：{', '.join(unknown)}")

                name = item.get("name")
                if not isinstance(name, str) or not name.strip():
                    errors.append(f"{loc} name 必須是非空字串")
                else:
                    names[name.strip().casefold()].append(loc)

                stable_id = item.get("id")
                if stable_id is not None:
                    if not isinstance(stable_id, str) or not ID_PATTERN.fullmatch(stable_id):
                        errors.append(f"{loc} id 必須是 3–64 字元的小寫英數與連字號")
                    else:
                        ids[stable_id].append(loc)

                kind = item.get("kind")
                if kind not in KNOWN_KINDS:
                    errors.append(f"{loc} kind 必須是 plugin/script/builtin/recipe")

                cat = item.get("cat")
                if not isinstance(cat, str) or cat not in KNOWN_CATS:
                    errors.append(f"{loc} 未知分類：{cat!r}")

                tags = item.get("tags")
                if not isinstance(tags, list) or not all(isinstance(tag, str) and tag.strip() for tag in tags):
                    errors.append(f"{loc} tags 必須是非空字串陣列")
                elif len(tags) < 5:
                    errors.append(f"{loc} tags 至少需要 5 個，目前 {len(tags)} 個")
                elif len({tag.strip().casefold() for tag in tags}) != len(tags):
                    errors.append(f"{loc} tags 含有重複詞（不分大小寫）")

                desc = item.get("desc")
                if not isinstance(desc, str) or not desc.strip():
                    errors.append(f"{loc} desc 必須是非空字串")
                elif len(desc.strip()) < 18:
                    errors.append(f"{loc} desc 至少需 18 字，並說明功能與典型用途")
                elif DISCONTINUED.search(desc):
                    errors.append(f"{loc} desc 顯示產品已停售／下架，不應收錄")

                url = item.get("url")
                if not valid_url(url):
                    errors.append(f"{loc} url 必須是完整的 http(s) 官方連結")
                elif isinstance(name, str) and name.strip():
                    normalized_url = canonical_url(url)
                    normalized_name = name.strip().casefold()
                    name_urls[(normalized_name, normalized_url)].append(loc)
                    if urlparse(normalized_url).netloc in {"aescripts.com", "www.aescripts.com"}:
                        aescripts_urls[normalized_url].append((loc, normalized_name))
                if "variants" in item and not isinstance(item["variants"], dict):
                    errors.append(f"{loc} variants 必須是物件")
                if "stack" in item and not isinstance(item["stack"], list):
                    errors.append(f"{loc} stack 必須是陣列")
                if "unverified" in item and not isinstance(item["unverified"], bool):
                    errors.append(f"{loc} unverified 必須是 true/false")
                for field in ("desc_en", "desc_ja", "look_en", "look_ja"):
                    if field in item and (not isinstance(item[field], str) or not item[field].strip()):
                        errors.append(f"{loc} {field} 必須是非空字串")

                released = parse_date(item.get("released")) if "released" in item else None
                updated = parse_date(item.get("updated")) if "updated" in item else None
                if "released" in item and released is None:
                    errors.append(f"{loc} released 必須是 YYYY-MM-DD")
                if "updated" in item and updated is None:
                    errors.append(f"{loc} updated 必須是 YYYY-MM-DD")
                if (released or updated) and not valid_url(item.get("date_url")):
                    errors.append(f"{loc} 有日期時必須提供可查證的官方 date_url")
                if released and updated and updated < released:
                    errors.append(f"{loc} updated 不得早於 released")
                today = dt.date.today()
                if released and released > today:
                    errors.append(f"{loc} released 不得晚於今天")
                if updated and updated > today:
                    errors.append(f"{loc} updated 不得晚於今天")

                # 檔案即是資料分區，避免前端來源與型態互相矛盾。
                if kind == "builtin" and filename != "builtin-ae.jsonl":
                    errors.append(f"{loc} builtin 條目必須放在 builtin-ae.jsonl")
                if kind == "recipe" and filename != "recipes.jsonl":
                    errors.append(f"{loc} recipe 條目必須放在 recipes.jsonl")
                if filename == "builtin-ae.jsonl" and kind != "builtin":
                    errors.append(f"{loc} builtin-ae.jsonl 只能包含 builtin")
                if filename == "recipes.jsonl" and kind != "recipe":
                    errors.append(f"{loc} recipes.jsonl 只能包含 recipe")

                rows.append((filename, loc, item))
                stats[kind] += 1
                stats["url"] += bool(item.get("url"))

    for normalized, locs in names.items():
        if len(locs) > 1:
            per_file = collections.Counter(loc.split(":", 1)[0] for loc in locs)
            if any(count > 1 for count in per_file.values()):
                errors.append(f"同一資料檔重複名稱 {normalized!r}：{', '.join(locs)}")

    for stable_id, locs in ids.items():
        if len(locs) > 1:
            errors.append(f"穩定 id 重複 {stable_id!r}：{', '.join(locs)}")

    for (normalized_name, normalized_url), locs in name_urls.items():
        source_files = {loc.split(":", 1)[0] for loc in locs}
        if len(locs) > 1 and len(source_files) > 1:
            errors.append(
                f"跨資料檔重複產品 {normalized_name!r}（{normalized_url}）：{', '.join(locs)}"
            )

    for normalized_url, entries in aescripts_urls.items():
        distinct_names = {name for _, name in entries}
        if len(distinct_names) > 1:
            errors.append(
                f"同一 aescripts 商品頁對應多個名稱（{normalized_url}）："
                + ", ".join(loc for loc, _ in entries)
            )

    warnings, soft = quality_checks(rows)
    if strict and warnings:
        errors.extend(warnings)
        warnings = []

    print(f"檢查 {total} 筆 / {len(data_files)} 個資料檔")
    for warning in warnings:
        print("  ⚠ " + warning)
    for note in soft:
        print("  ℹ " + note)
    for error in errors:
        print("  ✗ " + error)

    if errors:
        print(f"\n失敗：{len(errors)} 個錯誤、{len(warnings)} 個警告")
        raise SystemExit(1)

    print(f"\n通過：{len(warnings)} 個警告" + (f"、{len(soft)} 條回補待辦" if soft else ""))
    print(
        "   型態："
        f"外掛 {stats['plugin']} / 腳本 {stats['script']} / "
        f"內建 {stats['builtin']} / 配方 {stats['recipe']}；"
        f"官方連結 {stats['url']}/{total}"
    )


if __name__ == "__main__":
    main()
