# movie-maker

`movie-maker` は、動画制作ルールと動画生成アプリを 1 つにまとめた単一リポジトリです。

- ルールと運用: `agent-rules/`
- 生成アプリ本体: `videokit/`
- エージェント用の最小ルーター: `AGENTS.md`, `CLAUDE.md`, `GEMINI.md`

いまは以前の 2 repo 構成ではありません。  
GitHub に置く前提の正本は、この repo 全体です。

## テンプレート分類

この repo をエージェント経由で使うときは、最初に次の分類を決めます。

1. 解説動画
2. ゲーム実況
3. LINEチャット
4. 政治系
5. その他

## ルールとスキル

動画制作ルールの正本は `agent-rules/` です。

- `agent-rules/common/core.md`
  - 全テンプレート共通ルール
- `agent-rules/common/visual-system.md`
  - 視覚・演出・図版ルール
- `agent-rules/templates/*.md`
  - テンプレート別ルール
- `agent-rules/folders/videokit.md`
  - `videokit/` 配下のフォルダ規約

`AGENTS.md`, `CLAUDE.md`, `GEMINI.md` はこのルール群から生成される最小ルーターです。

また、`videokit/.agents/skills/remotion-best-practices/` と、その同等コピーである
`videokit/.agent/`, `videokit/.claude/`, `videokit/.codex/`, `videokit/.cursor/`, `videokit/.gemini/`
には、Remotion を使う各種エージェント向けの同梱スキルが入っています。

## 何が入っているか

- 動画テンプレート
  - 解説動画
  - ゲーム実況
  - LINEチャット
  - 政治系
  - その他
- サンプル script と案件別 script
  - `videokit/src/data/*.json`
- ジャンル別 playbook
  - `videokit/docs/playbooks/*.md`
- 共通素材
  - `videokit/public/assets/images`
  - `videokit/public/assets/stock`
  - `videokit/public/assets/imported`
  - `videokit/public/assets/bgm`
  - `videokit/public/assets/se`
  - `videokit/public/assets/video`
- 音声
  - 生成済み音声: `videokit/public/voices`
  - VOICEVOX Core 連携
  - AquesTalk 連携

## セットアップ

作業は repo root からでも `videokit/` からでもできますが、日常運用では repo root から始めるのがわかりやすいです。

### Windows

PowerShell で repo root から実行します。

```powershell
npm run setup:full
npm run doctor
npm run doctor:analysis
npm run doctor:assets
npm run dev:ui
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

`setup:full` は OS を判定して、次を自動で進めます。

- `videokit` の Node 依存導入
- `.venv` の準備
- `pykakasi` と `voicevox_core` の導入
- YouTube 分析 / gameplay 分析用 Python パッケージの導入
- VOICEVOX Core runtime / dict / models の準備
- `.env.local` の初期化
- 最後に `doctor`, `doctor:analysis`, `doctor:assets`

VOICEVOX Core の配布一覧と利用ガイド:

- [VOICEVOX Core releases](https://github.com/VOICEVOX/voicevox_core/releases)
- [VOICEVOX Core user guide](https://github.com/VOICEVOX/voicevox_core/blob/main/docs/guide/user/usage.md)

## 使い方

### 1. script を選ぶ

作業の起点は `videokit/src/data/script.json` です。  
既存案件を複製して始めるなら、同じディレクトリの `script-*.json` を参考にします。

ジャンルの作り方から入りたいときは、まず playbook を開きます。

```bash
npm run guide:genre -- --template explainer
npm run guide:genre -- --template gameplay
npm run guide:genre -- --template line-chat
npm run guide:genre -- --template political
npm run guide:genre -- --template generic
```

セットアップ直後に雛形を切るなら、まずこれを使います。

```bash
npm run new:project -- --template explainer --output src/data/script-explainer-starter.json --project-id starter-explainer --title "新しい解説動画"
npm run new:project -- --template gameplay --output src/data/script-gameplay-starter.json --project-id starter-gameplay --title "新しいゲーム実況動画"
npm run new:project -- --template line-chat --output src/data/script-line-chat-starter.json --project-id starter-line-chat --title "新しいLINEチャット動画"
npm run new:project -- --template political --output src/data/script-political-starter.json --project-id starter-political --title "新しい政治系動画"
npm run new:project -- --template generic --output src/data/script-generic-starter.json --project-id starter-generic --title "新しい動画"
```

### 2. 素材を置く

- 共通で再利用する素材: `videokit/public/assets/*`
- 作業中の受け皿:
  - `videokit/inputs/materials`
  - `videokit/inputs/scripts`
  - `videokit/inputs/gameplay`

### 3. プレビューする

repo root から:

```bash
npm run dev:ui
```

Remotion Studio を開く場合:

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

### 5. 事前確認して書き出す

```bash
npm run review:preflight -- --variant long
npm run render:long
```

必要に応じて:

```bash
npm run review:publish -- --variant long
npm run review:delivery -- --variant long
```

## 分析と素材収集

YouTube 参考動画の深掘り分析:

```bash
npm run analyze:youtube:deep -- --url "https://youtube.com/watch?v=xxxxxxxxxxx" --project-id reference-study --template explainer --sample-count 6
npm run analyze:youtube:compare -- --url "https://youtube.com/watch?v=aaaaaaaaaaa" --url "https://youtube.com/watch?v=bbbbbbbbbbb" --project-id reference-study --template political --sample-count 6
```

ゲーム実況分析:

```bash
npm run analyze:gameplay -- --input "./public/assets/video/sample.mp4" --reference-script "./notes/ref1.md" --reference-script "./notes/ref2.md"
```

素材収集:

```bash
npm run assets:fetch -- --source pixabay --type video --query "japan parliament night" --limit 5 --download
npm run assets:fetch -- --source pexels --type image --query "city skyline japan" --limit 5
```

API キーが必要な source は `doctor:assets` で確認できます。取得方法は [videokit/docs/api-key-setup.md](./videokit/docs/api-key-setup.md) にまとめています。

YouTube 分析の出力先:

- `videokit/projects/<project-id>/analysis/youtube/<video-id>/summary.json`
- `videokit/projects/<project-id>/analysis/youtube/<video-id>/layout-signals.json`
- `videokit/projects/<project-id>/analysis/youtube/<video-id>/audio-signals.json`
- `videokit/projects/<project-id>/analysis/youtube/<video-id>/structure-signals.json`
- `videokit/projects/<project-id>/analysis/youtube/analysis-summary.json`
- 複数本比較時: `videokit/projects/<project-id>/analysis/youtube/comparison/comparison-summary.json`

分析後に、この repo 向けの初期成果物へ変換するには:

```bash
npm run generate:from-analysis -- --template political --project-id reference-study
```

これで `projects/<project-id>/analysis/youtube/` に次が追加されます。

- `codex-analysis-report.md`
- `codex-analysis-brief.json`
- `layout-contract.json`
- `audio-direction-draft.json`
- `script-outline.json`
- `publish/youtube_metadata.md`
- `publish/thumbnail_prompt.md`
- `source/analysis-generated-script.json`

字幕 / popup / 背景の衝突確認は、生成後にこれを使います。

```bash
npm run review:layout
```

## 音声生成手段

### VOICEVOX Core

この repo の標準です。  
Windows / macOS の両方で使えるようにしてあり、`videokit/scripts/voicevox_core_bridge.py` と
`videokit/generate-voices.mjs` から呼び出します。

想定配置:

- `videokit/vendor/voicevox_core/onnxruntime/lib/*`
- `videokit/vendor/voicevox_core/dict/open_jtalk_dic_utf_8-1.11`
- `videokit/vendor/voicevox_core/models/vvms`

### AquesTalk

`videokit/scripts/aquestalk_bridge.py` から使う補助ルートです。  
同梱している `AquesTalkPlayer.exe` ベースのため、実運用は Windows ローカル向けです。  
macOS では VOICEVOX Core を標準にしてください。

## ローカル専用ディレクトリ

次は GitHub に持ち込まない前提です。

- `videokit/projects/`
- `videokit/inputs/gameplay/`
- `videokit/.venv/`
- `videokit/vendor/voicevox_core/`
- `videokit/tools/aquestalkplayer/`

## 詳細

動画生成アプリの詳しい運用は [videokit/README.md](./videokit/README.md) を見てください。
