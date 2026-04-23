import fs from 'fs';
import path from 'path';

const SCRIPT_PATH = path.join(process.cwd(), 'src', 'data', 'script.json');
const scriptData = JSON.parse(fs.readFileSync(SCRIPT_PATH, 'utf8'));

// 1. Add default emotion to existing scenes if not present
scriptData.long.scenes = scriptData.long.scenes.map(scene => {
  if (!scene.emotion) {
    scene.emotion = scene.speaker === 'zundamon' ? '普通' : '通常';
  }
  return scene;
});

// 2. Add a new skit (chaban) at the beginning
const skitScenes = [
  {
    "id": "skit_0",
    "speaker": "metan",
    "text": "ちょっとずんだもん！いつまでゲームしてるのよ！もう本番は始まってるわよ！",
    "emotion": "怒り",
    "bg_image": "bg.png",
    "asset_query": "angry fire comic",
    "duration": 220,
    "startTime": 0
  },
  {
    "id": "skit_1",
    "speaker": "zundamon",
    "text": "うわぁっ！？ご、ごめんなのだ！ちょっとだけキリのいいところまで……",
    "emotion": "驚き",
    "bg_image": "bg.png",
    "asset_query": "surprise shock",
    "duration": 200,
    "startTime": 230
  },
  {
    "id": "skit_2",
    "speaker": "metan",
    "text": "言い訳しない！さっさと挨拶して今日の解説を始めるわよ！",
    "emotion": "企み",
    "bg_image": "bg.png",
    "asset_query": "pushing forward motivation",
    "duration": 180,
    "startTime": 440
  },
  {
    "id": "skit_3",
    "speaker": "zundamon",
    "text": "ひぃっ！わ、わかったのだぜ。えーと……ゆっくりしていってね！なのだぜ！",
    "emotion": "恐怖",
    "bg_image": "bg.png",
    "asset_query": "panic running",
    "duration": 200,
    "startTime": 630
  }
];

// Combine the skit at the beginning of the long scenes
scriptData.long.scenes = [...skitScenes, ...scriptData.long.scenes];

// Rewrite IDs and bump standard scene start times slightly just to keep sequence intact
// (generate-voices.mjs will recalculate exact frame times anyway)
scriptData.long.scenes.forEach((scene, index) => {
  scene.id = `scene_${index}`;
});

// Shift the BGM sequence triggers up by the number of skit scenes (4 scenes)
scriptData.long.bgm_sequence = scriptData.long.bgm_sequence.map(bgm => {
  bgm.at_scene += skitScenes.length;
  return bgm;
});

// Add a funny BGM for the skit
scriptData.long.bgm_sequence.unshift({
  "at_scene": 0,
  "file": "happy_01.mp3" // We'll just reuse the dummy track, ideally a comic track
});

fs.writeFileSync(SCRIPT_PATH, JSON.stringify(scriptData, null, 2), 'utf8');
console.log('Inserted skit scenes into script.json.');
