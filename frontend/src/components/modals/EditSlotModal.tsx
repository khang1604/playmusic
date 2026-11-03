import React, { useState } from "react";
import { X, Check, Trash2 } from "lucide-react";
import type { DeckSlotConfig, StageColor } from "../../types";

const STAGE_COLORS: { id: StageColor; name: string; bg: string; border: string }[] = [
  { id: "slate", name: "Slate (Default)", bg: "bg-slate-700", border: "border-slate-500" },
  { id: "blue", name: "Blue (Speech / MC)", bg: "bg-blue-600", border: "border-blue-400" },
  { id: "emerald", name: "Green (Ambience)", bg: "bg-emerald-600", border: "border-emerald-400" },
  { id: "amber", name: "Gold (Fanfare / Award)", bg: "bg-amber-600", border: "border-amber-400" },
  { id: "rose", name: "Red (Alert / Climax)", bg: "bg-rose-600", border: "border-rose-400" },
  { id: "purple", name: "Purple (Performance)", bg: "bg-purple-600", border: "border-purple-400" },
  { id: "cyan", name: "Cyan (SFX / Claps)", bg: "bg-cyan-600", border: "border-cyan-400" },
  { id: "orange", name: "Orange (Intermission)", bg: "bg-orange-600", border: "border-orange-400" }
];

interface EditSlotModalProps {
  slot: DeckSlotConfig;
  isOpen: boolean;
  onClose: () => void;
  onSave: (updated: Partial<DeckSlotConfig>) => void;
  onDelete?: (slotId: number) => void;
}

export const EditSlotModal: React.FC<EditSlotModalProps> = ({
  slot,
  isOpen,
  onClose,
  onSave,
  onDelete
}) => {
  const [label, setLabel] = useState(slot.label);
  const [keymap, setKeymap] = useState(slot.keymap);
  const [color, setColor] = useState<StageColor>(slot.color);
  const [cueInSeconds, setCueInSeconds] = useState(slot.cueInSeconds);

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSave({
      label: label.trim() || `Slot ${slot.id}`,
      keymap: keymap.trim().toUpperCase(),
      color,
      cueInSeconds: Math.max(0, cueInSeconds)
    });
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 backdrop-blur-sm p-4">
      <div className="w-full max-w-md bg-slate-900 border border-slate-700 rounded-xl shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-150">
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-slate-800 bg-slate-950/50">
          <h3 className="text-base font-bold text-slate-100 flex items-center gap-2">
            Configure Slot #{slot.id}
          </h3>
          <button
            onClick={onClose}
            className="p-1 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="p-5 space-y-4">
          {/* Label Input */}
          <div>
            <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-1.5">
              Slot Custom Label
            </label>
            <input
              type="text"
              value={label}
              onChange={(e) => setLabel(e.target.value)}
              placeholder="e.g. MC In, Trao Giai, Fanfare..."
              className="w-full px-3 py-2 bg-slate-950 text-slate-100 rounded-lg border border-slate-700 text-sm focus:border-blue-500 focus:outline-none transition-colors"
              maxLength={40}
            />
          </div>

          {/* Hotkey & Cue In Row */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-1.5">
                Trigger Key
              </label>
              <input
                type="text"
                value={keymap}
                onChange={(e) => setKeymap(e.target.value.slice(-1))}
                className="w-full px-3 py-2 bg-slate-950 text-slate-100 rounded-lg border border-slate-700 text-sm font-mono text-center font-bold uppercase focus:border-blue-500 focus:outline-none transition-colors"
                maxLength={4}
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-1.5">
                Cue In (Seconds)
              </label>
              <input
                type="number"
                min="0"
                step="0.5"
                value={cueInSeconds}
                onChange={(e) => setCueInSeconds(parseFloat(e.target.value) || 0)}
                className="w-full px-3 py-2 bg-slate-950 text-slate-100 rounded-lg border border-slate-700 text-sm font-mono text-center focus:border-blue-500 focus:outline-none transition-colors"
              />
            </div>
          </div>

          {/* Color Coding Palette */}
          <div>
            <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-2">
              Stage Identification Color
            </label>
            <div className="grid grid-cols-4 gap-2">
              {STAGE_COLORS.map((c) => (
                <button
                  key={c.id}
                  type="button"
                  onClick={() => setColor(c.id)}
                  className={`flex items-center justify-between px-2.5 py-2 rounded-lg border text-xs font-medium transition-all ${
                    color === c.id
                      ? `${c.bg} text-white border-white ring-2 ring-white/50 shadow-md`
                      : "bg-slate-950/60 text-slate-400 border-slate-800 hover:border-slate-700 hover:text-slate-200"
                  }`}
                >
                  <span className="truncate">{c.name.split(" ")[0]}</span>
                  {color === c.id && <Check className="w-3.5 h-3.5 flex-shrink-0" />}
                </button>
              ))}
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex items-center justify-between gap-2.5 pt-3 border-t border-slate-800">
            {onDelete ? (
              <button
                type="button"
                onClick={() => {
                  if (confirm(`Bạn có chắc chắn muốn xóa Slot #${slot.id} (${slot.label}) không?`)) {
                    onDelete(slot.id);
                    onClose();
                  }
                }}
                className="flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-semibold text-rose-400 hover:text-white hover:bg-rose-900/60 border border-rose-900/50 transition-colors cursor-pointer"
              >
                <Trash2 className="w-3.5 h-3.5" />
                <span>Xóa ô này</span>
              </button>
            ) : <div />}

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 rounded-lg text-sm font-medium text-slate-300 hover:bg-slate-800 transition-colors cursor-pointer"
              >
                Hủy
              </button>
              <button
                type="submit"
                className="px-5 py-2 rounded-lg text-sm font-bold bg-blue-600 hover:bg-blue-500 text-white shadow-lg shadow-blue-900/30 transition-all active:scale-95 cursor-pointer"
              >
                Lưu cài đặt
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
};

