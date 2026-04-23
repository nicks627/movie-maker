import fs from 'fs';

const p = 'src/data/script.json';
let data = JSON.parse(fs.readFileSync(p, 'utf8'));

(data.long || data.short).scenes.forEach(s => {
  if (s.speaker === 'zundamon') {
    s.text = s.text
      .replace(/だぜ/g, 'なのだ')
      .replace(/ぜ！/g, 'のだ！')
      .replace(/ぜ。/g, 'のだ。')
      .replace(/だよ/g, 'なのだ')
      // Additional mapping
      .replace(/ね。/g, 'なのだ。')
      .replace(/ね！/g, 'なのだ！')
      .replace(/かな？/g, 'かな？なのだ')
      .replace(/から、/g, 'から、なのだ')
      .replace(/のか？/g, 'のか？なのだ')
      // fix any accidental duplicates like なのだなのだ
      .replace(/なのだなのだ/g, 'なのだ');
  } else if (s.speaker === 'metan') {
    s.text = s.text
      .replace(/わよ/g, 'ですわ')
      .replace(/よ！/g, 'ですわ！')
      .replace(/だわ/g, 'ですわ')
      .replace(/わね/g, 'ですわね')
      .replace(/よね/g, 'ですわよね')
      .replace(/ね。/g, 'ですわね。')
      .replace(/ね！/g, 'ですわ！')
      .replace(/だね/g, 'ですわね')
      // fix duplicates
      .replace(/ですわですわ/g, 'ですわ');
  }
});

fs.writeFileSync(p, JSON.stringify(data, null, 2));
console.log('Rewrote dialogue in script.json');
