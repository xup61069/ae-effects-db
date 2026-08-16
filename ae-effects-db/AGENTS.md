# AGENTS.md — AI 協作者操作規範

這是 coding agent、ChatGPT、Claude、Copilot 等 AI 維護本 repo 時的主要入口。人類貢獻者看 [`CONTRIBUTING.md`](CONTRIBUTING.md)；專門做資料擴充時還要讀 [`EXPANSION.md`](EXPANSION.md)。

## 專案目標

本 repo 是 After Effects 工具的策展搜尋資料庫。`data/*.jsonl` 是唯一資料來源；每行一個 JSON 物件。網站、CLI 與 AI 索引都由這些資料產生。

搜尋主要依賴名稱、`tags`、`desc` 與 `look`，不是向量資料庫。因此新增條目的價值取決於：事實是否準確、用途是否具體，以及真人可能輸入的中英同義詞是否齊全。

正式站：<https://xup61069.github.io/ae-effects-db/>

## 開始任何工作前

1. 讀本檔；若是擴充任務，再完整讀 `EXPANSION.md`。
2. 執行 `git status -sb`，保留使用者既有改動，不要覆寫無關內容。
3. 執行 `python validate.py --strict`，確認基準狀態並取得即時總筆數。
4. 修改前先搜尋名稱、`variants`、官方 URL 與功能同義詞，不能只比對完全相同的 `name`。

不要在文件內硬編「目前總筆數」。需要即時數字時，讀 `dist/index.txt` 檔頭或執行驗證器。

## 不可妥協的收錄標準

只有同時符合以下條件才收：

- 確實能在 After Effects 使用；host 以原廠頁明列內容為準。
- 功能實用、有代表性，能解決常見需求。
- 原廠頁能確認實際功能，且官方 URL 已驗證存在。

**功能重疊不是略過的理由。** 既有條目已涵蓋的面向，只要候選功能實作不同、熱門度高（例如 BOOTH wish_lists_count 明顯領先）或品質明顯較好，仍應收錄；與既有條目功能幾乎完全相同的直接複製品才略過。**作者知名度也要納入考量**：知名作者的招牌工具即使與同類功能相近，也應收錄並以正確 vendor 可被搜尋到。

熱門度與品質的判斷順序：原廠頁功能說明具體程度、商店熱門度（BOOTH wish 數、Gumroad 評價數等）、更新維護狀況、既有條目是否真的覆蓋同樣需求。

以下不收，並把穩定 slug／識別字與具體原因追加到 `curation/skipped.tsv`：

- 純預設包、素材包、模板、LUT 包或教學；
- bundle／套裝包；應評估其中的個別工具；
- Premiere、Photoshop、Resolve、Audition、FCPX 等其他軟體專用產品；
- 官方頁沒有實際功能說明、只有廣告詞，或頁面已不存在；
- 已停售、下架或只為舊專案相容而保留的 obsolete／legacy 工具；
- 極小眾且品質平庸，或與既有條目功能幾乎完全相同的直接複製品。

第三方整理站只能當候選線索。資料、host、功能與 URL 一律回原廠確認。repo 內不得提及、引用或留下任何盜版／破解資源站連結。

### `unverified` 政策

新候選若無法從官方來源確認功能，直接略過，不得為了湊數新增 `unverified:true`。`unverified` 只保留給使用者明確要求記錄的本機檔案證據或既有歷史資料，且 `desc` 必須清楚標示推測；一旦查證或移除，立即刪除旗標。目前狀態要以 `python tools/audit.py --strict` 為準。

## 單筆資料規格

完整機器規格是 [`schema/effect.schema.json`](schema/effect.schema.json)。JSONL 必須為 UTF-8、一行一個物件、不能用陣列、不能有行尾逗號。

必填：`name`、`kind`、`cat`、`tags`、`desc`、`url`，且 `released`／`updated` 至少其一（見下表）。正式資料也必須有全域唯一的 stable `id`；舊格式交給 `tools/add.py` 產生，不要因改名而更換既有 ID。

```json
{"name":"S_Glow","suite":"Sapphire","kind":"plugin","cat":"glow","tags":["glow","bloom","發光","輝光","柔光","光暈"],"desc":"讓亮部往外柔順發光，適合霓虹、標題與高光強化。","look":"亮部往外柔和溢光","url":"https://borisfx.com/documentation/sapphire/ae/glow/"}
```

| 欄位 | 規則 |
|---|---|
| `id` | 小寫 URL-safe slug、全域唯一且永久穩定；既有 ID 不因名稱或分類變更而重建 |
| `name` | 使用原廠正式拼法；Sapphire 保留 `S_`，Continuum 保留 `BCC`／`BCC+` |
| `kind` | `plugin` 原生外掛／Effect、`script` ScriptUI／CEP／UXP 面板或腳本、`builtin` AE 內建、`recipe` 效果配方 |
| `cat` | 只用 schema／`validate.py` 已存在的分類；不要自行發明近義分類 |
| `tags` | 中英混合至少 5 個；含英文名、中文名、俗名、外觀與用途，至少 3 個不能只是分類名 |
| `desc` | 繁體中文一句話，必須同時回答「做什麼」與「典型用途」 |
| `look` | 建議填寫可見外觀，不重複 `desc` |
| `desc_en`／`desc_ja`／`look_en`／`look_ja` | 選填的英／日文翻譯；逐筆人工審核，不得塞未審核的機器翻譯。英文、日文介面有對應語系時顯示它，缺漏時回退顯示中文並標「原文」 |
| `url` | 原廠產品／效果頁；必須實際得到 HTTP 200 或出現在原廠索引，不能猜 slug |
| `released`／`updated` | 必填（至少其一）：只填原廠可證明的 `YYYY-MM-DD` 日期，並同時填直接支持日期的 `date_url`。新條目由 `tools/add.py` 強制；既有缺日期條目由 `tools/backfill_dates.py` 分批回補，完成前驗證器僅列為回補待辦、不阻擋 strict |
| `variants` | 只用於功能高度相近、同頁說明的同族變體；判重時必須一起搜尋 |
| `stack`／`builtin` | 僅 `recipe` 使用，分別描述外掛堆疊與純內建替代流程 |

### 禁止套版

把效果名遮掉後，`desc` 仍應讓人分辨它的功能；移除效果名後，`tags` 也不能與同系列其他條目完全相同。

```jsonc
// 不合格：只有名稱不同
{"name":"BCC+ DeFog","desc":"提供 BCC+ DeFog 的調色控制，適合影像風格調整。","tags":["BCC+ DeFog","調色","After Effects","Boris FX","Continuum"]}

// 合格：功能與搜尋語彙具體
{"name":"BCC+ DeFog","desc":"移除霧霾與灰濛感，拉回遠景對比與飽和度，適合修復陰天或空拍素材。","tags":["BCC+ DeFog","defog","dehaze","去霧","除霾","灰濛","對比還原","空拍","遠景"]}
```

## 資料檔分工

| 檔案 | 內容 |
|---|---|
| `red-giant.jsonl` | Trapcode、Magic Bullet、VFX Suite |
| `universe.jsonl` | Maxon Universe |
| `sapphire.jsonl` | Boris FX Sapphire |
| `continuum.jsonl` | Boris FX Continuum |
| `builtin-ae.jsonl` | Adobe AE 內建效果／工具與 CycoreFX |
| `aescripts.jsonl` | aescripts 市集產品 |
| `third-party.jsonl` | 其他有獨立原廠頁的廠商 |
| `booth.jsonl` | BOOTH.pm（日本同人商店）工具；判重時連同日文原名與作者名一起搜，同名產品很多 |
| `gumroad.jsonl` | Gumroad 上架的獨立工具；判重時連同作者名一起搜 |
| `installed.jsonl` | 從本機安裝證據辨識、又無法歸入前述產品線的工具 |
| `recipes.jsonl` | 畫面感與效果堆疊配方 |

請先用 `python tools/add.py batch.jsonl --dry` 預檢，再以 `python tools/add.py batch.jsonl` 匯入，讓工具負責 schema 檢查、判重與選檔。同名不一定等於重複：不同 `kind`、不同原廠 URL 的正式同名效果可以共存；同 kind 或同官方 URL 才是產品碰撞。

## 搜尋同義關鍵字（ALIASES）

搜尋採可解釋的字串權重，不是向量語意搜尋。跨 Python／JavaScript 的正規化與同義詞集中在 `curation/search.json`；日文策展詞位於 `curation/search-aliases.ja.json`。兩端只載入共用設定，不得各自複製常數。

例如「講話」群組涵蓋 語音／voice／speech／配音／旁白／口白／朗讀 等，所以查「講話」能找到叫「語音」的工具。

- 發現「查某個詞找不到已知工具」（例：查「講話」找不到語音工具）時，是別名群組缺詞，把該詞加進共用設定，而不是只補單筆 `tags`。
- 別名只放「幾乎可互換」的詞；近義但用途不同的詞不要硬塞進同一群組，避免搜尋噪音。
- 寫 `tags` 仍要用該工具真實的用語，別名負責補齊其它說法。

## 略過名單重審

`curation/skipped.tsv` 是決策記憶，不是永久判決。每次擴充前先掃描一遍。

對先前因「與既有條目重疊」略過的候選，以熱門度（BOOTH `wish_lists_count`、Gumroad 評價數等）與作者知名度重審：熱門度明顯領先同類、品質較好，或知名作者（如 Nisai）的招牌工具 → 收錄，並從 `skipped.tsv` 移除該行、批次記錄寫進 `EXPANSION.md`。

## 產生檔與策展設定

- `dist/all.jsonl`、`dist/index.txt`、`dist/web-index.json` 與 `dist/web/**` 由 `python tools/build_index.py` 產生，不直接手改。
- `curation/skipped.tsv` 是不收錄的決策記憶；理由要具體到日後不必重查。
- `curation/popularity.json` 定義網站預設的可解釋熱門排序；它不是銷量榜。
- `curation/localization.json` 只放實際驗證過的官方在地化頁與 Adobe 官方分類；不要自行翻譯產品名或猜 locale URL。
- `curation/search-aliases.ja.json` 是人工審查過的日文搜尋別名。
- `curation/audit.json` 只列根網址本身就是單一產品頁的已驗證例外；新增值必須仍對應現有資料，不能拿來略過泛用公司首頁。
- 前端與資料版本由 `dist/web/asset-manifest.json` 的內容雜湊自動產生；不要手動維護版本號。

## 完成前檢查

依序執行：

```bash
python validate.py --strict
python tools/audit.py --strict
python tools/classify_kind.py
python -m unittest discover -s tests -v
node tests/check_web_js.js
npm run test:e2e                    # 網站／PWA 變更時必跑
node tools/build_localization.js --check   # 只有多語／官方網址相關變更時必跑
python tools/build_index.py
git diff --check
```

要求：

- validate 0 warnings；
- audit 所有阻擋項目為 0；
- `classify_kind.py` 不應提出未處理的型態修正；
- 產生索引後 `git diff --check` 通過；
- 涉及網站時，至少用中文、英文、日文與同名跨來源案例做本機瀏覽器測試；
- 推送後等待 GitHub validate、build-index、Pages，並從正式站抓取最新索引確認。

## Git 與修改安全

- 保留工作樹內不屬於本任務的改動；工作樹混雜時只 stage 本次檔案。
- 精準修改需要的行，不為單筆資料重排整個 JSONL。
- 不使用破壞性 reset／checkout 清掉別人的工作。
- 提交身分與共同作者依當次使用者要求，不自行冒用貢獻者。
- 每次提交聚焦一個可說明、可驗證的主題。

## 合併 fork／舊分支的坑

合併他人的 fork 或停滯分支（2026-08 實際踩過）：

- **先確認分支有沒有獨有 commit**：`git rev-list --count origin/main..<branch>`。fork 的 main 常只是落後上游，數十個功能分支也可能早已全被上游吸收，白合併一輪。
- **平行擴充大量重複**：fork 與上游同時做資料擴充時，diff 顯示「+318 行」不代表有 318 筆新資料。實測 789 筆 fork 條目裡 770 筆與上游重複、1 筆已停售，實際新增為 0。合併前先以 URL／name 比對，別被行數騙。
- **JSONL 判重要看 URL，不只看 name**：同一產品在兩邊拼法略異（大小寫、版本尾碼）時，只比 name 會漏，`python validate.py --strict` 會抓出重複官方 URL。同時也要比對 base：上游已汰除的條目（如 `installed.jsonl` 被清理 74→40）不能從舊分支復活。
- **`curation/skipped.tsv` 是嚴格按 slug 排序的聯集檔**：衝突解法是兩邊取聯集再排序；但純聯集會復活「上游已收錄」的過時略過記錄，解完必須拿 `data/*.jsonl` 的 `name`（含 `variants`）交叉掃一次，把已被收錄的 slug 刪掉。
- **`dist/` 是產生檔，永遠不手解衝突**：衝突時任取一邊（`git checkout --ours -- dist/...`），合併完跑 `python tools/build_index.py` 重產生即可。
- **解析衝突標記容易 off-by-one**：用 `git show :2:<path>`（ours）／`:3:`（theirs）／`:1:`（base）拿乾淨 stage 內容，比手切 `<<<<<<<` 區塊可靠。
- **fork 條目本身可能是壞的**：遇過 JSON 中文截斷、缺 `kind` 欄位的條目。合併後務必 `python validate.py --strict`，並抽查新條目的官方頁（查證後發現已停售就按標準記入 `skipped.tsv`，不進資料庫）。
- **Windows PowerShell 終端的中文全是亂碼**：git／python 的 stdout 顯示 `�` 只是顯示問題，檔案是完好的 UTF-8，不要因為亂碼去「修」檔案。寫檔用 `[System.IO.File]::WriteAllLines($path, $lines, [System.Text.UTF8Encoding]::new($false))` 保持無 BOM；PowerShell 5.1 的 `Set-Content -Encoding UTF8` 會加 BOM，不要用。
- **PowerShell 沒有 heredoc**：`python - <<'EOF'` 在 PowerShell 會直接語法錯誤；含中文的多行 `python -c` 引號也很脆。腳本寫到暫存檔再執行。
