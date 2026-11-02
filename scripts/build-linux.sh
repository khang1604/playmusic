#!/usr/bin/env bash
# ==============================================================================
# PlayMusic Studio - Local Linux (.deb & .AppImage) Build Script
# ==============================================================================
set -euo pipefail

echo "============================================================"
echo " Building PlayMusic Studio for Ubuntu Linux"
echo "============================================================"

PROJECT_ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$PROJECT_ROOT"

echo "[1/3] Checking Node.js & npm..."
if ! command -v npm &> /dev/null; then
  echo "[!] npm not found. Installing nodejs and npm via apt..."
  if [ "$EUID" -eq 0 ]; then
    apt-get update && apt-get install -y nodejs npm
  else
    sudo apt-get update && sudo apt-get install -y nodejs npm
  fi
fi

echo "[2/3] Building Frontend Web Bundle..."
cd "$PROJECT_ROOT/frontend"
npm install
npm run build

echo "[3/3] Building Tauri Native Desktop Application..."
cd "$PROJECT_ROOT"

# Check if cargo is installed
if ! command -v cargo &> /dev/null; then
  echo "[!] Rust / Cargo not found. Installing via rustup..."
  curl --proto '=https' --tlsv1.2 -sSf https://sh.rustup.rs | sh -s -- -y
  source "$HOME/.cargo/env"
fi

# Check if tauri-cli is installed
if ! cargo tauri --version &> /dev/null; then
  echo "[!] Installing Tauri CLI..."
  cargo install tauri-cli --version "^2.0.0" --locked
fi

# Build packages (.deb, .AppImage)
cargo tauri build --ignore-version-mismatches || cargo tauri build

echo "============================================================"
echo " [SUCCESS] Linux Build Artifacts Generated:"
echo " .deb Package: target/release/bundle/deb/"
echo " AppImage:     target/release/bundle/appimage/"
echo "============================================================"
