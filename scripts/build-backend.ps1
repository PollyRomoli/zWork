$ErrorActionPreference = "Stop"
$ROOT_DIR = Resolve-Path (Join-Path $PSScriptRoot "..")
Set-Location $ROOT_DIR

if (-not (Test-Path "$ROOT_DIR\.venv")) {
    python -m venv "$ROOT_DIR\.venv"
}

& "$ROOT_DIR\.venv\Scripts\Activate.ps1"
pip install -q -e .
pip install -q pyinstaller

$HOST_TRIPLE = if ($args[0]) { $args[0] } else { ((rustc -vV | Select-String 'host:').Line.Split(' ')[1]) }
$RELEASE_DIR = "$ROOT_DIR\.release"
$DIST_DIR = "$RELEASE_DIR\backend"
$WORK_DIR = "$RELEASE_DIR\pyinstaller-work"
$SPEC_DIR = "$RELEASE_DIR\pyinstaller-spec"
$STAGE_DIR = "$ROOT_DIR\app\src-tauri\binaries"

New-Item -ItemType Directory -Force -Path $DIST_DIR, $WORK_DIR, $SPEC_DIR, $STAGE_DIR | Out-Null

pyinstaller --noconfirm --clean --onefile `
    --name zwork-backend `
    --add-data "$ROOT_DIR\zWork-Skills;zWork-Skills" `
    --distpath $DIST_DIR `
    --workpath $WORK_DIR `
    --specpath $SPEC_DIR `
    sidecar\server.py

Copy-Item "$DIST_DIR\zwork-backend.exe" "$STAGE_DIR\zwork-backend-$HOST_TRIPLE.exe"
Write-Host "Backend staged at $STAGE_DIR\zwork-backend-$HOST_TRIPLE.exe"
