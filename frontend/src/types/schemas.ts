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
 * Single Deck Slot Configuration Schema (Robust & Permissive for Long Song Titles)
 */
export const DeckSlotSchema = z.object({
  id: z.number().int().min(1),
  keymap: z.string().default(""),
  label: z.string().default("Empty Slot"),
  fileName: z.string().nullable().default(null),
  filePath: z.string().nullable().default(null),
  fileUrl: z.string().nullable().default(null),
  durationSeconds: z.number().default(0),
  cueInSeconds: z.number().default(0),
  volume: z.number().default(1.0),
  isMuted: z.boolean().default(false),
  isLooping: z.boolean().default(false),
  color: StageColorEnum.catch("slate").default("slate")
});

export type DeckSlotConfig = z.infer<typeof DeckSlotSchema>;

/**
 * Event Preset Workspace Schema (JSON export/import)
 */
export const EventPresetSchema = z.object({
  version: z.string().default("1.0.0"),
  eventName: z.string().default("PlayMusic Show"),
  createdAt: z.string().default(() => new Date().toISOString()),
  slots: z.array(DeckSlotSchema),
  masterVolume: z.number().default(1.0),
  fadeDurationMs: z.number().default(1000),
  exclusiveMode: z.boolean().default(false)
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
