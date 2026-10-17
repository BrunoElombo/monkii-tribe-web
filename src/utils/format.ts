/** 215000 -> "3:35" */
export function formatDuration(ms: number | null | undefined): string {
  if (!ms || ms < 0) return "–:––";
  const totalSeconds = Math.round(ms / 1000);
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = String(totalSeconds % 60).padStart(2, "0");
  return hours > 0 ? `${hours}:${String(minutes).padStart(2, "0")}:${seconds}` : `${minutes}:${seconds}`;
}

/** 12500 -> "12.5K" (locale aware) */
export function formatCount(value: number, locale: string): string {
  return new Intl.NumberFormat(locale, { notation: "compact", maximumFractionDigits: 1 }).format(value);
}

export function formatYear(isoDate: string | null | undefined): string {
  return isoDate ? isoDate.slice(0, 4) : "";
}

/** Total listening time like "42 min" or "1 h 05 min" */
export function formatTotalDuration(ms: number): string {
  const minutes = Math.round(ms / 60000);
  if (minutes < 60) return `${minutes} min`;
  return `${Math.floor(minutes / 60)} h ${String(minutes % 60).padStart(2, "0")} min`;
}

export const artistLine = (track: { artist: { stageName: string }; featured: { stageName: string }[] }) =>
  [track.artist.stageName, ...track.featured.map((f) => f.stageName)].join(", ");

/** 15000 -> "15 000 FCFA" (XAF has no decimals) */
export function formatXaf(amount: number, locale: string): string {
  return `${new Intl.NumberFormat(locale, { maximumFractionDigits: 0 }).format(amount)} FCFA`;
}

/** Event date in the event's own time zone, e.g. "Sat 14 Jun, 20:00" */
export function formatEventDate(iso: string, timeZone: string, locale: string, withYear = false): string {
  return new Date(iso).toLocaleString(locale, {
    weekday: "short",
    day: "numeric",
    month: "short",
    ...(withYear ? { year: "numeric" } : {}),
    hour: "2-digit",
    minute: "2-digit",
    timeZone,
  });
}

export function formatNumber(value: number, locale: string): string {
  return new Intl.NumberFormat(locale).format(value);
}
