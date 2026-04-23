const fs = require('fs');
const d = JSON.parse(fs.readFileSync('src/data/script.json', 'utf8'));

function fix(scenes) {
  scenes.forEach(s => {
    if (s.text) {
      s.text = s.text.replace(/NY/g, 'ニューヨーク').replace(/OECD/g, 'オーイーシーディー');
    }
  });
}

fix(d.long.scenes);
fix(d.short.scenes);
fs.writeFileSync('src/data/script.json', JSON.stringify(d, null, 2));
console.log('Fixed alphabet readings');
