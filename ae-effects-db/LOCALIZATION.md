# 多語系與官方翻譯政策

網站的多語內容分成三層，避免把本站翻譯誤標成原廠翻譯：

1. **產品名稱**：保留原廠正式拼法，不翻譯商標或自行改名。
2. **介面與搜尋分類**：繁中、英文、日文由本站維護；42 種 `cat` 是方便搜尋的功能分類，不等同 Adobe、Boris FX、Maxon 或其他原廠的效果選單。
3. **效果說明與外觀**：以人工整理的繁體中文為準。條目可另附 `desc_en`／`desc_ja`／`look_en`／`look_ja`（逐筆審核的翻譯）；英文、日文介面有該語系翻譯時就顯示翻譯，缺漏時回退顯示繁體中文原文並標註「原文」，避免把未審核的機器翻譯當成正式翻譯。翻譯是分批補齊的，不會一次全站完成。

AE 內建效果會依 Adobe 最新效果清單中的效果名稱，另外顯示 **Adobe 官方分類**。目前 280 筆內建資料中，278 筆效果已精確對應；其餘 `Smart Mask Interpolation` 與 `Time-Reverse Keyframes` 是面板工具／指令，不是效果選單項目，因此明確排除。日文介面採用 Adobe 日文文件中的 22 組分類名稱，例如「ブラー＆シャープ」、「カラー補正」與「ディストーション」。

## 官方在地化網址

`curation/localization.json` 只收錄實際驗證過的原廠在地化頁。產生器會檢查：

- HTTP 回應成功；
- 最終網址仍在相同原廠網域；
- HTML 語系是日文，且頁面有足夠日文內容；
- 若有轉址，只接受同檔名的原廠 canonical 文件轉址，或經人工確認的 Adobe 改名文件；不接受首頁或語意不同的文件。

截至 2026-08-13，共驗證 116 個不重複的 Adobe／Maxon 日文官方網址，涵蓋資料庫 435 筆條目。Adobe 目前提供的日文「Matte Effects」頁會回傳 HTTP 404，因此相關 5 筆資料暫時沿用英文官方網址；其他沒有通過的頁面也一律沿用資料列原本的官方網址，不在瀏覽器執行時猜測語系路徑。

## 日文搜尋詞庫

`curation/search-aliases.ja.json` 收錄人工審查過的日文用途詞、效果俗稱與常見寫法，載入後會併入既有中英文搜尋別名。固定查詢案例會在測試中檢查實際命中結果，避免只增加詞彙卻找不到合理產品。

重新產生與即時複查：

```bash
node tools/build_localization.js --write
node tools/build_localization.js --check
```

## 主要官方依據

- [Adobe After Effects 效果清單（日文）](https://helpx.adobe.com/jp/after-effects/desktop/apply-effects-and-animation-presets/effects-and-animation-presets/effect-list.html)
- [Adobe After Effects effect list（英文）](https://helpx.adobe.com/after-effects/desktop/apply-effects-and-animation-presets/effects-and-animation-presets/effect-list.html)
- [Adobe After Effects 支援語言](https://helpx.adobe.com/jp/after-effects/system-requirements/2024.html)
- [Maxon Red Giant（日文）](https://www.maxon.net/ja/red-giant)
