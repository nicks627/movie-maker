import fs from 'fs';

const p = 'src/data/script.json';
let data = JSON.parse(fs.readFileSync(p, 'utf8'));

data.long.scenes.forEach(s => {
  if (s.speaker === 'metan') {
    s.text = s.text
      .replace(/ちょっとずんだもん！いつまでゲームしてるのですわ！もう本番は始まってるですわ！/g, 'ちょっとずんだもん！いつまでゲームしてるの！もう本番は始まってるわよ！')
      .replace(/言い訳しない！さっさと挨拶して今日の解説を始めるですわ！/g, '言い訳しない！さっさと挨拶して今日の解説を始めるわよ！')
      .replace(/ですわね。/g, 'ですね。')
      .replace(/ですわ！/g, 'ですよ！')
      .replace(/ですわよね/g, 'ですよね')
      .replace(/ですわね/g, 'ですね')
      .replace(/ですわ/g, 'です');
  }
});

fs.writeFileSync(p, JSON.stringify(data, null, 2));
console.log('Normalized Metan dialog in script.json');
