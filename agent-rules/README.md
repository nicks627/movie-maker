# Agent Rule Sources

`AGENTS.md`, `CLAUDE.md`, `GEMINI.md` は最小ルーターです。

詳細ルールはこのディレクトリの分割 md を source-of-truth とします。

## Files

- `router.md`
  - top-level router source
- `common/`
  - 全テンプレート共通ルール
- `templates/`
  - テンプレート別ルール
  - `clip-based-video.md` は解説動画 / ゲーム実況の共通表示ルール
  - `audio-direction.md` は解説動画 / ゲーム実況 / LINE の共通音設計ルール
  - `review-feedback.md` は creator render 前提の review 運用ルール
- `folders/`
  - フォルダ別ルール
- `bootstrap-agent-modules.mjs`
  - 旧長文 AGENTS から modules を切り出す移行補助
- `build-agent-docs.mjs`
  - `router.md` から `AGENTS.md / CLAUDE.md / GEMINI.md` を再生成

## Regenerate

```bash
node agent-rules/build-agent-docs.mjs
```
