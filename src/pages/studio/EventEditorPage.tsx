import { useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import { Link, useNavigate, useParams } from "react-router";
import { useTranslation } from "react-i18next";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { ArrowLeftIcon, ChartBarIcon, CheckCircleIcon, QrCodeIcon, TrashIcon } from "@heroicons/react/24/outline";
import { ArtistPicker } from "../../components/ArtistPicker";
import { Cover } from "../../components/Cover";
import { ImageUpload } from "../../components/ImageUpload";
import { ProblemList } from "../../components/charts";
import { Alert, Badge, Button, Field, IconButton, Input, PageLoader, Select, Textarea } from "../../components/ui";
import { useStudioEvent } from "../../hooks/events";
import { useCountries } from "../../hooks/user";
import { addTier, cancelEvent, deleteEvent, deleteTier, publishEvent, setEventCover, updateEvent } from "../../services/event.service";
import type { ArtistSummary, EventDetails, EventType, TicketTier } from "../../types";
import { formatXaf } from "../../utils/format";
import { errorMessage, translatedError } from "../../utils/problems";
import { NotFoundPage } from "../NotFoundPage";

const TYPES: EventType[] = ["CONCERT", "FESTIVAL", "SHOWCASE", "LIVESTREAM", "MEET_AND_GREET"];

/** "2027-06-14T19:00:00.000Z" -> value for <input type="datetime-local"> in local time */
const toLocalInput = (iso: string | null) => {
  if (!iso) return "";
  const date = new Date(iso);
  return new Date(date.getTime() - date.getTimezoneOffset() * 60000).toISOString().slice(0, 16);
};
const fromLocalInput = (value: string) => (value ? new Date(value).toISOString() : null);

export function EventEditorPage() {
  const { id = "" } = useParams();
  const { t } = useTranslation();
  const event = useStudioEvent(id);

  if (event.isPending) return <PageLoader />;
  if (event.isError) return (event.error as { status?: number }).status === 404 ? <NotFoundPage /> : <Alert>{errorMessage(event.error)}</Alert>;

  const data = event.data;

  return (
    <div className="flex flex-col gap-6">
      <Link to="/studio" className="inline-flex items-center gap-1 text-sm font-semibold text-muted hover:text-fg"><ArrowLeftIcon className="h-4 w-4" /> {t("studio.title")}</Link>

      <header className="flex flex-wrap items-center gap-3">
        <h1 className="text-3xl font-semibold">{data.title}</h1>
        <Badge tone={data.status === "PUBLISHED" ? "strong" : "accent"}>{t(`events.statuses.${data.status}`)}</Badge>
        {data.status !== "DRAFT" && (
          <div className="ml-auto flex flex-wrap gap-3 text-sm font-semibold">
            <Link to={`/events/${data.id}`} className="text-monkii-400 hover:underline">{t("studio.viewEventPage")}</Link>
            <Link to={`/studio/events/${data.id}/check-in`} className="inline-flex items-center gap-1 text-monkii-400 hover:underline"><QrCodeIcon className="h-4 w-4" />{t("eventEditor.attendees")}</Link>
            <Link to={`/studio/events/${data.id}/stats`} className="inline-flex items-center gap-1 text-monkii-400 hover:underline"><ChartBarIcon className="h-4 w-4" />{t("eventEditor.stats")}</Link>
          </div>
        )}
      </header>

      {data.status === "CANCELLED" && <Alert>{t("events.cancelled", { reason: data.cancelledReason ?? "" })}</Alert>}

      <div className="grid gap-6 lg:grid-cols-[18rem_1fr]">
        <aside className="flex flex-col gap-6">
          <PosterPanel event={data} />
          <PublishPanel event={data} />
        </aside>
        <div className="flex flex-col gap-6">
          <DetailsForm event={data} />
          <TiersEditor event={data} />
        </div>
      </div>
    </div>
  );
}

function useRefresh() {
  const queryClient = useQueryClient();
  return () => void queryClient.invalidateQueries({ queryKey: ["events"] });
}

function PosterPanel({ event }: { event: EventDetails }) {
  const { t } = useTranslation();
  const refresh = useRefresh();
  return (
    <section className="card p-4">
      <h2 className="mb-3 font-semibold">{t("eventEditor.cover")}</h2>
      <ImageUpload
        purpose="COVER"
        label={t("studio.uploadCover")}
        hint={t("eventEditor.coverHint")}
        onUploaded={async (asset) => {
          await setEventCover(event.id, asset.id);
          refresh();
        }}
      >
        <Cover src={event.coverUrl} alt={event.title} />
      </ImageUpload>
    </section>
  );
}

function PublishPanel({ event }: { event: EventDetails }) {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const refresh = useRefresh();

  const publish = useMutation({ mutationFn: () => publishEvent(event.id), onSuccess: refresh });
  const cancel = useMutation({ mutationFn: (reason: string) => cancelEvent(event.id, reason), onSuccess: refresh });
  const remove = useMutation({
    mutationFn: () => deleteEvent(event.id),
    onSuccess: () => {
      refresh();
      navigate("/studio", { replace: true });
    },
  });

  const problems = event.publishProblems ?? [];
  const error = publish.error ?? cancel.error ?? remove.error;

  return (
    <section className="card flex flex-col gap-4 p-4">
      <h2 className="font-semibold">{t("studio.publishTitle")}</h2>
      {error && <Alert>{translatedError(error)}</Alert>}

      {event.status === "DRAFT" && (
        <>
          {problems.length === 0 ? (
            <p className="flex items-center gap-2 text-sm text-monkii-300"><CheckCircleIcon className="h-5 w-5" /> {t("studio.readyToPublish")}</p>
          ) : (
            <div>
              <p className="mb-2 text-sm font-medium">{t("studio.beforePublishing")}</p>
              <ProblemList problems={problems} />
            </div>
          )}
          <Button disabled={problems.length > 0} loading={publish.isPending} onClick={() => publish.mutate()}>{t("eventEditor.publish")}</Button>
          <Button variant="ghost" size="sm" loading={remove.isPending} onClick={() => window.confirm(t("eventEditor.deleteConfirm")) && remove.mutate()}>{t("eventEditor.delete")}</Button>
        </>
      )}

      {event.status === "PUBLISHED" && (
        <>
          <p className="text-sm text-muted">{t("eventEditor.published")}</p>
          <Button
            variant="danger"
            loading={cancel.isPending}
            onClick={() => {
              const reason = window.prompt(t("eventEditor.cancelReason"));
              if (reason && reason.trim().length >= 3) cancel.mutate(reason.trim());
            }}
          >
            {t("eventEditor.cancel")}
          </Button>
        </>
      )}
    </section>
  );
}

// ---------------------------------------------------------------- details (EVT-02)

interface DetailsValues {
  title: string;
  type: EventType;
  startsAt: string;
  endsAt: string;
  venueName: string;
  address: string;
  city: string;
  region: string;
  country: string;
  streamUrl: string;
  ageRestriction: string;
  description: string;
  descriptionFr: string;
}

function DetailsForm({ event }: { event: EventDetails }) {
  const { t, i18n } = useTranslation();
  const refresh = useRefresh();
  const countries = useCountries();
  const [lineup, setLineup] = useState<ArtistSummary[]>(event.lineup);
  const [saved, setSaved] = useState(false);
  const locked = event.status === "CANCELLED" || event.status === "ENDED";
  const language = i18n.language === "fr" ? "fr" : "en";

  const { register, handleSubmit, reset, watch } = useForm<DetailsValues>();

  useEffect(() => {
    reset({
      title: event.title,
      type: event.type,
      startsAt: toLocalInput(event.startsAt),
      endsAt: toLocalInput(event.endsAt),
      venueName: event.venueName ?? "",
      address: event.address ?? "",
      city: event.city,
      region: event.region,
      country: event.country,
      streamUrl: event.streamUrl ?? "",
      ageRestriction: event.ageRestriction?.toString() ?? "",
      description: event.description ?? "",
      descriptionFr: event.descriptionFr ?? "",
    });
    setLineup(event.lineup);
  }, [event, reset]);

  const save = useMutation({
    mutationFn: (values: DetailsValues) => {
      const empty = (value: string) => (value.trim() ? value.trim() : null);
      return updateEvent(event.id, {
        title: values.title.trim(),
        type: values.type,
        startsAt: fromLocalInput(values.startsAt) ?? undefined,
        endsAt: fromLocalInput(values.endsAt),
        venueName: empty(values.venueName),
        address: empty(values.address),
        city: values.city.trim(),
        region: values.region.trim(),
        country: values.country,
        streamUrl: empty(values.streamUrl),
        ageRestriction: values.ageRestriction ? Number(values.ageRestriction) : null,
        description: empty(values.description),
        descriptionFr: empty(values.descriptionFr),
        lineupArtistIds: lineup.map((a) => a.id),
      });
    },
    onSuccess: () => {
      setSaved(true);
      refresh();
    },
  });

  const regions = countries.data?.regions[watch("country")];

  return (
    <form onSubmit={handleSubmit((values) => { setSaved(false); save.mutate(values); })} className="card flex flex-col gap-4 p-5">
      <h2 className="font-semibold">{t("eventEditor.details")}</h2>
      {save.isError && <Alert>{translatedError(save.error)}</Alert>}

      <fieldset disabled={locked} className="grid gap-4 sm:grid-cols-2">
        <Field label={t("eventEditor.eventTitle")} className="sm:col-span-2"><Input {...register("title", { required: true })} /></Field>
        <Field label={t("eventEditor.type")}>
          <Select {...register("type")}>{TYPES.map((type) => <option key={type} value={type}>{t(`events.types.${type}`)}</option>)}</Select>
        </Field>
        <Field label={t("eventEditor.ageRestriction")} optional><Input type="number" min={0} max={21} {...register("ageRestriction")} /></Field>
        <Field label={t("eventEditor.startsAt")}><Input type="datetime-local" {...register("startsAt", { required: true })} /></Field>
        <Field label={t("eventEditor.endsAt")} optional><Input type="datetime-local" {...register("endsAt")} /></Field>

        {watch("type") === "LIVESTREAM" ? (
          <Field label={t("eventEditor.streamUrl")} className="sm:col-span-2"><Input type="url" placeholder="https://" {...register("streamUrl")} /></Field>
        ) : (
          <>
            <Field label={t("eventEditor.venueName")}><Input {...register("venueName")} /></Field>
            <Field label={t("eventEditor.address")} optional><Input {...register("address")} /></Field>
          </>
        )}

        <Field label={t("auth.country")}>
          <Select {...register("country")}>{countries.data?.countries.map((c) => <option key={c.code} value={c.code}>{c.name[language]}</option>)}</Select>
        </Field>
        <Field label={t("auth.region")}>
          {regions ? <Select {...register("region")}>{regions.map((r) => <option key={r} value={r}>{r}</option>)}</Select> : <Input {...register("region")} />}
        </Field>
        <Field label={t("auth.city")}><Input {...register("city", { required: true })} /></Field>

        <Field label={t("eventEditor.description")} className="sm:col-span-2" optional><Textarea rows={4} {...register("description")} /></Field>
        <Field label={t("eventEditor.descriptionFr")} className="sm:col-span-2" optional><Textarea rows={4} {...register("descriptionFr")} /></Field>

        <div className="sm:col-span-2">
          <p className="label">{t("eventEditor.lineup")}</p>
          <ArtistPicker value={lineup} onChange={setLineup} excludeId={event.artist.id} disabled={locked} />
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

// ---------------------------------------------------------------- tiers (EVT-03)

interface TierValues {
  name: string;
  priceXaf: string;
  quantity: string;
  perOrderLimit: string;
  salesStartAt: string;
  salesEndAt: string;
  description: string;
}

function TiersEditor({ event }: { event: EventDetails }) {
  const { t, i18n } = useTranslation();
  const refresh = useRefresh();
  const locked = event.status === "CANCELLED" || event.status === "ENDED";
  const { register, handleSubmit, reset } = useForm<TierValues>({ defaultValues: { priceXaf: "0", quantity: "100", perOrderLimit: "4" } });

  const add = useMutation({
    mutationFn: (values: TierValues) =>
      addTier(event.id, {
        name: values.name.trim(),
        description: values.description.trim() || null,
        priceXaf: Number(values.priceXaf) || 0,
        quantity: Number(values.quantity),
        perOrderLimit: Number(values.perOrderLimit) || 4,
        salesStartAt: fromLocalInput(values.salesStartAt),
        salesEndAt: fromLocalInput(values.salesEndAt),
        sortOrder: event.tiers.length,
      }),
    onSuccess: () => {
      reset();
      refresh();
    },
  });

  const remove = useMutation({ mutationFn: (tierId: string) => deleteTier(tierId), onSuccess: refresh });

  return (
    <section className="card flex flex-col gap-4 p-5">
      <h2 className="font-semibold">{t("eventEditor.tiers")}</h2>
      {(add.error || remove.error) && <Alert>{translatedError(add.error ?? remove.error)}</Alert>}

      <ul className="flex flex-col gap-2">
        {event.tiers.map((tier: TicketTier) => (
          <li key={tier.id} className="flex items-center gap-3 rounded-xl border border-line bg-bg p-3">
            <div className="min-w-0 flex-1">
              <p className="font-semibold">{tier.name}</p>
              <p className="text-xs text-muted">{t("eventEditor.sold", { sold: tier.sold, quantity: tier.quantity })} · max {tier.perOrderLimit}</p>
            </div>
            <span className="font-semibold">{tier.priceXaf === 0 ? t("common.free") : formatXaf(tier.priceXaf, i18n.language)}</span>
            {!locked && tier.sold === 0 && (
              <IconButton label={t("common.delete")} onClick={() => remove.mutate(tier.id)}><TrashIcon className="h-4 w-4" /></IconButton>
            )}
          </li>
        ))}
      </ul>

      {!locked && (
        <form onSubmit={handleSubmit((values) => add.mutate(values))} className="grid gap-3 border-t border-line pt-4 sm:grid-cols-3">
          <Field label={t("eventEditor.tierName")} className="sm:col-span-3"><Input required maxLength={60} {...register("name", { required: true })} /></Field>
          <Field label={t("eventEditor.price")}><Input type="number" min={0} step={500} {...register("priceXaf")} /></Field>
          <Field label={t("eventEditor.quantity")}><Input type="number" min={1} {...register("quantity")} /></Field>
          <Field label={t("eventEditor.perOrderLimit")}><Input type="number" min={1} max={20} {...register("perOrderLimit")} /></Field>
          <Field label={t("eventEditor.salesStart")} optional><Input type="datetime-local" {...register("salesStartAt")} /></Field>
          <Field label={t("eventEditor.salesEnd")} optional><Input type="datetime-local" {...register("salesEndAt")} /></Field>
          <Field label={t("studio.description")} optional><Input maxLength={300} {...register("description")} /></Field>
          <Button type="submit" variant="secondary" className="self-start sm:col-span-3" loading={add.isPending}>{t("eventEditor.addTier")}</Button>
        </form>
      )}
    </section>
  );
}
