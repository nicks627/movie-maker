# Folder Rules: videokit

主要パスはこのファイルを基準に扱う。

## Core Paths

| Item | Path |
|------|------|
| Script data | `videokit/src/data/script.json` |
| Public assets | `videokit/public/` |
| Background videos | `videokit/public/assets/video/` |
| BGM | `videokit/public/assets/bgm/` |
| Images | `videokit/public/assets/images/` |
| Stock media | `videokit/public/assets/stock/` |
| Voice files | `videokit/public/voices/` |
| Avatar images | `videokit/public/avatars/` |
| Cut plan | `videokit/cut_plan.json` |
| Image prompts | `videokit/image_prompt.md` |

## Important Scripts

| Item | Path |
|------|------|
| Rights-aware asset fetch | `videokit/scripts/fetch-assets.mjs` |
| Review feedback apply | `videokit/scripts/apply-review-feedback.mjs` |
| Voice generation | `videokit/generate-voices.mjs` |
| Render script | `videokit/scripts/render-video.mjs` |

## Important Source Folders

| Item | Path |
|------|------|
| Template registry | `videokit/src/templates/index.ts` |
| Infographic components | `videokit/src/components/infographics/` |
| Editor adapters | `videokit/src/editor/template-adapters/` |
| Motion effect docs | `videokit/docs/motion-effect-templates.md` |
| Chart docs | `videokit/docs/investment-chart-templates.md` |
| Map docs | `videokit/docs/map-templates.md` |
| Audio direction docs | `videokit/docs/audio-direction-playbook.md` |
| Audio direction presets | `videokit/config/audio-direction-presets.json` |
| Review loop docs | `videokit/docs/review-feedback-loop.md` |
| Asset rights docs | `videokit/docs/rights-aware-asset-sources.md` |
| Template architecture | `videokit/docs/template-architecture.md` |
| Shared clip-video rules | `agent-rules/templates/clip-based-video.md` |

## Placement Rules

- generated voices は `public/voices/`
- avatars は `public/avatars/`
- reusable stock video は `public/assets/stock/`
- reusable still images は `public/assets/images/`
- BGM は `public/assets/bgm/`

## Short Video Default

- 新しい `short` 動画を作る場合、字幕は必ず縦動画専用の改行・サイズ計算を使う。
- `2 行表示` を維持しつつ、収まらない文はページ送りで処理する。
- 字幕サイズはロング動画の見た目をそのまま縮小せず、`1080x1920` 前提で再計算する。
- 初回 render 後に、少なくとも冒頭 5 秒の字幕見切れを確認してから完了扱いにする。
