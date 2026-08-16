<!-- 感謝貢獻！沒填完也沒關係，我們會協助補上 -->

## 這個 PR 做了什麼


## 官方依據

<!-- 新增資料時貼原廠產品／文件頁；純程式或文件修改可寫「不適用」 -->


## 自我檢查

一次只加一兩筆的話，下面隨便看看就好；**一次加十筆以上請一定要跑過**：

- [ ] `python validate.py` 沒有 ✗ 錯誤
- [ ] 加很多筆時另外跑 `python validate.py --strict`（樣板化會被算成錯誤）
- [ ] **把效果名遮掉後，每筆的 `desc` 還能分辨是哪個效果**——不是「提供『XXX』的○○控制」這種只換名字的句型
- [ ] `tags` 有中文，且去掉效果名後不與同系列其他條目長得一樣
- [ ] 每個 `url` 都實際開過確認存在（不是照 slug 規則猜的）
- [ ] 原廠明列支援 After Effects，且產品不是停售、obsolete 或 legacy-only
- [ ] 不收的候選已用具體理由寫入 `curation/skipped.tsv`
- [ ] `python tools/audit.py --strict` 通過

> 為什麼卡這幾點：這個庫的搜尋是拿使用者打的字去比對 `tags` 子字串。
> desc 講不清楚、tags 只有分類名的條目，等於搜不到，收了也沒用。
> 詳細說明與正反例在 [CONTRIBUTING.md](../blob/main/CONTRIBUTING.md)。

## 小提醒
- 資料格式與分類說明在 [AGENTS.md](../blob/main/AGENTS.md)
- 格式沒對齊不用擔心，我們會幫忙修
