#!/usr/bin/env python3
"""檢查工具型態；預設只報告，加入 ``--apply`` 才會寫回資料。"""
import argparse
import json
from collections import Counter
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
DATA = ROOT / "data"
PLUGIN_FILES = {"red-giant.jsonl", "universe.jsonl", "sapphire.jsonl", "continuum.jsonl"}
SCRIPT_CATS = {"workflow", "rigging", "expression", "render", "utility"}
SCRIPT_WORDS = ("腳本", "script", "panel", "面板", "workflow", "工作流程", "automation", "自動化", "批次", "batch", "project", "專案", "layer manager", "圖層管理", "keyframe tool", "關鍵影格工具", "extension", "擴充功能", "dockable", "jsx", "cep panel")
PLUGIN_WORDS = ("外掛", "plugin", "plug-in", "effect", "濾鏡", "filter", ".aex", "gpu accelerated", "shader", "生成器", "generator", "transition plugin", "轉場外掛")

# 這些廠商在資料庫中的收錄項目都是原生外掛。aescripts 上「效果」也常被
# 文案稱為 animation/tool，不能只靠關鍵字把它們降成腳本。
PLUGIN_ONLY_VENDORS = {"Digital Anarchy", "FxFactory", "RE:Vision Effects", "Rowbyte", "Superluminal"}

# 官方頁、安裝說明或檔案格式已逐筆確認的例外。混合式工具以主要介面判定：
# CEP／ScriptUI 面板仍歸 script；可從 Effect 選單套用的原生模組歸 plugin。
KIND_OVERRIDES = {
    "AfterCodecs": "plugin",
    "Auto Crop 3": "plugin",
    "AE Fusion 3D Bridge": "script",
    "AutoTargetUI": "script",
    "UI Mockup Builder": "script",
    "BAO Boa": "plugin",
    "BAO Bones": "plugin",
    "BAO Joint": "plugin",
    "BAO Layer Sculptor": "plugin",
    "BAO Mask 3D Warper": "plugin",
    "BAO Mask Avenger 2": "plugin",
    "Blob it!": "script",
    "Bowl Wobble": "script",
    "Change Default Easing for After Effects": "script",
    "ColorVSN": "plugin",
    "Depth Scanner 2": "plugin",
    "EZ3D": "script",
    "Face Swapper": "plugin",
    "Fixel DeLightIT 2": "plugin",
    "Fixel EdgeHancer 3": "plugin",
    "Fixel LightIT 2": "plugin",
    "Fluid": "plugin",
    "FoldLayers": "plugin",
    "Fluxion Warp": "plugin",
    "Fractal Noise 3D v2": "plugin",
    "Glaze": "plugin",
    "GPUResize": "plugin",
    "GlyphForge": "script",
    "Hacksaw": "plugin",
    "Holora": "plugin",
    "Influx": "plugin",
    "Interlaced Glitch": "plugin",
    "Island Chatter": "plugin",
    "Jlitch": "plugin",
    "LayerRender": "plugin",
    "loopFlow": "plugin",
    "MeltFlow Blur": "plugin",
    "NatuRamp": "plugin",
    "Newton 4": "plugin",
    "Paint & Stick 2": "plugin",
    "PathSmear": "plugin",
    "Pixel Melt": "plugin",
    "Pixelocybe": "plugin",
    "Pixion": "plugin",
    "Pixy Halftone": "plugin",
    "Plumebus": "plugin",
    "Power Cylinder": "plugin",
    "Power Hyperboloid": "plugin",
    "Ray Projector": "plugin",
    "Reflow": "plugin",
    "ReScanX": "plugin",
    "Risograph": "plugin",
    "SRT Importer for AE": "script",
    "SRT Converter": "script",
    "Spiral Master": "script",
    "Text Auto Generator": "script",
    "Overshoot and Bounce Lite": "script",
    "TransLayerGen": "script",
    "Auto Transition": "script",
    "CenterAlign2Comp": "script",
    "Parallax Controls": "script",
    "RTTTL Tone Converter": "script",
    "Shapepath Select and Addkey": "script",
    "Salis_PathEditor": "script",
    "Salis LayerMaster": "script",
    "MixFont": "script",
    "Color Palette": "script",
    "Mirror Positions": "script",
    "Cache Monitor": "script",
    "AlignKit": "script",
    "Binzii_FastEase!": "script",
    "Comp Changer": "script",
    "YTTS2MK": "script",
    "ひらがなだけを小さくするスクリプト": "script",
    "涙目うるうる表現の半自動化スクリプト": "script",
    "ペアレントくん": "script",
    "Copy Kun": "script",
    "Insert Keyframes": "script",
    "ランダム配置": "script",
    "Calculator": "script",
    "Salis_OpenCompSettings": "script",
    "ys_TextAnMaka": "script",
    "Randomizer": "script",
    "CompMaster": "script",
    "MojiMixer": "script",
    "Paralign": "script",
    "Build Importer v6": "script",
    "Proxy Manager v2": "script",
    "FrameGrid": "script",
    "CreateCompMask": "script",
    "Effects Switch": "script",
    "Layer Follower": "script",
    "Time Modifier": "script",
    "Audio Sync": "script",
    "Script Performance": "script",
    "MotionBlur All": "script",
    "1A2B": "script",
    "Auto Fader": "script",
    "Explode Layer": "script",
    "RplSolidName": "script",
    "RplFont": "script",
    "RplCompDur": "script",
    "RplCompName": "script",
    "Auto Swing": "script",
    "Simple Set Parent": "script",
    "Reverse Shape Path": "script",
    "Add Props to Essential Graphics": "script",
    "Layer Name Changer": "script",
    "Scale to Slider": "script",
    "Totonoe Skin Retouch": "plugin",
    "AE To Blender Velocity Tools": "script",
    "任意の回数ループアニメーション": "script",
    "Multiframe 100 to 0 Strobe": "script",
    "HoTo Movie Color Palette": "script",
    "Sound Panel": "script",
    "Stroke Outline": "plugin",
    "CropPlus": "plugin",
    "StarSpikes Pro": "plugin",
    "GlassRain": "plugin",
    "Pro Line Extract": "plugin",
    "Inner Glow Plus": "plugin",
    "Fadio": "script",
    "imp&comp ver2.5": "script",
    "ツールアシストセット": "script",
    "SolidEffects": "script",
    "S_tools_EffectSearcher": "script",
    "Layer Switcher": "script",
    "Additional Transform": "script",
    "Cleanup!": "script",
    "Swap Two Selected Layers Source": "script",
    "Easy Fader": "script",
    "Nulltilities": "script",
    "Generate Puppet Rig": "script",
    "アンダーライン引きmuscle": "script",
    "自動ファイル作成スクリプト": "script",
    "ばらばらに出現・消滅": "script",
    "マスクパスの上に画像が動け！": "script",
    "フォルダにある素材のリネーム": "script",
    "レイヤーの状態覚えておいてscript": "script",
    "簡易版レイヤーリネーム": "script",
    "簡単なWiggle制御": "script",
    "Auto-tress and mask layer auto-detection": "script",
    "シェイプレイヤーのGroupを個別レイヤーに分離": "script",
    "Position and Scale Key ConfirmationScript": "script",
    "コンポ差し替え": "script",
    "3Dレイヤー選択→プリコンポしてメッシュワープ": "script",
    "JapyTextEngine": "plugin",
    "シェイプを横移動させるだけの仕組みセット": "script",
    "SmartImport": "script",
    "Salis_OpenFileLocation": "script",
    "8Bit PixCam": "plugin",
    "moji_marker_cut": "script",
    "TextAnimator": "script",
    "カットナンバー増分スクリプト": "script",
    "StairTrim": "script",
    "NGS_EaseCraft": "script",
    "BPMc": "script",
    "MojiFlow": "script",
    "Cyberpunk One-Click Filter": "script",
    "Color Shifter": "script",
    "ぶんつむ": "script",
    "アニメの撮影用ツール": "script",
    "Transition Master 2 Basic / Pro": "plugin",
    "XDoG Studio": "plugin",
    "Fake3D Box": "script",
}

def classify(filename, row):
    if filename == "recipes.jsonl" or row.get("cat") == "recipe" or row.get("stack"):
        return "recipe"
    if filename == "builtin-ae.jsonl" or "helpx.adobe.com" in row.get("url", ""):
        return "builtin"
    if filename in PLUGIN_FILES or row.get("aex"):
        return "plugin"
    if row.get("name") in KIND_OVERRIDES:
        return KIND_OVERRIDES[row["name"]]
    if row.get("vendor") in PLUGIN_ONLY_VENDORS:
        return "plugin"
    text = " ".join([row.get("name", ""), row.get("desc", ""), row.get("cat", ""), row.get("vendor", ""), row.get("suite", ""), " ".join(row.get("tags", []))]).lower()
    script_score = sum(word in text for word in SCRIPT_WORDS)
    plugin_score = sum(word in text for word in PLUGIN_WORDS)
    if row.get("cat") in SCRIPT_CATS:
        script_score += 2
    if row.get("unverified") and not row.get("aex"):
        script_score += 1
    return "script" if script_score > plugin_score else "plugin"

def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument(
        "--apply",
        action="store_true",
        help="套用建議型態；未指定時只列出差異，不修改檔案",
    )
    args = parser.parse_args()
    counts = Counter()
    changed = 0
    suggestions = []
    for path in sorted(DATA.glob("*.jsonl")):
        rows = []
        file_changed = False
        for line in path.read_text(encoding="utf-8").splitlines():
            row = json.loads(line)
            kind = classify(path.name, row)
            if row.get("kind") != kind:
                changed += 1
                suggestions.append((path.name, row.get("name", ""), row.get("kind"), kind))
                if args.apply:
                    row["kind"] = kind
                    file_changed = True
            ordered = {}
            for key in ("name", "suite", "vendor", "kind", "cat", "tags", "desc", "look", "variants", "stack", "builtin", "url", "unverified", "aex"):
                if key in row:
                    ordered[key] = row[key]
            ordered.update({k: v for k, v in row.items() if k not in ordered})
            rows.append(ordered)
            counts[kind] += 1
        if args.apply and file_changed:
            path.write_text("".join(json.dumps(r, ensure_ascii=False) + "\n" for r in rows), encoding="utf-8", newline="\n")
    action = "updated" if args.apply else "suggested"
    print(f"{action} {changed} entries")
    for filename, name, old, new in suggestions:
        print(f"{filename}: {name}: {old} -> {new}")
    for kind in ("plugin", "script", "builtin", "recipe"):
        print(f"{kind}: {counts[kind]}")

if __name__ == "__main__":
    main()
