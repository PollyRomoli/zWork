$ErrorActionPreference = "Stop"
$REPO = if ($env:ZWORK_REPO) { $env:ZWORK_REPO } else { "Ryz3nPlayZ/zWork" }
$ARCH = "x86_64"
$ASSET = "zWork-windows-${ARCH}-setup.exe"

$release = Invoke-RestMethod -Uri "https://api.github.com/repos/$REPO/releases/latest"
$asset = $release.assets | Where-Object { $_.name -eq $ASSET } | Select-Object -First 1

if (-not $asset) {
    Write-Error "Asset not found: $ASSET"
    exit 1
}

$downloadPath = "$env:TEMP\$ASSET"
Write-Host "Downloading $($asset.name)..."
Invoke-WebRequest -Uri $asset.browser_download_url -OutFile $downloadPath
Write-Host "Downloaded to $downloadPath"
Write-Host "Running installer..."
Start-Process $downloadPath
