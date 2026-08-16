# EXPANSION.md — 持續擴充作業手冊

做資料擴充前，必須先完整讀 [`AGENTS.md`](AGENTS.md)。本檔只描述批次研究、決策、匯入與發佈流程；資料格式與硬性品質規則以 `AGENTS.md`、schema 與驗證器為準。

## 每輪流程

一般一批以 **50 個「已作出收／不收決策的候選」**為單位；候選數不足或需要人工確認時可分批暫停。使用者另有批量要求時從其指示。

1. 從官方產品線、官方效果清單或高訊號榜單取得候選。
2. 搜尋全部 `data/*.jsonl` 的 `name`、`variants`、官方 URL 與功能同義詞。
3. 回原廠頁確認 AE host、實際功能、是否仍販售，以及 URL 是否存在。
4. 收錄者寫入暫存 `batch.jsonl`，執行 `python tools/add.py batch.jsonl`。
5. 不收者把穩定 slug／識別字與具體理由追加到 `curation/skipped.tsv`。
6. 重建索引、完整驗證、提交並推送。
7. 等 GitHub Actions 與 Pages 完成，再驗證正式站。

`curation/skipped.tsv` 是長期決策記憶。不要只寫「不適合」；應寫明是 bundle、非 AE host、停售、無功能說明、太小眾，或與哪一筆高度重複。

## 候選來源優先順序

1. Adobe、Boris FX、Maxon 與既有主要廠商的最新版官方清單差異。
2. Rowbyte、Superluminal、Digital Anarchy、RE:Vision Effects、Video Copilot 等原廠產品線缺口。
3. LookAE 等列表只能用來發現名稱；所有事實一律回原廠確認。
4. aescripts 先看 viewed／bestselling 或明確分類中的高訊號產品；sitemap 尚有大量低命中候選，不優先掃。

## 掃描進度（截至 2026-08-15）

BOOTH 累計評估約 1,018 個商品 id（**收錄 199、略過 832**）；Gumroad、Payhip、Ko-fi、Itch.io 與官方產品線狀態見下表。所有略過決策都記在 `curation/skipped.tsv`。

| 批 | 平台／範圍 | 收錄 | 略過 |
|---|---|---|---|
| 1 | Gumroad 8 頁；BOOTH 6 頁 | Island Chatter、Shy Filters、Script Launcher、Zoom、Easy Connect、EZ3D、PathPrep、FX TextFrame；BOOTH id 7769569、7695646、2307736、2728552、6815576、5899013 | — |
| 2 | Gumroad（ScriptUI panel／jsxbin workflow）；BOOTH 熱門列表首批 | ImpactFX、Grid Layers、Apex Control Pro、Keyframe Buddy、Quick Tools Pro、Visual States PRO、Dither FX PRO；Texton、SHIG Project Starter、CleanLayer、All Font Changer、BaraMoji、RZNC Geometry Generator、SyncFX、BeatPad | — |
| 3 | Gumroad（ScriptUI animation tool 等 4 組關鍵字）；BOOTH（スクリプト アニメーション 等 3 組關鍵字） | CoreKit Pro 3、WordFlow、SubTitle Animator、MessCtrl、TimeOffset、Quick Wiggle；BlinkPanel、Shy Folder、RplEffect、CenterOrigin、AutoTargetUI、Japanese_manuscript_paper、baraji、Set Adjustment、Bowl Wobble | — |
| 4 | Payhip／獨立站 4 頁；Gumroad 1 頁；BOOTH 7 頁；Ko-fi | Siawase_FontShuffle、BPM同期モーションスクリプト、ColorPalette、Aulymo、moti、ShapeFit Panel、TSK_Input Expression | After Toolkit、Pulse X、One Click Liquid Glass、SaaS Panel Kit（Payhip 資訊不足）；Motion UI（Gumroad，重疊）；Ko-fi 無候選 |
| 5 | BOOTH 13 頁（自動化／ScriptUI／相機／粒子／文字／旁白關鍵字）；Itch.io／Ko-fi | Particle launcher、Script Launcher、Auto Camera、AE Project Folder Organizer、Auto Crop Comp、Nanten ExAI、QuickComp、NeonBlink、TXT-NA Importer、自動ループ化スクリプト、MojiFlex、Ascify | Aurgan（404）；Itch／Ko-fi 無候選 |
| 6 | BOOTH 16 頁（Marker／Keyframe／Layer／Path／Audio／Lip Sync／Morph 關鍵字）；Payhip 4 頁 | MatchLayerDuration、Arrange Layers、Random Placement、SelectiveAdjustment、レイヤー移動スクリプト、Label & Finder Bar、SyncFX、Marker Tools、DropFrameEXP v2、Path to Position、SyncAudio_To_Precomp、AudioGlide、Lab_LS、Deckard、MorphMesh | グリッドレイアウト（404）；TIDY LAYERS、Project Organizer、Binzii_FastEase、AM Reverse Path（Payhip，重疊） |
| 7 | BOOTH 8 頁（顏色偵測／HUD／圓形文字／斬擊／像素／字形 3D 關鍵字） | NodeField、TextOrbit、Katana Slash Pro、Words Scatter Pro、Palf PixelPaint、Syndromee Text Distribute、UltraBarabara、FacePartSelector | 40 個（功能重疊或描述不足） |
| 8 | BOOTH 461 個候選（過濾素材／BGM／VRchat／Photoshop 後） | Palf FontMixer、AlignLab、SaveAnimation、3D Grid Panel、HourFlow | 424 個（素材、非 AE、重疊或過窄）；另修復 skipped.tsv 39 筆換行黏貼。BOOTH 累計收錄 34＋略過 502 |
| 9 | 規則調整後以 BOOTH wish 數重審先前略過名單 | **43 筆**：Nisai 17（Nisai Stroke、MultiEase、RandomMotionNS、ひらがなだけ小さくする、テキスト状態保持文字分解、DelayAnimator、BPMコマ落ちウィグラー、BPM同期モーション、NotepadNS、ゴリ押しリピーター、自動ループ化、レイヤー追加ツールバー、アウトポイント階段状、位置間隔調整、プレビュー拡大率、マーカーコピー、親ヌル作成）＋重審 26（Everything、Auto Motion、Texflow、baraji、Blobin、Grungefy、Texton、Palf MotionTextBox、Compote、HL_LyricMotioner、ALStroke 2、Auto Camera、SimuDrop、Overbleed、NGS_ShapeLibrary、yama ultimate path、Effect Dash、MojiDropper、mojula、Filament 3D、LayoutKit+、Ascify、Figma to After Effects Exporter、Spookie、Renamus、Shape to mask） | ColorFlow、moti（與 aescripts 同名）；BaraMoji（與 Nisai テキスト状態保持文字分解幾乎相同）；30 個已收錄 id 自 skipped.tsv 移除。BOOTH 累計收錄 77、略過 472 |
| 10 | 官方產品線補齊＋BOOTH 200 個新 id（モーショングラフィックス／テキストアニメーション等關鍵字） | 15 筆：ARRI Film Lab、NormaliZe、Expression一括置換、CROP MOVER、autoRect、autoParallax 2、FontSync、Choiceloop、TextAlign、AutoDuration、SubText2Layers、CSV Text Source Manager、すりこみくん、EasyTextBox、EasyToner2（13 筆為 BOOTH） | ARRI Look Library（LUT 包）；Frischluft Retrodots／HSL Selection；Digital Anarchy ShotNotes／EFF-IT!（Premiere only）；151 個（.ffx 預設包、VJ／素材包）。BOOTH 累計收錄 90、略過 623 |
| 11 | Digital Anarchy 免費線補齊＋BOOTH 80 個新 id（圖形アニメーション／テロップスクリプト／カメラワーク） | SRT Importer for AE、Ugly Box、Backdrop Designer、Flicker Freak、Simple Gradient；SYMMETRY、Anchor to Shape、wakuwaku、MVLyrics2Layers、Chromix、GlyphForge、OTM_JPtypewriter（另補錄 booth-3027685） | Cartoon Bubble（Photoshop 用）；73 個（VRChat／Warudo／Blender／Unity／Photoshop／OBS／YMM4 插件與素材包）。Rowbyte 7 工具與 Superluminal Stardust 覆蓋已確認。BOOTH 累計收錄 97、略過 696 |
| 12 | aescripts sitemap 50 候選（find_new.py --limit 50） | Mask Color Pro、NoPrecomp、RoundPro、Snapola、Thicc Pro、ToneCraft、UI Mockup Builder、Unrender、Whiteboard Rig Builder、Font Animator、AE Fusion 3D Bridge、Rename-a-Duper、VKO Shader、Flagship | mate-for-premiere（Premiere Pro only）；text-background-pro（Photoshop only）。BOOTH 累計收錄 97、略過 696 |
| 13 | aescripts 收尾（multiview、texto）＋BOOTH 1431 個新 id（轉場／形狀／表達式／AEプラグイン等關鍵字），篩出 122 個 AE 相關候選逐筆評估 | texto（aescripts）；BOOTH 53 筆：NeSprite for AfterEffects、Puppet Hair Fx、m's BaraBara、HEISEI-VHS、Stretch、Circle Repeater、Select ShapePath & addKey、Border、KANTA Random3D／dot2／Grid／Radial／Morph & Spiral & Distort、Auto Textbox、Peek-a-boo、RGBDelay、EasyPhysics、FoldLayers、Symmetrika、Notal、Lyric IN、Grupico、FlashOpacity、EaseSwinger、Windows Maker、タドコロノード、sep_color、A_Halfdots、Nate Essentials Pack、De-Comp、ColorfulEcho、KF_ProjectSeamlessShift、HL_PixelSort／PlacerPro／Border、Impact Lines、DiceLine、A_StarTrail、A_Outline、Sequwise、Mt's PixelSoter、EfficientText、Add Keyflames、QuartzJump、A_Glossy、EffectsDrive、KeyframePlus、Closer、OneEase、StepSizer、ZLoop、WANI Glitch、WANI 16mm Film | multiview（Premiere only）；67 個 BOOTH（純預設檔／AEP 模板／素材集／點子合集／非 AE host／說明不足），MultiSlicer 已見 installed.jsonl 故不重複收。BOOTH 累計收錄 150、略過 764 |
| 14 | Maxon／Red Giant 官方產品線差異＋FxFactory 與 Boris FX 官方清單交叉核實 | **Maxon Studio**；FxFactory 的 LightSpeed Transitions、Transition Builder、Vertical Editing Tools、Podcaster Visuals 均僅支援 Final Cut Pro 而略過；Grunge Effects 雖列 AE 但官方頁以 overlays 為主且功能說明不足而略過；Continuum 疑似缺口均已由既有 variants／條目覆蓋 | 1 筆新增；5 個逐頁核實候選略過 |
| 15 | Pixelan 官方總覽與各產品頁，重新比對既有資料並核實 After Effects 支援 | **BlurBlender Pro、Smart Blur Pro、Smart Sharpen Pro、FilmTouch 2.0、SpiceMaster 3**；3D Six-Pack 3 已存在於 `third-party.jsonl`，未重複新增 | 5 筆新增；1 筆判定為既有條目 |
| 16 | CycoreFX、Mettle、PSOFT 官方產品頁交叉比對 | **PSOFT CelFX、PSOFT anti-aliasing、PSOFT Pencil+ 4 Line**；Cycore Rakka／Wiggle Stroke、Mettle ShapeShifter AE／FreeForm Pro 已存在；Sphere Utilities 與 SkyBox Studio V2 為整包套件而略過 | 3 筆新增；2 筆既有；2 個套件略過 |
| 17 | FxFactory Hawaiki／Zoetrope 產品頁逐頁核實 | **Flow**；Halo Bender、Hawaiki Keyer 5、AutoFix、Hue Finesse、Super Dissolve 均已存在；Analyzer、AutoGrade、AutoMatch 已停售，Keyer 4 已被 Keyer 5 取代，Fold／Geode 官方頁失效而略過 | 1 筆新增；5 筆既有；6 個候選略過 |
| 18 | FxFactory Light Kit／ParticleMetrix／Volumetrix／Viewfinder HUD 逐頁核實 | Viewfinder HUD 已存在於 `third-party.jsonl`；Light Kit 2、ParticleMetrix、Volumetrix 官方頁均標示停售而略過 | 1 筆既有；3 個候選略過 |
| 19 | FxFactory Luca Visual FX 五個現行產品頁逐頁核實 | Custom Title Path、Shadows & Substance、Fireworks、Layer Scan、3D Video Polygons 的 `Works in` 均只列 Final Cut Pro，均不符合 After Effects 收錄條件 | 5 個候選略過 |
| 20 | FxFactory omotion 五個產品頁逐頁核實 | **Smart Blur**；Luma Glitch、Fisheye、Drip、Deep Pan 已存在；Magic Captions 為 Final Cut Pro workflow extension 而略過；Smart Blur 與 Adobe 內建同名但以 FxFactory plugin／官方 URL 分別收錄 | 1 筆新增；4 筆既有；1 個候選略過 |
| 21 | FxFactory omotion 第二輪五個產品頁逐頁核實 | Magic Transitions 已存在；Active Transitions、Volumetric Transitions、Paper Pieces、Blinding Lights 的 `Works in` 均只列 Final Cut Pro，均不符合 After Effects 收錄條件 | 1 筆既有；4 個候選略過 |
| 22 | RE:Vision Effects 官方產品索引完整差異比對 | Twixtor、RSMB、Color Genius、REZup、DE:Noise、FieldsKit、MV_Convert、RE:Fill、RE:Flex、RE:Grade、RE:Lens、RE:Match、RE:Map、Shade/Shape、SmoothKit、Video Gogh、ARRI Film Lab 均已存在；Effections 為 bundle、ARRI Look Library 為 LUT／look library、Twixtor App／Color Genius App 為 standalone app、PV Feather 已停售而略過 | 17 筆既有；5 個候選略過 |
| 23 | Digital Anarchy 五個主要產品頁與既有資料交叉核實 | Beauty Box Video、Flicker Free、Samurai Sharpen、Light Wrap Fantastic 均已存在；Light Wrap Fantastic 的正確官方頁為 `/light-wrap-fantastic/`；ToonIt 候選頁回傳 Page not found，無法核實而略過 | 4 筆既有；1 個候選略過 |
| 24 | KeenTools 五個官方產品頁逐頁核實 | GeoTracker for After Effects 已存在；FaceBuilder／GeoTracker／FaceTracker for Blender 均限定 Blender；FaceTracker 官方頁明示為 Foundry Nuke plugin node，均不是 After Effects host | 1 筆既有；4 個候選略過 |
| 25 | Video Copilot 五個官方產品／下載頁逐一核實 | ORB、Saber、VC Reflect、Color Vibrance、FX Console 均已存在；官方頁面確認其 After Effects host、功能與下載／更新資訊，本輪不重複新增 | 5 筆既有 |
| 26 | Motion Boutique 五個官方產品頁逐頁核實 | Newton 4、Plotter、Connect Layers PRO、Pastiche 2、Autostereogram 均已存在於 `aescripts.jsonl`；官方原廠頁確認其 After Effects host 與功能，本輪不重複新增 | 5 筆既有 |
| 27 | ProductionCrate 五個官方產品頁逐頁核實 | **Crates Perfect Screen、Crates Black Hole、Crates Unmult、Retro Film Essentials、Crates HyperGlitch**；五個產品頁均明確支援 After Effects，匯入器 dry-run 通過；分類器將 Crates Unmult 修正為 `script` 後完整驗證通過 | 5 筆新增 |
| 28 | Adobe Exchange 高訊號候選與原廠頁交叉核實 | **Plainly Videos、PX-Kinetype、AI Assistant for After Effects、GuideGuide、Phone Camera Control**；分別以 Plainly Help Center／GitHub、Pixflow、Motionist、GuideGuide 官方頁確認 After Effects host、功能與現行狀態。Bodymovin 已存在於 `aescripts.jsonl`；Motion Factory File Manager 因 2021 年版本與最新 AE 相容性疑慮略過；Motion Factory 整體為模板／素材 bundle；Guide Layout 只有 marketplace 頁且缺原廠產品文件，改收完整原廠頁的 GuideGuide | 5 筆新增；4 個候選略過 |
| 29 | ModelsLab AI 產品線與 Krock／Mogsaurus 官方頁交叉核實 | **Videogen AI、Imagen AI、SFX AI、Krock.io、ControlDeck Pro**；ModelsLab 三個原廠頁均於 2026 更新並明列 AE plugin，Krock 原廠整合頁／說明中心確認逐格回饋與時間軸標記，ControlDeck 以 Adobe 官方 Exchange listing 核實 AE 2025／2026 與自訂指令面板功能。Audiogen AI 因 Exchange 1.8 評分及多則付費／免費標示爭議略過；Flex GUI Pro 因原廠 v7.0.1 與 Exchange v3.1.0 版本落差及授權連線回報略過；Jet by Clinch 僅有 marketplace listing 且偏專門 DCO 模板 workflow，略過 | 5 筆新增；3 個候選略過 |
| 30 | CI HUB、ModelsLab AI Lipsync 與 Adobe Exchange workflow 候選交叉核實 | **CI HUB Connector、AI Lipsync**；CI HUB 原廠頁與安裝文件確認 AE panel、60+ DAM／MAM／PIM／雲端資產連線、搜尋／重新連結／上傳與版本管理；AI Lipsync 的 Adobe Exchange listing 確認 AE 21+、音訊波形分析與角色嘴形同步。MotionX 因 Exchange 僅 1.0／5 且多則無法使用回報，核心依賴 `.motionx` packages；Ignition Post - Package Exporter 與 Idonix 原廠說明停留於 2018，屬 legacy／維護不足；Autodesk Maya Live Link 雖有官方橋接功能，但最新版本僅列 AE 25.9，2026 多則回報不相容，均略過 | 2 筆新增；3 個候選略過 |
| 31 | Vidimize 與 Epidemic Sound 官方 AE workflow 產品線，交叉比對 Adobe Exchange 與原廠頁 | **X-Motion、MotionFlow、Epidemic Sound**；X-Motion 原廠頁／Exchange 確認 AE 22+ 的 CEP panel、AI video／VFX／image／music／voiceover 生成、直接匯入時間軸、TextFlow 與 Production Scenes；MotionFlow Exchange 與 Vidimize 定價頁確認 140 個可編輯文字／物件動畫預設、Scene、即時 easing 與自訂預設庫；Epidemic Sound 原廠 Adobe plugin 頁確認 AE 面板內搜尋、預覽、匯入 music／SFX／voiceover、依描述／參考曲目／影片搜尋及長度／循環調整。LLM Assistant 因與既有 Motionist AI Assistant 同樣生成 JSX／expressions／動畫而重疊略過；LottieFiles for After Effects 已有既有條目且 `lottiefiles` 略過記憶覆蓋相同 Lottie／dotLottie 匯出流程 | 3 筆新增；2 個候選略過／既有覆蓋 |
| 32 | Atom、Soundly 與 Adobe workflow／review 候選交叉核實 | **Atom、Soundly**；Atom 原廠首頁、文件、下載與條款確認 AE AI assistant 能讀取合成脈絡並執行自動化、轉錄／字幕、reframe、專案整理及 ExtendScript，Soundly 原廠首頁／FAQ 確認 After Effects 整合、雲端／本機音效搜尋、預覽與送入專案。Motion Array Extension 主要是訂閱素材／模板／preset library，且 legacy plugin pack 已退休；SyncSketch 原廠只提供雲端 review、註記與 3D model collaboration，沒有 AE plugin host 證據；AE GPT 已存在於 `aescripts.jsonl`，本輪不重複新增 | 2 筆新增；2 個候選略過；1 筆既有 |
| 33 | Ziflow、Mt. Mograph、Adobe／Frame.io 與 Motion Bro 官方 workflow 交叉核實 | **Ziflow、Boombox Studio、Frame.io V4 Panel、Motion Bro**；Ziflow Help Center／整合頁／Adobe Exchange 確認 AE proof render／upload、版本與逐格留言同步；Boombox Studio 原廠頁與 guide 確認 AE 2021+ extension、15,000+ SFX 搜尋、Cue Points、Swap／Cue、Auto-Mix 與 Constellation mixer；Frame.io V4 官方文件確認 AE Review workspace 內 render／upload、Share links、version stacks、comment markers 與 Frame.io Drive；Motion Bro 原廠／Exchange 確認 AE 2021+、預設預覽、一鍵套用、可編輯速度、Pack Manager 與 2026 v7.3.1。Motion Studio 已存在於 `third-party.jsonl`，官方原廠 URL 與完整功能覆蓋，本輪不重複新增 | 4 筆新增；1 筆既有 |
| 34 | Knights of the Editing Table 與 Mister Horse 官方 AE workflow 產品線交叉核實 | **Watchtower、Animation Composer**；Watchtower 原廠頁確認 AE 2020+／Windows／macOS 的 system-folder／Project-bin 自動同步、image sequence 匯入、子資料夾展開、relative paths 與標籤；Animation Composer 原廠 AE 專頁確認 AE 2025+、免費 plugin、動畫／轉場／標題／圖形／音效 preset、User Library、Keyframe Wingman、Keyframe Actions、Anchor Point Mover 與 Transition Shifter。Overlord 2、KBar3、AEVIEWER Pro 均已存在於 `aescripts.jsonl`，已以正式名稱、vendor、官方 URL 與功能條目判定既有，不重複新增 | 2 筆新增；3 筆既有 |

| 35 | Knights of the Editing Table 五個產品頁逐頁核實 | **Portal (Knights of the Editing Table)**；原廠 Portal 頁明列支援 Pr、Ae、Au、An、Me、Ps、Ai、Id、Ic、Dw 2020+，可從 Adobe apps 開啟收藏資料夾，支援絕對／相對路徑與拖放。因資料庫已有 aescripts 的另一個同名 PORTAL 預合成同步工具，新增條目以廠商括號消歧，官方名稱 Portal 保留在 tags | Excalibur、Quiver、Dagger、Cauldron 原廠頁／文件均只列 Premiere Pro 2020+，沒有 After Effects host 證據，追加 skipped.tsv 略過 | 1 筆新增；4 個候選略過 |

| 36 | Motion Design School、AEJuice 與 Plugin Everything 官方產品線差異核實 | **Motion Tools Classic、Auto Captions、Voiceover AI、Copy Ease、AEJuice Toolbar**；Motion Tools Classic 原廠頁明列 After Effects／CS6–CC 2014–2025 與免費 v2.2.4；AEJuice 三項原廠頁／免費工具頁明列 After Effects 與 AI 字幕、70+ 語音配音／轉錄、速度圖複製、自訂工具列功能。Motion Tools Pro、Plugin Everything 多個效果工具已存在於既有資料庫，不重複新增 | Auto Subtitles 與 Auto Captions 同廠功能高度重疊，保留功能較完整的 Auto Captions；Quick Folders 與 Portal (Knights of the Editing Table) 的資料夾捷徑 workflow 高度重疊，均追加 skipped.tsv | 5 筆新增；2 個候選略過；最新總筆數 2,711 |
| 37 | FxFactory After Effects 官方索引與 Zoetrope、Sheffield、Yanobox 產品頁重審 | **Fold (Zoetrope Software)、Painterly Transitions、Artitude、Mosaic (Yanobox)**；Fold 原廠頁恢復並明列 AE、Premiere、Final Cut Pro、Motion、DaVinci Resolve 與 3D generative design；Painterly Transitions 明列 AE 與手工畫意轉場；Artitude 明列 AE 與 real-world media 模擬、版本 1.0.4；Mosaic 明列 AE 原生相機整合、pixel texturing、ASCII、adaptive tiling、custom motifs、luminance sorting，版本 1.0.7。Fold 舊有 Page not found 略過記錄已移除，並以廠商括號消歧於既有 Universe Fold | Caption Converter 為 macOS／Final Cut Pro standalone app；SupaWipe、PATTR、Decimal Counter、1 Matte Mask、Blaster Bolt、Film Transitions 均已停售；Magic Captions 僅 Final Cut Pro workflow extension，均追加 skipped.tsv | 4 筆新增；8 個候選略過；最新總筆數 2,715 |
| 38 | Blace Plugins 官方 aescripts 產品線與作者推薦產品交叉核實 | **I Ate Mushrooms、Easy Comp、Frankenstein**；三個原廠頁均明列 After Effects，並確認本機 blace.ai C++ AI 引擎、Apple Silicon／NVIDIA GPU 支援與具體功能。I Ate Mushrooms 版本 1.9.64（2026-08-05）提供文字轉圖、神經轉場、latent interpolation 與可循環生成；Easy Comp 版本 1.2.64（2026-08-05）提供免手動遮罩的素材融合與自動色彩匹配；Frankenstein 版本 1.2.64（2026-08-05）可建立皮膚、眼睛、嘴巴與牙齒的獨立臉部 matte。 | Depth Scanner Lite 是既有 Depth Scanner 2 的 slim variant；Concept Buddy 官方頁標示停售；Local Diffusion 官方作者產品清單標示 Coming Soon，均沿用 skipped.tsv 的直接重複／非現行決策 | 3 筆新增；3 個候選沿用略過記憶；最新總筆數 2,718 |
| 39 | FreqReact、Battle Axe、Breton Brander、Frank Lamont 與 AE Screens 官方產品頁交叉核實 | **FreqReact、Anubis、Hover、CropBox、Mouse Pack**；FreqReact 原廠頁明列 After Effects v3 的 frequency selection 與 Pulse／Oscillate／Flicker／Elastic／Switch／Wiggle／Steps／Trigger reactors；Anubis 原廠頁明示 Ae／An／Pr 與小型 MP4 輸出、dynamic file naming、folder management、Render and send、KBar，並於 2026-08-10 更新；Hover 原廠頁明列 AE 2026–CC 2017、游標 hover／button brightness／click／grab animation，1.2.0 修復 AE 2025；CropBox 原廠頁標示 AE 2027–2024、2026-08-14 初始版本與 Composition panel 互動裁切、吸附、margin、aspect ratio；Mouse Pack 原廠頁明列 AE ScriptUI panel、9 種 cursor states、click animation、dockable panel 與 free updates。依分類器契約，Hover curated kind 修正為 plugin，CropBox 修正為 script | 本輪候選均未命中資料庫或 skipped.tsv，未另增略過記憶 | 5 筆新增；最新總筆數 2,723 |
| 40 | AE Screens 官方工具索引與五個獨立產品頁核實 | **Get Rect 2、Speed、Pearelax、Nice O Metric、Xplode**；五個頁面均明列 After Effects Script UI Panel。Get Rect 2 提供會跟隨來源圖層的 smart rectangles、track mattes、lower thirds、animated strokes；Speed 支援 keyframe／layer／comp 加減速、反轉、warp、batch processing 與 audio sync；Pearelax 將分層 2D 或照片轉成帶 camera controls 的 3D parallax，支援 camera lock、live offset 與 bake；Nice O Metric 一鍵建立等角攝影機與圖層 extrusion、支援 KBar；Xplode 免費拆分 shape layers、分離 position dimensions 並保留 effects／expressions／easing。AE Screens 索引中的 Type、Parental Controls 與 Mouse Pack 已存在，不重複新增。依分類器契約，Pearelax 與 Nice O Metric curated kind 修正為 plugin，其餘保留 script | 本輪候選均未命中資料庫或 skipped.tsv，未另增略過記憶 | 5 筆新增；最新總筆數 2,728 |
| 41 | aescripts 官方 After Effects 分類頁、相關產品頁與五個原廠產品頁核實 | **Track to New Null、Kashida Pro、Voxel Sorter Pro、IconDock、GrabDrop**；Track to New Null 明列 AE Motion Tracker／Mocha AE 追蹤烘焙到新 Null、反轉追蹤穩定化與 AE 24.0+；Kashida Pro 明列 Arabic、Kurdish、Persian、Urdu 的 Kashida 文字對齊、Auto Reflow、Tashkeel-safe 與 AE 2022–2026；Voxel Sorter Pro 將像素轉成三維體素世界，Pro 加入 AI depth、Motion Blur、Depth of Field，1.11.1 於 2026-08-11 更新；IconDock 明列 AE 2020–2026、數十萬圖示搜尋與 PNG／SVG／Shape Layer 匯入，1.02.1 於 2026-06-06 更新；GrabDrop 明列 AE 2024–2026，可直接下載／匯入影片、音訊與字幕，支援片段、播放清單、格式轉換與 CSV／TSV 批次下載，1.0.11 於 2026-08-09 更新。依分類器契約，Kashida Pro curated kind 修正為 plugin；Track to New Null 的重複 `Mocha AE` tag 改為 `Mocha tracking` | 其他官方頁候選多已存在資料庫：Project Doctor、Pluck、AlphaForge、Soft Flow、PhysicDesk 2、LAYERQ、VoxMark、LottiePacker 等均未重複新增；Gradient Lab 因僅有 template categories 摘要暫不收錄；Organic RIG PRO 因官方頁明示 removed due to plagiarism 應排除 | 5 筆新增；最新總筆數 2,733 |
| 42 | aescripts After Effects 官方分類頁第 9–13 頁、CorridorKey／Grid Composer／CRTX Lite／Easify 3／Pixel Sorter Studio／Leyero／grape design／MEGAKRUNCH 官方產品頁逐頁核實 | **CorridorKey by blace.ai、Grid Composer、CRTX Lite、Easify 3、Colume、Astleyizer、Fractal Volume、Dither Decay**；八個產品頁均明列 After Effects host 與具體功能，現行可取得。CorridorKey by blace.ai 提供本機 AI 綠幕 key、透明像素修復與 AI despill；Grid Composer 提供視覺化網格設計、五種輸出模式與 Dynamic Grid；CRTX Lite 提供快速 preset-first CRT 掃描線、遮罩、泛光與類比訊號控制；Easify 3 提供 AE Bézier／數學緩動、曲線預設與 keyframe copy/paste；Colume 以 AE lights 在 3D space 生成漸層；Astleyizer 是免費人物轉 Rick Astley plugin；Fractal Volume 生成回應 camera／lights 的真 3D fractal noise；Dither Decay 以多種 dithering algorithms 與色盤建立復古像素質感。分類器將 Dither Decay 修正為 `script` | 第 13 頁 Aurum 官方分類頁明示 NO LONGER AVAILABLE，沿用既有 `aurum` 停售決策，不收錄；第 9–13 頁其餘已核實候選多數已存在資料庫，未重複新增 | 8 筆新增；1 個停售候選沿用略過記憶；最新總筆數 2,741 |

| 37 | BOOTH After Effects 新品與高訊號搜尋結果逐頁核實 | **A_Flutter、NGS_EaseCraft、RenderDrop、sbtr_project_cleaner、Clarix、quick_jimaku、Create Cut Comp、ばなぼっくす、BPMc**；逐頁確認官方 BOOTH 商品頁的 AE host、功能與現行下載狀態，並以 `tools/add.py --dry --file booth` 判重與匯入 | A_Bayangan（官方功能說明不足且與投影工具重疊）；Easy Loop、SavePNG、SaveSnap（與既有循環／截圖工具重疊）；Re_CCCompFix（過窄的單一 CC Composite 修復）；AutoGuide3（Guide 操作範圍過窄且有既有替代） | 9 筆新增；6 個候選略過；最新總筆數 2,720 |

| 38 | BOOTH 文字、工作流程、深度與動畫工具第二輪逐頁核實 | **MojiFlow、Shuffle It!、ValetAE、Depth FX、OutMotioner、ShapePresetViewer**；逐頁確認官方 BOOTH 商品頁的 After Effects host、功能、安裝型態與現行版本，並以匯入器判重後加入 `booth.jsonl` | 3D Align Center（商品頁的動作環境欄位與 AE 標題矛盾）；BPM Waveform（Unity 專用）；CreateShapePlus（單一加號圖形，範圍過窄）；Project Replacer（官方功能與相容性說明不足） | 6 筆新增；4 個候選略過；最新總筆數 2,726 |

| 39 | BOOTH 最新排序頁的文字、表達式、網格與時間工作流工具 | **TextMotion Studio、Checkerboard Grid Tool、ExprOne bate、NGS_FPS_TimeFrame_Calc、CompExtendor、AudioFade_v1.0**；逐頁確認官方頁列出的 After Effects host、功能與安裝方式，且 Overbleed、Notal、Effect Dash 等同頁候選已在資料庫中而不重複加入 | Random Square（單一正方形隨機格子，範圍過窄）；くいっくらんてゃ（與 ValetAE／Spookie 的啟動器功能重疊）；LayerMover（單一圖層上下排序操作，範圍過窄） | 6 筆新增；3 個候選略過；最新總筆數 2,732 |

| 40 | BOOTH After Effects 分類頁 9 頁（527 個商品）逐頁掃描，針對未處理的腳本／外掛／工具回官方頁核實 | **Halftone Pro、KANTA Dissolve 2、Cyberpunk One-Click Filter、Footage Path Replacer、ぶんつむ、Set Track Matte、ShapeDrive、Color Shifter、アニメの撮影用ツール**；核對官方頁的 AE host、功能說明與工具型態後，以 `tools/add.py --dry --file booth` 判重並匯入 | Assistive Tools（多功能工具集且與既有工具重疊）；多個粒子／手繪／動畫素材包、AEP 研究檔與純預設；單一 Anchor／PowerPin／背景色／路徑操作；UnPrecomposer、Shy Group、Time Change、GreenRoom、Chesstics 等與既有工作流工具重疊；另記錄官方頁功能不足或非 AE host 的候選 | 9 筆新增；約 50 個候選略過；最新總筆數 2,741 |

| 41 | BOOTH 的 After Effects／script／plugin／extension 標籤交叉掃描 | **Express ver1.0.3、WavyNote**；逐頁確認官方商品頁的 ScriptUI／面板型態、支援版本與歌詞／表達式功能，並以匯入器判重後加入 `booth.jsonl` | 無新增略過項目；其餘交叉標籤候選均已收錄或在 `skipped.tsv` 有既有決策 | 2 筆新增；最新總筆數 2,743 |

| 42 | BOOTH 一般搜尋（After Effects、AE script、AE plugin）最新結果與新商品逐頁核實 | **Property Batch Select、Palf Stripe、Palf Scallop、Palf Gingham、Palf KiraKira、FavoritesLibrary、posterizeMe、LookScope、Fractal Gacha、Fractal Simplifier、APRM、MasterNodes、NGS_縦横切替、XDTS Importer AE、MIDI Visualizer、Takt RadialBlur、GraphicTone**；逐頁確認官方 AE host、安裝型態、支援版本與功能後加入 `booth.jsonl` | Palf Kawaii Bundle（四外掛套件）；OBS／Unity／Premiere／VRChat 商品；AEP／配信素材；功能過窄的 loop、色相與啟動器工具；停售商品 | 17 筆新增；12 個候選略過；最新總筆數 2,760 |
| 43 | BOOTH 一般搜尋（After Effects、AE script、AE plugin）最新結果與官方頁深度核實 | **SimpleExtrude、ばなわっぺん、Labels Lite、Seiton、3D Shape Generator、SmartLayerGen、Slider Connect**；逐頁確認 AE host、外掛／ScriptUI／擴充功能型態、功能細節與支援版本後加入 `booth.jsonl` | CTI Jump、Labion、ADOBEZIER、R-CompAnchorTool、Add Guide、3DIK、Film Noise、Anchor Move、StrokeWidth、圖層長度調整、遊戲／Unity／素材／AEP 與說明不足商品 | 7 筆新增；16 個候選略過；最新總筆數 2,767 |
| 44 | BOOTH 一般搜尋後續頁與日文「After Effects スクリプト／プラグイン」結果逐頁核實 | —；代表性頁面均檢查官方商品描述與 host 後判定不符 | InertiaBones、KKShapeEditor、Charaticle、Natural Skin、Tome Of Elements、TextureColorKit、VRCMeshDeformer 等 Unity／VRChat／Live2D 工具；avatar 服裝、鞋履、紋理、pose、world、遊戲與已停售 shader | 0 筆新增；21 個候選略過；最新總筆數 2,767 |
| 45 | BOOTH 聚焦關鍵字（plugin、script、extension、tool、expression、panel）結果與商品頁交叉核實 | —；搜尋結果實際混入的代表性項目均非 AE 工具 | RealKissSystem、Resonator Tattoo、NIGHTMARE、電脳ナース、ぽんとちゅね、Commander of Battlefront、VRoid／VRChat 服裝與模型、CoC 劇本、同人誌 | 0 筆新增；20 個候選略過；最新總筆數 2,767 |
| 46 | BOOTH After Effects 標籤入口（After Effects／AfterEffects）逐項核實 | **HL_Fontory、JPNGGlitch、Syndromee Bevelized**；確認官方頁的 AE 擴充／外掛型態、功能、版本與安裝方式後加入 `booth.jsonl` | AEP／.mogrt／.ffx 模板與 preset；透明 MOV、GIF／PNG／影片效果、lyric motion 與圖像素材包 | 3 筆新增；17 個候選略過；最新總筆數 2,770 |
| 47 | BOOTH After Effects／AfterEffects 標籤第 2–10 頁逐頁核實 | **AESpriteGrid、Quantize、TexGraph、Geode、Stainless、Weaver、Anime Sync、SimpleStroke、A_Motion、AutoArrange、LiteGlow、GlitchCore、TrueDither、ShapeDistort、EdgeDetec、Random N-gon、SRT Converter、Multi Cut Maker、QuickTrim、CompAndLayerRenamer v3、Ref Board、NWayDither、FastBilateralFilter、PaintAnimation、Spiral Master、Replace Text、Text Auto Generator、Mask⇆Shape**；核對官方頁的 AE host、安裝型態、參數與版本後加入 `booth.jsonl` | AEP／preset／MOGRT／影片素材、活動／票券、Windows 常駐工具、HTML 生成器、Stream Deck 圖示與停止支援的 ChromaticAberrationYY | 28 筆新增；23 個候選略過；最新總筆數 2,798 |
| 48 | BOOTH AfterEffects 標籤第 11–20 頁逐頁核實 | **Overshoot and Bounce Lite、Mascrop、Keyframe Navigator、Loop Panel、Filine、Rasterize All、TransLayerGen、Bubble Fill、AdvancedTiling、Auto Transition、Auto Ring、Folder Importer、FEF Finder、Text Synchronizer、CenterAlign2Comp、FlexibleAnim、Parallax Controls、FolderToComp、Switch It、Text Repeater**；核對官方頁的 AE host、腳本／原生外掛型態、功能細節與版本後加入 `booth.jsonl` | FlipKun、4-Color Gradient Randomizer、MuteAudio、AutoRename、Parent Link、FramePosition 等說明不足或功能過窄項目 | 20 筆新增；6 個候選略過；最新總筆數 2,818 |
| 49 | BOOTH AfterEffects 標籤第 11–20 頁補充作者與相關商品交叉核實 | **MoveLayerIndex、Piano Keyboard、LayerFolders、Marker Manager、ImageSlideshow_GUI、SS AddShapes、Position Separate、Link Same Position、TextCase、RTTTL Tone Converter**；逐頁確認腳本／擴充功能安裝方式、工作流範圍與 After Effects 版本後加入 `booth.jsonl` | FrameToNullComment、集中線文字動畫食譜、WatermarkGen、InOutPointAdjuster、Crop Tool、3dsmax 腳本 | 10 筆新增；6 個候選略過；最新總筆數 2,828 |
| 50 | BthJon BOOTH 作者頁逐項核實 After Effects／Premiere 原生外掛 | **MegaGlitch、ProNoise、AnalogTV、RainRipple、HotWave、VHS Effect、Film Damage、Pro Chromatic Aberration、Camera Shake CA、Advfill、LuminGlow**；逐頁確認原生外掛型態、效果參數、色深、MFR／CPU／平台資訊後加入 `booth.jsonl` | 同作者的 Windows 常駐工具另列候選，未與 AE 外掛混收 | 11 筆新增；0 個候選略過；最新總筆數 2,839 |
| 51 | namacream7 BOOTH 作者頁補充核實 | **MiterOutline**；確認官方頁的鋒利／圓角／斜角描邊參數、Alpha 圖層支援、AEX 安裝方式與 After Effects 2025 Windows 相容性後加入 `booth.jsonl` | NaMaximizer 是 VST3 音訊外掛，非 After Effects host | 1 筆新增；1 個候選略過；最新總筆數 2,840 |
| 52 | Adys／AiBow Tools BOOTH 作者頁補充核實 | **Wavy 3AM、Folder Bin Sync**；核對圖形編輯器、多關鍵影格、AE 屬性支援、資料夾／Bin 自動匯入、連番偵測與跨平台資訊後加入 `booth.jsonl` | A_InnerGradation 只有平台資訊，功能說明不足 | 2 筆新增；1 個候選略過；最新總筆數 2,842 |
| 53 | refenan、silverdworks、7ewd、palf_strage 作者頁交叉核實 | —；代表性新商品均確認不是 After Effects host | DaVinci Resolve DCTL、VST 音訊插件，以及 7 個字型商品 | 0 筆新增；10 個候選略過；最新總筆數 2,842 |
| 54 | syndromeewrks 作者頁補充核實 | **Syndromee Prism Diffraction**；確認 Mask／Alpha 輪廓輸入、彩虹光線、色散／閃爍／Glow 參數、AEX 安裝與 AE 2020+ 跨平台色深支援後加入 `booth.jsonl` | — | 1 筆新增；0 個候選略過；最新總筆數 2,843 |
| 55 | kanta227eizo、Terrible Junk Show、simry、Riesz、yochu 等作者頁交叉核實 | **PathEdit、SyncOpacity**；確認 Shape Path 操作、關鍵影格與父層不透明度同步的 AE 腳本用途後加入 `booth.jsonl` | DaVinci／Illustrator／Photoshop 工具、YMM4 cache、VRChat 商品與影片素材 | 2 筆新增；其餘候選略過；最新總筆數 2,845 |
| 56 | keneizo、岡崎有希、k4a - shop、852話、salis、ゆゆっきんぐだむ、そよの雑貨展、Pindang2 等 BOOTH After Effects 候選 | **PersWarp、oilpaint、Shapepath Select and Addkey、MangaTone、Salis_PathEditor、Salis LayerMaster、MixFont、Color Palette、Mirror Positions**；依官方商品頁核實透視變形、油畫與漫畫網點外掛、Shape 路徑與圖層建立、混合字型、色票及位置鏡像腳本用途後加入 `booth.jsonl` | AEP 專案／字幕範本、影片素材、重複文字替換功能、FX Console 設定檔與搜尋框範本 | 9 筆新增、6 筆略過；最新總筆數 2,854 |
| 57 | ema-akiyama、nana7se、binzii、yasucg、ruprous、Eirlys、みずぴょんショップ等最新 BOOTH After Effects 候選 | **Cache Monitor、AlignKit、Binzii_FastEase!、Comp Changer、YTTS2MK、ひらがなだけを小さくするスクリプト、涙目うるうる表現の半自動化スクリプト**；逐頁核實快取監控、圖層對齊分布、播放頭緩動、合成設定批次修改、YouTube 時間戳標記、日文假名縮放與淚眼半自動化腳本用途後加入 `booth.jsonl` | 動畫預設、獨立攝影機錄製程式、MP4／手繪效果素材、AEP 專案與成品動畫、下架商品 | 7 筆新增、8 筆略過；最新總筆數 2,861 |
| 58 | 鳩 スクリプト売り、BthJon、nagisa-12-34、salis、yorusoramovie_store 等 BOOTH 腳本作者頁 | **ペアレントくん、Copy Kun、Insert Keyframes、ランダム配置、Calculator、Salis_OpenCompSettings、ys_TextAnMaka、Randomizer**；依官方頁確認父子關係、屬性複製、關鍵影格插入、隨機配置、計算、巢狀合成設定、歌詞文字配置與屬性隨機偏移用途後加入 `booth.jsonl` | Shape／文字效果預設、Premiere Pro 面板與僅使用內建效果的預設 | 8 筆新增、5 筆略過；最新總筆數 2,869 |
| 59 | aebuddy、HAYATOのスクリプト工房、Aiém、カドウノ開発雑貨店、BthJon、alimshop、キュー等 BOOTH 作者頁交叉核實 | **CompMaster、MojiMixer、Paralign、Build Importer v6、Proxy Manager v2、FrameGrid、CreateCompMask、Effects Switch、Layer Follower、Time Modifier、Audio Sync、Script Performance、MotionBlur All、1A2B、Auto Fader、Explode Layer、RplSolidName、RplFont、RplCompDur、RplCompName**；逐頁確認合成、字型、段落、匯入、Proxy、格線、遮罩、效果、時間、音訊與批次命名腳本用途後加入 `booth.jsonl` | 功能資訊不足的 SubtleEase、Cell Splitter、Line Orientation 商品頁 | 20 筆新增、3 筆略過；最新總筆數 2,889 |
| 60 | k4a - shop、miya-script 等 BOOTH 腳本作者頁 | **Auto Swing、Simple Set Parent、Reverse Shape Path、Add Props to Essential Graphics、Layer Name Changer、Scale to Slider**；核實搖擺動畫、父子關係、Shape Path 反轉、Essential Graphics 註冊、圖層批次命名與縮放表達式用途後加入 `booth.jsonl` | AEP 教學專案，以及 Premiere Pro MOGRT／動態圖形模板 | 6 筆新增、3 筆略過；最新總筆數 2,895 |
| 61 | BOOTH AfterEffects 深頁 13–18 的 AEP／模板／素材候選清理 | —；頁 19–24 已無新的未知商品，對頁 13–18 逐項確認後將 **AEP 專案、影片 OP 模板、Motion Graphics 展示、Element 3D OBJ、影片與成品動畫素材** 登錄到跳過清單 | 37 筆均為專案檔、模板、模型、影片或成品動畫，非可獨立安裝／執行的 After Effects 工具 | 0 筆新增、37 筆略過；最新總筆數 2,895 |
| 62 | totonoe-plugin、emmaofficial、あおみデザインスタジオ、renderscript 等 BOOTH 作者頁補充核實 | **Totonoe Skin Retouch、AE To Blender Velocity Tools、任意の回数ループアニメーション、Multiframe 100 to 0 Strobe**；確認肌膚偵測修飾、AE／Blender Alembic 速度交換、指定次數循環與逐幀 Strobe 不透明度腳本用途後加入 `booth.jsonl` | 影片／音訊轉換桌面程式、FFX／Layer Style 預設、AEP／教學專案與 PNG／AI 素材 | 4 筆新增、8 筆略過；最新總筆數 2,899 |
| 63 | HoTo Movie、ITO Movie Studio、hanamuradesign、battlerssoftware、Reflex Frames 等 BOOTH 商品頁交叉核實 | **HoTo Movie Color Palette、Sound Panel**；確認跨 Premiere Pro／After Effects 的色彩管理面板與 BGM／SE 音素材搜尋配置面板後加入 `booth.jsonl` | MOV／MP4／AEP 素材與模板、Photoshop 專用外掛、獨立 ffmpeg 轉檔工具、紋理預設與資訊不足的 Organizer | 2 筆新增、20 筆略過；最新總筆數 2,901 |
| 64 | Guild、Shiasa、Telop Design Lab、PURTON、ぶれんどあ〜と、fried-potato.club 等 BOOTH 商品頁補充核實 | —；確認 Grid、X Y Scale、Marker Counter、文字卡頓均為 `.ffx` 預設，另確認 VHS、效果線、3D Cube、Call Out、Shape 與泡泡為模板／AEP／影片素材 | 10 筆均非可獨立安裝／執行的 After Effects 腳本或外掛 | 0 筆新增、10 筆略過；最新總筆數 2,901 |
| 65 | Text Recipe Shop 的 BOOTH After Effects 第 5–6 頁商品 | —；逐頁確認 YouTube 結尾、遊戲実況、直式字幕、文字效果、霓虹、粒子、Kinetic Typography 等商品核心均為 PDF／數值教學配方，附帶 AE 檔案者仍屬教材而非獨立工具 | 27 筆均為教學配方、PDF、數值設定或教材專案，非可獨立安裝／執行的 After Effects 腳本或外掛 | 0 筆新增、27 筆略過；最新總筆數 2,901 |
| 66 | BthJon、Aiém、3223.pics 等 BOOTH 作者頁自動核實後人工複查 | **Stroke Outline、CropPlus、StarSpikes Pro、GlassRain、Pro Line Extract、Inner Glow Plus、Fadio、imp&comp ver2.5**；確認描邊、裁切、光學繞射、玻璃雨滴、線稿抽取、內側光暈、音訊淡出與動畫攝影匯入工作流用途後加入 `booth.jsonl` | — | 8 筆新增；最新總筆數 2,909 |
| 67 | BOOTH AfterEffects 剩餘候選第一輪自動核實 | —；確認 Premiere MOGRT、AEP 專案、研究素材、`.ffx`／Animation Preset 與作品檔均不屬於可獨立安裝／執行的 AE 腳本或外掛 | 14 筆略過；其中 2 個舊預設頁稍後重試因頻率限制暫未取得完整頁面 | 0 筆新增、14 筆略過；最新總筆數 2,909 |
| 68 | BOOTH AfterEffects 剩餘候選第二輪自動核實 | —；重試 4924763／4925911 後確認為 Long Shadow 與 Shape Particle `.ffx` 預設，並補核 4 個帶有 plugin／preset 字樣但實際為 AEP／影片素材的商品 | 6 筆均非可獨立安裝／執行的 After Effects 腳本或外掛 | 0 筆新增、6 筆略過；最新總筆數 2,909 |
| 69 | BOOTH AfterEffects 剩餘候選第三輪人工抽查 | —；確認配信背景、VTuber／影片轉場、綠幕與 MV 素材、AEP／MP4／WAV 作品、Photoshop 樣式與教學專案均非獨立 AE 工具 | 15 筆均為素材、模板、作品或教學專案 | 0 筆新增、15 筆略過；最新總筆數 2,909 |
| 70 | 交叉掃描 `AfterEffect`、`After Effects` 標籤後的 BOOTH 工具候選 | **ツールアシストセット、SolidEffects、S_tools_EffectSearcher、Layer Switcher、Additional Transform、Cleanup!、Swap Two Selected Layers Source、Easy Fader、Nulltilities、Generate Puppet Rig、アンダーライン引きmuscle**；逐頁核實工具面板、Solid 建立、效果搜尋、來源交換、Null／Puppet Rig、透明度與文字工作流功能後加入 `booth.jsonl` | AE／Element 3D 預設、AEP／FFX 模板、HUD 素材、FX Console 設定檔與作品專案 | 11 筆新增、17 筆略過；最新總筆數 2,920 |
| 71 | 交叉標籤批次官方頁核實的 AEP 作品候選 | —；確認 Motion Graphics 習作 #5–14、2 秒 Motion Graphics #1–18、Maru、Pre：あ與 Element3D 預設資料均為研究或作品 AEP，非獨立工具 | 15 筆均為 AEP 作品、練習檔或專案預設 | 0 筆新增、15 筆略過；最新總筆數 2,920 |
| 72 | 合併 fork（Tangzih0913）的 `booth-next`（7 commits）與 `gumroad-next`（18 commits） | **自動ファイル作成スクリプト、ばらばらに出現・消滅、マスクパスの上に画像が動け！、フォルダにある素材のリネーム、レイヤーの状態覚えておいてscript、簡易版レイヤーリネーム、簡単なWiggle制御、Auto-tress and mask layer auto-detection、シェイプレイヤーのGroupを個別レイヤーに分離、Position and Scale Key ConfirmationScript、コンポ差し替え、3Dレイヤー選択→プリコンポしてメッシュワープ、JapyTextEngine、シェイプを横移動させるだけの仕組みセット、SmartImport、Salis_OpenFileLocation、8Bit PixCam、moji_marker_cut、TextAnimator、カットナンバー増分スクリプト、StairTrim**（21 筆 BOOTH）；**Project Info List Exporter、RAFIKIT Toolbox、LetterBlack Gen AI、VHS Emulator、Field Driver、UI Animator Pro、3D to 2D、MGFX v2.0、DIIS、EaseCurve、DoCharts、superSelect、Find and Replace in Expressions、PathPrep、Keyframe、Post Notes 2、Code Buddy**（17 筆 Gumroad） | 其餘 74 個 fork 分支（含 `fork/main`）均無獨有 commit 已吸收；`skipped.tsv` 以 fork 相對 merge-base 的 89 筆新略過記錄做聯集（未復活上游已汰除的舊記錄）；全部 38 筆新條目已補英／日翻譯與 look 翻譯 | 38 筆新增（BOOTH 21＋Gumroad 17）；最新總筆數 2,988 |
| 73 | 合併 fork `gumroad-next` 後續 10 commits（同作者） | **Render Markers、Machine Vision、BeatFlow、Forma、PinRig、RigtRect、AE Linguine**；以官方 Gumroad 頁核對 Marker 批次輸出、影片分析 HUD、音訊節拍／語音裁切、OBJ 線框、Logo 構圖導引、雙控制器響應式矩形與 AE 介面語言切換工作流，7 筆均已含英／日翻譯與 look 翻譯 | 31 個新 slug（`fjsatt`、`dxdudn`、`wxzlwd`、`kcxxlg`、Hyperpix PSD 系列與 Ableton／VRChat／listicle 等）已寫入 `skipped.tsv`，附具體理由 | 7 筆新增；最新總筆數 2,995 |

## 英／日文翻譯批次進度（截至 2026-08-15）

資料規格（`AGENTS.md` 欄位表）允許 `desc_en`／`desc_ja`／`look_en`／`look_ja`；英／日介面缺翻譯時回退中文並標「原文」。進度以來源檔案計：

| 檔案 | 筆數 | 已完成翻譯 | 狀態 |
|---|---|---|---|
| `builtin-ae.jsonl` | 280 | 280（155 個 look 全部翻譯） | ✅ 100% |
| `aescripts.jsonl` | 995 | 995（558 個 look 全部翻譯） | ✅ 100% |
| `third-party.jsonl` | 457 | 457（122 個 look 全部翻譯） | ✅ 100% |
| `sapphire.jsonl` | 301 | 301（188 個 look 全部翻譯） | ✅ 100% |
| `continuum.jsonl` | 345 | 345（326 個 look 全部翻譯） | ✅ 100% |
| `red-giant.jsonl` | 34 | 34（Trapcode／Magic Bullet／VFX Suite 全數） | ✅ 100% |
| `universe.jsonl` | 99 | 99（Maxon Universe 全數） | ✅ 100% |
| `booth.jsonl` | 380 | 380（103 個 look 全部翻譯） | ✅ 100% |
| `installed.jsonl` | 40 | 40（本機安裝辨識工具全數） | ✅ 100% |
| `recipes.jsonl` | 35 | 35（畫面感與效果堆疊配方全數） | ✅ 100% |
| `gumroad.jsonl` | 29 | 29（10 個 look 全部翻譯） | ✅ 100% |

方針：

- 第一批先譯 `curation/popularity.json` 的 featured 46 筆（2026-08-15 完成並提交），第二批為 `builtin-ae` 全數（同日完成並提交），第三批為 `aescripts` 全數（同日完成並提交），第四批為 `third-party` 全數（同日完成並提交），第五批為 `sapphire` 全數（同日完成並提交），第六批為 `continuum` 全數（同日完成並提交），第七批為 `red-giant` 全數（同日完成並提交），第八批為 `universe` 全數（同日完成並提交），第九批為 `installed` 全數（同日完成並提交），第十批為 `recipes` 全數（同日完成並提交），第十一批為 `gumroad` 全數（同日完成並提交），第十二批為 `booth` 全數 359 筆（分六個批次注入，102 個 look 全部翻譯，同日完成並提交）。
- 翻譯逐筆人工撰寫，不得以未審核的機器翻譯充數；譯文保留產品名、避免中國用語，日文以 AE 官方日文文件用語為準。
- 每批完成後依「完整驗證」跑一輪，重建 `dist/` 並遞增 `index.html` 的 `ASSET_VERSION`。
- 全部 11 個資料檔的英／日翻譯均已完成（2,995 筆，1,625 筆 look 亦全數翻譯），不再有待翻譯來源；後續 fork `gumroad-next` 新條目（Render Markers 等 7 筆）亦於合併時同步補齊英／日翻譯。

## 官方來源技巧

| 來源 | 可靠做法 |
|---|---|
| aescripts | 先用 `python tools/find_new.py --limit 30 --desc`；slug 以 `tools/.sitemap_cache.xml`／官方 sitemap 為準。產品頁可用 Python `urllib` 帶 User-Agent 讀 meta description；若仍無實際說明就略過 |
| BOOTH | `python tools/scan_booth.py --pages 3` 掃 `booth.pm/ja/search/After%20Effects`；商品 id 對照 `data/*.jsonl` 的 `/items/<id>` 與 `skipped.tsv` 的 `booth-<id>`。同名素材包很多，務必逐頁核實 host 與是否為獨立工具 |
| Gumroad | `python tools/scan_gumroad.py` 讀 `gumroad.com/products/search?query=after+effects&sort=newest` 的 JSON；注意 permalink 可能與資料庫存的 `/l/<slug>` 拼法不同，候選清單只作線索，一律回原廠頁核實 |
| Sapphire | 比對官方 picture index 與 `data/sapphire.jsonl`；個別效果以官方 documentation 頁確認 |
| Continuum | 比對官方 BCC effects list 與 `data/continuum.jsonl`；不要自行推測新 ML 效果 slug |
| Maxon／Red Giant | 頁面由前端渲染時用瀏覽器檢查 DOM；路徑例外很多，不能依名稱拼網址 |
| Adobe 內建 | 以最新版官方 effect list 與分類頁為準；obsolete／legacy 不收，面板工具與效果選單項目要分開判斷 |
| 其他原廠 | 只接受原廠產品、文件或支援頁；轉售頁與第三方 host 宣稱不算證據 |

一次抓列表時控制在 3～4 頁，避免逾時。候選站若不適合出現在 repo，絕對不要把站名、連結或文案寫進資料與 curation 檔。

### 每日自動掃描

`.github/workflows/scan-candidates.yml` 每天 03:30 UTC 跑 `find_new.py`＋`scan_booth.py`＋`scan_gumroad.py`，把「尚未收錄、也尚未略過」的候選整理成一個 GitHub Issue（label `scan-candidates`，每次更新同一個 Issue）。掃描器只列候選、不改資料；收錄仍走本手冊的逐頁核實流程。可手動觸發：`gh workflow run scan-candidates`。

## 暫存批次格式

每行一個壓縮 JSON 物件；至少具備 `name`、`kind`、`cat`、`tags`、`desc`、`url`。完成匯入後刪除暫存批次檔，不要提交。

```bash
python tools/add.py batch.jsonl --dry
python tools/add.py batch.jsonl
```

匯入器會判重與選檔，但不能代替人工功能判斷。同名跨來源可能合法；功能相同但名稱不同也可能是重複。

## 完整驗證

```bash
python validate.py --strict
python tools/audit.py --strict
python tools/classify_kind.py
python -m unittest discover -s tests -v
node tests/check_web_js.js
python tools/build_index.py
git diff --check
```

若修改多語資料、官方分類或在地化網址，再執行：

```bash
node tools/build_localization.js --write
node tools/build_localization.js --check
```

若資料、熱門度、在地化或搜尋別名有更新，檢查 `index.html` 的 `ASSET_VERSION` 是否需要遞增，避免正式站使用舊快取。

## 發佈與正式站確認

先依使用者要求設定提交作者與 trailers，再提交並推送。不要假設一定走 main 或 PR；以當次維護流程為準。

```bash
git status -sb
git diff --cached --check
git commit
git push
```

推送後用 commit SHA 監看：

```bash
gh run list --commit <sha>
gh run watch <run-id> --exit-status
```

必須確認 validate、build-index 與 Pages 成功。最後直接抓正式站的 `dist/web-index.json`（附新的 cache-busting query）確認：

- 總筆數與本機一致；
- 本批所有新名稱存在；
- 同名跨來源條目仍可區分；
- 熱門清單與多語映射沒有失效；
- repo 工作樹乾淨，`HEAD` 與遠端分支一致。

## 每批回報格式

回報應包含：

- 收錄名稱；
- 略過 slug／名稱與逐筆具體理由；
- 最新總筆數與型態統計；
- 驗證、GitHub Actions、Pages 與正式站結果；
- commit 連結。
