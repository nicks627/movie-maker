# Template Rules: Review Feedback Loop

動画の最終調整では、agent が勝手に render する前に `review-report` と `feedback` を扱う。

## Core Rule

- agent は render を前提にしない
- まず `review-report` を出す
- creator が render と確認を担当する
- creator の feedback をもとに agent が修正する

## Files

- `videokit/scripts/generate-review-report.mjs`
- `videokit/scripts/apply-review-feedback.mjs`
- `videokit/src/review/review-schemas.ts`
- `videokit/docs/review-feedback-loop.md`

## Workflow

1. `npm run review:report -- --variant long|short`
2. `review-report.generated.json` を確認
3. creator が `review-feedback.generated.json` を埋める
4. 必要なら `patch` を埋めて `npm run review:apply`
5. agent は `targetLayer` ごとに追加修正する
6. creator が再度 render する

## Feedback Handling

- `blocking` と `high` を先に処理する
- `targetLayer` を跨いで雑に直さない
- `script / subtitle / timing / audio / visual / assets` を分けて扱う
- feedback に `keep-as-is` があれば、agent は過剰修正しない
