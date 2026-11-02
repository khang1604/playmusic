# PLAYMUSIC - AGENT RULES & ARCHITECTURAL STANDARDS

## 1. Project Overview & Target Platform
- **Application Name:** `playmusic`
- **Target OS:** Ubuntu 24.04 / 26.04 LTS (Linux Desktop via Tauri v2 `.deb` / `.AppImage`)
- **Primary Domain:** Live Event Audio Cue & Polyphonic Soundboard Workstation
- **Capacity:** 30 simultaneous audio deck slots in a 5x6 Launchpad Grid with instant hotkeys and sub-millisecond audio cue triggering.

## 2. Core Architecture & Tech Stack
- **Desktop Shell:** Tauri v2 (Rust backend, WebKitGTK / PipeWire / PulseAudio integration)
- **Frontend Framework:** React 19 + TypeScript + Vite
- **Audio Engine:** HTML5 Web Audio API / Low-Latency AudioContext with 30 isolated GainNode and BufferSource channels
- **Styling:** Tailwind CSS + High-Contrast Stage Dark Mode (`#0a0a0c`, `#16161e`)
- **State Architecture:** Feature-sliced domain architecture (`features/audio`, `features/hotkeys`, `features/preset`)

## 3. Directory Layout Standards
```
playmusic/
├── frontend/               # React 19 Client UI & Audio Engine
│   ├── src/
│   │   ├── components/     # UI widgets (DeckCard, MasterConsole, KeymapModal)
│   │   ├── features/       # audio, hotkeys, preset state & logic
│   │   ├── types/          # TypeScript interfaces & Zod schemas
│   │   └── utils/          # Structured logger, JSend response envelope
├── src-tauri/              # Rust Tauri Desktop Bridge (Ubuntu/Linux)
├── docs/                   # Official Architecture & Progress documentation
└── .local/                 # Git-ignored developer scratchpad & local notes
```

## 4. Code & Audio Engine Invariants
1. **Zero Render Waterfall on 30 Decks:**
   - Never place 30 playing timers in a single global root state.
   - Each `DeckSlot` must subscribe to its own local playback state or requestAnimationFrame ticker to prevent full-grid re-rendering.
2. **Memory Leak Prevention:**
   - Always revoke `URL.revokeObjectURL()` when tracks are replaced or unloaded.
   - Close or disconnect disconnected `AudioNode` chains (`GainNode`, `PannerNode`) on slot teardown.
3. **Structured JSend Envelope:**
   - Success: `{ "success": true, "data": T, "message"?: string }`
   - Failure: `{ "success": false, "error": { "code": string, "message": string, "details": unknown } }`
4. **Validation via Zod:**
   - All external imports (Preset `.json` files, hotkey mappings, audio metadata) must be validated with Zod before mounting to memory.
5. **Observability:**
   - Use `logger.debug()`, `logger.info()`, `logger.warn()`, `logger.error()` from `frontend/src/utils/logger.ts`. No naked `console.log`.
