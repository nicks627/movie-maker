# VideoKit

`videokit` は、この repo に同梱されている動画制作アプリ本体です。  
`Remotion + React + Vite` を使って、`script.json` ベースで動画を組み立てます。

## できること

- 解説動画の制作
- ゲーム実況動画の制作
- LINE チャット動画の制作
- VOICEVOX Core / AquesTalk によるローカル音声生成
- BGM / SE / 背景動画 / 図版 / 立ち絵の差し替え
- YouTube 参考動画の分析
- ゲームプレイ動画の分析とコメント台本生成
- ジャンル別 playbook の参照
- 参考動画分析からの script / metadata / thumbnail 下書き生成

repo 全体の使い方はひとつ上の [../README.md](../README.md) を見てください。  
ここでは `videokit/` の中で何を触るかに絞って説明します。

## ディレクトリの見方

- `src/data/`
  - `script.json` と案件別の `script-*.json`
- `public/assets/`
  - 共通素材置き場
- `public/voices/`
  - 生成済み音声
- `inputs/`
  - 作業中の持ち込み素材
- `projects/`
  - render / review / publish のローカル出力
- `scripts/`
  - 分析、音声生成、review、render 用スクリプト
- `docs/`
  - 運用メモと補助プレイブック

## ルールとスキル

動画制作ルールの正本は repo root の `agent-rules/` です。  
`videokit/` 側には、Remotion 系のエージェントスキルを各ツール向けに同梱しています。

- `.agents/skills/remotion-best-practices/`
- `.agent/skills/remotion-best-practices/`
- `.claude/skills/remotion-best-practices/`
- `.codex/skills/remotion-best-practices/`
- `.cursor/skills/remotion-best-practices/`
- `.gemini/skills/remotion-best-practices/`

## セットアップ

### Windows

`videokit/` で次を実行します。

```powershell
npm run setup:full
npm run doctor
npm run doctor:analysis
npm run doctor:assets
npm run dev:ui
```

必要に応じて Remotion Studio:

```powershell
npm run dev
```

### macOS

macOS でも入口は同じです。

```bash
npm run setup:full
npm run doctor
npm run doctor:analysis
npm run doctor:assets
npm run dev:ui
```

`setup:full` は、Node 依存、Python venv、VOICEVOX Core、analysis 用パッケージ、`.env.local` の初期化までまとめて実行します。

VOICEVOX Core の公式情報:

- [VOICEVOX Core releases](https://github.com/VOICEVOX/voicevox_core/releases)
- [VOICEVOX Core user guide](https://github.com/VOICEVOX/voicevox_core/blob/main/docs/guide/user/usage.md)

`.env.local` で上書きできる主な項目:

- `PYTHON_BIN`
- `VOICEVOX_CORE_ROOT`
- `FFMPEG_PATH`
- `FFPROBE_PATH`

## 動画制作の流れ

### 1. 台本を決める

基準ファイルは `src/data/script.json` です。  
既存案件から始める場合は `src/data/script-*.json` を複製して流用します。

ジャンルの作り方から確認したいとき:

```bash
npm run guide:genre -- --template explainer
npm run guide:genre -- --template gameplay
npm run guide:genre -- --template line-chat
npm run guide:genre -- --template political
npm run guide:genre -- --template generic
```

雛形を切るには次を使います。

```bash
npm run new:project -- --template explainer --output src/data/script-explainer-starter.json --project-id starter-explainer
npm run new:project -- --template gameplay --output src/data/script-gameplay-starter.json --project-id starter-gameplay
npm run new:project -- --template line-chat --output src/data/script-line-chat-starter.json --project-id starter-line-chat
npm run new:project -- --template political --output src/data/script-political-starter.json --project-id starter-political
npm run new:project -- --template generic --output src/data/script-generic-starter.json --project-id starter-generic
```

### 2. 素材を置く

共有素材:

- `public/assets/images`
- `public/assets/stock`
- `public/assets/imported`
- `public/assets/bgm`
- `public/assets/se`
- `public/assets/video`

持ち込み素材の作業場:

- `inputs/materials`
- `inputs/scripts`
- `inputs/gameplay`

### 3. プレビューする

独自 UI:

```bash
npm run dev:ui
```

Remotion Studio:

```bash
npm run dev
```

### 4. 音声を生成する

長尺:

```bash
npm run generate:voices
```

ショート:

```bash
npm run generate:voices:short
```

### 5. review して render する

```bash
npm run review:preflight -- --variant long
npm run render:long
```

必要に応じて:

```bash
npm run review:publish -- --variant long
npm run review:delivery -- --variant long
```

### 6. 長尺からショートを作る

```bash
npm run make:short
npm run generate:voices:short
npm run review:preflight -- --variant short
npm run render:short
```

`make:short:lead`, `make:short:summary`, `make:short:trim` も使えます。

## 音声生成手段

### VOICEVOX Core

標準ルートです。  
`generate-voices.mjs` が speaker 設定を見て `scripts/voicevox_core_bridge.py` を呼びます。

必要なもの:

- Python 3.11
- `pykakasi`
- `voicevox_core` Python wheel
- `vendor/voicevox_core` の runtime / dict / models

期待パス:

- `vendor/voicevox_core/onnxruntime/lib`
- `vendor/voicevox_core/dict/open_jtalk_dic_utf_8-1.11`
- `vendor/voicevox_core/models/vvms`

### AquesTalk

補助ルートです。  
`scripts/aquestalk_bridge.py` から `tools/aquestalkplayer/aquestalkplayer/AquesTalkPlayer.exe` を使います。

- 実運用は Windows 向け
- macOS では標準にしない
- 既存の `reimu`, `marisa` などの speaker で利用

## よく使うコマンド

```bash
npm run doctor
npm run guide:genre -- --template political
npm run dev:ui
npm run dev
npm run generate:voices
npm run review:preflight -- --variant long
npm run review:layout
npm run render:long
npm run render:short
npm run analyze:youtube:deep -- --url "https://youtube.com/watch?v=xxxxxxxxxxx" --project-id reference-study --template explainer
npm run analyze:youtube:compare -- --url "https://youtube.com/watch?v=aaaaaaaaaaa" --url "https://youtube.com/watch?v=bbbbbbbbbbb" --project-id reference-study --template political
npm run generate:from-analysis -- --template political --project-id reference-study
npm run analyze:gameplay -- --input "./public/assets/video/sample.mp4"
npm run assets:fetch -- --source pixabay --type video --query "night city japan" --limit 5 --download
```

## 参考動画分析ワークフロー

1. `npm run guide:genre -- --template <type>` で playbook を開く
2. `npm run analyze:youtube:deep` または `npm run analyze:youtube:compare`
3. `projects/<project-id>/analysis/youtube/` の `summary.json`, `layout-signals.json`, `audio-signals.json`, `structure-signals.json` を確認する
4. `npm run generate:from-analysis -- --template <type> --project-id <id>`
5. `npm run review:layout`
6. `npm run review:preflight -- --variant long`

`audio-signals.json` には narration 密度だけでなく、BGM の役割候補、SE の打ち方、無音窓、impact cue も入ります。  
`structure-signals.json` には hook / ending / thirds 分布が入り、`layout-signals.json` には subtitle / popup / 背景の使い方を寄せるための示唆が入ります。

## ローカル専用

次は GitHub に含めない前提です。

- `projects/`
- `inputs/gameplay/`
- `.venv/`
- `vendor/voicevox_core/`
- `tools/aquestalkplayer/`

repo の配置方針は [docs/repository-management.md](./docs/repository-management.md) を見てください。

API キー取得方法は [docs/api-key-setup.md](./docs/api-key-setup.md) を見てください。
