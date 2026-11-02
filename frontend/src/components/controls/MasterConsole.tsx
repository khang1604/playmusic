import React from "react";
import {
  AlertOctagon,
  Volume2,
  Sliders,
  FolderOpen,
  Save,
  FolderPlus
} from "lucide-react";

interface MasterConsoleProps {
  eventName: string;
  onEventNameChange: (name: string) => void;
  masterVolume: number;
  onMasterVolumeChange: (vol: number) => void;
  fadeDurationMs: number;
  onFadeDurationChange: (ms: number) => void;
  activeCount: number;
  onPanicStop: () => void;
  onSavePreset: () => void;
  onLoadPreset: (e: React.ChangeEvent<HTMLInputElement>) => void;
  onBatchAudioFiles: (files: File[]) => void;
}

export const MasterConsole: React.FC<MasterConsoleProps> = ({
  eventName,
  onEventNameChange,
  masterVolume,
  onMasterVolumeChange,
  fadeDurationMs,
  onFadeDurationChange,
  activeCount,
  onPanicStop,
  onSavePreset,
  onLoadPreset,
  onBatchAudioFiles
}) => {
  const fileInputRef = React.useRef<HTMLInputElement>(null);
  const batchAudioInputRef = React.useRef<HTMLInputElement>(null);

  return (
    <header className="flex flex-wrap items-center justify-between gap-3 px-5 py-3 bg-slate-950 border-b border-slate-800 shadow-xl">
      {/* Brand & Event Title */}
      <div className="flex items-center gap-3">
        <div className="flex items-center gap-2.5">
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
              UBUNTU LIVE EVENT WORKSTATION
            </p>
          </div>
        </div>

        <div className="h-6 w-px bg-slate-800 hidden sm:block" />

        {/* Event Preset Title Input */}
        <div className="flex items-center gap-1.5">
          <input
            type="text"
            value={eventName}
            onChange={(e) => onEventNameChange(e.target.value)}
            placeholder="Event / Show Name..."
            className="px-2.5 py-1 text-xs bg-slate-900 text-slate-100 rounded-lg border border-slate-700/80 w-44 focus:border-blue-500 focus:outline-none transition-colors"
          />
          <button
            onClick={onSavePreset}
            title="Save Show Preset (.json)"
            className="p-1.5 rounded-lg bg-slate-900 hover:bg-slate-800 text-slate-300 border border-slate-700 transition-colors cursor-pointer"
          >
            <Save className="w-3.5 h-3.5" />
          </button>
          <button
            onClick={() => fileInputRef.current?.click()}
            title="Load Show Preset (.json)"
            className="p-1.5 rounded-lg bg-slate-900 hover:bg-slate-800 text-slate-300 border border-slate-700 transition-colors cursor-pointer"
          >
            <FolderOpen className="w-3.5 h-3.5" />
          </button>
          <input
            ref={fileInputRef}
            type="file"
            accept=".json"
            className="hidden"
            onChange={onLoadPreset}
          />

          <div className="h-5 w-px bg-slate-800 mx-0.5" />

          {/* Batch Import Button */}
          <button
            onClick={() => batchAudioInputRef.current?.click()}
            title="Nạp hàng loạt nhiều file audio cùng lúc vào các ô (hoặc kéo thả vào màn hình)"
            className="flex items-center gap-1.5 px-2.5 py-1 text-xs bg-indigo-950/80 hover:bg-indigo-900 text-indigo-300 border border-indigo-700/80 rounded-lg transition-colors cursor-pointer"
          >
            <FolderPlus className="w-3.5 h-3.5" />
            <span className="font-semibold hidden lg:inline">Nạp loạt file</span>
          </button>
          <input
            ref={batchAudioInputRef}
            type="file"
            multiple
            accept="audio/*,.mp3,.wav,.ogg,.flac,.m4a,.aac"
            className="hidden"
            onChange={(e) => {
              if (e.target.files && e.target.files.length > 0) {
                onBatchAudioFiles(Array.from(e.target.files));
                e.target.value = "";
              }
            }}
          />
        </div>
      </div>

      {/* Center: Active Tracks Counter & Fade Duration Slider */}
      <div className="flex items-center gap-4 text-xs font-mono">
        {/* Active Tracks Pill */}
        <div
          className={`flex items-center gap-1.5 px-3 py-1 rounded-full border transition-all ${
            activeCount > 0
              ? "bg-emerald-950/80 border-emerald-500 text-emerald-300 shadow-sm shadow-emerald-900"
              : "bg-slate-900 border-slate-800 text-slate-500"
          }`}
        >
          <span
            className={`w-2 h-2 rounded-full ${
              activeCount > 0 ? "bg-emerald-400 animate-ping" : "bg-slate-600"
            }`}
          />
          <span className="font-bold tracking-wider">
            {activeCount}/30 ACTIVE
          </span>
        </div>

        {/* Fade Out Duration */}
        <div className="flex items-center gap-2 bg-slate-900 px-3 py-1 rounded-lg border border-slate-800">
          <Sliders className="w-3.5 h-3.5 text-slate-400" />
          <span className="text-[11px] text-slate-400">Fade:</span>
          <input
            type="range"
            min="200"
            max="4000"
            step="200"
            value={fadeDurationMs}
            onChange={(e) => onFadeDurationChange(parseInt(e.target.value, 10))}
            className="w-16 h-1 bg-slate-700 rounded-lg appearance-none cursor-pointer accent-blue-500"
          />
          <span className="text-blue-400 font-bold min-w-[28px] text-right">
            {(fadeDurationMs / 1000).toFixed(1)}s
          </span>
        </div>
      </div>

      {/* Right: Master Volume & Panic Mute Button */}
      <div className="flex items-center gap-3">
        {/* Master Volume */}
        <div className="flex items-center gap-2 bg-slate-900 px-3 py-1.5 rounded-lg border border-slate-800">
          <Volume2 className="w-4 h-4 text-slate-300" />
          <input
            type="range"
            min="0"
            max="1"
            step="0.02"
            value={masterVolume}
            onChange={(e) => onMasterVolumeChange(parseFloat(e.target.value))}
            className="w-24 h-1.5 bg-slate-700 rounded-lg appearance-none cursor-pointer accent-blue-500"
          />
          <span className="text-xs font-mono font-bold text-slate-200 min-w-[32px] text-right">
            {Math.round(masterVolume * 100)}%
          </span>
        </div>

        {/* Panic Mute All Button */}
        <button
          onClick={onPanicStop}
          title="Emergency Stop / Mute All Tracks (Spacebar / Esc)"
          className="flex items-center gap-2 px-4 py-2 rounded-lg bg-rose-600 hover:bg-rose-500 active:scale-95 text-white font-black text-xs tracking-wider uppercase shadow-lg shadow-rose-950/60 transition-all cursor-pointer border border-rose-400"
        >
          <AlertOctagon className="w-4 h-4 animate-bounce" />
          <span>PANIC STOP</span>
        </button>
      </div>
    </header>
  );
};

