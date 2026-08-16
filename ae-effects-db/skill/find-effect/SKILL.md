---
name: find-effect
description: 用文字描述或貼圖找 AE 特效／外掛。觸發時機：用戶問「找特效」「這效果怎麼做」「有什麼外掛可以做XX」「這張圖的效果是什麼」，或貼參考圖想仿效果。
---

# 找 AE 特效

資料庫在 `ae-effects-db`（找不到就問用戶路徑；預設 `C:\AEMCP\effects-db`）。

## 做法：一行指令

```bash
python search.py 發光 glow          # 中英關鍵字都吃，多詞預設 AND
python search.py --any 發光 glow    # 明確要求符合任一詞時才用 OR
python search.py --cat transition 甩鏡
python search.py --list-cats        # 看有哪些分類
```

多詞 AND 完全無結果時，CLI 會清楚提示並退回 OR。仍搜不到再換同義詞（見下表）；中文長詞（如「煙霧模擬」）會自動拆詞，不必自己拆。

## 判斷與回答

1. **先看用戶要的是「單一效果」還是「整體畫面感」**
   - 整體氛圍（賽博龐克、電影感、老電影、科技HUD…）→ 先 `python search.py --cat recipe <關鍵字>`，
     給配方（`stack` 是要疊的效果順序、`builtin` 是純內建替代做法）。
   - 單一效果 → 直接搜。
2. **貼圖時**：先客觀拆解畫面特徵（發光？色差？顆粒？掃描線？粒子？扭曲？轉場？調色？），
   **一張參考圖通常是多個效果疊加**，要拆開分別搜。
   例：賽博龐克標題 = 霓虹描邊發光 + 故障位移 + 色差 + 掃描線。
3. **回答**：挑 3–5 個，每個講「名稱（來源／型態）→ 為什麼適合 → 設定方向」，
   附上該筆的 `url` 官方連結，最後補一句「沒外掛的話用 AE 內建怎麼做」
   （`python search.py --suite builtin-ae <關鍵字>`）。
   只有資料列或可查證的官方文件支持時才能寫具體參數名；否則不要憑印象編參數。
4. **資料庫沒有就說沒有**，不要編造不存在的外掛。

## 中→英關鍵字對照（搜不到時查這裡換詞）

| 描述 | 關鍵字 |
|---|---|
| 發光/輝光 | glow, bloom, halation |
| 鏡頭光暈 | lens flare, flare |
| 體積光/丁達爾 | rays, god rays, volumetric |
| 星芒/閃耀 | glint, glare, sparkle |
| 霓虹/描邊發光 | neon, edge glow, saber, outline |
| 故障/毛刺 | glitch, digital damage, datamosh, pixel sort |
| 老電視/雪花 | tv damage, analog, static, scanline, crt |
| 錄影帶 | vhs, tape |
| 老膠片/復古 | film damage, retro, grain, vignette, 8mm |
| 色差/色散 | chromatic aberration, prism, rgb split |
| 熱浪/隱形扭曲 | heat haze, displacement, refraction |
| 粒子/星塵/魔法 | particle, dust, magic, emitter |
| 煙/火/爆炸 | smoke, fire, explosion |
| 拖尾/殘影 | trails, echo, feedback |
| 震動/手持 | camera shake, handheld |
| 甩鏡/轉場 | swish, whip pan, transition, dissolve, wipe |
| 去背/綠幕 | key, chroma key, primatte, green screen |
| 追蹤/貼螢幕 | track, corner pin, planar, mocha |
| 移除物件 | remove, clone, inpaint, wire |
| 慢動作/補幀 | retime, optical flow, slow motion |
| 降噪 | denoise, noise reduction |
| 美膚/磨皮 | beauty, skin |
| 調色/電影感 | color grade, looks, film stock, cinematic |
| 卡通/漫畫 | cartoon, toon, halftone, posterize |
| 素描/油畫 | sketch, pencil, paint, watercolor |
| 馬賽克/像素 | mosaic, pixelate, pixel art, 8-bit |
| 萬花筒/鏡像 | kaleidoscope, mirror, symmetry |
| 水波/焦散 | ripple, water, caustics |
| 魚眼/移軸 | fisheye, tilt shift, miniature |
| 漩渦/小星球 | vortex, polar, tiny planet |
| 閃電/電流 | lightning, zap, electric |
| 雷射/光劍 | laser, saber, beam |
| 散景/景深 | bokeh, defocus, depth of field |
| 打字機/文字動畫 | type on, typewriter, kinetic text |
| 科幻介面/全息 | hud, hologram, sci-fi |
| 音樂驅動 | audio, beat, visualizer, waveform |
| 3D文字/模型 | extrude, 3d text, element 3d |
| 陰影/倒影 | shadow, reflection |
| 打碼/隱私 | censor, blur, mosaic |

## 補充

- 若歷史資料帶有 ⚠ `unverified`，回答時必須明確註明不確定；新候選無官方功能說明時應略過，不新增 `unverified`。
- 用戶若想直接套用效果，可用 AfterEffectsMCP：內建效果用 `apply-effect`，
  第三方先用 ExtendScript 列舉 `app.effects` 查到 matchName 再用 `run-script` 套。
