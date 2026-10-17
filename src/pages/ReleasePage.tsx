import { Link, useParams } from "react-router";
import { useTranslation } from "react-i18next";
import { BookmarkIcon as BookmarkOutline, CloudArrowDownIcon } from "@heroicons/react/24/outline";
import { BookmarkIcon, PlayIcon } from "@heroicons/react/24/solid";
import { useAuth } from "../auth/AuthProvider";
import { BuyButton } from "../components/BuyButton";
import { Avatar, Cover } from "../components/Cover";
import { TrackList } from "../components/TrackList";
import { Alert, Badge, Button, PageLoader } from "../components/ui";
import { useRelease, useToggleSave } from "../hooks/catalog";
import { useIsPremium } from "../hooks/payments";
import { isOfflineSupported } from "../offline/offline-store";
import { useOfflineIds, useSaveOffline } from "../offline/useOffline";
import { usePlayer } from "../player/PlayerProvider";
import { ShuffleButton } from "../player/ShuffleButton";
import { formatTotalDuration, formatYear } from "../utils/format";
import { errorMessage } from "../utils/problems";
import { NotFoundPage } from "./NotFoundPage";

export function ReleasePage() {
  const { id = "" } = useParams();
  const { t, i18n } = useTranslation();
  const { user } = useAuth();
  const { playQueue } = usePlayer();
  const release = useRelease(id);
  const save = useToggleSave();
  const isPremium = useIsPremium();
  const offline = useSaveOffline();
  const offlineIds = useOfflineIds();

  if (release.isPending) return <PageLoader />;
  if (release.isError) return (release.error as { status?: number }).status === 404 ? <NotFoundPage /> : <Alert>{errorMessage(release.error)}</Alert>;

  const data = release.data;

  return (
    <div className="flex flex-col gap-8">
      <header className="flex flex-col gap-6 md:flex-row md:items-end">
        <Cover src={data.coverUrl} alt={data.title} className="w-56 shrink-0 self-center shadow-2xl shadow-black/50 md:w-64 md:self-auto" />
        <div className="min-w-0">
          <p className="text-xs font-semibold uppercase tracking-widest text-muted">
            {t(`release.types.${data.type}`)}
            {data.status !== "PUBLISHED" && <Badge tone="accent">{data.status}</Badge>}
          </p>
          <h1 className="mt-2 text-3xl font-bold md:text-5xl">{data.title}</h1>
          <div className="mt-3 flex flex-wrap items-center gap-2 text-sm text-muted">
            <Avatar src={data.artist.avatarUrl} alt="" className="h-6 w-6" />
            <Link to={`/artists/${data.artist.slug}`} className="font-semibold text-fg hover:underline">{data.artist.stageName}</Link>
            {data.featured.length > 0 && <span>{t("release.featuring", { names: data.featured.map((a) => a.stageName).join(", ") })}</span>}
            <span>· {formatYear(data.releaseDate ?? data.publishedAt)}</span>
            <span>· {t("common.tracks", { count: data.tracks.length })}, {formatTotalDuration(data.totalDurationMs)}</span>
          </div>
          {data.genre && <span className="chip mt-3">{data.genre.name}</span>}
        </div>
      </header>

      <div className="flex flex-wrap items-center gap-3">
        <Button size="lg" icon={<PlayIcon className="h-5 w-5" />} disabled={!data.tracks.length} onClick={() => playQueue(data.tracks, 0)}>
          {t("common.play")}
        </Button>
        {data.tracks.length > 1 && <ShuffleButton tracks={data.tracks} />}
        {user && (
          <Button
            variant="secondary"
            icon={data.isSaved ? <BookmarkIcon className="h-5 w-5 text-monkii-500" /> : <BookmarkOutline className="h-5 w-5" />}
            loading={save.isPending}
            onClick={() => save.mutate({ releaseId: data.id, saved: data.isSaved })}
          >
            {data.isSaved ? t("release.saved") : t("release.save")}
          </Button>
        )}
        {data.status === "PUBLISHED" && <BuyButton type="RELEASE" id={data.id} priceXaf={data.priceXaf} isPurchased={data.isPurchased} />}
        {user && isPremium && isOfflineSupported() && data.tracks.length > 0 && (
          <Button
            variant="ghost"
            icon={<CloudArrowDownIcon className="h-5 w-5" />}
            loading={Boolean(offline.progress)}
            disabled={data.tracks.every((track) => offlineIds.has(track.id))}
            onClick={() => offline.save(data.tracks.filter((track) => !offlineIds.has(track.id)))}
          >
            {offline.progress
              ? t("offline.progress", { done: offline.progress.done + 1, total: offline.progress.total, percent: offline.progress.percent })
              : data.tracks.every((track) => offlineIds.has(track.id)) ? t("offline.savedAll") : t("offline.saveAll")}
          </Button>
        )}
      </div>
      {offline.error ? <Alert>{errorMessage(offline.error)}</Alert> : null}

      <TrackList tracks={data.tracks} showCover={false} numbered />

      {data.description && <p className="max-w-3xl whitespace-pre-line text-sm text-fg/80">{data.description}</p>}

      <footer className="text-xs text-muted">
        {data.releaseDate && <p>{new Date(data.releaseDate).toLocaleDateString(i18n.language, { dateStyle: "long" })}</p>}
        {data.copyrightLine && <p>© {data.copyrightLine}</p>}
        {data.phonographicLine && <p>℗ {data.phonographicLine}</p>}
        {data.labelName && <p>{data.labelName}</p>}
      </footer>
    </div>
  );
}
