import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const scriptPath = path.join(__dirname, '..', 'src', 'data', 'script.json');

const raw = fs.readFileSync(scriptPath, 'utf-8');
const data = JSON.parse(raw);

let newScenes = [];

data.long.scenes.forEach(scene => {
  // Fix background images
  if (scene.bg_image === 'assets/images/quant-overfit-board.svg' || scene.bg_image === 'assets/images/quant-overfit-board') {
    scene.bg_image = 'assets/images/overfitting_danger.png';
  }
  if (scene.bg_image === 'assets/images/quant-bionic-board.svg' || scene.bg_image === 'assets/images/quant-bionic-board') {
    scene.bg_image = 'assets/images/bionic_trader.png';
  }

  const textLength = scene.subtitleText.length;
  if (textLength > 50) {
    // Split into two
    let splitPoints = ['。', '、', '！', '？', 'で、', 'が、', 'は、'];
    let bestSplit = -1;
    let mid = Math.floor(textLength / 2);

    for (let point of splitPoints) {
      let idx = scene.subtitleText.indexOf(point, mid - 10);
      if (idx !== -1 && idx < textLength - 5) {
        bestSplit = idx + point.length;
        break;
      }
    }

    if (bestSplit === -1) bestSplit = mid;

    // Create scene A
    const sceneA = JSON.parse(JSON.stringify(scene));
    sceneA.text = scene.text.substring(0, bestSplit);
    sceneA.subtitleText = scene.subtitleText.substring(0, bestSplit);
    sceneA.speechText = scene.speechText.substring(0, bestSplit);
    
    // Adjust scene A duration proportionally
    let ratio = bestSplit / textLength;
    sceneA.duration = Math.floor(scene.duration * ratio);

    // Create scene B
    const sceneB = JSON.parse(JSON.stringify(scene));
    sceneB.text = scene.text.substring(bestSplit);
    sceneB.subtitleText = scene.subtitleText.substring(bestSplit);
    sceneB.speechText = scene.speechText.substring(bestSplit);
    sceneB.duration = scene.duration - sceneA.duration;
    // Remove popups and SE from B to avoid double playing
    sceneB.popups = [];
    sceneB.se = [];

    newScenes.push(sceneA, sceneB);
  } else {
    newScenes.push(scene);
  }
});

// Re-index scenes
let currentTime = 0;
newScenes.forEach((scene, index) => {
  scene.id = `scene_${index.toString().padStart(2, '0')}`;
  scene.voiceFile = `quant_long_${scene.id}.wav`;
  scene.startTime = currentTime;
  currentTime += scene.duration;
});

data.long.scenes = newScenes;

fs.writeFileSync(scriptPath, JSON.stringify(data, null, 2), 'utf-8');
console.log('Successfully rebuilt script.json with split scenes and new images.');
