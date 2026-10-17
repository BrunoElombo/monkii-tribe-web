import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { Link } from "react-router";
import { useTranslation } from "react-i18next";
import clsx from "clsx";
import { ArrowPathRoundedSquareIcon, ArrowsRightLeftIcon, ChevronDownIcon, SpeakerWaveIcon } from "@heroicons/react/24/outline";
import { BackwardIcon, ForwardIcon, PauseIcon, PlayIcon } from "@heroicons/react/24/solid";
import { Cover } from "../components/Cover";
import { LikeButton } from "../components/TrackList";
import { IconButton, Spinner } from "../components/ui";
import { artistLine, formatDuration } from "../utils/format";
import { usePlayer } from "./PlayerProvider";

/** Persistent mini player (MED-05), docked above the mobile navigation. */
export function PlayerBar() {
  const { t } = useTranslation();
  const player = usePlayer();
  const { current } = player;
  const [expanded, setExpanded] = useState(false);

  if (!current) return null;

  const progress = player.duration > 0 ? (player.position / player.duration) * 100 : 0;

  return (
    <div className="border-t border-line bg-surface/95 backdrop-blur">
      {/* Thin progress line for small screens */}
      <div className="h-0.5 bg-monkii-950 md:hidden">
        <div className="h-full bg-monkii-500 transition-[width]" style={{ width: `${progress}%` }} />
      </div>

      <div className="mx-auto grid h-16 max-w-screen-2xl grid-cols-[1fr_auto] items-center gap-3 px-3 md:h-20 md:grid-cols-[1fr_2fr_1fr] md:px-5">
        <div className="flex min-w-0 items-center gap-3">
          <Link to={`/releases/${current.release.id}`} aria-label={t("player.openRelease")} className="hidden md:block">
            <Cover src={current.release.coverThumbUrl} alt={current.release.title} className="h-14 w-14" rounded="rounded-lg" />
          </Link>
          {/* On phones the song opens the full "now playing" screen */}
          <button type="button" onClick={() => setExpanded(true)} aria-label={t("player.nowPlaying")} className="flex min-w-0 items-center gap-3 text-left md:hidden">
            <Cover src={current.release.coverThumbUrl} alt={current.release.title} className="h-11 w-11 shrink-0" rounded="rounded-lg" />
            <SongTitle />
          </button>
          <div className="hidden min-w-0 md:block">
            <SongTitle />
          </div>
          <LikeButton track={current} />
        </div>

        <div className="flex flex-col items-center gap-1">
          <div className="flex items-center gap-1 md:gap-3">
            {/* Wrappers carry the breakpoint: the buttons' own inline-flex would override "hidden".
                On phones, shuffle, previous and repeat live in the "now playing" screen. */}
            <span className="hidden md:contents">
              <ShuffleToggle />
              <IconButton label={t("player.previous")} onClick={player.previous}>
                <BackwardIcon className="h-5 w-5" />
              </IconButton>
            </span>
            <PlayPause />
            <IconButton label={t("player.next")} onClick={player.next}>
              <ForwardIcon className="h-5 w-5" />
            </IconButton>
            <span className="hidden md:contents">
              <RepeatToggle />
            </span>
          </div>

          <SeekBar className="hidden md:flex" />
        </div>

        <div className="hidden items-center justify-end gap-2 md:flex">
          <SpeakerWaveIcon className="h-5 w-5 text-muted" />
          <input
            type="range"
            className="seek max-w-32"
            min={0}
            max={1}
            step={0.01}
            value={player.volume}
            onChange={(event) => player.setVolume(Number(event.target.value))}
            aria-label={t("player.volume")}
          />
        </div>
      </div>

      {/* Rendered at the top of the page: the bar's blur would otherwise trap the full-screen view */}
      {expanded && createPortal(<NowPlaying onClose={() => setExpanded(false)} />, document.body)}
    </div>
  );
}

/** Full-screen player for phones: big cover, seek bar, shuffle, repeat and like. */
function NowPlaying({ onClose }: { onClose: () => void }) {
  const { t } = useTranslation();
  const { current } = usePlayer();

  // Back button / Escape close the sheet instead of leaving the page
  useEffect(() => {
    const onKey = (event: KeyboardEvent) => event.key === "Escape" && onClose();
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  if (!current) return null;

  return (
    <div role="dialog" aria-modal="true" aria-label={t("player.nowPlaying")} className="safe-bottom fixed inset-0 z-50 flex flex-col bg-bg px-6 pb-8 pt-4 md:hidden">
      <div className="flex items-center justify-between">
        <IconButton label={t("common.close")} onClick={onClose}>
          <ChevronDownIcon className="h-6 w-6" />
        </IconButton>
        <p className="text-xs font-semibold uppercase tracking-widest text-muted">{t("player.nowPlaying")}</p>
        <span className="w-9" />
      </div>

      <Link to={`/releases/${current.release.id}`} onClick={onClose} className="mx-auto mt-6 w-full max-w-sm">
        <Cover src={current.release.coverUrl ?? current.release.coverThumbUrl} alt={current.release.title} className="w-full shadow-2xl shadow-black/50" />
      </Link>

      <div className="mx-auto mt-6 flex w-full max-w-sm items-center gap-3">
        <div className="min-w-0 flex-1">
          <SongTitle large />
        </div>
        <LikeButton track={current} />
      </div>

      <SeekBar className="mx-auto mt-4 flex w-full max-w-sm" />

      <div className="mx-auto mt-4 flex w-full max-w-sm items-center justify-between">
        <ShuffleToggle />
        <PreviousButton />
        <PlayPause large />
        <NextButton />
        <RepeatToggle />
      </div>
    </div>
  );
}

// ---------------------------------------------------------------- pieces shared by the bar and the sheet

function SongTitle({ large = false }: { large?: boolean }) {
  const { current } = usePlayer();
  if (!current) return null;
  return (
    <div className="min-w-0">
      <p className={clsx("truncate font-semibold", large ? "text-xl" : "text-sm")}>{current.title}</p>
      <p className={clsx("truncate text-muted", large ? "text-sm" : "text-xs")}>{artistLine(current)}</p>
    </div>
  );
}

function PlayPause({ large = false }: { large?: boolean }) {
  const { t } = useTranslation();
  const player = usePlayer();
  const size = large ? "h-7 w-7" : "h-5 w-5";
  return (
    <button
      type="button"
      onClick={player.toggle}
      aria-label={player.isPlaying ? t("common.pause") : t("common.play")}
      className={clsx(
        "flex items-center justify-center rounded-full bg-monkii-500 text-monkii-ink transition hover:scale-105",
        large ? "h-16 w-16" : "h-10 w-10",
      )}
    >
      {player.isLoading ? <Spinner className={size} /> : player.isPlaying ? <PauseIcon className={size} /> : <PlayIcon className={size} />}
    </button>
  );
}

function PreviousButton() {
  const { t } = useTranslation();
  const player = usePlayer();
  return (
    <IconButton label={t("player.previous")} onClick={player.previous} className="h-12 w-12">
      <BackwardIcon className="h-7 w-7" />
    </IconButton>
  );
}

function NextButton() {
  const { t } = useTranslation();
  const player = usePlayer();
  return (
    <IconButton label={t("player.next")} onClick={player.next} className="h-12 w-12">
      <ForwardIcon className="h-7 w-7" />
    </IconButton>
  );
}

function ShuffleToggle({ className }: { className?: string }) {
  const { t } = useTranslation();
  const player = usePlayer();
  return (
    <IconButton
      label={player.shuffle ? t("player.shuffleOn") : t("player.shuffleOff")}
      aria-pressed={player.shuffle}
      onClick={player.toggleShuffle}
      className={clsx("relative", player.shuffle && "text-monkii-500", className)}
    >
      <ArrowsRightLeftIcon className="h-5 w-5" />
      {player.shuffle && <span className="absolute bottom-0.5 h-1 w-1 rounded-full bg-monkii-500" />}
    </IconButton>
  );
}

/** off → repeat the list → repeat this song; the "1" badge marks the last mode. */
function RepeatToggle({ className }: { className?: string }) {
  const { t } = useTranslation();
  const player = usePlayer();
  return (
    <IconButton
      label={t(`player.repeatModes.${player.repeat}`)}
      aria-pressed={player.repeat !== "off"}
      onClick={player.toggleRepeat}
      className={clsx("relative", player.repeat !== "off" && "text-monkii-500", className)}
    >
      <ArrowPathRoundedSquareIcon className="h-5 w-5" />
      {player.repeat === "one" && (
        <span className="absolute right-0.5 top-0.5 flex h-3.5 w-3.5 items-center justify-center rounded-full bg-monkii-500 text-[9px] font-bold text-monkii-ink">1</span>
      )}
      {player.repeat !== "off" && <span className="absolute bottom-0.5 h-1 w-1 rounded-full bg-monkii-500" />}
    </IconButton>
  );
}

function SeekBar({ className }: { className?: string }) {
  const player = usePlayer();
  return (
    <div className={clsx("w-full items-center gap-2 text-xs tabular-nums text-muted", className)}>
      <span className="w-10 text-right">{formatDuration(player.position * 1000)}</span>
      <input
        type="range"
        className="seek"
        min={0}
        max={player.duration || 0}
        step={0.5}
        value={player.position}
        onChange={(event) => player.seek(Number(event.target.value))}
        aria-label="Seek"
      />
      <span className="w-10">{formatDuration(player.duration * 1000)}</span>
    </div>
  );
}
