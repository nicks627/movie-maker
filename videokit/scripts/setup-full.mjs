import fs from 'node:fs';
import path from 'node:path';
import process from 'node:process';
import { spawnSync } from 'node:child_process';
import { loadLocalEnv } from './env-utils.mjs';

loadLocalEnv();

const PROJECT_ROOT = process.cwd();
const IS_WINDOWS = process.platform === 'win32';
const IS_MAC = process.platform === 'darwin';
const DRY_RUN = process.argv.includes('--dry-run');
const VOICEVOX_VERSION = '0.16.4';
const DIRECTORIES = [
  'projects',
  'inputs/gameplay',
  'inputs/materials',
  'inputs/scripts',
  'public/assets/images',
  'public/assets/stock',
  'public/assets/imported',
  'public/assets/bgm',
  'public/assets/se',
  'public/assets/video',
  'public/voices',
  'vendor',
  'tools',
];

const logStep = (message) => {
  console.log(`[setup:full] ${message}`);
};

const runCommand = ({ command, args = [], cwd = PROJECT_ROOT, optional = false }) => {
  const rendered = [command, ...args].join(' ');
  logStep(rendered);

  if (DRY_RUN) {
    return { status: 0, stdout: '', stderr: '' };
  }

  const result = spawnSync(command, args, {
    cwd,
    encoding: 'utf8',
    stdio: 'inherit',
    windowsHide: true,
  });

  if (!optional && (result.error || result.status !== 0)) {
    const detail = result.error ? String(result.error) : `Exit code ${result.status}`;
    throw new Error(`Command failed: ${rendered}\n${detail}`);
  }

  return result;
};

const commandExists = (command, args = ['--version']) => {
  const result = spawnSync(command, args, {
    cwd: PROJECT_ROOT,
    encoding: 'utf8',
    stdio: 'ignore',
    windowsHide: true,
  });
  return result.status === 0;
};

const pickSystemPython = () => {
  const candidates = IS_WINDOWS
    ? [
        { command: 'py', args: ['-3.11', '--version'] },
        { command: 'python', args: ['--version'] },
      ]
    : [
        { command: 'python3.11', args: ['--version'] },
        { command: 'python3', args: ['--version'] },
        { command: 'python', args: ['--version'] },
      ];

  const found = candidates.find((candidate) => commandExists(candidate.command, candidate.args));
  if (!found) {
    throw new Error(
      IS_WINDOWS
        ? 'Python 3.11 was not found. Install Python 3.11 before running setup:full.'
        : 'python3.11 or python3 was not found. Install Python 3.11 before running setup:full.',
    );
  }

  return found.command;
};

const resolveVenvPython = () =>
  IS_WINDOWS
    ? path.join(PROJECT_ROOT, '.venv', 'Scripts', 'python.exe')
    : path.join(PROJECT_ROOT, '.venv', 'bin', 'python3');

const resolveVoicevoxDownloaderPath = () =>
  path.join(PROJECT_ROOT, 'tools', IS_WINDOWS ? 'voicevox_core_downloader.exe' : 'voicevox_core_downloader');

const voicevoxWheelUrl = () => {
  if (IS_WINDOWS) {
    return `https://github.com/VOICEVOX/voicevox_core/releases/download/${VOICEVOX_VERSION}/voicevox_core-${VOICEVOX_VERSION}-cp310-abi3-win_amd64.whl`;
  }

  if (IS_MAC) {
    if (process.arch === 'arm64') {
      return `https://github.com/VOICEVOX/voicevox_core/releases/download/${VOICEVOX_VERSION}/voicevox_core-${VOICEVOX_VERSION}-cp310-abi3-macosx_11_0_arm64.whl`;
    }
    return `https://github.com/VOICEVOX/voicevox_core/releases/download/${VOICEVOX_VERSION}/voicevox_core-${VOICEVOX_VERSION}-cp310-abi3-macosx_10_12_x86_64.whl`;
  }

  if (process.arch === 'arm64') {
    return `https://github.com/VOICEVOX/voicevox_core/releases/download/${VOICEVOX_VERSION}/voicevox_core-${VOICEVOX_VERSION}-cp310-abi3-manylinux_2_34_aarch64.whl`;
  }

  return `https://github.com/VOICEVOX/voicevox_core/releases/download/${VOICEVOX_VERSION}/voicevox_core-${VOICEVOX_VERSION}-cp310-abi3-manylinux_2_34_x86_64.whl`;
};

const voicevoxDownloaderUrl = () => {
  if (IS_WINDOWS) {
    return `https://github.com/VOICEVOX/voicevox_core/releases/download/${VOICEVOX_VERSION}/download-windows-x64.exe`;
  }

  if (IS_MAC) {
    return `https://github.com/VOICEVOX/voicevox_core/releases/download/${VOICEVOX_VERSION}/${process.arch === 'arm64' ? 'download-osx-arm64' : 'download-osx-x64'}`;
  }

  return `https://github.com/VOICEVOX/voicevox_core/releases/download/${VOICEVOX_VERSION}/${process.arch === 'arm64' ? 'download-linux-arm64' : 'download-linux-x64'}`;
};

const ensureDirectories = () => {
  DIRECTORIES.forEach((directory) => {
    fs.mkdirSync(path.join(PROJECT_ROOT, directory), { recursive: true });
  });
};

const ensureEnvLocal = () => {
  const envExample = path.join(PROJECT_ROOT, '.env.example');
  const envLocal = path.join(PROJECT_ROOT, '.env.local');
  if (fs.existsSync(envExample) && !fs.existsSync(envLocal)) {
    logStep('Copying .env.example to .env.local');
    if (!DRY_RUN) {
      fs.copyFileSync(envExample, envLocal);
    }
  }
};

const downloadFile = async (url, destinationPath, executable = false) => {
  logStep(`download ${url} -> ${destinationPath}`);
  if (DRY_RUN) {
    return;
  }

  const response = await fetch(url);
  if (!response.ok) {
    throw new Error(`Failed to download ${url}: HTTP ${response.status}`);
  }

  const arrayBuffer = await response.arrayBuffer();
  fs.mkdirSync(path.dirname(destinationPath), { recursive: true });
  fs.writeFileSync(destinationPath, Buffer.from(arrayBuffer));
  if (executable && !IS_WINDOWS) {
    fs.chmodSync(destinationPath, 0o755);
  }
};

const ensureWindowsBaseSetup = () => {
  runCommand({
    command: 'powershell',
    args: ['-ExecutionPolicy', 'Bypass', '-File', '.\\scripts\\bootstrap-local.ps1'],
  });
};

const ensureNonWindowsBaseSetup = () => {
  runCommand({ command: 'npm', args: ['install', '--legacy-peer-deps'] });

  const systemPython = pickSystemPython();
  const venvPython = resolveVenvPython();
  if (!fs.existsSync(venvPython)) {
    runCommand({ command: systemPython, args: ['-m', 'venv', '.venv'] });
  } else {
    logStep(`Existing virtual environment found: ${venvPython}`);
  }

  runCommand({ command: venvPython, args: ['-m', 'pip', 'install', '--upgrade', 'pip'] });
  runCommand({
    command: venvPython,
    args: ['-m', 'pip', 'install', 'pykakasi', voicevoxWheelUrl()],
  });

  const downloaderPath = resolveVoicevoxDownloaderPath();
  const voicevoxRoot = path.join(PROJECT_ROOT, 'vendor', 'voicevox_core');
  const runtimeMarker = path.join(
    voicevoxRoot,
    'onnxruntime',
    'lib',
    IS_MAC ? 'libvoicevox_onnxruntime.dylib' : 'libvoicevox_onnxruntime.so',
  );
  const dictMarker = path.join(voicevoxRoot, 'dict', 'open_jtalk_dic_utf_8-1.11');
  const modelsMarker = path.join(voicevoxRoot, 'models', 'vvms');

  if (!fs.existsSync(downloaderPath)) {
    return downloadFile(voicevoxDownloaderUrl(), downloaderPath, true).then(() => {
      if (!fs.existsSync(runtimeMarker)) {
        runCommand({
          command: downloaderPath,
          args: ['--only', 'onnxruntime', '--output', voicevoxRoot],
        });
      }
      if (!fs.existsSync(dictMarker) || !fs.existsSync(modelsMarker)) {
        runCommand({
          command: downloaderPath,
          args: ['--only', 'models', 'dict', '--output', voicevoxRoot, '--models-pattern', '[0-9]*.vvm'],
        });
      }
    });
  }

  if (!fs.existsSync(runtimeMarker)) {
    runCommand({
      command: downloaderPath,
      args: ['--only', 'onnxruntime', '--output', voicevoxRoot],
    });
  }
  if (!fs.existsSync(dictMarker) || !fs.existsSync(modelsMarker)) {
    runCommand({
      command: downloaderPath,
      args: ['--only', 'models', 'dict', '--output', voicevoxRoot, '--models-pattern', '[0-9]*.vvm'],
    });
  }

  return Promise.resolve();
};

const installAnalysisDependencies = () => {
  const python = resolveVenvPython();
  runCommand({
    command: python,
    args: [
      '-m',
      'pip',
      'install',
      'yt-dlp',
      'opencv-python',
      'easyocr',
      'faster-whisper',
      'scenedetect[opencv]',
    ],
  });
};

const runDoctors = () => {
  runCommand({ command: 'node', args: ['setup.mjs'] });
  runCommand({ command: 'node', args: ['scripts/doctor-analysis.mjs'] });
  runCommand({ command: 'node', args: ['scripts/doctor-assets.mjs'] });
};

const main = async () => {
  ensureDirectories();
  ensureEnvLocal();

  if (IS_WINDOWS) {
    ensureWindowsBaseSetup();
  } else {
    await ensureNonWindowsBaseSetup();
  }

  installAnalysisDependencies();
  runDoctors();

  logStep('Setup complete.');
  logStep('Suggested next steps:');
  logStep('  npm run new:project -- --template explainer --output src/data/script-explainer-starter.json --project-id starter-explainer');
  logStep('  npm run dev:ui');
};

main().catch((error) => {
  console.error(error.message);
  process.exit(1);
});
