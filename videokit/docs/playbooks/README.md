# Video Playbooks

`movie-maker` で新しい動画を始めるときのジャンル別 playbook 一覧です。

## Templates

- [Explainer](./explainer.md)
- [Gameplay](./gameplay.md)
- [LINE Chat](./line-chat.md)
- [Political](./political.md)
- [Generic](./generic.md)

## Recommended Start

1. テンプレートを決める
2. 対応 playbook を読む
3. `npm run new:project -- --template <type> --project-id <slug> --title <title>`
4. 必要なら `npm run analyze:youtube:deep ...`
5. 参考動画から下書きを作るなら `npm run generate:from-analysis -- --template <type> --project-id <slug>`
6. `npm run review:layout`
7. `npm run review:preflight`
