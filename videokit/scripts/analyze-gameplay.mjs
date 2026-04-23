/* eslint-env node */
/* global process, console */
import fs from 'node:fs';
import path from 'node:path';
import {
  CUT_PLAN_PATH,
  DEFAULT_OCR_FRAME_DIR,
  DEFAULT_TEMP_DIR,
  DEFAULT_WHISPER_MODEL,
  GAMEPLAY_ANALYSIS_PATH,
  SCRIPT_OUTLINE_PATH,
  dedupe,
  ensureDir,
  normalizeTextForKeywords,
  resolveFfmpegPath,
  resolveFfprobePath,
  runCommand,
  runPythonJson,
  sanitizeStem,
  secondsToFrame,
  secondsToTimestamp,
  splitIntoSentences,
  tokenizeKeywords,
  writeJson,
} from './gameplay-pipeline-utils.mjs';

const EXPECTED_REFERENCE_SCRIPT_COUNT = 2;
const INPUT_DURATION_WARNING_MIN = 10 * 60;
const INPUT_DURATION_WARNING_MAX = 60 * 60;
const OCR_CONFIDENCE_MIN = 0.2;
const TRANSCRIPT_SUMMARY_MAX = 72;
const OCR_SUMMARY_MAX = 54;
const SCENE_THRESHOLD = 27;
const SCENE_MIN_LEN_SEC = 2.0;

const REACTION_CANDIDATES = [
  'うわ',
  'うお',
  'やばい',
  'やった',
  'きた',
  'まずい',
  '危ない',
  '惜しい',
  'よし',
  'なるほど',
  'まじ',
  'えっ',
  'あっ',
  'これは',
  'しんどい',
];

const FAIL_KEYWORDS = ['やられ', 'ミス', '失敗', '危ない', 'まずい', '惜しい', '負け', '落ちた', '死ん'];
const MENU_KEYWORDS = ['menu', 'inventory', 'settings', 'loadout', 'pause', '装備', '設定', 'メニュー', 'ステータス'];
const BOSS_KEYWORDS = ['boss', 'phase', 'raid', 'bossfight', 'ボス', '最終戦', '第二形態', '第三形態', '撃破対象'];
const VICTORY_KEYWORDS = ['clear', 'victory', 'win', 'winner', '撃破', '討伐', '勝利', 'クリア', '突破'];
const FAILURE_KEYWORDS = ['failed', 'game over', 'defeat', 'dead', '死亡', '全滅', '敗北', 'ミス', '失敗'];
const COMBAT_KEYWORDS = ['combo', 'damage', 'attack', 'counter', 'guard', '回避', '攻撃', '被弾', 'コンボ', 'カウンター'];
const CLUTCH_KEYWORDS = ['残り', 'ギリギリ', '瀕死', '危ない', '1 hp', 'last stock', '一発', '土壇場'];
const SETUP_KEYWORDS = ['start', 'intro', 'route', 'loadout', '準備', '方針', 'ルート', '装備', '開幕'];

const parseArgs = () => {
  const args = process.argv.slice(2);
  const referenceScripts = [];
  let input = null;

  for (let index = 0; index < args.length; index += 1) {
    const arg = args[index];

    if (arg === '--input' && args[index + 1]) {
      input = args[index + 1];
      index += 1;
      continue;
    }

    if (arg.startsWith('--input=')) {
      input = arg.slice('--input='.length);
      continue;
    }

    if (arg === '--reference-script' && args[index + 1]) {
      referenceScripts.push(args[index + 1]);
      index += 1;
      continue;
    }

    if (arg.startsWith('--reference-script=')) {
      referenceScripts.push(arg.slice('--reference-script='.length));
    }
  }

  if (!input) {
    throw new Error('Missing required --input <video>.');
  }

  if (referenceScripts.length !== EXPECTED_REFERENCE_SCRIPT_COUNT) {
    throw new Error(`Pass exactly ${EXPECTED_REFERENCE_SCRIPT_COUNT} --reference-script values.`);
  }

  return {
    input: path.resolve(input),
    referenceScripts: referenceScripts.map((filePath) => path.resolve(filePath)),
  };
};

const pickWords = (values, limit = 4) => dedupe(values).filter(Boolean).slice(0, limit);

const collectStringsFromJson = (value, bucket = []) => {
  if (typeof value === 'string') {
    bucket.push(value);
    return bucket;
  }

  if (Array.isArray(value)) {
    value.forEach((entry) => collectStringsFromJson(entry, bucket));
    return bucket;
  }

  if (value && typeof value === 'object') {
    for (const [key, entryValue] of Object.entries(value)) {
      if (['text', 'speechText', 'subtitleText', 'title', 'banterBeat', 'explanationBeat'].includes(key)) {
        collectStringsFromJson(entryValue, bucket);
      } else if (typeof entryValue === 'object') {
        collectStringsFromJson(entryValue, bucket);
      }
    }
  }

  return bucket;
};

const readReferenceScriptText = (filePath) => {
  if (!fs.existsSync(filePath)) {
    throw new Error(`Reference script not found: ${filePath}`);
  }

  const content = fs.readFileSync(filePath, 'utf8');
  const extension = path.extname(filePath).toLowerCase();
  if (extension === '.json') {
    const json = JSON.parse(content);
    return collectStringsFromJson(json).join('\n');
  }

  return content;
};

const average = (values) => {
  if (!values.length) {
    return 0;
  }

  return values.reduce((sum, value) => sum + value, 0) / values.length;
};

const parseFrameRate = (rawValue) => {
  const raw = String(rawValue ?? '');
  if (!raw) {
    return null;
  }

  if (raw.includes('/')) {
    const [numerator, denominator] = raw.split('/').map(Number);
    if (!denominator) {
      return null;
    }
    return numerator / denominator;
  }

  const parsed = Number(raw);
  return Number.isFinite(parsed) ? parsed : null;
};

const normalizeOutputFps = (avgFps, rawFps) => {
  const preferred = avgFps && avgFps > 1 && avgFps <= 60 ? avgFps : rawFps;
  const safeFps = preferred && preferred > 0 ? preferred : 30;
  const commonFps = [24, 25, 30, 48, 50, 60];
  return commonFps.reduce((best, candidate) =>
    Math.abs(candidate - safeFps) < Math.abs(best - safeFps) ? candidate : best,
  30);
};

const extractReferenceStyleHints = (filePaths) => {
  const perFile = filePaths.map((filePath) => {
    const text = readReferenceScriptText(filePath);
    const sentences = splitIntoSentences(text);
    const keywords = tokenizeKeywords(text);
    const reactionWords = REACTION_CANDIDATES.filter((candidate) =>
      sentences.some((sentence) => sentence.includes(candidate)),
    );
    const failPhrases = sentences.filter((sentence) =>
      FAIL_KEYWORDS.some((keyword) => sentence.includes(keyword)),
    );

    return {
      filePath,
      sentenceCount: sentences.length,
      averageSentenceLength: Number(average(sentences.map((sentence) => sentence.length)).toFixed(1)),
      openings: sentences.slice(0, 2),
      closings: sentences.slice(-2),
      reactionWords,
      failPhrases: failPhrases.slice(0, 4),
      commonKeywords: pickWords(keywords, 12),
    };
  });

  const allSentences = perFile.flatMap((entry) => entry.openings.concat(entry.closings));
  const sentenceLengths = perFile.flatMap((entry) => [entry.averageSentenceLength].filter(Boolean));

  return {
    referenceScripts: perFile.map((entry) => path.basename(entry.filePath)),
    averageSentenceLength: Number(average(sentenceLengths).toFixed(1)),
    openings: dedupe(perFile.flatMap((entry) => entry.openings)).slice(0, 4),
    closings: dedupe(perFile.flatMap((entry) => entry.closings)).slice(0, 4),
    reactionWords: dedupe(perFile.flatMap((entry) => entry.reactionWords)).slice(0, 8),
    failPhrases: dedupe(perFile.flatMap((entry) => entry.failPhrases)).slice(0, 6),
    commonKeywords: pickWords(perFile.flatMap((entry) => entry.commonKeywords), 16),
    sourceSummaries: perFile,
    toneNotes: {
      shortSentenceBias: average(sentenceLengths) <= 28,
      openingExamples: allSentences.slice(0, 4),
    },
  };
};

const parseFfprobeMetadata = (inputPath) => {
  const ffprobePath = resolveFfprobePath();
  const result = runCommand({
    command: ffprobePath,
    args: [
      '-v',
      'error',
      '-print_format',
      'json',
      '-show_format',
      '-show_streams',
      inputPath,
    ],
  });
  const json = JSON.parse(result.stdout);
  const streams = Array.isArray(json.streams) ? json.streams : [];
  const videoStream = streams.find((stream) => stream.codec_type === 'video');
  const audioStream = streams.find((stream) => stream.codec_type === 'audio');
  const rawFps = parseFrameRate(videoStream?.r_frame_rate);
  const avgFps = parseFrameRate(videoStream?.avg_frame_rate);
  const fps = normalizeOutputFps(avgFps, rawFps);
  const durationSec = Number(json.format?.duration ?? videoStream?.duration ?? 0);

  return {
    ffprobePath,
    durationSec: Number(durationSec.toFixed(3)),
    fps: Number((fps || 30).toFixed(3)),
    width: Number(videoStream?.width ?? 0),
    height: Number(videoStream?.height ?? 0),
    hasAudio: Boolean(audioStream),
    audioCodec: audioStream?.codec_name ?? null,
    videoCodec: videoStream?.codec_name ?? null,
  };
};

const parseSilenceEvents = (stderr) => {
  const starts = [...String(stderr).matchAll(/silence_start:\s*([0-9.]+)/g)].map((match) => Number(match[1]));
  const ends = [...String(stderr).matchAll(/silence_end:\s*([0-9.]+)\s*\|\s*silence_duration:\s*([0-9.]+)/g)].map(
    (match) => ({
      endSec: Number(match[1]),
      durationSec: Number(match[2]),
    }),
  );

  return starts.map((startSec, index) => {
    const end = ends[index];
    return {
      startSec: Number(startSec.toFixed(3)),
      endSec: end ? Number(end.endSec.toFixed(3)) : Number(startSec.toFixed(3)),
      durationSec: end ? Number(end.durationSec.toFixed(3)) : 0,
    };
  });
};

const parseFreezeEvents = (stderr) => {
  const starts = [...String(stderr).matchAll(/freeze_start:\s*([0-9.]+)/g)].map((match) => Number(match[1]));
  const ends = [...String(stderr).matchAll(/freeze_end:\s*([0-9.]+)\s*\|\s*freeze_duration:\s*([0-9.]+)/g)].map(
    (match) => ({
      endSec: Number(match[1]),
      durationSec: Number(match[2]),
    }),
  );

  return starts.map((startSec, index) => {
    const end = ends[index];
    return {
      startSec: Number(startSec.toFixed(3)),
      endSec: end ? Number(end.endSec.toFixed(3)) : Number(startSec.toFixed(3)),
      durationSec: end ? Number(end.durationSec.toFixed(3)) : 0,
    };
  });
};

const parseSceneScoreEvents = (stderr) => {
  const events = [];
  let currentTime = null;
  for (const line of String(stderr).split(/\r?\n/)) {
    const timeMatch = line.match(/pts_time:([0-9.]+)/);
    if (timeMatch) {
      currentTime = Number(timeMatch[1]);
    }

    const scoreMatch = line.match(/lavfi\.scene_score=([0-9.]+)/);
    if (scoreMatch && currentTime !== null) {
      events.push({
        timeSec: Number(currentTime.toFixed(3)),
        score: Number(Number(scoreMatch[1]).toFixed(4)),
      });
      currentTime = null;
    }
  }

  return events;
};

const collectFfmpegEvents = (inputPath) => {
  const ffmpegPath = resolveFfmpegPath();

  const silenceResult = runCommand({
    command: ffmpegPath,
    args: ['-hide_banner', '-i', inputPath, '-af', 'silencedetect=noise=-40dB:d=2.5', '-f', 'null', '-'],
    allowFailure: true,
  });
  const freezeResult = runCommand({
    command: ffmpegPath,
    args: ['-hide_banner', '-i', inputPath, '-vf', 'freezedetect=n=-60dB:d=1.5', '-f', 'null', '-'],
    allowFailure: true,
  });
  const sceneResult = runCommand({
    command: ffmpegPath,
    args: ['-hide_banner', '-i', inputPath, '-vf', "select='gt(scene,0.12)',metadata=print:file=-", '-an', '-f', 'null', '-'],
    allowFailure: true,
  });

  return {
    ffmpegPath,
    silence: parseSilenceEvents(silenceResult.stderr),
    freeze: parseFreezeEvents(freezeResult.stderr),
    sceneScores: parseSceneScoreEvents(`${sceneResult.stdout ?? ''}\n${sceneResult.stderr ?? ''}`),
  };
};

const overlaps = (startA, endA, startB, endB) => startA < endB && endA > startB;

const formatExcerpt = (text, maxLength) => {
  const normalized = String(text ?? '').replace(/\s+/g, ' ').trim();
  if (!normalized) {
    return '';
  }

  if (normalized.length <= maxLength) {
    return normalized;
  }

  return `${normalized.slice(0, maxLength - 1)}…`;
};

const createRepresentativeFrames = ({ inputPath, scenes, fps }) => {
  const ffmpegPath = resolveFfmpegPath();
  ensureDir(DEFAULT_OCR_FRAME_DIR);
  ensureDir(DEFAULT_TEMP_DIR);
  const stem = sanitizeStem(path.basename(inputPath));
  const frames = scenes.map((scene, index) => {
    const midpoint = Number(((scene.startSec + scene.endSec) / 2).toFixed(3));
    const framePath = path.join(DEFAULT_OCR_FRAME_DIR, `${stem}-${String(index).padStart(4, '0')}.jpg`);
    runCommand({
      command: ffmpegPath,
      args: [
        '-hide_banner',
        '-y',
        '-ss',
        String(Math.max(0, midpoint)),
        '-i',
        inputPath,
        '-frames:v',
        '1',
        '-q:v',
        '2',
        framePath,
      ],
      allowFailure: true,
    });
    return {
      id: `segment_${index}`,
      path: framePath,
      timeSec: midpoint,
      frame: secondsToFrame(midpoint, fps),
    };
  });

  return frames.filter((frame) => fs.existsSync(frame.path));
};

const summarizeTranscript = (entries) => {
  const text = entries
    .map((entry) => entry.text)
    .filter(Boolean)
    .join(' ')
    .replace(/\s+/g, ' ')
    .trim();

  return {
    transcriptText: text,
    transcriptSummary: formatExcerpt(text, TRANSCRIPT_SUMMARY_MAX),
    transcriptExcerpt: formatExcerpt(text, 100),
  };
};

const summarizeOcr = (ocrItems) => {
  const confidentItems = ocrItems.filter((item) => Number(item.confidence ?? 0) >= OCR_CONFIDENCE_MIN);
  const texts = confidentItems.map((item) => item.text).filter(Boolean);
  const keywordList = pickWords(texts.flatMap((text) => tokenizeKeywords(text)), 6);
  return {
    ocrSummary: formatExcerpt(texts.join(' / '), OCR_SUMMARY_MAX),
    ocrKeywords: keywordList,
    uncertainLabels: ocrItems
      .filter((item) => Number(item.confidence ?? 0) < OCR_CONFIDENCE_MIN)
      .map((item) => item.text)
      .filter(Boolean)
      .slice(0, 4),
  };
};

const includesAnyKeyword = (haystack, keywords) =>
  keywords.some((keyword) => haystack.includes(normalizeTextForKeywords(keyword)));

const clamp01 = (value) => Math.max(0, Math.min(1, value));

const inferEventType = ({
  index,
  sceneCount,
  durationSec,
  normalizedText,
  motionScore,
  silenceFlag,
  freezeFlag,
}) => {
  if (silenceFlag && durationSec >= 2.5 && motionScore < 0.2) {
    return 'dead-air';
  }

  if (includesAnyKeyword(normalizedText, MENU_KEYWORDS)) {
    return 'menu';
  }

  if (includesAnyKeyword(normalizedText, VICTORY_KEYWORDS)) {
    return 'victory';
  }

  if (includesAnyKeyword(normalizedText, FAILURE_KEYWORDS)) {
    return 'failure';
  }

  if (includesAnyKeyword(normalizedText, BOSS_KEYWORDS)) {
    return 'boss';
  }

  if (includesAnyKeyword(normalizedText, CLUTCH_KEYWORDS) && motionScore >= 0.22) {
    return 'clutch';
  }

  if (includesAnyKeyword(normalizedText, COMBAT_KEYWORDS) || motionScore >= 0.26) {
    return 'combat';
  }

  if (index <= 1 || includesAnyKeyword(normalizedText, SETUP_KEYWORDS)) {
    return 'setup';
  }

  if (freezeFlag && motionScore < 0.16) {
    return 'menu';
  }

  if (index >= sceneCount - 2 && motionScore < 0.12) {
    return 'setup';
  }

  return 'exploration';
};

const inferSceneRole = (eventType) => {
  switch (eventType) {
    case 'boss':
      return 'escalation';
    case 'clutch':
      return 'risk';
    case 'victory':
      return 'victory';
    case 'failure':
      return 'reaction';
    case 'combat':
      return 'escalation';
    case 'dead-air':
      return 'context';
    case 'menu':
      return 'context';
    case 'setup':
      return 'context';
    default:
      return 'context';
  }
};

const inferIntensity = (eventType) => {
  switch (eventType) {
    case 'victory':
      return 'victory';
    case 'boss':
      return 'hype';
    case 'combat':
      return 'hype';
    case 'clutch':
      return 'panic';
    case 'failure':
      return 'panic';
    case 'setup':
    case 'menu':
      return 'calm';
    default:
      return 'normal';
  }
};

const buildReasonTags = ({ eventType, silenceFlag, freezeFlag, transcriptSummary }) => {
  const tags = [];
  if (eventType === 'boss') tags.push('boss-phase');
  if (eventType === 'victory') tags.push('victory');
  if (eventType === 'failure') tags.push('failure');
  if (eventType === 'menu') tags.push('menu-only');
  if (eventType === 'dead-air' || silenceFlag) tags.push('dead-air');
  if (freezeFlag) tags.push('duplicate-action');
  if (transcriptSummary) tags.push('explanation-needed');
  return dedupe(tags);
};

const buildExpectedCommentaryRole = (eventType) => {
  switch (eventType) {
    case 'setup':
    case 'menu':
      return 'context';
    case 'boss':
    case 'combat':
      return 'escalation';
    case 'clutch':
      return 'risk';
    case 'victory':
      return 'victory';
    case 'failure':
      return 'reaction';
    default:
      return 'comedy-beat';
  }
};

const inferBanterType = ({ index, eventType }) => {
  if (index === 0) {
    return 'challenge-setup';
  }

  if (eventType === 'victory') {
    return 'payoff-callback';
  }

  if (eventType === 'failure' || eventType === 'clutch') {
    return 'panic-tsukkomi';
  }

  if (eventType === 'boss' || eventType === 'combat') {
    return 'overconfidence-break';
  }

  if (eventType === 'setup' || eventType === 'menu') {
    return 'rule-reminder';
  }

  return 'dry-tsukkomi';
};

const buildBanterHooks = (segment, styleHints) => {
  const reactionWord = styleHints.reactionWords[segment.index % Math.max(styleHints.reactionWords.length, 1)] ?? 'うわ';
  const seed = segment.mustMention[0] ?? segment.eventType;

  switch (segment.banterType) {
    case 'challenge-setup':
      return [
        `${seed} を縛りや無茶振りとして扱う`,
        `${reactionWord} で入り、最初から軽く煽る`,
      ];
    case 'rule-reminder':
      return [
        `序盤に置いた無茶振りを思い出させる`,
        `${seed} が後で回収されそうだと匂わせる`,
      ];
    case 'overconfidence-break':
      return [
        `強気発言を立ててから後で崩れそうな空気を作る`,
        `${seed} を見て嫌な予感を言葉にする`,
      ];
    case 'panic-tsukkomi':
      return [
        `失敗や瀕死に対して即ツッコミを入れる`,
        `${seed} を使って前振り回収っぽくする`,
      ];
    case 'payoff-callback':
      return [
        `最初の無茶振りや強気発言を回収する`,
        `${seed} をオチとして気持ちよく締める`,
      ];
    default:
      return [
        `短いツッコミでテンポを作る`,
        `${seed} を軽い笑いに変換する`,
      ];
  }
};

const buildExplanationBeat = (segment) => {
  const mention = segment.mustMention.length > 0 ? segment.mustMention.join('、') : '画面の変化';
  switch (segment.sceneRole) {
    case 'victory':
      return `決着の瞬間として ${mention} を押さえ、何が勝因だったかを短く整理する。`;
    case 'risk':
      return `危ない局面として ${mention} を指摘し、次の判断がどこで分かれたかを説明する。`;
    case 'escalation':
      return `${mention} を軸に、見どころがどこで跳ね上がるかを先回りして解説する。`;
    case 'context':
    default:
      return `${mention} を整理して、この場面の目的や準備ポイントをわかりやすく説明する。`;
  }
};

const buildBanterBeat = (segment, styleHints) => {
  const reactionWord = styleHints.reactionWords[segment.index % Math.max(styleHints.reactionWords.length, 1)] ?? 'うわ';
  if (segment.banterType === 'challenge-setup') {
    return `${reactionWord} で入り、今回の条件や無茶振りを最初に置いておく。あとで回収できるフックを残す。`;
  }

  if (segment.banterType === 'rule-reminder') {
    return `${reactionWord} を軽く挟みつつ、最初に振った条件や嫌なフラグを思い出させる。`;
  }

  if (segment.banterType === 'payoff-callback') {
    return `${reactionWord} で弾ませて、最初の無茶振りや前振りを回収するオチにする。`;
  }

  if (segment.eventType === 'failure') {
    const failPhrase = styleHints.failPhrases[0] ?? 'これはさすがに痛い';
    return `${reactionWord} 系の反応で入りつつ、「${failPhrase}」に近い温度感でツッコミを入れる。`;
  }

  if (segment.eventType === 'victory') {
    return `${reactionWord} で弾ませて、頑張りが報われた感じの一言で締める。`;
  }

  if (segment.eventType === 'menu' || segment.eventType === 'setup') {
    return `茶番は軽めにして、準備や選択に対する一言ツッコミに留める。`;
  }

  return `${reactionWord} 系の反応語から入って、状況に対する短いツッコミや茶番を差し込む。`;
};

const buildFinalRecommendation = ({ eventType, commentaryOpportunityScore, comedyOpportunityScore }) => {
  if (['victory', 'boss', 'clutch', 'failure'].includes(eventType)) {
    return 'keep';
  }

  if (eventType === 'dead-air' || eventType === 'menu') {
    return commentaryOpportunityScore >= 0.45 ? 'maybe' : 'trim';
  }

  if (commentaryOpportunityScore >= 0.58 || comedyOpportunityScore >= 0.55) {
    return 'keep';
  }

  return commentaryOpportunityScore >= 0.32 ? 'maybe' : 'trim';
};

const main = () => {
  const options = parseArgs();
  const metadata = parseFfprobeMetadata(options.input);
  const styleHints = extractReferenceStyleHints(options.referenceScripts);
  const dependencyCheck = runPythonJson({
    action: 'check',
    allowFailure: true,
  });

  if (!dependencyCheck.ok) {
    throw new Error(
      [
        'Missing Python dependencies for gameplay analysis.',
        dependencyCheck.installCommand ?? 'py -3.11 -m pip install scenedetect[opencv] faster-whisper easyocr',
        dependencyCheck.missingPackages?.length
          ? `Missing: ${dependencyCheck.missingPackages.join(', ')}`
          : '',
      ]
        .filter(Boolean)
        .join('\n'),
    );
  }

  const warnings = [];
  if (metadata.durationSec < INPUT_DURATION_WARNING_MIN || metadata.durationSec > INPUT_DURATION_WARNING_MAX) {
    warnings.push(
      `Input duration is ${Math.round(metadata.durationSec)} seconds. v1 is tuned for 10-60 minute gameplay videos.`,
    );
  }

  const ffmpegEvents = collectFfmpegEvents(options.input);
  const sceneDetection = runPythonJson({
    action: 'detect-scenes',
    payload: {
      input: options.input,
      threshold: SCENE_THRESHOLD,
      minSceneLenSec: SCENE_MIN_LEN_SEC,
      durationSec: metadata.durationSec,
      fps: metadata.fps,
    },
  });
  if (!sceneDetection.ok) {
    throw new Error(`Scene detection failed: ${sceneDetection.error ?? 'unknown error'}`);
  }

  let transcriptResult = { ok: true, text: '', segments: [] };
  if (metadata.hasAudio) {
    transcriptResult = runPythonJson({
      action: 'transcribe',
      payload: {
        input: options.input,
        model: DEFAULT_WHISPER_MODEL,
        language: 'ja',
      },
    });
    if (!transcriptResult.ok) {
      warnings.push('Transcription failed. Continuing with visual-only analysis.');
      transcriptResult = { ok: false, text: '', segments: [] };
    }
  } else {
    warnings.push('No audio track detected. Continuing with visual-only analysis.');
  }

  const frameRequests = createRepresentativeFrames({
    inputPath: options.input,
    scenes: sceneDetection.scenes,
    fps: metadata.fps,
  });
  let ocrResult = { ok: true, results: [] };
  if (frameRequests.length > 0) {
    ocrResult = runPythonJson({
      action: 'ocr',
      payload: {
        frames: frameRequests,
        languages: ['ja', 'en'],
      },
      allowFailure: true,
    });
    if (!ocrResult.ok) {
      warnings.push('OCR failed. Continuing without OCR keywords.');
      ocrResult = { ok: false, results: [] };
    }
  }

  const ocrBySegmentId = new Map((ocrResult.results ?? []).map((entry) => [entry.id, entry]));
  const transcriptSegments = Array.isArray(transcriptResult.segments) ? transcriptResult.segments : [];

  const segments = sceneDetection.scenes.map((scene, index) => {
    const id = `segment_${String(index).padStart(4, '0')}`;
    const transcriptEntries = transcriptSegments.filter((entry) =>
      overlaps(scene.startSec, scene.endSec, entry.startSec, entry.endSec),
    );
    const transcriptSummary = summarizeTranscript(transcriptEntries);
    const ocrEntry = ocrBySegmentId.get(`segment_${index}`) ?? { items: [] };
    const ocrSummary = summarizeOcr(ocrEntry.items ?? []);
    const silenceFlag = ffmpegEvents.silence.some((entry) =>
      overlaps(scene.startSec, scene.endSec, entry.startSec, entry.endSec),
    );
    const freezeFlag = ffmpegEvents.freeze.some((entry) =>
      overlaps(scene.startSec, scene.endSec, entry.startSec, entry.endSec),
    );
    const sceneScores = ffmpegEvents.sceneScores.filter(
      (entry) => entry.timeSec >= scene.startSec && entry.timeSec < scene.endSec,
    );
    const motionScore = clamp01(
      average(sceneScores.map((entry) => entry.score)) || (sceneScores.length > 0 ? 0.25 : 0.1),
    );
    const transcriptWordCount = transcriptEntries.reduce((sum, entry) => sum + (entry.words?.length ?? 0), 0);
    const audioActivityScore = clamp01(
      metadata.hasAudio
        ? (transcriptWordCount / Math.max(scene.durationSec * 2.6, 1)) * 0.8 + (transcriptEntries.length > 0 ? 0.2 : 0)
        : 0,
    );
    const normalizedText = normalizeTextForKeywords(
      `${transcriptSummary.transcriptText} ${ocrSummary.ocrSummary} ${ocrSummary.ocrKeywords.join(' ')}`,
    );
    const eventType = inferEventType({
      index,
      sceneCount: sceneDetection.scenes.length,
      durationSec: scene.durationSec,
      normalizedText,
      motionScore,
      silenceFlag,
      freezeFlag,
    });
    const commentaryOpportunityScore = clamp01(
      0.24
      + motionScore * 0.24
      + audioActivityScore * 0.24
      + (['boss', 'clutch', 'victory', 'failure'].includes(eventType) ? 0.24 : 0)
      + (ocrSummary.ocrKeywords.length > 0 ? 0.08 : 0),
    );
    const comedyOpportunityScore = clamp01(
      0.12
      + (['failure', 'clutch'].includes(eventType) ? 0.28 : 0)
      + (['victory', 'combat'].includes(eventType) ? 0.14 : 0)
      + (transcriptSummary.transcriptExcerpt.includes('！') || transcriptSummary.transcriptExcerpt.includes('!') ? 0.16 : 0)
      + (ocrSummary.ocrKeywords.some((keyword) => keyword.includes('hp') || keyword.includes('combo')) ? 0.12 : 0),
    );
    const keepRecommendation = buildFinalRecommendation({
      eventType,
      commentaryOpportunityScore,
      comedyOpportunityScore,
    });
    const reasonTags = buildReasonTags({
      eventType,
      silenceFlag,
      freezeFlag,
      transcriptSummary: transcriptSummary.transcriptSummary,
    });
    const expectedCommentaryRole = buildExpectedCommentaryRole(eventType);
    const sceneRole = inferSceneRole(eventType);
    const intensity = inferIntensity(eventType);
    const banterType = inferBanterType({ index, eventType });
    const mustMention = pickWords([
      ...ocrSummary.ocrKeywords,
      ...tokenizeKeywords(transcriptSummary.transcriptSummary),
      eventType,
    ]);
    const avoid = dedupe([
      ...(ocrSummary.uncertainLabels.length > 0 ? ['OCR が低信頼な固有名詞は断定しない'] : []),
      ...(metadata.hasAudio ? [] : ['音声がないためプレイヤーの意図は推測しすぎない']),
      ...(eventType === 'victory' ? ['見えていない裏ルートや事前準備を断定しない'] : []),
    ]);

    return {
      id,
      index,
      startSec: scene.startSec,
      endSec: scene.endSec,
      durationSec: scene.durationSec,
      startFrame: secondsToFrame(scene.startSec, metadata.fps),
      endFrame: secondsToFrame(scene.endSec, metadata.fps),
      durationFrames: secondsToFrame(scene.durationSec, metadata.fps),
      sceneBoundarySource: 'pyscenedetect+ffmpeg',
      motionScore: Number(motionScore.toFixed(3)),
      audioActivityScore: Number(audioActivityScore.toFixed(3)),
      silenceFlag,
      freezeFlag,
      transcriptSummary: transcriptSummary.transcriptSummary,
      transcriptExcerpt: transcriptSummary.transcriptExcerpt,
      transcriptText: transcriptSummary.transcriptText,
      transcriptWordCount,
      ocrKeywords: ocrSummary.ocrKeywords,
      ocrSummary: ocrSummary.ocrSummary,
      ocrTextItems: (ocrEntry.items ?? []).map((item) => item.text),
      eventType,
      sceneRole,
      intensity,
      commentaryOpportunityScore: Number(commentaryOpportunityScore.toFixed(3)),
      comedyOpportunityScore: Number(comedyOpportunityScore.toFixed(3)),
      keepRecommendation,
      decision: keepRecommendation,
      reasonTags,
      reasonText:
        keepRecommendation === 'keep'
          ? `${eventType} として見どころが強く、実況の解説または反応を乗せやすい区間です。`
          : keepRecommendation === 'maybe'
            ? `${eventType} 要素はあるものの、前後の流れと重複する可能性があるので確認が必要です。`
            : `${eventType} として情報密度が低めで、dead air / menu / 重複の可能性があります。`,
      expectedCommentaryRole,
      banterType,
      banterHooks: buildBanterHooks({
        index,
        eventType,
        mustMention,
        banterType,
      }, styleHints),
      mustMention,
      avoid,
    };
  });

  const analysis = {
    generatedAt: new Date().toISOString(),
    inputVideo: options.input,
    referenceScripts: options.referenceScripts,
    warnings,
    metadata,
    styleHints,
    ffmpegEvents,
    transcript: {
      hasAudio: metadata.hasAudio,
      ok: transcriptResult.ok,
      text: transcriptResult.text ?? '',
      segmentCount: transcriptSegments.length,
    },
    ocr: {
      ok: ocrResult.ok,
      frameCount: frameRequests.length,
      outputDir: DEFAULT_OCR_FRAME_DIR,
    },
    segments,
  };

  const cutPlan = {
    generatedAt: analysis.generatedAt,
    inputVideo: options.input,
    reviewGate: 'Confirm keep/trim/maybe in this file before running apply-cut-plan.',
    warnings,
    metadata: {
      durationSec: metadata.durationSec,
      fps: metadata.fps,
      width: metadata.width,
      height: metadata.height,
      hasAudio: metadata.hasAudio,
    },
    items: segments.map((segment) => ({
      id: segment.id,
      chapter: `${segment.eventType.toUpperCase()} ${secondsToTimestamp(segment.startSec)}`,
      startSec: segment.startSec,
      endSec: segment.endSec,
      durationSec: segment.durationSec,
      startFrame: segment.startFrame,
      endFrame: segment.endFrame,
      eventType: segment.eventType,
      decision: segment.decision,
      keepRecommendation: segment.keepRecommendation,
      reasonTags: segment.reasonTags,
      reasonText: segment.reasonText,
      expectedCommentaryRole: segment.expectedCommentaryRole,
      commentaryOpportunityScore: segment.commentaryOpportunityScore,
      comedyOpportunityScore: segment.comedyOpportunityScore,
      transcriptExcerpt: segment.transcriptExcerpt,
      ocrKeywords: segment.ocrKeywords,
    })),
  };

  const scriptOutline = {
    generatedAt: analysis.generatedAt,
    inputVideo: options.input,
    reviewGate: [
      '1. Review cut_plan.json first',
      '2. Edit sceneRole / beats / mustMention here if needed',
      '3. Only after approval run apply-cut-plan and build-gameplay-commentary',
    ],
    styleHints,
    items: segments
      .filter((segment) => segment.keepRecommendation !== 'trim')
      .map((segment) => ({
        sourceSegmentId: segment.id,
        sourceStartSec: segment.startSec,
        sourceEndSec: segment.endSec,
        sourceDurationSec: segment.durationSec,
        chapter: `${segment.eventType.toUpperCase()} ${secondsToTimestamp(segment.startSec)}`,
        sceneRole: segment.sceneRole,
        expectedCommentaryRole: segment.expectedCommentaryRole,
        banterType: segment.banterType,
        explanationBeat: buildExplanationBeat(segment),
        banterBeat: buildBanterBeat(segment, styleHints),
        banterHooks: segment.banterHooks,
        referenceStyleHints: {
          reactionWords: styleHints.reactionWords.slice(0, 4),
          openings: styleHints.openings.slice(0, 2),
          closings: styleHints.closings.slice(0, 2),
          failPhrases: styleHints.failPhrases.slice(0, 2),
          averageSentenceLength: styleHints.averageSentenceLength,
        },
        speakerPlan: {
          explanation: 'metan',
          banter: 'zundamon',
        },
        intensity: segment.intensity,
        mustMention: segment.mustMention,
        avoid: segment.avoid,
        keepRecommendation: segment.keepRecommendation,
        approved: segment.keepRecommendation === 'keep',
      })),
  };

  writeJson(GAMEPLAY_ANALYSIS_PATH, analysis);
  writeJson(CUT_PLAN_PATH, cutPlan);
  writeJson(SCRIPT_OUTLINE_PATH, scriptOutline);

  console.log(`Wrote ${GAMEPLAY_ANALYSIS_PATH}`);
  console.log(`Wrote ${CUT_PLAN_PATH}`);
  console.log(`Wrote ${SCRIPT_OUTLINE_PATH}`);
  if (warnings.length > 0) {
    console.log('Warnings:');
    warnings.forEach((warning) => console.log(`- ${warning}`));
  }
};

main();
