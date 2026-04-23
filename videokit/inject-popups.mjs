import fs from 'fs';

const p = 'src/data/script.json';
let data = JSON.parse(fs.readFileSync(p, 'utf8'));

// Search for keywords and inject popups
data.long.scenes.forEach(s => {
  s.popups = []; // Clear existing popups

  if (s.text.includes('フラッシュ') || s.text.includes('3D') || s.text.includes('BiCS')) {
    s.popups.push({ image: 'diagram_3dnand_1773506185867.png', startOffset: 15, duration: (s.duration || 90) - 15 });
  } else if (s.text.includes('CBA') || s.text.includes('ウェーハ') || s.text.includes('接合')) {
    s.popups.push({ image: 'diagram_cba_1773506200677.png', startOffset: 15, duration: (s.duration || 90) - 15 });
  } else if (s.text.includes('サーマル') || s.text.includes('熱')) {
    s.popups.push({ image: 'diagram_thermal_1773506214500.png', startOffset: 15, duration: (s.duration || 90) - 15 });
  } else if (s.text.includes('データセンター')) {
    s.popups.push({ image: 'diagram_datacenter_1773506229417.png', startOffset: 15, duration: (s.duration || 90) - 15 });
  } 
});

fs.writeFileSync(p, JSON.stringify(data, null, 2));
console.log('Injected new simplified popups into script.json');
