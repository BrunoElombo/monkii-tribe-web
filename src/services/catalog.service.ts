import type {
  ArtistSummary, ChartRow, Credit, Genre, Page, PlaylistDetails, PlaylistSummary, PublicRelease, ReleaseSummary, ReleaseType,
  StudioRelease, Track,
} from "../types";
import { downloadFrom } from "../utils/download";
import { api } from "./http";

/**
 * Catalog service: browsing, search, library, playlists, playback links,
 * charts, the studio's releases and tracks, and release review (CAT-11).
 */

export interface HomeFeed {
  newReleases: ReleaseSummary[];
  popularTracks: Track[];
  genres: Genre[];
}

export interface SearchResults {
  artists: ArtistSummary[];
  releases: ReleaseSummary[];
  tracks: Track[];
  playlists: PlaylistSummary[];
}

export interface Purchases {
  releases: ReleaseSummary[];
  tracks: Track[];
}

export interface PlaylistInput {
  title: string;
  description?: string | null;
  isPublic: boolean;
}

/** A link to the encrypted offline copy; `premiumUntil` is when it stops playing. */
export interface OfflineLink {
  url: string;
  expiresAt: string;
  premiumUntil: string;
}

// ---------------------------------------------------------------- browse and search

export const getHome = () => api<HomeFeed>("/browse/home");

export const getGenres = () => api<Genre[]>("/genres");

export const getRelease = (releaseId: string) => api<PublicRelease>(`/releases/${releaseId}`);

export const getArtistTracks = (artistId: string | undefined) => api<Track[]>(`/tracks?artistId=${artistId}&limit=10`);

export const getArtistReleases = (artistId: string | undefined) =>
  api<Page<ReleaseSummary>>(`/releases?artistId=${artistId}&pageSize=50`);

export const search = (query: string, signal?: AbortSignal) =>
  api<SearchResults>(`/search?q=${encodeURIComponent(query)}`, { signal });

/** `params` holds kind, and country / genre when filtered. */
export const getCharts = (params: URLSearchParams) => api<ChartRow[]>(`/charts?${params}`);

// ---------------------------------------------------------------- library

export const getLikedTracks = () => api<Track[]>("/library/tracks");

export const getSavedReleases = () => api<ReleaseSummary[]>("/library/releases");

export const getPurchases = () => api<Purchases>("/library/purchases");

/** Likes the track, or removes the like when `liked` (the current state) is true. */
export const toggleLike = (trackId: string, liked: boolean) => api(`/tracks/${trackId}/like`, { method: liked ? "DELETE" : "PUT" });

/** Saves the release, or removes it when `saved` (the current state) is true. */
export const toggleSave = (releaseId: string, saved: boolean) =>
  api(`/releases/${releaseId}/save`, { method: saved ? "DELETE" : "PUT" });

// ---------------------------------------------------------------- playlists

export const getMyPlaylists = () => api<PlaylistSummary[]>("/playlists/mine");

export const getPlaylist = (playlistId: string) => api<PlaylistDetails>(`/playlists/${playlistId}`);

export const createPlaylist = (body: PlaylistInput) => api<PlaylistSummary>("/playlists", { method: "POST", body });

export const updatePlaylist = (playlistId: string, body: { title?: string; isPublic?: boolean }) =>
  api(`/playlists/${playlistId}`, { method: "PATCH", body });

export const deletePlaylist = (playlistId: string) => api(`/playlists/${playlistId}`, { method: "DELETE" });

export const addToPlaylist = (playlistId: string, trackId: string) =>
  api(`/playlists/${playlistId}/tracks`, { method: "POST", body: { trackId } });

export const removeFromPlaylist = (playlistId: string, trackId: string) =>
  api(`/playlists/${playlistId}/tracks/${trackId}`, { method: "DELETE" });

// ---------------------------------------------------------------- playback and downloads

/** A fresh signed HLS link (valid 10 minutes). */
export const getStreamUrl = (trackId: string) => api<{ url: string }>(`/tracks/${trackId}/stream`);

/** Premium only: a link to the file saved for offline listening. */
export const getOfflineLink = (trackId: string) => api<OfflineLink>(`/tracks/${trackId}/offline`);

/** Play statistics beacon (start, progress, end…). */
export const sendPlayBeacon = (body: Record<string, unknown>) => api("/plays", { method: "POST", body });

export async function downloadTrack(trackId: string) {
  const { url } = await api<{ url: string }>(`/tracks/${trackId}/download`);
  downloadFrom(url);
}

/** Every track of a bought release, one after the other (browsers ask once). */
export async function downloadRelease(releaseId: string) {
  const files = await api<{ trackId: string; title: string; url: string }[]>(`/releases/${releaseId}/downloads`);
  for (const file of files) {
    downloadFrom(file.url);
    await new Promise((resolve) => setTimeout(resolve, 600));
  }
}

// ---------------------------------------------------------------- studio: releases (CAT-01 to CAT-06)

export interface ReleaseInput {
  title: string;
  type?: ReleaseType;
  releaseDate: string | null;
  genre: string | null;
  subGenre: string | null;
  moods: string[];
  language: string | null;
  labelName: string | null;
  upc: string | null;
  copyrightLine: string | null;
  phonographicLine: string | null;
  description: string | null;
  explicit: boolean;
  priceXaf: number | null;
  featuredArtistIds: string[];
}

export interface TrackInput {
  title: string;
  discNumber: number;
  isrc: string | null;
  explicit: boolean;
  bpm: number | null;
  musicalKey: string | null;
  priceXaf: number | null;
  lyrics: string | null;
  credits: Credit[];
}

export const getStudioReleases = (artistId: string) => api<ReleaseSummary[]>(`/studio/releases?artistId=${artistId}`);

export const getStudioRelease = (releaseId: string) => api<StudioRelease>(`/studio/releases/${releaseId}`);

export const createRelease = (body: { artistId: string; title: string; type: ReleaseType }) =>
  api<{ id: string }>("/releases", { method: "POST", body });

export const updateRelease = (releaseId: string, body: ReleaseInput) => api(`/releases/${releaseId}`, { method: "PATCH", body });

export const setReleaseCover = (releaseId: string, assetId: string) =>
  api(`/releases/${releaseId}/cover`, { method: "PUT", body: { assetId } });

/** `publishAt` null publishes now (after review), a date schedules it. */
export const publishRelease = (releaseId: string, publishAt: string | null) =>
  api(`/releases/${releaseId}/publish`, { method: "POST", body: { publishAt } });

export const takeDownRelease = (releaseId: string, reason: string) =>
  api(`/releases/${releaseId}/takedown`, { method: "POST", body: { reason } });

export const deleteRelease = (releaseId: string) => api(`/releases/${releaseId}`, { method: "DELETE" });

// ---------------------------------------------------------------- studio: tracks

export const addTrack = (releaseId: string, title: string) =>
  api(`/releases/${releaseId}/tracks`, { method: "POST", body: { title } });

export const reorderTracks = (releaseId: string, trackIds: string[]) =>
  api(`/releases/${releaseId}/track-order`, { method: "PUT", body: { trackIds } });

export const updateTrack = (trackId: string, body: TrackInput) => api(`/tracks/${trackId}`, { method: "PATCH", body });

/** Attaches an uploaded audio file; the media worker then transcodes it. */
export const setTrackAudio = (trackId: string, assetId: string) =>
  api(`/tracks/${trackId}/audio`, { method: "PUT", body: { assetId } });

export const deleteTrack = (trackId: string) => api(`/tracks/${trackId}`, { method: "DELETE" });

// ---------------------------------------------------------------- release review (CAT-11)

export const getReviewQueue = () => api<ReleaseSummary[]>("/admin/releases");

/** Approves the release, or sends it back to the artist with a reason. */
export const decideRelease = (releaseId: string, approve: boolean, reason?: string) =>
  api(`/admin/releases/${releaseId}/${approve ? "approve" : "reject"}`, { method: "POST", body: approve ? undefined : { reason } });
