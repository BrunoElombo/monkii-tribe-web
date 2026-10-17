import type { ArtistOverview, AudienceReport, DayPoint, EventReport, Insight, PeriodKey, TrackStat } from "../types";
import { api } from "./http";

/** Analytics service: artist dashboards (ANA-01 to ANA-06) and event reports. */

const artistBase = (artistId: string) => `/analytics/artists/${artistId}`;

export const getArtistOverview = (artistId: string, period: PeriodKey) =>
  api<ArtistOverview>(`${artistBase(artistId)}/overview?period=${period}`);

export const getArtistTimeseries = (artistId: string, period: PeriodKey) =>
  api<DayPoint[]>(`${artistBase(artistId)}/timeseries?period=${period}`);

export const getArtistAudience = (artistId: string, period: PeriodKey, segment: "listeners" | "followers") =>
  api<AudienceReport>(`${artistBase(artistId)}/audience?period=${period}&segment=${segment}`);

export const getArtistTrackStats = (artistId: string, period: PeriodKey) =>
  api<TrackStat[]>(`${artistBase(artistId)}/tracks?period=${period}`);

export const getArtistInsights = (artistId: string) => api<Insight[]>(`${artistBase(artistId)}/insights`);

export const getEventReport = (eventId: string) => api<EventReport>(`/analytics/events/${eventId}`);
