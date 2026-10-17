import { useEffect, useRef, useState } from "react";
import { useForm } from "react-hook-form";
import { Link, useNavigate, useParams } from "react-router";
import { useTranslation } from "react-i18next";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { zodResolver } from "@hookform/resolvers/zod";
import { ArrowLeftIcon, CheckCircleIcon } from "@heroicons/react/24/outline";
import { ArtistPicker } from "../../components/ArtistPicker";
import { Cover } from "../../components/Cover";
import { ImageUpload } from "../../components/ImageUpload";
import { ProblemList } from "../../components/charts";
import { Alert, Badge, Button, Checkbox, Field, Input, PageLoader, Select, Textarea } from "../../components/ui";
import { useGenres, useStudioRelease } from "../../hooks/catalog";
import { usePricing } from "../../hooks/payments";
import { deleteRelease, publishRelease, setReleaseCover, takeDownRelease, updateRelease } from "../../services/catalog.service";
import type { ArtistSummary, StudioRelease } from "../../types";
import { formatXaf } from "../../utils/format";
import { errorMessage, translatedError } from "../../utils/problems";
import { releaseDetailsSchema, type ReleaseDetailsValues } from "../../validation/release.schemas";
import { NotFoundPage } from "../NotFoundPage";
import { TracksEditor } from "./TracksEditor";

const EDITABLE = ["DRAFT", "PROCESSING", "READY"];

/** The release upload wizard: cover, metadata, tracks, then publish (CAT-01 to CAT-06). */
export function ReleaseEditorPage() {
  const { id = "" } = useParams();
  const { t } = useTranslation();
  // The details form registers how to save its pending changes, so "Publish" can save them first
  const saveDetails = useRef<(() => Promise<void>) | null>(null);
  const [detailsDirty, setDetailsDirty] = useState(false);

  const release = useStudioRelease(id);

  if (release.isPending) return <PageLoader />;
  if (release.isError) return (release.error as { status?: number }).status === 404 ? <NotFoundPage /> : <Alert>{errorMessage(release.error)}</Alert>;

  const data = release.data;
  const editable = EDITABLE.includes(data.status);

  return (
    <div className="flex flex-col gap-6">
      <Link to="/studio" className="inline-flex items-center gap-1 text-sm font-semibold text-muted hover:text-fg">
        <ArrowLeftIcon className="h-4 w-4" /> {t("studio.title")}
      </Link>

      <header className="flex flex-wrap items-center gap-3">
        <h1 className="text-3xl font-semibold">{data.title}</h1>
        <Badge tone={data.status === "PUBLISHED" ? "strong" : "accent"}>{t(`studio.status.${data.status}`)}</Badge>
      </header>

      {data.status === "TAKEN_DOWN" && <Alert>{t("studio.takenDown", { reason: data.takedownReason ?? "" })}</Alert>}

      <div className="grid gap-6 lg:grid-cols-[18rem_1fr]">
        <aside className="flex flex-col gap-6">
          <CoverPanel release={data} />
          <PublishPanel release={data} detailsDirty={detailsDirty} saveDetails={() => saveDetails.current?.() ?? Promise.resolve()} />
        </aside>

        <div className="flex flex-col gap-6">
          <MetadataForm release={data} saverRef={saveDetails} onDirtyChange={setDetailsDirty} />
          <TracksEditor release={data} editable={editable} />
        </div>
      </div>
    </div>
  );
}

export function useRefreshRelease() {
  const queryClient = useQueryClient();
  return () => {
    void queryClient.invalidateQueries({ queryKey: ["studio"] });
    void queryClient.invalidateQueries({ queryKey: ["tracks"] });
  };
}

// ---------------------------------------------------------------- cover

function CoverPanel({ release }: { release: StudioRelease }) {
  const { t } = useTranslation();
  const refresh = useRefreshRelease();

  return (
    <section className="card p-4">
      <h2 className="mb-3 font-semibold">{t("studio.cover")}</h2>
      <ImageUpload
        purpose="COVER"
        label={t("studio.uploadCover")}
        hint={t("studio.coverHint")}
        onUploaded={async (asset) => {
          await setReleaseCover(release.id, asset.id);
          refresh();
        }}
      >
        <Cover src={release.coverUrl} alt={release.title} />
      </ImageUpload>
    </section>
  );
}

// ---------------------------------------------------------------- publish

interface PublishPanelProps {
  release: StudioRelease;
  /** The details form has changes that are not saved yet */
  detailsDirty: boolean;
  saveDetails: () => Promise<void>;
}

function PublishPanel({ release, detailsDirty, saveDetails }: PublishPanelProps) {
  const { t, i18n } = useTranslation();
  const navigate = useNavigate();
  const refresh = useRefreshRelease();
  const [publishAt, setPublishAt] = useState("");

  const publish = useMutation({
    mutationFn: async (date: string | null) => {
      // Save what was typed in the details first: the server checks the saved version
      await saveDetails();
      return publishRelease(release.id, date ? new Date(date).toISOString() : null);
    },
    onSuccess: refresh,
    onError: refresh,
  });

  const takeDown = useMutation({
    mutationFn: (reason: string) => takeDownRelease(release.id, reason),
    onSuccess: refresh,
  });

  const remove = useMutation({
    mutationFn: () => deleteRelease(release.id),
    onSuccess: () => {
      refresh();
      navigate("/studio", { replace: true });
    },
  });

  const editable = EDITABLE.includes(release.status);
  // With unsaved details the checklist may be out of date: let the server decide after saving
  const ready = release.publishProblems.length === 0 || detailsDirty;
  const error = publish.error ?? takeDown.error ?? remove.error;
  const errorText = error ? translatedError(error) : null;

  return (
    <section className="card flex flex-col gap-4 p-4">
      <h2 className="font-semibold">{t("studio.publishTitle")}</h2>
      {errorText && <Alert>{errorText}</Alert>}
      {release.status === "IN_REVIEW" && <Alert tone="info">{t("studio.inReview")}</Alert>}
      {release.reviewNote && editable && <Alert>{t("studio.reviewNote", { note: release.reviewNote })}</Alert>}

      {release.status === "PUBLISHED" && release.publishedAt && (
        <p className="text-sm text-muted">{t("studio.publishedOn", { date: new Date(release.publishedAt).toLocaleString(i18n.language, { dateStyle: "medium", timeStyle: "short" }) })}</p>
      )}
      {release.status === "SCHEDULED" && release.publishAt && (
        <p className="text-sm text-muted">{t("studio.scheduledFor", { date: new Date(release.publishAt).toLocaleString(i18n.language, { dateStyle: "medium", timeStyle: "short" }) })}</p>
      )}

      {editable && (
        <>
          {detailsDirty && <Alert tone="info">{t("studio.unsavedDetails")}</Alert>}
          {release.publishProblems.length === 0 ? (
            <p className="flex items-center gap-2 text-sm text-monkii-300"><CheckCircleIcon className="h-5 w-5" /> {t("studio.readyToPublish")}</p>
          ) : (
            <div>
              <p className="mb-2 text-sm font-medium">{t("studio.beforePublishing")}</p>
              <ProblemList problems={release.publishProblems} />
            </div>
          )}

          <Button disabled={!ready} loading={publish.isPending && !publishAt} onClick={() => publish.mutate(null)}>
            {t("studio.publishNow")}
          </Button>

          <div className="flex flex-col gap-2 border-t border-line pt-4">
            <Field label={t("studio.publishAt")}>
              <Input type="datetime-local" value={publishAt} min={new Date().toISOString().slice(0, 16)} onChange={(event) => setPublishAt(event.target.value)} />
            </Field>
            <Button variant="secondary" disabled={!ready || !publishAt} loading={publish.isPending && Boolean(publishAt)} onClick={() => publish.mutate(publishAt)}>
              {t("studio.schedule")}
            </Button>
          </div>
        </>
      )}

      {release.status === "PUBLISHED" && (
        <Button
          variant="danger"
          loading={takeDown.isPending}
          onClick={() => {
            const reason = window.prompt(t("studio.takedownReason"));
            if (reason && reason.trim().length >= 3) takeDown.mutate(reason.trim());
          }}
        >
          {t("studio.takeDown")}
        </Button>
      )}

      {release.status !== "PUBLISHED" && release.status !== "TAKEN_DOWN" && (
        <Button variant="ghost" size="sm" loading={remove.isPending} onClick={() => window.confirm(t("studio.deleteConfirm")) && remove.mutate()}>
          {t("studio.deleteRelease")}
        </Button>
      )}
    </section>
  );
}

// ---------------------------------------------------------------- metadata (CAT-02)

type MetadataValues = ReleaseDetailsValues;

/** Form values from a release, as the API returns it. */
function formValuesOf(release: StudioRelease): MetadataValues {
  return {
    title: release.title,
    type: release.type,
    releaseDate: release.releaseDate ?? "",
    genre: release.genre?.slug ?? "",
    subGenre: release.subGenre ?? "",
    moods: release.moods.join(", "),
    language: release.language ?? "",
    labelName: release.labelName ?? "",
    upc: release.upc ?? "",
    copyrightLine: release.copyrightLine ?? "",
    phonographicLine: release.phonographicLine ?? "",
    description: release.description ?? "",
    explicit: release.explicit,
    priceXaf: release.priceXaf?.toString() ?? "",
  };
}

interface MetadataFormProps {
  release: StudioRelease;
  saverRef: React.MutableRefObject<(() => Promise<void>) | null>;
  onDirtyChange: (dirty: boolean) => void;
}

function MetadataForm({ release, saverRef, onDirtyChange }: MetadataFormProps) {
  const { t, i18n } = useTranslation();
  const genres = useGenres();
  const pricing = usePricing();
  const refresh = useRefreshRelease();
  const [featured, setFeatured] = useState<ArtistSummary[]>(release.featured);
  const [saved, setSaved] = useState(false);
  const locked = release.status === "TAKEN_DOWN";

  const { register, handleSubmit, reset, formState } = useForm<MetadataValues>({ resolver: zodResolver(releaseDetailsSchema) });
  const featuredChanged = featured.map((a) => a.id).join() !== release.featured.map((a) => a.id).join();
  const dirty = formState.isDirty || featuredChanged;

  useEffect(() => onDirtyChange(dirty), [dirty, onDirtyChange]);

  // Reload the form from the server only when nothing is being edited: the release is
  // refreshed after uploads and every few seconds while audio is processing, and that
  // must not wipe a genre (or anything else) the artist has chosen but not saved yet
  const dirtyRef = useRef(dirty);
  dirtyRef.current = dirty;
  useEffect(() => {
    if (dirtyRef.current) return;
    reset(formValuesOf(release));
    setFeatured(release.featured);
  }, [release, reset]);

  const save = useMutation({
    mutationFn: (values: MetadataValues) => {
      const empty = (value?: string) => (value?.trim() ? value.trim() : null);
      return updateRelease(release.id, {
        title: values.title,
        ...(EDITABLE.includes(release.status) ? { type: values.type } : {}),
        releaseDate: empty(values.releaseDate),
        genre: empty(values.genre),
        subGenre: empty(values.subGenre),
        moods: (values.moods ?? "").split(",").map((m) => m.trim()).filter(Boolean).slice(0, 5),
        language: empty(values.language),
        labelName: empty(values.labelName),
        upc: empty(values.upc),
        copyrightLine: empty(values.copyrightLine),
        phonographicLine: empty(values.phonographicLine),
        description: empty(values.description),
        explicit: values.explicit,
        priceXaf: values.priceXaf ? Number(values.priceXaf) : null,
        featuredArtistIds: featured.map((a) => a.id),
      });
    },
    onSuccess: (_reply, values) => {
      setSaved(true);
      // What was saved becomes the new starting point: the form is clean again
      reset(values);
      refresh();
    },
  });

  // Lets "Publish" save these details first; rejects when a field is invalid
  saverRef.current = dirty
    ? () =>
        new Promise<void>((resolve, reject) => {
          void handleSubmit(
            async (values) => {
              await save.mutateAsync(values).then(() => resolve(), reject);
            },
            () => reject(new Error(t("studio.fixDetails"))),
          )();
        })
    : null;

  return (
    <form onSubmit={handleSubmit((values) => { setSaved(false); save.mutate(values); })} className="card flex flex-col gap-4 p-5" noValidate>
      <h2 className="font-semibold">{t("studio.details")}</h2>
      {save.isError && <Alert>{errorMessage(save.error)}</Alert>}

      <fieldset disabled={locked} className="grid gap-4 sm:grid-cols-2">
        <Field label={t("studio.releaseTitle")} className="sm:col-span-2" error={formState.errors.title && t("studio.releaseTitle")}>
          <Input {...register("title")} />
        </Field>

        <Field label={t("studio.releaseType")} hint={t("studio.trackRule", release.trackLimits)}>
          <Select disabled={!EDITABLE.includes(release.status)} {...register("type")}>
            {(["SINGLE", "EP", "ALBUM", "MIXTAPE", "COMPILATION"] as const).map((type) => (
              <option key={type} value={type}>{t(`release.types.${type}`)}</option>
            ))}
          </Select>
        </Field>
        <Field label={t("studio.releaseDate")} optional>
          <Input type="date" {...register("releaseDate")} />
        </Field>

        <Field label={t("studio.genre")}>
          <Select {...register("genre")}>
            <option value="">{t("studio.chooseGenre")}</option>
            {genres.data?.map((genre) => (
              <option key={genre.slug} value={genre.slug}>{i18n.language === "fr" ? genre.nameFr : genre.name}</option>
            ))}
          </Select>
        </Field>
        <Field label={t("studio.subGenre")} optional><Input {...register("subGenre")} /></Field>

        <Field label={t("studio.moods")} hint={t("studio.moodsHint")} optional><Input {...register("moods")} /></Field>
        <Field label={t("studio.languageField")} optional>
          <Select {...register("language")}>
            <option value="">—</option>
            <option value="fr">Français</option>
            <option value="en">English</option>
            <option value="ln">Lingála</option>
            <option value="ha">Hausa</option>
            <option value="ff">Fulfulde</option>
            <option value="wo">Wolof</option>
            <option value="sw">Kiswahili</option>
            <option value="yo">Yorùbá</option>
          </Select>
        </Field>

        <Field label={t("studio.labelName")} optional><Input {...register("labelName")} /></Field>
        <Field label={t("studio.upc")} optional error={formState.errors.upc?.message}><Input inputMode="numeric" {...register("upc")} /></Field>
        <Field label={t("studio.copyrightLine")} optional><Input placeholder="2027 Artist name" {...register("copyrightLine")} /></Field>
        <Field label={t("studio.phonographicLine")} optional><Input placeholder="2027 Label name" {...register("phonographicLine")} /></Field>

        <Field
          label={t("studio.releasePrice")}
          optional
          error={formState.errors.priceXaf?.message}
          hint={t("studio.priceHint", { amount: formatXaf(pricing.data?.suggestedReleasePriceXaf ?? 2500, i18n.language) })}
        >
          <Input type="number" inputMode="numeric" min={100} step={50} placeholder={t("studio.notForSale")} {...register("priceXaf")} />
        </Field>

        <Field label={t("studio.description")} className="sm:col-span-2" optional><Textarea rows={4} {...register("description")} /></Field>

        <div className="sm:col-span-2">
          <p className="label">{t("studio.featuredArtists")}</p>
          <ArtistPicker value={featured} onChange={setFeatured} excludeId={release.artist.id} disabled={locked} />
        </div>

        <div className="sm:col-span-2">
          <Checkbox label={t("studio.explicit")} {...register("explicit")} />
        </div>
      </fieldset>

      {!locked && (
        <div className="flex items-center gap-3">
          <Button type="submit" loading={save.isPending}>{t("common.save")}</Button>
          {saved && <span className="text-sm text-monkii-400">{t("common.saved")}</span>}
        </div>
      )}
    </form>
  );
}
