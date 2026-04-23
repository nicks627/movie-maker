# Image Prompts — キーエンス解説動画（ショート）

## フォルダ構成
- 生成した画像の保存先: `videokit/public/assets/images/`
- ストック動画: `videokit/public/assets/stock/`
- BGM: `videokit/public/assets/bgm/`

---

## 共通デザインルール（必ず守ること）

### サイズ・比率
- **出力サイズ**: 1920×1060px（横長 16:9）
- 動画内では幅約1026px・高さ約567pxに縮小表示される前提で設計する

### 文字サイズの最低基準
| 役割 | 最低フォントサイズ（出力時） | 動画内での実効サイズ |
|------|--------------------------|------------------|
| メイン数値・キーワード | 200px 以上 | 約110px 以上 |
| 見出し・ラベル | 100px 以上 | 約55px 以上 |
| 補足テキスト | 75px 以上 | 約41px 以上 |

### デザイン原則
- **1画面に要素は最大4つ**（それ以上は詰め込まない）
- **背景**: 純黒 #000000 または 深いネイビー #020617
- **メインアクセント**: シアン #38bdf8 または 黄色 #facc15 を1色のみ
- **コントラスト**: 白または明るい色のテキストを暗い背景に（可読性最優先）
- **余白**: 四辺に最低100px以上の余白
- **装飾は最小限**に（グラデーション・影・ボーダーは1種類まで）

---

## image_001: margin_comparison_chart ✅ 作成済み

Suggested filename: `image_001.png`
Scene reference: scene_02

---

## image_002: direct_sales_model ✅ 作成済み

Suggested filename: `image_002.png`
Scene reference: scene_04b

---

## image_003: patent_strategy_chart ✅ 作成済み

Suggested filename: `image_003.png`
Scene reference: scene_06b

---

## image_004: profit_rate_impact ✅ 作成済み

Suggested filename: `image_004.png`
Scene reference: scene_01

---

## image_005: keyence_stats_card ✅ 作成済み

Suggested filename: `image_005.png`
Scene reference: scene_03

---

## image_006: fa_overview_diagram ✅ 作成済み

Suggested filename: `image_006.png`
Scene reference: scene_04a

---

## image_007: direct_sales_comparison ✅ 作成済み

Suggested filename: `image_007.png`
Scene reference: scene_05a

---

## image_008: zero_margin_impact ✅ 作成済み

Suggested filename: `image_008.png`
Scene reference: scene_05b

---

## image_009: ai_x_fa_poster ✅ 作成済み

Suggested filename: `image_009.png`
Scene reference: scene_07a

---

## image_010: summary_card ✅ 作成済み

Suggested filename: `image_010.png`
Scene reference: scene_08

---

## image_011: patent_count_vs_value（新規）

**目的**: 特許「数」vs「1件の価値」のギャップを視覚的に対比させる

Dark navy background #020617. Two-panel layout side by side:

LEFT panel — "特許の数（件数ランキング）":
  Simple horizontal bar chart, 4 bars:
  - "キャノン" — long bar (light gray), value label "5,000件+"
  - "パナソニック" — medium-long bar (light gray), value label "4,000件+"
  - "三菱電機" — medium bar (light gray), value label "3,500件+"
  - "キーエンス" — very short bar (red/orange #ef4444), value label "少ない"
  LEFT panel header: "❌ 特許の数" in red #ef4444, bold, 90px

RIGHT panel — "特許1件あたりの価値":
  Simple horizontal bar chart, 4 bars in reverse order:
  - "キーエンス" — very long bar (cyan #38bdf8, glowing), value label "高い"
  - Others — short bars (light gray), no specific value
  RIGHT panel header: "✅ 1件の価値" in cyan #38bdf8, bold, 90px

Center divider: thin vertical line.
Bottom tagline: "「量より質」の特許戦略" — white bold, 80px, centered.
All bar labels: white, bold, 75px.

Suggested filename: `image_011.png`
Scene reference: scene_06a — "特許の話も面白いのだ。"

---

## image_012: semiconductor_inspection（新規）

**目的**: AI半導体検査という具体的な用途をひと目で伝える

Dark navy background #020617. Centered layout, 3 elements:

1. Top header: "AI半導体 × 検査装置" — white bold, 110px. "×" in cyan #38bdf8.

2. Center: simple diagram showing a flow:
   [AI半導体チップ icon] → (magnifying glass / scan beam icon) → [✓ 合格品]
   Icons are large (180px), white line art on dark background.
   Arrow between icons: thick cyan #38bdf8 horizontal arrow.
   Labels under each icon: "製品" / "キーエンス検査装置" / "出荷", white 70px.

3. Bottom: "次世代AIを支える縁の下の力持ち" — light gray #94a3b8, 70px, italic.

No other decoration. Very bold, high contrast.

Suggested filename: `image_012.png`
Scene reference: scene_07b — "AI半導体の製造に欠かせない検査装置を作ってるんだから。"
