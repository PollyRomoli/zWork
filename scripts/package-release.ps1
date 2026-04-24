param(
    [string]$Platform = "",
    [string]$HostTriple = ""
)
$ErrorActionPreference = "Stop"
$ROOT_DIR = Resolve-Path (Join-Path $PSScriptRoot "..")
Set-Location $ROOT_DIR

if (-not $Platform) {
    Write-Error "usage: package-release.ps1 windows [host-triple]"
    exit 1
}

if (-not $HostTriple) {
    $HostTriple = ((rustc -vV | Select-String 'host:').Line.Split(' ')[1])
}
$ARCH = $HostTriple.Split('-')[0]
$DIST_DIR = "$ROOT_DIR\dist"
New-Item -ItemType Directory -Force -Path $DIST_DIR | Out-Null

switch ($Platform) {
    "windows" {
        $BUNDLE_DIR = "$ROOT_DIR\app\src-tauri\target\release\bundle\nsis"
        $src = Get-ChildItem "$BUNDLE_DIR\*_x64-setup.exe" -ErrorAction SilentlyContinue | Select-Object -First 1
        $out = "$DIST_DIR\zWork-windows-$ARCH-setup.exe"
    }
    default {
        Write-Error "unknown platform: $Platform"
        exit 1
    }
}

if (-not $src -or -not (Test-Path $src.FullName)) {
    Write-Error "bundle asset not found under $BUNDLE_DIR"
    exit 1
}
Copy-Item $src.FullName $out
Write-Host $out
