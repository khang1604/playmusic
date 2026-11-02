import { z } from "zod";

/**
 * 8 Stage Colors for Quick Visual Identification in Dark Venues
 */
export const StageColorEnum = z.enum([
  "slate",   // Default / Uncategorized
  "blue",    // MC / Speech / Welcome
  "emerald", // Ambient / Background Music
  "amber",   // Awards / Fanfare / Victory
  "rose",    // Emergency / Alarm / Warning
  "purple",  // Performances / Live Vocals
  "cyan",    // Sound Effects / SFX / Claps
  "orange"   // Intermission / Teaser
]);

export type StageColor = z.infer<typeof StageColorEnum>;

/**
 * Single Deck Slot Configuration Schema
 */
export const DeckSlotSchema = z.object({
  id: z.number().int().min(1).max(30),
  keymap: z.string().min(1).max(10), // e.g. "1", "Q", "A"
  label: z.string().max(40).default("Empty Slot"),
  fileName: z.string().nullable().default(null),
  filePath: z.string().nullable().default(null),
  fileUrl: z.string().nullable().default(null),
  durationSeconds: z.number().nonnegative().default(0),
  cueInSeconds: z.number().nonnegative().default(0), // numerical start point
  volume: z.number().min(0).max(1).default(1.0), // 0.0 - 1.0
  isMuted: z.boolean().default(false), // Individual Mute
  isLooping: z.boolean().default(false), // Loop vs One-shot
  color: StageColorEnum.default("slate")
});

export type DeckSlotConfig = z.infer<typeof DeckSlotSchema>;

/**
 * Event Preset Workspace Schema (JSON export/import)
 */
export const EventPresetSchema = z.object({
  version: z.literal("1.0.0"),
  eventName: z.string().min(1).max(100),
  createdAt: z.string().datetime(),
  slots: z.array(DeckSlotSchema).length(30),
  masterVolume: z.number().min(0).max(1).default(1.0),
  fadeDurationMs: z.number().min(100).max(10000).default(1000)
});

export type EventPreset = z.infer<typeof EventPresetSchema>;

/**
 * Standard JSend API Response Envelope Schema
 */
export const JSendSuccessSchema = <T extends z.ZodTypeAny>(dataSchema: T) =>
  z.object({
    success: z.literal(true),
    data: dataSchema,
    message: z.string().optional()
  });

export const JSendErrorSchema = z.object({
  success: z.literal(false),
  error: z.object({
    code: z.string().regex(/^[A-Z0-9_]+$/),
    message: z.string(),
    details: z.unknown().optional()
  })
});

export type JSendError = z.infer<typeof JSendErrorSchema>;
