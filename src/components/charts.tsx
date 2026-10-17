import { useId } from "react";
import { useTranslation } from "react-i18next";
import clsx from "clsx";
import { ArrowDownRightIcon, ArrowUpRightIcon } from "@heroicons/react/20/solid";
import { Area, AreaChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import type { Bucket, Problem } from "../types";
import { formatNumber } from "../utils/format";

/**
 * Chart building blocks.
 * The brand is a single hue, so every chart shows ONE series in monkii-600
 * (#EA580C passes the lightness, chroma and 3:1 contrast checks on both the
 * dark and light surfaces). Never two coloured series on the same plot:
 * a metric switch is used instead.
 */
const MARK = "#EA580C";

// ---------------------------------------------------------------- stat tile

export function StatTile({ label, value, change, hint }: { label: string; value: string; change?: number | null; hint?: string }) {
  const { t } = useTranslation();
  const up = change !== undefined && change !== null && change >= 0;

  return (
    <div className="card p-4">
      <p className="text-xs font-medium text-muted">{label}</p>
      <p className="mt-1 font-display text-3xl font-semibold tabular-nums">{value}</p>
      {change !== undefined && change !== null && (
        <p className="mt-1 flex items-center gap-1 text-xs text-muted">
          {/* Direction is told by the arrow and the sign, never by colour alone */}
          {up ? <ArrowUpRightIcon className="h-4 w-4 text-fg" aria-hidden /> : <ArrowDownRightIcon className="h-4 w-4 text-fg" aria-hidden />}
          <span className="font-semibold text-fg">{`${up ? "+" : ""}${change}%`}</span>
          {t("stats.vsPrevious")}
        </p>
      )}
      {hint && <p className="mt-1 text-xs text-muted">{hint}</p>}
    </div>
  );
}

// ---------------------------------------------------------------- horizontal bars

interface BarListProps {
  title: string;
  buckets: Bucket[];
  /** Turns a bucket key into a readable label */
  label?: (key: string) => string;
  empty?: string;
}

/** Ranked bars with the value written next to each bar (no legend needed). */
export function BarList({ title, buckets, label = (k) => k, empty }: BarListProps) {
  const { t, i18n } = useTranslation();
  const max = Math.max(1, ...buckets.map((b) => b.count));
  const display = (key: string) => (key === "other" ? t("common.other") : key === "unknown" ? t("common.unknown") : label(key));

  return (
    <section className="card p-4">
      <h3 className="mb-3 text-sm font-semibold">{title}</h3>
      {buckets.length === 0 ? (
        <p className="text-sm text-muted">{empty ?? t("stats.noData")}</p>
      ) : (
        <ul className="flex flex-col gap-2.5">
          {buckets.map((bucket) => (
            <li key={bucket.key} title={`${display(bucket.key)}: ${formatNumber(bucket.count, i18n.language)} (${bucket.share}%)`}>
              <div className="mb-1 flex justify-between gap-3 text-xs">
                <span className="truncate text-fg">{display(bucket.key)}</span>
                <span className="shrink-0 tabular-nums text-muted">
                  {formatNumber(bucket.count, i18n.language)} · {bucket.share}%
                </span>
              </div>
              <div className="h-2 rounded-full bg-elevated/60">
                <div className="h-2 rounded-full" style={{ width: `${(bucket.count / max) * 100}%`, background: MARK }} />
              </div>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}

// ---------------------------------------------------------------- time series

interface SeriesPoint {
  day: string;
  value: number;
}

/** Single-series area chart with a hover crosshair and tooltip. */
export function TimeSeriesChart({ data, label, height = 240 }: { data: SeriesPoint[]; label: string; height?: number }) {
  const { i18n } = useTranslation();
  const gradientId = useId().replace(/:/g, "");
  const dayLabel = (day: string) => new Date(`${day}T00:00:00Z`).toLocaleDateString(i18n.language, { day: "numeric", month: "short", timeZone: "UTC" });

  return (
    <div style={{ height }} role="img" aria-label={label}>
      <ResponsiveContainer width="100%" height="100%">
        <AreaChart data={data} margin={{ top: 8, right: 8, bottom: 0, left: -12 }}>
          <defs>
            <linearGradient id={gradientId} x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor={MARK} stopOpacity={0.35} />
              <stop offset="100%" stopColor={MARK} stopOpacity={0} />
            </linearGradient>
          </defs>
          <CartesianGrid vertical={false} stroke="var(--mt-line)" />
          <XAxis dataKey="day" tickFormatter={dayLabel} tick={{ fill: "var(--mt-muted)", fontSize: 11 }} axisLine={false} tickLine={false} minTickGap={24} />
          <YAxis allowDecimals={false} tick={{ fill: "var(--mt-muted)", fontSize: 11 }} axisLine={false} tickLine={false} width={44} />
          <Tooltip
            cursor={{ stroke: "var(--mt-muted)", strokeDasharray: "3 3" }}
            contentStyle={{ background: "var(--mt-surface)", border: "1px solid var(--mt-line)", borderRadius: 12, color: "var(--mt-fg)" }}
            labelFormatter={(day) => dayLabel(String(day))}
            formatter={(value) => [formatNumber(Number(value), i18n.language), label]}
          />
          <Area type="monotone" dataKey="value" stroke={MARK} strokeWidth={2} fill={`url(#${gradientId})`} activeDot={{ r: 5, stroke: "var(--mt-surface)", strokeWidth: 2 }} />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
}

// ---------------------------------------------------------------- controls

export function Segmented<T extends string>({ value, options, onChange, label }: { value: T; options: { value: T; label: string }[]; onChange: (value: T) => void; label: string }) {
  return (
    <div role="radiogroup" aria-label={label} className="inline-flex rounded-full border border-line bg-surface p-1">
      {options.map((option) => (
        <button
          key={option.value}
          type="button"
          role="radio"
          aria-checked={value === option.value}
          onClick={() => onChange(option.value)}
          className={clsx(
            "rounded-full px-3 py-1.5 text-xs font-semibold transition",
            value === option.value ? "bg-monkii-500 text-monkii-ink" : "text-muted hover:text-fg",
          )}
        >
          {option.label}
        </button>
      ))}
    </div>
  );
}

/** Translated list of blocking problems returned by the API. */
export function ProblemList({ problems }: { problems: Problem[] }) {
  const { t } = useTranslation();
  return (
    <ul className="flex flex-col gap-1.5">
      {problems.map((problem) => (
        <li key={`${problem.code}-${JSON.stringify(problem.params ?? {})}`} className="flex items-start gap-2 text-xs text-muted">
          <span aria-hidden className="mt-1 h-1.5 w-1.5 shrink-0 rounded-full bg-monkii-400" />
          {t(`problems.${problem.code}`, { ...problem.params, defaultValue: problem.code })}
        </li>
      ))}
    </ul>
  );
}
