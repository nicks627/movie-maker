import fs from 'node:fs';
import path from 'node:path';
import { normalizeDisplayValue, normalizeSpeechText, toDisplayText } from './text-normalization.mjs';
import {createDeliverableContext, writeJsonFile} from './deliverable-utils.mjs';

const SCRIPT_PATH = path.join(process.cwd(), 'src', 'data', 'script.json');

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

const getAtScene = (entry) => {
  if (typeof entry?.at_scene === 'number') {
    return entry.at_scene;
  }

  if (typeof entry?.atScene === 'number') {
    return entry.atScene;
  }

  return null;
};

const createIssue = ({
  level = 'warning',
  variant,
  type,
  message,
  sceneId,
  sceneIndex,
  current,
  expected,
}) => ({
  level,
  variant,
  type,
  message,
  sceneId: sceneId ?? null,
  sceneIndex: sceneIndex ?? null,
  current: current ?? null,
  expected: expected ?? null,
});

const reviewVariant = (script, variant) => {
  const issues = [];
  const isGameplayScript = Array.isArray(script?.timeline?.gameplay?.segments);
  const scenes = isGameplayScript ? script.timeline.gameplay.segments : (script?.[variant]?.scenes ?? []);
  const bgmSequence = isGameplayScript
    ? (Array.isArray(script?.timeline?.bgm) ? script.timeline.bgm : [])
    : (Array.isArray(script?.[variant]?.bgm_sequence) ? script[variant].bgm_sequence : []);

  if (bgmSequence.length === 0) {
    issues.push(
      createIssue({
        level: 'error',
        variant,
        type: 'bgm-missing',
        message: 'BGM が未設定です。scene 0 から常時 BGM を入れてください。',
      }),
    );
  } else {
      const sortedBgm = [...bgmSequence].sort((left, right) => (getAtScene(left) ?? 0) - (getAtScene(right) ?? 0));
    const firstAtScene = getAtScene(sortedBgm[0]);
    if (firstAtScene !== 0) {
      issues.push(
        createIssue({
          level: 'error',
          variant,
          type: 'bgm-start',
          message: 'BGM の先頭が scene 0 ではありません。動画の冒頭から BGM を入れてください。',
          current: firstAtScene,
          expected: 0,
        }),
      );
    }

    sortedBgm.forEach((entry, index) => {
      const atScene = getAtScene(entry);
      if (atScene === null || atScene < 0 || atScene >= scenes.length) {
        issues.push(
          createIssue({
            level: 'error',
            variant,
            type: 'bgm-index',
            message: 'BGM の at_scene が scene 範囲外です。',
            current: entry,
          }),
        );
      }

      if (index > 0) {
        const previousAtScene = getAtScene(sortedBgm[index - 1]);
        if (previousAtScene !== null && atScene !== null && atScene < previousAtScene) {
          issues.push(
            createIssue({
              level: 'error',
              variant,
              type: 'bgm-order',
              message: 'BGM の at_scene が昇順になっていません。',
              current: entry,
            }),
          );
        }
      }
    });
  }

  scenes.forEach((scene, index) => {
    const sceneId = scene.id ?? `scene_${index}`;
    const displayBase = scene.text ?? scene.speechText ?? scene.subtitleText ?? '';
    const speechBase = scene.speechText ?? scene.text ?? scene.subtitleText ?? '';
    const expectedDisplay = toDisplayText(displayBase || speechBase);
    const expectedSpeech = normalizeSpeechText(speechBase || displayBase);

    if (!scene.text || !scene.text.trim()) {
      issues.push(
        createIssue({
          level: 'error',
          variant,
          type: 'text-missing',
          message: '表示テキストが空です。',
          sceneId,
          sceneIndex: index,
        }),
      );
    }

    if (!scene.speechText || !scene.speechText.trim()) {
      issues.push(
        createIssue({
          level: 'warning',
          variant,
          type: 'speech-missing',
          message: 'speechText が未設定です。表示用と読み上げ用を分けて確認してください。',
          sceneId,
          sceneIndex: index,
          expected: expectedSpeech,
        }),
      );
    }

    if (scene.text !== expectedDisplay) {
      issues.push(
        createIssue({
          level: 'warning',
          variant,
          type: 'display-mismatch',
          message: '表示テキストが正規化ルールとずれています。',
          sceneId,
          sceneIndex: index,
          current: scene.text,
          expected: expectedDisplay,
        }),
      );
    }

    if (scene.speechText !== expectedSpeech) {
      issues.push(
        createIssue({
          level: 'warning',
          variant,
          type: 'speech-mismatch',
          message: 'speechText が正規化ルールとずれています。',
          sceneId,
          sceneIndex: index,
          current: scene.speechText,
          expected: expectedSpeech,
        }),
      );
    }

    (scene.popups ?? []).forEach((popup, popupIndex) => {
      const currentProps = popup.props ?? {};
      const expectedProps = normalizeDisplayValue(currentProps);

      if (JSON.stringify(currentProps) !== JSON.stringify(expectedProps)) {
        issues.push(
          createIssue({
            level: 'warning',
            variant,
            type: 'popup-display-mismatch',
            message: 'popup / background component の表示テキストが正規化ルールとずれています。',
            sceneId,
            sceneIndex: index,
            current: {
              popupIndex,
              props: currentProps,
            },
            expected: {
              popupIndex,
              props: expectedProps,
            },
          }),
        );
      }
    });
  });

  return issues;
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

  const issues = variants.flatMap((variant) => reviewVariant(script, variant));
  const report = {
    generatedAt: new Date().toISOString(),
    scriptPath: SCRIPT_PATH,
    deliverableRoot: deliverableContext.paths.root,
    variants,
    summary: {
      totalIssues: issues.length,
      errors: issues.filter((issue) => issue.level === 'error').length,
      warnings: issues.filter((issue) => issue.level === 'warning').length,
      status: issues.length === 0 ? 'ok' : 'needs-review',
    },
    workflow: [
      '1. 台本を作成する',
      '2. npm run review:preflight で display/speech/BGM/音量バランス を確認する',
      '3. 必要なら node scripts/separate-display-and-speech.mjs で整形する',
      '4. 下字幕は speechText を基準にし、補足や言い換えは popup / 背景 / 見出し側へ回す',
      '5. 音声生成と render に進む',
    ],
    issues,
  };

  writeJsonFile(deliverableContext.paths.reviewReportPaths.textAudio, report);

  console.log(`Wrote ${deliverableContext.paths.reviewReportPaths.textAudio}`);
  console.log(`Issues: ${report.summary.totalIssues} (errors: ${report.summary.errors}, warnings: ${report.summary.warnings})`);

  if (report.summary.errors > 0) {
    process.exitCode = 1;
  }
};

main();
