import { useState } from "react";
import { useNavigate, useParams } from "react-router";
import { useTranslation } from "react-i18next";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { LockClosedIcon, PencilSquareIcon, TrashIcon } from "@heroicons/react/24/outline";
import { PlayIcon } from "@heroicons/react/24/solid";
import { Mosaic } from "../components/Cover";
import { TrackList } from "../components/TrackList";
import { Alert, Button, EmptyState, IconButton, Input, PageLoader } from "../components/ui";
import { usePlaylist } from "../hooks/catalog";
import { usePlayer } from "../player/PlayerProvider";
import { ShuffleButton } from "../player/ShuffleButton";
import { deletePlaylist, removeFromPlaylist, updatePlaylist } from "../services/catalog.service";
import { errorMessage } from "../utils/problems";
import { NotFoundPage } from "./NotFoundPage";

export function PlaylistPage() {
  const { id = "" } = useParams();
  const { t } = useTranslation();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { playQueue } = usePlayer();
  const playlist = usePlaylist(id);
  const [editing, setEditing] = useState(false);
  const [title, setTitle] = useState("");

  const refresh = () => {
    void queryClient.invalidateQueries({ queryKey: ["tracks", "playlist", id] });
    void queryClient.invalidateQueries({ queryKey: ["playlists"] });
  };

  const rename = useMutation({
    mutationFn: (body: { title?: string; isPublic?: boolean }) => updatePlaylist(id, body),
    onSuccess: () => {
      setEditing(false);
      refresh();
    },
  });

  const remove = useMutation({
    mutationFn: () => deletePlaylist(id),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ["playlists"] });
      navigate("/library", { replace: true });
    },
  });

  const removeTrack = useMutation({
    mutationFn: (trackId: string) => removeFromPlaylist(id, trackId),
    onSuccess: refresh,
  });

  if (playlist.isPending) return <PageLoader />;
  if (playlist.isError) return (playlist.error as { status?: number }).status === 404 ? <NotFoundPage /> : <Alert>{errorMessage(playlist.error)}</Alert>;

  const data = playlist.data;

  return (
    <div className="flex flex-col gap-8">
      <header className="flex flex-col gap-6 md:flex-row md:items-end">
        <Mosaic urls={data.coverUrls} alt={data.title} className="w-56 shrink-0 self-center shadow-2xl shadow-black/50 md:self-auto" />
        <div className="min-w-0 flex-1">
          <p className="flex items-center gap-1 text-xs font-semibold uppercase tracking-widest text-muted">
            {!data.isPublic && <LockClosedIcon className="h-3.5 w-3.5" />}
            {data.isPublic ? t("playlist.public") : t("playlist.private")}
          </p>

          {editing ? (
            <form
              className="mt-2 flex gap-2"
              onSubmit={(event) => {
                event.preventDefault();
                if (title.trim()) rename.mutate({ title: title.trim() });
              }}
            >
              <Input value={title} onChange={(event) => setTitle(event.target.value)} autoFocus maxLength={100} />
              <Button type="submit" loading={rename.isPending}>{t("common.save")}</Button>
            </form>
          ) : (
            <h1 className="mt-2 text-3xl font-bold md:text-5xl">{data.title}</h1>
          )}

          {data.description && <p className="mt-2 text-sm text-muted">{data.description}</p>}
          <p className="mt-2 text-sm text-muted">
            {t("playlist.by", { name: data.owner.displayName })} · {t("common.tracks", { count: data.trackCount })}
          </p>
        </div>
      </header>

      <div className="flex items-center gap-2">
        <Button size="lg" icon={<PlayIcon className="h-5 w-5" />} disabled={!data.tracks.length} onClick={() => playQueue(data.tracks, 0)}>
          {t("common.play")}
        </Button>
        <ShuffleButton tracks={data.tracks} />
        {data.isOwner && (
          <>
            <IconButton label={t("common.edit")} onClick={() => { setTitle(data.title); setEditing((e) => !e); }}>
              <PencilSquareIcon className="h-5 w-5" />
            </IconButton>
            <Button variant="ghost" size="sm" onClick={() => rename.mutate({ isPublic: !data.isPublic })}>
              {data.isPublic ? t("playlist.private") : t("playlist.public")}
            </Button>
            <IconButton label={t("common.delete")} onClick={() => window.confirm(t("playlist.deleteConfirm")) && remove.mutate()}>
              <TrashIcon className="h-5 w-5" />
            </IconButton>
          </>
        )}
      </div>

      {data.tracks.length === 0 ? (
        <EmptyState title={t("playlist.empty")} />
      ) : (
        <TrackList tracks={data.tracks} onRemove={data.isOwner ? (track) => removeTrack.mutate(track.id) : undefined} />
      )}
    </div>
  );
}
