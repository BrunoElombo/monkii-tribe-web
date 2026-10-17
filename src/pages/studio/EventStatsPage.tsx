import { Link, useParams } from "react-router";
import { useTranslation } from "react-i18next";
import { ArrowLeftIcon, ShieldCheckIcon } from "@heroicons/react/24/outline";
import { BarList, StatTile, TimeSeriesChart } from "../../components/charts";
import { Alert, PageLoader } from "../../components/ui";
import { useEventReport } from "../../hooks/analytics";
import { formatNumber, formatXaf } from "../../utils/format";
import { errorMessage } from "../../utils/problems";
import { AudienceGrid } from "./StatsDashboard";

/** Event analytics (ANA-05). */
export function EventStatsPage() {
  const { id = "" } = useParams();
  const { t, i18n } = useTranslation();
  const report = useEventReport(id);
  const n = (value: number) => formatNumber(value, i18n.language);

  if (report.isPending) return <PageLoader />;
  if (report.isError) return <Alert>{errorMessage(report.error)}</Alert>;

  const data = report.data;

  return (
    <div className="flex flex-col gap-6">
      <Link to={`/studio/events/${id}`} className="inline-flex items-center gap-1 text-sm font-semibold text-muted hover:text-fg"><ArrowLeftIcon className="h-4 w-4" /> {t("common.back")}</Link>
      <h1 className="text-3xl font-semibold">{data.event.title} · {t("stats.title")}</h1>

      <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
        <StatTile label={t("stats.views")} value={n(data.views)} hint={`${n(data.uniqueVisitors)} ${t("stats.visitors").toLowerCase()}`} />
        <StatTile label={t("stats.interested")} value={n(data.interested)} />
        <StatTile label={t("stats.ticketsReserved")} value={n(data.tickets)} hint={`${n(data.buyers)} ${t("stats.buyers").toLowerCase()}`} />
        <StatTile label={t("stats.ticketValue")} value={formatXaf(data.ticketValueXaf, i18n.language)} />
        <StatTile label={t("stats.conversion")} value={`${data.conversionRate}%`} />
        <StatTile label={t("stats.followerShare")} value={`${data.followerShare}%`} />
        <StatTile label={t("stats.checkInRate")} value={`${data.checkInRate}%`} />
      </div>

      <section className="card p-4">
        <h2 className="mb-3 font-semibold">{t("stats.salesOverTime")}</h2>
        <TimeSeriesChart label={t("stats.ticketsReserved")} data={data.salesOverTime.map((point) => ({ day: point.day, value: point.tickets }))} height={200} />
      </section>

      <div className="grid gap-3 md:grid-cols-2">
        <BarList
          title={t("stats.byTier")}
          buckets={data.tiers.map((tier) => ({ key: tier.name, count: tier.tickets, share: data.tickets ? Math.round((tier.tickets / data.tickets) * 1000) / 10 : 0 }))}
        />
        <BarList title={t("stats.sources")} buckets={data.sources} />
      </div>

      <section className="flex flex-col gap-3">
        <h2 className="text-xl font-semibold">{t("stats.buyers")} · {n(data.audience.total)}</h2>
        <AudienceGrid audience={data.audience} />
        <p className="flex items-center gap-2 text-xs text-muted"><ShieldCheckIcon className="h-4 w-4" />{t("stats.privacy")}</p>
      </section>
    </div>
  );
}
