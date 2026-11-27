# PLAYMUSIC - PROJECT PROGRESS & MILESTONES

### Session Status [2026-11-27]
- **Task:** Release v2.0.0 - Playlist Auto-Next Queue & Keypress Slot Sorting | **State:** Released
- **Active Directory:** `C:\Project\playmusic`
- **Target OS:** Ubuntu 24.04 / 26.04 LTS & Windows 10/11 (Tauri v2)

### Milestones & Deliverables
- [x] **Release v2.0.0 Published:**
  - Bumped version to `2.0.0` across `package.json`, `frontend/package.json`, `src-tauri/tauri.conf.json`, `src-tauri/Cargo.toml`, and `README.md`.
  - Pushed git tag `v2.0.0` to trigger GitHub Actions CI/CD release workflow (`.github/workflows/release.yml`).
- [x] **Sort Slots by Keypress (`slotSorting.ts`):**
  - Added non-destructive slot sorting following physical keyboard sequence (`1-9 -> 0 -> Q-P -> A-L -> Z-M`), custom keys alphabetically, empty keys last, preserving internal `slot.id` and loaded `AudioBuffer`s.
  - Added dedicated `"Sắp xếp theo phím tắt"` trigger button in `MasterConsole`.
- [x] **Playlist Auto-Next Player (`usePlaylistController.ts` & `PlaylistPanel.tsx`):**
  - Added per-card Playlist toggle button (`ListPlus` / `ListChecks`) and `PL#n` queue order badge in `DeckCard.tsx`.
  - Added compact `PlaylistPanel` card in `MasterConsole.tsx` with transport (`Prev`, `Play/Pause`, `Next`, `Stop`), `Loop Playlist` toggle, `"Thêm tất cả"`, `"Theo phím"`, `"Xóa"`, and reorderable queue items (`↑`/`↓`/`×`).
  - Hardened `audioEngine.ts` with `subscribeTrackEnded` and `activeSource` identity guards so fade-out/manual stops never falsely emit track-end events.
  - Added stage safety: Exclusive mode external cue triggers or Panic Stop automatically disarm Auto-Next; persisted `playlistSlotIds` and `playlistLoop` in `EventPresetSchema` and `localStorage`.
- [x] **Release v1.0.18 Published:**
  - Bumped version to `1.0.18` across `package.json`, `frontend/package.json`, `src-tauri/tauri.conf.json`, `src-tauri/Cargo.toml`, and `README.md`.
  - Pushed git tag `v1.0.18` to trigger GitHub Actions CI/CD release workflow (`.github/workflows/release.yml`).
- [x] **Master Console Responsive Layout for Laptops (<= 740px):**
  - Preserved 100% original spacious hardware dimensions on large desktop displays (> 740px).
  - Compacted bottom button strip (36px, stop 40px) and padding on screens <= 740px to fit laptop screens without clipping.
  - Kept Fader and VU Meters fixed at 144px to eliminate canvas/dB mark desynchronization.
- [x] **Master Volume & Sidebar Mouse Wheel Isolation:**
  - Expanded wheel sensitivity to the full Master instrument cluster (`[dB] + [VU L] + [Fader] + [VU R] + [dB]`) with dual native and synthetic event handling.
  - Isolated wheel volume adjustment so placing mouse cursor anywhere outside the fader cluster allows free, natural scrolling of the sidebar and page.
- [x] **Deck Card Slot Swapping Retired:**
  - Removed `draggable`, grip handles (`::: #id`), and internal slot swapping to preserve muscle memory during live shows.
- [x] **Audio File Drag-and-Drop Retained & Enhanced:**
  - Dragging audio files onto any individual `DeckCard` loads audio directly into that slot.
  - Dragging audio files into the main window triggers the `UploadCloud` drop overlay and batch-loads/expands slots seamlessly.
  - Native Tauri OS file drop listener (`onDragDropEvent` & `handleNativeDropPaths`) retained and active.
- [x] **UI Polish & Concise Wording:**
  - Single professional signature line: `"Developed by Khangdev"`.
  - Concise button labels: `"STOP"`, `"Nạp nhiều file nhạc..."`, `"Tạo Show mới"`, `"Click để tạm dừng"`, `"Dừng bài"`.
- [x] **Responsive Container Query Layout (Option A):**
  - Launchpad automatically displays up to 5 columns with fluid card widths (215px–320px).

### Milestones & Deliverables
- [x] **Grill-me Requirements Alignment:**
  - 30 polyphonic slots, 5x6 Launchpad Grid layout.
  - Direct hotkeys (`1-0`, `Q-P`, `A-L`), Panic Mute All (`Space`/`Esc`).
  - Preloaded zero-latency AudioBuffer (<5ms).
  - Dedicated per-slot controls: Individual Mute, Loop/One-Shot toggle, numerical Cue-In point, Volume slider, Custom Label & 8 Stage Color coding.
  - Master Console with Master Volume, Panic Stop, and Fade-out slider (0.5s - 5s).
- [x] **Project Repository Protection:**
  - Automated `.gitignore` with `.local/`, secrets, dependencies, build caches, and agent artifacts.
  - Initialized `.local/scratch/` and `.local/docs/`.
  - Scaffolding of `AGENTS.md` and `.local/AGENTS.md`.
- [x] **Architecture Specification:**
  - Complete `docs/architecture/ARCHITECTURE.md` with Mermaid diagram.
  - Initialized `.env.example`.
- [/] **Core Engine & UI Scaffolding:**
  - Setting up `frontend/` (React 19 + TypeScript + Vite + Tailwind CSS).
  - Zod runtime validation schemas & JSend envelope contract.
  - 4-level structured logger.
  - Web Audio 30-slot polyphonic audio engine.
  - Tauri v2 Rust desktop bridge (`src-tauri/`).
- [ ] **Dependencies Installation & Code-Only Graphify Extraction:**
  - `npm install` in `frontend/`.
  - Run zero-token `graphify.exe extract . --code-only`.
  - Save architectural memory to `claude-mem_claude-mem-search`.

### Next Actions
1. Write frontend configuration files (`package.json`, `tsconfig.json`, `vite.config.ts`, `tailwind.config.js`).
2. Implement Zod schemas, JSend utility, logger, and audio engine.
3. Implement `src-tauri` Linux desktop shell configuration.
4. Run `npm install` and verify builds.
5. Extract code graph with `graphify.exe`.
