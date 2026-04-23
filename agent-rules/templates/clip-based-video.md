# Template Rules: Clip-Based Video Shared

`解説動画` と `ゲーム実況` の両方で使う共通ルール。

## Subtitle Readability

- 字幕は「読めること」を最優先にする。
- 長文は 1 ボックスに詰め込まず、最大 2 行ごとにページ送りする。
- 文字切れ、行切れ、ボックス外へのはみ出しを残したまま完了しない。
- 基本は `白文字 + 話者色の太い縁取り` を使う。
- 話者色は文字色ではなく縁色に使う。
- 縁取りサイズ、文字サイズ、回転、拡大率、不透明度、太字、イタリックは editor から調整できる状態を保つ。

## Short Subtitle Rules

- `short` / 縦動画では、ロング動画の字幕計算を流用しない。
- 改行位置、文字サイズ、表示幅は、必ず縦動画の実際の出力幅を基準に計算する。
- 計算には文字本体だけでなく、縁取り、字間、左右余白も含める。
- 右端・左端へのはみ出しを 1 文字でも残したまま完了しない。
- 2 行で無理に詰めるのではなく、読みやすいサイズを保てない場合はページを分ける。
- 新しいショート動画を作るときは、この縦動画用字幕条件をデフォルトとして扱う。

## Character / Image Transform Parity

- editor で触れる見た目パラメータは render 側にも必ず反映する。
- 特に字幕・立ち絵・image は以下を editor と render で一致させる。
  - 位置
  - サイズ / scale
  - 回転
  - 不透明度
- 立ち絵は `表示する / しない` を切り替えられる状態を保つ。
- preview overlay のドラッグ枠は、実際の表示サイズと見た目に追従させる。

## Infographic Hold Rule

- Remotion で描画した表・グラフ・地図などの `component popup` は、次の表やグラフが出るまで保持する。
- 説明の途中で消してはいけない。
- 短い default duration を入れていても、次の component が現れるまでは残すのを基本とする。
- 画像 popup は別扱いでよいが、図版 component は「読み終わる前に消えない」ことを優先する。

## Regression Checks

- UI に新しいプロパティを足したら、script 保存形式にも追加する。
- `types.ts` のみ、または UI のみ、または render のみの片実装で終えない。
- 少なくとも次を確認する。
  - editor で変更できる
  - save/export しても値が消えない
  - preview に反映される
  - final render に反映される
- 表示系修正では、必要なら静止フレーム確認か render まで行い、「見切れ」「早消え」「ちらつき」を潰してから完了する。

## Review Loop

- render 前提で突っ走らず、必要なら先に `agent-rules/templates/review-feedback.md` を読む。
- creator が render し、agent は `review-report` と `feedback` をもとに修正する運用を優先してよい。
