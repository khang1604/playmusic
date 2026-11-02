import React, { useState, useEffect, useCallback, useRef } from "react";
import { UploadCloud, Music } from "lucide-react";
import { DeckCard } from "./components/deck/DeckCard";
import { MasterConsole } from "./components/controls/MasterConsole";
import { audioEngine } from "./features/audio/audioEngine";
import { logger } from "./utils/logger";
import {
  saveSlotAudio,
  getSlotAudio
} from "./utils/audioStorage";
import { EventPresetSchema, type DeckSlotConfig } from "./types";

const DEFAULT_KEYMAPS = [
  "1", "2", "3", "4", "5", "6",
  "7", "8", "9", "0", "-", "=",
  "Q", "W", "E", "R", "T", "Y",
  "U", "I", "O", "P", "[", "]",
  "A", "S", "D", "F", "G", "H"
];

function generateDefaultSlots(): DeckSlotConfig[] {
  return Array.from({ length: 30 }, (_, index) => {
    const id = index + 1;
    return {
      id,
      keymap: DEFAULT_KEYMAPS[index] || `${id}`,
      label: `Slot ${id}`,
      fileName: null,
      filePath: null,
      fileUrl: null,
      durationSeconds: 0,
      cueInSeconds: 0,
      volume: 1.0,
      isMuted: false,
      isLooping: false,
      color: "slate"
    };
  });
}

/**
 * Attempt to restore the audio buffer for a slot from:
 * 1. Tauri native filesystem read (if running in desktop and slot.filePath exists)
 * 2. IndexedDB blob cache
 */
async function restoreAudioForSlot(
  slot: DeckSlotConfig
): Promise<AudioBuffer | null> {
  const isTauri =
    typeof window !== "undefined" &&
    Boolean(
      (window as unknown as { __TAURI_INTERNALS__?: unknown })
        .__TAURI_INTERNALS__
    );

  // 1. Try reading from disk via Tauri native command
  if (isTauri && slot.filePath) {
    try {
      const { invoke } = await import("@tauri-apps/api/core");
      const bytes = await invoke<number[] | Uint8Array>("read_audio_file", {
        filePath: slot.filePath
      });
      const uint8 = bytes instanceof Uint8Array ? bytes : new Uint8Array(bytes);
      const arrayBuf = (uint8.buffer.slice(
        uint8.byteOffset,
        uint8.byteOffset + uint8.byteLength
      ) as unknown) as ArrayBuffer;
      const buffer = await audioEngine.loadAudioBuffer(
        slot.id,
        arrayBuf,
        slot.fileName || `slot_${slot.id}`
      );
      // Cache to IndexedDB for quick access
      const blob = new Blob([arrayBuf]);
      await saveSlotAudio(slot.id, blob, slot.fileName || `slot_${slot.id}`);
      return buffer;
    } catch (tauriErr) {
      logger.warn(
        `Tauri failed to read file from path '${slot.filePath}' for slot #${slot.id}`,
        tauriErr
      );
    }
  }

  // 2. Try restoring from IndexedDB cache
  try {
    const cached = await getSlotAudio(slot.id);
    if (cached) {
      const arrayBuf = await cached.blob.arrayBuffer();
      const buffer = await audioEngine.loadAudioBuffer(
        slot.id,
        arrayBuf,
        cached.fileName
      );
      return buffer;
    }
  } catch (idbErr) {
    logger.warn(`IndexedDB read failed for slot #${slot.id}`, idbErr);
  }

  return null;
}

export const App: React.FC = () => {
  const [eventName, setEventName] = useState(() => {
    return localStorage.getItem("playmusic_session_event") || "Ubuntu Stage Show 01";
  });
  const [masterVolume, setMasterVolume] = useState(1.0);
  const [fadeDurationMs, setFadeDurationMs] = useState(1000);
  const [slots, setSlots] = useState<DeckSlotConfig[]>(() => {
    try {
      const saved = localStorage.getItem("playmusic_session_slots");
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.length === 30) {
          return parsed;
        }
      }
    } catch {
      // Fallback
    }
    return generateDefaultSlots();
  });

  const [activeCount, setActiveCount] = useState(0);
  const [isWindowDragOver, setIsWindowDragOver] = useState(false);
  const [batchLoadingProgress, setBatchLoadingProgress] = useState<{
    current: number;
    total: number;
    fileName: string;
  } | null>(null);

  const dragCounterRef = useRef(0);

  // Sync slots to localStorage
  useEffect(() => {
    try {
      localStorage.setItem("playmusic_session_slots", JSON.stringify(slots));
    } catch {
      // Quota exceeded safe ignore
    }
  }, [slots]);

  // Sync eventName to localStorage
  useEffect(() => {
    try {
      localStorage.setItem("playmusic_session_event", eventName);
    } catch {
      // Ignore
    }
  }, [eventName]);

  // On initial mount: restore audio buffers for any slots that have audio files recorded
  useEffect(() => {
    async function restoreStartupAudio() {
      const slotsWithAudio = slots.filter((s) => Boolean(s.fileName));
      if (slotsWithAudio.length === 0) return;

      logger.info(`Đang nạp lại âm thanh cho ${slotsWithAudio.length} slot từ bộ nhớ...`);
      for (const slot of slotsWithAudio) {
        try {
          const buffer = await restoreAudioForSlot(slot);
          if (buffer) {
            setSlots((prev) =>
              prev.map((s) =>
                s.id === slot.id ? { ...s, durationSeconds: buffer.duration } : s
              )
            );
          }
        } catch (err) {
          logger.warn(`Failed to restore audio on startup for slot #${slot.id}`, err);
        }
      }
    }

    restoreStartupAudio();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Poll active count smoothly
  useEffect(() => {
    const interval = setInterval(() => {
      setActiveCount(audioEngine.getActivePlayingCount());
    }, 200);
    return () => clearInterval(interval);
  }, []);

  // Update master volume in engine
  const handleMasterVolumeChange = (vol: number) => {
    setMasterVolume(vol);
    audioEngine.setMasterVolume(vol);
  };

  // Update slot configuration
  const handleUpdateSlot = (slotId: number, updated: Partial<DeckSlotConfig>) => {
    setSlots((prev) =>
      prev.map((s) => (s.id === slotId ? { ...s, ...updated } : s))
    );
  };

  // Emergency Panic Stop All
  const handlePanicStop = useCallback(() => {
    audioEngine.panicMuteAll(fadeDurationMs);
  }, [fadeDurationMs]);

  // Global Keyboard Event Dispatcher
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Ignore when user is typing in form inputs
      const target = e.target as HTMLElement;
      if (
        target &&
        (target.tagName === "INPUT" ||
          target.tagName === "TEXTAREA" ||
          target.isContentEditable)
      ) {
        return;
      }

      // Panic Stop Hotkeys
      if (e.code === "Space" || e.key === "Escape") {
        e.preventDefault();
        handlePanicStop();
        return;
      }

      // Match slot by keymap
      const pressedKey = e.key.toUpperCase();
      const matchedSlot = slots.find(
        (s) => s.keymap.toUpperCase() === pressedKey
      );

      if (matchedSlot) {
        e.preventDefault();
        audioEngine.togglePlayPause(matchedSlot.id, fadeDurationMs);
        logger.debug(`Key '${pressedKey}' triggered slot #${matchedSlot.id}`);
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [slots, fadeDurationMs, handlePanicStop]);

  /**
   * Batch Loads Multiple Audio Files into Slots
   * Supports:
   * 1. Smart Relink: Matches dropped files to existing preset slots with matching fileName or label (preserves custom labels & cue points!)
   * 2. Sequential Population: Loads remaining unmatched files top to bottom starting from startSlotIndex
   */
  const handleBatchLoadFiles = async (startSlotIndex: number, rawFiles: File[]) => {
    const audioFiles = rawFiles.filter(
      (f) =>
        f.type.startsWith("audio/") ||
        /\.(mp3|wav|ogg|flac|m4a|aac|wma)$/i.test(f.name)
    );

    if (audioFiles.length === 0) {
      alert("Không tìm thấy tệp âm thanh hợp lệ (.mp3, .wav, .ogg, .flac, .m4a, .aac).");
      return;
    }

    logger.info(`Bắt đầu xử lý ${audioFiles.length} file âm thanh`);

    const unmatchedFiles: File[] = [];
    const matchedSlotIds = new Set<number>();
    let relinkCount = 0;

    // Step 1: Smart Relinking against existing preset slots
    for (let i = 0; i < audioFiles.length; i++) {
      const file = audioFiles[i];
      const fileNameLower = file.name.toLowerCase();
      const cleanBaseName = file.name.replace(/\.[^/.]+$/, "").toLowerCase();
      const filePath = (file as unknown as { path?: string }).path || null;

      // Find an existing slot where fileName matches or label matches
      const targetSlot = slots.find(
        (s) =>
          !matchedSlotIds.has(s.id) &&
          s.fileName &&
          (s.fileName.toLowerCase() === fileNameLower ||
            s.label.toLowerCase() === cleanBaseName)
      );

      if (targetSlot) {
        matchedSlotIds.add(targetSlot.id);
        relinkCount++;
        setBatchLoadingProgress({
          current: i + 1,
          total: audioFiles.length,
          fileName: `Khớp nhạc: ${targetSlot.label}`
        });

        try {
          const buffer = await audioEngine.loadAudioFile(targetSlot.id, file);
          await saveSlotAudio(targetSlot.id, file);
          setSlots((prev) =>
            prev.map((s) =>
              s.id === targetSlot.id
                ? {
                    ...s,
                    fileName: file.name,
                    filePath: filePath || s.filePath,
                    durationSeconds: buffer.duration
                  }
                : s
            )
          );
        } catch (err) {
          logger.error(`Lỗi khi nạp file ${file.name} cho slot #${targetSlot.id}`, err);
        }
      } else {
        unmatchedFiles.push(file);
      }
    }

    // Step 2: Populate remaining unmatched files sequentially
    if (unmatchedFiles.length > 0) {
      for (let i = 0; i < unmatchedFiles.length; i++) {
        const targetIndex = startSlotIndex + i;
        if (targetIndex >= slots.length) break;

        const file = unmatchedFiles[i];
        const targetSlot = slots[targetIndex];
        const cleanLabel = file.name.replace(/\.[^/.]+$/, "");
        const filePath = (file as unknown as { path?: string }).path || null;

        setBatchLoadingProgress({
          current: relinkCount + i + 1,
          total: audioFiles.length,
          fileName: file.name
        });

        try {
          const buffer = await audioEngine.loadAudioFile(targetSlot.id, file);
          await saveSlotAudio(targetSlot.id, file);
          setSlots((prev) =>
            prev.map((s) =>
              s.id === targetSlot.id
                ? {
                    ...s,
                    fileName: file.name,
                    filePath: filePath || s.filePath,
                    label: cleanLabel,
                    durationSeconds: buffer.duration
                  }
                : s
            )
          );
        } catch (err) {
          logger.error(`Lỗi khi nạp file ${file.name} cho slot #${targetSlot.id}`, err);
        }
      }
    }

    setBatchLoadingProgress(null);

    if (relinkCount > 0) {
      logger.info(`Đã tự động khớp lại ${relinkCount} bài nhạc vào đúng preset slots.`);
    }
  };

  // Window Drag & Drop Listeners
  const handleWindowDragEnter = (e: React.DragEvent) => {
    e.preventDefault();
    dragCounterRef.current += 1;
    if (e.dataTransfer.types.includes("Files")) {
      setIsWindowDragOver(true);
    }
  };

  const handleWindowDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    dragCounterRef.current -= 1;
    if (dragCounterRef.current <= 0) {
      dragCounterRef.current = 0;
      setIsWindowDragOver(false);
    }
  };

  const handleWindowDragOver = (e: React.DragEvent) => {
    e.preventDefault();
  };

  const handleWindowDrop = async (e: React.DragEvent) => {
    e.preventDefault();
    dragCounterRef.current = 0;
    setIsWindowDragOver(false);

    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      const files = Array.from(e.dataTransfer.files);
      await handleBatchLoadFiles(0, files);
    }
  };

  // Save Event Preset to JSON file (Supports both Tauri Desktop & Web Browser)
  const handleSavePreset = async () => {
    try {
      const cleanEventName = eventName.trim() || "PlayMusic Show";
      const presetData = {
        version: "1.0.0",
        eventName: cleanEventName,
        createdAt: new Date().toISOString(),
        slots,
        masterVolume,
        fadeDurationMs
      };

      const validated = EventPresetSchema.parse(presetData);
      const jsonContent = JSON.stringify(validated, null, 2);
      const safeName = cleanEventName.toLowerCase().replace(/[^a-z0-9]/gi, "_");
      const filename = `${safeName || "show"}_preset.json`;

      // Check if running inside native Tauri Desktop App
      const isTauri =
        typeof window !== "undefined" &&
        Boolean(
          (window as unknown as { __TAURI_INTERNALS__?: unknown })
            .__TAURI_INTERNALS__
        );
      if (isTauri) {
        try {
          const { invoke } = await import("@tauri-apps/api/core");
          const savedPath = await invoke<string>("save_preset_file", {
            filename,
            content: jsonContent
          });
          alert(`Đã lưu file preset sự kiện thành công tại:\n${savedPath}`);
          logger.info(`Preset saved via Tauri to: ${savedPath}`);
          return;
        } catch (tauriErr) {
          logger.warn("Tauri native save failed, trying browser download fallback", tauriErr);
        }
      }

      // Browser Fallback (Blob anchor download)
      const blob = new Blob([jsonContent], { type: "application/json" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = filename;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      setTimeout(() => URL.revokeObjectURL(url), 2000);
      logger.info(`Preset saved: ${filename}`);
    } catch (err) {
      logger.error("Preset saving error", err);
      alert("Không thể lưu cấu hình preset. Vui lòng thử lại!");
    }
  };

  // Load Event Preset from JSON file and automatically restore all audio buffers
  const handleLoadPreset = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = async (event) => {
      try {
        const rawJson = JSON.parse(event.target?.result as string);
        const parsed = EventPresetSchema.parse(rawJson);

        setEventName(parsed.eventName);
        setMasterVolume(parsed.masterVolume);
        audioEngine.setMasterVolume(parsed.masterVolume);
        setFadeDurationMs(parsed.fadeDurationMs);
        setSlots(parsed.slots);

        // Update audio engine settings per slot
        parsed.slots.forEach((s) => {
          audioEngine.setVolume(s.id, s.volume);
          audioEngine.setLoop(s.id, s.isLooping);
          audioEngine.setCueIn(s.id, s.cueInSeconds);
          if (s.isMuted) {
            audioEngine.toggleMute(s.id);
          }
        });

        logger.info(`Preset loaded: ${parsed.eventName}`);

        // Restore audio buffers for slots with fileName
        const slotsWithAudio = parsed.slots.filter((s) => Boolean(s.fileName));
        let restoredCount = 0;

        if (slotsWithAudio.length > 0) {
          setBatchLoadingProgress({
            current: 0,
            total: slotsWithAudio.length,
            fileName: "Đang khôi phục các bài nhạc..."
          });

          for (let i = 0; i < slotsWithAudio.length; i++) {
            const slot = slotsWithAudio[i];
            setBatchLoadingProgress({
              current: i + 1,
              total: slotsWithAudio.length,
              fileName: `Nạp: ${slot.fileName || slot.label}`
            });

            try {
              const buffer = await restoreAudioForSlot(slot);
              if (buffer) {
                restoredCount++;
                setSlots((prev) =>
                  prev.map((s) =>
                    s.id === slot.id
                      ? { ...s, durationSeconds: buffer.duration }
                      : s
                  )
                );
              }
            } catch (restoreErr) {
              logger.warn(`Could not restore audio for slot #${slot.id}`, restoreErr);
            }
          }

          setBatchLoadingProgress(null);
        }

        const totalExpected = slotsWithAudio.length;
        if (totalExpected === 0) {
          alert(`Đã nạp preset "${parsed.eventName}" thành công!`);
        } else if (restoredCount === totalExpected) {
          alert(
            `Đã nạp preset "${parsed.eventName}" thành công!\nTất cả ${restoredCount}/${totalExpected} bài nhạc đã sẵn sàng phát.`
          );
        } else {
          const missingCount = totalExpected - restoredCount;
          alert(
            `Đã nạp preset "${parsed.eventName}"!\n` +
            `• Đã khôi phục nhạc: ${restoredCount}/${totalExpected} bài\n` +
            `• Chưa có file âm thanh: ${missingCount} bài\n\n` +
            `👉 Mẹo: Bạn chỉ cần kéo thả thư mục nhạc hoặc các file mp3 vào cửa sổ, PlayMusic sẽ tự động gắn lại nhạc vào đúng tên bài!`
          );
        }
      } catch (err) {
        logger.error("Failed to parse preset file", err);
        alert("File preset không đúng định dạng. Vui lòng kiểm tra lại cấu trúc file JSON.");
      }
    };
    reader.readAsText(file);
    e.target.value = ""; // Reset file input
  };

  return (
    <div
      onDragEnter={handleWindowDragEnter}
      onDragLeave={handleWindowDragLeave}
      onDragOver={handleWindowDragOver}
      onDrop={handleWindowDrop}
      className="relative flex flex-col h-screen w-screen bg-slate-950 text-slate-100 overflow-hidden font-sans select-none"
    >
      {/* Global Drag & Drop Overlay */}
      {isWindowDragOver && (
        <div className="absolute inset-0 z-50 flex flex-col items-center justify-center bg-slate-950/90 backdrop-blur-md border-4 border-dashed border-blue-500 m-3 rounded-2xl pointer-events-none animate-in fade-in duration-150">
          <div className="w-20 h-20 rounded-full bg-blue-600/20 flex items-center justify-center text-blue-400 mb-4 animate-bounce">
            <UploadCloud className="w-10 h-10" />
          </div>
          <h2 className="text-xl font-black uppercase tracking-wider text-white mb-2">
            Thả các file audio vào đây
          </h2>
          <p className="text-sm text-slate-300 max-w-md text-center">
            Hệ thống sẽ tự động khớp các bài nhạc vào các ô đã có trong Preset hoặc nạp tiếp nối từ trên xuống dưới (Slot 1 đến 30).
          </p>
        </div>
      )}

      {/* Batch Loading Progress Toast */}
      {batchLoadingProgress && (
        <div className="fixed bottom-12 right-6 z-50 flex items-center gap-3 px-4 py-3 bg-slate-900 border border-blue-500/80 rounded-xl shadow-2xl animate-in slide-in-from-bottom-5">
          <div className="w-5 h-5 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />
          <div>
            <div className="text-xs font-bold text-white flex items-center gap-2">
              <Music className="w-3.5 h-3.5 text-blue-400" />
              <span>
                Đang xử lý âm thanh ({batchLoadingProgress.current}/{batchLoadingProgress.total})
              </span>
            </div>
            <div className="text-[11px] text-slate-400 truncate max-w-[240px]">
              {batchLoadingProgress.fileName}
            </div>
          </div>
        </div>
      )}

      {/* Master Top Control Console */}
      <MasterConsole
        eventName={eventName}
        onEventNameChange={setEventName}
        masterVolume={masterVolume}
        onMasterVolumeChange={handleMasterVolumeChange}
        fadeDurationMs={fadeDurationMs}
        onFadeDurationChange={setFadeDurationMs}
        activeCount={activeCount}
        onPanicStop={handlePanicStop}
        onSavePreset={handleSavePreset}
        onLoadPreset={handleLoadPreset}
        onBatchAudioFiles={(files) => handleBatchLoadFiles(0, files)}
      />

      {/* Main 5x6 Launchpad Grid View */}
      <main className="flex-1 p-3 overflow-y-auto">
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-2.5 max-w-[1920px] mx-auto">
          {slots.map((slot) => (
            <DeckCard
              key={slot.id}
              config={slot}
              fadeDurationMs={fadeDurationMs}
              onUpdateConfig={(updated) => handleUpdateSlot(slot.id, updated)}
              onBatchDropFiles={(startId, files) =>
                handleBatchLoadFiles(startId - 1, files)
              }
            />
          ))}
        </div>
      </main>

      {/* Footer Info Bar */}
      <footer className="px-5 py-2 bg-slate-950/90 border-t border-slate-900 flex items-center justify-between text-[11px] text-slate-500 font-mono">
        <div className="flex items-center gap-3">
          <span>Ubuntu 24.04/26.04 & Windows Native Audio Workstation</span>
          <span>•</span>
          <span>Kéo thả nhiều file audio vào màn hình để nạp/khớp nhanh</span>
        </div>
        <div className="flex items-center gap-3">
          <span>Hotkeys: Bấm phím để Play/Pause</span>
          <span>•</span>
          <span className="text-rose-400 font-bold">Space/Esc: Panic Stop</span>
        </div>
      </footer>
    </div>
  );
};
