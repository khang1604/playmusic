import React, { useEffect, useState, useRef } from "react";
import {
  AlertOctagon,
  Volume2,
  Sliders,
  FolderOpen,
  Save,
  FolderPlus,
  PlusCircle,
  Layers,
  Radio,
  SlidersHorizontal
} from "lucide-react";
import { audioEngine } from "../../features/audio/audioEngine";

interface MasterConsoleProps {
  masterVolume: number;
  onMasterVolumeChange: (vol: number) => void;
  fadeDurationMs: number;
  onFadeDurationChange: (ms: number) => void;
  activeCount: number;
  totalSlots: number;
  exclusiveMode: boolean;
  onToggleExclusiveMode: (enabled: boolean) => void;
  onPanicStop: () => void;
  onSavePreset: () => void;
  onLoadPreset: (e: React.ChangeEvent<HTMLInputElement>) => void;
  onBatchAudioFiles: (files: File[]) => void;
  onAddSlot: () => void;
}

const TOTAL_SEGMENTS = 14;

export const MasterConsole: React.FC<MasterConsoleProps> = ({
  masterVolume,
  onMasterVolumeChange,
  fadeDurationMs,
  onFadeDurationChange,
  activeCount,
  totalSlots,
  exclusiveMode,
  onToggleExclusiveMode,
  onPanicStop,
  onSavePreset,
  onLoadPreset,
  onBatchAudioFiles,
  onAddSlot
}) => {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const batchAudioInputRef = useRef<HTMLInputElement>(null);

  // Real-time VU Meter audio level state
  const [meterLevels, setMeterLevels] = useState<{ left: number; right: number }>({
    left: 0,
    right: 0
  });

  // Animation frame loop for smooth 60fps VU meter
  useEffect(() => {
    let animId: number;
    let currentL = 0;
    let currentR = 0;

    const tick = () => {
      const raw = audioEngine.getMasterLevels();
      // Smooth attack and decay
      currentL = raw.left > currentL ? raw.left : currentL * 0.82;
      currentR = raw.right > currentR ? raw.right : currentR * 0.82;

      setMeterLevels({
        left: Math.max(0, currentL),
        right: Math.max(0, currentR)
      });

      animId = requestAnimationFrame(tick);
    };

    animId = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(animId);
  }, []);

  const handleBatchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      onBatchAudioFiles(Array.from(e.target.files));
      e.target.value = "";
    }
  };

  // Wheel event on Master Volume
  const handleMasterWheel = (e: React.WheelEvent) => {
    e.preventDefault();
    const delta = e.deltaY < 0 ? 0.05 : -0.05;
    const next = Math.max(0, Math.min(1, Math.round((masterVolume + delta) * 100) / 100));
    onMasterVolumeChange(next);
  };

  const leftLitCount = Math.round(meterLevels.left * TOTAL_SEGMENTS);
  const rightLitCount = Math.round(meterLevels.right * TOTAL_SEGMENTS);

  return (
    <aside className="w-72 bg-slate-950 border-l border-slate-800/90 flex flex-col justify-between p-3.5 shadow-2xl select-none flex-shrink-0 overflow-y-auto">
      {/* Top Group: Status & Playback Mode */}
      <div className="space-y-3.5">
        {/* Active Playing Badge */}
        <div className="flex items-center justify-between px-3 py-2 bg-slate-900/90 rounded-xl border border-slate-800">
          <span className="text-[11px] font-bold tracking-wider uppercase text-slate-400">
            Trạng thái
          </span>
          <div className="flex items-center gap-2">
            <span
              className={`w-2.5 h-2.5 rounded-full transition-colors ${
                activeCount > 0
                  ? "bg-emerald-400 shadow-md shadow-emerald-400/80 animate-pulse"
                  : "bg-slate-600"
              }`}
            />
            <span className="font-mono text-xs font-black text-slate-100">
              {activeCount}/{totalSlots} ACTIVE
            </span>
          </div>
        </div>

        {/* Playback Mode (Đa âm vs Độc quyền) */}
        <div className="p-2.5 bg-slate-900/70 rounded-xl border border-slate-800/80">
          <div className="flex items-center justify-between mb-2">
            <span className="text-[11px] font-bold uppercase tracking-wider text-slate-300 flex items-center gap-1.5">
              <SlidersHorizontal className="w-3.5 h-3.5 text-blue-400" />
              Chế độ phát
            </span>
            <span className="text-[10px] font-mono text-slate-400">
              {exclusiveMode ? "Độc quyền" : "Đa âm"}
            </span>
          </div>
          <div className="grid grid-cols-2 gap-1.5 bg-slate-950 p-1 rounded-lg border border-slate-800">
            <button
              onClick={() => onToggleExclusiveMode(false)}
              className={`flex items-center justify-center gap-1.5 py-1.5 rounded-md text-xs font-bold transition-all cursor-pointer ${
                !exclusiveMode
                  ? "bg-blue-600 text-white shadow-sm shadow-blue-900"
                  : "text-slate-400 hover:text-slate-200"
              }`}
              title="Phát đa âm: Cho phép nhiều bài hát và hiệu ứng phát chồng lên nhau"
            >
              <Layers className="w-3 h-3" />
              <span>Đa âm</span>
            </button>
            <button
              onClick={() => onToggleExclusiveMode(true)}
              className={`flex items-center justify-center gap-1.5 py-1.5 rounded-md text-xs font-bold transition-all cursor-pointer ${
                exclusiveMode
                  ? "bg-amber-600 text-white shadow-sm shadow-amber-900"
                  : "text-slate-400 hover:text-slate-200"
              }`}
              title="Phát độc quyền: Bấm bài mới sẽ tự động Fade Out và dừng bài cũ"
            >
              <Radio className="w-3 h-3" />
              <span>Độc quyền</span>
            </button>
          </div>
        </div>

        {/* Fade Duration Slider */}
        <div className="p-2.5 bg-slate-900/70 rounded-xl border border-slate-800/80">
          <div className="flex items-center justify-between text-xs mb-1.5">
            <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider flex items-center gap-1.5">
              <Sliders className="w-3.5 h-3.5 text-indigo-400" />
              Fade Out
            </span>
            <span className="font-mono font-bold text-indigo-400">
              {(fadeDurationMs / 1000).toFixed(1)}s
            </span>
          </div>
          <input
            type="range"
            min="200"
            max="4000"
            step="100"
            value={fadeDurationMs}
            onChange={(e) => onFadeDurationChange(parseInt(e.target.value, 10))}
            className="w-full h-1.5 bg-slate-950 rounded-lg appearance-none cursor-pointer accent-indigo-500"
          />
        </div>

        {/* Middle Group: Vertical Master Fader & Stereo VU Meter */}
        <div
          onWheel={handleMasterWheel}
          className="p-3 bg-slate-900/90 rounded-2xl border border-slate-800 flex flex-col items-center"
        >
          <div className="w-full flex items-center justify-between mb-2.5 px-1">
            <span className="text-[11px] font-black uppercase tracking-wider text-slate-300 flex items-center gap-1">
              <Volume2 className="w-3.5 h-3.5 text-blue-400" />
              Master
            </span>
            <span className="font-mono text-xs font-black text-blue-400">
              {Math.round(masterVolume * 100)}%
            </span>
          </div>

          {/* Fader & Dual Stereo VU Meter Section */}
          <div className="flex items-center justify-center gap-4 py-1">
            {/* Left Channel VU Meter */}
            <div className="flex flex-col items-center gap-1">
              <span className="text-[9px] font-mono font-bold text-slate-500">L</span>
              <div className="flex flex-col-reverse gap-0.5 bg-slate-950 p-1 rounded-md border border-slate-800 h-36 w-3 justify-between">
                {Array.from({ length: TOTAL_SEGMENTS }, (_, idx) => {
                  const isLit = idx < leftLitCount;
                  let color = "bg-emerald-500 shadow-sm shadow-emerald-500/50";
                  if (idx >= 12) color = "bg-rose-500 shadow-sm shadow-rose-500/50";
                  else if (idx >= 9) color = "bg-amber-400 shadow-sm shadow-amber-400/50";

                  return (
                    <div
                      key={idx}
                      className={`w-full h-1.5 rounded-xs transition-opacity duration-75 ${
                        isLit ? color : "bg-slate-800/40 opacity-20"
                      }`}
                    />
                  );
                })}
              </div>
            </div>

            {/* Vertical Master Volume Slider */}
            <div className="relative flex flex-col items-center h-36 justify-center">
              <input
                type="range"
                min="0"
                max="1"
                step="0.01"
                value={masterVolume}
                onChange={(e) => onMasterVolumeChange(parseFloat(e.target.value))}
                className="master-vertical-slider cursor-pointer"
                title={`Master Volume: ${Math.round(masterVolume * 100)}% (Dùng phím mũi tên ↑ / ↓ hoặc con lăn chuột)`}
              />
            </div>

            {/* Right Channel VU Meter */}
            <div className="flex flex-col items-center gap-1">
              <span className="text-[9px] font-mono font-bold text-slate-500">R</span>
              <div className="flex flex-col-reverse gap-0.5 bg-slate-950 p-1 rounded-md border border-slate-800 h-36 w-3 justify-between">
                {Array.from({ length: TOTAL_SEGMENTS }, (_, idx) => {
                  const isLit = idx < rightLitCount;
                  let color = "bg-emerald-500 shadow-sm shadow-emerald-500/50";
                  if (idx >= 12) color = "bg-rose-500 shadow-sm shadow-rose-500/50";
                  else if (idx >= 9) color = "bg-amber-400 shadow-sm shadow-amber-400/50";

                  return (
                    <div
                      key={idx}
                      className={`w-full h-1.5 rounded-xs transition-opacity duration-75 ${
                        isLit ? color : "bg-slate-800/40 opacity-20"
                      }`}
                    />
                  );
                })}
              </div>
            </div>
          </div>

          <div className="text-[10px] text-slate-500 font-mono mt-2 tracking-tight text-center">
            Phím tắt: Mũi tên <span className="text-slate-300 font-bold">↑</span> /{" "}
            <span className="text-slate-300 font-bold">↓</span>
          </div>
        </div>
      </div>

      {/* Action Tools & Bottom Panic Stop */}
      <div className="space-y-2.5 pt-3 border-t border-slate-800/80">
        {/* Add Slot Button */}
        <button
          onClick={onAddSlot}
          className="w-full flex items-center justify-center gap-2 px-3 py-2.5 bg-blue-600/20 hover:bg-blue-600/30 text-blue-300 border border-blue-500/40 rounded-xl text-xs font-bold transition-all active:scale-98 cursor-pointer"
        >
          <PlusCircle className="w-4 h-4 text-blue-400" />
          <span>+ Thêm ô bài hát</span>
        </button>

        {/* Batch Load Files */}
        <button
          onClick={() => batchAudioInputRef.current?.click()}
          title="Chọn nhiều file nhạc để nạp nhanh"
          className="w-full flex items-center justify-center gap-2 px-3 py-2 bg-slate-900 hover:bg-slate-800 text-slate-300 border border-slate-800 rounded-xl text-xs font-semibold transition-colors cursor-pointer"
        >
          <FolderPlus className="w-3.5 h-3.5 text-indigo-400" />
          <span>Nạp loạt file nhạc...</span>
        </button>

        {/* Save & Load Presets */}
        <div className="grid grid-cols-2 gap-2">
          <button
            onClick={onSavePreset}
            title="Lưu kịch bản show (.json)"
            className="flex items-center justify-center gap-1.5 px-2.5 py-2 bg-slate-900 hover:bg-slate-800 text-slate-300 border border-slate-800 rounded-xl text-xs font-semibold transition-colors cursor-pointer"
          >
            <Save className="w-3.5 h-3.5 text-emerald-400" />
            <span>Lưu Preset</span>
          </button>
          <button
            onClick={() => fileInputRef.current?.click()}
            title="Mở file kịch bản (.json)"
            className="flex items-center justify-center gap-1.5 px-2.5 py-2 bg-slate-900 hover:bg-slate-800 text-slate-300 border border-slate-800 rounded-xl text-xs font-semibold transition-colors cursor-pointer"
          >
            <FolderOpen className="w-3.5 h-3.5 text-amber-400" />
            <span>Mở Preset</span>
          </button>
        </div>

        {/* Panic Stop Button - Mouse Click ONLY */}
        <button
          onClick={onPanicStop}
          title="Dừng toàn bộ bài hát trên sân khấu (Chỉ kích hoạt bằng click chuột)"
          className="w-full flex items-center justify-center gap-2 py-3 px-4 rounded-xl font-mono font-black text-xs uppercase tracking-wider bg-gradient-to-r from-rose-600 via-red-600 to-rose-700 hover:from-rose-500 hover:to-red-600 text-white shadow-xl shadow-rose-950/80 ring-2 ring-rose-500/50 hover:ring-rose-400 active:scale-95 transition-all cursor-pointer"
        >
          <AlertOctagon className="w-4 h-4 animate-bounce" />
          <span>PANIC STOP</span>
        </button>

        {/* Hidden File Inputs */}
        <input
          ref={fileInputRef}
          type="file"
          accept=".json"
          className="hidden"
          onChange={onLoadPreset}
        />
        <input
          ref={batchAudioInputRef}
          type="file"
          multiple
          accept="audio/*,.mp3,.wav,.ogg,.flac,.m4a,.aac"
          className="hidden"
          onChange={handleBatchChange}
        />
      </div>
    </aside>
  );
};
