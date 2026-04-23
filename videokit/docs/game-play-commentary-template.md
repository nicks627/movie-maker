# Game Play Commentary Template

## Overview

`game-play-commentary` is a script-driven template for gameplay videos.

It is designed for:

- game実況
- walkthrough commentary
- boss fight breakdowns
- strategy explainers over captured gameplay

## What it automates

If you write the script in the expected format, the template automatically handles:

- segment timing
- cutting a long gameplay video into segment-sized windows
- lower-third commentary layout
- streamer / speaker card layout
- progress HUD
- popup highlights
- BGM switching by segment index

## Recommended script shape

Use canonical script format with:

- `template.id = "game-play-commentary"`
- `timeline.gameplay.video`
- `timeline.gameplay.segments[]`

Important segment fields:

- `text`
- `speaker`
- `duration`
- `trimBefore`
- `sourceDuration`
- `voiceFile`
- `emphasis`

`trimBefore` and `sourceDuration` are in frames.

## Sample

See:

- [gameplay-commentary.sample.json](C:/Users/taipo/movie_maker/videokit/src/data/gameplay-commentary.sample.json)

## Current limitations

Current implementation focuses on one main gameplay video with script-defined cuts.

Not yet included:

- automatic beat detection from audio
- auto facecam tracking
- live chat overlay generation
- editor UI specialized for gameplay segments
- automatic silence trimming from raw recordings

## Next recommended upgrades

1. Add a gameplay-specific editor panel for `trimBefore`, `zoom`, and `focus`.
2. Add waveform / timeline scrubbing against the source gameplay video.
3. Add script-to-segment generation from markdown or transcript.
