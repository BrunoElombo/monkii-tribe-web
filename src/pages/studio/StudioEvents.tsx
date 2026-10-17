import { useState } from "react";
import { useForm } from "react-hook-form";
import { Link, useNavigate } from "react-router";
import { useTranslation } from "react-i18next";
import { useMutation } from "@tanstack/react-query";
import { PlusIcon, TicketIcon } from "@heroicons/react/24/outline";
import { Cover } from "../../components/Cover";
import { Alert, Badge, Button, EmptyState, Field, Input, PageLoader, Select } from "../../components/ui";
import { useStudioEvents } from "../../hooks/events";
import { useCountries } from "../../hooks/user";
import { createEvent } from "../../services/event.service";
import type { Artist, EventType } from "../../types";
import { formatEventDate } from "../../utils/format";
import { translatedError } from "../../utils/problems";

const TYPES: EventType[] = ["CONCERT", "FESTIVAL", "SHOWCASE", "LIVESTREAM", "MEET_AND_GREET"];

interface NewEventForm {
  title: string;
  type: EventType;
  startsAt: string;
  city: string;
  region: string;
  country: string;
}

/** Studio tab: the artist's events (EVT-01). */
export function StudioEvents({ artist }: { artist: Artist }) {
  const { t, i18n } = useTranslation();
  const navigate = useNavigate();
  const [creating, setCreating] = useState(false);
  const countries = useCountries();
  const language = i18n.language === "fr" ? "fr" : "en";

  const events = useStudioEvents(artist.id);

  const { register, handleSubmit, watch } = useForm<NewEventForm>({
    defaultValues: { type: "CONCERT", country: artist.country ?? "CM", city: artist.city ?? "", region: "" },
  });
  const regions = countries.data?.regions[watch("country")];

  const create = useMutation({
    mutationFn: (values: NewEventForm) =>
      createEvent({ ...values, artistId: artist.id, startsAt: new Date(values.startsAt).toISOString() }),
    onSuccess: (event) => navigate(`/studio/events/${event.id}`),
  });

  return (
    <div className="flex flex-col gap-4">
      {creating ? (
        <form onSubmit={handleSubmit((values) => create.mutate(values))} className="card grid gap-3 p-4 sm:grid-cols-2">
          <Field label={t("eventEditor.eventTitle")} className="sm:col-span-2"><Input autoFocus required maxLength={200} {...register("title", { required: true })} /></Field>
          <Field label={t("eventEditor.type")}>
            <Select {...register("type")}>{TYPES.map((type) => <option key={type} value={type}>{t(`events.types.${type}`)}</option>)}</Select>
          </Field>
          <Field label={t("eventEditor.startsAt")}><Input type="datetime-local" required {...register("startsAt", { required: true })} /></Field>
          <Field label={t("auth.country")}>
            <Select {...register("country")}>{countries.data?.countries.map((c) => <option key={c.code} value={c.code}>{c.name[language]}</option>)}</Select>
          </Field>
          <Field label={t("auth.region")}>
            {regions ? (
              <Select required {...register("region", { required: true })}><option value="">—</option>{regions.map((r) => <option key={r} value={r}>{r}</option>)}</Select>
            ) : (
              <Input required {...register("region", { required: true })} />
            )}
          </Field>
          <Field label={t("auth.city")}><Input required {...register("city", { required: true })} /></Field>
          {create.isError && <div className="sm:col-span-2"><Alert>{translatedError(create.error)}</Alert></div>}
          <div className="flex gap-2 sm:col-span-2">
            <Button type="submit" loading={create.isPending}>{t("eventEditor.create")}</Button>
            <Button type="button" variant="ghost" onClick={() => setCreating(false)}>{t("common.cancel")}</Button>
          </div>
        </form>
      ) : (
        <Button className="self-start" icon={<PlusIcon className="h-5 w-5" />} onClick={() => setCreating(true)}>{t("studio.newEvent")}</Button>
      )}

      {events.isPending && <PageLoader />}
      {events.data?.length === 0 && <EmptyState icon={<TicketIcon />} title={t("studio.noEvents")} />}

      <ul className="flex flex-col gap-2">
        {events.data?.map((event) => (
          <li key={event.id}>
            <Link to={`/studio/events/${event.id}`} className="card flex items-center gap-4 p-3 transition hover:border-monkii-500/50">
              <Cover src={event.coverThumbUrl} alt="" className="h-14 w-14 shrink-0" rounded="rounded-lg" />
              <div className="min-w-0 flex-1">
                <p className="truncate font-semibold">{event.title}</p>
                <p className="text-xs text-muted">{formatEventDate(event.startsAt, event.timezone, i18n.language, true)} · {event.city}</p>
                <p className="text-xs text-muted">{t("studio.ticketsSold", { sold: event.ticketsSold, capacity: event.capacity })}</p>
              </div>
              <Badge tone={event.status === "PUBLISHED" ? "strong" : "muted"}>{t(`events.statuses.${event.status}`)}</Badge>
            </Link>
          </li>
        ))}
      </ul>
    </div>
  );
}
