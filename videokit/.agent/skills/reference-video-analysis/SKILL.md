---
name: reference-video-analysis
description: Analyze reference YouTube videos with local packs and translate them into movie-maker production artifacts
metadata:
  tags: analysis, youtube, layout, audio, script, production
---

## When to use

Use this skill when a project has one or more reference YouTube videos and you need to turn their structure into `movie-maker` production guidance.

## Read First

1. `agent-rules/common/core.md`
2. `agent-rules/common/visual-system.md`
3. the matching template rule in `agent-rules/templates/`
4. the matching playbook in [../../../docs/playbooks/README.md](../../../docs/playbooks/README.md)

## Inputs

Look under `projects/<project-id>/analysis/youtube/`.

Important files:

- `analysis-summary.json`
- `comparison/comparison-summary.json`
- `layout-signals.json`
- `audio-signals.json`
- `structure-signals.json`
- `summary.md`

## Output Artifacts

Write or update these files:

- `projects/<project-id>/analysis/youtube/codex-analysis-report.md`
- `projects/<project-id>/analysis/youtube/codex-analysis-brief.json`
- `projects/<project-id>/analysis/youtube/layout-contract.json`
- `projects/<project-id>/analysis/youtube/audio-direction-draft.json`
- `projects/<project-id>/analysis/youtube/script-outline.json`

## Interpretation Rules

- Learn `structure`, not copyrighted wording or audio assets
- Translate the reference into this repo's template rules
- Make subtitle / popup / background zones explicit
- Treat BGM / SE as `role analysis`, not source reuse
- Keep the output directly useful for `generate:from-analysis`
