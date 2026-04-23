const fs = require('fs');
const d = JSON.parse(fs.readFileSync('src/data/script.json', 'utf8'));

function applyYukkuri(scenes) {
  scenes.forEach(s => {
    if (s.speaker === 'metan') s.speaker = 'marisa';
    if (s.speaker === 'zundamon') s.speaker = 'reimu';
  });
}

applyYukkuri(d.long.scenes);
applyYukkuri(d.short.scenes);
fs.writeFileSync('src/data/script.json', JSON.stringify(d, null, 2));
console.log('Swapped characters to Marisa and Reimu');
