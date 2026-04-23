import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import {createDeliverableContext, writeJsonFile} from './deliverable-utils.mjs';

const SCRIPT_PATH = path.join(process.cwd(), 'src', 'data', 'script.json');

const DEFAULT_AUDIO = {
  bgmVolume: 0.15,
  voiceVolume: 1,
  seVolume: 0.9,
  voiceDucking: 0.58,
  duckFadeFrames: 12,
  masterVolume: 1,
};

const RMS_TARGETS = {
  minVoiceToBgmDeltaDb: 14,
  minVoiceToDuckedBgmDeltaDb: 18,
  maxVoiceToBgmDeltaDb: 26,
  maxSeRmsAboveVoiceDb: -4,
  maxSePeakDb: -8,
};

const parseArgs = () => {
  const args = process.argv.slice(2);
  let variant = 'all';
  let deliverableDir = null;
  let projectId = null;

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

    if (arg === '--deliverable-dir' && args[index + 1]) {
      deliverableDir = args[index + 1];
      index += 1;
      continue;
    }

    if (arg.startsWith('--deliverable-dir=')) {
      deliverableDir = arg.slice('--deliverable-dir='.length);
      continue;
    }

    if (arg === '--project-id' && args[index + 1]) {
      projectId = args[index + 1];
      index += 1;
      continue;
    }

    if (arg.startsWith('--project-id=')) {
      projectId = arg.slice('--project-id='.length);
    }
  }

  return { variant, deliverableDir, projectId };
};

const selectedVariants = (script, requestedVariant) => {
  const hasGameplaySegments = Array.isArray(script?.timeline?.gameplay?.segments);

  if (hasGameplaySegments) {
    if (requestedVariant === 'all' || requestedVariant === 'both') {
      return [script.activeVariant ?? script.project?.defaultVariant ?? 'long'];
    }

    return [requestedVariant === 'current' ? (script.activeVariant ?? script.project?.defaultVariant ?? 'long') : requestedVariant];
  }

  if (requestedVariant === 'all') {
    return ['long', 'short'].filter((variant) => Array.isArray(script?.[variant]?.scenes));
  }

  return [requestedVariant].filter((variant) => Array.isArray(script?.[variant]?.scenes));
};

const db = (value) => 20 * Math.log10(Math.max(value, 1e-9));

const gainDb = (gain) => db(gain);

const median = (values) => {
  if (!values.length) {
    return null;
  }

  const sorted = [...values].sort((left, right) => left - right);
  const middle = Math.floor(sorted.length / 2);

  if (sorted.length % 2 === 1) {
    return sorted[middle];
  }

  return (sorted[middle - 1] + sorted[middle]) / 2;
};

const average = (values) => {
  if (!values.length) {
    return null;
  }

  return values.reduce((sum, value) => sum + value, 0) / values.length;
};

const toFixedNumber = (value) => Number(value.toFixed(2));

const findFfmpegPath = () => {
  const candidates = [
    process.env.FFMPEG_PATH,
    path.join(process.cwd(), 'node_modules', '@remotion', 'compositor-win32-x64-msvc', 'ffmpeg.exe'),
    path.join(process.cwd(), 'node_modules', '@remotion', 'compositor-linux-x64-gnu', 'ffmpeg'),
    path.join(process.cwd(), 'node_modules', '@remotion', 'compositor-darwin-x64', 'ffmpeg'),
    path.join(process.cwd(), 'node_modules', '@remotion', 'compositor-darwin-arm64', 'ffmpeg'),
  ].filter(Boolean);

  return candidates.find((candidate) => fs.existsSync(candidate)) ?? null;
};

const readWavStats = (wavPath) => {
  const buffer = fs.readFileSync(wavPath);
  const channelCount = buffer.readUInt16LE(22);
  const bitsPerSample = buffer.readUInt16LE(34);
  const bytesPerSample = bitsPerSample / 8;
  const dataMarker = buffer.indexOf(Buffer.from('data'));

  if (dataMarker === -1) {
    throw new Error(`Could not find WAV data chunk in ${wavPath}`);
  }

  const dataSize = buffer.readUInt32LE(dataMarker + 4);
  const dataStart = dataMarker + 8;
  const sampleCount = Math.floor(dataSize / bytesPerSample / channelCount);
  let sumSq = 0;
  let peak = 0;

  for (let sampleIndex = 0; sampleIndex < sampleCount; sampleIndex += 1) {
    let mono = 0;
    for (let channelIndex = 0; channelIndex < channelCount; channelIndex += 1) {
      const offset = dataStart + (sampleIndex * channelCount + channelIndex) * bytesPerSample;
      mono += buffer.readInt16LE(offset) / 32768;
    }

    mono /= channelCount;
    const abs = Math.abs(mono);
    if (abs > peak) {
      peak = abs;
    }
    sumSq += mono * mono;
  }

  const rms = Math.sqrt(sumSq / Math.max(sampleCount, 1));

  return {
    rmsDb: db(rms),
    peakDb: db(peak),
  };
};

const decodeAudioStats = ({ ffmpegPath, inputPath, maxSeconds = null }) => {
  const tempPath = path.join(
    os.tmpdir(),
    `audio-review-${process.pid}-${Date.now()}-${Math.random().toString(36).slice(2)}.wav`,
  );

  const args = ['-v', 'error', '-y', '-i', inputPath, '-ac', '1', '-ar', '16000'];
  if (maxSeconds) {
    args.push('-t', String(maxSeconds));
  }
  args.push(tempPath);

  const result = spawnSync(ffmpegPath, args, { encoding: 'utf8', maxBuffer: 1024 * 1024 * 32 });
  if (result.error || result.status !== 0) {
    const stderr = result.error ? String(result.error) : result.stderr;
    throw new Error(`ffmpeg decode failed for ${inputPath}: ${stderr}`);
  }

  try {
    return readWavStats(tempPath);
  } finally {
    if (fs.existsSync(tempPath)) {
      fs.unlinkSync(tempPath);
    }
  }
};

const createIssue = ({ level, variant, type, message, current, expected, metrics = {} }) => ({
  level,
  variant,
  type,
  message,
  current: current ?? null,
  expected: expected ?? null,
  metrics,
});

const resolveVoicePath = (scene, index) => {
  const filename = scene.voiceFile ?? `${scene.id ?? `scene_${index}`}.wav`;
  return path.join(process.cwd(), 'public', 'voices', filename);
};

const analyzeVariant = ({ script, variant, ffmpegPath }) => {
  const issues = [];
  const isGameplayScript = Array.isArray(script?.timeline?.gameplay?.segments);
  const scenes = isGameplayScript ? script.timeline.gameplay.segments : (script?.[variant]?.scenes ?? []);
  const bgmSequence = isGameplayScript ? (script?.timeline?.bgm ?? []) : (script?.[variant]?.bgm_sequence ?? []);
  const audioConfig = { ...DEFAULT_AUDIO, ...(script.audio ?? {}) };

  if (audioConfig.bgmVolume < 0.06 || audioConfig.bgmVolume > 0.18) {
    issues.push(createIssue({
      level: 'warning',
      variant,
      type: 'bgm-volume-range',
      message: 'BGM 音量は 0.06〜0.18 を基本にしてください。',
      current: audioConfig.bgmVolume,
      expected: '0.06 - 0.18',
    }));
  }

  if (audioConfig.voiceDucking < 0.4 || audioConfig.voiceDucking > 0.7) {
    issues.push(createIssue({
      level: 'warning',
      variant,
      type: 'voice-ducking-range',
      message: 'voiceDucking は 0.40〜0.70 に収めると、読みやすさとBGMの存在感のバランスが安定します。',
      current: audioConfig.voiceDucking,
      expected: '0.40 - 0.70',
    }));
  }

  if (audioConfig.seVolume < 0.5 || audioConfig.seVolume > 1.0) {
    issues.push(createIssue({
      level: 'warning',
      variant,
      type: 'se-volume-range',
      message: 'SE の global volume は 0.50〜1.00 を基本にしてください。',
      current: audioConfig.seVolume,
      expected: '0.50 - 1.00',
    }));
  }

  const voiceFiles = scenes
    .map((scene, index) => resolveVoicePath(scene, index))
    .filter((filePath) => fs.existsSync(filePath))
    .slice(0, 8);
  const bgmFiles = [...new Set(bgmSequence.map((entry) => entry.file || (entry.src ? path.basename(entry.src) : undefined)))]
    .filter(Boolean)
    .map((filename) => path.join(process.cwd(), 'public', 'assets', 'bgm', filename))
    .filter((filePath) => fs.existsSync(filePath))
    .slice(0, 4);

  const seEntries = scenes
    .flatMap((scene) => ((scene.se ?? [])).map((se) => ({
      filePath: path.join(process.cwd(), 'public', 'assets', 'se', se.file),
      volume: typeof se.volume === 'number' ? se.volume : 0.8,
      file: se.file,
    })))
    .filter((entry) => fs.existsSync(entry.filePath))
    .slice(0, 16);

  const voiceStats = voiceFiles.map((filePath) => ({
    filePath,
    ...decodeAudioStats({ ffmpegPath, inputPath: filePath }),
  }));
  const bgmStats = bgmFiles.map((filePath) => ({
    filePath,
    ...decodeAudioStats({ ffmpegPath, inputPath: filePath, maxSeconds: 20 }),
  }));
  const seStats = seEntries.map((entry) => ({
    ...entry,
    ...decodeAudioStats({ ffmpegPath, inputPath: entry.filePath }),
  }));

  if (voiceStats.length === 0) {
    issues.push(createIssue({
      level: 'error',
      variant,
      type: 'voice-missing',
      message: '音量バランスの確認に必要な voice ファイルが見つかりません。',
    }));
  }

  if (bgmSequence.length > 0 && bgmStats.length === 0) {
    issues.push(createIssue({
      level: 'error',
      variant,
      type: 'bgm-missing',
      message: '音量バランスの確認に必要な BGM ファイルが見つかりません。',
    }));
  }

  const voiceRmsMedian = median(voiceStats.map((entry) => entry.rmsDb));
  const bgmRmsMedian = median(bgmStats.map((entry) => entry.rmsDb));
  const seRmsAverage = average(seStats.map((entry) => entry.rmsDb + gainDb(entry.volume * audioConfig.seVolume * audioConfig.masterVolume)));
  const sePeakMax = seStats.length > 0
    ? Math.max(...seStats.map((entry) => entry.peakDb + gainDb(entry.volume * audioConfig.seVolume * audioConfig.masterVolume)))
    : null;

  if (voiceRmsMedian !== null && bgmRmsMedian !== null) {
    const effectiveVoiceRms = voiceRmsMedian + gainDb(audioConfig.voiceVolume * audioConfig.masterVolume);
    const effectiveBgmRms = bgmRmsMedian + gainDb(audioConfig.bgmVolume * audioConfig.masterVolume);
    const effectiveDuckedBgmRms = bgmRmsMedian + gainDb(audioConfig.bgmVolume * audioConfig.voiceDucking * audioConfig.masterVolume);
    const voiceToBgmDelta = effectiveVoiceRms - effectiveBgmRms;
    const voiceToDuckedBgmDelta = effectiveVoiceRms - effectiveDuckedBgmRms;

    if (voiceToBgmDelta < RMS_TARGETS.minVoiceToBgmDeltaDb) {
      issues.push(createIssue({
        level: 'warning',
        variant,
        type: 'bgm-too-loud',
        message: '通常時の BGM が声に近すぎます。bgmVolume を少し下げるか、voiceVolume を少し上げてください。',
        current: toFixedNumber(voiceToBgmDelta),
        expected: `>= ${RMS_TARGETS.minVoiceToBgmDeltaDb}dB`,
        metrics: {
          effectiveVoiceRms: toFixedNumber(effectiveVoiceRms),
          effectiveBgmRms: toFixedNumber(effectiveBgmRms),
        },
      }));
    }

    if (voiceToBgmDelta > RMS_TARGETS.maxVoiceToBgmDeltaDb) {
      issues.push(createIssue({
        level: 'warning',
        variant,
        type: 'bgm-too-quiet',
        message: '通常時の BGM がかなり控えめです。静かすぎるとテンポ感が弱くなるので確認してください。',
        current: toFixedNumber(voiceToBgmDelta),
        expected: `<= ${RMS_TARGETS.maxVoiceToBgmDeltaDb}dB`,
        metrics: {
          effectiveVoiceRms: toFixedNumber(effectiveVoiceRms),
          effectiveBgmRms: toFixedNumber(effectiveBgmRms),
        },
      }));
    }

    if (voiceToDuckedBgmDelta < RMS_TARGETS.minVoiceToDuckedBgmDeltaDb) {
      issues.push(createIssue({
        level: 'warning',
        variant,
        type: 'ducking-weak',
        message: '話している最中の BGM ダッキングが弱めです。voiceDucking を少し下げると聞き取りやすくなります。',
        current: toFixedNumber(voiceToDuckedBgmDelta),
        expected: `>= ${RMS_TARGETS.minVoiceToDuckedBgmDeltaDb}dB`,
        metrics: {
          effectiveVoiceRms: toFixedNumber(effectiveVoiceRms),
          effectiveDuckedBgmRms: toFixedNumber(effectiveDuckedBgmRms),
        },
      }));
    }
  }

  if (voiceRmsMedian !== null && seRmsAverage !== null) {
    const effectiveVoiceRms = voiceRmsMedian + gainDb(audioConfig.voiceVolume * audioConfig.masterVolume);
    const seVsVoice = seRmsAverage - effectiveVoiceRms;
    if (seVsVoice > RMS_TARGETS.maxSeRmsAboveVoiceDb) {
      issues.push(createIssue({
        level: 'warning',
        variant,
        type: 'se-too-loud',
        message: 'SE の平均音量が声に近すぎます。seVolume か個別 SE volume を少し下げてください。',
        current: toFixedNumber(seVsVoice),
        expected: `<= ${RMS_TARGETS.maxSeRmsAboveVoiceDb}dB`,
        metrics: {
          effectiveVoiceRms: toFixedNumber(effectiveVoiceRms),
          effectiveSeRmsAverage: toFixedNumber(seRmsAverage),
        },
      }));
    }
  }

  if (sePeakMax !== null && sePeakMax > RMS_TARGETS.maxSePeakDb) {
    issues.push(createIssue({
      level: 'warning',
      variant,
      type: 'se-peak-high',
      message: 'SE のピークが高めです。瞬間的にうるさく聞こえる可能性があるので確認してください。',
      current: toFixedNumber(sePeakMax),
      expected: `<= ${RMS_TARGETS.maxSePeakDb}dBFS`,
    }));
  }

  return {
    variant,
    audioConfig,
    stats: {
      voiceSampleCount: voiceStats.length,
      bgmSampleCount: bgmStats.length,
      seSampleCount: seStats.length,
      voiceRmsMedian: voiceRmsMedian === null ? null : toFixedNumber(voiceRmsMedian + gainDb(audioConfig.voiceVolume * audioConfig.masterVolume)),
      bgmRmsMedian: bgmRmsMedian === null ? null : toFixedNumber(bgmRmsMedian + gainDb(audioConfig.bgmVolume * audioConfig.masterVolume)),
      duckedBgmRmsMedian: bgmRmsMedian === null ? null : toFixedNumber(bgmRmsMedian + gainDb(audioConfig.bgmVolume * audioConfig.voiceDucking * audioConfig.masterVolume)),
      seRmsAverage: seRmsAverage === null ? null : toFixedNumber(seRmsAverage),
      sePeakMax: sePeakMax === null ? null : toFixedNumber(sePeakMax),
    },
    issues,
  };
};

const main = () => {
  const options = parseArgs();
  const script = JSON.parse(fs.readFileSync(SCRIPT_PATH, 'utf8'));
  const variants = selectedVariants(script, options.variant);
  const deliverableContext = createDeliverableContext({
    script,
    projectId: options.projectId,
    deliverableDir: options.deliverableDir,
    snapshotScript: true,
  });

  if (variants.length === 0) {
    throw new Error(`Variant "${options.variant}" does not contain scenes.`);
  }

  const ffmpegPath = findFfmpegPath();
  if (!ffmpegPath) {
    throw new Error('ffmpeg was not found. Set FFMPEG_PATH or install the Remotion compositor package.');
  }

  const variantReports = variants.map((variant) => analyzeVariant({ script, variant, ffmpegPath }));
  const issues = variantReports.flatMap((report) => report.issues);
  const summary = {
    totalIssues: issues.length,
    errors: issues.filter((issue) => issue.level === 'error').length,
    warnings: issues.filter((issue) => issue.level === 'warning').length,
    status: issues.length === 0 ? 'ok' : 'needs-review',
  };
  const report = {
    generatedAt: new Date().toISOString(),
    scriptPath: SCRIPT_PATH,
    deliverableRoot: deliverableContext.paths.root,
    ffmpegPath,
    variants,
    summary,
    workflow: [
      '1. 台本を作成する',
      '2. npm run review:preflight で display/speech/BGM/音量バランス を確認する',
      '3. voice が主役、SE は一瞬前へ、BGM は常に一歩下げる',
      '4. render 前に voiceDucking と global volume を見直す',
    ],
    variantReports,
    issues,
  };

  writeJsonFile(deliverableContext.paths.reviewReportPaths.audioBalance, report);

  console.log(`Wrote ${deliverableContext.paths.reviewReportPaths.audioBalance}`);
  console.log(`Issues: ${summary.totalIssues} (errors: ${summary.errors}, warnings: ${summary.warnings})`);

  if (summary.errors > 0) {
    process.exitCode = 1;
  }
};

main();
