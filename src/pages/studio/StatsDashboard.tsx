import { useState } from "react";
import { useTranslation } from "react-i18next";
import { ArrowDownTrayIcon, LightBulbIcon, ShieldCheckIcon } from "@heroicons/react/24/outline";
import { Cover } from "../../components/Cover";
import { BarList, Segmented, StatTile, TimeSeriesChart } from "../../components/charts";
import { Alert, Button, PageLoader } from "../../components/ui";
import { useArtistAudience, useArtistInsights, useArtistOverview, useArtistTimeseries, useArtistTrackStats } from "../../hooks/analytics";
import { useCountries } from "../../hooks/user";
import type { AudienceReport, DayPoint, PeriodKey, TrackStat } from "../../types";
import { toCsv } from "../../utils/csv";
import { saveBlob } from "../../utils/download";
import { formatNumber, formatXaf } from "../../utils/format";
import { errorMessage } from "../../utils/problems";

type Metric = "plays" | "listeners" | "followers";

/** Artist dashboard (ANA-01 to ANA-04, ANA-07). */
export function StatsDashboard({ artistId }: { artistId: string }) {
  const { t, i18n } = useTranslation();
  const [period, setPeriod] = useState<PeriodKey>("28d");
  const [metric, setMetric] = useState<Metric>("plays");
  const [segment, setSegment] = useState<"listeners" | "followers">("listeners");

  const overview = useArtistOverview(artistId, period);
  const series = useArtistTimeseries(artistId, period);
  const audience = useArtistAudience(artistId, period, segment);
  const tracks = useArtistTrackStats(artistId, period);
  const n = (value: number) => formatNumber(value, i18n.language);

  if (overview.isError) return <Alert>{errorMessage(overview.error)}</Alert>;

  const kpis = overview.data?.kpis;

  return (
    <div className="flex flex-col gap-6">
      <Insights artistId={artistId} />

      {/* One row of filters above everything they control */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <Segmented
          label={t("stats.title")}
          value={period}
          onChange={setPeriod}
          options={(["7d", "28d", "365d", "all"] as const).map((value) => ({ value, label: t(`stats.periods.${value}`) }))}
        />
        <Button
          size="sm"
          variant="secondary"
          icon={<ArrowDownTrayIcon className="h-4 w-4" />}
          disabled={!series.data || !tracks.data}
          onClick={() => exportCsv(artistId, period, series.data ?? [], tracks.data ?? [], audience.data)}
        >
          {t("stats.exportCsv")}
        </Button>
      </div>

      {!kpis ? (
        <PageLoader />
      ) : (
        <div className="grid grid-cols-2 gap-3 lg:grid-cols-4 xl:grid-cols-7">
          <StatTile label={t("stats.kpi.followers")} value={n(kpis.followers.value)} change={kpis.followers.change} hint={t("stats.newFollowers", { count: kpis.followers.delta ?? 0 })} />
          <StatTile label={t("stats.kpi.monthlyListeners")} value={n(kpis.monthlyListeners.value)} />
          <StatTile label={t("stats.kpi.plays")} value={n(kpis.plays.value)} change={kpis.plays.change} />
          <StatTile label={t("stats.kpi.listeners")} value={n(kpis.listeners.value)} change={kpis.listeners.change} />
          <StatTile label={t("stats.kpi.likes")} value={n(kpis.likes.value)} change={kpis.likes.change} />
          <StatTile label={t("stats.kpi.playlistAdds")} value={n(kpis.playlistAdds.value)} change={kpis.playlistAdds.change} />
          {kpis.sales && (
            <StatTile label={t("stats.kpi.sales")} value={n(kpis.sales.value)} change={kpis.sales.change} hint={formatXaf(kpis.sales.amountXaf, i18n.language)} />
          )}
        </div>
      )}

      <section className="card p-4">
        <div className="mb-3 flex flex-wrap items-center justify-between gap-3">
          <h2 className="font-semibold">{t("stats.overTime")}</h2>
          <Segmented
            label={t("stats.overTime")}
            value={metric}
            onChange={setMetric}
            options={(["plays", "listeners", "followers"] as const).map((value) => ({ value, label: t(`stats.metric.${value}`) }))}
          />
        </div>
        {series.data ? (
          <TimeSeriesChart label={t(`stats.metric.${metric}`)} data={series.data.map((point) => ({ day: point.day, value: point[metric] }))} />
        ) : (
          <PageLoader />
        )}
      </section>

      <section className="flex flex-col gap-3">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h2 className="text-xl font-semibold">{t("stats.audience")}{audience.data ? ` · ${n(audience.data.total)}` : ""}</h2>
          <Segmented
            label={t("stats.audience")}
            value={segment}
            onChange={setSegment}
            options={[
              { value: "listeners", label: t("stats.segment.listeners") },
              { value: "followers", label: t("stats.segment.followers") },
            ]}
          />
        </div>
        {audience.data ? <AudienceGrid audience={audience.data} /> : <PageLoader />}
        <p className="flex items-center gap-2 text-xs text-muted"><ShieldCheckIcon className="h-4 w-4" />{t("stats.privacy")}</p>
      </section>

      <section className="card overflow-x-auto p-4">
        <h2 className="mb-3 font-semibold">{t("stats.tracks")}</h2>
        {tracks.data?.length === 0 ? (
          <p className="text-sm text-muted">{t("stats.noData")}</p>
        ) : (
          <table className="w-full min-w-[36rem] text-sm">
            <thead>
              <tr className="text-left text-xs text-muted">
                <th className="pb-2 font-medium">{t("stats.track")}</th>
                <th className="pb-2 text-right font-medium">{t("stats.kpi.plays")}</th>
                <th className="pb-2 text-right font-medium">{t("stats.kpi.listeners")}</th>
                <th className="pb-2 text-right font-medium">{t("stats.completion")}</th>
                <th className="pb-2 text-right font-medium">{t("stats.skips")}</th>
              </tr>
            </thead>
            <tbody>
              {tracks.data?.map((track) => (
                <tr key={track.trackId} className="border-t border-line">
                  <td className="py-2">
                    <span className="flex items-center gap-3">
                      <Cover src={track.coverThumbUrl} alt="" className="h-9 w-9 shrink-0" rounded="rounded-md" />
                      <span className="min-w-0">
                        <span className="block truncate font-medium">{track.title}</span>
                        <span className="block truncate text-xs text-muted">{track.releaseTitle}</span>
                      </span>
                    </span>
                  </td>
                  <td className="py-2 text-right tabular-nums">{n(track.plays)}</td>
                  <td className="py-2 text-right tabular-nums">{n(track.listeners)}</td>
                  <td className="py-2 text-right tabular-nums">{track.completionRate}%</td>
                  <td className="py-2 text-right tabular-nums">{track.skipRate}%</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </section>
    </div>
  );
}

/** The demographic breakdowns, also reused by event statistics. */
export function AudienceGrid({ audience }: { audience: AudienceReport }) {
  const { t, i18n } = useTranslation();
  const countries = useCountries();
  const language = i18n.language === "fr" ? "fr" : "en";

  const countryName = (code: string) => countries.data?.countries.find((c) => c.code === code)?.name[language] ?? code;
  // Regions and cities come as "CM:Littoral"
  const place = (key: string) => {
    const [country, name] = key.split(":");
    return name ? `${name} (${countryName(country)})` : key;
  };
  const languageName = (code: string) => (code === "fr" ? "Français" : code === "en" ? "English" : code);

  return (
    <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
      <BarList title={t("stats.region")} buckets={audience.region} label={place} />
      <BarList title={t("stats.gender")} buckets={audience.gender} label={(key) => t(`auth.genders.${key}`, { defaultValue: key })} />
      <BarList title={t("stats.age")} buckets={audience.age} />
      <BarList title={t("stats.country")} buckets={audience.country} label={countryName} />
      <BarList title={t("stats.city")} buckets={audience.city} label={place} />
      <BarList title={t("stats.language")} buckets={audience.language} label={languageName} />
      {audience.device && audience.device.length > 0 && (
        <BarList title={t("stats.device")} buckets={audience.device} label={(key) => t(`stats.devices.${key}`, { defaultValue: key })} />
      )}
    </div>
  );
}

// ---------------------------------------------------------------- career insights (ANA-06)

function Insights({ artistId }: { artistId: string }) {
  const { t, i18n } = useTranslation();
  const insights = useArtistInsights(artistId);

  if (!insights.data?.length) return null;

  // Weekday numbers become names in the reader's language (0 = Sunday)
  const weekday = (day: number) => new Date(Date.UTC(2023, 0, 1 + day)).toLocaleDateString(i18n.language, { weekday: "long", timeZone: "UTC" });

  return (
    <section className="card border-monkii-500/40 p-5">
      <h2 className="mb-3 flex items-center gap-2 font-semibold"><LightBulbIcon className="h-5 w-5 text-monkii-500" />{t("stats.insightsTitle")}</h2>
      <ul className="flex flex-col gap-2 text-sm">
        {insights.data.map((insight) => (
          <li key={insight.code} className="rounded-xl bg-elevated/50 px-3 py-2">
            {t(`stats.insights.${insight.code}`, {
              ...insight.params,
              ...(insight.code === "best_day" ? { day: weekday(Number(insight.params.weekday)) } : {}),
            })}
          </li>
        ))}
      </ul>
    </section>
  );
}

// ---------------------------------------------------------------- CSV export (ANA-08)

/** Everything on screen in one file: daily series, tracks and audience shares. */
function exportCsv(artistId: string, period: PeriodKey, series: DayPoint[], tracks: TrackStat[], audience?: AudienceReport) {
  const sections = [
    toCsv(["day", "plays", "listeners", "new_followers"], series.map((p) => [p.day, p.plays, p.listeners, p.followers])),
    toCsv(
      ["track", "release", "plays", "listeners", "completion_rate_%", "skip_rate_%"],
      tracks.map((track) => [track.title, track.releaseTitle ?? "", track.plays, track.listeners, track.completionRate, track.skipRate]),
    ),
  ];

  if (audience) {
    const rows: (string | number)[][] = [];
    for (const dimension of ["gender", "age", "country", "region", "city", "language", "device"] as const) {
      for (const bucket of audience[dimension] ?? []) rows.push([dimension, bucket.key, bucket.count, bucket.share]); // share is already a percentage
    }
    sections.push(toCsv(["dimension", "value", "count", "share_%"], rows));
  }

  // BOM so Excel opens the accents correctly
  saveBlob(new Blob(["\ufeff", sections.join("\r\n\r\n")], { type: "text/csv;charset=utf-8" }), `monkii-stats-${artistId.slice(0, 8)}-${period}.csv`);
}
