import React, { useState, useEffect, useCallback, useRef } from "react";
import { UploadCloud, Music, PlusCircle, RotateCcw, AlertTriangle } from "lucide-react";
import { DeckCard } from "./components/deck/DeckCard";
import { MasterConsole } from "./components/controls/MasterConsole";
import { audioEngine } from "./features/audio/audioEngine";
import { logger } from "./utils/logger";
import {
  saveSlotAudio,
  getSlotAudio,
  deleteSlotAudio,
  clearAllSlotAudio
} from "./utils/audioStorage";
import { EventPresetSchema, type DeckSlotConfig } from "./types";

// Extended 45 keyboard hotkeys
const DEFAULT_KEYMAPS = [
  "1", "2", "3", "4", "5", "6", "7", "8", "9", "0", "-", "=",
  "Q", "W", "E", "R", "T", "Y", "U", "I", "O", "P", "[", "]",
  "A", "S", "D", "F", "G", "H", "J", "K", "L", ";", "'",
  "Z", "X", "C", "V", "B", "N", "M", ",", ".", "/"
];

function generateDefaultSlots(count = 20): DeckSlotConfig[] {
  return Array.from({ length: count }, (_, index) => {
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
  const [exclusiveMode, setExclusiveMode] = useState(() => {
    return localStorage.getItem("playmusic_session_exclusive") === "true";
  });

  const [slots, setSlots] = useState<DeckSlotConfig[]>(() => {
    try {
      const saved = localStorage.getItem("playmusic_session_slots");
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.length > 0) {
          return parsed;
        }
      }
    } catch {
      // Fallback
    }
    return generateDefaultSlots(20);
  });

  const [activeCount, setActiveCount] = useState(0);
  const [isWindowDragOver, setIsWindowDragOver] = useState(false);
  const [batchLoadingProgress, setBatchLoadingProgress] = useState<{
    current: number;
    total: number;
    fileName: string;
  } | null>(null);
  const [showResetModal, setShowResetModal] = useState(false);

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

  // Sync exclusiveMode to engine and storage
  useEffect(() => {
    audioEngine.setExclusiveMode(exclusiveMode);
    try {
      localStorage.setItem("playmusic_session_exclusive", `${exclusiveMode}`);
    } catch {
      // Ignore
    }
  }, [exclusiveMode]);

  // On initial mount: sync engine and restore audio buffers
  useEffect(() => {
    async function restoreStartupAudio() {
      // Sync engine parameters
      slots.forEach((s) => {
        audioEngine.setCueIn(s.id, s.cueInSeconds);
        audioEngine.setVolume(s.id, s.volume);
        audioEngine.setLoop(s.id, s.isLooping);
      });
      audioEngine.setMasterVolume(masterVolume);
      audioEngine.setExclusiveMode(exclusiveMode);

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
    const clamped = Math.max(0, Math.min(1, vol));
    setMasterVolume(clamped);
    audioEngine.setMasterVolume(clamped);
  };

  // Toggle Exclusive / Polyphonic playback mode
  const handleToggleExclusiveMode = (enabled: boolean) => {
    setExclusiveMode(enabled);
    audioEngine.setExclusiveMode(enabled);
  };

  // Update slot configuration
  const handleUpdateSlot = (slotId: number, updated: Partial<DeckSlotConfig>) => {
    setSlots((prev) =>
      prev.map((s) => (s.id === slotId ? { ...s, ...updated } : s))
    );
    if (updated.cueInSeconds !== undefined) {
      audioEngine.setCueIn(slotId, updated.cueInSeconds);
    }
    if (updated.volume !== undefined) {
      audioEngine.setVolume(slotId, updated.volume);
    }
    if (updated.isLooping !== undefined) {
      audioEngine.setLoop(slotId, updated.isLooping);
    }
  };

  // Add new slot manually
  const handleAddSlot = () => {
    setSlots((prev) => {
      const nextId = prev.length > 0 ? Math.max(...prev.map((s) => s.id)) + 1 : 1;
      const nextKeymap = DEFAULT_KEYMAPS[prev.length] || "";
      const newSlot: DeckSlotConfig = {
        id: nextId,
        keymap: nextKeymap,
        label: `Slot ${nextId}`,
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
      return [...prev, newSlot];
    });
  };

  // Delete a slot
  const handleDeleteSlot = async (slotId: number) => {
    audioEngine.stop(slotId, 0);
    audioEngine.removeChannel(slotId);
    await deleteSlotAudio(slotId);

    setSlots((prev) => {
      if (prev.length <= 1) {
        alert("Bàn điều khiển cần giữ lại ít nhất 1 ô bài hát.");
        return prev;
      }
      return prev.filter((s) => s.id !== slotId);
    });
  };

  // Swap / Reorder slots
  const handleSwapSlots = (sourceId: number, targetId: number) => {
    setSlots((prev) => {
      const srcIdx = prev.findIndex((s) => s.id === sourceId);
      const tgtIdx = prev.findIndex((s) => s.id === targetId);
      if (srcIdx === -1 || tgtIdx === -1) return prev;

      const next = [...prev];
      const temp = next[srcIdx];
      next[srcIdx] = next[tgtIdx];
      next[tgtIdx] = temp;
      return next;
    });
  };

  // Emergency Panic Stop All (MOUSE CLICK ONLY)
  const handlePanicStop = useCallback(() => {
    audioEngine.panicMuteAll(fadeDurationMs);
  }, [fadeDurationMs]);

  // Global Keyboard Event Dispatcher
  // Space and Escape keys are strictly removed for stage safety!
  // ArrowUp / ArrowDown control Master Volume.
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Ignore when user is typing in text fields
      const target = e.target as HTMLInputElement;
      const isTextInput =
        target &&
        (target.tagName === "TEXTAREA" ||
          target.isContentEditable ||
          (target.tagName === "INPUT" &&
            ["text", "search", "password", "number", "email"].includes(target.type)));

      if (isTextInput) {
        return;
      }

      // Master Volume Keyboard Control: Arrow Up/Down (5% coarse, Shift+Arrow 1% fine)
      if (e.key === "ArrowUp") {
        e.preventDefault();
        const delta = e.shiftKey ? 0.01 : 0.05;
        handleMasterVolumeChange(
          Math.min(1, Math.round((masterVolume + delta) * 100) / 100)
        );
        return;
      }
      if (e.key === "ArrowDown") {
        e.preventDefault();
        const delta = e.shiftKey ? 0.01 : 0.05;
        handleMasterVolumeChange(
          Math.max(0, Math.round((masterVolume - delta) * 100) / 100)
        );
        return;
      }

      // Match slot by hotkey
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
  }, [slots, fadeDurationMs, masterVolume]);

  /**
   * Batch Loads Multiple Audio Files into Slots with AUTO-EXPANSION
   * 1. Smart Relink: Matches dropped files to existing preset slots with matching fileName/label
   * 2. Sequential Population: Loads unmatched files and dynamically expands slots if files exceed capacity
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

    // Step 2: Populate remaining unmatched files sequentially (Auto-Expand slots if needed!)
    if (unmatchedFiles.length > 0) {
      const workingSlots = [...slots];

      for (let i = 0; i < unmatchedFiles.length; i++) {
        const file = unmatchedFiles[i];
        const cleanLabel = file.name.replace(/\.[^/.]+$/, "");
        const filePath = (file as unknown as { path?: string }).path || null;
        const targetIndex = startSlotIndex + i;

        // Auto-expand: create new slot if index exceeds current count
        if (targetIndex >= workingSlots.length) {
          const nextId =
            workingSlots.length > 0
              ? Math.max(...workingSlots.map((s) => s.id)) + 1
              : 1;
          const nextKeymap = DEFAULT_KEYMAPS[workingSlots.length] || "";
          workingSlots.push({
            id: nextId,
            keymap: nextKeymap,
            label: cleanLabel,
            fileName: file.name,
            filePath,
            fileUrl: null,
            durationSeconds: 0,
            cueInSeconds: 0,
            volume: 1.0,
            isMuted: false,
            isLooping: false,
            color: "slate"
          });
        }

        const targetSlot = workingSlots[targetIndex];

        setBatchLoadingProgress({
          current: relinkCount + i + 1,
          total: audioFiles.length,
          fileName: file.name
        });

        try {
          const buffer = await audioEngine.loadAudioFile(targetSlot.id, file);
          await saveSlotAudio(targetSlot.id, file);
          workingSlots[targetIndex] = {
            ...targetSlot,
            fileName: file.name,
            filePath: filePath || targetSlot.filePath,
            label: targetSlot.fileName ? targetSlot.label : cleanLabel,
            durationSeconds: buffer.duration
          };
        } catch (err) {
          logger.error(`Lỗi khi nạp file ${file.name} cho slot #${targetSlot.id}`, err);
        }
      }

      setSlots(workingSlots);
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

  // Save Event Preset to JSON file
  const handleSavePreset = async () => {
    try {
      const cleanEventName = eventName.trim() || "PlayMusic Show";
      const presetData = {
        version: "1.0.0",
        eventName: cleanEventName,
        createdAt: new Date().toISOString(),
        slots,
        masterVolume,
        fadeDurationMs,
        exclusiveMode
      };

      const validated = EventPresetSchema.parse(presetData);
      const jsonContent = JSON.stringify(validated, null, 2);
      const safeName = cleanEventName.toLowerCase().replace(/[^a-z0-9]/gi, "_");
      const filename = `${safeName || "show"}_preset.json`;

      // Native Tauri Save
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

  // Load Event Preset from JSON file
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
        setExclusiveMode(parsed.exclusiveMode);
        audioEngine.setExclusiveMode(parsed.exclusiveMode);
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
    e.target.value = "";
  };

  /**
   * Reset All for a New Show
   * Clears all channels, caches, and restores 20 clean default slots
   */
  const handleConfirmResetAll = async () => {
    try {
      // 1. Immediately silence any active audio
      audioEngine.panicMuteAll(0);
      audioEngine.resetAllChannels();

      // 2. Clear IndexedDB audio storage
      await clearAllSlotAudio();

      // 3. Clear localStorage cache
      localStorage.removeItem("playmusic_session_slots");
      localStorage.removeItem("playmusic_session_event");

      // 4. Reset slots to fresh default 20 slots
      const freshSlots = generateDefaultSlots(20);
      setSlots(freshSlots);
      setEventName("Show mới");
      setShowResetModal(false);
      logger.info("Workspace reset for a new show successfully");
    } catch (err) {
      logger.error("Failed to reset show", err);
    }
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
            Hệ thống sẽ tự động khớp các bài nhạc vào các ô đã có trong Preset, hoặc tự động mở rộng thêm ô mới nếu số lượng file vượt quá số ô hiện tại!
          </p>
        </div>
      )}

      {/* Batch Loading Progress Toast */}
      {batchLoadingProgress && (
        <div className="fixed bottom-12 left-6 z-50 flex items-center gap-3 px-4 py-3 bg-slate-900 border border-blue-500/80 rounded-xl shadow-2xl animate-in slide-in-from-bottom-5">
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

      {/* Top Header Row (Logo + Title + Event Name) */}
      <header className="flex items-center justify-between px-5 py-2.5 bg-slate-950 border-b border-slate-800/80 select-none flex-shrink-0">
        <div className="flex items-center gap-3">
          <img
            src="/logo.svg"
            alt="PlayMusic Studio Logo"
            className="w-8 h-8 rounded-lg shadow-lg shadow-blue-500/20 hover:scale-105 transition-transform"
          />
          <div>
            <h1 className="text-sm font-black tracking-wider uppercase bg-gradient-to-r from-white via-slate-200 to-slate-400 bg-clip-text text-transparent">
              PlayMusic Studio
            </h1>
            <p className="text-[10px] text-slate-500 font-mono tracking-tight">
              LIVE EVENT AUDIO WORKSTATION
            </p>
          </div>
        </div>

        {/* Event Name Input & Quick New Show Button */}
        <div className="flex items-center gap-2">
          <div className="flex items-center gap-2 bg-slate-900/90 px-3 py-1.5 rounded-xl border border-slate-800">
            <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">
              Show:
            </span>
            <input
              type="text"
              value={eventName}
              onChange={(e) => setEventName(e.target.value)}
              placeholder="Tên sự kiện / Kịch bản show..."
              className="text-xs font-semibold bg-transparent text-slate-100 focus:outline-none w-48 sm:w-64"
            />
          </div>

          <button
            onClick={() => setShowResetModal(true)}
            title="Làm mới toàn bộ danh sách để setup Show mới"
            className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-900 hover:bg-slate-800 text-slate-300 hover:text-cyan-400 border border-slate-800 hover:border-cyan-500/40 rounded-xl text-xs font-semibold transition-all cursor-pointer"
          >
            <RotateCcw className="w-3.5 h-3.5 text-cyan-400" />
            <span className="hidden sm:inline">Tạo Show mới</span>
          </button>
        </div>
      </header>

      {/* Main Workspace: Left 5x4 Grid + Right Master Mixer Column */}
      <div className="flex flex-1 overflow-hidden">
        {/* Left/Center Launchpad Grid (5 columns x 4 rows by default) */}
        <main className="flex-1 p-3 overflow-y-auto">
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-2.5 max-w-[1920px] mx-auto">
            {slots.map((slot) => (
              <DeckCard
                key={slot.id}
                config={slot}
                fadeDurationMs={fadeDurationMs}
                onUpdateConfig={(updated) => handleUpdateSlot(slot.id, updated)}
                onBatchDropFiles={(startId, files) => {
                  const idx = slots.findIndex((s) => s.id === startId);
                  handleBatchLoadFiles(idx >= 0 ? idx : 0, files);
                }}
                onSwapSlots={handleSwapSlots}
                onDeleteSlot={handleDeleteSlot}
              />
            ))}

            {/* Add Slot Card (End of Grid) */}
            <button
              onClick={handleAddSlot}
              title="Thêm một ô bài hát mới"
              className="group flex flex-col items-center justify-center min-h-[160px] p-4 rounded-xl border-2 border-dashed border-slate-800 hover:border-blue-500/60 bg-slate-950/40 hover:bg-slate-900/60 transition-all cursor-pointer text-slate-500 hover:text-blue-400"
            >
              <div className="w-10 h-10 rounded-full bg-slate-900 group-hover:bg-blue-600/20 flex items-center justify-center mb-2 transition-colors">
                <PlusCircle className="w-6 h-6" />
              </div>
              <span className="text-xs font-bold uppercase tracking-wider">
                + Thêm ô mới
              </span>
              <span className="text-[10px] text-slate-600 font-mono mt-0.5">
                Slot #{slots.length > 0 ? Math.max(...slots.map((s) => s.id)) + 1 : 1}
              </span>
            </button>
          </div>
        </main>

        {/* Right Master Mixer Console Strip */}
        <MasterConsole
          masterVolume={masterVolume}
          onMasterVolumeChange={handleMasterVolumeChange}
          fadeDurationMs={fadeDurationMs}
          onFadeDurationChange={setFadeDurationMs}
          activeCount={activeCount}
          totalSlots={slots.length}
          exclusiveMode={exclusiveMode}
          onToggleExclusiveMode={handleToggleExclusiveMode}
          onPanicStop={handlePanicStop}
          onSavePreset={handleSavePreset}
          onLoadPreset={handleLoadPreset}
          onBatchAudioFiles={(files) => handleBatchLoadFiles(slots.length, files)}
          onAddSlot={handleAddSlot}
          onResetAll={() => setShowResetModal(true)}
        />
      </div>

      {/* Footer Info Bar */}
      <footer className="px-5 py-1.5 bg-slate-950 border-t border-slate-900 flex items-center justify-between text-[11px] text-slate-500 font-mono flex-shrink-0">
        <div className="flex items-center gap-2">
          <span>Ubuntu 24.04/26.04 & Windows Native Audio Shell</span>
          <span>•</span>
          <span>Kéo thả file để nạp / Kéo ô để đổi vị trí</span>
        </div>
        <div className="flex items-center gap-3">
          <span>Phím ↑ / ↓: Tăng giảm âm lượng Master</span>
          <span>•</span>
          <span className="text-rose-400 font-semibold">
            Panic Stop: Click nút đỏ góc phải
          </span>
        </div>
      </footer>

      {/* Reset / New Show Confirmation Modal */}
      {showResetModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4 animate-in fade-in duration-150">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl max-w-md w-full p-6 shadow-2xl space-y-4">
            <div className="flex items-start gap-3.5">
              <div className="p-2.5 rounded-xl bg-amber-500/10 border border-amber-500/30 text-amber-400 flex-shrink-0">
                <AlertTriangle className="w-6 h-6" />
              </div>
              <div>
                <h3 className="text-base font-bold text-white">
                  Tạo Show mới (Reset toàn bộ)?
                </h3>
                <p className="text-xs text-slate-400 mt-1 leading-relaxed">
                  Thao tác này sẽ dừng toàn bộ âm thanh, dọn sạch dữ liệu bài hát và khôi phục về <span className="text-slate-200 font-semibold">20 ô trống mặc định</span> để bạn setup kịch bản cho show tiếp theo.
                </p>
              </div>
            </div>

            <div className="p-3 bg-slate-950/80 rounded-xl border border-slate-800/80 text-[11px] text-slate-400 leading-normal">
              💡 <span className="font-semibold text-slate-300">Gợi ý:</span> Nếu bạn muốn tái sử dụng danh sách bài hát hiện tại, hãy bấm <span className="text-emerald-400 font-semibold">Lưu Preset</span> ở cột bên phải trước khi Reset!
            </div>

            <div className="flex items-center justify-end gap-2.5 pt-2">
              <button
                type="button"
                onClick={() => setShowResetModal(false)}
                className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-300 hover:text-white bg-slate-800 hover:bg-slate-700 transition-colors cursor-pointer"
              >
                Hủy bỏ
              </button>
              <button
                type="button"
                onClick={handleConfirmResetAll}
                className="flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold text-white bg-gradient-to-r from-cyan-600 to-blue-600 hover:from-cyan-500 hover:to-blue-500 shadow-lg shadow-cyan-900/40 transition-all cursor-pointer"
              >
                <RotateCcw className="w-3.5 h-3.5" />
                <span>Xác nhận tạo Show mới</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
