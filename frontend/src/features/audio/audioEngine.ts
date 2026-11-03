import { logger } from "../../utils/logger";
import type { DeckRuntimeState, PlaybackStatus } from "../../types";

interface Channel {
  id: number;
  buffer: AudioBuffer | null;
  source: AudioBufferSourceNode | null;
  gainNode: GainNode;
  status: PlaybackStatus;
  startedAt: number;
  pausedAt: number;
  volume: number;
  isMuted: boolean;
  isLooping: boolean;
  cueInSeconds: number;
  listeners: Set<(state: DeckRuntimeState) => void>;
}

class AudioEngine {
  private ctx: AudioContext | null = null;
  private masterGain: GainNode | null = null;
  private analyserLeft: AnalyserNode | null = null;
  private analyserRight: AnalyserNode | null = null;
  private exclusiveMode: boolean = false;
  private channels: Map<number, Channel> = new Map();
  private tickerId: number | null = null;

  constructor() {
    // Lazily initialized on first user gesture
  }

  private initContext(): AudioContext {
    if (!this.ctx) {
      const AudioCtx = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      this.ctx = new AudioCtx({ latencyHint: "interactive" });
      this.masterGain = this.ctx.createGain();

      // Split master into Left & Right for Stereo VU Meter
      const splitter = this.ctx.createChannelSplitter(2);
      this.analyserLeft = this.ctx.createAnalyser();
      this.analyserRight = this.ctx.createAnalyser();
      this.analyserLeft.fftSize = 128;
      this.analyserRight.fftSize = 128;

      this.masterGain.connect(splitter);
      splitter.connect(this.analyserLeft, 0);
      splitter.connect(this.analyserRight, 1);

      this.masterGain.connect(this.ctx.destination);
      this.startPlaybackTicker();
      logger.info("Web AudioContext initialized with Stereo Analyser successfully");
    }
    if (this.ctx.state === "suspended") {
      this.ctx.resume();
    }
    return this.ctx;
  }

  public getChannel(slotId: number): Channel {
    const ctx = this.initContext();
    let channel = this.channels.get(slotId);
    if (!channel) {
      const gainNode = ctx.createGain();
      if (this.masterGain) {
        gainNode.connect(this.masterGain);
      }
      channel = {
        id: slotId,
        buffer: null,
        source: null,
        gainNode,
        status: "idle",
        startedAt: 0,
        pausedAt: 0,
        volume: 1.0,
        isMuted: false,
        isLooping: false,
        cueInSeconds: 0,
        listeners: new Set()
      };
      this.channels.set(slotId, channel);
    }
    return channel;
  }

  public async loadAudioFile(slotId: number, file: File): Promise<AudioBuffer> {
    const ctx = this.initContext();
    const channel = this.getChannel(slotId);
    channel.status = "loading";
    this.notify(channel);

    try {
      const arrayBuffer = await file.arrayBuffer();
      const decodedBuffer = await ctx.decodeAudioData(arrayBuffer);
      channel.buffer = decodedBuffer;
      channel.status = "idle";
      channel.pausedAt = channel.cueInSeconds;
      this.notify(channel);
      logger.info(`Loaded audio file for slot ${slotId}`, {
        name: file.name,
        duration: decodedBuffer.duration
      });
      return decodedBuffer;
    } catch (err) {
      channel.status = "idle";
      this.notify(channel);
      logger.error(`Failed to decode audio for slot ${slotId}`, err);
      throw err;
    }
  }

  public async loadAudioBuffer(slotId: number, arrayBuffer: ArrayBuffer, fileName: string): Promise<AudioBuffer> {
    const ctx = this.initContext();
    const channel = this.getChannel(slotId);
    channel.status = "loading";
    this.notify(channel);

    try {
      const decodedBuffer = await ctx.decodeAudioData(arrayBuffer);
      channel.buffer = decodedBuffer;
      channel.status = "idle";
      channel.pausedAt = channel.cueInSeconds;
      this.notify(channel);
      logger.info(`Decoded raw audio buffer for slot ${slotId}`, {
        name: fileName,
        duration: decodedBuffer.duration
      });
      return decodedBuffer;
    } catch (err) {
      channel.status = "idle";
      this.notify(channel);
      logger.error(`Failed to decode raw audio for slot ${slotId}`, err);
      throw err;
    }
  }

  public play(slotId: number, fadeMs = 0) {
    const ctx = this.initContext();
    const channel = this.getChannel(slotId);
    if (!channel.buffer) return;

    if (channel.status === "playing") return;

    // Exclusive Mode: Automatically fade out any other actively playing track
    if (this.exclusiveMode) {
      for (const [id, ch] of this.channels.entries()) {
        if (id !== slotId && ch.status === "playing") {
          this.stop(id, fadeMs);
        }
      }
    }

    // Disconnect old source if exists
    if (channel.source) {
      try {
        channel.source.stop();
        channel.source.disconnect();
      } catch {
        // Safe to ignore
      }
    }

    const source = ctx.createBufferSource();
    source.buffer = channel.buffer;
    source.loop = channel.isLooping;
    source.connect(channel.gainNode);

    // If resuming from paused state, use pausedAt. If starting fresh (idle), use cueInSeconds.
    let offset = channel.status === "paused" && channel.pausedAt > 0
      ? channel.pausedAt
      : channel.cueInSeconds;

    if (channel.buffer && offset >= channel.buffer.duration) {
      offset = 0;
    }

    const duration = channel.buffer.duration;

    source.onended = () => {
      if (channel.status === "playing" && !channel.isLooping) {
        channel.status = "idle";
        channel.pausedAt = channel.cueInSeconds;
        this.notify(channel);
      }
    };

    source.start(0, offset);
    channel.source = source;
    channel.startedAt = ctx.currentTime - offset;
    channel.status = "playing";
    this.updateGain(channel);
    this.notify(channel);
    logger.debug(`Slot ${slotId} playing at offset ${offset}s (Duration: ${duration}s)`);
  }

  public pause(slotId: number, fadeMs = 0) {
    const ctx = this.initContext();
    const channel = this.getChannel(slotId);
    if (channel.status !== "playing" || !channel.source) return;

    const elapsed = ctx.currentTime - channel.startedAt;
    channel.pausedAt = channel.buffer ? elapsed % channel.buffer.duration : elapsed;

    if (fadeMs > 0) {
      const now = ctx.currentTime;
      channel.gainNode.gain.setValueAtTime(channel.gainNode.gain.value, now);
      channel.gainNode.gain.linearRampToValueAtTime(0.001, now + fadeMs / 1000);
      setTimeout(() => {
        try {
          channel.source?.stop();
          channel.source?.disconnect();
        } catch { /* ignored */ }
        channel.status = "paused";
        this.notify(channel);
      }, fadeMs);
    } else {
      try {
        channel.source.stop();
        channel.source.disconnect();
      } catch { /* ignored */ }
      channel.status = "paused";
      this.notify(channel);
    }
  }

  public stop(slotId: number, fadeMs = 0) {
    const ctx = this.initContext();
    const channel = this.getChannel(slotId);
    if (!channel.source) {
      channel.status = "idle";
      channel.pausedAt = channel.cueInSeconds;
      this.notify(channel);
      return;
    }

    if (fadeMs > 0 && channel.status === "playing") {
      const now = ctx.currentTime;
      channel.gainNode.gain.setValueAtTime(channel.gainNode.gain.value, now);
      channel.gainNode.gain.linearRampToValueAtTime(0.001, now + fadeMs / 1000);
      setTimeout(() => {
        try {
          channel.source?.stop();
          channel.source?.disconnect();
        } catch { /* ignored */ }
        channel.status = "idle";
        channel.pausedAt = channel.cueInSeconds;
        this.updateGain(channel);
        this.notify(channel);
      }, fadeMs);
    } else {
      try {
        channel.source.stop();
        channel.source.disconnect();
      } catch { /* ignored */ }
      channel.status = "idle";
      channel.pausedAt = channel.cueInSeconds;
      this.updateGain(channel);
      this.notify(channel);
    }
  }

  public seek(slotId: number, targetTimeSeconds: number) {
    const ctx = this.initContext();
    const channel = this.getChannel(slotId);
    if (!channel.buffer) return;

    const clampedTime = Math.max(0, Math.min(targetTimeSeconds, channel.buffer.duration));
    channel.pausedAt = clampedTime;

    if (channel.status === "playing") {
      if (channel.source) {
        try {
          channel.source.onended = null;
          channel.source.stop();
          channel.source.disconnect();
        } catch { /* ignored */ }
      }

      const source = ctx.createBufferSource();
      source.buffer = channel.buffer;
      source.loop = channel.isLooping;
      source.connect(channel.gainNode);

      source.onended = () => {
        if (channel.status === "playing" && !channel.isLooping) {
          channel.status = "idle";
          channel.pausedAt = 0;
          this.notify(channel);
        }
      };

      source.start(0, clampedTime);
      channel.source = source;
      channel.startedAt = ctx.currentTime - clampedTime;
      channel.status = "playing";
      this.updateGain(channel);
    }

    this.notify(channel);
    logger.debug(`Slot ${slotId} seeked to ${clampedTime.toFixed(2)}s`);
  }

  public togglePlayPause(slotId: number, fadeMs = 0) {
    const channel = this.getChannel(slotId);
    if (channel.status === "playing") {
      this.pause(slotId, fadeMs);
    } else {
      this.play(slotId, fadeMs);
    }
  }

  public setExclusiveMode(enabled: boolean) {
    this.exclusiveMode = enabled;
    logger.info(`Exclusive mode set to: ${enabled}`);
  }

  public isExclusiveMode(): boolean {
    return this.exclusiveMode;
  }

  public getMasterLevels(): { left: number; right: number } {
    if (!this.analyserLeft || !this.analyserRight) {
      return { left: 0, right: 0 };
    }
    const dataL = new Uint8Array(this.analyserLeft.frequencyBinCount);
    const dataR = new Uint8Array(this.analyserRight.frequencyBinCount);
    this.analyserLeft.getByteTimeDomainData(dataL);
    this.analyserRight.getByteTimeDomainData(dataR);

    let sumL = 0;
    let sumR = 0;
    for (let i = 0; i < dataL.length; i++) {
      const valL = (dataL[i] - 128) / 128;
      const valR = (dataR[i] - 128) / 128;
      sumL += valL * valL;
      sumR += valR * valR;
    }
    const rmsL = Math.sqrt(sumL / dataL.length);
    const rmsR = Math.sqrt(sumR / dataR.length);
    return {
      left: Math.min(1, rmsL * 3.5),
      right: Math.min(1, rmsR * 3.5)
    };
  }

  public removeChannel(slotId: number) {
    const channel = this.channels.get(slotId);
    if (channel) {
      try {
        if (channel.source) {
          channel.source.onended = null;
          channel.source.stop();
          channel.source.disconnect();
        }
        channel.gainNode.disconnect();
      } catch {
        // Safe to ignore
      }
      this.channels.delete(slotId);
      logger.info(`Channel ${slotId} removed from AudioEngine`);
    }
  }

  public toggleMute(slotId: number) {
    const channel = this.getChannel(slotId);
    channel.isMuted = !channel.isMuted;
    this.updateGain(channel);
    this.notify(channel);
    logger.debug(`Slot ${slotId} mute toggled: ${channel.isMuted}`);
  }

  public setVolume(slotId: number, volume: number) {
    const channel = this.getChannel(slotId);
    channel.volume = Math.max(0, Math.min(1, volume));
    this.updateGain(channel);
  }

  public setLoop(slotId: number, isLooping: boolean) {
    const channel = this.getChannel(slotId);
    channel.isLooping = isLooping;
    if (channel.source) {
      channel.source.loop = isLooping;
    }
    this.notify(channel);
  }

  public setCueIn(slotId: number, seconds: number) {
    const channel = this.getChannel(slotId);
    channel.cueInSeconds = Math.max(0, seconds);
    if (channel.status === "idle") {
      channel.pausedAt = channel.cueInSeconds;
    }
    this.notify(channel);
  }

  public setMasterVolume(volume: number) {
    if (this.masterGain && this.ctx) {
      const clamped = Math.max(0, Math.min(1, volume));
      this.masterGain.gain.setValueAtTime(clamped, this.ctx.currentTime);
    }
  }

  public panicMuteAll(fadeMs = 200) {
    logger.warn("PANIC MUTE ALL TRIGGERED");
    for (const [id, channel] of this.channels.entries()) {
      if (channel.status === "playing") {
        this.stop(id, fadeMs);
      }
    }
  }

  private updateGain(channel: Channel) {
    if (!this.ctx) return;
    const targetGain = channel.isMuted ? 0 : channel.volume;
    channel.gainNode.gain.setValueAtTime(targetGain, this.ctx.currentTime);
  }

  public subscribe(slotId: number, callback: (state: DeckRuntimeState) => void) {
    const channel = this.getChannel(slotId);
    channel.listeners.add(callback);
    callback(this.getRuntimeState(channel));
    return () => {
      channel.listeners.delete(callback);
    };
  }

  private getRuntimeState(channel: Channel): DeckRuntimeState {
    let currentTime =
      channel.status === "idle" ? channel.cueInSeconds : channel.pausedAt;
    let remainingTime = 0;
    if (channel.buffer) {
      const dur = channel.buffer.duration;
      if (channel.status === "playing" && this.ctx) {
        const raw = this.ctx.currentTime - channel.startedAt;
        currentTime = channel.isLooping ? raw % dur : Math.min(raw, dur);
      }
      remainingTime = Math.max(0, dur - currentTime);
    }
    return {
      id: channel.id,
      status: channel.status,
      currentTime,
      remainingTime,
      audioBuffer: channel.buffer
    };
  }

  private notify(channel: Channel) {
    const state = this.getRuntimeState(channel);
    channel.listeners.forEach((fn) => fn(state));
  }

  private startPlaybackTicker() {
    if (this.tickerId) return;
    const tick = () => {
      for (const channel of this.channels.values()) {
        if (channel.status === "playing" && channel.listeners.size > 0) {
          this.notify(channel);
        }
      }
      this.tickerId = requestAnimationFrame(tick);
    };
    this.tickerId = requestAnimationFrame(tick);
  }

  public getActivePlayingCount(): number {
    let count = 0;
    for (const channel of this.channels.values()) {
      if (channel.status === "playing") count++;
    }
    return count;
  }
}

export const audioEngine = new AudioEngine();
