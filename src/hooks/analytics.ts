import { useQuery } from "@tanstack/react-query";
import * as analytics from "../services/analytics.service";
import type { PeriodKey } from "../types";

/** Artist dashboards and event reports. */

export const useArtistOverview = (artistId: string, period: PeriodKey) =>
  useQuery({ queryKey: ["analytics", artistId, "overview", period], queryFn: () => analytics.getArtistOverview(artistId, period) });

export const useArtistTimeseries = (artistId: string, period: PeriodKey) =>
  useQuery({ queryKey: ["analytics", artistId, "timeseries", period], queryFn: () => analytics.getArtistTimeseries(artistId, period) });

export const useArtistAudience = (artistId: string, period: PeriodKey, segment: "listeners" | "followers") =>
  useQuery({
    queryKey: ["analytics", artistId, "audience", period, segment],
    queryFn: () => analytics.getArtistAudience(artistId, period, segment),
  });

export const useArtistTrackStats = (artistId: string, period: PeriodKey) =>
  useQuery({ queryKey: ["analytics", artistId, "tracks", period], queryFn: () => analytics.getArtistTrackStats(artistId, period) });

export const useArtistInsights = (artistId: string) =>
  useQuery({ queryKey: ["analytics", artistId, "insights"], queryFn: () => analytics.getArtistInsights(artistId) });

export const useEventReport = (eventId: string) =>
  useQuery({ queryKey: ["analytics", "event", eventId], queryFn: () => analytics.getEventReport(eventId), retry: false });
