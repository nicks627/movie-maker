import fs from 'node:fs';
import path from 'node:path';
import {
  ensureDeliverableDirs,
  getDeliverablePaths,
  readScriptJson,
  writeJsonFile,
} from './deliverable-utils.mjs';

const SCRIPT_PATH = path.join(process.cwd(), 'src', 'data', 'script.json');
const DEFAULT_FPS = 30;

const parseArgs = () => {
  const args = process.argv.slice(2);
  let variant = 'all';
  let projectId = null;
  let deliverableDir = null;
  let scriptPath = null;
  let translationsPath = null;
  let fps = DEFAULT_FPS;

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

    if (arg === '--project-id' && args[index + 1]) {
      projectId = args[index + 1];
      index += 1;
      continue;
    }
    if (arg.startsWith('--project-id=')) {
      projectId = arg.slice('--project-id='.length);
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

    if (arg === '--script' && args[index + 1]) {
      scriptPath = args[index + 1];
      index += 1;
      continue;
    }
    if (arg.startsWith('--script=')) {
      scriptPath = arg.slice('--script='.length);
      continue;
    }

    if (arg === '--translations' && args[index + 1]) {
      translationsPath = args[index + 1];
      index += 1;
      continue;
    }
    if (arg.startsWith('--translations=')) {
      translationsPath = arg.slice('--translations='.length);
      continue;
    }

    if (arg === '--fps' && args[index + 1]) {
      fps = Number(args[index + 1]) || DEFAULT_FPS;
      index += 1;
      continue;
    }
    if (arg.startsWith('--fps=')) {
      fps = Number(arg.slice('--fps='.length)) || DEFAULT_FPS;
    }
  }

  return {
    variant,
    projectId,
    deliverableDir,
    scriptPath,
    translationsPath,
    fps,
  };
};

const hasVariantScenes = (script, variant) => Array.isArray(script?.[variant]?.scenes) && script[variant].scenes.length > 0;

const resolveVariants = (script, requestedVariant) => {
  if (requestedVariant === 'current') {
    const activeVariant = script.activeVariant ?? script.project?.defaultVariant ?? 'long';
    return hasVariantScenes(script, activeVariant) ? [activeVariant] : [];
  }

  if (requestedVariant === 'both' || requestedVariant === 'all') {
    return ['long', 'short'].filter((variant) => hasVariantScenes(script, variant));
  }

  return hasVariantScenes(script, requestedVariant) ? [requestedVariant] : [];
};

const readJsonFile = (targetPath) => JSON.parse(fs.readFileSync(targetPath, 'utf8'));

const loadScriptContext = ({ projectId, deliverableDir, scriptPath }) => {
  const activeScript = readScriptJson();
  const initialPaths = getDeliverablePaths({
    script: activeScript,
    projectId,
    deliverableDir,
  });
  const snapshotPath = path.join(initialPaths.root, 'source', 'script.snapshot.json');

  let script = activeScript;
  let sourcePath = SCRIPT_PATH;

  if (scriptPath) {
    sourcePath = path.resolve(scriptPath);
    script = readJsonFile(sourcePath);
  } else if (fs.existsSync(snapshotPath)) {
    sourcePath = snapshotPath;
    script = readJsonFile(sourcePath);
  }

  const paths = getDeliverablePaths({
    script,
    projectId,
    deliverableDir,
  });
  ensureDeliverableDirs(paths);

  return {
    script,
    sourcePath,
    paths,
  };
};

const normalizeCueText = (value) =>
  String(value ?? '')
    .replace(/\r/g, '\n')
    .replace(/\s*\n+\s*/g, ' ')
    .replace(/[ \t]+/g, ' ')
    .trim();

const pad = (value, size = 2) => String(value).padStart(size, '0');

const formatSrtTimestamp = (seconds) => {
  const safe = Math.max(0, Number(seconds) || 0);
  const hours = Math.floor(safe / 3600);
  const minutes = Math.floor((safe % 3600) / 60);
  const wholeSeconds = Math.floor(safe % 60);
  const milliseconds = Math.round((safe - Math.floor(safe)) * 1000);

  return `${pad(hours)}:${pad(minutes)}:${pad(wholeSeconds)},${pad(milliseconds, 3)}`;
};

const framesToSeconds = (frame, fps) => Math.max(0, (Number(frame) || 0) / fps);

const resolveSceneText = (scene) => normalizeCueText(scene.speechText ?? scene.text ?? scene.subtitleText ?? '');

const resolveSceneStartFrame = (scene, fallbackStartFrame) => {
  if (typeof scene.startTime === 'number' && Number.isFinite(scene.startTime)) {
    return scene.startTime;
  }
  return fallbackStartFrame;
};

const resolveSceneDurationFrame = (scene) => {
  if (typeof scene.duration === 'number' && Number.isFinite(scene.duration)) {
    return Math.max(1, scene.duration);
  }
  return DEFAULT_FPS * 4;
};

const buildVariantCues = ({ scenes, fps, translationsByScene, variant }) => {
  const jaCues = [];
  const enCues = [];
  const missingTranslations = [];
  let fallbackStartFrame = 0;

  for (const scene of scenes) {
    const jaText = resolveSceneText(scene);
    const startFrame = resolveSceneStartFrame(scene, fallbackStartFrame);
    const durationFrame = resolveSceneDurationFrame(scene);
    const endFrame = startFrame + durationFrame;
    fallbackStartFrame = endFrame;

    if (!jaText) {
      continue;
    }

    const enText = normalizeCueText(translationsByScene?.[scene.id]);
    if (!enText) {
      missingTranslations.push(scene.id);
    }

    const baseCue = {
      sceneId: scene.id ?? null,
      startSeconds: framesToSeconds(startFrame, fps),
      endSeconds: framesToSeconds(endFrame, fps),
    };

    jaCues.push({
      ...baseCue,
      text: jaText,
    });

    if (enText) {
      enCues.push({
        ...baseCue,
        text: enText,
      });
    }
  }

  if (missingTranslations.length > 0) {
    throw new Error(
      `Missing English subtitle translations for variant "${variant}": ${missingTranslations.join(', ')}`,
    );
  }

  return {
    jaCues,
    enCues,
  };
};

const buildSrt = (cues) =>
  `${cues
    .map(
      (cue, index) =>
        `${index + 1}\n${formatSrtTimestamp(cue.startSeconds)} --> ${formatSrtTimestamp(cue.endSeconds)}\n${cue.text}`,
    )
    .join('\n\n')}\n`;

const writeSubtitleFile = (targetPath, cues) => {
  fs.writeFileSync(targetPath, buildSrt(cues), 'utf8');
};

const main = () => {
  const options = parseArgs();
  const { script, sourcePath, paths } = loadScriptContext(options);
  const variants = resolveVariants(script, options.variant);

  if (variants.length === 0) {
    throw new Error(`Variant "${options.variant}" does not contain scenes.`);
  }

  const translationsPath = path.resolve(
    options.translationsPath ?? path.join(paths.manifestsDir, 'youtube_subtitles.en.json'),
  );
  if (!fs.existsSync(translationsPath)) {
    throw new Error(`English subtitle manifest not found: ${translationsPath}`);
  }

  const translations = readJsonFile(translationsPath);
  const outputs = [];

  for (const variant of variants) {
    const scenes = script?.[variant]?.scenes ?? [];
    const { jaCues, enCues } = buildVariantCues({
      scenes,
      fps: options.fps,
      translationsByScene: translations?.[variant] ?? {},
      variant,
    });

    const jaPath = path.join(paths.publishDir, `youtube_subtitles.${variant}.ja.srt`);
    const enPath = path.join(paths.publishDir, `youtube_subtitles.${variant}.en.srt`);

    writeSubtitleFile(jaPath, jaCues);
    writeSubtitleFile(enPath, enCues);

    outputs.push({
      variant,
      jaPath,
      enPath,
      cueCount: jaCues.length,
    });
  }

  const reportPath = path.join(paths.manifestsDir, 'youtube_subtitles.generated.json');
  const report = {
    generatedAt: new Date().toISOString(),
    projectId: paths.projectId,
    deliverableRoot: paths.root,
    scriptSourcePath: sourcePath,
    translationsPath,
    variants,
    outputs,
  };
  writeJsonFile(reportPath, report);

  console.log(`Wrote ${reportPath}`);
  for (const output of outputs) {
    console.log(`[${output.variant}] JA: ${output.jaPath}`);
    console.log(`[${output.variant}] EN: ${output.enPath}`);
    console.log(`[${output.variant}] Cues: ${output.cueCount}`);
  }
};

main();
