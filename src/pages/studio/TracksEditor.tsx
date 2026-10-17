import { useRef, useState } from "react";
import { useFieldArray, useForm } from "react-hook-form";
import { useTranslation } from "react-i18next";
import clsx from "clsx";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import {
  ArrowDownIcon, ArrowUpIcon, ArrowUpTrayIcon, ChevronDownIcon, PlusIcon, TrashIcon,
} from "@heroicons/react/24/outline";
import { Alert, Badge, Button, Checkbox, Field, IconButton, Input, Select, Spinner, Textarea } from "../../components/ui";
import { useMediaAsset } from "../../hooks/media";
import { addTrack, deleteTrack, reorderTracks, setTrackAudio, updateTrack } from "../../services/catalog.service";
import { uploadAudio as uploadAudioFile } from "../../services/media.service";
import type { Credit, StudioRelease, StudioTrack } from "../../types";
import { formatDuration } from "../../utils/format";
import { errorMessage } from "../../utils/problems";

/** Track list of a release: add, upload audio, reorder, edit details (CAT-03, CAT-05). */
export function TracksEditor({ release, editable }: { release: StudioRelease; editable: boolean }) {
  const { t } = useTranslation();
  const queryClient = useQueryClient();
  const [title, setTitle] = useState("");

  const refresh = () => queryClient.invalidateQueries({ queryKey: ["studio", "release", release.id] });

  const add = useMutation({
    mutationFn: () => addTrack(release.id, title.trim()),
    onSuccess: () => {
      setTitle("");
      void refresh();
    },
  });

  const reorder = useMutation({
    mutationFn: (trackIds: string[]) => reorderTracks(release.id, trackIds),
    onSuccess: () => void refresh(),
  });

  const move = (index: number, direction: -1 | 1) => {
    const ids = release.tracks.map((track) => track.id);
    const target = index + direction;
    if (target < 0 || target >= ids.length) return;
    [ids[index], ids[target]] = [ids[target], ids[index]];
    reorder.mutate(ids);
  };

  const full = release.tracks.length >= release.trackLimits.max;

  return (
    <section className="card flex flex-col gap-4 p-5">
      <div className="flex items-baseline justify-between">
        <h2 className="font-semibold">{t("studio.tracks")}</h2>
        <span className="text-xs text-muted">{t("studio.trackRule", release.trackLimits)}</span>
      </div>

      {!editable && <Alert tone="info">{t("studio.lockedAfterPublish")}</Alert>}
      {(add.error || reorder.error) && <Alert>{errorMessage(add.error ?? reorder.error)}</Alert>}

      <ol className="flex flex-col gap-2">
        {release.tracks.map((track, index) => (
          <TrackRow
            key={track.id}
            track={track}
            editable={editable}
            canMoveUp={index > 0}
            canMoveDown={index < release.tracks.length - 1}
            onMove={(direction) => move(index, direction)}
            onChanged={() => void refresh()}
          />
        ))}
      </ol>

      {editable && !full && (
        <form
          className="flex gap-2"
          onSubmit={(event) => {
            event.preventDefault();
            if (title.trim()) add.mutate();
          }}
        >
          <Input value={title} onChange={(event) => setTitle(event.target.value)} placeholder={t("studio.trackTitle")} maxLength={200} />
          <Button type="submit" variant="secondary" icon={<PlusIcon className="h-5 w-5" />} loading={add.isPending}>
            {t("studio.addTrack")}
          </Button>
        </form>
      )}
    </section>
  );
}

interface TrackRowProps {
  track: StudioTrack;
  editable: boolean;
  canMoveUp: boolean;
  canMoveDown: boolean;
  onMove: (direction: -1 | 1) => void;
  onChanged: () => void;
}

function TrackRow({ track, editable, canMoveUp, canMoveDown, onMove, onChanged }: TrackRowProps) {
  const { t } = useTranslation();
  const [open, setOpen] = useState(false);
  const [progress, setProgress] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  const remove = useMutation({
    mutationFn: () => deleteTrack(track.id),
    onSuccess: onChanged,
  });

  /** Upload to the media service, then attach the file to this track. */
  const uploadAudio = async (file: File | undefined) => {
    if (!file) return;
    setError(null);
    setProgress(0);
    try {
      const asset = await uploadAudioFile(file, setProgress);
      await setTrackAudio(track.id, asset.id);
      onChanged();
    } catch (err) {
      setError(errorMessage(err));
    } finally {
      setProgress(null);
      if (fileRef.current) fileRef.current.value = "";
    }
  };

  const tone = track.audioStatus === "READY" ? "accent" : "muted";

  return (
    <li className="rounded-xl border border-line bg-bg">
      <div className="flex flex-wrap items-center gap-3 p-3">
        <span className="w-6 text-center text-sm tabular-nums text-muted">{track.trackNumber}</span>

        <div className="min-w-0 flex-1">
          <p className="truncate text-sm font-semibold">
            {track.title}
            {track.explicit && <span className="ml-2 rounded bg-elevated px-1 text-[10px] font-bold text-muted">E</span>}
          </p>
          <p className="text-xs text-muted">{formatDuration(track.durationMs)}</p>
          {track.audioStatus === "FAILED" && track.audioAssetId && <FailureReason assetId={track.audioAssetId} />}
        </div>

        {progress !== null ? (
          <span className="flex items-center gap-2 text-xs font-semibold text-monkii-400">
            <Spinner className="h-4 w-4" /> {t("studio.uploadingPercent", { percent: progress })}
          </span>
        ) : (
          <Badge tone={tone}>
            {track.audioStatus === "PROCESSING" && <Spinner className="mr-1 h-3 w-3" />}
            {t(`studio.audio.${track.audioStatus}`)}
          </Badge>
        )}

        {editable && (
          <>
            <Button
              size="sm"
              variant="secondary"
              icon={<ArrowUpTrayIcon className="h-4 w-4" />}
              disabled={progress !== null}
              onClick={() => fileRef.current?.click()}
              title={t("studio.audioHint")}
            >
              {track.audioAssetId ? t("studio.replaceAudio") : t("studio.uploadAudio")}
            </Button>
            <input
              ref={fileRef}
              type="file"
              accept="audio/wav,audio/x-wav,audio/flac,audio/mpeg,audio/mp4,audio/x-m4a,.wav,.flac,.mp3,.m4a"
              className="hidden"
              onChange={(event) => void uploadAudio(event.target.files?.[0])}
            />
            <IconButton label={t("studio.moveUp")} disabled={!canMoveUp} onClick={() => onMove(-1)}><ArrowUpIcon className="h-4 w-4" /></IconButton>
            <IconButton label={t("studio.moveDown")} disabled={!canMoveDown} onClick={() => onMove(1)}><ArrowDownIcon className="h-4 w-4" /></IconButton>
            <IconButton label={t("studio.removeTrack")} onClick={() => window.confirm(`${t("studio.removeTrack")} — ${track.title}?`) && remove.mutate()}>
              <TrashIcon className="h-4 w-4" />
            </IconButton>
          </>
        )}

        <IconButton label={t("studio.trackDetails")} onClick={() => setOpen((o) => !o)}>
          <ChevronDownIcon className={clsx("h-4 w-4 transition", open && "rotate-180")} />
        </IconButton>
      </div>

      {error && <div className="px-3 pb-3"><Alert>{error}</Alert></div>}
      {open && <TrackDetailsForm track={track} onSaved={onChanged} />}
    </li>
  );
}

// ---------------------------------------------------------------- track metadata

interface TrackForm {
  title: string;
  discNumber: number;
  isrc: string;
  explicit: boolean;
  bpm: string;
  musicalKey: string;
  priceXaf: string;
  lyrics: string;
  credits: Credit[];
}

const ROLES: Credit["role"][] = ["composer", "songwriter", "producer", "mixing", "mastering", "arranger", "performer", "other"];

function TrackDetailsForm({ track, onSaved }: { track: StudioTrack; onSaved: () => void }) {
  const { t } = useTranslation();
  const { register, control, handleSubmit } = useForm<TrackForm>({
    defaultValues: {
      title: track.title,
      discNumber: track.discNumber,
      isrc: track.isrc ?? "",
      explicit: track.explicit,
      bpm: track.bpm?.toString() ?? "",
      musicalKey: track.musicalKey ?? "",
      priceXaf: track.priceXaf?.toString() ?? "",
      lyrics: track.lyrics ?? "",
      credits: track.credits,
    },
  });
  const credits = useFieldArray({ control, name: "credits" });

  const save = useMutation({
    mutationFn: (values: TrackForm) =>
      updateTrack(track.id, {
        title: values.title.trim(),
        discNumber: Number(values.discNumber) || 1,
        isrc: values.isrc.trim().toUpperCase() || null,
        explicit: values.explicit,
        bpm: values.bpm ? Number(values.bpm) : null,
        musicalKey: values.musicalKey.trim() || null,
        priceXaf: values.priceXaf ? Number(values.priceXaf) : null,
        lyrics: values.lyrics.trim() || null,
        credits: values.credits.filter((c) => c.name.trim()),
      }),
    onSuccess: onSaved,
  });

  return (
    <form onSubmit={handleSubmit((values) => save.mutate(values))} className="flex flex-col gap-4 border-t border-line p-4">
      {save.isError && <Alert>{errorMessage(save.error)}</Alert>}

      <div className="grid gap-3 sm:grid-cols-4">
        <Field label={t("studio.trackTitle")} className="sm:col-span-2"><Input {...register("title", { required: true })} /></Field>
        <Field label={t("studio.isrc")} optional><Input placeholder="CMABC2700001" {...register("isrc")} /></Field>
        <Field label={t("studio.discNumber")}><Input type="number" min={1} {...register("discNumber")} /></Field>
        <Field label={t("studio.bpm")} optional><Input type="number" min={30} max={300} {...register("bpm")} /></Field>
        <Field label={t("studio.musicalKey")} optional><Input placeholder="A minor" {...register("musicalKey")} /></Field>
        <Field label={t("studio.trackPrice")} optional hint={t("studio.trackPriceHint")}>
          <Input type="number" inputMode="numeric" min={100} max={100000} step={50} placeholder={t("studio.notForSale")} {...register("priceXaf")} />
        </Field>
        <div className="flex items-end pb-2"><Checkbox label={t("studio.explicit")} {...register("explicit")} /></div>
      </div>

      <Field label={t("studio.lyrics")} optional><Textarea rows={5} {...register("lyrics")} /></Field>

      <div>
        <p className="label">{t("studio.credits")}</p>
        <div className="flex flex-col gap-2">
          {credits.fields.map((field, index) => (
            <div key={field.id} className="flex gap-2">
              <Select className="max-w-40" {...register(`credits.${index}.role`)}>
                {ROLES.map((role) => <option key={role} value={role}>{t(`studio.roles.${role}`)}</option>)}
              </Select>
              <Input placeholder={t("studio.creditName")} {...register(`credits.${index}.name`)} />
              <IconButton label={t("common.delete")} onClick={() => credits.remove(index)}><TrashIcon className="h-4 w-4" /></IconButton>
            </div>
          ))}
          <Button type="button" variant="ghost" size="sm" className="self-start" icon={<PlusIcon className="h-4 w-4" />} onClick={() => credits.append({ role: "producer", name: "" })}>
            {t("studio.addCredit")}
          </Button>
        </div>
      </div>

      <Button type="submit" className="self-start" loading={save.isPending}>{t("common.save")}</Button>
    </form>
  );
}

/** Why the media worker refused the file (too low quality, no audio, too long…). */
function FailureReason({ assetId }: { assetId: string }) {
  const asset = useMediaAsset(assetId);
  if (!asset.data?.error) return null;
  return <p role="alert" className="mt-1 text-xs font-medium text-monkii-300">{asset.data.error}</p>;
}
