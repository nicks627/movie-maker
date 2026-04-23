import fs from 'fs';
import path from 'path';
import { getAudioDurationInSeconds } from 'get-audio-duration';
import { spawn } from 'child_process';
import { loadLocalEnv, resolveCommandOrPath, isPathLike } from './scripts/env-utils.mjs';
import { normalizeSpeechText as normalizeSpeechTextShared } from './scripts/text-normalization.mjs';

loadLocalEnv();

const SCRIPT_PATH = path.join(process.cwd(), 'src', 'data', 'script.json');
const PROJECT_SCRIPT_MIRRORS = {
  'city-cost-single': [
    path.join(process.cwd(), 'src', 'data', 'script-city-cost-single.json'),
  ],
  'kantei-control-long': [
    path.join(process.cwd(), 'src', 'data', 'script-kantei-control-long.json'),
  ],
  'kantei-control-short': [
    path.join(process.cwd(), 'src', 'data', 'script-kantei-control-short.json'),
  ],
  'national-intelligence': [
    path.join(process.cwd(), 'src', 'data', 'script-national-intelligence.json'),
  ],
  'cbdc-surveillance': [
    path.join(process.cwd(), 'src', 'data', 'script-cbdc-surveillance.json'),
  ],
  'iran-war-turning-point': [
    path.join(process.cwd(), 'src', 'data', 'script-iran-war-turning-point.json'),
  ],
  'epstein-japan-silence': [
    path.join(process.cwd(), 'src', 'data', 'script-epstein-japan-silence.json'),
  ],
  'takaichi-economic-security-praise': [
    path.join(process.cwd(), 'src', 'data', 'script-takaichi-economic-security-praise.json'),
  ],
  'takaichi-cyber-infrastructure-praise': [
    path.join(process.cwd(), 'src', 'data', 'script-takaichi-cyber-infrastructure-praise.json'),
  ],
  'trump-iran-coercive-diplomacy': [
    path.join(process.cwd(), 'src', 'data', 'script-trump-iran-coercive-diplomacy.json'),
  ],
  'mof-austerity-critique': [
    path.join(process.cwd(), 'src', 'data', 'script-mof-austerity-critique.json'),
  ],
};
const VOICES_DIR = path.join(process.cwd(), 'public', 'voices');
const DEFAULT_FPS = 30;
const IS_WINDOWS = process.platform === 'win32';
const DEFAULT_PYTHON_CANDIDATES = IS_WINDOWS
  ? [path.join(process.cwd(), '.venv', 'Scripts', 'python.exe')]
  : [
      path.join(process.cwd(), '.venv', 'bin', 'python3'),
      path.join(process.cwd(), '.venv', 'bin', 'python'),
    ];
const DEFAULT_PYTHON =
  DEFAULT_PYTHON_CANDIDATES.find((candidate) => fs.existsSync(candidate)) ??
  DEFAULT_PYTHON_CANDIDATES[0];
const CONFIGURED_PYTHON = resolveCommandOrPath(process.env.PYTHON_BIN, process.cwd());
const PYTHON_BIN = CONFIGURED_PYTHON ?? DEFAULT_PYTHON;
const DEFAULT_VARIANT = 'long';
const SHORT_SPEED_MULTIPLIER = 0.93;

const SPEAKERS = {
  metan: { name: 'metan', engine: 'voicevox', id: 2, speedScale: 1.42, pitchScale: 0.05, intonationScale: 1.2, volumeScale: 1.0 },
  zundamon: { name: 'zundamon', engine: 'voicevox', id: 3, speedScale: 1.42, pitchScale: 0.02, intonationScale: 1.3, volumeScale: 1.0 },
  tsumugi: { name: 'tsumugi', engine: 'voicevox', id: 8, speedScale: 1.45, pitchScale: 0.0, intonationScale: 1.15, volumeScale: 1.0 },
  himari: { name: 'himari', engine: 'voicevox', id: 14, speedScale: 1.35, pitchScale: -0.02, intonationScale: 1.05, volumeScale: 1.0 },
  hau: { name: 'hau', engine: 'voicevox', id: 10, speedScale: 1.45, pitchScale: 0.01, intonationScale: 1.15, volumeScale: 1.0 },
  sora: { name: 'sora', engine: 'voicevox', id: 16, speedScale: 1.3, pitchScale: 0.0, intonationScale: 1.1, volumeScale: 1.0 },
  whitecul: { name: 'whitecul', engine: 'voicevox', id: 23, speedScale: 1.35, pitchScale: -0.03, intonationScale: 1.05, volumeScale: 1.0 },
  usagi: { name: 'usagi', engine: 'voicevox', id: 61, speedScale: 1.45, pitchScale: 0.02, intonationScale: 1.2, volumeScale: 1.0 },
  ryusei: { name: 'ryusei', engine: 'voicevox', id: 13, speedScale: 1.25, pitchScale: -0.03, intonationScale: 1.0, volumeScale: 1.0 },
  sayo: { name: 'sayo', engine: 'voicevox', id: 46, speedScale: 1.35, pitchScale: 0.01, intonationScale: 1.1, volumeScale: 1.0 },
  mico: { name: 'mico', engine: 'voicevox', id: 43, speedScale: 1.4, pitchScale: 0.03, intonationScale: 1.2, volumeScale: 1.0 },
  zonko_jikkyofuu: { name: 'zonko_jikkyofuu', engine: 'voicevox', id: 93, speedScale: 1.55, pitchScale: 0.02, intonationScale: 1.3, volumeScale: 1.0 },
  zunko: { name: 'zunko', engine: 'voicevox', id: 107, speedScale: 1.35, pitchScale: 0.0, intonationScale: 1.1, volumeScale: 1.0 },
  kiritan: { name: 'kiritan', engine: 'voicevox', id: 108, speedScale: 1.35, pitchScale: 0.02, intonationScale: 1.15, volumeScale: 1.0 },
  itako: { name: 'itako', engine: 'voicevox', id: 109, speedScale: 1.2, pitchScale: -0.01, intonationScale: 1.0, volumeScale: 1.0 },
  reimu: { name: 'reimu', engine: 'aquestalk', bas: 0, basePitch: 100, speedScale: 1.4, pitchScale: 0.0, intonationScale: 1.0, volumeScale: 1.0 },
  marisa: { name: 'marisa', engine: 'aquestalk', bas: 1, basePitch: 100, speedScale: 1.4, pitchScale: 0.0, intonationScale: 1.0, volumeScale: 1.0 }
};

const SPEECH_REPLACEMENTS = [
  [/NVIDIA/gi, 'エヌビディア'],
  [/Blackwell/gi, 'ブラックウェル'],
  [/Apple/gi, 'アップル'],
  [/GPU/gi, 'ジーピーユー'],
  [/HBM/gi, 'エイチビーエム'],
  [/DRAM/gi, 'ディーラム'],
  [/TSV/gi, 'ティーエスブイ'],
  [/TSMC/gi, 'ティーエスエムシー'],
  [/SoIC/gi, 'ソイック'],
  [/Foveros/gi, 'フォベロス'],
  [/Cu-Cu/gi, '銅どうし'],
  [/PLP/gi, 'ピーエルピー'],
  [/JASM/gi, 'ジャスム'],
  [/EV Group/gi, 'イーブイグループ'],
  [/SUSS MicroTec/gi, 'ズース マイクロテック'],
  [/BESI/gi, 'ベシ'],
  [/Intel/gi, 'インテル'],
  [/Amkor/gi, 'アムコー'],
  [/ROIC/gi, 'アールオーアイシー'],
  [/SCREEN/gi, 'スクリーン'],
  [/BiCS FLASH/gi, 'ビックス フラッシュ'],
  [/3D NAND/gi, 'スリーディー ナンド'],
  [/NAND/gi, 'ナンド'],
  [/CBA/gi, 'シービーエー'],
  [/CUA/gi, 'シーユーエー'],
  [/CMOS/gi, 'シーモス'],
  [/CMP/gi, 'シーエムピー'],
  [/I\/O/gi, 'アイオー'],
  [/SK hynix/gi, 'エスケーハイニックス'],
  [/Samsung/gi, 'サムスン'],
  [/Micron/gi, 'マイクロン'],
  [/Clarivate/gi, 'クラリベイト'],
  [/ChatGPT/gi, 'チャットジーピーティー'],
  [/Gemini/gi, 'ジェミニ'],
  [/Claude/gi, 'クロード'],
  [/Google Cloud/gi, 'グーグルクラウド'],
  [/Google/gi, 'グーグル'],
  [/AWS/gi, 'エーダブリューエス'],
  [/Azure/gi, 'アジュール'],
  [/VOICEVOX/gi, 'ボイスボックス'],
  [/Fine Hybrid Magnetic Particles/gi, 'ファイン ハイブリッド マグネティック パーティクルズ'],
  [/Enterprise/gi, 'エンタープライズ'],
  [/Native/gi, 'ネイティブ'],
  [/Open/gi, 'オープン'],
  [/Close/gi, 'クローズ'],
  [/Aramid/gi, 'アラミド'],
  [/SrFe/gi, 'エスアールエフイー'],
  [/BaFe/gi, 'ビーエーエフイー'],
  [/OEM/gi, 'オーイーエム'],
  [/ESG/gi, 'イーエスジー'],
  [/IBM/gi, 'アイビーエム'],
  [/TS1170/gi, 'ティーエス イレブンセブンティ'],
  [/HDD/gi, 'ハードディスク'],
  [/CO2/gi, 'シーオーツー'],
  [/AI\/ML/gi, 'エーアイ エムエル'],
  [/AI/gi, 'エーアイ'],
  [/ML/gi, 'エムエル'],
];

const FULLWIDTH_DIGIT_MAP = {
  '０': '0',
  '１': '1',
  '２': '2',
  '３': '3',
  '４': '4',
  '５': '5',
  '６': '6',
  '７': '7',
  '８': '8',
  '９': '9',
};

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

const DIGIT_KANA = ['れい', 'いち', 'に', 'さん', 'よん', 'ご', 'ろく', 'なな', 'はち', 'きゅう'];

const toAsciiDigits = (value) =>
  value.replace(/[０-９]/g, (char) => FULLWIDTH_DIGIT_MAP[char] ?? char);

const parseJapaneseInteger = (value) => {
  const ascii = toAsciiDigits(value).replace(/[,\s]/g, '');
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

const toKanaDigit = (char) => {
  if (char in FULLWIDTH_DIGIT_MAP) {
    return DIGIT_KANA[Number(FULLWIDTH_DIGIT_MAP[char])];
  }

  if (/\d/.test(char)) {
    return DIGIT_KANA[Number(char)];
  }

  if (char in KANJI_DIGIT_MAP) {
    return DIGIT_KANA[KANJI_DIGIT_MAP[char]];
  }

  return char;
};

const renderUnder10000 = (value) => {
  if (value === 0) {
    return '';
  }

  let remaining = value;
  let result = '';

  const thousands = Math.floor(remaining / 1000);
  if (thousands > 0) {
    if (thousands === 1) result += 'せん';
    else if (thousands === 3) result += 'さんぜん';
    else if (thousands === 8) result += 'はっせん';
    else result += `${DIGIT_KANA[thousands]}せん`;
    remaining %= 1000;
  }

  const hundreds = Math.floor(remaining / 100);
  if (hundreds > 0) {
    if (hundreds === 1) result += 'ひゃく';
    else if (hundreds === 3) result += 'さんびゃく';
    else if (hundreds === 6) result += 'ろっぴゃく';
    else if (hundreds === 8) result += 'はっぴゃく';
    else result += `${DIGIT_KANA[hundreds]}ひゃく`;
    remaining %= 100;
  }

  const tens = Math.floor(remaining / 10);
  if (tens > 0) {
    if (tens === 1) result += 'じゅう';
    else result += `${DIGIT_KANA[tens]}じゅう`;
    remaining %= 10;
  }

  if (remaining > 0) {
    result += DIGIT_KANA[remaining];
  }

  return result;
};

const integerToKana = (value) => {
  if (!Number.isFinite(value) || value === 0) {
    return 'れい';
  }

  let remaining = Math.trunc(value);
  let result = '';
  const largeUnits = [
    { value: 1000000000000, reading: 'ちょう' },
    { value: 100000000, reading: 'おく' },
    { value: 10000, reading: 'まん' },
  ];

  for (const unit of largeUnits) {
    const chunk = Math.floor(remaining / unit.value);
    if (chunk > 0) {
      result += `${renderUnder10000(chunk)}${unit.reading}`;
      remaining %= unit.value;
    }
  }

  result += renderUnder10000(remaining);
  return result || 'れい';
};

const numericTokenToKana = (token) => {
  const normalized = toAsciiDigits(token).replace(/[,\s]/g, '');

  if (normalized.includes('.') || normalized.includes('点')) {
    const separator = normalized.includes('.') ? '.' : '点';
    const [integerPartRaw, decimalPartRaw = ''] = normalized.split(separator);
    const integerPart = integerPartRaw ? integerToKana(parseJapaneseInteger(integerPartRaw)) : 'れい';
    const decimalPart = Array.from(decimalPartRaw).map((char) => toKanaDigit(char)).join('');
    return decimalPart ? `${integerPart}てん${decimalPart}` : integerPart;
  }

  return integerToKana(parseJapaneseInteger(normalized));
};

const humanizeNumericReadings = (text) => {
  const unitPattern = [
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
  ].join('|');

  const numericPattern = /[0-9０-９,，]+(?:[.．][0-9０-９]+)?|[〇零一二三四五六七八九十百千万億兆]+(?:点[〇零一二三四五六七八九〇零]+)?/g;

  return text.replace(
    new RegExp(`(${numericPattern.source})(?=(${unitPattern}))`, 'g'),
    (match) => {
      if (
        !/[0-9０-９]/.test(match) &&
        !/[十百千万億兆点〇零]/.test(match) &&
        Array.from(match).every((char) => char in KANJI_DIGIT_MAP)
      ) {
        return match;
      }

      return numericTokenToKana(match);
    }
  );
};

const normalizeSpeechText = (text) => {
  let normalized = text;

  for (const [pattern, replacement] of SPEECH_REPLACEMENTS) {
    normalized = normalized.replace(pattern, replacement);
  }

  normalized = normalized
    .replace(/[，]/g, ',')
    .replace(/[．]/g, '.')
    .replace(/BiCS\s*-?\s*(\d+)/gi, 'ビックス $1')
    .replace(/LTO-?(\d+)/gi, 'エルティーオー $1')
    .replace(/(\d+(?:\.\d+)?)\s*EB\b/gi, '$1エクサバイト')
    .replace(/(\d+(?:\.\d+)?)\s*PB\b/gi, '$1ペタバイト')
    .replace(/(\d+(?:\.\d+)?)\s*TB\b/gi, '$1テラバイト')
    .replace(/(\d+(?:\.\d+)?)\s*GB\b/gi, '$1ギガバイト')
    .replace(/(\d+(?:\.\d+)?)\s*Gbps\b/gi, '$1ギガビーピーエス')
    .replace(/(\d+(?:\.\d+)?)\s*°?C\b/gi, '$1度')
    .replace(/(\d+(?:\.\d+)?)\s*μm\b/gi, '$1マイクロメートル')
    .replace(/(\d+(?:\.\d+)?)\s*μs\b/gi, '$1マイクロ秒')
    .replace(/\bvs\b/gi, 'バーサス')
    .replace(/\s+/g, ' ')
    .trim();

  normalized = humanizeNumericReadings(normalized);

  return normalized;
};

async function generateVoice(text, speakerConfig, outputPath, customParams = {}) {
  const shouldForce = customParams.force === true;
  const effectiveParams = Object.fromEntries(
    Object.entries({ ...customParams })
      .filter(([key, value]) => key !== 'force' && value !== undefined)
  );
  delete effectiveParams.force;

  if (fs.existsSync(outputPath) && !shouldForce && Object.keys(effectiveParams).length === 0) {
    console.log(`[SKIP] Voice already exists: ${path.basename(outputPath)}`);
    return;
  }
  
  const speechText = normalizeSpeechTextShared(text);

  console.log(`[GEN] Generating voice for ${speakerConfig.name}: "${speechText.substring(0, 20)}..."`);
  
  const runPythonBridge = (scriptName, params, doneLabel) => {
    return new Promise((resolve, reject) => {
      const configuredPythonExists = isPathLike(PYTHON_BIN) ? fs.existsSync(PYTHON_BIN) : true;
      const pythonCommand = configuredPythonExists ? PYTHON_BIN : (IS_WINDOWS ? 'py' : 'python3');
      const pythonPreludeArgs = configuredPythonExists ? [] : (IS_WINDOWS ? ['-3.11'] : []);
      const pythonArgs = [
        ...pythonPreludeArgs,
        `scripts/${scriptName}`,
        outputPath,
        speechText,
        JSON.stringify(params),
      ];
      const pythonProcess = spawn(pythonCommand, pythonArgs);

      let stderr = '';
      pythonProcess.stderr.on('data', (data) => stderr += data.toString());
      pythonProcess.on('close', (code) => {
        if (code === 0) {
          console.log(`[DONE] ${doneLabel} saved to ${path.basename(outputPath)}`);
          resolve();
        } else {
          reject(new Error(`${doneLabel} bridge failed: ${stderr}`));
        }
      });
    });
  };

  if (speakerConfig.engine === 'aquestalk') {
    const aqParams = {
      speakerKey: speakerConfig.name,
      bas: speakerConfig.bas ?? 0,
      spd: Math.round((effectiveParams.speedScale ?? speakerConfig.speedScale ?? 1.0) * 100),
      vol: Math.round((effectiveParams.volumeScale ?? speakerConfig.volumeScale ?? 1.0) * 100),
      pit: Math.round((speakerConfig.basePitch ?? 100) + (effectiveParams.pitchScale ?? speakerConfig.pitchScale ?? 0) * 500),
      acc: 100,
      lmd: Math.round((effectiveParams.intonationScale ?? speakerConfig.intonationScale ?? 1.0) * 100),
      fsc: 100
    };

    return runPythonBridge('aquestalk_bridge.py', aqParams, 'AquesTalk');
  }

  const vvParams = {
    speaker: speakerConfig.name,
    styleId: speakerConfig.id,
    speedScale: effectiveParams.speedScale ?? speakerConfig.speedScale ?? 1.0,
    pitchScale: effectiveParams.pitchScale ?? speakerConfig.pitchScale ?? 0.0,
    intonationScale: effectiveParams.intonationScale ?? speakerConfig.intonationScale ?? 1.0,
    volumeScale: effectiveParams.volumeScale ?? speakerConfig.volumeScale ?? 1.0,
  };

  return runPythonBridge('voicevox_core_bridge.py', vvParams, 'VOICEVOX Core');
}

const parseArgs = () => {
  const args = process.argv.slice(2);
  let variant = DEFAULT_VARIANT;
  let force = false;

  for (let index = 0; index < args.length; index += 1) {
    const arg = args[index];
    if (arg === '--variant' && args[index + 1]) {
      variant = args[index + 1];
      index += 1;
      continue;
    }
    if (arg.startsWith('--variant=')) {
      variant = arg.slice('--variant='.length);
      continue;
    }
    if (arg === '--force') {
      force = true;
    }
  }

  return { variant, force };
};

const resolveVariantKey = (scriptData, requestedVariant) => {
  if (requestedVariant === 'active') {
    return scriptData.activeVariant ?? DEFAULT_VARIANT;
  }

  return requestedVariant;
};

const hasCanonicalGameplaySegments = (scriptData) =>
  Array.isArray(scriptData?.timeline?.gameplay?.segments) && scriptData.timeline.gameplay.segments.length > 0;

const getVariantAdjustedSpeedScale = (speakerConfig, variantKey, sceneSpeedScale) => {
  if (sceneSpeedScale !== undefined) {
    return sceneSpeedScale;
  }

  const baseSpeedScale = speakerConfig.speedScale ?? 1.0;
  if (variantKey !== 'short') {
    return baseSpeedScale;
  }

  return Number((baseSpeedScale * SHORT_SPEED_MULTIPLIER).toFixed(2));
};

const getScriptOutputPaths = (scriptData) => {
  const projectId = scriptData?.project?.id;
  const mirrors = projectId ? PROJECT_SCRIPT_MIRRORS[projectId] ?? [] : [];
  return [SCRIPT_PATH, ...mirrors];
};

const writeScriptOutputs = (scriptData) => {
  const serialized = JSON.stringify(scriptData, null, 2);
  const outputPaths = [...new Set(getScriptOutputPaths(scriptData))];
  outputPaths.forEach((outputPath) => {
    fs.writeFileSync(outputPath, serialized, 'utf8');
  });
};

async function main() {
  const options = parseArgs();
  if (!fs.existsSync(VOICES_DIR)) {
    fs.mkdirSync(VOICES_DIR, { recursive: true });
  }

  const scriptData = JSON.parse(fs.readFileSync(SCRIPT_PATH, 'utf8'));
  const outputFps = Number(scriptData?.output?.fps ?? DEFAULT_FPS) || DEFAULT_FPS;
  const variantKey = resolveVariantKey(scriptData, options.variant);
  const variantBlock = scriptData[variantKey];
  if ((!variantBlock?.scenes || !Array.isArray(variantBlock.scenes)) && !hasCanonicalGameplaySegments(scriptData)) {
    throw new Error(`Variant "${variantKey}" does not contain scenes.`);
  }

  if (hasCanonicalGameplaySegments(scriptData)) {
    const gameplaySegments = scriptData.timeline.gameplay.segments;
    const GAMEPLAY_MARGIN_FRAMES = variantKey === 'short' ? 4 : 6;

    let sequentialCursor = 0;
    for (let i = 0; i < gameplaySegments.length; i++) {
      const segment = gameplaySegments[i];
      const fallbackFileName = `gameplay_${String(i + 1).padStart(3, '0')}_${segment.speaker ?? 'commentary'}.wav`;
      const outputFileName = segment.voiceFile || fallbackFileName;
      segment.voiceFile = outputFileName;
      const outputPath = path.join(VOICES_DIR, outputFileName);
      const speakerConfig = SPEAKERS[segment.speaker] || SPEAKERS.metan;
      const customParams = {
        speedScale: getVariantAdjustedSpeedScale(speakerConfig, variantKey, segment.speedScale),
        pitchScale: segment.pitchScale,
        intonationScale: segment.intonationScale,
        volumeScale: segment.volumeScale,
        force: options.force,
      };

      await generateVoice(segment.speechText ?? segment.text, speakerConfig, outputPath, customParams);

      segment.startTime = sequentialCursor;

      if (fs.existsSync(outputPath)) {
        const durationSec = await getAudioDurationInSeconds(outputPath);
        const audioDurationFrames = Math.ceil(durationSec * outputFps);
        const minimumDuration = Math.max(
          1,
          Number(segment.duration ?? 0) || 0,
          Number(segment.sourceDuration ?? 0) || 0
        );
        const paddedAudioDuration = audioDurationFrames + GAMEPLAY_MARGIN_FRAMES;
        const shortFloorDuration = 48;

        segment.duration = variantKey === 'short'
          ? Math.max(shortFloorDuration, paddedAudioDuration)
          : Math.max(minimumDuration, paddedAudioDuration);

        if (!segment.sourceDuration || segment.sourceDuration <= 0) {
          segment.sourceDuration = minimumDuration;
        }

        if (variantKey === 'short') {
          const change = segment.duration - minimumDuration;
          console.log(
            `[ADJUST] Gameplay short segment "${segment.id ?? i}" duration ${change >= 0 ? 'extended' : 'trimmed'} by ${Math.abs(change)}f (${minimumDuration}f -> ${segment.duration}f).`,
          );
        } else if (audioDurationFrames > minimumDuration) {
          const extension = segment.duration - minimumDuration;
          console.log(
            `[ADJUST] Gameplay segment "${segment.id ?? i}" duration extended by ${extension}f to fit voice (${audioDurationFrames}f + ${GAMEPLAY_MARGIN_FRAMES}f margin).`,
          );
        }
      }

      sequentialCursor = (segment.startTime ?? 0) + (segment.duration ?? 0);
    }

    writeScriptOutputs(scriptData);
    console.log('[SUCCESS] gameplay script updated with voice file assignments.');
    return;
  }

  let scenes = variantBlock.scenes;
  
  let globalEndFrame = 0;
  const MARGIN_FRAMES = variantKey === 'short' ? 8 : 14; // Leave room for on-screen graphics and avoid rushed cuts

  for (let i = 0; i < scenes.length; i++) {
    const scene = scenes[i];
    const fallbackFileName = variantKey === 'short' ? `short_${scene.id}.wav` : `${scene.id}.wav`;
    const outputFileName = scene.voiceFile || fallbackFileName;
    scene.voiceFile = outputFileName;
    const outputPath = path.join(VOICES_DIR, outputFileName);
    const speakerConfig = SPEAKERS[scene.speaker] || SPEAKERS.reimu;
    
    // Extract custom modulation params from the scene (clip)
    const customParams = {
      speedScale: getVariantAdjustedSpeedScale(speakerConfig, variantKey, scene.speedScale),
      pitchScale: scene.pitchScale,
      intonationScale: scene.intonationScale,
      volumeScale: scene.volumeScale,
      force: options.force,
    };

    await generateVoice(scene.speechText ?? scene.text, speakerConfig, outputPath, customParams);
    
    if (fs.existsSync(outputPath)) {
      const durationSec = await getAudioDurationInSeconds(outputPath);
      const audioDurationFrames = Math.ceil(durationSec * outputFps);
      
      const tailFrames = Math.max(0, Number(scene.tailFrames ?? 0) || 0);
      const finalDuration = audioDurationFrames + tailFrames;
      
      scene.duration = finalDuration;
      scene.startTime = globalEndFrame; // Start immediately after previous scene
      
      globalEndFrame = scene.startTime + finalDuration + MARGIN_FRAMES;
    }
  }

  writeScriptOutputs(scriptData);
  console.log(`[SUCCESS] ${variantKey} script updated with accurate durations and timings in frames.`);
}

main().catch(console.error);
