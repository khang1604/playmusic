#!/usr/bin/env bash
# ==============================================================================
# PlayMusic Studio - Ubuntu 24.04 / 26.04 LTS System Setup & Dependency Script
# ==============================================================================
set -euo pipefail

echo "============================================================"
echo " PlayMusic Studio - Ubuntu Environment Setup"
echo "============================================================"

# Check for root / sudo
if [ "$EUID" -ne 0 ]; then
  echo "[!] Please run with sudo: sudo bash scripts/setup-ubuntu.sh"
  exit 1
fi

REAL_USER="${SUDO_USER:-$USER}"
USER_HOME=$(getent passwd "$REAL_USER" | cut -d: -f6)

echo "[*] Updating Ubuntu package lists..."
apt-get update -y

echo "[*] Installing required audio, graphical & system libraries..."
apt-get install -y \
  build-essential \
  curl \
  wget \
  file \
  libssl-dev \
  libasound2-dev \
  libasound2 \
  pipewire-audio \
  pipewire-pulse \
  libwebkit2gtk-4.1-dev \
  libwebkit2gtk-4.1-0 \
  libjavascriptcoregtk-4.1-dev \
  libjavascriptcoregtk-4.1-0 \
  libgtk-3-dev \
  libayatana-appindicator3-dev \
  librsvg2-dev \
  libfuse2t64 \
  fuse3

echo "[*] Ensuring user '${REAL_USER}' is in the 'audio' group..."
usermod -aG audio "$REAL_USER" || true

# Register Desktop Entry if .desktop exists
DESKTOP_SRC="$(dirname "$0")/playmusic.desktop"
if [ -f "$DESKTOP_SRC" ]; then
  echo "[*] Installing desktop shortcut..."
  cp "$DESKTOP_SRC" /usr/share/applications/
  chmod +x /usr/share/applications/playmusic.desktop
  update-desktop-database || true

  # Copy to user Desktop if exists
  if [ -d "${USER_HOME}/Desktop" ]; then
    cp "$DESKTOP_SRC" "${USER_HOME}/Desktop/"
    chown "${REAL_USER}:${REAL_USER}" "${USER_HOME}/Desktop/playmusic.desktop"
    chmod +x "${USER_HOME}/Desktop/playmusic.desktop"
    # Allow launching on GNOME
    sudo -u "$REAL_USER" gio set "${USER_HOME}/Desktop/playmusic.desktop" metadata::trusted true 2>/dev/null || true
  fi
fi

echo "============================================================"
echo " [SUCCESS] Ubuntu setup completed successfully!"
echo " You can now install PlayMusic via: sudo apt install ./playmusic.deb"
echo " Or run the AppImage: chmod +x playmusic.AppImage && ./playmusic.AppImage"
echo "============================================================"
