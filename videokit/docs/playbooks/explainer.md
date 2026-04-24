# Explainer Playbook

## 向いている題材

- ニュース解説
- 制度説明
- 経済や市場の解説
- 歴史や技術の整理

## 企画の切り方

- 最初に `結論` を置く
- 次に `なぜそう言えるか` を 2〜4 論点で支える
- 長尺は `hook -> context -> evidence -> implications -> summary -> CTA`
- 短尺は `hook -> one core point -> takeaway`

## Script の作り方

- `sceneRole` を先に決める
- 各 scene は 1 論点に絞る
- 数字や固有名詞が多い scene は、speech と display を分ける
- `speechText` は読みやすさ、`popup` は構造化を担当させる

## レイアウトの考え方

- subtitle は常に可読優先
- 比較や数字は image より component を優先
- `TwoColumnComparison`, `BarChart`, `StatsCard`, `GeoPoliticalMap` をまず検討する
- 背景は雰囲気作りだけでなく、論点理解を助けるものを使う

## 字幕 / popup / 背景の使い分け

- 字幕: 話し言葉
- popup: 数字、対比、キーワード
- 背景: 題材の文脈

`subtitleRect / popupRect / backgroundRect` が競合しないよう、scene を詰め込みすぎない。

## 音声 / BGM / SE

- BGM は voice より必ず下げる
- `hook` と `reveal` だけ音変化を強める
- 図表説明中は静かめ
- SE は重要 scene に絞る

詳細は [../audio-direction-playbook.md](../audio-direction-playbook.md)

## 素材収集

- 公式 source があれば最優先
- 足りない部分だけ `assets:fetch` を使う
- `asset_query` は短い英語句で置く

## Render 前 review

- `npm run review:preflight -- --variant long`
- `npm run review:publish -- --variant long`
- `npm run review:delivery -- --variant long`

## よくある失敗

- 1 scene に論点を詰めすぎる
- 長文を字幕だけで処理する
- popup が早く消える
- 背景が decorative すぎて説明に効いていない
