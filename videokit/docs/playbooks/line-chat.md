# LINE Chat Playbook

## 向いている題材

- LINE DM 再現
- LINE グループ会話
- 実話再現
- フィクション会話劇

## 企画の切り方

- まず `DM` か `グループ` を決める
- 誰の視点で読むかを決める
- reveal の順番で tension を作る

## Script の作り方

- `timeline.chat` を基準にする
- `messages[]` に `revealFrame`, `duration`, `typingFrames` を置く
- 長文は分割する
- 必要なら `speechText` を message text から分ける

参考:

- [../line-chat-template.md](../line-chat-template.md)

## レイアウトの考え方

- UI 自体が主役
- 汎用 popup は最小限
- 文字量が増えたら message 数を減らす
- 既読、reaction、typing の密度を上げすぎない

## 字幕 / popup / 背景の使い分け

- message bubble が主表示
- 追加字幕は必要最小限
- 背景色と avatar で人間関係を整理する

## 音声 / BGM / SE

- 基本は静かめ
- `message-pop` 系の軽い SE を中心にする
- reveal のみ軽い impact を許す
- 常時 BGM なしでもよい

## 素材収集

- avatar は必須
- 背景はテンプレート色で足りるなら無理に画像を使わない

## Render 前 review

- reveal timing が詰まりすぎていないか
- bubble 内テキストが多すぎないか
- portrait で message が見切れていないか

## よくある失敗

- 1 message が長すぎる
- typing と reveal が多すぎてテンポが死ぬ
- 汎用演出を足しすぎて LINE 感が消える
