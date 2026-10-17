import { createContext, ReactNode, useCallback, useContext, useEffect, useMemo, useRef, useState } from "react";
import Hls from "hls.js";
import { useNavigate } from "react-router";
import { useAuth } from "../auth/AuthProvider";
import { clearOffline, flushBeacons, offlineAudioUrl, queueBeacon } from "../offline/offline-store";
import { getStreamUrl, sendPlayBeacon } from "../services/catalog.service";
import type { Track } from "../types";
import { artistLine } from "../utils/format";

/** A play counts for charts and royalties after 30 seconds of listening (SRS 1.4). */
const QUALIFIED_AFTER_SECONDS = 30;

/** off: stop after the last song · all: loop the list · one: loop the current song */
export type RepeatMode = "off" | "all" | "one";
const NEXT_REPEAT: Record<RepeatMode, RepeatMode> = { off: "all", all: "one", one: "off" };

interface PlayerState {
  /** Songs in playing order (shuffled when shuffle is on) */
  queue: Track[];
  index: number;
  isPlaying: boolean;
  isLoading: boolean;
  position: number;
  duration: number;
  volume: number;
  repeat: RepeatMode;
  shuffle: boolean;
  /** Bumped every time a song must (re)start: a reordered queue alone does not restart it */
  playId: number;
}

interface PlayerContextValue extends Omit<PlayerState, "playId"> {
  current: Track | null;
  /**
   * Replaces the queue and starts playing. Without a start index (the
   * "Shuffle" buttons) and with shuffle on, the first song is random.
   */
  playQueue(tracks: Track[], startIndex?: number, options?: { shuffle?: boolean }): void;
  toggle(): void;
  next(): void;
  previous(): void;
  seek(seconds: number): void;
  setVolume(volume: number): void;
  toggleRepeat(): void;
  toggleShuffle(): void;
}

/** Fisher–Yates shuffle, on a copy. */
function shuffled<T>(items: T[]): T[] {
  const copy = [...items];
  for (let i = copy.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [copy[i], copy[j]] = [copy[j], copy[i]];
  }
  return copy;
}

const PlayerContext = createContext<PlayerContextValue | null>(null);

type Beacon = "start" | "qualified" | "complete" | "skip";

export function PlayerProvider({ children }: { children: ReactNode }) {
  const { user } = useAuth();
  const navigate = useNavigate();

  const audioRef = useRef<HTMLAudioElement | null>(null);
  const hlsRef = useRef<Hls | null>(null);
  // blob: URL of the offline copy being played, revoked when the track changes
  const blobUrlRef = useRef<string | null>(null);
  // Listening statistics of the current track (reset on every track change)
  const playSession = useRef({ id: "", listened: 0, lastTime: 0, qualified: false, completed: false });
  // The list in its own order, to come back to when shuffle is turned off
  const originalQueue = useRef<Track[]>([]);

  const [state, setState] = useState<PlayerState>({
    queue: [],
    index: -1,
    isPlaying: false,
    isLoading: false,
    position: 0,
    duration: 0,
    volume: 0.9,
    repeat: "off",
    shuffle: false,
    playId: 0,
  });

  const current = state.index >= 0 ? state.queue[state.index] ?? null : null;

  // ---------------------------------------------------------------- audio element

  if (!audioRef.current && typeof Audio !== "undefined") {
    audioRef.current = new Audio();
    audioRef.current.preload = "auto";
  }

  const sendBeacon = useCallback((stage: Beacon, track: Track | null) => {
    if (!track || !user) return;
    const audio = audioRef.current;
    const body = { trackId: track.id, stage, positionSec: audio?.currentTime ?? 0, sessionId: playSession.current.id };

    // Offline listening still counts: the beacon waits for the connection (MED-07)
    if (!navigator.onLine) {
      void queueBeacon(body);
      return;
    }
    void sendPlayBeacon(body).catch((err) => {
      if (err instanceof TypeError) void queueBeacon(body); // network error, not a refusal
    }); // statistics must never break playback
  }, [user]);

  /** Fetches a fresh signed URL and attaches it with hls.js (or natively on Safari). */
  const load = useCallback(async (track: Track, resumeAt = 0) => {
    const audio = audioRef.current;
    if (!audio) return;

    setState((s) => ({ ...s, isLoading: true }));

    hlsRef.current?.destroy();
    hlsRef.current = null;
    if (blobUrlRef.current) {
      URL.revokeObjectURL(blobUrlRef.current);
      blobUrlRef.current = null;
    }

    // A saved Premium copy plays without network (and without using data)
    const offlineUrl = await offlineAudioUrl(track.id).catch(() => null);
    if (offlineUrl) {
      blobUrlRef.current = offlineUrl;
      audio.src = offlineUrl;
      audio.currentTime = resumeAt;
      await audio.play().catch(() => setState((s) => ({ ...s, isPlaying: false })));
      return;
    }

    const { url } = await getStreamUrl(track.id);

    if (Hls.isSupported()) {
      const hls = new Hls({ maxBufferLength: 30, startPosition: resumeAt });
      hls.on(Hls.Events.ERROR, (_event, data) => {
        if (!data.fatal) return;
        if (data.type === Hls.ErrorTypes.NETWORK_ERROR) {
          // Most likely the 10-minute playback link expired: get a new one and resume
          void load(track, audio.currentTime);
        } else {
          hls.recoverMediaError();
        }
      });
      hls.loadSource(url);
      hls.attachMedia(audio);
      hlsRef.current = hls;
    } else if (audio.canPlayType("application/vnd.apple.mpegurl")) {
      audio.src = url;
      audio.currentTime = resumeAt;
    }

    await audio.play().catch(() => setState((s) => ({ ...s, isPlaying: false })));
  }, []);

  // (Re)start a song each time playId changes: new song, repeat of the same one…
  useEffect(() => {
    if (!current || state.playId === 0) return;
    playSession.current = { id: crypto.randomUUID(), listened: 0, lastTime: 0, qualified: false, completed: false };
    load(current).then(
      () => sendBeacon("start", current),
      () => setState((s) => ({ ...s, isLoading: false, isPlaying: false })),
    );
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [state.playId]);

  // Wire audio element events once
  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;

    const onTime = () => {
      const session = playSession.current;
      const delta = audio.currentTime - session.lastTime;
      // Only count real listening, not seeking
      if (delta > 0 && delta < 2) session.listened += delta;
      session.lastTime = audio.currentTime;

      setState((s) => ({ ...s, position: audio.currentTime, duration: Number.isFinite(audio.duration) ? audio.duration : s.duration }));

      if (!session.qualified && session.listened >= QUALIFIED_AFTER_SECONDS) {
        session.qualified = true;
        sendBeacon("qualified", currentRef.current);
      }
    };
    const onPlay = () => setState((s) => ({ ...s, isPlaying: true, isLoading: false }));
    const onPause = () => setState((s) => ({ ...s, isPlaying: false }));
    const onWaiting = () => setState((s) => ({ ...s, isLoading: true }));
    const onPlaying = () => setState((s) => ({ ...s, isLoading: false }));
    const onEnded = () => {
      playSession.current.completed = true;
      sendBeacon("complete", currentRef.current);
      advance(1, true);
    };

    audio.addEventListener("timeupdate", onTime);
    audio.addEventListener("play", onPlay);
    audio.addEventListener("pause", onPause);
    audio.addEventListener("waiting", onWaiting);
    audio.addEventListener("playing", onPlaying);
    audio.addEventListener("ended", onEnded);
    return () => {
      audio.removeEventListener("timeupdate", onTime);
      audio.removeEventListener("play", onPlay);
      audio.removeEventListener("pause", onPause);
      audio.removeEventListener("waiting", onWaiting);
      audio.removeEventListener("playing", onPlaying);
      audio.removeEventListener("ended", onEnded);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sendBeacon]);

  // Event handlers above need the latest values without re-binding
  const currentRef = useRef<Track | null>(null);
  currentRef.current = current;
  const stateRef = useRef(state);
  stateRef.current = state;

  // ---------------------------------------------------------------- controls

  /**
   * Next / previous song. `automatic` is true when a song ended by itself:
   * then "repeat one" plays it again, while a tap on "next" always moves on.
   */
  const advance = useCallback((direction: 1 | -1, automatic = false) => {
    const { queue, index, repeat } = stateRef.current;
    if (queue.length === 0) return;

    if (!automatic && !playSession.current.completed) sendBeacon("skip", currentRef.current);

    if (automatic && repeat === "one") {
      setState((s) => ({ ...s, position: 0, playId: s.playId + 1 }));
      return;
    }

    let nextIndex = index + direction;
    if (nextIndex >= queue.length) {
      if (repeat === "off") {
        // End of the list: stop, ready to start again from the top
        audioRef.current?.pause();
        if (audioRef.current) audioRef.current.currentTime = 0;
        return;
      }
      nextIndex = 0;
    }
    if (nextIndex < 0) nextIndex = repeat === "all" ? queue.length - 1 : 0;

    setState((s) => ({ ...s, index: nextIndex, position: 0, playId: s.playId + 1 }));
  }, [sendBeacon]);

  const playQueue = useCallback((tracks: Track[], startIndex?: number, options: { shuffle?: boolean } = {}) => {
    const playable = tracks.filter((t) => t.audioStatus === "READY");
    if (playable.length === 0) return;

    if (!user) {
      navigate("/login", { state: { from: location.pathname } });
      return;
    }

    const shuffle = options.shuffle ?? stateRef.current.shuffle;
    originalQueue.current = playable;

    let queue = playable;
    let index = Math.max(0, startIndex === undefined ? 0 : playable.findIndex((t) => t.id === tracks[startIndex]?.id));
    if (shuffle) {
      // The chosen song first (or a random one for "Shuffle"), then the others mixed
      const first = startIndex === undefined ? playable[Math.floor(Math.random() * playable.length)] : playable[index];
      queue = [first, ...shuffled(playable.filter((t) => t.id !== first.id))];
      index = 0;
    }

    setState((s) => ({ ...s, queue, index, shuffle, position: 0, duration: 0, playId: s.playId + 1 }));
  }, [user, navigate]);

  /** Mixes the songs after the current one (or puts the list back in order) without interrupting it. */
  const toggleShuffle = useCallback(() => {
    setState((s) => {
      const playing = s.queue[s.index];
      if (!playing) return { ...s, shuffle: !s.shuffle };

      if (!s.shuffle) {
        const rest = shuffled(originalQueue.current.filter((t) => t.id !== playing.id));
        return { ...s, shuffle: true, queue: [playing, ...rest], index: 0 };
      }
      const original = originalQueue.current.length ? originalQueue.current : s.queue;
      return { ...s, shuffle: false, queue: original, index: Math.max(0, original.findIndex((t) => t.id === playing.id)) };
    });
  }, []);

  const toggle = useCallback(() => {
    const audio = audioRef.current;
    if (!audio || !currentRef.current) return;
    if (audio.paused) void audio.play();
    else audio.pause();
  }, []);

  const seek = useCallback((seconds: number) => {
    if (audioRef.current) audioRef.current.currentTime = seconds;
  }, []);

  const setVolume = useCallback((volume: number) => {
    if (audioRef.current) audioRef.current.volume = volume;
    setState((s) => ({ ...s, volume }));
  }, []);

  const toggleRepeat = useCallback(() => setState((s) => ({ ...s, repeat: NEXT_REPEAT[s.repeat] })), []);

  // Stop everything on sign-out, and forget the downloads of the previous person
  const hadUser = useRef(false);
  useEffect(() => {
    if (user) {
      hadUser.current = true;
      return;
    }
    audioRef.current?.pause();
    hlsRef.current?.destroy();
    hlsRef.current = null;
    setState((s) => ({ ...s, queue: [], index: -1, isPlaying: false, position: 0 }));
    originalQueue.current = [];
    if (hadUser.current) void clearOffline();
  }, [user]);

  // Plays listened to offline are sent once the connection is back
  useEffect(() => {
    if (!user) return;
    void flushBeacons();
    const flush = () => void flushBeacons();
    window.addEventListener("online", flush);
    return () => window.removeEventListener("online", flush);
  }, [user]);

  // ---------------------------------------------------------------- lock-screen controls (Media Session API)

  useEffect(() => {
    if (!("mediaSession" in navigator) || !current) return;

    const artwork = current.release.coverUrl
      ? [{ src: current.release.coverUrl, sizes: "640x640", type: "image/webp" }]
      : [{ src: "/pwa-512.png", sizes: "512x512", type: "image/png" }];

    navigator.mediaSession.metadata = new MediaMetadata({
      title: current.title,
      artist: artistLine(current),
      album: current.release.title,
      artwork,
    });
    navigator.mediaSession.setActionHandler("play", toggle);
    navigator.mediaSession.setActionHandler("pause", toggle);
    navigator.mediaSession.setActionHandler("nexttrack", () => advance(1));
    navigator.mediaSession.setActionHandler("previoustrack", () => advance(-1));
    navigator.mediaSession.setActionHandler("seekto", (details) => details.seekTime !== undefined && seek(details.seekTime));
  }, [current, toggle, advance, seek]);

  const value = useMemo<PlayerContextValue>(
    () => ({
      queue: state.queue,
      index: state.index,
      isPlaying: state.isPlaying,
      isLoading: state.isLoading,
      position: state.position,
      duration: state.duration,
      volume: state.volume,
      repeat: state.repeat,
      shuffle: state.shuffle,
      current,
      playQueue,
      toggle,
      next: () => advance(1),
      // "Previous" restarts the song unless we are in its first seconds
      previous: () => (state.position > 3 ? seek(0) : advance(-1)),
      seek,
      setVolume,
      toggleRepeat,
      toggleShuffle,
    }),
    [state, current, playQueue, toggle, advance, seek, setVolume, toggleRepeat, toggleShuffle],
  );

  return <PlayerContext.Provider value={value}>{children}</PlayerContext.Provider>;
}

export function usePlayer(): PlayerContextValue {
  const context = useContext(PlayerContext);
  if (!context) throw new Error("usePlayer must be used inside <PlayerProvider>");
  return context;
}
