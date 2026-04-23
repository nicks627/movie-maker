# Template Rules: Game Commentary

ユーザーが `ゲーム実況` を選んだときに使う。

## Shared Rules

先に `agent-rules/templates/clip-based-video.md` を読む。
次に `agent-rules/templates/audio-direction.md` を読む。

## Reference Script Learning

新しい台本を書く前に、参考台本を最低 2 本読む。

- 反応語
- 文の長さ
- テンションの波
- ミス時の言い回し
- opening / closing

を抽出してから新しい実況文へ反映する。

## Gameplay Video Analysis

先に動画を分析して不要区間を切る。

### Gather video info

```bash
ffprobe -v error -show_entries stream=width,height,duration,r_frame_rate -of json "<input_video_path>"
```

### Detect cut candidates

```bash
ffmpeg -i "<input>" -af silencedetect=noise=-40dB:d=3 -f null - 2>&1
ffmpeg -i "<input>" -vf "freezedetect=n=-60dB:d=2" -f null - 2>&1
ffmpeg -i "<input>" -vf "select='gt(scene,0.4)',showinfo" -f null - 2>&1
```

### Output cut plan

`videokit/cut_plan.json` を作って、ユーザー確認後に切る。

### Execute cuts

```bash
ffmpeg -f concat -safe 0 -i concat_list.txt -c copy "videokit/public/assets/video/gameplay_cut.mp4"
```

## Commentary Script

- kept segment を scene に対応付ける
- `duration` は動画尺に合わせる
- `bg_video` は切り出した gameplay を使う
- 内容に沿った実況とリアクションを書く

## Workflow

1. テンプレート確認
2. 参考台本を読む
3. 動画パスを受け取る
4. `ffprobe`
5. silence / freeze / scene detection
6. `cut_plan.json`
7. ユーザー承認後に cut
8. `script.json` を作る
9. `node update-script.mjs`
10. `node rewrite-script.mjs`
11. `node generate-voices.mjs`
12. `npm run render`
