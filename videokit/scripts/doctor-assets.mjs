import fs from 'node:fs';
import path from 'node:path';
import process from 'node:process';
import { loadLocalEnv } from './env-utils.mjs';

loadLocalEnv();

const PROJECT_ROOT = process.cwd();
const JSON_OUTPUT = process.argv.includes('--json');
const REGISTRY_PATH = path.join(PROJECT_ROOT, 'config', 'asset-source-registry.json');
const IMPORTED_DIR = path.join(PROJECT_ROOT, 'public', 'assets', 'imported');
const ENV_LOCAL_PATH = path.join(PROJECT_ROOT, '.env.local');
const API_GUIDE_PATH = path.join(PROJECT_ROOT, 'docs', 'api-key-setup.md');

const main = () => {
  const errors = [];
  const warnings = [];

  if (!fs.existsSync(REGISTRY_PATH)) {
    const payload = {
      ok: false,
      status: 'error',
      errors: [`Missing asset source registry: ${REGISTRY_PATH}`],
      warnings: [],
      checks: [],
    };
    process.stdout.write(`${JSON.stringify(payload, null, 2)}\n`);
    process.exit(1);
  }

  const registry = JSON.parse(fs.readFileSync(REGISTRY_PATH, 'utf8'));
  const checks = [];

  checks.push({
    label: '.env.local',
    status: fs.existsSync(ENV_LOCAL_PATH) ? 'ready' : 'missing-env-file',
    detail: ENV_LOCAL_PATH,
  });

  checks.push({
    label: 'Imported asset directory',
    status: fs.existsSync(IMPORTED_DIR) ? 'ready' : 'missing-dir',
    detail: IMPORTED_DIR,
  });

  checks.push({
    label: 'API key setup guide',
    status: fs.existsSync(API_GUIDE_PATH) ? 'ready' : 'missing-doc',
    detail: API_GUIDE_PATH,
  });

  for (const source of registry.sources ?? []) {
    const authEnv = source.api?.authEnv ?? null;
    const sourceDir = path.join(IMPORTED_DIR, source.id);
    const sourceStatus = authEnv
      ? process.env[authEnv]
        ? 'ready'
        : 'missing-env'
      : 'ready';

    checks.push({
      label: `Source: ${source.id}`,
      status: sourceStatus,
      detail: authEnv ? authEnv : 'No API key required',
      docs: source.api?.docs ?? [],
      localDir: sourceDir,
    });

    if (sourceStatus === 'missing-env') {
      warnings.push(
        `${source.id} requires ${authEnv}. See docs/api-key-setup.md for retrieval steps.`,
      );
    }
  }

  if (!fs.existsSync(IMPORTED_DIR)) {
    warnings.push(`Imported asset base directory is missing: ${IMPORTED_DIR}`);
  }
  if (!fs.existsSync(ENV_LOCAL_PATH)) {
    warnings.push(`.env.local is missing. Copy .env.example to .env.local first.`);
  }
  if (!fs.existsSync(API_GUIDE_PATH)) {
    warnings.push(`API key guide is missing: ${API_GUIDE_PATH}`);
  }

  const payload = {
    ok: errors.length === 0,
    status: errors.length > 0 ? 'error' : warnings.length > 0 ? 'warning' : 'pass',
    checks,
    warnings,
    errors,
    guide: API_GUIDE_PATH,
  };

  if (JSON_OUTPUT) {
    process.stdout.write(`${JSON.stringify(payload, null, 2)}\n`);
  } else {
    console.log('Asset doctor');
    console.log('');
    for (const check of checks) {
      const marker = check.status === 'ready' ? '[OK]' : check.status === 'missing-env' || check.status === 'missing-dir' || check.status === 'missing-env-file' || check.status === 'missing-doc' ? '[WARN]' : '[INFO]';
      console.log(`${marker} ${check.label}: ${check.detail}`);
    }
    if (warnings.length > 0) {
      console.log('');
      console.log('Warnings:');
      warnings.forEach((warning) => console.log(`- ${warning}`));
      console.log('');
      console.log(`API key guide: ${API_GUIDE_PATH}`);
    }
  }

  process.exit(errors.length > 0 ? 1 : 0);
};

main();
