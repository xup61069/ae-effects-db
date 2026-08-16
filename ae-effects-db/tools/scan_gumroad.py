#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
Gumroad 候選掃描器：找出「還沒收錄、也還沒判定略過」的 After Effects 商品。

用法：
    python tools/scan_gumroad.py                 # 掃前 3 頁（每頁 9 筆）
    python tools/scan_gumroad.py --pages 5 --limit 30

資料來源：https://gumroad.com/products/search?query=after+effects&sort=newest
判定邏輯：
    搜尋結果 permalink  −  已收錄（data/*.jsonl 的 gumroad url /l/<slug>）  −  已略過（curation/skipped.tsv 的 gumroad-<slug>）
注意：Gumroad 的 permalink 可能與資料庫存的 /l/<slug> 拼法不同，候選清單僅供人工核實。
"""
import json, os, sys, glob, argparse, time, urllib.request

try:
    sys.stdout.reconfigure(encoding="utf-8")
except Exception:
    pass

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
SKIPPED = os.path.join(ROOT, "curation", "skipped.tsv")
BASE = "https://gumroad.com/products/search?query=after+effects&sort=newest&from={}"
UA = "Mozilla/5.0 (Windows NT 10.0; Win64; x64)"
PAGE_SIZE = 9


def fetch(url):
    req = urllib.request.Request(url, headers={"User-Agent": UA})
    with urllib.request.urlopen(req, timeout=30) as r:
        return json.loads(r.read().decode("utf-8", "ignore"))


def known_slugs():
    out = set()
    for p in glob.glob(os.path.join(ROOT, "data", "*.jsonl")):
        for line in open(p, encoding="utf-8"):
            line = line.strip()
            if not line:
                continue
            m = re_lslug(json.loads(line).get("url", ""))
            if m:
                out.add(m.lower())
    if os.path.exists(SKIPPED):
        for line in open(SKIPPED, encoding="utf-8"):
            line = line.rstrip("\n")
            if not line.strip() or line.startswith("#"):
                continue
            slug = line.split("\t", 1)[0].strip()
            if slug.startswith("gumroad-"):
                out.add(slug[len("gumroad-"):].lower())
    return out


def re_lslug(url):
    import re
    m = re.search(r"gumroad\.com/l/([A-Za-z0-9\-]+)", url)
    return m.group(1) if m else None


def product_url(permalink, seller):
    base = seller.get("profile_url", "")
    if base:
        import re
        m = re.match(r"https?://([^/?#]+)", base)
        if m:
            return f"https://{m.group(1)}/l/{permalink}"
    return f"https://gumroad.com/l/{permalink}"


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--pages", type=int, default=3, help="掃描頁數（每頁 9 筆）")
    ap.add_argument("--limit", type=int, default=30, help="最多列出的候選數")
    a = ap.parse_args()

    K = known_slugs()
    seen = 0
    todo = []
    for page in range(a.pages):
        try:
            d = fetch(BASE.format(page * PAGE_SIZE))
        except Exception as e:
            print(f"  (Gumroad 第 {page + 1} 頁抓取失敗：{e})", file=sys.stderr)
            continue
        for p in d.get("products", []):
            seen += 1
            permalink = (p.get("permalink") or "").lower()
            if not permalink or permalink in K:
                continue
            todo.append(p)
        time.sleep(1)

    print(f"Gumroad｜掃描 {a.pages} 頁（{seen} 筆）｜已知 slug {len(K)}｜待評估 {len(todo)}")
    for p in todo[:a.limit]:
        permalink = p.get("permalink", "")
        name = p.get("name", "")
        seller = (p.get("seller") or {}).get("name", "")
        rating = (p.get("ratings") or {}).get("count", 0)
        price = p.get("price_cents")
        price_s = f"${price / 100:.2f}" if isinstance(price, int) else "?"
        url = product_url(permalink, p.get("seller") or {})
        print(f"- {name}（{seller}）★{rating} · {price_s} · <{url}>")
    if len(todo) > a.limit:
        print(f"- … 還有 {len(todo) - a.limit} 個（--limit 調整）")
    if not todo:
        print("- （無新候選）")


if __name__ == "__main__":
    main()
