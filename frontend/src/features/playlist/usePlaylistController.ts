import { useState, useEffect, useRef, useCallback } from "react";
import { audioEngine } from "../audio/audioEngine";
import { compareSlotsByKeymap } from "../../utils/slotSorting";
import { logger } from "../../utils/logger";
import type { DeckSlotConfig } from "../../types";

const STORAGE_KEY_PLAYLIST = "playmusic_session_playlist";
const STORAGE_KEY_PLAYLIST_LOOP = "playmusic_session_playlist_loop";
const STATUS_POLL_MS = 200;

interface UsePlaylistControllerParams {
  slots: DeckSlotConfig[];
  fadeDurationMs: number;
  exclusiveMode: boolean;
}

export function usePlaylistController({
  slots,
  fadeDurationMs,
  exclusiveMode
}: UsePlaylistControllerParams) {
  const [playlistSlotIds, setPlaylistSlotIds] = useState<number[]>(() => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY_PLAYLIST);
      if (!raw) return [];
      const parsed: unknown = JSON.parse(raw);
      return Array.isArray(parsed)
        ? parsed.filter((id): id is number => typeof id === "number" && id >= 1)
        : [];
    } catch {
      return [];
    }
  });

  const [playlistLoop, setPlaylistLoop] = useState<boolean>(() => {
    const saved = localStorage.getItem(STORAGE_KEY_PLAYLIST_LOOP);
    return saved === null ? true : saved === "true";
  });

  const [isPlaylistActive, setIsPlaylistActive] = useState(false);
  const [activePlaylistSlotId, setActivePlaylistSlotId] = useState<number | null>(null);
  const [isCurrentPlaying, setIsCurrentPlaying] = useState(false);

  const slotsRef = useRef(slots);
  slotsRef.current = slots;
  const playlistIdsRef = useRef(playlistSlotIds);
  playlistIdsRef.current = playlistSlotIds;
  const playlistLoopRef = useRef(playlistLoop);
  playlistLoopRef.current = playlistLoop;
  const isPlaylistActiveRef = useRef(isPlaylistActive);
  isPlaylistActiveRef.current = isPlaylistActive;
  const activeSlotIdRef = useRef(activePlaylistSlotId);
  activeSlotIdRef.current = activePlaylistSlotId;

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY_PLAYLIST, JSON.stringify(playlistSlotIds));
    } catch {
      // Ignore storage quota errors
    }
  }, [playlistSlotIds]);

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY_PLAYLIST_LOOP, `${playlistLoop}`);
    } catch {
      // Ignore storage quota errors
    }
  }, [playlistLoop]);

  // Poll active playlist slot playback status for responsive UI transport button
  useEffect(() => {
    const updateStatus = () => {
      const currentId = activeSlotIdRef.current;
      if (currentId === null) {
        setIsCurrentPlaying(false);
        return;
      }
      setIsCurrentPlaying(audioEngine.getSlotStatus(currentId) === "playing");
    };
    updateStatus();
    const timer = setInterval(updateStatus, STATUS_POLL_MS);
    return () => clearInterval(timer);
  }, [activePlaylistSlotId, isPlaylistActive]);

  const getPlayableQueueIds = useCallback((): number[] => {
    const slotMap = new Map(slotsRef.current.map((s) => [s.id, s]));
    return playlistIdsRef.current.filter((id) => {
      const slot = slotMap.get(id);
      return Boolean(slot && slot.fileName);
    });
  }, []);

  // Auto-Next listener when a non-looping track finishes naturally
  useEffect(() => {
    return audioEngine.subscribeTrackEnded((endedSlotId) => {
      if (!isPlaylistActiveRef.current || endedSlotId !== activeSlotIdRef.current) {
        return;
      }

      const playableIds = getPlayableQueueIds();
      if (playableIds.length === 0) {
        setIsPlaylistActive(false);
        setActivePlaylistSlotId(null);
        return;
      }

      const fullQueue = playlistIdsRef.current;
      const endedIdx = fullQueue.indexOf(endedSlotId);
      const playableSet = new Set(playableIds);

      let nextId: number | null = null;
      for (let i = endedIdx + 1; i < fullQueue.length; i++) {
        if (playableSet.has(fullQueue[i])) {
          nextId = fullQueue[i];
          break;
        }
      }

      if (nextId === null && playlistLoopRef.current) {
        nextId = playableIds[0] ?? null;
      }

      if (nextId === null) {
        setIsPlaylistActive(false);
        logger.info("Playlist completed full pass and stopped");
        return;
      }

      setActivePlaylistSlotId(nextId);
      audioEngine.play(nextId, 0);
      logger.info(`Playlist auto-advanced to slot #${nextId}`);
    });
  }, [getPlayableQueueIds]);

  const disarmPlaylist = useCallback(() => {
    setIsPlaylistActive(false);
  }, []);

  const stopPlaylist = useCallback(() => {
    const currentId = activeSlotIdRef.current;
    setIsPlaylistActive(false);
    if (currentId !== null) {
      audioEngine.stop(currentId, fadeDurationMs);
    }
  }, [fadeDurationMs]);

  const togglePlaylistPlayPause = useCallback(() => {
    const playableIds = getPlayableQueueIds();
    if (playableIds.length === 0) {
      alert("Playlist chưa có bài nhạc nào sẵn sàng phát. Hãy bấm nút + Playlist trên các ô có nhạc!");
      return;
    }

    const currentId = activeSlotIdRef.current;
    const targetId =
      currentId !== null && playableIds.includes(currentId) ? currentId : playableIds[0];

    const status = audioEngine.getSlotStatus(targetId);
    if (isPlaylistActiveRef.current && status === "playing") {
      audioEngine.pause(targetId, fadeDurationMs);
      setIsCurrentPlaying(false);
      return;
    }

    if (currentId !== null && currentId !== targetId && audioEngine.getSlotStatus(currentId) === "playing") {
      audioEngine.stop(currentId, fadeDurationMs);
    }

    setActivePlaylistSlotId(targetId);
    setIsPlaylistActive(true);
    audioEngine.play(targetId, fadeDurationMs);
    setIsCurrentPlaying(true);
  }, [fadeDurationMs, getPlayableQueueIds]);

  const stepPlaylist = useCallback(
    (direction: 1 | -1) => {
      const playableIds = getPlayableQueueIds();
      if (playableIds.length === 0) return;

      const currentId = activeSlotIdRef.current;
      const currentIdx = currentId !== null ? playableIds.indexOf(currentId) : -1;
      const nextIdx =
        currentIdx === -1
          ? 0
          : (currentIdx + direction + playableIds.length) % playableIds.length;
      const targetId = playableIds[nextIdx];

      if (currentId !== null && currentId !== targetId && audioEngine.getSlotStatus(currentId) === "playing") {
        audioEngine.stop(currentId, Math.min(fadeDurationMs, 300));
      }

      setActivePlaylistSlotId(targetId);
      setIsPlaylistActive(true);
      audioEngine.play(targetId, 0);
      setIsCurrentPlaying(true);
    },
    [fadeDurationMs, getPlayableQueueIds]
  );

  const selectAndPlaySlot = useCallback(
    (slotId: number) => {
      const playableIds = getPlayableQueueIds();
      if (!playableIds.includes(slotId)) return;

      const currentId = activeSlotIdRef.current;
      if (currentId !== null && currentId !== slotId && audioEngine.getSlotStatus(currentId) === "playing") {
        audioEngine.stop(currentId, Math.min(fadeDurationMs, 300));
      }

      setActivePlaylistSlotId(slotId);
      setIsPlaylistActive(true);
      audioEngine.play(slotId, 0);
      setIsCurrentPlaying(true);
    },
    [fadeDurationMs, getPlayableQueueIds]
  );

  const toggleSlotInPlaylist = useCallback((slotId: number) => {
    setPlaylistSlotIds((prev) => {
      if (prev.includes(slotId)) {
        if (activeSlotIdRef.current === slotId) {
          setIsPlaylistActive(false);
          setActivePlaylistSlotId(null);
        }
        return prev.filter((id) => id !== slotId);
      }
      return [...prev, slotId];
    });
  }, []);

  const moveSlotInPlaylist = useCallback((slotId: number, direction: "up" | "down") => {
    setPlaylistSlotIds((prev) => {
      const idx = prev.indexOf(slotId);
      if (idx === -1) return prev;
      const targetIdx = direction === "up" ? idx - 1 : idx + 1;
      if (targetIdx < 0 || targetIdx >= prev.length) return prev;
      const copy = [...prev];
      [copy[idx], copy[targetIdx]] = [copy[targetIdx], copy[idx]];
      return copy;
    });
  }, []);

  const syncPlaylistByKeymapOrder = useCallback(() => {
    const slotMap = new Map(slotsRef.current.map((s) => [s.id, s]));
    setPlaylistSlotIds((prev) =>
      [...prev].sort((idA, idB) => {
        const slotA = slotMap.get(idA);
        const slotB = slotMap.get(idB);
        if (!slotA || !slotB) return idA - idB;
        return compareSlotsByKeymap(slotA, slotB);
      })
    );
  }, []);

  const addAllLoadedSlots = useCallback(() => {
    const loadedIds = slotsRef.current.filter((s) => Boolean(s.fileName)).map((s) => s.id);
    setPlaylistSlotIds((prev) => {
      const existing = new Set(prev);
      const additions = loadedIds.filter((id) => !existing.has(id));
      return [...prev, ...additions];
    });
  }, []);

  const clearPlaylist = useCallback(() => {
    stopPlaylist();
    setActivePlaylistSlotId(null);
    setPlaylistSlotIds([]);
  }, [stopPlaylist]);

  const notifyManualSlotTrigger = useCallback(
    (slotId: number) => {
      if (!isPlaylistActiveRef.current) return;
      if (exclusiveMode && slotId !== activeSlotIdRef.current) {
        if (playlistIdsRef.current.includes(slotId)) {
          setActivePlaylistSlotId(slotId);
        } else {
          // Manual stage cue outside playlist triggered in Exclusive mode -> disarm Auto-Next safely
          setIsPlaylistActive(false);
          logger.info(`Playlist disarmed because external cue slot #${slotId} was triggered`);
        }
      }
    },
    [exclusiveMode]
  );

  const notifyManualSlotStop = useCallback((slotId: number) => {
    if (isPlaylistActiveRef.current && slotId === activeSlotIdRef.current) {
      setIsPlaylistActive(false);
    }
  }, []);

  const removeDeletedSlotFromPlaylist = useCallback((slotId: number) => {
    if (activeSlotIdRef.current === slotId) {
      setIsPlaylistActive(false);
      setActivePlaylistSlotId(null);
    }
    setPlaylistSlotIds((prev) => prev.filter((id) => id !== slotId));
  }, []);

  const applyPresetPlaylist = useCallback((slotIds: number[], loop: boolean) => {
    setIsPlaylistActive(false);
    setActivePlaylistSlotId(null);
    setPlaylistSlotIds(slotIds);
    setPlaylistLoop(loop);
  }, []);

  const resetPlaylistAll = useCallback(() => {
    setIsPlaylistActive(false);
    setActivePlaylistSlotId(null);
    setPlaylistSlotIds([]);
    setPlaylistLoop(true);
    try {
      localStorage.removeItem(STORAGE_KEY_PLAYLIST);
      localStorage.removeItem(STORAGE_KEY_PLAYLIST_LOOP);
    } catch {
      // Ignore
    }
  }, []);

  return {
    playlistSlotIds,
    playlistLoop,
    setPlaylistLoop,
    isPlaylistActive,
    activePlaylistSlotId,
    isCurrentPlaying,
    disarmPlaylist,
    stopPlaylist,
    togglePlaylistPlayPause,
    playNext: () => stepPlaylist(1),
    playPrev: () => stepPlaylist(-1),
    selectAndPlaySlot,
    toggleSlotInPlaylist,
    moveSlotInPlaylist,
    syncPlaylistByKeymapOrder,
    addAllLoadedSlots,
    clearPlaylist,
    notifyManualSlotTrigger,
    notifyManualSlotStop,
    removeDeletedSlotFromPlaylist,
    applyPresetPlaylist,
    resetPlaylistAll
  };
}
