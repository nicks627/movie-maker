# Template Rules: Explainer

ユーザーが `解説動画` を選んだときに使う。

## Shared Rules

先に `agent-rules/templates/clip-based-video.md` を読む。
次に `agent-rules/templates/audio-direction.md` を読む。

## Explanation Images

- まず記事や元資料を読み、論点を抽出する。
- 1シーンごとではなく、主要論点ごとに画像や図版を作る。
- Short は 3–5 枚、Long は 10–20 枚を目安にする。
- 保存先は `videokit/public/`。
- `script.json` では `popups[].image` / `bg_image` か `popups[].component` を使う。

## Prefer Built-in Components

静止画像の前に、既存 Remotion テンプレートで表現できるか確認する。

- 比較: `TwoColumnComparison`, `DirectSalesComparison`
- グラフ: `BarChart`, `StockLineChart`, `CandlestickChart`, `AllocationDonutChart`
- 地図: `GeoPoliticalMap`, `OrbitalMapZoom`

## Fallback Image Prompt

画像生成できない場合は `videokit/image_prompt.md` を出力する。

- 英語で書く
- スタイルを明記する
- 想定ファイル名を必ず書く
- `script.json` には先にそのファイル名を入れておく

## Background Materials

全シーンに `asset_query` を入れる。

- 短い英語キーワード句にする
- 完成後に `node fetch-pixabay-assets.mjs` を実行する
- `bg_image` の fallback を必ず入れる

## Workflow

1. 元資料を読む
2. 構成を決める
3. `script.json` を作る
4. `npm run review:preflight -- --variant long` で `表示テキスト / 読み上げテキスト / BGM / 音量バランス` を確認する
5. 図版は component か image で埋める
6. `node fetch-pixabay-assets.mjs`
7. `node update-script.mjs`
8. `node rewrite-script.mjs`
9. `node generate-voices.mjs`
10. `npm run render`
11. `videokit/youtube_metadata.md` を今回のテーマに合わせて作成または更新する
12. `videokit/thumbnail_prompt.md` を作成または更新する
   - metadata は `検索軸 / 推奨タイトル / 代替タイトル / 説明欄 / タグ / 固定コメント案` まで作る
   - thumbnail prompt は `推奨文言 / 代替文言 / prompt / negative prompt / 色方針` まで作る
13. `npm run review:delivery -- --variant long` と必要に応じて `short` を実行する
