import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const scriptPath = path.join(__dirname, '..', 'src', 'data', 'script.json');
const logPath = path.join(__dirname, '..', 'analysis.txt');

const raw = fs.readFileSync(scriptPath, 'utf-8');
const data = JSON.parse(raw);

let modified = false;
let logs = "";

data.long.scenes.forEach(scene => {
  if (scene.bg_image === 'assets/images/quant-overfit-board.svg' || scene.bg_image === 'assets/images/quant-overfit-board') {
    scene.bg_image = 'assets/images/overfitting_danger.png';
    modified = true;
  }
  if (scene.bg_image === 'assets/images/quant-bionic-board.svg' || scene.bg_image === 'assets/images/quant-bionic-board') {
    scene.bg_image = 'assets/images/bionic_trader.png';
    modified = true;
  }
  
  if (scene.subtitleText && scene.subtitleText.length > 45) {
    logs += `[LONG TEXT] Scene ${scene.id} length: ${scene.subtitleText.length} chars\n  Text: ${scene.subtitleText}\n`;
  }
});

if (modified) {
  fs.writeFileSync(scriptPath, JSON.stringify(data, null, 2), 'utf-8');
  logs += '\nscript.json updated with new images.\n';
} else {
  logs += '\nNo background images modified.\n';
}

fs.writeFileSync(logPath, logs, 'utf-8');
