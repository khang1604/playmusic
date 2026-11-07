import React, { useEffect, useState, useRef } from "react";
import {
  Square,
  Volume2,
  VolumeX,
  Repeat,
  Upload,
  Clock,
  Settings,
  GripHorizontal
} from "lucide-react";
import { audioEngine } from "../../features/audio/audioEngine";
import { EditSlotModal } from "../modals/EditSlotModal";
import type { DeckSlotConfig, DeckRuntimeState, StageColor } from "../../types";

const COLOR_CLASSES: Record<
  StageColor,
  { border: string; bg: string; badge: string; text: string; glow: string }
> = {
  slate: {
    border: "border-slate-800 hover:border-slate-700",
    bg: "bg-slate-900/60",
    badge: "bg-slate-800 text-slate-200 border border-slate-700",
    text: "text-slate-400",
    glow: "shadow-slate-900/50"
  },
  blue: {
    border: "border-blue-900/60 hover:border-blue-700",
    bg: "bg-blue-950/30",
    badge: "bg-blue-600 text-white shadow-sm shadow-blue-900",
    text: "text-blue-400",
    glow: "shadow-blue-900/40"
  },
  emerald: {
    border: "border-emerald-900/60 hover:border-emerald-700",
    bg: "bg-emerald-950/30",
    badge: "bg-emerald-600 text-white shadow-sm shadow-emerald-900",
    text: "text-emerald-400",
    glow: "shadow-emerald-900/40"
  },
  amber: {
    border: "border-amber-900/60 hover:border-amber-700",
    bg: "bg-amber-950/30",
    badge: "bg-amber-500 text-black font-extrabold shadow-sm shadow-amber-900",
    text: "text-amber-400",
    glow: "shadow-amber-900/40"
  },
  rose: {
    border: "border-rose-900/60 hover:border-rose-700",
    bg: "bg-rose-950/30",
    badge: "bg-rose-600 text-white shadow-sm shadow-rose-900",
    text: "text-rose-400",
    glow: "shadow-rose-900/40"
  },
  purple: {
    border: "border-purple-900/60 hover:border-purple-700",
    bg: "bg-purple-950/30",
    badge: "bg-purple-600 text-white shadow-sm shadow-purple-900",
    text: "text-purple-400",
    glow: "shadow-purple-900/40"
  },
  cyan: {
    border: "border-cyan-900/60 hover:border-cyan-700",
    bg: "bg-cyan-950/30",
    badge: "bg-cyan-500 text-black font-extrabold shadow-sm shadow-cyan-900",
    text: "text-cyan-400",
    glow: "shadow-cyan-900/40"
  },
  orange: {
    border: "border-orange-900/60 hover:border-orange-700",
    bg: "bg-orange-950/30",
    badge: "bg-orange-600 text-white shadow-sm shadow-orange-900",
    text: "text-orange-400",
    glow: "shadow-orange-900/40"
  }
};

interface DeckCardProps {
  config: DeckSlotConfig;
  fadeDurationMs: number;
  onUpdateConfig: (updated: Partial<DeckSlotConfig>) => void;
  onBatchDropFiles: (startSlotId: number, files: File[]) => void;
  onSwapSlots?: (sourceId: number, targetId: number) => void;
  onDeleteSlot?: (slotId: number) => void;
}

export const DeckCard: React.FC<DeckCardProps> = ({
  config,
  fadeDurationMs,
  onUpdateConfig,
  onBatchDropFiles,
  onSwapSlots,
  onDeleteSlot
}) => {
  const [runtime, setRuntime] = useState<DeckRuntimeState>({
    id: config.id,
    status: "idle",
    currentTime: 0,
    remainingTime: 0,
    audioBuffer: null
  });

  const [isEditOpen, setIsEditOpen] = useState(false);
  const [isDragOver, setIsDragOver] = useState(false);
  const [isReorderOver, setIsReorderOver] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const volumeSliderRef = useRef<HTMLInputElement>(null);
  const seekBarRef = useRef<HTMLDivElement>(null);

  const colorStyle = COLOR_CLASSES[config.color] || COLOR_CLASSES.slate;

  const volumeRef = useRef(config.volume);
  volumeRef.current = config.volume;
  const slotIdRef = useRef(config.id);
  slotIdRef.current = config.id;
  const onUpdateConfigRef = useRef(onUpdateConfig);
  onUpdateConfigRef.current = onUpdateConfig;
  const runtimeRef = useRef(runtime);
  runtimeRef.current = runtime;

  // Non-passive wheel event on Volume Slider (blocks page scroll 100%, 5% step, 1% with Shift)
  useEffect(() => {
    const el = volumeSliderRef.current;
    if (!el) return;

    const onWheel = (e: WheelEvent) => {
      e.preventDefault();
      e.stopPropagation();
      const step = e.shiftKey ? 0.01 : 0.05;
      const delta = e.deltaY < 0 ? step : -step;
      const current = volumeRef.current;
      const nextVol = Math.max(
        0,
        Math.min(1, Math.round((current + delta) * 100) / 100)
      );
      audioEngine.setVolume(slotIdRef.current, nextVol);
      onUpdateConfigRef.current({ volume: nextVol });
    };

    el.addEventListener("wheel", onWheel, { passive: false });
    return () => {
      el.removeEventListener("wheel", onWheel);
    };
  }, []);

  // Non-passive wheel event on Seek Bar (blocks page scroll 100%)
  useEffect(() => {
    const el = seekBarRef.current;
    if (!el) return;

    const onWheel = (e: WheelEvent) => {
      if (!runtimeRef.current.audioBuffer) return;
      e.preventDefault();
      e.stopPropagation();
      const step = e.shiftKey ? 5 : 2;
      const delta = e.deltaY < 0 ? step : -step;
      const nextTime = Math.max(
        0,
        Math.min(
          runtimeRef.current.audioBuffer.duration,
          runtimeRef.current.currentTime + delta
        )
      );
      audioEngine.seek(slotIdRef.current, nextTime);
    };

    el.addEventListener("wheel", onWheel, { passive: false });
    return () => {
      el.removeEventListener("wheel", onWheel);
    };
  }, []);

  useEffect(() => {
    const unsub = audioEngine.subscribe(config.id, (state) => {
      setRuntime(state);
    });
    return unsub;
  }, [config.id]);

  // Synchronize runtime when audio is cleared (e.g. New Show reset)
  useEffect(() => {
    if (!config.fileName) {
      setRuntime({
        id: config.id,
        status: "idle",
        currentTime: config.cueInSeconds,
        remainingTime: 0,
        audioBuffer: null
      });
    }
  }, [config.fileName, config.cueInSeconds, config.id]);

  const handleFileDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragOver(false);
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      const files = Array.from(e.dataTransfer.files);
      onBatchDropFiles(config.id, files);
    }
  };

  const handleFileInput = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      const files = Array.from(e.target.files);
      onBatchDropFiles(config.id, files);
      e.target.value = "";
    }
  };

  const togglePlay = () => {
    audioEngine.togglePlayPause(config.id, fadeDurationMs);
  };

  const handleStop = () => {
    audioEngine.stop(config.id, fadeDurationMs);
  };

  const toggleMute = () => {
    const nextMute = !config.isMuted;
    audioEngine.toggleMute(config.id);
    onUpdateConfig({ isMuted: nextMute });
  };

  const toggleLoop = () => {
    const nextLoop = !config.isLooping;
    audioEngine.setLoop(config.id, nextLoop);
    onUpdateConfig({ isLooping: nextLoop });
  };

  const handleVolumeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const vol = parseFloat(e.target.value);
    audioEngine.setVolume(config.id, vol);
    onUpdateConfig({ volume: vol });
  };


  const handleSeek = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!runtime.audioBuffer) return;
    const rect = e.currentTarget.getBoundingClientRect();
    const clickX = e.clientX - rect.left;
    const percentage = Math.max(0, Math.min(1, clickX / rect.width));
    const targetSeconds = percentage * runtime.audioBuffer.duration;
    audioEngine.seek(config.id, targetSeconds);
  };

  const formatTime = (secs: number) => {
    const m = Math.floor(secs / 60);
    const s = Math.floor(secs % 60);
    return `${m.toString().padStart(2, "0")}:${s.toString().padStart(2, "0")}`;
  };

  const isPlaying = runtime.status === "playing";
  const progressPercent = runtime.audioBuffer
    ? Math.min(100, (runtime.currentTime / runtime.audioBuffer.duration) * 100)
    : 0;

  return (
    <>
      <div
        draggable
        onDragStart={(e) => {
          e.dataTransfer.setData("application/x-playmusic-slot", `${config.id}`);
          e.dataTransfer.effectAllowed = "move";
        }}
        onDragOver={(e) => {
          e.preventDefault();
          if (e.dataTransfer.types.includes("application/x-playmusic-slot")) {
            setIsReorderOver(true);
          } else if (e.dataTransfer.types.includes("Files")) {
            setIsDragOver(true);
          }
        }}
        onDragLeave={() => {
          setIsDragOver(false);
          setIsReorderOver(false);
        }}
        onDrop={(e) => {
          setIsDragOver(false);
          setIsReorderOver(false);
          if (e.dataTransfer.types.includes("application/x-playmusic-slot")) {
            e.preventDefault();
            e.stopPropagation();
            const sourceId = parseInt(
              e.dataTransfer.getData("application/x-playmusic-slot"),
              10
            );
            if (sourceId && sourceId !== config.id) {
              onSwapSlots?.(sourceId, config.id);
            }
          } else {
            handleFileDrop(e);
          }
        }}
        className={`group relative flex flex-col justify-between p-2.5 rounded-xl border transition-colors duration-100 select-none ${
          colorStyle.border
        } ${colorStyle.bg} ${
          isReorderOver
            ? "ring-2 ring-amber-400 scale-[1.02] bg-amber-950/40"
            : isDragOver
            ? "ring-2 ring-blue-500 scale-[1.02] bg-blue-950/40"
            : ""
        } ${
          isPlaying
            ? "ring-2 ring-emerald-500 shadow-lg shadow-emerald-950/50 bg-slate-900/90"
            : "hover:bg-slate-900/80"
        }`}
      >
        {/* Progress Background Tint */}
        {isPlaying && (
          <div
            className="absolute inset-0 bg-emerald-500/10 rounded-xl pointer-events-none"
            style={{ width: `${progressPercent}%` }}
          />
        )}

        {/* Top Header Row: Slot ID Badge on Left, Loop & Settings on Right (+20% size for clear visibility) */}
        <div className="relative z-10 flex items-center justify-between gap-1.5 mb-1.5">
          {/* Slot ID Badge & Reorder Handle */}
          <span
            className={`px-2.5 py-1 rounded-md text-xs font-black font-mono tracking-wider uppercase shadow-sm flex items-center gap-1.5 cursor-grab active:cursor-grabbing ${colorStyle.badge}`}
            title={`Slot #${config.id} - Kéo để đổi vị trí`}
          >
            <GripHorizontal className="w-3.5 h-3.5 opacity-70" />
            <span>#{config.id}</span>
          </span>

          {/* Action Icons (Loop & Settings) */}
          <div className="flex items-center gap-1">
            {/* Loop Toggle Button */}
            <button
              onClick={toggleLoop}
              title={config.isLooping ? "Chế độ lặp vô tận (Looping)" : "Phát một lần (One-shot)"}
              className={`p-2 rounded-lg transition-colors cursor-pointer flex items-center justify-center ${
                config.isLooping
                  ? "bg-cyan-950 text-cyan-300 ring-1 ring-cyan-500"
                  : "text-slate-400 hover:text-slate-100 hover:bg-slate-800"
              }`}
            >
              <Repeat className="w-4 h-4" />
            </button>

            {/* Edit Slot Settings */}
            <button
              onClick={() => setIsEditOpen(true)}
              title="Cài đặt & Xóa ô"
              className="p-2 rounded-lg text-slate-400 hover:text-slate-100 hover:bg-slate-800 transition-colors cursor-pointer flex items-center justify-center"
            >
              <Settings className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Dedicated Track Title Row: 100% full width, 2-line clamp, bold and high-contrast */}
        <div
          onClick={() => setIsEditOpen(true)}
          title={`${config.label} (Click để đổi tên & cài đặt)`}
          className="relative z-10 w-full min-h-[2.5rem] flex items-center px-1 py-0.5 rounded cursor-pointer group/title hover:bg-slate-800/40 transition-colors mb-1"
        >
          <span
            className={`text-sm font-bold leading-snug line-clamp-2 transition-colors ${
              config.fileName
                ? "text-slate-100 group-hover/title:text-blue-300"
                : "text-slate-500 font-medium italic group-hover/title:text-slate-400"
            }`}
          >
            {config.label || (config.fileName ? config.fileName.replace(/\.[^/.]+$/, "") : "Trống (Click để nạp nhạc)")}
          </span>
        </div>

        {/* Middle Row: Progress Meter, Numerical Cue-in Point & Interactive Seek Scrubber Bar */}
        <div className="relative z-10 bg-slate-950/70 p-2 rounded-lg border border-slate-800/80 my-1 font-mono">
          <div className="flex items-center justify-between text-[11px] mb-1.5">
            <div className="flex items-center gap-1.5">
              <Clock className="w-3 h-3 text-slate-500" />
              <span className={isPlaying ? "text-emerald-400 font-bold" : "text-slate-300"}>
                {formatTime(runtime.currentTime)}
              </span>
              <span className="text-slate-600">/</span>
              <span className="text-slate-400">
                -{formatTime(runtime.remainingTime)}
              </span>
            </div>

            <div
              className="flex items-center gap-1 text-[10px] text-slate-400"
              title="Điểm bắt đầu phát (giây) - Bấm phím sẽ phát ngay từ giây này"
            >
              <span>Cue:</span>
              <input
                type="number"
                min="0"
                step="0.5"
                value={config.cueInSeconds || 0}
                onChange={(e) => {
                  const val = Math.max(0, parseFloat(e.target.value) || 0);
                  onUpdateConfig({ cueInSeconds: val });
                }}
                className="w-11 px-1 py-0.5 bg-slate-900 border border-slate-700 rounded text-blue-400 font-bold font-mono text-center focus:border-blue-500 focus:outline-none text-[10px]"
              />
              <span>s</span>
            </div>
          </div>

          {/* Interactive Seek Bar (Tua nhạc bằng chuột và con lăn wheel) */}
          <div
            ref={seekBarRef}
            onClick={handleSeek}
            title={
              runtime.audioBuffer
                ? "Click hoặc lăn con lăn chuột để tua nhanh/chậm"
                : "Chưa có file audio"
            }
            className={`group/bar relative w-full h-2 rounded-full overflow-hidden transition-all duration-150 ${
              runtime.audioBuffer
                ? "bg-slate-800 cursor-pointer hover:h-2.5"
                : "bg-slate-900/60 cursor-not-allowed opacity-40"
            }`}
          >
            {/* Filled Progress Bar */}
            <div
              className={`h-full rounded-full transition-[width] duration-75 ${
                isPlaying
                  ? "bg-gradient-to-r from-emerald-500 via-teal-400 to-cyan-400 shadow-sm shadow-emerald-500/50"
                  : "bg-blue-600/80"
              }`}
              style={{ width: `${progressPercent}%` }}
            />

            {/* Cue Point Marker */}
            {runtime.audioBuffer && config.cueInSeconds > 0 && (
              <div
                className="absolute top-0 bottom-0 w-1 bg-amber-400 shadow-sm"
                style={{
                  left: `${Math.min(
                    100,
                    (config.cueInSeconds / runtime.audioBuffer.duration) * 100
                  )}%`
                }}
                title={`Cue Point: ${config.cueInSeconds}s`}
              />
            )}
          </div>
        </div>

        {/* Bottom Row: Play/Pause, Stop, Upload on Left; Mute & Mini Volume on Right */}
        <div className="relative z-10 flex items-center justify-between gap-1.5 mt-1.5">
          {/* Left Playback Control Group */}
          <div className="flex items-center gap-1.5">
            {/* Main Play/Pause Trigger Pad - Original Height (py-2), Controlled Medium Width */}
            <button
              onClick={() =>
                !runtime.audioBuffer ? fileInputRef.current?.click() : togglePlay()
              }
              title={
                !runtime.audioBuffer
                  ? `Key: [${config.keymap}] - Click để nạp nhạc`
                  : isPlaying
                  ? `Key: [${config.keymap}] - Click để tạm dừng (Pause)`
                  : `Key: [${config.keymap}] - Click để phát nhạc`
              }
              className={`min-w-[60px] sm:min-w-[68px] py-2 px-3.5 rounded-lg font-mono font-black tracking-wider transition-all cursor-pointer flex items-center justify-center shadow-md select-none ${
                !runtime.audioBuffer
                  ? "bg-slate-800/60 text-slate-400 border border-slate-700/80 hover:bg-slate-800 hover:text-slate-200 text-sm"
                  : isPlaying
                  ? "bg-amber-400 text-black hover:bg-amber-300 ring-2 ring-amber-200 shadow-amber-950/80 text-xs"
                  : "bg-emerald-600 text-white hover:bg-emerald-500 active:scale-95 ring-1 ring-emerald-300 shadow-emerald-950/80 text-sm hover:brightness-110"
              }`}
            >
              {isPlaying ? (
                <span className="flex items-center gap-1 font-black">
                  <span className="text-sm">{config.keymap}</span>
                  <span className="text-[9px] font-black uppercase opacity-90 tracking-tight">PAUSE</span>
                </span>
              ) : (
                <span className="text-sm font-black">{config.keymap}</span>
              )}
            </button>

            {/* Stop Button - Original Height */}
            <button
              onClick={handleStop}
              disabled={!runtime.audioBuffer || runtime.status === "idle"}
              title="Dừng bài (Stop Fade Out)"
              className="p-2 rounded-lg bg-slate-800 hover:bg-rose-900/60 hover:text-rose-300 text-slate-400 disabled:opacity-20 disabled:cursor-not-allowed transition-colors cursor-pointer flex items-center justify-center flex-shrink-0"
            >
              <Square className="w-4 h-4" />
            </button>

            {/* Upload Button - Original Height */}
            {!runtime.audioBuffer && (
              <button
                onClick={() => fileInputRef.current?.click()}
                title="Chọn file âm thanh"
                className="p-2 rounded-lg bg-blue-950 hover:bg-blue-900 text-blue-300 border border-blue-800/80 transition-colors cursor-pointer flex items-center justify-center flex-shrink-0"
              >
                <Upload className="w-4 h-4" />
              </button>
            )}
          </div>

          {/* Right Volume & Mute Control Group */}
          <div className="flex items-center gap-1.5 flex-shrink-0">
            {/* Individual Mute Button (Original Height, Placed directly before Volume Slider) */}
            <button
              onClick={toggleMute}
              title={config.isMuted ? "Đang TẮT TIẾNG (Bấm để Bật tiếng)" : "Bấm để Tắt tiếng ô này"}
              className={`p-2 rounded-lg transition-colors cursor-pointer flex items-center justify-center ${
                config.isMuted
                  ? "bg-rose-950 text-rose-300 ring-1 ring-rose-500"
                  : "text-slate-400 hover:text-slate-100 hover:bg-slate-800"
              }`}
            >
              {config.isMuted ? (
                <VolumeX className="w-4 h-4" />
              ) : (
                <Volume2 className="w-4 h-4" />
              )}
            </button>

            {/* Mini Volume Fader (Extended length ~40% for easier drag & finer control) */}
            <input
              ref={volumeSliderRef}
              type="range"
              min="0"
              max="1"
              step="0.05"
              value={config.volume}
              onChange={handleVolumeChange}
              onPointerUp={(e) => e.currentTarget.blur()}
              title={`Gain: ${Math.round(config.volume * 100)}% (Lăn chuột 5%, giữ Shift lăn 1%)`}
              className="w-20 sm:w-24 h-1.5 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-blue-500"
            />
          </div>

          <input
            ref={fileInputRef}
            type="file"
            multiple
            accept="audio/*,.mp3,.wav,.ogg,.flac,.m4a,.aac"
            className="hidden"
            onChange={handleFileInput}
          />
        </div>
      </div>

      {/* Edit Slot Settings Modal */}
      <EditSlotModal
        slot={config}
        isOpen={isEditOpen}
        onClose={() => setIsEditOpen(false)}
        onSave={onUpdateConfig}
        onDelete={onDeleteSlot}
      />
    </>
  );
};
