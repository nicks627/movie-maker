import fs from 'node:fs';
import path from 'node:path';
import process from 'node:process';
import { loadLocalEnv, resolveCommandOrPath, isPathLike } from './scripts/env-utils.mjs';

loadLocalEnv();

const projectRoot = process.cwd();
const isWindows = process.platform === 'win32';
const defaultPythonCandidates = isWindows
  ? [path.join(projectRoot, '.venv', 'Scripts', 'python.exe')]
  : [
      path.join(projectRoot, '.venv', 'bin', 'python3'),
      path.join(projectRoot, '.venv', 'bin', 'python'),
    ];
const configuredPython = resolveCommandOrPath(process.env.PYTHON_BIN, projectRoot);
const defaultPython =
  defaultPythonCandidates.find((candidate) => fs.existsSync(candidate)) ?? defaultPythonCandidates[0];
const pythonBinary = configuredPython ?? defaultPython;
const voicevoxRoot =
  resolveCommandOrPath(process.env.VOICEVOX_CORE_ROOT, projectRoot) ??
  path.join(projectRoot, 'vendor', 'voicevox_core');
const voicevoxRuntimeDirectory = path.join(voicevoxRoot, 'onnxruntime', 'lib');
const voicevoxRuntimeCandidates = [
  path.join(voicevoxRuntimeDirectory, 'voicevox_onnxruntime.dll'),
  path.join(voicevoxRuntimeDirectory, 'libvoicevox_onnxruntime.dylib'),
  path.join(voicevoxRuntimeDirectory, 'libvoicevox_onnxruntime.so'),
  path.join(voicevoxRuntimeDirectory, 'voicevox_onnxruntime.so'),
];
const voicevoxRuntime =
  voicevoxRuntimeCandidates.find((candidate) => fs.existsSync(candidate)) ?? voicevoxRuntimeCandidates[0];

const requiredDirectories = [
  path.join(projectRoot, 'projects'),
  path.join(projectRoot, 'public', 'assets', 'images'),
  path.join(projectRoot, 'public', 'assets', 'stock'),
  path.join(projectRoot, 'public', 'assets', 'bgm'),
  path.join(projectRoot, 'public', 'voices'),
  path.join(projectRoot, 'vendor'),
  path.join(projectRoot, 'tools'),
];

const statusChecks = [
  {
    label: 'package.json',
    ok: fs.existsSync(path.join(projectRoot, 'package.json')),
    detail: path.join(projectRoot, 'package.json'),
  },
  {
    label: 'Node modules',
    ok: fs.existsSync(path.join(projectRoot, 'node_modules')),
    detail: path.join(projectRoot, 'node_modules'),
  },
  {
    label: 'Python binary',
    ok: isPathLike(pythonBinary) ? fs.existsSync(pythonBinary) : true,
    detail: pythonBinary,
  },
  {
    label: 'VOICEVOX runtime',
    ok: fs.existsSync(voicevoxRuntime),
    detail: voicevoxRuntime,
  },
  {
    label: 'VOICEVOX dictionary',
    ok: fs.existsSync(path.join(voicevoxRoot, 'dict', 'open_jtalk_dic_utf_8-1.11')),
    detail: path.join(voicevoxRoot, 'dict', 'open_jtalk_dic_utf_8-1.11'),
  },
  {
    label: 'VOICEVOX models',
    ok: fs.existsSync(path.join(voicevoxRoot, 'models', 'vvms')),
    detail: path.join(voicevoxRoot, 'models', 'vvms'),
  },
];

for (const directory of requiredDirectories) {
  fs.mkdirSync(directory, { recursive: true });
}

console.log('VideoKit setup check');
console.log(`Project root: ${projectRoot}`);
console.log('');

for (const check of statusChecks) {
  console.log(`${check.ok ? '[OK]' : '[MISSING]'} ${check.label}: ${check.detail}`);
}

const missingChecks = statusChecks.filter((check) => !check.ok);

console.log('');
if (missingChecks.length === 0) {
  console.log('Environment looks ready.');
  console.log('Next: npm run dev:ui');
} else {
  console.log('Missing pieces detected.');
  if (isWindows) {
    console.log('Recommended next step on Windows:');
    console.log('  powershell -ExecutionPolicy Bypass -File .\\scripts\\bootstrap-local.ps1');
  } else {
    console.log('Recommended next step on macOS/Linux:');
    console.log('  Follow the manual setup steps in README.md for Python and VOICEVOX Core.');
  }
  console.log('');
  console.log('Optional local overrides: .env.local');
}
