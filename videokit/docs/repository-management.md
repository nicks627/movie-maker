# VideoKit Repository Management

## Standard Rule

- canonical GitHub repo は `movie-maker`
- `videokit/` はその中にある動画生成アプリのディレクトリ
- `videokit` を別 repo や submodule に戻さない

## Why

この repo では、動画制作ルールと動画生成アプリを同じ場所で管理します。

- `agent-rules/`
  - 制作ルールの正本
- `videokit/`
  - 動画生成アプリ本体

別 PC へ移すときも、`movie-maker` を 1 回 clone すれば済む構成にしています。

## Local-only Areas

次はローカル作業用で、GitHub の正本には含めません。

- `videokit/projects/`
- `videokit/inputs/gameplay/`
- `videokit/.venv/`
- `videokit/vendor/voicevox_core/`
- `videokit/tools/aquestalkplayer/`

## Migration Safety

repo 構成を変える前に、少なくとも次を確認します。

- 失いたくない `script.json` や素材が commit 済みか
- `projects/` 内の render や publish 物が必要なら退避済みか
- `vendor/voicevox_core/` や `.venv/` が再取得可能か
