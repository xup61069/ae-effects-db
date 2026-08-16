#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
找出 aescripts 上「還沒收錄、也還沒被判定略過」的產品，給擴充作業當待辦清單。

用法：
    python tools/find_new.py                 # 列出候選 slug（預設 40 個）
    python tools/find_new.py --limit 100
    python tools/find_new.py --desc          # 同時抓官方說明（較慢，建議搭配 --limit）
    python tools/find_new.py --refresh       # 重新下載 sitemap（預設用快取）

資料來源：https://aescripts.com/media/sitemap/sitemap.xml
（主站 /sitemap.xml 被 Cloudflare 擋，這支可以）

判定邏輯：
  sitemap 全部 slug  −  已收錄（data/*.jsonl 的 aescripts url）  −  已略過（curation/skipped.tsv）
"""
import json, re, os, sys, glob, argparse, urllib.request

try:
    sys.stdout.reconfigure(encoding="utf-8")
except Exception:
    pass

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
CACHE = os.path.join(ROOT, "tools", ".sitemap_cache.xml")
SKIPPED = os.path.join(ROOT, "curation", "skipped.tsv")
SITEMAP = "https://aescripts.com/media/sitemap/sitemap.xml"
UA = "Mozilla/5.0 (Windows NT 10.0; Win64; x64)"

NON_PRODUCT = {
    "after-effects","premiere-pro","photoshop","final-cut-pro-x","maya","nuke","illustrator",
    "stand-alone-applications","adobe-media-encoder","houdini","davinci-resolve","audition",
    "blender","cavalry","other","indesign","figma","authors","aescripts","bundles","gift-card",
    "learn","knowledgebase","forums","about","contact","faq","checkout","customer","catalog",
    "terms","privacy","refund","sitemap","account","cart","wishlist","search","reviews","news",
    "affiliate","support","downloads","products","privacy-policy","privacy-policy-cookie-restriction-mode",
}

def fetch(url):
    req = urllib.request.Request(url, headers={"User-Agent": UA})
    with urllib.request.urlopen(req, timeout=60) as r:
        return r.read().decode("utf-8", "ignore")

def sitemap_slugs(refresh=False):
    if refresh or not os.path.exists(CACHE):
        xml = fetch(SITEMAP)
        os.makedirs(os.path.dirname(CACHE), exist_ok=True)
        open(CACHE, "w", encoding="utf-8").write(xml)
    else:
        xml = open(CACHE, encoding="utf-8").read()
    out = set()
    for m in re.finditer(r"<loc>https://aescripts\.com/([a-z0-9][a-z0-9\-]*)/</loc>", xml):
        s = m.group(1)
        if s not in NON_PRODUCT and not s.endswith("-bundle") and "bundle" not in s:
            out.add(s)
    return out

def covered_slugs():
    out = set()
    for p in glob.glob(os.path.join(ROOT, "data", "*.jsonl")):
        for line in open(p, encoding="utf-8"):
            line = line.strip()
            if not line:
                continue
            m = re.match(r"https://aescripts\.com/([a-z0-9\-]+)/", json.loads(line).get("url", ""))
            if m:
                out.add(m.group(1))
    return out

def skipped_slugs():
    out = {}
    if os.path.exists(SKIPPED):
        for line in open(SKIPPED, encoding="utf-8"):
            line = line.rstrip("\n")
            if not line.strip() or line.startswith("#"):
                continue
            parts = line.split("\t")
            out[parts[0].strip()] = parts[1].strip() if len(parts) > 1 else ""
    return out

def meta_desc(slug):
    try:
        html = fetch(f"https://aescripts.com/{slug}/")
        m = re.search(r'<meta name="description" content="([^"]{15,400})"', html)
        return (m.group(1) if m else "").replace("&#039;", "'").replace("&amp;", "&")
    except Exception as e:
        return f"(抓取失敗: {e})"

def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--limit", type=int, default=40)
    ap.add_argument("--desc", action="store_true", help="同時抓官方說明")
    ap.add_argument("--refresh", action="store_true", help="重新下載 sitemap")
    a = ap.parse_args()

    S, C, K = sitemap_slugs(a.refresh), covered_slugs(), skipped_slugs()
    todo = sorted(S - C - set(K))
    print(f"sitemap 產品 {len(S)}｜已收錄 {len(C)}｜已略過 {len(K)}｜待評估 {len(todo)}\n")
    for s in todo[:a.limit]:
        if a.desc:
            print(f"[{s}]\n  {meta_desc(s)}\n  https://aescripts.com/{s}/\n")
        else:
            print(f"{s}\thttps://aescripts.com/{s}/")
    if len(todo) > a.limit:
        print(f"\n… 還有 {len(todo)-a.limit} 個，用 --limit 調整")
    print("\n收錄 → python tools/add.py <檔案.jsonl>；略過 → 寫進 curation/skipped.tsv")

if __name__ == "__main__":
    main()
