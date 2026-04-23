# Genre Playbooks and Deep YouTube Analysis Design

## Goal

`movie-maker` を、次の 2 つを一貫して扱える repo にする。

1. `解説動画 / ゲーム実況 / LINEチャット / 政治系 / その他` の全ジャンルについて、作り方を迷わず辿れる playbook を持つ
2. 参考 YouTube 動画をローカルで抽出分析し、その結果を `Codex + repo ルール` で解釈して、制作用の下書きパッケージへ変換できる

今回の完成形は「YouTube 動画を眺めて参考にする」段階を超えて、

- レイアウト
- 字幕
- popup
- 背景画像 / 背景動画
- 音声運び
- BGM / SE の役割
- 台本構造
- hook / middle / payoff / CTA

までをローカルで分析し、`script`・`audio plan`・`projects/<id>/...` の初期成果物に接続できる状態とする。

## Current Gaps

現状の repo には次のギャップがある。

- `agent-rules/router.md` は 5 ジャンルを案内しているが、`agent-rules/common/core.md` のテンプレート一覧は古く、`政治系` が反映されていない
- `agent-rules/templates/political.md` が存在せず、ルーター参照が壊れている
- `analyze-youtube.mjs` / `youtube_analysis_bridge.py` は `hook / headline / subtitle density / CTA` の分析には強いが、`BGM / SE / 台本構成 / layout contract` までは見ていない
- `review-rhythm-visual.mjs` は画面停滞の検査はできるが、`subtitleRect / popupRect / backgroundRect` を明示的に監査していない
- `analyze` の出力と `new:project` / `script 生成` の間に橋がない

## Chosen Approach

採用するのは `local extraction + Codex interpretation + structured generation` 方式。

- `local extraction`
  - `yt-dlp / ffmpeg / OCR / whisper` で参考動画から機械的に取れるものを抽出する
- `Codex interpretation`
  - 抽出結果をそのまま終わらせず、Codex が `agent-rules/` と `videokit/docs/` を読んだ上で、この repo の作法に翻訳する
- `structured generation`
  - 解釈結果を JSON / Markdown に落とし、その後 `script` や `projects/<id>/publish` の初期成果物へ変換する

この方式を選ぶ理由は次の通り。

- ユーザー希望の「ローカルで Codex のルールを通して分析する」に正面から合う
- 既存の `analyze-youtube` / `analyze-gameplay` / `review:*` / `audio-direction-playbook` を活かせる
- CLI が得意な `抽出` と、Codex が得意な `解釈` を無理に混ぜずに済む

## Non-Goals

今回の範囲に含めないもの:

- OpenAI API など外部 LLM API を前提にした分析
- 参考動画の音源や字幕をそのまま流用すること
- BGM / SE の完全な source separation やメロディ同定
- 1 コマンドで render 完了まで無人実行すること
- editor UI の全面改修

特に `Codex interpretation` は repo 内の deterministic CLI ではなく、Codex がこの repo の skill / docs / analysis pack を読んで実行する工程として扱う。

## User-Facing Flows

### 1. ジャンルから始める

1. `npm run guide:genre -- --template explainer`
2. 対応 playbook を読む
3. `npm run new:project -- --template explainer --project-id <slug> --title <title>`
4. `npm run review:preflight`

### 2. 参考 YouTube から始める

1. `npm run analyze:youtube:deep -- --url <youtube-url> --template political --project-id <slug>`
2. 抽出結果を `projects/<slug>/analysis/youtube/<video-id>/` に保存する
3. Codex が repo 内 rule と playbook を読み、分析 pack を解釈する
4. `npm run generate:from-analysis -- --project-id <slug> --template political`
5. `npm run review:layout`
6. `npm run review:preflight`

### 3. 複数 URL を比較して勝ち筋を抽出する

1. `npm run analyze:youtube:compare -- --url <a> --url <b> --url <c> --template explainer --project-id <slug>`
2. 各動画の個別 pack と、共通パターンの comparison summary を作る
3. Codex が比較結果をもとに「この repo で採用すべき設計」をまとめる
4. `npm run generate:from-analysis`

## User-Facing Commands

repo root に次の入口を持たせる。

- `npm run guide:genre -- --template explainer|gameplay|line-chat|political|generic`
- `npm run analyze:youtube:deep -- --url <youtube-url> --template <type> --project-id <slug>`
- `npm run analyze:youtube:compare -- --url <a> --url <b> ... --template <type> --project-id <slug>`
- `npm run generate:from-analysis -- --template <type> --project-id <slug>`
- `npm run review:layout -- --variant long|short`

`videokit/` 側にも実処理スクリプトを置き、root からは `npm --prefix videokit ...` で呼ぶ。
`guide:genre` は対応 playbook のパスと、開始コマンドの最短例を返す軽量 CLI とする。

## Genre Playbooks

追加する playbook は次の 5 本。

- `videokit/docs/playbooks/explainer.md`
- `videokit/docs/playbooks/gameplay.md`
- `videokit/docs/playbooks/line-chat.md`
- `videokit/docs/playbooks/political.md`
- `videokit/docs/playbooks/generic.md`

加えて index を作る。

- `videokit/docs/playbooks/README.md`

各 playbook は少なくとも次の章立てを持つ。

- 向いている題材
- 企画の切り方
- `script` の書き方
- 推奨レイアウト
- 字幕 / popup / 背景の使い分け
- 音声 / BGM / SE の方針
- 素材収集の流れ
- render 前 review
- よくある失敗

## Rule Synchronization

playbook 追加に合わせて、rule 側の不整合も直す。

- `agent-rules/common/core.md`
  - テンプレート一覧を 5 ジャンルに同期する
- `agent-rules/templates/political.md`
  - 新規追加する
- `agent-rules/router.md`
  - playbook / rule の参照先を実在ファイルに揃える

必要なら `その他` を内部的に `generic` として扱うことを明示する。

## Architecture

### 1. Extraction Layer

追加・更新対象:

- `videokit/scripts/analyze-youtube.mjs`
- `videokit/scripts/youtube_analysis_bridge.py`
- 新規: `videokit/scripts/analyze-youtube-compare.mjs`

責務:

- 参考動画のダウンロード
- フレーム抽出
- 字幕 / transcript 取得
- OCR
- 音声エネルギーとイベント密度の抽出
- layout / subtitle / audio に関する raw signal を JSON 化

最低限、次の出力を持つ。

- `meta.json`
- `frames/`
- `contact-sheet.jpg`
- `subtitles.vtt` または対応 JSON
- `transcript.json`
- `ocr.json`
- `layout-signals.json`
- `audio-signals.json`
- `summary.json`
- `summary.md`

### 2. Comparison Layer

追加対象:

- `videokit/scripts/analyze-youtube-compare.mjs`

責務:

- 複数 URL の deep analysis を束ねる
- 一致したパターンと、動画ごとの差分を分けて出す

出力:

- `comparison-summary.json`
- `comparison-summary.md`

共通抽出項目:

- hook type
- headline / subtitle hierarchy
- subtitle density
- popup cadence
- information card position
- layout zone usage
- narration density
- silence moments
- music-under moments
- impact cue moments
- CTA type

### 3. Codex Interpretation Layer

これは deterministic CLI ではなく、Codex が repo 内 skill と docs を読んで実行する工程として定義する。

追加対象:

- `videokit/.codex/skills/reference-video-analysis/SKILL.md`
- `videokit/.agents/skills/reference-video-analysis/SKILL.md`
- 必要なら `.agent`, `.claude`, `.cursor`, `.gemini` にもミラー

この skill の責務:

1. 対象 template を確認する
2. `agent-rules/common/core.md`, `visual-system.md`, 対応 template rule, playbook を読む
3. `projects/<slug>/analysis/youtube/...` の raw pack を読む
4. 次の interpretation artifacts を作る

想定 artifacts:

- `codex-analysis-report.md`
- `codex-analysis-brief.json`
- `layout-contract.json`
- `audio-direction-draft.json`
- `script-outline.json`

ここでの重要点は、`分析 -> 解釈` を分離し、Codex が毎回同じ観点で読む導線を repo 側に実装すること。

### 4. Generation Layer

追加対象:

- `videokit/scripts/generate-from-analysis.mjs`

責務:

- `codex-analysis-brief.json` などの structured artifact を読み
- template ごとの `script` 下書き
- `projects/<slug>/publish/youtube_metadata.md`
- `projects/<slug>/publish/thumbnail_prompt.md`
- `projects/<slug>/source/script.snapshot.json`

を生成する

テンプレート別の生成対象:

- `explainer`
  - `long/short scenes`, `sceneRole`, popup 候補, asset query
- `political`
  - explainer ベースに政治系 tone, shock banner, map / comparison 優先
- `gameplay`
  - 既存 `build-gameplay-commentary.mjs` と整合する `timeline.gameplay.segments`
- `line-chat`
  - `timeline.chat.messages`, reveal timing, avatar plan
- `generic`
  - 最小構成の汎用 draft

### 5. Layout Contract Layer

追加対象:

- 新規: `videokit/src/analysis/layout-contract.ts`
- 新規: `videokit/scripts/review-layout.mjs`

既存の

- `videokit/src/components/subtitle-layout.ts`
- `videokit/src/components/popup-layout.ts`

を source of truth とし、scene ごとに次を解決する。

- `safeRect`
- `subtitleRect`
- `popupRect`
- `backgroundRect`
- `resolvedPopupZone`
- `resolvedVisualMode`

`generate-from-analysis` で生成した scene に対して、`review-layout` は少なくとも次を検査する。

- subtitle が `safeRect` / `subtitleRect` を逸脱していないか
- popup が subtitle の可読領域を侵食していないか
- background の主表示領域が十分残っているか
- portrait / landscape で zone 解決が崩れていないか
- gameplay の HUD / badge / subtitle が衝突していないか
- line-chat で汎用 popup 契約を誤適用していないか

### 6. Review Integration

`review-layout` は既存 review 群と並列ではなく補完関係にする。

- `review:layout`
  - 領域契約と可読性の監査
- `review:preflight`
  - text / speech / 音量 / 無音ギャップ / 画面停滞
- `review:delivery`
  - metadata / thumbnail / publish 物の最終確認

## Audio Analysis Strategy

今回の `BGM / SE` 分析は、source separation ではなく `役割分析` に寄せる。

抽出レベルで見るもの:

- speech window
- silence window
- energy spikes
- onset clusters
- long underbed presence
- transition-like impact windows

解釈レベルで出したいもの:

- `voice-first`
- `music-under`
- `impact-hit`
- `quiet-reset`
- `cta-lift`

つまり「何の曲か」ではなく、

- どこで音が増えるか
- どこで無音にするか
- どこで impact を入れるか
- voice をどう立たせるか

を production decision として抽出する。

## Output Layout

分析成果物の標準配置は次とする。

- `videokit/projects/<project-id>/analysis/youtube/<video-id>/...`
- `videokit/projects/<project-id>/analysis/youtube/comparison/...`
- `videokit/projects/<project-id>/source/script.snapshot.json`
- `videokit/projects/<project-id>/publish/youtube_metadata.md`
- `videokit/projects/<project-id>/publish/thumbnail_prompt.md`

`generate-from-analysis` 実行後は、必要に応じて `src/data/script.json` へ同期するオプションも持たせる。

## Data Flow

### Deep Analysis Flow

1. `analyze:youtube:deep`
2. raw extraction pack を書く
3. Codex skill が pack + rules + playbook を読む
4. interpretation artifacts を書く
5. `generate:from-analysis`
6. `review:layout`
7. `review:preflight`

### Comparison Flow

1. `analyze:youtube:compare`
2. 個別 raw pack を作る
3. comparison summary を作る
4. Codex が共通パターンと repo 適用方針を解釈する
5. `generate:from-analysis`

## Error Handling

### Extraction

- 字幕取得失敗時は warning にして transcript / OCR で継続
- OCR 失敗時は warning にして transcript 中心で継続
- transcript 失敗時は warning にして layout / OCR 中心で継続
- ffmpeg / yt-dlp 失敗時は error

### Interpretation

- required artifact が欠ける場合は、Codex skill が不足ファイルを明示する
- template 未指定または未対応の場合は即 stop する
- `political` rule / playbook が未作成なら `explainer fallback` を使わず、明示的に未整備と出す

### Generation

- `codex-analysis-brief.json` 不在時は error
- template と brief の不一致は error
- 既存 file 上書きは `--force` を要求する

### Layout Review

- subtitle / popup / background の領域衝突は `warning` または `error`
- line-chat では一般 popup 規則を緩める代わりに、message density を優先評価する

## README Changes

README と `videokit/README.md` には次を追加する。

- 全ジャンル playbook への導線
- 参考 YouTube から始める流れ
- `analyze:youtube:deep`
- `analyze:youtube:compare`
- `generate:from-analysis`
- `review:layout`
- Codex が interpretation を担うこと
- どこまでが deterministic CLI で、どこからが Codex 作業か

## Testing Strategy

最低限の検証:

1. `guide:genre` が各 playbook パスを正しく案内する
2. `analyze:youtube:deep` が 1 URL で raw pack を出せる
3. `analyze:youtube:compare` が複数 URL で comparison summary を出せる
4. Codex skill 用の required artifact 一覧が docs と一致している
5. `generate:from-analysis` が template ごとに初期成果物を出せる
6. `review:layout` が explainer / gameplay / line-chat の最低 1 サンプルずつで走る

今回の実装では、ブラウザ preview を使う visual QA より前に、まず CLI と structured artifact の一貫性を優先する。

## Risks

- BGM / SE は source separation ではないため、役割判定は heuristic になる
- `Codex interpretation` は CLI 単体で閉じないので、skill と docs の質が重要になる
- `political` と `generic` の境界が曖昧だと、playbook が重複しやすい
- line-chat は一般的な `background / popup / subtitle` 契約がそのまま当てはまらない

## Decisions To Lock

- 分析は `local extraction + Codex interpretation` の二段構えにする
- `政治系` は playbook と rule を新設して、explainer の暗黙流用をやめる
- `subtitleRect / popupRect / backgroundRect` を layout contract として明示的に扱う
- `BGM / SE` は source separation ではなく役割分析で扱う
- deep analysis と compare analysis を分ける
- 生成対象は `script 下書き + projects 初期成果物` まで含める

## Self-Review

確認済み:

- Codex が担う工程と CLI が担う工程を分離して明記した
- 全ジャンル playbook と rule sync の両方を scope に入れた
- layout contract に `subtitle / popup / background` を含めた
- 既存 `analyze-youtube`, `review:*`, `subtitle-layout`, `popup-layout` を活かす構成にした
- `political.md` 不在という既存の壊れた参照を scope に含めた
