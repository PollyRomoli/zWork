$ErrorActionPreference = "Stop"
$ROOT_DIR = Resolve-Path (Join-Path $PSScriptRoot "..")
Set-Location $ROOT_DIR

Remove-Item -Recurse -Force "$ROOT_DIR\dist" -ErrorAction SilentlyContinue

& "$ROOT_DIR\scripts\build-backend.ps1"

Set-Location "$ROOT_DIR\app"
npx tauri build --bundles nsis

& "$ROOT_DIR\scripts\package-release.ps1" windows
