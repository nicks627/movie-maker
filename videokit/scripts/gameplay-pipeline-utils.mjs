import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { loadLocalEnv, resolveCommandOrPath, isPathLike } from './env-utils.mjs';

loadLocalEnv();

export const PROJECT_ROOT = process.cwd();
export const SCRIPT_PATH = path.join(PROJECT_ROOT, 'src', 'data', 'script.json');
export const GAMEPLAY_ANALYSIS_PATH = path.join(PROJECT_ROOT, 'gameplay_analysis.json');
export const CUT_PLAN_PATH = path.join(PROJECT_ROOT, 'cut_plan.json');
export const SCRIPT_OUTLINE_PATH = path.join(PROJECT_ROOT, 'script_outline.json');
export const CUT_MANIFEST_PATH = path.join(PROJECT_ROOT, 'gameplay_cut_manifest.json');
export const GENERATED_GAMEPLAY_SCRIPT_PATH = path.join(
  PROJECT_ROOT,
  'src',
  'data',
  'gameplay-commentary.generated.json',
);
export const GAMEPLAY_CUT_OUTPUT_PATH = path.join(
  PROJECT_ROOT,
  'public',
  'assets',
  'video',
  'gameplay_cut.mp4',
);
const IS_WINDOWS = process.platform === 'win32';
export const DEFAULT_PYTHON_CANDIDATES = IS_WINDOWS
  ? [path.join(PROJECT_ROOT, '.venv', 'Scripts', 'python.exe')]
  : [
      path.join(PROJECT_ROOT, '.venv', 'bin', 'python3'),
      path.join(PROJECT_ROOT, '.venv', 'bin', 'python'),
    ];
export const DEFAULT_PYTHON = DEFAULT_PYTHON_CANDIDATES[0];
export const CONFIGURED_PYTHON = resolveCommandOrPath(process.env.PYTHON_BIN, PROJECT_ROOT);
export const GAMEPLAY_BRIDGE_PATH = path.join(PROJECT_ROOT, 'scripts', 'gameplay_analysis_bridge.py');
export const DEFAULT_OCR_FRAME_DIR = path.join(PROJECT_ROOT, '.cache', 'gameplay-analysis', 'frames');
export const DEFAULT_TEMP_DIR = path.join(PROJECT_ROOT, '.cache', 'gameplay-analysis', 'tmp');
export const DEFAULT_WHISPER_MODEL = 'small';
export const FPS_FALLBACK = 30;

export const ensureDir = (dirPath) => {
  fs.mkdirSync(dirPath, { recursive: true });
};

export const readJson = (filePath) => JSON.parse(fs.readFileSync(filePath, 'utf8'));

export const writeJson = (filePath, value) => {
  ensureDir(path.dirname(filePath));
  fs.writeFileSync(filePath, `${JSON.stringify(value, null, 2)}\n`, 'utf8');
};

export const exists = (filePath) => fs.existsSync(filePath);

export const toProjectRelativeAsset = (absolutePath) => {
  const publicDir = path.join(PROJECT_ROOT, 'public');
  const relative = path.relative(publicDir, absolutePath);
  if (relative.startsWith('..')) {
    throw new Error(`Asset path must be inside public/: ${absolutePath}`);
  }

  return relative.replace(/\\/g, '/');
};

export const sanitizeStem = (value) =>
  String(value)
    .replace(/\.[^.]+$/, '')
    .replace(/[^a-zA-Z0-9_-]+/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '')
    .toLowerCase();

export const secondsToFrame = (seconds, fps = FPS_FALLBACK) => Math.max(0, Math.round(seconds * fps));

export const frameToSeconds = (frame, fps = FPS_FALLBACK) => Math.max(0, frame / fps);

export const secondsToTimestamp = (seconds) => {
  const total = Math.max(0, Number(seconds) || 0);
  const hours = Math.floor(total / 3600);
  const minutes = Math.floor((total % 3600) / 60);
  const remainder = total % 60;
  const secondsPart = remainder.toFixed(3).padStart(6, '0');
  return `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}:${secondsPart}`;
};

export const formatTimecode = (seconds) => {
  const total = Math.max(0, Math.floor(Number(seconds) || 0));
  const minutes = String(Math.floor(total / 60)).padStart(2, '0');
  const remainder = String(total % 60).padStart(2, '0');
  return `${minutes}:${remainder}`;
};

export const pick = (values) => values.find(Boolean) ?? null;

export const resolvePythonCommand = () => {
  if (CONFIGURED_PYTHON) {
    if (!isPathLike(CONFIGURED_PYTHON) || fs.existsSync(CONFIGURED_PYTHON)) {
      return { command: CONFIGURED_PYTHON, prefixArgs: [] };
    }
  }

  const localPython = DEFAULT_PYTHON_CANDIDATES.find((candidate) => fs.existsSync(candidate));
  if (localPython) {
    return { command: localPython, prefixArgs: [] };
  }

  return IS_WINDOWS
    ? { command: 'py', prefixArgs: ['-3.11'] }
    : { command: 'python3', prefixArgs: [] };
};

const ffmpegCandidates = [
  process.env.FFMPEG_PATH,
  path.join(PROJECT_ROOT, 'node_modules', '@remotion', 'compositor-win32-x64-msvc', 'ffmpeg.exe'),
  path.join(PROJECT_ROOT, 'node_modules', '@remotion', 'compositor-linux-x64-gnu', 'ffmpeg'),
  path.join(PROJECT_ROOT, 'node_modules', '@remotion', 'compositor-darwin-x64', 'ffmpeg'),
  path.join(PROJECT_ROOT, 'node_modules', '@remotion', 'compositor-darwin-arm64', 'ffmpeg'),
].filter(Boolean);

const ffprobeCandidates = [
  process.env.FFPROBE_PATH,
  path.join(PROJECT_ROOT, 'node_modules', '@ffprobe-installer', 'win32-x64', 'ffprobe.exe'),
  path.join(PROJECT_ROOT, 'node_modules', '@remotion', 'compositor-win32-x64-msvc', 'ffprobe.exe'),
  path.join(PROJECT_ROOT, 'node_modules', '@remotion', 'compositor-linux-x64-gnu', 'ffprobe'),
  path.join(PROJECT_ROOT, 'node_modules', '@remotion', 'compositor-darwin-x64', 'ffprobe'),
  path.join(PROJECT_ROOT, 'node_modules', '@remotion', 'compositor-darwin-arm64', 'ffprobe'),
].filter(Boolean);

const resolveBinary = (command, candidates) => {
  const systemResult = spawnSync(command, ['-version'], { encoding: 'utf8', windowsHide: true });
  if (systemResult.status === 0) {
    return command;
  }

  const bundled = candidates.find((candidate) => candidate && fs.existsSync(candidate));
  if (bundled) {
    return bundled;
  }

  throw new Error(`Could not resolve ${command}. Checked PATH and bundled candidates.`);
};

export const resolveFfmpegPath = () => resolveBinary('ffmpeg', ffmpegCandidates);

export const resolveFfprobePath = () => resolveBinary('ffprobe', ffprobeCandidates);

export const runCommand = ({
  command,
  args,
  cwd = PROJECT_ROOT,
  encoding = 'utf8',
  maxBuffer = 1024 * 1024 * 64,
  allowFailure = false,
}) => {
  const result = spawnSync(command, args, {
    cwd,
    encoding,
    windowsHide: true,
    maxBuffer,
  });

  if (!allowFailure && (result.error || result.status !== 0)) {
    const detail = result.error ? String(result.error) : result.stderr || result.stdout;
    throw new Error(`Command failed: ${command} ${args.join(' ')}\n${detail}`);
  }

  return result;
};

export const runPythonJson = ({ action, payload = {}, cwd = PROJECT_ROOT, allowFailure = false }) => {
  const python = resolvePythonCommand();
  const args = [...python.prefixArgs, GAMEPLAY_BRIDGE_PATH, action, JSON.stringify(payload)];
  const result = runCommand({
    command: python.command,
    args,
    cwd,
    allowFailure,
  });

  if (result.status !== 0 && allowFailure) {
    return { ok: false, stdout: result.stdout, stderr: result.stderr, status: result.status };
  }

  const stdout = String(result.stdout ?? '').trim();
  if (!stdout) {
    return {};
  }

  try {
    return JSON.parse(stdout);
  } catch (error) {
    throw new Error(`Python bridge returned invalid JSON for action "${action}": ${stdout}`);
  }
};

export const createTempDir = (prefix = 'gameplay-pipeline-') => {
  const dirPath = fs.mkdtempSync(path.join(os.tmpdir(), prefix));
  return dirPath;
};

export const splitIntoSentences = (value) => {
  const normalized = String(value ?? '')
    .replace(/\r/g, '\n')
    .replace(/[ \t]+/g, ' ')
    .replace(/\n{2,}/g, '\n')
    .trim();

  if (!normalized) {
    return [];
  }

  return normalized
    .split(/(?<=[。！？!?])/u)
    .map((entry) => entry.trim())
    .filter(Boolean);
};

export const normalizeTextForKeywords = (value) =>
  String(value ?? '')
    .toLowerCase()
    .replace(/[【】[\](){}<>「」『』"'`]/g, ' ')
    .replace(/[^\p{L}\p{N}\s_-]+/gu, ' ')
    .replace(/\s+/g, ' ')
    .trim();

export const tokenizeKeywords = (value) => {
  const normalized = normalizeTextForKeywords(value);
  if (!normalized) {
    return [];
  }

  return normalized
    .split(/\s+/)
    .map((token) => token.trim())
    .filter((token) => token.length >= 2);
};

export const dedupe = (values) => [...new Set(values.filter(Boolean))];
