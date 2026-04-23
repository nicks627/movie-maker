import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const scriptPath = path.join(__dirname, '..', 'src', 'data', 'script.json');

try {
  const data = JSON.parse(fs.readFileSync(scriptPath, 'utf8'));
  let bgCleaned = 0;
  let fontFixed = 0;
  
  ['long', 'short'].forEach(variant => {
    if (data[variant] && data[variant].scenes) {
      data[variant].scenes.forEach((scene) => {
        // Fix font sizes for long subtitles
        if (scene.subtitleText && scene.subtitleText.length > 50) {
          if (scene.subtitleStyle) {
            scene.subtitleStyle.fontSize = 46;
            fontFixed++;
          }
        }

        // Clean backgrounds and center popups
        if (scene.popups && scene.popups.length > 0) {
          if (scene.bg_image && scene.bg_image !== "") {
            console.log(`Variant ${variant}, Scene ${scene.id} has popups. Clearing bg_image.`);
            scene.bg_image = "";
            bgCleaned++;
          }
          // Center the popup regardless
          scene.popups.forEach(popup => {
            popup.imageX = 50;
            popup.imageY = 46; // perfectly centered vertically in typical 16:9 Remotion layout
            popup.imageWidth = 84; // widen it slightly to make it prominent
            // Not touching imageHeight rigidly to allow components to naturally wrap
          });
        }
      });
    }
  });

  fs.writeFileSync(scriptPath, JSON.stringify(data, null, 2));
  console.log(`✅ Success! Cleaned ${bgCleaned} background overlaps and adjusted ${fontFixed} long subtitle font sizes.`);
} catch (e) {
  console.error("Error modifying JSON:", e);
}
