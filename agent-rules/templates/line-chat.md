# Template Rules: LINE Chat

ユーザーが `LINEチャット` を選んだときに使う。

## Shared Rules

先に `agent-rules/templates/audio-direction.md` を読む。

## Sub-format

最初に次を確認する。

```text
どの形式で作成しますか？

A. LINE DM
B. LINEグループ
```

## Source Material

- 実話再現ならトーク本文を貼ってもらう
- フィクションならテーマを受け取る

抽出対象:

- 送信者
- 発言内容
- 既読 / 未読
- タイムスタンプ

## Output Format

- 常に `portrait-fhd`
- 60–90 秒を目安
- 8–20 メッセージ程度

## Avatar Rules

参加者アイコンは必須。

優先順位:

1. `public/avatars/` の画像
2. SVG fallback avatar

## Schema

`timeline.chat` を使う。

主な field:

- `mode`
- `roomName`
- `groupName`
- `myName`
- `myAvatar`
- `partnerName`
- `partnerAvatar`
- `members`
- `messages`

`messages[]`:

- `sender`
- `text`
- `timestamp`
- `readReceipt`
- `typingFrames`
- `revealFrame`
- `duration`
- `voiceFile`
- `reaction`

## Voice Narration

必要なら次を確認する。

```text
音声ナレーションを付けますか？

A. あり
B. なし
```

## Workflow

1. テンプレート確認
2. DM / グループ確認
3. 元ネタ取得
4. 参加者情報整理
5. `timeline.chat` を作る
6. `revealFrame` を累積で決める
7. 必要なら `node generate-voices.mjs`
8. `template.id = "line-chat"` で render
