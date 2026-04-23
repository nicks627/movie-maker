# Audio Direction Playbook

このドキュメントは、`BGM` と `SE` を「なんとなく入れる」のではなく、テンプレートごとに再利用できる演出ルールとして扱うための基準です。

対応する機械可読プリセットは [audio-direction-presets.json](C:/Users/taipo/movie_maker/videokit/config/audio-direction-presets.json) です。

## 基本方針

- 最優先は `声の聞き取りやすさ`
- `BGM` は感情とテンポの床
- `SE` は情報の強調と場面転換の印
- 重要な数字、図表説明、強い一言の前後では `無音` も積極的に使う

## 何を決めるのか

各シーンまたは各セグメントで、少なくとも次を決めます。

- `sceneRole`
- `bgmRole`
- `bgmVolume`
- `bgm enter / exit timing`
- `ducking`
- `se role`
- `silence moments`

## YouTube など参考動画の扱い

参考動画を分析してよく、使うのは `構造` だけでなく `ジャンル感 / テンポ感 / 不穏さ / 軽さ / BGM の役割` まで含みます。

- どこで音が入るか
- どこで切り替わるか
- どこで無音になるか
- どの場面で SE を入れるか
- どれくらいダッキングしているか
- どのジャンル感がハマっているか
- どのくらい明るいか、重いか、不穏か

やってはいけないこと:

- YouTube から音源を抽出してそのまま使う
- 参考動画のBGMメロディや効果音そのものを再利用する
- 「似せる」ために著作権のある音源を流用する

つまり、`音を盗む` のではなく `音の設計を学ぶ` のが前提です。

実務上は、元音源そのものを使わない限り、`近いジャンル / 近い BPM 感 / 近いテンション / 近い入り方` の free BGM を選んで問題ありません。
ネタや話題が被らない前提なら、参考動画の `それっぽさ` を強めに寄せる運用でよいです。

## 参考動画から抽出する項目

参考動画を見たら、最低限これだけ取ります。

- `sceneRole`
- `cut tempo`
- `bgm entry timing`
- `bgm exit timing`
- `voice over BGM balance`
- `se moment`
- `silence moment`
- `ending style`
- `genre feel`
- `energy level`
- `tension color`

## テンプレート別の基本戦略

### 解説動画

特徴:

- 情報密度が高い
- 図表、比較、地図が多い
- ナレーションが主役

方針:

- `hook` は 1〜2 秒以内に音の変化を入れる
- `setup / context / chart-read` は静かめ
- `reveal` でだけ 1 回強いアクセントを入れる
- `summary` は落ち着いた解決感で締める
- 図表の読み上げ中は SE を減らす

よく合う BGM 役割:

- `hook-tech`
- `calm-explainer`
- `corporate-tension`
- `market-momentum`
- `victory-resolve`

### ゲーム実況

特徴:

- 状態変化が激しい
- リアクションが多い
- テンポの波が大きい

方針:

- シーン数より `ゲーム状態` を優先する
- `escalation / risk / clutch / victory` ごとに音を切り替える
- リアクション SE は強い場面だけに絞る
- 元ゲーム音がある場合は BGM と SE を控えめにする

よく合う BGM 役割:

- `battle-tension`
- `calm-explainer`
- `comedy-light`
- `victory-resolve`

### LINEチャット

特徴:

- UI 自体がリズムを作る
- メッセージ表示が主役
- 密度が高いと音がうるさくなりやすい

方針:

- 基本は `無音` か `薄いアンダースコア`
- メッセージ表示は `message-pop` を中心にする
- 大きな reveal のときだけ軽い impact を使う
- コメディでも鳴らしすぎない

よく合う BGM 役割:

- `chat-emotion`
- `comedy-light`
- `victory-resolve`
- `none`

## 音量とダッキングの目安

基本の考え方:

- `voice` が一番前
- `SE` は瞬間的に前へ出る
- `BGM` は常に一歩下がる

初期値の目安:

- BGM: `0.08 - 0.18`
- SE: `0.30 - 0.85`
- voice 中の BGM duck: `-8dB`
- 強い SE の直前直後 duck: `-12dB`
- 図表説明中の BGM duck: `-6dB`

このプロジェクトの標準初期値:

- `audio.bgmVolume`: `0.17`
- `audio.voiceVolume`: `1.0`
- `audio.seVolume`: `0.9`
- `audio.voiceDucking`: `0.58`
- `audio.duckFadeFrames`: `12`

render 前の自動確認:

```powershell
npm run review:preflight -- --variant long
npm run review:preflight -- --variant short
```

確認する内容:

- 下字幕が `speechText` 基準になっているか
- `text` や補足コピーが必要な場合に `popup / 背景 / 見出し` 側へ回っているか
- BGM が `scene 0` から入っているか
- voice と BGM の平均レベル差
- ducking 後の BGM が十分下がっているか
- SE が voice を邪魔しないか

## シーン役割の決め方

エージェントは、まずシーンを次のいずれかへ分類します。

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

これが決まると、`audio-direction-presets.json` から推奨の `bgmRole` と `allowedSeRoles` を引けます。

## Agent Workflow

1. `template.id` を確認する
2. 各 scene / segment に `sceneRole` を付ける
3. `audio-direction-presets.json` から推奨 `bgmRole` と `seRoles` を引く
4. 既存 BGM / SE ライブラリから候補を割り当てる
   BGM は `public/assets/bgm/` と `bgm-manifest.json` を正本にする
   SE は `file` を直接決めるのではなく、できるだけ `role / mood / strength` で指定して `se-manifest.json` から解決する
5. voice と被る箇所の ducking を設定する
6. 重要説明箇所は `silence` も候補に入れる
7. render 前に `npm run review:preflight` を実行し、`うるさすぎないか / 読みの邪魔をしていないか` を確認する

## 今後の自動化ポイント

このルールを使えば、次の自動化に進めます。

- `script -> sceneRole` 分類
- `sceneRole -> audio plan` 自動生成
- `audio plan -> bgm/se file` 選択
- `render 前 review` の自動チェック

## 関連ファイル

- [audio-direction-presets.json](C:/Users/taipo/movie_maker/videokit/config/audio-direction-presets.json)
- [bgm-manifest.json](C:/Users/taipo/movie_maker/videokit/bgm-manifest.json)
- [assign-se.mjs](C:/Users/taipo/movie_maker/videokit/assign-se.mjs)
- [se-manifest.json](C:/Users/taipo/movie_maker/videokit/se-manifest.json)
- [se-dictionary.json](C:/Users/taipo/movie_maker/videokit/se-dictionary.json)
- [se-context-rules.json](C:/Users/taipo/movie_maker/videokit/se-context-rules.json)
