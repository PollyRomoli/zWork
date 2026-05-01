#!/usr/bin/env bash
set -euo pipefail

REPO="${ZWORK_REPO:-Ryz3nPlayZ/zWork}"
VERSION="${ZWORK_VERSION:-latest}"

echo "Installing zWork for macOS..."

# Detect architecture
ARCH="$(uname -m)"
case "$ARCH" in
  x86_64) ARCH="x86_64" ;;
  arm64|aarch64) ARCH="aarch64" ;;
  *)
    echo "unsupported architecture: $ARCH" >&2
    exit 1
    ;;
esac

# Prefer the universal .tar.gz for cleaner install via curl
ASSET_URL="https://github.com/${REPO}/releases/${VERSION}/download/zWork-macos-universal.app.tar.gz"

tmp_dir="$(mktemp -d)"
trap 'rm -rf "$tmp_dir"' EXIT

download_path="$tmp_dir/zWork.app.tar.gz"

echo "Downloading from: $ASSET_URL"
if ! curl -fL "$ASSET_URL" -o "$download_path"; then
  echo "Failed to download zWork" >&2
  exit 1
fi

echo "Extracting..."
mkdir -p "$tmp_dir/extract"
tar -xzf "$download_path" -C "$tmp_dir/extract"

app_name="zWork.app"
source_app="$tmp_dir/extract/$app_name"
dest_app="/Applications/$app_name"

if [[ ! -d "$source_app" ]]; then
  echo "Could not find $app_name in downloaded archive" >&2
  exit 1
fi

# Remove existing installation
if [[ -d "$dest_app" ]]; then
  echo "Removing existing installation..."
  rm -rf "$dest_app"
fi

# Copy to Applications
echo "Installing to /Applications..."
cp -R "$source_app" "$dest_app"

# Remove quarantine attribute (bypasses GateKeeper)
xattr -dr com.apple.quarantine "$dest_app" 2>/dev/null || true

echo ""
echo "✓ zWork installed successfully!"
echo "  Open it from: /Applications/zWork.app"
echo "  Or launch with: open /Applications/zWork.app"
