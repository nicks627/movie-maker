param(
  [switch]$SkipNpmInstall,
  [switch]$SkipPython,
  [switch]$SkipVoicevoxAssets
)

$ErrorActionPreference = "Stop"

function Write-Step {
  param([string]$Message)
  Write-Host "[videokit] $Message" -ForegroundColor Cyan
}

function Invoke-Checked {
  param(
    [string]$Command,
    [string[]]$Arguments = @(),
    [string]$WorkingDirectory
  )

  Write-Step "$Command $($Arguments -join ' ')"
  Push-Location $WorkingDirectory
  try {
    & $Command @Arguments
    if ($LASTEXITCODE -ne 0) {
      throw "Command failed with exit code $LASTEXITCODE"
    }
  } finally {
    Pop-Location
  }
}

$ProjectRoot = Split-Path -Parent $PSScriptRoot
$VenvPython = Join-Path $ProjectRoot ".venv\Scripts\python.exe"
$VoicevoxRoot = Join-Path $ProjectRoot "vendor\voicevox_core"
$VoicevoxDownloader = Join-Path $ProjectRoot "tools\voicevox_core_downloader.exe"
$EnvExample = Join-Path $ProjectRoot ".env.example"
$EnvLocal = Join-Path $ProjectRoot ".env.local"

Write-Step "Project root: $ProjectRoot"

$Directories = @(
  "projects",
  "public\assets\images",
  "public\assets\stock",
  "public\assets\bgm",
  "public\voices",
  "vendor",
  "tools"
)

foreach ($Directory in $Directories) {
  $PathToCreate = Join-Path $ProjectRoot $Directory
  if (-not (Test-Path $PathToCreate)) {
    New-Item -ItemType Directory -Force -Path $PathToCreate | Out-Null
  }
}

if ((Test-Path $EnvExample) -and -not (Test-Path $EnvLocal)) {
  Copy-Item $EnvExample $EnvLocal
  Write-Step "Created .env.local from .env.example"
}

if (-not $SkipNpmInstall) {
  Invoke-Checked -Command "npm" -Arguments @("install", "--legacy-peer-deps") -WorkingDirectory $ProjectRoot
}

if (-not $SkipPython) {
  if (-not (Test-Path $VenvPython)) {
    Invoke-Checked -Command "py" -Arguments @("-3.11", "-m", "venv", ".venv") -WorkingDirectory $ProjectRoot
  } else {
    Write-Step "Existing Python virtual environment found."
  }

  Invoke-Checked -Command $VenvPython -Arguments @("-m", "pip", "install", "--upgrade", "pip") -WorkingDirectory $ProjectRoot
  Invoke-Checked -Command $VenvPython -Arguments @("-m", "pip", "install", "pykakasi") -WorkingDirectory $ProjectRoot
  Invoke-Checked -Command $VenvPython -Arguments @("-m", "pip", "install", "https://github.com/VOICEVOX/voicevox_core/releases/download/0.16.4/voicevox_core-0.16.4-cp310-abi3-win_amd64.whl") -WorkingDirectory $ProjectRoot
}

if (-not $SkipVoicevoxAssets) {
  if (-not (Test-Path $VoicevoxDownloader)) {
    Write-Step "Downloading VOICEVOX Core downloader"
    Invoke-WebRequest -Uri "https://github.com/VOICEVOX/voicevox_core/releases/download/0.16.4/download-windows-x64.exe" -OutFile $VoicevoxDownloader
  }

  $RuntimeDll = Join-Path $VoicevoxRoot "onnxruntime\lib\voicevox_onnxruntime.dll"
  $DictDir = Join-Path $VoicevoxRoot "dict\open_jtalk_dic_utf_8-1.11"
  $ModelsDir = Join-Path $VoicevoxRoot "models\vvms"

  if (-not (Test-Path $RuntimeDll)) {
    Write-Step "Downloading VOICEVOX runtime"
    cmd /c "echo y| `"$VoicevoxDownloader`" --only onnxruntime --output `"$VoicevoxRoot`""
    if ($LASTEXITCODE -ne 0) {
      throw "VOICEVOX runtime download failed"
    }
  } else {
    Write-Step "VOICEVOX runtime already exists."
  }

  if (-not (Test-Path $DictDir) -or -not (Test-Path $ModelsDir)) {
    Write-Step "Downloading VOICEVOX models and dictionary"
    cmd /c "echo y| `"$VoicevoxDownloader`" --only models dict --output `"$VoicevoxRoot`" --models-pattern [0-9]*.vvm"
    if ($LASTEXITCODE -ne 0) {
      throw "VOICEVOX model/dictionary download failed"
    }
  } else {
    Write-Step "VOICEVOX dictionary and models already exist."
  }
}

Write-Step "Bootstrap complete."
Write-Host ""
Write-Host "Suggested next commands:" -ForegroundColor Green
Write-Host "  cd $ProjectRoot"
Write-Host "  npm run setup"
Write-Host "  npm run dev:ui"
