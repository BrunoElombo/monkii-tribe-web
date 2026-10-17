import { useState } from "react";
import { Link } from "react-router";
import { useTranslation } from "react-i18next";
import { ArrowDownIcon, ArrowUpIcon, MinusIcon } from "@heroicons/react/20/solid";
import { CheckBadgeIcon, PlayIcon } from "@heroicons/react/24/solid";
import { Avatar, Cover } from "../components/Cover";
import { LikeButton } from "../components/TrackList";
import { Segmented } from "../components/charts";
import { EmptyState, PageLoader, Select } from "../components/ui";
import { useCharts, useGenres } from "../hooks/catalog";
import { useCountries } from "../hooks/user";
import { usePlayer } from "../player/PlayerProvider";
import type { ChartRow, Track } from "../types";
import { artistLine, formatCount } from "../utils/format";

type Kind = "tracks" | "trending" | "artists";

/** Weekly charts by country and genre (CAT-09). */
export function ChartsPage() {
  const { t, i18n } = useTranslation();
  const [kind, setKind] = useState<Kind>("tracks");
  const [country, setCountry] = useState("");
  const [genre, setGenre] = useState("");
  const countries = useCountries();
  const genres = useGenres();
  const chart = useCharts(kind, country, genre);
  const language = i18n.language === "fr" ? "fr" : "en";

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-3xl font-semibold">{t("charts.title")}</h1>
        <p className="text-sm text-muted">{t("charts.weekly")}</p>
      </div>

      <div className="flex flex-wrap items-center gap-3">
        <Segmented label={t("charts.title")} value={kind} onChange={setKind} options={(["tracks", "trending", "artists"] as const).map((value) => ({ value, label: t(`charts.${value}`) }))} />
        <Select className="w-48" value={country} onChange={(event) => setCountry(event.target.value)} aria-label={t("auth.country")}>
          <option value="">{t("charts.allCountries")}</option>
          {countries.data?.countries.map((c) => <option key={c.code} value={c.code}>{c.name[language]}</option>)}
        </Select>
        {kind !== "artists" && (
          <Select className="w-48" value={genre} onChange={(event) => setGenre(event.target.value)} aria-label={t("studio.genre")}>
            <option value="">{t("charts.allGenres")}</option>
            {genres.data?.map((g) => <option key={g.slug} value={g.slug}>{language === "fr" ? g.nameFr : g.name}</option>)}
          </Select>
        )}
      </div>

      {chart.isPending && <PageLoader />}
      {chart.data?.length === 0 && <EmptyState title={t("charts.empty")} />}
      {chart.data && chart.data.length > 0 && (kind === "artists" ? <ArtistChart rows={chart.data} /> : <TrackChart rows={chart.data} kind={kind} />)}
    </div>
  );
}

function Movement({ row }: { row: ChartRow }) {
  const { t } = useTranslation();
  if (row.growth !== null) return <span className="text-xs font-semibold text-monkii-300">+{row.growth}%</span>;
  if (row.previousRank === null) return <span className="text-[10px] font-bold uppercase text-monkii-400">{t("charts.new")}</span>;
  if (row.previousRank > row.rank) return <ArrowUpIcon className="h-4 w-4 text-fg" aria-label={`↑ ${row.previousRank}`} />;
  if (row.previousRank < row.rank) return <ArrowDownIcon className="h-4 w-4 text-muted" aria-label={`↓ ${row.previousRank}`} />;
  return <MinusIcon className="h-4 w-4 text-muted" aria-label="=" />;
}

function TrackChart({ rows, kind }: { rows: ChartRow[]; kind: Kind }) {
  const { t, i18n } = useTranslation();
  const { playQueue } = usePlayer();
  const tracks = rows.map((row) => row.track!).filter(Boolean) as Track[];

  return (
    <ol className="flex flex-col">
      {rows.map((row, index) => row.track && (
        <li key={row.track.id} className="group grid grid-cols-[2.5rem_1.5rem_1fr_auto] items-center gap-3 rounded-xl px-2 py-2 hover:bg-surface">
          <span className="text-center font-display text-xl font-semibold tabular-nums">{row.rank}</span>
          <span className="flex justify-center"><Movement row={row} /></span>
          <button type="button" className="flex min-w-0 items-center gap-3 text-left" onClick={() => playQueue(tracks, index)}>
            <span className="relative shrink-0">
              <Cover src={row.track.release.coverThumbUrl} alt="" className="h-11 w-11" rounded="rounded-md" />
              <PlayIcon className="absolute inset-0 m-auto hidden h-5 w-5 text-white group-hover:block" />
            </span>
            <span className="min-w-0">
              <span className="block truncate text-sm font-medium">{row.track.title}</span>
              <span className="block truncate text-xs text-muted">{artistLine(row.track)}</span>
            </span>
          </button>
          <span className="flex items-center gap-2">
            {kind === "tracks" && <span className="hidden text-xs tabular-nums text-muted sm:block">{formatCount(row.value, i18n.language)} {t("stats.kpi.plays").toLowerCase()}</span>}
            <LikeButton track={row.track} />
          </span>
        </li>
      ))}
    </ol>
  );
}

function ArtistChart({ rows }: { rows: ChartRow[] }) {
  const { t } = useTranslation();
  return (
    <ol className="flex flex-col">
      {rows.map((row) => row.artist && (
        <li key={row.artist.id}>
          <Link to={`/artists/${row.artist.slug}`} className="grid grid-cols-[2.5rem_1.5rem_1fr_auto] items-center gap-3 rounded-xl px-2 py-2 hover:bg-surface">
            <span className="text-center font-display text-xl font-semibold tabular-nums">{row.rank}</span>
            <span className="flex justify-center"><Movement row={row} /></span>
            <span className="flex min-w-0 items-center gap-3">
              <Avatar src={row.artist.avatarUrl} alt="" className="h-11 w-11 shrink-0" />
              <span className="flex items-center gap-1 truncate text-sm font-semibold">
                {row.artist.stageName}
                {row.artist.verified && <CheckBadgeIcon className="h-4 w-4 text-monkii-500" />}
              </span>
            </span>
            <span className="text-xs tabular-nums text-muted">{t("charts.listeners", { count: row.value })}</span>
          </Link>
        </li>
      ))}
    </ol>
  );
}
