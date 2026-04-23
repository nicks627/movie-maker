# Template Rules: Audio Direction

`解説動画`、`ゲーム実況`、`LINEチャット` で共通して使う音の設計ルール。

## Core Rule

- `声の可読性` を最優先にする。
- `BGM` は主役ではなく、テンポと感情の床として使う。
- `SE` は情報の強調、場面転換、反応の印として使う。
- 重要な数字、引用、図表説明では `無音` も選択肢に入れる。

## Reference Analysis

参考動画の分析はしてよいが、抽出するのは `構造` のみ。

見る項目:

- どこで BGM が入るか
- どこで BGM が消えるか
- どこで SE が入るか
- どこで無音になるか
- どれくらい音量を下げているか

禁止:

- YouTube などから抽出した音源をそのまま使う
- 著作権のある BGM や SE を再利用する

## Audio Planning

音を決める前に、各 scene / segment に `sceneRole` を付ける。

候補:

- `hook`
- `setup`
- `context`
- `comparison`
- `chart-read`
- `map-explain`
- `reveal`
- `escalation`
- `comedy-beat`
- `reaction`
- `risk`
- `victory`
- `summary`
- `cta`
- `silence`

## Source of Truth

詳細は次を参照する。

- `videokit/docs/audio-direction-playbook.md`
- `videokit/config/audio-direction-presets.json`

## Workflow

1. template を確認
2. sceneRole を付ける
3. preset から `bgmRole / allowedSeRoles` を引く
4. BGM / SE 素材を割り当てる
5. voice を邪魔しないように ducking を決める
6. render 前に `npm run review:preflight` を実行し、`うるささ / 読みやすさ / 過剰演出 / ducking` を確認する
