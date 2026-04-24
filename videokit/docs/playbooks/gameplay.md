# Gameplay Playbook

## 向いている題材

- 実況
- ボス戦解説
- 攻略の見どころ整理
- リアクション中心の見せ場動画

## 企画の切り方

- まず raw gameplay を分析する
- `setup / escalation / risk / reaction / victory` の波で切る
- 参考台本を 2 本以上読んで tone を決める

## Script の作り方

- `timeline.gameplay.segments` を基準にする
- 1 segment は `見どころ + 解説 or ツッコミ` を持つ
- `explanation` と `banter` を分けると組みやすい

参考:

- [../game-play-commentary-template.md](../game-play-commentary-template.md)

## レイアウトの考え方

- 背景は gameplay が主役
- subtitle, HUD, badge, popup の衝突を避ける
- zoom や focus は見せ場だけに使う
- 常時 overdesign にしない

## 字幕 / popup / 背景の使い分け

- 字幕: 実況の主文
- popup: 操作ポイント、危険表示、短い badge
- 背景: gameplay 映像そのもの

## 音声 / BGM / SE

- 元ゲーム音があるなら BGM/SE は控えめ
- `victory`, `clutch`, `failure` だけ強めの音変化を許す
- reaction SE の連打はしない

## 素材収集

- 基本は gameplay 映像が主素材
- 補助図版が必要なら `CHECK` badge や説明 popup に寄せる

## Render 前 review

- `npm run analyze:gameplay -- --input ... --reference-script ... --reference-script ...`
- `npm run review:preflight -- --variant long`

## よくある失敗

- trim が長すぎて dead air が残る
- subtitle と HUD がぶつかる
- hype scene と calm scene の音が同じ
- reference script のテンションを学習せずに書き始める
