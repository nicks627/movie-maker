import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const scriptPath = path.join(__dirname, '..', 'src', 'data', 'script.json');

try {
  const data = JSON.parse(fs.readFileSync(scriptPath, 'utf8'));
  let changed = 0;
  
  data.long.scenes.forEach(s => {
    if (s.subtitleText && s.subtitleText.length > 50 && s.subtitleStyle) {
      s.subtitleStyle.fontSize = 46;
      changed++;
    }
  });

  data.short.scenes.forEach(s => {
    if (s.subtitleText && s.subtitleText.length > 50 && s.subtitleStyle) {
      s.subtitleStyle.fontSize = 46;
      changed++;
    }
  });

  fs.writeFileSync(scriptPath, JSON.stringify(data, null, 2));
  console.log('Done! Changed scenes: ' + changed);
} catch(e) {
  console.error(e);
}
