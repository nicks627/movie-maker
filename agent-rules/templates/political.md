# Template Rules: Political

ユーザーが `政治系` を選んだときに使う。

## Shared Rules

先に `agent-rules/templates/clip-based-video.md` を読む。  
次に `agent-rules/templates/audio-direction.md` を読む。

## Positioning

政治系は `解説動画` の一種として扱うが、次を強める。

- 対立構図
- 時系列整理
- 数字と制度の因果
- 地図 / 組織図 / 比較図の即読性
- hook の強さ

感情を煽るだけで終わらせず、`何が起きたか / 誰が関与しているか / どこが争点か / 視聴者が何を理解すべきか` を明確にする。

## Visual Priorities

静止画像の前に、既存 component で表現できるか確認する。

- 対立や比較: `TwoColumnComparison`
- 数値 / 予算 / 推移: `BarChart`, `StatsCard`, `StockLineChart`
- 地政学 / 国際政治: `GeoPoliticalMap`, `OrbitalMapZoom`
- 強い争点の見出し: `PoliticalShockBanner`, `KineticText`, `Typewriter`

政治系では、subtitle と popup が競合しやすい。  
`subtitleRect / popupRect / backgroundRect` の可読域を先に意識して scene を組む。

## Script Shape

最低限、次のどれかの流れにする。

1. `hook -> issue framing -> evidence -> counterpoint -> implication -> CTA`
2. `hook -> timeline -> actor map -> conflict point -> outcome -> CTA`
3. `hook -> claim -> supporting numbers -> why it matters -> next watchpoint`

曖昧な断定を避け、数字・制度・時系列はなるべく scene 単位で分ける。

## Background Materials

全 scene に `asset_query` または背景方針を持たせる。

- 公式会見・国会・府省庁素材があるなら最優先
- 足りない場合だけ rights-aware source を使う
- `bg_image` の fallback は必ず入れる

## Audio Direction

- `hook` は 1〜2 秒以内に音の変化を入れる
- 数字や引用の scene は BGM を静かめにする
- 強い争点 scene だけ impact SE を使う
- 不要な連打 SE は避け、情報理解を最優先にする

## Workflow

1. テンプレート確認
2. 争点と時系列を整理する
3. 参考動画や資料を読み、論点を抽出する
4. `script.json` を作る
5. `npm run review:preflight -- --variant long`
6. 図版を component / image で埋める
7. 素材収集を行う
8. `node generate-voices.mjs`
9. `npm run review:delivery -- --variant long`
10. `youtube_metadata.md` と `thumbnail_prompt.md` を更新する
