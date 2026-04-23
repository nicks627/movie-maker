# API Key Setup

このドキュメントは、`npm run assets:fetch` で使う素材取得 API キーの取得方法をまとめたものです。

## 先に知っておくこと

- API キーが不要:
  - `official-press`
  - `wikimedia-commons`
- API キーが必要:
  - `pixabay` -> `PIXABAY_API_KEY`
  - `pexels` -> `PEXELS_API_KEY`
  - `unsplash` -> `UNSPLASH_ACCESS_KEY`

設定先は `videokit/.env.local` です。

```bash
PIXABAY_API_KEY=your_key_here
PEXELS_API_KEY=your_key_here
UNSPLASH_ACCESS_KEY=your_key_here
```

設定後は次で確認します。

```bash
npm run doctor:assets
```

## Pixabay

用途:

- 汎用 B-roll
- 背景動画
- 補助イメージ

取得手順:

1. [Pixabay API documentation](https://pixabay.com/api/docs/) を開く
2. Pixabay にログインまたはサインアップする
3. ドキュメント上の API key 表示箇所から自分のキーを確認する
4. `.env.local` に `PIXABAY_API_KEY=...` を追加する

補足:

- この project では `https://pixabay.com/api/` と `https://pixabay.com/api/videos/` を使います
- Pixabay docs では API 利用時の rate limit と caching 方針が案内されています
- permanent hotlinking は避け、必要な素材はローカル保存して使ってください

参考:

- [Pixabay API documentation](https://pixabay.com/api/docs/)
- [Pixabay API overview](https://pixabay.com/service/about/api/)
- [Pixabay Content License summary](https://pixabay.com/service/license-summary/)

## Pexels

用途:

- 高品質な B-roll
- ライフスタイル系映像
- 補助的な stock video / image

取得手順:

1. [Pexels API](https://www.pexels.com/api/) を開く
2. `Get Started` から Pexels アカウントを作成またはログインする
3. 自分の API key を取得する
4. `.env.local` に `PEXELS_API_KEY=...` を追加する

補足:

- この project では `Authorization` header に API key を付けて呼び出します
- 取得後は source page URL と author credit を manifest に残してください

参考:

- [Pexels API](https://www.pexels.com/api/)
- [Pexels API documentation](https://www.pexels.com/api/documentation/)
- [Pexels license](https://www.pexels.com/license/)

## Unsplash

用途:

- 静止画候補の発見
- 編集系の still image 探索

取得手順:

1. [Unsplash documentation](https://unsplash.com/documentation) を開く
2. developer account を作成する
3. `Your apps` から `New Application` を作成する
4. application の `Access Key` を確認する
5. `.env.local` に `UNSPLASH_ACCESS_KEY=...` を追加する

補足:

- Unsplash docs では demo mode と production mode の違いが説明されています
- API 利用時は attribution と API guideline の遵守が必要です
- この project ではまず candidate discovery に使い、既定では local auto-download を前提にしません

参考:

- [Unsplash API documentation](https://unsplash.com/documentation)
- [Unsplash API guidelines](https://help.unsplash.com/en/articles/2511245-unsplash-api-guidelines)
- [Unsplash license](https://unsplash.com/license)

## API キー不要の source

### official-press

- 公式 press kit や media kit を手動確認して使います
- 利用規約、人物、ロゴ、第三者素材の扱いを毎回確認してください

### wikimedia-commons

- API キー不要です
- ただしファイルごとに license が異なります
- attribution と file page URL の記録は必須です

参考:

- [MediaWiki API:Search](https://www.mediawiki.org/wiki/API:Search)
- [MediaWiki API:Imageinfo](https://www.mediawiki.org/wiki/API:Imageinfo)
- [Commons reuse guidance](https://commons.wikimedia.org/wiki/Commons:Reusing_content_outside_Wikimedia)
