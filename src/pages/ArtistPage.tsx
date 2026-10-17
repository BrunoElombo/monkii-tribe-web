import { useParams } from "react-router";
import { useTranslation } from "react-i18next";
import { CheckBadgeIcon, PlayIcon } from "@heroicons/react/24/solid";
import { useAuth } from "../auth/AuthProvider";
import { CardGrid, ReleaseCard } from "../components/Cards";
import { Avatar } from "../components/Cover";
import { EventCard } from "../components/EventCard";
import { TrackList } from "../components/TrackList";
import { Alert, Button, EmptyState, PageLoader, SectionHeader } from "../components/ui";
import { useArtistReleases, useArtistTracks } from "../hooks/catalog";
import { useEvents } from "../hooks/events";
import { useArtist, useToggleFollow } from "../hooks/user";
import { usePlayer } from "../player/PlayerProvider";
import { ShuffleButton } from "../player/ShuffleButton";
import { formatCount } from "../utils/format";
import { errorMessage } from "../utils/problems";
import { NotFoundPage } from "./NotFoundPage";

export function ArtistPage() {
  const { slug = "" } = useParams();
  const { t, i18n } = useTranslation();
  const { user } = useAuth();
  const { playQueue } = usePlayer();

  const artist = useArtist(slug);
  const tracks = useArtistTracks(artist.data?.id);
  const releases = useArtistReleases(artist.data?.id);
  const follow = useToggleFollow();
  const events = useEvents({ artistId: artist.data?.id }, Boolean(artist.data));

  if (artist.isPending) return <PageLoader />;
  if (artist.isError) return (artist.error as { status?: number }).status === 404 ? <NotFoundPage /> : <Alert>{errorMessage(artist.error)}</Alert>;

  const data = artist.data;
  const bio = i18n.language === "fr" ? data.bioFr || data.bio : data.bio || data.bioFr;

  return (
    <div className="flex flex-col gap-10">
      <header className="relative -mx-4 -mt-4 overflow-hidden md:-mx-8">
        <div className="h-48 bg-gradient-to-br from-monkii-600 to-monkii-950 md:h-72">
          {data.bannerUrl && <img src={data.bannerUrl} alt="" className="h-full w-full object-cover opacity-80" />}
        </div>
        <div className="absolute inset-0 bg-gradient-to-t from-bg via-bg/40 to-transparent" />
        <div className="absolute bottom-0 left-0 flex items-end gap-4 px-4 pb-4 md:px-8">
          <Avatar src={data.avatarUrl} alt={data.stageName} className="h-24 w-24 border-4 border-bg md:h-36 md:w-36" />
          <div className="pb-1">
            {data.verified && (
              <p className="flex items-center gap-1 text-xs font-semibold text-monkii-300">
                <CheckBadgeIcon className="h-4 w-4 text-monkii-500" /> {t("common.verified")}
              </p>
            )}
            <h1 className="text-3xl font-bold md:text-6xl">{data.stageName}</h1>
            <p className="mt-1 text-sm text-muted">{t("common.followers", { count: data.followerCount, formatted: formatCount(data.followerCount, i18n.language) })}</p>
          </div>
        </div>
      </header>

      <div className="flex flex-wrap items-center gap-3">
        <Button
          size="lg"
          icon={<PlayIcon className="h-5 w-5" />}
          disabled={!tracks.data?.length}
          onClick={() => tracks.data && playQueue(tracks.data, 0)}
        >
          {t("common.play")}
        </Button>
        <ShuffleButton tracks={tracks.data ?? []} />
        {user && !data.isOwner && (
          <Button
            variant="secondary"
            loading={follow.isPending}
            onClick={() => follow.mutate({ artistId: data.id, following: Boolean(data.isFollowing) })}
          >
            {data.isFollowing ? t("common.following") : t("common.follow")}
          </Button>
        )}
      </div>

      {tracks.data && tracks.data.length > 0 && (
        <section>
          <SectionHeader title={t("artist.popular")} />
          <TrackList tracks={tracks.data} showPlays />
        </section>
      )}

      {events.data && events.data.items.length > 0 && (
        <section>
          <SectionHeader title={t("events.upcomingFor")} />
          <div className="grid gap-3 lg:grid-cols-2">{events.data.items.slice(0, 4).map((event) => <EventCard key={event.id} event={event} />)}</div>
        </section>
      )}

      <section>
        <SectionHeader title={t("artist.discography")} />
        {releases.data?.items.length === 0 ? (
          <EmptyState title={t("artist.noReleases")} />
        ) : (
          <CardGrid>{releases.data?.items.map((release) => <ReleaseCard key={release.id} release={release} />)}</CardGrid>
        )}
      </section>

      {bio && (
        <section className="card max-w-3xl p-6">
          <h2 className="mb-2 text-lg font-semibold">{t("artist.about")}</h2>
          <p className="whitespace-pre-line text-sm leading-relaxed text-fg/90">{bio}</p>
          {data.genres.length > 0 && (
            <div className="mt-4 flex flex-wrap gap-2">
              {data.genres.map((genre) => <span key={genre} className="chip">{genre}</span>)}
            </div>
          )}
          {Object.keys(data.links).length > 0 && (
            <div className="mt-4 flex flex-wrap gap-3 text-sm">
              {Object.entries(data.links).map(([name, url]) => (
                <a key={name} href={url} target="_blank" rel="noreferrer noopener" className="font-semibold capitalize text-monkii-400 hover:underline">
                  {name}
                </a>
              ))}
            </div>
          )}
        </section>
      )}
    </div>
  );
}
