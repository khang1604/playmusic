import type { DeckSlotConfig } from "../types";

/**
 * Extended 45 keyboard hotkeys ordered by physical keyboard rows:
 * Row 1-2: Digits 1-9 then 0 (10 slots)
 * Row 3-7: Letters Q-P, A-L, Z-M (26 slots)
 * Fallback symbols for > 36 slots
 */
export const DEFAULT_KEYMAPS: readonly string[] = [
  "1", "2", "3", "4", "5", "6", "7", "8", "9", "0",
  "Q", "W", "E", "R", "T",
  "Y", "U", "I", "O", "P",
  "A", "S", "D", "F", "G",
  "H", "J", "K", "L", "Z",
  "X", "C", "V", "B", "N",
  "M",
  "-", "=", "[", "]", ";", "'", ",", ".", "/"
];

const KEYMAP_RANK_MAP = new Map<string, number>(
  DEFAULT_KEYMAPS.map((key, index) => [key.toUpperCase(), index])
);

const GROUP_STANDARD_KEY = 0;
const GROUP_CUSTOM_KEY = 1;
const GROUP_EMPTY_KEY = 2;

function getKeymapGroup(normalizedKey: string): number {
  if (!normalizedKey) return GROUP_EMPTY_KEY;
  return KEYMAP_RANK_MAP.has(normalizedKey) ? GROUP_STANDARD_KEY : GROUP_CUSTOM_KEY;
}

export function compareSlotsByKeymap(a: DeckSlotConfig, b: DeckSlotConfig): number {
  const normA = a.keymap.trim().toUpperCase();
  const normB = b.keymap.trim().toUpperCase();

  const groupA = getKeymapGroup(normA);
  const groupB = getKeymapGroup(normB);
  if (groupA !== groupB) {
    return groupA - groupB;
  }

  if (groupA === GROUP_STANDARD_KEY) {
    const rankDiff = (KEYMAP_RANK_MAP.get(normA) ?? 0) - (KEYMAP_RANK_MAP.get(normB) ?? 0);
    if (rankDiff !== 0) return rankDiff;
  }

  if (groupA === GROUP_CUSTOM_KEY) {
    const alphaDiff = normA.localeCompare(normB);
    if (alphaDiff !== 0) return alphaDiff;
  }

  return a.id - b.id;
}

/**
 * Returns a new array of slots sorted by assigned trigger keymap without mutating slot IDs.
 */
export function sortSlotsByKeymap(slots: DeckSlotConfig[]): DeckSlotConfig[] {
  return [...slots].sort(compareSlotsByKeymap);
}
