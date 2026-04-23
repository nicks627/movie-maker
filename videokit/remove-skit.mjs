import fs from 'fs';

const p = 'src/data/script.json';
let data = JSON.parse(fs.readFileSync(p, 'utf8'));

// The first 5 scenes (0 to 4) represent the initial skit and greeting.
// The actual topic starts at index 5.
data.long.scenes = data.long.scenes.slice(5);

// Update bgm_sequence to shift the at_scene indexes back by 5
// and remove any that fall below 0.
let newBgm = [];
let firstBgmAdded = false;

data.long.bgm_sequence.forEach(bgm => {
  let newIndex = bgm.at_scene - 5;
  if (newIndex <= 0) {
    if (!firstBgmAdded) {
      newBgm.push({ at_scene: 0, file: bgm.file });
      firstBgmAdded = true;
    }
  } else {
    newBgm.push({ at_scene: newIndex, file: bgm.file });
  }
});
data.long.bgm_sequence = newBgm;

fs.writeFileSync(p, JSON.stringify(data, null, 2));
console.log('Removed opening skit from script.json');
