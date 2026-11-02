# PlayMusic Studio

> **Ultra-Low Latency, Multi-Track Audio Cue & Polyphonic Soundboard Workstation for Ubuntu Linux**

PlayMusic Studio is an open-source, high-performance audio workstation engineered for stage technicians, conference soundboards, theaters, live events, and DJs running on Ubuntu (24.04 / 26.04 LTS).

Unlike conventional media players (e.g., Windows Media Player) that restrict users to a single track with slow file navigation, PlayMusic Studio provides **30 simultaneous deck slots** in a 5x6 Launchpad Grid layout with sub-millisecond audio cue triggering, direct keyboard shortcuts, and dedicated per-track controls.

---

## 🌟 Key Features

- **30 Polyphonic Decks (5x6 Grid)**: Trigger multiple audio tracks concurrently (e.g., background ambience + awards fanfare + applause SFX).
- **Direct Keyboard Shortcuts**: Default mappings (`1-0`, `Q-P`, `A-L`), fully customizable per slot.
- **Individual Mute Button**: Mute any deck instantly with one click or key without interrupting the playback timeline.
- **Loop vs One-Shot Toggle**: Switch seamlessly between indefinite background loop and single-shot cue.
- **Numerical Cue-In Point**: Specify exact start offset (e.g., `00:04.5s`) to bypass silent intros and hit the climax instantly.
- **Custom Labels & 8 Stage Colors**: Color-code tracks (MC In, Fanfare, Ambience, Alert, SFX) for instant visual recognition in dark backstage sound booths.
- **Master Console**:
  - Global Master Volume fader.
  - **Panic Mute All (Spacebar / Esc)**: Instant emergency silence for speeches or sudden stage interruptions.
  - Smooth Fade-Out slider (0.5s - 5.0s) for natural track endings.
  - Active tracks real-time counter (`0/30 Active`).
- **Show Preset Management**: Save and load complete event setups as `.json` presets.
- **Universal Audio Support**: `.mp3`, `.wav`, `.ogg`, `.flac`, `.m4a` preloaded into memory for <5ms trigger latency.

---

## 🪟 Installation & Building on Windows

### Option 1: Run Installer (.exe or .msi)
Download the latest `PlayMusic_x64-setup.exe` or `PlayMusic_x64.msi` from GitHub Releases and click install.

### Option 2: Build from Source on Windows
Double-click `scripts\build-windows.bat` or run:
```powershell
.\scripts\build-windows.bat
```
The installer will be generated in `src-tauri\target\release\bundle\nsis\`.

---

## 🚀 Installation on Ubuntu Linux

### Option 1: Official Debian Package (`.deb`)

```bash
# 1. Run system setup script (installs WebKitGTK & audio dependencies)
sudo bash scripts/setup-ubuntu.sh

# 2. Install PlayMusic .deb package
sudo apt install ./playmusic_amd64.deb
```
PlayMusic will appear in your Ubuntu App Launcher with full desktop shortcut integration.

---

### Option 2: Portable AppImage (No installation required)

Perfect for plugging in a USB drive at live events:

```bash
chmod +x playmusic_amd64.AppImage
./playmusic_amd64.AppImage
```

---

## 🛠️ Development & Building from Source

### Prerequisites on Ubuntu
```bash
sudo bash scripts/setup-ubuntu.sh
```

### Run in Development Mode
```bash
cd frontend
npm install
npm run dev
```

### Build `.deb` & `.AppImage` Packages
```bash
bash scripts/build-linux.sh
```

Build outputs will be generated in `target/release/bundle/deb/` and `target/release/bundle/appimage/`.

---

## 📁 Project Architecture

```
playmusic/
├── frontend/                   # React 19 + TypeScript + Vite + Tailwind CSS
│   ├── src/
│   │   ├── components/         # DeckCard, MasterConsole, EditSlotModal
│   │   ├── features/audio/     # Polyphonic Web Audio Engine
│   │   ├── types/              # TypeScript types & Zod schemas
│   │   └── utils/              # Structured Logger & JSend envelope
├── src-tauri/                  # Rust Tauri Desktop Bridge (Ubuntu Linux)
├── scripts/                    # setup-ubuntu.sh, build-linux.sh, playmusic.desktop
├── docs/                       # Architecture & Progress Documentation
└── .local/                     # Developer Scratchpad & Notes (Git-ignored)
```

---

## 📄 License
MIT License. Crafted with precision for live event sound engineers.

