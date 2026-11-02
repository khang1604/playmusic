import React, { useState, useEffect, useCallback, useRef } from "react";
import { UploadCloud, Music } from "lucide-react";
import { DeckCard } from "./components/deck/DeckCard";
import { MasterConsole } from "./components/controls/MasterConsole";
import { audioEngine } from "./features/audio/audioEngine";
import { logger } from "./utils/logger";
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

export const App: React.FC = () => {
  const [eventName, setEventName] = useState("Ubuntu Stage Show 01");
  const [masterVolume, setMasterVolume] = useState(1.0);
  const [fadeDurationMs, setFadeDurationMs] = useState(1000);
  const [slots, setSlots] = useState<DeckSlotConfig[]>(generateDefaultSlots);
  const [activeCount, setActiveCount] = useState(0);
  const [isWindowDragOver, setIsWindowDragOver] = useState(false);
  const [batchLoadingProgress, setBatchLoadingProgress] = useState<{
    current: number;
    total: number;
    fileName: string;
  } | null>(null);

  const dragCounterRef = useRef(0);

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
   * Batch Loads Multiple Audio Files into Slots sequentially (Top to Bottom)
   * Automatically sets slot label to original file name (without extension)
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

    logger.info(
      `Bắt đầu nạp hàng loạt ${audioFiles.length} file âm thanh từ slot #${startSlotIndex + 1}`
    );

    for (let i = 0; i < audioFiles.length; i++) {
      const targetIndex = startSlotIndex + i;
      if (targetIndex >= slots.length) break;

      const file = audioFiles[i];
      const targetSlot = slots[targetIndex];
      const cleanLabel = file.name.replace(/\.[^/.]+$/, "");

      setBatchLoadingProgress({
        current: i + 1,
        total: Math.min(audioFiles.length, slots.length - startSlotIndex),
        fileName: file.name
      });

      try {
        const buffer = await audioEngine.loadAudioFile(targetSlot.id, file);
        setSlots((prev) =>
          prev.map((s) =>
            s.id === targetSlot.id
              ? {
                  ...s,
                  fileName: file.name,
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

    setBatchLoadingProgress(null);
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
      await handleBatchLoadFiles(0, files); // Batch loads starting from slot 1
    }
  };

  // Save Event Preset to JSON file
  const handleSavePreset = () => {
    const preset = {
      version: "1.0.0" as const,
      eventName,
      createdAt: new Date().toISOString(),
      slots,
      masterVolume,
      fadeDurationMs
    };

    const validated = EventPresetSchema.safeParse(preset);
    if (!validated.success) {
      logger.error("Preset validation failed", validated.error.format());
      alert("Validation failed before saving preset.");
      return;
    }

    const blob = new Blob([JSON.stringify(preset, null, 2)], {
      type: "application/json"
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${eventName.toLowerCase().replace(/[^a-z0-9]/g, "_")}_preset.json`;
    a.click();
    URL.revokeObjectURL(url);
    logger.info(`Preset saved: ${a.download}`);
  };

  // Load Event Preset from JSON file
  const handleLoadPreset = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
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

        alert(`Successfully loaded preset: ${parsed.eventName}`);
        logger.info(`Preset loaded: ${parsed.eventName}`);
      } catch (err) {
        logger.error("Failed to parse preset file", err);
        alert("Invalid preset file format. Please check file structure.");
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
            Hệ thống sẽ tự động nạp các bài nhạc vào các ô theo thứ tự từ trên xuống (Slot 1 đến 30) và gán tên file làm nhãn hiển thị.
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
                Đang nạp file ({batchLoadingProgress.current}/{batchLoadingProgress.total})
              </span>
            </div>
            <div className="text-[11px] text-slate-400 truncate max-w-[220px]">
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
          <span>Ubuntu 24.04/26.04 Native Audio Shell</span>
          <span>•</span>
          <span>Kéo thả nhiều file audio vào màn hình để nạp nhanh</span>
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
