# Template Architecture

このプロジェクトは、1つの Remotion リポジトリの中で複数テンプレートを共存させつつ、将来的に分離しやすい構造へ寄せています。

## Current Template Modules

`src/templates/`

- `yukkuri-explainer/`
  - `component.tsx`
  - `model.ts`
- `game-play-commentary/`
  - `component.tsx`
  - `model.ts`
- `line-chat/`
  - `component.tsx`
  - `model.ts`
- `shared/`
  - `duration.ts`
- `index.ts`
  - template registry
- `types.ts`
  - template definition

## Shared vs Template-Specific Responsibilities

### Shared

- output / preset resolution
- script normalization
- materials / voices / rendering command
- popup effects
- reusable infographic components
- editor adapter interface

### Template-specific

- main composition component
- template-only data normalization
- duration inference
- template-only editor behavior
- template-specific samples and docs

## Editor Adapters

`src/editor/template-adapters/`

- `clip-based.ts`
  - 解説動画や現状のゲーム実況のような、voice / bg / image / bgm クリップ編集向け
- `read-only.ts`
  - LINEチャットのように、専用 UI が未実装でも preview はできるテンプレート向け

将来的にはここに `line-chat.ts` や `gameplay.ts` の専用 editor adapter を追加して、`Editor.tsx` 本体への条件分岐追加を減らします。

## Recommended Future Split

将来プロジェクトを分ける場合は、次の順が安全です。

1. `src/templates/line-chat/` を独立パッケージ化
2. `src/templates/game-play-commentary/` を独立パッケージ化
3. `src/core/` 相当の共通基盤を shared package 化

理想形:

- `packages/video-core`
- `packages/template-yukkuri-explainer`
- `packages/template-gameplay`
- `packages/template-line-chat`

## Migration Principle

- まず registry と adapter を増やす
- 次に template-specific UI を差し込む
- 最後に repo / package を分ける

この順だと、途中段階でも既存動画のレンダリングを壊しにくいです。
