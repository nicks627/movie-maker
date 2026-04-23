import fs from 'node:fs';
import path from 'node:path';
import {
  CUT_MANIFEST_PATH,
  CUT_PLAN_PATH,
  GAMEPLAY_CUT_OUTPUT_PATH,
  ensureDir,
  readJson,
  resolveFfmpegPath,
  runCommand,
  sanitizeStem,
  secondsToFrame,
  toProjectRelativeAsset,
  writeJson,
} from './gameplay-pipeline-utils.mjs';

const parseArgs = () => {
  const args = process.argv.slice(2);
  let input = null;
  let cutPlan = CUT_PLAN_PATH;
  let includeMaybe = false;

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
    if (arg === '--cut-plan' && args[index + 1]) {
      cutPlan = args[index + 1];
      index += 1;
      continue;
    }
    if (arg.startsWith('--cut-plan=')) {
      cutPlan = arg.slice('--cut-plan='.length);
      continue;
    }
    if (arg === '--include-maybe') {
      includeMaybe = true;
    }
  }

  if (!input) {
    throw new Error('Missing required --input <video>.');
  }

  return {
    input: path.resolve(input),
    cutPlan: path.resolve(cutPlan),
    includeMaybe,
  };
};

const main = () => {
  const options = parseArgs();
  const ffmpegPath = resolveFfmpegPath();
  const cutPlan = readJson(options.cutPlan);
  const items = Array.isArray(cutPlan.items) ? cutPlan.items : [];
  if (items.length === 0) {
    throw new Error(`No items found in cut plan: ${options.cutPlan}`);
  }

  const unresolvedMaybe = items.filter((item) => (item.decision ?? item.keepRecommendation) === 'maybe');
  if (unresolvedMaybe.length > 0 && !options.includeMaybe) {
    throw new Error(
      `cut_plan.json still has ${unresolvedMaybe.length} "maybe" items. Resolve them or pass --include-maybe.`,
    );
  }

  const selectedItems = items.filter((item) => {
    const decision = item.decision ?? item.keepRecommendation;
    return decision === 'keep' || (decision === 'maybe' && options.includeMaybe);
  });

  if (selectedItems.length === 0) {
    throw new Error('No keep segments selected. Nothing to cut.');
  }

  ensureDir(path.dirname(GAMEPLAY_CUT_OUTPUT_PATH));
  const tempDir = path.join(path.dirname(GAMEPLAY_CUT_OUTPUT_PATH), '.tmp-cut-plan');
  ensureDir(tempDir);

  const manifestSegments = [];
  const concatListPath = path.join(tempDir, 'concat-list.txt');
  const concatLines = [];
  let cutCursorSec = 0;
  const fps = Number(cutPlan.metadata?.fps ?? 30);
  const inputStem = sanitizeStem(path.basename(options.input));

  selectedItems.forEach((item, index) => {
    const clipPath = path.join(tempDir, `${inputStem}-${String(index).padStart(4, '0')}.mp4`);
    runCommand({
      command: ffmpegPath,
      args: [
        '-hide_banner',
        '-y',
        '-ss',
        String(item.startSec),
        '-to',
        String(item.endSec),
        '-i',
        options.input,
        '-c:v',
        'libx264',
        '-preset',
        'veryfast',
        '-crf',
        '20',
        '-c:a',
        'aac',
        '-b:a',
        '192k',
        clipPath,
      ],
    });
    concatLines.push(`file '${clipPath.replace(/\\/g, '/').replace(/'/g, "'\\''")}'`);

    const durationSec = Number(item.durationSec ?? Math.max(0, item.endSec - item.startSec));
    manifestSegments.push({
      id: item.id,
      chapter: item.chapter ?? item.expectedCommentaryRole ?? `segment_${index + 1}`,
      eventType: item.eventType ?? null,
      decision: item.decision ?? item.keepRecommendation,
      sourceStartSec: Number(item.startSec),
      sourceEndSec: Number(item.endSec),
      sourceDurationSec: Number(durationSec.toFixed(3)),
      sourceStartFrame: secondsToFrame(Number(item.startSec), fps),
      sourceEndFrame: secondsToFrame(Number(item.endSec), fps),
      cutStartSec: Number(cutCursorSec.toFixed(3)),
      cutEndSec: Number((cutCursorSec + durationSec).toFixed(3)),
      cutDurationSec: Number(durationSec.toFixed(3)),
      cutStartFrame: secondsToFrame(cutCursorSec, fps),
      cutEndFrame: secondsToFrame(cutCursorSec + durationSec, fps),
      expectedCommentaryRole: item.expectedCommentaryRole ?? null,
      reasonTags: item.reasonTags ?? [],
      trimBefore: secondsToFrame(cutCursorSec, fps),
      sourceDurationFrames: secondsToFrame(durationSec, fps),
    });
    cutCursorSec += durationSec;
  });

  fs.writeFileSync(concatListPath, `${concatLines.join('\n')}\n`, 'utf8');

  runCommand({
    command: ffmpegPath,
    args: [
      '-hide_banner',
      '-y',
      '-f',
      'concat',
      '-safe',
      '0',
      '-i',
      concatListPath,
      '-c',
      'copy',
      GAMEPLAY_CUT_OUTPUT_PATH,
    ],
  });

  const manifest = {
    generatedAt: new Date().toISOString(),
    inputVideo: options.input,
    cutVideo: toProjectRelativeAsset(GAMEPLAY_CUT_OUTPUT_PATH),
    cutPlanPath: options.cutPlan,
    fps,
    includeMaybe: options.includeMaybe,
    segmentCount: manifestSegments.length,
    totalDurationSec: Number(cutCursorSec.toFixed(3)),
    segments: manifestSegments,
  };

  writeJson(CUT_MANIFEST_PATH, manifest);

  console.log(`Wrote ${GAMEPLAY_CUT_OUTPUT_PATH}`);
  console.log(`Wrote ${CUT_MANIFEST_PATH}`);
};

main();
