---
name: project-setup
description: Setup workflow for movie-maker on a new Windows or macOS machine
metadata:
  tags: setup, onboarding, voicevox, youtube-analysis, assets
---

## When to use

Use this skill when you need to prepare this repository on a fresh machine.

## Workflow

1. From the repo root, run `npm run setup:full`
2. Run `npm run doctor`
3. Run `npm run doctor:analysis`
4. Run `npm run doctor:assets`
5. If asset sources show `missing-env`, follow [../../../docs/api-key-setup.md](../../../docs/api-key-setup.md)
6. Create a starter with `npm run new:project -- --template <genre> --output src/data/script-<slug>.json --project-id <slug>`

## Templates

- `explainer`
- `gameplay`
- `line-chat`
- `political`
- `generic`

## Notes

- `setup:full` installs the base environment plus analysis dependencies
- `doctor:assets` warns for missing API keys but does not block setup completion
- VOICEVOX is the default cross-platform voice path
- AquesTalk is treated as a Windows-local option
