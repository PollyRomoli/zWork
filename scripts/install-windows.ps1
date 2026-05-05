$ErrorActionPreference = "Stop"
$REPO = if ($env:ZWORK_REPO) { $env:ZWORK_REPO } else { "Ryz3nPlayZ/zWork" }
$ARCH = "x86_64"
$ASSET = "zWork-windows-${ARCH}-setup.exe"
$URL = "https://github.com/$REPO/releases/latest/download/$ASSET"

$downloadPath = "$env:TEMP\$ASSET"
Write-Host "Downloading $ASSET..."
Invoke-WebRequest -Uri $URL -OutFile $downloadPath
Write-Host "Downloaded to $downloadPath"
Write-Host "Closing any running zWork processes before install..."
Get-Process -ErrorAction SilentlyContinue |
    Where-Object { $_.ProcessName -match '^zwork(-backend)?$' } |
    Stop-Process -Force -ErrorAction SilentlyContinue
Write-Host "Running installer..."
Start-Process $downloadPath -Wait
