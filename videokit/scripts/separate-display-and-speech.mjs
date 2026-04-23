import fs from 'node:fs';
import path from 'node:path';
import {
  normalizeDisplayValue,
  normalizeSpeechText as normalizeSpeechTextShared,
  toDisplayText as toDisplayTextShared,
} from './text-normalization.mjs';

const SCRIPT_PATH = path.join(process.cwd(), 'src', 'data', 'script.json');

const SPEECH_TO_DISPLAY_REPLACEMENTS = [
  ['エスエヌエス', 'SNS'],
  ['オーイーシーディー', 'OECD'],
  ['ケイエフエフ', 'KFF'],
  ['エヌエイチエス', 'NHS'],
  ['ヘルスケア・ドット・ガブ', 'HealthCare.gov'],
  ['ヘルスケアドットガブ', 'HealthCare.gov'],
  ['アカ・マーケットプレイス', 'ACA Marketplace'],
  ['アカマーケットプレイス', 'ACA Marketplace'],
  ['エーシーエー', 'ACA'],
  ['エックス', 'X'],
];

const KANJI_DIGIT_MAP = {
  零: 0,
  〇: 0,
  一: 1,
  二: 2,
  三: 3,
  四: 4,
  五: 5,
  六: 6,
  七: 7,
  八: 8,
  九: 9,
};

const parseJapaneseInteger = (value) => {
  const ascii = value.replace(/[０-９]/g, (char) => String.fromCharCode(char.charCodeAt(0) - 0xfee0));
  if (/^\d+$/.test(ascii)) {
    return Number.parseInt(ascii, 10);
  }

  let total = 0;
  let section = 0;
  let current = 0;

  for (const char of Array.from(value)) {
    if (char in KANJI_DIGIT_MAP) {
      current = KANJI_DIGIT_MAP[char];
      continue;
    }

    if (char === '十') {
      section += (current || 1) * 10;
      current = 0;
      continue;
    }

    if (char === '百') {
      section += (current || 1) * 100;
      current = 0;
      continue;
    }

    if (char === '千') {
      section += (current || 1) * 1000;
      current = 0;
      continue;
    }

    if (char === '万') {
      total += (section + current || 1) * 10000;
      section = 0;
      current = 0;
      continue;
    }

    if (char === '億') {
      total += (section + current || 1) * 100000000;
      section = 0;
      current = 0;
      continue;
    }

    if (char === '兆') {
      total += (section + current || 1) * 1000000000000;
      section = 0;
      current = 0;
    }
  }

  return total + section + current;
};

const japaneseNumberToDisplay = (token) => {
  if (!token) {
    return token;
  }

  const normalized = token.replace(/点/g, '.');
  if (/^\d+(\.\d+)?$/.test(normalized)) {
    return normalized;
  }

  if (normalized.includes('.')) {
    const [integerPart, decimalPart = ''] = normalized.split('.');
    return `${parseJapaneseInteger(integerPart)}.${Array.from(decimalPart)
      .map((char) => (char in KANJI_DIGIT_MAP ? KANJI_DIGIT_MAP[char] : char))
      .join('')}`;
  }

  return String(parseJapaneseInteger(normalized));
};

const visualUnits = [
  '兆円',
  '億円',
  '万円',
  '円',
  'ドル',
  'ポンド',
  'ユーロ',
  'スイスフラン',
  'フラン',
  'パーセント',
  'ポイント',
  '年度',
  '年',
  '月',
  '日',
  '時点',
  '前後',
  '帯',
  'ケース',
  '割',
  '倍',
  'カ国',
  'か国',
  '国',
  '州',
  '人',
  '社',
  '回',
  '位',
  '件',
];

const numberPattern = /[〇零一二三四五六七八九十百千万億兆]+(?:点[〇零一二三四五六七八九]+)?/g;
const currencyLikeUnits = new Set(['円', 'ドル', 'ポンド', 'ユーロ', 'スイスフラン', 'フラン']);
const largeNumberSuffixes = ['兆', '億', '万'];

const convertNumberWithUnit = (token, unit) => {
  if (currencyLikeUnits.has(unit)) {
    const suffix = largeNumberSuffixes.find((candidate) => token.endsWith(candidate));
    if (suffix) {
      return `${japaneseNumberToDisplay(token.slice(0, -suffix.length))}${suffix}${unit}`;
    }
  }

  return `${japaneseNumberToDisplay(token)}${unit}`;
};

const toDisplayText = (value) => {
  if (!value) {
    return value;
  }

  let next = value;

  for (const [speech, display] of SPEECH_TO_DISPLAY_REPLACEMENTS) {
    next = next.replaceAll(speech, display);
  }

  next = next.replace(
    new RegExp(`(${numberPattern.source})(${visualUnits.join('|')})`, 'g'),
    (_, token, unit) => convertNumberWithUnit(token, unit)
  );
  next = next
    .replace(/(\d+(?:\.\d+)?)パーセント/g, '$1%')
    .replace(/(\d+)カ国/g, '$1カ国')
    .replace(/(\d+)か国/g, '$1か国');

  return next;
};

const updateScene = (scene) => {
  const speechSource = scene.speechText ?? scene.text ?? scene.subtitleText ?? '';
  const speechText = normalizeSpeechTextShared(speechSource);
  const displaySource = scene.text ?? scene.subtitleText ?? speechSource;
  const displayText = toDisplayTextShared(displaySource || speechText);

  scene.speechText = speechText;
  scene.text = displayText;
  scene.subtitleText = displayText;
  scene.popups = (scene.popups ?? []).map((popup) => ({
    ...popup,
    props: normalizeDisplayValue(popup.props ?? {}),
  }));
};

const main = () => {
  const script = JSON.parse(fs.readFileSync(SCRIPT_PATH, 'utf8'));

  for (const variantKey of ['long', 'short']) {
    const scenes = script?.[variantKey]?.scenes;
    if (!Array.isArray(scenes)) {
      continue;
    }

    scenes.forEach(updateScene);
  }

  const content = `${JSON.stringify(script, null, 2)}\n`;
  const tempPath = `${SCRIPT_PATH}.tmp`;
  fs.writeFileSync(tempPath, content, 'utf8');

  try {
    fs.renameSync(tempPath, SCRIPT_PATH);
  } catch (error) {
    if (error && (error.code === 'EPERM' || error.code === 'EACCES')) {
      fs.writeFileSync(SCRIPT_PATH, content, 'utf8');
      fs.unlinkSync(tempPath);
    } else {
      throw error;
    }
  }

  console.log(`Updated display/speech separation in ${SCRIPT_PATH}`);
};

main();
