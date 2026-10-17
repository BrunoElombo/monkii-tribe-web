import { Link } from "react-router";
import { useTranslation } from "react-i18next";
import clsx from "clsx";
import { TicketIcon } from "@heroicons/react/24/outline";
import { QrCode } from "../components/qr";
import { Badge, Button, EmptyState, PageLoader } from "../components/ui";
import { useMyTickets } from "../hooks/events";
import { formatEventDate } from "../utils/format";

/** The ticket wallet (EVT-04): one QR code per ticket. */
export function TicketsPage() {
  const { t, i18n } = useTranslation();
  const tickets = useMyTickets();

  if (tickets.isPending) return <PageLoader />;

  return (
    <div className="flex flex-col gap-6">
      <h1 className="text-3xl font-semibold">{t("tickets.title")}</h1>

      {tickets.data?.length === 0 && (
        <EmptyState icon={<TicketIcon />} title={t("tickets.empty")} action={<Link to="/events"><Button variant="secondary">{t("nav.events")}</Button></Link>} />
      )}

      <ul className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        {tickets.data?.map((ticket) => (
          <li key={ticket.id} className={clsx("card flex flex-col items-center gap-3 p-5 text-center", ticket.status !== "VALID" && "opacity-60")}>
            <Link to={`/events/${ticket.event.id}`} className="font-display text-lg font-semibold hover:underline">{ticket.event.title}</Link>
            <p className="text-sm text-muted">{ticket.event.artist.stageName} · {formatEventDate(ticket.event.startsAt, ticket.event.timezone, i18n.language)}</p>
            <p className="text-xs text-muted">{[ticket.event.venueName, ticket.event.city].filter(Boolean).join(", ")}</p>

            {ticket.status === "VALID" ? <QrCode value={ticket.code} /> : null}

            <p className="font-mono text-lg font-bold tracking-widest">{ticket.code}</p>
            <div className="flex flex-wrap justify-center gap-2">
              <Badge tone="accent">{ticket.tier.name}</Badge>
              <Badge tone={ticket.status === "VALID" ? "strong" : "muted"}>{t(`tickets.statuses.${ticket.status}`)}</Badge>
              <Badge tone="muted">{t(`tickets.payment.${ticket.paymentStatus}`)}</Badge>
            </div>
            {ticket.status === "VALID" && <p className="text-xs text-muted">{t("tickets.showAtEntrance")}</p>}
          </li>
        ))}
      </ul>
    </div>
  );
}
