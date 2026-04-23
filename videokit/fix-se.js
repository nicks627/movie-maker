const fs = require('fs');
const d = JSON.parse(fs.readFileSync('src/data/script.json', 'utf8'));

function fixSe(scenes) {
  scenes.forEach(s => {
    if (s.se) {
      s.se.forEach(seObj => {
        if (seObj.file === 'ジャジャン.mp3') {
          seObj.file = '和太鼓でドドン.mp3';
        }
        if (seObj.file === 'ショック1.mp3') {
          seObj.file = 'ビシッとツッコミ1.mp3';
        }
      });
    }
  });
}

fixSe(d.long.scenes);
fixSe(d.short.scenes);
fs.writeFileSync('src/data/script.json', JSON.stringify(d, null, 2));
console.log('Fixed se files in script.json');
