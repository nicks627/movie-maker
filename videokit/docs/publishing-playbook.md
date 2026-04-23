# Publishing Playbook

動画を書き出したら、必ず `projects/<project.id>/` の中で `動画 + YouTube metadata + サムネ prompt` を 1 セットで仕上げる。

## Required Deliverables

- `projects/<project.id>/renders/out-long.mp4` または `projects/<project.id>/renders/out-short.mp4`
- `projects/<project.id>/publish/youtube_metadata.md`
- `projects/<project.id>/publish/thumbnail_prompt.md`

## youtube_metadata.md Standard

毎回、`projects/<project.id>/publish/youtube_metadata.md` に今のテーマに合わせて次をそろえる。

- `## Video`
  - 動画テーマ
  - 想定視聴者
  - 検索軸
- `## Long`
  - Recommended title (JA)
  - Alternate titles (JA)
  - Description (JA)
  - Pinned comment idea (JA)
  - Recommended title (EN)
  - Alternate titles (EN)
  - Description (EN)
  - Pinned comment idea (EN)
  - Tags
  - Credits
- `## Short`
  - Recommended title (JA)
  - Alternate titles (JA)
  - Description (JA)
  - Pinned comment idea (JA)
  - Recommended title (EN)
  - Alternate titles (EN)
  - Description (EN)
  - Pinned comment idea (EN)
  - Tags
  - Credits

方針:

- 検索向けキーワードは冒頭の 1〜2 行に入れる
- クリック用の引きと、検索用の具体語を両立する
- 説明欄は「何がわかるか」を箇条書きで明示する
- 英語版は直訳ではなく、海外向け YouTube の自然なタイトル / 説明にする
- ロングはチャプターをできるだけ入れる
- ショートもロングも、固定コメント案まで出す

## thumbnail_prompt.md Standard

毎回、`projects/<project.id>/publish/thumbnail_prompt.md` に今のテーマに合わせて次をそろえる。

- `## Long`
  - Recommended overlay text
  - Alternate overlay text
  - Prompt
  - Negative prompt
  - Color direction
- `## Short`
  - Recommended overlay text
  - Alternate overlay text
  - Prompt
  - Negative prompt

方針:

- 文字は短く、強く、スマホで一目で読めることを優先する
- Prompt は構図、主役モチーフ、色、雰囲気、可読性を入れる
- Negative prompt で「ごちゃつく」「文字が小さい」を防ぐ
- Long と Short で構図を分ける

## Final Review

agent が進めるときは、自動 CLI にまとめず、都度 `review:preflight`, `generate:voices`, `render`, `review:delivery` を必要な順で実行する。  
無音や画面停滞の確認も `review:preflight` に含める。

納品前に次を実行する。

```powershell
npm run review:delivery -- --variant long
npm run review:delivery -- --variant short
```

最低限、`review:publish` が通ること。

## Legacy Fallback

移行期間のみ、root 直下の `youtube_metadata.md` と `thumbnail_prompt.md` は fallback として扱う。  
ただし正本は `projects/<project.id>/publish/` 側で、review もこちらを優先する。
