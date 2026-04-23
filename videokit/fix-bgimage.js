const fs = require('fs');
const d = JSON.parse(fs.readFileSync('src/data/script.json', 'utf8'));

const bgs = [
  'assets/images/berkshire_intro_bg.svg',
  'assets/images/berkshire_growth_bg.svg',
  'assets/images/berkshire_flow_bg.svg',
  'assets/images/berkshire_risk_bg.svg'
];

d.long.scenes.forEach((s, idx) => s.bg_image = bgs[idx % bgs.length]);
d.short.scenes.forEach((s, idx) => s.bg_image = bgs[idx % bgs.length]);
fs.writeFileSync('src/data/script.json', JSON.stringify(d, null, 2));
console.log('Fixed bg_image in script.json');
