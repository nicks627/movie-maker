import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const scriptPath = path.join(__dirname, '..', 'src', 'data', 'script.json');
const outPath = path.join(__dirname, '..', 'layout_analysis.txt');

try {
  const data = JSON.parse(fs.readFileSync(scriptPath, 'utf8'));
  let outStr = '';
  
  if (data['long'] && data['long'].scenes) {
    const scenes = data['long'].scenes;
    let currentPopup = null;
    let currentBg = null;
    
    scenes.forEach(scene => {
      outStr += `Scene ${scene.id} | duration: ${scene.duration}\n`;
      outStr += `  Subtitle: ${scene.subtitleText?.substring(0, 30)}...\n`;
      
      const hasBgImage = scene.bg_image && scene.bg_image.trim() !== '';
      const hasBgVideo = scene.bg_video && scene.bg_video.trim() !== '';
      const popupsCount = scene.popups ? scene.popups.length : 0;
      
      outStr += `  BgImage: ${hasBgImage ? scene.bg_image : 'NONE'} | BgVideo: ${hasBgVideo ? scene.bg_video : 'NONE'} | Popups: ${popupsCount}\n`;
      if (popupsCount > 0) {
        scene.popups.forEach((p, i) => {
          outStr += `    P${i}[${p.type}]: ${p.title} - ${p.content ? (typeof p.content === 'string' ? p.content.substring(0,20) : JSON.stringify(p.content)) : ''}\n`;
        });
      }
      outStr += '\n';
    });
  }
  fs.writeFileSync(outPath, outStr, 'utf8');
} catch (e) {
  console.error("Error modifying JSON:", e);
}
