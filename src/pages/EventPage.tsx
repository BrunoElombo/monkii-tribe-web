import { useEffect, useRef, useState } from "react";
import { Link, useNavigate, useParams } from "react-router";
import { useTranslation } from "react-i18next";
import clsx from "clsx";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import {
  CalendarDaysIcon, ChartBarIcon, MapPinIcon, PencilSquareIcon, ShareIcon, StarIcon as StarOutline, TicketIcon, VideoCameraIcon,
} from "@heroicons/react/24/outline";
import { StarIcon } from "@heroicons/react/24/solid";
import { useAuth } from "../auth/AuthProvider";
import { ArtistCard, CardGrid } from "../components/Cards";
import { Alert, Badge, Button, PageLoader, Select } from "../components/ui";
import { useEvent } from "../hooks/events";
import { useCheckout } from "../hooks/payments";
import { recordEventView, reserveTickets, toggleInterest } from "../services/event.service";
import type { EventDetails, TicketTier } from "../types";
import { formatEventDate, formatXaf } from "../utils/format";
import { errorMessage, translatedError } from "../utils/problems";
import { NotFoundPage } from "./NotFoundPage";

/** One random id per browser, so event analytics can count unique visitors without tracking people. */
function visitorId(): string {
  try {
    let id = localStorage.getItem("monkii.visitor");
    if (!id) {
      id = crypto.randomUUID();
      localStorage.setItem("monkii.visitor", id);
    }
    return id;
  } catch {
    return crypto.randomUUID();
  }
}

/** utm_source from the link, else the referring site, else "direct" (ANA-05 traffic sources). */
function trafficSource(): string {
  const utm = new URLSearchParams(location.search).get("utm_source");
  if (utm) return utm.slice(0, 60);
  try {
    const referrer = document.referrer ? new URL(document.referrer).hostname : "";
    return referrer && referrer !== location.hostname ? referrer : "direct";
  } catch {
    return "direct";
  }
}

export function EventPage() {
  const { id = "" } = useParams();
  const { t, i18n } = useTranslation();
  const { user } = useAuth();
  const event = useEvent(id);
  const viewSent = useRef(false);

  // Page view beacon, once per visit
  useEffect(() => {
    if (!event.data || viewSent.current || event.data.status === "DRAFT") return;
    viewSent.current = true;
    void recordEventView(id, { visitorId: visitorId(), source: trafficSource() }).catch(() => undefined);
  }, [event.data, id]);

  if (event.isPending) return <PageLoader />;
  if (event.isError) return (event.error as { status?: number }).status === 404 ? <NotFoundPage /> : <Alert>{errorMessage(event.error)}</Alert>;

  const data = event.data;
  const description = i18n.language === "fr" ? data.descriptionFr || data.description : data.description || data.descriptionFr;
  const online = data.type === "LIVESTREAM";

  return (
    <div className="flex flex-col gap-8">
      <header className="relative -mx-4 -mt-4 overflow-hidden md:-mx-8">
        <div className="h-56 bg-gradient-to-br from-monkii-600 to-monkii-950 md:h-80">
          {data.coverUrl && <img src={data.coverUrl} alt="" className="h-full w-full object-cover opacity-70" />}
        </div>
        <div className="absolute inset-0 bg-gradient-to-t from-bg via-bg/50 to-transparent" />
        <div className="absolute bottom-0 left-0 right-0 px-4 pb-5 md:px-8">
          <div className="flex flex-wrap items-center gap-2">
            <Badge tone="accent">{t(`events.types.${data.type}`)}</Badge>
            {data.status !== "PUBLISHED" && <Badge tone="muted">{t(`events.statuses.${data.status}`)}</Badge>}
            {data.ageRestriction ? <Badge tone="muted">{data.ageRestriction}+</Badge> : null}
          </div>
          <h1 className="mt-2 text-3xl font-bold md:text-5xl">{data.title}</h1>
          <Link to={`/artists/${data.artist.slug}`} className="mt-1 inline-block font-semibold text-monkii-300 hover:underline">{data.artist.stageName}</Link>
        </div>
      </header>

      {data.status === "CANCELLED" && <Alert>{t("events.cancelled", { reason: data.cancelledReason ?? "" })}</Alert>}
      {data.status === "ENDED" && <Alert tone="info">{t("events.ended")}</Alert>}

      <div className="grid gap-8 lg:grid-cols-[1fr_22rem]">
        <div className="flex flex-col gap-6">
          <div className="card flex flex-col gap-3 p-5 text-sm">
            <p className="flex items-center gap-2"><CalendarDaysIcon className="h-5 w-5 text-monkii-500" />{formatEventDate(data.startsAt, data.timezone, i18n.language, true)}{data.endsAt && ` → ${formatEventDate(data.endsAt, data.timezone, i18n.language)}`}</p>
            <p className="flex items-center gap-2">
              {online ? <VideoCameraIcon className="h-5 w-5 text-monkii-500" /> : <MapPinIcon className="h-5 w-5 text-monkii-500" />}
              {online ? t("events.online") : [data.venueName, data.address, data.city, data.region].filter(Boolean).join(", ")}
            </p>
            {online && data.streamUrl && data.myTickets ? (
              <a href={data.streamUrl} target="_blank" rel="noreferrer noopener" className="font-semibold text-monkii-400 hover:underline">{t("events.watch")}</a>
            ) : null}
          </div>

          <EventActions event={data} />

          {description && (
            <section>
              <h2 className="mb-2 text-xl font-semibold">{t("events.about")}</h2>
              <p className="whitespace-pre-line text-sm leading-relaxed text-fg/90">{description}</p>
            </section>
          )}

          {data.lineup.length > 0 && (
            <section>
              <h2 className="mb-2 text-xl font-semibold">{t("events.lineup")}</h2>
              <CardGrid>{[data.artist, ...data.lineup].map((artist) => <ArtistCard key={artist.id} artist={artist} />)}</CardGrid>
            </section>
          )}
        </div>

        <aside className="flex flex-col gap-4">
          <TicketBox event={data} signedIn={Boolean(user)} />
        </aside>
      </div>
    </div>
  );
}

function EventActions({ event }: { event: EventDetails }) {
  const { t } = useTranslation();
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [copied, setCopied] = useState(false);

  const interest = useMutation({
    mutationFn: () => toggleInterest(event.id, event.isInterested),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["events", "detail", event.id] }),
  });

  // EVT-08: share with a utm_source so the organiser sees where visitors come from
  const share = async () => {
    const url = `${location.origin}/events/${event.id}?utm_source=share`;
    if (navigator.share) {
      await navigator.share({ title: event.title, url }).catch(() => undefined);
    } else {
      await navigator.clipboard.writeText(url);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  return (
    <div className="flex flex-wrap items-center gap-2">
      {user && event.status === "PUBLISHED" && (
        <Button
          variant="secondary"
          loading={interest.isPending}
          icon={event.isInterested ? <StarIcon className="h-5 w-5 text-monkii-500" /> : <StarOutline className="h-5 w-5" />}
          onClick={() => interest.mutate()}
        >
          {t("events.interested")}
        </Button>
      )}
      <Button variant="ghost" icon={<ShareIcon className="h-5 w-5" />} onClick={() => void share()}>{copied ? t("common.copied") : t("events.share")}</Button>
      {event.interestedCount ? <span className="text-sm text-muted">{t("events.interestedCount", { count: event.interestedCount })}</span> : null}

      {event.isManager && (
        <div className="ml-auto flex gap-2">
          <Link to={`/studio/events/${event.id}`} className="inline-flex items-center gap-1 text-sm font-semibold text-monkii-400 hover:underline"><PencilSquareIcon className="h-4 w-4" />{t("common.edit")}</Link>
          <Link to={`/studio/events/${event.id}/stats`} className="inline-flex items-center gap-1 text-sm font-semibold text-monkii-400 hover:underline"><ChartBarIcon className="h-4 w-4" />{t("eventEditor.stats")}</Link>
        </div>
      )}
    </div>
  );
}

/** Tier list + reservation (EVT-03, EVT-04). */
function TicketBox({ event, signedIn }: { event: EventDetails; signedIn: boolean }) {
  const { t, i18n } = useTranslation();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [tierId, setTierId] = useState<string | null>(event.tiers.find((tier) => tier.onSale)?.id ?? null);
  const [quantity, setQuantity] = useState(1);

  const reserve = useMutation({
    mutationFn: () => reserveTickets(event.id, tierId, quantity),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ["events"] });
      navigate("/tickets");
    },
  });
  // Paid tiers: the tickets are held during the mobile money checkout (EVT-04, PAY-02)
  const checkout = useCheckout();

  const selected = event.tiers.find((tier) => tier.id === tierId);
  const paid = Boolean(selected && selected.priceXaf > 0);
  const onSale = event.status === "PUBLISHED" && new Date(event.startsAt) > new Date();

  return (
    <section className="card flex flex-col gap-4 p-5">
      <h2 className="flex items-center gap-2 text-lg font-semibold"><TicketIcon className="h-5 w-5 text-monkii-500" />{t("events.tickets")}</h2>

      {event.myTickets ? (
        <Link to="/tickets" className="rounded-xl bg-monkii-500/10 px-3 py-2 text-sm font-semibold text-monkii-300 hover:underline">
          {t("events.youHave", { count: event.myTickets })} → {t("events.viewTickets")}
        </Link>
      ) : null}

      <ul className="flex flex-col gap-2">
        {event.tiers.map((tier) => (
          <li key={tier.id}>
            <button
              type="button"
              disabled={!tier.onSale || !onSale}
              onClick={() => setTierId(tier.id)}
              className={clsx(
                "flex w-full items-center justify-between gap-3 rounded-xl border p-3 text-left transition disabled:opacity-50",
                tierId === tier.id ? "border-monkii-500 bg-monkii-500/10" : "border-line hover:border-monkii-500/50",
              )}
            >
              <span>
                <span className="block font-semibold">{tier.name}</span>
                {tier.description && <span className="block text-xs text-muted">{tier.description}</span>}
                <span className="block text-xs text-muted">{tierAvailability(tier, t)}</span>
              </span>
              <span className="whitespace-nowrap font-semibold">{tier.priceXaf === 0 ? t("common.free") : formatXaf(tier.priceXaf, i18n.language)}</span>
            </button>
          </li>
        ))}
      </ul>

      {onSale && selected && (
        <>
          <div className="flex items-center gap-3">
            <Select className="w-24" value={quantity} onChange={(event) => setQuantity(Number(event.target.value))} aria-label="Quantity">
              {Array.from({ length: Math.min(selected.perOrderLimit, selected.remaining) }, (_, i) => i + 1).map((n) => <option key={n} value={n}>{n}</option>)}
            </Select>
            <span className="text-sm font-semibold">{selected.priceXaf === 0 ? t("common.free") : formatXaf(selected.priceXaf * quantity, i18n.language)}</span>
          </div>
          {reserve.isError && <Alert>{translatedError(reserve.error)}</Alert>}
          {checkout.isError && <Alert>{translatedError(checkout.error)}</Alert>}
          <Button
            size="lg"
            loading={reserve.isPending || checkout.isPending}
            onClick={() => {
              if (!signedIn) return navigate("/login", { state: { from: location.pathname } });
              if (paid && tierId) checkout.mutate({ kind: "TICKETS", eventId: event.id, tierId, quantity });
              else reserve.mutate();
            }}
          >
            {paid && selected ? t("events.buy", { amount: formatXaf(selected.priceXaf * quantity, i18n.language) }) : t("events.reserve")}
          </Button>
          {selected.priceXaf > 0 && <p className="text-xs text-muted">{t("events.reserveNote")}</p>}
        </>
      )}
    </section>
  );
}

function tierAvailability(tier: TicketTier, t: (key: string, options?: Record<string, unknown>) => string) {
  if (tier.remaining === 0) return t("events.soldOut");
  if (!tier.onSale) return t("events.notOnSale");
  return tier.remaining <= 20 ? t("events.remaining", { count: tier.remaining }) : "";
}
