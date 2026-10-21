import { Link } from "react-router";
import { useTranslation } from "react-i18next";
import { CalendarDaysIcon, MapPinIcon, VideoCameraIcon } from "@heroicons/react/24/outline";
import type { EventSummary } from "../types";
import { formatEventDate, formatXaf } from "../utils/format";
import { Cover } from "./Cover";

export function EventCard({ event }: { event: EventSummary }) {
  const { t, i18n } = useTranslation();
  const online = event.type === "LIVESTREAM";

  return (
    <Link to={`/events/${event.id}`} className="card group flex min-w-0 flex-col gap-3 p-3 transition hover:border-monkii-500/60 sm:flex-row sm:gap-4">
      <Cover src={event.coverThumbUrl} alt="" className="aspect-video w-full shrink-0 sm:aspect-auto sm:h-24 sm:w-24" rounded="rounded-xl" />
      <div className="min-w-0 flex-1">
        <p className="text-xs font-semibold uppercase tracking-wide text-monkii-400">{t(`events.types.${event.type}`)}</p>
        <p className="truncate font-display text-lg font-semibold">{event.title}</p>
        <p className="truncate text-sm text-muted">{event.artist.stageName}</p>
        <p className="mt-1 flex items-center gap-1 text-xs text-muted">
          <CalendarDaysIcon className="h-4 w-4 shrink-0" />
          {formatEventDate(event.startsAt, event.timezone, i18n.language)}
        </p>
        <p className="flex items-center gap-1 truncate text-xs text-muted">
          {online ? <VideoCameraIcon className="h-4 w-4 shrink-0" /> : <MapPinIcon className="h-4 w-4 shrink-0" />}
          {online ? t("events.online") : [event.venueName, event.city].filter(Boolean).join(", ")}
        </p>
      </div>
      {event.lowestPriceXaf !== null && (
        <span className="max-w-full self-start truncate whitespace-nowrap rounded-full sm:shrink-0 bg-monkii-500/15 px-2.5 py-1 text-xs font-semibold text-monkii-300">
          {event.lowestPriceXaf === 0 ? t("common.free") : t("events.from", { price: formatXaf(event.lowestPriceXaf, i18n.language) })}
        </span>
      )}
    </Link>
  );
}
