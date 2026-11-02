export * from "./schemas";

export type PlaybackStatus = "idle" | "playing" | "paused" | "loading";

export interface DeckRuntimeState {
  id: number;
  status: PlaybackStatus;
  currentTime: number;
  remainingTime: number;
  audioBuffer: AudioBuffer | null;
}

export interface JSendResponse<T> {
  success: boolean;
  data?: T;
  message?: string;
  error?: {
    code: string;
    message: string;
    details?: unknown;
  };
}
