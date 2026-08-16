#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
BOOTH.pm 候選掃描器：找出「還沒收錄、也還沒判定略過」的 After Effects 商品。

用法：
    python tools/scan_booth.py                 # 掃前 3 頁（預設），列出待評估商品
    python tools/scan_booth.py --pages 5 --limit 30

資料來源：https://booth.pm/ja/search/After%20Effects （每頁約 60 個商品 id）
判定邏輯：
    搜尋結果 item id  −  已收錄（data/*.jsonl 的 booth.pm/ja/items/<id>）  −  已略過（curation/skipped.tsv 的 booth-<id>）
"""
import json, re, os, sys, glob, argparse, time, urllib.request

try:
    sys.stdout.reconfigure(encoding="utf-8")
except Exception:
    pass

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
SKIPPED = os.path.join(ROOT, "curation", "skipped.tsv")
SEARCH = "https://booth.pm/ja/search/After%20Effects"
UA = "Mozilla/5.0 (Windows NT 10.0; Win64; x64)"

ITEM_RE = re.compile(r"/ja/items/(\d+)")


def fetch(url):
    req = urllib.request.Request(url, headers={"User-Agent": UA})
    with urllib.request.urlopen(req, timeout=30) as r:
        return r.read().decode("utf-8", "ignore")


def covered_ids():
    out = set()
    for p in glob.glob(os.path.join(ROOT, "data", "*.jsonl")):
        for line in open(p, encoding="utf-8"):
            line = line.strip()
            if not line:
                continue
            m = re.search(r"booth\.pm/ja/items/(\d+)", json.loads(line).get("url", ""))
            if m:
                out.add(m.group(1))
    return out


def skipped_ids():
    out = set()
    if os.path.exists(SKIPPED):
        for line in open(SKIPPED, encoding="utf-8"):
            line = line.rstrip("\n")
            if not line.strip() or line.startswith("#"):
                continue
            slug = line.split("\t", 1)[0].strip()
            if slug.startswith("booth-"):
                out.add(slug[len("booth-"):])
    return out


def search_ids(pages):
    out = set()
    for page in range(1, pages + 1):
        url = SEARCH if page == 1 else f"{SEARCH}?page={page}"
        try:
            html = fetch(url)
        except Exception as e:
            print(f"  (BOOTH 第 {page} 頁抓取失敗：{e})", file=sys.stderr)
            continue
        out.update(ITEM_RE.findall(html))
        time.sleep(1)
    return out


def item_title(iid):
    try:
        html = fetch(f"https://booth.pm/ja/items/{iid}")
        m = re.search(r'<meta property="og:title" content="([^"]+)"', html)
        if m:
            return m.group(1).replace("&amp;", "&").strip()
    except Exception:
        pass
    return ""


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--pages", type=int, default=3, help="掃描搜尋頁數")
    ap.add_argument("--limit", type=int, default=30, help="最多列出的候選數")
    a = ap.parse_args()

    S = search_ids(a.pages)
    C = covered_ids()
    K = skipped_ids()
    todo = sorted(S - C - K, key=lambda x: int(x), reverse=True)
    print(f"BOOTH｜掃描 {a.pages} 頁（{len(S)} id）｜已收錄 {len(C)}｜已略過 {len(K)}｜待評估 {len(todo)}")
    for iid in todo[:a.limit]:
        title = item_title(iid)
        name = title if title else f"booth-{iid}"
        print(f"- [{name}](https://booth.pm/ja/items/{iid})")
        time.sleep(0.5)
    if len(todo) > a.limit:
        print(f"- … 還有 {len(todo) - a.limit} 個（--limit 調整）")
    if not todo:
        print("- （無新候選）")


if __name__ == "__main__":
    main()
