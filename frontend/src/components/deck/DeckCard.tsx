import React, { useEffect, useState, useRef } from "react";
import {
  Square,
  Volume2,
  VolumeX,
  Repeat,
  Upload,
  Clock,
  Settings
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
}

export const DeckCard: React.FC<DeckCardProps> = ({
  config,
  fadeDurationMs,
  onUpdateConfig,
  onBatchDropFiles
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
  const fileInputRef = useRef<HTMLInputElement>(null);
  const colorStyle = COLOR_CLASSES[config.color] || COLOR_CLASSES.slate;

  useEffect(() => {
    const unsub = audioEngine.subscribe(config.id, (state) => {
      setRuntime(state);
    });
    return unsub;
  }, [config.id]);

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
        onDragOver={(e) => {
          e.preventDefault();
          setIsDragOver(true);
        }}
        onDragLeave={() => setIsDragOver(false)}
        onDrop={handleFileDrop}
        className={`group relative flex flex-col justify-between p-2.5 rounded-xl border transition-all duration-150 select-none ${
          colorStyle.border
        } ${colorStyle.bg} ${
          isDragOver ? "ring-2 ring-blue-500 scale-[1.02] bg-blue-950/40" : ""
        } ${
          isPlaying
            ? "ring-2 ring-emerald-500 shadow-lg shadow-emerald-950/50 bg-slate-900/90"
            : "hover:bg-slate-900/80"
        }`}
      >
        {/* Progress Background Tint */}
        {isPlaying && (
          <div
            className="absolute inset-0 bg-emerald-500/10 rounded-xl pointer-events-none transition-all"
            style={{ width: `${progressPercent}%` }}
          />
        )}

        {/* Top Header Row */}
        <div className="relative z-10 flex items-center justify-between gap-1 mb-1.5">
          <div className="flex items-center gap-1.5 min-w-0">
            {/* Slot ID Badge */}
            <span
              className={`px-2 py-0.5 rounded text-[11px] font-black font-mono tracking-wider uppercase shadow-sm ${colorStyle.badge}`}
              title={`Slot #${config.id}`}
            >
              #{config.id}
            </span>

            {/* Custom Label */}
            <span
              className="text-xs font-semibold text-slate-100 truncate cursor-pointer hover:underline"
              onClick={() => setIsEditOpen(true)}
              title={`${config.label} (Click to edit)`}
            >
              {config.label}
            </span>
          </div>

          {/* Action Icons */}
          <div className="flex items-center gap-0.5">
            {/* Individual Mute Button */}
            <button
              onClick={toggleMute}
              title={config.isMuted ? "Slot is MUTED (Click to Unmute)" : "Click to MUTE slot"}
              className={`p-1.5 rounded-lg transition-colors cursor-pointer ${
                config.isMuted
                  ? "bg-rose-950 text-rose-300 ring-1 ring-rose-500"
                  : "text-slate-400 hover:text-slate-100 hover:bg-slate-800"
              }`}
            >
              {config.isMuted ? (
                <VolumeX className="w-3.5 h-3.5" />
              ) : (
                <Volume2 className="w-3.5 h-3.5" />
              )}
            </button>

            {/* Loop Toggle Button */}
            <button
              onClick={toggleLoop}
              title={config.isLooping ? "Looping Enabled" : "One-Shot Mode"}
              className={`p-1.5 rounded-lg transition-colors cursor-pointer ${
                config.isLooping
                  ? "bg-cyan-950 text-cyan-300 ring-1 ring-cyan-500"
                  : "text-slate-400 hover:text-slate-100 hover:bg-slate-800"
              }`}
            >
              <Repeat className="w-3.5 h-3.5" />
            </button>

            {/* Edit Slot Settings */}
            <button
              onClick={() => setIsEditOpen(true)}
              title="Slot settings"
              className="p-1.5 rounded-lg text-slate-500 hover:text-slate-200 hover:bg-slate-800 transition-colors cursor-pointer"
            >
              <Settings className="w-3.5 h-3.5" />
            </button>
          </div>
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

          {/* Interactive Seek Bar (Tua nhạc bằng chuột) */}
          <div
            onClick={handleSeek}
            title={runtime.audioBuffer ? "Click hoặc kéo chuột để tua nhanh/chậm" : "Chưa có file audio"}
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
                  left: `${Math.min(100, (config.cueInSeconds / runtime.audioBuffer.duration) * 100)}%`
                }}
                title={`Cue Point: ${config.cueInSeconds}s`}
              />
            )}
          </div>
        </div>

        {/* Bottom Row: Play/Pause, Stop, Upload, Volume */}
        <div className="relative z-10 flex items-center justify-between gap-1.5 mt-1.5">
          {/* Main Play/Pause Trigger Pad - Directly Shows Assigned Key */}
          <button
            onClick={() => (!runtime.audioBuffer ? fileInputRef.current?.click() : togglePlay())}
            title={
              !runtime.audioBuffer
                ? `Key: [${config.keymap}] - Click to load audio`
                : isPlaying
                ? `Key: [${config.keymap}] - Click to Pause`
                : `Key: [${config.keymap}] - Click to Play`
            }
            className={`flex-1 flex items-center justify-center py-2 px-3 rounded-lg font-mono font-black tracking-wider transition-all cursor-pointer ${
              !runtime.audioBuffer
                ? "bg-slate-800/40 text-slate-500 border border-slate-700/60 hover:bg-slate-800 hover:text-slate-300 text-sm"
                : isPlaying
                ? "bg-amber-500 text-black hover:bg-amber-400 shadow-md shadow-amber-950/60 ring-1 ring-amber-300 text-xs"
                : "bg-emerald-600 text-white hover:bg-emerald-500 active:scale-95 shadow-md shadow-emerald-950/60 ring-1 ring-emerald-400 text-sm"
            }`}
          >
            {isPlaying ? (
              <span className="flex items-center gap-1.5 font-black">
                <span>{config.keymap}</span>
                <span className="text-[10px] font-bold uppercase opacity-85">PAUSE</span>
              </span>
            ) : (
              <span>{config.keymap}</span>
            )}
          </button>

          {/* Stop Button */}
          <button
            onClick={handleStop}
            disabled={!runtime.audioBuffer || runtime.status === "idle"}
            title="Stop Track (Fade Out)"
            className="p-2 rounded-lg bg-slate-800 hover:bg-rose-900/60 hover:text-rose-300 text-slate-400 disabled:opacity-20 disabled:cursor-not-allowed transition-colors cursor-pointer"
          >
            <Square className="w-4 h-4" />
          </button>

          {/* Upload Button */}
          {!runtime.audioBuffer && (
            <button
              onClick={() => fileInputRef.current?.click()}
              title="Load Audio Track"
              className="p-2 rounded-lg bg-blue-950 hover:bg-blue-900 text-blue-300 border border-blue-800/80 transition-colors cursor-pointer"
            >
              <Upload className="w-4 h-4" />
            </button>
          )}

          {/* Mini Volume Fader */}
          <input
            type="range"
            min="0"
            max="1"
            step="0.05"
            value={config.volume}
            onChange={handleVolumeChange}
            title={`Gain: ${Math.round(config.volume * 100)}%`}
            className="w-14 h-1.5 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-blue-500"
          />

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
      />
    </>
  );
};
