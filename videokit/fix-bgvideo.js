const fs = require('fs');
const d = JSON.parse(fs.readFileSync('src/data/script.json', 'utf8'));
d.long.scenes.forEach(s => delete s.bg_video);
d.short.scenes.forEach(s => delete s.bg_video);
fs.writeFileSync('src/data/script.json', JSON.stringify(d, null, 2));
console.log('Fixed script.json');
