import { useCallback, useEffect, useState } from "react";
import type { Track } from "../types";
import { listOffline, OfflineTrack, offlineIds, onOfflineChange, removeOffline, saveOffline } from "./offline-store";

/** Ids of the tracks saved on this device, kept up to date. */
export function useOfflineIds(): Set<string> {
  const [ids, setIds] = useState<Set<string>>(new Set());
  useEffect(() => {
    const load = () => void offlineIds().then(setIds).catch(() => undefined);
    load();
    return onOfflineChange(load);
  }, []);
  return ids;
}

export function useOfflineTracks() {
  const [tracks, setTracks] = useState<OfflineTrack[] | null>(null);
  useEffect(() => {
    const load = () => void listOffline().then(setTracks).catch(() => setTracks([]));
    load();
    return onOfflineChange(load);
  }, []);
  return tracks;
}

/** Saves tracks one after the other and reports progress (Premium only). */
export function useSaveOffline() {
  const [progress, setProgress] = useState<{ done: number; total: number; percent: number } | null>(null);
  const [error, setError] = useState<unknown>(null);

  const save = useCallback(async (tracks: Track[]) => {
    const playable = tracks.filter((t) => t.audioStatus === "READY");
    setError(null);
    try {
      for (let i = 0; i < playable.length; i++) {
        setProgress({ done: i, total: playable.length, percent: 0 });
        await saveOffline(playable[i], (percent) => setProgress({ done: i, total: playable.length, percent }));
      }
    } catch (err) {
      setError(err);
    } finally {
      setProgress(null);
    }
  }, []);

  return { save, progress, error, remove: removeOffline };
}
