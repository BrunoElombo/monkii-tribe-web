import { useEffect, useRef, useState } from "react";
import { Link } from "react-router";
import { useTranslation } from "react-i18next";
import clsx from "clsx";
import { EllipsisHorizontalIcon, HeartIcon as HeartOutline, PlusIcon, TrashIcon } from "@heroicons/react/24/outline";
import { HeartIcon, PauseIcon, PlayIcon } from "@heroicons/react/24/solid";
import { useAuth } from "../auth/AuthProvider";
import { useAddToPlaylist, useLikedTracks, useMyPlaylists, useToggleLike } from "../hooks/catalog";
import { usePlayer } from "../player/PlayerProvider";
import type { Track } from "../types";
import { formatCount, formatDuration } from "../utils/format";
import { Cover } from "./Cover";
import { TrackCommerceItems } from "./TrackCommerce";
import { IconButton } from "./ui";

interface TrackListProps {
  tracks: Track[];
  /** Show cover thumbnails (lists mixing several releases) */
  showCover?: boolean;
  /** Show the play count column (artist top tracks) */
  showPlays?: boolean;
  numbered?: boolean;
  onRemove?: (track: Track) => void;
}

export function TrackList({ tracks, showCover = true, showPlays = false, numbered = false, onRemove }: TrackListProps) {
  const { playQueue, current, isPlaying, toggle } = usePlayer();

  return (
    <ol className="flex flex-col">
      {tracks.map((track, index) => {
        const isCurrent = current?.id === track.id;
        const playable = track.audioStatus === "READY";

        return (
          <li
            key={track.id}
            className={clsx(
              "group grid grid-cols-[2rem_1fr_auto] items-center gap-3 rounded-xl px-2 py-2 transition hover:bg-surface",
              isCurrent && "bg-surface",
            )}
          >
            <button
              type="button"
              disabled={!playable}
              onClick={() => (isCurrent ? toggle() : playQueue(tracks, index))}
              className="flex h-8 w-8 items-center justify-center text-sm text-muted disabled:opacity-40"
              aria-label={isCurrent && isPlaying ? "Pause" : `Play ${track.title}`}
            >
              {isCurrent && isPlaying ? (
                <PauseIcon className="h-4 w-4 text-monkii-500" />
              ) : (
                <>
                  <span className={clsx("group-hover:hidden", isCurrent && "text-monkii-500")}>{numbered ? track.trackNumber : index + 1}</span>
                  <PlayIcon className="hidden h-4 w-4 text-fg group-hover:block" />
                </>
              )}
            </button>

            <div className="flex min-w-0 items-center gap-3">
              {showCover && <Cover src={track.release.coverThumbUrl} alt="" className="h-10 w-10 shrink-0" rounded="rounded-md" />}
              <div className="min-w-0">
                <p className={clsx("truncate text-sm font-medium", isCurrent && "text-monkii-400")}>
                  {track.title}
                  {track.explicit && <span className="ml-2 rounded bg-elevated px-1 text-[10px] font-bold text-muted">E</span>}
                </p>
                <p className="truncate text-xs text-muted">
                  <Link to={`/artists/${track.artist.slug}`} className="hover:underline">{track.artist.stageName}</Link>
                  {track.featured.map((artist) => (
                    <span key={artist.id}>
                      {", "}
                      <Link to={`/artists/${artist.slug}`} className="hover:underline">{artist.stageName}</Link>
                    </span>
                  ))}
                </p>
              </div>
            </div>

            <div className="flex items-center gap-1">
              {showPlays && <PlayCount count={track.playCount} />}
              <LikeButton track={track} />
              <span className="hidden w-12 text-right text-xs tabular-nums text-muted sm:block">{formatDuration(track.durationMs)}</span>
              <TrackMenu track={track} onRemove={onRemove} />
            </div>
          </li>
        );
      })}
    </ol>
  );
}

function PlayCount({ count }: { count: number }) {
  const { i18n } = useTranslation();
  return <span className="mr-2 hidden text-xs tabular-nums text-muted md:block">{formatCount(count, i18n.language)}</span>;
}

export function LikeButton({ track, className }: { track: Track; className?: string }) {
  const { t } = useTranslation();
  const { user } = useAuth();
  const toggleLike = useToggleLike();
  // The player keeps its own copy of the track: the liked list is the source of truth
  const likedTracks = useLikedTracks();
  if (!user) return null;

  const liked = likedTracks.data ? likedTracks.data.some((item) => item.id === track.id) : Boolean(track.isLiked);
  return (
    <IconButton
      label={liked ? t("common.unlike") : t("common.like")}
      onClick={() => toggleLike.mutate({ trackId: track.id, liked })}
      disabled={toggleLike.isPending}
      className={className}
    >
      {liked ? <HeartIcon className="h-5 w-5 text-monkii-500" /> : <HeartOutline className="h-5 w-5" />}
    </IconButton>
  );
}

/** "•••" menu: add to one of my playlists, or remove from the current one. */
function TrackMenu({ track, onRemove }: { track: Track; onRemove?: (track: Track) => void }) {
  const { t } = useTranslation();
  const { user } = useAuth();
  const [open, setOpen] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const menuRef = useRef<HTMLDivElement>(null);
  const playlists = useMyPlaylists();
  const addToPlaylist = useAddToPlaylist();

  // Close when clicking anywhere else
  useEffect(() => {
    if (!open) return;
    const close = (event: MouseEvent) => {
      if (!menuRef.current?.contains(event.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", close);
    return () => document.removeEventListener("mousedown", close);
  }, [open]);

  useEffect(() => {
    if (!message) return;
    const timer = setTimeout(() => setMessage(null), 2000);
    return () => clearTimeout(timer);
  }, [message]);

  if (!user) return null;

  return (
    <div className="relative" ref={menuRef}>
      <IconButton label={t("common.more")} onClick={() => setOpen((o) => !o)}>
        <EllipsisHorizontalIcon className="h-5 w-5" />
      </IconButton>

      {message && (
        <span role="status" className="absolute right-0 top-10 z-30 whitespace-nowrap rounded-lg bg-monkii-500 px-3 py-1.5 text-xs font-semibold text-monkii-ink">
          {message}
        </span>
      )}

      {open && (
        <div className="absolute right-0 top-10 z-30 w-60 rounded-xl border border-line bg-surface p-1 shadow-2xl shadow-black/40">
          <p className="px-3 py-2 text-xs font-semibold uppercase tracking-wide text-muted">{t("common.addToPlaylist")}</p>
          {playlists.data?.length === 0 && <p className="px-3 pb-2 text-xs text-muted">{t("playlist.none")}</p>}
          {playlists.data?.map((playlist) => (
            <button
              key={playlist.id}
              type="button"
              className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-left text-sm hover:bg-elevated"
              onClick={() => {
                addToPlaylist.mutate(
                  { playlistId: playlist.id, trackId: track.id },
                  { onSuccess: () => setMessage(t("playlist.added", { name: playlist.title })) },
                );
                setOpen(false);
              }}
            >
              <PlusIcon className="h-4 w-4 text-muted" />
              <span className="truncate">{playlist.title}</span>
            </button>
          ))}
          <TrackCommerceItems track={track} close={() => setOpen(false)} notify={setMessage} />
          {onRemove && (
            <button
              type="button"
              className="mt-1 flex w-full items-center gap-2 rounded-lg border-t border-line px-3 py-2 text-left text-sm hover:bg-elevated"
              onClick={() => {
                onRemove(track);
                setOpen(false);
              }}
            >
              <TrashIcon className="h-4 w-4 text-muted" />
              {t("playlist.remove")}
            </button>
          )}
        </div>
      )}
    </div>
  );
}
