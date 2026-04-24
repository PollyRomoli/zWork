$ErrorActionPreference = "Stop"
$REPO = if ($env:ZWORK_REPO) { $env:ZWORK_REPO } else { "Ryz3nPlayZ/zWork" }
$ARCH = "x86_64"
$ASSET = "zWork-windows-${ARCH}-setup.exe"
$URL = "https://github.com/$REPO/releases/latest/download/$ASSET"

$downloadPath = "$env:TEMP\$ASSET"
Write-Host "Downloading $ASSET..."
Invoke-WebRequest -Uri $URL -OutFile $downloadPath
Write-Host "Downloaded to $downloadPath"
Write-Host "Running installer..."
Start-Process $downloadPath -Wait
