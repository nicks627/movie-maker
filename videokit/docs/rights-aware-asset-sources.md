# Rights-Aware Asset Sources

このプロジェクトでは、テーマそのものに近い素材をできるだけ使いつつ、権利情報を残せる形で取得するために `source registry` と `asset manifest` を用意しています。

## 基本方針

優先順位は次の通りです。

1. `official-press`
2. `wikimedia-commons`
3. `pixabay`
4. `pexels`
5. `unsplash`
6. 取れない場合は Remotion で図版化

`official-press` は企業や官公庁などの公式配布素材です。もっともテーマに近い素材が得られますが、利用条件がページごとに違うため、このプロジェクトでは自動ダウンロード対象にしていません。

## 追加したファイル

- `config/asset-source-registry.json`
- `src/automation/asset-manifest.ts`
- `scripts/fetch-assets.mjs`

## 取得元の考え方

### Official Press / Media Kits

- 企業の press kit、media kit、IR deck、研究機関の公開画像など
- テーマそのものの素材に一番近い
- 自動取得より `手動レビュー + manifest 記録` を推奨

### Wikimedia Commons

- 地図、歴史写真、百科事典的素材に向く
- ファイルごとにライセンスが違うため、`per-file review` が必要
- author / license / file page URL を manifest に保存する

### Pixabay

- 汎用 B-roll、背景動画、テーマ周辺のイメージ補完に向く
- API で取得しやすく、画像と動画の両方を扱いやすい
- このプロジェクトでは stock 補完の第一候補

### Pexels

- 高品質な B-roll や写真の補完に向く
- クリエイター情報を manifest に保存して再利用しやすくする
- 公式素材の代わりではなく補完として使う

### Unsplash

- 写真品質は高いが、API 利用上のルールがある
- このプロジェクトでは `candidate discovery` 用の扱い
- デフォルトではローカル自動ダウンロードしない

## CLI の使い方

### 画像候補を取得する

```bash
node scripts/fetch-assets.mjs --source wikimedia-commons --type image --query "Kioxia factory" --limit 5
```

### Pixabay から動画候補を取得する

```bash
node scripts/fetch-assets.mjs --source pixabay --type video --query "data center server room" --limit 5
```

### Pexels から画像を取得してローカル保存する

```bash
node scripts/fetch-assets.mjs --source pexels --type image --query "semiconductor wafer" --limit 5 --download
```

### Unsplash を候補探索だけに使う

```bash
node scripts/fetch-assets.mjs --source unsplash --type image --query "satellite earth" --limit 5
```

## 必要な環境変数

- `PIXABAY_API_KEY`
- `PEXELS_API_KEY`
- `UNSPLASH_ACCESS_KEY`

`wikimedia-commons` は API キーなしで候補取得できます。

## 出力される manifest

`fetch-assets.mjs` は `assets-manifest.generated.json` を生成します。各アイテムに次の情報を保存します。

- `sourceId`
- `sourcePageUrl`
- `originalUrl`
- `localPath`
- `license`
- `attribution`
- `review`

`review.status` は次を使います。

- `candidate`
- `approved`
- `needs_review`
- `rejected`
- `license_blocked`

## 推奨ワークフロー

1. まず公式素材がないか確認する
2. 公式が弱いときは `wikimedia-commons` を探す
3. 補完カットは `pixabay` や `pexels` で埋める
4. `manifest` を見て review が必要な素材だけ確認する
5. 不安がある素材は使わず、表・地図・模式図を Remotion で作る

## 注意

この仕組みは `安全寄りに素材候補を扱いやすくする` ためのもので、法的判断そのものを自動化するものではありません。人物、ブランド、商品パッケージ、私有地、イベント写真、報道写真は追加確認が必要になることがあります。
