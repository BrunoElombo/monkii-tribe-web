import { Link, useNavigate, useSearchParams } from "react-router";
import { useTranslation } from "react-i18next";
import clsx from "clsx";
import { CloudArrowDownIcon, HeartIcon, PlusIcon, ShoppingBagIcon } from "@heroicons/react/24/outline";
import { PlayIcon } from "@heroicons/react/24/solid";
import { BuyButton } from "../components/BuyButton";
import { ArtistCard, CardGrid, PlaylistCard, ReleaseCard } from "../components/Cards";
import { Cover } from "../components/Cover";
import { TrackList } from "../components/TrackList";
import { Alert, Button, EmptyState, PageLoader } from "../components/ui";
import { useCreatePlaylist, useLikedTracks, useMyPlaylists, usePurchases, useSavedReleases } from "../hooks/catalog";
import { useIsPremium } from "../hooks/payments";
import { useFollowing } from "../hooks/user";
import { isOfflineSupported } from "../offline/offline-store";
import { useOfflineTracks, useSaveOffline } from "../offline/useOffline";
import { usePlayer } from "../player/PlayerProvider";
import { ShuffleButton } from "../player/ShuffleButton";

const TABS = ["likedSongs", "playlists", "releases", "artists", "purchases", "offline"] as const;
type Tab = (typeof TABS)[number];

export function LibraryPage() {
  const { t } = useTranslation();
  // The tab lives in the URL so notifications can link to it (?tab=purchases)
  const [params, setParams] = useSearchParams();
  const tab: Tab = TABS.includes(params.get("tab") as Tab) ? (params.get("tab") as Tab) : "likedSongs";
  const setTab = (key: Tab) => setParams({ tab: key }, { replace: true });

  return (
    <div className="flex flex-col gap-6">
      <h1 className="text-3xl font-semibold">{t("library.title")}</h1>

      <div role="tablist" className="flex gap-2 overflow-x-auto pb-1">
        {TABS.map((key) => (
          <button
            key={key}
            role="tab"
            aria-selected={tab === key}
            onClick={() => setTab(key)}
            className={clsx(
              "whitespace-nowrap rounded-full px-4 py-2 text-sm font-semibold transition",
              tab === key ? "bg-monkii-500 text-monkii-ink" : "bg-surface text-muted hover:text-fg",
            )}
          >
            {t(`library.${key}`)}
          </button>
        ))}
      </div>

      {tab === "likedSongs" && <LikedSongs />}
      {tab === "playlists" && <Playlists />}
      {tab === "releases" && <SavedReleases />}
      {tab === "artists" && <FollowedArtists />}
      {tab === "purchases" && <Purchases />}
      {tab === "offline" && <Offline />}
    </div>
  );
}

function LikedSongs() {
  const { t } = useTranslation();
  const liked = useLikedTracks();
  const { playQueue } = usePlayer();

  if (liked.isPending) return <PageLoader />;
  if (!liked.data?.length) return <EmptyState icon={<HeartIcon />} title={t("library.noLikes")} />;

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap gap-3">
        <Button icon={<PlayIcon className="h-5 w-5" />} onClick={() => playQueue(liked.data, 0)}>
          {t("common.playAll")}
        </Button>
        <ShuffleButton tracks={liked.data} size="md" />
      </div>
      <TrackList tracks={liked.data} />
    </div>
  );
}

function Playlists() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const playlists = useMyPlaylists();
  const create = useCreatePlaylist();

  const createPlaylist = () => {
    const title = window.prompt(t("playlist.title"), t("playlist.new"));
    if (title?.trim()) {
      create.mutate({ title: title.trim(), isPublic: true }, { onSuccess: (playlist) => navigate(`/playlists/${playlist.id}`) });
    }
  };

  return (
    <div className="flex flex-col gap-4">
      <Button className="self-start" variant="secondary" icon={<PlusIcon className="h-5 w-5" />} loading={create.isPending} onClick={createPlaylist}>
        {t("playlist.new")}
      </Button>
      {playlists.isPending ? (
        <PageLoader />
      ) : playlists.data?.length ? (
        <CardGrid>{playlists.data.map((playlist) => <PlaylistCard key={playlist.id} playlist={playlist} />)}</CardGrid>
      ) : (
        <EmptyState title={t("playlist.none")} />
      )}
    </div>
  );
}

function SavedReleases() {
  const { t } = useTranslation();
  const releases = useSavedReleases();
  if (releases.isPending) return <PageLoader />;
  if (!releases.data?.length) return <EmptyState title={t("library.noReleases")} />;
  return <CardGrid>{releases.data.map((release) => <ReleaseCard key={release.id} release={release} />)}</CardGrid>;
}

function FollowedArtists() {
  const { t } = useTranslation();
  const following = useFollowing();
  if (following.isPending) return <PageLoader />;
  if (!following.data?.length) return <EmptyState title={t("library.noArtists")} />;
  return <CardGrid>{following.data.map((artist) => <ArtistCard key={artist.id} artist={artist} />)}</CardGrid>;
}

/** Music bought (CAT-07): download again at any time as MP3 320 kbps (MED-08). */
function Purchases() {
  const { t } = useTranslation();
  const purchases = usePurchases();

  if (purchases.isPending) return <PageLoader />;
  if (!purchases.data?.releases.length && !purchases.data?.tracks.length) {
    return <EmptyState icon={<ShoppingBagIcon />} title={t("library.noPurchases")} />;
  }

  return (
    <div className="flex flex-col gap-6">
      {purchases.data.releases.length > 0 && (
        <ul className="flex flex-col gap-2">
          {purchases.data.releases.map((release) => (
            <li key={release.id} className="card flex flex-wrap items-center gap-4 p-3">
              <Cover src={release.coverThumbUrl} alt="" className="h-14 w-14 shrink-0" rounded="rounded-lg" />
              <Link to={`/releases/${release.id}`} className="min-w-0 flex-1">
                <p className="truncate font-semibold hover:underline">{release.title}</p>
                <p className="text-xs text-muted">{release.artist.stageName} · {t(`release.types.${release.type}`)}</p>
              </Link>
              <BuyButton type="RELEASE" id={release.id} priceXaf={release.priceXaf} isPurchased size="sm" />
            </li>
          ))}
        </ul>
      )}
      {purchases.data.tracks.length > 0 && <TrackList tracks={purchases.data.tracks} />}
    </div>
  );
}

/** Tracks kept on this device with Premium (MED-07). */
function Offline() {
  const { t, i18n } = useTranslation();
  const isPremium = useIsPremium();
  const saved = useOfflineTracks();
  const { remove } = useSaveOffline();
  const { playQueue } = usePlayer();

  if (!isOfflineSupported()) return <Alert tone="info">{t("offline.unsupported")}</Alert>;
  if (saved === null) return <PageLoader />;

  const megabytes = saved.reduce((sum, s) => sum + s.bytes, 0) / 1024 / 1024;
  const tracks = saved.map((s) => s.track);

  return (
    <div className="flex flex-col gap-4">
      {!isPremium && (
        <Alert tone="info">
          {t("offline.premiumOnly")} <Link to="/premium" className="font-semibold text-monkii-400 hover:underline">Premium →</Link>
        </Alert>
      )}
      {saved.length === 0 ? (
        <EmptyState icon={<CloudArrowDownIcon />} title={t("offline.empty")} />
      ) : (
        <>
          <div className="flex flex-wrap items-center gap-3">
            <Button icon={<PlayIcon className="h-5 w-5" />} onClick={() => playQueue(tracks, 0)}>{t("common.playAll")}</Button>
            <ShuffleButton tracks={tracks} size="md" />
            <span className="text-sm text-muted">
              {t("common.tracks", { count: saved.length })} · {new Intl.NumberFormat(i18n.language, { maximumFractionDigits: 1 }).format(megabytes)} MB
            </span>
            <Button variant="ghost" size="sm" onClick={() => window.confirm(t("offline.removeAllConfirm")) && saved.forEach((s) => void remove(s.track.id))}>
              {t("offline.removeAll")}
            </Button>
          </div>
          <TrackList tracks={tracks} />
        </>
      )}
    </div>
  );
}
