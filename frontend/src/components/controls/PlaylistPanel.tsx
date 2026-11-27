import React, { useState } from "react";
import {
  ListMusic,
  Repeat,
  Play,
  Pause,
  SkipBack,
  SkipForward,
  Square,
  ChevronUp,
  ChevronDown,
  X,
  ArrowUpDown,
  Plus,
  Trash2
} from "lucide-react";

export interface PlaylistTrackItem {
  id: number;
  label: string;
  keymap: string;
  hasAudio: boolean;
}

export interface PlaylistPanelProps {
  items: PlaylistTrackItem[];
  hasAnyLoadedAudio: boolean;
  isPlaylistActive: boolean;
  isCurrentPlaying: boolean;
  activePlaylistSlotId: number | null;
  playlistLoop: boolean;
  onTogglePlayPause: () => void;
  onPrev: () => void;
  onNext: () => void;
  onStopPlaylist: () => void;
  onToggleLoop: () => void;
  onSelectSlot: (slotId: number) => void;
  onMoveSlot: (slotId: number, direction: "up" | "down") => void;
  onRemoveSlot: (slotId: number) => void;
  onSyncByKeymapOrder: () => void;
  onAddAllLoadedSlots: () => void;
  onClearPlaylist: () => void;
}

export const PlaylistPanel: React.FC<PlaylistPanelProps> = ({
  items,
  hasAnyLoadedAudio,
  isPlaylistActive,
  isCurrentPlaying,
  activePlaylistSlotId,
  playlistLoop,
  onTogglePlayPause,
  onPrev,
  onNext,
  onStopPlaylist,
  onToggleLoop,
  onSelectSlot,
  onMoveSlot,
  onRemoveSlot,
  onSyncByKeymapOrder,
  onAddAllLoadedSlots,
  onClearPlaylist
}) => {
  const [isExpanded, setIsExpanded] = useState(true);

  const playableCount = items.filter((item) => item.hasAudio).length;
  const activeIndex = items.findIndex((item) => item.id === activePlaylistSlotId);
  const activeItem = activeIndex >= 0 ? items[activeIndex] : null;

  return (
    <div className="playlist-card p-2.5 bg-slate-900/85 rounded-xl border border-slate-800/90 space-y-2">
      {/* Header Row */}
      <div className="flex items-center justify-between gap-1">
        <button
          type="button"
          onClick={() => setIsExpanded((prev) => !prev)}
          aria-label={isExpanded ? "Thu gọn danh sách Playlist" : "Mở rộng danh sách Playlist"}
          title="Nhấn để ẩn/hiện danh sách hàng đợi Playlist"
          className="flex items-center gap-1.5 text-[11px] font-black uppercase tracking-wider text-slate-200 hover:text-emerald-300 transition-colors cursor-pointer focus-visible:outline focus-visible:outline-2 focus-visible:outline-blue-400 rounded"
        >
          <ListMusic className="w-3.5 h-3.5 text-emerald-400 flex-shrink-0" />
          <span>Playlist</span>
          <span className="px-1.5 py-0.5 rounded bg-slate-800 text-[10px] font-mono text-emerald-400">
            {items.length}
          </span>
        </button>

        <div className="flex items-center gap-1">
          <button
            type="button"
            onClick={onToggleLoop}
            aria-label={playlistLoop ? "Tắt lặp lại Playlist" : "Bật lặp lại Playlist"}
            title={
              playlistLoop
                ? "Đang BẬT lặp lại toàn bộ Playlist (Hết bài cuối tự quay lại bài đầu)"
                : "Đang TẮT lặp Playlist (Chạy hết 1 lượt rồi dừng)"
            }
            className={`px-1.5 py-1 rounded-md text-[10px] font-bold flex items-center gap-1 transition-colors cursor-pointer focus-visible:outline focus-visible:outline-2 focus-visible:outline-blue-400 ${
              playlistLoop
                ? "bg-emerald-950 text-emerald-300 ring-1 ring-emerald-500/70"
                : "bg-slate-950 text-slate-500 border border-slate-800 hover:text-slate-300"
            }`}
          >
            <Repeat className="w-3 h-3" />
            <span>Lặp</span>
          </button>
        </div>
      </div>

      {/* Status Line */}
      <div className="px-2 py-1 rounded-lg bg-slate-950/90 border border-slate-800/80 flex items-center gap-1.5 min-h-[26px]">
        <span
          className={`w-2 h-2 rounded-full flex-shrink-0 ${
            isPlaylistActive && isCurrentPlaying
              ? "bg-emerald-400 animate-pulse"
              : isPlaylistActive
              ? "bg-amber-400"
              : "bg-slate-600"
          }`}
        />
        <span className="text-[11px] truncate text-slate-300 font-medium">
          {items.length === 0
            ? "Bấm icon danh sách trên ô nhạc để thêm"
            : activeItem && isPlaylistActive
            ? `${activeIndex + 1}/${items.length}: ${activeItem.label}`
            : `Sẵn sàng (${playableCount} bài có nhạc)`}
        </span>
      </div>

      {/* Transport Controls */}
      <div className="grid grid-cols-4 gap-1.5">
        <button
          type="button"
          onClick={onPrev}
          disabled={playableCount === 0}
          aria-label="Bài trước trong Playlist"
          title="Lùi về bài trước trong Playlist"
          className="py-1.5 rounded-lg bg-slate-950 hover:bg-slate-800 text-slate-300 border border-slate-800 disabled:opacity-30 disabled:cursor-not-allowed flex items-center justify-center transition-colors cursor-pointer focus-visible:outline focus-visible:outline-2 focus-visible:outline-blue-400"
        >
          <SkipBack className="w-3.5 h-3.5" />
        </button>

        <button
          type="button"
          onClick={onTogglePlayPause}
          disabled={playableCount === 0}
          aria-label={isPlaylistActive && isCurrentPlaying ? "Tạm dừng Playlist" : "Phát Playlist"}
          title={
            isPlaylistActive && isCurrentPlaying
              ? "Tạm dừng Playlist"
              : "Bắt đầu / Tiếp tục phát nối tiếp Playlist"
          }
          className={`py-1.5 rounded-lg font-bold text-xs flex items-center justify-center transition-all cursor-pointer disabled:opacity-30 disabled:cursor-not-allowed focus-visible:outline focus-visible:outline-2 focus-visible:outline-blue-400 ${
            isPlaylistActive && isCurrentPlaying
              ? "bg-amber-400 text-black hover:bg-amber-300 shadow-sm"
              : "bg-emerald-600 text-white hover:bg-emerald-500 shadow-sm"
          }`}
        >
          {isPlaylistActive && isCurrentPlaying ? (
            <Pause className="w-3.5 h-3.5" />
          ) : (
            <Play className="w-3.5 h-3.5" />
          )}
        </button>

        <button
          type="button"
          onClick={onNext}
          disabled={playableCount === 0}
          aria-label="Bài tiếp theo trong Playlist"
          title="Chuyển sang bài kế tiếp trong Playlist"
          className="py-1.5 rounded-lg bg-slate-950 hover:bg-slate-800 text-slate-300 border border-slate-800 disabled:opacity-30 disabled:cursor-not-allowed flex items-center justify-center transition-colors cursor-pointer focus-visible:outline focus-visible:outline-2 focus-visible:outline-blue-400"
        >
          <SkipForward className="w-3.5 h-3.5" />
        </button>

        <button
          type="button"
          onClick={onStopPlaylist}
          disabled={!isPlaylistActive && !isCurrentPlaying}
          aria-label="Dừng hẳn Playlist"
          title="Dừng phát và tắt tự động chuyển bài Playlist"
          className="py-1.5 rounded-lg bg-slate-950 hover:bg-rose-950 hover:text-rose-300 text-slate-400 border border-slate-800 disabled:opacity-30 disabled:cursor-not-allowed flex items-center justify-center transition-colors cursor-pointer focus-visible:outline focus-visible:outline-2 focus-visible:outline-blue-400"
        >
          <Square className="w-3.5 h-3.5" />
        </button>
      </div>

      {/* Expandable Queue Management & Track List */}
      {isExpanded && (
        <div className="space-y-1.5 pt-1 border-t border-slate-800/70">
          {/* Quick Queue Toolbar */}
          <div className="flex items-center justify-between gap-1">
            <button
              type="button"
              onClick={onAddAllLoadedSlots}
              disabled={!hasAnyLoadedAudio}
              title="Thêm nhanh toàn bộ các ô đang có file nhạc vào Playlist"
              className="flex-1 py-1 px-1.5 rounded bg-slate-950 hover:bg-slate-800 text-[10px] font-semibold text-slate-300 border border-slate-800 disabled:opacity-30 disabled:cursor-not-allowed flex items-center justify-center gap-1 transition-colors cursor-pointer focus-visible:outline focus-visible:outline-2 focus-visible:outline-blue-400"
            >
              <Plus className="w-3 h-3 text-emerald-400" />
              <span>Thêm tất cả</span>
            </button>

            <button
              type="button"
              onClick={onSyncByKeymapOrder}
              disabled={items.length < 2}
              title="Sắp xếp lại thứ tự các bài trong Playlist theo đúng thứ tự phím tắt"
              className="py-1 px-1.5 rounded bg-slate-950 hover:bg-slate-800 text-[10px] font-semibold text-slate-300 border border-slate-800 disabled:opacity-30 disabled:cursor-not-allowed flex items-center justify-center gap-1 transition-colors cursor-pointer focus-visible:outline focus-visible:outline-2 focus-visible:outline-blue-400"
            >
              <ArrowUpDown className="w-3 h-3 text-blue-400" />
              <span>Theo phím</span>
            </button>

            <button
              type="button"
              onClick={onClearPlaylist}
              disabled={items.length === 0}
              aria-label="Xóa sạch danh sách Playlist"
              title="Xóa sạch danh sách hàng đợi Playlist (không xóa ô nhạc)"
              className="py-1 px-1.5 rounded bg-slate-950 hover:bg-rose-950 text-slate-400 hover:text-rose-300 border border-slate-800 disabled:opacity-30 disabled:cursor-not-allowed flex items-center justify-center transition-colors cursor-pointer focus-visible:outline focus-visible:outline-2 focus-visible:outline-blue-400"
            >
              <Trash2 className="w-3 h-3" />
            </button>
          </div>

          {/* Queue Track List */}
          {items.length > 0 && (
            <div className="max-h-28 overflow-y-auto space-y-1 pr-0.5">
              {items.map((item, idx) => {
                const isSelected = item.id === activePlaylistSlotId && isPlaylistActive;
                return (
                  <div
                    key={item.id}
                    className={`flex items-center justify-between gap-1 px-1.5 py-1 rounded-md text-[11px] border transition-colors ${
                      isSelected
                        ? "bg-emerald-950/60 border-emerald-500/60 text-emerald-200"
                        : "bg-slate-950/70 border-slate-800/70 text-slate-300 hover:border-slate-700"
                    }`}
                  >
                    <button
                      type="button"
                      onClick={() => onSelectSlot(item.id)}
                      disabled={!item.hasAudio}
                      title={
                        item.hasAudio
                          ? `Click để phát Playlist ngay từ bài "${item.label}"`
                          : "Ô này chưa có file nhạc"
                      }
                      className="flex items-center gap-1.5 flex-1 min-w-0 text-left cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed focus-visible:outline focus-visible:outline-2 focus-visible:outline-blue-400 rounded"
                    >
                      <span className="font-mono text-[10px] text-slate-500 flex-shrink-0">
                        {idx + 1}.
                      </span>
                      {item.keymap && (
                        <span className="px-1 py-0.2 rounded bg-slate-800 text-[9px] font-mono font-bold text-slate-300 flex-shrink-0">
                          {item.keymap}
                        </span>
                      )}
                      <span className="truncate font-medium">{item.label}</span>
                    </button>

                    <div className="flex items-center gap-0.5 flex-shrink-0">
                      <button
                        type="button"
                        onClick={() => onMoveSlot(item.id, "up")}
                        disabled={idx === 0}
                        aria-label={`Đưa ${item.label} lên trên`}
                        title="Đẩy lên trên"
                        className="p-0.5 rounded text-slate-400 hover:text-white hover:bg-slate-800 disabled:opacity-20 cursor-pointer"
                      >
                        <ChevronUp className="w-3 h-3" />
                      </button>
                      <button
                        type="button"
                        onClick={() => onMoveSlot(item.id, "down")}
                        disabled={idx === items.length - 1}
                        aria-label={`Đưa ${item.label} xuống dưới`}
                        title="Đẩy xuống dưới"
                        className="p-0.5 rounded text-slate-400 hover:text-white hover:bg-slate-800 disabled:opacity-20 cursor-pointer"
                      >
                        <ChevronDown className="w-3 h-3" />
                      </button>
                      <button
                        type="button"
                        onClick={() => onRemoveSlot(item.id)}
                        aria-label={`Gỡ ${item.label} khỏi Playlist`}
                        title="Gỡ khỏi Playlist"
                        className="p-0.5 rounded text-slate-500 hover:text-rose-400 hover:bg-slate-800 cursor-pointer"
                      >
                        <X className="w-3 h-3" />
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}
    </div>
  );
};
