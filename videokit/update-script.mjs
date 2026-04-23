import fs from 'fs';

let t = fs.readFileSync('src/data/script.json', 'utf8');
t = t.replace(/"speaker":\s*"reimu"/g, '"speaker": "metan"');
t = t.replace(/"speaker":\s*"marisa"/g, '"speaker": "zundamon"');
fs.writeFileSync('src/data/script.json', t);

console.log('Script updated with metan and zundamon.');
