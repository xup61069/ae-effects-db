#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""分批回補 data/*.jsonl 缺少 released／updated 的官方日期。

只寫入能從原廠頁直接讀到的日期，找不到就略過，絕不推測或編造。
回補完成前，validate.py 把缺日期列為「回補待辦」、不阻擋 strict。

用法：
    python tools/backfill_dates.py --source booth --dry      # 預覽
    python tools/backfill_dates.py --source booth --limit 100
    python tools/backfill_dates.py --source booth --file booth

來源實作：
    booth     商品 .json 的 published_at＝released（初版公開日）；
              商品頁「更新履歴」區塊的最晚日期＝updated；無更新履歴就不填 updated。
              date_url＝商品頁本身。
    aescripts 商品頁「版本歷史」區塊；updated＝最新版本日期、released＝最早可見版本日期，
              date_url＝商品頁本身。
    gumroad   Gumroad 商品頁（預留，尚未實作）
"""

from __future__ import annotations

import argparse
import glob
import json
import os
import re
import sys
import time
import urllib.request

try:
    from tools.add import canonical_url
except ModuleNotFoundError:  # python tools/backfill_dates.py
    from add import canonical_url

try:
    sys.stdout.reconfigure(encoding="utf-8")
except Exception:
    pass

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
DATA = os.path.join(ROOT, "data")
UA = "Mozilla/5.0 (Windows NT 10.0; Win64; x64)"
SLEEP = 0.6

BOOTH_RE = re.compile(r"booth\.pm/ja/items/(\d+)")
HISTORY_RE = re.compile(r"更新履歴</h2>\s*<p[^>]*>(.*?)</p>", re.S)
DATE_RE = re.compile(r"(\d{4})/(\d{1,2})/(\d{1,2})")
AE_VERSION_RE = re.compile(
    r'<p class="version-history-date inline">\s*([A-Za-z]{3} \d{1,2}, \d{4})\s*</p>'
)
AE_DATE_FMT = "%b %d, %Y"


def fetch(url: str) -> str:
    req = urllib.request.Request(url, headers={"User-Agent": UA, "Accept-Encoding": "gzip"})
    with urllib.request.urlopen(req, timeout=30) as response:
        body = response.read()
        if response.headers.get("Content-Encoding") == "gzip":
            import gzip

            body = gzip.decompress(body)
        return body.decode("utf-8", "ignore")


def booth_dates(item_id: str) -> dict[str, str]:
    """BOOTH：released 取 .json 的 published_at；updated 取更新履歴最晚日期。"""
    payload = json.loads(fetch(f"https://booth.pm/ja/items/{item_id}.json"))
    published = str(payload.get("published_at", ""))[:10]
    if not re.fullmatch(r"\d{4}-\d{2}-\d{2}", published or ""):
        raise ValueError(f"published_at 格式異常：{payload.get('published_at')!r}")
    html = fetch(f"https://booth.pm/ja/items/{item_id}")
    dates: dict[str, str] = {"released": published}
    match = HISTORY_RE.search(html)
    if match:
        history = [
            f"{int(year):04d}-{int(month):02d}-{int(day):02d}"
            for year, month, day in DATE_RE.findall(match.group(1))
        ]
        if history:
            dates["updated"] = max(history)
    if dates.get("updated") and dates["updated"] < dates["released"]:
        # 更新履歴的日期（當地時間）可能比 .json 的 published_at（ISO）早一天
        # 或資料異常；早於 released 的 updated 不可信，直接不填。
        dates.pop("updated")
    return dates


def aescripts_dates(html: str) -> dict[str, str] | None:
    """aescripts：版本歷史區塊的日期。updated＝最新版本日期、released＝最早可見版本日期。"""
    import datetime as dt

    dates = []
    for month_name in AE_VERSION_RE.findall(html):
        try:
            dates.append(dt.datetime.strptime(month_name, AE_DATE_FMT).date().isoformat())
        except ValueError:
            continue
    if not dates:
        return None
    return {"released": min(dates), "updated": max(dates)}


def collect_entries(source: str, file_filter: str | None) -> list[tuple[str, int, dict, str]]:
    """回傳 (檔案路徑, 行號(0 起), 條目, 來源 url) 的缺少日期清單。"""
    out = []
    for path in sorted(glob.glob(os.path.join(DATA, "*.jsonl"))):
        if file_filter and os.path.basename(path) != file_filter + ".jsonl":
            continue
        with open(path, encoding="utf-8") as handle:
            for line_no, raw in enumerate(handle):
                if not raw.strip():
                    continue
                item = json.loads(raw)
                if item.get("released") or item.get("updated"):
                    continue
                url = str(item.get("url", ""))
                if source == "booth" and not BOOTH_RE.search(url):
                    continue
                if source == "aescripts" and "aescripts.com" not in url:
                    continue
                out.append((path, line_no, item, url))
    return out


def main() -> None:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--source", choices=["booth", "aescripts", "gumroad"], default="booth")
    parser.add_argument("--limit", type=int, default=0, help="最多處理幾筆（0＝全部）")
    parser.add_argument("--file", help="只處理指定資料檔（例：booth）")
    parser.add_argument("--dry", action="store_true", help="只預覽，不寫入")
    args = parser.parse_args()

    if args.source == "booth":
        parse = lambda url: booth_dates(BOOTH_RE.search(url).group(1))
        label = lambda item: f"發行 {item['released']}" + (f"・更新 {item['updated']}" if item.get("updated") else "")
    elif args.source == "aescripts":
        parse = lambda url: aescripts_dates(fetch(url))
        label = lambda item: f"發行 {item['released']}・更新 {item['updated']}"
    else:
        print(f"--source {args.source} 尚未實作；目前只有 booth、aescripts")
        raise SystemExit(1)

    entries = collect_entries(args.source, args.file)
    if args.limit:
        entries = entries[: args.limit]
    print(f"{args.source}｜待回補 {len(entries)} 筆" + ("（預覽）" if args.dry else ""))

    updated: list[str] = []
    skipped: list[str] = []
    failed: list[str] = []
    by_file: dict[str, dict[int, dict]] = {}

    for index, (path, line_no, item, url) in enumerate(entries, 1):
        name = item.get("name", "?")
        try:
            dates = parse(url)
        except Exception as exc:
            failed.append(f"{name}（抓取失敗：{exc}）")
            continue
        if not dates:
            skipped.append(f"{name}（頁面無版本／更新日期）")
            continue
        item["released"] = dates["released"]
        item["date_url"] = canonical_url(url)
        if dates.get("updated"):
            item["updated"] = dates["updated"]
        by_file.setdefault(path, {})[line_no] = item
        updated.append(f"{name} → {label(item)}")
        print(f"  [{index}/{len(entries)}] ✓ {name} → {label(item)}")
        if not args.dry:
            time.sleep(SLEEP)

    print(f"\n回填 {len(updated)} 筆、略過 {len(skipped)} 筆、失敗 {len(failed)} 筆")
    for line in skipped[:5]:
        print("  ↷ 略過 " + line)
    if len(skipped) > 5:
        print(f"  … 還有 {len(skipped) - 5} 筆略過")
    for line in failed[:5]:
        print("  ✗ " + line)

    if args.dry or not updated:
        return

    for path, lines in by_file.items():
        with open(path, encoding="utf-8") as handle:
            raw_lines = handle.readlines()
        for line_no, item in lines.items():
            raw_lines[line_no] = json.dumps(item, ensure_ascii=False) + "\n"
        with open(path, "w", encoding="utf-8", newline="") as handle:
            handle.writelines(raw_lines)
        print(f"已寫入 {os.path.basename(path)}（{len(lines)} 筆）")

    print("\n完成：請執行 python validate.py --strict 確認")


if __name__ == "__main__":
    main()