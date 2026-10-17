import { getOfflineLink, sendPlayBeacon } from "../services/catalog.service";
import type { Track } from "../types";

/**
 * Offline listening for Premium (MED-07).
 *
 * Audio is kept in IndexedDB, encrypted with AES-GCM. The key is a
 * non-extractable CryptoKey stored next to the data: the browser can use it,
 * but nobody can read it out to copy the files to another device. A copy
 * only plays while the Premium period it was saved under is still running.
 *
 * Play beacons sent without a connection are queued here as well and sent
 * when the device comes back online, so offline plays still count.
 */

const DB_NAME = "monkii-offline";
const DB_VERSION = 1;

interface StoredTrack {
  id: string;
  track: Track;
  iv: Uint8Array<ArrayBuffer>;
  data: ArrayBuffer;
  bytes: number;
  savedAt: string;
  /** Premium end date when the copy was saved */
  playableUntil: string;
}

export interface OfflineTrack {
  track: Track;
  bytes: number;
  savedAt: string;
  playableUntil: string;
}

interface QueuedBeacon {
  id?: number;
  body: Record<string, unknown>;
}

let database: Promise<IDBDatabase> | null = null;

function db(): Promise<IDBDatabase> {
  database ??= new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);
    request.onupgradeneeded = () => {
      const upgrade = request.result;
      upgrade.createObjectStore("keys");
      upgrade.createObjectStore("tracks", { keyPath: "id" });
      upgrade.createObjectStore("beacons", { keyPath: "id", autoIncrement: true });
    };
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
  return database;
}

/** Runs one request in its own transaction and resolves with its result. */
async function run<T>(store: string, mode: IDBTransactionMode, action: (s: IDBObjectStore) => IDBRequest): Promise<T> {
  const connection = await db();
  return new Promise((resolve, reject) => {
    const request = action(connection.transaction(store, mode).objectStore(store));
    request.onsuccess = () => resolve(request.result as T);
    request.onerror = () => reject(request.error);
  });
}

async function encryptionKey(): Promise<CryptoKey> {
  const existing = await run<CryptoKey | undefined>("keys", "readonly", (s) => s.get("audio"));
  if (existing) return existing;

  const key = await crypto.subtle.generateKey({ name: "AES-GCM", length: 256 }, false, ["encrypt", "decrypt"]);
  await run("keys", "readwrite", (s) => s.put(key, "audio"));
  return key;
}

export const isOfflineSupported = () => typeof indexedDB !== "undefined" && Boolean(globalThis.crypto?.subtle);

// ---------------------------------------------------------------- tracks

export async function saveOffline(track: Track, onProgress?: (percent: number) => void): Promise<void> {
  const { url, premiumUntil } = await getOfflineLink(track.id);

  const response = await fetch(url);
  if (!response.ok || !response.body) throw new Error("Download failed");

  // Read in chunks to report progress (the AAC file is a few MB)
  const total = Number(response.headers.get("content-length") ?? 0);
  const reader = response.body.getReader();
  const chunks: Uint8Array[] = [];
  let received = 0;
  for (;;) {
    const { done, value } = await reader.read();
    if (done) break;
    chunks.push(value);
    received += value.length;
    if (total) onProgress?.(Math.round((received / total) * 100));
  }
  const audio = await new Blob(chunks as BlobPart[]).arrayBuffer();

  const iv = crypto.getRandomValues(new Uint8Array(new ArrayBuffer(12)));
  const data = await crypto.subtle.encrypt({ name: "AES-GCM", iv }, await encryptionKey(), audio);

  const record: StoredTrack = { id: track.id, track, iv, data, bytes: audio.byteLength, savedAt: new Date().toISOString(), playableUntil: premiumUntil };
  await run("tracks", "readwrite", (s) => s.put(record));
  notifyChange();
}

export async function listOffline(): Promise<OfflineTrack[]> {
  if (!isOfflineSupported()) return [];
  const records = await run<StoredTrack[]>("tracks", "readonly", (s) => s.getAll());
  return records
    .map(({ track, bytes, savedAt, playableUntil }) => ({ track, bytes, savedAt, playableUntil }))
    .sort((a, b) => b.savedAt.localeCompare(a.savedAt));
}

export async function offlineIds(): Promise<Set<string>> {
  if (!isOfflineSupported()) return new Set();
  return new Set(await run<string[]>("tracks", "readonly", (s) => s.getAllKeys()));
}

/**
 * A blob: URL to play the saved copy, or null when there is none or when the
 * Premium period it was saved under is over.
 */
export async function offlineAudioUrl(trackId: string): Promise<string | null> {
  if (!isOfflineSupported()) return null;
  const record = await run<StoredTrack | undefined>("tracks", "readonly", (s) => s.get(trackId));
  if (!record || new Date(record.playableUntil) < new Date()) return null;

  const audio = await crypto.subtle.decrypt({ name: "AES-GCM", iv: record.iv }, await encryptionKey(), record.data);
  return URL.createObjectURL(new Blob([audio], { type: "audio/mp4" }));
}

/** After a renewal the saved copies keep playing until the new end date. */
export async function extendOffline(premiumUntil: string) {
  const records = await run<StoredTrack[]>("tracks", "readonly", (s) => s.getAll());
  for (const record of records) {
    if (record.playableUntil < premiumUntil) await run("tracks", "readwrite", (s) => s.put({ ...record, playableUntil: premiumUntil }));
  }
}

export async function removeOffline(trackId: string) {
  await run("tracks", "readwrite", (s) => s.delete(trackId));
  notifyChange();
}

/** On sign-out: the next person on this device must not get the downloads. */
export async function clearOffline() {
  if (!isOfflineSupported()) return;
  await run("tracks", "readwrite", (s) => s.clear());
  await run("beacons", "readwrite", (s) => s.clear());
  notifyChange();
}

// Screens listing downloads refresh when something changes
const listeners = new Set<() => void>();
export function onOfflineChange(listener: () => void) {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}
function notifyChange() {
  listeners.forEach((listener) => listener());
}

// ---------------------------------------------------------------- queued play beacons

export async function queueBeacon(body: Record<string, unknown>) {
  if (!isOfflineSupported()) return;
  await run("beacons", "readwrite", (s) => s.add({ body } satisfies QueuedBeacon));
}

/** Sends queued beacons in order; stops at the first failure and retries later. */
export async function flushBeacons() {
  if (!isOfflineSupported()) return;
  const queued = await run<QueuedBeacon[]>("beacons", "readonly", (s) => s.getAll());
  for (const beacon of queued) {
    try {
      await sendPlayBeacon(beacon.body);
    } catch (err) {
      // Network still down: keep the rest for later. Rejected by the API: drop it.
      if (err instanceof TypeError) return;
    }
    await run("beacons", "readwrite", (s) => s.delete(beacon.id!));
  }
}
