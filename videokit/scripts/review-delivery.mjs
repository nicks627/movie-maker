import path from 'node:path';
import { spawnSync } from 'node:child_process';

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

const runNodeScript = ({ scriptPath, variant, deliverableDir, projectId }) => {
  const args = [scriptPath, '--variant', variant];
  if (deliverableDir) {
    args.push('--deliverable-dir', deliverableDir);
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
  runNodeScript({
    scriptPath: path.join(process.cwd(), 'scripts', 'review-preflight.mjs'),
    variant: options.variant,
    deliverableDir: options.deliverableDir,
    projectId: options.projectId,
  });
  runNodeScript({
    scriptPath: path.join(process.cwd(), 'scripts', 'review-publish-assets.mjs'),
    variant: options.variant,
    deliverableDir: options.deliverableDir,
    projectId: options.projectId,
  });
};

main();
