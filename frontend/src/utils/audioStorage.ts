import { logger } from "./logger";

const DB_NAME = "PlayMusicDB";
const STORE_NAME = "audio_slots";
const DB_VERSION = 1;

function openDB(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    if (typeof indexedDB === "undefined") {
      reject(new Error("IndexedDB not supported in this environment"));
      return;
    }
    const request = indexedDB.open(DB_NAME, DB_VERSION);
    request.onupgradeneeded = (e) => {
      const db = (e.target as IDBOpenDBRequest).result;
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        db.createObjectStore(STORE_NAME, { keyPath: "slotId" });
      }
    };
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

export interface CachedAudioEntry {
  slotId: number;
  fileName: string;
  blob: Blob;
  updatedAt: string;
}

export async function saveSlotAudio(
  slotId: number,
  fileOrBlob: File | Blob,
  fileName?: string
): Promise<void> {
  try {
    const db = await openDB();
    const resolvedName =
      fileName ||
      (fileOrBlob instanceof File ? fileOrBlob.name : `track_${slotId}.audio`);

    return new Promise((resolve, reject) => {
      const tx = db.transaction(STORE_NAME, "readwrite");
      const store = tx.objectStore(STORE_NAME);
      const entry: CachedAudioEntry = {
        slotId,
        fileName: resolvedName,
        blob: fileOrBlob,
        updatedAt: new Date().toISOString()
      };
      store.put(entry);
      tx.oncomplete = () => {
        logger.debug(`Cached audio blob to IndexedDB for slot #${slotId}`);
        resolve();
      };
      tx.onerror = () => reject(tx.error);
    });
  } catch (err) {
    logger.warn(`Failed to cache audio blob for slot #${slotId}`, err);
  }
}

export async function getSlotAudio(slotId: number): Promise<CachedAudioEntry | null> {
  try {
    const db = await openDB();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(STORE_NAME, "readonly");
      const store = tx.objectStore(STORE_NAME);
      const request = store.get(slotId);
      request.onsuccess = () => resolve(request.result || null);
      request.onerror = () => reject(request.error);
    });
  } catch (err) {
    logger.warn(`Failed to read cached audio for slot #${slotId}`, err);
    return null;
  }
}

export async function getAllCachedAudios(): Promise<CachedAudioEntry[]> {
  try {
    const db = await openDB();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(STORE_NAME, "readonly");
      const store = tx.objectStore(STORE_NAME);
      const request = store.getAll();
      request.onsuccess = () => resolve(request.result || []);
      request.onerror = () => reject(request.error);
    });
  } catch (err) {
    logger.warn("Failed to retrieve cached audio entries", err);
    return [];
  }
}

export async function findAudioByFileName(fileName: string): Promise<CachedAudioEntry | null> {
  try {
    const all = await getAllCachedAudios();
    const target = fileName.toLowerCase().trim();
    const match = all.find(
      (a) => a.fileName && a.fileName.toLowerCase().trim() === target
    );
    return match || null;
  } catch (err) {
    logger.warn(`Failed to find audio for ${fileName}`, err);
    return null;
  }
}

export function blobToBase64(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onloadend = () => {
      if (typeof reader.result === "string") {
        resolve(reader.result);
      } else {
        reject(new Error("Failed to convert blob to base64 string"));
      }
    };
    reader.onerror = reject;
    reader.readAsDataURL(blob);
  });
}

export async function base64ToArrayBuffer(base64: string): Promise<ArrayBuffer> {
  const res = await fetch(base64);
  return await res.arrayBuffer();
}

export async function deleteSlotAudio(slotId: number): Promise<void> {
  try {
    const db = await openDB();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(STORE_NAME, "readwrite");
      const store = tx.objectStore(STORE_NAME);
      store.delete(slotId);
      tx.oncomplete = () => {
        logger.debug(`Deleted cached audio for slot #${slotId}`);
        resolve();
      };
      tx.onerror = () => reject(tx.error);
    });
  } catch (err) {
    logger.warn(`Failed to delete cached audio for slot #${slotId}`, err);
  }
}

export async function clearAllSlotAudio(): Promise<void> {
  try {
    const db = await openDB();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(STORE_NAME, "readwrite");
      const store = tx.objectStore(STORE_NAME);
      store.clear();
      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error);
    });
  } catch (err) {
    logger.warn("Failed to clear audio cache", err);
  }
}
