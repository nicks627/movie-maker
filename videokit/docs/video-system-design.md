# Video System Design

## Goal

This project should evolve from a single "Yukkuri explainer" renderer into a script-driven video system that can:

1. Define what kinds of videos are supported by script only.
2. Switch between portrait and landscape output without code edits.
3. Support multiple reusable templates with a stable script contract.

This document is the design baseline for that evolution.

## Current State

Today the project is centered on a single renderer: `YukkuriVideo`.

The current script can already control:

- scene timing
- speaker and dialogue
- voice file / generated voice
- background image or background video
- popup images
- BGM sequence
- subtitle style and position
- character position, scale, and transitions
- image/background transitions

The current limitations are:

- composition size is fixed in `Root.tsx`
- only one main template exists
- layout logic is largely hard-coded for the current explainer style
- `short.config` / `long.config` are not first-class render contracts
- there is no explicit schema for "what is script-only configurable"

## Target Model

We separate the system into 3 layers:

1. `VideoScript`
   Purpose: user-authored data only.
2. `Template`
   Purpose: layout, animation, and rendering rules.
3. `Renderer`
   Purpose: Remotion composition registration and final rendering.

The rule is:

- Script selects a template.
- Template declares what script fields it supports.
- Renderer uses script output settings to choose composition size and timing.

## Script-Only Video Spec

### Definition

"Script only" means a user can change the final video by editing JSON data without touching React / TypeScript.

### Supported script-only controls

The following should be guaranteed script-editable across supported templates:

- project metadata
- output size and orientation
- template selection
- scene timing
- dialogue text
- speaker / voice parameters
- subtitle content and style
- character placement and size
- background media
- overlay media
- BGM / SE timing
- transitions

### Not script-only by default

These should require template or code work unless explicitly exposed:

- entirely new layer systems
- custom particle systems
- arbitrary motion-graphics logic
- brand new interaction models
- custom scene generators that do not fit the template contract

## Proposed Canonical Script Schema

Use one canonical top-level format for all projects.

```json
{
  "project": {
    "id": "kioxia-bics10",
    "title": "KIOXIA BiCS10 Explained",
    "version": 2,
    "defaultLocale": "ja-JP"
  },
  "output": {
    "preset": "landscape-fhd",
    "width": 1920,
    "height": 1080,
    "fps": 30,
    "safeArea": {
      "top": 80,
      "right": 96,
      "bottom": 96,
      "left": 96
    }
  },
  "template": {
    "id": "yukkuri-explainer",
    "variant": "standard"
  },
  "audio": {
    "bgmVolume": 0.15,
    "masterVolume": 1
  },
  "timeline": {
    "bgm": [
      { "atScene": 0, "file": "happy_01.mp3" }
    ],
    "scenes": [
      {
        "id": "scene_001",
        "startTime": 0,
        "duration": 150,
        "speaker": "metan",
        "text": "Hello world",
        "emotion": "通常",
        "voice": {
          "engine": "voicevox-core",
          "file": "scene_001.wav",
          "speedScale": 1,
          "pitchScale": 0,
          "intonationScale": 1,
          "volumeScale": 1
        },
        "character": {
          "x": 18,
          "y": 10,
          "scale": 1,
          "transition": {
            "type": "dissolve",
            "duration": 12
          }
        },
        "subtitle": {
          "x": 10,
          "y": 4,
          "width": 38,
          "height": 12,
          "style": {
            "fontSize": 48,
            "textAlign": "center"
          }
        },
        "background": {
          "image": "bg.png",
          "video": "assets/video/scene_001.mp4",
          "transition": {
            "type": "wipe",
            "duration": 18,
            "direction": "left"
          }
        },
        "overlays": [
          {
            "id": "overlay_001",
            "image": "diagram.png",
            "startOffset": 12,
            "duration": 90,
            "x": 52,
            "y": 84,
            "width": 28,
            "height": 42,
            "transition": {
              "type": "zoom",
              "duration": 12
            }
          }
        ]
      }
    ]
  }
}
```

## Compatibility Strategy

To avoid breaking existing files:

1. Keep reading the current `long.scenes` format.
2. Introduce a normalizer that converts legacy script into canonical `VideoScript`.
3. Make all renderers consume normalized data only.

### Normalization boundary

Add a new module, for example:

- `src/script/schema.ts`
- `src/script/normalize.ts`
- `src/templates/index.ts`

`normalize.ts` should accept:

- current `scriptData.long`
- future canonical script

and return one normalized in-memory structure.

## Orientation Design

### Output presets

Define named presets first, custom size second.

Recommended built-in presets:

- `landscape-fhd`: `1920x1080`
- `portrait-fhd`: `1080x1920`
- `square`: `1080x1080`
- `landscape-hd`: `1280x720`
- `portrait-hd`: `720x1280`

### Output contract

The renderer should resolve output settings in this order:

1. explicit `output.width` and `output.height`
2. `output.preset`
3. template default preset

### Safe area contract

Each output mode should expose safe areas to templates so subtitle and character defaults can adapt automatically.

Examples:

- portrait: taller subtitle area, smaller character width, tighter horizontal margins
- landscape: wider subtitle area, larger side character staging

### Required implementation change

`Root.tsx` should stop hard-coding `1920x1080`.

Instead:

1. read normalized script output
2. compute width / height / fps
3. register compositions based on resolved output settings

## Template System Design

### Template responsibilities

Each template owns:

- visual layout
- default positions and styles
- supported scene features
- template-specific validation
- fallback behavior

### Template registry

Introduce a registry:

```ts
type TemplateDefinition = {
  id: string;
  label: string;
  defaultOutputPreset: string;
  supports: {
    characters: boolean;
    subtitles: boolean;
    overlays: boolean;
    bgm: boolean;
    portrait: boolean;
    landscape: boolean;
  };
  normalizeScene: (scene: NormalizedScene, ctx: TemplateContext) => NormalizedScene;
  Component: React.FC<TemplateRenderProps>;
};
```

### Initial template set

Start with 3 templates:

1. `yukkuri-explainer`
   Best for current dialogue + background + popup flow.
2. `news-caption`
   Character optional, stronger subtitle area, headline strip, image-heavy.
3. `single-narration`
   No standing character by default, full-screen visual focus, subtitle-led narration.

### Why this split

These 3 cover most early use cases without exploding complexity:

- two-character explainers
- factual news / recap videos
- documentary / narration reels

## Scene Contract by Template

Templates should support the same base scene model, but may interpret defaults differently.

Examples:

- `yukkuri-explainer`
  character shown by default
- `news-caption`
  subtitle block larger, character hidden unless `character.visible === true`
- `single-narration`
  no character lane, overlays become primary visuals

This keeps one schema while allowing different presentation logic.

## Recommended File Structure

```text
src/
  script/
    schema.ts
    normalize.ts
    presets.ts
  templates/
    index.ts
    types.ts
    yukkuri-explainer/
      component.tsx
      defaults.ts
    news-caption/
      component.tsx
      defaults.ts
    single-narration/
      component.tsx
      defaults.ts
  render/
    resolve-composition.ts
```

## Migration Plan

### Phase 1

Formalize data model only.

- add canonical script schema
- add legacy normalizer
- keep current renderer as the only template

### Phase 2

Enable output switching.

- move width / height / fps into normalized output config
- update composition registration
- adapt layout defaults using safe area and aspect ratio

### Phase 3

Extract template registry.

- rename current `YukkuriVideo` into template implementation
- route rendering through template selection
- add second template

### Phase 4

Template-aware editor.

- template selector in editor
- show only fields supported by current template
- preview in selected orientation

## Editor Requirements

To make this truly script-driven, the editor should eventually:

- preview portrait and landscape live
- switch template from UI
- validate script against selected template
- show unsupported fields as warnings
- expose safe-area guides per output preset

## Acceptance Criteria

The redesign is complete when all of the following are true:

1. A user can switch between portrait and landscape by editing script only.
2. A user can select a template by editing script only.
3. Existing legacy script files still render.
4. Each template renders from the same normalized scene model.
5. The editor preview reflects the active template and output preset.

## Practical Recommendation

Implementation should begin with:

1. canonical script schema
2. legacy normalizer
3. output preset resolver
4. template registry wrapper around the current `YukkuriVideo`

That path gives immediate value without rewriting the whole editor first.
