#!/usr/bin/env bash
# ==============================================================================
# PlayMusic Studio - Launch Native Desktop Application in Development Mode
# Opens the real native Linux desktop window with instant hot-reload
# ==============================================================================
set -euo pipefail

PROJECT_ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$PROJECT_ROOT"

echo "============================================================"
echo " Launching PlayMusic Studio Native Desktop Window..."
echo "============================================================"

# Ensure cargo is in PATH
if [ -f "$HOME/.cargo/env" ]; then
  source "$HOME/.cargo/env"
fi

cargo tauri dev
