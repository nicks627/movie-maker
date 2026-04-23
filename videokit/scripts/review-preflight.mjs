import fs from 'node:fs';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import {createDeliverableContext} from './deliverable-utils.mjs';

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

const resolveVariants = (script, requestedVariant) => {
  const hasGameplaySegments = Array.isArray(script?.timeline?.gameplay?.segments);

  if (hasGameplaySegments) {
    if (requestedVariant === 'current') {
      return [script.activeVariant ?? script.project?.defaultVariant ?? 'long'];
    }

    if (requestedVariant === 'both' || requestedVariant === 'all') {
      return [script.activeVariant ?? script.project?.defaultVariant ?? 'long'];
    }

    return [requestedVariant];
  }

  if (requestedVariant === 'current') {
    const activeVariant = script.activeVariant ?? script.project?.defaultVariant ?? 'long';
    return [activeVariant];
  }

  if (requestedVariant === 'both' || requestedVariant === 'all') {
    return ['long', 'short'].filter((variant) => Array.isArray(script?.[variant]?.scenes));
  }

  return [requestedVariant].filter((variant) => Array.isArray(script?.[variant]?.scenes));
};

const runNodeScript = ({ scriptPath, variant, deliverableRoot, projectId }) => {
  const args = [scriptPath, '--variant', variant];
  if (deliverableRoot) {
    args.push('--deliverable-dir', deliverableRoot);
  }
  if (projectId) {
    args.push('--project-id', projectId);
  }

  const result = spawnSync(process.execPath, args, {
    cwd: process.cwd(),
    stdio: 'inherit',
  });

  if (typeof result.status === 'number' && result.status !== 0) {
    throw new Error(`${path.basename(scriptPath)} failed for variant "${variant}".`);
  }
};

const main = () => {
  const options = parseArgs();
  const script = JSON.parse(fs.readFileSync(SCRIPT_PATH, 'utf8'));
  const variants = resolveVariants(script, options.variant);
  const deliverableContext = createDeliverableContext({
    script,
    projectId: options.projectId,
    deliverableDir: options.deliverableDir,
    seedPublishFromLegacy: true,
    snapshotScript: true,
  });

  if (variants.length === 0) {
    console.log(`No scene-based variants found for "${options.variant}". Skipping preflight review.`);
    return;
  }

  for (const variant of variants) {
    console.log(`\n=== Preflight review: ${variant} ===`);
    runNodeScript({
      scriptPath: path.join(process.cwd(), 'scripts', 'review-text-audio.mjs'),
      variant,
      deliverableRoot: deliverableContext.paths.root,
      projectId: deliverableContext.paths.projectId,
    });
    runNodeScript({
      scriptPath: path.join(process.cwd(), 'scripts', 'review-audio-balance.mjs'),
      variant,
      deliverableRoot: deliverableContext.paths.root,
      projectId: deliverableContext.paths.projectId,
    });
    runNodeScript({
      scriptPath: path.join(process.cwd(), 'scripts', 'review-rhythm-visual.mjs'),
      variant,
      deliverableRoot: deliverableContext.paths.root,
      projectId: deliverableContext.paths.projectId,
    });
  }
};

main();
