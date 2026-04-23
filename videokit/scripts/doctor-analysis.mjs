import fs from 'node:fs';
import path from 'node:path';
import process from 'node:process';
import { spawnSync } from 'node:child_process';
import { loadLocalEnv } from './env-utils.mjs';
import { resolveFfmpegPath, resolveFfprobePath } from './gameplay-pipeline-utils.mjs';

loadLocalEnv();

const PROJECT_ROOT = process.cwd();
const JSON_OUTPUT = process.argv.includes('--json');

const pythonCandidates = [
  process.env.PYTHON_BIN,
  path.join(PROJECT_ROOT, '.venv', 'Scripts', 'python.exe'),
  path.join(PROJECT_ROOT, '.venv', 'bin', 'python3'),
  path.join(PROJECT_ROOT, '.venv', 'bin', 'python'),
  'py',
  'python3.11',
  'python3',
  'python',
].filter(Boolean);

const uniqueCandidates = pythonCandidates.filter(
  (candidate, index) => pythonCandidates.indexOf(candidate) === index,
);

const tryPython = (candidate) => {
  const isPyLauncher = candidate === 'py';
  const args = isPyLauncher ? ['-3.11', '--version'] : ['--version'];
  const result = spawnSync(candidate, args, {
    cwd: PROJECT_ROOT,
    encoding: 'utf8',
    windowsHide: true,
  });
  return result.status === 0;
};

const resolvePython = () => {
  const candidate = uniqueCandidates.find((item) => tryPython(item));
  if (!candidate) {
    return null;
  }

  return {
    command: candidate,
    prefixArgs: candidate === 'py' ? ['-3.11'] : [],
  };
};

const runPythonSnippet = (python, snippet) => {
  const result = spawnSync(
    python.command,
    [...python.prefixArgs, '-c', snippet],
    {
      cwd: PROJECT_ROOT,
      encoding: 'utf8',
      windowsHide: true,
      env: {
        ...process.env,
        PYTHONIOENCODING: 'utf-8',
        PYTHONUTF8: '1',
      },
    },
  );

  if (result.status !== 0) {
    throw new Error(result.stderr || result.stdout || `Failed to run Python snippet with ${python.command}`);
  }

  return JSON.parse(String(result.stdout || '{}'));
};

const main = () => {
  const checks = [];
  const warnings = [];
  const errors = [];

  const python = resolvePython();
  checks.push({
    label: 'Python interpreter',
    ok: Boolean(python),
    detail: python ? `${python.command} ${python.prefixArgs.join(' ')}`.trim() : 'No Python interpreter found',
  });

  const youtubeBridgePath = path.join(PROJECT_ROOT, 'scripts', 'youtube_analysis_bridge.py');
  const gameplayBridgePath = path.join(PROJECT_ROOT, 'scripts', 'gameplay_analysis_bridge.py');
  checks.push({
    label: 'YouTube analysis bridge',
    ok: fs.existsSync(youtubeBridgePath),
    detail: youtubeBridgePath,
  });
  checks.push({
    label: 'Gameplay analysis bridge',
    ok: fs.existsSync(gameplayBridgePath),
    detail: gameplayBridgePath,
  });

  if (!python) {
    errors.push('Python interpreter is missing.');
  } else {
    const moduleChecks = runPythonSnippet(
      python,
      `
import importlib.util
import json
import sys

def has_module(name):
    return importlib.util.find_spec(name) is not None

payload = {
    "pythonExecutable": sys.executable,
    "checks": [
        {"module": "yt_dlp", "package": "yt-dlp", "ok": has_module("yt_dlp"), "required": True},
        {"module": "cv2", "package": "opencv-python", "ok": has_module("cv2"), "required": True},
        {"module": "easyocr", "package": "easyocr", "ok": has_module("easyocr"), "required": True},
        {"module": "faster_whisper", "package": "faster-whisper", "ok": has_module("faster_whisper"), "required": True},
        {"module": "scenedetect", "package": "scenedetect[opencv]", "ok": has_module("scenedetect"), "required": True},
        {"module": "whisper", "package": "openai-whisper", "ok": has_module("whisper"), "required": False},
    ],
}
print(json.dumps(payload))
      `.trim(),
    );

    checks.push({
      label: 'Python executable',
      ok: true,
      detail: moduleChecks.pythonExecutable,
    });

    for (const moduleCheck of moduleChecks.checks) {
      checks.push({
        label: `Python module: ${moduleCheck.package}`,
        ok: Boolean(moduleCheck.ok),
        detail: moduleCheck.module,
      });
      if (!moduleCheck.ok && moduleCheck.required) {
        errors.push(`Missing Python package: ${moduleCheck.package}`);
      }
      if (!moduleCheck.ok && !moduleCheck.required) {
        warnings.push(`Optional fallback package is missing: ${moduleCheck.package}`);
      }
    }
  }

  try {
    const ffmpegPath = resolveFfmpegPath();
    checks.push({ label: 'ffmpeg', ok: true, detail: ffmpegPath });
  } catch (error) {
    checks.push({ label: 'ffmpeg', ok: false, detail: String(error.message ?? error) });
    errors.push('ffmpeg could not be resolved.');
  }

  try {
    const ffprobePath = resolveFfprobePath();
    checks.push({ label: 'ffprobe', ok: true, detail: ffprobePath });
  } catch (error) {
    checks.push({ label: 'ffprobe', ok: false, detail: String(error.message ?? error) });
    errors.push('ffprobe could not be resolved.');
  }

  if (!fs.existsSync(youtubeBridgePath)) {
    errors.push(`Missing file: ${youtubeBridgePath}`);
  }
  if (!fs.existsSync(gameplayBridgePath)) {
    errors.push(`Missing file: ${gameplayBridgePath}`);
  }

  const payload = {
    ok: errors.length === 0,
    status: errors.length > 0 ? 'error' : warnings.length > 0 ? 'warning' : 'pass',
    checks,
    warnings,
    errors,
  };

  if (JSON_OUTPUT) {
    process.stdout.write(`${JSON.stringify(payload, null, 2)}\n`);
  } else {
    console.log('Analysis doctor');
    console.log('');
    for (const check of checks) {
      console.log(`${check.ok ? '[OK]' : '[MISSING]'} ${check.label}: ${check.detail}`);
    }
    if (warnings.length > 0) {
      console.log('');
      console.log('Warnings:');
      warnings.forEach((warning) => console.log(`- ${warning}`));
    }
    if (errors.length > 0) {
      console.log('');
      console.log('Errors:');
      errors.forEach((error) => console.log(`- ${error}`));
      console.log('');
      console.log('Suggested fix: npm run setup:full');
    }
  }

  process.exit(payload.ok ? 0 : 1);
};

main();
