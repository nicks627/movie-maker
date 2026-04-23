# Review Feedback Loop

この仕組みは、`render を agent が行わなくても`、動画作成者が重要な調整ポイントを確認してフィードバックを返せるようにするためのものです。

## 目的

- 微調整のたびに「何を見ればいいか」で迷わない
- agent が直すべきレイヤーを間違えない
- 動画作成者の好みと、機械が見つけられる問題を分けて扱う

## 追加したもの

- [review-schemas.ts](C:/Users/taipo/movie_maker/videokit/src/review/review-schemas.ts)
- [generate-review-report.mjs](C:/Users/taipo/movie_maker/videokit/scripts/generate-review-report.mjs)
- [apply-review-feedback.mjs](C:/Users/taipo/movie_maker/videokit/scripts/apply-review-feedback.mjs)

## 何を分析するか

render なしで、主に次を見ます。

- 字幕の詰まりやページ送りの多さ
- 文章量に対するシーン尺の過不足
- popup や図版の表示尺不足
- 過激なトランジション
- voice / bg / popup / BGM のファイル欠損
- ゲーム実況の trim 情報不足
- LINE メッセージの表示過密

## 使い方

### 0. script 完成直後に text / speech / BGM / 音量バランス を確認する

```powershell
npm run review:preflight
```

variant を指定したいとき:

```powershell
npm run review:preflight -- --variant long
npm run review:preflight -- --variant short
```

確認する内容:

- 下字幕の表示元が `speechText` 基準になっているか
- `speechText` が数値や英語略語を自然に読める形か
- 要約や補足を出す場合、それが `popup / 背景 / 見出し` 側に逃がされているか
- BGM が `scene 0` から入っているか
- BGM / voice / SE の音量バランスが崩れていないか
- voice 中の BGM ducking が弱すぎないか
- セリフ間の無音が長すぎないか
- 低変化 scene が長く続いていないか

出力:

- `script-text-audio-review.generated.json`
- `script-audio-balance-review.generated.json`
- `script-rhythm-visual-review.generated.json`

### 1. report を生成する

```powershell
npm run review:report
```

variant を指定したいとき:

```powershell
npm run review:report -- --variant long
npm run review:report -- --variant short
```

出力:

- `review-report.generated.json`
- `review-feedback.generated.json`

### 2. feedback を script に適用する

creator が `review-feedback.generated.json` の `status` を `accepted` か `needs-agent` にし、必要なら `patch` を埋めたあと、次を実行します。

```powershell
npm run review:apply
```

dry-run:

```powershell
npm run review:apply -- --dry-run
```

出力:

- `review-feedback-apply.generated.json`

## 生成される 2 つのファイル

### review-report.generated.json

自動分析結果です。

主な field:

- `summary`
- `issues[]`
- `timeRange`
- `targetLayer`
- `suggestedActions`

### review-feedback.generated.json

creator が埋めるための雛形です。

各 issue ごとに次を持ちます。

- `issueId`
- `priority`
- `targetLayer`
- `action`
- `comment`
- `desiredOutcome`
- `patch`

`patch` に入れられる主な値:

- `durationDeltaFrames`
- `durationFrames`
- `popupIndex`
- `popupDurationDeltaFrames`
- `popupDurationFrames`
- `subtitleWidth`
- `subtitleFontSize`
- `replacementText`
- `backgroundImage`
- `backgroundVideo`
- `popupImage`
- `voiceFile`
- `bgmFile`
- `bgmVolume`
- `transitionType`
- `gameplayTrimBefore`
- `gameplaySourceDuration`

## 使い分け

### report は自動診断

- どこが危ないか
- 何が欠けているか
- どのレイヤーを直すべきか

### feedback は人の意思決定

- 本当に直すか
- どう直したいか
- そのまま残すか
- 雰囲気をどう変えたいか

## targetLayer の考え方

- `script`
  - 文を短くする
  - scene を分ける
  - scene をまとめる
- `subtitle`
  - テキストボックス幅
  - フォント
  - 改行
- `timing`
  - scene duration
  - popup duration
  - chat reveal timing
- `audio`
  - BGM
  - SE
  - ducking
- `visual`
  - popup 保持
  - transition
  - 背景の見せ方
- `assets`
  - 欠けているファイル
  - 差し替え素材

## creator が見るべき順番

1. `blocking` issue
2. `high`
3. `medium`
4. `subtitle / timing / audio`
5. `visual`

## 運用フロー

1. agent が `review:preflight` を実行し、台本の `表示 / 読み上げ / BGM / 音量バランス / 無音ギャップ / 画面停滞` を先に確認する
2. agent が `review-report` を生成
3. creator が動画を見ながら `review-feedback.generated.json` を埋める
4. agent が `targetLayer` ごとに修正する
5. creator が再度 render する
6. 必要ならもう一度 report を出す

## ポイント

- agent は render しなくてよい
- creator は自分で render して見た感想を返す
- report は `客観チェック`
- feedback は `主観判断`
- apply は `安全に自動で直せるものだけ反映`

この 2 つを分けると、修正がかなり安定します。
