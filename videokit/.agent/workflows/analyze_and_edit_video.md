# Video Analysis & Editing Workflow

This document outlines the standard procedure for an agent to analyze a provided source video (e.g., a "Yukkuri" video) and reconstruct/edit it using the Remotion-based Movie Maker system.

## 1. Video Content Analysis
When a source video is provided, follow these steps to understand its structure:

### A. Metadata Extraction
- Use `ffprobe` to determine the total duration and frame rate.
- Identify segments where the scene changes.

### B. Visual Archiving (Frame Extraction)
- Extract frames at 1fps using FFmpeg:
  ```bash
  npx remotion ffmpeg -i source.mp4 -vf fps=1 analysis_frames/frame_%03d.png
  ```
- Generate a `movie_profile_gemini.json` recording:
  - Timestamp (seconds)
  - Character status (who is speaking, emotions)
  - Background description
  - On-screen text/subtitles

## 2. Script & Asset Generation
- Convert the `movie_profile_gemini.json` into the project's `script.json` format.
- Match transcribed text with the appropriate character (e.g., Reimu, Marisa).
- Select or generate matching assets:
  - **Backgrounds**: Match the source environment.
  - **Character Skins**: Set emotions based on the analysis.

## 3. Direction & Effects (Skit Implementation)
Refine the scene by adding cinematic elements:

### A. Subtitle Placement
- Position subtitles to match the source or follow the `visual-system.md` rules.
- Ensure fonts and colors are consistent with the character's personality.

### B. Sound Effects (SE)
- Identify key actions (popping up, transitions, emphasis) and assign appropriate SE from the library.
- Examples: `cursor.mp3`, `decision.mp3`, `pop.mp3`.

### C. Visual Effects & Popups
- Add effects to emphasize dialogue (e.g., `pulse`, `glitch` for shock).
- Use popups for items or additional information mentioned in the script.

## 4. Rendering & Verification
- Generate voices using `npm run generate:voices`.
- Preview the result using the editor UI.
- Render the final output:
  ```bash
  npm run render:both
  ```

---
*Note: This workflow should be followed whenever a user provides a video for reconstruction or style-copying.*
