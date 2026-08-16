# 一起維護這個特效庫 🙌

歡迎補特效、修描述、加同義詞。**不用會寫程式**——你甚至可以叫 AI 幫你生一行資料，貼上來就好。

> AI 助手請先讀 [AGENTS.md](AGENTS.md)（機器可讀規格在 [schema/effect.schema.json](schema/effect.schema.json)）。

## ⚠️ 先看這個：最常見、也最需要避免的錯誤

這個庫的搜尋是**拿你打的字去比對 `tags` 的子字串**，沒有向量、沒有語意理解。
所以一筆資料有沒有價值，完全取決於 **desc 有沒有講清楚它在幹嘛**、**tags 有沒有涵蓋真人會打的字**。

### ❌ 樣板化：整批條目只有名字不同

這是目前最容易發生、也最沒有價值的貢獻方式——尤其是用 AI 一次生一整個系列的時候：

```jsonc
// ❌ 不要這樣。24 個調色效果全部套同一句話
{"name":"BCC+ DeFog", "desc":"提供「BCC+ DeFog」的調色控制，適合修正色彩、明暗與影像風格。",
 "tags":["BCC+ DeFog","Continuum Color and Tone","調色","After Effects","Boris FX"]}
```

問題在哪：
- DeFog 是**去霧**，desc 完全沒講到，讀完還是不知道它做什麼
- 搜「去霧」「除霾」→ **找不到它**
- 搜「調色」→ 一次噴出 24 筆長得一模一樣的結果，反而更難挑

```jsonc
// ✅ 這樣才有用
{"name":"BCC+ DeFog", "desc":"移除空氣中的霧霾與灰濛感，拉回遠景的對比與飽和度，救回陰天或空拍的灰片。",
 "tags":["defog","dehaze","去霧","除霾","灰濛","對比還原","空拍","遠景","Continuum"]}
```

**兩個自我檢查**，寫完各問自己一次：

1. **把效果名字遮掉**，這句 desc 還能不能分辨是哪個效果？不能就是樣板。
2. **tags 去掉效果名之後**，跟同系列其他條目長得一樣嗎？一樣就是沒補到同義詞。
   分類名（「調色」「轉場」「模糊與景深」）可以放，但**不算數**，不能拿它充數。
   每筆至少要有 3 個「別人會搜、但分類名裡沒有」的詞：俗名、外觀、用途
   （去霧／柔焦／散景／魚眼／耶穌光／灰飛煙滅／甩鏡／死白…）。

跑 `python validate.py` 會自動幫你抓這兩件事，直接告訴你哪幾筆重複套版。

### ❌ 其他常見問題

| 錯誤 | 為什麼不行 |
|---|---|
| tags 全英文 | 這是給台灣使用者用的庫，中文搜不到等於沒收 |
| desc 只寫功能名詞（「模糊工具」） | 要講**做什麼＋典型用途**，讀的人才知道該不該用它 |
| url 用 slug 規則猜出來 | 一定要實際開過確認存在；猜錯的連結比沒連結更糟 |
| 官方頁查不到具體功能仍硬寫 | 新候選直接略過並記錄原因；不要用 `unverified` 湊數 |
| 產品已停售／下架／只供舊版相容 | 資料庫不收 discontinued、obsolete 或 legacy-only 工具 |
| 收預設包／素材包／模板／LUT 包 | 這個庫收的是工具本身 |
| 收 Premiere／Resolve／FCPX 專用外掛 | 以**官方頁列出的 host** 為準，第三方網站說支援 AE 不算 |

## 來源、熱門度與略過重審

這個庫的來源與對應資料檔：

| 來源 | 放哪個檔 | 判重重點 |
|---|---|---|
| aescripts 市集 | `aescripts.jsonl` | 產品名 |
| BOOTH.pm（日本同人商店） | `booth.jsonl` | **日文原名＋作者名**（同名產品很多，光比 name 會誤判） |
| Gumroad | `gumroad.jsonl` | 產品名＋作者名 |
| 各廠商官網（Boris FX、Red Giant、RE:Vision…） | `third-party.jsonl`／各產品線檔 | 產品名 |
| AE 內建 | `builtin-ae.jsonl` | — |
| 畫面感配方 | `recipes.jsonl` | — |

**功能重疊不是略過的理由。** 兩個工具功能相似時，不要直接略過後到的；依這個順序判斷：

1. 原廠頁的功能說明是否具體；
2. 商店熱門度：BOOTH 看 wish_lists_count、Gumroad 看評價數等；
3. 是否仍在更新維護；
4. 既有條目是否真的覆蓋同樣需求——實作方式不同、用途不同、品質更好，就該收。

**知名作者的招牌工具一律收錄**（例如 Nisai、Plugin Everything 等），`vendor` 填正確作者名，讓搜作者名找得到。

略過的一定要寫進 `curation/skipped.tsv`，原因具體到日後不必重查。**略過不是永久判決**：每隔一段時間要用熱門度重新檢視之前略過的名單，值得的就收回來，並從 `skipped.tsv` 移除該行。

## 搜尋同義詞（查得到才算數）

搜尋採名稱、標籤、變體與描述的明確權重，所以「真人會怎麼打」比「官方怎麼寫」重要。跨語言同義詞統一放在 [`curation/search.json`](curation/search.json)，CLI 與網站共同載入；日文策展詞另放在 [`curation/search-aliases.ja.json`](curation/search-aliases.ja.json)。只改共用設定，不要在 Python 或 JavaScript 內另建一份。

例如「講話」的群組涵蓋 語音／voice／speech／配音／旁白／口白／朗讀 等，所以查「講話」也會找到叫「語音」的工具。

- 發現查某個詞找不到已知工具（例：查「講話」找不到語音工具）→ 不是資料缺，是別名缺詞，把詞加進共用策展設定。
- 別名只收**幾乎可互換**的詞；用途不同的近義詞不要硬塞，避免一次噴出一堆不相關結果。
- `tags` 一樣要寫真實用語，別名只是補齊其它說法。

## 最快：用 AI 幫你生一行（推薦）

把下面這段**提示詞**整段貼進 ChatGPT / Claude / 任何 AI，最後填上你要加的外掛名稱，它會吐一行可直接貼進資料庫的 JSON：

<details><summary>👉 點開複製提示詞</summary>

```
你是「AE 特效資料庫」的資料貢獻助手。我會給你一個 After Effects 外掛/特效名稱（可能附官網或說明），
請輸出「一行」可直接貼進資料庫的壓縮 JSON（JSONL 格式），並在下一行註明該放哪個資料檔。

規則：
- 只輸出一行 JSON，不要美化、不要多餘標點。
- 必填：name, kind, cat, tags, desc, url。
- kind：從 `plugin`（外掛／效果）、`script`（腳本／面板）、`builtin`（AE 內建）、`recipe`（效果配方）擇一。
- name：效果原名（Sapphire 前綴 S_、Continuum 前綴 BCC/BCC+）。
- cat：從這清單挑一個最貼切（小寫）：glow blur-glow light flare particles stylize film color blur warp
  keying tracking restore time transition text generate 3d draw paint art texture audio physics rigging
  workflow render expression animation preset utility distort mograph beauty edge emboss composite matte
  perspective kaleido vr recipe
- tags：中英混合、至少 5 個，放英文名/中文名/俗名/用途/外觀等同義詞——這是搜尋關鍵，越多越好。
  至少要有 3 個「分類名以外、真人會打的字」（俗名／外觀／用途），且必須有中文。
- desc：一句「繁體中文」，說它做什麼＋典型用途（用繁中，勿用簡中詞）。
- **禁止套版**：desc 不可以是「提供『XXX』的○○控制」這種只換名字的句型。
  自我檢查：把效果名遮掉，這句話還能不能分辨是哪個效果？不能就重寫。
  資料要來自該效果**自己的**官方說明頁，不是它所屬的分類。
- url：**必填**，官方產品頁連結（aescripts 為 https://aescripts.com/<slug>/、BOOTH 為 https://booth.pm/ja/items/<id>/、Gumroad 為 https://<author>.gumroad.com/l/<slug>/）。
- 選填：look（畫面外觀一句）、vendor（廠商/作者，BOOTH／Gumroad 必須填作者名，不確定就寫 aescripts 或 未知/免費）、suite、aex（.aex 檔名）。
- 若查不到可靠的原廠功能說明：不要輸出 JSON，改為「略過：官方頁無具體功能說明」。
- 新候選不得以 `unverified:true` 湊數；此旗標只供維護者處理使用者明確要求保留的本機檔案證據。
- **功能與既有條目重疊不是略過理由**：先看熱門度（BOOTH wish_lists_count、Gumroad 評價數）與品質，實作不同、品質較好或知名作者的招牌工具都要收。
- 要事實準確，不要編造作者或功能。

該放哪個檔：Trapcode/MagicBullet/VFX→red-giant.jsonl；Universe→universe.jsonl；Sapphire→sapphire.jsonl；
Continuum→continuum.jsonl；AE內建→builtin-ae.jsonl；aescripts市集→aescripts.jsonl；
BOOTH（booth.pm）→booth.jsonl（判重連同日文原名與作者名）；Gumroad→gumroad.jsonl（判重連同作者名）；
其他有官網的廠商→third-party.jsonl；畫面感配方→recipes.jsonl。

輸出範例：
{"name":"Deep Glow 2","vendor":"Plugin Everything","kind":"plugin","cat":"glow","tags":["glow","bloom","physical","發光","輝光","柔光","光暈","溢光"],"desc":"物理精確的高品質輝光，一鍵讓亮部自然溢光，公認最漂亮的 AE 發光外掛。","look":"亮部柔和外擴、衰減真實","url":"https://aescripts.com/deep-glow/"}
→ 放進 aescripts.jsonl

現在請處理這個外掛：<填外掛名稱或官網連結>
```

</details>

## 進階：讓 AI 巡 aescripts.com 一個一個補（需要能上網的 AI）

若你的 AI 能瀏覽網頁（Claude Code、ChatGPT 瀏覽、Perplexity 等），用下面這段讓它自動巡 aescripts.com、判斷實用性、去重、附官方連結，成批產出。

<details><summary>👉 點開複製「aescripts 批次補齊」提示詞</summary>

```
你是「AE 特效資料庫」的策展貢獻助手，任務是巡 aescripts.com 找出「還沒收錄且值得收錄」的外掛，
逐一產出可貼進 data/aescripts.jsonl 的 JSONL。

步驟：
1) 先抓已收錄清單以避免重複：讀
   https://raw.githubusercontent.com/xup61069/ae-effects-db/main/data/aescripts.jsonl
   記住裡面所有 name（也留意 third-party.jsonl / red-giant.jsonl 可能已含同名）。
2) 逐頁瀏覽 aescripts.com（建議依 https://aescripts.com/?tab=viewed 最多瀏覽、
   或 ?tab=bestselling 暢銷、或各分類），一個一個看產品。
3) 對每個產品做「收/不收」判斷：
    收錄條件（要同時成立）：
     - 尚未在已收錄清單中（名稱、variants、日文原名、作者名、官方 URL 都要比對）。
     - 功能實用、有代表性（暢銷/常被討論/解決常見需求）。
     - 原廠頁明列支援 After Effects，且能確認實際功能。
    直接略過（不要收）：
     - 已收錄（含 variants、日文原名、作者名）。
     - 純預設包/素材包/模板/LUT/教學，或 bundle，而非獨立工具。
     - 非 AE host、已停售/下架/obsolete/legacy-only，或官方頁沒有具體功能說明。
    **功能與既有條目重疊不是略過理由**：先查熱門度（BOOTH wish_lists_count、Gumroad 評價數）與品質，
    實作不同、品質較好或知名作者的招牌工具都要收，vendor 標正確作者名。
4) 決定收錄的，輸出「一行」壓縮 JSON，欄位規則：
     必填 name, kind, cat, tags, desc, url
     - kind 從 plugin / script / builtin / recipe 擇一
     - cat 從此清單挑（小寫）：glow blur-glow light flare particles stylize film color blur warp keying
       tracking restore time transition text generate 3d draw paint art texture audio physics rigging
       workflow render expression animation preset utility distort mograph beauty edge emboss composite
       matte perspective kaleido vr recipe
     - tags：中英混合≥5個，放英文名/中文名/俗名/用途/外觀同義詞（搜尋關鍵，越多越好），最後放 "aescripts"。
       其中至少 3 個必須是「分類名以外、真人會打的字」，且一定要有中文。
     - desc：一句繁體中文，做什麼＋典型用途（用繁中，勿簡中詞）。
     - **不准套版**：同一批裡不可以出現「只有名字不同」的 desc 或 tags。
       每筆都要讀該產品自己的頁面再寫；讀不到就別收，不要用分類名硬湊。
     - url：該產品在 aescripts 的官方頁 https://aescripts.com/<slug>/（務必是真實存在的頁面，不要杜撰）。
     - vendor：作者名（頁面上的 author），不確定就寫 "aescripts"。
     - 事實要準；查不到說明就別硬收。
     - 不得使用或提及盜版／破解資源站；任何候選線索都要回原廠頁查證。
5) 每產一批（例如 50 筆）就停下讓我確認，並附一句「這批略過了哪些、為什麼」。

輸出格式範例（每行一筆，後面不用箭頭，全部都放 aescripts.jsonl）：
{"name":"Foldspace","vendor":"aescripts","kind":"plugin","cat":"3d","tags":["fold","bend","warp","curve","book","彎折","翻書","摺疊","3D扭曲","aescripts"],"desc":"在3D空間彎折/翻摺平面，做翻書、摺紙、曲面扭曲，控制點可連結其他圖層。","url":"https://aescripts.com/foldspace/"}

先做第 1 步，把已收錄清單抓回來並回報數量，再開始第一批。
```

</details>

拿到那行 JSON 後，仍要由維護者判重、確認官方網址並通過驗證。能使用終端機時，請先存成 `batch.jsonl`，再執行 `python tools/add.py batch.jsonl --dry-run` 與 `python tools/add.py batch.jsonl`；不要直接繞過匯入器大量貼入。

> 想「貼參考圖找效果」而不是加資料？直接把圖丟給 AI 問「這畫面是什麼 AE 效果」，或用線上搜尋頁 https://xup61069.github.io/ae-effects-db/

## 資料長怎樣

一個特效一行 JSON，搜尋主要靠名稱與 `tags`，並以描述、外觀和同族變體補充：

```json
{"id":"sapphire-s-rays","name":"S_Rays","suite":"Sapphire","kind":"plugin","cat":"light","tags":["god rays","light shafts","volumetric","丁達爾","體積光","上帝光","放射光線","雲隙光"],"desc":"從亮部放射的體積光/上帝光，做雲隙光、窗光、神聖光束。","look":"從亮處放射的可見光柱"}
```

欄位與分類完整說明見 [AGENTS.md](AGENTS.md)。

## 送出方式

**方法 A：GitHub 網頁直接改（免裝任何東西）**
1. 開對應的 `data/xxx.jsonl` → 按右上鉛筆 ✏️ Edit。
2. 到最後貼上你的一行 JSON。
3. 下方填一句說明 → **Propose changes** → 開 Pull Request。

**方法 B：本機**
```bash
git clone https://github.com/xup61069/ae-effects-db
# 編輯 data/xxx.jsonl，加上你的行
python validate.py          # 一定要全綠
git commit -am "add: XXX 外掛"
```
再開 PR。

## 規矩（PR 前自檢）
- [ ] `python validate.py` 通過（error 會被 CI 擋下；⚠ 警告不擋，但請盡量清掉）。
- [ ] 一次加很多筆的話，跑 `python validate.py --strict`——它會把樣板化也算成錯誤。
- [ ] `desc` 用繁體中文、一句話、講清楚**做什麼＋典型用途**。
- [ ] **把效果名遮掉後，desc 還能分辨是哪個效果**（不是只有名字不同的樣板句）。
- [ ] `tags` 中英雙語（一定要有中文），且去掉效果名後不與同系列其他條目雷同。
- [ ] 加了新的多語同義詞時，只更新共用的 `curation/search.json`（日文策展詞則更新 `curation/search-aliases.ja.json`），並跑跨 runtime 搜尋測試。
- [ ] BOOTH／Gumroad 條目：`vendor` 填作者名、日文原名有進 `tags`、URL 實際存在。
- [ ] 因重疊之外的理由略過的候選已記到 `curation/skipped.tsv`（原因具體）；重疊不再自動略過，除非已查過熱門度與品質。
- [ ] `url` 有實際開過確認存在，不是照 slug 規則猜的。
- [ ] 放對資料檔、`cat` 用既有分類。
- [ ] 作者／功能／AE host 屬實；查不到原廠具體說明就不收。
- [ ] 產品仍在販售或維護，不是 discontinued、obsolete 或 legacy-only。
- [ ] 不放盜版下載連結、不整段複製官方文案。

有問題就開 Issue（有「新增特效」範本可用）。感謝你 ❤️
