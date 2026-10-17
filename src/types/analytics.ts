import type { Bucket } from "./common";

/** Artist and event statistics (analytics service). */

export interface AudienceReport {
  total: number;
  gender: Bucket[];
  age: Bucket[];
  country: Bucket[];
  region: Bucket[];
  city: Bucket[];
  language: Bucket[];
  device?: Bucket[];
}

export type PeriodKey = "7d" | "28d" | "365d" | "all";

export interface Kpi {
  value: number;
  change?: number | null;
  delta?: number;
}

export interface ArtistOverview {
  period: { key: PeriodKey; from: string; to: string };
  kpis: {
    followers: Kpi;
    monthlyListeners: Kpi;
    listeners: Kpi;
    plays: Kpi;
    likes: Kpi;
    playlistAdds: Kpi;
    sales?: (Kpi & { amountXaf: number }) | null;
  };
}

export interface DayPoint {
  day: string;
  plays: number;
  listeners: number;
  followers: number;
}

export interface TrackStat {
  trackId: string;
  title: string;
  releaseTitle: string | null;
  coverThumbUrl: string | null;
  plays: number;
  listeners: number;
  completionRate: number;
  skipRate: number;
}

export interface EventReport {
  event: { id: string; title: string; city: string | null; startsAt: string | null };
  views: number;
  uniqueVisitors: number;
  interested: number;
  tickets: number;
  buyers: number;
  ticketValueXaf: number;
  conversionRate: number;
  followerShare: number;
  checkInRate: number;
  tiers: { name: string; tickets: number; valueXaf: number; checkedIn: number }[];
  sources: Bucket[];
  salesOverTime: { day: string; tickets: number }[];
  audience: AudienceReport;
}

export interface Insight {
  code: "region_without_event" | "fastest_growing_track" | "best_day" | "top_city";
  params: Record<string, string | number>;
}
