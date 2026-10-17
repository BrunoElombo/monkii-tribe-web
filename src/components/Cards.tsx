import { Link } from "react-router";
import { useTranslation } from "react-i18next";
import { CheckBadgeIcon, PlayIcon } from "@heroicons/react/24/solid";
import { usePlayer } from "../player/PlayerProvider";
import { getRelease } from "../services/catalog.service";
import type { ArtistSummary, PlaylistSummary, ReleaseSummary } from "../types";
import { formatYear } from "../utils/format";
import { Avatar, Cover, Mosaic } from "./Cover";

export function ReleaseCard({ release }: { release: ReleaseSummary }) {
  const { t } = useTranslation();
  const { playQueue } = usePlayer();

  // Play straight from the card without opening the release page
  const playRelease = async (event: React.MouseEvent) => {
    event.preventDefault();
    const details = await getRelease(release.id);
    playQueue(details.tracks, 0);
  };

  return (
    <Link to={`/releases/${release.id}`} className="group block rounded-2xl p-2 transition hover:bg-surface">
      <div className="relative">
        <Cover src={release.coverUrl} alt={release.title} />
        <button
          type="button"
          onClick={playRelease}
          aria-label={`${t("common.play")} ${release.title}`}
          className="absolute bottom-2 right-2 flex h-11 w-11 translate-y-2 items-center justify-center rounded-full bg-monkii-500 text-monkii-ink opacity-0 shadow-lg shadow-black/40 transition group-hover:translate-y-0 group-hover:opacity-100"
        >
          <PlayIcon className="h-5 w-5" />
        </button>
      </div>
      <p className="mt-2 truncate text-sm font-semibold">{release.title}</p>
      <p className="truncate text-xs text-muted">
        {formatYear(release.releaseDate ?? release.publishedAt)} · {t(`release.types.${release.type}`)} · {release.artist.stageName}
      </p>
    </Link>
  );
}

export function ArtistCard({ artist }: { artist: ArtistSummary }) {
  return (
    <Link to={`/artists/${artist.slug}`} className="block rounded-2xl p-2 text-center transition hover:bg-surface">
      <Avatar src={artist.avatarUrl} alt={artist.stageName} />
      <p className="mt-2 flex items-center justify-center gap-1 truncate text-sm font-semibold">
        {artist.stageName}
        {artist.verified && <CheckBadgeIcon className="h-4 w-4 shrink-0 text-monkii-500" />}
      </p>
    </Link>
  );
}

export function PlaylistCard({ playlist }: { playlist: PlaylistSummary }) {
  const { t } = useTranslation();
  return (
    <Link to={`/playlists/${playlist.id}`} className="block rounded-2xl p-2 transition hover:bg-surface">
      <Mosaic urls={playlist.coverUrls} alt={playlist.title} />
      <p className="mt-2 truncate text-sm font-semibold">{playlist.title}</p>
      <p className="truncate text-xs text-muted">
        {t("playlist.by", { name: playlist.owner.displayName })} · {t("common.tracks", { count: playlist.trackCount })}
      </p>
    </Link>
  );
}

export function CardGrid({ children }: { children: React.ReactNode }) {
  return <div className="grid grid-cols-2 gap-1 sm:grid-cols-3 md:grid-cols-4 xl:grid-cols-6">{children}</div>;
}
