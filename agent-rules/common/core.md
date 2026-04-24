# Common Core Rules

このルールは動画制作全体に共通で適用する。

## Template Selection

最初に必ずユーザーへテンプレートを確認する。

```text
どのテンプレートで動画を作成しますか？

1. 解説動画
2. ゲーム実況
3. LINEチャット
4. 政治系
5. その他
```

テンプレートが未確定のまま他の作業へ進まないこと。

- `その他` は、既存テンプレートに完全一致しない案件を受けるための入口として扱う。
- `その他` で始めても、最終的には `explainer / gameplay / line-chat / political / generic` のいずれかに寄せて制作する。

## Video Duration Targets

| Format | Target Duration | Target Frames (30fps) | Approximate Scene Count |
|--------|----------------|-----------------------|-------------------------|
| Short | ~1 minute | ~1800 frames | 6–10 scenes |
| Long | 10+ minutes | 18000+ frames | 40–80 scenes |

- ユーザーが `ショート` と明示しない限り `long` を既定とする。
- Long 動画は必ず10分（600秒）以上の尺になるよう、台本情報を大幅に膨らませること。台本が短い場合は深掘りや具体例を追加して尺を稼ぐ。
- **Voice Speed Default**: 指定がない限り、各シーンの `speedScale` は 1.6 を基本とする。
- 1セリフあたりの基本尺は 90–120 frames（1.6倍速時）を目安にする。

## Speaker Conventions

| Character | Speaker ID | Speech style |
|-----------|-----------|--------------|
| 四国めたん | `metan` | polite, slightly bossy, uses ですわ |
| ずんだもん | `zundamon` | energetic, uses なのだ |

- 可能なら二人が自然に掛け合う構成にする。
- 解説シーンは `通常` / `普通` を基本にする。
- リアクションが強い場面は `怒り` `驚き` `笑い` `恐怖` などを使い分ける。

## General Default

- 既存テンプレートや既存部品を優先し、毎回一から作り直さない。
- まず script で表現できる形を探し、足りない部分だけ code change する。
- 台本を作成したら、音声生成の前に `npm run review:preflight` を実行し、`text / subtitleText / speechText / BGM の先頭位置 / BGM・voice・SE の音量バランス` を確認する。
- 動画の納品時は、動画ファイルだけで終わりにせず、必ず `videokit/youtube_metadata.md` と `videokit/thumbnail_prompt.md` も作成または更新する。
- 納品前の最終確認として `npm run review:delivery`、最低でも `npm run review:publish` を実行し、`YouTube metadata / サムネプロンプト` の作成漏れがないことを確認する。
- `youtube_metadata.md` には最低でも `検索軸 / 推奨タイトル / 代替タイトル / 説明欄 / タグ / 固定コメント案` を、`thumbnail_prompt.md` には `推奨文言 / 代替文言 / prompt / negative prompt / 色方針` を含める。
