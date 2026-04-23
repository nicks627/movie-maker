import fs from 'node:fs';
import path from 'node:path';

const ENV_FILES = ['.env', '.env.local'];

const parseEnvValue = (value) => {
  const trimmed = value.trim();
  if (
    (trimmed.startsWith('"') && trimmed.endsWith('"')) ||
    (trimmed.startsWith("'") && trimmed.endsWith("'"))
  ) {
    return trimmed.slice(1, -1);
  }
  return trimmed;
};

const parseEnvFile = (filePath) => {
  const result = {};
  const raw = fs.readFileSync(filePath, 'utf8');

  for (const line of raw.split(/\r?\n/u)) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) {
      continue;
    }

    const separatorIndex = trimmed.indexOf('=');
    if (separatorIndex <= 0) {
      continue;
    }

    const key = trimmed.slice(0, separatorIndex).trim();
    const value = parseEnvValue(trimmed.slice(separatorIndex + 1));
    if (!key) {
      continue;
    }

    result[key] = value;
  }

  return result;
};

export const isPathLike = (value) =>
  Boolean(value) && (/^[a-zA-Z]:/.test(value) || value.startsWith('.') || /[\\/]/.test(value));

export const resolveCommandOrPath = (value, cwd = process.cwd()) => {
  if (!value) {
    return null;
  }

  const trimmed = value.trim();
  if (!trimmed) {
    return null;
  }

  if (isPathLike(trimmed)) {
    return path.resolve(cwd, trimmed);
  }

  return trimmed;
};

export const loadLocalEnv = (cwd = process.cwd()) => {
  const loaded = {};

  for (const fileName of ENV_FILES) {
    const filePath = path.join(cwd, fileName);
    if (!fs.existsSync(filePath)) {
      continue;
    }

    Object.assign(loaded, parseEnvFile(filePath));
  }

  for (const [key, value] of Object.entries(loaded)) {
    if (!(key in process.env)) {
      process.env[key] = value;
    }
  }

  return loaded;
};
