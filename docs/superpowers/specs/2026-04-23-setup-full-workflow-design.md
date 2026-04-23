# Setup Full Workflow Design

## Goal

`movie-maker` を新しい PC に持っていった直後に、次の 3 つが迷わず始められる状態を作る。

1. 任意ジャンルの動画を雛形から作り始める
2. YouTube 動画の分析を実行する
3. 動画素材の収集を実行する

このために、手動で長い README を読まなくても進められる共通入口として `setup:full` を追加する。

## Chosen Approach

採用するのは `starter + doctor + setup extras` 方式。

- `setup:full`
  - 基本セットアップと追加依存の導入をまとめて実行する
- `doctor`
  - 動画制作の基本環境を検査する
- `doctor:analysis`
  - YouTube 分析と gameplay 分析の依存を検査する
- `doctor:assets`
  - 素材取得用の API キーと保存先を検査する
- `new:project`
  - ジャンル別の雛形を作る

この形なら、既存の `videokit` スクリプトを活かしつつ、Windows と macOS の差分も 1 つの入口で吸収できる。

## Non-Goals

今回の範囲に含めないもの:

- すべての外部サービス API キーの自動発行
- YouTube 分析や素材取得の完全無人化
- 既存 editor / render / analysis ロジックの全面リファクタ
- 既存 lint エラーの解消

API キーや外部規約同意が必要な部分は、`doctor:*` で不足を表示して次の手順を案内する。

## User-Facing Commands

repo root に次のコマンドを追加する。

- `npm run setup:full`
- `npm run doctor`
- `npm run doctor:analysis`
- `npm run doctor:assets`
- `npm run new:project -- --template explainer`
- `npm run new:project -- --template gameplay`
- `npm run new:project -- --template line-chat`
- `npm run new:project -- --template political`
- `npm run new:project -- --template generic`

`videokit/` 側にも同名または対応する内部コマンドを持たせ、root からは `npm --prefix videokit ...` で呼び出す。

## Template Coverage

`new:project` が扱うテンプレートは次の 5 種とする。

- `explainer`
  - `src/data/explainer.sample.json` ベース
- `gameplay`
  - `src/data/gameplay-commentary.sample.json` ベース
- `line-chat`
  - `src/data/line-chat.sample.json` ベース
- `political`
  - `src/data/explainer.sample.json` をベースに、project id / title / template metadata を政治系向けに初期化
- `generic`
  - `src/data/script.json` に近い最小構成の汎用初期値

出力は次の 2 モードを持つ。

- 既定:
  - `src/data/script.json` を置き換える
- 任意:
  - `--output src/data/script-<slug>.json`

さらに `projects/<project-id>/publish/` に次の初期ファイルを自動生成する。

- `youtube_metadata.md`
- `thumbnail_prompt.md`

## Architecture

### 1. Setup Orchestrator

追加ファイル:

- `videokit/scripts/setup-full.mjs`

役割:

- OS 判定
- 既存 bootstrap の再利用
- 分析依存の導入
- 素材取得依存の案内と初期化
- 最後に `doctor`, `doctor:analysis`, `doctor:assets` を実行

動作:

- Windows
  - 既存の `scripts/bootstrap-local.ps1` を呼ぶ
  - 追加で analysis 用 Python パッケージを入れる
  - 追加で素材取得用 `.env.local` テンプレートを整える
- macOS
  - `npm install`
  - `.venv` 作成
  - `pip install` で `pykakasi`, `voicevox_core`, `yt-dlp`, `opencv-python`, `easyocr`, `faster-whisper`, `scenedetect[opencv]` を導入
  - `download-osx-arm64` または `download-osx-x64` を取得して VOICEVOX Core assets を導入
  - 必須ディレクトリを作る

### 2. Doctor Commands

追加ファイル:

- `videokit/scripts/doctor-analysis.mjs`
- `videokit/scripts/doctor-assets.mjs`

`doctor`:

- 既存 `setup.mjs` を doctor として使う

`doctor:analysis`:

- Python interpreter の解決
- `yt_dlp`
- `cv2`
- `easyocr`
- `faster_whisper`
- `scenedetect`
- `ffmpeg`
- `ffprobe`
- bridge script の存在

`doctor:assets`:

- `config/asset-source-registry.json` の存在
- 素材保存先ディレクトリの存在
- `PIXABAY_API_KEY` など registry に対応する env の有無
- `public/assets/imported` の書き込み先
- `.env.local` の存在

出力は、人が読むテキストに加えて、将来的にエージェントが解釈しやすい JSON も選べる形にする。

## Setup Skill

追加ファイル:

- `videokit/.codex/skills/project-setup/SKILL.md`
- `videokit/.agents/skills/project-setup/SKILL.md`
- 必要に応じて `.agent`, `.claude`, `.cursor`, `.gemini` に同内容をミラー

役割:

- 新 PC でこの repo を使うときは、まず `npm run setup:full` を実行する
- その後に `doctor:*` を確認する
- その後に `new:project` でジャンル別雛形を作る

既存の Remotion 系 skill 配置と同じ並びにして、各エージェントが repo ローカル skill として見つけやすい形を優先する。

## Data Flow

### Setup Flow

1. root の `npm run setup:full`
2. `videokit/scripts/setup-full.mjs`
3. OS ごとの導入処理
4. `.env.local` と必須ディレクトリの初期化
5. `doctor`
6. `doctor:analysis`
7. `doctor:assets`
8. 結果を標準出力に要約

### Project Starter Flow

1. `npm run new:project -- --template <type> --project-id <slug> --title <title>`
2. sample JSON を読み込む
3. `project.id`, `project.title`, 初期 variant を更新
4. `script.json` または指定 output に書く
5. `projects/<project-id>/publish/` に初期 metadata を作る
6. 必要なら `projects/<project-id>/source/script.snapshot.json` を置く

### Analysis Flow

`analyze-youtube.mjs` と `analyze-gameplay.mjs` のロジック自体は維持し、setup 側は「依存が揃っている状態」を作る責任に限定する。

## Error Handling

### Setup

- 導入失敗時は、失敗した手順、コマンド、次の手動手順を表示する
- API キー未設定は warning 扱いにし、setup 全体は失敗にしない
- VOICEVOX downloader の失敗は音声生成不可なので error 扱い

### Doctor

- `doctor` は pass / warning / error の 3 段階
- `doctor:analysis` は不足パッケージを個別表示する
- `doctor:assets` は source ごとに ready / missing-env / missing-dir を表示する

### Starter

- 不明 template 指定は即 error
- 既存 `script.json` 上書き時は `--force` が必要
- `--output` 指定時は parent directory を自動生成する

## README Changes

README には次を追加または更新する。

- 最初の入口は `npm run setup:full`
- Windows / macOS の違いは setup 内で吸収すること
- 追加依存が必要な理由
- `doctor:*` の見方
- `new:project` の具体例
- YouTube 分析の実行例
- 素材取得の実行例
- どこまで自動で、どこから API キー設定が必要か

## Testing Strategy

最低限の検証:

1. Windows で `npm run setup:full` の dry run 相当を確認
2. 既存環境で `npm run doctor`
3. 既存環境で `npm run doctor:analysis`
4. 既存環境で `npm run doctor:assets`
5. `npm run new:project -- --template line-chat --output src/data/script-line-chat-starter.json`
6. `npm run new:project -- --template gameplay --output src/data/script-gameplay-starter.json`

今回の実装では、新規ロジックに focused test を入れるより、CLI の実行検証を優先する。

## Risks

- macOS の Python 3.11 前提が環境によって崩れる可能性
- `easyocr` や `faster-whisper` の導入時間が長い
- 素材取得は API キー依存なので、setup 完了と ready 状態が一致しないことがある
- repo 内に local skill を複数ミラーすると管理コストが増える

## Decisions To Lock

- `setup:full` は API キー未設定でも完走させる
- `doctor:*` は不足を詳細に表示する
- `new:project` は 5 テンプレートを標準搭載する
- setup skill は repo ローカル skill として持つ
- YouTube 分析と素材取得の本体ロジックは既存スクリプトを再利用する

## Self-Review

確認済み:

- `setup:full`, `doctor:*`, `new:project`, skill 追加の責務が重複していない
- API キー未設定時の扱いを明示した
- OS ごとの差分と共通入口を両方書いた
- 実装対象を 5 本に絞り、既存 lint 修正などの別問題を非対象に切り分けた
