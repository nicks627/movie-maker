# Visual System Rules

Remotion の既存機能と再利用テンプレートを優先して使う。

## Scene Transitions

`scene.transition`

| type | effect |
|------|--------|
| `dissolve` | fade in/out |
| `wipe` | directional reveal |
| `slide` | slide in from direction |
| `push` | push previous scene out |
| `zoom` | scale in/out with fade |
| `glitch` | RGB split + contrast glitch |
| `blur` | blur / focus transition |
| `flash` | bright flash cut |
| `iris` | circular open / close |
| `split` | shutter-style split reveal |
| `spin` | rotate while switching |

## Popup Effects

`scene.popups[].effect`

| type | effect |
|------|--------|
| `fadeIn` / `fadeOut` | opacity tween |
| `slideIn` | slide from direction |
| `zoom` | scale from `startScale` to `endScale` |
| `blur` | blur dissolve in |
| `flash` | white/color flash |
| `wipe` | directional clip-path reveal |
| `pulse` | pulse / heartbeat emphasis |
| `ripple` | center-out ripple / wave |
| `float` | gentle floating motion |
| `bounce` | small bounce motion |
| `swing` | pendulum-like swing |
| `orbit` | subtle circular orbit |
| `glitch` | jitter + RGB split |
| `spin` | spin-in entrance |
| `drift` | slow directional drift |
| `spotlight` | center spotlight reveal |
| `chromatic` | chromatic split |

主要パラメータ:

- `duration`
- `intensity`
- `frequency`
- `direction`
- `startScale` / `endScale`
- `blurAmount`
- `color`
- `secondaryColor`
- `rotation`

## Reusable Popup Components

`scene.popups[].component` で使う。infographic と animation の両レジストリが統合されているので同じフィールドで指定できる。

### Infographic (データ可視化)

- `ImpactNumber` — 大きな数値インパクト表示
- `StatsCard` — 統計カード
- `IconGrid` — アイコングリッド
- `TwoColumnComparison` — 2カラム比較
- `BarChart` — 棒グラフ
- `FlowDiagram` — フロー図
- `BulletList` — 箇条書き
- `PosterCard` — カード表示
- `DirectSalesComparison` / `DirectSalesMapZoom` — 営業比較・地図ズーム
- `StockLineChart` / `CandlestickChart` / `AllocationDonutChart` — 株・配分
- `GeoPoliticalMap` / `OrbitalMapZoom` — 地政学・軌道ズーム

### Animation (演出・テキスト)

| component | 用途 | 主要 props |
|-----------|------|-----------|
| `KineticText` | 単語ごとスプリング文字アニメ | `text`, `style`(`bounce`/`wave`/`pop`/`cascade`/`char-bounce`), `fontSize`, `accentColor` |
| `Typewriter` | カーソル付きタイプライター | `text`, `style`(`default`/`terminal`/`redacted`/`subtitle`), `framesPerChar` |
| `CountUp` | 数値カウントアップ | `from`, `to`, `prefix`, `suffix`, `separateThousands` |
| `LowerThird` | ロワーサード（話者名テロップ） | `title`, `subtitle`, `tag`, `accentColor`, `style`(`modern`/`minimal`/`bold`/`broadcast`) |
| `ParticleBurst` | 放射状パーティクル祝福エフェクト | `count`, `originX`, `originY`, `colors`, `speed` |
| `FilmGrain` | フィルムグレイン（popup単体利用） | `opacity`, `frequency` |
| `Vignette` | ビネット（popup単体利用） | `intensity`, `color`, `shape`, `softness` |
| `ColorGrade` | カラーグレーディング（popup単体利用） | `preset`(`cinematic`/`warm`/`cold`/`vibrant`/`muted`/`retro`/`neon`/`horror`) |

## Scene-Level Effects (`sceneEffect`)

シーン単位で映像全体に適用するシネマティックエフェクト。`scene.popups` ではなく `scene.sceneEffect` に指定する。

```json
{
  "sceneEffect": {
    "filmGrain":   { "opacity": 0.07, "frequency": 0.8 },
    "vignette":    { "intensity": 0.55, "color": "#000000", "shape": "ellipse" },
    "colorGrade":  { "preset": "cinematic", "intensity": 1.0 },
    "cameraShake": { "intensity": 0.6, "speed": 1.2 }
  }
}
```

| フィールド | 効果 |
|---|---|
| `filmGrain` | SVG feTurbulence で毎フレーム変化するフィルム粒子 |
| `vignette` | 画面周辺を暗くするシネマティックビネット |
| `colorGrade` | blend-mode オーバーレイによる色調補正 |
| `cameraShake` | 複数 sin 波による有機的なカメラシェイク |

**ゲーム実況での推奨設定:**
```json
{ "cameraShake": { "intensity": 0.7, "speed": 1.5 } }
```

**映画的な解説動画での推奨設定:**
```json
{
  "filmGrain":  { "opacity": 0.05 },
  "vignette":   { "intensity": 0.45 },
  "colorGrade": { "preset": "cinematic" }
}
```

## Rule of Thumb

- 静止 PNG を作る前に、既存 popup component で表現できないか必ず確認する。
- 数値、比較、流れ、地図、株価、勢力図は infographic テンプレートを優先する。
- テキスト演出には `KineticText` / `Typewriter` / `CountUp` を使う。
- ロワーサードには `LowerThird` を使う（ゲーム実況では `GameplayLowerThird` が自動使用される）。
- 映像全体の質感向上には `sceneEffect` を使う。
- 詳細サンプルは `videokit/docs/` 配下を参照する。
